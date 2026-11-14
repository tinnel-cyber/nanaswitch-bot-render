/**
 * Service de Gestion des Tutoriels NaNa Académie
 * Gère le catalogue des micro-formations, la persistance dans Firebase RTDB (tutorials_config.json)
 * et le suivi de progression dans localStorage.
 */

export type TutorialCategory = 
  | 'POS_STOCK'          // 🛒 Caisse & Gestion de Stock
  | 'STORE_ORDERS'       // 🏪 Boutique Vitrine & Commandes
  | 'NANASORE_PAY'       // 📱 Nanasore Payment Gateway
  | 'AI_FUNNELS'         // ✨ Studio IA & Funnel Builder
  | 'LIVE_SHOPPING'      // 🔴 Live Shopping & Webinaires
  | 'DOCS_LEGAL_MARKET'; // 📄 DocuSign, Bons, Devis/Projets, CV Pro, IA Marketing, IA Juridique

export interface TutorialItem {
  id: string;
  title: string;
  category: TutorialCategory;
  categoryLabel: string;
  duration: string; // Ex: "1 min 30"
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  videoUrl: string; // URL YouTube embed (ou standard) ou MP4
  videoThumbnail?: string;
  steps: [string, string, string] | string[]; // 3 étapes clés résumées
  contextualViews?: string[]; // Modules applicatifs associés (ex: ['POS', 'INVENTORY'])
  description: string;
  externalActionUrl?: string; // Lien direct d'action externe (ex: création Gmail)
  externalActionLabel?: string; // Libellé du bouton d'action
}

export const TUTORIAL_CATEGORIES: { id: TutorialCategory; label: string; icon: string }[] = [
  { id: 'POS_STOCK', label: '🛒 Caisse & Stock', icon: 'ShoppingCart' },
  { id: 'STORE_ORDERS', label: '🏪 Vitrine & Commandes', icon: 'Store' },
  { id: 'NANASORE_PAY', label: '📱 Passerelle Nanasore', icon: 'Smartphone' },
  { id: 'AI_FUNNELS', label: '✨ Studio IA & Tunnels', icon: 'Sparkles' },
  { id: 'LIVE_SHOPPING', label: '🔴 Live Shopping', icon: 'Radio' },
  { id: 'DOCS_LEGAL_MARKET', label: '📄 Contrats & IA Pro', icon: 'FileText' }
];

