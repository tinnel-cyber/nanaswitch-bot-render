/**
 * @file ecosystemDocumentationData.ts
 * @description Référentiel documentaire officiel et exhaustif de l'écosystème Nanasore.
 * Présente l'architecture, le parcours KYC, les plans tarifaires, les thèmes, 
 * les applications, services, modules et outils avec leurs liaisons et stratégies marketing.
 * 
 * RÈGLES STRICTES DE SOUVERAINETÉ :
 * - Aucune mention de prestataires ou de tiers techniques externes.
 * - Vocabulaire professionnel, souverain et orienté performance d'entreprise.
 */

export interface ThemeDocItem {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  targetSector: string;
  role: string;
  keyFeatures: string[];
  marketingAngle: string;
  bestPairedWith: string[];
}

export interface ComponentDocItem {
  id: string;
  name: string;
  taxonomy: 'APPLICATION' | 'SERVICE' | 'MODULE' | 'OUTIL';
  category: string;
  badge: string;
  badgeColor: string;
  shortDescription: string;
  definition: string;
  function: string;
  domain: string;
  businessValue: string;
  workflow: string[];
  configuration: string[];
  marketingStrategy: string[];
  synergiesAndMonetization: string[];
  pricingPlan: 'PLAN_COMMISSION' | 'PLAN_ABONNEMENT' | 'INCLUS_BASE' | 'HYBRIDE';
  parentAppOrService?: string;
  connectedModules?: string[];
}

export interface KycAndOnboardingGuide {
  title: string;
  subtitle: string;
  steps: {
    number: number;
    title: string;
    description: string;
    keyPoints: string[];
  }[];
  accountTypes: {
    type: 'INDIVIDUAL' | 'ENTERPRISE';
    label: string;
    monthlyCap: string;
    documentsRequired: string[];
    intendedFor: string;
    activationDelay: string;
  }[];
  supportCommitment: {
    title: string;
    responseTime: string;
    availability: string;
    channels: string[];
    description: string;
  };
}

export interface PricingPlanGuide {
  title: string;
  subtitle: string;
  plans: {
    id: string;
    name: string;
    badge: string;
    targetAudience: string;
    businessModel: string;
    accessibleModules: string[];
    excludedModules: string[];
    advantages: string[];
    commissionRateOrFee: string;
  }[];
}

/* ============================================================================
   1. GUIDE D'INTÉGRATION, CRÉATION DE COMPTE, KYC & SUPPORT
============================================================================ */
export const KYC_ONBOARDING_GUIDE: KycAndOnboardingGuide = {
  title: "Parcours d'Ouverture de Compte & Conformité KYC Souveraine",
  subtitle: "Une procédure rapide, juridiquement blindée et sans friction pour lancer votre activité en toute conformité.",
  steps: [
    {
      number: 1,
      title: "Création de l'Univers Marchand en 60 secondes",
      description: "L'utilisateur renseigne l'identité fondamentale de son activité : nom de sa boutique, de son centre ou de son entreprise, numéro de contact et secteur d'activité ciblé.",
      keyPoints: [
        "Aucune complexité technique : saisie intuitive et validation instantanée.",
        "Accès immédiat à l'espace de gestion et aux modules autorisés dès la création.",
        "Le nom de l'univers devient l'identifiant commercial unique du compte marchand."
      ]
    },
    {
      number: 2,
      title: "Dépôt des Pièces Justificatives (Identification KYC)",
      description: "Pour respecter les obligations légales de lutte contre la fraude et de régulation financière, le marchand transmet ses justificatifs selon son statut.",
      keyPoints: [
        "Formulaire unique et unifié évitant les doublons de saisie.",
        "Chiffrement intégral des pièces d'identité et justificatifs officiels.",
        "Consultation en lecture simple des politiques de confidentialité et conditions légales sans quitter l'interface."
      ]
    },
    {
      number: 3,
      title: "Période de Validation & Disponibilité des Services",
      description: "Dès la soumission des documents, un badge animé indique le traitement par l'équipe de conformité légale.",
      keyPoints: [
        "L'utilisateur peut continuer à configurer ses produits, vitrines et catalogues en toute tranquillité.",
        "Un message de réassurance informe le marchand de la bonne réception de son dossier.",
        "Activation immédiate des modules dès validation par le pôle conformité."
      ]
    }
  ],
  accountTypes: [
    {
      type: 'INDIVIDUAL',
      label: 'Compte Particulier / Entrepreneur Individuel',
      monthlyCap: '1 000 000 XOF / mois',
      documentsRequired: [
        "Pièce d'identité officielle en cours de validité (CNIB ou Passeport)",
        "Selfie d'authentification en direct garantissant la présence du titulaire",
        "Numéro de téléphone principal vérifié"
      ],
      intendedFor: "Commerçants indépendants, créateurs de contenu, formateurs solo et prestataires de services.",
      activationDelay: "Généralement traité en moins de 2 heures ouvrées"
    },
    {
      type: 'ENTERPRISE',
      label: 'Compte Entreprise Enregistrée (Personne Morale)',
      monthlyCap: '5 000 000 XOF / mois',
      documentsRequired: [
        "Numéro de Registre de Commerce et du Crédit Mobilier (RCCM)",
        "Numéro d'Identifiant Fiscal Unique (IFU / NIF)",
        "Pièce d'identité du gérant ou mandataire social",
        "Statuts de société ou attestation d'immatriculation officielle"
      ],
      intendedFor: "Sociétés commerciales (SARL, SAS, SUARL), supermarchés, réseaux de distribution et institutions.",
      activationDelay: "Validation prioritaire par un gestionnaire de compte dédié"
    }
  ],
  supportCommitment: {
    title: "Support Marchand Dédié & Ultra-Réactif",
    responseTime: "< 5 minutes",
    availability: "24h/24 et 7j/7",
    channels: [
      "Messagerie instantanée d'assistance intégrée au Dashboard",
      "Canal direct d'assistance téléphonique & messagerie instantanée",
      "Accompagnement personnalisé par un chargé de compte pour les entreprises"
    ],
    description: "Notre cellule de support technique et commercial vous accompagne à chaque étape : paramétrage de votre caisse, déploiement de vos tunnels de conversion, synchronisation des stocks et gestion de vos encaissements."
  }
};

/* ============================================================================
   2. GUIDE DES PLANS TARIFAIRES & MODÈLES D'USAGE
============================================================================ */
export const PRICING_PLANS_GUIDE: PricingPlanGuide = {
  title: "Modèles d'Usage & Plans Tarifaires Équitables",
  subtitle: "Une distinction claire entre modèle à la commission et formule d'abonnement pour aligner nos intérêts sur votre croissance.",
  plans: [
    {
      id: 'plan-commission',
      name: 'Plan à la Commission (Accès par Transaction)',
      badge: 'ZÉRO FRAIS FIXES • PAIEMENT AU SUCCÈS',
      targetAudience: "Vendeurs de formations, produits numériques, e-books, billets d'événements et prestations intellectuelles.",
      businessModel: "Vous ne payez que lorsque vous vendez. Aucun abonnement mensuel obligatoire. Un pourcentage transparent est prélevé à la source lors de chaque encaissement client.",
      accessibleModules: [
        "Vitrine en Ligne (E-Shop Numérique)",
        "Cours Forge & Académie LMS",
        "Espace Upload Vendeur & Académique",
        "Public Deal Page Builder (Produits Numériques)",
        "DocuSign Hub & Contrats Signés",
        "Espace Partenaire & Affiliation",
        "Studio de Génération de Live & Webinaire"
      ],
      excludedModules: [
        "Caisse Tactile Magasin (POS Pro Physique)",
        "E-Commerce de Gros Catalogues Physiques avec logistique lourde",
        "Tunnels Physiques multi-étapes avancés"
      ],
      advantages: [
        "Zéro risque financier pour démarrer une nouvelle activité.",
        "Mise en route immédiate dès validation du profil légal.",
        "Reversements rapides sur compte bancaire ou porte-monnaie électronique."
      ],
      commissionRateOrFee: "Taux fixe transparent par transaction réussie (aucun frais caché)."
    },
    {
      id: 'plan-abonnement',
      name: "Plan Abonnement (Opérations Physiques & POS Pro)",
      badge: 'PUISSANCE MAXIMALE • VOLUMES ILLIMITÉS',
      targetAudience: "Commerces physiques, superettes, grossistes, pharmacies, restaurants, réseaux de boutiques et marques de retail.",
      businessModel: "Abonnement forfaitaire mensuel ou annuel donnant un accès sans retenue aux outils d'encaissement physique haute cadence, à l'exportation des données et à la synchronisation logistique permanente.",
      accessibleModules: [
        "Caisse Tactile Magasin (POS Pro)",
        "Physical Funnel Builder (Déstockage & Ventes Flash)",
        "Mini-Market Local & Commande QR Code Comptoir",
        "Scanner Code-Barres & Douchette Laser",
        "Stock & Inventaire Intelligent Multi-Dépôts",
        "Gestion des Dettes & Ardoises Clients",
        "Gestion des Employés & Droits par Code PIN",
        "Analytique Avancée & Courbe des Marges Nettes",
        "Tous les modules du Plan Commission également inclus"
      ],
      excludedModules: [],
      advantages: [
        "Aucune commission prohibitive sur vos encaissements physiques au comptoir.",
        "Gestion multi-caissiers avec traçabilité anti-fraude sans limite de transactions.",
        "Synchronisation fluide et instantanée entre vos stocks magasin et votre vitrine web."
      ],
      commissionRateOrFee: "Forfait fixe par point de vente / mois avec économie sur l'engagement annuel."
    }
  ]
};

