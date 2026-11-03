-- =======================================================================
-- MIGRATION SUPABASE / POSTGRESQL : Plans d'Abonnement Hybrides & Tarification à l'Usage
-- Tables concernées :
--   1. public.plans (Mise à jour & Upsert des plans marchands standard et nouveaux modes)
--   2. public.service_commission_rules (Règles de séquestre & commissions Créateur)
--   3. public.usage_service_rates (Tarification à l'acte Pay-As-You-Go & CV Pro)
-- Écosystème : Nanasore / NaNa POS / Cloudflare / Supabase
-- Date : 2026-11-03
-- =======================================================================

-- 1. ADAPTATION STRUCTURALE DE LA TABLE public.plans
DO $$ 
BEGIN
    -- Assouplir la colonne code si elle était typée par enum strict
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'plans' 
          AND column_name = 'code' 
          AND udt_name = 'plan_code'
    ) THEN
        ALTER TABLE public.plans ALTER COLUMN code TYPE VARCHAR(100);
    END IF;

    -- Assouplir billing_type si typé par enum strict
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'plans' 
          AND column_name = 'billing_type' 
          AND udt_name = 'billing_type'
    ) THEN
        ALTER TABLE public.plans ALTER COLUMN code TYPE VARCHAR(100);
    END IF;
END $$;

-- Ajout des colonnes enrichies sur public.plans si elles n'existent pas
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS limits JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS badge VARCHAR(50) DEFAULT NULL;

-- =======================================================================
-- 2. TABLE : public.service_commission_rules
-- Gestion des règles de prélèvement sous séquestre (Plan Créateur / Commission)
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.service_commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_code VARCHAR(100) NOT NULL UNIQUE,
    service_name VARCHAR(255) NOT NULL,
    commission_rate NUMERIC(5, 2) NOT NULL CHECK (commission_rate >= 0.00 AND commission_rate <= 100.00),
    escrow_period_hours INT NOT NULL DEFAULT 48 CHECK (escrow_period_hours >= 0),
    min_commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'XOF',
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Trigger updated_at pour service_commission_rules
DROP TRIGGER IF EXISTS trg_service_commission_rules_updated_at ON public.service_commission_rules;
CREATE TRIGGER trg_service_commission_rules_updated_at
    BEFORE UPDATE ON public.service_commission_rules
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

-- =======================================================================
-- 3. TABLE : public.usage_service_rates
-- Tarification à l'acte des services externes et avancés (Pay-As-You-Go)
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.usage_service_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usage_code VARCHAR(100) NOT NULL UNIQUE,
    service_name VARCHAR(255) NOT NULL,
    rate_per_unit NUMERIC(12, 2) NOT NULL CHECK (rate_per_unit >= 0.00),
    credit_units_per_act INT NOT NULL DEFAULT 1 CHECK (credit_units_per_act >= 1),
    unit_label VARCHAR(50) NOT NULL DEFAULT 'acte',
    currency VARCHAR(10) NOT NULL DEFAULT 'XOF',
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Trigger updated_at pour usage_service_rates
DROP TRIGGER IF EXISTS trg_usage_service_rates_updated_at ON public.usage_service_rates;
CREATE TRIGGER trg_usage_service_rates_updated_at
    BEFORE UPDATE ON public.usage_service_rates
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

-- =======================================================================
-- 4. SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- =======================================================================
ALTER TABLE public.service_commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_service_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_commission_rules_public_read ON public.service_commission_rules;
CREATE POLICY service_commission_rules_public_read ON public.service_commission_rules
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS usage_service_rates_public_read ON public.usage_service_rates;
CREATE POLICY usage_service_rates_public_read ON public.usage_service_rates
    FOR SELECT USING (is_active = true);

-- Politiques de modification pour le rôle service_role / administrateur
DROP POLICY IF EXISTS service_commission_rules_admin_all ON public.service_commission_rules;
CREATE POLICY service_commission_rules_admin_all ON public.service_commission_rules
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS usage_service_rates_admin_all ON public.usage_service_rates;
CREATE POLICY usage_service_rates_admin_all ON public.usage_service_rates
    FOR ALL USING (true) WITH CHECK (true);

