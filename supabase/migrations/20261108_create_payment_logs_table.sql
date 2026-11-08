-- ==============================================================================
-- Migration : Création de la table payment_logs & Synchronisation des colonnes de ventes
-- ==============================================================================

-- 1. Table d'audit des paiements (Webhooks Mobile Money / Passerelle)
CREATE TABLE IF NOT EXISTS public.payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT,
    transaction_id TEXT,
    amount NUMERIC(14, 2) DEFAULT 0.00,
    status TEXT NOT NULL,
    customer_phone TEXT,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches par transaction et par tenant
CREATE INDEX IF NOT EXISTS idx_payment_logs_transaction_id ON public.payment_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_tenant_id ON public.payment_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON public.payment_logs(created_at DESC);

-- Activation RLS sur payment_logs
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Politique d'accès : Seuls les administrateurs et le rôle de service peuvent tout lire/écrire
DROP POLICY IF EXISTS "Service role access on payment_logs" ON public.payment_logs;
CREATE POLICY "Service role access on payment_logs" ON public.payment_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Garantir la présence des colonnes payment_status et updated_at sur la table sales
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE public.sales ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.sales ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;
