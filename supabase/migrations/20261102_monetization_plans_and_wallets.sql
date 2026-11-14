-- =======================================================================
-- MIGRATION SUPABASE / POSTGRESQL : Système de Monétisation & Abonnements
-- Tables : plans, subscriptions, wallets, wallet_transactions
-- Écosystème : Nanasore / Nanasore
-- Date : 2026-11-02
-- =======================================================================

-- 1. ENUMS (Création idempotente)
DO $$ BEGIN
    CREATE TYPE plan_code AS ENUM ('ZERO', 'CREATOR', 'MERCHANT', 'PAY_AS_YOU_GO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE billing_type AS ENUM ('FREE', 'COMMISSION', 'SUBSCRIPTION', 'PAY_AS_YOU_GO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE billing_cycle AS ENUM ('MONTHLY', 'YEARLY', 'NONE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE wallet_transaction_type AS ENUM (
        'TOPUP',
        'USAGE_DEDUCTION',
        'COMMISSION_FEE',
        'ESCROW_HOLD',
        'ESCROW_RELEASE',
        'REFUND'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. FONCTION UTILITAIRE POUR updated_at
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =======================================================================
-- 3. TABLE : plans
-- Définition des 4 modèles tarifaires Nanasore
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code plan_code NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    billing_type billing_type NOT NULL,
    default_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (default_commission_rate >= 0.00 AND default_commission_rate <= 100.00),
    subscription_price_monthly NUMERIC(12, 2) DEFAULT NULL CHECK (subscription_price_monthly IS NULL OR subscription_price_monthly >= 0.00),
    subscription_price_yearly NUMERIC(12, 2) DEFAULT NULL CHECK (subscription_price_yearly IS NULL OR subscription_price_yearly >= 0.00),
    currency VARCHAR(10) NOT NULL DEFAULT 'XOF',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Trigger updated_at pour plans
DROP TRIGGER IF EXISTS trg_plans_updated_at ON public.plans;
CREATE TRIGGER trg_plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

-- =======================================================================
-- 4. TABLE : subscriptions
-- Gestion de l'état d'abonnement actif du Tenant / Commerçant
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    billing_cycle billing_cycle NOT NULL DEFAULT 'NONE',
    status subscription_status NOT NULL DEFAULT 'ACTIVE',
    trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Trigger updated_at pour subscriptions
DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

-- =======================================================================
-- 5. TABLE : wallets
-- Portefeuille interne (Crédits d'usage & Gains / Séquestres Créateurs)
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL UNIQUE,
    credit_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (credit_balance >= 0.00),
    cash_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'XOF',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Trigger updated_at pour wallets
DROP TRIGGER IF EXISTS trg_wallets_updated_at ON public.wallets;
CREATE TRIGGER trg_wallets_updated_at
    BEFORE UPDATE ON public.wallets
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

-- =======================================================================
-- 6. TABLE : wallet_transactions
-- Audit & Historique immuable des flux financiers et d'unités de crédits
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    transaction_type wallet_transaction_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    units INTEGER DEFAULT NULL,
    reference_id VARCHAR(255) DEFAULT NULL,
    description VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =======================================================================
-- 7. INDEX DE PERFORMANCE
-- =======================================================================
CREATE INDEX IF NOT EXISTS idx_plans_code ON public.plans(code);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON public.plans(is_active);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status ON public.subscriptions(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_wallets_tenant_id ON public.wallets(tenant_id);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON public.wallet_transactions(reference_id);

-- =======================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =======================================================================
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Lecture publique des plans actifs
DROP POLICY IF EXISTS plans_select_public ON public.plans;
CREATE POLICY plans_select_public ON public.plans
    FOR SELECT
    USING (is_active = true);

-- Politiques de base pour abonnements & portefeuilles (extensibles selon auth.uid())
DROP POLICY IF EXISTS subscriptions_policy ON public.subscriptions;
CREATE POLICY subscriptions_policy ON public.subscriptions
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS wallets_policy ON public.wallets;
CREATE POLICY wallets_policy ON public.wallets
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS wallet_transactions_policy ON public.wallet_transactions;
CREATE POLICY wallet_transactions_policy ON public.wallet_transactions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- =======================================================================
-- 9. SEED DATA : Initialisation des 4 Plans d'Abonnement Nanasore
-- =======================================================================
INSERT INTO public.plans (
    code,
    name,
    description,
    billing_type,
    default_commission_rate,
    subscription_price_monthly,
    subscription_price_yearly,
    currency,
    is_active
) VALUES
(
    'ZERO',
    'Plan Zéro (Freemium)',
    'Accès de base gratuit pour découvrir l''écosystème Nanasore sans engagement.',
    'FREE',
    0.00,
    0.00,
    0.00,
    'XOF',
    true
),
(
    'CREATOR',
    'Plan Créateur / Vendeur (Pay-After-Sale)',
    'Paiement après vente avec séquestre / escrow sécurisé et commission sur les transactions réussies.',
    'COMMISSION',
    10.00,
    NULL,
    NULL,
    'XOF',
    true
),
(
    'MERCHANT',
    'Plan Commerçant / POS (Abonnement White-label)',
    'Solution complète de caisse tactile Nanasore, gestion multi-boutiques, facturation normalisée et personnalisation.',
    'SUBSCRIPTION',
    0.00,
    15000.00,
    150000.00,
    'XOF',
    true
),
(
    'PAY_AS_YOU_GO',
    'Plan Usage / Crédits (Portefeuille Wallet)',
    'Facturation à la consommation via portefeuille prépayé pour les SMS transactionnels, requêtes IA et analyses de données.',
    'PAY_AS_YOU_GO',
    0.00,
    NULL,
    NULL,
    'XOF',
    true
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    billing_type = EXCLUDED.billing_type,
    default_commission_rate = EXCLUDED.default_commission_rate,
    subscription_price_monthly = EXCLUDED.subscription_price_monthly,
    subscription_price_yearly = EXCLUDED.subscription_price_yearly,
    currency = EXCLUDED.currency,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
