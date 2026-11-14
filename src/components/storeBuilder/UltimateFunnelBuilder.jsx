import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Save,
  Trash2,
  X,
  Eye,
  Check,
  ChevronRight,
  Target,
  PlusCircle,
  FileCode2,
  Smartphone,
  Monitor,
  Tablet,
  Copy,
  Upload,
  Layers,
  Palette,
  Type,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Tag,
  Clock,
  Flame,
  CheckCircle2,
  ExternalLink,
  Code2,
  Globe,
  Star,
  Zap,
  ShoppingBag,
  Sliders,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Gift,
  HelpCircle,
  Percent,
  Search,
  Plus,
  ArrowUp,
  ArrowDown,
  Copy as DuplicateIcon,
  Maximize2,
  Settings,
  Share2,
  MousePointer,
  FileCode,
  Layout,
  MessageSquare,
  CreditCard,
  PhoneCall,
  Terminal,
  ChevronLeft,
  ChevronDown,
  Lock,
  GraduationCap,
  Video,
  Radio,
  Calendar,
  Users,
  Award,
  Send,
  QrCode,
  Share,
  BookOpen,
  Compass,
  Rocket
} from 'lucide-react';
import { formatCFA, playTapBeep, playValidationBeep, playCancelSound, playCashChime } from '../../utils/audio';
import { incrementStoredFunnelsCount } from '../../utils/planFeatures';
import { saveFunnelConfig, registerSubdomainInFirebase } from '../../services/omniFunnelService';
import { saveTenantCustomDomain, cleanDomain } from '../../services/tenantDomainService';
import { AutoplayVideoBlock, DEFAULT_AUTOPLAY_VIDEO_DATA } from '../cro/AutoplayVideoBlock';
import { ImageUploadInput } from '../common/ImageUploadInput';
export { extractYouTubeVideoId } from './FunnelBuilder';

// ============================================================================
// GABARITS DE DÉMONSTRATION SIMULÉS (COURS, WEBINAIRE & PRODUIT)
// ============================================================================
export const SIMULATED_SOURCES = {
  course: {
    id: 'course-masterclass-ia',
    type: 'course',
    title: 'Masterclass Complète : Intelligence Artificielle & Automatisation No-Code',
    subtitle: 'Propulsez votre entreprise au niveau supérieur avec les outils de pointe (Claude, ChatGPT, Make & NaNa).',
    instructor: 'Prof. Amadou Traoré • Lead AI Architect',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    price: 35000,
    originalPrice: 75000,
    category: 'Intelligence Artificielle & Business',
    duration: '18 Heures • 6 Modules Certifiants',
    studentsCount: 1420
  },
  webinar: {
    id: 'webinar-live-sales',
    type: 'webinar',
    title: 'Grand Live Interactif : Clôturer 50 Ventes par Jour avec Nanasore & Funnels',
    subtitle: 'Démo en direct sans filtre, questions/réponses ouvertes et bonus VIP offert aux participants.',
    instructor: 'Aïcha Diallo & Mamadou Konaté • Experts Conversion',
    instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?auto=format&fit=crop&w=800&q=80',
    price: 0,
    originalPrice: 25000,
    category: 'Live / Webinaire Haute Fréquence',
    duration: 'Diffusion Jeudi 20h00 GMT • Replay Sécurisé',
    studentsCount: 840
  },
  product: {
    id: 'prod-terminal-elite',
    type: 'product',
    title: 'Terminal de Caisse Connecté NaNa Pro 5G - Pack Entreprise',
    subtitle: 'Lecteur NFC Wave & Orange Money intégré, imprimante thermique haute vitesse et batterie 72h.',
    instructor: 'NaNa Hardware Labs',
    instructorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    price: 65000,
    originalPrice: 120000,
    category: 'Matériel POS & Fintech',
    duration: 'Livraison 24h & Garantie 1 An',
    studentsCount: 3200
  }
};

// ============================================================================
// 1. LA BANQUE D'OUTILS (CATÉGORIES & GABARITS DE BLOCS PRÊTS À L'EMPLOI)
// ============================================================================
export const BLOCK_CATEGORIES = [
  { id: 'all', label: 'Tous les Blocs' },
  { id: 'sections', label: 'Sections', icon: Layout },
  { id: 'forms', label: 'Formulaires', icon: MessageSquare },
  { id: 'cta', label: 'Boutons & CTA', icon: MousePointer },
  { id: 'animations', label: 'Animations', icon: Zap },
  { id: 'third_party', label: 'Outils Tiers', icon: Globe }
];

export const READY_TO_USE_BLOCKS = [
  // --- SECTIONS ---
  {
    type: 'hero_live_masterclass',
    category: 'sections',
    name: 'Hero 3D Live & Masterclass',
    badge: 'Spécial Enseignant',
    description: 'Titre d\'impact, badge live clignotant, avatar formateur et visuel 3D en lévitation continue.',
    icon: GraduationCap,
    defaultData: {
      headline: 'Masterclass Exclusive : Dominez l\'Intelligence Artificielle en 2026',
      subheadline: 'Une immersion complète de 18 heures pour automatiser votre activité et décupler vos revenus.',
      promoBadge: '🔴 DIFFUSION EN DIRECT • ACCÈS LIMITÉ',
      instructorName: 'Prof. Amadou Traoré',
      instructorRole: 'Lead Architecte IA & Instructeur Certifié',
      instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      price: 35000,
      originalPrice: 75000,
      buttonText: 'Réserver Ma Place au Live Maintenant 🎟️',
      bgColor: 'transparent',
      btnBgColor: '#f59e0b'
    }
  },
  {
    type: 'syllabus_modules',
    category: 'sections',
    name: 'Programme & Syllabus de Cours',
    badge: 'Curriculum Pro',
    description: 'Découpage modulaire du programme pédagogique avec chapitres, durées et livrables.',
    icon: BookOpen,
    defaultData: {
      headline: 'Le Programme d\'Excellence Pas-à-Pas',
      subheadline: 'Chaque module comprend exercices pratiques, templates téléchargeables et sessions Q&R.',
      modules: [
        { title: 'Module 1 : Fondations des LLMs & Prompts de Niveau Expert', duration: '3h 30m', lessons: '8 leçons' },
        { title: 'Module 2 : Automatisation des Tunnels & Workflows No-Code', duration: '4h 15m', lessons: '11 leçons' },
        { title: 'Module 3 : Cas Réels Entreprise & Monétisation Directe', duration: '5h 00m', lessons: '14 leçons' }
      ]
    }
  },
  {
    type: 'instructor_bio',
    category: 'sections',
    name: 'Fiche Formateur & Certifications',
    badge: 'Autorité',
    description: 'Présentation de l\'instructeur avec ses distinctions, entreprises accompagnées et note moyenne.',
    icon: Award,
    defaultData: {
      name: 'Prof. Amadou Traoré',
      title: 'Architecte Logiciel Senior • 12+ Années d\'Expérience',
      bio: 'Pionnier des technologies Cloud et IA en Afrique de l\'Ouest, formateur de plus de 8 500 cadres et entrepreneurs.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      badges: ['Note Apprenants 4.9/5', 'Certifié Google & NaNa', 'Ex-Directeur Technique']
    }
  },
  {
    type: 'faq_webinar',
    category: 'sections',
    name: 'FAQ Levée des Objections',
    badge: 'Réassurance',
    description: 'Questions récurrentes sur le replay, le paiement Mobile Money et le certificat officiel.',
    icon: HelpCircle,
    defaultData: {
      headline: 'Questions Fréquentes sur la Session',
      items: [
        { q: 'Que se passe-t-il si je rate la diffusion en direct ?', a: 'Pas d\'inquiétude ! L\'enregistrement complet en haute définition (Replay) vous est envoyé par email et WhatsApp immédiatement après la session.' },
        { q: 'Puis-je régler par Wave ou Orange Money ?', a: 'Oui, tous les moyens de paiement locaux (Wave, OM, Moov, MTN, Carte Bancaire) sont acceptés avec validation automatique en 1 clic.' },
        { q: 'Obtiendrai-je un certificat à la fin ?', a: 'Oui, un certificat officiel nominatif vérifiable par QR Code vous sera délivré après validation des quiz.' }
      ]
    }
  },
  {
    type: 'autoplay_video',
    category: 'sections',
    name: 'Vidéo Autoplay Silencieuse',
    badge: 'Loop CDN ⚡',
    description: 'Vidéo courte muette en boucle 100% largeur (Cloudinary, BunnyCDN, MP4 direct) optimisée pour le CDN Cloudflare.',
    icon: Video,
    defaultData: {
      ...DEFAULT_AUTOPLAY_VIDEO_DATA,
      videoUrl: ''
    }
  },

  // --- FORMULAIRES ---
  {
    type: 'webinar_registration_form',
    category: 'forms',
    name: 'Inscription Live WhatsApp & Email',
    badge: 'Conversion +48%',
    description: 'Champs nom, email et téléphone WhatsApp avec invitation directe au groupe privé.',
    icon: MessageSquare,
    defaultData: {
      headline: 'Réservez Votre Accès Gratuit au Webinaire 🎟️',
      subheadline: 'Le lien privé de la salle Daily.co vous sera envoyé 15 minutes avant le début.',
      buttonText: 'Valider Mon Inscription Gratuite 🚀',
      reassurance: '🔒 Accès sécurisé • Vos coordonnées restent strictement confidentielles',
      seatsLeft: 12
    }
  },
  {
    type: 'checkout_1click_course',
    category: 'forms',
    name: 'Caisse 1-Clic Paiement Masterclass',
    badge: 'Paiement Flash',
    description: 'Sélection de pack et règlement sans friction par Mobile Money (Wave, Orange Money) ou Carte.',
    icon: CreditCard,
    defaultData: {
      headline: 'Finalisez Votre Accès à la Masterclass',
      amount: 35000,
      buttonText: 'Payer 35 000 F CFA & Commencer Immédiatement ⚡'
    }
  },

  // --- CTA (BOUTONS & APPELS À L'ACTION) ---
  {
    type: 'neon_pulse_cta',
    category: 'cta',
    name: 'Bouton Géant Pulse Néon 3D',
    badge: 'Urgence Max',
    description: 'Bouton haute conversion avec halo néon palpitant, micro-brillance et flèche d\'action.',
    icon: MousePointer,
    defaultData: {
      buttonText: 'JE RÉSERVE MON ACCÈS VIP AVANT CLÔTURE 🚀',
      subtext: '⚡ Offre limitée aux 100 premières inscriptions',
      btnBgColor: '#f59e0b',
      btnTextColor: '#000000',
      glowColor: 'rgba(245, 158, 11, 0.45)'
    }
  },
  {
    type: 'dual_action_cta',
    category: 'cta',
    name: 'Double Action (Direct + Replay)',
    badge: 'Flexibilité',
    description: 'Deux boutons côte-à-côte : "Participer en Direct" et "Recevoir le Replay par WhatsApp".',
    icon: Zap,
    defaultData: {
      primaryText: 'Assister en Direct (Interactif) 🔴',
      secondaryText: 'Recevoir le Replay & Support 📹'
    }
  },

  // --- ANIMATIONS ---
  {
    type: 'countdown_timer',
    category: 'animations',
    name: 'Minuteur Urgence Défilant (FOMO)',
    badge: 'Haute Tension',
    description: 'Compte à rebours animé avec jours, heures, minutes et micro-secondes avant début.',
    icon: Clock,
    defaultData: {
      title: '🚨 CLÔTURE DES INSCRIPTIONS DANS :',
      initialHours: 23,
      initialMinutes: 42,
      initialSeconds: 18,
      bgColor: '#0f172a',
      accentColor: '#f59e0b'
    }
  },
  {
    type: 'seats_progress_bar',
    category: 'animations',
    name: 'Jauge de Rareté des Places en Direct',
    badge: 'Preuve Sociale',
    description: 'Barre de progression indiquant visuellement le remplissage de la salle (ex: 88% plein).',
    icon: Flame,
    defaultData: {
      text: 'Plus que 12 places disponibles sur 100 !',
      percentage: 88
    }
  },

  // --- OUTILS TIERS ---
  {
    type: 'pixel_tracking_tag',
    category: 'third_party',
    name: 'Balisage Pixel Meta, TikTok & LinkedIn',
    badge: 'Tracking Pro',
    description: 'Déclencheur invisible d\'événements standards (ViewContent, Lead, Purchase) pour les campagnes publicitaires.',
    icon: Globe,
    defaultData: {
      metaPixelId: '128492049102938',
      tiktokPixelId: 'C78920192',
      eventName: 'Lead'
    }
  },
  {
    type: 'trust_badges_edu',
    category: 'third_party',
    name: 'Sceaux Accréditation & Paiement Sécurisé',
    badge: 'Garanties',
    description: 'Logos certifiés Wave, Orange Money, Visa, SSL 256-Bit et Sceau "Garantie Diplômante".',
    icon: ShieldCheck,
    defaultData: {
      text: 'Plateforme certifiée • Transactions 100% sécurisées • Accréditation NaNa Academy',
      badges: ['Cryptage SSL 256-Bit', 'Paiement Wave Direct', 'Orange Money', 'Certificat Agréé']
    }
  }
];