/* ============================================================================
   3. CATALOGUE OFFICIEL DES THÈMES E-COMMERCE (STUDIO DE THÈMES)
============================================================================ */
export const THEMES_DOCUMENTATION_CATALOG: ThemeDocItem[] = [
  {
    id: 'theme-blank-custom',
    name: 'Nanasore Architect (Constructeur Libre A à Z)',
    subtitle: 'Drag & Drop Total • 15 Modules E-Commerce Innovants',
    badge: 'ARCHITECT OS • SUR-MESURE',
    targetSector: 'Grandes marques, agences, commerces exigeants, concepts stores multi-catégories.',
    role: 'Permet de bâtir une vitrine sur-mesure sans toucher une ligne de code, en assemblant visuellement 15 blocs spécialisés : Bento Hero, Rail Musical de hits, Négociateur Flash automatique, Note vocale d\'accueil et comparateur visuel Avant/Après.',
    keyFeatures: [
      'Glisser-déposer intuitif respectant les normes d\'accessibilité et de rapidité web.',
      'Module exclusif de négociation de prix encadré pour augmenter la conversion immédiate.',
      'Note vocale authentique pour instaurer une confiance humaine sans précédent.',
      'Chargement ultra-rapide optimisé pour les connexions mobiles modestes.'
    ],
    marketingAngle: "Idéal pour créer un univers de marque différenciant qui se démarque radicalement des boutiques génériques concurrentes.",
    bestPairedWith: ['Vitrine en Ligne (E-Shop)', 'Ultimate Funnel Builder', 'Pixels de Tracking / CRM']
  },
  {
    id: 'theme-livestream-pro',
    name: 'Studio Live & Webinaire Pro',
    subtitle: 'Vente en Direct (Live Commerce) & Masterclass Haute Valeur',
    badge: 'LIVE COMMERCE • HIGH-TICKET',
    targetSector: 'Influenceurs, formateurs d\'élite, marques de mode, bijouteries et déstockeurs en direct.',
    role: 'Transforme votre boutique en une chaîne de télévision commerciale interactive. Les visiteurs regardent le direct vidéo, posent leurs questions dans un chat instantané et achètent en 1 clic grâce à la drop zone des ventes flash, sans jamais couper la vidéo.',
    keyFeatures: [
      'Lecteur vidéo Picture-in-Picture flottant qui accompagne le client lors du défilement.',
      'Affichage d\'offres limitées avec compte à rebours créant une urgence d\'achat authentique (FOMO).',
      'Preuves sociales en temps réel (notifications des achats réalisés par d\'autres spectateurs).',
      'Panier express et encaissement direct intégré au flux de streaming.'
    ],
    marketingAngle: "Taux de conversion jusqu'à 4 fois supérieur à une page classique grâce à l'énergie du direct et au sentiment d'exclusivité temporelle.",
    bestPairedWith: ['Studio de Génération de Live et Webinaire', 'Public Deal Page Builder', 'CRM et Automation']
  },
  {
    id: 'theme-beauty-emerald',
    name: 'Émeraude Prestige (Beauté & Soins)',
    subtitle: 'Cosmétiques, Skincare, Parfumerie & Bien-être Haute Couture',
    badge: 'LUXE & ÉLÉGANCE',
    targetSector: 'Instituts de beauté, marques de cosmétiques naturels, parfumeries et parapharmacies.',
    role: 'Valorise des produits de beauté et de bien-être à forte marge grâce à une direction artistique épurée mariant vert émeraude impérial et or champagne, avec zoom loupe haute définition et mise en avant des bienfaits dermatologiques.',
    keyFeatures: [
      'Fiche produit immersive avec loupe de grossissement pour apprécier la texture et les ingrédients.',
      'Trio de typographies éditoriales apportant une perception immédiate de luxe et de rareté.',
      'Badges d\'ingrédients certifiés et garanties de sécurité dermatologique.',
      'Section d\'avis clients 50/50 avec photos de résultats avant/après.'
    ],
    marketingAngle: "Permet de justifier un panier moyen plus élevé en transformant un produit utilitaire en rituel de beauté prestigieux.",
    bestPairedWith: ['Vitrine en Ligne (E-Shop)', 'Stock & Inventaire', 'Studio E-mailing & Campagnes Pro']
  },
  {
    id: 'theme-electro-orange',
    name: 'Electro Orange & Blanc',
    subtitle: 'High-Tech, Électronique, Smartphones & Électroménager',
    badge: 'CONVERSION TECHNIQUE',
    targetSector: 'Magasins de téléphonie, informatique, accessoires et appareils domestiques.',
    role: 'Structure les catalogues de produits techniques grâce à un méga-menu puissant, un sélecteur de variantes par couleur/stockage et un générateur de lots d\'accessoires complémentaires (cross-selling automatique).',
    keyFeatures: [
      'Système de vente croisée (Bundling) : propose coque, chargeur et verre trempé en cochant une case.',
      'Tableau comparatif des spécifications techniques clair et lisible sur smartphone.',
      'Filtres latéraux dynamiques par marque, gamme de prix et caractéristiques clés.',
      'Garantie et SAV clairement mis en avant sur chaque page produit.'
    ],
    marketingAngle: "Augmente le panier moyen de 25% à 40% par commande grâce aux offres groupées suggérées intelligemment au client.",
    bestPairedWith: ['Caisse Tactile Magasin (POS)', 'Scanner Code-Barres', 'Stock & Inventaire']
  },
  {
    id: 'theme-default',
    name: 'Standard Élite',
    subtitle: 'Vitrine Universelle Polyvalente & Rayons Défilants',
    badge: 'TOUT-EN-UN • RAPIDE',
    targetSector: 'Tous commerces de détail, épiceries fines, mode polyvalente, librairies et cadeaux.',
    role: 'Offre une expérience d\'achat fluide et éprouvée avec carrousel promotionnel en tête de page, bandeau d\'annonces défilant pour les promotions du jour, et grille produit équilibrée à 2 ou 4 colonnes.',
    keyFeatures: [
      'Bandeau d\'annonces dynamique pour communiquer sur les délais de livraison et remises.',
      'Rayon des nouveautés conçu pour un défilement ultra-facile sous le pouce sur mobile.',
      'Badges de promotion clairs et visibles incitant au clic rapide.',
      'Compatibilité totale avec tous les modules de paiement souverain.'
    ],
    marketingAngle: "Le choix parfait pour démarrer rapidement sans se poser de questions : intuitif pour 100% des acheteurs dès la première seconde.",
    bestPairedWith: ['Vitrine en Ligne (E-Shop)', 'Stock & Inventaire', 'Gestion des Dettes']
  },
  {
    id: 'theme-mega-store-pro',
    name: 'Mega-Store Pro',
    subtitle: 'Structure Marketplace Haute Densité pour Grands Catalogues',
    badge: 'GRANDS CATALOGUES',
    targetSector: 'Grossistes, supermarchés, quincailleries industrielles et marketplaces généralistes.',
    role: 'Conçu pour gérer des centaines ou milliers de références sans ralentir la navigation. Propose une barre de recherche centrale géante avec sélection de rayon, une navigation par rayons arborescents et des bannières d\'offres segmentées.',
    keyFeatures: [
      'Moteur de recherche pro-actif avec auto-complétion instantanée et filtrage par rayon.',
      'Mega-Menu déroulant structuré permettant de visualiser l\'ensemble de l\'arborescence en un coup d\'œil.',
      'Affichage compact en grille permettant d\'afficher un maximum de références par écran.',
      'Gestion optimisée des stocks en temps réel pour éviter d\'afficher des produits épuisés.'
    ],
    marketingAngle: "Idéal pour habituer vos clients à commander l'ensemble de leurs besoins récurrents au même endroit plutôt que chez plusieurs concurrents.",
    bestPairedWith: ['Import & Export Excel / CSV', 'Stock & Inventaire', 'Passerelle Souveraine']
  },
  {
    id: 'theme-electro-tech',
    name: 'Premium Électronique Tech',
    subtitle: 'Design Épuré Haute Précision (Gaming & Équipements Pro)',
    badge: 'DESIGN MINIMALISTE',
    targetSector: 'Boutiques de gaming, matériel audio professionnel, montres connectées et drones.',
    role: 'Met en avant les produits technologiques haut de gamme grâce à des visuels épurés au format ratio 4:3 anti-déformation, un arrière-plan doux et des micro-animations de mise en valeur des finitions matérielles.',
    keyFeatures: [
      'Galerie photos multi-angles avec zoom interactif sur les ports et connectiques.',
      'Onglets structurés pour le détail technique, le contenu de la boîte et les avis certifiés.',
      'Badges de réassurance sur la livraison express et l\'assistance technique après-vente.',
      'Design contrasté mettant immédiatement en valeur le bouton d\'action principal.'
    ],
    marketingAngle: "Construit une perception de fiabilité technologique absolue qui lève tous les freins à l'achat sur les produits coûteux.",
    bestPairedWith: ['Vitrine en Ligne (E-Shop)', 'DocuSign Hub & Contrats Signés', 'Pixels de Tracking']
  },
  {
    id: 'theme-digital-pro',
    name: 'Premium Digital Pro',
    subtitle: 'Formations, E-books, Logiciels & Produits Téléchargeables',
    badge: 'INFOPRODUITS • ZERO FRICTION',
    targetSector: 'Créateurs de formations, éditeurs de livres numériques, coachs, consultants et développeurs de logiciels.',
    role: 'Maximise la conversion sur les produits immatériels. Chaque fiche produit présente une promesse claire, un programme détaillé des modules, des témoignages vidéos d\'élèves et un tunnel de paiement direct sans étape inutile.',
    keyFeatures: [
      'Format de visuel carré 1:1 parfaitement aligné avec les formats publicitaires sur les réseaux sociaux.',
      'Tunnel de paiement condensé en une seule page avec livraison instantanée du lien de téléchargement ou d\'accès.',
      'Blocs d\'arguments structurés en puces percutantes facilitant la lecture rapide.',
      'Garantie de satisfaction clairement affichée sous le bouton de commande.'
    ],
    marketingAngle: "Réduit les abandons de commande de 35% en supprimant les demandes d'adresse physique inutiles pour les produits 100% téléchargeables.",
    bestPairedWith: ['Cours Forge (LMS)', 'Espace Upload Académique & Vendeur', 'Espace Partenaire & Affiliation']
  }
];