export const DEFAULT_TUTORIALS: TutorialItem[] = [
  // 📧 Tuto 1 : Créer un Gmail & Ouvrir un compte gratuit Nanasore (Première vidéo présentative par défaut)
  {
    id: 'tuto-1-gmail-signup',
    title: '📧 Tuto 1 : Créer un Gmail & Ouvrir un compte gratuit Nanasore (Pour démarrer de zéro en 1 minute)',
    category: 'POS_STOCK',
    categoryLabel: '🚀 Création de Compte & Démarrage',
    duration: '1 min 30',
    level: 'Débutant',
    videoUrl: '/assets/videos/intro_nanasore.mp4',
    videoThumbnail: '/fondateur-nanasore.jpg',
    contextualViews: ['AUTH', 'LOGIN', 'REGISTER', 'WELCOME', 'HOME', 'LANDING', 'AUTH_MERCHANT', 'AUTH_TEACHER'],
    description: 'Démarrez de zéro en 1 minute : créez votre adresse Gmail officielle puis connectez-vous directement à votre boutique Nanasore sans mot de passe à retenir.',
    steps: [
      'Cliquez sur le lien officiel "Créer mon adresse Gmail" pour ouvrir la page Google et choisir votre nom d’utilisateur.',
      'Revenez sur Nanasore et cliquez simplement sur le bouton "Continuer avec Google" pour vous connecter sans mot de passe.',
      'Votre compte gratuit est immédiatement opérationnel avec caisse tactile, gestion des stocks et vitrine en ligne.'
    ],
    externalActionUrl: 'https://accounts.google.com/signup',
    externalActionLabel: '🔗 Créer mon adresse Gmail'
  },

  // 🏪 Tuto 2 : Personnaliser et partager sa Boutique Vitrine (Thème Blanc/Sombre, Loupe 3D et partage du lien client)
  {
    id: 'tuto-2-storefront-setup',
    title: '🏪 Tuto 2 : Personnaliser et partager sa Boutique Vitrine (Thème Blanc/Sombre, Loupe 3D et partage du lien client)',
    category: 'STORE_ORDERS',
    categoryLabel: '🏪 Vitrine & Commandes',
    duration: '1 min 45',
    level: 'Débutant',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['STORE', 'BOUTIQUE', 'DASHBOARD'],
    description: 'Basculez entre le Thème Blanc Pur (style Amazon) et le Thème Sombre, profitez de la Loupe 3D interactive et partagez votre lien boutique à vos clients.',
    steps: [
      'Cliquez sur le bouton "Sombre / Clair" en haut à droite pour choisir l’ambiance visuelle idéale pour votre boutique.',
      'Survolez les photos avec la souris ou glissez le doigt sur mobile : la Loupe 3D s’agrandit et s’incline automatiquement hors du cadre.',
      'Cliquez sur "Partager" pour copier votre lien public (?store=...) et l’envoyer à vos clients sur WhatsApp et les réseaux.'
    ]
  },

  // 📦 Tuto 3 : Ajouter un produit avec l'IA & Rich Text (Génération photo/texte IA, option Voir en Direct, modification)
  {
    id: 'tuto-3-ai-product-rich-text',
    title: '📦 Tuto 3 : Ajouter un produit avec l\'IA & Rich Text (Génération photo/texte IA, option Voir en Direct, modification)',
    category: 'STORE_ORDERS',
    categoryLabel: '🏪 Vitrine & Commandes',
    duration: '2 min 00',
    level: 'Débutant',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['STORE', 'INVENTORY', 'POS'],
    description: 'Créez une fiche produit irrésistible en 15 secondes grâce à l’intelligence artificielle Gemini et à l’aperçu en direct.',
    steps: [
      'Dans votre espace commerçant, cliquez sur "Ajouter un Produit" et saisissez le nom de votre article et son prix de vente.',
      'Activez le bouton IA pour générer instantanément une photo studio haute définition 720p et un argumentaire de vente percutant.',
      'Prévisualisez la fiche avec l’option "Voir en direct" avant de publier votre produit sur votre vitrine web.'
    ]
  },

  // 📱 Tuto 4 : Activer Nanasore Payment Gateway & Livraison (Orange, Moov, Wave, MTN, vérification SMS et paiement à la livraison)
  {
    id: 'tuto-4-nanasore-payment-delivery',
    title: '📱 Tuto 4 : Activer Nanasore Payment Gateway & Livraison (Orange, Moov, Wave, MTN, vérification SMS et paiement à la livraison)',
    category: 'NANASORE_PAY',
    categoryLabel: '📱 Passerelle Nanasore',
    duration: '2 min 15',
    level: 'Intermédiaire',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['SETTINGS_EXTENSIONS', 'GATEWAY', 'PAYMENT', 'SETTINGS'],
    description: 'Encaissez l’argent de vos clients directement sur vos comptes Mobile Money Orange, Moov, Wave, MTN ou en espèces à la livraison.',
    steps: [
      'Dans les paramètres de passerelle, renseignez vos numéros marchands Mobile Money (Orange, Moov, Wave, MTN).',
      'Connectez votre passerelle au pont bancaire sécurisé (Render & IP Fixie) pour valider automatiquement les paiements en temps réel.',
      'Proposez simultanément le Paiement à la Livraison pour offrir le choix aux clients souhaitant régler en espèces à réception.'
    ]
  },

  // ✨ Tuto 5 : Utiliser le Studio IA 720p & le Funnel Builder (Créer des vidéos publicitaires et des tunnels de vente)
  {
    id: 'tuto-5-ai-studio-funnels',
    title: '✨ Tuto 5 : Utiliser le Studio IA 720p & le Funnel Builder (Créer des vidéos publicitaires et des tunnels de vente)',
    category: 'AI_FUNNELS',
    categoryLabel: '✨ Studio IA & Tunnels',
    duration: '2 min 10',
    level: 'Intermédiaire',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['AI_STUDIO', 'FUNNEL', 'BUILDER', 'TUNNEL'],
    description: 'Boostez vos ventes avec des vidéos promotionnelles IA haute définition et des tunnels de conversion mono-produit captivants.',
    steps: [
      'Rendez-vous dans le Studio IA pour animer les photos de vos articles en vidéos publicitaires professionnelles 720p.',
      'Ouvrez le Funnel Builder pour agencer une page de vente attractive avec compte à rebours, badges de confiance et preuve sociale.',
      'Associez le bouton d’achat express à votre passerelle pour générer des commandes instantanées sans friction.'
    ]
  },

  // 🛵 Tuto 6 : Gérer les Commandes Clients & les Livreurs (Alerte sonore, statut Payé vs À la livraison, envoi WhatsApp au livreur)
  {
    id: 'tuto-6-customer-orders-delivery',
    title: '🛵 Tuto 6 : Gérer les Commandes Clients & les Livreurs (Alerte sonore, statut Payé vs À la livraison, envoi WhatsApp au livreur)',
    category: 'STORE_ORDERS',
    categoryLabel: '🏪 Vitrine & Commandes',
    duration: '1 min 50',
    level: 'Débutant',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['CUSTOMER_ORDERS', 'ORDERS', 'STORE'],
    description: 'Ne ratez aucune vente : recevez les notifications sonores de commandes, vérifiez les paiements et briefez vos livreurs sur WhatsApp.',
    steps: [
      'Dès qu’un client commande, le carillon retentit et le badge rouge "📦 Commandes" clignote en direct sur votre écran.',
      'Ouvrez la fiche commande pour identifier l’adresse, le numéro du client et vérifier le mode de règlement (Payé ou À la livraison).',
      'Touchez "Envoyer au Livreur" pour transmettre l’adresse, le quartier et le contenu du colis au livreur en 1 clic sur WhatsApp.'
    ]
  },

  // 📄 Tuto 7 : DocuSign, Bons de commande, Devis/projet, CV Pro, IA Marketing, IA Juridique
  {
    id: 'tuto-7-docusign-pro-tools',
    title: '📄 Tuto 7 : DocuSign, Bons de commande, Devis/projet, CV Pro, IA Marketing, IA Juridique',
    category: 'DOCS_LEGAL_MARKET',
    categoryLabel: '📄 Contrats & IA Pro',
    duration: '2 min 30',
    level: 'Avancé',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['DOCUSIGN', 'QUOTES_PROJECTS', 'CV_CREATOR', 'AI_LEGAL'],
    description: 'Sécurisez vos affaires avec la signature numérique de bons de commande, les devis sous séquestre Escrow et l’assistance juridique IA.',
    steps: [
      'Générez et faites signer vos bons de commande et décharges de livraison avec signature tactile et tampon numérique certifié.',
      'Créez des devis et factures proforma sécurisés avec séquestre financier Escrow pour bloquer les fonds avant le début des travaux.',
      'Sollicitez l’Agent Juridique et Marketing IA pour rédiger vos contrats commerciaux, vos argumentaires et vos CV professionnels.'
    ]
  },
  {
    id: 'tuto-pos-fast-sale',
    title: 'Encaisser une vente rapide en boutique et imprimer le ticket',
    category: 'POS_STOCK',
    categoryLabel: '🛒 Caisse & Stock',
    duration: '1 min 20',
    level: 'Débutant',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['POS', 'REGISTER'],
    description: 'Apprenez à sélectionner vos articles, appliquer une remise et enregistrer un encaissement en moins de 15 secondes.',
    steps: [
      'Touchez les produits sur la grille ou scannez leur code-barres pour les ajouter au panier.',
      'Cliquez sur le gros bouton "Encaisser Cash" ou "Calcul Monnaie" pour saisir le montant remis.',
      'Validez pour déduire le stock instantanément et générer le ticket thermique de caisse.'
    ]
  },
  {
    id: 'tuto-inventory-stock',
    title: 'Gérer les stocks, seuils d’alerte et import de catalogue Excel',
    category: 'POS_STOCK',
    categoryLabel: '🛒 Caisse & Stock',
    duration: '2 min 10',
    level: 'Débutant',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['INVENTORY'],
    description: 'Suivez vos stocks en temps réel et soyez alerté avant la rupture de vos produits phares.',
    steps: [
      'Rendez-vous dans le module "Stock" et cliquez sur "Nouveau Produit" ou "Importer Excel".',
      'Renseignez le prix d’achat, le prix de vente et la quantité disponible en réserve.',
      'Configurez le seuil d’alerte (ex: 5 unités) pour recevoir une alerte visuelle automatique.'
    ]
  },
  {
    id: 'tuto-debt-book',
    title: 'Tenir son Cahier de Dettes et relancer les clients à crédit',
    category: 'POS_STOCK',
    categoryLabel: '🛒 Caisse & Stock',
    duration: '1 min 45',
    level: 'Intermédiaire',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['DEBT_BOOK', 'POS'],
    description: 'Ne perdez plus un seul franc grâce à la gestion numérique des crédits et acomptes clients.',
    steps: [
      'Lors d’une vente, choisissez "Mettre à crédit" et sélectionnez ou créez la fiche client.',
      'Consultez le Cahier de Dettes pour voir le solde restant dû et l’historique des versements.',
      'Envoyez un rappel automatique WhatsApp en 1 clic pour inviter le client à solder sa dette.'
    ]
  },

  // 2. Boutique Vitrine & Commandes
  {
    id: 'tuto-storefront-setup',
    title: 'Personnaliser sa vitrine web et basculer en mode Clair / Sombre',
    category: 'STORE_ORDERS',
    categoryLabel: '🏪 Vitrine & Commandes',
    duration: '1 min 50',
    level: 'Débutant',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['STORE', 'BOUTIQUE', 'DASHBOARD'],
    description: 'Créez une vitrine séduisante avec votre propre logo, slogan et couleurs en quelques clics.',
    steps: [
      'Cliquez sur votre logo ou sur "Paramètres" dans l’en-tête de votre vitrine commerçant.',
      'Modifiez votre slogan, numéro WhatsApp de commande et vos bannières publicitaires.',
      'Basculez entre le thème Sombre élégant et le thème Clair selon vos préférences.'
    ]
  },
  {
    id: 'tuto-manage-orders-delivery',
    title: 'Gérer les commandes clients et coordonner les livreurs sur WhatsApp',
    category: 'STORE_ORDERS',
    categoryLabel: '🏪 Vitrine & Commandes',
    duration: '2 min 00',
    level: 'Débutant',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['STORE', 'CUSTOMER_ORDERS', 'POS'],
    description: 'Recevez les alertes en direct dès qu’une commande tombe et transmettez-la immédiatement au coursier.',
    steps: [
      'Dès le carillon sonore et le bandeau rouge, ouvrez le panneau "📦 Commandes".',
      'Vérifiez le statut : PAYÉ en ligne ou Espèces à la livraison avec l’adresse et le quartier.',
      'Cliquez sur "Partager au livreur" pour lui envoyer l’ordre de course WhatsApp pré-rempli.'
    ]
  },

  // 3. Nanasore Payment Gateway
  {
    id: 'tuto-nanasore-sms-gateway',
    title: 'Configurer SMS Forwarder et les numéros Wave, Orange, Moov, MTN',
    category: 'NANASORE_PAY',
    categoryLabel: '📱 Passerelle Nanasore',
    duration: '2 min 30',
    level: 'Avancé',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['SETTINGS_EXTENSIONS', 'PAYMENT', 'SAAS_ADMIN'],
    description: 'Automatisez la validation des paiements Mobile Money par lecture instantanée des SMS opérateurs.',
    steps: [
      'Installez l’application SMS Forwarder sur le téléphone qui reçoit les alertes Mobile Money.',
      'Ajoutez le webhook de votre boutique pour transférer les SMS entrants en toute sécurité.',
      'Définissez vos numéros marchands dans la passerelle pour chaque opérateur actif.'
    ]
  },

  // 4. Studio IA & Funnel Builder
  {
    id: 'tuto-ai-studio-visuals',
    title: 'Générer des affiches publicitaires et vidéos IA en haute définition',
    category: 'AI_FUNNELS',
    categoryLabel: '✨ Studio IA & Tunnels',
    duration: '2 min 15',
    level: 'Intermédiaire',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['AI_STUDIO'],
    description: 'Transformez une simple photo de produit en publicité professionnelle grâce à l’intelligence artificielle.',
    steps: [
      'Ouvrez le Studio IA et choisissez le modèle de création (Affiche produit ou Vidéo animée).',
      'Téléversez la photo de votre article et indiquez le style désiré (Luxe, Promo Flash, Populaire).',
      'Laissez l’IA générer le visuel optimisé et téléchargez-le pour vos publications WhatsApp et Facebook.'
    ]
  },
  {
    id: 'tuto-funnel-builder',
    title: 'Créer un tunnel de vente mono-produit à forte conversion',
    category: 'AI_FUNNELS',
    categoryLabel: '✨ Studio IA & Tunnels',
    duration: '2 min 40',
    level: 'Avancé',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['FUNNELS', 'STORE'],
    description: 'Doublez vos ventes en guidant le visiteur vers une offre irrésistible avec commande en 1 clic.',
    steps: [
      'Sélectionnez le produit vedette et activez le mode "Tunnel de vente High-Tech".',
      'Ajoutez une offre complémentaire (Downsell) pour rattraper les clients indécis.',
      'Partagez le lien direct du tunnel sur vos campagnes publicitaires TikTok et Meta.'
    ]
  },

  // 5. Live Shopping & Webinaires
  {
    id: 'tuto-live-shopping-streaming',
    title: 'Organiser un direct vidéo Live Shopping et vendre en streaming',
    category: 'LIVE_SHOPPING',
    categoryLabel: '🔴 Live Shopping',
    duration: '2 min 20',
    level: 'Avancé',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['WEBINAR', 'STORE'],
    description: 'Présentez vos articles en direct vidéo et permettez aux spectateurs d’acheter sans quitter la vidéo.',
    steps: [
      'Dans l’Espace Commerçant, cliquez sur "Organiser un Live" et épinglez les articles en promotion.',
      'Partagez le lien d’invitation public à votre communauté WhatsApp et vos réseaux sociaux.',
      'Pendant le direct, répondez au chat interactif et observez les commandes validées en temps réel.'
    ]
  },

  // 6. Contrats & IA Pro
  {
    id: 'tuto-docusign-contracts',
    title: 'Signer électroniquement des contrats et accords avec DocuSign',
    category: 'DOCS_LEGAL_MARKET',
    categoryLabel: '📄 Contrats & IA Pro',
    duration: '1 min 40',
    level: 'Débutant',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['DOCUSIGN', 'CUSTOMER_ORDERS'],
    description: 'Sécurisez vos partenariats commerciaux avec signature tactile et paraphe certifié sur mobile.',
    steps: [
      'Ouvrez le module "DocuSign" et téléversez ou générez votre contrat commercial.',
      'Apposez votre signature au doigt ou au stylet sur l’écran tactile.',
      'Exportez le document PDF certifié et transmettez-le par email ou WhatsApp.'
    ]
  },
  {
    id: 'tuto-escrow-quotes',
    title: 'Gérer des devis et projets sécurisés avec Tiers de Confiance (Séquestre)',
    category: 'DOCS_LEGAL_MARKET',
    categoryLabel: '📄 Contrats & IA Pro',
    duration: '2 min 05',
    level: 'Intermédiaire',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['QUOTES_PROJECTS'],
    description: 'Protégez vos prestations de service : le client dépose les fonds en séquestre avant le début des travaux.',
    steps: [
      'Établissez un devis formel dans le module "Devis & Projets Escrow".',
      'Le client valide et approvisionne le séquestre via Mobile Money ou virement.',
      'Une fois la prestation livrée et validée, les fonds vous sont reversés en toute sécurité.'
    ]
  },
  {
    id: 'tuto-ai-marketing-legal',
    title: 'Rédiger des argumentaires de vente et conseils avec l’IA Marketing & Juridique',
    category: 'DOCS_LEGAL_MARKET',
    categoryLabel: '📄 Contrats & IA Pro',
    duration: '1 min 30',
    level: 'Débutant',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    contextualViews: ['AI_ADVISOR', 'CV_CREATOR'],
    description: 'Rédigez des descriptions captivantes et préparez vos conditions de vente en quelques secondes.',
    steps: [
      'Accédez à l’assistant IA depuis la caisse ou le menu d’outils.',
      'Posez votre question ou demandez un texte commercial pour un nouveau produit.',
      'Copiez la réponse instantanée pour vos statuts WhatsApp ou vos fiches articles.'
    ]
  }
];