-- =======================================================================
-- 5. UPSERT DES PLANS D'ABONNEMENT (STANDARD MARCHANDS + HYBRIDES)
-- =======================================================================

-- Nettoyage ou migration de l'ancien code 'ZERO' vers 'plan-zero'
UPDATE public.plans 
SET code = 'plan-zero' 
WHERE code = 'ZERO' AND NOT EXISTS (SELECT 1 FROM public.plans WHERE code = 'plan-zero');

-- A. PLAN ZÉRO (Gratuit / Acquisition) - RÈGLE CRITIQUE : CV Pro EXCLU (maxDocuments: 0)
INSERT INTO public.plans (
    code,
    name,
    description,
    billing_type,
    default_commission_rate,
    subscription_price_monthly,
    subscription_price_yearly,
    currency,
    is_active,
    is_popular,
    badge,
    features,
    limits,
    metadata
) VALUES (
    'plan-zero',
    'Plan Zéro (Gratuit / Acquisition)',
    'Accès de base sans frais pour découvrir l''écosystème Nanasore et débuter la vente. Couvre 19 axes d''acquisition client. Module CV Pro strictement exclu.',
    'FREE',
    0.00,
    0.00,
    0.00,
    'XOF',
    true,
    false,
    'Gratuit à vie',
    '[
        "Publication marketplace (mod-catalog)",
        "Assistant IA décisionnel de base (mod-ai-advisor)",
        "Formulaires devis & contact (mod-quotes)",
        "Catalogue LMS public (mod-lms-marketplace)",
        "Centre d''aide & documentation (mod-helpdesk)",
        "Tableau de bord central caméléon (mod-dashboard)",
        "Calculs de marge et rentabilité basiques (mod-margin-calc)",
        "Support technique par ticket (mod-support)",
        "Export conforme RGPD (mod-gdpr)",
        "Simulateur de trésorerie (mod-cashflow)",
        "Visioconférence Wameet Supra (mod-wameet-supra)",
        "Extension Nanaswitch Cloud (mod-nanaswitch)",
        "Revente de services en partenariat (mod-partner)",
        "Livraison live shopping (mod-live-shipping)",
        "Export tunnels Elementor (mod-elementor-export)",
        "Carnet de dettes client essentiel (mod-debts-basic)",
        "Impression tickets thermiques (mod-receipt-thermal)",
        "Consultation multi-devises (mod-currencies)",
        "Notifications email de confirmation (mod-email-notif)"
    ]'::jsonb,
    '{
        "maxProducts": 3,
        "maxFunnels": 1,
        "maxCourses": 1,
        "maxLiveCallsMonthly": 3,
        "maxDocuments": 0,
        "maxCashiers": 1,
        "cvProAllowed": false
    }'::jsonb,
    '{"acquisitionTier": true, "cvProRestricted": true}'::jsonb
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
    is_popular = EXCLUDED.is_popular,
    badge = EXCLUDED.badge,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- B. PLAN CRÉATEUR / VENDEUR (Pay-After-Sale / Commission)
