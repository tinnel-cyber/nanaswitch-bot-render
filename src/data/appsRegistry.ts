/**
 * REGISTRE CENTRAL DES MINI-APPLICATIONS NANASORE (App Store / AWS Console Model)
 * Cartes Hub / App Store. Le catalogue canonique fait 27 entrées (src/appRegistry.ts).
 */

export type AppTrialType = 'credits' | 'time_trial' | 'freemium';
export type AppInstallationType = 'pwa_ready' | 'instant' | 'system' | 'installed';

export interface AppRegistryItem {
  id: string;
  appName: string;
  appLogo: string;
  shortDescription: string;
  category: string;
  keywords: string[];
  route: string;
  installationType: AppInstallationType | string;
  trialType: AppTrialType;
  priceMonthly: number;
  palmares: string;
  badgePalmares?: string; // Étiquette d'impact incitative (ex: "⭐ 98% de satisfaction", "🚀 Boost Ventes +30%")
  trialLabel?: string;    // Mode d'essai en pied de carte (ex: "7 jours offerts", "3 crédits offerts")
  isPopular?: boolean;    // Pour la section Applications Populaires
  isNew?: boolean;        // Pour la section Nouveautés
  // Métadonnées étendues de guidage et navigation
  badge?: string;
  taxonomyType?: 'Service' | 'Application' | 'Module' | 'Outil';
  taxonomy?: 'APPLICATION' | 'SERVICE' | 'MODULE' | 'OUTIL';
  isPro?: boolean;
  proKey?: string;
  targetView?: string;
  rating?: number;
  iconName?: string;
}