const RTDB_TUTORIALS_URL = 'https://nanasore-default-rtdb.firebaseio.com/tutorials_config.json';
const LOCAL_TUTORIALS_KEY = 'nana_tutorials_config';
const LOCAL_COMPLETED_KEY = 'nana_completed_tutorials';

let memoryCache: TutorialItem[] | null = null;

/**
 * S'assure que la vidéo de création de compte (tuto-1-gmail-signup) est TOUJOURS
 * en première position comme vidéo présentative principale, avec un flux MP4/HLS valide.
 */
export function prioritizeAccountCreationTutorial(list: TutorialItem[]): TutorialItem[] {
  if (!Array.isArray(list) || list.length === 0) return DEFAULT_TUTORIALS;

  const normalized = list.map((item) => {
    const isAccountCreationTuto =
      item.id === 'tuto-1-gmail-signup' ||
      /cr[eé]er.*compte|ouverture.*compte|gmail/i.test(item.title || '');
    if (isAccountCreationTuto) {
      const hasPlaceholderVideo =
        !item.videoUrl || item.videoUrl.includes('dQw4w9WgXcQ');
      return {
        ...item,
        videoUrl: hasPlaceholderVideo ? '/assets/videos/intro_nanasore.mp4' : item.videoUrl,
        videoThumbnail: item.videoThumbnail || '/fondateur-nanasore.jpg'
      };
    }
    return item;
  });

  const firstIdx = normalized.findIndex(
    (t) =>
      t.id === 'tuto-1-gmail-signup' ||
      /cr[eé]er.*compte|ouverture.*compte|gmail/i.test(t.title || '')
  );

  if (firstIdx > 0) {
    const [accountTuto] = normalized.splice(firstIdx, 1);
    return [accountTuto, ...normalized];
  }
  if (firstIdx === -1) {
    return [DEFAULT_TUTORIALS[0], ...normalized];
  }
  return normalized;
}

