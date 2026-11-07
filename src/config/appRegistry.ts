/**
 * ============================================================================
 * REGISTRE CANONIQUE DES 27 MODULES NANASORE (SOURCE UNIQUE DE VÉRITÉ)
 * ============================================================================
 * 
 * Fichier de référence immuable définissant l'architecture des 27 modules
 * officiels répartis en 4 blocs distincts :
 *   - 11 Applications
 *   - 7 Services
 *   - 6 Modules
 *   - 3 Outils
 * 
 * Tout nouveau composant (Sidebar, Hub, Routeur, Omnibar) doit consommer ce
 * registre comme seule source de vérité.
 */

export type ModuleType = 'APPLICATION' | 'SERVICE' | 'MODULE' | 'OUTIL';
// Alias rétro-compatible
export type TaxonomyType = ModuleType;

export interface CanonicalModule {
  id: string;                 // Identifiant canonique (slug unique)
  slug: string;               // Slug URL / identifiant technique
  name: string;               // Nom officiel affiché
  route: string;              // Route de destination canonique
  category: string;           // Catégorie fonctionnelle
  description: string;        // Description concise du module
  type: ModuleType;           // Type de module : APPLICATION | SERVICE | MODULE | OUTIL
  taxonomy: ModuleType;       // Alias pour compatibilité
  defaultActive: boolean;     // Activation par défaut pour les nouveaux comptes
  view?: string;              // Clé de vue interne pour le routeur d'état (ex: POS, STUDIO)
  actionId?: string;          // Action interne (ex: SOVEREIGN_GATEWAY, EMPLOYEE_MANAGEMENT)
  icon?: string;              // Nom de l'icône Lucide associée
  keywords?: string[];        // Mots-clés de recherche Omnibar / Hub
  aliases?: string[];         // Identifiants alternatifs ou historiques supportés
  requiredRoles?: string[];   // Rôles requis (ex: vendor, admin)
  permissions?: string[];     // Permissions requises pour l'accès
}

// Rétro-compatibilité pour les composants existants
export type AppModule = CanonicalModule;

