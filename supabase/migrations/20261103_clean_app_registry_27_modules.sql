-- =======================================================================
-- MIGRATION SUPABASE : Nettoyage et Scellement Strict des 27 Modules Canoniques
-- Table cible : public.app_registry & public.organization_blocks
-- Écosystème  : Nanasore SaaS / NaNa POS
-- Date        : 2026-11-03
-- =======================================================================

-- 1. NETTOYAGE DES LIAISONS OBSOLÈTES DANS organization_blocks
-- Supprime les activations liées aux anciens modules historiques / fictifs
DELETE FROM public.organization_blocks
WHERE block_key NOT IN (
    'pos',
    'studio',
    'wameet',
    'nanagenerator',
    'ultimate-funnel',
    'modular-funnel',
    'deal-builder',
    'cours-forge',
    'nanamarket',
    'webinar',
    'docusign',
    'crm-automation',
    'theme-builder',
    'partner',
    'course-create',
    'academy-support',
    'nana-switch',
    'kyc',
    'inventory',
    'debts',
    'analytics',
    'team-employees',
    'cvpro',
    'pixels-crm',
    'scanner',
    'excel',
    'gateway'
);

-- 2. NETTOYAGE DES ANCIENNES ENTRÉES RÉSIDUELLES DANS app_registry
-- Supprime les 17 doublons / modules fictifs (ex: app-tinnela, srv-sms, tool-printer, etc.)
DELETE FROM public.app_registry
WHERE key NOT IN (
    'pos',
    'studio',
    'wameet',
    'nanagenerator',
    'ultimate-funnel',
    'modular-funnel',
    'deal-builder',
    'cours-forge',
    'nanamarket',
    'webinar',
    'docusign',
    'crm-automation',
    'theme-builder',
    'partner',
    'course-create',
    'academy-support',
    'nana-switch',
    'kyc',
    'inventory',
    'debts',
    'analytics',
    'team-employees',
    'cvpro',
    'pixels-crm',
    'scanner',
    'excel',
    'gateway'
);