/**
 * Détecte si l'URL vidéo est un flux direct MP4 / WebM / HLS (.m3u8)
 */
export function isDirectVideoStream(url?: string): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.m3u8') ||
    clean.startsWith('/assets/') ||
    clean.startsWith('/videos/') ||
    clean.startsWith('/intro-')
  );
}

/**
 * Récupère la première vidéo présentative (Création de compte Nanasore)
 */
export function getFirstPresentativeTutorial(): TutorialItem {
  const all = getTutorials();
  return (
    all.find(
      (t) =>
        t.id === 'tuto-1-gmail-signup' ||
        /cr[eé]er.*compte|ouverture.*compte|gmail/i.test(t.title || '')
    ) ||
    all[0] ||
    DEFAULT_TUTORIALS[0]
  );
}

/**
 * Récupère la liste des tutoriels (Cache mémoire -> LocalStorage -> Défaut)
 * Accessible publiquement sans aucune restriction d'authentification.
 */
export function getTutorials(): TutorialItem[] {
  if (memoryCache && memoryCache.length > 0) return memoryCache;
  if (typeof window === 'undefined') return DEFAULT_TUTORIALS;

  try {
    const raw = localStorage.getItem(LOCAL_TUTORIALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const prioritized = prioritizeAccountCreationTutorial(parsed);
        memoryCache = prioritized;
        return prioritized;
      }
    }
  } catch (e) {
    console.warn('[tutorialService] Erreur lecture localStorage:', e);
  }

  memoryCache = DEFAULT_TUTORIALS;
  return DEFAULT_TUTORIALS;
}

