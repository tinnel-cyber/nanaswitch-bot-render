/**
 * Données de démonstration réalistes pour le Hub VIP Wameet
 * Salons d'Affaires & Coaching (Or / Noir) et Salles de Cours & Masterclass (Bleu Nuit / Argent)
 */

import {
  VipBusinessLounge,
  VipCourseRoom,
  VipLoungeFeedPost,
  VipDealRequest,
  Vip1to1ConsultationType,
  Vip1to1Slot
} from './types';

export const MOCK_VIP_BUSINESS_LOUNGES: VipBusinessLounge[] = [
  {
    id: 'lounge-1',
    title: "Cercle Privé B2B & Levée de Fonds UEMOA",
    topic: "Stratégie d'investissement, Due Diligence & Négociation VC",
    category: "Investissement & Finance",
    coachName: "Ibrahim Traoré",
    coachRole: "Ex-Partner VC Afrique & Business Angel",
    coachAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    coachBio: "Plus de 15 ans d'expérience dans le private equity en Afrique de l'Ouest. A structuré plus de 45 millions d'euros d'investissements.",
    isCoachVerified: true,
    isOnline: true,
    rating: 4.96,
    reviewsCount: 142,
    activeMembersCount: 54,
    accessType: 'SUBSCRIPTION',
    badgeLabel: 'Accès sur Abonnement',
    subscriptionPriceLabel: '35 000 FCFA / mois',
    subscriptionPeriod: 'Facturation mensuelle',
    tags: ['B2B', 'Levée de Fonds', 'Due Diligence', 'Networking'],
    nextLiveDate: "Ce soir à 20h00 GMT",
    isLiveNow: true,
    bannerUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80",
    roomCode: "VIP-LOUNGE-01",
    perks: [
      "Pitch deck reviews personnalisées en direct",
      "Accès aux fiches de valorisation financières OHADA",
      "Canal audio exclusif réservé aux membres",
      "Table ronde mensuelle avec des fonds institutionnels"
    ],
    maxSeats: 60,
    availableSeats: 6
  },
  {
    id: 'lounge-2',
    title: "Mastermind E-Commerce & Logistique Transfrontalière",
    topic: "Franchise, Stock Déporté & Importation Asie-Afrique",
    category: "Commerce & Supply Chain",
    coachName: "Aïssata N'Diaye",
    coachRole: "CEO Sahel Express & Investisseuse Retail",
    coachAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    coachBio: "Pionnière du retail phygital à Abidjan et Dakar. 120 000 colis expédiés par an à travers 6 pays.",
    isCoachVerified: true,
    isOnline: true,
    rating: 4.92,
    reviewsCount: 98,
    activeMembersCount: 68,
    accessType: 'SUBSCRIPTION',
    badgeLabel: 'Accès sur Abonnement',
    subscriptionPriceLabel: '25 000 FCFA / mois',
    subscriptionPeriod: 'Sans engagement',
    tags: ['E-Commerce', 'Logistique', 'Chine-Afrique', 'Fret'],
    nextLiveDate: "Demain à 18h30 GMT",
    isLiveNow: false,
    bannerUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80",
    roomCode: "VIP-LOUNGE-02",
    perks: [
      "Partage d'adresses vérifiées d'usines et transitaires certifiés",
      "Optimisation des coûts de dédouanement et fret aérien",
      "Permanence hebdomadaire questions/réponses en direct"
    ],
    maxSeats: 80,
    availableSeats: 12
  },
  {
    id: 'lounge-3',
    title: "Coaching Scale-Up Dirigeants Tech & FinTech",
    topic: "Gouvernance, Scaling d'Équipe & Expansion Panafricaine",
    category: "Tech & Management",
    coachName: "Dr. Koffi Mensah",
    coachRole: "CTO & Board Advisor FinTech Multi-Licenciée",
    coachAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
    coachBio: "Architecte de plateformes de paiement traitant +2 milliards FCFA par jour. Mentor de la cohorte Seedstars Afrique.",
    isCoachVerified: true,
    isOnline: false,
    rating: 4.98,
    reviewsCount: 184,
    activeMembersCount: 42,
    accessType: 'SUBSCRIPTION',
    badgeLabel: 'Accès sur Abonnement',
    subscriptionPriceLabel: '40 000 FCFA / mois',
    subscriptionPeriod: 'Trimestriel conseillé',
    tags: ['Tech', 'FinTech', 'Architecture', 'Expansion'],
    nextLiveDate: "Vendredi à 19h00 GMT",
    isLiveNow: false,
    bannerUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80",
    roomCode: "VIP-LOUNGE-03",
    perks: [
      "Audits d'architecture applicative et sécurité bancaire",
      "Mise en relation avec des recruteurs de talents tech seniors",
      "Templates de contrats de co-fondateurs et vesting"
    ],
    maxSeats: 50,
    availableSeats: 8
  },
  {
    id: 'lounge-4',
    title: "Club Investissement Foncier, Immobilier & Phygital",
    topic: "Acquisition de baux commerciaux, SCD & Rénovation rentabilité 18%",
    category: "Immobilier & Patrimoine",
    coachName: "Jean-Paul Agbessi",
    coachRole: "Directeur Asset Management & Promoteur",
    coachAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80",
    coachBio: "Gestionnaire de portefeuille foncier à Dakar, Lomé et Abidjan. Auteur du guide Investir sans Risque dans le Foncier.",
    isCoachVerified: true,
    isOnline: true,
    rating: 4.89,
    reviewsCount: 76,
    activeMembersCount: 51,
    accessType: 'SUBSCRIPTION',
    badgeLabel: 'Accès sur Abonnement',
    subscriptionPriceLabel: '30 000 FCFA / mois',
    subscriptionPeriod: 'Facturation mensuelle',
    tags: ['Immobilier', 'Foncier', 'Patrimoine', 'ACD'],
    nextLiveDate: "Samedi à 15h00 GMT",
    isLiveNow: false,
    bannerUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80",
    roomCode: "VIP-LOUNGE-04",
    perks: [
      "Analyse en direct de dossiers notariés et titres fonciers",
      "Calculateurs Excel de rentabilité locative meublée",
      "Opportunités d'achats groupés en avant-première"
    ],
    maxSeats: 60,
    availableSeats: 9
  },
  {
    id: 'lounge-5',
    title: "Leadership Stratégique & Négociation Haute Tension",
    topic: "Psychologie d'influence, Prise de parole & Conflits d'associés",
    category: "Leadership & RH",
    coachName: "Mariama Ba",
    coachRole: "Ex-Directrice Régionale & Négociatrice Internationale",
    coachAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80",
    coachBio: "Formatrice de diplomates et membres de conseils d'administration. Spécialiste de la communication non-verbale et du closing.",
    isCoachVerified: true,
    isOnline: true,
    rating: 4.97,
    reviewsCount: 165,
    activeMembersCount: 39,
    accessType: 'SUBSCRIPTION',
    badgeLabel: 'Accès sur Abonnement',
    subscriptionPriceLabel: '32 000 FCFA / mois',
    subscriptionPeriod: 'Facturation mensuelle',
    tags: ['Leadership', 'Négociation', 'Associés', 'Influence'],
    nextLiveDate: "Ce soir à 21h30 GMT",
    isLiveNow: true,
    bannerUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
    roomCode: "VIP-LOUNGE-05",
    perks: [
      "Simulations de négociations en direct micro ouvert",
      "Débriefings confidentiels de situations managériales complexes",
      "Grilles d'analyse des profils psychologiques d'interlocuteurs"
    ],
    maxSeats: 45,
    availableSeats: 6
  },
  {
    id: 'lounge-6',
    title: "Franchise & Distribution PME Afrique Centrale & Ouest",
    topic: "Structuration de manuel opératoire & Licences de marque",
    category: "Franchise & Retail",
    coachName: "Cheikh Diallo",
    coachRole: "Multi-Franchisé & Consultant Retail International",
    coachAvatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80",
    coachBio: "Développement de réseaux de 35 points de vente franchisés en 4 ans sur 4 capitales africaines.",
    isCoachVerified: true,
    isOnline: false,
    rating: 4.91,
    reviewsCount: 62,
    activeMembersCount: 33,
    accessType: 'SUBSCRIPTION',
    badgeLabel: 'Accès sur Abonnement',
    subscriptionPriceLabel: '28 000 FCFA / mois',
    subscriptionPeriod: 'Facturation mensuelle',
    tags: ['Franchise', 'Distribution', 'Retail', 'Contrats'],
    nextLiveDate: "Mardi à 17h00 GMT",
    isLiveNow: false,
    bannerUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80",
    roomCode: "VIP-LOUNGE-06",
    perks: [
      "Modèles juridiques types de contrats de franchise commerciale",
      "Kits d'onboarding opérationnel des franchisés",
      "Audits financiers de marge brute retail"
    ],
    maxSeats: 40,
    availableSeats: 7
  }
];