export const APPS_REGISTRY: AppRegistryItem[] = [
  // Module Studio E-mailing & Campagnes Pro
  {
    id: "emailing",
    appName: "Studio E-mailing & Campagnes Pro",
    appLogo: "/assets/icons/apps/mail.svg",
    shortDescription: "Éditeur visuel d'e-mails, segmentation d'audience et revente de quotas Pro.",
    category: "Marketing & Communication",
    keywords: ["email", "emailing", "campagne", "pro", "newsletter", "mail", "marketing", "diffusion", "mailing", "clients", "quotas"],
    route: "/dashboard/marketing/emailing",
    installationType: "instant",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🚀 Délivrabilité 99.8% Pro",
    badgePalmares: "✉️ Éditeur Visuel Sans Code",
    trialLabel: "500 crédits offerts",
    isPopular: true,
    isNew: true,
    targetView: "EMAILING",
    badge: "Pro V3",
    rating: 5.0,
    iconName: "Mail"
  },

  // Module Espace Upload Académique (Professeurs & Étudiants)
  {
    id: "vendor-upload",
    appName: "Espace Upload Académique",
    appLogo: "/assets/icons/apps/vault.svg",
    shortDescription: "Upload unifié de cours, devoirs et rendus (Compression ZIP & R2)",
    category: "academic",
    keywords: ["upload", "cours", "devoir", "remise", "professeur", "etudiant", "étudiant", "devoirs", "r2", "zip", "rendu", "campus"],
    route: "/academic/upload",
    installationType: "instant",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🎓 Cloudflare Academic Vault",
    badgePalmares: "⚡ Compression ZIP Maximale",
    trialLabel: "Professeurs & Étudiants",
    isPopular: true,
    targetView: "ACADEMIC_UPLOAD",
    badge: "Académique R2",
    rating: 5.0
  },
  // 1. Marketing & Studio IA
  {
    id: "nanagenerator",
    appName: "Nanagénérateur AI",
    appLogo: "/assets/icons/apps/nanagenerator.svg",
    shortDescription: "Générez des vidéos & visuels produits haute conversion par IA.",
    category: "Marketing & Studio",
    keywords: ["video", "image", "ia", "pub", "studio", "nanagenerateur", "replicate", "avatar"],
    route: "/dashboard/apps/nanagenerator",
    installationType: "pwa_ready",
    trialType: "credits",
    priceMonthly: 1500,
    palmares: "🔥 +12 000 vidéos générées ce mois",
    badgePalmares: "🚀 Boost Ventes +30%",
    trialLabel: "3 crédits offerts",
    isPopular: true,
    targetView: "AI_STUDIO",
    badge: "Populaire IA",
    rating: 4.9
  },
  {
    id: "studio-ia",
    appName: "Tinnela AI Studio",
    appLogo: "/assets/icons/apps/nanagenerator.svg",
    shortDescription: "Génération neuronale de vidéos d'avatars et photoshoots produits 4K.",
    category: "Marketing & Studio",
    keywords: ["ia", "studio", "video", "photoshoot", "avatar", "tinnela", "prompt"],
    route: "/dashboard/ai-studio",
    installationType: "pwa_ready",
    trialType: "credits",
    priceMonthly: 2500,
    palmares: "⚡ Élu meilleur outil IA marchande 2026",
    badgePalmares: "🔥 Top 3 le plus activé",
    trialLabel: "3 crédits offerts",
    isPopular: true,
    targetView: "AI_STUDIO",
    isPro: true,
    rating: 4.8
  },
  {
    id: "ai-gemini",
    appName: "Directeur de Croissance • Agent Nsore",
    appLogo: "/assets/icons/apps/ia.svg",
    shortDescription: "Directeur de la stratégie commerciale Nanasore, orientation des 29 modules, arbitrage de rentabilité et accompagnement KYC.",
    category: "Marketing & Studio",
    keywords: ["nsore", "agent-nsore", "directeur", "croissance", "strategie", "gemini", "agent", "ia", "conseil", "decision", "assistant", "chat", "monetisation", "commission"],
    route: "/dashboard/ai-advisor",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🧠 Stratégie & Modèles Économiques",
    badgePalmares: "⭐ Expert Commercial",
    trialLabel: "Inclus",
    isPopular: true,
    targetView: "AI_ADVISOR",
    badge: "Directeur IA",
    rating: 5.0
  },
  {
    id: "ultimate-funnel-builder",
    appName: "Ultimate Funnel Builder",
    appLogo: "/assets/icons/apps/funnel.svg",
    shortDescription: "Constructeur de tunnels haute conversion nouvelle génération avec upsells et paiements express.",
    category: "Marketing & Studio",
    keywords: ["ultimate", "funnel", "builder", "conversion", "upsell", "vente", "landing", "express"],
    route: "/dashboard/funnel/ultimate",
    installationType: "pwa_ready",
    trialType: "time_trial",
    priceMonthly: 2000,
    palmares: "🚀 Taux de conversion moyen x3.8",
    badgePalmares: "🚀 Boost Ventes +35%",
    trialLabel: "7 jours offerts",
    isPopular: true,
    targetView: "ULTIMATE_FUNNEL",
    taxonomyType: "Application",
    badge: "Application",
    rating: 4.9
  },
  {
    id: "modular-funnel-builder",
    appName: "Funnel Builder Modulaire",
    appLogo: "/assets/icons/apps/funnel.svg",
    shortDescription: "Constructeur modulaire par blocs drag & drop pour tunnels de conversion sur mesure.",
    category: "Marketing & Studio",
    keywords: ["funnel", "builder", "modulaire", "blocs", "tunnel", "page", "conversion"],
    route: "/dashboard/funnel/modular",
    installationType: "pwa_ready",
    trialType: "time_trial",
    priceMonthly: 2000,
    palmares: "⚡ 12 Blocs Haute Conversion",
    badgePalmares: "⭐ Modularité Totale",
    trialLabel: "7 jours offerts",
    isPopular: true,
    targetView: "MODULAR_FUNNEL",
    taxonomyType: "Application",
    badge: "Application",
    rating: 4.9
  },
  {
    id: "public-deal-builder",
    appName: "Public Deal Page Builder",
    appLogo: "/assets/icons/apps/funnel.svg",
    shortDescription: "Créateur de pages d'offres flash et de deals publics physiques avec paiement direct.",
    category: "Marketing & Studio",
    keywords: ["deal", "public", "page", "builder", "offre", "flash", "produit", "physique", "cro"],
    route: "/dashboard/funnel/physical",
    installationType: "pwa_ready",
    trialType: "time_trial",
    priceMonthly: 2000,
    palmares: "🔥 Taux de checkout immédiat +45%",
    badgePalmares: "⚡ Commande 1-Clic",
    trialLabel: "7 jours offerts",
    isNew: true,
    targetView: "PHYSICAL_FUNNEL",
    taxonomyType: "Application",
    badge: "Application",
    rating: 4.9
  },
  {
    id: "marketing-campaigns",
    appName: "Campagnes Marketing & SMS",
    appLogo: "/assets/icons/apps/nanagenerator.svg",
    shortDescription: "Rédacteur IA d'annonces, relances WhatsApp et campagnes SMS directes.",
    category: "Marketing & Studio",
    keywords: ["marketing", "campagne", "sms", "whatsapp", "promo", "copywriting"],
    route: "/dashboard/marketing",
    installationType: "pwa_ready",
    trialType: "credits",
    priceMonthly: 1200,
    palmares: "💬 +45 000 SMS délivrés en direct",
    badgePalmares: "📈 +40% de réachat",
    trialLabel: "50 SMS offerts",
    isNew: true,
    targetView: "BOUTIQUE",
    rating: 4.7
  },
  {
    id: "live-webinar",
    appName: "Studio de Génération de Live et Webinaire",
    appLogo: "/assets/icons/apps/nanagenerator.svg",
    shortDescription: "Studio de direct multi-plateforme TikTok, Facebook & NaNa Live.",
    category: "Marketing & Studio",
    keywords: ["live", "webinaire", "tiktok", "facebook", "direct", "shopping", "streaming", "studio"],
    route: "/dashboard/lives",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🔴 +850 sessions live interactives",
    badgePalmares: "🔥 Taux d'engagement x5",
    trialLabel: "Gratuit à vie",
    isNew: true,
    targetView: "BOUTIQUE",
    taxonomyType: "Application",
    badge: "Application",
    rating: 4.8
  },
  {
    id: "tracking-pixels",
    appName: "Pixels Ads & Tracking CRM",
    appLogo: "/assets/icons/apps/vitrine.svg",
    shortDescription: "Intégration en temps réel Meta Ads, TikTok Pixel & Google Tag Manager.",
    category: "Marketing & Studio",
    keywords: ["pixel", "ads", "meta", "tiktok", "tracking", "crm", "publicite"],
    route: "/dashboard/tracking-crm",
    installationType: "pwa_ready",
    trialType: "time_trial",
    priceMonthly: 2500,
    palmares: "🎯 Optimisation ROI publicitaire +42%",
    badgePalmares: "⭐ 97% ROI positif",
    trialLabel: "7 jours offerts",
    isNew: true,
    targetView: "TRACKING_CRM",
    isPro: true,
    proKey: "TRACKING_PIXELS_CRM",
    rating: 4.7
  },

  // 2. Commerce & Ventes
  {
    id: "caisse-pos",
    appName: "Caisse Tactile (POS)",
    appLogo: "/assets/icons/apps/pos.svg",
    shortDescription: "Encaissement ultra-rapide, tickets thermiques et gestion multi-caissiers.",
    category: "Commerce & Ventes",
    keywords: ["caisse", "pos", "vente", "ticket", "recu", "paiement", "monnaie"],
    route: "/dashboard/caisse",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "⚡ +2.5M transactions traitées",
    badgePalmares: "🔥 N°1 Encaissement Boutique",
    trialLabel: "Gratuit à vie",
    isPopular: true,
    targetView: "POS",
    badge: "Essentiel",
    rating: 5.0
  },
  {
    id: "vitrine-eshop",
    appName: "Vitrine en Ligne (E-Shop)",
    appLogo: "/assets/icons/apps/vitrine.svg",
    shortDescription: "Boutique en ligne moderne synchronisée WhatsApp avec commande 1-clic.",
    category: "Commerce & Ventes",
    keywords: ["vitrine", "eshop", "boutique", "catalogue", "ecommerce", "whatsapp", "theme"],
    route: "/dashboard/vitrine",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🛍️ +180 000 visiteurs par jour",
    badgePalmares: "⭐ 98% de satisfaction",
    trialLabel: "Gratuit à vie",
    isPopular: true,
    targetView: "STUDIO",
    badge: "Essentiel",
    rating: 4.9
  },
  {
    id: "theme-builder-studio",
    appName: "Studio de Choix et Construction de Thème",
    appLogo: "/assets/icons/apps/vitrine.svg",
    shortDescription: "Sélectionnez, prévisualisez et construisez le thème sur-mesure pour votre vitrine e-commerce.",
    category: "Commerce & Ventes",
    keywords: ["theme", "studio", "choix", "construction", "vitrine", "eshop", "design", "template"],
    route: "/dashboard/vitrine",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🎨 Thèmes sur mesure & personnalisation",
    badgePalmares: "⭐ Design Pro",
    trialLabel: "Inclus",
    isPopular: true,
    targetView: "STUDIO",
    taxonomyType: "Service",
    badge: "Service",
    rating: 4.9
  },
  {
    id: "nana-market",
    appName: "NaNa Market (Annuaire B2B2C)",
    appLogo: "/assets/icons/apps/vitrine.svg",
    shortDescription: "Centre commercial digital géolocalisé pour découvrir les boutiques certifiées.",
    category: "Commerce & Ventes",
    keywords: ["market", "annuaire", "b2b", "b2c", "visibilite", "reseau", "clients"],
    route: "/dashboard/market",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "📍 +3 400 enseignes référencées",
    badgePalmares: "🚀 Visibilité locale garantie",
    trialLabel: "Gratuit à vie",
    isNew: true,
    targetView: "MARKET_DIRECTORY",
    rating: 4.8
  },
  {
    id: "orders-quotes",
    appName: "Bons de Commande & Devis",
    appLogo: "/assets/icons/apps/pos.svg",
    shortDescription: "Factures proforma, devis sous séquestre garanti et commandes web.",
    category: "Commerce & Ventes",
    keywords: ["commande", "devis", "proforma", "facture", "sequestre", "client"],
    route: "/dashboard/commandes",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "📄 +15 000 devis & factures générés",
    badgePalmares: "🛡️ Séquestre 100% garanti",
    trialLabel: "Gratuit à vie",
    isPopular: true,
    targetView: "CUSTOMER_ORDERS",
    rating: 4.8
  },
  {
    id: "thermal-printer",
    appName: "Imprimante Thermique Bluetooth",
    appLogo: "/assets/icons/apps/pos.svg",
    shortDescription: "Impression sans fil des reçus de caisse 58mm/80mm et étiquettes colis.",
    category: "Commerce & Ventes",
    keywords: ["imprimante", "thermique", "bluetooth", "ticket", "recu", "impression"],
    route: "/dashboard/imprimante",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🖨️ Compatible 99% des imprimantes ESC/POS",
    badgePalmares: "⚡ 0 délai d'impression",
    trialLabel: "Gratuit à vie",
    isNew: true,
    targetView: "THERMAL_RECEIPT",
    rating: 4.9
  },
  {
    id: "custom-domain",
    appName: "Domaine Personnalisé PRO",
    appLogo: "/assets/icons/apps/vitrine.svg",
    shortDescription: "Liez votre propre domaine .com ou .ci avec certificat SSL automatique.",
    category: "Commerce & Ventes",
    keywords: ["domaine", "dns", "url", "marque", "ssl", "pro", "boutique"],
    route: "/dashboard/domaine",
    installationType: "pwa_ready",
    trialType: "time_trial",
    priceMonthly: 3000,
    palmares: "🌐 +920 domaines indépendants actifs",
    badgePalmares: "⭐ Image de marque premium",
    trialLabel: "7 jours offerts",
    isPopular: true,
    targetView: "CUSTOM_DOMAIN",
    isPro: true,
    proKey: "CUSTOM_DOMAIN",
    rating: 4.9
  },
  {
    id: "team-employees",
    appName: "Gestion Équipe & Caissiers",
    appLogo: "/assets/icons/apps/pos.svg",
    shortDescription: "Codes PIN individuels, restriction des permissions et journal des encaissements.",
    category: "Commerce & Ventes",
    keywords: ["equipe", "employe", "caissier", "pin", "permission", "securite", "staff"],
    route: "/dashboard/equipe",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 1500,
    palmares: "👥 +1 200 caissiers sous contrôle PIN",
    badgePalmares: "🔒 0 fuite de caisse",
    trialLabel: "1 caissier inclus",
    targetView: "EMPLOYEE_MANAGEMENT",
    isPro: true,
    proKey: "EMPLOYEE_MANAGEMENT",
    rating: 4.8
  },

  // 3. Finances & Trésorerie
  {
    id: "nana-switch-app",
    appName: "NanaSwitch Partenaires B2B",
    appLogo: "/assets/icons/apps/pos.svg",
    shortDescription: "Hub de paiements unifié UEMOA, onboarding KYC dynamique et gestion des clés API & Webhooks.",
    category: "Finances & Trésorerie",
    keywords: ["nanaswitch", "switch", "paiement", "b2b", "mobile money", "orange", "moov", "wave", "kyc", "webhook"],
    route: "/dashboard/apps/nana-switch-app",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "⚡ 14+ modules marchands unifiés",
    badgePalmares: "🛡️ Certifié Zero-Trust HMAC",
    trialLabel: "Accès Partenaire",
    isPopular: true,
    targetView: "NANA_SWITCH_APP",
    taxonomyType: "Application",
    badge: "Fintech B2B",
    rating: 5.0
  },
  {
    id: "reports-analytics",
    appName: "Analytique & Courbe des Gains",
    appLogo: "/assets/icons/apps/pos.svg",
    shortDescription: "Suivi du CA en temps réel, marges nettes réelles et bilans comptables.",
    category: "Finances & Trésorerie",
    keywords: ["rapport", "analytique", "gain", "chiffre", "marge", "comptabilite", "courbe"],
    route: "/dashboard/rapports",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "📊 +480M FCFA de flux analysés",
    badgePalmares: "🔥 Top 3 le plus activé",
    trialLabel: "Gratuit à vie",
    isPopular: true,
    targetView: "REPORTS",
    badge: "Essentiel",
    rating: 4.9
  },
  {
    id: "debt-book",
    appName: "Gestion des Dettes (Ardoises)",
    appLogo: "/assets/icons/apps/pos.svg",
    shortDescription: "Carnet de crédit digitalisé, échéanciers et rappels automatiques par SMS.",
    category: "Finances & Trésorerie",
    keywords: ["dette", "ardoise", "credit", "creance", "relance", "remboursement", "recouvrement"],
    route: "/dashboard/dettes",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "💰 88% de taux de recouvrement rapide",
    badgePalmares: "⭐ 98% de satisfaction",
    trialLabel: "Gratuit à vie",
    isPopular: true,
    targetView: "DEBT_BOOK",
    badge: "Essentiel",
    rating: 4.9
  },
  {
    id: "partners-affiliate",
    appName: "Espace Partenaire & Commissions",
    appLogo: "/assets/icons/apps/partner.svg",
    shortDescription: "Touchez 15% à 20% de commissions récurrentes à vie avec retraits instantanés.",
    category: "Finances & Trésorerie",
    keywords: ["partenaire", "affiliation", "commission", "argent", "parrainage", "bonus"],
    route: "/dashboard/partenaire",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🎁 +42M FCFA versés aux affiliés",
    badgePalmares: "💰 Revenus passifs 20%",
    trialLabel: "100% Gratuit",
    isPopular: true,
    targetView: "PARTNER",
    badge: "20% Gain",
    rating: 5.0
  },
  {
    id: "sovereign-gateway",
    appName: "Passerelle Souveraine API",
    appLogo: "/assets/icons/apps/pos.svg",
    shortDescription: "Encaissez directement sur FedaPay, LigdiCash, Wave ou Stripe avec 0% de frais.",
    category: "Finances & Trésorerie",
    keywords: ["passerelle", "api", "fedapay", "ligdicash", "wave", "stripe", "paiement", "souverain"],
    route: "/dashboard/passerelle-souveraine",
    installationType: "pwa_ready",
    trialType: "time_trial",
    priceMonthly: 4000,
    palmares: "🔒 0% commission prélevée",
    badgePalmares: "⚡ 0 FCFA de retenue",
    trialLabel: "7 jours offerts",
    isNew: true,
    targetView: "SOVEREIGN_GATEWAY",
    isPro: true,
    proKey: "SOVEREIGN_GATEWAY",
    rating: 4.9
  },

  // 4. Gestion & Stock
  {
    id: "inventory-stock",
    appName: "Inventaire & Stock Intelligent",
    appLogo: "/assets/icons/apps/pos.svg",
    shortDescription: "Alertes automatiques de rupture, valorisation financière et gestion des rayons.",
    category: "Gestion & Stock",
    keywords: ["stock", "inventaire", "rupture", "alerte", "quantite", "produit"],
    route: "/dashboard/inventaire",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "📦 +650 000 articles en rayon gérés",
    badgePalmares: "⭐ 99% sans rupture imprévue",
    trialLabel: "Gratuit à vie",
    isPopular: true,
    targetView: "INVENTORY",
    badge: "Essentiel",
    rating: 4.9
  },
  {
    id: "excel-importer",
    appName: "Importateur Intelligent Excel",
    appLogo: "/assets/icons/apps/pos.svg",
    shortDescription: "Importation massive XLSX/CSV sans blocage avec détection automatique des colonnes.",
    category: "Gestion & Stock",
    keywords: ["excel", "csv", "import", "stock", "inventaire", "fichier", "tableur"],
    route: "/dashboard/inventaire/excel",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "⚡ 5 000 articles importés en < 3s",
    badgePalmares: "🚀 Gain de temps x10",
    trialLabel: "Gratuit à vie",
    isPopular: true,
    targetView: "INVENTORY",
    rating: 4.8
  },
  {
    id: "barcode-scanner",
    appName: "Scanner Code-Barres & Caméra",
    appLogo: "/assets/icons/apps/pos.svg",
    shortDescription: "Douchette virtuelle par caméra mobile pour inventaire et encaissement express.",
    category: "Gestion & Stock",
    keywords: ["scanner", "code-barre", "qr", "camera", "douchette", "scan", "ean"],
    route: "/dashboard/scanner",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "📱 Scan instantané en 120ms",
    badgePalmares: "⚡ 0 matériel requis",
    trialLabel: "Gratuit à vie",
    isNew: true,
    targetView: "BARCODE_SCANNER",
    rating: 4.8
  },
  {
    id: "delivery-heatmap",
    appName: "Livraisons & Carte Thermique",
    appLogo: "/assets/icons/apps/pos.svg",
    shortDescription: "Calcul des frais par quartier, assignation des coursiers et carte des colis.",
    category: "Gestion & Stock",
    keywords: ["livraison", "coursier", "carte", "heatmap", "quartier", "logistique", "colis"],
    route: "/dashboard/livraisons",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🛵 +28 000 courses dispatchées",
    badgePalmares: "🚀 Livraisons +40% rapides",
    trialLabel: "Gratuit à vie",
    isNew: true,
    targetView: "DELIVERY",
    rating: 4.7
  },

  // 5. Formation & Coaching (LMS)
  {
    id: "lms-academy",
    appName: "Centre de Formation et D'Accompagnement",
    appLogo: "/assets/icons/apps/campus.svg",
    shortDescription: "Plateforme de formation interactive, masterclasses vidéo et accompagnement apprenant.",
    category: "Formation & Coaching",
    keywords: ["campus", "cours", "formation", "lms", "masterclass", "etudiant", "video", "accompagnement", "aprend"],
    route: "/dashboard/campus",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🎓 +8 500 étudiants certifiés",
    badgePalmares: "⭐ 98% de satisfaction",
    trialLabel: "Gratuit à vie",
    isPopular: true,
    targetView: "CAMPUS",
    taxonomyType: "Service",
    badge: "Service",
    rating: 4.9
  },
  {
    id: "cours-forge",
    appName: "Cours Forge",
    appLogo: "/assets/icons/apps/campus.svg",
    shortDescription: "Atelier complet de conception et génération de cours : leçons, vidéos, quiz et devoirs.",
    category: "Formation & Coaching",
    keywords: ["cours", "forge", "creation", "formation", "lecon", "video", "quiz", "lms", "atelier"],
    route: "/dashboard/courses/create",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🛠️ Atelier Course Forge Pro",
    badgePalmares: "⭐ Studio de Cours",
    trialLabel: "Gratuit à vie",
    isPopular: true,
    targetView: "COURSE_CREATE",
    taxonomyType: "Application",
    badge: "Application",
    rating: 4.9
  },
  {
    id: "lms-marketplace",
    appName: "Next-Gen LMS Marketplace",
    appLogo: "/assets/icons/apps/campus.svg",
    shortDescription: "Vitrine style Netflix avec carrousels vidéo et souscription Mobile Money 1-clic.",
    category: "Formation & Coaching",
    keywords: ["marketplace", "netflix", "catalogue", "vente", "formation", "cours"],
    route: "/dashboard/marketplace",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🎬 +120 cours disponibles au catalogue",
    badgePalmares: "🔥 Taux de conversion x2.8",
    trialLabel: "Gratuit à vie",
    isNew: true,
    targetView: "CATALOG",
    rating: 4.8
  },
  {
    id: "instructor-hub",
    appName: "Centre de Création de Cours, et De Formation",
    appLogo: "/assets/icons/apps/campus.svg",
    shortDescription: "Correction des devoirs étudiants, notation, conception des cours et suivi des cohortes.",
    category: "Formation & Coaching",
    keywords: ["formateur", "creation", "cours", "formation", "note", "devoir", "diplome", "examen", "etudiant"],
    route: "/dashboard/formateur",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "✍️ +4 300 devis et devoirs notés",
    badgePalmares: "⭐ 99% d'évaluation fluide",
    trialLabel: "Gratuit à vie",
    isPopular: true,
    targetView: "INSTRUCTOR",
    taxonomyType: "Service",
    badge: "Service",
    rating: 4.9
  },
  {
    id: "certificate-hub",
    appName: "Certificats Officiels & QR Code",
    appLogo: "/assets/icons/apps/campus.svg",
    shortDescription: "Génération de diplômes homologués avec QR code d'authenticité et export PDF HD.",
    category: "Formation & Coaching",
    keywords: ["certificat", "diplome", "qr", "securite", "pdf", "attestation", "homologue"],
    route: "/dashboard/certificats",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "📜 100% vérifiable par QR Code",
    badgePalmares: "🛡️ 100% Infalsifiable",
    trialLabel: "Gratuit à vie",
    isNew: true,
    targetView: "CERTIFICATE",
    badge: "Homologué",
    rating: 5.0
  },
  {
    id: "nana-academy",
    appName: "NaNa Académie (Tutoriels Vidéo)",
    appLogo: "/assets/icons/apps/campus.svg",
    shortDescription: "Centre de guides interactifs : Caisse, Stock, Vitrine, WhatsApp & Live.",
    category: "Formation & Coaching",
    keywords: ["academie", "tutoriel", "guide", "formation", "aide", "demarrage", "sarah"],
    route: "/dashboard/tutoriels",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "⭐ Guide officiel 100% gratuit",
    badgePalmares: "⭐ 98% de satisfaction",
    trialLabel: "Gratuit à vie",
    isPopular: true,
    targetView: "ACADEMY",
    taxonomyType: "Service",
    badge: "Service",
    rating: 4.9
  },

  // 6. Communication & Réseau
  {
    id: "wameet-network",
    appName: "Wameet",
    appLogo: "/assets/icons/apps/vitrine.svg",
    shortDescription: "Salons vidéo HD Daily.co, messagerie professionnelle et flux d'actualités.",
    category: "Communication & Réseau",
    keywords: ["wameet", "wamett", "visio", "reunion", "chat", "reseau", "communaute", "appel"],
    route: "/dashboard/wameet",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🌐 +95 000 minutes de visio HD",
    badgePalmares: "🚀 Réseau d'affaires direct",
    trialLabel: "Gratuit à vie",
    isPopular: true,
    targetView: "WAMEET",
    taxonomyType: "Application",
    badge: "Application",
    rating: 4.8
  },
  {
    id: "salles-vip",
    appName: "Salles VIP & Cercles Privés",
    appLogo: "/assets/icons/apps/vitrine.svg",
    shortDescription: "Clubs d'affaires confidentiels, salons audio/vidéo restreints sur badge premium.",
    category: "Communication & Réseau",
    keywords: ["vip", "salon", "prive", "exclusif", "club", "rencontre", "cercle"],
    route: "/dashboard/salles-vip",
    installationType: "pwa_ready",
    trialType: "credits",
    priceMonthly: 5000,
    palmares: "👑 12 cercles d'affaires exclusifs",
    badgePalmares: "🔥 Cercles d'élite vérifiés",
    trialLabel: "7 jours offerts",
    isNew: true,
    targetView: "SALLES_VIP",
    isPro: true,
    rating: 4.9
  },
  {
    id: "nana-switch",
    appName: "NaNa Switch Cloud (Multi-Comptes)",
    appLogo: "/assets/icons/apps/vitrine.svg",
    shortDescription: "Basculez instantanément entre vos boutiques et comptes sans vous reconnecter.",
    category: "Communication & Réseau",
    keywords: ["switch", "nanaschish", "cloud", "boutique", "multicompte", "gestion", "magasin", "reseau"],
    route: "/dashboard/switch",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🔄 Bascule instantanée en 1 clic",
    badgePalmares: "⚡ 0 reconnexion nécessaire",
    trialLabel: "Gratuit à vie",
    isPopular: true,
    targetView: "NANA_SWITCH",
    taxonomyType: "Service",
    badge: "Service",
    rating: 4.9
  },

  // 7. Sécurité & Légal
  {
    id: "docusign-hub",
    appName: "DocuSign & Signatures Certifiées",
    appLogo: "/assets/icons/apps/pos.svg",
    shortDescription: "Signature électronique probante, scellés cryptographiques et journal d'audit légal.",
    category: "Sécurité & Légal",
    keywords: ["docusign", "signature", "audit", "securite", "contrat", "legal", "certificat"],
    route: "/dashboard/docusign",
    installationType: "pwa_ready",
    trialType: "time_trial",
    priceMonthly: 2000,
    palmares: "🔒 Conforme législation électronique",
    badgePalmares: "🛡️ Valeur juridique probante",
    trialLabel: "7 jours offerts",
    isNew: true,
    targetView: "DOCUSIGN",
    badge: "Certifié",
    rating: 4.9
  },
  {
    id: "kyc-chain",
    appName: "Chaîne d'Identification KYC UEMOA",
    appLogo: "/assets/icons/apps/pos.svg",
    shortDescription: "Conformité 2 étapes : Individuel (CNIB/Passeport) + Entreprise (RCCM/IFU).",
    category: "Sécurité & Légal",
    keywords: ["kyc", "identite", "cnib", "ifu", "rccm", "uemoa", "conformite", "securite"],
    route: "/dashboard/kyc",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🛡️ Plafonds débloqués à 100%",
    badgePalmares: "⭐ Conformité UEMOA 100%",
    trialLabel: "Gratuit à vie",
    isPopular: true,
    targetView: "SETTINGS_KYC",
    badge: "UEMOA",
    rating: 5.0
  },
  {
    id: "white-label",
    appName: "Marque Blanche / Retrait Logo",
    appLogo: "/assets/icons/apps/vitrine.svg",
    shortDescription: "Masquez tout branding NaNa sur vos vitrines, reçus et campus.",
    category: "Sécurité & Légal",
    keywords: ["marque blanche", "whitelabel", "branding", "logo", "personnalisation"],
    route: "/dashboard/marque-blanche",
    installationType: "pwa_ready",
    trialType: "time_trial",
    priceMonthly: 5000,
    palmares: "✨ Expérience 100% sous votre marque",
    badgePalmares: "👑 100% marque indépendante",
    trialLabel: "7 jours offerts",
    isPopular: true,
    targetView: "WHITE_LABEL",
    isPro: true,
    proKey: "WHITE_LABEL",
    rating: 4.9
  },

  // 8. Productivité & Connecteurs
  {
    id: "cv-pro",
    appName: "CVPro & Documents RH",
    appLogo: "/assets/icons/apps/nanagenerator.svg",
    shortDescription: "Application officielle de génération de CV haute conversion, fiches techniques et attestations de service.",
    category: "Application & Carrière",
    keywords: ["cv", "document", "rh", "attestation", "emploi", "professionnel", "recrutement", "application"],
    route: "/dashboard/cv",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "📄 +6 700 CV créés et exportés",
    badgePalmares: "🚀 Format recruteur garanti",
    trialLabel: "1er CV offert",
    isNew: true,
    targetView: "CV_CREATOR",
    rating: 4.9
  },
  {
    id: "crm-automation",
    appName: "CRM et Automation (Super Admin)",
    appLogo: "/assets/icons/apps/pos.svg",
    shortDescription: "Paramètres & Intégrations techniques réservés au Super Administrateur : WooCommerce, Passerelle SMS / OTP, Emailing Pro et synchronisation caisse.",
    category: "Super Admin & Intégrations",
    keywords: ["crm", "automation", "connecteurs", "extensions", "woocommerce", "sms", "brevo", "parametres", "passerelle", "api", "superadmin"],
    route: "/dashboard/connecteurs",
    installationType: "pwa_ready",
    trialType: "freemium",
    priceMonthly: 0,
    palmares: "🔒 Module Super Admin",
    badgePalmares: "🚧 En finalisation",
    trialLabel: "Inclus",
    isNew: true,
    targetView: "SETTINGS_EXTENSIONS",
    taxonomyType: "Service",
    badge: "Service",
    rating: 4.9
  }
];