// Étapes standards du Funnel
export const FUNNEL_JOURNEY_STEPS = [
  { id: 'optin', name: 'Page de Capture (Opt-in)', conversion: '44.8%', icon: Target, shortName: 'Opt-in' },
  { id: 'sales', name: 'Page de Vente (Masterclass)', conversion: '22.1%', icon: ShoppingBag, shortName: 'Vente' },
  { id: 'upsell', name: 'Upsell 1-Clic (Coaching VIP)', conversion: '38.4%', icon: TrendingUp, shortName: 'Upsell' },
  { id: 'downsell', name: 'Downsell (Replay Éco)', conversion: '26.7%', icon: Tag, shortName: 'Downsell' }
];

// Palettes & Thèmes Visuels Prédéfinis
export const THEME_PRESETS = [
  {
    id: 'gold_luxury',
    name: 'Or Impérial & Sombre',
    desc: 'Prestige, luxe & formation d\'élite',
    primary: '#f59e0b',
    accent: '#fbbf24',
    bg: '#090d16',
    border: 'border-amber-500/40',
    badge: 'bg-amber-500/20 text-amber-300'
  },
  {
    id: 'indigo_cyber',
    name: 'Indigo Cyber IA',
    desc: 'High-Tech, SaaS & Automatisation',
    primary: '#6366f1',
    accent: '#818cf8',
    bg: '#080b18',
    border: 'border-indigo-500/40',
    badge: 'bg-indigo-500/20 text-indigo-300'
  },
  {
    id: 'emerald_fintech',
    name: 'Émeraude Fintech',
    desc: 'Finance, Investissement & Croissance',
    primary: '#10b981',
    accent: '#34d399',
    bg: '#061412',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-300'
  },
  {
    id: 'afro_solar',
    name: 'Orange Solaire & Feu',
    desc: 'Vibrant, Chaleureux & Haute Conversion',
    primary: '#f97316',
    accent: '#fb923c',
    bg: '#140c06',
    border: 'border-orange-500/40',
    badge: 'bg-orange-500/20 text-orange-300'
  },
  {
    id: 'electric_blue',
    name: 'Bleu Électrique & Tech',
    desc: 'Moderne, Confiance & Professionnel',
    primary: '#0ea5e9',
    accent: '#38bdf8',
    bg: '#06111f',
    border: 'border-sky-500/40',
    badge: 'bg-sky-500/20 text-sky-300'
  }
];