INSERT INTO public.plans (
    code,
    name,
    description,
    billing_type,
    default_commission_rate,
    subscription_price_monthly,
    subscription_price_yearly,
    currency,
    is_active,
    is_popular,
    badge,
    features,
    limits,
    metadata
) VALUES (
    'plan-creator-commission',
    'Plan Créateur / Vendeur (Pay-After-Sale / Commission)',
    'Zéro abonnement mensuel fixe. Paiement après vente avec séquestre Escrow sécurisé et prélèvement de commission sur les ventes réussies.',
    'COMMISSION',
    10.00,
    0.00,
    0.00,
    'XOF',
    true,
    false,
    'Pay-After-Sale',
    '[
        "Paiement après vente réussi avec 0 F CFA d''abonnement fixe",
        "Séquestre sécurisé Escrow sur formations, fichiers et tunnels",
        "Encaissement multi-pays Mobile Money (Orange, Wave, Moov, MTN)",
        "Accès complet au Studio Créateur et Campus E-Learning",
        "Gestion des élèves et délivrance de certificats sécurisés",
        "Protection anti-fraude et déblocage automatisé des fonds"
    ]'::jsonb,
    '{
        "maxProducts": 50,
        "maxFunnels": 3,
        "maxCourses": 3,
        "maxLiveCallsMonthly": 10,
        "maxDocuments": 0,
        "maxCashiers": 1,
        "cvProAllowed": false,
        "escrowProtection": true
    }'::jsonb,
    '{"escrowEnabled": true, "commissionPercent": 10.0}'::jsonb
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
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- C. PLAN USAGE / CRÉDITS (Pay-As-You-Go / Portefeuille Wallet)
INSERT INTO public.plans (
    code,
    name,
    description,
    billing_type,
    default_commission_rate,
    subscription_price_monthly,
    subscription_price_yearly,
    currency,
    is_active,
    is_popular,
    badge,
    features,
    limits,
    metadata
) VALUES (
    'plan-pay-as-you-go',
    'Plan Usage / Crédits (Pay-As-You-Go)',
    'Facturation à la consommation via portefeuille prépayé (Wallet). Idéal pour consommer les services avancés (CV Pro, SMS pro, WhatsApp API, IA multimodale) à l''acte.',
    'PAY_AS_YOU_GO',
    0.00,
    NULL,
    NULL,
    'XOF',
    true,
    false,
    'À la carte',
    '[
        "Recharge de portefeuille prépayé instantanée par Mobile Money",
        "Facturation à l''acte des documents CV Pro (500 F CFA / CV)",
        "Envoi de SMS transactionnels et marketing via Twilio / Brevo",
        "Notifications WhatsApp Business automatisées",
        "Générations de médias et vidéos de vente par IA",
        "Signatures électroniques certifiées DocuSign"
    ]'::jsonb,
    '{
        "cvProUsageBilling": true,
        "smsUsageBilling": true,
        "whatsappUsageBilling": true,
        "aiMediaUsageBilling": true,
        "docusignUsageBilling": true
    }'::jsonb,
    '{"walletDeductionEnabled": true}'::jsonb
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
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- D. PLAN PRO / COMMERÇANT STANDARD (Abonnement Récurrent)
INSERT INTO public.plans (
    code,
    name,
    description,
    billing_type,
    default_commission_rate,
    subscription_price_monthly,
    subscription_price_yearly,
    currency,
    is_active,
    is_popular,
    badge,
    features,
    limits,
    metadata
) VALUES (
    'plan-pro',
    'Plan Pro / Commerçant',
    'Solution complète de caisse tactile NaNa POS, gestion de stocks avancée, 10 caissiers, rapports financiers et CV Pro inclus.',
    'SUBSCRIPTION',
    0.00,
    15000.00,
    150000.00,
    'XOF',
    true,
    true,
    'Plus Populaire',
    '[
        "Caisse enregistreuse tactile NaNa POS illimitée",
        "Gestion jusqu''à 10 caissiers avec codes PIN individuels",
        "Catalogue et stocks en temps réel sans limitation",
        "Module CV Pro & Lettres de motivation inclus en illimité",
        "Passerelles de paiement souveraines à 0% de commission",
        "Rapports de ventes, marges nettes et clôtures de caisse Z"
    ]'::jsonb,
    '{
        "maxProducts": -1,
        "maxFunnels": -1,
        "maxCourses": -1,
        "maxLiveCallsMonthly": -1,
        "maxDocuments": -1,
        "maxCashiers": 10,
        "cvProAllowed": true,
        "customDomainAllowed": true
    }'::jsonb,
    '{"tier": "PRO", "offlinePosEnabled": true}'::jsonb
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
    is_popular = EXCLUDED.is_popular,
    badge = EXCLUDED.badge,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- E. PLAN BUSINESS / MULTI-BOUTIQUES STANDARD (Abonnement Récurrent)