export const APP_CATEGORIES = [
  "Tous",
  "Marketing & Studio",
  "Commerce & Ventes",
  "Finances & Trésorerie",
  "Gestion & Stock",
  "Formation & Coaching",
  "Communication & Réseau",
  "Sécurité & Légal"
] as const;

/**
 * Utilitaires d'affichage pour les cartes d'applications
 */
export function getAppTrialLabel(app: AppRegistryItem): string {
  if (app.trialLabel) return app.trialLabel;
  if (app.trialType === 'credits') return '3 crédits offerts';
  if (app.trialType === 'time_trial') return '7 jours offerts';
  return 'Gratuit à vie';
}

export function getAppPalmaresBadge(app: AppRegistryItem): string {
  return app.badgePalmares || app.palmares || '⭐ 98% de satisfaction';
}

export function getPopularApps(): AppRegistryItem[] {
  return APPS_REGISTRY.filter((app) => app.isPopular);
}

export function getNewApps(): AppRegistryItem[] {
  return APPS_REGISTRY.filter((app) => app.isNew);
}

/**
 * Recherche pondérée d'applications
 */
export function searchAppsRegistry(query: string, categoryFilter: string = "Tous"): AppRegistryItem[] {
  const cleanQ = query.trim().toLowerCase();
  
  return APPS_REGISTRY.filter((app) => {
    // Filtre de catégorie
    if (categoryFilter !== "Tous" && app.category !== categoryFilter) {
      return false;
    }

    if (!cleanQ) return true;

    // Correspondance sur le nom
    if (app.appName.toLowerCase().includes(cleanQ)) return true;

    // Correspondance sur les mots-clés
    if (app.keywords.some((kw) => kw.toLowerCase().includes(cleanQ))) return true;

    // Correspondance sur la description
    if (app.shortDescription.toLowerCase().includes(cleanQ)) return true;

    // Correspondance sur la catégorie
    if (app.category.toLowerCase().includes(cleanQ)) return true;

    return false;
  });
}
