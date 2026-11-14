import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  CreditCard,
  Award,
  MessageSquare,
  Settings,
  Search,
  Bell,
  User,
  Zap,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  Sparkles,
  ArrowRight,
  LogOut,
  Play,
  ShieldCheck,
  Menu,
  X,
  Flame,
  HelpCircle,
  Video,
  LayoutGrid,
  List,
  Filter,
  FileText,
  Printer,
  Download,
  Receipt,
  QrCode,
  Wallet,
  Share2,
  Send,
  MessageCircle,
  Check,
  Trophy,
  RotateCcw,
  CheckSquare,
  AlertTriangle,
  ShoppingBag,
  UploadCloud
} from 'lucide-react';
import { Course } from '../../../../../types';
import { DEFAULT_MASTERCLASS_COURSE } from '../mockCourses';
import { SEED_MARKETPLACE_COURSES } from '../../../../../services/marketplaceService';
import { playTapBeep } from '../../../../../utils/audio';

export type StudentDashboardTab = 
  | 'HUB'
  | 'COURSES'
  | 'QUIZZES'
  | 'PURCHASES'
  | 'CERTIFICATES'
  | 'MESSAGES'
  | 'SETTINGS';

export interface StudentPurchase {
  id: string; // Ex: '#NS-1092'
  courseId: string;
  courseTitle: string;
  campusName: string;
  instructorName: string;
  date: string;
  paymentMethod: string;
  transactionRef: string;
  amountNumber: number;
  amountFormatted: string;
  accessType: 'Accès à vie' | 'Abonnement actif';
  status: 'Validé';
  invoiceNumber: string;
}

export interface CertificateItem {
  id: string; // ex: 'CERT-2026-BF-948201'
  courseId: string;
  courseTitle: string;
  campusName: string;
  instructorName: string;
  instructorTitle: string;
  instructorAvatar: string;
  issueDate: string;
  grade: string;
  status: 'UNLOCKED' | 'IN_PROGRESS';
  progress: number;
  verificationHash: string;
  skills: string[];
}

export interface InterCampusNotification {
  id: string;
  campusId: string;
  campusName: string;
  courseId: string;
  courseTitle: string;
  lessonTitle: string;
  instructorName: string;
  instructorRole: string;
  instructorAvatar: string;
  questionAsked: string;
  answerContent: string;
  timestamp: string;
  isUnread: boolean;
  replies?: Array<{
    id: string;
    sender: 'student' | 'instructor';
    text: string;
    time: string;
  }>;
}

export interface StudentQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StudentQuiz {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  campusName: string;
  instructorName: string;
  durationMinutes: number;
  questionsCount: number;
  score: number | null;
  passed: boolean;
  minScoreToPass: number;
  completedAt?: string;
  certificateEligible: boolean;
  questions: StudentQuizQuestion[];
}

export const DEFAULT_STUDENT_QUIZZES: StudentQuiz[] = [
  {
    id: 'quiz-telecom-fintech',
    title: 'Quiz de Certification : Télécom, Monétique & Webhooks',
    courseId: 'telecom-fintech-masterclass',
    courseTitle: 'Masterclass Télécom, Monétique Mobile & E-Commerce',
    campusName: 'Campus : Ibrahim P. Konkobo',
    instructorName: 'Ibrahim Pousbila Konkobo',
    durationMinutes: 15,
    questionsCount: 4,
    score: null,
    passed: false,
    minScoreToPass: 80,
    certificateEligible: true,
    questions: [
      {
        id: 'q1',
        question: 'Quelle est la méthode recommandée pour sécuriser les notifications de paiement webhook Wave en environnement serveur ?',
        options: [
          'Comparer la signature HMAC-SHA256 transmise dans l\'en-tête avec le secret côté serveur avant tout traitement',
          'Faire confiance à l\'IP d\'envoi sans vérifier de signature cryptographique',
          'Exposer la clé privée Wave dans le code JavaScript côté client',
          'Désactiver la vérification SSL pour réduire le temps de latence réseau'
        ],
        correctIndex: 0,
        explanation: 'La signature HMAC-SHA256 permet de garantir l\'authenticité et l\'intégrité du payload webhook émis par Wave sans risque d\'usurpation.'
      },
      {
        id: 'q2',
        question: 'En cas de double notification webhook (retry automatique d\'Orange Money), comment éviter de créditer deux fois une commande ?',
        options: [
          'Supprimer la transaction de la base de données dès la première notification',
          'Mettre en place une clé d\'idempotence basée sur l\'ID de transaction unique de l\'opérateur',
          'Bloquer les adresses IP du serveur Orange Money',
          'Augmenter le délai de timeout à plus de 60 secondes'
        ],
        correctIndex: 1,
        explanation: 'L\'idempotence vérifie si l\'ID de transaction a déjà été traité avec succès, évitant ainsi tout double crédit ou doublon de commande.'
      },
      {
        id: 'q3',
        question: 'Quel canal garantit l\'exécution des transactions de paiement même en l\'absence de connexion 4G/Internet chez le client ?',
        options: [
          'WebSockets bidirectionnels WSS',
          'Session USSD opérateur sur canal réseau GSM dédié (*144#, *555#)',
          'Requête GraphQL over HTTP/3',
          'Appel WebRTC Peer-to-Peer'
        ],
        correctIndex: 1,
        explanation: 'Le canal USSD fonctionne sur le canal de signalisation GSM natif sans requérir de forfait data ni de connexion Internet.'
      },
      {
        id: 'q4',
        question: 'Quel est l\'avantage majeur d\'intégrer une passerelle de paiement en 1-Clic directement dans un tunnel e-commerce africain ?',
        options: [
          'Éliminer les abandons de panier dus aux redirections externes lentes et aux saisies fastidieuses de code',
          'Obliger le client à ouvrir un compte bancaire traditionnel',
          'Augmenter le coût des commissions de transaction',
          'Rendre la plateforme dépendante d\'un seul pays'
        ],
        correctIndex: 0,
        explanation: 'Le paiement 1-clic génère un deep-link direct vers l\'application Mobile Money (Wave, OM), réduisant l\'abandon de panier de plus de 45%.'
      }
    ]
  },
  {
    id: 'quiz-pos-resilience-offline',
    title: 'Examen Homologué : Architecture Caisses POS & Mode Déconnecté',
    courseId: 'course-pos-resilience-offline',
    courseTitle: 'Architecture Caisses Connectées & Mode Déconnecté (Offline-First)',
    campusName: 'Campus : Systèmes POS & Caisses',
    instructorName: 'Ing. Marc Ouedraogo',
    durationMinutes: 20,
    questionsCount: 4,
    score: 95,
    passed: true,
    minScoreToPass: 80,
    completedAt: '14 Octobre 2026',
    certificateEligible: true,
    questions: [
      {
        id: 'pos-q1',
        question: 'Quelle technologie de stockage navigateur est privilégiée pour persister des milliers de tickets de caisse en local sans connexion ?',
        options: [
          'IndexedDB avec wrapper asynchrone et indexation locale transactionnelle',
          'Cookies HTTP standards limités à 4 Ko',
          'SessionStorage temporaire vidé à la fermeture de l\'onglet',
          'Variables globales JavaScript en mémoire volatile'
        ],
        correctIndex: 0,
        explanation: 'IndexedDB offre plusieurs centaines de mégaoctets de stockage structuré et transactionnel persistant même après fermeture du terminal.'
      },
      {
        id: 'pos-q2',
        question: 'Lors de la synchronisation delta avec Firestore après 3 jours hors ligne, comment résoudre un conflit d\'inventaire ?',
        options: [
          'Écraser systématiquement la base centrale sans journal d\'audit',
          'Appliquer une réconciliation vectorielle basée sur le journal d\'événements (Event Sourcing) et ticket de régularisation',
          'Supprimer les ventes effectuées hors-ligne par précaution',
          'Forcer le caissier à ressaisir manuellement tous les tickets'
        ],
        correctIndex: 1,
        explanation: 'Le journal d\'événements garantit que chaque vente locale est rejouée séquentiellement, préservant la traçabilité comptable intégrale.'
      },
      {
        id: 'pos-q3',
        question: 'Quel protocole de communication est utilisé pour commander une imprimante ticket thermique sans pilote lourd ?',
        options: [
          'Commandes ESC/POS binaires via Web Bluetooth ou USB WebSerial direct',
          'Impression PostScript Adobe via serveur d\'impression cloud',
          'Export PDF puis envoi par email au client',
          'Capture d\'écran d\'image bitmap lourde'
        ],
        correctIndex: 0,
        explanation: 'Les octets de commande ESC/POS bruts permettent d\'imprimer instantanément en moins de 300ms sur n\'importe quelle imprimante thermique standard.'
      },
      {
        id: 'pos-q4',
        question: 'Pourquoi le mode Caissier autonome isole-t-il les fonctions comptables critiques par code PIN ?',
        options: [
          'Pour empêcher les modifications de prix et les clôtures de caisse non autorisées sans supervision du gérant',
          'Pour ralentir la cadence d\'encaissement aux heures de pointe',
          'Pour restreindre l\'accès à Internet sur la tablette',
          'Pour obliger le gérant à être physiquement présent à chaque vente'
        ],
        correctIndex: 0,
        explanation: 'Le cloisonnement par PIN assure la séparation stricte des privilèges : le caissier encaisse rapidement, tandis que le gérant contrôle les remises et les Z de caisse.'
      }
    ]
  },
  {
    id: 'quiz-live-shopping-mastery',
    title: 'Évaluation Pratique : Live Shopping & Vente Vidéo WhatsApp',
    courseId: 'course-live-shopping-mastery',
    courseTitle: 'Live Shopping & Vente Vidéo Interactive sur WhatsApp & Réseaux',
    campusName: 'Campus : Live Shopping & Social Selling',
    instructorName: 'Kadiatou Diallo',
    durationMinutes: 10,
    questionsCount: 4,
    score: null,
    passed: false,
    minScoreToPass: 80,
    certificateEligible: true,
    questions: [
      {
        id: 'ls-q1',
        question: 'À quel moment précis de la diffusion en direct l\'overlay d\'achat doit-il être activé pour maximiser la conversion ?',
        options: [
          'Immédiatement après la démonstration produit en conditions réelles (vers la 8e-12e minute)',
          'Dès la première seconde avant même de saluer l\'audience',
          'Uniquement à la fin du direct après que 80% des spectateurs ont quitté le live',
          'Jamais, il faut attendre le lendemain pour envoyer un message'
        ],
        correctIndex: 0,
        explanation: 'Activer le bouton d\'achat au pic émotionnel de la démonstration produit convertit le désir immédiat en encaissement instantané.'
      },
      {
        id: 'ls-q2',
        question: 'Quel est l\'intérêt de rediriger le panier live vers un lien direct WhatsApp pré-rempli ?',
        options: [
          'Créer une relation client personnalisée et finaliser la vente avec confirmation vocale immédiate',
          'Masquer le prix des produits aux autres acheteurs',
          'Éviter de collecter le numéro de téléphone de l\'acheteur',
          'Remplacer complètement la passerelle Mobile Money automatique'
        ],
        correctIndex: 0,
        explanation: 'Le message WhatsApp pré-rempli avec la référence du panier permet au vendeur de rassurer le client et d\'encaisser en 1 clic.'
      },
      {
        id: 'ls-q3',
        question: 'Quel levier psychologique stimule le passage à l\'action lors d\'un Live Shopping de mode ou d\'équipements ?',
        options: [
          'L\'urgence temporelle couplée à un stock ultra-limité visible en direct avec compteur décroissant',
          'Des descriptions techniques exhaustives de plus de 45 minutes',
          'L\'absence totale d\'interaction avec les commentaires des spectateurs',
          'Un prix fixé en devises étrangères non converties'
        ],
        correctIndex: 0,
        explanation: 'L\'effet de preuve sociale en direct et le compte à rebours de stock créent un sentiment d\'urgence légitime qui déclenche l\'achat immédiat.'
      },
      {
        id: 'ls-q4',
        question: 'Comment fidéliser un spectateur ayant abandonné son panier lors d\'un direct ?',
        options: [
          'Envoyer un rappel automatique avec un bonus exclusif ou les frais de livraison offerts sous 2 heures',
          'Bannir définitivement l\'utilisateur des prochains directs',
          'Augmenter le prix du produit dans son panier',
          'Ne rien faire et attendre son retour spontané'
        ],
        correctIndex: 0,
        explanation: 'Une relance chaleureuse dans les 2 heures avec un avantage exclusif récupère en moyenne plus de 30% des paniers abandonnés.'
      }
    ]
  },
  {
    id: 'quiz-fintech-security-kyc',
    title: 'Test de Conformité : Sécurité des Flux, Prévention Fraude & KYC',
    courseId: 'course-fintech-security-kyc',
    courseTitle: 'Sécurité des Transactions, Prévention Fraude & Conformité KYC',
    campusName: 'Campus : Sécurité & Conformité Réglementaire',
    instructorName: 'Cabinet Conformité & Risques',
    durationMinutes: 15,
    questionsCount: 4,
    score: null,
    passed: false,
    minScoreToPass: 80,
    certificateEligible: true,
    questions: [
      {
        id: 'sec-q1',
        question: 'Quelle est la fraude la plus fréquente ciblant les gérants de points de vente Mobile Money de proximité ?',
        options: [
          'Le faux SMS de confirmation de transfert imitant l\'expéditeur officiel de l\'opérateur',
          'L\'attaque par injection SQL directe sur la tablette du commerçant',
          'L\'interception satellite des ondes électromagnétiques',
          'Le minage secret de cryptomonnaies sur le terminal de caisse'
        ],
        correctIndex: 0,
        explanation: 'Les fraudeurs envoient un SMS personnalisé depuis un numéro lambda imitant le texte officiel. La règle d\'or est de TOUJOURS vérifier son solde réel.'
      },
      {
        id: 'sec-q2',
        question: 'Pour se prémunir d\'un faux SMS de paiement, quelle action le caissier doit-il TOUJOURS exécuter avant de remettre la marchandise ?',
        options: [
          'Consulter l\'application ou composer le code USSD pour confirmer l\'augmentation réelle de son solde',
          'Regarder uniquement la capture d\'écran présentée sur le téléphone du client',
          'Faire confiance à la parole du client s\'il semble pressé',
          'Imprimer un ticket sans vérifier l\'encaissement'
        ],
        correctIndex: 0,
        explanation: 'Seule la consultation du solde réel dans son application de caisse ou son portefeuille marchand garantit l\'effectivité des fonds.'
      },
      {
        id: 'sec-q3',
        question: 'Pourquoi la procédure KYC (Know Your Customer) exige-t-elle l\'enregistrement de la pièce d\'identité du client ?',
        options: [
          'Pour respecter la réglementation de la Banque Centrale (BCEAO/BEAC) contre le blanchiment et la fraude',
          'Pour revendre les informations personnelles à des fins publicitaires',
          'Pour empêcher le client de changer de numéro de téléphone',
          'Pour remplacer le mot de passe de son compte bancaire'
        ],
        correctIndex: 0,
        explanation: 'La conformité KYC est une obligation légale stricte protégeant l\'écosystème financier contre les comptes anonymes frauduleux.'
      },
      {
        id: 'sec-q4',
        question: 'En cas de suspicion de transaction frauduleuse sur un compte marchand, quel réflexe immédiat doit être adopté ?',
        options: [
          'Geler la transaction, alerter le support de conformité et consigner la trace dans le registre des incidents',
          'Valider le paiement pour ne pas contrarier l\'acheteur',
          'Éteindre le terminal de caisse et détruire la carte SIM',
          'Rembourser immédiatement en espèces sans trace écrite'
        ],
        correctIndex: 0,
        explanation: 'Geler la transaction et consigner les métadonnées permet une enquête rapide avec les services de conformité.'
      }
    ]
  }
];

