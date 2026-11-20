-- =======================================================================
-- MIGRATION SUPABASE : Gestion des Ventes & Déduction Atomique des Stocks
-- Table public.sales + Fonction Stockée (RPC) process_sale_transaction
-- =======================================================================

-- 1. Table des Ventes (Caisse POS, Site Vitrine E-commerce, Funnels)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    source TEXT NOT NULL CHECK (source IN ('pos', 'storefront', 'funnel', 'api', 'manual')) DEFAULT 'pos',
    customer_name TEXT,
    customer_phone TEXT,
    payment_method TEXT DEFAULT 'cash',
    seller_name TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index de performance pour les rapports et filtres
CREATE INDEX IF NOT EXISTS idx_sales_org_id ON public.sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON public.sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_source ON public.sales(source);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);

-- 2. Configuration RLS (Row Level Security) pour sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_full_policy ON public.sales;
CREATE POLICY sales_full_policy ON public.sales
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Fonction Stockée PostgreSQL (RPC) : Traitement Atomique de la Vente
-- Gère la vérification avec verrouillage, déduction du stock et insertion de la vente
CREATE OR REPLACE FUNCTION public.process_sale_transaction(
    p_product_id UUID,
    p_quantity INT DEFAULT 1,
    p_source TEXT DEFAULT 'pos',
    p_org_id UUID DEFAULT NULL,
    p_unit_price NUMERIC DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash',
    p_seller_name TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product RECORD;
    v_new_stock INT;
    v_sale_id UUID;
    v_unit_price NUMERIC(12, 2);
    v_total_price NUMERIC(12, 2);
    v_org_id UUID;
BEGIN
    -- Validation de la quantité demandée
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'La quantité demandée doit être strictement supérieure à zéro (valeur fournie: %)', p_quantity
            USING ERRCODE = '22003';
    END IF;

    -- 1. Verrouillage exclusif de la ligne du produit (FOR UPDATE)
    -- Garantit qu'aucune vente concurrente (ex: panier web et caisse physique en même temps) ne crée de sur-vente
    SELECT id, name, price, stock, organization_id INTO v_product
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produit introuvable avec l''identifiant: %', p_product_id
            USING ERRCODE = 'P0002';
    END IF;

    -- 2. Contrôle du stock disponible
    IF v_product.stock < p_quantity THEN
        RAISE EXCEPTION 'Stock insuffisant pour le produit "%" : % disponible(s), % demandé(s)', 
            v_product.name, v_product.stock, p_quantity
            USING ERRCODE = 'P0001';
    END IF;

    -- Calcul des montants financiers et du nouveau stock
    v_unit_price := COALESCE(p_unit_price, v_product.price, 0);
    v_total_price := v_unit_price * p_quantity;
    v_new_stock := v_product.stock - p_quantity;
    v_org_id := COALESCE(p_org_id, v_product.organization_id);

    -- 3. Déduction atomique du stock dans la table products
    UPDATE public.products
    SET stock = v_new_stock
    WHERE id = p_product_id;

    -- 4. Enregistrement de la vente dans la table sales
    INSERT INTO public.sales (
        organization_id,
        product_id,
        product_name,
        quantity,
        unit_price,
        total_price,
        source,
        customer_name,
        customer_phone,
        payment_method,
        seller_name,
        metadata,
        created_at
    )
    VALUES (
        v_org_id,
        p_product_id,
        v_product.name,
        p_quantity,
        v_unit_price,
        v_total_price,
        COALESCE(p_source, 'pos'),
        p_customer_name,
        p_customer_phone,
        COALESCE(p_payment_method, 'cash'),
        p_seller_name,
        COALESCE(p_metadata, '{}'::jsonb),
        NOW()
    )
    RETURNING id INTO v_sale_id;

    -- 5. Réponse JSON structurée
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Vente validée et stock mis à jour avec succès',
        'sale_id', v_sale_id,
        'product_id', p_product_id,
        'product_name', v_product.name,
        'quantity_sold', p_quantity,
        'remaining_stock', v_new_stock,
        'unit_price', v_unit_price,
        'total_price', v_total_price,
        'source', COALESCE(p_source, 'pos')
    );
END;
$$;


-- 4. Activation de la Réplication Temps Réel (Supabase Realtime)
-- Permet à l'écran de caisse POS et aux visiteurs du site vitrine de recevoir les déductions de stock instantanément
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'sales'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END;
$$;