// ============================================================================
// BLOC 1 : LES 11 APPLICATIONS
// ============================================================================
export const APPLICATIONS_BLOCK: CanonicalModule[] = [
  {
    id: 'emailing',
    slug: 'emailing',
    name: 'Studio E-mailing & Campagnes Pro',
    route: '/dashboard/marketing/emailing',
    category: 'Marketing & Vente',
    description: "Éditeur visuel d'e-mails, segmentation d'audience et revente de quotas Pro.",
    type: 'APPLICATION',
    taxonomy: 'APPLICATION',
    defaultActive: true,
    view: 'EMAILING',
    icon: 'Mail',
    keywords: ['email', 'emailing', 'campagne', 'pro', 'marketing', 'newsletter', 'quotas', 'mailing', 'contacts', 'diffusion', 'crm'],
    aliases: ['app-emailing', 'campaigns', 'marketing-emailing', 'email-studio', 'campagne-emailing']
  },

  {
    id: 'pos',
    slug: 'pos',
    name: 'Caisse Tactile Magasin (POS)',
    route: '/pos',
    category: 'Commerce & Vente',
    description: 'Encaissement express au comptoir, tickets & paiements.',
    type: 'APPLICATION',
    taxonomy: 'APPLICATION',
    defaultActive: true,
    view: 'POS',
    icon: 'ShoppingCart',
    keywords: ['caisse', 'pos', 'vente', 'encaissement', 'ticket', 'comptoir', 'magasin'],
    aliases: ['app-pos', 'caisse-pos', 'mod-pos', 'cash_register', 'pos-caisse-core']
  },
  {
    id: 'studio',
    slug: 'studio',
    name: 'Vitrine en Ligne (E-Shop)',
    route: '/shop',
    category: 'Commerce & Vente',
    description: 'Boutique connectée, panier client & commande WhatsApp.',
    type: 'APPLICATION',
    taxonomy: 'APPLICATION',
    defaultActive: true,
    view: 'STUDIO',
    icon: 'Store',
    keywords: ['boutique', 'eshop', 'vitrine', 'ecommerce', 'web', 'online', 'store'],
    aliases: ['app-studio', 'online_store', 'vitrine-eshop', 'mod-vitrine', 'eshop', 'vitrine']
  },
  {
    id: 'wameet',
    slug: 'wameet',
    name: 'Wameet',
    route: '/wameet',
    category: 'Réseau & Social',
    description: 'Réseau social professionnel, messagerie & stories marchands.',
    type: 'APPLICATION',
    taxonomy: 'APPLICATION',
    defaultActive: true,
    view: 'WAMEET',
    icon: 'MessageSquare',
    keywords: ['wameet', 'social', 'reseau', 'messagerie', 'stories'],
    aliases: ['app-wameet']
  },
  {
    id: 'nanagenerator',
    slug: 'nanagenerator',
    name: 'Nanagénérateur AI',
    route: '/dashboard/apps/nanagenerator',
    category: 'Studio IA',
    description: 'Création de vidéos et visuels publicitaires par intelligence artificielle.',
    type: 'APPLICATION',
    taxonomy: 'APPLICATION',
    defaultActive: true,
    view: 'APPS_NANAGENERATOR',
    icon: 'Sparkles',
    keywords: ['nanagenerator', 'video', 'image', 'ia', 'pub', 'studio', 'nanagenerateur'],
    aliases: ['app-nanagenerator', 'ai-generator', 'nanagenerateur']
  },
  {
    id: 'ultimate-funnel',
    slug: 'ultimate-funnel',
    name: 'Ultimate Funnel Builder',
    route: '/dashboard/funnel/ultimate',
    category: 'Tunnels de Vente',
    description: 'Constructeur de tunnels haute conversion avec upsells et paiements express.',
    type: 'APPLICATION',
    taxonomy: 'APPLICATION',
    defaultActive: false,
    view: 'ULTIMATE_FUNNEL',
    icon: 'TrendingUp',
    keywords: ['ultimate', 'funnel', 'builder', 'conversion', 'upsell', 'tunnel'],
    aliases: ['app-ultimate-funnel', 'sales_funnels', 'ultimate-funnel-builder', 'funnel-builder']
  },
  {
    id: 'modular-funnel',
    slug: 'modular-funnel',
    name: 'Funnel Builder Modulaire',
    route: '/dashboard/funnel/modular',
    category: 'Tunnels de Vente',
    description: 'Concepteur modulaire par blocs drag & drop pour tunnels sur-mesure.',
    type: 'APPLICATION',
    taxonomy: 'APPLICATION',
    defaultActive: false,
    view: 'MODULAR_FUNNEL',
    icon: 'Layers',
    keywords: ['modular', 'funnel', 'modulaire', 'drag-and-drop'],
    aliases: ['app-modular-funnel', 'modular-funnel-builder']
  },
  {
    id: 'deal-builder',
    slug: 'deal-builder',
    name: 'Public Deal Page Builder',
    route: '/dashboard/funnel/physical',
    category: 'Tunnels de Vente',
    description: "Créateur de pages d'offres flash et de deals publics physiques à conversion immédiate.",
    type: 'APPLICATION',
    taxonomy: 'APPLICATION',
    defaultActive: false,
    view: 'PHYSICAL_FUNNEL',
    icon: 'Tag',
    keywords: ['deal', 'public', 'page', 'builder', 'flash'],
    aliases: ['app-deal-builder', 'public-deal-builder']
  },
  {
    id: 'cours-forge',
    slug: 'cours-forge',
    name: 'Cours Forge',
    route: '/dashboard/courses/create',
    category: 'Éducation',
    description: 'Atelier complet de conception et génération de cours, modules vidéo et quiz.',
    type: 'APPLICATION',
    taxonomy: 'APPLICATION',
    defaultActive: false,
    view: 'COURSE_CREATE',
    icon: 'BookOpen',
    keywords: ['cours', 'forge', 'formation', 'quiz', 'lms'],
    aliases: ['app-cours-forge', 'lms_learning', 'course-forge']
  },
  {
    id: 'nanamarket',
    slug: 'nanamarket',
    name: 'NaNa Market (Annuaire B2B2C)',
    route: '/dashboard/market',
    category: 'Marketplace',
    description: 'Place de marché nationale et annuaire des marchands vérifiés.',
    type: 'APPLICATION',
    taxonomy: 'APPLICATION',
    defaultActive: true,
    view: 'MARKET_DIRECTORY',
    icon: 'Globe',
    keywords: ['market', 'marketplace', 'annuaire', 'b2b2c'],
    aliases: ['app-nanamarket', 'mod-market-directory']
  },
  {
    id: 'webinar',
    slug: 'webinar',
    name: 'Studio de Génération de Live et Webinaire',
    route: '/webinar',
    category: 'Direct Live',
    description: 'Diffusion vidéo en direct avec vente de produits en temps réel.',
    type: 'APPLICATION',
    taxonomy: 'APPLICATION',
    defaultActive: false,
    view: 'WEBINAR',
    icon: 'Video',
    keywords: ['live', 'webinaire', 'streaming', 'video', 'shopping', 'direct'],
    aliases: ['app-webinar', 'webinars_live', 'live-webinar', 'lives']
  },
  {
    id: 'docusign',
    slug: 'docusign',
    name: 'DocuSign Hub & Contrats Signés',
    route: '/docusign',
    category: 'Juridique',
    description: 'Signature électronique légale de contrats de vente et partenariats.',
    type: 'APPLICATION',
    taxonomy: 'APPLICATION',
    defaultActive: false,
    view: 'DOCUSIGN',
    icon: 'FileCheck',
    keywords: ['docusign', 'contrats', 'signature', 'juridique', 'legal'],
    aliases: ['app-docusign', 'digital_signature', 'contrats']
  },
  {
    id: 'vendor-upload',
    slug: 'academic-upload',
    name: 'Espace Upload Académique',
    route: '/academic/upload',
    category: 'academic',
    description: 'Module d\'upload unifié de cours, devoirs et rendus (Compression ZIP & R2)',
    type: 'APPLICATION',
    taxonomy: 'APPLICATION',
    defaultActive: true,
    requiredRoles: ['vendor', 'admin', 'professeur', 'etudiant'],
    permissions: ['vendor', 'admin', 'professeur', 'etudiant'],
    view: 'ACADEMIC_UPLOAD',
    icon: 'UploadCloud',
    keywords: ['upload', 'cours', 'devoir', 'remise', 'professeur', 'etudiant', 'étudiant', 'devoirs', 'r2', 'zip', 'rendu', 'campus'],
    aliases: ['vendor-upload', 'academic-upload', 'studio-upload', 'upload-vendeur', 'upload-academique']
  }
];