INSERT INTO public.plans (
    code,
    name,
    description,
    billing_type,
    default_commission_rate,
    subscription_price_monthly,
    subscription_price_yearly,
    currency,
    is_active,
    is_popular,
    badge,
    features,
    limits,
    metadata
) VALUES (
    'plan-business',
    'Plan Business / Multi-Boutiques',
    'Solution taillée pour les commerces en réseau : multi-points de vente, synchronisation d''entrepôts, pixels de tracking et CRM marketing.',
    'SUBSCRIPTION',
    0.00,
    30000.00,
    300000.00,
    'XOF',
    true,
    false,
    'Croissance & Équipe',
    '[
        "Tout le Plan Pro inclus avec priorisation réseau",
        "Gestion multi-points de vente (jusqu''à 20 caissiers / boutiques)",
        "Pixels de conversion Meta & TikTok synchronisés",
        "CRM marketing et relances automatiques de paniers abandonnés",
        "Module CV Pro & documents administratifs illimités",
        "Assistance technique prioritaire par WhatsApp dédié"
    ]'::jsonb,
    '{
        "maxProducts": -1,
        "maxFunnels": -1,
        "maxCourses": -1,
        "maxLiveCallsMonthly": -1,
        "maxDocuments": -1,
        "maxCashiers": 20,
        "cvProAllowed": true,
        "multiStoreAllowed": true
    }'::jsonb,
    '{"tier": "BUSINESS", "crmSync": true}'::jsonb
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
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- F. PLAN ENTERPRISE / RÉSEAU & FRANCHISE STANDARD (Abonnement Récurrent)
INSERT INTO public.plans (
    code,
    name,
    description,
    billing_type,
    default_commission_rate,
    subscription_price_monthly,
    subscription_price_yearly,
    currency,
    is_active,
    is_popular,
    badge,
    features,
    limits,
    metadata
) VALUES (
    'plan-enterprise',
    'Plan Enterprise / Réseau & Franchise',
    'Infrastructure dédiée et marque blanche intégrale : aucune mention NaNa, caissiers illimités, SLA garanti 99.9% et compte de gestionnaire dédié.',
    'SUBSCRIPTION',
    0.00,
    60000.00,
    600000.00,
    'XOF',
    true,
    false,
    'Marque Blanche VIP',
    '[
        "Tout le Plan Business avec infrastructure cloud prioritaire",
        "Marque Blanche 100% : votre propre marque sur reçus, vitrines et portails",
        "Nombre d''utilisateurs, caisses et boutiques illimité",
        "CV Pro, devis et attestations d''entreprise illimités",
        "Accès complet aux webhooks & API souveraines",
        "Chargé de compte dédié et garantie de disponibilité 99.9%"
    ]'::jsonb,
    '{
        "maxProducts": -1,
        "maxFunnels": -1,
        "maxCourses": -1,
        "maxLiveCallsMonthly": -1,
        "maxDocuments": -1,
        "maxCashiers": -1,
        "cvProAllowed": true,
        "whiteLabel": true
    }'::jsonb,
    '{"tier": "ENTERPRISE", "dedicatedSla": true}'::jsonb
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
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- =======================================================================
-- 6. INSERTION DES RÈGLES DE SÉQUESTRE & COMMISSIONS CRÉATEUR
-- =======================================================================
INSERT INTO public.service_commission_rules (
    service_code,
    service_name,
    commission_rate,
    escrow_period_hours,
    min_commission_amount,
    currency,
    is_active,
    description
) VALUES
(
    'srv-escrow-lms',
    'Escrow Cours & Formations LMS',
    10.00,
    48,
    100.00,
    'XOF',
    true,
    'Séquestre sur les inscriptions aux cours et masterclass en ligne. Déblocage sous 48h après validation pédagogique.'
),
(
    'srv-escrow-digital',
    'Escrow Produits Numériques & Fichiers',
    8.00,
    24,
    50.00,
    'XOF',
    true,
    'Séquestre sur la vente de fichiers téléchargeables, e-books et ressources numériques. Déblocage automatique à 24h.'
),
(
    'srv-escrow-webinar',
    'Escrow Billetterie Webinaires & Ateliers',
    10.00,
    2,
    150.00,
    'XOF',
    true,
    'Séquestre sur les tickets d''événements en ligne. Déblocage automatisé 2h après l''heure de fin programmée du webinaire.'
),
(
    'srv-escrow-funnel',
    'Escrow Tunnels de Vente & Offres Spéciales',
    7.00,
    48,
    100.00,
    'XOF',
    true,
    'Séquestre sur les conversions en 1-clic générées via les tunnels de vente. Garantie de conformité et livraison.'
)
ON CONFLICT (service_code) DO UPDATE SET
    service_name = EXCLUDED.service_name,
    commission_rate = EXCLUDED.commission_rate,
    escrow_period_hours = EXCLUDED.escrow_period_hours,
    min_commission_amount = EXCLUDED.min_commission_amount,
    currency = EXCLUDED.currency,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = NOW();