export const MOCK_VIP_COURSE_ROOMS: VipCourseRoom[] = [
  {
    id: 'course-1',
    title: "Masterclass Architecture Microservices & IA Souveraine",
    category: "Ingénierie Logicielle & IA",
    instructorName: "Marcelle Gnakpa",
    instructorRole: "Staff Cloud Engineer & Formatrice Certifiée",
    instructorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    isInstructorVerified: true,
    studentsCount: 1420,
    completionRate: 94,
    accessType: 'PREMIUM',
    badgeLabel: 'Premium',
    priceLabel: '45 000 FCFA',
    rating: 4.95,
    reviewsCount: 320,
    modulesCount: 16,
    durationHours: 32,
    level: 'Masterclass',
    tags: ['Microservices', 'Kubernetes', 'LLM Local', 'Architecture'],
    nextSessionDate: "Jeudi 19h00 GMT",
    isLiveNow: false,
    bannerUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
    syllabus: [
      "Principes de modularisation haute tolérance aux pannes",
      "Déploiement de microservices avec Docker et Kubernetes",
      "Intégration d'agents IA et modèles open-weights on-premise",
      "Projet fil rouge : Core bancaire résilient multi-régions"
    ],
    hasCertificate: true
  },
  {
    id: 'course-2',
    title: "Bootcamp Vente Haute Conversion & Closing Direct",
    category: "Marketing & Vente",
    instructorName: "David Kouamé",
    instructorRole: "Top Closer & Spécialiste des Funnels Mobile-First",
    instructorAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80",
    isInstructorVerified: true,
    studentsCount: 2850,
    completionRate: 98,
    accessType: 'FREE',
    badgeLabel: 'Accès Gratuit',
    priceLabel: 'Offert par Wameet',
    rating: 4.88,
    reviewsCount: 640,
    modulesCount: 8,
    durationHours: 14,
    level: 'Tous Niveaux',
    tags: ['Closing', 'Conversion', 'Scripts', 'Vente'],
    nextSessionDate: "En accès libre immédiat",
    isLiveNow: true,
    bannerUrl: "https://images.unsplash.com/photo-1556742049-0a67e557224f?w=800&auto=format&fit=crop&q=80",
    syllabus: [
      "Structure psychologique d'un message audio qui fait passer à l'action",
      "12 scripts anti-objection 'C'est trop cher / Je vais réfléchir'",
      "Mise en place de relances automatisées non-intrusives",
      "Atelier pratique : Analyse de conversations de vente réelles"
    ],
    hasCertificate: true
  },
  {
    id: 'course-3',
    title: "Comptabilité Analytique & Optimisation Fiscale OHADA",
    category: "Finance & Droit des Affaires",
    instructorName: "Me. Fatou Sow",
    instructorRole: "Expert-Comptable Certifiée & Commissaire aux Comptes",
    instructorAvatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&auto=format&fit=crop&q=80",
    isInstructorVerified: true,
    studentsCount: 960,
    completionRate: 91,
    accessType: 'PREMIUM',
    badgeLabel: 'Premium',
    priceLabel: '38 000 FCFA',
    rating: 4.93,
    reviewsCount: 195,
    modulesCount: 12,
    durationHours: 26,
    level: 'Avancé',
    tags: ['OHADA', 'Fiscalité', 'Bilan', 'Audit'],
    nextSessionDate: "Lundi 20h00 GMT",
    isLiveNow: false,
    bannerUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80",
    syllabus: [
      "Lecture critique des états financiers SYSCOHADA révisé",
      "Déductibilité des charges et crédits d'impôt d'investissement",
      "Prévention des redressements fiscaux lors des vérifications",
      "Cas pratique : Simulation de clôture annuelle d'une SARL"
    ],
    hasCertificate: true
  },
  {
    id: 'course-4',
    title: "Création de Contenu Viral & Storytelling Vidéo Wameet Reels",
    category: "Création Vidéo & Médias",
    instructorName: "Yanick Dossou",
    instructorRole: "Réalisateur & Créateur Top 1% (+1.2M abonnés)",
    instructorAvatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80",
    isInstructorVerified: true,
    studentsCount: 3140,
    completionRate: 96,
    accessType: 'FREE',
    badgeLabel: 'Accès Gratuit',
    priceLabel: 'Sponsorisé Nanasore',
    rating: 4.91,
    reviewsCount: 780,
    modulesCount: 10,
    durationHours: 18,
    level: 'Tous Niveaux',
    tags: ['Reels', 'Wameet', 'Storytelling', 'Montage Smartphone'],
    nextSessionDate: "En accès libre immédiat",
    isLiveNow: true,
    bannerUrl: "https://images.unsplash.com/photo-1616469829941-c7200edec809?w=800&auto=format&fit=crop&q=80",
    syllabus: [
      "Les 3 premières secondes : Créer un hook visuel imparable",
      "Storytelling émotionnel et ancrage culturel authentique",
      "Tournage et étalonnage cinéma avec un simple smartphone",
      "Transformation de l'audience virale en clients payants"
    ],
    hasCertificate: true
  },
  {
    id: 'course-5',
    title: "Sécurisation Financière, Tontines Digitalisées & Smart Contracts",
    category: "FinTech & Web3",
    instructorName: "Dr. Amadou Kane",
    instructorRole: "Chercheur FinTech & Architecte Protocoles Décentralisés",
    instructorAvatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&auto=format&fit=crop&q=80",
    isInstructorVerified: true,
    studentsCount: 1120,
    completionRate: 89,
    accessType: 'PREMIUM',
    badgeLabel: 'Premium',
    priceLabel: '50 000 FCFA',
    rating: 4.97,
    reviewsCount: 215,
    modulesCount: 14,
    durationHours: 28,
    level: 'Intermédiaire',
    tags: ['Tontine', 'Smart Contract', 'Escrow', 'Sécurité'],
    nextSessionDate: "Mercredi 19h30 GMT",
    isLiveNow: false,
    bannerUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&auto=format&fit=crop&q=80",
    syllabus: [
      "Fondements mathématiques et garanties des tontines rotatives",
      "Écriture et audit de smart contracts de séquestre (Escrow)",
      "Gestion multi-signatures et validation par quorum communautaire",
      "Atelier : Déploiement d'une tontine transparente de 10 membres"
    ],
    hasCertificate: true
  },
  {
    id: 'course-6',
    title: "Management de Force de Vente & Logistique du Dernier Kilomètre",
    category: "Opérations & Management",
    instructorName: "Clarisse Ewane",
    instructorRole: "Directrice des Opérations & Formatrice Terrains Difficiles",
    instructorAvatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&auto=format&fit=crop&q=80",
    isInstructorVerified: true,
    studentsCount: 890,
    completionRate: 93,
    accessType: 'PREMIUM',
    badgeLabel: 'Premium',
    priceLabel: '32 000 FCFA',
    rating: 4.87,
    reviewsCount: 140,
    modulesCount: 9,
    durationHours: 20,
    level: 'Intermédiaire',
    tags: ['Livraison', 'Flotte', 'Dernier Kilomètre', 'Management'],
    nextSessionDate: "Samedi 10h00 GMT",
    isLiveNow: false,
    bannerUrl: "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=800&auto=format&fit=crop&q=80",
    syllabus: [
      "Recrutement et fidélisation des livreurs indépendants",
      "Suivi GPS et réduction des échecs de livraison à moins de 4%",
      "Systèmes d'incitation financière et primes de ponctualité",
      "Gestion des litiges et assurance marchandise transportée"
    ],
    hasCertificate: true
  }
];