// ============================================================================
// BLOC 2 : LES 7 SERVICES
// ============================================================================
export const SERVICES_BLOCK: CanonicalModule[] = [
  {
    id: 'crm-automation',
    slug: 'crm-automation',
    name: 'CRM et Automation',
    route: '/dashboard/connecteurs',
    category: 'Intégrations & Extensions',
    description: 'Paramètres & Intégrations (Modules Extensions) : WooCommerce, Passerelle SMS / OTP, Emailing Pro et connecteurs.',
    type: 'SERVICE',
    taxonomy: 'SERVICE',
    defaultActive: true,
    view: 'SETTINGS_EXTENSIONS',
    icon: 'Cpu',
    keywords: ['crm', 'automation', 'connecteurs', 'woocommerce', 'brevo', 'sms-otp'],
    aliases: ['srv-crm-automation', 'settings_integrations', 'crm_automation', 'connecteurs']
  },
  {
    id: 'theme-builder',
    slug: 'theme-builder',
    name: 'Studio de Choix et Construction de Thème',
    route: '/dashboard/vitrine',
    category: 'Boutique & Design',
    description: 'Sélectionnez, prévisualisez et construisez le thème pour votre vitrine e-commerce.',
    type: 'SERVICE',
    taxonomy: 'SERVICE',
    defaultActive: true,
    view: 'STUDIO',
    icon: 'Palette',
    keywords: ['theme', 'builder', 'design', 'vitrine', 'studio'],
    aliases: ['srv-theme-builder']
  },
  {
    id: 'partner',
    slug: 'partner',
    name: 'Espace Partenaire & Affiliation',
    route: '/partner',
    category: 'Croissance',
    description: "Programme d'affiliation avec commissions automatiques et liens parrainage.",
    type: 'SERVICE',
    taxonomy: 'SERVICE',
    defaultActive: false,
    view: 'PARTNER',
    icon: 'Award',
    keywords: ['affiliation', 'partenaire', 'parrainage', 'commissions'],
    aliases: ['srv-partner', 'partner-program']
  },
  {
    id: 'course-create',
    slug: 'course-create',
    name: 'Centre de Création de Cours, et De Formation',
    route: '/dashboard/formateur',
    category: 'Formation',
    description: 'Correction des devoirs, suivi des cohortes et gestion pédagogique.',
    type: 'SERVICE',
    taxonomy: 'SERVICE',
    defaultActive: false,
    view: 'INSTRUCTOR',
    icon: 'GraduationCap',
    keywords: ['formateur', 'creation-cours', 'cohortes', 'pedagogique'],
    aliases: ['srv-course-create', 'instructor-hub']
  },
  {
    id: 'academy-support',
    slug: 'academy-support',
    name: "Centre de Formation et D'Accompagnement",
    route: '/academy',
    category: 'Éducation',
    description: 'Espace cours, leçons vidéo et accompagnement des apprenants.',
    type: 'SERVICE',
    taxonomy: 'SERVICE',
    defaultActive: false,
    view: 'ACADEMY',
    icon: 'Compass',
    keywords: ['academie', 'formation', 'accompagnement', 'cours-video'],
    aliases: ['srv-academy-support']
  },
  {
    id: 'nana-switch',
    slug: 'nana-switch',
    name: 'NaNa Switch Cloud (Multi-Comptes)',
    route: '/dashboard/switch',
    category: 'Communication & Réseau',
    description: 'Basculez instantanément entre vos boutiques et comptes sans vous reconnecter.',
    type: 'SERVICE',
    taxonomy: 'SERVICE',
    defaultActive: true,
    view: 'NANA_SWITCH',
    icon: 'Repeat',
    keywords: ['switch', 'cloud', 'multi-comptes', 'boutiques'],
    aliases: ['srv-nana-switch']
  },
  {
    id: 'kyc',
    slug: 'kyc',
    name: "Chaîne d'Identification KYC & Sécurité",
    route: '/kyc',
    category: 'Conformité',
    description: "Vérification des pièces d'identité et conformité juridique des marchands.",
    type: 'SERVICE',
    taxonomy: 'SERVICE',
    defaultActive: false,
    view: 'KYC_VERIFICATION',
    icon: 'ShieldCheck',
    keywords: ['kyc', 'identification', 'securite', 'conformite'],
    aliases: ['srv-kyc', 'kyc-verification']
  }
];

