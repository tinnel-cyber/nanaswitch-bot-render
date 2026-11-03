-- Migration: 20261103_modular_subscription_pillars.sql
-- Architecture de tarification modulaire granulaire (Caisse 5k, Vitrine 5k, Formateur 10k, Bundle Complet)

-- 1. Table des Piliers Modulaires d'Abonnement
CREATE TABLE IF NOT EXISTS public.plan_modular_pillars (
    pillar_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('PHYSICAL_POS', 'ONLINE_STORE', 'INSTRUCTOR_LMS')),
    description TEXT NOT NULL,
    starter_monthly_price NUMERIC(10,2) NOT NULL,
    business_monthly_price NUMERIC(10,2) NOT NULL,
    enterprise_monthly_price NUMERIC(10,2) NOT NULL,
    included_modules TEXT[] NOT NULL,
    features_highlight TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insertion des 3 Piliers Modulaires Socles
INSERT INTO public.plan_modular_pillars (
    pillar_id, name, category, description,
    starter_monthly_price, business_monthly_price, enterprise_monthly_price,
    included_modules, features_highlight
)
VALUES
(
    'caisse_pos',
    'Caisse Physique & POS',
    'PHYSICAL_POS',
    'Caisse tactile de comptoir, tickets de caisse thermiques, gestion d''espèces, ardoises dettes et clôture Z',
    5000.00,
    10000.00,
    20000.00,
    ARRAY['caisse', 'stock', 'scanner', 'recu_thermique', 'cloture_caisse', 'dettes_creances', 'depenses'],
    ARRAY['Caisse tactile hors-ligne', 'Tickets thermiques Bluetooth/USB', 'Clôtures de caisse journalières Z', 'Gestion du fond de caisse & ardoises']
),
(
    'vitrine_web',
    'Vitrine en Ligne & E-commerce',
    'ONLINE_STORE',
    'Boutique en ligne nsore.shop, catalogue de produits, panier WhatsApp, commandes clients et pixels publicitaires',
    5000.00,
    10000.00,
    20000.00,
    ARRAY['boutique_enligne', 'panier_whatsapp', 'catalogue', 'commandes_clients', 'meta_pixel', 'tiktok_pixel', 'avis_clients'],
    ARRAY['Site web e-commerce nsore.shop', 'Tunnel de panier WhatsApp direct', 'Commandes clients & livraisons', 'Pixels Meta, TikTok & Google synchronisés']
),
(
    'formateur_lms',
    'Espace Formateur & Académie',
    'INSTRUCTOR_LMS',
    'Cours vidéo privés, hébergement PDF, examens interactifs, diplômes avec QR-code inviolable et masterclasses Wameet',
    10000.00,
    20000.00,
    40000.00,
    ARRAY['cours_en_ligne', 'certificats_qr', 'webinaire_wameet', 'quiz_examens', 'eleves_crm', 'escrow_sequestre', 'produits_numeriques'],
    ARRAY['Hébergement de cours vidéo illimité', 'Visioconférence Wameet & Live Masterclass', 'Certificats officiels QR-Code infalsifiables', 'Séquestre Escrow Mobile Money intégré']
)
ON CONFLICT (pillar_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    starter_monthly_price = EXCLUDED.starter_monthly_price,
    business_monthly_price = EXCLUDED.business_monthly_price,
    enterprise_monthly_price = EXCLUDED.enterprise_monthly_price,
    included_modules = EXCLUDED.included_modules,
    features_highlight = EXCLUDED.features_highlight,
    updated_at = NOW();

-- 3. Mise à jour de la table tenant_subscriptions pour enregistrer les sélections modulaires
ALTER TABLE IF EXISTS public.tenant_subscriptions 
    ADD COLUMN IF NOT EXISTS selected_pillars TEXT[] DEFAULT ARRAY['caisse_pos', 'vitrine_web', 'formateur_lms'],
    ADD COLUMN IF NOT EXISTS is_all_inclusive BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS custom_monthly_amount NUMERIC(10,2) DEFAULT 15000.00;

-- 4. Fonction de calcul dynamique du montant d'abonnement selon les piliers cochés
CREATE OR REPLACE FUNCTION public.calculate_subscription_amount(
    p_plan_id TEXT,
    p_selected_pillars TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total NUMERIC(10,2) := 0.00;
    v_pillar RECORD;
    v_all_pillars_count INT := 3;
    v_selected_count INT := cardinality(p_selected_pillars);
    v_is_all BOOLEAN := false;
    v_bundle_price NUMERIC(10,2);
    v_modules TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Plan Gratuit Freemium
    IF p_plan_id = 'free' OR p_plan_id = 'plan-zero' THEN
        RETURN jsonb_build_object(
            'amount', 0.00,
            'is_all_inclusive', true,
            'pillars', ARRAY['caisse_pos', 'vitrine_web'],
            'savings', 0.00
        );
    END IF;

    -- Tarifs des bundles complets "Tout sélectionner"
    IF p_plan_id = 'starter' OR p_plan_id = 'plan-pro' THEN
        v_bundle_price := 15000.00;
    ELSIF p_plan_id = 'business' OR p_plan_id = 'plan-business' THEN
        v_bundle_price := 30000.00;
    ELSIF p_plan_id = 'enterprise' OR p_plan_id = 'plan-enterprise' THEN
        v_bundle_price := 60000.00;
    ELSE
        v_bundle_price := 15000.00;
    END IF;

    -- Si tous les 3 piliers sont sélectionnés ou aucun (par défaut tout)
    IF v_selected_count >= v_all_pillars_count OR v_selected_count = 0 THEN
        v_is_all := true;
        v_total := v_bundle_price;
    ELSE
        -- Somme dynamique des piliers cochés
        FOR v_pillar IN 
            SELECT pillar_id, starter_monthly_price, business_monthly_price, enterprise_monthly_price, included_modules
            FROM public.plan_modular_pillars
            WHERE pillar_id = ANY(p_selected_pillars)
        LOOP
            IF p_plan_id = 'business' OR p_plan_id = 'plan-business' THEN
                v_total := v_total + v_pillar.business_monthly_price;
            ELSIF p_plan_id = 'enterprise' OR p_plan_id = 'plan-enterprise' THEN
                v_total := v_total + v_pillar.enterprise_monthly_price;
            ELSE
                v_total := v_total + v_pillar.starter_monthly_price;
            END IF;
            v_modules := array_cat(v_modules, v_pillar.included_modules);
        END LOOP;

        -- Plafond de sécurité : la somme à la carte ne peut pas dépasser le pack complet
        IF v_total > v_bundle_price THEN
            v_total := v_bundle_price;
            v_is_all := true;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'plan_id', p_plan_id,
        'amount', v_total,
        'is_all_inclusive', v_is_all,
        'selected_pillars', p_selected_pillars,
        'modules', v_modules,
        'bundle_full_price', v_bundle_price
    );
END;
$$;

-- Droits de consultation
GRANT SELECT ON public.plan_modular_pillars TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_subscription_amount TO anon, authenticated;