export const DEFAULT_VIP_CHAPTERS: import('./types').VipChapterItem[] = [
  {
    id: 'chap-1',
    title: 'Chapitre 1 : Fondations Architecturales & Résilience UEMOA',
    description: 'Comprendre les contraintes réseau locales, latences et scalabilité.',
    lessons: [
      {
        id: 'less-1-1',
        title: 'Introduction au Webinaire & Principes Directeurs',
        type: 'video',
        duration: '22 min',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        isCompleted: true,
        description: "Présentation des objectifs pédagogiques et de l'environnement de lab."
      },
      {
        id: 'less-1-2',
        title: 'Architecture Microservices vs Monolithe Modulaire',
        type: 'video',
        duration: '35 min',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        isCompleted: true,
        description: 'Analyse comparative des coûts d’infrastructure et de maintenance.'
      },
      {
        id: 'less-1-3',
        title: 'Guide Pratique : Schéma d’Architecture Cloud & On-Premise (PDF)',
        type: 'pdf',
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        pdfSize: '4.8 MB',
        isCompleted: false,
        description: 'Schémas techniques complets haute disponibilité multi-zones.'
      }
    ]
  },
  {
    id: 'chap-2',
    title: 'Chapitre 2 : Conteneurisation, Docker & Orchestration Kubernetes',
    description: 'Isoler les services métiers et automatiser les montées en charge.',
    lessons: [
      {
        id: 'less-2-1',
        title: 'Création d’Images Docker Optimisées (Multi-Stage Builds)',
        type: 'video',
        duration: '28 min',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        isCompleted: false,
        description: 'Réduire la taille des images de production à moins de 80 Mo.'
      },
      {
        id: 'less-2-2',
        title: 'Déploiement sur Cluster Kubernetes & Ingress Controller',
        type: 'video',
        duration: '42 min',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        isCompleted: false,
        description: 'Gestion du trafic entrant, certificats SSL automatiques et autoscaling.'
      },
      {
        id: 'less-2-3',
        title: 'Cheat Sheet : 50 Commandes kubectl Indispensables en Production (PDF)',
        type: 'pdf',
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        pdfSize: '2.1 MB',
        isCompleted: false,
        description: 'Aide-mémoire rapide pour le diagnostic et le dépannage de pods.'
      }
    ]
  },
  {
    id: 'chap-3',
    title: 'Chapitre 3 : Intégration d’Agents IA Souverains & LLMs Locaux',
    description: 'Déployer des modèles open-source sans fuite de données confidentielles.',
    lessons: [
      {
        id: 'less-3-1',
        title: 'Sélection des Modèles Open-Weights (Llama 3, Mistral, Gemma)',
        type: 'video',
        duration: '31 min',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        isCompleted: false,
        description: 'Quantification 4-bit/8-bit et benchmarks sur serveurs locaux.'
      },
      {
        id: 'less-3-2',
        title: 'Mise en place d’un Pipeline RAG & Base Vectorielle',
        type: 'video',
        duration: '45 min',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        isCompleted: false,
        description: 'Indexation des documents juridiques et comptables OHADA.'
      },
      {
        id: 'less-3-3',
        title: 'Livre Blanc : Sécurité & Conformité Réglementaire de l’IA (PDF)',
        type: 'pdf',
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        pdfSize: '6.4 MB',
        isCompleted: false,
        description: 'Réglementations BCEAO et protection des données à caractère personnel.'
      }
    ]
  }
];