// ============================================================================
// BLOC 3 : LES 6 MODULES
// ============================================================================
export const MODULES_BLOCK: CanonicalModule[] = [
  {
    id: 'inventory',
    slug: 'inventory',
    name: 'Stock & Inventaire Intelligent',
    route: '/inventory',
    category: 'Gestion',
    description: 'Suivi en temps réel des quantités, alertes de rupture et codes-barres.',
    type: 'MODULE',
    taxonomy: 'MODULE',
    defaultActive: true,
    view: 'INVENTORY',
    icon: 'Boxes',
    keywords: ['stock', 'inventaire', 'produits', 'rupture', 'codes-barres'],
    aliases: ['mod-inventory', 'catalog', 'inventory_suppliers', 'mod_stock']
  },
  {
    id: 'debts',
    slug: 'debts',
    name: 'Gestion des Dettes (Ardoises clients)',
    route: '/dashboard/dettes',
    category: 'Trésorerie',
    description: 'Carnet de crédits clients, échéanciers et relances WhatsApp en 1 clic.',
    type: 'MODULE',
    taxonomy: 'MODULE',
    defaultActive: true,
    view: 'DEBT_BOOK',
    icon: 'BookMarked',
    keywords: ['dettes', 'ardoises', 'credit-client', 'creances', 'relances'],
    aliases: ['mod-debts', 'crm_customers', 'mod_credit_book', 'credit-book']
  },
  {
    id: 'analytics',
    slug: 'analytics',
    name: 'Analytique & Courbe des Gains',
    route: '/dashboard/rapports',
    category: 'Statistiques',
    description: "Graphiques de chiffre d'affaires, marges bénéficiaires et produits phares.",
    type: 'MODULE',
    taxonomy: 'MODULE',
    defaultActive: true,
    view: 'REPORTS',
    icon: 'BarChart2',
    keywords: ['analytique', 'gains', 'statistiques', 'courbe', 'chiffre-affaires'],
    aliases: ['mod-analytics', 'analytics_reports']
  },
  {
    id: 'team-employees',
    slug: 'team-employees',
    name: 'Gestion des Employés / Caissiers',
    route: '/dashboard/staff',
    category: 'Sécurité & RH',
    description: "Droits d'accès par code PIN, caissiers multiples et traçabilité des ventes.",
    type: 'MODULE',
    taxonomy: 'MODULE',
    defaultActive: true,
    actionId: 'EMPLOYEE_MANAGEMENT',
    icon: 'Users',
    keywords: ['employes', 'caissiers', 'equipe', 'droits', 'shifts', 'pin'],
    aliases: ['mod-team-employees', 'team_staff', 'cashier-sessions']
  },
  {
    id: 'cvpro',
    slug: 'cvpro',
    name: 'CVPro & Création Documentaire',
    route: '/dashboard/cv',
    category: 'Documents',
    description: 'Générateur de CV professionnels, attestations et portfolios vendeurs.',
    type: 'MODULE',
    taxonomy: 'MODULE',
    defaultActive: false,
    view: 'CV_CREATOR',
    icon: 'FileText',
    keywords: ['cvpro', 'cv', 'attestations', 'documents'],
    aliases: ['mod-cvpro']
  },
  {
    id: 'pixels-crm',
    slug: 'pixels-crm',
    name: 'Pixels de Tracking / CRM Avancé',
    route: '/dashboard/tracking-crm',
    category: 'Marketing',
    description: 'Connexion des pixels Facebook Meta, Google Analytics & TikTok Ads.',
    type: 'MODULE',
    taxonomy: 'MODULE',
    defaultActive: false,
    actionId: 'TRACKING_PIXELS_CRM',
    icon: 'Activity',
    keywords: ['pixels', 'tracking', 'meta', 'tiktok', 'analytics'],
    aliases: ['mod-pixels-crm', 'tracking-pixels']
  }
];