/**
 * Synchronisation asynchrone publique avec Firebase RTDB (sans authentification requise)
 */
export async function fetchTutorialsFromFirebase(): Promise<TutorialItem[]> {
  try {
    const res = await fetch(RTDB_TUTORIALS_URL);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const prioritized = prioritizeAccountCreationTutorial(data);
        memoryCache = prioritized;
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_TUTORIALS_KEY, JSON.stringify(prioritized));
          window.dispatchEvent(new Event('tutorialsUpdated'));
        }
        return prioritized;
      }
    }
  } catch (e) {
    console.warn('[tutorialService] Erreur fetch RTDB:', e);
  }
  return getTutorials();
}

export const loadTutorialsFromFirebase = fetchTutorialsFromFirebase;

/**
 * Sauvegarde de la liste complète des tutoriels (Super Admin)
 */
export async function saveTutorialsEverywhere(tutorials: TutorialItem[]): Promise<boolean> {
  memoryCache = tutorials;
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_TUTORIALS_KEY, JSON.stringify(tutorials));
    window.dispatchEvent(new Event('tutorialsUpdated'));
  }

  try {
    const res = await fetch(RTDB_TUTORIALS_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tutorials)
    });
    return res.ok;
  } catch (e) {
    console.warn('[tutorialService] Erreur écriture RTDB:', e);
    return false;
  }
}