export const DEFAULT_VIP_QUIZ_QUESTIONS: import('./types').VipQuizQuestion[] = [
  {
    id: 'q-1',
    question: "Dans une architecture microservices résiliente, quelle stratégie permet d'éviter l'effet domino en cas de panne d'un service tiers ?",
    options: [
      "Augmenter indéfiniment la valeur du timeout HTTP",
      "Mettre en place le pattern Circuit Breaker (Disjoncteur)",
      "Redémarrer automatiquement l'ensemble des conteneurs",
      "Désactiver la journalisation des erreurs pour libérer la mémoire"
    ],
    correctAnswerIndex: 1,
    explanation: "Le pattern Circuit Breaker isole immédiatement le service défaillant dès qu'un seuil d'erreurs est atteint, protégeant ainsi l'ensemble de l'écosystème contre l'épuisement des threads."
  },
  {
    id: 'q-2',
    question: "Pourquoi privilégie-t-on le 'Multi-Stage Build' lors de la construction d'une image Docker en environnement de production ?",
    options: [
      "Pour exécuter plusieurs conteneurs en même temps sur le même port",
      "Pour séparer l'environnement de compilation du runtime et minimiser l'empreinte de sécurité",
      "Pour permettre aux développeurs d'éditer le code directement dans le conteneur",
      "Pour contourner les limites de bande passante réseau des opérateurs télécoms"
    ],
    correctAnswerIndex: 1,
    explanation: "Le Multi-Stage Build permet d'éliminer tous les compilateurs, SDKs et fichiers temporaires de l'image finale, ce qui réduit drastiquement la taille (souvent de 1 Go à moins de 80 Mo) et la surface d'attaque."
  },
  {
    id: 'q-3',
    question: "Quelle méthode de persistance est recommandée pour synchroniser les données d'un salon VIP Wameet avec une tolérance aux coupures internet intermittentes ?",
    options: [
      "Une synchronisation purement synchrone bloquante",
      "Une approche Offline-First avec mise en file d'attente locale et réconciliation optimiste",
      "Le rechargement systématique de toute la page web",
      "L'interdiction de toute action utilisateur dès que la connexion faiblit"
    ],
    correctAnswerIndex: 1,
    explanation: "L'approche Offline-First garantit une expérience fluide même lors de micro-coupures de réseau mobile, en enregistrant les actions en local avant réconciliation automatique en arrière-plan."
  },
  {
    id: 'q-4',
    question: "Dans le cadre de l'intégration d'un LLM local, que permet la quantification en 4 bits (GGUF / AWQ) ?",
    options: [
      "Multiplier la résolution vidéo des caméras par 4",
      "Faire tourner des modèles de 7B ou 13B paramètres sur des cartes graphiques grand public avec peu de VRAM",
      "Augmenter automatiquement la vitesse de frappe au clavier des étudiants",
      "Traduire instantanément le cours dans 40 langues africaines"
    ],
    correctAnswerIndex: 1,
    explanation: "La quantification réduit la précision des poids du modèle de 16 bits à 4 bits, divisant par près de 4 la mémoire vidéo requise avec une dégradation négligeable de la pertinence des réponses."
  }
];