interface StudentDashboardViewProps {
  studentName?: string;
  studentEmail?: string;
  onOpenClassroom?: (courseId: string) => void;
  onOpenCertificate?: (certificateId?: string) => void;
  onOpenMarketplace?: () => void;
  onBackToApp?: () => void;
  onLogout?: () => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  studentName: propStudentName,
  studentEmail: propStudentEmail,
  onOpenClassroom,
  onOpenCertificate,
  onOpenMarketplace,
  onBackToApp,
  onLogout
}) => {
  // Navigation active
  const [activeTab, setActiveTab] = useState<StudentDashboardTab>('HUB');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mode d'affichage Grille ou Liste (Spécification Prompt 2/4)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Filtre d'apprentissage des cours souscrits
  const [courseFilter, setCourseFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'CERTIFIED'>('ALL');

  // État du module Mes Achats & Reçus Nanasore (Spécification Prompt 3/4)
  const [selectedReceipt, setSelectedReceipt] = useState<StudentPurchase | null>(null);
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  // Module Quiz & Évaluations des cours souscrits
  const [quizzes, setQuizzes] = useState<StudentQuiz[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nana_student_quizzes');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (err) {
        console.warn('Erreur lecture quizzes localStorage:', err);
      }
    }
    return DEFAULT_STUDENT_QUIZZES;
  });

  const [activeQuizModal, setActiveQuizModal] = useState<StudentQuiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizFilter, setQuizFilter] = useState<'ALL' | 'PASSED' | 'PENDING'>('ALL');

  // Dropdown states
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Notifications refs for clicking outside
  const notifRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  // Étudiant résolu dynamiquement
  const [studentName, setStudentName] = useState<string>(() => {
    if (propStudentName) return propStudentName;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nana_student_name');
      if (stored && stored.trim()) return stored;
    }
    return 'Ibrahim Pousbila Konkobo';
  });

  const studentEmail = propStudentEmail || 'ibrahim.konkobo@nanasore.com';

  // Fermeture des dropdowns au clic externe
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
      if (messagesRef.current && !messagesRef.current.contains(target)) {
        setIsMessagesOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notifications simulées de l'académie
  const notifications = [
    {
      id: 'notif-1',
      title: 'Devoir pratique noté',
      description: 'M. Konkobo a validé votre étude de cas POS avec la note de 19/20.',
      time: 'Il y a 25 min',
      read: false,
      icon: Award,
      badgeColor: 'bg-emerald-500'
    },
    {
      id: 'notif-2',
      title: 'Session Live Q&R ce soir',
      description: 'Webinaire interactif sur l\'intégration Wave à 19h30 GMT.',
      time: 'Il y a 2 heures',
      read: false,
      icon: Video,
      badgeColor: 'bg-[#1D4ED8]'
    },
    {
      id: 'notif-3',
      title: 'Certificat émis & vérifiable',
      description: 'Votre diplôme en Architectures Caisses Connectées est disponible.',
      time: 'Hier',
      read: true,
      icon: ShieldCheck,
      badgeColor: 'bg-amber-500'
    }
  ];

  // Messages non lus
  const mockMessages = [
    {
      id: 'msg-1',
      sender: 'Ibrahim P. Konkobo',
      role: 'Formateur Principal',
      text: 'Excellente réponse au quiz sur la synchronisation IndexedDB !',
      time: '14:20',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      unread: true
    },
    {
      id: 'msg-2',
      sender: 'Support Pédagogique NaNa',
      role: 'Assistance Technique',
      text: 'Vos identifiants pour le simulateur de caisse ont été actualisés.',
      time: 'Hier',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
      unread: true
    }
  ];

  // Répertoire des Campus & Cours Souscrits (Prompt 2/4)
  const enrolledCourses = useMemo(() => {
    return [
      {
        ...DEFAULT_MASTERCLASS_COURSE,
        id: 'telecom-fintech-masterclass',
        campusName: 'Campus : Ibrahim P. Konkobo',
        instructorName: 'Ibrahim Pousbila Konkobo',
        instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        title: 'Masterclass Télécom, Monétique Mobile & E-Commerce',
        tagline: 'Maîtrisez les flux Mobile Money, les passerelles USSD et la vente hybride POS & Webinaire.',
        progress: 80,
        completedLessons: 19,
        totalLessons: 24,
        lastLessonTitle: 'Module 4 - Partie 3 : Orchestration des Webhooks Wave & Orange Money',
        lastAccessed: 'Aujourd\'hui à 11:42',
        category: 'Fintech & Mobile Money',
        durationLabel: '3h 15m • 6 Modules',
        coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
        trailerVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        status: 'in_progress' as const
      },
      {
        id: 'course-pos-resilience-offline',
        campusName: 'Campus : Systèmes POS & Caisses',
        instructorName: 'Ing. Marc Ouedraogo',
        instructorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
        title: 'Architecture Caisses Connectées & Mode Déconnecté (Offline-First)',
        tagline: 'Garantir 100% des encaissements en zone rurale ou coupure réseau avec synchronisation delta.',
        progress: 100,
        completedLessons: 16,
        totalLessons: 16,
        lastLessonTitle: 'Examen Final de Certification & Délivrance du Diplôme',
        lastAccessed: 'Hier',
        certificateId: 'CERT-2026-BF-948201',
        category: 'Systèmes POS & Matériel',
        durationLabel: '2h 20m • 4 Modules',
        coverImage: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1200&q=80',
        trailerVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
        status: 'completed' as const
      },
      {
        id: 'course-live-shopping-mastery',
        campusName: 'Campus : Live Shopping & Social Selling',
        instructorName: 'Kadiatou Diallo',
        instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
        title: 'Live Shopping & Vente Vidéo Interactive sur WhatsApp & Réseaux',
        tagline: 'Transformez vos diffusions directes en machine à encaisser avec panier 1-clic.',
        progress: 45,
        completedLessons: 6,
        totalLessons: 14,
        lastLessonTitle: 'Module 2 - Partie 3 : Scripting psychologique de l\'offre flash 1-clic',
        lastAccessed: 'Il y a 3 jours',
        category: 'Live Shopping & Vente',
        durationLabel: '1h 50m • 3 Modules',
        coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
        trailerVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        status: 'in_progress' as const
      },
      {
        id: 'course-fintech-security-kyc',
        campusName: 'Campus : Sécurité & Conformité Réglementaire',
        instructorName: 'Cabinet Conformité & Risques',
        instructorAvatar: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=300&q=80',
        title: 'Sécurité des Transactions, Prévention Fraude & Conformité KYC',
        tagline: 'Protéger son entreprise contre les arnaques aux faux SMS, le vol de SIM et respecter les normes bancaires.',
        progress: 25,
        completedLessons: 3,
        totalLessons: 12,
        lastLessonTitle: 'Module 1 - Partie 2 : Détection des faux SMS de confirmation',
        lastAccessed: 'Il y a 5 jours',
        category: 'Cybersécurité & Audit',
        durationLabel: '2h 15m • 4 Modules',
        coverImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
        trailerVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        status: 'in_progress' as const
      }
    ];
  }, []);

  // Filtrage des cours par statut et recherche
  const filteredCourses = useMemo(() => {
    return enrolledCourses.filter((course) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = course.title.toLowerCase().includes(q);
        const matchCampus = course.campusName.toLowerCase().includes(q);
        const matchInstructor = course.instructorName.toLowerCase().includes(q);
        const matchCategory = course.category.toLowerCase().includes(q);
        if (!matchTitle && !matchCampus && !matchInstructor && !matchCategory) return false;
      }

      if (courseFilter === 'IN_PROGRESS' && course.progress === 100) return false;
      if (courseFilter === 'COMPLETED' && course.progress < 100) return false;
      if (courseFilter === 'CERTIFIED' && !course.certificateId) return false;

      return true;
    });
  }, [enrolledCourses, searchQuery, courseFilter]);

  // Cours actif pour le widget de droite et le Hero
  const activeCourse = enrolledCourses[0];

  // Données des Achats & Souscriptions de l'étudiant
  const [studentPurchases, setStudentPurchases] = useState<StudentPurchase[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nana_student_purchases');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.warn('Erreur lecture purchases:', e);
      }
    }
    return [
      {
        id: '#NS-1092',
        courseId: 'telecom-fintech-masterclass',
        courseTitle: 'Masterclass Télécom, Monétique Mobile & E-Commerce',
        campusName: 'Campus : Ibrahim P. Konkobo',
        instructorName: 'Ibrahim Pousbila Konkobo',
        date: '19 Octobre 2026',
        paymentMethod: 'Wave (Mobile Money 1-Clic)',
        transactionRef: 'WAV-BF-89230198',
        amountNumber: 45000,
        amountFormatted: '45 000 FCFA',
        accessType: 'Accès à vie',
        status: 'Validé',
        invoiceNumber: 'FAC-2026-NS-1092'
      },
      {
        id: '#NS-1088',
        courseId: 'course-pos-resilience-offline',
        courseTitle: 'Architecture Caisses Connectées & Mode Déconnecté (Offline-First)',
        campusName: 'Campus : Systèmes POS & Caisses',
        instructorName: 'Ing. Marc Ouedraogo',
        date: '14 Octobre 2026',
        paymentMethod: 'Orange Money BF',
        transactionRef: 'OM-BF-77341902',
        amountNumber: 65000,
        amountFormatted: '65 000 FCFA',
        accessType: 'Accès à vie',
        status: 'Validé',
        invoiceNumber: 'FAC-2026-NS-1088'
      },
      {
        id: '#NS-1065',
        courseId: 'course-live-shopping-mastery',
        courseTitle: 'Live Shopping & Vente Vidéo Interactive sur WhatsApp & Réseaux',
        campusName: 'Campus : Live Shopping & Social Selling',
        instructorName: 'Kadiatou Diallo',
        date: '02 Octobre 2026',
        paymentMethod: 'CinetPay (Carte Visa / Mastercard)',
        transactionRef: 'CP-CI-44189021',
        amountNumber: 35000,
        amountFormatted: '35 000 FCFA',
        accessType: 'Abonnement actif',
        status: 'Validé',
        invoiceNumber: 'FAC-2026-NS-1065'
      },
      {
        id: '#NS-1040',
        courseId: 'course-fintech-security-kyc',
        courseTitle: 'Sécurité des Transactions, Prévention Fraude & Conformité KYC',
        campusName: 'Campus : Sécurité & Conformité Réglementaire',
        instructorName: 'Cabinet Conformité & Risques',
        date: '18 Septembre 2026',
        paymentMethod: 'Monero XMR (Crypto Décentralisée)',
        transactionRef: 'XMR-TX-883A09FB2',
        amountNumber: 25000,
        amountFormatted: '25 000 FCFA',
        accessType: 'Accès à vie',
        status: 'Validé',
        invoiceNumber: 'FAC-2026-NS-1040'
      }
    ];
  });

  // Calcul dynamique des métriques financières
  const totalInvested = useMemo(() => {
    return studentPurchases.reduce((acc, p) => acc + (p.amountNumber || 0), 0);
  }, [studentPurchases]);

  const activeSubscriptionsCount = useMemo(() => {
    return studentPurchases.filter(p => p.status === 'Validé').length;
  }, [studentPurchases]);

  const receiptsCount = useMemo(() => {
    return studentPurchases.filter(p => !!p.invoiceNumber).length;
  }, [studentPurchases]);

  // Filtrage des transactions financières
  const filteredPurchases = useMemo(() => {
    return studentPurchases.filter((p) => {
      if (purchaseSearch.trim()) {
        const q = purchaseSearch.toLowerCase();
        const matchId = p.id.toLowerCase().includes(q);
        const matchTitle = p.courseTitle.toLowerCase().includes(q);
        const matchInstructor = p.instructorName.toLowerCase().includes(q);
        const matchMethod = p.paymentMethod.toLowerCase().includes(q);
        if (!matchId && !matchTitle && !matchInstructor && !matchMethod) return false;
      }
      if (paymentFilter !== 'ALL') {
        if (paymentFilter === 'MOBILE_MONEY' && !p.paymentMethod.includes('Wave') && !p.paymentMethod.includes('Orange')) return false;
        if (paymentFilter === 'CARD' && !p.paymentMethod.includes('Carte') && !p.paymentMethod.includes('CinetPay')) return false;
        if (paymentFilter === 'CRYPTO' && !p.paymentMethod.includes('Monero')) return false;
      }
      return true;
    });
  }, [studentPurchases, purchaseSearch, paymentFilter]);

  // Toast feedback pour copie de lien de partage etc.
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtre actif de campus pour les notifications et messages inter-campus
  const [activeCampusFilter, setActiveCampusFilter] = useState<string>('ALL');

  // Champs de réponse rapide aux formateurs
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  // 1. Section "🏆 Mes Certificats" (Passeport d'Élite Nanasore)
  const certificatesList: CertificateItem[] = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nana_student_certificates');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.warn('Erreur lecture certificates:', e);
      }
    }

    // Calcul dynamique dérivé de l'avancement réel des cours souscrits
    return enrolledCourses.map((c, idx) => {
      const isCompleted = (c.progress || 0) >= 100;
      return {
        id: c.certificateId || (isCompleted ? `CERT-2026-${c.id.slice(0, 4).toUpperCase()}-${100000 + idx * 37}` : `CERT-IN-PROGRESS-${idx + 1}`),
        courseId: c.id,
        courseTitle: c.title,
        campusName: c.campusName || 'Campus Virtuel',
        instructorName: c.instructorName || 'Professeur Titulaire',
        instructorTitle: 'Instructeur Certifié • Entreprise Konkobo Pousbila',
        instructorAvatar: c.instructorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        issueDate: isCompleted ? (c.lastAccessed || 'Validé avec succès') : 'Délivrance à 100%',
        grade: isCompleted ? '98% (Mention d\'Excellence)' : `${c.progress}% validé (reste ${100 - c.progress}%)`,
        status: isCompleted ? ('UNLOCKED' as const) : ('IN_PROGRESS' as const),
        progress: c.progress || 0,
        verificationHash: isCompleted ? `0x${c.id.slice(0, 6)}...cert${idx + 1}` : 'Verrouillé',
        skills: ['Maîtrise Opérationnelle', 'Validation des Compétences']
      };
    });
  }, [enrolledCourses]);

  // 2. Section "💬 Messages & Notifications Inter-Campus" (Prompt 4/4)
  const [interCampusNotifications, setInterCampusNotifications] = useState<InterCampusNotification[]>([
    {
      id: 'ic-notif-1',
      campusId: 'campus-konkobo',
      campusName: 'Campus : Ibrahim P. Konkobo',
      courseId: 'telecom-fintech-masterclass',
      courseTitle: 'Masterclass Télécom, Monétique Mobile & E-Commerce',
      lessonTitle: 'Module 4 - Partie 3 : Orchestration des Webhooks Wave & Orange Money',
      instructorName: 'Ibrahim Pousbila Konkobo',
      instructorRole: 'Formateur Principal',
      instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      questionAsked: 'Comment sécuriser la signature HMAC-SHA256 du webhook Wave en environnement serveur sans exposer la clé secrète ?',
      answerContent: 'Bonjour Ibrahim ! Pour la signature HMAC, conservez impérativement la variable d\'environnement WAVE_WEBHOOK_SECRET sur votre serveur Node/Firebase Functions. Vérifiez l\'en-tête X-Wave-Signature avant de parser le payload brut (raw body). J\'ai également déposé un snippet d\'exemple directement dans les ressources du Module 4.',
      timestamp: 'Il y a 15 minutes',
      isUnread: true,
      replies: []
    },
    {
      id: 'ic-notif-2',
      campusId: 'campus-pos',
      campusName: 'Campus : Systèmes POS & Caisses',
      courseId: 'course-pos-resilience-offline',
      courseTitle: 'Architecture Caisses Connectées & Mode Déconnecté',
      lessonTitle: 'Module 3 - Synchronisation Delta IndexedDB vers Firebase Firestore',
      instructorName: 'Ing. Marc Ouedraogo',
      instructorRole: 'Ingénieur Systèmes POS',
      instructorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      questionAsked: 'En cas de reconnexion après 3 jours hors-ligne, quel est l\'ordre de résolution des conflits pour les stocks de caisse ?',
      answerContent: 'Excellente question. Nous appliquons la stratégie Last-Write-Wins avec un timestamp NTP vectoriel sur les lignes de vente, mais pour les stocks négatifs, le terminal génère un ticket de régularisation automatique d\'inventaire.',
      timestamp: 'Il y a 2 heures',
      isUnread: true,
      replies: []
    },
    {
      id: 'ic-notif-3',
      campusId: 'campus-live',
      campusName: 'Campus : Live Shopping & Social Selling',
      courseId: 'course-live-shopping-mastery',
      courseTitle: 'Live Shopping & Vente Vidéo Interactive',
      lessonTitle: 'Module 2 - Partie 3 : Scripting psychologique de l\'offre flash',
      instructorName: 'Kadiatou Diallo',
      instructorRole: 'Coach Social Selling',
      instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      questionAsked: 'Quel est le délai idéal pour afficher le bouton d\'achat 1-clic pendant le live stream ?',
      answerContent: 'Bonjour ! Déclenchez l\'apparition de l\'overlay d\'achat exactement entre la 8e et la 12e minute du live, immédiatement après la démonstration produit. Vos taux de conversion doubleront.',
      timestamp: 'Hier à 16:40',
      isUnread: false,
      replies: []
    },
    {
      id: 'ic-notif-4',
      campusId: 'campus-securite',
      campusName: 'Campus : Sécurité & Conformité Réglementaire',
      courseId: 'course-fintech-security-kyc',
      courseTitle: 'Sécurité des Transactions & Conformité KYC',
      lessonTitle: 'Module 1 - Partie 2 : Détection des faux SMS de confirmation',
      instructorName: 'Cabinet Conformité & Risques',
      instructorRole: 'Auditeur Certifié',
      instructorAvatar: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=300&q=80',
      questionAsked: 'Les commerçants de proximité peuvent-ils automatiser la vérification par regex ?',
      answerContent: 'Oui, l\'application NaNasore intègre désormais un parseur heuristique qui vérifie l\'expéditeur officiel de l\'opérateur ainsi que le solde avant validation du reçu.',
      timestamp: 'Il y a 3 jours',
      isUnread: false,
      replies: []
    }
  ]);

  // Actions pour les Certificats
  const handleShareCertificate = (cert: CertificateItem) => {
    playTapBeep();
    const shareUrl = `${window.location.origin}/certificat?id=${encodeURIComponent(cert.id)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setToastMessage(`Lien de vérification copié : ${cert.id}`);
        setTimeout(() => setToastMessage(null), 3500);
      });
    } else {
      setToastMessage(`Lien : ${shareUrl}`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleDownloadCertificateHD = (cert: CertificateItem) => {
    playTapBeep();
    if (onOpenCertificate) {
      onOpenCertificate(cert.id);
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/certificat?id=${encodeURIComponent(cert.id)}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Actions pour les Notifications Inter-Campus
  const handleMarkAsRead = (notifId: string) => {
    playTapBeep();
    setInterCampusNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isUnread: false } : n));
  };

  const handleSendReply = (notifId: string) => {
    const text = replyInputs[notifId];
    if (!text || !text.trim()) return;
    playTapBeep();
    setInterCampusNotifications(prev => prev.map(n => {
      if (n.id === notifId) {
        return {
          ...n,
          isUnread: false,
          replies: [
            ...(n.replies || []),
            {
              id: `rep-${Date.now()}`,
              sender: 'student',
              text: text.trim(),
              time: 'À l\'instant'
            }
          ]
        };
      }
      return n;
    }));
    setReplyInputs(prev => ({ ...prev, [notifId]: '' }));
    setToastMessage('Votre message a été transmis directement au formateur.');
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Actions de navigation vers le lecteur du campus
  const handleOpenCourseCampus = (courseId: string) => {
    playTapBeep();
    if (onOpenClassroom) {
      onOpenClassroom(courseId);
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/classroom/${courseId}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleResumeLastCourse = () => {
    handleOpenCourseCampus(activeCourse.id);
  };

  const handleOpenCertificatesPage = () => {
    playTapBeep();
    if (onOpenCertificate) {
      onOpenCertificate();
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/certificat');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Accès au Marketplace Next-Gen pour souscrire à des cours
  const handleOpenMarketplace = () => {
    playTapBeep();
    if (onOpenMarketplace) {
      onOpenMarketplace();
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/catalog');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Actions du module Quiz & Évaluations
  const handleStartQuiz = (quiz: StudentQuiz) => {
    playTapBeep();
    setActiveQuizModal(quiz);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  };

  const handleSelectQuizOption = (questionId: string, optionIndex: number) => {
    playTapBeep();
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleSubmitQuiz = () => {
    if (!activeQuizModal) return;
    playTapBeep();

    const totalQuestions = activeQuizModal.questions.length;
    const answeredCount = Object.keys(quizAnswers).length;
    if (answeredCount < totalQuestions) {
      setToastMessage(`Veuillez répondre à toutes les questions (${answeredCount}/${totalQuestions}) avant de valider.`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    let correctCount = 0;
    activeQuizModal.questions.forEach(q => {
      if (quizAnswers[q.id] === q.correctIndex) {
        correctCount++;
      }
    });

    const calculatedScore = Math.round((correctCount / totalQuestions) * 100);
    const passed = calculatedScore >= activeQuizModal.minScoreToPass;

    setQuizScore(calculatedScore);
    setQuizSubmitted(true);

    const updatedQuizzes = quizzes.map(q => {
      if (q.id === activeQuizModal.id) {
        return {
          ...q,
          score: calculatedScore,
          passed: passed,
          completedAt: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        };
      }
      return q;
    });

    setQuizzes(updatedQuizzes);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nana_student_quizzes', JSON.stringify(updatedQuizzes));
      } catch (err) {
        console.warn('Erreur sauvegarde quizzes localStorage:', err);
      }
    }

    if (passed) {
      setToastMessage(`🎉 Félicitations ! Quiz validé avec ${calculatedScore}%. Votre certificat est débloqué !`);
    } else {
      setToastMessage(`Score : ${calculatedScore}%. Seuil de validation : ${activeQuizModal.minScoreToPass}%. Réessayez !`);
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleResetQuiz = () => {
    playTapBeep();
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] font-sans flex flex-col antialiased selection:bg-[#1D4ED8] selection:text-white">
      {/* ========================================================= */}
      {/* 1. HEADER SUPÉRIEUR ÉPURÉ (TOP BAR)                      */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {/* Gauche : Bouton menu mobile + Logo & Badge */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsMobileSidebarOpen(!isMobileSidebarOpen);
            }}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-[#0F172A] hover:bg-slate-100 transition"
            aria-label="Ouvrir le menu"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div 
            onClick={() => {
              playTapBeep();
              setActiveTab('HUB');
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1D4ED8] to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-900/10 transition group-hover:scale-105">
              N
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-[#0F172A]">
                  NaNa<span className="text-[#1D4ED8]">sore</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-[#1D4ED8] border border-blue-200">
                  Campus Privé
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Tableau de Bord Étudiant Élite
              </p>
            </div>
          </div>
        </div>

        {/* Centre : Barre de recherche globale */}
        <div className="flex-1 max-w-xl mx-2 sm:mx-6">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un cours, un formateur, une compétence..."
              className="w-full bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl pl-10 pr-12 py-2 text-xs sm:text-sm text-[#0F172A] placeholder:text-slate-400 focus:bg-white focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 focus:outline-none transition shadow-inner"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white border border-[#E2E8F0] px-1.5 py-0.5 rounded-md shadow-2xs pointer-events-none">
              <span>⌘</span>
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Droite : Widgets d'accès rapide (Marketplace, Notifications, Messages, Profil) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Bouton Accès Marketplace Next-Gen (Souscrire à des cours) */}
          <button
            type="button"
            onClick={handleOpenMarketplace}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs hover:shadow-md transition active:scale-95 cursor-pointer"
            title="Accéder au Next-Gen Marketplace pour explorer et souscrire à de nouveaux cours"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden md:inline">Marketplace Next-Gen</span>
            <span className="md:hidden">Marketplace</span>
          </button>

          {/* Widget Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsMessagesOpen(false);
                setIsProfileMenuOpen(false);
              }}
              className="relative p-2 sm:p-2.5 rounded-xl text-slate-600 hover:text-[#0F172A] hover:bg-slate-100 transition cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            {/* Panneau déroulant Notifications */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl py-3 z-50 animate-fade-in">
                <div className="px-4 pb-2 border-b border-[#E2E8F0] flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                    Notifications
                  </h4>
                  <span className="text-[10px] font-bold text-[#1D4ED8] cursor-pointer hover:underline">
                    Tout marquer comme lu
                  </span>
                </div>
                <div className="divide-y divide-[#E2E8F0]/60 max-h-80 overflow-y-auto">
                  {notifications.map((n) => {
                    const Icon = n.icon;
                    return (
                      <div
                        key={n.id}
                        className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3 ${
                          !n.read ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <div className={`p-2 rounded-xl text-white ${n.badgeColor} shrink-0 mt-0.5`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#0F172A] line-clamp-1">{n.title}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">{n.description}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Widget Messages */}
          <div className="relative" ref={messagesRef}>
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsMessagesOpen(!isMessagesOpen);
                setIsNotificationsOpen(false);
                setIsProfileMenuOpen(false);
              }}
              className="relative p-2 sm:p-2.5 rounded-xl text-slate-600 hover:text-[#0F172A] hover:bg-slate-100 transition cursor-pointer"
              title="Messages du tuteur et formateur"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1D4ED8] ring-2 ring-white" />
            </button>

            {/* Panneau déroulant Messages */}
            {isMessagesOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl py-3 z-50 animate-fade-in">
                <div className="px-4 pb-2 border-b border-[#E2E8F0] flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                    Discussions Pédagogiques
                  </h4>
                  <span 
                    onClick={() => {
                      setIsMessagesOpen(false);
                      setActiveTab('MESSAGES');
                    }}
                    className="text-[10px] font-bold text-[#1D4ED8] cursor-pointer hover:underline"
                  >
                    Voir tout
                  </span>
                </div>
                <div className="divide-y divide-[#E2E8F0]/60 max-h-80 overflow-y-auto">
                  {mockMessages.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        setIsMessagesOpen(false);
                        setActiveTab('MESSAGES');
                      }}
                      className="p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3"
                    >
                      <img
                        src={m.avatar}
                        alt={m.sender}
                        className="w-9 h-9 rounded-full object-cover border border-[#E2E8F0] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-[#0F172A] truncate">{m.sender}</p>
                          <span className="text-[10px] text-slate-400">{m.time}</span>
                        </div>
                        <p className="text-[10px] text-[#1D4ED8] font-semibold">{m.role}</p>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-[#E2E8F0] hidden sm:block mx-1" />

          {/* Widget Avatar & Profil Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsProfileMenuOpen(!isProfileMenuOpen);
                setIsNotificationsOpen(false);
                setIsMessagesOpen(false);
              }}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl hover:bg-slate-100 transition cursor-pointer border border-transparent hover:border-[#E2E8F0]"
            >
              <div className="relative">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#1D4ED8] to-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-xs">
                  {studentName.charAt(0)}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-[#0F172A] leading-tight line-clamp-1 max-w-[120px]">
                  {studentName.split(' ')[0]} {studentName.split(' ')[1]?.[0]}.
                </p>
                <p className="text-[10px] text-slate-500 font-medium">Étudiant Certifié</p>
              </div>
            </button>

            {/* Menu Déroulant Profil */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl py-2 z-50 animate-fade-in divide-y divide-[#E2E8F0]/80">
                <div className="px-4 py-3">
                  <p className="text-xs font-bold text-[#0F172A]">{studentName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{studentEmail}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Compte Étudiant Actif</span>
                  </div>
                </div>

                <div className="py-1.5">
                  <a
                    href="/academic/upload?role=etudiant"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full text-left px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 flex items-center gap-2.5 transition"
                  >
                    <UploadCloud className="w-4 h-4 text-blue-700" />
                    <span>Déposer un Devoir / Rendu (R2)</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setActiveTab('COURSES');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#1D4ED8] flex items-center gap-2.5 transition"
                  >
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    <span>Mes Formations en cours</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleOpenCertificatesPage();
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#1D4ED8] flex items-center gap-2.5 transition"
                  >
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Mes Diplômes &amp; QR Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setActiveTab('SETTINGS');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#1D4ED8] flex items-center gap-2.5 transition"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Préférences &amp; Sécurité</span>
                  </button>
                </div>

                <div className="py-1.5">
                  {onOpenMarketplace && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenMarketplace();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                    >
                      <Sparkles className="w-4 h-4 text-rose-500" />
                      <span>Catalogue Marketplace</span>
                    </button>
                  )}

                  {onBackToApp && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onBackToApp();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                    >
                      <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                      <span>Hub Central &amp; POS</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      if (onLogout) onLogout();
                      else if (typeof window !== 'undefined') {
                        window.location.href = '/';
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* CORPS PRINCIPAL : LAYOUT 3-COLONNES RÉACTIF               */}
      {/* ========================================================= */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* ======================================================= */}
        {/* COLONNE 1 : SIDEBAR DE NAVIGATION (GAUCHE)               */}
        {/* ======================================================= */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E2E8F0] transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto flex flex-col justify-between shrink-0 shadow-[1px_0_2px_rgba(0,0,0,0.02)] ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Haut de la sidebar */}
          <div className="p-4 space-y-6">
            {/* Header mobile de la sidebar */}
            <div className="flex items-center justify-between lg:hidden pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#1D4ED8] text-white flex items-center justify-center font-black">
                  N
                </div>
                <span className="font-extrabold text-sm text-[#0F172A]">Menu Étudiant</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu des Liens Actifs avec Indicateur Bleu Royal */}
            <nav className="space-y-1.5">
              {[
                { id: 'HUB', label: 'Mon Hub', icon: LayoutDashboard },
                { id: 'COURSES', label: 'Mes Cours', icon: BookOpen, badge: '3' },
                { id: 'QUIZZES', label: 'Mes Quiz', icon: HelpCircle, badge: `${quizzes.filter(q => q.passed).length}/${quizzes.length}`, badgeColor: 'bg-emerald-100 text-emerald-800' },
                { id: 'PURCHASES', label: 'Mes Achats', icon: CreditCard },
                { id: 'CERTIFICATES', label: 'Certificats', icon: Award, badge: '2', badgeColor: 'bg-amber-100 text-amber-800' },
                { id: 'MESSAGES', label: 'Messages', icon: MessageSquare, badge: '2', badgeColor: 'bg-blue-100 text-[#1D4ED8]' },
                { id: 'SETTINGS', label: 'Réglages', icon: Settings }
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setActiveTab(item.id as StudentDashboardTab);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer relative ${
                      isActive
                        ? 'bg-blue-50 text-[#1D4ED8] shadow-xs'
                        : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-50'
                    }`}
                  >
                    {/* Indicateur Bleu Royal gauche */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#1D4ED8] rounded-r-full" />
                    )}

                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-[#1D4ED8]' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Raccourci Marketplace dans la sidebar */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenMarketplace}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 hover:border-[#1D4ED8] transition text-left group cursor-pointer shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#1D4ED8]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Marketplace Next-Gen</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                    Souscrire à de nouveaux cours
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#1D4ED8] group-hover:translate-x-1 transition shrink-0" />
              </button>
            </div>
          </div>

          {/* Bas de la sidebar : Salle de classe directe & Infos de conformité */}
          <div className="p-4 border-t border-[#E2E8F0] space-y-3 bg-slate-50/50">
            {/* Raccourci vers la Salle de Classe Interactive */}
            <button
              type="button"
              onClick={handleResumeLastCourse}
              className="w-full p-3 rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#1D4ED8]/40 hover:shadow-md transition text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1D4ED8] flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Campus Virtuel
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs font-bold text-[#0F172A] group-hover:text-[#1D4ED8] transition leading-tight">
                Entrer dans ma classe
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mode focus &amp; devoirs corrigés
              </p>
            </button>

            {/* Profil rapide en bas */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1 font-semibold text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Matricule vérifié
              </span>
              <span className="font-mono text-[10px] text-slate-400">#NA-8492</span>
            </div>
          </div>
        </aside>

        {/* Overlay mobile pour fermer la sidebar */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* ======================================================= */}
        {/* COLONNE 2 : ZONE CENTRALE PRINCIPALE                    */}
        {/* ======================================================= */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          {/* ===================================================== */}
          {/* 3. HERO BANNER DE HAUT NIVEAU                          */}
          {/* ===================================================== */}
          <div className="relative bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
            {/* Décoration d'arrière-plan très subtile */}
            <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-blue-50/70 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Salutation dynamique et sous-titre */}
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#1D4ED8] text-xs font-bold mb-1">
                  <Flame className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  <span>Série d'assiduité : 5 jours consécutifs</span>
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                  👋 Ravi de vous revoir, <span className="text-[#1D4ED8]">{studentName}</span> !
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                  Continuez votre montée en compétences aujourd'hui. Vos formateurs ont déposé 2 nouvelles corrections.
                </p>
              </div>

              {/* Boutons d'action principaux (Reprendre cours & Marketplace) */}
              <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleResumeLastCourse}
                  className="px-5 py-3.5 rounded-2xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-extrabold text-xs sm:text-sm transition-all duration-150 shadow-lg shadow-blue-700/20 active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer group"
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300 group-hover:scale-110 transition" />
                  <span>⚡ Reprendre mon dernier cours</span>
                  <ArrowRight className="w-4 h-4 text-blue-200 group-hover:translate-x-1 transition" />
                </button>

                <button
                  type="button"
                  onClick={handleOpenMarketplace}
                  className="px-4 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0F172A] border border-[#E2E8F0] hover:border-[#1D4ED8]/40 font-bold text-xs sm:text-sm shadow-xs transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <ShoppingBag className="w-4 h-4 text-[#1D4ED8] group-hover:scale-110 transition" />
                  <span>Explorer le Marketplace</span>
                </button>

                <a
                  href="/academic/upload?role=etudiant"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3.5 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-700/20 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer group"
                  title="Déposer un devoir ou projet dans le coffre académique R2 (Compression ZIP)"
                >
                  <UploadCloud className="w-4 h-4 text-blue-200 group-hover:scale-110 transition" />
                  <span>Dépôt Devoir R2</span>
                </a>
              </div>
            </div>

            {/* 4 Badges Métriques Épurés en Blanc Pur */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-[#E2E8F0]">
              {/* Badge 1 : Cours Actifs */}
              <div 
                onClick={() => {
                  playTapBeep();
                  setActiveTab('COURSES');
                }}
                className="bg-white border border-[#E2E8F0] p-3.5 sm:p-4 rounded-2xl shadow-xs hover:border-[#1D4ED8]/30 transition cursor-pointer flex items-center gap-3 sm:gap-3.5"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-[#1D4ED8] shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-lg sm:text-2xl font-black text-[#0F172A]">3</span>
                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-[#1D4ED8]">
                      En cours
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500">Cours Actifs</p>
                </div>
              </div>

              {/* Badge 2 : Progression Globale */}
              <div className="bg-white border border-[#E2E8F0] p-3.5 sm:p-4 rounded-2xl shadow-xs flex items-center gap-3 sm:gap-3.5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-lg sm:text-2xl font-black text-[#0F172A]">74%</span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 hidden sm:inline">
                      +12% sem.
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '74%' }} />
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mt-1">Progression</p>
                </div>
              </div>

              {/* Badge 3 : Mes Quiz & Tests */}
              <div
                onClick={() => {
                  playTapBeep();
                  setActiveTab('QUIZZES');
                }}
                className="bg-white border border-[#E2E8F0] p-3.5 sm:p-4 rounded-2xl shadow-xs hover:border-emerald-400/40 transition cursor-pointer flex items-center gap-3 sm:gap-3.5"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600 shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-lg sm:text-2xl font-black text-[#0F172A]">
                      {quizzes.filter(q => q.passed).length}/{quizzes.length}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800">
                      Tests
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500">Quiz Validés</p>
                </div>
              </div>

              {/* Badge 4 : Certificats Obtenus */}
              <div
                onClick={handleOpenCertificatesPage}
                className="bg-white border border-[#E2E8F0] p-3.5 sm:p-4 rounded-2xl shadow-xs hover:border-amber-400/40 transition cursor-pointer flex items-center gap-3 sm:gap-3.5"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-lg sm:text-2xl font-black text-[#0F172A]">2</span>
                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                      Homologués
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500">Certificats</p>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================== */}
          {/* CONTENU CENTRAL DYNAMIQUE SELON L'ONGLET ACTIF         */}
          {/* ===================================================== */}
          {/* ===================================================== */}
          {/* CONTENU CENTRAL DYNAMIQUE SELON L'ONGLET ACTIF         */}
          {/* ===================================================== */}
          {activeTab === 'HUB' && (
            <div className="space-y-6">
              {/* ===================================================== */}
              {/* SECTION : MES CAMPUS & COURS SOUSCRITS (Prompt 2/4)   */}
              {/* ===================================================== */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#1D4ED8]" />
                      <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A] tracking-tight">
                        MES CAMPUS &amp; COURS SOUSCRITS
                      </h3>
                      <span className="text-xs font-bold text-[#1D4ED8] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                        {filteredCourses.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Retrouvez toutes vos inscriptions académiques et reprenez directement dans le campus de chaque formateur.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {/* Filtres de statut */}
                    <div className="inline-flex items-center bg-white border border-[#E2E8F0] p-1 rounded-xl shadow-xs text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setCourseFilter('ALL');
                        }}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          courseFilter === 'ALL'
                            ? 'bg-[#1D4ED8] text-white'
                            : 'text-slate-600 hover:text-[#0F172A]'
                        }`}
                      >
                        Tous
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setCourseFilter('IN_PROGRESS');
                        }}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          courseFilter === 'IN_PROGRESS'
                            ? 'bg-[#1D4ED8] text-white'
                            : 'text-slate-600 hover:text-[#0F172A]'
                        }`}
                      >
                        En cours
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setCourseFilter('COMPLETED');
                        }}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          courseFilter === 'COMPLETED'
                            ? 'bg-[#1D4ED8] text-white'
                            : 'text-slate-600 hover:text-[#0F172A]'
                        }`}
                      >
                        Terminés
                      </button>
                    </div>

                    {/* Bascule Grille / Liste */}
                    <div className="inline-flex items-center bg-white border border-[#E2E8F0] p-1 rounded-xl shadow-xs">
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setViewMode('grid');
                        }}
                        title="Vue Grille"
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          viewMode === 'grid'
                            ? 'bg-[#1D4ED8] text-white'
                            : 'text-slate-500 hover:text-[#0F172A]'
                        }`}
                        aria-label="Vue Grille"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setViewMode('list');
                        }}
                        title="Vue Liste"
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          viewMode === 'list'
                            ? 'bg-[#1D4ED8] text-white'
                            : 'text-slate-500 hover:text-[#0F172A]'
                        }`}
                        aria-label="Vue Liste"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Affichage des Cartes : Grille ou Liste */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredCourses.map((course) => (
                      <div
                        key={course.id}
                        className="bg-white border border-[#E2E8F0] rounded-3xl overflow-hidden shadow-xs hover:border-[#1D4ED8]/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                      >
                        {/* a. Miniature du cours avec badge Bleu Royal en surimpression : "Campus : [Nom du Formateur/Campus]" */}
                        <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                          <img
                            src={course.coverImage}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/30 pointer-events-none" />

                          {/* Badge Bleu Royal en surimpression : "Campus : [Nom du Formateur/Campus]" */}
                          <div className="absolute top-3 left-3 z-10">
                            <span className="px-3 py-1 rounded-full bg-[#1D4ED8] text-white text-[11px] font-extrabold shadow-md flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>{course.campusName}</span>
                            </span>
                          </div>

                          {/* Badge Catégorie */}
                          <div className="absolute top-3 right-3 z-10">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold border border-white/10">
                              {course.category}
                            </span>
                          </div>

                          {/* Play overlay au centre */}
                          <button
                            type="button"
                            onClick={() => handleOpenCourseCampus(course.id)}
                            className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-white/95 hover:bg-[#1D4ED8] text-[#1D4ED8] hover:text-white flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110 cursor-pointer"
                            aria-label={`Ouvrir ${course.title}`}
                          >
                            <Play className="w-5 h-5 ml-0.5 fill-current" />
                          </button>
                        </div>

                        {/* Corps de la carte en Blanc Pur */}
                        <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <img
                                src={course.instructorAvatar}
                                alt={course.instructorName}
                                className="w-5 h-5 rounded-full object-cover border border-[#E2E8F0]"
                              />
                              <span className="text-xs font-semibold text-slate-500 truncate">
                                {course.instructorName}
                              </span>
                            </div>

                            {/* b. Titre du cours en typographie Slate Sombre (#0F172A) bien lisible */}
                            <h4 className="text-base font-extrabold text-[#0F172A] leading-snug line-clamp-2 group-hover:text-[#1D4ED8] transition">
                              {course.title}
                            </h4>
                          </div>

                          {/* d. Titre de la dernière leçon suivie */}
                          <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <Clock className="w-3 h-3 text-[#1D4ED8]" />
                              <span>Progression académique</span>
                            </div>
                            <p className="text-xs font-bold text-[#0F172A] truncate">
                              Dernière leçon : {course.lastLessonTitle}
                            </p>
                          </div>

                          {/* c. Barre de progression linéaire élégante en Bleu Royal (#1D4ED8) avec affichage du pourcentage */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-600">
                                {course.completedLessons}/{course.totalLessons} leçons validées
                              </span>
                              <span className="text-[#1D4ED8] font-black">{course.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#1D4ED8] h-full rounded-full transition-all duration-500"
                                style={{ width: `${course.progress}%` }}
                              />
                            </div>
                          </div>

                          {/* e. Bouton d'action épuré : "Accéder au Campus Privé →" */}
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => handleOpenCourseCampus(course.id)}
                              className="w-full py-3 px-4 rounded-xl bg-blue-50 hover:bg-[#1D4ED8] text-[#1D4ED8] hover:text-white font-extrabold text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-2 group/btn cursor-pointer border border-blue-200/80 hover:border-[#1D4ED8] shadow-xs active:scale-[0.99]"
                            >
                              <span>Accéder au Campus Privé →</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Vue Liste */
                  <div className="space-y-3.5">
                    {filteredCourses.map((course) => (
                      <div
                        key={course.id}
                        className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#1D4ED8]/40 hover:shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0 flex-1">
                          {/* Miniature avec badge surimpression */}
                          <div className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-[#E2E8F0]">
                            <img
                              src={course.coverImage}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute top-2 left-2 z-10">
                              <span className="px-2 py-0.5 rounded-full bg-[#1D4ED8] text-white text-[9px] font-extrabold shadow flex items-center gap-1">
                                {course.campusName}
                              </span>
                            </div>
                          </div>

                          {/* Info centrale */}
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-[#1D4ED8] border border-blue-200">
                                {course.category}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium truncate">
                                Par {course.instructorName}
                              </span>
                            </div>

                            <h4 className="text-sm sm:text-base font-bold text-[#0F172A] truncate group-hover:text-[#1D4ED8] transition">
                              {course.title}
                            </h4>

                            <p className="text-xs text-slate-600 font-medium truncate">
                              Dernière leçon : {course.lastLessonTitle}
                            </p>

                            {/* Barre de progression */}
                            <div className="space-y-1 max-w-md pt-1">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span className="text-slate-500">Progression</span>
                                <span className="text-[#1D4ED8]">{course.progress}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-[#1D4ED8] h-full rounded-full"
                                  style={{ width: `${course.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bouton d'action */}
                        <div className="shrink-0 self-stretch sm:self-center flex sm:flex-col justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenCourseCampus(course.id)}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-[#1D4ED8] text-[#1D4ED8] hover:text-white font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-blue-200 hover:border-[#1D4ED8] shadow-xs"
                          >
                            <span>Accéder au Campus Privé →</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Raccourci vers les Certificats & Attestations */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A]">
                      Vos Certificats Officiels avec QR Code Infalsifiable
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Générés en haute résolution 300 DPI, téléchargeables en PDF A4 et signés par l'ENTREPRISE KONKOBO POUSBILA.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCertificatesPage}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0"
                >
                  <Award className="w-4 h-4" />
                  <span>Consulter mes diplômes</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'COURSES' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-[#0F172A]">Répertoire Complet de vos Souscriptions</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Accédez à tous vos campus enregistrés, vos leçons vidéos et vos modules de certification.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleOpenMarketplace}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>+ Souscrire à un cours</span>
                  </button>

                  <div className="inline-flex items-center bg-[#F8F9FA] border border-[#E2E8F0] p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        viewMode === 'grid' ? 'bg-[#1D4ED8] text-white' : 'text-slate-500'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        viewMode === 'list' ? 'bg-[#1D4ED8] text-white' : 'text-slate-500'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Rendu des cours */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredCourses.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white border border-[#E2E8F0] rounded-3xl overflow-hidden shadow-xs hover:border-[#1D4ED8]/40 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                        <img src={c.coverImage} alt={c.title} className="w-full h-full object-cover" />
                        <div className="absolute top-3 left-3 z-10">
                          <span className="px-3 py-1 rounded-full bg-[#1D4ED8] text-white text-[11px] font-extrabold shadow-md flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>{c.campusName}</span>
                          </span>
                        </div>
                      </div>
                      <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-[#1D4ED8] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {c.category}
                          </span>
                          <h4 className="text-base font-extrabold text-[#0F172A] mt-2 line-clamp-2">{c.title}</h4>
                        </div>
                        <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0]">
                          <p className="text-xs font-bold text-[#0F172A] truncate">
                            Dernière leçon : {c.lastLessonTitle}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-600">{c.completedLessons}/{c.totalLessons} leçons</span>
                            <span className="text-[#1D4ED8] font-black">{c.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-[#1D4ED8] h-full rounded-full" style={{ width: `${c.progress}%` }} />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenCourseCampus(c.id)}
                          className="w-full py-3 px-4 rounded-xl bg-blue-50 hover:bg-[#1D4ED8] text-[#1D4ED8] hover:text-white font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer border border-blue-200 hover:border-[#1D4ED8]"
                        >
                          <span>Accéder au Campus Privé →</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredCourses.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
                        <div className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-[#E2E8F0]">
                          <img src={c.coverImage} alt={c.title} className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2 z-10">
                            <span className="px-2 py-0.5 rounded-full bg-[#1D4ED8] text-white text-[9px] font-extrabold shadow">
                              {c.campusName}
                            </span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-[#1D4ED8] border border-blue-200">
                            {c.category}
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-[#0F172A] truncate">{c.title}</h4>
                          <p className="text-xs text-slate-600 truncate">Dernière leçon : {c.lastLessonTitle}</p>
                          <div className="w-full max-w-xs bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                            <div className="bg-[#1D4ED8] h-full rounded-full" style={{ width: `${c.progress}%` }} />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenCourseCampus(c.id)}
                        className="px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-[#1D4ED8] text-[#1D4ED8] hover:text-white font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-blue-200"
                      >
                        <span>Accéder au Campus Privé →</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===================================================== */}
          {/* ONGLET : MES QUIZ & TESTS D'ÉVALUATION               */}
          {/* ===================================================== */}
          {activeTab === 'QUIZZES' && (
            <div className="space-y-6">
              {/* En-tête de section Quiz */}
              <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A] tracking-tight">
                      Mes Quiz &amp; Évaluations des Campus
                    </h3>
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                      {quizzes.filter(q => q.passed).length}/{quizzes.length} Validés
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                    Testez vos acquis en conditions réelles. Une note minimale de 80% est requise pour valider chaque cours et déclencher l'émission de votre certificat officiel avec QR code d'authenticité.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="inline-flex items-center bg-[#F8F9FA] border border-[#E2E8F0] p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setQuizFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        quizFilter === 'ALL' ? 'bg-[#1D4ED8] text-white shadow-xs' : 'text-slate-600 hover:text-[#0F172A]'
                      }`}
                    >
                      Tous ({quizzes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuizFilter('PASSED')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        quizFilter === 'PASSED' ? 'bg-[#1D4ED8] text-white shadow-xs' : 'text-slate-600 hover:text-[#0F172A]'
                      }`}
                    >
                      Validés ({quizzes.filter(q => q.passed).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuizFilter('PENDING')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        quizFilter === 'PENDING' ? 'bg-[#1D4ED8] text-white shadow-xs' : 'text-slate-600 hover:text-[#0F172A]'
                      }`}
                    >
                      À passer ({quizzes.filter(q => !q.passed).length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Grille des Quiz */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {quizzes
                  .filter(q => {
                    if (quizFilter === 'PASSED') return q.passed;
                    if (quizFilter === 'PENDING') return !q.passed;
                    return true;
                  })
                  .map((quiz) => (
                    <div
                      key={quiz.id}
                      className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs hover:border-[#1D4ED8]/40 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-[#1D4ED8] border border-blue-200 truncate">
                            {quiz.campusName}
                          </span>
                          {quiz.passed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Validé ({quiz.score}%)</span>
                            </span>
                          ) : quiz.score !== null ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Score : {quiz.score}% (Requis : {quiz.minScoreToPass}%)</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              Non débuté
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-base font-extrabold text-[#0F172A] leading-snug">
                            {quiz.title}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-1">
                            Cours : {quiz.courseTitle}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {quiz.durationMinutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                            {quiz.questionsCount} questions
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            Seuil : {quiz.minScoreToPass}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
                        <div className="text-[11px] text-slate-400">
                          {quiz.completedAt ? (
                            <span>Validé le : <strong className="text-slate-600">{quiz.completedAt}</strong></span>
                          ) : (
                            <span>Formateur : <strong className="text-slate-600">{quiz.instructorName}</strong></span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {quiz.passed && (
                            <button
                              type="button"
                              onClick={handleOpenCertificatesPage}
                              className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                              title="Voir le certificat officiel débloqué"
                            >
                              <Award className="w-3.5 h-3.5 text-amber-600" />
                              <span className="hidden sm:inline">Certificat</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartQuiz(quiz)}
                            className={`px-4 py-2 rounded-xl font-extrabold text-xs transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 ${
                              quiz.passed
                                ? 'bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0]'
                                : 'bg-[#1D4ED8] hover:bg-blue-800 text-white'
                            }`}
                          >
                            {quiz.passed ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Repasser le test</span>
                              </>
                            ) : quiz.score !== null ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Réessayer le quiz →</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Démarrer le Quiz →</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* ONGLET : MES CERTIFICATS (Passeport d'Élite Prompt 4/4) */}
          {/* ===================================================== */}
          {activeTab === 'CERTIFICATES' && (
            <div className="space-y-6">
              {/* En-tête de section Passeport d'Élite */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A] tracking-tight">
                      🏆 Passeport d'Élite Nanasore &amp; Certifications
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Diplômes officiels délivrés à 100% de complétion sur les campus des formateurs, vérifiables publiquement par QR Code.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenCertificatesPage}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Visualiseur Plein Écran HD</span>
                  </button>
                </div>
              </div>

              {/* 3 Métriques Passeport d'Élite en Blanc Pur */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Diplômes Obtenus</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-[#0F172A] mt-2">2 Débloqués</p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">✓ 100% validés par les formateurs</p>
                </div>

                <div className="bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">En cours d'Obtention</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-[#0F172A] mt-2">2 Formations</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">Délivrance dès 100% de progression</p>
                </div>

                <div className="bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Authenticité &amp; Registre</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-[#0F172A] mt-2">Infalsifiable</p>
                  <p className="text-[11px] text-[#1D4ED8] font-bold mt-1">Signé ENTREPRISE KONKOBO POUSBILA</p>
                </div>
              </div>

              {/* Grille des Certificats Débloqués (100% Validé) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h4 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                    Certificats Actifs &amp; Homologués (2)
                  </h4>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {certificatesList.filter(c => c.status === 'UNLOCKED').map((cert) => (
                    <div
                      key={cert.id}
                      className="bg-white border border-[#E2E8F0] rounded-3xl overflow-hidden shadow-xs hover:shadow-md hover:border-[#1D4ED8]/30 transition-all duration-200 flex flex-col justify-between group"
                    >
                      {/* Aperçu visuel HD du certificat Nanasore */}
                      <div className="p-4 bg-slate-900 border-b border-[#E2E8F0]">
                        <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 sm:p-6 border-2 border-amber-400/40 shadow-inner flex flex-col justify-between text-white">
                          {/* Décoration filigrane et cadre */}
                          <div className="absolute inset-2 border border-amber-400/20 rounded-xl pointer-events-none" />
                          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />

                          {/* En-tête du certificat */}
                          <div className="flex items-start justify-between relative z-10">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-md">
                                N
                              </div>
                              <div>
                                <span className="font-black text-xs tracking-wider uppercase text-amber-300">
                                  NANASORE CAMPUS
                                </span>
                                <p className="text-[9px] text-slate-300">
                                  ENTREPRISE KONKOBO POUSBILA
                                </p>
                              </div>
                            </div>

                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                              {cert.id}
                            </span>
                          </div>

                          {/* Corps central du certificat */}
                          <div className="my-auto text-center space-y-1 relative z-10 py-2">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                              Certificat de Réussite &amp; Maîtrise
                            </p>
                            <h5 className="text-sm sm:text-base font-extrabold text-white leading-tight px-2">
                              {cert.courseTitle}
                            </h5>
                            <p className="text-xs text-amber-300 font-serif italic pt-1">
                              Décerné avec les honneurs à <span className="font-bold underline text-white not-italic font-sans">{studentName}</span>
                            </p>
                            <p className="text-[10px] text-emerald-400 font-bold">
                              {cert.grade}
                            </p>
                          </div>

                          {/* Bas du certificat : QR Code & Signatures */}
                          <div className="flex items-end justify-between pt-2 border-t border-white/10 relative z-10 text-[9px]">
                            <div>
                              <p className="text-slate-400">Validé par :</p>
                              <p className="font-bold text-white">{cert.instructorName}</p>
                              <p className="text-[8px] text-slate-400">{cert.campusName}</p>
                            </div>

                            {/* QR Code unique d'authenticité */}
                            <div className="w-10 h-10 p-1 bg-white rounded-lg shadow-sm flex items-center justify-center shrink-0">
                              <QrCode className="w-full h-full text-slate-900" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Détails du cours, Formateur & Compétences */}
                      <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1D4ED8] border border-blue-200">
                              {cert.campusName}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              Émis le {cert.issueDate}
                            </span>
                          </div>

                          <h4 className="text-base font-extrabold text-[#0F172A] leading-snug">
                            {cert.courseTitle}
                          </h4>

                          {/* Formateur ayant validé */}
                          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0]">
                            <img
                              src={cert.instructorAvatar}
                              alt={cert.instructorName}
                              className="w-10 h-10 rounded-xl object-cover border border-[#E2E8F0]"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-[#0F172A] truncate">
                                {cert.instructorName}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {cert.instructorTitle}
                              </p>
                            </div>
                          </div>

                          {/* Compétences certifiées */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {cert.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold"
                              >
                                ✓ {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Boutons : Télécharger HD & Partager */}
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E2E8F0]">
                          <button
                            type="button"
                            onClick={() => handleDownloadCertificateHD(cert)}
                            className="w-full py-2.5 px-3 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Télécharger HD</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShareCertificate(cert)}
                            className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-[#E2E8F0] shadow-xs active:scale-95"
                          >
                            <Share2 className="w-3.5 h-3.5 text-[#1D4ED8]" />
                            <span>Partager</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section Certificats en cours d'obtention */}
              <div className="space-y-4 pt-4 border-t border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <h4 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                    Certifications en cours d'obtention (2)
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {certificatesList.filter(c => c.status === 'IN_PROGRESS').map((cert) => (
                    <div
                      key={cert.id}
                      className="bg-white border border-[#E2E8F0] rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {cert.campusName}
                          </span>
                          <span className="text-xs font-bold text-[#1D4ED8]">
                            {cert.grade}
                          </span>
                        </div>
                        <h5 className="text-sm font-extrabold text-[#0F172A] mt-2">
                          {cert.courseTitle}
                        </h5>
                        <p className="text-xs text-slate-500 mt-1">
                          Par {cert.instructorName} • Atteignez 100% pour débloquer votre diplôme officiel et votre QR Code.
                        </p>
                      </div>

                      {/* Barre de progression */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-500">Progression</span>
                          <span className="text-[#1D4ED8]">{cert.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#1D4ED8] h-full rounded-full transition-all duration-300"
                            style={{ width: `${cert.progress}%` }}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenCourseCampus(cert.courseId)}
                        className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-[#1D4ED8] text-[#1D4ED8] hover:text-white font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Continuer le cours jusqu'à 100%</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* ONGLET : MES ACHATS & REÇUS NANASORE (Prompt 3/4)     */}
          {/* ===================================================== */}
          {activeTab === 'PURCHASES' && (
            <div className="space-y-6">
              {/* En-tête de section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#1D4ED8]" />
                    <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A] tracking-tight">
                      Historique des Transactions &amp; Reçus
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Preuve irrévocable de toutes vos souscriptions, paiements Mobile Money et reçus officiels certifiés.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Transparence Financière 100%</span>
                  </span>
                </div>
              </div>

              {/* 3 Cartes Métriques Financières en Blanc Pur (#FFFFFF) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Total Investi</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-[#0F172A] mt-2">
                    {totalInvested.toLocaleString('fr-FR')} FCFA
                  </p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">✓ Tous paiements acquittés</p>
                </div>

                <div className="bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Souscriptions Actives</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-[#0F172A] mt-2">
                    {activeSubscriptionsCount} {activeSubscriptionsCount > 1 ? 'Formations' : 'Formation'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">Accès à vie garanti sans expiration</p>
                </div>

                <div className="bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Reçus Fiscaux &amp; PDF</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-[#0F172A] mt-2">
                    {receiptsCount} {receiptsCount > 1 ? 'Reçus' : 'Reçu'}
                  </p>
                  <p className="text-[11px] text-[#1D4ED8] font-bold mt-1">Disponibles en téléchargement immédiat</p>
                </div>
              </div>

              {/* Barre de Recherche & Filtres */}
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={purchaseSearch}
                    onChange={(e) => setPurchaseSearch(e.target.value)}
                    placeholder="Filtrer par #ID, cours, mode..."
                    className="w-full bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl pl-9 pr-3 py-2 text-xs text-[#0F172A] font-semibold focus:bg-white focus:border-[#1D4ED8] focus:outline-none transition"
                  />
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-center overflow-x-auto w-full sm:w-auto">
                  <span className="text-xs text-slate-400 font-medium mr-1 hidden sm:inline">Paiement :</span>
                  {[
                    { id: 'ALL', label: 'Tous' },
                    { id: 'MOBILE_MONEY', label: 'Mobile Money' },
                    { id: 'CARD', label: 'Cartes' },
                    { id: 'CRYPTO', label: 'Crypto' }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setPaymentFilter(filter.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        paymentFilter === filter.id
                          ? 'bg-[#1D4ED8] text-white shadow-xs'
                          : 'bg-[#F8F9FA] border border-[#E2E8F0] text-slate-600 hover:text-[#0F172A]'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. Vue "Historique des Transactions" : Tableau minimaliste à haute lisibilité */}
              <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0] text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                        <th className="py-4 px-5">ID Commande</th>
                        <th className="py-4 px-5">Nom du Cours &amp; Formateur</th>
                        <th className="py-4 px-5">Date</th>
                        <th className="py-4 px-5">Mode de Paiement</th>
                        <th className="py-4 px-5">Montant Réglé</th>
                        <th className="py-4 px-5">Statut &amp; Accès</th>
                        <th className="py-4 px-5 text-right">Action Reçu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs">
                      {filteredPurchases.map((purchase) => (
                        <tr
                          key={purchase.id}
                          className="hover:bg-slate-50/70 transition-colors group"
                        >
                          {/* ID de Commande (#NS-1092) */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <span className="font-mono font-extrabold text-[#1D4ED8] bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg">
                              {purchase.id}
                            </span>
                          </td>

                          {/* Nom du Cours & Formateur associé */}
                          <td className="py-4 px-5 min-w-[240px]">
                            <div className="font-extrabold text-[#0F172A] leading-snug">
                              {purchase.courseTitle}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                              <span className="font-semibold text-slate-600">{purchase.campusName}</span>
                              <span>•</span>
                              <span>{purchase.instructorName}</span>
                            </div>
                          </td>

                          {/* Date de souscription */}
                          <td className="py-4 px-5 whitespace-nowrap text-slate-600 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{purchase.date}</span>
                            </div>
                          </td>

                          {/* Mode de paiement utilisé */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="font-bold text-[#0F172A]">
                              {purchase.paymentMethod}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Réf: {purchase.transactionRef}
                            </div>
                          </td>

                          {/* Montant total réglé */}
                          <td className="py-4 px-5 whitespace-nowrap font-black text-sm text-[#0F172A]">
                            {purchase.amountFormatted}
                          </td>

                          {/* Statut de l'accès ("Accès à vie" ou "Abonnement actif") + Badge Vert "Validé" */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {purchase.status}
                              </span>
                              <span className="text-[11px] font-bold text-[#1D4ED8]">
                                {purchase.accessType}
                              </span>
                            </div>
                          </td>

                          {/* 2. Fonctionnalité Reçu PDF : Bouton "📄 Télécharger le Reçu PDF" */}
                          <td className="py-4 px-5 whitespace-nowrap text-right">
                            <button
                              type="button"
                              onClick={() => {
                                playTapBeep();
                                setSelectedReceipt(purchase);
                              }}
                              className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-[#1D4ED8] text-[#1D4ED8] hover:text-white font-extrabold text-xs transition flex items-center gap-1.5 ml-auto cursor-pointer border border-blue-200/80 hover:border-[#1D4ED8] shadow-xs active:scale-95"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>📄 Télécharger le Reçu PDF</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredPurchases.length === 0 && (
                  <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                    Aucune transaction ne correspond à vos filtres de recherche.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* ONGLET : MESSAGES & NOTIFICATIONS INTER-CAMPUS        */}
          {/* ===================================================== */}
          {activeTab === 'MESSAGES' && (
            <div className="space-y-6">
              {/* En-tête de section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-[#1D4ED8]" />
                    <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A] tracking-tight">
                      💬 Centre de Communication &amp; Notifications Inter-Campus
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Regroupe toutes les réponses des formateurs aux questions posées dans leurs campus respectifs. Soyez alerté en temps réel sans vous connecter manuellement à chaque campus.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-blue-50 text-[#1D4ED8] border border-blue-200 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-[#1D4ED8] animate-pulse" />
                    <span>
                      {interCampusNotifications.filter(n => n.isUnread).length} nouvelles réponses
                    </span>
                  </span>
                </div>
              </div>

              {/* Filtre par Campus */}
              <div className="bg-white border border-[#E2E8F0] p-3 rounded-2xl shadow-xs flex items-center gap-2 overflow-x-auto">
                <span className="text-xs text-slate-400 font-bold ml-2 shrink-0">Filtrer :</span>
                {[
                  { id: 'ALL', label: 'Tous les Campus' },
                  { id: 'Campus : Ibrahim P. Konkobo', label: 'Campus Ibrahim P. Konkobo' },
                  { id: 'Campus : Systèmes POS & Caisses', label: 'Campus Systèmes POS' },
                  { id: 'Campus : Live Shopping & Social Selling', label: 'Campus Live Shopping' },
                  { id: 'Campus : Sécurité & Conformité Réglementaire', label: 'Campus Sécurité KYC' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setActiveCampusFilter(f.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
                      activeCampusFilter === f.id
                        ? 'bg-[#1D4ED8] text-white shadow-xs'
                        : 'bg-[#F8F9FA] border border-[#E2E8F0] text-slate-600 hover:text-[#0F172A]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Liste des Réponses & Échanges Pédagogiques */}
              <div className="space-y-4">
                {interCampusNotifications
                  .filter(n => activeCampusFilter === 'ALL' || n.campusName === activeCampusFilter)
                  .map((notif) => (
                    <div
                      key={notif.id}
                      className={`bg-white border rounded-3xl p-5 sm:p-6 shadow-xs transition-all duration-200 space-y-4 ${
                        notif.isUnread
                          ? 'border-blue-300 ring-2 ring-blue-500/10'
                          : 'border-[#E2E8F0]'
                      }`}
                    >
                      {/* En-tête : Formateur + Badge Campus + Heure */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]/70">
                        <div className="flex items-center gap-3">
                          <img
                            src={notif.instructorAvatar}
                            alt={notif.instructorName}
                            className="w-11 h-11 rounded-2xl object-cover border border-[#E2E8F0]"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-extrabold text-[#0F172A]">
                                {notif.instructorName}
                              </h4>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-[#1D4ED8] border border-blue-200">
                                {notif.instructorRole}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-[#1D4ED8]">
                              {notif.campusName}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          {notif.isUnread && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              Nouveau
                            </span>
                          )}
                          <span className="text-xs text-slate-400 font-medium">
                            {notif.timestamp}
                          </span>
                        </div>
                      </div>

                      {/* Contexte : La question posée par l'étudiant dans le campus */}
                      <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <HelpCircle className="w-3.5 h-3.5 text-[#1D4ED8]" />
                          <span>Question posée dans {notif.courseTitle} • {notif.lessonTitle}</span>
                        </div>
                        <p className="text-xs text-slate-700 italic font-medium">
                          « {notif.questionAsked} »
                        </p>
                      </div>

                      {/* Réponse du Formateur */}
                      <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100 text-xs text-[#0F172A] leading-relaxed space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-[#1D4ED8] uppercase tracking-wider">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Réponse officielle du Formateur :</span>
                        </div>
                        <p className="font-medium text-slate-800">
                          {notif.answerContent}
                        </p>
                      </div>

                      {/* Fil des réponses ultérieures (le cas échéant) */}
                      {notif.replies && notif.replies.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                          {notif.replies.map((rep) => (
                            <div
                              key={rep.id}
                              className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs ml-4 sm:ml-8"
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-1">
                                <span className="text-[#1D4ED8]">Vous (Étudiant)</span>
                                <span>{rep.time}</span>
                              </div>
                              <p className="text-slate-800 font-medium">{rep.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions : Répondre directement & Accéder au campus */}
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={replyInputs[notif.id] || ''}
                            onChange={(e) => setReplyInputs(prev => ({ ...prev, [notif.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSendReply(notif.id);
                            }}
                            placeholder="Répondre directement au formateur..."
                            className="flex-1 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] font-medium focus:bg-white focus:border-[#1D4ED8] focus:outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => handleSendReply(notif.id)}
                            className="p-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white transition cursor-pointer shadow-xs"
                            title="Envoyer la réponse"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {notif.isUnread && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
                            >
                              Marquer comme lu
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenCourseCampus(notif.courseId)}
                            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-[#1D4ED8] text-[#1D4ED8] hover:text-white font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer border border-blue-200/80 hover:border-[#1D4ED8] shadow-xs"
                          >
                            <span>Accéder à la leçon dans le Campus →</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'SETTINGS' && (
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-[#0F172A]">Réglages du Compte Étudiant</h3>
              <div className="space-y-3 max-w-md">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Nom affiché sur les diplômes</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                      localStorage.setItem('nana_student_name', e.target.value);
                    }}
                    className="w-full bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] font-bold focus:border-[#1D4ED8] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Email académique</label>
                  <input
                    type="email"
                    value={studentEmail}
                    disabled
                    className="w-full bg-slate-100 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-500 font-medium cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ======================================================= */}
        {/* COLONNE 3 : WIDGETS & ACTIVITÉS (DROITE)                 */}
        {/* ======================================================= */}
        <aside className="w-80 p-6 lg:p-8 space-y-6 hidden xl:block shrink-0 border-l border-[#E2E8F0] bg-white/50">
          {/* Widget 1 (Prompt 2/4) : Widget "En cours" avec Reel/Cours Actif */}
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-[#1D4ED8] border border-blue-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1D4ED8] animate-pulse" />
                En cours
              </span>
              <span className="text-[11px] text-slate-400 font-bold">Activité directe</span>
            </div>

            {/* Carte dynamique affichant le Reel/Cours actif */}
            <div
              onClick={handleResumeLastCourse}
              className="relative rounded-2xl overflow-hidden aspect-video bg-slate-900 border border-[#E2E8F0] group cursor-pointer shadow-inner"
            >
              <img
                src={activeCourse.coverImage}
                alt={activeCourse.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

              {/* Badge Bleu Royal en surimpression */}
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className="px-2.5 py-0.5 rounded-full bg-[#1D4ED8] text-white text-[10px] font-extrabold shadow flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  <span>{activeCourse.campusName}</span>
                </span>
              </div>

              {/* Icône Play pulsante au centre */}
              <div className="absolute inset-0 m-auto w-11 h-11 rounded-full bg-white text-[#1D4ED8] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-[#1D4ED8] group-hover:text-white transition-all">
                <Play className="w-4 h-4 ml-0.5 fill-current" />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-extrabold text-[#0F172A] leading-snug line-clamp-2">
                {activeCourse.title}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
                Dernière leçon : {activeCourse.lastLessonTitle}
              </p>
            </div>

            {/* Progression en Bleu Royal */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">{activeCourse.completedLessons}/{activeCourse.totalLessons} leçons</span>
                <span className="text-[#1D4ED8] font-black">{activeCourse.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#1D4ED8] h-full rounded-full transition-all duration-300"
                  style={{ width: `${activeCourse.progress}%` }}
                />
              </div>
            </div>

            {/* Bouton direct [ ▶ Entrer au Campus ] */}
            <button
              type="button"
              onClick={handleResumeLastCourse}
              className="w-full py-3 rounded-2xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-extrabold text-xs sm:text-sm transition-all duration-150 shadow-md shadow-blue-700/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>[ ▶ Entrer au Campus ]</span>
            </button>
          </div>

          {/* Widget 2 (Prompt 3/4) : Reçus Récents */}
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#1D4ED8]" />
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Reçus Récents
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveTab('PURCHASES');
                }}
                className="text-[11px] font-bold text-[#1D4ED8] hover:underline cursor-pointer"
              >
                Tout voir
              </button>
            </div>

            <div className="space-y-2.5">
              {studentPurchases.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    playTapBeep();
                    setSelectedReceipt(item);
                  }}
                  className="p-3 rounded-2xl bg-[#F8F9FA] hover:bg-blue-50/50 border border-[#E2E8F0] hover:border-blue-200 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-[#1D4ED8] font-mono">
                      {item.id}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {item.date}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-[#0F172A] truncate mt-1 group-hover:text-[#1D4ED8] transition">
                    {item.courseTitle}
                  </h5>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E2E8F0]/60 text-[11px]">
                    <span className="font-extrabold text-[#0F172A]">{item.amountFormatted}</span>
                    <span className="text-[#1D4ED8] font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition">
                      <FileText className="w-3 h-3" />
                      <span>Reçu PDF</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 3 : Objectif de la Semaine */}
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Objectif d'Étude
              </h4>
              <span className="text-xs font-bold text-[#1D4ED8]">4.5h / 6h</span>
            </div>

            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-[#1D4ED8] h-full rounded-full" style={{ width: '75%' }} />
            </div>

            <p className="text-[11px] text-slate-500">
              Plus que <strong className="text-[#0F172A]">1h30</strong> pour valider votre défi hebdomadaire et débloquer votre badge assiduité.
            </p>
          </div>

          {/* Widget 4 : Formateur Référent */}
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-5 shadow-xs space-y-3.5">
            <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Formateur Référent
            </h4>

            <div className="flex items-center gap-3">
              <img
                src={DEFAULT_MASTERCLASS_COURSE.instructor.avatarUrl}
                alt={DEFAULT_MASTERCLASS_COURSE.instructor.name}
                className="w-11 h-11 rounded-2xl object-cover border border-[#E2E8F0]"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#0F172A] truncate">
                  {DEFAULT_MASTERCLASS_COURSE.instructor.name}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  ENTREPRISE KONKOBO POUSBILA
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('MESSAGES')}
              className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-[#E2E8F0]"
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>Poser une question</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ========================================================= */}
      {/* MODAL REÇU OFFICIEL NANASORE (Prompt 3/4)                 */}
      {/* ========================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Top Bar du Modal */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E2E8F0] bg-[#F8F9FA] rounded-t-3xl sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#1D4ED8]" />
                <span className="text-sm font-extrabold text-[#0F172A]">
                  Reçu Officiel {selectedReceipt.id}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    window.print();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-[#0F172A] hover:bg-slate-200 transition cursor-pointer"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Corps Imprimable du Reçu Officiel Nanasore */}
            <div className="p-6 sm:p-8 space-y-6 text-[#0F172A] bg-white">
              {/* En-tête officiel entreprise */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#1D4ED8] text-white flex items-center justify-center font-black text-base">
                      N
                    </div>
                    <span className="text-lg font-black tracking-tight text-[#0F172A]">
                      NaNa<span className="text-[#1D4ED8]">sore</span>
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 mt-1">
                    ENTREPRISE KONKOBO POUSBILA
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Ouagadougou, Burkina Faso • RCCM BF-OUA-01-2024-B13
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Plateforme LMS Certifiée &amp; Infrastructure Campus Privé
                  </p>
                </div>

                <div className="sm:text-right">
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black uppercase tracking-wider mb-1">
                    ✓ Transaction Validée
                  </span>
                  <p className="text-base font-extrabold text-[#0F172A] font-mono">
                    {selectedReceipt.id}
                  </p>
                  <p className="text-xs text-slate-500">
                    Facture N° : {selectedReceipt.invoiceNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    Date : {selectedReceipt.date}
                  </p>
                </div>
              </div>

              {/* Informations Étudiant & Mode de règlement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Souscripteur / Étudiant
                  </span>
                  <p className="font-extrabold text-[#0F172A] text-sm">{studentName}</p>
                  <p className="text-slate-500 font-medium">{studentEmail}</p>
                  <p className="text-[#1D4ED8] font-bold text-[11px] mt-1">
                    Compte Étudiant Certifié NaNasore
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Règlement &amp; Passerelle
                  </span>
                  <p className="font-extrabold text-[#0F172A]">{selectedReceipt.paymentMethod}</p>
                  <p className="text-slate-500 font-mono text-[11px]">
                    Réf: {selectedReceipt.transactionRef}
                  </p>
                  <p className="text-emerald-600 font-bold text-[11px] mt-1">
                    Statut : {selectedReceipt.accessType} Illimité
                  </p>
                </div>
              </div>

              {/* Tableau Récapitulatif des Lignes */}
              <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#F8F9FA] text-[11px] font-bold text-slate-500 border-b border-[#E2E8F0]">
                    <tr>
                      <th className="p-3">Désignation</th>
                      <th className="p-3 text-center">Accès</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    <tr>
                      <td className="p-3.5">
                        <p className="font-extrabold text-[#0F172A]">{selectedReceipt.courseTitle}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {selectedReceipt.campusName} • {selectedReceipt.instructorName}
                        </p>
                      </td>
                      <td className="p-3.5 text-center font-bold text-[#1D4ED8]">
                        {selectedReceipt.accessType}
                      </td>
                      <td className="p-3.5 text-right font-black text-sm text-[#0F172A]">
                        {selectedReceipt.amountFormatted}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totaux & Décompte */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                  {/* QR Code vectoriel infalsifiable */}
                  <div className="w-16 h-16 rounded-xl border border-[#E2E8F0] p-1.5 bg-white flex items-center justify-center shrink-0">
                    <QrCode className="w-full h-full text-slate-800" />
                  </div>
                  <div className="text-[11px] text-slate-500">
                    <p className="font-bold text-[#0F172A]">QR Code d'Authenticité Financière</p>
                    <p>Scannable par les auditeurs et banques pour valider l'intégrité de la souscription.</p>
                  </div>
                </div>

                <div className="w-full sm:w-60 space-y-1.5 text-xs text-right">
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Montant Net HT :</span>
                    <span>{selectedReceipt.amountFormatted}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>TVA (0% Exonération) :</span>
                    <span>0 FCFA</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-[#0F172A] border-t border-[#E2E8F0] pt-2">
                    <span>Total Réglé TTC :</span>
                    <span className="text-[#1D4ED8]">{selectedReceipt.amountFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Cachet numérique officiel & mentions légales */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/60 flex items-center justify-between text-[11px] text-slate-600">
                <div>
                  <p className="font-bold text-[#1D4ED8]">Document certifié conforme émis électroniquement</p>
                  <p className="mt-0.5">
                    Plateforme académique Nanasore sous licence Entreprise Konkobo Pousbila.
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-xl border-2 border-emerald-500 text-emerald-700 font-black text-[10px] tracking-wider uppercase rotate-[-3deg] shrink-0">
                  ACQUITTÉ • 100%
                </div>
              </div>

              {/* Bouton pour aller directement au cours */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenCourseCampus(selectedReceipt.courseId);
                    setSelectedReceipt(null);
                  }}
                  className="w-full py-3 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Accéder directement au Campus de ce cours →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL INTERACTIF : TEST & QUIZ RUNNER                     */}
      {/* ========================================================= */}
      {activeQuizModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#E2E8F0] shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
            {/* Header du Quiz */}
            <div className="p-5 sm:p-6 border-b border-[#E2E8F0] flex items-start justify-between gap-4 bg-slate-50/60 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1D4ED8] border border-blue-200">
                    {activeQuizModal.campusName}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-500">
                    Seuil requis : {activeQuizModal.minScoreToPass}%
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A] leading-snug">
                  {activeQuizModal.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium line-clamp-1">
                  {activeQuizModal.courseTitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveQuizModal(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progression & Statut */}
            <div className="px-6 py-3 bg-white border-b border-[#E2E8F0] flex items-center justify-between text-xs font-bold text-slate-600 shrink-0">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-[#1D4ED8]" />
                Questions répondues : {Object.keys(quizAnswers).length} / {activeQuizModal.questions.length}
              </span>
              <span className="text-slate-400 text-[11px]">
                {activeQuizModal.durationMinutes} min estimées
              </span>
            </div>

            {/* Corps du modal défilable */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
              {/* Bannière de Résultat après validation */}
              {quizSubmitted && quizScore !== null && (
                <div
                  className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    quizScore >= activeQuizModal.minScoreToPass
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        quizScore >= activeQuizModal.minScoreToPass
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-rose-500 text-white shadow-sm'
                      }`}
                    >
                      {quizScore >= activeQuizModal.minScoreToPass ? (
                        <Trophy className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black">
                        {quizScore >= activeQuizModal.minScoreToPass
                          ? '🎉 Test Validé avec Succès !'
                          : 'Note Insuffisante pour l\'Homologation'}
                      </h4>
                      <p className="text-xs mt-0.5 opacity-90">
                        {quizScore >= activeQuizModal.minScoreToPass
                          ? `Félicitations, vous avez obtenu ${quizScore}%. Votre certificat d'excellence est débloqué.`
                          : `Votre score est de ${quizScore}%. Le seuil minimal est de ${activeQuizModal.minScoreToPass}%. Révisez et recommencez.`}
                      </p>
                    </div>
                  </div>

                  {quizScore >= activeQuizModal.minScoreToPass ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuizModal(null);
                        handleOpenCertificatesPage();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition shrink-0 cursor-pointer"
                    >
                      Voir mon Certificat 🏆
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResetQuiz}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition shrink-0 cursor-pointer"
                    >
                      Recommencer ↻
                    </button>
                  )}
                </div>
              )}

              {/* Questions */}
              <div className="space-y-6">
                {activeQuizModal.questions.map((q, qIndex) => {
                  const selectedOption = quizAnswers[q.id];
                  const isCorrect = selectedOption === q.correctIndex;

                  return (
                    <div
                      key={q.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition ${
                        quizSubmitted
                          ? isCorrect
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : 'border-rose-200 bg-rose-50/20'
                          : 'border-[#E2E8F0] bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-50 text-[#1D4ED8] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {qIndex + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-bold text-[#0F172A] leading-relaxed">
                            {q.question}
                          </p>

                          {/* Options */}
                          <div className="mt-3.5 space-y-2">
                            {q.options.map((option, optIdx) => {
                              const isSelected = selectedOption === optIdx;
                              let optionStyle = 'border-[#E2E8F0] hover:bg-slate-50 text-slate-700';

                              if (quizSubmitted) {
                                if (optIdx === q.correctIndex) {
                                  optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                                } else if (isSelected) {
                                  optionStyle = 'border-rose-400 bg-rose-50 text-rose-800 line-through';
                                } else {
                                  optionStyle = 'border-slate-200 opacity-60 text-slate-500';
                                }
                              } else if (isSelected) {
                                optionStyle = 'border-[#1D4ED8] bg-blue-50/70 text-[#1D4ED8] font-bold shadow-xs';
                              }

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  disabled={quizSubmitted}
                                  onClick={() => handleSelectQuizOption(q.id, optIdx)}
                                  className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center gap-3 cursor-pointer ${optionStyle}`}
                                >
                                  <span
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[10px] ${
                                      isSelected
                                        ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white font-bold'
                                        : 'border-slate-300'
                                    }`}
                                  >
                                    {isSelected && '✓'}
                                  </span>
                                  <span className="flex-1">{option}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Explication du formateur après soumission */}
                          {quizSubmitted && (
                            <div className="mt-3.5 p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-[11px] text-slate-700 space-y-1">
                              <p className="font-extrabold text-[#1D4ED8] flex items-center gap-1.5">
                                <span>💡 Explication du Formateur :</span>
                              </p>
                              <p className="leading-relaxed">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer d'action du modal */}
            <div className="p-4 sm:p-5 border-t border-[#E2E8F0] bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveQuizModal(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-slate-100 text-slate-600 font-bold text-xs transition cursor-pointer"
              >
                Fermer
              </button>

              {!quizSubmitted ? (
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  className="px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <span>Valider mes réponses ({Object.keys(quizAnswers).length}/{activeQuizModal.questions.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetQuiz}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Recommencer</span>
                  </button>

                  {quizScore !== null && quizScore >= activeQuizModal.minScoreToPass && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuizModal(null);
                        handleOpenCertificatesPage();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Mon Diplôme Débloqué</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast de confirmation / notification rapide */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-xs shadow-2xl flex items-center gap-2.5 border border-slate-700 animate-in slide-in-from-bottom-4 duration-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default StudentDashboardView;