-- 3. INSERTION / MISE À JOUR EXACTE DES 27 MODULES CANONIQUES (UPSERT)
INSERT INTO public.app_registry (key, name, description, category, is_public)
VALUES
    -- =======================================================================
    -- A. LES 11 APPLICATIONS (APPLICATION)
    -- =======================================================================
    (
        'pos',
        'Caisse Tactile Magasin (POS)',
        'Encaissement express au comptoir, tickets thermiques & paiements Mobile Money.',
        'Commerce & Vente',
        true
    ),
    (
        'studio',
        'Vitrine en Ligne (E-Shop)',
        'Boutique connectée nsore.shop, panier client & commande WhatsApp Pay.',
        'Commerce & Vente',
        true
    ),
    (
        'wameet',
        'Wameet',
        'Réseau social professionnel, messagerie instantanée, stories et visioconférence.',
        'Réseau & Social',
        true
    ),
    (
        'nanagenerator',
        'Nanagénérateur AI',
        'Création de vidéos et visuels publicitaires par intelligence artificielle.',
        'Studio IA',
        true
    ),
    (
        'ultimate-funnel',
        'Ultimate Funnel Builder',
        'Tunnels de vente avancés, upsells en 1 clic et séquences de conversion.',
        'Tunnels de Vente',
        true
    ),
    (
        'modular-funnel',
        'Funnel Builder Modulaire',
        'Tunnels modulaires 12 blocs haute performance pour l''e-commerce.',
        'Tunnels de Vente',
        true
    ),
    (
        'deal-builder',
        'Public Deal Page Builder',
        'Création de pages de vente flash, offres groupées et promotions ciblées.',
        'Tunnels de Vente',
        true
    ),
    (
        'cours-forge',
        'Cours Forge',
        'Plateforme LMS, gestion des étudiants, certificats sécurisés et espaces de cours.',
        'Éducation',
        true
    ),
    (
        'nanamarket',
        'NaNa Market (Annuaire B2B2C)',
        'Annuaire national des commerces, vitrines publiques et mise en relation.',
        'Marketplace',
        true
    ),
    (
        'webinar',
        'Studio de Génération de Live et Webinaire',
        'Diffusion de sessions en direct, webinaires interactifs et vente live shopping.',
        'Direct Live',
        true
    ),
    (
        'docusign',
        'DocuSign Hub & Contrats Signés',
        'Signature électronique certifiée, devis et paraphe juridique de contrats.',
        'Juridique',
        true
    ),

    -- =======================================================================
    -- B. LES 7 SERVICES TRANSVERSAUX (SERVICE)
    -- =======================================================================
    (
        'crm-automation',
        'CRM et Automation',
        'Paramètres & Intégrations : WooCommerce, Passerelle SMS Brevo et connecteurs.',
        'Intégrations & Extensions',
        true
    ),
    (
        'theme-builder',
        'Studio de Choix et Construction de Thème',
        'Sélectionnez, prévisualisez et construisez le thème pour votre vitrine e-commerce.',
        'Boutique & Design',
        true
    ),
    (
        'partner',
        'Espace Partenaire & Affiliation',
        'Programme d''affiliation avec commissions automatiques et liens de parrainage.',
        'Croissance',
        true
    ),
    (
        'course-create',
        'Centre de Création de Cours, et De Formation',
        'Correction des devoirs, suivi des cohortes et gestion pédagogique des formateurs.',
        'Formation',
        true
    ),
    (
        'academy-support',
        'Centre de Formation et D''Accompagnement',
        'Espace cours, leçons vidéo et accompagnement des apprenants du campus.',
        'Éducation',
        true
    ),
    (
        'nana-switch',
        'NaNa Switch Cloud (Multi-Comptes)',
        'Basculez instantanément entre vos boutiques et comptes sans vous reconnecter.',
        'Communication & Réseau',
        true
    ),
    (
        'kyc',
        'Chaîne d''Identification KYC & Sécurité',
        'Vérification des pièces d''identité et conformité juridique des marchands.',
        'Conformité',
        true
    ),

    -- =======================================================================
    -- C. LES 6 MODULES DU DASHBOARD (MODULE)
    -- =======================================================================
    (
        'inventory',
        'Stock & Inventaire Intelligent',
        'Suivi en temps réel des quantités, alertes de rupture et codes-barres.',
        'Gestion',
        true
    ),
    (
        'debts',
        'Gestion des Dettes (Ardoises clients)',
        'Carnet de crédits clients, échéanciers et relances WhatsApp en 1 clic.',
        'Trésorerie',
        true
    ),
    (
        'analytics',
        'Analytique & Courbe des Gains',
        'Graphiques de chiffre d''affaires, marges bénéficiaires et produits phares.',
        'Statistiques',
        true
    ),
    (
        'team-employees',
        'Gestion des Employés / Caissiers',
        'Droits d''accès par code PIN, caissiers multiples et traçabilité des ventes.',
        'Sécurité & RH',
        true
    ),
    (
        'cvpro',
        'CVPro & Création Documentaire',
        'Générateur de CV professionnels à fort impact et lettres de motivation IA (Exclu du Plan Zéro).',
        'Documents',
        true
    ),
    (
        'pixels-crm',
        'Pixels de Tracking / CRM Avancé',
        'Intégration des pixels Meta & TikTok, CRM et relance de paniers abandonnés.',
        'Marketing',
        true
    ),

    -- =======================================================================
    -- D. LES 3 OUTILS MATÉRIELS & CONNECTEURS (OUTIL)
    -- =======================================================================
    (
        'scanner',
        'Scanner Code-Barres & Douchette USB/Caméra',
        'Lecture optique instantanée des codes-barres produits via caméra ou douchette USB.',
        'Matériel POS',
        true
    ),
    (
        'excel',
        'Import & Export de Fichiers Excel / CSV',
        'Migration rapide de catalogue, sauvegarde et extraction de données massives.',
        'Données',
        true
    ),
    (
        'gateway',
        'Passerelle Souveraine / Connecter API Nanasore',
        'Intégration directe des API souveraines et webhooks temps réel.',
        'Intégration API',
        true
    )
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    is_public = EXCLUDED.is_public;

-- 4. VÉRIFICATION DU RÉSULTAT
-- Doit retourner exactement 27
SELECT COUNT(*) AS total_official_modules FROM public.app_registry;