export const DEFAULT_VIP_QNA_MESSAGES: import('./types').VipQnaMessage[] = [
  {
    id: 'qna-1',
    authorName: 'Bakary Sanogo',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    authorRole: 'STUDENT',
    questionText: 'Professeur, comment gère-t-on la persistance des sessions utilisateurs lorsque les instances Kubernetes montent de 2 à 20 pods lors d’un pic de vente ?',
    createdAt: 'Il y a 15 minutes',
    isPinned: true,
    upvotesCount: 24,
    hasUpvoted: true,
    instructorAnswer: {
      authorName: 'Marcelle Gnakpa',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      authorRole: 'Formatrice Principale',
      answerText: 'Excellente question Bakary. La règle d’or en microservices : les pods doivent être 100% Stateless ! Vos sessions doivent être stockées dans un cluster Redis centralisé ou transmises via des JWT signés cryptographiquement. Ne stockez jamais d’état en mémoire locale du serveur HTTP.',
      answeredAt: 'Il y a 8 minutes'
    }
  },
  {
    id: 'qna-2',
    authorName: 'Salimata Cissé',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    authorRole: 'STUDENT',
    questionText: 'Est-ce que le support PDF du Chapitre 1 contient les scripts de déploiement Terraform pour les infrastructures locales ?',
    createdAt: 'Il y a 32 minutes',
    isPinned: true,
    upvotesCount: 18,
    instructorAnswer: {
      authorName: 'Marcelle Gnakpa',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      authorRole: 'Formatrice Principale',
      answerText: 'Oui tout à fait Salimata, en page 14 du guide PDF vous avez le manifest Terraform complet prêt à l’emploi, testé sur les zones Abidjan et Dakar.',
      answeredAt: 'Il y a 20 minutes'
    }
  },
  {
    id: 'qna-3',
    authorName: 'Mamadou Diallo',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    authorRole: 'STUDENT',
    questionText: 'Pour le quiz du module 2, est-ce que le certificat est délivré dès qu’on dépasse 75% de bonnes réponses ?',
    createdAt: 'Il y a 45 minutes',
    isPinned: false,
    upvotesCount: 7
  }
];