/**
 * Récupère les IDs des tutoriels marqués comme "Vu ✅"
 */
export function getCompletedTutorialIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_COMPLETED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Marque ou démarque un tutoriel comme "Vu ✅"
 */
export function toggleTutorialCompleted(tutorialId: string): { isCompleted: boolean; percent: number } {
  const completed = getCompletedTutorialIds();
  const exists = completed.includes(tutorialId);
  let updated: string[];

  if (exists) {
    updated = completed.filter((id) => id !== tutorialId);
  } else {
    updated = [...completed, tutorialId];
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_COMPLETED_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('tutorialProgressUpdated'));
  }

  const all = getTutorials();
  const percent = all.length > 0 ? Math.round((updated.length / all.length) * 100) : 0;
  return { isCompleted: !exists, percent };
}

/**
 * Calcule le pourcentage global de formation complétée
 */
export function getCompletionProgress(): { completedCount: number; totalCount: number; percent: number } {
  const all = getTutorials();
  const completed = getCompletedTutorialIds();
  const validCompleted = completed.filter((id) => all.some((t) => t.id === id));
  const totalCount = all.length;
  const completedCount = validCompleted.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  return { completedCount, totalCount, percent };
}

/**
 * Convertit une URL YouTube standard en URL intégrable / embed
 */