// ============================================================================
// BLOC 4 : LES 3 OUTILS
// ============================================================================
export const OUTILS_BLOCK: CanonicalModule[] = [
  {
    id: 'scanner',
    slug: 'scanner',
    name: 'Scanner Code-Barres & Douchette USB/Caméra',
    route: '/scanner',
    category: 'Matériel POS',
    description: 'Détection instantanée via douchette physique laser ou caméra mobile.',
    type: 'OUTIL',
    taxonomy: 'OUTIL',
    defaultActive: true,
    view: 'BARCODE_SCANNER',
    icon: 'QrCode',
    keywords: ['scanner', 'douchette', 'codes-barres', 'camera', 'laser'],
    aliases: ['tool-scanner', 'mod_barcode_scanner', 'barcode-scanner']
  },
  {
    id: 'excel',
    slug: 'excel',
    name: 'Import & Export de Fichiers Excel / CSV',
    route: '/excel',
    category: 'Données',
    description: 'Importation en masse de catalogues produits et export comptable.',
    type: 'OUTIL',
    taxonomy: 'OUTIL',
    defaultActive: true,
    view: 'EXCEL_IMPORT',
    icon: 'FileSpreadsheet',
    keywords: ['excel', 'csv', 'import', 'export', 'donnees'],
    aliases: ['tool-excel', 'excel-import']
  },
  {
    id: 'gateway',
    slug: 'gateway',
    name: 'Passerelle Souveraine / Connecter API Nanasore',
    route: '/dashboard/gateway',
    category: 'Intégration API',
    description: 'Intégration directe des API souveraines et webhooks temps réel.',
    type: 'OUTIL',
    taxonomy: 'OUTIL',
    defaultActive: false,
    actionId: 'SOVEREIGN_GATEWAY',
    icon: 'Key',
    keywords: ['passerelle', 'api', 'webhooks', 'souveraine', 'connecteur'],
    aliases: ['tool-gateway', 'sovereign-gateway']
  }
];

