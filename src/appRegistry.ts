/**
 * REGISTRE OFFICIEL DES 27 APPLICATIONS, SERVICES, MODULES ET OUTILS NANASORE (App Registry)
 * Dénominations officielles exactes et immuables de l'écosystème NaNa POS.
 * Aucune altération de libellé : respect strict des identités d'origine.
 */

export type TaxonomyType = 'APPLICATION' | 'SERVICE' | 'MODULE' | 'OUTIL';

export interface AppModule {
  id: string;
  name: string;
  taxonomy: TaxonomyType;
  category: string;
  description: string;
  route: string;
  view?: string;
  actionId?: string;
  defaultActive: boolean;
  keywords?: string[];
  aliases?: string[];
}

export const ALL_OFFICIAL_CATALOG: AppModule[] = [
  // =========================================================================
  // --- 11 APPLICATIONS ---
  // =========================================================================
  {
    id: 'app-pos',
    name: 'Caisse Tactile Magasin (POS)',
    taxonomy: 'APPLICATION',
    category: 'Commerce & Vente',
    description: 'Encaissement express au comptoir, tickets & paiements.',
    view: 'POS',
    route: '/pos',
    defaultActive: true,
    keywords: ['caisse', 'pos', 'vente', 'encaissement', 'ticket', 'comptoir', 'magasin'],
    aliases: ['cash_register', 'caisse-pos', 'mod-pos', 'pos', 'pos-caisse-core']
  },
  {
    id: 'app-studio',
    name: 'Vitrine en Ligne (E-Shop)',
    taxonomy: 'APPLICATION',
    category: 'Commerce & Vente',
    description: 'Boutique connectée, panier client & commande WhatsApp.',
    view: 'STUDIO',
    route: '/shop',
    defaultActive: true,
    keywords: ['boutique', 'eshop', 'vitrine', 'ecommerce', 'web', 'online', 'store'],
    aliases: ['online_store', 'vitrine-eshop', 'mod-vitrine', 'eshop', 'vitrine']
  },
  {
    id: 'app-wameet',
    name: 'Wameet',
    taxonomy: 'APPLICATION',
    category: 'Réseau & Social',
    description: 'Réseau social professionnel, messagerie & stories marchands.',
    view: 'WAMEET',
    route: '/wameet',
    defaultActive: true,
    keywords: ['wameet', 'social', 'reseau', 'messagerie', 'stories'],
    aliases: ['wameet']
  },
  {
    id: 'app-nanagenerator',
    name: 'Nanagénérateur AI',
    taxonomy: 'APPLICATION',
    category: 'Studio IA',
    description: 'Création de vidéos et visuels publicitaires par intelligence artificielle.',
    view: 'APPS_NANAGENERATOR',
    route: '/dashboard/apps/nanagenerator',
    defaultActive: true,
    keywords: ['nanagenerator', 'video', 'image', 'ia', 'pub', 'studio'],
    aliases: ['nanagenerator', 'ai-generator']
  },
  {
    id: 'app-ultimate-funnel',
    name: 'Ultimate Funnel Builder',
    taxonomy: 'APPLICATION',
    category: 'Tunnels de Vente',
    description: 'Constructeur de tunnels haute conversion avec upsells et paiements express.',
    view: 'ULTIMATE_FUNNEL',
    route: '/dashboard/funnel/ultimate',
    defaultActive: false,
    keywords: ['ultimate', 'funnel', 'builder', 'conversion', 'upsell', 'tunnel'],
    aliases: ['sales_funnels', 'ultimate-funnel-builder', 'funnel-builder']
  },
  {
    id: 'app-modular-funnel',
    name: 'Funnel Builder Modulaire',
    taxonomy: 'APPLICATION',
    category: 'Tunnels de Vente',
    description: 'Concepteur modulaire par blocs drag & drop pour tunnels sur-mesure.',
    view: 'MODULAR_FUNNEL',
    route: '/dashboard/funnel/modular',
    defaultActive: false,
    keywords: ['modular', 'funnel', 'modulaire', 'drag-and-drop'],
    aliases: ['modular-funnel-builder']
  },
  {
    id: 'app-deal-builder',
    name: 'Public Deal Page Builder',
    taxonomy: 'APPLICATION',
    category: 'Tunnels de Vente',
    description: 'Créateur de pages d\'offres flash et de deals publics physiques à conversion immédiate.',
    view: 'PHYSICAL_FUNNEL',
    route: '/dashboard/funnel/physical',
    defaultActive: false,
    keywords: ['deal', 'public', 'page', 'builder', 'flash'],
    aliases: ['public-deal-builder']
  },
  {
    id: 'app-cours-forge',
    name: 'Cours Forge',
    taxonomy: 'APPLICATION',
    category: 'Éducation',
    description: 'Atelier complet de conception et génération de cours, modules vidéo et quiz.',
    view: 'COURSE_CREATE',
    route: '/dashboard/courses/create',
    defaultActive: false,
    keywords: ['cours', 'forge', 'formation', 'quiz', 'lms'],
    aliases: ['lms_learning', 'cours-forge', 'course-forge']
  },
  {
    id: 'app-nanamarket',
    name: 'NaNa Market (Annuaire B2B2C)',
    taxonomy: 'APPLICATION',
    category: 'Marketplace',
    description: 'Place de marché nationale et annuaire des marchands vérifiés.',
    view: 'MARKET_DIRECTORY',
    route: '/dashboard/market',
    defaultActive: true,
    keywords: ['market', 'marketplace', 'annuaire', 'b2b2c'],
    aliases: ['nanamarket', 'mod-market-directory']
  },
  {
    id: 'app-webinar',
    name: 'Studio de Génération de Live et Webinaire',
    taxonomy: 'APPLICATION',
    category: 'Direct Live',
    description: 'Diffusion vidéo en direct avec vente de produits en temps réel.',
    view: 'WEBINAR',
    route: '/webinar',
    defaultActive: false,
    keywords: ['live', 'webinaire', 'streaming', 'video', 'shopping', 'direct'],
    aliases: ['webinars_live', 'live-webinar', 'webinar', 'lives']
  },
  {
    id: 'app-docusign',
    name: 'DocuSign Hub & Contrats Signés',
    taxonomy: 'APPLICATION',
    category: 'Juridique',
    description: 'Signature électronique légale de contrats de vente et partenariats.',
    view: 'DOCUSIGN',
    route: '/docusign',
    defaultActive: false,
    keywords: ['docusign', 'contrats', 'signature', 'juridique', 'legal'],
    aliases: ['digital_signature', 'docusign', 'contrats']
  },

  // =========================================================================
  // --- 7 SERVICES ---
  // =========================================================================
  {
    id: 'srv-crm-automation',
    name: 'CRM et Automation',
    taxonomy: 'SERVICE',
    category: 'Intégrations & Extensions',
    description: 'Paramètres & Intégrations (Modules Extensions) : WooCommerce, Passerelle SMS / OTP, Emailing Brevo et connecteurs.',
    view: 'SETTINGS_EXTENSIONS',
    route: '/dashboard/connecteurs',
    defaultActive: true,
    keywords: ['crm', 'automation', 'connecteurs', 'woocommerce', 'brevo', 'sms-otp'],
    aliases: ['settings_integrations', 'crm_automation', 'connecteurs']
  },
  {
    id: 'srv-theme-builder',
    name: 'Studio de Choix et Construction de Thème',
    taxonomy: 'SERVICE',
    category: 'Boutique & Design',
    description: 'Sélectionnez, prévisualisez et construisez le thème pour votre vitrine e-commerce.',
    view: 'STUDIO',
    route: '/dashboard/vitrine',
    defaultActive: true,
    keywords: ['theme', 'builder', 'design', 'vitrine', 'studio'],
    aliases: ['theme-builder']
  },
  {
    id: 'srv-partner',
    name: 'Espace Partenaire & Affiliation',
    taxonomy: 'SERVICE',
    category: 'Croissance',
    description: 'Programme d\'affiliation avec commissions automatiques et liens parrainage.',
    view: 'PARTNER',
    route: '/partner',
    defaultActive: false,
    keywords: ['affiliation', 'partenaire', 'parrainage', 'commissions'],
    aliases: ['partner-program']
  },
  {
    id: 'srv-course-create',
    name: 'Centre de Création de Cours, et De Formation',
    taxonomy: 'SERVICE',
    category: 'Formation',
    description: 'Correction des devoirs, suivi des cohortes et gestion pédagogique.',
    view: 'INSTRUCTOR',
    route: '/dashboard/formateur',
    defaultActive: false,
    keywords: ['formateur', 'creation-cours', 'cohortes', 'pedagogique'],
    aliases: ['instructor-hub']
  },
  {
    id: 'srv-academy-support',
    name: 'Centre de Formation et D\'Accompagnement',
    taxonomy: 'SERVICE',
    category: 'Éducation',
    description: 'Espace cours, leçons vidéo et accompagnement des apprenants.',
    view: 'ACADEMY',
    route: '/academy',
    defaultActive: false,
    keywords: ['academie', 'formation', 'accompagnement', 'cours-video'],
    aliases: ['academy-support']
  },
  {
    id: 'srv-nana-switch',
    name: 'NaNa Switch Cloud (Multi-Comptes)',
    taxonomy: 'SERVICE',
    category: 'Communication & Réseau',
    description: 'Basculez instantanément entre vos boutiques et comptes sans vous reconnecter.',
    view: 'NANA_SWITCH',
    route: '/dashboard/switch',
    defaultActive: true,
    keywords: ['switch', 'cloud', 'multi-comptes', 'boutiques'],
    aliases: ['nana-switch']
  },
  {
    id: 'srv-kyc',
    name: 'Chaîne d\'Identification KYC & Sécurité',
    taxonomy: 'SERVICE',
    category: 'Conformité',
    description: 'Vérification des pièces d\'identité et conformité juridique des marchands.',
    view: 'KYC_VERIFICATION',
    route: '/kyc',
    defaultActive: false,
    keywords: ['kyc', 'identification', 'securite', 'conformite'],
    aliases: ['kyc-verification']
  },

  // =========================================================================
  // --- 6 MODULES ---
  // =========================================================================
  {
    id: 'mod-inventory',
    name: 'Stock & Inventaire Intelligent',
    taxonomy: 'MODULE',
    category: 'Gestion',
    description: 'Suivi en temps réel des quantités, alertes de rupture et codes-barres.',
    view: 'INVENTORY',
    route: '/inventory',
    defaultActive: true,
    keywords: ['stock', 'inventaire', 'produits', 'rupture', 'codes-barres'],
    aliases: ['catalog', 'inventory_suppliers', 'mod_stock', 'inventory']
  },
  {
    id: 'mod-debts',
    name: 'Gestion des Dettes (Ardoises clients)',
    taxonomy: 'MODULE',
    category: 'Trésorerie',
    description: 'Carnet de crédits clients, échéanciers et relances WhatsApp en 1 clic.',
    view: 'DEBT_BOOK',
    route: '/dashboard/dettes',
    defaultActive: true,
    keywords: ['dettes', 'ardoises', 'credit-client', 'creances', 'relances'],
    aliases: ['crm_customers', 'mod_credit_book', 'credit-book', 'debts']
  },
  {
    id: 'mod-analytics',
    name: 'Analytique & Courbe des Gains',
    taxonomy: 'MODULE',
    category: 'Statistiques',
    description: 'Graphiques de chiffre d\'affaires, marges bénéficiaires et produits phares.',
    view: 'REPORTS',
    route: '/dashboard/rapports',
    defaultActive: true,
    keywords: ['analytique', 'gains', 'statistiques', 'courbe', 'chiffre-affaires'],
    aliases: ['analytics_reports', 'analytics']
  },
  {
    id: 'mod-team-employees',
    name: 'Gestion des Employés / Caissiers',
    taxonomy: 'MODULE',
    category: 'Sécurité & RH',
    description: 'Droits d\'accès par code PIN, caissiers multiples et traçabilité des ventes.',
    actionId: 'EMPLOYEE_MANAGEMENT',
    route: '/dashboard/staff',
    defaultActive: true,
    keywords: ['employes', 'caissiers', 'equipe', 'droits', 'shifts', 'pin'],
    aliases: ['team_staff', 'cashier-sessions', 'team-employees']
  },
  {
    id: 'mod-cvpro',
    name: 'CVPro & Création Documentaire',
    taxonomy: 'MODULE',
    category: 'Documents',
    description: 'Générateur de CV professionnels, attestations et portfolios vendeurs.',
    view: 'CV_CREATOR',
    route: '/dashboard/cv',
    defaultActive: false,
    keywords: ['cvpro', 'cv', 'attestations', 'documents'],
    aliases: ['cvpro']
  },
  {
    id: 'mod-pixels-crm',
    name: 'Pixels de Tracking / CRM Avancé',
    taxonomy: 'MODULE',
    category: 'Marketing',
    description: 'Connexion des pixels Facebook Meta, Google Analytics & TikTok Ads.',
    actionId: 'TRACKING_PIXELS_CRM',
    route: '/dashboard/tracking-crm',
    defaultActive: false,
    keywords: ['pixels', 'tracking', 'meta', 'tiktok', 'analytics'],
    aliases: ['tracking-pixels', 'pixels-crm']
  },

  // =========================================================================
  // --- OUTILS ---
  // =========================================================================
  {
    id: 'tool-scanner',
    name: 'Scanner Code-Barres & Douchette USB/Caméra',
    taxonomy: 'OUTIL',
    category: 'Matériel POS',
    description: 'Détection instantanée via douchette physique laser ou caméra mobile.',
    view: 'BARCODE_SCANNER',
    route: '/scanner',
    defaultActive: true,
    keywords: ['scanner', 'douchette', 'codes-barres', 'camera', 'laser'],
    aliases: ['mod_barcode_scanner', 'barcode-scanner', 'scanner']
  },
  {
    id: 'tool-excel',
    name: 'Import & Export de Fichiers Excel / CSV',
    taxonomy: 'OUTIL',
    category: 'Données',
    description: 'Importation en masse de catalogues produits et export comptable.',
    view: 'EXCEL_IMPORT',
    route: '/excel',
    defaultActive: true,
    keywords: ['excel', 'csv', 'import', 'export', 'donnees'],
    aliases: ['excel-import']
  },
  {
    id: 'tool-gateway',
    name: 'Passerelle Souveraine / Connecter API Nanasore',
    taxonomy: 'OUTIL',
    category: 'Intégration API',
    description: 'Intégration directe des API souveraines et webhooks temps réel.',
    actionId: 'SOVEREIGN_GATEWAY',
    route: '/dashboard/gateway',
    defaultActive: false,
    keywords: ['passerelle', 'api', 'webhooks', 'souveraine', 'connecteur'],
    aliases: ['sovereign-gateway']
  }
];