export const UltimateFunnelBuilder = ({
  initialData = null,
  sourceType = 'course', // 'course' | 'webinar' | 'product'
  isOpen = true,
  onClose = () => {},
  onSave = () => {},
  onPublish = () => {},
  onDelete = () => {}
}) => {
  // Source active (avec détection automatique ou simulation)
  const [currentSourceKey, setCurrentSourceKey] = useState(
    initialData?.type || sourceType || 'course'
  );

  // Fusion des données de l'enseignant reçues avec le fallback
  const activeSource = initialData || SIMULATED_SOURCES[currentSourceKey] || SIMULATED_SOURCES.course;

  // 1. Navigation du Parcours (Capture -> Vente -> Upsell -> Downsell)
  const [activeStepId, setActiveStepId] = useState('sales');

  // Mode de rendu Canvas (Desktop, Tablette, Mobile)
  const [canvasDevice, setCanvasDevice] = useState('desktop');

  // Menu déroulant de Publication
  const [isPublishDropdownOpen, setIsPublishDropdownOpen] = useState(false);
  const publishDropdownRef = useRef(null);

  // Modales de Publication
  const [activePublishModal, setActivePublishModal] = useState(null); // 'web' | 'social' | 'internal' | null
  const [publishedInternalState, setPublishedInternalState] = useState(false);

  // Modale Paramètres & Personnalisation Globale
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
  const [customizationActiveTab, setCustomizationActiveTab] = useState('theme'); // 'theme' | 'general' | 'pricing' | 'seo' | 'pixels'

  const [customizationSettings, setCustomizationSettings] = useState(() => {
    const defaults = {
      themePreset: 'gold_luxury',
      primaryColor: '#f59e0b',
      accentColor: '#fbbf24',
      bgColor: '#090d16',
      fontFamily: 'Inter',
      borderRadius: 'rounded-2xl',
      ctaGlow: true,
      funnelTitle: activeSource?.title || 'Masterclass Complète : Intelligence Artificielle & Automatisation No-Code',
      funnelSubtitle: activeSource?.subtitle || 'Propulsez votre entreprise au niveau supérieur avec les outils de pointe (Claude, ChatGPT, Make & NaNa).',
      instructorName: activeSource?.instructor || 'Prof. Amadou Traoré',
      instructorRole: activeSource?.category || 'Lead AI Architect • Intelligence Artificielle & Business',
      headerBadge: activeSource?.type === 'course' ? 'Espace Professeurs' : 'Live / Webinaire',
      logoUrl: activeSource?.instructorAvatar || '',
      salePrice: activeSource?.price || 35000,
      originalPrice: activeSource?.originalPrice || 75000,
      currency: 'F CFA',
      discountBadge: '-53% OFFRE LIMITÉE',
      enableWave: true,
      enableOrangeMoney: true,
      enableMtnMomo: true,
      enableMoovMoney: true,
      enableCard: true,
      enableCod: true,
      merchantWhatsapp: '+225 07 00 00 00 00',
      hostingType: 'subdomain',
      subdomain: 'ia-masterclass',
      customDomain: '',
      metaTitle: activeSource?.title || 'Masterclass IA & No-Code',
      metaDescription: activeSource?.subtitle || 'Formation exclusive et certification officielle.',
      ogImageUrl: activeSource?.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
      metaPixelId: '',
      googleAnalyticsId: '',
      tiktokPixelId: '',
      webhookUrl: '',
      redirectAfterPayment: 'auto'
    };
    try {
      const saved = localStorage.getItem('nana_funnel_custom_settings');
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return defaults;
  });

  const [tempSettings, setTempSettings] = useState(customizationSettings);

  useEffect(() => {
    if (isCustomizationModalOpen) {
      setTempSettings(customizationSettings);
    }
  }, [isCustomizationModalOpen, customizationSettings]);

  // Modale Export Elementor
  const [isElementorModalOpen, setIsElementorModalOpen] = useState(false);
  const [copiedElementor, setCopiedElementor] = useState(false);

  // État de sauvegarde
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'

  // Inspecteur latéral rétractable (Visual / Code)
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [inspectorMode, setInspectorMode] = useState('visual'); // 'visual' | 'code'
  const [codeTab, setCodeTab] = useState('html'); // 'html' | 'css' | 'js'

  // Tiroirs / Drawers mobiles (< lg)
  const [isModulesOpen, setIsModulesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Recherche et filtrage dans la banque d'outils
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Bloc sélectionné sur le Canvas
  const [selectedBlockId, setSelectedBlockId] = useState(null);

  // Modale d'import d'outils custom
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [customToolSnippet, setCustomToolSnippet] = useState('');

  // Modale de confirmation de suppression
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Toast temporaire
  const [toastMessage, setToastMessage] = useState(null);

  // États de Drag & Drop Permissif et Tolérant (UX Silicon Valley)
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const [dropTargetZone, setDropTargetZone] = useState(null); // null | 'top' | 'bottom' | number (index d'insertion)
  const dragCounterRef = useRef(0);
  const canvasScrollRef = useRef(null);

  // Code personnalisé pour l'éditeur IDE
  const [customHtmlInput, setCustomHtmlInput] = useState('');
  const [customCssInput, setCustomCssInput] = useState('');
  const [customJsInput, setCustomJsInput] = useState('');

  // Fermeture du dropdown au clic externe
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (publishDropdownRef.current && !publishDropdownRef.current.contains(e.target)) {
        setIsPublishDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Génération dynamique des blocs pour les 4 étapes selon les données reçues
  const [funnelCanvasData, setFunnelCanvasData] = useState(() => {
    return {
      optin: [
        {
          id: 'block-optin-hero',
          type: 'hero_live_masterclass',
          name: 'Hero 3D Live & Masterclass',
          data: {
            headline: `Accédez Gratuitement à l'Avant-Première : ${activeSource.title}`,
            subheadline: `Animé par ${activeSource.instructor}. Réservez votre accès avant la fermeture des inscriptions.`,
            promoBadge: '🎁 ACCÈS PRIVILÈGE 100% GRATUIT',
            instructorName: activeSource.instructor,
            instructorRole: activeSource.category,
            instructorAvatar: activeSource.instructorAvatar,
            image: activeSource.image,
            buttonText: 'Réserver Ma Place Gratuite Maintenant ⚡'
          }
        },
        {
          id: 'block-optin-form',
          type: 'webinar_registration_form',
          name: 'Inscription Live WhatsApp & Email',
          data: {
            headline: 'Recevez le lien privé et les supports par WhatsApp 📲',
            subheadline: 'Indiquez vos coordonnées pour recevoir votre billet nominatif.',
            buttonText: 'Confirmer Mon Inscription en 1-Clic 🚀',
            reassurance: '🔒 Accès immédiat • Zéro spam garanti',
            seatsLeft: 14
          }
        }
      ],
      sales: [
        {
          id: 'block-sales-hero',
          type: 'hero_live_masterclass',
          name: 'Hero 3D Live & Masterclass',
          data: {
            headline: activeSource.title,
            subheadline: activeSource.subtitle,
            promoBadge: '⚡ OFFRE DE LANCEMENT EXCLUSIVE',
            instructorName: activeSource.instructor,
            instructorRole: activeSource.category,
            instructorAvatar: activeSource.instructorAvatar,
            image: activeSource.image,
            price: activeSource.price || 35000,
            originalPrice: activeSource.originalPrice || 75000,
            buttonText: `Rejoindre le Programme • ${formatCFA(activeSource.price || 35000)} 🚀`
          }
        },
        {
          id: 'block-sales-timer',
          type: 'countdown_timer',
          name: 'Minuteur Urgence Défilant (FOMO)',
          data: {
            title: '🚨 CETTE OFFRE SPECIALE PREND FIN DANS :',
            initialHours: 18,
            initialMinutes: 30,
            initialSeconds: 45,
            bgColor: '#0f172a',
            accentColor: '#f59e0b'
          }
        },
        {
          id: 'block-sales-seats',
          type: 'seats_progress_bar',
          name: 'Jauge de Rareté des Places en Direct',
          data: {
            text: 'Dernières places disponibles avant clôture définitive !',
            percentage: 84
          }
        },
        {
          id: 'block-sales-syllabus',
          type: 'syllabus_modules',
          name: 'Programme & Syllabus de Cours',
          data: {
            headline: 'Le Programme Structuré pour Réussir',
            subheadline: 'Une méthodologie claire et immédiatement applicable.',
            modules: [
              { title: 'Module 1 : Maîtrise des Outils & Configuration Pro', duration: '3h 30m', lessons: '8 leçons' },
              { title: 'Module 2 : Stratégies de Croissance & Cas Pratiques', duration: '4h 45m', lessons: '12 leçons' },
              { title: 'Module 3 : Passage à l\'Échelle & Certification Officielle', duration: '5h 15m', lessons: '15 leçons' }
            ]
          }
        },
        {
          id: 'block-sales-bio',
          type: 'instructor_bio',
          name: 'Fiche Formateur & Certifications',
          data: {
            name: activeSource.instructor,
            title: 'Expert Agréé • NaNa Academy',
            bio: 'Spécialiste reconnu pour son approche concrète axée sur les résultats rapides et mesurables.',
            avatar: activeSource.instructorAvatar,
            badges: ['Note 4.9/5', 'Certifié Formateur Élite', 'Support Direct WhatsApp']
          }
        },
        {
          id: 'block-sales-cta',
          type: 'neon_pulse_cta',
          name: 'Bouton Géant Pulse Néon 3D',
          data: {
            buttonText: 'VALIDER MON ACCÈS INTÉGRAL EN 1-CLIC 🚀',
            subtext: '🔒 Garantie satisfait ou remboursé 30 jours • Paiement Mobile Money & Carte',
            btnBgColor: '#f59e0b',
            btnTextColor: '#000000',
            glowColor: 'rgba(245, 158, 11, 0.45)'
          }
        },
        {
          id: 'block-sales-faq',
          type: 'faq_webinar',
          name: 'FAQ Levée des Objections',
          data: {
            headline: 'Tout Ce Que Vous Devez Savoir Avant d\'Adhérer',
            items: [
              { q: 'Puis-je suivre la formation à mon propre rythme ?', a: 'Oui, vous disposez d\'un accès illimité à vie avec mises à jour gratuites incluses.' },
              { q: 'Comment se déroule le paiement ?', a: 'Vous pouvez payer directement par Wave, Orange Money, Moov Money, MTN ou Carte Bancaire.' }
            ]
          }
        },
        {
          id: 'block-sales-trust',
          type: 'trust_badges_edu',
          name: 'Sceaux Accréditation & Paiement Sécurisé',
          data: {
            text: 'Diplôme certifié NaNa Academy • Accréditation internationale',
            badges: ['Cryptage SSL 256-Bit', 'Paiement Wave Instantané', 'Orange Money Agréé', 'Garantie 30 Jours']
          }
        }
      ],
      upsell: [
        {
          id: 'block-upsell-hero',
          type: 'hero_live_masterclass',
          name: 'Hero 3D Live & Masterclass',
          data: {
            headline: '🚨 ATTENDEZ ! Ajoutez 1 Heure de Coaching Privé 1-on-1 (-65%)',
            subheadline: 'Une séance stratégique confidentielle avec votre instructeur pour auditer votre projet.',
            promoBadge: 'OFFRE COMPLÉMENTAIRE PRIVILÈGE',
            instructorName: activeSource.instructor,
            instructorRole: 'Séance Privée Zoom / Daily.co',
            instructorAvatar: activeSource.instructorAvatar,
            image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80',
            price: 15000,
            originalPrice: 45000,
            buttonText: 'OUI ! AJOUTER LE COACHING PRIVÉ (+15 000 F) ⚡'
          }
        }
      ],
      downsell: [
        {
          id: 'block-downsell-hero',
          type: 'hero_live_masterclass',
          name: 'Hero 3D Live & Masterclass',
          data: {
            headline: 'Dernière Chance : Accédez au Pack Résumés & Replays Seuls 🏷️',
            subheadline: 'Si le programme complet dépasse votre budget actuel, gardez les enregistrements essentiels.',
            promoBadge: 'TARIF SAUVETAGE ÉTUDIANT',
            instructorName: activeSource.instructor,
            instructorRole: 'Pack Replay Seul',
            instructorAvatar: activeSource.instructorAvatar,
            image: activeSource.image,
            price: 12500,
            originalPrice: 25000,
            buttonText: 'PROFITER DU PACK REPLAY À 12 500 F CFA 🚀'
          }
        }
      ]
    };
  });

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sauvegarde et application dynamique des paramètres et personnalisation
  const handleSaveCustomization = async () => {
    const updatedSettings = { ...tempSettings };
    setCustomizationSettings(updatedSettings);
    try {
      localStorage.setItem('nana_funnel_custom_settings', JSON.stringify(updatedSettings));
    } catch (e) {}

    // Synchronisation en direct sur tous les blocs du Canvas
    setFunnelCanvasData(prev => {
      const updated = { ...prev };
      
      if (updated.sales) {
        updated.sales = updated.sales.map(block => {
          if (block.type === 'hero_live_masterclass') {
            return {
              ...block,
              data: {
                ...block.data,
                headline: updatedSettings.funnelTitle,
                subheadline: updatedSettings.funnelSubtitle,
                instructorName: updatedSettings.instructorName,
                instructorRole: updatedSettings.instructorRole,
                price: Number(updatedSettings.salePrice) || block.data.price,
                originalPrice: Number(updatedSettings.originalPrice) || block.data.originalPrice,
                promoBadge: updatedSettings.discountBadge || block.data.promoBadge,
                buttonText: `Rejoindre le Programme • ${formatCFA(Number(updatedSettings.salePrice) || 35000)} 🚀`
              }
            };
          }
          if (block.type === 'pricing_checkout_cta' || block.type === 'checkout_express_oneclick') {
            return {
              ...block,
              data: {
                ...block.data,
                price: Number(updatedSettings.salePrice) || block.data.price,
                originalPrice: Number(updatedSettings.originalPrice) || block.data.originalPrice
              }
            };
          }
          return block;
        });
      }

      if (updated.optin) {
        updated.optin = updated.optin.map(block => {
          if (block.type === 'hero_live_masterclass') {
            return {
              ...block,
              data: {
                ...block.data,
                headline: `Accédez Gratuitement à l'Avant-Première : ${updatedSettings.funnelTitle}`,
                subheadline: `Animé par ${updatedSettings.instructorName}. Réservez votre accès avant la fermeture des inscriptions.`,
                instructorName: updatedSettings.instructorName,
                instructorRole: updatedSettings.instructorRole
              }
            };
          }
          return block;
        });
      }

      return updated;
    });

    const targetSubdomain = (
      updatedSettings.subdomain ||
      activeSource?.subdomain ||
      activeSource?.slug ||
      (updatedSettings.funnelTitle ? updatedSettings.funnelTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') : '') ||
      'tunnel'
    ).trim().toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '') || 'tunnel';

    const rawCustom = updatedSettings.customDomain;
    const cleanCustomDomain = rawCustom ? cleanDomain(rawCustom) : null;
    const isRealCustom = updatedSettings.hostingType === 'custom_domain' && cleanCustomDomain && !cleanCustomDomain.endsWith('.nanasore.com') && !cleanCustomDomain.endsWith('.nsore.shop');

    const funnelPayload = {
      id: targetSubdomain,
      slug: targetSubdomain,
      subdomain: targetSubdomain,
      customDomain: isRealCustom ? cleanCustomDomain : null,
      hostingType: isRealCustom ? 'custom_domain' : 'path',
      title: updatedSettings.funnelTitle || activeSource?.title || 'Tunnel de Vente',
      funnelTitle: updatedSettings.funnelTitle || activeSource?.title || 'Tunnel de Vente',
      subtitle: updatedSettings.funnelSubtitle || activeSource?.subtitle || '',
      metaTitle: updatedSettings.metaTitle || updatedSettings.funnelTitle || activeSource?.title || 'Offre Spéciale',
      metaDescription: updatedSettings.metaDescription || updatedSettings.funnelSubtitle || 'Vente flash et commande rapide.',
      ogImageUrl: updatedSettings.ogImageUrl || activeSource?.image || '',
      salePrice: Number(updatedSettings.salePrice) || activeSource?.price || 25000,
      originalPrice: Number(updatedSettings.originalPrice) || (updatedSettings.salePrice ? Number(updatedSettings.salePrice) * 1.5 : 45000),
      merchantWhatsapp: updatedSettings.merchantWhatsapp || '',
      currency: updatedSettings.currency || 'FCFA',
      product: activeSource || null,
      products: activeSource ? [activeSource] : [],
      source: activeSource,
      steps: funnelCanvasData,
      blocks: currentStepBlocks,
      settings: updatedSettings,
      funnelType: 'ultimate',
      funnelStudio: 'ultimate_studio',
      linkPrefix: 'f',
      isPublished: true,
      updatedAt: new Date().toISOString()
    };

    // Écriture explicite immédiate dans Firestore (tenants, funnels, deals)
    try {
      await registerSubdomainInFirebase(targetSubdomain, funnelPayload.title, funnelPayload);
      await saveFunnelConfig(funnelPayload);
    } catch (saveErr) {
      console.warn('[ULTIMATE-FUNNEL-BUILDER] Erreur enregistrement sous-domaine storage:', saveErr);
    }

    if (onSave) {
      try { onSave(funnelPayload); } catch (e) {}
    }

    triggerToast(`✅ Tunnel enregistré ! Lien direct : https://nanasore.com/f/${targetSubdomain} ✨`);
    try { playCashChime(); } catch (e) {}
    setIsCustomizationModalOpen(false);
  };

  // Réinitialisation des paramètres
  const handleResetCustomization = () => {
    const defaults = {
      themePreset: 'gold_luxury',
      primaryColor: '#f59e0b',
      accentColor: '#fbbf24',
      bgColor: '#090d16',
      fontFamily: 'Inter',
      borderRadius: 'rounded-2xl',
      ctaGlow: true,
      funnelTitle: activeSource?.title || 'Masterclass Complète : Intelligence Artificielle & Automatisation No-Code',
      funnelSubtitle: activeSource?.subtitle || 'Propulsez votre entreprise au niveau supérieur avec les outils de pointe (Claude, ChatGPT, Make & NaNa).',
      instructorName: activeSource?.instructor || 'Prof. Amadou Traoré',
      instructorRole: activeSource?.category || 'Lead AI Architect • Intelligence Artificielle & Business',
      headerBadge: activeSource?.type === 'course' ? 'Espace Professeurs' : 'Live / Webinaire',
      logoUrl: activeSource?.instructorAvatar || '',
      salePrice: activeSource?.price || 35000,
      originalPrice: activeSource?.originalPrice || 75000,
      currency: 'F CFA',
      discountBadge: '-53% OFFRE LIMITÉE',
      enableWave: true,
      enableOrangeMoney: true,
      enableMtnMomo: true,
      enableMoovMoney: true,
      enableCard: true,
      enableCod: true,
      merchantWhatsapp: '+225 07 00 00 00 00',
      hostingType: 'subdomain',
      subdomain: 'ia-masterclass',
      customDomain: '',
      metaTitle: activeSource?.title || 'Masterclass IA & No-Code',
      metaDescription: activeSource?.subtitle || 'Formation exclusive et certification officielle.',
      ogImageUrl: activeSource?.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
      metaPixelId: '',
      googleAnalyticsId: '',
      tiktokPixelId: '',
      webhookUrl: '',
      redirectAfterPayment: 'auto'
    };
    setTempSettings(defaults);
    triggerToast('Paramètres réinitialisés aux valeurs d\'origine');
  };

  // Blocs de l'étape courante
  const currentStepBlocks = funnelCanvasData[activeStepId] || [];

  // Bloc sélectionné actuel
  const currentSelectedBlock = currentStepBlocks.find(b => b.id === selectedBlockId) || currentStepBlocks[0] || null;

  // Auto-sélection
  useEffect(() => {
    if (currentStepBlocks.length > 0 && (!selectedBlockId || !currentStepBlocks.some(b => b.id === selectedBlockId))) {
      setSelectedBlockId(currentStepBlocks[0].id);
    }
  }, [activeStepId, currentStepBlocks, selectedBlockId]);

  // Synchronisation des champs de code lors du changement de bloc
  useEffect(() => {
    if (currentSelectedBlock) {
      setCustomHtmlInput(currentSelectedBlock.data?.customHtml || `<div class="p-6 text-center">\n  <h2 class="text-2xl font-black text-amber-400">${currentSelectedBlock.data?.headline || currentSelectedBlock.name}</h2>\n  <p class="text-sm text-slate-300 mt-2">${currentSelectedBlock.data?.subheadline || ''}</p>\n</div>`);
      setCustomCssInput(currentSelectedBlock.data?.customCss || `/* Styles personnalisés pour ${currentSelectedBlock.name} */\n.block-custom {\n  transition: all 0.3s ease;\n  backdrop-filter: blur(16px);\n}`);
      setCustomJsInput(currentSelectedBlock.data?.customJs || `// Injection de scripts (Tracking Pixels, Event Listeners)\nconsole.log("Bloc actif : ${currentSelectedBlock.name}");`);
    }
  }, [selectedBlockId]);

  // ============================================================================
  // GESTION DU DRAG & DROP PERMISSIF & TOLÉRANT (CANVAS & ZONES D'INSERTION)
  // ============================================================================
  const handleDragStart = (e, blockTemplate) => {
    e.dataTransfer.setData('application/json', JSON.stringify(blockTemplate));
    e.dataTransfer.setData('text/plain', JSON.stringify(blockTemplate));
    e.dataTransfer.effectAllowed = 'copy';
    setIsDraggingActive(true);
  };

  const handleDragEnd = () => {
    setIsDraggingActive(false);
    setDropTargetZone(null);
    dragCounterRef.current = 0;
  };

  const handleCanvasDragEnter = (e) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDraggingActive(true);
  };

  const handleCanvasDragLeave = (e) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDraggingActive(false);
      setDropTargetZone(null);
      dragCounterRef.current = 0;
    }
  };

  const handleCanvasDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const insertBlockAtIndex = (blockTemplate, targetIndex) => {
    const newBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: blockTemplate.type,
      name: blockTemplate.name,
      data: { ...blockTemplate.defaultData }
    };

    setFunnelCanvasData(prev => {
      const currentList = [...(prev[activeStepId] || [])];
      const safeIndex = typeof targetIndex === 'number'
        ? Math.max(0, Math.min(targetIndex, currentList.length))
        : currentList.length;
      currentList.splice(safeIndex, 0, newBlock);
      return {
        ...prev,
        [activeStepId]: currentList
      };
    });
    setSelectedBlockId(newBlock.id);
    return newBlock;
  };

  const handleDropAtIndex = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingActive(false);
    setDropTargetZone(null);
    dragCounterRef.current = 0;

    try {
      const rawData = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const blockTemplate = JSON.parse(rawData);
      insertBlockAtIndex(blockTemplate, targetIndex);
      try { playValidationBeep(); } catch (err) {}
      triggerToast(`✨ Bloc "${blockTemplate.name}" inséré avec succès !`);
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const handleCanvasDrop = (e) => {
    e.preventDefault();
    setIsDraggingActive(false);
    setDropTargetZone(null);
    dragCounterRef.current = 0;

    try {
      const rawData = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const blockTemplate = JSON.parse(rawData);

      if (typeof dropTargetZone === 'number') {
        insertBlockAtIndex(blockTemplate, dropTargetZone);
      } else if (dropTargetZone === 'top') {
        insertBlockAtIndex(blockTemplate, 0);
      } else {
        insertBlockAtIndex(blockTemplate, currentStepBlocks.length);
      }

      try { playValidationBeep(); } catch (err) {}
      triggerToast(`✨ Composant "${blockTemplate.name}" déposé avec succès !`);
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const addNewBlock = (blockTemplate) => {
    const newBlock = insertBlockAtIndex(blockTemplate, currentStepBlocks.length);
    triggerToast(`✨ Bloc "${blockTemplate.name}" ajouté au Canvas !`);
    return newBlock;
  };

  const moveBlock = (index, direction) => {
    const newBlocks = [...currentStepBlocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;

    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;

    setFunnelCanvasData(prev => ({
      ...prev,
      [activeStepId]: newBlocks
    }));
    try { playTapBeep(); } catch (e) {}
  };

  const duplicateBlock = (index) => {
    const original = currentStepBlocks[index];
    const duplicated = {
      ...original,
      id: `block-dup-${Date.now()}`,
      name: `${original.name} (Copie)`,
      data: { ...original.data }
    };
    const newBlocks = [...currentStepBlocks];
    newBlocks.splice(index + 1, 0, duplicated);

    setFunnelCanvasData(prev => ({
      ...prev,
      [activeStepId]: newBlocks
    }));
    setSelectedBlockId(duplicated.id);
    try { playValidationBeep(); } catch (e) {}
  };

  const deleteBlock = (index) => {
    const newBlocks = currentStepBlocks.filter((_, idx) => idx !== index);
    setFunnelCanvasData(prev => ({
      ...prev,
      [activeStepId]: newBlocks
    }));
    if (newBlocks.length > 0) {
      setSelectedBlockId(newBlocks[Math.max(0, index - 1)].id);
    } else {
      setSelectedBlockId(null);
    }
    try { playCancelSound(); } catch (e) {}
  };

  const updateSelectedBlock = (field, value) => {
    if (!selectedBlockId) return;
    setFunnelCanvasData(prev => ({
      ...prev,
      [activeStepId]: prev[activeStepId].map(block => {
        if (block.id === selectedBlockId) {
          return {
            ...block,
            data: {
              ...block.data,
              [field]: value
            }
          };
        }
        return block;
      })
    }));
  };

  const applyCodeInjection = () => {
    if (!selectedBlockId) return;
    updateSelectedBlock('customHtml', customHtmlInput);
    updateSelectedBlock('customCss', customCssInput);
    updateSelectedBlock('customJs', customJsInput);
    try { playValidationBeep(); } catch (e) {}
    triggerToast('Code HTML/CSS/JS injecté avec succès dans le Canvas ! ⚡');
  };

  const effectiveSubdomain = (
    customizationSettings.subdomain ||
    activeSource?.subdomain ||
    activeSource?.slug ||
    (activeSource?.title ? activeSource.title.toLowerCase().replace(/[^a-z0-9]/g, '-') : '') ||
    (activeSource?.name ? activeSource.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : '') ||
    (activeSource?.id ? String(activeSource.id).replace(/[^a-z0-9-]/g, '') : '') ||
    'tunnel'
  ).toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '') || 'tunnel';

  const handleSave = async () => {
    try { playCashChime(); } catch (e) {}
    setSaveStatus('saving');
    incrementStoredFunnelsCount();

    const rawCustom = customizationSettings.customDomain;
    const cleanCustomDomain = rawCustom ? cleanDomain(rawCustom) : null;
    const isRealCustom = customizationSettings.hostingType === 'custom_domain' && cleanCustomDomain && !cleanCustomDomain.endsWith('.nanasore.com') && !cleanCustomDomain.endsWith('.nsore.shop');

    const funnelPayload = {
      id: effectiveSubdomain,
      slug: effectiveSubdomain,
      subdomain: effectiveSubdomain,
      productId: activeSource?.id || effectiveSubdomain,
      customDomain: isRealCustom ? cleanCustomDomain : null,
      hostingType: isRealCustom ? 'custom_domain' : 'path',
      title: customizationSettings.funnelTitle || activeSource?.title || 'Tunnel de Vente',
      funnelTitle: customizationSettings.funnelTitle || activeSource?.title || 'Tunnel de Vente',
      subtitle: customizationSettings.funnelSubtitle || activeSource?.subtitle || '',
      metaTitle: customizationSettings.metaTitle || customizationSettings.funnelTitle || activeSource?.title || 'Offre Spéciale',
      metaDescription: customizationSettings.metaDescription || customizationSettings.funnelSubtitle || 'Vente flash et commande rapide.',
      ogImageUrl: customizationSettings.ogImageUrl || activeSource?.image || '',
      salePrice: Number(customizationSettings.salePrice) || activeSource?.price || 25000,
      originalPrice: Number(customizationSettings.originalPrice) || (customizationSettings.salePrice ? Number(customizationSettings.salePrice) * 1.5 : 45000),
      merchantWhatsapp: customizationSettings.merchantWhatsapp || '',
      currency: customizationSettings.currency || 'FCFA',
      product: activeSource || null,
      products: activeSource ? [activeSource] : [],
      source: activeSource,
      steps: funnelCanvasData,
      blocks: currentStepBlocks,
      settings: customizationSettings,
      funnelType: 'ultimate',
      funnelStudio: 'ultimate_studio',
      linkPrefix: 'f',
      isPublished: true,
      updatedAt: new Date().toISOString()
    };

    try {
      await registerSubdomainInFirebase(effectiveSubdomain, funnelPayload.title, funnelPayload);
      await saveFunnelConfig(funnelPayload);

      if (isRealCustom && cleanCustomDomain) {
        await saveTenantCustomDomain(effectiveSubdomain, cleanCustomDomain, {
          storeName: funnelPayload.title,
          type: 'funnel',
          vendorType: 'funnel',
          funnelId: effectiveSubdomain,
          funnelSlug: effectiveSubdomain,
          dealSlug: effectiveSubdomain,
          logoUrl: funnelPayload.ogImageUrl || '',
          primaryColor: funnelPayload.brandColor || '#10b981',
          funnelData: funnelPayload,
          whiteLabel: {
            hidePoweredBy: true,
            hideReceiptLogo: true
          }
        });
      }
    } catch (e) {
      console.warn('[ULTIMATE-FUNNEL-BUILDER] Erreur storage handleSave:', e);
    }

    setSaveStatus('saved');
    if (onSave) onSave(funnelPayload);
    if (isRealCustom && cleanCustomDomain) {
      triggerToast(`💾 Tunnel enregistré et lié au domaine : https://${cleanCustomDomain} ⚡`);
    } else {
      triggerToast(`💾 Tunnel enregistré ! Lien direct : https://nanasore.com/f/${effectiveSubdomain}`);
    }
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  // Export JSON Elementor
  const generateElementorJson = () => {
    return JSON.stringify({
      version: '0.4',
      title: `NaNa NextGen Funnel - ${activeSource.title} - [${activeStepId.toUpperCase()}]`,
      type: 'page',
      content: currentStepBlocks.map((block, idx) => ({
        id: `el_sec_${block.id}`,
        elType: 'section',
        settings: {
          background_background: 'classic',
          background_color: block.data?.bgColor || '#0a0e1a',
          padding: { top: 45, bottom: 45, unit: 'px' }
        },
        elements: [
          {
            id: `el_col_${idx}`,
            elType: 'column',
            elements: [
              {
                id: `el_heading_${idx}`,
                elType: 'widget',
                widgetType: 'heading',
                settings: {
                  title: block.data?.headline || block.name,
                  align: 'center',
                  title_color: '#ffffff'
                }
              }
            ]
          }
        ]
      }))
    }, null, 2);
  };

  const funnelOrigin = typeof window !== 'undefined'
    ? (window.location.hostname.includes('localhost') ? window.location.origin : 'https://nanasore.com')
    : 'https://nanasore.com';
  const publicFunnelUrl = useMemo(() => {
    if (customizationSettings.hostingType === 'custom_domain' && customizationSettings.customDomain) {
      return `https://${customizationSettings.customDomain.replace(/^https?:\/\//, '')}`;
    }
    const slug = effectiveSubdomain || 'offre';
    return `${funnelOrigin}/f/${slug}`;
  }, [customizationSettings.hostingType, customizationSettings.customDomain, effectiveSubdomain, funnelOrigin]);

  const directPathUrl = publicFunnelUrl;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] h-screen h-[100dvh] max-h-screen w-screen max-w-[100vw] overflow-hidden bg-[#040711] flex flex-col font-sans select-none text-slate-100 animate-in fade-in duration-300">
      
      {/* ================================================================== */}
      {/* 1. LE MENU SUPÉRIEUR FIXE (NAVIGATION & HUB DE PUBLICATION)       */}
      {/* ================================================================== */}
      <header className="sticky top-0 z-40 h-16 w-full px-4 bg-slate-900/95 border-b border-slate-800/80 flex items-center justify-between shrink-0 backdrop-blur-xl shadow-2xl select-none">
        
        {/* Identité & Données reçues du Cours/Webinaire */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Bouton de Retour */}
          <button
            type="button"
            onClick={() => {
              try { playTapBeep(); } catch (e) {}
              if (onClose) onClose();
            }}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
            title="Retour au Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline text-xs font-bold">Retour</span>
          </button>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/25 text-slate-950 font-black shrink-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950" />
          </div>

          <div className="truncate">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-base font-black text-white tracking-tight flex items-center gap-1.5 truncate">
                <span className="truncate">Ultimate Funnel</span>
                <span className="text-amber-400 shrink-0">⚡</span>
              </h1>

              {/* Badge du type de source */}
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 shrink-0">
                {activeSource.type === 'course' ? <GraduationCap className="w-3 h-3 text-indigo-400" /> : <Video className="w-3 h-3 text-rose-400" />}
                <span>{customizationSettings?.headerBadge || (activeSource.type === 'course' ? 'Espace Professeurs' : 'Live / Webinaire')}</span>
              </span>
            </div>

            <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[140px] sm:max-w-xs md:max-w-md">
              {customizationSettings?.funnelTitle || activeSource.title}
            </p>
          </div>
        </div>

        {/* Sélecteur de Parcours Client (Stepper Tabs Haute Conversion) */}
        <div className="hidden lg:flex items-center bg-slate-950/80 p-1 rounded-2xl border border-slate-800/80">
          {FUNNEL_JOURNEY_STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = activeStepId === step.id;
            return (
              <button
                key={step.id}
                onClick={() => {
                  try { playTapBeep(); } catch (e) {}
                  setActiveStepId(step.id);
                }}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  isActive ? 'text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="ultimateStepperIndicator"
                    className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-xl"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className={`w-3.5 h-3.5 relative z-10 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="relative z-10">{step.name}</span>
                <span className="relative z-10 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md border border-emerald-500/20">
                  {step.conversion}
                </span>
              </button>
            );
          })}
        </div>

        {/* Actions & Hub de Publication */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Bouton Paramètres & Personnalisation (Visible & accessible sur mobile et desktop) */}
          <button
            type="button"
            onClick={() => {
              try { playTapBeep(); } catch (e) {}
              setIsCustomizationModalOpen(true);
            }}
            className="px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-300 hover:text-white border border-amber-500/40 hover:border-amber-400 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm group shrink-0"
            title="Paramètres généraux, branding, design et personnalisation du tunnel"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-90 transition-transform duration-300" />
            <span className="hidden sm:inline">Paramètres & Personnalisation</span>
            <span className="sm:hidden text-[11px] font-bold">Paramètres</span>
          </button>

          {/* Bouton Magique "Ouvrir dans Elementor" */}
          <button
            onClick={() => {
              try { playTapBeep(); } catch (e) {}
              setIsElementorModalOpen(true);
            }}
            className="hidden md:flex px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold items-center gap-1.5 transition cursor-pointer border border-slate-700/60 shadow-sm shrink-0"
            title="Exporter directement la structure en JSON Elementor 3.x"
          >
            <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ouvrir dans Elementor</span>
          </button>

          {/* ============================================================== */}
          {/* BOUTON D'ACTION PRINCIPAL CLIGNOTANT : PUBLIER LE FUNNEL 🚀    */}
          {/* ============================================================== */}
          <div className="relative" ref={publishDropdownRef}>
            
            <button
              onClick={() => {
                try { playTapBeep(); } catch (e) {}
                setIsPublishDropdownOpen(!isPublishDropdownOpen);
              }}
              className="relative px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-amber-500/30 active:scale-95 group overflow-hidden"
            >
              {/* Effet clignotant / palpitant Silicon Valley */}
              <span className="absolute -inset-1 rounded-xl bg-amber-400/30 animate-pulse pointer-events-none" />
              <Rocket className="w-4 h-4 text-slate-950 relative z-10 group-hover:rotate-12 transition-transform" />
              <span className="relative z-10">Publier le Funnel 🚀</span>
              <ChevronDown className={`w-3.5 h-3.5 relative z-10 transition-transform ${isPublishDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Menu Déroulant Premium de Publication (3 Options) */}
            <AnimatePresence>
              {isPublishDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50 divide-y divide-slate-800/60"
                >
                  {/* Option 1 : Publier sur le Web */}
                  <button
                    onClick={() => {
                      setIsPublishDropdownOpen(false);
                      setActivePublishModal('web');
                      try { playValidationBeep(); } catch (e) {}
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-slate-800/80 flex items-start gap-3 transition cursor-pointer text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                        Publier sur le Web
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Génère une URL publique instantanée avec SSL et QR Code.
                      </p>
                    </div>
                  </button>

                  {/* Option 2 : Partager sur les Réseaux Sociaux */}
                  <button
                    onClick={() => {
                      setIsPublishDropdownOpen(false);
                      setActivePublishModal('social');
                      try { playValidationBeep(); } catch (e) {}
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-slate-800/80 flex items-start gap-3 transition cursor-pointer text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                        Partager sur les Réseaux
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Cartes optimisées pour WhatsApp, LinkedIn et Facebook.
                      </p>
                    </div>
                  </button>

                  {/* Option 3 : Publier en Interne */}
                  <button
                    onClick={() => {
                      setIsPublishDropdownOpen(false);
                      setActivePublishModal('internal');
                      try { playCashChime(); } catch (e) {}
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-slate-800/80 flex items-start gap-3 transition cursor-pointer text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                        Publier en Interne
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Rend le tunnel visible dans le catalogue étudiant & la marketplace.
                      </p>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bouton Sauvegarder */}
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Sauvegarder en brouillon"
          >
            {saveStatus === 'saving' ? (
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            ) : saveStatus === 'saved' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="hidden md:inline">{saveStatus === 'saved' ? 'Enregistré ✓' : 'Sauvegarder'}</span>
          </button>

          {/* Bouton Supprimer */}
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
            title="Supprimer ce funnel"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Fermer */}
          <button
            onClick={() => {
              try { playTapBeep(); } catch (e) {}
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer ml-1"
            title="Fermer le constructeur"
          >
            <X className="w-5 h-5" />
          </button>

        </div>
      </header>

      {/* Bannière de Notification Toast */}
      {toastMessage && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/95 border border-amber-500/50 text-amber-300 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* 2. ESPACE DE TRAVAIL EN 3 ZONES INTERACTIVES (BANQUE, CANVAS, CODE) */}
      {/* ================================================================== */}
      <div className="flex-1 min-h-0 h-full w-full flex overflow-hidden relative">
        
        {/* ================================================================ */}
        {/* 2. LA BANQUE D'OUTILS (TIROIR MOBILE / FIXE DESKTOP)              */}
        {/* ================================================================ */}
        {/* Backdrop sombre sur mobile */}
        {isModulesOpen && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
            onClick={() => setIsModulesOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-3/4 sm:w-80 max-w-[85vw] lg:relative lg:translate-x-0 lg:w-80 lg:shrink-0 h-full max-h-full bg-slate-900/95 border-r border-slate-800/80 flex flex-col shadow-2xl backdrop-blur-md overflow-hidden select-none transform transition-transform duration-300 ease-in-out ${
            isModulesOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none lg:pointer-events-auto lg:translate-x-0'
          }`}
        >
          {/* En-tête fixe de la bibliothèque */}
          <div className="p-4 border-b border-slate-800/80 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Banque d'Outils ⚡
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Prêt au Drop
                </span>
                {/* Bouton Fermer sur Mobile */}
                <button
                  type="button"
                  onClick={() => setIsModulesOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition lg:hidden cursor-pointer"
                  title="Fermer la banque d'outils"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Recherche de blocs */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={toolSearchQuery}
                onChange={(e) => setToolSearchQuery(e.target.value)}
                placeholder="Chercher (Hero, Programme, WhatsApp...)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            {/* Filtres par Catégorie */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {BLOCK_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold shrink-0 transition cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Liste des blocs déplaçables - Défilement indépendant façon macOS */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2.5 custom-scrollbar">
            <p className="text-[11px] text-slate-400 font-medium px-1 flex items-center gap-1">
              <MousePointer className="w-3 h-3 text-amber-400" />
              <span>Glissez-déposez vers le Canvas :</span>
            </p>

            {READY_TO_USE_BLOCKS
              .filter(b => (selectedCategory === 'all' || b.category === selectedCategory) &&
                           (b.name.toLowerCase().includes(toolSearchQuery.toLowerCase()) || b.description.toLowerCase().includes(toolSearchQuery.toLowerCase())))
              .map((block) => {
                const Icon = block.icon;
                return (
                  <div
                    key={block.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, block)}
                    onDragEnd={handleDragEnd}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/40 transition-all duration-200 cursor-grab active:cursor-grabbing group shadow-sm flex flex-col gap-1.5 select-none relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="font-bold text-xs text-white group-hover:text-amber-300 transition">
                          {block.name}
                        </h4>
                      </div>
                      {block.badge && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {block.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-[10.5px] text-slate-400 leading-relaxed line-clamp-2">
                      {block.description}
                    </p>

                    <div className="pt-1.5 flex items-center justify-between border-t border-slate-800/60 text-[10px] text-slate-500">
                      <span>Glisser vers le centre</span>
                      <button
                        onClick={() => {
                          addNewBlock(block);
                          try { playValidationBeep(); } catch (e) {}
                        }}
                        className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Ajouter</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Bouton fixe en bas : "Importer des Outils Personnalisés" */}
          <div className="p-3 bg-slate-950 border-t border-slate-800/80 shrink-0">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Importer des Outils Personnalisés</span>
            </button>
          </div>

        </aside>

        {/* ================================================================ */}
        {/* 3. LE CANVAS CENTRAL (ZONE DE CRÉATION DRAG & DROP WYSIWYG)        */}
        {/* ================================================================ */}
        <main
          className="flex-1 w-full min-h-0 h-full max-h-full bg-[#04060d] flex flex-col overflow-hidden relative"
          onDragOver={handleCanvasDragOver}
          onDragEnter={handleCanvasDragEnter}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
        >
          {/* Barre d'Outils du Canvas (Sélecteur d'Écran Responsive) - Fixe en haut */}
          <div className="h-12 px-6 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between shrink-0 backdrop-blur-sm z-20">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Canvas WYSIWYG :</span>
              <span className="text-white bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                {FUNNEL_JOURNEY_STEPS.find(s => s.id === activeStepId)?.name}
              </span>
            </div>

            {/* Sélecteur de périphérique */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setCanvasDevice('desktop')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  canvasDevice === 'desktop' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Grand Écran Ordinateur"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>

              <button
                onClick={() => setCanvasDevice('tablet')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  canvasDevice === 'tablet' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Tablette Tactile"
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tablette</span>
              </button>

              <button
                onClick={() => setCanvasDevice('mobile')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  canvasDevice === 'mobile' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Smartphone Mobile"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>
          </div>

          {/* Espace de Rendu du Canvas - Défilement indépendant façon macOS */}
          <div
            ref={canvasScrollRef}
            className="flex-1 overflow-y-auto h-full min-h-0 overscroll-contain p-4 sm:p-8 flex flex-col items-center custom-scrollbar relative"
          >
            {/* Bannière flottante d'aide au drop en cours de manipulation */}
            {isDraggingActive && (
              <div className="sticky top-2 z-40 mx-auto w-fit px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 mb-4">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Zone de dépôt active : Déposez le bloc dans la zone de votre choix</span>
              </div>
            )}

            <div
              style={{
                backgroundColor: customizationSettings?.bgColor || undefined,
                fontFamily: customizationSettings?.fontFamily ? `${customizationSettings.fontFamily}, sans-serif` : undefined
              }}
              className={`transition-all duration-300 h-fit min-h-full pb-56 sm:pb-72 relative ${
                canvasDevice === 'mobile'
                  ? 'w-[380px] rounded-[44px] border-[8px] border-slate-800 shadow-[0_30px_90px_rgba(0,0,0,0.8)] bg-slate-950 ring-1 ring-slate-700/60'
                  : canvasDevice === 'tablet'
                  ? 'w-[640px] rounded-3xl border-2 border-slate-800 shadow-2xl bg-slate-950'
                  : 'w-full max-w-4xl rounded-3xl border border-slate-800/80 shadow-2xl bg-slate-950'
              } ${
                isDraggingActive ? 'ring-2 ring-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.1)]' : ''
              }`}
            >
              {/* Encoche smartphone si mode mobile */}
              {canvasDevice === 'mobile' && (
                <div className="h-6 bg-slate-900 flex items-center justify-center border-b border-slate-800/60">
                  <div className="w-24 h-3.5 bg-black rounded-full" />
                </div>
              )}

              {/* Zone de Dépôt Supérieure Permissive (Insérer au début du tunnel) */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'copy';
                  setDropTargetZone('top');
                }}
                onDragLeave={(e) => {
                  e.stopPropagation();
                  if (dropTargetZone === 'top') setDropTargetZone(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDropAtIndex(e, 0);
                }}
                className={`transition-all duration-200 select-none ${
                  dropTargetZone === 'top'
                    ? 'h-16 bg-gradient-to-b from-amber-500/20 to-transparent border-b-2 border-amber-400 flex items-center justify-center'
                    : isDraggingActive
                    ? 'h-10 border-b border-dashed border-amber-500/40 bg-amber-500/[0.03] flex items-center justify-center'
                    : 'h-2 hover:h-6 opacity-0 hover:opacity-100 flex items-center justify-center'
                }`}
              >
                {(isDraggingActive || dropTargetZone === 'top') && (
                  <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1 rounded-full transition shadow-sm ${
                    dropTargetZone === 'top'
                      ? 'bg-amber-500 text-slate-950 shadow-amber-500/30 animate-pulse'
                      : 'bg-slate-900/90 text-amber-400 border border-amber-500/30'
                  }`}>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Insérer au début du tunnel</span>
                  </span>
                )}
              </div>

              {/* Rendu des blocs avec micro-animations Framer Motion au survol */}
              <div className="divide-y divide-slate-800/40 pb-40">
                {currentStepBlocks.map((block, index) => {
                  const isSelected = block.id === selectedBlockId;
                  const isHoveredDropZone = dropTargetZone === index + 1;

                  return (
                    <React.Fragment key={block.id}>
                      <motion.div
                        layout
                        onClick={() => setSelectedBlockId(block.id)}
                        whileHover={{ scale: 1.002 }}
                        transition={{ duration: 0.15 }}
                        className={`relative group p-6 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-amber-500 bg-amber-500/[0.03] shadow-lg'
                            : 'hover:bg-slate-900/40'
                        }`}
                      >
                        {/* Barre d'actions contextuelle au survol */}
                        <div
                          className={`absolute top-2 right-3 z-30 flex items-center gap-1 bg-slate-900/95 border border-slate-700 px-2.5 py-1 rounded-xl shadow-xl backdrop-blur-md transition-opacity duration-200 ${
                            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <span className="text-[10px] font-bold text-amber-400 mr-1.5 truncate max-w-[110px]">
                            {block.name}
                          </span>

                          <button
                            onClick={(e) => { e.stopPropagation(); moveBlock(index, 'up'); }}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
                            title="Monter"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); moveBlock(index, 'down'); }}
                            disabled={index === currentStepBlocks.length - 1}
                            className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
                            title="Descendre"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); duplicateBlock(index); }}
                            className="p-1 rounded hover:bg-slate-800 text-indigo-300 cursor-pointer"
                            title="Dupliquer ce bloc"
                          >
                            <DuplicateIcon className="w-3 h-3" />
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); deleteBlock(index); }}
                            className="p-1 rounded hover:bg-rose-950/60 text-rose-400 cursor-pointer"
                            title="Supprimer ce bloc"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Composant Visuel de Rendu WYSIWYG */}
                        {renderWYSIWYGBlock(block, activeSource)}

                      </motion.div>

                      {/* Zone de Dépôt Inter-Blocs Permissive et Tolérante */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.dataTransfer.dropEffect = 'copy';
                          setDropTargetZone(index + 1);
                        }}
                        onDragLeave={(e) => {
                          e.stopPropagation();
                          if (dropTargetZone === index + 1) setDropTargetZone(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDropAtIndex(e, index + 1);
                        }}
                        className={`transition-all duration-200 flex items-center justify-center relative select-none ${
                          isHoveredDropZone
                            ? 'h-14 bg-gradient-to-r from-amber-500/15 via-amber-500/25 to-amber-500/15 border-y-2 border-amber-400'
                            : isDraggingActive
                            ? 'h-9 border-y border-dashed border-amber-500/30 bg-amber-500/[0.02]'
                            : 'h-2 hover:h-6'
                        }`}
                      >
                        {(isDraggingActive || isHoveredDropZone) && (
                          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold transition shadow-sm ${
                            isHoveredDropZone
                              ? 'bg-amber-500 text-slate-950 scale-105 shadow-amber-500/30'
                              : 'bg-slate-900/90 text-amber-400 border border-amber-500/20'
                          }`}>
                            <Plus className="w-3 h-3" />
                            <span>Insérer ici ⚡</span>
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Grande Zone de Dépôt Inférieure Permissive (Large Drop Zone Frustration-Free) */}
              <div className="p-6">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'copy';
                    setDropTargetZone('bottom');
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    if (dropTargetZone === 'bottom') setDropTargetZone(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDropAtIndex(e, currentStepBlocks.length);
                  }}
                  onClick={() => {
                    const firstTool = READY_TO_USE_BLOCKS[0];
                    if (firstTool) {
                      addNewBlock(firstTool);
                      try { playValidationBeep(); } catch (err) {}
                    }
                  }}
                  className={`w-full min-h-[140px] sm:min-h-[160px] rounded-3xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-6 text-center cursor-pointer group select-none ${
                    dropTargetZone === 'bottom'
                      ? 'border-amber-400 bg-amber-500/15 text-amber-200 scale-[1.01] shadow-2xl shadow-amber-500/20 ring-4 ring-amber-500/20'
                      : isDraggingActive
                      ? 'border-amber-500/60 bg-amber-500/[0.04] text-amber-300 ring-2 ring-amber-500/20 animate-pulse'
                      : 'border-slate-800 hover:border-amber-500/50 bg-slate-900/40 hover:bg-slate-900/70 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110 ${
                    dropTargetZone === 'bottom'
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/40'
                      : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  }`}>
                    <Plus className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
                    <span>Zone de Dépôt Permissive</span>
                    <span className="text-amber-400">⚡</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Glissez-déposez n'importe quel bloc depuis la Banque d'outils à gauche, ou cliquez pour insérer un bloc à la suite.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[10.5px] font-semibold text-amber-400/80 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Dépôt ultra-tolérant : glissez sans frustration</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>

        {/* ================================================================ */}
        {/* 4. L'INSPECTEUR & ÉDITEUR DE CODE (TIROIR MOBILE / FIXE DESKTOP)    */}
        {/* ================================================================ */}
        {/* Backdrop sombre sur mobile */}
        {isSettingsOpen && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
            onClick={() => setIsSettingsOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 right-0 z-50 w-3/4 sm:w-96 max-w-[85vw] lg:relative lg:translate-x-0 lg:shrink-0 h-full max-h-full bg-slate-900/95 border-l border-slate-800/80 flex flex-col shadow-2xl backdrop-blur-md transition-all duration-300 overflow-hidden select-none transform ${
            isSettingsOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none lg:pointer-events-auto lg:translate-x-0'
          } ${isInspectorOpen ? 'lg:w-88 lg:sm:w-96' : 'lg:w-10'}`}
        >
          {/* Bascule de panneau rétractable - Fixe en haut */}
          <div className="h-12 border-b border-slate-800/80 flex items-center justify-between px-3 gap-2 shrink-0">
            {isInspectorOpen ? (
              <>
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Inspecteur & Code
                  </h3>
                </div>

                {/* Bouton Fermer sur Mobile */}
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition lg:hidden cursor-pointer shrink-0"
                  title="Fermer l'inspecteur"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Bascule Visual / Code */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10.5px] font-bold">
                  <button
                    onClick={() => setInspectorMode('visual')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      inspectorMode === 'visual' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Visual
                  </button>
                  <button
                    onClick={() => setInspectorMode('code')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      inspectorMode === 'code' ? 'bg-indigo-600 text-white font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Terminal className="w-3 h-3" />
                    <span>Code VS</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsInspectorOpen(false)}
                  className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Replier le panneau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsInspectorOpen(true)}
                className="w-full h-full flex items-center justify-center text-slate-400 hover:text-amber-400 transition cursor-pointer"
                title="Déplier l'inspecteur"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Corps de l'Inspecteur - Défilement indépendant façon macOS */}
          {isInspectorOpen && (
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 custom-scrollbar">
              
              {!currentSelectedBlock ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Sélectionnez un bloc dans le Canvas pour l'ajuster.
                </div>
              ) : inspectorMode === 'visual' ? (
                
                // --- MODE VISUAL (UI INTUITIVE) ---
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-400">
                        Bloc Sélectionné
                      </span>
                      <h4 className="text-xs font-bold text-white">
                        {currentSelectedBlock.name}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      ID: {currentSelectedBlock.id.slice(-6)}
                    </span>
                  </div>

                  {/* Titre d'Accroche */}
                  {currentSelectedBlock.data?.headline !== undefined && (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Titre d'Accroche
                      </label>
                      <textarea
                        rows={2}
                        value={currentSelectedBlock.data.headline}
                        onChange={(e) => updateSelectedBlock('headline', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                      />
                    </div>
                  )}

                  {/* Sous-titre */}
                  {currentSelectedBlock.data?.subheadline !== undefined && (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Sous-titre / Promesse
                      </label>
                      <textarea
                        rows={2}
                        value={currentSelectedBlock.data.subheadline}
                        onChange={(e) => updateSelectedBlock('subheadline', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                      />
                    </div>
                  )}

                  {/* Texte du bouton CTA */}
                  {currentSelectedBlock.data?.buttonText !== undefined && (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Libellé du Bouton (CTA)
                      </label>
                      <input
                        type="text"
                        value={currentSelectedBlock.data.buttonText}
                        onChange={(e) => updateSelectedBlock('buttonText', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}

                  {/* Tarification */}
                  {currentSelectedBlock.data?.price !== undefined && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Prix (F CFA)
                        </label>
                        <input
                          type="number"
                          value={currentSelectedBlock.data.price}
                          onChange={(e) => updateSelectedBlock('price', Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Prix Barré (F CFA)
                        </label>
                        <input
                          type="number"
                          value={currentSelectedBlock.data.originalPrice || 0}
                          onChange={(e) => updateSelectedBlock('originalPrice', Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-400 line-through focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Visuel & Médias */}
                  {currentSelectedBlock.data?.image !== undefined && (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        URL de l'image / Vidéo
                      </label>
                      <input
                        type="url"
                        value={currentSelectedBlock.data.image}
                        onChange={(e) => updateSelectedBlock('image', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 mb-2"
                      />
                      <div className="h-28 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                        <img src={currentSelectedBlock.data.image} alt="Aperçu" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}

                  {/* Couleurs et Personnalisation */}
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <label className="block text-xs font-bold text-slate-300">
                      Design & Couleurs
                    </label>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Couleur Bouton</span>
                      <input
                        type="color"
                        value={currentSelectedBlock.data.btnBgColor || '#f59e0b'}
                        onChange={(e) => updateSelectedBlock('btnBgColor', e.target.value)}
                        className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Fond du Bloc</span>
                      <input
                        type="color"
                        value={currentSelectedBlock.data.bgColor || '#090d16'}
                        onChange={(e) => updateSelectedBlock('bgColor', e.target.value)}
                        className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
                      />
                    </div>
                  </div>

                </div>

              ) : (
                
                // --- MODE CODE (AVANCÉ FAÇON VS CODE) ---
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-indigo-400">
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Éditeur Code Live (VS Code)</span>
                    </div>
                    <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
                      Live Injection
                    </span>
                  </div>

                  {/* Onglets de fichiers */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
                    <button
                      onClick={() => setCodeTab('html')}
                      className={`py-1 rounded-lg transition cursor-pointer ${
                        codeTab === 'html' ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      HTML
                    </button>
                    <button
                      onClick={() => setCodeTab('css')}
                      className={`py-1 rounded-lg transition cursor-pointer ${
                        codeTab === 'css' ? 'bg-slate-800 text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      CSS
                    </button>
                    <button
                      onClick={() => setCodeTab('js')}
                      className={`py-1 rounded-lg transition cursor-pointer ${
                        codeTab === 'js' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      JS Tracking
                    </button>
                  </div>

                  {/* Boîte IDE façon VS Code */}
                  <div className="rounded-2xl border border-slate-800 bg-[#0d1117] overflow-hidden shadow-2xl">
                    <div className="px-3 py-1.5 bg-[#161b22] border-b border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                        <span className="ml-2 font-bold text-slate-300">
                          {codeTab === 'html' ? 'block.html' : codeTab === 'css' ? 'theme.css' : 'tracking-pixels.js'}
                        </span>
                      </span>
                      <span>UTF-8</span>
                    </div>

                    <textarea
                      rows={14}
                      value={codeTab === 'html' ? customHtmlInput : codeTab === 'css' ? customCssInput : customJsInput}
                      onChange={(e) => {
                        if (codeTab === 'html') setCustomHtmlInput(e.target.value);
                        else if (codeTab === 'css') setCustomCssInput(e.target.value);
                        else setCustomJsInput(e.target.value);
                      }}
                      className="w-full bg-[#0d1117] text-slate-200 font-mono text-[11px] p-3 focus:outline-none resize-none leading-relaxed select-text"
                      spellCheck={false}
                    />
                  </div>

                  <button
                    onClick={applyCodeInjection}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Appliquer et Injecter au Canvas ⚡</span>
                  </button>
                </div>
              )}

            </div>
          )}
        </aside>
      </div>

      {/* ================================================================== */}
      {/* BOUTONS FLOTTANTS (FAB) MOBILE : ACCÈS RAPIDE TIROIRS (lg:hidden)  */}
      {/* ================================================================== */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] lg:hidden flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl p-2 rounded-2xl border border-slate-700/80 shadow-[0_12px_40px_rgba(0,0,0,0.85)]">
        <button
          type="button"
          onClick={() => {
            setIsModulesOpen(true);
            setIsSettingsOpen(false);
            try { playTapBeep(); } catch (e) {}
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/30 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Modules</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsSettingsOpen(true);
            setIsModulesOpen(false);
            try { playTapBeep(); } catch (e) {}
          }}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center gap-1.5 border border-slate-700 active:scale-95 transition cursor-pointer shadow-md"
        >
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Éditer</span>
        </button>
      </div>

      {/* ================================================================== */}
      {/* MODALE 1 : PUBLIER SUR LE WEB                                      */}
      {/* ================================================================== */}
      {activePublishModal === 'web' && (
        <div className="fixed inset-0 z-[130] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Publier sur le Web 🌐</h3>
                  <p className="text-xs text-slate-400">Tunnel de vente accessible en direct sur internet</p>
                </div>
              </div>
              <button onClick={() => setActivePublishModal(null)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* URL Publique */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="block text-xs font-bold text-slate-300">Lien Public Direct :</label>
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 truncate">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{publicFunnelUrl}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(publicFunnelUrl);
                    triggerToast('Lien public copié dans le presse-papier ! ✓');
                    try { playValidationBeep(); } catch (e) {}
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier l'URL</span>
                </button>
                <a
                  href={publicFunnelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Tester en Live</span>
                </a>
              </div>
            </div>

            {/* Simulation QR Code Smartphone */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
              <div className="w-12 h-12 bg-white rounded-xl p-1 shrink-0 flex items-center justify-center">
                <QrCode className="w-10 h-10 text-slate-950" />
              </div>
              <p>Scannez ce QR Code avec un smartphone pour tester immédiatement l'expérience mobile haute conversion.</p>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODALE 2 : PARTAGER SUR LES RÉSEAUX SOCIAUX                        */}
      {/* ================================================================== */}
      {activePublishModal === 'social' && (
        <div className="fixed inset-0 z-[130] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Partage Multi-Canal 📲</h3>
                  <p className="text-xs text-slate-400">Cartes prêtes pour WhatsApp, LinkedIn & Facebook</p>
                </div>
              </div>
              <button onClick={() => setActivePublishModal(null)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Carte de Prévisualisation OpenGraph */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg">
              <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${activeSource.image})` }} />
              <div className="p-4 space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-400">NaNa Academy</span>
                <h4 className="text-xs font-black text-white leading-snug">{activeSource.title}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-2">{activeSource.subtitle}</p>
              </div>
            </div>

            {/* Boutons de Partage Direct */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🔥 *INVITATION PRIVILÈGE NA NA*\n\nNe manquez pas : *${activeSource.title}*\n\n👉 *Rejoindre le tunnel :* ${publicFunnelUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Diffuser sur WhatsApp</span>
              </a>

              {/* LinkedIn */}
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicFunnelUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Share className="w-4 h-4" />
                <span>Publier sur LinkedIn</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODALE 3 : PUBLIER EN INTERNE                                      */}
      {/* ================================================================== */}
      {activePublishModal === 'internal' && (
        <div className="fixed inset-0 z-[130] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
              <Compass className="w-7 h-7" />
            </div>

            <h3 className="text-base font-black text-white">
              Activer dans le Catalogue Interne NaNa ?
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              Ce tunnel sera immédiatement référencé dans l'<strong>Espace Étudiants</strong> et la <strong>Marketplace Marchande</strong> de NaNa. Tous les utilisateurs pourront s'inscrire ou commander en 1-clic.
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-left space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Élément :</span>
                <strong className="text-white truncate max-w-[200px]">{activeSource.title}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Statut actuel :</span>
                <span className="text-emerald-400 font-bold">Prêt pour diffusion</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setActivePublishModal(null)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setPublishedInternalState(true);
                  setActivePublishModal(null);
                  triggerToast('Tunnel publié avec succès dans le catalogue interne NaNa ! 🚀');
                  try { playCashChime(); } catch (e) {}
                }}
                className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Confirmer la Publication
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODALE : PARAMÈTRES & PERSONNALISATION DU TUNNEL                   */}
      {/* ================================================================== */}
      {isCustomizationModalOpen && (
        <div className="fixed inset-0 z-[130] bg-black/85 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Entête de la Modale */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">Paramètres & Personnalisation</h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                      Global Funnel Studio
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Ajustez le design, le branding, les tarifs, le domaine et les pixels de votre tunnel.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  try { playTapBeep(); } catch (e) {}
                  setIsCustomizationModalOpen(false);
                }}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Onglets de navigation */}
            <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-800/80 bg-slate-950/40 overflow-x-auto scrollbar-none">
              {[
                { id: 'theme', label: 'Thème & Design', icon: Palette },
                { id: 'general', label: 'Général & Branding', icon: Sliders },
                { id: 'pricing', label: 'Tarifs & Paiements', icon: CreditCard },
                { id: 'seo', label: 'Hébergement & SEO', icon: Globe },
                { id: 'pixels', label: 'Pixels & Webhooks', icon: Code2 }
              ].map(tab => {
                const TabIcon = tab.icon;
                const isActive = customizationActiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      try { playTapBeep(); } catch (e) {}
                      setCustomizationActiveTab(tab.id);
                    }}
                    className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'border-amber-400 text-amber-400 bg-slate-800/50'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Corps défilable de la modale */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 select-none">
              {/* Onglet 1: Thème & Design */}
              {customizationActiveTab === 'theme' && (
                <div className="space-y-6">
                  {/* Presets */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      <span>Palettes Thématiques Haut de Gamme</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {THEME_PRESETS.map((p) => {
                        const isSelected = tempSettings.themePreset === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              try { playTapBeep(); } catch (e) {}
                              setTempSettings(prev => ({
                                ...prev,
                                themePreset: p.id,
                                primaryColor: p.primary,
                                accentColor: p.accent,
                                bgColor: p.bg
                              }));
                            }}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                              isSelected
                                ? 'bg-slate-800/90 border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black text-white">{p.name}</span>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mb-3">{p.desc}</p>
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: p.primary }} title="Couleur Principale" />
                              <span className="w-5 h-5 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: p.accent }} title="Couleur d'Accent" />
                              <span className="w-5 h-5 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: p.bg }} title="Couleur de Fond" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Couleurs personnalisées */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Palette className="w-4 h-4 text-indigo-400" />
                      <span>Ajustement Fin des Couleurs (Hex)</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 font-bold block mb-1">Couleur Principale (CTA & Titres)</label>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
                          <input
                            type="color"
                            value={tempSettings.primaryColor || '#f59e0b'}
                            onChange={(e) => setTempSettings(prev => ({ ...prev, primaryColor: e.target.value, themePreset: 'custom' }))}
                            className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                          />
                          <input
                            type="text"
                            value={tempSettings.primaryColor || '#f59e0b'}
                            onChange={(e) => setTempSettings(prev => ({ ...prev, primaryColor: e.target.value, themePreset: 'custom' }))}
                            className="bg-transparent text-xs font-mono text-white focus:outline-none w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-bold block mb-1">Couleur d'Accentuation</label>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
                          <input
                            type="color"
                            value={tempSettings.accentColor || '#fbbf24'}
                            onChange={(e) => setTempSettings(prev => ({ ...prev, accentColor: e.target.value, themePreset: 'custom' }))}
                            className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                          />
                          <input
                            type="text"
                            value={tempSettings.accentColor || '#fbbf24'}
                            onChange={(e) => setTempSettings(prev => ({ ...prev, accentColor: e.target.value, themePreset: 'custom' }))}
                            className="bg-transparent text-xs font-mono text-white focus:outline-none w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-bold block mb-1">Couleur Fond Canvas</label>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
                          <input
                            type="color"
                            value={tempSettings.bgColor || '#090d16'}
                            onChange={(e) => setTempSettings(prev => ({ ...prev, bgColor: e.target.value, themePreset: 'custom' }))}
                            className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                          />
                          <input
                            type="text"
                            value={tempSettings.bgColor || '#090d16'}
                            onChange={(e) => setTempSettings(prev => ({ ...prev, bgColor: e.target.value, themePreset: 'custom' }))}
                            className="bg-transparent text-xs font-mono text-white focus:outline-none w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Typographie & Rayons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-amber-400" />
                        <span>Police de Caractères</span>
                      </label>
                      <select
                        value={tempSettings.fontFamily || 'Inter'}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer font-bold"
                      >
                        <option value="Inter">Inter (Moderne & Épuré)</option>
                        <option value="Poppins">Poppins (Dynamique & Start-up)</option>
                        <option value="Montserrat">Montserrat (Élégant & Impactant)</option>
                        <option value="Plus Jakarta Sans">Plus Jakarta Sans (Fintech & Tech)</option>
                        <option value="Outfit">Outfit (Impact & Moderne)</option>
                      </select>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Rayon des Arrondis (Boutons & Blocs)</span>
                      </label>
                      <select
                        value={tempSettings.borderRadius || 'rounded-2xl'}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, borderRadius: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer font-bold"
                      >
                        <option value="rounded-lg">Subtil (8px)</option>
                        <option value="rounded-xl">Moyen (12px)</option>
                        <option value="rounded-2xl">Prononcé (16px) - Recommandé</option>
                        <option value="rounded-3xl">Extra Large (24px)</option>
                        <option value="rounded-full">Pilule (Complet)</option>
                      </select>
                    </div>
                  </div>

                  {/* Effet Halo Lumineux (CTA Glow) */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Halo Lumineux Pulsant (CTA Glow Effect)</span>
                      </h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Attire l'attention visuelle sur les boutons de commande pour maximiser le taux de conversion.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tempSettings.ctaGlow !== false}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, ctaGlow: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {/* Aperçu en direct du Thème */}
                  <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Aperçu en direct du style</span>
                    <div className="p-5 rounded-2xl border border-slate-800/80 flex flex-col items-center justify-center gap-3 text-center transition-all" style={{ backgroundColor: tempSettings.bgColor || '#090d16', fontFamily: tempSettings.fontFamily || 'Inter, sans-serif' }}>
                      <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider" style={{ backgroundColor: `${tempSettings.primaryColor}20`, color: tempSettings.accentColor || tempSettings.primaryColor, border: `1px solid ${tempSettings.primaryColor}40` }}>
                        ⚡ Badge Offre Spéciale
                      </span>
                      <h4 className="text-sm font-black text-white max-w-md">
                        {tempSettings.funnelTitle || 'Titre de votre Tunnel de Vente'}
                      </h4>
                      <button
                        type="button"
                        className={`px-5 py-2.5 font-black text-xs text-slate-950 shadow-lg cursor-pointer ${tempSettings.borderRadius || 'rounded-2xl'} ${tempSettings.ctaGlow !== false ? 'ring-4 ring-amber-400/20' : ''}`}
                        style={{ backgroundColor: tempSettings.primaryColor || '#f59e0b' }}
                      >
                        Commander Maintenant • {formatCFA(tempSettings.salePrice || 35000)} 🚀
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet 2: Général & Branding */}
              {customizationActiveTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Titre Principal du Tunnel / Cours
                    </label>
                    <input
                      type="text"
                      value={tempSettings.funnelTitle || ''}
                      onChange={(e) => setTempSettings(prev => ({ ...prev, funnelTitle: e.target.value }))}
                      placeholder="Ex: Masterclass Complète : Intelligence Artificielle & Automatisation"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Sous-titre & Proposition de Valeur
                    </label>
                    <textarea
                      rows={2}
                      value={tempSettings.funnelSubtitle || ''}
                      onChange={(e) => setTempSettings(prev => ({ ...prev, funnelSubtitle: e.target.value }))}
                      placeholder="Ex: Propulsez votre entreprise au niveau supérieur avec les outils de pointe."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium resize-none leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                        Nom de l'Instructeur / Marque
                      </label>
                      <input
                        type="text"
                        value={tempSettings.instructorName || ''}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, instructorName: e.target.value }))}
                        placeholder="Ex: Prof. Amadou Traoré"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                        Rôle / Titre de l'Expert
                      </label>
                      <input
                        type="text"
                        value={tempSettings.instructorRole || ''}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, instructorRole: e.target.value }))}
                        placeholder="Ex: Lead AI Architect • Intelligence Artificielle & Business"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                        Badge d'En-tête de la Page
                      </label>
                      <input
                        type="text"
                        value={tempSettings.headerBadge || ''}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, headerBadge: e.target.value }))}
                        placeholder="Ex: Espace Professeurs, Masterclass Certifiante..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                        URL Avatar ou Logo Formateur
                      </label>
                      <input
                        type="text"
                        value={tempSettings.logoUrl || ''}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
                        placeholder="https://..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet 3: Tarifs & Paiements */}
              {customizationActiveTab === 'pricing' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                        Prix de Vente Effectif
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={tempSettings.salePrice || ''}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, salePrice: e.target.value }))}
                          placeholder="35000"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-black"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-amber-400 font-bold">F CFA</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                        Prix Barré (Valeur d'origine)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={tempSettings.originalPrice || ''}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, originalPrice: e.target.value }))}
                          placeholder="75000"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-bold line-through"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">F CFA</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                        Badge Réduction
                      </label>
                      <input
                        type="text"
                        value={tempSettings.discountBadge || ''}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, discountBadge: e.target.value }))}
                        placeholder="-53% OFFRE LIMITÉE"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-bold"
                      />
                    </div>
                  </div>

                  {/* Passerelles acceptées */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span>Passerelles de Paiement Autorisées</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Activez ou désactivez les moyens de paiement acceptés pour cette offre.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                      {[
                        { key: 'enableWave', label: 'Wave Direct', icon: '🌊' },
                        { key: 'enableOrangeMoney', label: 'Orange Money', icon: '🍊' },
                        { key: 'enableMtnMomo', label: 'MTN Mobile Money', icon: '🟡' },
                        { key: 'enableMoovMoney', label: 'Moov Money', icon: '🔵' },
                        { key: 'enableCard', label: 'Cartes Visa/Mastercard', icon: '💳' },
                        { key: 'enableCod', label: 'Paiement Livraison / Dépôt', icon: '📦' }
                      ].map(gateway => (
                        <label key={gateway.key} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSettings[gateway.key] !== false}
                            onChange={(e) => setTempSettings(prev => ({ ...prev, [gateway.key]: e.target.checked }))}
                            className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 cursor-pointer"
                          />
                          <span className="text-sm">{gateway.icon}</span>
                          <span className="text-xs font-bold text-slate-200">{gateway.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Numéro WhatsApp Marchand pour Notifications et Support</span>
                    </label>
                    <input
                      type="text"
                      value={tempSettings.merchantWhatsapp || ''}
                      onChange={(e) => setTempSettings(prev => ({ ...prev, merchantWhatsapp: e.target.value }))}
                      placeholder="+225 07 00 00 00 00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Onglet 4: Hébergement & SEO */}
              {customizationActiveTab === 'seo' && (
                <div className="space-y-4">
                  {/* Mode d'hébergement */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                      Mode d'Hébergement & Domaine
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setTempSettings(prev => ({ ...prev, hostingType: 'subdomain' }))}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                          tempSettings.hostingType === 'subdomain'
                            ? 'bg-slate-800/80 border-amber-400 ring-2 ring-amber-400/20'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-white">Sous-Domaine NaNa Gratuit</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Inclus</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Hébergement rapide et sécurisé avec SSL mondial automatique.</p>
                      </div>

                      <div
                        onClick={() => setTempSettings(prev => ({ ...prev, hostingType: 'custom_domain' }))}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                          tempSettings.hostingType === 'custom_domain'
                            ? 'bg-slate-800/80 border-amber-400 ring-2 ring-amber-400/20'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-white">Nom de Domaine Personnalisé</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">Pro</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Liez votre propre domaine (ex: formation.mon-site.com).</p>
                      </div>
                    </div>
                  </div>

                  {tempSettings.hostingType === 'custom_domain' ? (
                    <div className="space-y-3.5">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                            Votre Nom de Domaine (ex: www.maboutique.com ou promo.maboutique.com)
                          </label>
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            CNAME Requis
                          </span>
                        </div>
                        <input
                          type="text"
                          value={tempSettings.customDomain || ''}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, customDomain: e.target.value.toLowerCase().trim() }))}
                          placeholder="promo.maboutique.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </div>

                      {/* Guide Étape par Étape Enregistrement DNS CNAME */}
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30 border border-slate-800 space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                              1
                            </div>
                            <h5 className="font-bold text-white text-xs">
                              Configuration DNS chez votre registraire (Namecheap, GoDaddy, Hostinger, OVH, Cloudflare...)
                            </h5>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                            SSL HTTPS Automatique Inclus
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Pour relier votre propre domaine à ce tunnel, accédez au gestionnaire de zone DNS de votre hébergeur et ajoutez l'enregistrement suivant :
                        </p>

                        {/* Carte Enregistrement CNAME */}
                        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 space-y-2 font-mono text-[11px]">
                          <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            <span>Enregistrement CNAME Recommandé (Sous-domaine ou WWW) :</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-200">
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                              <span className="text-[10px] text-slate-400 block font-sans">Type :</span>
                              <span className="font-bold text-white">CNAME</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                              <span className="text-[10px] text-slate-400 block font-sans">Nom / Hôte :</span>
                              <span className="font-bold text-emerald-400">www</span> <span className="text-slate-400 font-sans text-[10px]">(ou sous-domaine)</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-sans">Cible / Valeur :</span>
                                <span className="font-bold text-amber-300">hosting.nanasore.com</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText('hosting.nanasore.com');
                                  triggerToast('Cible "hosting.nanasore.com" copiée ! ✓');
                                  try { playValidationBeep(); } catch (e) {}
                                }}
                                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white transition cursor-pointer"
                                title="Copier la cible"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Alternative Racine A-Record */}
                        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-start gap-2 text-[11px] text-slate-400">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-slate-200 font-bold">Domaine racine (sans www) : </span>
                            Créez un enregistrement <code className="text-amber-300 font-mono">CNAME</code> ou <code className="text-amber-300 font-mono">A</code> pointant vers <code className="text-amber-300 font-mono">cname.nanasore.com</code> (Réseau Cloudflare Edge & SSL automatique).
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Propagation DNS : 5 à 30 minutes</span>
                          </span>
                          <span className="text-emerald-400 font-bold">
                            ✓ Certificat SSL HTTPS émis gratuitement
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Lien de Partage Direct (Path-based URL universelle)
                        </label>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          Accessible Immédiatement (Style Shopify / Systeme.io)
                        </span>
                      </div>
                      <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 focus-within:border-amber-400 transition overflow-hidden">
                        <span className="bg-slate-900 px-3.5 py-2.5 text-xs text-amber-400 font-mono font-bold border-r border-slate-800 select-none shrink-0">
                          https://nanasore.com/f/
                        </span>
                        <input
                          type="text"
                          value={tempSettings.subdomain || ''}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                          placeholder="mon-tunnel"
                          className="flex-1 bg-transparent px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none font-bold font-mono min-w-0"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const fullUrl = `https://nanasore.com/f/${tempSettings.subdomain || 'mon-tunnel'}`;
                            navigator.clipboard.writeText(fullUrl);
                            triggerToast('Lien copié : ' + fullUrl);
                            try { playCashChime(); } catch (e) {}
                          }}
                          className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold font-mono border-l border-amber-600/40 flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-sm"
                          title="Copier le lien direct du tunnel"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copier</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Votre tunnel est automatiquement prêt sur : <strong className="text-amber-300 font-mono">https://nanasore.com/f/{tempSettings.subdomain || 'mon-tunnel'}</strong> (1 clic, sans configuration DNS).</span>
                      </p>
                    </div>
                  )}

                  {/* SEO Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                        Balise Titre Google (Meta Title)
                      </label>
                      <input
                        type="text"
                        value={tempSettings.metaTitle || ''}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, metaTitle: e.target.value }))}
                        placeholder="Masterclass IA & Automatisation No-Code"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-bold"
                      />
                    </div>

                    <div>
                      <ImageUploadInput
                        label="Image de Partage WhatsApp & Réseaux (OpenGraph)"
                        value={tempSettings.ogImageUrl || ''}
                        onChange={(url) => setTempSettings(prev => ({ ...prev, ogImageUrl: url }))}
                        placeholder="https://i.ibb.co/... ou parcourir"
                        badge="ImgBB Direct"
                        previewHeight="h-28"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Description Google & Réseaux Sociaux (Meta Description)
                    </label>
                    <textarea
                      rows={2}
                      value={tempSettings.metaDescription || ''}
                      onChange={(e) => setTempSettings(prev => ({ ...prev, metaDescription: e.target.value }))}
                      placeholder="Découvrez notre masterclass certifiante pour transformer votre carrière..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium resize-none leading-relaxed"
                    />
                  </div>

                  {/* Prévisualisation Carte WhatsApp */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Aperçu de la Carte lors d'un Partage WhatsApp</span>
                    </span>
                    <div className="max-w-md rounded-2xl bg-[#0b141a] border border-[#202c33] p-2.5 text-left space-y-2 shadow-xl">
                      {tempSettings.ogImageUrl && (
                        <img
                          src={tempSettings.ogImageUrl}
                          alt="OpenGraph"
                          className="w-full h-32 object-cover rounded-xl border border-white/5"
                        />
                      )}
                      <div>
                        <h5 className="text-xs font-bold text-slate-100 line-clamp-1">{tempSettings.metaTitle || tempSettings.funnelTitle}</h5>
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{tempSettings.metaDescription || tempSettings.funnelSubtitle}</p>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider mt-1 block">
                          {tempSettings.hostingType === 'custom_domain' ? (tempSettings.customDomain || 'mondomaine.com') : `${tempSettings.subdomain || 'ia-masterclass'}.nana.ci`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet 5: Pixels & Webhooks */}
              {customizationActiveTab === 'pixels' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-indigo-400" />
                      <span>Pixels de Suivi Publicitaire (Tracking)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Traquez précisément les visites, ajouts au panier et paiements confirmés pour vos campagnes publicitaires.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] text-slate-400 font-bold block mb-1">Meta Pixel ID (Facebook / Instagram)</label>
                        <input
                          type="text"
                          value={tempSettings.metaPixelId || ''}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, metaPixelId: e.target.value }))}
                          placeholder="Ex: 8492019482019"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-bold block mb-1">Google Analytics 4 (GA4)</label>
                        <input
                          type="text"
                          value={tempSettings.googleAnalyticsId || ''}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, googleAnalyticsId: e.target.value }))}
                          placeholder="Ex: G-XXXXXXXXXX"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-bold block mb-1">TikTok Pixel ID</label>
                        <input
                          type="text"
                          value={tempSettings.tiktokPixelId || ''}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, tiktokPixelId: e.target.value }))}
                          placeholder="Ex: C89F0A3810..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Webhook d'Automatisation (Make, Zapier, n8n)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Recevez un événement JSON instantané à chaque nouvelle commande réussie.
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={tempSettings.webhookUrl || ''}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, webhookUrl: e.target.value }))}
                        placeholder="https://hook.eu1.make.com/..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          try { playValidationBeep(); } catch (e) {}
                          triggerToast('Webhook de test déclenché avec succès ! payload {"event":"sale_test"} envoyé.');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
                      >
                        Tester
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pied de Modale avec Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetCustomization}
                className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rétablir par défaut</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomizationModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={handleSaveCustomization}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Enregistrer & Appliquer</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODALE : OUVRIR DANS ELEMENTOR                                     */}
      {/* ================================================================== */}
      {isElementorModalOpen && (
        <div className="fixed inset-0 z-[130] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Exportateur Magique Elementor 3.x ⚡</h3>
                  <p className="text-xs text-slate-400">Structure JSON compatible avec l'importateur WordPress / Elementor</p>
                </div>
              </div>
              <button onClick={() => setIsElementorModalOpen(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="flex-1 p-4 my-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-y-auto select-text leading-relaxed">
              {generateElementorJson()}
            </pre>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateElementorJson());
                  setCopiedElementor(true);
                  try { playValidationBeep(); } catch (e) {}
                  setTimeout(() => setCopiedElementor(false), 2000);
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                {copiedElementor ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedElementor ? 'Copié dans le presse-papier !' : 'Copier la Structure Elementor'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODALE : IMPORTER DES OUTILS PERSONNALISÉS                         */}
      {/* ================================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[130] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">Importer un Bloc Personnalisé ⚡</h3>
            <p className="text-xs text-slate-400">Collez votre composant HTML ou Tailwind pour l'ajouter à votre banque d'outils.</p>
            <textarea
              rows={4}
              value={customToolSnippet}
              onChange={(e) => setCustomToolSnippet(e.target.value)}
              placeholder="<div class='p-6 rounded-2xl bg-slate-950...'>Mon Nouveau Bloc</div>"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-amber-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setIsImportModalOpen(false)} className="py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">
                Annuler
              </button>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  triggerToast('Bloc personnalisé ajouté avec succès à la banque ! ✓');
                  try { playValidationBeep(); } catch (e) {}
                }}
                className="py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs"
              >
                Ajouter à la Banque
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODALE : CONFIRMATION DE SUPPRESSION                               */}
      {/* ================================================================== */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[140] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white mb-1">Supprimer ce Funnel ?</h3>
            <p className="text-xs text-slate-400 mb-6">Tous les blocs et configurations pour cette étape seront définitivement effacés.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">
                Annuler
              </button>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  onDelete(activeSource.id);
                  onClose();
                }}
                className="py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-600/30"
              >
                Oui, Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* BOUTON FLOTTANT PARAMÈTRES POUR MOBILE (IMAGE 124)                 */}
      {/* ================================================================== */}
      <div className="md:hidden fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => {
            try { playTapBeep(); } catch (e) {}
            setIsCustomizationModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-2xl shadow-amber-500/50 border border-amber-300 active:scale-95 transition cursor-pointer"
          title="Ouvrir les paramètres du tunnel"
        >
          <Settings className="w-4 h-4" />
          <span>Paramètres</span>
        </button>
      </div>

    </div>
  );
};