/**
 * =====================================================================
 * PROMPT 29 : Données Réalistes pour l'Intérieur du "Salon VIP" d'Affaires
 * =====================================================================
 */

export const DEFAULT_VIP_FEED_POSTS: VipLoungeFeedPost[] = [
  {
    id: 'post-1',
    type: 'INVESTMENT_OPPORTUNITY',
    authorName: 'Ibrahim Traoré',
    authorRole: 'Ex-Partner VC & Business Angel (Propriétaire du Salon)',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    isOwner: true,
    title: '🚀 Opportunité Co-Investissement : Hub Logistique Froid Solaire (Abidjan - Bouaké)',
    content: 'Chers membres du Cercle VIP,\n\nAprès 3 semaines de Due Diligence approfondie, nous ouvrons un tour de co-investissement exclusif réservé aux membres de ce salon. Il s’agit du déploiement de 4 entrepôts frigorifiques autonomes solaires pour réduire les pertes post-récoltes de mangues et d’ananas en Côte d’Ivoire.\n\nLe dossier a été audité avec un contrat d’offtake garanti sur 5 ans avec deux multinationales agro-industrielles. Le montage financier est sécurisé par un nantissement de matériel et une garantie bancaire de premier ordre.',
    createdAt: 'Il y a 2 heures',
    isConfidential: true,
    tags: ['Co-Investissement', 'AgriTech', 'Logistique', 'Afrique de l’Ouest'],
    likesCount: 38,
    hasLiked: true,
    investmentMetrics: {
      ticketMin: '5 000 000 FCFA',
      roiEstimated: '22.5% brut / an',
      termMonths: 24,
      capitalSecured: 'Nantissement Actifs & Offtake Garanti',
      totalTarget: '65 000 000 FCFA',
      committedPercentage: 74,
      deadline: '15 Novembre 2026'
    },
    attachments: [
      {
        title: 'Teaser_Financier_Entrepots_Solaires_Confidentiel.pdf',
        type: 'pdf',
        size: '4.2 MB',
        url: '#'
      },
      {
        title: 'Modele_Financier_OHADA_Rentabilite_v3.xlsx',
        type: 'excel',
        size: '1.8 MB',
        url: '#'
      }
    ],
    comments: [
      {
        id: 'c-1',
        authorName: 'Ousmane Koné',
        authorRole: 'Directeur Général SIFCA Trading',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        content: 'Très solide dossier Ibrahim. Nous positionnons un ticket de 15M FCFA dès validation notariale lundi.',
        createdAt: 'Il y a 45 min'
      },
      {
        id: 'c-2',
        authorName: 'Amina Diop',
        authorRole: 'Family Office Dakar',
        authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        content: 'Est-il possible d’avoir la répartition trimestrielle des dividendes dans le modèle ? Merci !',
        createdAt: 'Il y a 20 min'
      }
    ]
  },
  {
    id: 'post-2',
    type: 'ANALYSIS',
    authorName: 'Ibrahim Traoré',
    authorRole: 'Ex-Partner VC & Business Angel (Propriétaire du Salon)',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    isOwner: true,
    title: '📊 Note Blanche Stratégique : Impact de la nouvelle réglementation bancaire BCEAO sur les transferts transfrontaliers',
    content: 'Analyse confidentielle pour les directeurs financiers et commerçants du salon :\n\nLa directive BCEAO sur l’interopérabilité régionale GIM-UEMOA ouvre des opportunités majeures pour le règlement instantané B2B. Voici les 3 leviers critiques à actionner immédiatement pour réduire de 45% vos frais bancaires et sécuriser vos créances fournisseurs :\n\n1. Rapprochement automatisé multi-devises (XOF, NGN, GHS).\n2. Utilisation de comptes séquestres tiers pour les commandes supérieures à 20M FCFA.\n3. Élimination des pénalités de change flottant.',
    createdAt: 'Hier à 18h30',
    isConfidential: true,
    tags: ['Réglementation', 'BCEAO', 'FinTech', 'Trésorerie B2B'],
    likesCount: 52,
    hasLiked: false,
    attachments: [
      {
        title: 'Note_Blanche_BCEAO_Tresorerie_Entreprise_2026.pdf',
        type: 'pdf',
        size: '2.9 MB',
        url: '#'
      }
    ],
    comments: [
      {
        id: 'c-3',
        authorName: 'Maître Charles Edimo',
        authorRole: 'Avocat au Barreau & Arbitre OHADA',
        authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
        content: 'Excellente grille de lecture. J’ajoute que la clause d’arbitrage accéléré permet de débloquer les litiges en moins de 21 jours.',
        createdAt: 'Hier à 21h10'
      }
    ]
  },
  {
    id: 'post-3',
    type: 'PRIVATE_VIDEO',
    authorName: 'Ibrahim Traoré',
    authorRole: 'Ex-Partner VC & Business Angel (Propriétaire du Salon)',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    isOwner: true,
    title: '🎥 Débrief Exclusif (Vidéo 18 min) : Négocier une valorisation de 2 Milliards FCFA face à un fonds européen',
    content: 'Dans cette session privée enregistrée hier soir depuis mon bureau, je décortique les coulisses de la négociation de la Série A d’une de nos pépites tech ivoiriennes.\n\nJe partage l’écran avec les term sheets réels, les clauses de liquidation préférentielle 1x non-participating et la stratégie psychologique de closing.',
    createdAt: 'Il y a 2 jours',
    isConfidential: true,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // ou flux vidéo privé Wameet
    tags: ['Masterclass Privée', 'Term Sheet', 'Négociation VC', 'Closing'],
    likesCount: 64,
    hasLiked: true
  }
];