/* ============================================================================
   4. CATALOGUE DÉTAILLÉ DES APPLICATIONS, SERVICES, MODULES ET OUTILS
============================================================================ */
export const ECOSYSTEM_COMPONENTS_DOCUMENTATION: ComponentDocItem[] = [
  /* --------------------------------------------------------------------------
     A. APPLICATIONS
  -------------------------------------------------------------------------- */
  {
    id: 'pos',
    name: 'Caisse Tactile Magasin (POS Pro)',
    taxonomy: 'APPLICATION',
    category: 'Commerce & Vente',
    badge: 'APPLICATION MÈRE DU COMMERCE PHYSIQUE',
    badgeColor: 'bg-emerald-600 text-white',
    shortDescription: "Système complet d'encaissement au comptoir, tickets de caisse, synchronisation des ventes et pilotage du magasin.",
    definition: "La Caisse Tactile Magasin (POS Pro) est l'application logicielle centrale de terminal point de vente conçue pour les commerces physiques de toute taille. Elle opère avec une fluidité remarquable sur tablette tactile, ordinateur ou smartphone, et garantit un fonctionnement sans interruption même en cas de coupure Internet momentanée.",
    function: "Enregistre les transactions en boutique, calcule automatiquement les totaux et remises, supporte les encaissements fractionnés ou multi-moyens (espèces, monnaie électronique, carte bancaire, crédit client), décrémente instantanément le stock magasin, imprime les reçus ou les envoie par messagerie instantanée, et assure la clôture quotidienne sécurisée (états X et Z).",
    domain: "Boutiques de mode, superettes, alimentations générales, pharmacies, quincailleries, salons de coiffure, restaurants et commerces de gros.",
    businessValue: "Éradique les erreurs de calcul manuel, divise par trois le temps d'attente des clients à la caisse, empêche les fuites de recettes grâce à la traçabilité par caissier et maintient une cohérence parfaite entre votre stock réel en rayon et vos ventes.",
    workflow: [
      "1. Le vendeur s'identifie rapidement à l'aide de son code PIN confidentiel.",
      "2. Les produits sont scannés via la douchette laser ou sélectionnés sur l'écran tactile via les touches favorites.",
      "3. Le client choisit son mode de règlement (Espèces, Monnaie Électronique locale ou Solde à crédit).",
      "4. La vente est validée en une seconde : le ticket s'imprime, le stock s'ajuste et la transaction est archivée dans la comptabilité."
    ],
    configuration: [
      "Définition du fonds de caisse d'ouverture et des devises de base.",
      "Attribution des profils utilisateurs (Caissier simple, Chef de rayon, Gérant propriétaire).",
      "Connexion de l'imprimante à reçu (Bluetooth, USB ou réseau) et du tiroir-caisse.",
      "Autorisation ou verrouillage des remises exceptionnelles par caissier."
    ],
    marketingStrategy: [
      "Impression d'un code QR personnalisé au bas de chaque ticket de caisse pour inciter le client à visiter le Mini-Market local ou la vitrine en ligne.",
      "Collecte diplomatique du numéro de téléphone du client pour lui envoyer son reçu électronique et l'intégrer aux campagnes de fidélisation.",
      "Mise en place de remises flash comptoir sur les articles en sur-stock pour dynamiser le panier moyen."
    ],
    synergiesAndMonetization: [
      "Caisse POS + Physical Funnel Builder + Mini-Market : Permet de déstocker les articles physiques du magasin en créant des offres flash consultables via le Code QR du comptoir.",
      "Caisse POS + Stock & Inventaire : Synchronisation bidirectionnelle empêchant la sur-vente.",
      "Caisse POS + Gestion des Dettes : Suivi rigoureux des clients réguliers autorisés à régler en fin de mois.",
      "Modèle économique : Soumis au Plan Abonnement afin d'offrir un usage illimité sans prélèvement de commission sur les encaissements au comptoir."
    ],
    pricingPlan: 'PLAN_ABONNEMENT',
    connectedModules: ['deal-builder', 'tool-scanner', 'mod-inventory', 'mod-debts', 'mod-team-employees']
  },

  {
    id: 'deal-builder',
    name: 'Physical Funnel Builder (Deals Flash, Mini-Market & QR Code)',
    taxonomy: 'APPLICATION',
    category: 'Vente Physique & Déstockage',
    badge: 'MODULE NATIF DE LA CAISSE POS',
    badgeColor: 'bg-amber-600 text-white',
    shortDescription: "Générateur de deals physiques flash, mini-market local d'urgence et QR codes d'appel directement reliés à la caisse du magasin.",
    definition: "Le Physical Funnel Builder est l'extension commerciale directe de la Caisse Tactile Magasin. Il permet à un commerçant physique de créer en 2 minutes des pages de déstockage percutantes pour ses produits physiques, accessibles par ses clients locaux via un Code QR imprimé en boutique ou partagé sur les réseaux sociaux.",
    function: "Génère des pages web épurées dédiées à un produit ou pack physique précis, intègre un compte à rebours d'urgence, affiche le stock restant en temps réel issu de la caisse, et permet au client de réserver son article en ligne avec retrait en magasin (Click & Collect) ou livraison express de proximité.",
    domain: "Commerçants physiques ayant des stocks dormants, fins de séries, arrivages saisonniers ou promotions exclusives du week-end.",
    businessValue: "Transforme un stock immobile en trésorerie liquide en moins de 48 heures sans devoir construire un site e-commerce complexe. Permet aux clients qui passent devant la boutique de scanner le QR Code sur la vitrine fermée et de commander quand même.",
    workflow: [
      "1. Depuis la caisse ou le smartphone, le commerçant sélectionne l'article à déstocker.",
      "2. Il fixe un tarif promotionnel agressif et une date limite de fin d'offre.",
      "3. L'application génère automatiquement un Code QR prêt à imprimer et un lien web court.",
      "4. Le Code QR est affiché sur le comptoir, sur la vitrine ou partagé sur WhatsApp.",
      "5. Les clients scannent, commandent et viennent récupérer leur commande au comptoir."
    ],
    configuration: [
      "Paramétrage du délai de validité du deal (ex: 24h, 48h, fin de semaine).",
      "Choix des options de retrait : Retrait comptoir gratuit ou livraison par coursier partenaire.",
      "Affichage ou masquage de la jauge de stock résiduel pour intensifier l'urgence."
    ],
    marketingStrategy: [
      "Placement du Code QR sur la vitrine du magasin : permet aux passants de commander même quand le rideau est baissé la nuit ou le dimanche.",
      "Diffusion du lien court dans les statuts WhatsApp de l'équipe de vente le vendredi soir pour déclencher une vague de commandes le samedi matin.",
      "Offre spéciale 'Pack Comptoir' réservée aux personnes scannant le QR code sur place."
    ],
    synergiesAndMonetization: [
      "Directement rattaché à la Caisse POS : les ventes réalisées via le deal sont automatiquement enregistrées dans le journal de caisse.",
      "Alimenté par le Stock & Inventaire : le deal se désactive dès que le quota réservé est épuisé, évitant tout litige client.",
      "Modèle économique : Inclus dans le Plan Abonnement de la Caisse POS pour maximiser le chiffre d'affaires du commerçant."
    ],
    pricingPlan: 'PLAN_ABONNEMENT',
    parentAppOrService: 'pos',
    connectedModules: ['pos', 'mod-inventory', 'tool-scanner']
  },

  {
    id: 'studio',
    name: 'Vitrine en Ligne (E-Shop & Commande WhatsApp)',
    taxonomy: 'APPLICATION',
    category: 'Commerce & Vente',
    badge: 'BOUTIQUE E-COMMERCE OMNICANALE',
    badgeColor: 'bg-blue-600 text-white',
    shortDescription: "Boutique en ligne moderne, catalogue interactif, panier d'achat et finalisation de commande avec paiement ou redirection WhatsApp.",
    definition: "La Vitrine en Ligne est la vitrine digitale souveraine de votre univers commercial. Elle offre à vos clients une expérience de navigation d'un niveau international, adaptée à tous les écrans, avec présentation soignée de vos rayons, fiches produits détaillées, gestion des variantes et panier d'achat intelligent.",
    function: "Présente le catalogue de produits, filtre les articles par catégories, gère les promotions et codes de réduction, permet l'achat direct avec paiement électronique souverain ou la finalisation avec transmission automatique du récapitulatif complet sur le numéro WhatsApp officiel de la boutique.",
    domain: "Marques direct-to-consumer, boutiques de prêt-à-porter, créateurs locaux, épiceries fines, artisans et distributeurs.",
    businessValue: "Permet de vendre 24 heures sur 24 sans frontière géographique. Grâce à la commande assistée par messagerie instantanée, elle s'adapte parfaitement aux habitudes d'achat des marchés émergents où le contact humain et la discussion rassurent le consommateur.",
    workflow: [
      "1. Le marchand configure sa boutique et choisit un thème adapté à son secteur dans le Studio de Thèmes.",
      "2. Les produits y sont publiés avec leurs photos haute définition, tarifs et descriptifs.",
      "3. Le client navigue, ajoute ses articles au panier et choisit son mode de finalisation.",
      "4. La commande est enregistrée dans le tableau de bord marchand et notifiée par alerte instantanée."
    ],
    configuration: [
      "Choix du thème graphique et personnalisation des couleurs de marque.",
      "Configuration des coordonnées WhatsApp et messages pré-remplis de commande.",
      "Définition des zones de livraison et des frais d'expédition applicables.",
      "Activation du paiement électronique direct ou du paiement à la livraison."
    ],
    marketingStrategy: [
      "Lien de boutique placé en biographie sur Instagram, TikTok et Facebook.",
      "Envoi de messages personnalisés avec lien direct vers le panier pour relancer les prospects indécis.",
      "Mise en avant des 3 articles phares de la semaine sur la bannière d'accueil du thème."
    ],
    synergiesAndMonetization: [
      "Vitrine + Studio de Thèmes : Personnalisation visuelle instantanée sans compétences techniques.",
      "Vitrine + Pixels de Tracking : Mesure précise de la rentabilité des publicités sur les réseaux sociaux.",
      "Vitrine + Stock Intelligent : Synchronisation parfaite des stocks disponibles.",
      "Modèle économique : Accessible sous Plan Commission pour les débutants (produits numériques) ou Plan Abonnement pour les grands catalogues physiques."
    ],
    pricingPlan: 'HYBRIDE',
    connectedModules: ['srv-theme-builder', 'mod-inventory', 'mod-pixels-crm', 'app-emailing']
  },

  {
    id: 'emailing',
    name: 'Studio E-mailing & Campagnes Pro',
    taxonomy: 'APPLICATION',
    category: 'Marketing & Vente',
    badge: 'ACQUISITION & MONÉTISATION DE QUOTAS',
    badgeColor: 'bg-indigo-600 text-white',
    shortDescription: "Éditeur visuel de newsletters et campagnes promotionnelles, segmentation fine d'audience et système de revente de quotas d'envoi.",
    definition: "Le Studio E-mailing Pro est une suite marketing complète dédiée à la communication par courrier électronique. Elle combine un éditeur de courriels par glisser-déposer, un gestionnaire de listes de contacts avec segmentation comportementale, et un mécanisme d'attribution de quotas d'envoi.",
    function: "Rédige et formate des courriels percutants, automatise les séquences d'accueil de nouveaux inscrits, segmente les clients selon leur historique d'achat, analyse les taux d'ouverture et de clics, et permet de commercialiser des quotas d'envoi à des tiers.",
    domain: "E-commerçants, formateurs, créateurs de communautés, agences marketing et entreprises B2B.",
    businessValue: "L'e-mail reste le canal marketing affichant le retour sur investissement le plus élevé du secteur numérique. Il vous rend totalement indépendant des algorithmes changeants des réseaux sociaux en capitalisant sur votre propre base de données clients.",
    workflow: [
      "1. Le marchand importe ou collecte ses contacts via sa vitrine ou ses tunnels de vente.",
      "2. Il conçoit son message dans l'éditeur visuel en sélectionnant un modèle prédéfini.",
      "3. Il cible un segment précis (ex: acheteurs des 30 derniers jours ayant dépensé plus de 50 000 XOF).",
      "4. La campagne est expédiée instantanément ou programmée pour l'heure de consultation optimale."
    ],
    configuration: [
      "Personnalisation du nom d'expéditeur et de l'adresse de réponse.",
      "Création des listes d'exclusion et gestion des désabonnements automatiques en 1 clic.",
      "Attribution des quotas d'envois mensuels selon le forfait actif."
    ],
    marketingStrategy: [
      "Séquence de bienvenue automatique en 3 e-mails offrant un bon de réduction de 10% sur le premier achat.",
      "E-mail de relance des paniers abandonnés envoyé 2 heures après la tentative d'achat inachevée.",
      "Newsletter hebdomadaire partageant un conseil d'expert suivi d'une offre commerciale ciblée."
    ],
    synergiesAndMonetization: [
      "E-mailing + Ultimate Funnel Builder : Récupération des prospects n'ayant pas finalisé leur commande.",
      "E-mailing + Académie & Cours Forge : Communication auprès des étudiants pour leur proposer des masterclass avancées.",
      "Monétisation directe : Revente de forfaits et quotas d'envoi à vos propres partenaires ou sous-comptes."
    ],
    pricingPlan: 'HYBRIDE',
    connectedModules: ['studio', 'ultimate-funnel', 'cours-forge']
  },

  {
    id: 'ai-advisor',
    name: 'Directeur de Croissance • Agent Stratégique',
    taxonomy: 'APPLICATION',
    category: 'Marketing & Stratégie',
    badge: 'INTELLIGENCE STRATÉGIQUE DÉDIÉE',
    badgeColor: 'bg-purple-600 text-white',
    shortDescription: "Conseiller stratégique autonome analysant vos chiffres clés, vos marges et vos opportunités d'arbitrage de rentabilité.",
    definition: "Le Directeur de Croissance est un assistant d'intelligence d'affaires entraîné sur les meilleures pratiques de vente et de gestion commerciale. Il analyse en temps réel les données de votre univers pour vous formuler des recommandations concrètes et mesurables.",
    function: "Scanne vos performances de vente, identifie les produits sous-performants et les best-sellers cachés, calcule le panier moyen et la marge réelle nette, suggère des hausses ou baisses de prix opportunes, et guide le marchand sur le choix optimal entre le Plan Commission et le Plan Abonnement.",
    domain: "Tous dirigeants de boutique, créateurs d'entreprise, directeurs commerciaux et indépendants souhaitant prendre des décisions guidées par les données.",
    businessValue: "Met à la disposition de tout commerçant la puissance d'analyse d'un directeur financier et commercial de haut niveau, accessible à toute heure pour éviter les investissements à perte et démultiplier les bénéfices nets.",
    workflow: [
      "1. L'agent stratégique agrège silencieusement les données de ventes, de paniers et de stocks.",
      "2. Il met en lumière des alertes concrètes (ex: 'Votre produit X a vu ses ventes chuter de 20% alors que sa marge est de 60%').",
      "3. Le marchand consulte les plans d'action recommandés et peut poser ses questions stratégiques en langage naturel.",
      "4. L'agent lui indique la meilleure combinaison de modules à activer pour rentabiliser son compte."
    ],
    configuration: [
      "Renseignement des coûts d'achat et charges fixes pour un calcul de rentabilité rigoureux.",
      "Définition des objectifs mensuels de chiffre d'affaires et de marge nette.",
      "Choix de la fréquence des synthèses d'activité (hebdomadaire ou mensuelle)."
    ],
    marketingStrategy: [
      "Application immédiate des recommandations de tarification dynamique proposées par l'agent.",
      "Identification des clients VIP à choyer avec des attentions particulières pour augmenter leur rétention.",
      "Arbitrage budgétaire guidé sur les campagnes publicitaires les plus profitables."
    ],
    synergiesAndMonetization: [
      "Agent Stratégique + Analytique & Courbe des Gains : Traduction des graphiques complexes en conseils d'action simples.",
      "Agent Stratégique + Chaîne KYC : Accompagnement proactif pour monter un dossier d'entreprise irréprochable et débloquer le plafond de 5M XOF.",
      "Inclus dans l'écosystème pour garantir le succès commercial durable de chaque partenaire."
    ],
    pricingPlan: 'INCLUS_BASE',
    connectedModules: ['analytics', 'kyc', 'ultimate-funnel']
  },

  {
    id: 'nanagenerator',
    name: 'Nanagénérateur AI (Studio Vidéo & Visuels Publicitaires)',
    taxonomy: 'APPLICATION',
    category: 'Studio IA & Création',
    badge: 'STUDIO CRÉATIF PUBLICITAIRE AUTOMATISÉ',
    badgeColor: 'bg-pink-600 text-white',
    shortDescription: "Génération instantanée de vidéos promotionnelles, bannières publicitaires et visuels produits optimisés pour les réseaux sociaux.",
    definition: "Le Nanagénérateur AI est un atelier de conception créative assisté par ordinateur. Il permet de transformer de simples photos de produits en visuels publicitaires percutants et en spots vidéos verticaux prêts à être diffusés sur TikTok, Instagram Reels et Facebook Ads.",
    function: "Supprime les arrière-plans disgracieux des photos produits, applique des décors de studio professionnels en 3D, ajoute des accroches marketing percutantes et produit des vidéos courtes dynamiques avec sous-titres et éléments d'incitation à l'action.",
    domain: "E-commerçants, marques de mode, vendeurs de cosmétiques, agences de communication et créateurs de contenu.",
    businessValue: "Économise des centaines de milliers de francs en frais de shooting photo et de studio de montage. Permet de tester 10 variantes de publicités en quelques minutes pour trouver rapidement le format qui génère le plus de ventes.",
    workflow: [
      "1. Le marchand téléverse la photo brute de son produit prise avec son smartphone.",
      "2. Il sélectionne l'ambiance désirée (Minimaliste, Luxe, Nature, Urbain, Fête).",
      "3. L'intelligence visuelle génère plusieurs propositions d'affiches et de spots en haute résolution.",
      "4. Le marchand télécharge les créations et les injecte directement dans ses campagnes ou statuts."
    ],
    configuration: [
      "Intégration du logo officiel et de la palette de couleurs de la marque.",
      "Choix du format de sortie (Carré 1:1 pour les flux, Vertical 9:16 pour les Stories/Reels).",
      "Sélection du ton des accroches publicitaires (Urgence, Humour, Prestige, Pédagogique)."
    ],
    marketingStrategy: [
      "Publication quotidienne de 2 vidéos produits sur TikTok et Reels pour capter du trafic organique gratuit.",
      "Création de bannières d'offres flash renouvelées chaque semaine pour maintenir l'intérêt de la communauté.",
      "A/B testing de 3 visuels différents pour une même campagne publicitaire afin de conserver le plus rentable."
    ],
    synergiesAndMonetization: [
      "Nanagénérateur + Ultimate Funnel Builder : Création des créatifs publicitaires qui alimentent les tunnels de vente.",
      "Nanagénérateur + Studio Thèmes : Remplissage des bannières de votre vitrine avec des visuels de calibre international.",
      "Modèle économique : Fonctionne avec une recharge de crédits d'usage ou un quota mensuel inclus dans les forfaits supérieurs."
    ],
    pricingPlan: 'HYBRIDE',
    connectedModules: ['studio', 'ultimate-funnel', 'deal-builder']
  },

  {
    id: 'ultimate-funnel',
    name: 'Ultimate Funnel Builder & Funnel Modulaire',
    taxonomy: 'APPLICATION',
    category: 'Tunnels de Vente',
    badge: 'CONVERSION MAXIMALE & UPSELLS 1-CLIC',
    badgeColor: 'bg-red-600 text-white',
    shortDescription: "Constructeur de tunnels de vente haute performance, ventes additionnelles immédiates (Upsells/Downsells) et paiement ultra-rapide.",
    definition: "L'Ultimate Funnel Builder est une infrastructure logicielle spécialisée dans la conversion de visiteurs en acheteurs. Contrairement à une boutique classique où le client peut s'égarer, le tunnel guide le prospect de façon linéaire et irrésistible vers l'achat d'un produit spécifique.",
    function: "Éditeur de pages de vente par blocs modulaires, propose des offres complémentaires au moment exact du paiement (Order Bump), permet de commander des produits additionnels en 1 clic après le paiement initial (One-Click Upsell), et gère le test A/B pour comparer deux versions d'une même page.",
    domain: "Infopreneurs, vendeurs de produits mono-produit ou produits phares, formateurs et marques directes.",
    businessValue: "Augmente le panier moyen de 30% à 70% dès le premier jour grâce aux offres complémentaires instantanées. C'est l'outil indispensable pour rentabiliser vos investissements publicitaires sur Internet.",
    workflow: [
      "1. Le marchand crée un nouveau tunnel et choisit une structure éprouvée (Vente directe, Lead magnet ou Webinaire).",
      "2. Il personnalise la page de vente, le formulaire de commande et les propositions d'upsell.",
      "3. Il connecte son lien de paiement souverain sécurisé.",
      "4. Il lance sa campagne publicitaire : chaque vente déclenche les propositions d'achat complémentaires."
    ],
    configuration: [
      "Définition du produit d'appel (Frontend) et des offres d'upsell / downsell correspondantes.",
      "Configuration de l'order bump (ex: 'Cochez cette case pour ajouter l'assurance livraison pour 2 000 XOF').",
      "Intégration des pixels de suivi pour mesurer précisément les conversions."
    ],
    marketingStrategy: [
      "Proposer une offre d'appel irrésistible à prix coûtant puis générer la marge nette sur l'upsell exclusif.",
      "Mettre en place un compte à rebours de 15 minutes sur la page de commande pour accélérer la prise de décision.",
      "Intégrer des témoignages vidéos authentiques juste au-dessus du formulaire d'encaissement."
    ],
    synergiesAndMonetization: [
      "Ultimate Funnel + Pixels de Tracking : Envoi de données précises aux algorithmes publicitaires pour réduire le coût d'acquisition.",
      "Ultimate Funnel + E-mailing Pro : Relance automatique des visiteurs ayant rempli leur nom sans finaliser le paiement.",
      "Modèle économique : Soumis au Plan Abonnement pour les produits physiques et éligible au Plan Commission pour les infoproduits."
    ],
    pricingPlan: 'HYBRIDE',
    connectedModules: ['mod-pixels-crm', 'app-emailing', 'srv-partner', 'docusign']
  },

  {
    id: 'cours-forge',
    name: 'Cours Forge (LMS, Création de Formations & Quiz)',
    taxonomy: 'APPLICATION',
    category: 'Éducation & Formation',
    badge: 'FABRIQUE PÉDAGOGIQUE COMPLÈTE',
    badgeColor: 'bg-emerald-700 text-white',
    shortDescription: "Atelier de conception et génération de cours multimédias, vidéos chapitrées, quiz interactifs et délivrance de certificats.",
    definition: "Cours Forge est un atelier pédagogique professionnel dédié aux formateurs, experts et institutions. Il permet de transformer son savoir en programmes d'apprentissage en ligne complets, interactifs et monétisables avec une fluidité remarquable.",
    function: "Permet de structurer des cours en modules et chapitres, d'intégrer des vidéos privées non téléchargeables illégalement, de joindre des supports PDF, de créer des quiz avec correction automatique et d'émettre des attestations officielles d'accomplissement.",
    domain: "Formateurs indépendants, centres de formation professionnelle, écoles privées, coachs de vie et entreprises formant leur personnel.",
    businessValue: "Permet de créer des actifs numériques à marge brute quasi-totale (90%+). Une fois la formation conçue, elle peut être vendue à des milliers d'apprenants sans aucun coût supplémentaire de duplication ou de logistique.",
    workflow: [
      "1. L'enseignant structure son plan de formation (Modules 1, 2, 3...) dans l'interface intuitive.",
      "2. Il téléverse ses leçons vidéo via l'Espace Upload Académique sécurisé.",
      "3. Il configure les quiz d'évaluation pour valider les acquis de fin de module.",
      "4. Il publie la formation sur sa vitrine ou dans son tunnel de vente et accueille ses premiers étudiants."
    ],
    configuration: [
      "Choix du mode de déblocage : Déblocage immédiat de tout le cours ou déblocage séquentiel jour par jour (Drip content).",
      "Seuil minimal de réussite aux quiz pour débloquer l'attestation finale (ex: 80% de bonnes réponses).",
      "Attribution des accès tuteurs pour le suivi personnalisé des questions des étudiants."
    ],
    marketingStrategy: [
      "Offrir le Module 1 gratuitement contre le dépôt de l'e-mail ou du numéro WhatsApp pour constituer une base de prospects qualifiés.",
      "Organiser des sessions de questions/réponses en direct pour motiver les élèves et leur proposer un accompagnement individuel supérieur.",
      "Valoriser les témoignages des diplômés sur la page de vente pour déclencher des inscriptions en chaîne."
    ],
    synergiesAndMonetization: [
      "Cours Forge + Espace Upload Académique : Hébergement de vidéos lourdes sur un stockage ultra-rapide sans surcoût serveur.",
      "Cours Forge + DocuSign Hub : Émission et contre-signature officielle des diplômes et attestations de formation certifiée.",
      "Cours Forge + Espace Partenaire : Recrutement de vos anciens élèves comme affiliés pour promouvoir votre formation en échange d'une commission.",
      "Modèle économique : Parfaitement adapté au Plan Commission (Zéro frais fixes, prélèvement équitable à chaque inscription d'élève)."
    ],
    pricingPlan: 'PLAN_COMMISSION',
    connectedModules: ['vendor-upload', 'docusign', 'srv-partner', 'srv-course-create', 'srv-academy-support']
  },

  {
    id: 'nanamarket',
    name: 'NaNa Market (Annuaire National B2B2C des Marchands Vérifiés)',
    taxonomy: 'APPLICATION',
    category: 'Marketplace & Visibilité',
    badge: 'CARREFOUR D\'AUDIENCE & CONFIANCE',
    badgeColor: 'bg-amber-700 text-white',
    shortDescription: "Place de marché centrale et annuaire des entreprises et commerçants vérifiés par le processus de conformité légale.",
    definition: "NaNa Market est la vitrine collective nationale qui recense l'ensemble des marchands, boutiques et prestataires ayant validé leur chaîne d'identification légale (KYC). C'est un moteur de découverte et de mise en relation directe entre acheteurs et vendeurs sérieux.",
    function: "Indexation géographique et catégorielle des boutiques vérifiées, moteur de recherche d'articles par mot-clé, affichage des badges de conformité officielle rassurant les clients, et redirection directe des prospects vers la vitrine ou le point de vente physique du commerçant.",
    domain: "Tous marchands, artisans, PME et distributeurs désireux de capter du trafic qualifié sans dépendre exclusivement des budgets publicitaires.",
    businessValue: "Résout le plus grand obstacle du commerce électronique local : la confiance. Être répertorié sur NaNa Market certifie aux consommateurs que l'entreprise existe légalement, réduisant drastiquement les craintes d'arnaque et augmentant les conversions.",
    workflow: [
      "1. Dès que le compte marchand obtient la validation de son dossier légal, sa boutique est éligible à l'indexation.",
      "2. Le commerçant choisit les produits phares qu'il souhaite mettre en avant sur la marketplace nationale.",
      "3. Les consommateurs recherchent un produit sur NaNa Market et découvrent la boutique la plus proche ou la mieux notée.",
      "4. En un clic, le client est redirigé vers la vitrine du marchand pour finaliser sa commande en toute sécurité."
    ],
    configuration: [
      "Sélection des mots-clés de recherche associés à l'activité.",
      "Renseignement de la localisation géographique précise du magasin physique pour la recherche de proximité.",
      "Option de mise en avant sponsorisée sur la page d'accueil de la place de marché."
    ],
    marketingStrategy: [
      "Profiter de la notoriété globale de la place de marché pour capter des clients qui ne connaissaient pas encore votre enseigne.",
      "Afficher fièrement le badge 'Marchand Vérifié' sur tous vos supports de communication physiques et numériques.",
      "Proposer des offres exclusives aux visiteurs venant de l'annuaire national."
    ],
    synergiesAndMonetization: [
      "NaNa Market + Vitrine en Ligne : NaNa Market agit comme la source de trafic et la vitrine comme le lieu d'encaissement.",
      "NaNa Market + Caisse POS : Les clients locaux découvrent l'adresse du magasin et s'y rendent physiquement pour acheter.",
      "Modèle économique : Inscription de base incluse dès validation légale, options de visibilité premium disponibles."
    ],
    pricingPlan: 'INCLUS_BASE',
    connectedModules: ['studio', 'pos', 'kyc']
  },

  {
    id: 'webinar',
    name: 'Studio de Génération de Live et Webinaire',
    taxonomy: 'APPLICATION',
    category: 'Direct Live & Vente Interactive',
    badge: 'CANAL DE VENTE VIDÉO ÉVÉNEMENTIELLE',
    badgeColor: 'bg-violet-600 text-white',
    shortDescription: "Studio de diffusion de conférences en direct, masterclass interactives et sessions de vente avec panier d'achat instantané.",
    definition: "Le Studio Live et Webinaire est un environnement de diffusion audiovisuelle professionnelle conçu pour convertir une audience captive en clients. Il permet d'organiser des présentations interactives sans obliger les spectateurs à installer d'application tierce compliquée.",
    function: "Diffusion vidéo en direct haute définition, salon de discussion modéré en temps réel, possibilité d'inviter des intervenants sur scène, et déclenchement d'encarts d'achat cliquables au moment précis où l'orateur présente son offre commerciale.",
    domain: "Conférenciers, coachs, directeurs des ventes B2B, marques lançant une nouvelle collection et formateurs.",
    businessValue: "Génère des pics de chiffre d'affaires massifs en quelques dizaines de minutes. L'effet de groupe, les questions en direct et l'urgence de l'événement créent une dynamique d'achat qu'aucune page statique ne peut égaler.",
    workflow: [
      "1. Le présentateur planifie son événement et génère une page d'inscription capturant les coordonnées des participants.",
      "2. Des rappels automatiques par e-mail et messagerie sont expédiés avant le démarrage du direct.",
      "3. L'orateur lance la diffusion depuis son navigateur avec partage d'écran et caméra HD.",
      "4. À la fin de la démonstration, il affiche le bouton d'achat direct à l'écran : les commandes tombent en temps réel."
    ],
    configuration: [
      "Paramétrage de la date, de l'heure et de la capacité de la salle virtuelle.",
      "Attribution des rôles de modération pour filtrer le chat et répondre aux interrogations techniques.",
      "Configuration de l'offre spéciale du direct et de sa durée de validité exclusive."
    ],
    marketingStrategy: [
      "Partager des conseils à forte valeur ajoutée pendant les 45 premières minutes avant de dévoiler l'offre commerciale.",
      "Offrir un bonus exclusif et gratuit à toutes les personnes qui restent connectées jusqu'à la fin de la présentation.",
      "Mettre à disposition le replay pendant seulement 48 heures pour forcer les retardataires à passer à l'action rapidement."
    ],
    synergiesAndMonetization: [
      "Webinaire + Thème LiveStream Pro : Expérience visuelle de calibre télévisuel.",
      "Webinaire + Cours Forge : Vente de sessions de formation avancées à des tarifs élevés (High-Ticket).",
      "Webinaire + Affiliation : Mobilisation de partenaires pour remplir la salle virtuelle en échange d'une commission sur les ventes générées.",
      "Modèle économique : Éligible au Plan Commission pour une flexibilité totale lors de vos lancements."
    ],
    pricingPlan: 'PLAN_COMMISSION',
    connectedModules: ['srv-theme-builder', 'cours-forge', 'srv-partner']
  },

  {
    id: 'docusign',
    name: 'DocuSign Hub & Contrats Signés',
    taxonomy: 'APPLICATION',
    category: 'Juridique & Sécurité B2B',
    badge: 'VALEUR JURIDIQUE & SIGNATURE ÉLECTRONIQUE',
    badgeColor: 'bg-slate-700 text-white',
    shortDescription: "Génération, signature électronique certifiée et archivage sécurisé de contrats commerciaux, devis et accords de partenariat.",
    definition: "Le DocuSign Hub est la solution de contractualisation et de signature électronique à valeur probante intégrée à l'écosystème. Elle permet de formaliser légalement n'importe quelle relation commerciale sans nécessiter d'impression papier ni de déplacement physique.",
    function: "Génère des documents contractuels à partir de modèles personnalisables, transmet les liens de signature sécurisés aux signataires par messagerie, enregistre les empreintes numériques d'horodatage garantissant l'intégrité du document, et archive les pièces scellées de manière inaltérable.",
    domain: "Fournisseurs, grossistes, agences de services, centres de formation émettant des contrats d'apprentissage et prestataires B2B.",
    businessValue: "Accélère les cycles de vente B2B de plusieurs jours à quelques minutes. Supprime le coût et les retards du papier physique tout en offrant une protection juridique irréprochable en cas de litige commercial.",
    workflow: [
      "1. Le gestionnaire choisit un modèle de contrat (Vente de marchandises, Prestation de services, Devis validé).",
      "2. Les informations personnalisées et montants convenus sont automatiquement injectés.",
      "3. Les deux parties reçoivent une notification de signature sur leur terminal sécurisé.",
      "4. La signature est apposée électroniquement avec horodatage certifié : le PDF scellé est transmis à chacun et archivé."
    ],
    configuration: [
      "Importation des mentions légales de l'entreprise (RCCM, Siège social, Représentant légal).",
      "Définition de l'ordre séquentiel des signataires (ex: le client signe d'abord, le directeur contresigne ensuite).",
      "Configuration des délais d'expiration des offres contractuelles (ex: validité 15 jours)."
    ],
    marketingStrategy: [
      "Intégrer la signature électronique obligatoire dès la validation d'un gros devis pour engager juridiquement le client sans lui laisser le temps d'hésiter.",
      "Mettre en avant la conformité légale et le professionnalisme des contrats pour rassurer les grands comptes d'entreprises.",
      "Délivrer des certificats de garantie officiels signés aux clients lors de l'achat d'équipements coûteux."
    ],
    synergiesAndMonetization: [
      "DocuSign Hub + Caisse POS & Grossistes : Signature immédiate des bons de commande lors de livraisons importantes.",
      "DocuSign Hub + Cours Forge : Signature des conventions de formation et attestations de fin d'études.",
      "Modèle économique : Inclus ou packagé selon le volume documentaire mensuel de l'entreprise."
    ],
    pricingPlan: 'HYBRIDE',
    connectedModules: ['pos', 'cours-forge', 'kyc']
  },

  {
    id: 'vendor-upload',
    name: 'Espace Upload Académique & Vendeur',
    taxonomy: 'APPLICATION',
    category: 'Stockage & Médias Lourds',
    badge: 'STOCKAGE HAUTE VITESSE & COMPRESSION',
    badgeColor: 'bg-cyan-700 text-white',
    shortDescription: "Plateforme d'hébergement, compression et diffusion ultra-rapide des cours vidéos, devoirs volumineux et fichiers numériques marchands.",
    definition: "L'Espace Upload Académique et Vendeur est le coffre-fort multimédia haute performance de l'écosystème. Il est spécialement calibré pour recevoir, compresser et distribuer des fichiers volumineux (vidéos de formation 4K, archives ZIP de ressources, manuels PDF riches) sans jamais saturer la bande passante du serveur principal.",
    function: "Téléversement par fragments résistant aux instabilités de connexion internet, compression vidéo intelligente préservant la netteté visuelle tout en divisant le poids par trois, chiffrement des accès empêchant le partage non autorisé, et diffusion instantanée sur les appareils des utilisateurs.",
    domain: "Professeurs, formateurs, concepteurs de logiciels, créateurs de podcasts et commerçants vendant des produits téléchargeables.",
    businessValue: "Garantit une vitesse de lecture vidéo fluide à vos étudiants même avec une connexion 3G/4G modeste, sans subir de coupure agaçante. Protège vos contenus numériques contre le piratage tout en maintenant des coûts d'infrastructure extrêmement bas.",
    workflow: [
      "1. Le vendeur glisse ses vidéos ou documents lourds dans l'espace d'upload sécurisé.",
      "2. Le système traite et compresse les médias automatiquement en arrière-plan.",
      "3. Un identifiant média sécurisé est généré et relié à la leçon ou au produit numérique correspondant.",
      "4. Les clients autorisés peuvent visionner le flux ou télécharger leur ressource à vitesse maximale."
    ],
    configuration: [
      "Définition des restrictions d'accès (Lecture seule en streaming ou autorisation de téléchargement du fichier source).",
      "Gestion des quotas d'espace alloués par formateur ou par compte marchand.",
      "Filtrage des formats autorisés (MP4, PDF, ZIP, MP3...)."
    ],
    marketingStrategy: [
      "Mettre en avant l'argument 'Vidéos fluides même sur smartphone et faible connexion' pour convaincre les apprenants régionaux.",
      "Proposer des packs de ressources téléchargeables bonus pour augmenter la valeur perçue de vos offres.",
      "Sécuriser l'accès pour éviter que vos cours ne se retrouvent en libre accès sur Internet."
    ],
    synergiesAndMonetization: [
      "Upload Académique + Cours Forge : Moteur technique indispensable de toute académie de formation moderne.",
      "Upload Académique + Thème Digital Pro : Livraison instantanée des e-books et logiciels dès confirmation du paiement.",
      "Modèle économique : Inclus dans le cadre des solutions de formations et produits numériques."
    ],
    pricingPlan: 'PLAN_COMMISSION',
    connectedModules: ['cours-forge', 'srv-academy-support', 'studio']
  },

  {
    id: 'cvpro',
    name: 'CVPro & Création Documentaire Commerciale',
    taxonomy: 'APPLICATION',
    category: 'Carrière & Documents',
    badge: 'VALORISATION COMMERCIALE & PRO',
    badgeColor: 'bg-teal-700 text-white',
    shortDescription: "Générateur de curriculum vitæ professionnels, portfolios d'entrepreneurs et fiches de présentation commerciale haute définition.",
    definition: "CVPro est une application de mise en valeur professionnelle permettant aux entrepreneurs, indépendants, vendeurs et diplômés de générer des dossiers de compétences, des CV modernes et des présentations commerciales à l'impact visuel garanti.",
    function: "Génère des mises en page aux standards internationaux de recrutement et de présentation d'affaires, exporte des PDF vectoriels haute définition directement imprimables, et produit des liens de présentation interactive consultables sur smartphone.",
    domain: "Étudiants des académies, indépendants, consultants, commerciaux en quête de partenariats et gestionnaires de carrière.",
    businessValue: "Permet aux apprenants qui terminent une formation certifiée de créer immédiatement un CV percutant pour valoriser leur nouveau diplôme sur le marché du travail, renforçant l'attractivité et l'utilité concrète de vos formations.",
    workflow: [
      "1. L'utilisateur renseigne son parcours, ses certifications acquises sur la plateforme et ses compétences clés.",
      "2. Il sélectionne un modèle graphique professionnel parmi une collection soignée.",
      "3. Le document est mis en page instantanément avec typographie équilibrée et hiérarchisation claire.",
      "4. Il télécharge son PDF certifié ou transmet son lien de profil vérifié aux recruteurs et clients."
    ],
    configuration: [
      "Sélection des modèles (Format Exécutif, Créatif, Technique, Moderne).",
      "Synchronisation automatique avec les diplômes et badges obtenus dans Cours Forge.",
      "Gestion des options de confidentialité du profil public."
    ],
    marketingStrategy: [
      "Offrir l'accès à CVPro comme bonus d'inscription gratuit à toute formation professionnelle certifiante.",
      "Utiliser les portfolios créés pour mettre en avant la réussite des diplômés de votre académie.",
      "Proposer un service d'audit et d'optimisation de CV aux étudiants en fin de cursus."
    ],
    synergiesAndMonetization: [
      "CVPro + Cours Forge & Académie : Continuité logique entre l'apprentissage d'un métier et l'insertion professionnelle.",
      "CVPro + DocuSign Hub : Certification officielle des compétences par signature du directeur pédagogique.",
      "Modèle économique : Outil gratuit pour l'étudiant ou monétisable en prestation de valorisation de carrière."
    ],
    pricingPlan: 'INCLUS_BASE',
    connectedModules: ['cours-forge', 'srv-academy-support', 'docusign']
  },

  /* --------------------------------------------------------------------------
     B. SERVICES
  -------------------------------------------------------------------------- */
  {
    id: 'srv-theme-builder',
    name: 'Studio de Choix et Construction de Thème',
    taxonomy: 'SERVICE',
    category: 'Boutique & Design',
    badge: 'MOTEUR GRAPHIQUE & PERSONNALISATION',
    badgeColor: 'bg-indigo-700 text-white',
    shortDescription: "Moteur de sélection, prévisualisation interactive et personnalisation graphique de la vitrine e-commerce du marchand.",
    definition: "Le Studio de Thèmes est le centre névralgique du design et de l'identité visuelle de votre boutique. Il permet d'activer en un instant l'un des 8 thèmes spécialisés conçus par des directeurs artistiques pour coller précisément à votre secteur d'activité.",
    function: "Bascule instantanément l'apparence de la vitrine sans perte de données, permet de personnaliser la palette de couleurs, les polices de caractères, l'ordre des sections sur la page d'accueil, les textes de réassurance et les bannières publicitaires.",
    domain: "Tous les marchands opérant une vitrine en ligne, qu'ils vendent des articles physiques, des cosmétiques de luxe ou des cours numériques.",
    businessValue: "Supprime le besoin d'engager un développeur web ou un designer graphique coûteux. En quelques clics, votre boutique adopte les codes visuels des leaders mondiaux de votre industrie.",
    workflow: [
      "1. Le marchand ouvre le Studio de Thèmes depuis son tableau de bord.",
      "2. Il parcourt la galerie des 8 thèmes officiels et teste le rendu en direct avec ses propres produits.",
      "3. Il ajuste les couleurs principales pour respecter la charte graphique de son enseigne.",
      "4. Il clique sur 'Activer' : la nouvelle apparence est immédiatement visible pour tous les visiteurs du site."
    ],
    configuration: [
      "Sélection du thème actif parmi les 8 collections disponibles.",
      "Téléversement du logo officiel en version jour et version sombre.",
      "Personnalisation des coordonnées du service client et des liens vers les réseaux sociaux."
    ],
    marketingStrategy: [
      "Changer de thème selon les temps forts de l'année (ex: Thème LiveStream Pro lors des périodes de soldes ou de fêtes).",
      "Adapter le thème à la maturité de son catalogue (démarrer avec Standard Élite puis passer à Mega-Store Pro à mesure que le catalogue grandit).",
      "Harmoniser les couleurs du thème avec celles des emballages physiques du magasin pour renforcer la mémoire de marque."
    ],
    synergiesAndMonetization: [
      "Studio de Thèmes + Vitrine en Ligne : Moteur visuel incontournable de votre présence e-commerce.",
      "Studio de Thèmes + Nanagénérateur AI : Les visuels générés par l'IA viennent habiller automatiquement les emplacements réservés du thème.",
      "Modèle économique : Inclus de base dans tout compte marchand configurant sa vitrine."
    ],
    pricingPlan: 'INCLUS_BASE',
    connectedModules: ['studio', 'nanagenerator', 'deal-builder']
  },

  {
    id: 'srv-partner',
    name: 'Espace Partenaire & Programme d\'Affiliation',
    taxonomy: 'SERVICE',
    category: 'Croissance & Viralité',
    badge: 'ARME MARKETING D\'EXPANSION RAPIDE',
    badgeColor: 'bg-emerald-800 text-white',
    shortDescription: "Système complet de gestion d'affiliés, génération de liens de parrainage et calcul automatique des commissions sur ventes.",
    definition: "L'Espace Partenaire est une plateforme de recrutement et de rémunération de prescripteurs commerciaux. Il permet à tout commerçant ou formateur de transformer ses clients satisfaits et des créateurs d'audience en une armée d'ambassadeurs motivés par le gain financier.",
    function: "Génère des liens de tracking personnalisés pour chaque affilié, enregistre les clics et ventes générées grâce à un système de cookie de suivi robuste, calcule automatiquement les montants des commissions dues et offre un tableau de bord transparent à chaque partenaire.",
    domain: "Formateurs, marques e-commerce, éditeurs de logiciels et entreprises souhaitant accélérer leurs ventes sans dépenser de budget publicitaire préalable.",
    businessValue: "C'est le mécanisme marketing le plus rentable au monde : vous ne versez une commission que lorsqu'une vente réelle a été encaissée et livrée. Si vos affiliés ne vendent rien, cela ne vous coûte strictement rien.",
    workflow: [
      "1. Le marchand définit les règles de son programme (ex: 20% de commission sur les formations, 5% sur les articles physiques).",
      "2. Les partenaires s'inscrivent et récupèrent leur lien de recommandation unique.",
      "3. Les affiliés partagent leur lien dans leurs communautés, réseaux sociaux ou par messagerie.",
      "4. Chaque achat réalisé via ce lien crédite automatiquement le solde du partenaire concerné."
    ],
    configuration: [
      "Définition du taux de commission (Pourcentage ou montant fixe en XOF par article vendu).",
      "Durée de validité du cookie de suivi (30 jours, 60 jours ou 90 jours).",
      "Délai de validation des commissions (pour tenir compte d'éventuels retours de marchandises)."
    ],
    marketingStrategy: [
      "Former ses meilleurs affiliés en leur fournissant un kit média prêt à l'emploi (visuels, textes de messages, arguments clés).",
      "Lancer un concours mensuel récompensant les 3 meilleurs affiliés par des primes exceptionnelles pour stimuler la compétition.",
      "Inviter systématiquement chaque client ayant vécu une expérience positive à devenir ambassadeur rémunéré de la boutique."
    ],
    synergiesAndMonetization: [
      "Affiliation + Cours Forge : Le modèle roi de la vente de formations en ligne.",
      "Affiliation + Ultimate Funnel Builder : Les affiliés envoient leur trafic directement sur un tunnel à forte conversion, maximisant leurs gains et les vôtres.",
      "Modèle économique : Inclus dans les services de croissance de l'écosystème marchand."
    ],
    pricingPlan: 'INCLUS_BASE',
    connectedModules: ['cours-forge', 'ultimate-funnel', 'studio']
  },

  {
    id: 'srv-course-create',
    name: 'Centre de Création de Cours, et De Formation (Pôle Formateur)',
    taxonomy: 'SERVICE',
    category: 'Formation & Pédagogie',
    badge: 'GESTION DES COHORTES & CORRECTIONS',
    badgeColor: 'bg-teal-800 text-white',
    shortDescription: "Interface réservée aux instructeurs pour le suivi pédagogique, la correction des devoirs et la gestion des cohortes d'élèves.",
    definition: "Le Centre de Création et de Formation est le cockpit opérationnel de l'enseignant ou du responsable pédagogique. Il fournit les outils nécessaires pour encadrer humainement les apprenants et transformer un simple catalogue vidéo en véritable école structurée.",
    function: "Suivi individuel de l'avancement des étudiants dans chaque matière, réception et notation des devoirs téléversés, publication d'annonces collectives à destination d'une cohorte, et organisation de sessions de mentorat ciblées.",
    domain: "Professeurs, maîtres artisans transmettant leur savoir-faire, formateurs professionnels et instituts de formation continue.",
    businessValue: "Augmente drastiquement le taux de complétion des formations (qui passe de 10% sur les plateformes impersonnelles à plus de 70% grâce à un encadrement réactif), déclenchant une satisfaction élève record et un bouche-à-oreille très rémunérateur.",
    workflow: [
      "1. Le formateur consulte les devoirs soumis par les apprenants dans son tableau de bord dédié.",
      "2. Il annote les travaux, attribue une note et enregistre un commentaire d'encouragement constructif.",
      "3. L'élève est notifié instantanément de son évaluation et débloque le module suivant.",
      "4. Les statistiques globales permettent d'identifier les notions où les élèves rencontrent des difficultés pour y apporter des éclaircissements."
    ],
    configuration: [
      "Définition du barème de notation et des critères d'exigence pédagogique.",
      "Création des cohortes saisonnières (ex: Promotion Janvier 2026).",
      "Attribution des alertes de rappel pour les devoirs en attente de correction depuis plus de 48 heures."
    ],
    marketingStrategy: [
      "Vendre la formation à un tarif double en mettant en avant 'Correction personnalisée de vos travaux par un formateur certifié'.",
      "Partager publiquement les meilleures copies ou réalisations d'élèves (avec leur accord) comme preuve sociale incontestable.",
      "Proposer des sessions d'accompagnement individuel payantes en option pour les élèves désirant aller plus vite."
    ],
    synergiesAndMonetization: [
      "Pôle Formateur + Cours Forge : Complémentarité indissociable entre conception des cours et suivi des élèves.",
      "Pôle Formateur + DocuSign Hub : Signature des fiches d'évaluation et attestations de compétences.",
      "Modèle économique : Rattaché au modèle de distribution de formations numériques sous Plan Commission."
    ],
    pricingPlan: 'PLAN_COMMISSION',
    connectedModules: ['cours-forge', 'vendor-upload', 'docusign']
  },

  {
    id: 'srv-academy-support',
    name: 'Centre de Formation et d\'Accompagnement (Campus Apprenant)',
    taxonomy: 'SERVICE',
    category: 'Éducation & Espace Étudiant',
    badge: 'ESPACE ÉTUDIANT GAMIFIÉ & ERGONOMIQUE',
    badgeColor: 'bg-blue-800 text-white',
    shortDescription: "Environnement d'apprentissage dédié aux étudiants pour visionner leurs leçons, passer leurs quiz et interagir avec leur formateur.",
    definition: "Le Campus Apprenant est l'interface claire et motivante mise à disposition de chaque client ayant acheté un programme de formation. Conçu pour éliminer toute distraction, il permet d'étudier sereinement depuis n'importe quel écran.",
    function: "Affichage des cours acquis dans une bibliothèque personnelle sécurisée, lecteur vidéo ergonomique mémorisant la position exacte de lecture, barre de progression interactive, soumission des devoirs en 1 clic et téléchargement des supports pédagogiques.",
    domain: "Étudiants, professionnels en reconversion, salariés en formation continue et particuliers développant de nouvelles compétences.",
    businessValue: "Offre à vos clients une expérience d'apprentissage d'une qualité digne des meilleures universités internationales, garantissant des avis élogieux qui pérennisent la rentabilité de votre offre d'enseignement.",
    workflow: [
      "1. Dès confirmation de son paiement, l'étudiant reçoit ses accès et se connecte à son campus personnel.",
      "2. Il retrouve l'ensemble de ses formations ordonnées avec indication de son pourcentage d'avancement.",
      "3. Il visionne les leçons, télécharge les fiches récapitulatives et valide les quiz de fin d'étape.",
      "4. À l'issue du cursus, son certificat officiel d'accomplissement lui est délivré automatiquement."
    ],
    configuration: [
      "Personnalisation de la bannière d'accueil du campus aux couleurs de l'école.",
      "Activation du mode sombre pour un confort de lecture prolongé le soir.",
      "Gestion des forums d'échange internes entre élèves de la même promotion."
    ],
    marketingStrategy: [
      "Afficher une barre de progression motivante qui incite l'élève à terminer chaque chapitre sans abandonner en chemin.",
      "Suggérer des cours complémentaires pertinents directement sur le tableau de bord de l'élève une fois son diplôme obtenu.",
      "Encourager l'étudiant à partager son certificat officiel sur LinkedIn ou dans ses statuts WhatsApp avec un lien d'inscription pour ses proches."
    ],
    synergiesAndMonetization: [
      "Campus Étudiant + Cours Forge : Espace où s'exécute le contenu créé par l'enseignant.",
      "Campus Étudiant + CVPro : Valorisation immédiate du parcours pour la recherche d'emploi ou de missions.",
      "Modèle économique : Accès gratuit et illimité pour l'étudiant ayant validé son inscription."
    ],
    pricingPlan: 'PLAN_COMMISSION',
    connectedModules: ['cours-forge', 'vendor-upload', 'cvpro']
  },

  {
    id: 'srv-kyc',
    name: 'Chaîne d\'Identification KYC & Sécurité Souveraine',
    taxonomy: 'SERVICE',
    category: 'Conformité & Légalité',
    badge: 'GARANTIE LÉGALE & PLAFONDS ÉTENDUS',
    badgeColor: 'bg-slate-800 text-white',
    shortDescription: "Dispositif d'authentification des pièces officielles et de validation juridique pour débloquer les plafonds de transactions.",
    definition: "La Chaîne d'Identification KYC (Know Your Customer) est l'infrastructure de régulation et de conformité légale veillant à la sécurité de l'ensemble de l'écosystème. Elle assure que chaque entité opérant des transactions financières est formellement identifiée et juridiquement vérifiée.",
    function: "Réceptionne et chiffre les pièces d'identité officielles et registres de commerce, exécute les vérifications de concordance d'identité avec selfie de présence, transmet les dossiers au pôle de conformité et applique les plafonds mensuels stricts (1M XOF pour les Particuliers / 5M XOF pour les Entreprises enregistrées).",
    domain: "Tous les marchands, formateurs et entrepreneurs ouvrant un univers commercial sur la plateforme.",
    businessValue: "Protège votre entreprise contre la fraude, les fermetures de compte inopinées et les sanctions réglementaires. Être en règle dès le départ vous assure une pérennité commerciale absolue et inspire une confiance totale à vos partenaires bancaires et clients.",
    workflow: [
      "1. Le marchand soumet ses documents légaux depuis son espace d'onboarding sécurisé.",
      "2. Les informations sont analysées en temps réel par les spécialistes de conformité.",
      "3. En cas de dossier incomplet, le support réactif guide précisément le marchand sur la pièce à réajuster.",
      "4. Dès l'approbation, le badge officiel est attribué et l'ensemble des modules du plan souscrit sont immédiatement opérationnels."
    ],
    configuration: [
      "Sélection du profil légal adapté (Entrepreneur individuel vs Société immatriculée).",
      "Téléversement sécurisé de la pièce d'identité ou du RCCM et IFU.",
      "Suivi de la jauge de volume mensuel consommé par rapport au plafond légal accordé."
    ],
    marketingStrategy: [
      "Utiliser son statut de compte approuvé comme argument de vente majeur face aux concurrents non vérifiés opérant dans l'ombre.",
      "Rassurer les clients institutionnels ou entreprises exigeant des factures et des structures juridiquement identifiables.",
      "Préparer son passage du plafond Particulier (1M XOF) au plafond Entreprise (5M XOF) pour accompagner l'explosion de son chiffre d'affaires."
    ],
    synergiesAndMonetization: [
      "Chaîne KYC + Tous les modules : C'est le passeport de conformité qui conditionne l'activation des fonctionnalités complètes de l'écosystème.",
      "Chaîne KYC + NaNa Market : Seuls les comptes en règle bénéficient de la mise en avant sur l'annuaire national officiel.",
      "Modèle économique : Service fondamental inclus gratuitement dans tout univers commercial créé."
    ],
    pricingPlan: 'INCLUS_BASE',
    connectedModules: ['pos', 'studio', 'nanamarket', 'docusign']
  },

  /* --------------------------------------------------------------------------
     C. MODULES DE GESTION
  -------------------------------------------------------------------------- */
  {
    id: 'mod-inventory',
    name: 'Stock & Inventaire Intelligent Multi-Dépôts',
    taxonomy: 'MODULE',
    category: 'Gestion & Logistique',
    badge: 'SYNCHRONISATION ABSOLUE EN TEMPS RÉEL',
    badgeColor: 'bg-emerald-900 text-white',
    shortDescription: "Gestion centralisée des quantités en stock, alertes de réassort automatique, calcul du coût de revient et traçabilité par code-barres.",
    definition: "Le module Stock & Inventaire Intelligent est le garant de la rigueur logistique de votre commerce. Il orchestre les flux d'entrées et de sorties d'articles entre votre entrepôt, vos rayons de magasin physique et vos commandes e-commerce sur Internet.",
    function: "Décrémente automatiquement le stock lors de chaque vente (au comptoir ou sur le web), gère les réceptions de marchandises avec calcul du Coût Moyen Unitaire Pondéré (CMUP), alerte par notification avant la rupture de stock et permet de réaliser des inventaires tournants sans bloquer l'activité.",
    domain: "Commerces de détail, superettes, grossistes, distributeurs de matériel et e-commerçants stockant des produits physiques.",
    businessValue: "Évite le cauchemar de vendre un article en ligne alors qu'il vient d'être acheté en magasin par un client au comptoir. Réduit le capital immobilisé inutilement en prédisant avec précision les réapprovisionnements nécessaires.",
    workflow: [
      "1. Les fiches articles sont créées avec leur code-barres, quantité initiale et seuil d'alerte de sécurité.",
      "2. Chaque encaissement à la caisse ou sur la boutique en ligne déduit immédiatement le stock concerné.",
      "3. Dès qu'un article passe sous le seuil critique (ex: moins de 5 unités), une alerte de commande fournisseur s'affiche.",
      "4. La réception de la nouvelle livraison se fait par simple scan des codes-barres pour réajuster le stock en 30 secondes."
    ],
    configuration: [
      "Définition du seuil d'alerte de stock minimum par référence produit.",
      "Renseignement du coût d'achat fournisseur pour mesurer avec exactitude la valeur totale du stock immobilisé.",
      "Autorisation ou interdiction de la vente en stock négatif (précommandes)."
    ],
    marketingStrategy: [
      "Afficher une jauge 'Plus que 3 exemplaires en stock' sur la vitrine web pour inciter les clients indécis à commander sur-le-champ.",
      "Organiser une vente flash de déstockage sur les articles à rotation lente identifiés par le module d'inventaire.",
      "Informer par message automatique les clients fidèles dès le réapprovisionnement d'un article très demandé en rupture."
    ],
    synergiesAndMonetization: [
      "Stock Intelligent + Caisse POS : Liaison vitale pour un commerce physique omnicanal sans faille.",
      "Stock Intelligent + Import/Export Excel : Réajustement des milliers de références en 1 clic lors de l'inventaire annuel.",
      "Modèle économique : Rattaché au Plan Abonnement des activités opérant des catalogues physiques."
    ],
    pricingPlan: 'PLAN_ABONNEMENT',
    connectedModules: ['pos', 'studio', 'tool-scanner', 'tool-excel']
  },

  {
    id: 'mod-debts',
    name: 'Gestion des Dettes (Ardoises Clients & Relances Diplomatiques)',
    taxonomy: 'MODULE',
    category: 'Trésorerie & Crédit',
    badge: 'MAÎTRISE DU BESOIN EN FONDS DE ROULEMENT',
    badgeColor: 'bg-amber-800 text-white',
    shortDescription: "Carnet de crédit client numérique, suivi des échéances de règlement et relances de paiement programmées par messagerie instantanée.",
    definition: "Le module de Gestion des Dettes remplace le vieux cahier d'ardoises manuel qui se perd ou se détériore. Il permet aux commerçants de proximité de pratiquer la vente à crédit avec leurs clients fidèles de manière rigoureuse, transparente et sécurisée.",
    function: "Associe un compte de créance nominatif à chaque client de confiance, enregistre les achats à crédit avec date limite de règlement convenue, comptabilise les versements partiels et génère des messages de relance courtois et professionnels prêts à être envoyés sur WhatsApp ou SMS en un seul clic.",
    domain: "Boutiques de quartier, quincailleries, grossistes accordant des facilités de paiement, garages et distributeurs de produits courants.",
    businessValue: "Récupère des sommes considérables qui s'évaporaient auparavant dans les oublis ou les contestations de montants. Préserve d'excellentes relations humaines avec la clientèle grâce à des relevés de compte clairs et sans ambiguïté.",
    workflow: [
      "1. Lors du paiement à la caisse, le vendeur sélectionne le mode 'Paiement à Crédit' et choisit le client dans son carnet.",
      "2. Le ticket de crédit est généré et détaille les articles emportés et le nouveau solde total dû.",
      "3. À l'approche de la date d'échéance convenue, le système prévient le commerçant.",
      "4. En un clic, un message de rappel diplomatique avec le récapitulatif précis est expédié au client.",
      "5. Dès que le client apporte son versement, le solde de la créance est décrémenté instantanément."
    ],
    configuration: [
      "Plafond maximal de crédit autorisé par client (ex: interdire tout nouveau crédit si la dette dépasse 100 000 XOF).",
      "Définition du délai de règlement par défaut (ex: 15 jours ou fin de mois).",
      "Personnalisation du modèle de texte de relance respectueux de la dignité du client."
    ],
    marketingStrategy: [
      "Offrir la facilité de paiement à crédit uniquement aux clients fidèles disposant d'un compte vérifié pour stimuler leur loyauté.",
      "Proposer une petite remise de 3% sur le prochain achat si le client règle sa dette avant la date limite d'échéance.",
      "Éviter les conflits en fournissant systématiquement un historique complet des dates et montants d'achats."
    ],
    synergiesAndMonetization: [
      "Gestion des Dettes + Caisse POS : Solution intégrée pour formaliser les facilités de caisse traditionnelles.",
      "Gestion des Dettes + Analytique : Mesure du montant total des créances en circulation pour anticiper sa trésorerie.",
      "Modèle économique : Inclus dans le Plan Abonnement pour les points de vente physiques."
    ],
    pricingPlan: 'PLAN_ABONNEMENT',
    connectedModules: ['pos', 'analytics', 'mod-team-employees']
  },

  {
    id: 'mod-analytics',
    name: 'Analytique & Courbe des Gains (Marge Nette & Tops Produits)',
    taxonomy: 'MODULE',
    category: 'Statistiques & Décision',
    badge: 'PILOTAGE PAR LA RENTABILITÉ RÉELLE',
    badgeColor: 'bg-blue-900 text-white',
    shortDescription: "Graphiques d'évolution du chiffre d'affaires, analyse des marges brutes et nettes, panier moyen et identification des produits stars.",
    definition: "Le module Analytique et Courbe des Gains est la tour de contrôle chiffrée de votre entreprise. Il traduit l'ensemble des flux d'encaissements en indicateurs de gestion limpides pour savoir exactement ce que votre entreprise gagne chaque jour.",
    function: "Génère des courbes de ventes journalières, hebdomadaires et mensuelles, isole le chiffre d'affaires de la marge bénéficiaire réelle après déduction des coûts d'achat, classe vos produits par ordre de rentabilité (matrice ABC) et mesure l'évolution du panier moyen.",
    domain: "Tous chefs d'entreprise, commerçants, gérants de franchise et entrepreneurs désireux de piloter leur affaire avec rigueur.",
    businessValue: "Fait la différence fondamentale entre brasser de l'argent et faire du vrai bénéfice. Permet d'éliminer immédiatement les produits qui font du chiffre mais coûtent cher en manutention, au profit des articles hautement rentables.",
    workflow: [
      "1. Le gérant consulte son écran Analytique chaque matin pour faire le point sur les performances de la veille.",
      "2. Il filtre par point de vente ou par canal (Ventes magasin vs Ventes boutique en ligne).",
      "3. Il identifie les heures de forte affluence pour optimiser la présence de ses caissiers.",
      "4. Il exporte les rapports comptables périodiques pour sa déclaration fiscale ou ses partenaires."
    ],
    configuration: [
      "Sélection des périodes d'analyse comparatives (Mois en cours par rapport au mois précédent ou à l'année n-1).",
      "Choix des indicateurs prioritaires à afficher en haut de page (Chiffre d'affaires brut, Marge nette, Nombre de transactions).",
      "Filtrage par caissier ou par point de vente pour les enseignes multi-sites."
    ],
    marketingStrategy: [
      "Mettre en avant dans vos publicités les produits identifiés comme ayant la meilleure marge nette.",
      "Organiser des animations commerciales sur les créneaux horaires détectés comme les plus calmes de la semaine.",
      "Récompenser les vendeurs réalisant les paniers moyens les plus élevés grâce aux données objectives du tableau de bord."
    ],
    synergiesAndMonetization: [
      "Analytique + Directeur de Croissance IA : L'intelligence artificielle interprète vos graphiques et vous souffle les décisions payantes.",
      "Analytique + Pixels de Tracking : Comparaison entre les montants investis en publicité et les gains nets réels encaissés.",
      "Modèle économique : Données de base incluses pour tous, analyses de rentabilité avancées intégrées aux forfaits Pro."
    ],
    pricingPlan: 'INCLUS_BASE',
    connectedModules: ['ai-advisor', 'pos', 'studio', 'mod-pixels-crm']
  },

  {
    id: 'mod-team-employees',
    name: 'Gestion des Employés / Caissiers (PIN & Sessions de Travail)',
    taxonomy: 'MODULE',
    category: 'Sécurité & Ressources Humaines',
    badge: 'TRAÇABILITÉ ANTI-VOL & SESSIONS',
    badgeColor: 'bg-purple-900 text-white',
    shortDescription: "Attribution des droits d'accès par code PIN, ouverture et clôture de shifts de travail individuels et traçabilité intégrale des ventes.",
    definition: "Le module de Gestion des Employés est le bouclier de sécurité interne de votre point de vente. Il permet de gérer sereinement une équipe de plusieurs vendeurs et caissiers en délimitant précisément ce que chaque employé a le droit de voir ou de faire.",
    function: "Connexion sécurisée en 1 seconde par code PIN à 4 ou 6 chiffres, attribution de rôles personnalisés (interdire à un vendeur d'annuler une vente ou d'appliquer une remise sans l'accord du responsable), suivi des heures d'ouverture de caisse et réconciliation des montants exacts encaissés par chaque shift.",
    domain: "Superettes, magasins de détail employant des salariés, restaurants avec plusieurs serveurs et réseaux de boutiques franchisées.",
    businessValue: "Élimine 99% des vols internes et des erreurs de caisse inexplicables. Chaque franc encaissé ou sorti du tiroir-caisse est associé au nom et au code du caissier en poste, instaurant une atmosphère de transparence et de responsabilité au sein de l'équipe.",
    workflow: [
      "1. Le propriétaire crée les fiches de ses employés et leur assigne un code PIN personnel confidentiel.",
      "2. Au début de sa journée, le caissier tape son code PIN et compte le fonds de caisse initial.",
      "3. Toutes les ventes qu'il valide au cours de sa vacation sont tracées sous son identifiant.",
      "4. À la fin de son service, il clôture sa session : le système confronte le montant théorique attendu et le montant réel compté."
    ],
    configuration: [
      "Définition des permissions par rôle (Autoriser l'impression des duplicatas de tickets, bloquer la modification des prix).",
      "Paramétrage des tolérances d'écart de caisse avant déclenchement d'une alerte managériale.",
      "Activation du verrouillage automatique de l'écran après 2 minutes d'inactivité au comptoir."
    ],
    marketingStrategy: [
      "Mettre en place un challenge commercial interne récompensant chaque mois le vendeur ayant réalisé le plus grand nombre d'encaissements sans erreur.",
      "Valoriser auprès de vos équipes la clarté du système : un caissier honnête n'a plus jamais à craindre d'être accusé à tort d'un trou de caisse causé par un collègue.",
      "Utiliser les données de présence pour dimensionner le personnel aux heures de pointe et réduire les temps d'attente clients."
    ],
    synergiesAndMonetization: [
      "Gestion des Employés + Caisse POS : Binôme indispensable pour tout commerce physique dès lors qu'il y a plus d'un employé.",
      "Gestion des Employés + Analytique : Suivi du chiffre d'affaires généré par chaque membre de l'équipe commerciale.",
      "Modèle économique : Inclus dans le Plan Abonnement de la Caisse POS."
    ],
    pricingPlan: 'PLAN_ABONNEMENT',
    connectedModules: ['pos', 'mod-debts', 'analytics']
  },

  {
    id: 'mod-pixels-crm',
    name: 'Pixels de Tracking / CRM Avancé (Meta, Google & TikTok Ads)',
    taxonomy: 'MODULE',
    category: 'Marketing & Acquisition',
    badge: 'OPTIMISATION ALGORITHMIQUE PUBLICITAIRE',
    badgeColor: 'bg-rose-800 text-white',
    shortDescription: "Connexion en un clic des pixels de conversion publicitaire (Facebook Meta, TikTok Ads, Google) et synchronisation des événements d'achat.",
    definition: "Le module Pixels de Tracking et CRM Avancé est le pont technique reliant votre vitrine ou vos tunnels de vente aux algorithmes publicitaires des grandes plateformes mondiales. Il transmet de manière anonymisée et sécurisée les actions réalisées par vos visiteurs.",
    function: "Capture et transmet en temps réel les événements cruciaux (Vue de fiche produit, Ajout au panier, Début de commande, Achat confirmé avec montant exact), élimine les pertes de données causées par les bloqueurs publicitaires et permet de recibler (Retargeting) les visiteurs n'ayant pas finalisé leur commande.",
    domain: "E-commerçants investissant en publicité sur Facebook, Instagram ou TikTok, agences médias et créateurs de tunnels.",
    businessValue: "Permet aux algorithmes publicitaires de comprendre exactement quel type de profil achète chez vous, ce qui réduit drastiquement votre coût par acquisition (CPA) et vous permet d'obtenir deux à trois fois plus de commandes pour le même budget publicitaire dépensé.",
    workflow: [
      "1. Le marchand colle son identifiant de Pixel (ex: Pixel ID Meta ou TikTok) dans l'interface simplifiée.",
      "2. Les scripts de tracking sécurisés sont automatiquement déployés sur toutes ses pages sans toucher au code.",
      "3. Dès qu'un prospect consulte une offre ou achète, l'événement est notifié instantanément à la régie publicitaire.",
      "4. Le marchand configure des campagnes de reciblage pour réafficher le produit aux personnes qui ont hésité."
    ],
    configuration: [
      "Renseignement de l'ID Pixel Facebook / Meta Ads.",
      "Renseignement de l'ID Pixel TikTok Ads.",
      "Configuration de la balise Google Tag / Google Analytics pour l'analyse du trafic.",
      "Respect des normes de consentement et de protection de la vie privée des utilisateurs."
    ],
    marketingStrategy: [
      "Créer une campagne de reciblage Facebook ultra-ciblée offrant la livraison gratuite aux visiteurs ayant ajouté un article au panier sans acheter dans les 48 heures.",
      "Construire une audience similaire (Lookalike) basée sur les 500 meilleurs clients ayant réalisé les paniers les plus élevés pour trouver de nouveaux acheteurs qualifiés.",
      "Calculer son Retour sur Dépense Publicitaire (ROAS) quotidien en comparant la dépense publicitaire et le chiffre d'affaires net encaissé."
    ],
    synergiesAndMonetization: [
      "Pixels de Tracking + Ultimate Funnel Builder : L'association incontournable du marketing digital moderne haute rentabilité.",
      "Pixels de Tracking + Vitrine en Ligne : Détection des produits attirant le plus de clics pour ajuster son stock en conséquence.",
      "Modèle économique : Inclus pour tout marchand exploitant les outils de vente de l'écosystème."
    ],
    pricingPlan: 'INCLUS_BASE',
    connectedModules: ['ultimate-funnel', 'studio', 'analytics']
  },

  /* --------------------------------------------------------------------------
     D. OUTILS OPÉRATIONNELS
  -------------------------------------------------------------------------- */
  {
    id: 'tool-scanner',
    name: 'Scanner Code-Barres & Douchette Laser (USB & Caméra Mobile)',
    taxonomy: 'OUTIL',
    category: 'Matériel POS & Vitesse',
    badge: 'VITESSE D\'ENCAISSEMENT ABSOLUE',
    badgeColor: 'bg-amber-900 text-white',
    shortDescription: "Reconnaissance ultra-rapide des codes-barres par douchette laser USB physique ou directement via l'objectif de la caméra du smartphone.",
    definition: "L'outil Scanner Code-Barres est le module de détection matérielle qui accélère l'identification des articles au point de vente. Il prend en charge à la fois les douchettes laser professionnelles filaires ou Bluetooth et la caméra intégrée de n'importe quel smartphone moderne.",
    function: "Lit instantanément les formats de codes-barres standards (EAN-13, EAN-8, UPC, Code 128, Codes QR), recherche l'article correspondant dans la base de données en moins de 100 millisecondes, et l'ajoute automatiquement au panier d'encaissement de la caisse ou au bordereau d'inventaire.",
    domain: "Superettes, magasins de prêt-à-porter, quincailleries, grossistes et préparateurs de commandes.",
    businessValue: "Fait passer le temps d'encaissement d'un article de 5 secondes à une fraction de seconde. Supprime définitivement les erreurs de saisie de prix ou de référence au comptoir et fluidifie le passage en caisse lors des heures d'affluence.",
    workflow: [
      "1. Le caissier branche sa douchette USB (reconnue immédiatement sans pilote) ou active la caméra de son téléphone.",
      "2. Il pointe le faisceau ou l'objectif vers le code-barres de l'article.",
      "3. Un bip sonore confirme la lecture : le produit, son prix et sa photo s'affichent sur l'écran de caisse.",
      "4. Si l'article est scanné deux fois, la quantité s'incrémente automatiquement."
    ],
    configuration: [
      "Choix du mode de capture par défaut : Douchette physique ou Caméra arrière de l'appareil.",
      "Activation du signal sonore de confirmation de scan et vibration haptique.",
      "Option de scan continu pour l'inventaire rapide en rayon."
    ],
    marketingStrategy: [
      "Équiper chaque vendeur d'un smartphone pour encaisser les clients directement dans les rayons lors des pics d'affluence (Queue Busting).",
      "Imprimer des codes-barres sur vos propres créations artisanales pour leur donner une apparence d'article de marque internationale.",
      "Utiliser le scan pour vérifier en 1 seconde la validité d'un coupon de réduction présenté par un client sur son écran."
    ],
    synergiesAndMonetization: [
      "Scanner + Caisse POS : Le duo d'efficacité fondamental de tout comptoir de vente sérieux.",
      "Scanner + Stock Intelligent : Rapprochement instantané entre le produit scanné et les fiches de stock.",
      "Modèle économique : Outil inclus dans le Plan Abonnement pour les points de vente physiques."
    ],
    pricingPlan: 'PLAN_ABONNEMENT',
    connectedModules: ['pos', 'mod-inventory', 'deal-builder']
  },

  {
    id: 'tool-excel',
    name: 'Import & Export de Fichiers Excel / CSV',
    taxonomy: 'OUTIL',
    category: 'Données & Migration Rapide',
    badge: 'TRAITEMENT EN MASSE SANS FRICTION',
    badgeColor: 'bg-emerald-950 text-white',
    shortDescription: "Téléchargement de modèles, importation en masse de milliers de produits et extraction périodique de rapports comptables au format tableur.",
    definition: "L'outil Import & Export Excel/CSV est la passerelle de manipulation de données en masse de votre univers. Il permet d'alimenter ou d'extraire l'ensemble de votre catalogue, de vos clients et de vos historiques financiers sans devoir les saisir manuellement un par un.",
    function: "Génère des modèles de tableurs prêts à l'emploi avec validation des colonnes, importe des fichiers contenant des milliers de références produits en quelques secondes, met à jour les tarifs en masse et extrait des fichiers CSV structurés pour les logiciels comptables officiels.",
    domain: "Commerçants migrant depuis un ancien logiciel, grossistes avec de grands catalogues, comptables et gestionnaires de données.",
    businessValue: "Économise des semaines entières de saisie fastidieuse. Permet d'importer le catalogue complet d'un fournisseur de 5 000 articles en un clic et d'exporter en fin d'année les données fiscales exigées par votre expert-comptable.",
    workflow: [
      "1. Le commerçant télécharge le modèle Excel pré-formaté depuis son tableau de bord.",
      "2. Il y colle les désignations, prix de vente, coûts d'achat et codes-barres de ses produits.",
      "3. Il glisse le fichier complété dans la zone d'importation : le système analyse et valide la conformité des données.",
      "4. En validant, tous les articles apparaissent immédiatement dans la caisse et sur la boutique en ligne."
    ],
    configuration: [
      "Sélection du séparateur de colonnes (Virgule, Point-virgule ou Tabulation).",
      "Comportement en cas de référence existante (Mettre à jour les prix ou ignorer la ligne).",
      "Choix du format d'encodage pour préserver les caractères accentués et monétaires."
    ],
    marketingStrategy: [
      "Mettre à jour l'ensemble des prix de son catalogue en 2 minutes à l'occasion d'une opération de soldes saisonnières.",
      "Extraire la liste des clients ayant dépensé le plus pour leur envoyer une offre promotionnelle personnalisée.",
      "Transmettre à son fournisseur la liste exacte des articles sous le seuil d'alerte pour passer commande sans omission."
    ],
    synergiesAndMonetization: [
      "Import/Export Excel + Thème Mega-Store Pro : Remplissage rapide des rayons des catalogues haute densité.",
      "Import/Export Excel + Stock & Inventaire : Synchronisation rapide de l'inventaire physique annuel.",
      "Modèle économique : Outil universel mis à disposition de tous les marchands de l'écosystème."
    ],
    pricingPlan: 'INCLUS_BASE',
    connectedModules: ['mod-inventory', 'pos', 'studio']
  },

  {
    id: 'tool-gateway',
    name: 'Passerelle Souveraine / Connecteur API Nanasore',
    taxonomy: 'OUTIL',
    category: 'Intégration API & Automatisation',
    badge: 'INTERCONNEXION TECHNIQUE BLINDÉE',
    badgeColor: 'bg-slate-900 text-white',
    shortDescription: "Génération de clés d'authentification API, configuration de webhooks en temps réel et interconnexion avec vos systèmes externes.",
    definition: "La Passerelle Souveraine est l'interface de programmation (API) et d'automatisation de l'écosystème. Elle permet aux équipes techniques et développeurs de connecter leurs sites externes, applications mobiles ou logiciels d'entreprise (ERP) directement aux services de paiement et de gestion Nanasore.",
    function: "Génère des identifiants et clés de sécurité Zero-Trust, transmet des notifications d'événements par webhooks signés cryptographiquement (ex: commande validée, paiement reçu), et permet d'initier des paiements ou d'interroger les stocks par requêtes automatisées sécurisées.",
    domain: "Startups technologiques, développeurs de sites sur-mesure, entreprises équipées d'un logiciel de gestion existant et intégrateurs.",
    businessValue: "Offre une flexibilité totale : vous n'êtes jamais enfermé dans une solution rigide. Vous pouvez utiliser la puissance de la passerelle de paiement souveraine tout en conservant votre application mobile ou votre site e-commerce déjà en place.",
    workflow: [
      "1. Le développeur accède à la console technique et génère sa clé d'identification API sécurisée.",
      "2. Il renseigne l'adresse URL de son serveur destinée à recevoir les notifications webhooks instantanées.",
      "3. Il intègre le connecteur dans son code applicatif en suivant la documentation claire et normalisée.",
      "4. Les transactions s'exécutent avec validation cryptographique et traçabilité en temps réel."
    ],
    configuration: [
      "Génération et révocation instantanée des clés d'accès API.",
      "Configuration de l'adresse de webhook et test d'envoi d'événement simulé.",
      "Consultation du journal d'audit des requêtes pour un diagnostic rapide en cas d'erreur de développement."
    ],
    marketingStrategy: [
      "Connecter sa passerelle à un système de distribution de billets d'événements pour vendre des milliers de tickets lors d'un concert.",
      "Automatiser l'envoi d'un message de remerciement VIP dès que l'API confirme un paiement supérieur à 100 000 XOF.",
      "Créer une expérience de paiement sur-mesure dans une application mobile personnalisée."
    ],
    synergiesAndMonetization: [
      "Passerelle Souveraine + Chaîne KYC : Sécurité juridique totale sur l'origine et la conformité des flux financiers reçus.",
      "Passerelle Souveraine + CRM et Automation : Déclenchement de scénarios automatisés complexes dans vos systèmes tiers.",
      "Modèle économique : Inclus pour l'intégration technique avec tarification basée sur les transactions exécutées."
    ],
    pricingPlan: 'HYBRIDE',
    connectedModules: ['kyc', 'studio', 'analytics']
  },

  {
    id: 'nanasore-offline',
    name: 'Nanasore Hors-Ligne (Architecture Local-First & Résilience)',
    taxonomy: 'MODULE',
    category: 'Continuité d\'Activité & Infrastructure',
    badge: '100% OPÉRATIONNEL SANS INTERNET',
    badgeColor: 'bg-emerald-800 text-white',
    shortDescription: "Moteur de persistance locale et file de synchronisation automatique permettant d'encaisser, d'imprimer des tickets et de gérer les stocks sans connexion réseau.",
    definition: "Nanasore Hors-Ligne est le moteur technologique souverain de continuité d'activité basé sur le paradigme Local-First. Il garantit qu'aucun commerce physique ne s'arrête de vendre, même en cas de coupure Internet totale, de panne d'opérateur mobile ou de délestage électrique.",
    function: "Stocke en toute sécurité les ventes, commandes, catalogues et paniers directement dans une base de données locale étanche et chiffrée sur le terminal (tablette, ordinateur ou smartphone). Il enregistre chaque mutation dans une file d'attente intelligente avec horodatage strict, et déclenche une synchronisation automatique et silencieuse avec le cloud dès que le réseau réapparaît, sans créer de doublon ni de conflit.",
    domain: "Tous les points de vente physiques, superettes, boutiques en zone blanche ou mal couverte, marchés nomades, salons, foires et stations-service.",
    businessValue: "Résout le fléau des pannes de réseau récurrentes. Un commerçant utilisant Nanasore ne perd aucun client à cause d'un 'réseau indisponible'. Il continue à scanner, encaisser, imprimer ses tickets et gérer son activité en toute sérénité avec un taux de disponibilité réel de 99.9%.",
    workflow: [
      "1. Si la connexion Internet vient à se couper, un voyant discret indique le passage automatique en mode Hors-Ligne sécurisé.",
      "2. Le caissier continue d'ajouter des articles au panier par scan de code-barres ou par commande vocale locale.",
      "3. La vente est validée en espèces ou en solde à crédit : le ticket de caisse est imprimé et le stock local est décrémenté instantanément.",
      "4. La vente est stockée dans la file d'attente locale d'enregistrement.",
      "5. Dès que la connexion est rétablie, le système synchronise en tâche de fond l'ensemble des ventes vers le serveur central sans aucune action manuelle requise."
    ],
    configuration: [
      "Installation de la solution en mode PWA (Application Web Progressive) pour une exécution ultra-rapide hors-navigateur.",
      "Vérification de l'activation du stockage local persistant sur le terminal de caisse.",
      "Paramétrage du délai de tentative de synchronisation automatique (Retry exponentiel dès retour réseau).",
      "Activation optionnelle de la commande vocale hors-ligne pour les postes de caisse mains libres."
    ],
    marketingStrategy: [
      "Rassurer les commerçants réticents à la digitalisation en leur démontrant qu'ils ne dépendent plus des aléas de la connexion Internet.",
      "Mettre en avant l'argument massue : 'Votre boutique reste ouverte et encaisse même quand les terminaux bancaires classiques de vos voisins tombent en panne'.",
      "Déployer des stands de vente nomades sur des foires ou marchés ruraux sans avoir besoin de louer de routeur Wi-Fi."
    ],
    synergiesAndMonetization: [
      "Nanasore Hors-Ligne + Caisse POS Pro : Le socle de fiabilité indispensable pour garantir une caisse physique infaillible.",
      "Nanasore Hors-Ligne + Stock & Inventaire : Permet de réaliser des inventaires complets au fond d'un entrepôt métallique sans réseau.",
      "Nanasore Hors-Ligne + Gestion des Dettes : Consultation et enregistrement des créances clients même hors connexion.",
      "Modèle économique : Inclus nativement dans le Plan Abonnement de la Caisse POS Pro pour tous les commerces physiques."
    ],
    pricingPlan: 'PLAN_ABONNEMENT',
    parentAppOrService: 'pos',
    connectedModules: ['pos', 'mod-inventory', 'mod-debts', 'tool-scanner']
  }
];