// ============================================================================
// REGISTRE GLOBAL CONSOLIDÉ (EXACTEMENT 27 MODULES)
// ============================================================================
export const CANONICAL_APP_REGISTRY: CanonicalModule[] = [
  ...APPLICATIONS_BLOCK,
  ...SERVICES_BLOCK,
  ...MODULES_BLOCK,
  ...OUTILS_BLOCK
];

// Alias exportés pour compatibilité intégrale
export const ALL_OFFICIAL_CATALOG: CanonicalModule[] = CANONICAL_APP_REGISTRY;
export const OFFICIAL_MODULES: CanonicalModule[] = CANONICAL_APP_REGISTRY;
export const appRegistry: CanonicalModule[] = CANONICAL_APP_REGISTRY;

// Indexation optimisée O(1)
const MODULES_BY_ID_MAP = new Map<string, CanonicalModule>();
const MODULES_BY_ROUTE_MAP = new Map<string, CanonicalModule>();

CANONICAL_APP_REGISTRY.forEach((mod) => {
  // Indexation par id canonique et slug
  MODULES_BY_ID_MAP.set(mod.id.toLowerCase(), mod);
  MODULES_BY_ID_MAP.set(mod.slug.toLowerCase(), mod);
  MODULES_BY_ID_MAP.set(mod.name.toLowerCase(), mod);

  // Indexation par route
  if (mod.route) {
    MODULES_BY_ROUTE_MAP.set(mod.route.toLowerCase(), mod);
  }

  // Indexation des alias historiques
  if (mod.aliases) {
    mod.aliases.forEach((alias) => {
      MODULES_BY_ID_MAP.set(alias.toLowerCase(), mod);
    });
  }
});

// ============================================================================
// FONCTIONS UTILITAIRES EXPORTÉES
// ============================================================================

/**
 * Récupère un module par son ID, son slug, son nom ou un de ses alias
 */
export function getModuleById(idOrSlugOrAlias: string): CanonicalModule | undefined {
  if (!idOrSlugOrAlias) return undefined;
  return MODULES_BY_ID_MAP.get(idOrSlugOrAlias.trim().toLowerCase());
}

/**
 * Alias de compatibilité
 */
export const getOfficialModuleById = getModuleById;

/**
 * Récupère un module par sa route de destination
 */
export function getModuleByRoute(route: string): CanonicalModule | undefined {
  if (!route) return undefined;
  return MODULES_BY_ROUTE_MAP.get(route.trim().toLowerCase());
}

/**
 * Récupère tous les modules appartenant à un type spécifique
 */
export function getModulesByType(type: ModuleType): CanonicalModule[] {
  return CANONICAL_APP_REGISTRY.filter((mod) => mod.type === type);
}

/**
 * Vérifie si un module est activé par défaut
 */
export function isModuleDefaultActive(idOrSlugOrAlias: string): boolean {
  const mod = getModuleById(idOrSlugOrAlias);
  return mod ? mod.defaultActive : false;
}

/**
 * Retourne la liste complète des 27 modules validés
 */
export function getAllModules(): CanonicalModule[] {
  return [...CANONICAL_APP_REGISTRY];
}

/**
 * Alias de compatibilité
 */
export const getAllOfficialModules = getAllModules;

export default CANONICAL_APP_REGISTRY;