export const DEFAULT_VIP_DEAL_REQUESTS: VipDealRequest[] = [
  {
    id: 'deal-1',
    title: 'Expansion Réseau Distributeurs Pharmaceutiques & Cliniques Privées',
    category: 'PARTNERSHIP',
    categoryLabel: 'Partenariat Stratégique',
    status: 'APPROVED',
    country: "Sénégal & Côte d'Ivoire",
    authorName: 'Dr. Mariama Sow',
    authorCompany: 'PharmaTech Afrique de l’Ouest',
    authorRole: 'Fondatrice & Pharmacienne Biologiste',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    summary: 'Nous recherchons des partenaires logistiques dotés d’entrepôts sous température dirigée (2°C - 8°C) à Dakar et San-Pedro pour distribuer notre gamme de réactifs médicaux homologués.',
    createdAt: 'Il y a 3 jours',
    reviewedByOwnerAt: 'Validé par Ibrahim Traoré hier',
    verifiedBadge: true,
    ndaRequired: true,
    metrics: {
      currentRevenue: '180 000 000 FCFA / an',
      ebitdaMargin: '31%',
      teamSize: 14
    }
  },
  {
    id: 'deal-2',
    title: 'Recherche de Financement Bridge 45M FCFA : Préfinancement Bon de Commande Export Cacao',
    category: 'FINANCING',
    categoryLabel: 'Recherche de Financement',
    status: 'APPROVED',
    targetAmount: '45 000 000 FCFA',
    country: "Côte d'Ivoire",
    authorName: 'Seydou Touré',
    authorCompany: 'Société Coopérative Ivoirienne du Café-Cacao',
    authorRole: 'Président du Conseil d’Administration',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    summary: 'Bon de commande ferme de 120 tonnes certifié Rainforest Alliance pour le port d’Anvers. Besoin d’un bridge financier de 45M FCFA sur 90 jours avec garantie bancaire et nantissement des stocks au port d’Abidjan. Taux proposé : 6.5% net sur la période.',
    createdAt: 'Il y a 2 jours',
    reviewedByOwnerAt: 'Validé par Ibrahim Traoré ce matin',
    verifiedBadge: true,
    ndaRequired: false,
    metrics: {
      currentRevenue: '420 000 000 FCFA',
      ebitdaMargin: '19%',
      teamSize: 32
    }
  },
  {
    id: 'deal-3',
    title: 'Recherche Associé Directeur Technique (CTO) Senior & Co-Fondateur',
    category: 'COFOUNDER',
    categoryLabel: 'Co-Fondateur / Associé',
    status: 'APPROVED',
    country: 'Panafricain / Remote',
    authorName: 'Karim Benjelloun',
    authorCompany: 'FinTransact Pro',
    authorRole: 'CEO & Ex-Directeur Banque d’Affaires',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    summary: 'Plateforme B2B de conciliation de paiements Mobile Money et cartes bancaires pour grands comptes. Produit MVP déjà déployé chez 8 enseignes. 15% d’equity réservé au profil technique senior.',
    createdAt: 'Il y a 5 jours',
    reviewedByOwnerAt: 'Validé par Ibrahim Traoré le 11/10',
    verifiedBadge: true,
    ndaRequired: true,
    metrics: {
      teamSize: 4
    }
  },
  {
    id: 'deal-4',
    title: 'Levée d’Amorçage Seed 25M FCFA : Chariots Électriques Solaires Marchés Urbains',
    category: 'FINANCING',
    categoryLabel: 'Recherche de Financement',
    status: 'PENDING',
    targetAmount: '25 000 000 FCFA',
    country: 'Bénin & Togo',
    authorName: 'Arnaud Dossou',
    authorCompany: 'E-Mobility Sahel',
    authorRole: 'Ingénieur & Fondateur',
    authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    summary: 'Prototype fonctionnel au marché Dantokpa de Cotonou. Requête déposée pour analyse de viabilité financière et vérification des brevets par le propriétaire du salon avant publication officielle.',
    createdAt: 'Aujourd’hui à 11h20',
    verifiedBadge: false,
    ndaRequired: true,
    metrics: {
      teamSize: 3
    }
  }
];