// ============================================================================
// 5. MOTEUR DE RENDU DES BLOCS DU CANVAS (WYSIWYG RENDERER)
// ============================================================================
function renderWYSIWYGBlock(block, activeSource) {
  const d = block.data || {};

  switch (block.type) {
    case 'autoplay_video':
      return (
        <AutoplayVideoBlock
          block={block}
          data={d}
          isBuilderMode={true}
        />
      );

    case 'hero_live_masterclass':
      return (
        <div className="flex flex-col items-center text-center">
          {d.promoBadge && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase mb-4 bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Award className="w-3.5 h-3.5" />
              <span>{d.promoBadge}</span>
            </div>
          )}

          <h1 className="text-xl sm:text-3xl font-black text-white leading-tight tracking-tight max-w-2xl mb-3">
            {d.headline}
          </h1>

          {d.subheadline && (
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl mb-5 leading-relaxed">
              {d.subheadline}
            </p>
          )}

          {/* Formateur & Accréditation */}
          {d.instructorName && (
            <div className="flex items-center gap-2.5 mb-5 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800">
              {d.instructorAvatar && (
                <img src={d.instructorAvatar} alt={d.instructorName} className="w-7 h-7 rounded-full object-cover border border-amber-500/40" />
              )}
              <span className="text-xs font-bold text-white">{d.instructorName}</span>
              {d.instructorRole && (
                <span className="text-[10px] text-slate-400">• {d.instructorRole}</span>
              )}
            </div>
          )}

          {/* Image/Média Produit en Lévitation Continue Framer Motion */}
          {d.image && (
            <div className="my-3 relative w-64 sm:w-80 flex flex-col items-center">
              <div className="absolute -inset-4 rounded-full blur-2xl opacity-25 bg-amber-500 pointer-events-none" />
              
              <motion.div
                animate={{
                  y: [0, -12, 0],
                  rotate: [0, 1.2, -1.2, 0]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="relative z-10 w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              >
                <img src={d.image} alt="Showcase" className="w-full h-48 sm:h-56 object-cover" />
              </motion.div>

              {/* Ombre portée dynamique qui respire */}
              <motion.div
                animate={{
                  scale: [1, 0.85, 1],
                  opacity: [0.35, 0.18, 0.35]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="w-3/4 h-3.5 bg-black blur-md rounded-full mt-3"
              />
            </div>
          )}

          {d.price !== undefined && (
            <div className="flex items-baseline justify-center gap-3 my-3">
              <span className="text-2xl sm:text-4xl font-black text-amber-400">
                {formatCFA(d.price)}
              </span>
              {d.originalPrice && d.originalPrice > d.price && (
                <span className="text-sm sm:text-lg text-slate-500 line-through font-semibold">
                  {formatCFA(d.originalPrice)}
                </span>
              )}
            </div>
          )}

          {d.buttonText && (
            <div className="w-full max-w-md mt-2">
              <button
                className="w-full py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                style={{
                  backgroundColor: d.btnBgColor || '#f59e0b',
                  color: '#000000',
                  boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)'
                }}
              >
                <span>{d.buttonText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      );

    case 'syllabus_modules':
      return (
        <div className="space-y-4 py-2 text-left">
          <div className="text-center">
            <h3 className="text-base font-black text-white">{d.headline}</h3>
            {d.subheadline && <p className="text-xs text-slate-400 mt-1">{d.subheadline}</p>}
          </div>
          <div className="space-y-2.5 max-w-2xl mx-auto">
            {(d.modules || []).map((m, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-black">
                    0{i + 1}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">{m.title}</h5>
                    <span className="text-[10px] text-slate-400">{m.lessons}</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  {m.duration}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'webinar_registration_form':
      return (
        <div className="max-w-md mx-auto p-5 rounded-3xl bg-slate-900/90 border border-emerald-500/30 text-center space-y-3 shadow-xl">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black text-white">{d.headline}</h3>
          <p className="text-xs text-slate-400">{d.subheadline}</p>
          <input
            type="tel"
            disabled
            placeholder="Numéro WhatsApp (+226 70 00 00 00)"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono text-center"
          />
          <button className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition cursor-pointer">
            {d.buttonText}
          </button>
          <p className="text-[10px] text-slate-400">{d.reassurance}</p>
        </div>
      );

    case 'countdown_timer':
      return (
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center max-w-md mx-auto space-y-2">
          <div className="text-[11px] font-black text-amber-400 tracking-wider flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{d.title}</span>
          </div>
          <div className="flex items-center justify-center gap-3 font-mono font-black text-lg text-white">
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              {String(d.initialHours || 18).padStart(2, '0')}<span className="text-[10px] block text-slate-500 font-sans">HEURES</span>
            </div>
            <span>:</span>
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-amber-400">
              {String(d.initialMinutes || 30).padStart(2, '0')}<span className="text-[10px] block text-slate-500 font-sans">MINUTES</span>
            </div>
            <span>:</span>
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-rose-400">
              {String(d.initialSeconds || 45).padStart(2, '0')}<span className="text-[10px] block text-slate-500 font-sans">SECONDES</span>
            </div>
          </div>
        </div>
      );

    case 'seats_progress_bar':
      return (
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 max-w-md mx-auto space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-rose-400">
              <Flame className="w-3.5 h-3.5" />
              <span>{d.text}</span>
            </span>
            <span className="text-slate-400 font-mono">{d.percentage}% Réservé</span>
          </div>
          <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full" style={{ width: `${d.percentage}%` }} />
          </div>
        </div>
      );

    case 'neon_pulse_cta':
      return (
        <div className="text-center py-4 space-y-2 max-w-md mx-auto">
          <button
            className="w-full py-4 px-6 rounded-2xl font-black text-xs sm:text-sm tracking-wide shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
            style={{
              backgroundColor: d.btnBgColor || '#f59e0b',
              color: d.btnTextColor || '#000000',
              boxShadow: d.glowColor ? `0 0 35px ${d.glowColor}` : '0 0 30px rgba(245, 158, 11, 0.45)'
            }}
          >
            <span>{d.buttonText}</span>
            <Zap className="w-4 h-4" />
          </button>
          {d.subtext && <p className="text-[10.5px] text-slate-400 font-medium">{d.subtext}</p>}
        </div>
      );

    case 'instructor_bio':
      return (
        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <img src={d.avatar} alt={d.name} className="w-16 h-16 rounded-2xl object-cover border border-amber-500/30 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-sm font-black text-white">{d.name}</h4>
            <p className="text-xs text-amber-400 font-medium">{d.title}</p>
            <p className="text-xs text-slate-300 leading-relaxed">{d.bio}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(d.badges || []).map((b, idx) => (
                <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800">
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      );

    case 'faq_webinar':
      return (
        <div className="space-y-3 py-2 max-w-2xl mx-auto text-left">
          <h4 className="text-sm font-black text-white text-center mb-3">{d.headline}</h4>
          {(d.items || []).map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <h5 className="text-xs font-bold text-white flex items-center gap-2">
                <span className="text-amber-400">Q :</span> {item.q}
              </h5>
              <p className="text-xs text-slate-400 pl-4">{item.a}</p>
            </div>
          ))}
        </div>
      );

    case 'trust_badges_edu':
      return (
        <div className="py-2 text-center space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {(d.badges || []).map((badge, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>{badge}</span>
              </span>
            ))}
          </div>
          <p className="text-[10px] text-slate-500">{d.text}</p>
        </div>
      );

    default:
      return (
        <div className="p-4 bg-slate-900/40 rounded-xl text-center text-xs text-slate-300">
          Bloc : {block.name}
        </div>
      );
  }
}

export default UltimateFunnelBuilder;