export function formatVideoEmbedUrl(url: string): string {
  if (!url) return '';
  if (url.includes('youtube.com/embed/')) return url;

  // Format https://www.youtube.com/watch?v=VIDEO_ID
  if (url.includes('watch?v=')) {
    const videoId = url.split('watch?v=')[1]?.split('&')[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  }

  // Format https://youtu.be/VIDEO_ID
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  }

  return url;
}

/**
 * Trouve le tutoriel immédiatement pertinent selon la vue ou le module applicatif actif
 */
export function getContextualTutorial(viewName?: string): TutorialItem | null {
  if (!viewName) return null;
  const tutorials = getTutorials();
  const v = viewName.toUpperCase().trim();

  // Correspondance dans contextualViews
  const matched = tutorials.find(t => 
    t.contextualViews?.some(cv => cv.toUpperCase() === v || v.includes(cv.toUpperCase()) || cv.toUpperCase().includes(v))
  );

  if (matched) return matched;

  // Correspondance de repli par mot-clé de vue
  if (v.includes('POS') || v.includes('STOCK') || v.includes('INVENTORY') || v.includes('DEBT')) {
    return tutorials.find(t => t.category === 'POS_STOCK') || tutorials[0] || null;
  }
  if (v.includes('STORE') || v.includes('BOUTIQUE') || v.includes('ORDER')) {
    return tutorials.find(t => t.category === 'STORE_ORDERS') || null;
  }
  if (v.includes('PAY') || v.includes('SMS') || v.includes('GATEWAY') || v.includes('SETTINGS')) {
    return tutorials.find(t => t.category === 'NANASORE_PAY') || null;
  }
  if (v.includes('AI') || v.includes('STUDIO') || v.includes('FUNNEL')) {
    return tutorials.find(t => t.category === 'AI_FUNNELS') || null;
  }
  if (v.includes('LIVE') || v.includes('WEBINAR')) {
    return tutorials.find(t => t.category === 'LIVE_SHOPPING') || null;
  }
  if (v.includes('DOC') || v.includes('QUOTE') || v.includes('CV') || v.includes('LEGAL')) {
    return tutorials.find(t => t.category === 'DOCS_LEGAL_MARKET') || null;
  }

  return tutorials[0] || null;
}