export const DEFAULT_VIP_1TO1_TYPES: Vip1to1ConsultationType[] = [
  {
    id: 'type-audit',
    title: 'Audit Stratégique & Due Diligence Express',
    description: 'Revue critique de votre pitch deck, plan de trésorerie ou contrat commercial avec recommandations immédiates.',
    durationMinutes: 45,
    priceLabel: 'Inclus dans votre abonnement VIP',
    iconName: 'ShieldCheck'
  },
  {
    id: 'type-closing',
    title: 'Session Closing & Négociation Haute Tension',
    description: 'Préparation tactique avant un entretien clé avec investisseur, partenaire stratégique ou banque.',
    durationMinutes: 60,
    priceLabel: 'Inclus dans votre abonnement VIP',
    iconName: 'Award'
  },
  {
    id: 'type-quick',
    title: 'Flash Advice Décisionnel 1-to-1',
    description: 'Résolution d’un blocage opérationnel urgent (litige, arbitrage, choix technologique ou juridique).',
    durationMinutes: 30,
    priceLabel: 'Inclus dans votre abonnement VIP',
    iconName: 'Zap'
  }
];

export const DEFAULT_VIP_1TO1_SLOTS: Vip1to1Slot[] = [
  { id: 's-1', date: '2026-10-16', time: '10:00 - 10:45', isAvailable: true },
  { id: 's-2', date: '2026-10-16', time: '14:30 - 15:15', isAvailable: false },
  { id: 's-3', date: '2026-10-16', time: '16:00 - 16:45', isAvailable: true },
  { id: 's-4', date: '2026-10-17', time: '09:30 - 10:15', isAvailable: true },
  { id: 's-5', date: '2026-10-17', time: '11:00 - 11:45', isAvailable: true },
  { id: 's-6', date: '2026-10-17', time: '15:00 - 15:45', isAvailable: false },
  { id: 's-7', date: '2026-10-19', time: '10:00 - 10:45', isAvailable: true },
  { id: 's-8', date: '2026-10-19', time: '17:00 - 17:45', isAvailable: true }
];

export const DEFAULT_VIP_LOUNGE_MEMBERS = [
  {
    id: 'mem-1',
    name: 'Ousmane Koné',
    company: 'SIFCA Trading',
    role: 'Directeur Général',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    country: "Côte d'Ivoire",
    isOnline: true,
    verifiedSolvency: true
  },
  {
    id: 'mem-2',
    name: 'Amina Diop',
    company: 'Diop & Partners Family Office',
    role: 'Managing Director',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    country: 'Sénégal',
    isOnline: true,
    verifiedSolvency: true
  },
  {
    id: 'mem-3',
    name: 'Maître Charles Edimo',
    company: 'Edimo & Associés',
    role: 'Avocat d’Affaires & Arbitre OHADA',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
    country: 'Cameroun',
    isOnline: false,
    verifiedSolvency: true
  },
  {
    id: 'mem-4',
    name: 'Dr. Mariama Sow',
    company: 'PharmaTech Afrique',
    role: 'Directrice Générale',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    country: 'Sénégal',
    isOnline: true,
    verifiedSolvency: true
  }
];


export default MOCK_VIP_BUSINESS_LOUNGES;