-- =======================================================================
-- 7. INSERTION DE LA TARIFICATION À L'USAGE (PAY-AS-YOU-GO)
-- RÈGLE : usage-cvpro est facturé strictement à l'acte ici (500 XOF / document)
-- =======================================================================
INSERT INTO public.usage_service_rates (
    usage_code,
    service_name,
    rate_per_unit,
    credit_units_per_act,
    unit_label,
    currency,
    is_active,
    description
) VALUES
(
    'usage-cvpro',
    'Génération CV Pro & Lettre de Motivation IA',
    500.00,
    5,
    'document',
    'XOF',
    true,
    'Création et export PDF Haute Définition d''un CV professionnel avec mise en page A4 et lettre de motivation générée par IA. Strictement facturé à l''acte pour le Plan Usage ou Plan Zéro.'
),
(
    'usage-sms-brevo',
    'Passerelle SMS Pro via Twilio / Brevo',
    25.00,
    1,
    'SMS',
    'XOF',
    true,
    'Distribution instantanée de SMS d''authentification OTP, confirmations de commande et alertes de livraison.'
),
(
    'usage-whatsapp-biz',
    'Notifications WhatsApp Business Automatisées',
    35.00,
    1,
    'message',
    'XOF',
    true,
    'Envoi de reçus de caisse interactifs, relances de paniers et messages de suivi client directement sur WhatsApp.'
),
(
    'usage-ai-media',
    'Génération d''Images & Vidéos Publicitaires par IA',
    150.00,
    3,
    'média HD',
    'XOF',
    true,
    'Création neuronale de visuels produits haute résolution et d''animations publicitaires courtes via Studio IA.'
),
(
    'usage-ai-script',
    'Génération de Scripts de Vente & Copywriting IA',
    75.00,
    1,
    'script',
    'XOF',
    true,
    'Rédaction persuasive de pitchs commerciaux, fiches produits percutantes et publications pour réseaux sociaux.'
),
(
    'usage-docusign',
    'Signature Électronique Certifiée & Archivage Légal',
    300.00,
    3,
    'signature',
    'XOF',
    true,
    'Paraphe numérique de devis, bons de commande et contrats avec horodatage infalsifiable et valeur juridique.'
),
(
    'usage-flash-sale',
    'Activation de Session Vente Flash en Direct',
    1000.00,
    10,
    'session',
    'XOF',
    true,
    'Mise en avant prioritaire de la boutique avec compte à rebours immersif et bandeau promotionnel en temps réel.'
),
(
    'usage-popup-funnel',
    'Tunnel Dépliable par Produit (Mini-Tunnel 1-Clic)',
    500.00,
    5,
    'tunnel actif',
    'XOF',
    true,
    'Création et hébergement d''un tunnel de capture rapide relié à un produit vedette pour les campagnes publicitaires.'
)
ON CONFLICT (usage_code) DO UPDATE SET
    service_name = EXCLUDED.service_name,
    rate_per_unit = EXCLUDED.rate_per_unit,
    credit_units_per_act = EXCLUDED.credit_units_per_act,
    unit_label = EXCLUDED.unit_label,
    currency = EXCLUDED.currency,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = NOW();

-- =======================================================================
-- 8. INDEX DE PERFORMANCE SUPPLÉMENTAIRES
-- =======================================================================
CREATE INDEX IF NOT EXISTS idx_plans_billing_type ON public.plans(billing_type);
CREATE INDEX IF NOT EXISTS idx_commission_rules_service ON public.service_commission_rules(service_code);
CREATE INDEX IF NOT EXISTS idx_usage_rates_code ON public.usage_service_rates(usage_code);