// Alias exporté standard
export const OFFICIAL_MODULES: AppModule[] = ALL_OFFICIAL_CATALOG;
export const appRegistry: AppModule[] = ALL_OFFICIAL_CATALOG;
export default appRegistry;

// Table de correspondance O(1) par ID et alias
const LOOKUP_MAP = new Map<string, AppModule>();
ALL_OFFICIAL_CATALOG.forEach((item) => {
  LOOKUP_MAP.set(item.id.toLowerCase(), item);
  LOOKUP_MAP.set(item.name.toLowerCase(), item);
  if (item.aliases) {
    item.aliases.forEach((alias) => LOOKUP_MAP.set(alias.toLowerCase(), item));
  }
});

/**
 * Recherche un élément du catalogue officiel par son ID, son nom ou un de ses alias
 */
export function getOfficialModuleById(idOrNameOrAlias: string): AppModule | undefined {
  if (!idOrNameOrAlias) return undefined;
  return LOOKUP_MAP.get(idOrNameOrAlias.trim().toLowerCase());
}

/**
 * Vérifie si un élément est activé par défaut
 */
export function isModuleDefaultActive(idOrNameOrAlias: string): boolean {
  const item = getOfficialModuleById(idOrNameOrAlias);
  return item ? item.defaultActive : false;
}

/**
 * Récupère l'intégralité du catalogue des 27 applications, services, modules et outils
 */
export function getAllOfficialModules(): AppModule[] {
  return [...ALL_OFFICIAL_CATALOG];
}
