import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Save,
  Trash2,
  X,
  Eye,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  LayoutTemplate,
  Smartphone,
  Monitor,
  Tablet,
  Copy as DuplicateIcon,
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
  Plus,
  ArrowUp,
  ArrowDown,
  Video,
  Play,
  Volume2,
  VolumeX,
  MessageCircle,
  PhoneCall,
  Award,
  Users,
  CheckCircle,
  FileText,
  Lock,
  Undo2,
  Redo2,
  Search,
  MousePointer,
  GripVertical,
  Timer,
  XCircle,
  UserCheck,
  BarChart3,
  Send,
  CreditCard,
  Truck,
  MapPin,
  EyeOff,
  Settings,
  Share2,
  Activity,
  Webhook,
  Link2,
  Mail,
  GraduationCap,
  Radio,
  BellRing,
  MessageSquare,
  ListOrdered,
  Hourglass,
  Wallet,
  Crown,
  Tv,
  Target
} from 'lucide-react';
import { formatCFA, playTapBeep, playValidationBeep, playCancelSound, playCashChime } from '../../utils/audio';
import { CanvasBlockItem } from './CanvasBlockItem';
import { QuizFunnelBlock, DEFAULT_QUIZ_FUNNEL_DATA } from '../cro/QuizFunnelBlock';
import { DynamicHeadingBlock, DEFAULT_DYNAMIC_HEADING_DATA } from '../cro/DynamicHeadingBlock';
import { ScrollytellingBlock, DEFAULT_SCROLLYTELLING_DATA } from '../cro/ScrollytellingBlock';
import { AutoplayVideoBlock, DEFAULT_AUTOPLAY_VIDEO_DATA } from '../cro/AutoplayVideoBlock';
import { saveFunnelConfig, registerSubdomainInFirebase } from '../../services/omniFunnelService';
import StealthYouTubePlayer, { extractYouTubeVideoId as rawExtractYouTubeVideoId } from '../lms/video/StealthYouTubePlayer';
import { cleanDomain, saveTenantCustomDomain } from '../../services/tenantDomainService';
import { TOOLBOX_PRO_CATALOG, TOOLBOX_PRO_CATEGORIES } from './toolboxData';
import {
  IconWhatsApp,
  IconTikTok,
  IconFacebook,
  IconXTwitter,
  IconYouTube,
  IconInstagram,
  IconLinkedIn,
  IconTelegram,
  IconPinterest,
  IconQuora,
  SOCIAL_NETWORKS_INFO,
  getSocialShareUrl
} from './socialIcons';
import { renderNanaDuotoneIcon, NANA_ICONS_LIST, DEFAULT_NANA_BLUE, DEFAULT_NANA_ACCENT } from './nanaIconsData';

// Helper d'extraction d'ID YouTube universel et sécurisé
export const extractYouTubeVideoId = (input) => {
  if (typeof rawExtractYouTubeVideoId === 'function') {
    const res = rawExtractYouTubeVideoId(input);
    if (res) return res;
  }
  if (!input || typeof input !== 'string') return '';
  const str = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
};

// Sécurité globale pour tout appel dynamique ou template legacy
if (typeof window !== 'undefined') {
  window.extractYouTubeVideoId = extractYouTubeVideoId;
}

/**
 * Nettoie rigoureusement les chaînes issues des fiches produits (descriptions riches WooCommerce, balises HTML, etc.)
 * Élimine les balises <h2>, <p>, <span>, styles inline et étincelles IA pour garantir un texte persuasif pur.
 */
export function stripHtmlToCleanText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw;
  if (/<[a-z][\s\S]*>/i.test(text)) {
    text = text
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<\/p>|<\/div>|<\/h[1-6]>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');
  }
  return text
    .replace(/[✨⭐🌟]+/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Normalise un bloc : garantit un ID string unique et assainit rigoureusement ses données contre l'injection de tags HTML bruts.
 */
export function normalizeAndSanitizeBlock(b, index = 0) {
  if (!b) return null;
  const blockId = String(b.id || `block-${b.type || 'module'}-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`);
  const data = b.data ? JSON.parse(JSON.stringify(b.data)) : {};

  // Nettoyage systématique récursif de tout tag HTML brut dans toutes les données du bloc
  const sanitizeDeep = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        if (/<[a-z][\s\S]*>/i.test(obj[key])) {
          obj[key] = stripHtmlToCleanText(obj[key]);
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeDeep(obj[key]);
      }
    }
  };
  sanitizeDeep(data);

  return {
    ...b,
    id: blockId,
    name: b.name || (DIVI_MODULES_CATALOG.find(m => m.type === b.type)?.name) || 'Module de Vente',
    data,
    conditions: b.conditions || { device: 'all', showIfUrlParam: '', hideIfPurchased: false }
  };
}

// ============================================================================
// CODE SPLITTING ABSOLU (React.lazy) — 0 octet consommé au chargement initial
// ============================================================================
const ToolboxDrawer = React.lazy(() => import('./ToolboxDrawer'));
const NanaIconLibraryModal = React.lazy(() => import('./NanaIconLibraryModal'));
const FunnelSettingsModal = React.lazy(() => import('./FunnelSettingsModal'));
const FunnelCodeEditor = React.lazy(() => import('./FunnelCodeEditor'));
const UltimateCheckout = React.lazy(() => import('../payment/UltimateCheckout').then(m => ({ default: m.UltimateCheckout })));
import { ImageUploadInput } from '../common/ImageUploadInput';

// ============================================================================
// 1. CATALOGUE ÉLARGI DES MODULES HAUTE CONVERSION NANA STUDIO
// ============================================================================
export const DIVI_MODULES_CATALOG = [
  // --- MODULE SCROLLYTELLING ANIMATION PRODUIT AU SCROLL (APPLE / WEBFLOW) ---
  {
    type: 'scrollytelling',
    name: 'Scrollytelling Produit 3D (Style Apple)',
    category: 'conversion',
    badge: 'Apple / Webflow 🍏',
    icon: Layers,
    color: '#6366f1',
    description: 'Image produit fixée (sticky) au centre pendant que l\'utilisateur fait défiler la page avec fonctionnalités séquentielles animées.',
    createDefaultData: (prod) => ({
      kickerBadge: 'PRÉSENTATION IMMERSIVE PRODUIT 3D',
      productTitle: prod?.name ? `Ingénierie & Finitions : ${prod.name}` : 'L\'Ingénierie de Précision à Son Sommet',
      productSubtitle: 'Faites défiler pour explorer chaque détail technique de conception.',
      productImage: prod?.image || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
      features: [
        {
          id: 'scrolly-feat-1',
          badge: '1. CHÂSSIS & MATÉRIAUX 💎',
          title: 'Structure Monolithique en Titane Brossé',
          description: 'Chaque millimètre a été sculpté pour allier légèreté extrême et robustesse industrielle. Finition haut de gamme résistant aux rayures.',
          accentColor: '#6366f1',
          highlightStat: 'Titane Aéronautique Grade 5'
        },
        {
          id: 'scrolly-feat-2',
          badge: '2. PERFORMANCE HYBRIDE ⚡',
          title: 'Moteur Turbo 10x Plus Réactif',
          description: 'Une fluidité instantanée pensée pour l\'Afrique. Fonctionne à 100% même en basse connexion avec validation instantanée Wave et Orange Money.',
          accentColor: '#10b981',
          highlightStat: '0.08s Temps de Réponse'
        },
        {
          id: 'scrolly-feat-3',
          badge: '3. AUTONOMIE & LIBERTÉ 🔋',
          title: 'Batterie Longue Durée & Résistance Climat',
          description: 'Conçu pour tenir jusqu\'à 72 heures sans faillir. Protection intégrale contre la poussière et les fortes chaleurs pour une sérénité totale.',
          accentColor: '#f59e0b',
          highlightStat: '72h d\'Autonomie Réelle'
        },
        {
          id: 'scrolly-feat-4',
          badge: '4. SÉCURITÉ & GARANTIE 🛡️',
          title: 'Garantie Totale 12 Mois & Zéro Compromis',
          description: 'Testé et certifié avec vérification du colis avant paiement. Si vous n\'êtes pas comblé dès les premiers jours, vous êtes intégralement remboursé.',
          accentColor: '#ec4899',
          highlightStat: '100% Satisfait ou Remboursé'
        }
      ],
      accentColor: '#6366f1',
      bgColor: '#040714',
      containerHeightVh: 320,
      imageScaleEffect: true,
      ctaText: 'Commander Maintenant • Offre Flash ➔',
      ctaLink: '#checkout'
    })
  },

  // --- MODULE CRO TITRE DYNAMIQUE & PERSONNALISATION PRÉDICTIVE (DTR) ---
  {
    type: 'dynamic_heading',
    name: 'Titre Dynamique & Personnalisation (URL Params)',
    category: 'conversion',
    badge: 'Enterprise DTR 📍',
    icon: Globe,
    color: '#10b981',
    description: 'Titre H1/H2 adaptatif selon l\'URL (?ville=Ouagadougou, ?source=Facebook) avec fallbacks sécurisés et ciblage localisé.',
    createDefaultData: (prod) => ({
      tagLevel: 'h1',
      kickerBadgeTemplate: '📍 EXPÉDITION EXPRESS DIRECTE POUR [ville]',
      headlineTemplate: prod?.name
        ? `Commandez ${prod.name} en Livraison Express à [ville]`
        : 'La Solution N°1 Plébiscitée à [ville] Pour Multiplier Vos Résultats',
      subheadlineTemplate: 'Profitez de notre offre exclusive dédiée à notre communauté [source] : stock physique disponible, livraison sécurisée et vérification avant paiement.',
      fallbacks: {
        ville: 'votre région',
        source: 'nos membres privilégiés',
        nom: 'cher client',
        pays: 'votre pays'
      },
      accentColor: '#10b981',
      bgColor: 'transparent',
      alignment: 'center',
      showGeoPinBadge: true,
      highlightDynamicWord: true,
      simulationParams: {}
    })
  },

  // --- MODULE CRO QUIZ DE MICRO-ENGAGEMENT CRO 2.0 ---
  {
    type: 'quiz_funnel',
    name: 'Quiz Micro-Engagement (Quiz Funnel 2.0)',
    category: 'conversion',
    badge: 'CRO 2.0 🎯',
    icon: HelpCircle,
    color: '#8b5cf6',
    description: 'Quiz interactif de 3 à 5 questions avec jauge de progression, diagnostic instantané et offre dynamique personnalisée par logique if/else.',
    createDefaultData: (prod) => ({
      badgeText: 'DIAGNOSTIC SUR-MESURE ⚡',
      title: prod?.name ? `Trouvez Votre Formule Idéale pour : ${prod.name}` : 'Trouvez la Formule Exacte Adaptée à Votre Projet',
      subtitle: 'Répondez à quelques questions rapides (moins de 60s) pour débloquer votre recommandation ciblée et une réduction exclusive.',
      accentColor: '#8b5cf6',
      bgColor: '#070b16',
      cardBgColor: '#0d1527',
      questions: [
        {
          id: 'q1',
          question: 'Quel est votre objectif n°1 pour votre activité ce mois-ci ?',
          subtitle: 'Sélectionnez la priorité absolue qui correspond à votre vision.',
          options: [
            {
              id: 'q1_o1',
              text: 'Booster mes ventes et doubler mes commandes',
              subtext: 'Générer un volume massif et maximiser la rentabilité',
              badge: '🚀',
              profile: 'scale',
              score: 3
            },
            {
              id: 'q1_o2',
              text: 'Automatiser la livraison et le suivi client',
              subtext: 'Gagner du temps précieux sur WhatsApp, Wave et Orange Money',
              badge: '⚡',
              profile: 'automation',
              score: 2
            },
            {
              id: 'q1_o3',
              text: 'Lancer mon premier produit sans prendre de risque',
              subtext: 'Tester le marché avec un budget maîtrisé et un guide fiable',
              badge: '🌱',
              profile: 'starter',
              score: 1
            }
          ]
        },
        {
          id: 'q2',
          question: 'Quel chiffre de ventes mensuel visez-vous concrètement ?',
          subtitle: 'Cette information calibre la puissance de la recommandation.',
          options: [
            {
              id: 'q2_o1',
              text: 'Plus de 1 000 000 FCFA / mois',
              subtext: 'Profil Croissance Élite • Prêt pour l\'expansion rapide',
              badge: '💎',
              profile: 'scale',
              score: 3
            },
            {
              id: 'q2_o2',
              text: 'Entre 250 000 et 1 000 000 FCFA / mois',
              subtext: 'Profil Pro • Structuration et stabilisation des gains',
              badge: '🔥',
              profile: 'automation',
              score: 2
            },
            {
              id: 'q2_o3',
              text: 'Moins de 250 000 FCFA / mois',
              subtext: 'Profil Démarrage • Premiers pas rentables et validation',
              badge: '🎯',
              profile: 'starter',
              score: 1
            }
          ]
        },
        {
          id: 'q3',
          question: 'Quel est votre principal frein ou goulot d\'étranglement actuel ?',
          subtitle: 'Identifier le blocage permet de débloquer l\'offre idéale.',
          options: [
            {
              id: 'q3_o1',
              text: 'Les visiteurs regardent mais ne commandent pas assez',
              subtext: 'Besoin d\'un tunnel de conversion ultra-persuasif',
              badge: '📉',
              profile: 'scale',
              score: 3
            },
            {
              id: 'q3_o2',
              text: 'Je perds trop de temps à gérer les clients manuellement',
              subtext: 'Frictions de paiements, relances et retards de confirmation',
              badge: '⏳',
              profile: 'automation',
              score: 2
            },
            {
              id: 'q3_o3',
              text: 'Je ne sais pas par quoi commencer ni quels outils utiliser',
              subtext: 'Besoin d\'une méthode clé en main éprouvée',
              badge: '💡',
              profile: 'starter',
              score: 1
            }
          ]
        },
        {
          id: 'q4',
          question: 'À quelle vitesse souhaitez-vous mettre en place la solution ?',
          subtitle: 'Nous ajustons notre accompagnement selon votre disponibilité.',
          options: [
            {
              id: 'q4_o1',
              text: 'Immédiatement (Déploiement clé en main sous 24h à 48h)',
              subtext: 'Je veux des résultats dès cette semaine',
              badge: '⚡',
              profile: 'scale',
              score: 3
            },
            {
              id: 'q4_o2',
              text: 'Dans les 7 à 14 prochains jours à mon rythme',
              subtext: 'Je veux prendre le temps d\'adapter la solution',
              badge: '🗓️',
              profile: 'automation',
              score: 2
            },
            {
              id: 'q4_o3',
              text: 'Pas d\'urgence, je teste d\'abord la formule de base',
              subtext: 'Découverte progressive sans pression',
              badge: '🛡️',
              profile: 'starter',
              score: 1
            }
          ]
        }
      ],
      outcomes: [
        {
          id: 'scale',
          badge: '🎯 98% COMPATIBILITÉ • RECOMMANDATION ÉLITE VIP',
          title: 'Votre Profil : Croissance & Domination de Marché',
          headline: prod?.name ? `Pack Élite Spécial : ${prod.name}` : 'Pack Élite NaNa Pro X — Le Moteur de Vente Ultime',
          description: 'Vos réponses indiquent que vous avez l\'ambition et les fondations pour passer à la vitesse supérieure. Notre formule Élite élimine toutes les limites pour multiplier vos conversions dès le premier jour.',
          productName: prod?.name || 'Pack Élite NaNa Pro X (Licence Clé en Main)',
          productImage: prod?.image || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80',
          discountBadge: 'RÉDUCTION EXCLUSIVE -45% DÉBLOQUÉE',
          promoPrice: prod?.price || 45000,
          originalPrice: prod?.originalPrice || (prod?.price ? Math.round(prod.price * 1.8) : 85000),
          features: [
            'Tunnel de Vente Haute Conversion Prêt à l\'Emploi (AIDA + FOMO)',
            'Intégration Directe Paiement Wave, Orange Money & COD',
            'Accès Privilégié Mastermind & Support WhatsApp VIP 7j/7',
            'Garantie Satisfait ou Remboursé Intégrale 30 Jours'
          ],
          ctaText: 'Débloquer Mon Pack Élite (-45%) ➔',
          ctaLink: '#checkout',
          urgencyMinutes: 15,
          guaranteeText: 'Sécurisé SSL 256-Bit • Activation Immédiate en 1 Clic'
        },
        {
          id: 'automation',
          badge: '⚡ 94% COMPATIBILITÉ • RECOMMANDATION OPTIMISATION PRO',
          title: 'Votre Profil : Gain de Temps & Automatisation Intelligente',
          headline: 'Formule Système Pro — Zéro Friction, Zéro Temps Perdu',
          description: 'Votre plus grand levier réside dans l\'élimination des tâches manuelles répétitives. Ce système centralise vos commandes et valide vos livraisons automatiquement sans que vous n\'ayez à passer vos journées au téléphone.',
          productName: 'Formule Système Pro NaNa (Automatisation Complète)',
          productImage: prod?.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
          discountBadge: 'OFFRE SPÉCIALE GAIN DE TEMPS -35%',
          promoPrice: Math.round((prod?.price || 45000) * 0.7),
          originalPrice: prod?.price || 49000,
          features: [
            'Générateur de Reçus et Notifications WhatsApp Automatisées',
            'Connexion Directe Livraisons Rapides Abidjan, Dakar & Lomé',
            'Guide Vidéo Express : Prise en main complète en 30 minutes',
            'Assistance Technique Dédiée pendant 6 mois'
          ],
          ctaText: 'Sélectionner la Formule Pro (-35%) ➔',
          ctaLink: '#checkout',
          urgencyMinutes: 20,
          guaranteeText: 'Paiement sans risque • Vérification avant validation'
        },
        {
          id: 'starter',
          badge: '🌱 91% COMPATIBILITÉ • RECOMMANDATION DÉMARRAGE RAPIDE',
          title: 'Votre Profil : Décollage Rentable Sans Risque',
          headline: 'Pack Démarrage Accéléré — Vos Premières Ventes Garanties',
          description: 'Vous démarrez ou souhaitez tester un nouveau canal sans engager de dépenses inutiles. Cette formule condensée vous offre l\'essentiel pour sécuriser vos premiers revenus dès vos premiers lancements.',
          productName: 'Pack Démarrage Essentiel NaNa',
          productImage: prod?.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
          discountBadge: 'TARIF DE BIENVENUE -30%',
          promoPrice: Math.round((prod?.price || 45000) * 0.45),
          originalPrice: Math.round((prod?.price || 45000) * 0.8),
          features: [
            'Gabarit de Page Produit Épuré et Mobile-First',
            'Formulaire de Commande 1-Clic Simplifié',
            'Support par Chat WhatsApp pour vous accompagner pas-à-pas',
            'Garantie Totale Zéro Risque 14 Jours'
          ],
          ctaText: 'Démarrer Mon Activité Sans Risque ➔',
          ctaLink: '#checkout',
          urgencyMinutes: 30,
          guaranteeText: 'Règlement à la livraison ou Wave / Orange Money'
        }
      ],
      autoAdvance: true,
      showUrgencyTimer: true,
      computingDurationMs: 1400,
      footerNotice: '100% Confidentiel • Résultat calculé en temps réel avec diagnostic instantané'
    })
  },

  // --- 4 MODULES BANNIÈRES COMPTES À REBOURS & STOCKS ---
  {
    type: 'banner_countdown_floating_top',
    name: 'Bannière Sticky Décompte & Code Promo',
    category: 'urgency',
    badge: 'Sticky Top ⏱️',
    icon: Timer,
    color: '#ef4444',
    description: 'Bannière d\'urgence flottante ou fixe avec décompte interactif, badge promo et code coupon détachable.',
    createDefaultData: (prod) => ({
      badgeText: 'VENTE FLASH EXCLUSIVE',
      headline: 'Offre Spéciale Limitée : Réduction Immédiate Disponible',
      countdownHours: 3,
      countdownMinutes: 45,
      countdownSeconds: 20,
      couponCode: 'FLASH30',
      ctaText: 'Profiter de l\'Offre',
      ctaLink: '#checkout',
      isSticky: true,
      bgColor: '#450a0a',
      accentColor: '#f43f5e',
      textColor: '#ffffff'
    })
  },
  {
    type: 'banner_stock_ticker_marquee',
    name: 'Bannière Ticker Défilant & Stock Critique',
    category: 'urgency',
    badge: 'Ticker 60 FPS ⚡',
    icon: Flame,
    color: '#f59e0b',
    description: 'Ruban défilant animé haute fluidité avec stock critique en direct, avis de livraison express et preuve sociale.',
    createDefaultData: (prod) => ({
      stockRemaining: 4,
      stockTotal: 30,
      urgencyText: 'Plus que 4 unités réservées pour la région',
      deliveryText: 'Livraison express 24h & vérification du colis avant paiement',
      guaranteeText: 'Garantie Totale 12 Mois Satisfait ou Remboursé',
      liveBuyerText: 'Kouassi d\'Abidjan a validé sa commande il y a 2 min',
      tickerSpeed: 'normal',
      bgColor: '#1c1002',
      accentColor: '#f59e0b',
      textColor: '#fef3c7'
    })
  },
  {
    type: 'banner_flash_stock_split',
    name: 'Bannière Split Promo & Jauge de Raréfaction',
    category: 'urgency',
    badge: 'Raréfaction 85% 📊',
    icon: Zap,
    color: '#ec4899',
    description: 'Bandeau 2-colonnes combinant compte à rebours, jauge de raréfaction 85% réclamé et réservation instantanée.',
    createDefaultData: (prod) => ({
      title: 'Offre Spéciale de Clôture • Quantités Allouées',
      subtitle: 'Nos stocks physiques s\'épuisent rapidement. Réservez votre colis avant la rupture totale.',
      claimedPercent: 86,
      stockRemaining: 5,
      stockTotal: 40,
      countdownHours: 1,
      countdownMinutes: 28,
      ctaText: 'Bloquer Mon Tarif Promo ➔',
      ctaLink: '#checkout',
      bgColor: '#1f0412',
      accentColor: '#ec4899',
      textColor: '#ffffff'
    })
  },
  {
    type: 'banner_floating_sticky_bottom',
    name: 'Bannière Flottante Bottom Bar (1-Clic Achat)',
    category: 'conversion',
    badge: 'Barre Achat 🛒',
    icon: ShoppingBag,
    color: '#10b981',
    description: 'Barre flottante fixée en bas d\'écran avec miniature produit, prix promo, stock restant et bouton d\'achat direct.',
    createDefaultData: (prod) => ({
      productTitle: prod?.name || 'Pack Élite NaNa Pro X',
      promoPrice: prod?.price || 25000,
      originalPrice: prod?.originalPrice || 45000,
      stockText: 'Seulement 3 en stock',
      countdownMinutes: 24,
      ctaText: 'Commander Maintenant',
      ctaLink: '#checkout',
      imageUrl: prod?.image || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=200&q=80',
      bgColor: '#021a12',
      accentColor: '#10b981',
      textColor: '#ffffff'
    })
  },

  // --- 4 SECTIONS HERO DE HAUT NIVEAU PREMIUM ---
  {
    type: 'hero_studio_showcase_3d',
    name: 'Hero Studio Showcase 3D (Split Immersif)',
    category: 'conversion',
    badge: 'Studio 3D 💎',
    icon: LayoutTemplate,
    color: '#6366f1',
    description: 'Hero immersif haut de gamme en 2 colonnes avec fond dégradé mesh, carte 3D en verre dépoli, double CTA et preuve sociale.',
    createDefaultData: (prod) => ({
      kickerBadge: 'NOUVELLE COLLECTION STUDIO PRO',
      headline: prod?.name ? `Propulsez Votre Quotidien avec ${prod.name}` : 'Révolutionnez Votre Activité avec Notre Solution Tout-en-Un',
      highlightWord: 'Révolutionnez',
      subheadline: stripHtmlToCleanText(prod?.description) || 'Rejoignez les milliers d\'entrepreneurs et professionnels qui obtiennent des résultats concrets en moins de 7 jours grâce à une conception sur-mesure.',
      primaryCtaText: 'Commander Maintenant • Offre Flash 🚀',
      primaryCtaLink: '#checkout',
      secondaryCtaText: 'Voir la Démonstration (2 min)',
      secondaryCtaLink: '#video',
      imageUrl: prod?.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80',
      floatingBadge: '-45% AUJOURD\'HUI',
      ratingScore: '4.98 / 5',
      socialProofText: 'Rejoint par plus de 12 400 clients satisfaits',
      benefits: [
        'Qualité certifiée et contrôlée',
        'Livraison express 24h sécurisée',
        'Paiement Wave & Orange Money'
      ],
      bgColor: '#060919',
      accentColor: '#6366f1'
    })
  },
  {
    type: 'hero_vsl_cinematic',
    name: 'Hero VSL Cinématique (Video Sales Machine)',
    category: 'conversion',
    badge: 'Cinématique VSL 🎬',
    icon: Video,
    color: '#f43f5e',
    description: 'Hero centré sur la vidéo de vente avec ticker live supérieur, cadre vidéo 16:9 haute définition, boutons d\'action immédiate et garanties.',
    createDefaultData: (prod) => ({
      liveStatusText: 'DIFFUSION EN DIRECT',
      viewersCount: 342,
      headline: 'Comment Transformer Votre Approche en 3 Étapes Simples Sans Erreur',
      subheadline: 'Regardez cette vidéo de démonstration complète avant la fermeture des inscriptions à tarif réduit.',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      posterUrl: prod?.image || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
      durationBadge: '12:45',
      ctaText: 'Obtenir Mon Accès Immédiat au Tarif Réduit ➔',
      ctaLink: '#checkout',
      priceText: '29 000 FCFA au lieu de 60 000 FCFA',
      guarantees: [
        'Garantie Inconditionnelle 30 Jours',
        'Accès Immédiat & Téléchargeable',
        'Assistance Prioritaire 7j/7'
      ],
      bgColor: '#090306',
      accentColor: '#f43f5e'
    })
  },
  {
    type: 'hero_luxury_signature',
    name: 'Hero Minimalist Luxury (Signature High-Ticket)',
    category: 'conversion',
    badge: 'Signature Prestige 👑',
    icon: Crown,
    color: '#d97706',
    description: 'Section Hero éditoriale de luxe avec finitions or/champagne, typographie noble, puces d\'excellence et mise en valeur prestige.',
    createDefaultData: (prod) => ({
      editionBadge: 'COLLECTION PRIVILÈGE • ÉDITION LIMITÉE',
      headline: prod?.name || 'Le Joyau d\'Excellence et d\'Élégance Absolue',
      subheadline: 'Chaque détail a été façonné avec une précision d\'orfèvre pour offrir une expérience sensorielle et fonctionnelle sans compromis.',
      price: prod?.price || 49000,
      originalPrice: prod?.originalPrice || 85000,
      vipPill: 'Exemplaire N° 084 / 200',
      ctaText: 'Réserver Mon Coffret Numéroté 👑',
      ctaLink: '#checkout',
      imageUrl: prod?.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80',
      bulletPoints: [
        'Matériaux nobles sélectionnés à la main',
        'Garantie Signature 24 Mois Échange à Neuf',
        'Expédition sous coffret rigide scellé'
      ],
      bgColor: '#0a0804',
      accentColor: '#d97706'
    })
  },
  {
    type: 'hero_lead_conversion_engine',
    name: 'Hero Direct Conversion Engine (Offre Choc)',
    category: 'conversion',
    badge: 'Conversion Max 🚀',
    icon: Zap,
    color: '#10b981',
    description: 'Moteur de conversion directe avec notation 5 étoiles, carte produit choc avec prix barré, commande express et badges de paiement Wave/Orange.',
    createDefaultData: (prod) => ({
      ratingScore: '4.95 / 5',
      reviewCount: '2 840 clients satisfaits',
      headline: prod?.name ? `Obtenez ${prod.name} avec -45% Aujourd'hui` : 'Multipliez Vos Ventes avec Notre Solution Tout-en-Un Clé en Main',
      subheadline: 'Commandez en 1 clic sans compte compliqué. Vérifiez votre colis à la réception avant tout paiement.',
      price: prod?.price || 24500,
      originalPrice: prod?.originalPrice || 45000,
      discountBadge: '-45% AUJOURD\'HUI',
      urgencyText: 'Plus que 5 packs disponibles au tarif promotionnel',
      ctaText: 'Commander avec Wave / Orange Money ➔',
      ctaLink: '#checkout',
      imageUrl: prod?.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80',
      paymentBadges: ['Wave', 'Orange Money', 'MTN', 'Cash Livraison'],
      bgColor: '#04100c',
      accentColor: '#10b981'
    })
  },
  {
    type: 'urgency',
    name: 'Bannière Compte à Rebours & Stocks',
    category: 'urgency',
    badge: 'Urgence ⚡',
    icon: Timer,
    color: '#ef4444',
    description: 'Compte à rebours animé en direct, barre de stock critique et alerte d\'acheteurs live.',
    createDefaultData: () => ({
      headline: 'VENTE FLASH SPÉCIALE • PRIX VALABLE ENCORE :',
      countdownHours: 11,
      countdownMinutes: 42,
      countdownSeconds: 18,
      stockRemaining: 7,
      stockTotal: 50,
      stockCity: 'Entrepôt Abidjan & Dakar',
      liveBuyerName: 'Kouassi d\'Abidjan vient de commander il y a 3 minutes',
      bgColor: '#18040a',
      accentColor: '#f43f5e'
    })
  },
  {
    type: 'hero',
    name: 'Section Hero & Accroche Choc',
    category: 'conversion',
    badge: 'Indispensable',
    icon: Flame,
    color: '#f59e0b',
    description: 'Titre magnétique, badge promo animé, sous-titre persuasif et CTA clignotant.',
    createDefaultData: (prod) => ({
      headline: `Découvrez la Puissance Ultime de : ${prod?.name || 'Pack Élite NaNa Pro X'}`,
      subheadline: stripHtmlToCleanText(prod?.description) || 'La solution tout-en-un plébiscitée par les entrepreneurs et leaders pour multiplier leurs résultats en un temps record.',
      promoBadge: '⚡ OFFRE EXCLUSIVE • DISPONIBILITÉ LIMITÉE',
      badgeLocation: 'ZONE UEMOA & AFRIQUE DE L\'OUEST',
      ctaText: 'Commander Maintenant & Réclamer les Bonus 🚀',
      ctaSubtext: '🔒 Accès immédiat • Paiement 100% sécurisé Mobile Money',
      showAvatar: true,
      instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      authorName: 'Prof. Amadou Traoré',
      authorRole: 'Instructeur Certifié & Auteur',
      accentColor: '#f59e0b',
      bgColor: '#070b14'
    })
  },
  {
    type: 'autoplay_video',
    name: 'Vidéo Autoplay Silencieuse',
    category: 'media',
    badge: 'Loop CDN ⚡',
    icon: Video,
    color: '#8b5cf6',
    description: 'Vidéo courte muette en boucle automatique 100% largeur (Cloudinary, CDN, MP4 direct) économisant la bande passante Firebase.',
    createDefaultData: (prod) => ({
      ...DEFAULT_AUTOPLAY_VIDEO_DATA,
      videoUrl: ''
    })
  },
  {
    type: 'video',
    name: 'Vidéo de Vente (VSL Masterclass)',
    category: 'media',
    badge: '4K VSL',
    icon: Video,
    color: '#6366f1',
    description: 'Lecteur vidéo grand format avec poster optimisé, simulation audio et compteur live.',
    createDefaultData: (prod) => ({
      headline: 'Regardez la Démonstration Complète en Direct',
      subheadline: 'Découvrez en moins de 3 minutes comment ce système transforme radicalement votre activité.',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      posterUrl: prod?.image || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=80',
      liveBadgeText: 'Extrait de la Masterclass en Direct',
      viewersCount: 247,
      bgColor: '#050811'
    })
  },
  {
    type: 'benefits',
    name: 'Bénéfices & Compétences Clés',
    category: 'conversion',
    badge: 'Impact',
    icon: CheckCircle2,
    color: '#10b981',
    description: 'Cartes opérationnelles avec numérotation et badges "Opérationnel Immédiat ✓".',
    createDefaultData: () => ({
      sectionTag: 'RÉSULTATS TANGIBLES',
      sectionTitle: 'Ce Que Vous Allez Concrètement Maîtriser',
      sectionSubtitle: 'Une méthode pas-à-pas pensée pour produire des résultats immédiats sans perte de temps.',
      items: [
        { id: 'b-1', number: '01', title: 'Automatisation Intégrale', desc: 'Déployez un système clé-en-main qui encaisse et gère vos transactions 24h/24 sans friction.' },
        { id: 'b-2', number: '02', title: 'Sécurité & Anti-Fraude Bancaire', desc: 'Protégez vos flux avec les protocoles Mobile Money certifiés et conformes aux normes UEMOA.' },
        { id: 'b-3', number: '03', title: 'Synchronisation Omnicanale', desc: 'Connectez instantanément votre smartphone Android, tablette et caisse centrale sans latence.' },
        { id: 'b-4', number: '04', title: 'Multiplication des Ventes', desc: 'Exploitez des tunnels persuasifs pour augmenter de +40% la valeur moyenne de chaque client.' }
      ],
      bgColor: '#060a15'
    })
  },
  {
    type: 'stats',
    name: 'Chiffres Clés & Métriques d\'Impact',
    category: 'social_proof',
    badge: 'Preuve Chiffrée',
    icon: BarChart3,
    color: '#38bdf8',
    description: '4 compteurs d\'autorité (utilisateurs, taux de succès, volume traité, support 24/7).',
    createDefaultData: () => ({
      sectionTag: 'IMPACT & PERFORMANCE EN AFRIQUE',
      sectionTitle: 'Des Résultats Éprouvés sur le Terrain',
      metrics: [
        { id: 'm-1', value: '15 400+', label: 'Entrepreneurs Actifs', note: 'Côte d\'Ivoire, Sénégal, Burkina, Bénin' },
        { id: 'm-2', value: '99.4%', label: 'Taux de Satisfaction', note: 'Certifié sur 2 800 retours' },
        { id: 'm-3', value: '1.2 Mrd FCFA', label: 'Volume Encaissé', note: 'Transactions Wave & Orange Money' },
        { id: 'm-4', value: '< 2 min', label: 'Temps Moyen de Réponse', note: 'Support VIP dédié sur WhatsApp' }
      ],
      bgColor: '#080e1e'
    })
  },
  {
    type: 'comparison',
    name: 'Comparatif "Avec Nous vs Sans Nous"',
    category: 'conversion',
    badge: 'Contraste Fort',
    icon: ShieldCheck,
    color: '#ec4899',
    description: 'Mise en valeur sans appel : méthodes traditionnelles pénibles vs notre solution moderne.',
    createDefaultData: () => ({
      sectionTag: 'POURQUOI FAIRE CE CHOIX AUJOURD\'HUI',
      sectionTitle: 'La Différence Fondamentale',
      sectionSubtitle: 'Comparez par vous-même avant de prendre votre décision.',
      withoutTitle: 'Méthodes Traditionnelles (Ancien Monde)',
      withTitle: 'Avec la Solution NaNa Pro X (Standard Élite)',
      points: [
        { without: 'Dépendance aux formulaires manuels lents', with: 'Encaissement 1-clic direct Wave & Orange Money' },
        { without: 'Pertes de clients dues à des bugs de paiement', with: 'Routage automatique multi-opérateurs haute résilience' },
        { without: 'Comptabilité manuelle et erreurs de caisse', with: 'Journal de trésorerie synchronisé en temps réel' },
        { without: 'Support client injoignable ou inexistant', with: 'Assistance dédiée 7j/7 sur WhatsApp avec gestionnaire attitré' }
      ],
      bgColor: '#060a17'
    })
  },
  {
    type: 'founder',
    name: 'Mot du Fondateur & Lettre Personnelle',
    category: 'authority',
    badge: 'Autorité Humaine',
    icon: UserCheck,
    color: '#a855f7',
    description: 'Portrait, signature, histoire poignante et vision pour briser la méfiance.',
    createDefaultData: () => ({
      authorName: 'Mamadou Diallo',
      authorRole: 'Fondateur & Directeur Général NaNa Afrique',
      authorImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      title: '« Pourquoi j\'ai conçu cette technologie pour l\'Afrique d\'aujourd\'hui »',
      paragraph1: 'Pendant des années, j\'ai vu de brillants entrepreneurs africains perdre jusqu\'à 60% de leurs ventes à cause d\'outils inadaptés à nos réalités locales.',
      paragraph2: 'NaNa n\'est pas un logiciel de plus venu d\'ailleurs. C\'est un moteur conçu sur le terrain, testé à Treichville, Sandaga et Ouagadougou, pour faire circuler la valeur sans intermédiaire inutile.',
      signatureText: '— Mamadou Diallo, Fondateur',
      bgColor: '#070914'
    })
  },
  {
    type: 'testimonials',
    name: 'Témoignages & Preuve Sociale',
    category: 'social_proof',
    badge: '4.95 / 5',
    icon: Star,
    color: '#f59e0b',
    description: 'Avis vérifiés avec citations, notation 5 étoiles, photos et profils de dirigeants.',
    createDefaultData: () => ({
      sectionTag: 'PREUVE SOCIALE & AUTORITÉ',
      sectionTitle: 'Ce Que Disent les Professionnels et Dirigeants',
      ratingText: '4.95 / 5 (840+ avis vérifiés)',
      testimonials: [
        {
          id: 't-1',
          name: 'Ibrahim Ouedraogo',
          role: 'Directeur Général, Sahel Trading',
          comment: 'Ce système a révolutionné la gestion de nos encaissements. Les clients paient par Wave ou Orange Money en 30 secondes sans le moindre blocage.',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
          rating: 5
        },
        {
          id: 't-2',
          name: 'Aïcha Kone',
          role: 'Fondatrice de Luxe & Co, Abidjan',
          comment: 'La structure du tunnel est d\'une efficacité redoutable. Mon taux de conversion a bondi de 18% dès la première semaine.',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          rating: 5
        },
        {
          id: 't-3',
          name: 'Cheikh Ndiaye',
          role: 'Consultant E-commerce, Dakar',
          comment: 'L\'ergonomie est incomparable. Les pages se chargent à la vitesse de l\'éclair même avec les connexions mobiles africaines.',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
          rating: 5
        }
      ],
      bgColor: '#070c18'
    })
  },
  {
    type: 'pricing',
    name: 'Tableau de Prix & The Offer Stack',
    category: 'pricing',
    badge: 'Offre Irrésistible',
    icon: Tag,
    color: '#10b981',
    description: 'Offre choc : tarif barré, prix promo géant, bonus empilés et logos Mobile Money.',
    createDefaultData: (prod) => ({
      sectionTag: 'OFFRE LIMITÉE DE LANCEMENT',
      sectionTitle: 'Choisissez Votre Accès Privilégié',
      originalPrice: prod?.originalPrice || 49000,
      discountPrice: prod?.price || 24500,
      currency: 'FCFA',
      discountBadge: 'ÉCONOMISEZ 50% AUJOURD\'HUI',
      ctaText: 'Valider Ma Commande Immédiate ⚡',
      reassuranceText: 'Paiement sécurisé par Wave, Orange Money, Moov Money, MTN & Carte',
      bonusList: [
        { id: 'bon-1', title: 'Gabarit de Tunnel Haute Conversion Pré-Configuré', value: 25000 },
        { id: 'bon-2', title: 'Guide Stratégique de Clôture WhatsApp VIP', value: 18000 },
        { id: 'bon-3', title: 'Accès au Mastermind Privé & Communauté NaNa', value: 35000 }
      ],
      bgColor: '#040711'
    })
  },
  {
    type: 'checkout',
    name: 'Formulaire de Commande Directe (1-Clic)',
    category: 'closing',
    badge: 'Checkout Live',
    icon: ShoppingBag,
    color: '#059669',
    description: 'Encaissement intégré sans redirection : Nom, Téléphone, Ville, Choix Wave/Orange/Cash.',
    createDefaultData: (prod) => ({
      sectionTag: 'COMMANDE SÉCURISÉE EN 1 MINUTE',
      sectionTitle: 'Finalisez Votre Commande ci-dessous',
      sectionSubtitle: 'Remplissez vos coordonnées pour recevoir immédiatement votre accès et votre confirmation.',
      productName: prod?.name || 'Pack Élite NaNa Pro X',
      productPrice: prod?.price || 24500,
      productImage: prod?.image || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=300&q=80',
      shippingBadge: '🚀 Expédition & Activation Immédiate',
      deliveryFee: 'GRATUITE',
      paymentMethods: ['wave', 'orange', 'moov_mtn', 'cod'],
      guaranteeNotice: 'Paiement sécurisé par protocole bancaire agréé BCEAO',
      bgColor: '#030814'
    })
  },
  {
    type: 'guarantee',
    name: 'Garantie 100% Sérénité',
    category: 'conversion',
    badge: 'Confiance',
    icon: ShieldCheck,
    color: '#06b6d4',
    description: 'Bouclier de confiance, remboursement 30 jours et engagements de conformité légale.',
    createDefaultData: () => ({
      title: 'Garantie Inconditionnelle 30 Jours "Satisfait ou Remboursé"',
      subtitle: 'Testez l\'ensemble des fonctionnalités sans le moindre risque pendant 30 jours complets.',
      description: 'Si vous n\'obtenez pas les résultats escomptés ou si vous n\'êtes pas absolument conquis par la simplicité et la rentabilité du système, nous vous remboursons l\'intégralité de votre investissement sans poser de question.',
      badgeText: 'ZÉRO RISQUE POUR VOUS',
      durationDays: 30,
      bgColor: '#080d1a'
    })
  },
  {
    type: 'faq',
    name: 'Foire Aux Questions (Accordéons)',
    category: 'conversion',
    badge: 'Interactif',
    icon: HelpCircle,
    color: '#8b5cf6',
    description: 'Levée des objections avec questions/réponses dépliables et contact support WhatsApp.',
    createDefaultData: () => ({
      sectionTag: 'TOUTES LES RÉPONSES',
      sectionTitle: 'Questions Fréquemment Posées',
      subtitle: 'Tout ce que vous devez savoir avant de nous rejoindre.',
      questions: [
        {
          id: 'q-1',
          q: 'Comment s\'effectue le paiement avec Wave ou Orange Money ?',
          a: 'Le paiement s\'effectue en 1-clic direct. Dès validation, vous recevez un push USSD sur votre téléphone pour confirmer votre code secret en toute sécurité.'
        },
        {
          id: 'q-2',
          q: 'Ai-je besoin de compétences techniques en informatique ?',
          a: 'Absolument aucune. Notre constructeur de pages fonctionne en glisser-déposer intuitif. Vous pouvez modifier les textes, photos et tarifs en quelques clics sans toucher une seule ligne de code.'
        },
        {
          id: 'q-3',
          q: 'Puis-je utiliser ces pages sur smartphone avec une connexion lente ?',
          a: 'Oui, nos pages sont ultra-optimisées pour les connexions 3G/4G africaines et se chargent en moins de 1.2 seconde sur n\'importe quel smartphone Android ou iPhone.'
        },
        {
          id: 'q-4',
          q: 'Que se passe-t-il après avoir validé ma commande ?',
          a: 'Vous recevez immédiatement votre confirmation par WhatsApp et par e-mail, avec toutes les instructions détaillées.'
        }
      ],
      whatsappSupportText: 'Encore une question ? Discutez directement avec un conseiller sur WhatsApp',
      whatsappPhone: '+22670000000',
      bgColor: '#060a14'
    })
  },
  {
    type: 'footer',
    name: 'Pied de Page Vente & Mentions Légales',
    category: 'closing',
    badge: 'Légal & SSL',
    icon: Lock,
    color: '#64748b',
    description: 'Copyright, conformité réglementaire BCEAO/UEMOA, sceaux SSL et liens légaux.',
    createDefaultData: () => ({
      companyName: 'NaNa Enterprise Tech Ltd • Solutions Hybrides Afrique',
      copyright: `© ${new Date().getFullYear()} NaNa. Tous droits réservés.`,
      disclaimer: 'Ce site ne fait pas partie du réseau Facebook ou de Meta Platforms Inc. De plus, ce site n\'est pas approuvé par Facebook de quelque manière que ce soit. FACEBOOK est une marque commerciale de Meta Platforms, Inc.',
      links: [
        { label: 'Mentions Légales', href: '#' },
        { label: 'Conditions Générales de Vente', href: '#' },
        { label: 'Politique de Confidentialité', href: '#' },
        { label: 'Assistance Client WhatsApp', href: '#' }
      ],
      securitySeals: '🔒 Cryptage SSL 256-Bit • Conformité Fintech UEMOA • Zéro Frais Cachés',
      bgColor: '#02040a'
    })
  }
];

// Presets de couleurs pour le constructeur
export const COLOR_PRESETS = [
  { name: 'Obsidian Amber (Signature NaNa)', primary: '#f59e0b', bg: '#070b14', button: '#f59e0b', buttonText: '#000000' },
  { name: 'Cyber Emerald (Conversion Pro)', primary: '#10b981', bg: '#041014', button: '#10b981', buttonText: '#022c22' },
  { name: 'Deep Indigo (High-Tech SaaS)', primary: '#6366f1', bg: '#0b0f19', button: '#4f46e5', buttonText: '#ffffff' },
  { name: 'Neon Violet (Créateurs & VIP)', primary: '#8b5cf6', bg: '#0c071e', button: '#7c3aed', buttonText: '#ffffff' },
  { name: 'Crimson Luxe (Vente Flash)', primary: '#f43f5e', bg: '#14060b', button: '#e11d48', buttonText: '#ffffff' }
];

// Gabarits Complets Prêts à l'Emploi (Funnels Clés en Main)
export const PREMADE_FUNNEL_TEMPLATES = [
  {
    id: 'tpl-physical-cod',
    name: 'Tunnel E-Commerce & Paiement à la Livraison',
    description: 'Architecture parfaite pour vendre des produits physiques avec commande rapide Wave / COD.',
    types: ['urgency', 'hero', 'video', 'benefits', 'stats', 'comparison', 'testimonials', 'pricing', 'checkout', 'guarantee', 'faq', 'footer']
  },
  {
    id: 'tpl-coaching-vip',
    name: 'Tunnel Masterclass & Coaching VIP',
    description: 'Structure haute autorité pour formations, programmes d\'accompagnement et infoproduits.',
    types: ['hero', 'video', 'benefits', 'founder', 'stats', 'testimonials', 'pricing', 'guarantee', 'faq', 'footer']
  },
  {
    id: 'tpl-flash-sale',
    name: 'Page de Vente Flash 24H (Black Friday)',
    description: 'Format hyper-condensé axé sur l\'urgence, le compte à rebours et l\'offre irrésistible.',
    types: ['urgency', 'hero', 'comparison', 'pricing', 'checkout', 'guarantee', 'footer']
  }
];

// ============================================================================
// 2. COMPOSANT PRINCIPAL : FUNNELBUILDER ENGINE
// ============================================================================
// CATALOGUE UNIFIÉ DU BUILDER (12 MODULES DIVI + 11 MODULES BOÎTE À OUTILS PRO)
// ============================================================================
export const ALL_FUNNEL_MODULES = [...DIVI_MODULES_CATALOG, ...TOOLBOX_PRO_CATALOG];

export const FunnelBuilder = ({
  product = null,
  isOpen = true,
  onClose = () => {},
  onSave = () => {},
  onDelete = () => {},
  onDirectCheckout = null,
  onBuyNow = null,
  isPublicView = false
}) => {
  // Produit de démonstration si non fourni
  const defaultProduct = useMemo(() => ({
    id: 'prod-funnel-demo',
    name: 'Pack Élite NaNa Pro X - Édition Limitée',
    price: 24500,
    originalPrice: 49000,
    category: 'Technologie & Business',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    description: 'Le concentré de technologie conçu pour décupler votre productivité et vos résultats au quotidien.'
  }), []);

  const activeProduct = useMemo(() => {
    const rawProd = product || defaultProduct;
    if (!rawProd) return rawProd;
    return {
      ...rawProd,
      name: stripHtmlToCleanText(rawProd.name) || rawProd.name,
      description: stripHtmlToCleanText(rawProd.description) || rawProd.description
    };
  }, [product, defaultProduct]);

  // État d'ouverture de la Boîte à Outils Pro (Hub d'Intégration)
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);

  // Modale interactive de confirmation Cash on Delivery (Test Live)
  const [codConfirmOpen, setCodConfirmOpen] = useState(false);

  // Modale indépendante : Bibliothèque d'Icônes NaNa (Duotone Pro)
  const [isIconLibraryOpen, setIsIconLibraryOpen] = useState(false);
  const [iconPickerTargetBlockId, setIconPickerTargetBlockId] = useState(null);

  // --------------------------------------------------------------------------
  // 1. ÉTAT GLOBAL DU FUNNEL MULTI-PAGES (funnelPages & activePageId)
  // --------------------------------------------------------------------------
  const [funnelPages, setFunnelPages] = useState(() => {
    const rawPages = (product?.pages && Array.isArray(product.pages) && product.pages.length > 0)
      ? product.pages
      : (product?.modular_funnel?.pages && Array.isArray(product.modular_funnel.pages) && product.modular_funnel.pages.length > 0)
      ? product.modular_funnel.pages
      : (product?.modularFunnel?.pages && Array.isArray(product.modularFunnel.pages) && product.modularFunnel.pages.length > 0)
      ? product.modularFunnel.pages
      : null;

    if (rawPages) {
      return rawPages.map(p => {
        const rawBlocks = (p.blocks && Array.isArray(p.blocks)) ? p.blocks : [];
        const normalizedBlocks = rawBlocks.map((b, i) => normalizeAndSanitizeBlock(b, i)).filter(Boolean);
        const variants = p.variants ? {
          A: (p.variants.A && Array.isArray(p.variants.A)) ? p.variants.A.map((b, i) => normalizeAndSanitizeBlock(b, i)).filter(Boolean) : normalizedBlocks,
          B: (p.variants.B && Array.isArray(p.variants.B)) ? p.variants.B.map((b, i) => normalizeAndSanitizeBlock(b, i)).filter(Boolean) : []
        } : {
          A: normalizedBlocks,
          B: []
        };
        return {
          ...p,
          hasAbTest: p.hasAbTest !== undefined ? p.hasAbTest : (Boolean(variants.B && variants.B.length > 0)),
          variants,
          blocks: variants.A || []
        };
      });
    }
    // Séquence complète initiale pré-assemblée des 12 modules de vente pour la page principale
    const initialBlocks = (() => {
      const existingBlocks = (product?.blocks && Array.isArray(product.blocks) && product.blocks.length > 0)
        ? product.blocks
        : (product?.modular_funnel?.blocks && Array.isArray(product.modular_funnel.blocks) && product.modular_funnel.blocks.length > 0)
        ? product.modular_funnel.blocks
        : (product?.modularFunnel?.blocks && Array.isArray(product.modularFunnel.blocks) && product.modularFunnel.blocks.length > 0)
        ? product.modularFunnel.blocks
        : null;

      if (existingBlocks) {
        return existingBlocks.map((b, index) => normalizeAndSanitizeBlock(b, index)).filter(Boolean);
      }
      const initialTypes = ['urgency', 'hero', 'video', 'benefits', 'stats', 'comparison', 'testimonials', 'pricing', 'checkout', 'guarantee', 'faq', 'footer'];
      return initialTypes
        .map((type, index) => {
          const mod = DIVI_MODULES_CATALOG.find(m => m.type === type);
          if (!mod) return null;
          return normalizeAndSanitizeBlock({
            id: `block-${mod.type}-${Date.now()}-${index}`,
            type: mod.type,
            name: mod.name,
            data: mod.createDefaultData ? mod.createDefaultData(activeProduct) : {}
          }, index);
        })
        .filter(Boolean);
    })();

    return [
      {
        id: 1,
        name: 'Page de Vente',
        type: 'sales',
        path: '/vente',
        hasAbTest: false,
        variants: {
          A: initialBlocks,
          B: []
        },
        blocks: initialBlocks
      }
    ];
  });

  // Identifiant de la page en cours d'édition dans le Canvas
  const [activePageId, setActivePageId] = useState(() => {
    return product?.activePageId || 1;
  });

  // Variante A/B active pour la page en cours : 'A' | 'B'
  const [activeVariant, setActiveVariant] = useState('A');

  // Popup Exit-Intent (Le récupérateur de leads)
  const [popupBlocks, setPopupBlocks] = useState(() => {
    if (product?.popupBlocks && Array.isArray(product.popupBlocks) && product.popupBlocks.length > 0) {
      return product.popupBlocks;
    }
    return [
      {
        id: 'popup-block-urgency',
        type: 'urgency',
        name: 'Alerte Dernière Chance',
        data: {
          urgencyBadge: '⚠️ ATTENDEZ ! NE PARTEZ PAS LES MAINS VIDES',
          urgencyHeadline: 'Débloquez -30% Supplémentaires Immédiats',
          urgencySubheadline: 'Valable uniquement si vous commandez avant de quitter cette page.',
          countdownMinutes: 5,
          stockRemaining: 3
        },
        conditions: { device: 'all', showIfUrlParam: '', hideIfPurchased: false }
      },
      {
        id: 'popup-block-hero',
        type: 'hero',
        name: 'Offre Exit Spéciale',
        data: {
          badge: '🔥 OFFRE DE DERNIÈRE CHANCE',
          title: 'Votre Pack Spécial à Prix Préférentiel',
          subtitle: 'Confirmez votre commande maintenant et recevez 3 bonus exclusifs offerts immédiatement.',
          ctaText: 'RÉCLAMER MA RÉDUCTION IMMÉDIATE ⚡',
          priceCFA: Math.round((activeProduct.price || 24500) * 0.7),
          originalPriceCFA: activeProduct.price || 24500,
          heroImage: activeProduct.image
        },
        conditions: { device: 'all', showIfUrlParam: '', hideIfPurchased: false }
      }
    ];
  });

  // Mode édition du popup exit-intent (au lieu de la page normale)
  const [isEditingPopup, setIsEditingPopup] = useState(false);

  // Déclencheur d'affichage du popup en mode Aperçu (exit-intent)
  const [isExitPopupOpen, setIsExitPopupOpen] = useState(false);

  // Simulateur de Conditions d'Affichage pour tester en direct
  const [conditionSimulation, setConditionSimulation] = useState({
    simulatedUrlParam: '',
    simulatedIsCustomer: false
  });

  // Page active actuelle
  const activePage = useMemo(() => {
    return funnelPages.find(p => p.id === activePageId) || funnelPages[0] || null;
  }, [funnelPages, activePageId]);

  // Blocs rendus dans le Canvas selon le mode (Popup vs Variante A vs Variante B)
  const canvasBlocks = useMemo(() => {
    if (isEditingPopup) {
      return popupBlocks;
    }
    if (!activePage) return [];
    if (activePage.variants) {
      const variantList = activePage.variants[activeVariant];
      if (variantList && Array.isArray(variantList)) {
        return variantList;
      }
      return activePage.variants.A || activePage.blocks || [];
    }
    return activePage.blocks || [];
  }, [isEditingPopup, popupBlocks, activePage, activeVariant]);

  // Mise à jour ciblée des blocs (Popup vs Page Variante A/B)
  const setCanvasBlocks = useCallback((updater) => {
    if (isEditingPopup) {
      setPopupBlocks(prev => {
        return typeof updater === 'function' ? updater(prev) : updater;
      });
      return;
    }

    setFunnelPages(prevPages => {
      return prevPages.map(page => {
        if (page.id === activePageId) {
          const pageVariants = page.variants || {
            A: page.blocks || [],
            B: []
          };
          const currentList = pageVariants[activeVariant] || [];
          const nextBlocks = typeof updater === 'function' ? updater(currentList) : updater;

          const updatedVariants = {
            ...pageVariants,
            [activeVariant]: nextBlocks
          };

          return {
            ...page,
            variants: updatedVariants,
            blocks: activeVariant === 'A' ? nextBlocks : (pageVariants.A || nextBlocks)
          };
        }
        return page;
      });
    });
  }, [isEditingPopup, activePageId, activeVariant]);

  // Bloc sélectionné pour l'inspecteur
  const [selectedBlockId, setSelectedBlockId] = useState(null);

  // Sélecteur de Page / Switcher dans l'en-tête
  const [isPageSwitcherOpen, setIsPageSwitcherOpen] = useState(false);
  const pageSwitcherRef = useRef(null);

  // Popup d'ajout d'une nouvelle étape
  const [isAddStepModalOpen, setIsAddStepModalOpen] = useState(false);
  const [newStepType, setNewStepType] = useState('upsell');
  const [newStepName, setNewStepName] = useState('');
  const [newStepPath, setNewStepPath] = useState('');

  // Tiroirs / Drawers mobiles (< lg)
  const [isModulesOpen, setIsModulesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Mode de prévisualisation : 'desktop' | 'tablet' | 'mobile'
  const [previewDevice, setPreviewDevice] = useState('desktop');

  // Mode d'affichage : 'builder' (avec barres latérales) | 'preview' (mode visiteur plein écran)
  const [viewMode, setViewMode] = useState(isPublicView ? 'preview' : 'builder');

  // Mode de l'Inspecteur : 'visual' | 'code' (Lean Tech Editor)
  const [inspectorMode, setInspectorMode] = useState('visual');

  // Sous-onglet de l'Inspecteur en mode Visuel : 'content' | 'style' | 'global'
  const [inspectorTab, setInspectorTab] = useState('content');

  // Moteur Lean d'Injection Directe (CSS dynamique & HTML natif)
  const [customCSS, setCustomCSS] = useState(() => product?.customCSS || '');
  const [customHTML, setCustomHTML] = useState(() => product?.customHTML || '');

  // Modal des templates clés-en-main
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  // Recherche dans la bibliothèque de modules
  const [searchModuleQuery, setSearchModuleQuery] = useState('');

  // --------------------------------------------------------------------------
  // 2. RÉFÉRENCE & ÉTAT DU DRAG & DROP
  // --------------------------------------------------------------------------
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const [dropTargetZone, setDropTargetZone] = useState(null); // null | 'top' | 'bottom' | number
  const draggedModuleRef = useRef(null); // Garantit l'accès synchrone au module lors du drop
  const dragCounterRef = useRef(0);
  const canvasScrollRef = useRef(null);

  // Modale des Paramètres Globaux (Cerveau du Funnel)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState('general'); // 'general' | 'seo' | 'tracking' | 'crm' | 'payments'

  // Verrouillage du scroll du body en arrière-plan lorsque des modales/tiroirs sont ouverts
  useEffect(() => {
    const isAnyModalOpen = isToolboxOpen || isIconLibraryOpen || isSettingsModalOpen || isAddStepModalOpen || showTemplatesModal || codConfirmOpen;
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isToolboxOpen, isIconLibraryOpen, isSettingsModalOpen, isAddStepModalOpen, showTemplatesModal, codConfirmOpen]);

  // Paramètres Globaux du Funnel (Cerveau)
  const [funnelSettings, setFunnelSettings] = useState({
    // Onglet 1: Général
    funnelName: `${activeProduct.name} - Tunnel de Vente Haute Conversion`,
    hostingMode: 'subdomain', // 'subdomain' (Gratuit Freemium) | 'custom' (Pro)
    subdomain: 'boutique-pro',
    customDomain: 'promo.nana-store.ci',
    faviconUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=100&q=80',
    funnelStatus: 'published', // 'published' | 'draft' | 'maintenance'

    // Onglet 2: SEO & Social
    pageTitle: `${activeProduct.name} • Offre Spéciale NaNa`,
    pageDescription: activeProduct.description || 'Commandez votre pack exclusif avec livraison rapide et paiement sécurisé.',
    ogImageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=80',

    // Onglet 3: Tracking & Pixels
    fbPixelId: '109283746582910',
    tiktokPixelId: 'C78N987HG54321',
    posthogId: 'phc_982348572093847',
    customHeadScripts: '<!-- Google Tag Manager / Meta Pixel Header Scripts -->\n<script>\n  console.log("NaNa Tracking Engine Initialized");\n</script>',

    // Onglet 4: Automatisation CRM
    crmTag: 'VIP_ACHETEUR_TUNNEL',
    brevoListId: 'brevo_sales_2026',
    webhookUrl: 'https://hooks.zapier.com/hooks/catch/123456/nana_order/',

    // Onglet 5: Paiements
    currency: 'XOF', // 'XOF' | 'EUR' | 'USD'
    enableOrangeMoney: true,
    enableWave: true,
    enableStripe: true,

    // Options UI & Moteur
    themePreset: 'Obsidian Amber (Signature NaNa)',
    enableStickyMobileBar: true,
    hapticSoundEnabled: true
  });

  // État de sauvegarde & Toast
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [toastMessage, setToastMessage] = useState(null);

  // Toast Helper déclaré immédiatement pour éviter toute Temporal Dead Zone (TDZ)
  const triggerToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // FAQ interactive state (pour tester les accordéons directement dans le canvas)
  const [expandedFaqId, setExpandedFaqId] = useState('q-1');

  // Simulation audio lecteur vidéo
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  // Formulaire de checkout interactif avec pré-remplissage 100% automatique depuis localStorage
  const [simulatedCheckout, setSimulatedCheckout] = useState(() => ({
    fullName: (typeof window !== 'undefined' ? localStorage.getItem('nana_customer_name') : '') || '',
    phone: (typeof window !== 'undefined' ? localStorage.getItem('nana_customer_phone') : '') || '',
    city: (typeof window !== 'undefined' ? localStorage.getItem('nana_customer_address') : '') || 'Abidjan',
    paymentMethod: (typeof window !== 'undefined' ? localStorage.getItem('nana_customer_payment_method') : '') || 'wave'
  }));
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [isPrimaryCheckoutOpen, setIsPrimaryCheckoutOpen] = useState(false);
  const [checkoutProductPayload, setCheckoutProductPayload] = useState(null);

  // Redirection obligatoire vers la caisse principale avec transmission et pré-remplissage des coordonnées
  const handleProceedToPrimaryCheckout = useCallback((targetProduct = null) => {
    const prodToBuy = targetProduct || activeProduct;
    const customerName = (simulatedCheckout.fullName || '').trim();
    const customerPhone = (simulatedCheckout.phone || '').trim();
    const customerCity = (simulatedCheckout.city || '').trim() || 'Abidjan';
    const paymentMethod = simulatedCheckout.paymentMethod || 'wave';

    if (isPublicView && !customerPhone) {
      triggerToast('⚠️ Veuillez renseigner votre numéro de téléphone pour finaliser');
      return;
    }

    // Sauvegarde immédiate dans localStorage pour pré-remplissage 100% automatique sur toute l'app
    if (typeof window !== 'undefined') {
      if (customerName) localStorage.setItem('nana_customer_name', customerName);
      if (customerPhone) localStorage.setItem('nana_customer_phone', customerPhone);
      if (customerCity) localStorage.setItem('nana_customer_address', customerCity);
      localStorage.setItem('nana_customer_payment_method', paymentMethod);
    }

    try { playCashChime(); } catch (e) {}

    const payload = {
      product: {
        id: prodToBuy?.id || activeProduct?.id || 'funnel-item',
        name: prodToBuy?.name || activeProduct?.name || 'Offre Spéciale',
        price: Number(prodToBuy?.price || activeProduct?.price) || 25000,
        originalPrice: Number(prodToBuy?.originalPrice || activeProduct?.originalPrice) || 45000,
        imageUrl: prodToBuy?.image || activeProduct?.image || '',
        quantity: 1
      },
      customer: {
        fullName: customerName,
        phone: customerPhone,
        city: customerCity,
        paymentMethod
      },
      amount: Number(prodToBuy?.price || activeProduct?.price) || 25000
    };

    // 1. Événement global Nana pour ouverture immédiate dans le thème parent
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nana:open_checkout', { detail: payload }));
    }

    // 2. Callbacks directs si fournis
    if (typeof onDirectCheckout === 'function') {
      onDirectCheckout(payload.product, 1);
    } else if (typeof onBuyNow === 'function') {
      onBuyNow(payload.product, 1);
    } else {
      // 3. Fallback direct sur page standalone : modale checkout fintech intégrée
      setCheckoutProductPayload(payload.product);
      setIsPrimaryCheckoutOpen(true);
    }

    setOrderConfirmed(true);
    triggerToast('⚡ Redirection vers la caisse sécurisée...');
    setTimeout(() => setOrderConfirmed(false), 3000);
  }, [activeProduct, simulatedCheckout, isPublicView, triggerToast, onDirectCheckout, onBuyNow]);

  // Compteur à rebours live qui s'anime vraiment
  const [liveSeconds, setLiveSeconds] = useState(18);
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveSeconds(prev => (prev > 0 ? prev - 1 : 59));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fermeture du switcher au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pageSwitcherRef.current && !pageSwitcherRef.current.contains(e.target)) {
        setIsPageSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Génération de slug URL propre
  const slugifyPath = useCallback((text) => {
    if (!text) return '/';
    const slug = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    return `/${slug || 'page'}`;
  }, []);

  // Ajout d'une nouvelle étape au funnel
  const handleAddStep = useCallback((e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmedName = newStepName.trim() || 'Nouvelle Étape';
    const generatedPath = newStepPath.trim() || slugifyPath(trimmedName);
    const normalizedPath = generatedPath.startsWith('/') ? generatedPath : `/${generatedPath}`;
    
    const newPage = {
      id: Date.now(),
      name: trimmedName,
      type: newStepType,
      path: normalizedPath,
      hasAbTest: false,
      variants: {
        A: [],
        B: []
      },
      blocks: []
    };

    setFunnelPages(prev => [...prev, newPage]);
    setActivePageId(newPage.id);
    setActiveVariant('A');
    setSelectedBlockId(null);
    setIsAddStepModalOpen(false);
    setNewStepName('');
    setNewStepPath('');
    try { playValidationBeep(); } catch (err) {}
    triggerToast(`🎉 Étape "${trimmedName}" ajoutée avec succès au funnel !`);
  }, [newStepName, newStepPath, newStepType, slugifyPath, triggerToast]);

  // Réordonner les étapes du funnel
  const movePage = useCallback((index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= funnelPages.length) return;
    const newPages = [...funnelPages];
    const [moved] = newPages.splice(index, 1);
    newPages.splice(targetIndex, 0, moved);
    setFunnelPages(newPages);
  }, [funnelPages]);

  // Supprimer une étape
  const deletePage = useCallback((pageId) => {
    if (funnelPages.length <= 1) {
      triggerToast("⚠️ Impossible de supprimer la seule page restante du funnel.");
      return;
    }
    const filtered = funnelPages.filter(p => p.id !== pageId);
    setFunnelPages(filtered);
    if (activePageId === pageId) {
      setActivePageId(filtered[0].id);
      setActiveVariant('A');
      setSelectedBlockId(null);
    }
    triggerToast("🗑️ Étape du funnel supprimée.");
  }, [funnelPages, activePageId, triggerToast]);

  // Mettre à jour les métadonnées d'une étape (nom, path)
  const updatePageMeta = useCallback((pageId, field, value) => {
    setFunnelPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      return { ...p, [field]: value };
    }));
  }, []);

  // --------------------------------------------------------------------------
  // A/B TESTING ENGINE : DUPLICATION ET BASCULE DES VARIANTES (A vs B)
  // --------------------------------------------------------------------------
  const handleCreateAbTest = useCallback(() => {
    setFunnelPages(prevPages => {
      return prevPages.map(page => {
        if (page.id === activePageId) {
          const blocksA = (page.variants?.A && page.variants.A.length > 0)
            ? page.variants.A
            : (page.blocks || []);

          // Duplication profonde des blocs de la Variante A vers la Variante B avec de nouveaux IDs
          const clonedB = blocksA.map((b, idx) => ({
            ...b,
            id: `block-${b.type}-varB-${Date.now()}-${idx}`,
            name: `${b.name} (Challenger B)`,
            data: JSON.parse(JSON.stringify(b.data || {})),
            conditions: b.conditions ? { ...b.conditions } : { device: 'all', showIfUrlParam: '', hideIfPurchased: false }
          }));

          return {
            ...page,
            hasAbTest: true,
            variants: {
              A: blocksA,
              B: clonedB
            },
            blocks: blocksA
          };
        }
        return page;
      });
    });

    setActiveVariant('B');
    setSelectedBlockId(null);
    try { playCashChime(); } catch (err) {}
    triggerToast('🧪 Test A/B activé ! La Variante B a été générée depuis la Variante A.');
  }, [activePageId, triggerToast]);

  const handleSwitchVariant = useCallback((variant) => {
    setActiveVariant(variant);
    setSelectedBlockId(null);
    try { playTapBeep(); } catch (err) {}
    triggerToast(`Bascule sur la Variante ${variant} (${variant === 'A' ? 'Contrôle' : 'Challenger'})`);
  }, [triggerToast]);

  // --------------------------------------------------------------------------
  // LOGIQUE CONDITIONNELLE : MISE À JOUR ET ÉVALUATION PAR BLOC
  // --------------------------------------------------------------------------
  const updateBlockCondition = useCallback((field, value) => {
    if (!selectedBlockId) return;
    setCanvasBlocks(prev => prev.map(block => {
      if (block.id !== selectedBlockId) return block;
      const curr = block.conditions || { device: 'all', showIfUrlParam: '', hideIfPurchased: false };
      return {
        ...block,
        conditions: {
          ...curr,
          [field]: value
        }
      };
    }));
  }, [selectedBlockId, setCanvasBlocks]);

  const evaluateBlockConditions = useCallback((block) => {
    const cond = block.conditions || { device: 'all', showIfUrlParam: '', hideIfPurchased: false };

    // 1. Visibilité par Appareil
    if (cond.device === 'desktop' && previewDevice === 'mobile') {
      return { isVisible: false, reason: 'Masqué sur Mobile (Réservé Desktop)' };
    }
    if (cond.device === 'mobile' && previewDevice === 'desktop') {
      return { isVisible: false, reason: 'Masqué sur Desktop (Réservé Mobile)' };
    }

    // 2. Paramètre URL / UTM Requis
    if (cond.showIfUrlParam && cond.showIfUrlParam.trim()) {
      const required = cond.showIfUrlParam.trim().toLowerCase();
      const currentParam = (conditionSimulation.simulatedUrlParam || '').toLowerCase();
      const urlSearch = typeof window !== 'undefined' ? (window.location.search || '').toLowerCase() : '';
      if (!currentParam.includes(required) && !urlSearch.includes(required)) {
        return { isVisible: false, reason: `Paramètre requis : ?${cond.showIfUrlParam}` };
      }
    }

    // 3. Statut Client (hideIfPurchased)
    if (cond.hideIfPurchased && conditionSimulation.simulatedIsCustomer) {
      return { isVisible: false, reason: 'Masqué si déjà client' };
    }

    return { isVisible: true, reason: null };
  }, [previewDevice, conditionSimulation]);

  // --------------------------------------------------------------------------
  // EXIT-INTENT ENGINE : DÉTECTION MOUSELEAVE EN MODE APERÇU (y <= 0)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (viewMode !== 'preview') return;
    let hasTriggered = false;

    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 && !hasTriggered) {
        hasTriggered = true;
        setIsExitPopupOpen(true);
        try { playCashChime(); } catch (err) {}
        triggerToast('🎯 Exit-Intent détecté ! Le popup de conversion a été déclenché.');
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [viewMode, triggerToast]);

  // Synchronisation sélection si suppression ou sélection active
  const activeBlock = useMemo(() => {
    if (!canvasBlocks || canvasBlocks.length === 0) return null;
    if (selectedBlockId) {
      const found = canvasBlocks.find(b => String(b.id) === String(selectedBlockId));
      if (found) return found;
    }
    return canvasBlocks[0] || null;
  }, [canvasBlocks, selectedBlockId]);

  // --------------------------------------------------------------------------
  // 3. MANIPULATION DU MOTEUR D'ÉTAT (AJOUT, ORDRE, SUPPRESSION, DATA BINDING)
  // --------------------------------------------------------------------------
  const updateBlockField = useCallback((blockId, fieldPath, value) => {
    setCanvasBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block;
      return {
        ...block,
        data: {
          ...block.data,
          [fieldPath]: value
        }
      };
    }));
  }, [setCanvasBlocks]);

  const moveBlock = useCallback((index, direction) => {
    setCanvasBlocks(prev => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
    try { playTapBeep(); } catch (e) {}
  }, [setCanvasBlocks]);

  const duplicateBlock = useCallback((index) => {
    setCanvasBlocks(prev => {
      if (index < 0 || index >= prev.length) return prev;
      const original = prev[index];
      const uniqueId = `block-${original.type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const duplicated = {
        ...original,
        id: uniqueId,
        name: `${original.name} (Copie)`,
        data: JSON.parse(JSON.stringify(original.data || {}))
      };
      const next = [...prev];
      next.splice(index + 1, 0, duplicated);
      setTimeout(() => setSelectedBlockId(uniqueId), 0);
      return next;
    });
    try { playValidationBeep(); } catch (e) {}
    triggerToast('✅ Module dupliqué !');
  }, [setCanvasBlocks, triggerToast]);

  const deleteBlock = useCallback((index) => {
    setCanvasBlocks(prev => {
      const next = prev.filter((_, idx) => idx !== index);
      setTimeout(() => {
        if (next.length > 0) {
          setSelectedBlockId(next[Math.max(0, index - 1)].id);
        } else {
          setSelectedBlockId(null);
        }
      }, 0);
      return next;
    });
    try { playCancelSound(); } catch (e) {}
    triggerToast('🗑️ Section supprimée de la page.');
  }, [setCanvasBlocks, triggerToast]);

  // Handlers mémoïsés pour CanvasBlockItem (stabilité de référence absolue)
  const handleSelectBlock = useCallback((blockId) => {
    setSelectedBlockId(String(blockId));
    setInspectorTab('content');
    setIsSettingsOpen(true);
    try { playTapBeep(); } catch (e) {}
  }, []);

  const handleMoveBlockUp = useCallback((index) => moveBlock(index, 'up'), [moveBlock]);
  const handleMoveBlockDown = useCallback((index) => moveBlock(index, 'down'), [moveBlock]);
  const handleDuplicateBlock = useCallback((index) => duplicateBlock(index), [duplicateBlock]);
  const handleDeleteBlock = useCallback((index) => deleteBlock(index), [deleteBlock]);

  // Insertion de bloc avec génération d'ID unique Date.now() et empilement vertical strict
  const insertBlockAtIndex = useCallback((moduleTemplate, targetIndex) => {
    const uniqueId = `block-${moduleTemplate.type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newBlock = {
      id: uniqueId,
      name: moduleTemplate.name,
      type: moduleTemplate.type,
      data: moduleTemplate.createDefaultData ? moduleTemplate.createDefaultData(activeProduct) : {}
    };

    setCanvasBlocks(prevBlocks => {
      if (typeof targetIndex !== 'number' || targetIndex >= prevBlocks.length) {
        return [...prevBlocks, newBlock];
      }
      const nextList = [...prevBlocks];
      nextList.splice(Math.max(0, targetIndex), 0, newBlock);
      return nextList;
    });

    setSelectedBlockId(uniqueId);
    return newBlock;
  }, [activeProduct, setCanvasBlocks]);

  // Charger un Gabarit Complet Prêt à l'Emploi
  const loadPremadeTemplate = (template) => {
    const newBlocks = template.types
      .map((type, idx) => {
        const mod = DIVI_MODULES_CATALOG.find(m => m.type === type);
        if (!mod) return null;
        return {
          id: `block-${mod.type}-${Date.now()}-${idx}`,
          type: mod.type,
          name: mod.name,
          data: mod.createDefaultData(activeProduct)
        };
      })
      .filter(Boolean);

    setCanvasBlocks(newBlocks);
    if (newBlocks.length > 0) {
      setSelectedBlockId(newBlocks[0].id);
    }
    setShowTemplatesModal(false);
    try { playCashChime(); } catch (e) {}
    triggerToast(`🚀 Gabarit "${template.name}" chargé avec succès !`);
  };

  // --------------------------------------------------------------------------
  // 4. MÉCANIQUE NATIVE DE DRAG & DROP (100% FONCTIONNELLE & ROBUSTE)
  // --------------------------------------------------------------------------
  const handleDragStart = useCallback((e, moduleTemplate) => {
    draggedModuleRef.current = moduleTemplate;
    try {
      e.dataTransfer.setData('text/plain', moduleTemplate.type);
      e.dataTransfer.setData('application/json', JSON.stringify(moduleTemplate));
    } catch (err) {}
    e.dataTransfer.effectAllowed = 'copy';
    setIsDraggingActive(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDraggingActive(false);
    setDropTargetZone(null);
    dragCounterRef.current = 0;
    setTimeout(() => {
      draggedModuleRef.current = null;
    }, 150);
  }, []);

  const handleCanvasDragEnter = useCallback((e) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDraggingActive(true);
  }, []);

  const handleCanvasDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDraggingActive(false);
      setDropTargetZone(null);
      dragCounterRef.current = 0;
    }
  }, []);

  const handleCanvasDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Helper pour extraire le module de manière infaillible
  const extractDroppedModule = useCallback((e) => {
    if (draggedModuleRef.current) return draggedModuleRef.current;
    try {
      const json = e.dataTransfer.getData('application/json');
      if (json) return JSON.parse(json);
    } catch (err) {}
    try {
      const type = e.dataTransfer.getData('text/plain');
      if (type) return ALL_FUNNEL_MODULES.find(m => m.type === type) || DIVI_MODULES_CATALOG.find(m => m.type === type);
    } catch (err) {}
    return null;
  }, []);

  // Dépôt à un index précis
  const handleDropAtIndex = useCallback((e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingActive(false);
    setDropTargetZone(null);
    dragCounterRef.current = 0;

    const moduleTemplate = extractDroppedModule(e);
    if (!moduleTemplate) return;

    insertBlockAtIndex(moduleTemplate, targetIndex);
    try { playValidationBeep(); } catch (err) {}
    triggerToast(`✅ Module "${moduleTemplate.name}" inséré avec succès !`);

    setTimeout(() => {
      if (canvasScrollRef.current) {
        canvasScrollRef.current.scrollTo({
          top: canvasScrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  }, [extractDroppedModule, insertBlockAtIndex, triggerToast]);

  // Dépôt global sur le Canvas : "colle automatiquement en bas" avec spread operator strict
  const handleCanvasDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingActive(false);
    setDropTargetZone(null);
    dragCounterRef.current = 0;

    const moduleTemplate = extractDroppedModule(e);
    if (!moduleTemplate) return;

    const uniqueId = `block-${moduleTemplate.type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newBlock = {
      id: uniqueId,
      name: moduleTemplate.name,
      type: moduleTemplate.type,
      data: moduleTemplate.createDefaultData ? moduleTemplate.createDefaultData(activeProduct) : {}
    };

    setCanvasBlocks(prevBlocks => [...prevBlocks, newBlock]);
    setSelectedBlockId(uniqueId);

    try { playValidationBeep(); } catch (err) {}
    triggerToast(`✅ Module "${moduleTemplate.name}" empilé en bas de page !`);

    setTimeout(() => {
      if (canvasScrollRef.current) {
        canvasScrollRef.current.scrollTo({
          top: canvasScrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  }, [activeProduct, extractDroppedModule, setCanvasBlocks, triggerToast]);

  // Sauvegarde
  const handleSave = async () => {
    try { playCashChime(); } catch (e) {}
    setSaveStatus('saving');

    const effectiveSlug = (
      funnelSettings?.subdomain ||
      activeProduct?.subdomain ||
      activeProduct?.slug ||
      (activeProduct?.name ? activeProduct.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : '') ||
      'tunnel'
    ).toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '') || 'tunnel';

    const rawCustom = funnelSettings?.customDomain;
    const cleanCustomDomain = rawCustom ? cleanDomain(rawCustom) : null;
    const isRealCustom = funnelSettings?.hostingMode === 'custom' && cleanCustomDomain && !cleanCustomDomain.endsWith('.nanasore.com') && !cleanCustomDomain.endsWith('.nsore.shop');

    const funnelPayload = {
      id: effectiveSlug,
      slug: effectiveSlug,
      subdomain: effectiveSlug,
      productId: activeProduct?.id || effectiveSlug,
      funnelType: 'modular',
      funnelStudio: 'nana_studio_3',
      linkPrefix: 't',
      customDomain: isRealCustom ? cleanCustomDomain : null,
      hostingType: isRealCustom ? 'custom_domain' : 'path',
      title: funnelSettings?.funnelName || activeProduct?.name || 'Tunnel de Vente',
      funnelTitle: funnelSettings?.funnelName || activeProduct?.name || 'Tunnel de Vente',
      subtitle: funnelSettings?.pageDescription || activeProduct?.description || '',
      ogImageUrl: funnelSettings?.ogImageUrl || activeProduct?.image || '',
      salePrice: activeProduct?.price || 0,
      originalPrice: activeProduct?.originalPrice || (activeProduct?.price ? activeProduct.price * 1.5 : 0),
      currency: funnelSettings?.currency || 'XOF',
      product: activeProduct,
      products: activeProduct ? [activeProduct] : [],
      pages: funnelPages,
      activePageId,
      activeVariant,
      blocks: canvasBlocks,
      popupBlocks,
      settings: {
        ...funnelSettings,
        subdomain: effectiveSlug,
        customDomain: isRealCustom ? cleanCustomDomain : '',
        hostingMode: isRealCustom ? 'custom' : 'subdomain'
      },
      customCSS,
      customHTML,
      isPublished: true,
      updatedAt: new Date().toISOString()
    };

    try {
      await registerSubdomainInFirebase(effectiveSlug, funnelPayload.title, funnelPayload);
      await saveFunnelConfig(funnelPayload);

      if (isRealCustom && cleanCustomDomain) {
        await saveTenantCustomDomain(effectiveSlug, cleanCustomDomain, {
          storeName: funnelPayload.title,
          type: 'funnel',
          vendorType: 'funnel',
          funnelId: effectiveSlug,
          funnelSlug: effectiveSlug,
          dealSlug: effectiveSlug,
          logoUrl: funnelPayload.ogImageUrl || '',
          primaryColor: '#10b981',
          funnelData: funnelPayload,
          whiteLabel: {
            hidePoweredBy: true,
            hideReceiptLogo: true
          }
        });
      }
    } catch (saveErr) {
      console.warn('[FUNNEL-BUILDER] Erreur saveFunnelConfig:', saveErr);
    }

    setSaveStatus('saved');
    if (onSave) onSave(funnelPayload);

    const origin = typeof window !== 'undefined'
      ? (window.location.hostname.includes('localhost') ? window.location.origin : 'https://nanasore.com')
      : 'https://nanasore.com';
    const directUrl = isRealCustom && cleanCustomDomain
      ? `https://${cleanCustomDomain}`
      : `${origin}/t/${effectiveSlug}`;

    if (isRealCustom && cleanCustomDomain) {
      triggerToast(`💾 Tunnel enregistré et lié au domaine : https://${cleanCustomDomain} ⚡`);
    } else {
      triggerToast(`💾 Tunnel enregistré ! Lien direct : ${directUrl}`);
    }
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  // Export JSON
  const handleExportJson = () => {
    try {
      const jsonStr = JSON.stringify({
        version: '3.0-divi-master',
        product: activeProduct,
        pages: funnelPages,
        activePageId,
        activeVariant,
        settings: funnelSettings,
        blocks: canvasBlocks,
        popupBlocks,
        customCSS,
        customHTML,
        exportedAt: new Date().toISOString()
      }, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `funnel-${activeProduct.id || 'nana'}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      triggerToast('📥 Structure complète exportée au format JSON.');
    } catch (err) {
      console.error(err);
    }
  };

  const effectiveFunnelSlug = useMemo(() => {
    return (
      funnelSettings?.subdomain ||
      activeProduct?.subdomain ||
      activeProduct?.slug ||
      (activeProduct?.name ? activeProduct.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : '') ||
      'tunnel'
    ).toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '') || 'tunnel';
  }, [funnelSettings?.subdomain, activeProduct?.subdomain, activeProduct?.slug, activeProduct?.name]);

  const publicFunnelDirectUrl = useMemo(() => {
    const rawCustom = funnelSettings?.customDomain;
    const cleanCustom = rawCustom ? cleanDomain(rawCustom) : null;
    const isRealCustom = funnelSettings?.hostingMode === 'custom' && cleanCustom && !cleanCustom.endsWith('.nanasore.com') && !cleanCustom.endsWith('.nsore.shop');
    if (isRealCustom && cleanCustom) {
      return `https://${cleanCustom}`;
    }
    const origin = typeof window !== 'undefined'
      ? (window.location.hostname.includes('localhost') ? window.location.origin : 'https://nanasore.com')
      : 'https://nanasore.com';
    return `${origin}/t/${effectiveFunnelSlug}`;
  }, [funnelSettings?.customDomain, funnelSettings?.hostingMode, effectiveFunnelSlug]);

  if (!isOpen) return null;

  // ==========================================================================
  // 5. RENDU WYSIWYG HAUTE FIDÉLITÉ DE CHAQUE MODULE DANS LA PAGE LONGUE
  // ==========================================================================
  // Helper pour extraire l'ID YouTube (Watch, Short, Embed, Live, youtu.be ou iframe)
  const extractYouTubeId = (url) => {
    return extractYouTubeVideoId(url) || '';
  };

  // Helper de rendu unifié pour les boutons sociaux individuels
  const renderSocialButton = (block, data, netKey) => {
    const netInfo = SOCIAL_NETWORKS_INFO[netKey] || {
      name: block.name,
      color: '#8b5cf6',
      bgColor: '#0f172a',
      borderColor: '#8b5cf640',
      icon: Share2
    };
    const IconComp = netInfo.icon;
    const isShareMode = data.mode === 'share';
    const label = data.label || (isShareMode ? `Partager sur ${netInfo.name}` : `Suivre sur ${netInfo.name}`);

    const handleClick = (e) => {
      e.stopPropagation();
      try { playValidationBeep(); } catch(err) {}
      if (isShareMode) {
        const shareUrl = getSocialShareUrl(netKey, data.targetUrl, data.shareMessage);
        if (typeof window !== 'undefined') window.open(shareUrl, '_blank');
        triggerToast(`📢 Partage ${netInfo.name} ouvert !`);
      } else {
        const profile = data.phoneOrProfileUrl || 'https://nana.app';
        if (typeof window !== 'undefined') window.open(profile, '_blank');
        triggerToast(`🚀 Redirection vers le profil ${netInfo.name} !`);
      }
    };

    return (
      <div className="py-3 px-4 max-w-md mx-auto text-center">
        <button
          type="button"
          onClick={handleClick}
          className="w-full py-3 px-5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer group"
          style={{
            backgroundColor: data.bgColor || netInfo.bgColor,
            borderColor: netInfo.borderColor
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-inner group-hover:scale-110 transition-transform"
              style={{
                backgroundColor: `${netInfo.color}20`,
                borderColor: `${netInfo.color}50`,
                color: netInfo.color
              }}
            >
              <IconComp className="w-5 h-5" color={netInfo.color} />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-white block group-hover:text-amber-300 transition">
                {label}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {isShareMode ? 'Partager le Funnel ⚡' : 'Profil Officiel ↗'}
              </span>
            </div>
          </div>

          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{
              backgroundColor: `${netInfo.color}15`,
              borderColor: `${netInfo.color}40`,
              color: netInfo.color
            }}
          >
            {isShareMode ? 'Partager ⚡' : 'Visiter ↗'}
          </span>
        </button>
      </div>
    );
  };

  const renderBlockWYSIWYG = (block) => {
    const data = block.data || {};

    switch (block.type) {
      case 'scrollytelling':
        return (
          <ScrollytellingBlock
            block={block}
            data={data}
            activeProduct={activeProduct}
            isBuilderMode={viewMode === 'builder'}
          />
        );

      case 'autoplay_video':
        return (
          <AutoplayVideoBlock
            block={block}
            data={data}
            isBuilderMode={viewMode === 'builder'}
            onUpdateUrl={(url) => updateBlockField(block.id, 'videoUrl', url)}
          />
        );

      case 'dynamic_heading':
        return (
          <DynamicHeadingBlock
            block={block}
            data={data}
            isBuilderMode={viewMode === 'builder'}
          />
        );

      case 'quiz_funnel':
        return (
          <QuizFunnelBlock
            block={block}
            data={data}
            activeProduct={activeProduct}
            isBuilderMode={viewMode === 'builder'}
            onCtaClick={(outcome) => {
              if (outcome?.ctaLink?.startsWith('#')) {
                const target = document.querySelector(outcome.ctaLink);
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth' });
                }
              }
            }}
          />
        );

      case 'urgency':
        return (
          <div className="py-4 px-4 bg-gradient-to-r from-rose-950/80 via-slate-950 to-rose-950/80 border-y border-rose-500/30 text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-black uppercase tracking-wider animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{data.headline || 'VENTE FLASH SPÉCIALE • OFFRE LIMITÉE'}</span>
            </div>

            {/* Compteur à rebours interactif en temps réel */}
            <div className="flex items-center justify-center gap-3 text-white">
              <div className="bg-slate-900 border border-rose-500/40 rounded-xl px-3 py-1.5 shadow-lg min-w-[55px]">
                <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono leading-none">
                  {String(data.countdownHours ?? 11).padStart(2, '0')}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mt-1">Heures</div>
              </div>
              <span className="text-xl font-black text-rose-400 animate-pulse">:</span>
              <div className="bg-slate-900 border border-rose-500/40 rounded-xl px-3 py-1.5 shadow-lg min-w-[55px]">
                <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono leading-none">
                  {String(data.countdownMinutes ?? 42).padStart(2, '0')}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mt-1">Minutes</div>
              </div>
              <span className="text-xl font-black text-rose-400 animate-pulse">:</span>
              <div className="bg-slate-900 border border-rose-500/40 rounded-xl px-3 py-1.5 shadow-lg min-w-[55px]">
                <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono leading-none">
                  {String(liveSeconds).padStart(2, '0')}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mt-1">Secondes</div>
              </div>
            </div>

            {/* Jauge de stocks restants */}
            <div className="max-w-md mx-auto space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                <span className="text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Plus que {data.stockRemaining || 7} unités en stock !
                </span>
                <span className="text-slate-400 text-[11px]">{data.stockCity || 'Abidjan & Dakar'}</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, ((data.stockRemaining || 7) / (data.stockTotal || 50)) * 100))}%` }}
                />
              </div>
            </div>

            {data.liveBuyerName && (
              <p className="text-[11px] text-amber-300 font-medium flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>{data.liveBuyerName}</span>
              </p>
            )}
          </div>
        );

      case 'hero':
        return (
          <div className="space-y-6 text-center py-8 sm:py-12 px-4">
            {/* Visage Personnel / Avatar Personnalisable du Formateur / Créateur (Module d'en-tête) */}
            {(data.showAvatar || data.instructorAvatar) && (
              <div className="flex items-center justify-center gap-3 mx-auto pb-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="relative group">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 shadow-xl shadow-amber-500/20">
                    <img
                      src={data.instructorAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                      alt={data.authorName || "Visage Formateur"}
                      className="w-full h-full rounded-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900 flex items-center justify-center text-[8px] text-slate-950 font-black">
                    ✓
                  </span>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-white">{data.authorName || 'Expert Formateur'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                      Certifié
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{data.authorRole || 'Instructeur & Auteur du Funnel'}</p>
                </div>
              </div>
            )}

            {data.promoBadge && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black shadow-lg shadow-amber-950/40 animate-pulse">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>{data.promoBadge}</span>
              </div>
            )}

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto">
              {data.headline}
            </h1>

            {data.subheadline && (
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
                {data.subheadline}
              </p>
            )}

            {/* Bouton CTA d'engagement supérieur */}
            <div className="pt-2 max-w-md mx-auto space-y-2">
              <button
                type="button"
                onClick={() => {
                  try { playCashChime(); } catch (e) {}
                  triggerToast('⚡ Défilement fluide vers le bon de commande !');
                }}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 text-sm sm:text-base font-black transition flex items-center justify-center gap-2 shadow-2xl shadow-amber-500/30 cursor-pointer active:scale-95 hover:brightness-110"
              >
                <Zap className="w-5 h-5 fill-current" />
                <span>{data.ctaText || 'Commander Maintenant & Réclamer les Bonus 🚀'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              {data.ctaSubtext && (
                <p className="text-[11px] text-slate-400 font-medium">
                  {data.ctaSubtext}
                </p>
              )}
            </div>

            <div className="pt-4 flex items-center justify-center gap-4 text-[11.5px] text-slate-400 flex-wrap">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {data.badgeLocation || 'Zone UEMOA & Afrique de l\'Ouest'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                Paiement Mobile Money Direct
              </span>
            </div>
          </div>
        );

      case 'video': {
        const videoYtId = extractYouTubeVideoId(data.videoUrl || data.embedCode || data.youtubeId);
        return (
          <div className="space-y-4 py-6 px-4">
            <div className="text-center space-y-1 max-w-xl mx-auto">
              <h3 className="text-lg sm:text-2xl font-black text-white">{data.headline || 'Vidéo de Démonstration'}</h3>
              {data.subheadline && <p className="text-xs sm:text-sm text-slate-400">{data.subheadline}</p>}
            </div>

            {videoYtId ? (
              <div className="relative aspect-video w-full rounded-3xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl bg-slate-950">
                <StealthYouTubePlayer
                  videoUrl={`https://www.youtube.com/watch?v=${videoYtId}`}
                  title={data.headline || 'Vidéo de Vente'}
                  hasNextLesson={false}
                />
              </div>
            ) : (
              <div className="relative aspect-video w-full rounded-3xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl bg-slate-950 group">
                <img
                  src={data.posterUrl || 'https://images.unsplash.com/photo-1579389083078-4e7018379f7e?w=1200&auto=format&fit=crop&q=80'}
                  alt="Poster VSL"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-between p-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700 text-[11px] font-bold text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      {data.liveBadgeText || 'Extrait en Direct'}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700 text-[10.5px] font-mono text-amber-300">
                      👥 {data.viewersCount || 247} spectateurs
                    </span>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-600/90 border-2 border-white text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform cursor-pointer">
                      <Play className="w-7 h-7 fill-white ml-1" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium truncate max-w-[200px] sm:max-w-xs">
                      Collez un lien YouTube dans l'inspecteur à droite
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setIsVideoMuted(!isVideoMuted); }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {isVideoMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>{isVideoMuted ? 'Activer le Son' : 'Son Actif'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'benefits':
        return (
          <div className="space-y-6 py-6 px-4">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <span className="text-[10.5px] font-black text-emerald-400 uppercase tracking-wider block">
                {data.sectionTag || 'RÉSULTATS TANGIBLES'}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {data.sectionTitle}
              </h3>
              {data.sectionSubtitle && (
                <p className="text-xs text-slate-400">{data.sectionSubtitle}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(data.items || []).map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-colors flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs flex items-center justify-center border border-emerald-500/30">
                      {item.number || `0${idx + 1}`}
                    </span>
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">
                    Opérationnel Immédiat ✓
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'stats':
        return (
          <div className="py-6 px-4 space-y-4">
            <div className="text-center space-y-1 max-w-xl mx-auto">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                {data.sectionTag || 'IMPACT & PERFORMANCE EN AFRIQUE'}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">{data.sectionTitle}</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
              {(data.metrics || []).map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="p-4 rounded-2xl bg-slate-900/95 border border-sky-500/20 text-center space-y-1 shadow-lg"
                >
                  <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono">
                    {m.value}
                  </div>
                  <div className="text-xs font-bold text-white leading-tight">{m.label}</div>
                  <div className="text-[10px] text-slate-400">{m.note}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'comparison':
        return (
          <div className="py-6 px-4 space-y-6">
            <div className="text-center space-y-1.5 max-w-xl mx-auto">
              <span className="text-[10px] font-black uppercase tracking-wider text-pink-400">
                {data.sectionTag || 'POURQUOI FAIRE CE CHOIX'}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">{data.sectionTitle}</h3>
              {data.sectionSubtitle && (
                <p className="text-xs text-slate-400">{data.sectionSubtitle}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {/* Colonne Sans Nous */}
              <div className="p-5 rounded-3xl bg-rose-950/20 border border-rose-900/40 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-wider pb-2 border-b border-rose-900/30">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>{data.withoutTitle || 'Méthodes Traditionnelles'}</span>
                </div>
                <div className="space-y-2.5">
                  {(data.points || []).map((pt, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-400">
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{pt.without}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Colonne Avec NaNa */}
              <div className="p-5 rounded-3xl bg-emerald-950/30 border-2 border-emerald-500/50 space-y-3 shadow-xl">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider pb-2 border-b border-emerald-900/40">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{data.withTitle || 'Avec la Solution NaNa Pro'}</span>
                </div>
                <div className="space-y-2.5">
                  {(data.points || []).map((pt, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-200 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{pt.with}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'founder':
        return (
          <div className="py-6 px-4">
            <div className="max-w-2xl mx-auto rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-purple-500/30 p-6 sm:p-8 space-y-4 shadow-2xl">
              <div className="flex items-center gap-4">
                <img
                  src={data.authorImage}
                  alt={data.authorName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-purple-500/50 shadow-lg"
                />
                <div>
                  <h4 className="text-base sm:text-lg font-black text-white">{data.authorName}</h4>
                  <p className="text-xs text-purple-400 font-semibold">{data.authorRole}</p>
                  <span className="inline-block mt-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                    ✓ Fondateur Vérifié NaNa
                  </span>
                </div>
              </div>

              <h5 className="text-sm sm:text-base font-bold text-slate-200 italic border-l-2 border-purple-500 pl-3">
                {data.title}
              </h5>

              <p className="text-xs text-slate-300 leading-relaxed">{data.paragraph1}</p>
              <p className="text-xs text-slate-300 leading-relaxed">{data.paragraph2}</p>

              <div className="pt-2 text-right">
                <span className="text-xs font-mono font-bold text-purple-300 italic">
                  {data.signatureText}
                </span>
              </div>
            </div>
          </div>
        );

      case 'testimonials':
        return (
          <div className="space-y-6 py-6 px-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-[10.5px] font-black text-amber-400 uppercase tracking-wider block">
                  {data.sectionTag || 'PREUVE SOCIALE'}
                </span>
                <h3 className="text-xl font-black text-white">{data.sectionTitle}</h3>
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-400 font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{data.ratingText || '4.95 / 5 (840+ avis)'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(data.testimonials || []).map((t, idx) => (
                <div
                  key={t.id || idx}
                  className="p-4 rounded-2xl bg-slate-900/95 border border-slate-800 flex flex-col justify-between space-y-3 shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(t.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <p className="text-xs text-slate-300 italic leading-relaxed">
                      "{t.comment}"
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center gap-3">
                    <img
                      src={t.avatarUrl}
                      alt={t.name}
                      className="w-9 h-9 rounded-full object-cover border border-amber-500/40"
                    />
                    <div className="truncate">
                      <h5 className="text-xs font-bold text-white truncate">{t.name}</h5>
                      <p className="text-[10px] text-slate-400 truncate">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-6 py-6 px-4">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-black border border-emerald-500/30 inline-block">
                {data.discountBadge || 'TARIF PRIVILÉGIÉ'}
              </span>
              <h3 className="text-2xl font-black text-white">{data.sectionTitle}</h3>
            </div>

            {/* Carte Offre Choc */}
            <div className="max-w-xl mx-auto rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/50 p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="text-center space-y-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Tarif Habituel</span>
                <span className="text-lg line-through text-slate-500 font-bold">
                  {formatCFA(data.originalPrice || 49000)}
                </span>
                <div className="text-3xl sm:text-5xl font-black text-emerald-400 flex items-baseline justify-center gap-2">
                  <span>{formatCFA(data.discountPrice || 24500)}</span>
                </div>
              </div>

              {/* Bonus empilés offerts */}
              {data.bonusList && data.bonusList.length > 0 && (
                <div className="space-y-2.5 pt-4 border-t border-slate-800">
                  <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider block">
                    🎁 Bonus Immédiats Inclus :
                  </span>
                  {data.bonusList.map((b, i) => (
                    <div key={b.id || i} className="flex items-center justify-between text-xs bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-slate-200 truncate">{b.title}</span>
                      </div>
                      <span className="text-emerald-400 font-bold whitespace-nowrap">
                        Offert ({formatCFA(b.value)})
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA Achat */}
              <button
                type="button"
                onClick={() => {
                  handleProceedToPrimaryCheckout({
                    id: activeProduct?.id || 'funnel-item',
                    name: data.sectionTitle || activeProduct?.name || 'Offre Spéciale',
                    price: Number(data.discountPrice) || Number(activeProduct?.price) || 24500,
                    image: activeProduct?.image || ''
                  });
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-base font-black transition flex items-center justify-center gap-2 shadow-2xl shadow-emerald-500/40 cursor-pointer"
              >
                <Zap className="w-5 h-5 fill-current" />
                <span>{data.ctaText || 'Valider Ma Commande Immédiate ⚡'}</span>
              </button>

              <p className="text-[11px] text-center text-slate-400">
                {data.reassuranceText || '🔒 Paiement 100% sécurisé via Mobile Money (Wave, Orange, MTN)'}
              </p>
            </div>
          </div>
        );

      case 'checkout':
        return (
          <div id="checkout" data-block-type="checkout" className="py-6 px-4 space-y-6">
            <div className="text-center space-y-1.5 max-w-xl mx-auto">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-400">
                {data.sectionTag || 'COMMANDE SÉCURISÉE EN 1 MINUTE'}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">{data.sectionTitle}</h3>
              {data.sectionSubtitle && (
                <p className="text-xs text-slate-400">{data.sectionSubtitle}</p>
              )}
            </div>

            <div className="max-w-xl mx-auto bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl">
              {/* Récapitulatif Produit */}
              <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <img
                  src={data.productImage}
                  alt={data.productName}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-700"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{data.productName}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-black text-emerald-400 font-mono">
                      {formatCFA(data.productPrice || 24500)}
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                      Livraison {data.deliveryFee || 'GRATUITE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Champs de Saisie Interactifs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nom & Prénom</label>
                  <input
                    type="text"
                    value={simulatedCheckout.fullName}
                    onChange={(e) => setSimulatedCheckout({ ...simulatedCheckout, fullName: e.target.value })}
                    placeholder="Ex: Kouassi Jean-Marc"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Numéro WhatsApp / Téléphone</label>
                    <input
                      type="tel"
                      value={simulatedCheckout.phone}
                      onChange={(e) => setSimulatedCheckout({ ...simulatedCheckout, phone: e.target.value })}
                      placeholder="+225 07..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Ville de Livraison</label>
                    <input
                      type="text"
                      value={simulatedCheckout.city}
                      onChange={(e) => setSimulatedCheckout({ ...simulatedCheckout, city: e.target.value })}
                      placeholder="Abidjan, Dakar, Bamako..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Sélecteur Opérateur Mobile Money */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Mode de Paiement Préféré</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setSimulatedCheckout({ ...simulatedCheckout, paymentMethod: 'wave' })}
                      className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer flex flex-col items-center gap-1 ${
                        simulatedCheckout.paymentMethod === 'wave'
                          ? 'bg-sky-500/20 border-sky-400 text-sky-300 ring-2 ring-sky-500/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                      <span>Wave</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSimulatedCheckout({ ...simulatedCheckout, paymentMethod: 'orange' })}
                      className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer flex flex-col items-center gap-1 ${
                        simulatedCheckout.paymentMethod === 'orange'
                          ? 'bg-orange-500/20 border-orange-400 text-orange-300 ring-2 ring-orange-500/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      <span>Orange Money</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSimulatedCheckout({ ...simulatedCheckout, paymentMethod: 'moov_mtn' })}
                      className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer flex flex-col items-center gap-1 ${
                        simulatedCheckout.paymentMethod === 'moov_mtn'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-500/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span>MTN / Moov</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSimulatedCheckout({ ...simulatedCheckout, paymentMethod: 'cod' })}
                      className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer flex flex-col items-center gap-1 ${
                        simulatedCheckout.paymentMethod === 'cod'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Paiement Livr.</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bouton de confirmation en direct avec pré-remplissage et redirection immédiate vers le checkout */}
              <button
                type="button"
                onClick={() => {
                  handleProceedToPrimaryCheckout({
                    id: activeProduct?.id || 'funnel-item',
                    name: data.productName || activeProduct?.name || 'Offre Spéciale',
                    price: Number(data.productPrice) || Number(activeProduct?.price) || 24500,
                    image: data.productImage || activeProduct?.image || ''
                  });
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-2xl shadow-emerald-500/40 cursor-pointer hover:brightness-110 active:scale-95 transition"
              >
                {orderConfirmed ? (
                  <>
                    <Check className="w-5 h-5 text-slate-950" />
                    <span>Commande Reçue ! Félicitations 🚀</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 fill-slate-950 text-emerald-400" />
                    <span>Confirmer Ma Commande & Mon Expédition 🚀</span>
                  </>
                )}
              </button>

              <p className="text-[10.5px] text-center text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{data.guaranteeNotice || 'Paiement sécurisé par protocole bancaire agréé BCEAO'}</span>
              </p>
            </div>
          </div>
        );

      case 'guarantee':
        return (
          <div className="py-6 px-4">
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-3 max-w-xl mx-auto shadow-xl">
              <ShieldCheck className="w-12 h-12 text-cyan-400 mx-auto" />
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 inline-block">
                {data.badgeText || 'GARANTIE 30 JOURS'}
              </span>
              <h4 className="text-base sm:text-lg font-black text-white">{data.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{data.description}</p>
            </div>
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-6 py-6 px-4 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <span className="text-[10.5px] font-black text-indigo-400 uppercase tracking-wider block">
                {data.sectionTag || 'FAQ'}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">{data.sectionTitle}</h3>
              {data.subtitle && <p className="text-xs text-slate-400">{data.subtitle}</p>}
            </div>

            <div className="space-y-2.5">
              {(data.questions || []).map((item, idx) => {
                const isOpenAccordion = expandedFaqId === (item.id || `q-${idx}`);
                return (
                  <div
                    key={item.id || idx}
                    className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedFaqId(isOpenAccordion ? null : (item.id || `q-${idx}`));
                      }}
                      className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs font-bold text-white hover:text-amber-400 transition cursor-pointer"
                    >
                      <span>{item.q}</span>
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpenAccordion ? 'rotate-180 text-amber-400' : 'text-slate-400'}`} />
                    </button>
                    {isOpenAccordion && (
                      <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {data.whatsappPhone && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1.5">
                <p className="text-xs text-emerald-300 font-bold">{data.whatsappSupportText}</p>
                <span className="text-[11px] text-slate-400 font-mono">Assistance WhatsApp 7j/7</span>
              </div>
            )}
          </div>
        );

      case 'footer':
        return (
          <div className="py-8 px-4 border-t border-slate-800/80 text-center space-y-4 text-slate-400 text-xs">
            <p className="font-bold text-slate-300">{data.companyName}</p>
            <p className="text-[11px] text-slate-500 max-w-xl mx-auto leading-relaxed">{data.disclaimer}</p>
            <div className="flex items-center justify-center gap-4 text-[11px] flex-wrap">
              {(data.links || []).map((l, i) => (
                <span key={i} className="hover:text-white cursor-pointer transition">
                  {l.label}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-emerald-400/90 font-medium">{data.securitySeals}</p>
            <p className="text-[10px] text-slate-600">{data.copyright}</p>
          </div>
        );

      // ======================================================================
      // LES 11 MODULES PRO DU HUB D'INTÉGRATION (100% WYSIWYG & FONCTIONNELS)
      // ======================================================================

      // 1. WooCommerce Checkout Direct
      case 'woocommerce_checkout': {
        return (
          <div className="py-8 px-4 sm:px-8 max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-wider">
                <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
                <span>WooCommerce Fast Checkout Direct</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">{data.headline}</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">{data.subheadline}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md">
              {/* Colonne Gauche : Formulaire de Commande */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  <span>Informations de Facturation & Livraison</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Prénom & Nom *</label>
                    <input type="text" placeholder="Ex: Jean Kouassi" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Numéro WhatsApp *</label>
                    <input type="tel" placeholder="+225 07..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Ville de Livraison *</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500">
                      <option>Abidjan (Toutes communes)</option>
                      <option>Bouaké</option>
                      <option>Yamoussoukro</option>
                      <option>Dakar</option>
                      <option>Douala</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Quartier & Précision</label>
                    <input type="text" placeholder="Ex: Cocody Angré 8e tranche" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Mode de Règlement Préféré</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Wave (0% Frais)', 'Orange Money', 'Paiement à la Livraison', 'Carte Bancaire'].map((m, idx) => (
                      <label key={m} className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:border-purple-500/50">
                        <input type="radio" name={`woo-pay-${block.id}`} defaultChecked={idx === 0} className="accent-purple-500" />
                        <span className="font-medium text-[11px] truncate">{m}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Colonne Droite : Récapitulatif Panier & Validation */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4 p-4 rounded-2xl bg-slate-950/90 border border-purple-500/20">
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-purple-400">
                    {data.orderSummaryTitle || 'Votre Commande'}
                  </h3>

                  <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                    <img src={data.productImage} alt="Product" className="w-12 h-12 rounded-xl object-cover border border-slate-800 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">{data.productName}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-black text-emerald-400 font-mono">{formatCFA(data.productPrice)}</span>
                        <span className="text-[10px] text-slate-500 line-through font-mono">{formatCFA(data.productOriginalPrice)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Code Promo Coupon */}
                  {data.enableCoupons && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Code promo"
                        defaultValue={data.defaultCoupon}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-mono uppercase"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          try { playTapBeep(); } catch(e) {}
                          triggerToast('🎟️ Code promo NANA10 appliqué (-10%) !');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
                      >
                        Appliquer
                      </button>
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs pt-2">
                    <div className="flex justify-between text-slate-400">
                      <span>Sous-total :</span>
                      <span className="text-white font-mono">{formatCFA(data.productPrice)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Livraison :</span>
                      <span className="text-emerald-400 font-bold">Gratuite (0 FCFA)</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Remise Promo :</span>
                      <span className="text-purple-400 font-mono">-10%</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-slate-800">
                      <span>Total à Régler :</span>
                      <span className="text-emerald-400 font-mono text-base">{formatCFA(Math.round(data.productPrice * 0.9))}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    try { playCashChime(); } catch(e) {}
                    triggerToast('🛍️ Commande WooCommerce validée avec succès !');
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-purple-600/30 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{data.ctaText}</span>
                </button>
              </div>
            </div>
          </div>
        );
      }

      // 2. Paiement Mobile Afrique (Wave, Orange, MoMo, Moov)
      case 'mobile_money_afrique': {
        return (
          <div className="py-8 px-4 sm:px-8 max-w-3xl mx-auto space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black uppercase tracking-wider">
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Passerelle Mobile Money Côte d'Ivoire & UEMOA</span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black text-white">{data.title}</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">{data.subtitle}</p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md space-y-5">
              {/* Sélecteur des 4 Opérateurs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'wave', name: 'Wave', color: '#00D1FF', tag: '0% Frais', badge: '1-Clic' },
                  { id: 'orange', name: 'Orange Money', color: '#FF7900', tag: '#144#', badge: 'Max' },
                  { id: 'momo', name: 'MTN MoMo', color: '#FFCC00', tag: '*133#', badge: 'Express' },
                  { id: 'moov', name: 'Moov Money', color: '#00A859', tag: 'Flooz', badge: 'Sécurisé' }
                ].map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => {
                      try { playTapBeep(); } catch(e) {}
                      updateBlockField(block.id, 'selectedOperator', op.id);
                    }}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between h-20 ${
                      (data.selectedOperator || 'wave') === op.id
                        ? 'bg-slate-800/90 border-cyan-400 shadow-lg ring-2 ring-cyan-500/20'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: op.color }} />
                      <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-900 text-slate-400">{op.badge}</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{op.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{op.tag}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Panneau d'instructions pour l'opérateur sélectionné */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Opérateur sélectionné :</span>
                    <span className="text-cyan-400 uppercase font-black">{data.selectedOperator || 'wave'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {(data.selectedOperator || 'wave') === 'wave' && 'Vous recevrez une notification directe ou un code QR à scanner.'}
                    {data.selectedOperator === 'orange' && `Composez ${data.ussdOrange || '#144*391#'} sur votre téléphone Orange.`}
                    {data.selectedOperator === 'momo' && `Composez ${data.ussdMomo || '*133*12#'} et confirmez avec votre code PIN.`}
                    {data.selectedOperator === 'moov' && 'Confirmation instantanée sur votre compte Moov Money Flooz.'}
                  </p>
                </div>
                <div className="text-right shrink-0 font-mono">
                  <div className="text-[10px] text-slate-500">Montant Net :</div>
                  <div className="text-base font-black text-emerald-400">{formatCFA(data.amountCFA || 24500)}</div>
                </div>
              </div>

              {/* Champ Numéro & Bouton de Paiement Instantané */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Votre Numéro de Téléphone Mobile Money :</label>
                  <input
                    type="tel"
                    placeholder="Ex: 07 00 11 22 33"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    try { playCashChime(); } catch(e) {}
                    triggerToast(`⚡ Demande de paiement ${data.selectedOperator || 'Wave'} envoyée sur votre téléphone !`);
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Payer {formatCFA(data.amountCFA || 24500)} via {(data.selectedOperator || 'wave').toUpperCase()} ⚡</span>
                </button>
              </div>

              <p className="text-[10.5px] text-center text-slate-500">{data.securityNotice}</p>
            </div>
          </div>
        );
      }

      // 3. Cash on Delivery (Paiement à la Livraison)
      case 'cash_on_delivery': {
        return (
          <div className="py-8 px-4 sm:px-8 max-w-2xl mx-auto space-y-5">
            <div className="p-6 rounded-3xl bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 border-2 border-emerald-500/50 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg">
                <Truck className="w-6 h-6" />
              </div>

              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-black uppercase">
                {data.badge}
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-white">{data.headline}</h2>
              <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">{data.description}</p>

              {/* 3 Piliers de Réassurance */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-left">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-emerald-400 text-xs font-bold">✓ Inspection</span>
                  <div className="text-[10px] text-slate-400 mt-0.5">Avant de payer</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-emerald-400 text-xs font-bold">✓ Livraison</span>
                  <div className="text-[10px] text-slate-400 mt-0.5">{data.deliveryTime}</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-emerald-400 text-xs font-bold">✓ Zéro Frais</span>
                  <div className="text-[10px] text-slate-400 mt-0.5">0 FCFA d'avance</div>
                </div>
              </div>

              {/* Mini formulaire adresse & téléphone */}
              <div className="space-y-2.5 pt-2 text-left">
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Votre Nom & Prénoms" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600" />
                  <input type="tel" placeholder="Numéro WhatsApp / Appel" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600" />
                </div>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                  {(data.cities || []).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCodConfirmOpen(true);
                  try { playValidationBeep(); } catch(e) {}
                  triggerToast('🚚 Commande Cash on Delivery enregistrée ! Pop-up de confirmation ouvert.');
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                <span>{data.ctaText}</span>
              </button>
            </div>
          </div>
        );
      }

      // 4. Live Stream (Zoom, Jitsi, Google Meet)
      case 'live_stream': {
        return (
          <div className="py-8 px-4 sm:px-8 max-w-3xl mx-auto space-y-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-black uppercase text-rose-400 tracking-wider">● EN DIRECT (LIVE STREAM)</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
                  {data.viewersCount || 432} participants connectés
                </span>
              </div>

              {/* Écran du Lecteur Live */}
              <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-slate-800 flex items-center justify-center group shadow-inner">
                <img
                  src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80"
                  alt="Live Screen"
                  className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-40 transition"
                />
                <div className="relative z-10 text-center space-y-2 p-4">
                  <div className="w-14 h-14 rounded-full bg-rose-600/90 text-white flex items-center justify-center mx-auto shadow-xl shadow-rose-600/40 group-hover:scale-110 transition">
                    <Radio className="w-7 h-7 animate-pulse" />
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-white max-w-md">{data.sessionTitle}</h3>
                  <p className="text-xs text-slate-300">Intervenant : <span className="text-amber-400 font-bold">{data.speakerName}</span></p>
                </div>
              </div>

              {/* Barre d'action live */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="font-mono text-slate-500">ID Réunion :</span>
                  <span className="text-white font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{data.meetingId}</span>
                  <span className="text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">Pass : {data.passcode}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    try { playTapBeep(); } catch(e) {}
                    triggerToast('🔴 Connexion à la salle de visioconférence en direct...');
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 text-white font-black text-xs shadow-lg shadow-rose-600/25 cursor-pointer"
                >
                  {data.buttonText}
                </button>
              </div>
            </div>
          </div>
        );
      }

      // 5. Google Classroom Sync
      case 'google_classroom': {
        return (
          <div className="py-8 px-4 sm:px-8 max-w-3xl mx-auto">
            <div className="rounded-3xl bg-slate-900 border border-emerald-500/30 overflow-hidden shadow-2xl">
              <div className="p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-b border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 block">{data.badgeText}</span>
                    <h3 className="text-base sm:text-lg font-black text-white">{data.courseName}</h3>
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/40 font-mono text-center shrink-0">
                  <div className="text-[9px] uppercase text-slate-400">Code du Cours</div>
                  <div className="text-xs font-black text-emerald-300">{data.classCode}</div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-base font-black text-white">{data.modulesCount || 14}</div>
                    <div className="text-[10.5px] text-slate-400">Modules Vidéo</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-base font-black text-emerald-400">{data.enrolledStudents || 1420}</div>
                    <div className="text-[10.5px] text-slate-400">Étudiants Inscrits</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-base font-black text-amber-400">100%</div>
                    <div className="text-[10.5px] text-slate-400">En Ligne & Replay</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-base font-black text-indigo-400">Google</div>
                    <div className="text-[10.5px] text-slate-400">Sync Automatique</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    try { playTapBeep(); } catch(e) {}
                    triggerToast('🎓 Redirection vers votre classe Google Classroom...');
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  {data.buttonText}
                </button>
              </div>
            </div>
          </div>
        );
      }

      // 6. Opt-in Brevo (Sendinblue)
      case 'brevo_optin': {
        return (
          <div className="py-8 px-4 sm:px-8 max-w-2xl mx-auto space-y-4">
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-cyan-500/30 shadow-2xl text-center space-y-4">
              <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-black uppercase">
                {data.incentiveBadge}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">{data.headline}</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">{data.subheadline}</p>

              <div className="space-y-2.5 max-w-md mx-auto pt-2">
                <input
                  type="text"
                  placeholder="Votre Prénom"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="email"
                  placeholder="Votre Adresse Email Principale *"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    try { playCashChime(); } catch(e) {}
                    triggerToast(`📥 Lead synchronisé avec la liste Brevo : ${data.brevoListId} !`);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 transition cursor-pointer"
                >
                  {data.buttonText}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">{data.privacyText}</p>
            </div>
          </div>
        );
      }

      // 7. Alerte SMS Twilio
      case 'twilio_sms': {
        return (
          <div className="py-8 px-4 sm:px-8 max-w-2xl mx-auto">
            <div className="p-6 rounded-3xl bg-slate-900 border border-rose-500/30 shadow-2xl text-center space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">{data.headline}</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">{data.subheadline}</p>

              <div className="flex items-center gap-2 max-w-md mx-auto">
                <select className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none shrink-0 font-mono">
                  <option>+225 (CI)</option>
                  <option>+221 (SN)</option>
                  <option>+237 (CM)</option>
                  <option>+33 (FR)</option>
                </select>
                <input
                  type="tel"
                  placeholder="07 00 11 22 33"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    try { playTapBeep(); } catch(e) {}
                    triggerToast(`📲 Alerte SMS Twilio activée via sender "${data.senderId || 'NANA-ALERT'}" !`);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                >
                  Activer
                </button>
              </div>
            </div>
          </div>
        );
      }

      // 8. Heatmap & Tracking (Hotjar / Pixel)
      case 'heatmap_tracking': {
        if (viewMode === 'preview') {
          return <div className="hidden" aria-hidden="true" />;
        }
        return (
          <div className="my-3 mx-4 p-4 rounded-2xl bg-cyan-950/20 border-2 border-dashed border-cyan-500/50 flex items-center justify-between gap-4 text-xs font-mono select-none">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-black text-xs">{data.name || 'Heatmap & Tracking Comportemental'}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">100% Invisible Visiteurs</span>
                </div>
                <div className="text-[10.5px] text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>Hotjar: <strong className="text-white">{data.hotjarId}</strong></span>
                  <span>•</span>
                  <span>Clarity: <strong className="text-white">{data.clarityId}</strong></span>
                  <span>•</span>
                  <span>Meta Pixel: <strong className="text-white">{data.metaPixelId}</strong></span>
                </div>
              </div>
            </div>
            <span className="text-[10px] text-cyan-400 border border-cyan-500/30 px-2 py-1 rounded-lg">Injection Active ✓</span>
          </div>
        );
      }

      // 9. Formulaire Multi-Étapes
      case 'multistep_form': {
        const currentStep = data._activeStep ?? 0;
        const steps = data.steps || [];
        const progressPercent = Math.round(((currentStep + 1) / steps.length) * 100);

        return (
          <div className="py-8 px-4 sm:px-8 max-w-2xl mx-auto space-y-5">
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-pink-500/30 shadow-2xl space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-white">{data.formTitle}</h2>
                <p className="text-xs text-slate-400">{data.formSubtitle}</p>
              </div>

              {/* Barre de Progression */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-pink-400">Étape {currentStep + 1} sur {steps.length} : {steps[currentStep]?.title}</span>
                  <span className="text-slate-400 font-mono">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-500 to-indigo-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              {/* Contenu de l'étape active */}
              <div className="py-3 space-y-3">
                <h3 className="text-xs sm:text-sm font-bold text-white">{steps[currentStep]?.question}</h3>

                {steps[currentStep]?.options && (
                  <div className="space-y-2">
                    {steps[currentStep].options.map((opt, idx) => (
                      <label key={opt} className="p-3 rounded-xl border border-slate-800 bg-slate-950 hover:border-pink-500/50 flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                        <input type="radio" name={`step-${currentStep}-${block.id}`} defaultChecked={idx === 0} className="accent-pink-500" />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {steps[currentStep]?.fields && (
                  <div className="space-y-2.5">
                    {steps[currentStep].fields.map(field => (
                      <input
                        key={field}
                        type="text"
                        placeholder={field}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Navigation Stepper */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep > 0) updateBlockField(block.id, '_activeStep', currentStep - 1);
                  }}
                  disabled={currentStep === 0}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 text-xs font-bold cursor-pointer"
                >
                  Précédent
                </button>

                {currentStep < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      updateBlockField(block.id, '_activeStep', currentStep + 1);
                      try { playTapBeep(); } catch(e) {}
                    }}
                    className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs cursor-pointer"
                  >
                    Suivant ➔
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      try { playCashChime(); } catch(e) {}
                      triggerToast('🎉 Formulaire Multi-Étapes validé avec succès !');
                    }}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 text-white font-black text-xs shadow-lg shadow-pink-600/30 cursor-pointer"
                  >
                    {data.ctaFinishText || 'Finaliser 🚀'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      }

      // 10. Evergreen Countdown
      case 'evergreen_countdown': {
        return (
          <div className="py-6 px-4 max-w-2xl mx-auto text-center space-y-3">
            <div className="p-5 rounded-3xl bg-amber-950/30 border border-amber-500/40 shadow-xl space-y-3">
              <span className="text-[11px] font-black uppercase text-amber-400 flex items-center justify-center gap-1.5">
                <Hourglass className="w-3.5 h-3.5" />
                <span>{data.headline}</span>
              </span>

              {/* Compteur Visiteur Réel */}
              <div className="flex items-center justify-center gap-3 text-white">
                <div className="bg-slate-950 border border-amber-500/40 rounded-xl px-4 py-2 min-w-[65px]">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">14</span>
                  <div className="text-[9px] uppercase text-slate-400 font-bold mt-0.5">Minutes</div>
                </div>
                <span className="text-2xl font-black text-amber-400 animate-pulse">:</span>
                <div className="bg-slate-950 border border-amber-500/40 rounded-xl px-4 py-2 min-w-[65px]">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">{String(liveSeconds).padStart(2, '0')}</span>
                  <div className="text-[9px] uppercase text-slate-400 font-bold mt-0.5">Secondes</div>
                </div>
              </div>

              <p className="text-xs text-slate-300 max-w-md mx-auto">{data.subheadline}</p>

              <button
                type="button"
                onClick={() => {
                  try { playCashChime(); } catch(e) {}
                  triggerToast('⚡ Offre Evergreen validée avant expiration !');
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 cursor-pointer"
              >
                {data.ctaText}
              </button>
            </div>
          </div>
        );
      }

      // 11. Social Proof Popup
      case 'social_proof_popup': {
        const currentBuyer = data.buyerNames?.[0] || 'Aïcha K. de Cocody';
        return (
          <div className="py-4 px-4 max-w-md mx-auto">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white truncate">{currentBuyer}</h4>
                  <span className="text-[9px] text-emerald-400 font-bold">{data.badgeVerified}</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {data.actionText} <strong className="text-amber-300">{data.productName}</strong>
                </p>
                <span className="text-[10px] text-slate-500">{data.timeText}</span>
              </div>
            </div>
          </div>
        );
      }

      // ======================================================================
      // NOUVELLE SECTION A : ÉCOSYSTÈME NANA (VIP)
      // ======================================================================
      case 'nana_campus_social': {
        return (
          <div className="py-6 px-4 max-w-3xl mx-auto">
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-950/50 via-slate-950 to-slate-900 border border-amber-500/50 shadow-2xl relative overflow-hidden space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                  <Crown className="w-3.5 h-3.5" />
                  <span>{data.badgeText || '👑 CLUB PRIVÉ EXCLUSIF'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>{data.onlineCount || '342 en direct'}</span>
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-lg sm:text-2xl font-black text-white">{data.title || 'Rejoignez le Campus Social NaNa'}</h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">{data.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(data.features || []).map((feat, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 text-[11px] text-slate-200 flex items-center gap-2">
                    <span className="text-amber-400 font-bold shrink-0">✓</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span><strong>{data.membersCount}</strong> entrepreneurs réunis</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try { playCashChime(); } catch(e) {}
                    triggerToast('🚀 Redirection vers le Campus Social NaNa...');
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition cursor-pointer"
                >
                  {data.ctaText}
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 'nana_academie': {
        return (
          <div className="py-6 px-4 max-w-3xl mx-auto">
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950/50 via-slate-950 to-slate-900 border border-emerald-500/50 shadow-2xl relative overflow-hidden space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>{data.badgeText || '🎓 ACCRÉDITATION OFFICIELLE'}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                  {data.studentsCount || '12 800+ Apprenants'}
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-2xl font-black text-white">{data.title || 'NaNa Académie : Formations Certifiantes'}</h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">{data.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(data.features || []).map((feat, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-[11px] text-slate-200 flex items-center gap-2">
                    <span className="text-emerald-400 font-bold shrink-0">★</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>{data.coursesCount || '28 Formations'} • Certificat Inclus</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try { playCashChime(); } catch(e) {}
                    triggerToast('🚀 Accès au catalogue de formations NaNa Académie...');
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition cursor-pointer"
                >
                  {data.ctaText}
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 'nana_live': {
        return (
          <div className="py-6 px-4 max-w-3xl mx-auto">
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-pink-950/50 via-slate-950 to-slate-900 border border-pink-500/50 shadow-2xl relative overflow-hidden space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[11px] font-black uppercase tracking-wider">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>{data.badgeText || '🔴 EN DIRECT NANA LIVE'}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-mono font-bold border border-pink-500/40">
                  {data.viewersCount || '1 280'} spectateurs connectés
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-2xl font-black text-white">{data.title || 'Diffusion en Direct NaNa Live Studio'}</h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">{data.subtitle}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-pink-500/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 font-black">
                    👤
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Intervenant Officiel :</span>
                    <strong className="text-white">{data.hostName}</strong>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Code Salle :</span>
                  <span className="font-mono text-pink-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {data.roomCode || 'LIVE-NANA-2026'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Tv className="w-4 h-4 text-pink-400" />
                  <span>Webinaire natif ultra-faible latence (WebRTC)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try { playCashChime(); } catch(e) {}
                    triggerToast('📡 Connexion à la salle NaNa Live Studio en cours...');
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 text-white font-black text-xs shadow-lg shadow-pink-500/30 hover:scale-105 active:scale-95 transition cursor-pointer"
                >
                  {data.ctaText}
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ======================================================================
      // NOUVELLE SECTION B : INTÉGRATIONS VIDÉO & LIVE (EMBEDS DYNAMIQUES)
      // ======================================================================
      case 'embed_youtube': {
        const videoId = extractYouTubeVideoId(data.videoUrl || data.embedCode || data.youtubeId);
        return (
          <div className="py-6 px-4 max-w-3xl mx-auto space-y-3">
            {!videoId ? (
              <div className="p-8 rounded-3xl bg-slate-900/90 border-2 border-dashed border-red-500/50 text-center space-y-3 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-red-500/5 via-transparent to-orange-500/5 pointer-events-none" />
                <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/40 flex items-center justify-center mx-auto shadow-lg shadow-red-600/20 group-hover:scale-110 transition-transform">
                  <IconYouTube className="w-8 h-8" color="#ff0000" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{data.title || 'Module Embed YouTube'}</h3>
                  <span className="text-[10px] font-mono text-red-400 font-bold bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/30 inline-block mt-1">
                    Lecteur Marque Blanche NaNa Prêt
                  </span>
                </div>
                <div className="max-w-md mx-auto p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-amber-300 mb-1">⚡ Action requise :</p>
                  <p className="text-slate-400 text-[11px]">
                    Collez votre <strong>Lien ou Code Embed YouTube</strong> dans l'inspecteur à droite pour afficher le lecteur protégé en direct sur le Canvas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl overflow-hidden border border-indigo-500/40 shadow-2xl bg-black">
                <StealthYouTubePlayer
                  videoUrl={`https://www.youtube.com/watch?v=${videoId}`}
                  title={data.title || 'Vidéo YouTube'}
                  hasNextLesson={false}
                />
              </div>
            )}
          </div>
        );
      }

      case 'embed_tiktok': {
        return (
          <div className="py-6 px-4 max-w-md mx-auto space-y-3">
            {!data.videoUrl ? (
              <div className="p-8 rounded-3xl bg-slate-900/90 border-2 border-dashed border-cyan-500/50 text-center space-y-3 shadow-2xl relative overflow-hidden group">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                  <IconTikTok className="w-8 h-8" color="#00f2fe" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{data.title || 'Module Embed TikTok'}</h3>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/30 inline-block mt-1">
                    Format 9:16 Vertical & Live
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-cyan-300 mb-1">⚡ Action requise :</p>
                  <p className="text-slate-400 text-[11px]">
                    Collez votre lien de vidéo ou live TikTok dans les paramètres à droite pour afficher le lecteur vertical.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-cyan-500/40 bg-slate-950 shadow-2xl overflow-hidden p-4 space-y-3 text-center">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-white">
                    <IconTikTok className="w-4 h-4 text-cyan-400" color="#00f2fe" />
                    <span>{data.creatorHandle || '@nana_officiel'}</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">TikTok Player</span>
                </div>
                <div className="aspect-[9/16] max-w-[280px] mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-4 relative overflow-hidden shadow-inner">
                  <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3">
                    <Play className="w-8 h-8 text-cyan-400 fill-current ml-1" />
                  </div>
                  <p className="text-xs font-bold text-white mb-2">{data.title || 'Vidéo TikTok Intégrée'}</p>
                  <a
                    href={data.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-950 text-xs font-black shadow-lg shadow-cyan-500/20 hover:scale-105 transition"
                  >
                    Visionner sur TikTok ➔
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'embed_facebook': {
        return (
          <div className="py-6 px-4 max-w-3xl mx-auto space-y-3">
            {!data.videoUrl ? (
              <div className="p-8 rounded-3xl bg-slate-900/90 border-2 border-dashed border-blue-500/50 text-center space-y-3 shadow-2xl relative overflow-hidden group">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                  <IconFacebook className="w-8 h-8" color="#1877f2" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{data.title || 'Module Embed Facebook Video/Live'}</h3>
                  <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/30 inline-block mt-1">
                    Facebook Watch & Live
                  </span>
                </div>
                <div className="max-w-md mx-auto p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-blue-300 mb-1">⚡ Action requise :</p>
                  <p className="text-slate-400 text-[11px]">
                    Collez votre lien de vidéo Facebook ou live dans les paramètres à droite pour afficher le lecteur Meta.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl overflow-hidden border border-blue-500/40 shadow-2xl bg-black">
                <div className="w-full aspect-video">
                  <iframe
                    src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(data.videoUrl)}&show_text=0`}
                    title={data.title || 'Facebook Video'}
                    className="w-full h-full border-0"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                {data.title && (
                  <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                    <span className="font-bold truncate flex items-center gap-2">
                      <IconFacebook className="w-4 h-4 text-blue-500 shrink-0" color="#1877f2" />
                      <span>{data.title}</span>
                    </span>
                    <span className="text-[10px] font-mono text-blue-400">Meta Video Player</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      case 'embed_instagram': {
        return (
          <div className="py-6 px-4 max-w-md mx-auto space-y-3">
            {!data.videoUrl ? (
              <div className="p-8 rounded-3xl bg-slate-900/90 border-2 border-dashed border-pink-500/50 text-center space-y-3 shadow-2xl relative overflow-hidden group">
                <div className="w-14 h-14 rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/40 flex items-center justify-center mx-auto shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform">
                  <IconInstagram className="w-8 h-8" color="#e1306c" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{data.title || 'Module Embed Instagram (Reels & Posts)'}</h3>
                  <span className="text-[10px] font-mono text-pink-400 font-bold bg-pink-500/10 px-2.5 py-0.5 rounded-full border border-pink-500/30 inline-block mt-1">
                    Reels & Posts Officiels
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-pink-300 mb-1">⚡ Action requise :</p>
                  <p className="text-slate-400 text-[11px]">
                    Collez le lien de votre Reel ou post Instagram dans les réglages à droite pour afficher le module.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-pink-500/40 bg-slate-950 shadow-2xl overflow-hidden p-4 space-y-3 text-center">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-white">
                    <IconInstagram className="w-4 h-4 text-pink-500" color="#e1306c" />
                    <span>Instagram Feed</span>
                  </span>
                  <span className="text-[10px] text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/30">Vérifié ✓</span>
                </div>
                <div className="aspect-[9/16] max-w-[280px] mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-4 relative overflow-hidden shadow-inner">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg">
                    <Play className="w-8 h-8 text-white fill-current ml-1" />
                  </div>
                  <p className="text-xs font-bold text-white mb-2">{data.title || 'Reel Instagram Officiel'}</p>
                  <a
                    href={data.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white text-xs font-black shadow-lg hover:scale-105 transition"
                  >
                    Voir sur Instagram ➔
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'embed_linkedin': {
        return (
          <div className="py-6 px-4 max-w-3xl mx-auto space-y-3">
            {!data.postUrl ? (
              <div className="p-8 rounded-3xl bg-slate-900/90 border-2 border-dashed border-sky-500/50 text-center space-y-3 shadow-2xl relative overflow-hidden group">
                <div className="w-14 h-14 rounded-2xl bg-sky-600/20 text-sky-400 border border-sky-500/40 flex items-center justify-center mx-auto shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform">
                  <IconLinkedIn className="w-8 h-8" color="#0a66c2" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{data.title || 'Module Embed LinkedIn'}</h3>
                  <span className="text-[10px] font-mono text-sky-400 font-bold bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/30 inline-block mt-1">
                    Publications & Live B2B
                  </span>
                </div>
                <div className="max-w-md mx-auto p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-sky-300 mb-1">⚡ Action requise :</p>
                  <p className="text-slate-400 text-[11px]">
                    Collez l'URL de votre publication ou direct LinkedIn dans les paramètres à droite pour afficher le module B2B.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-sky-500/40 bg-slate-950 shadow-2xl overflow-hidden p-5 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <IconLinkedIn className="w-5 h-5 text-sky-500" color="#0a66c2" />
                    <span className="font-bold text-white">{data.title || 'Publication LinkedIn B2B'}</span>
                  </div>
                  <span className="text-[10px] text-sky-400 font-mono bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">Post Certifié</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-center">
                  <p className="text-xs text-slate-300">Publication intégrée synchronisée avec LinkedIn.</p>
                  <a
                    href={data.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-5 py-2 rounded-xl bg-[#0A66C2] hover:bg-[#095196] text-white font-bold text-xs shadow-md transition"
                  >
                    Consulter la publication sur LinkedIn ➔
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      }

      // ======================================================================
      // NOUVELLE SECTION C : RÉSEAUX SOCIAUX & PARTAGE DIRECT
      // ======================================================================
      case 'social_share_bar': {
        const activeNets = data.activeNetworks || Object.keys(SOCIAL_NETWORKS_INFO);
        const isShareMode = data.mode === 'share';
        return (
          <div className="py-6 px-4 max-w-3xl mx-auto text-center space-y-4">
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-purple-500/30 shadow-2xl space-y-4 backdrop-blur-xl">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-black uppercase tracking-wider">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isShareMode ? 'Boutons de Partage Direct' : 'Nos Réseaux Sociaux Officiels'}</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">{data.headline || 'Partagez ce Funnel'}</h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">{data.subheadline || 'Faites profiter votre entourage en un clic.'}</p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                {activeNets.map(netKey => {
                  const netInfo = SOCIAL_NETWORKS_INFO[netKey];
                  if (!netInfo) return null;
                  const IconComp = netInfo.icon;
                  return (
                    <button
                      key={netKey}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        try { playValidationBeep(); } catch(err) {}
                        if (isShareMode) {
                          const shareUrl = getSocialShareUrl(netKey, data.targetUrl, data.shareMessage);
                          if (typeof window !== 'undefined') window.open(shareUrl, '_blank');
                          triggerToast(`📢 Partage ${netInfo.name} déclenché !`);
                        } else {
                          const profileUrl = netInfo.placeholderProfile || 'https://nana.app';
                          if (typeof window !== 'undefined') window.open(profileUrl, '_blank');
                          triggerToast(`🚀 Redirection vers le profil ${netInfo.name} !`);
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer group"
                      style={{
                        backgroundColor: netInfo.bgColor,
                        borderColor: netInfo.borderColor
                      }}
                      title={`${isShareMode ? 'Partager sur' : 'Visiter'} ${netInfo.name}`}
                    >
                      <IconComp className="w-4 h-4" color={netInfo.color} />
                      <span className="group-hover:text-amber-300 transition">{netInfo.name}</span>
                    </button>
                  );
                })}
              </div>

              {isShareMode && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const currentUrl = data.targetUrl || (typeof window !== 'undefined' ? window.location.href : 'https://nanasore.com');
                      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                        try {
                          await navigator.share({
                            title: data.headline || 'Nanasore Funnel',
                            url: currentUrl,
                          });
                          return;
                        } catch (err) {}
                      }
                      navigator.clipboard?.writeText(currentUrl);
                      try { playCashChime(); } catch(e) {}
                      triggerToast('📋 Lien de la page copié dans le presse-papier !');
                    }}
                    className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span>Copier le lien direct de la page 🔗</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }

      // Boutons Sociaux Individuels (10 réseaux)
      case 'social_button_whatsapp': return renderSocialButton(block, data, 'whatsapp');
      case 'social_button_telegram': return renderSocialButton(block, data, 'telegram');
      case 'social_button_tiktok': return renderSocialButton(block, data, 'tiktok');
      case 'social_button_instagram': return renderSocialButton(block, data, 'instagram');
      case 'social_button_facebook': return renderSocialButton(block, data, 'facebook');
      case 'social_button_x': return renderSocialButton(block, data, 'x');
      case 'social_button_youtube': return renderSocialButton(block, data, 'youtube');
      case 'social_button_linkedin': return renderSocialButton(block, data, 'linkedin');
      case 'social_button_pinterest': return renderSocialButton(block, data, 'pinterest');
      case 'social_button_quora': return renderSocialButton(block, data, 'quora');

      // ======================================================================
      // NOUVELLE SECTION D : STRUCTURE & COMPOSANTS PRO & ICÔNES NANA
      // ======================================================================
      case 'text_heading': {
        const Tag = data.tag || 'h1';
        const alignClass = data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center';
        const sizeClass = data.fontSize || 'text-3xl sm:text-5xl';
        const isGradient = data.gradientText !== false;
        return (
          <div className={`py-4 px-4 max-w-4xl mx-auto ${alignClass}`}>
            <Tag
              className={`font-black tracking-tight leading-tight ${sizeClass} ${data.isUppercase ? 'uppercase' : ''} ${
                isGradient
                  ? `bg-gradient-to-r ${data.gradientPreset || 'from-blue-400 via-indigo-200 to-white'} bg-clip-text text-transparent`
                  : ''
              }`}
              style={!isGradient ? { color: data.textColor || '#ffffff' } : {}}
            >
              {data.text || 'Titre Principal Haute Conversion'}
            </Tag>
          </div>
        );
      }

      case 'text_subheading': {
        const alignClass = data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center';
        const sizeClass = data.fontSize || 'text-base sm:text-xl';
        return (
          <div className={`py-2 px-4 max-w-3xl mx-auto ${alignClass} space-y-2`}>
            {data.badgePrefix && (
              <span className="inline-block px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-extrabold uppercase tracking-wider">
                {data.badgePrefix}
              </span>
            )}
            <p
              className={`font-medium leading-relaxed ${sizeClass}`}
              style={{ color: data.textColor || '#94a3b8' }}
            >
              {data.text || 'Sous-titre explicatif d\'accompagnement.'}
            </p>
          </div>
        );
      }

      case 'text_paragraph': {
        const alignClass = data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center';
        const sizeClass = data.fontSize || 'text-sm sm:text-base';
        const maxWidth = data.maxWidth || 'max-w-2xl';
        return (
          <div className={`py-3 px-4 ${maxWidth} mx-auto ${alignClass}`}>
            <p
              className={`leading-relaxed whitespace-pre-line ${sizeClass}`}
              style={{ color: data.textColor || '#cbd5e1' }}
            >
              {data.content || 'Rédigez ici votre paragraphe de contenu.'}
            </p>
          </div>
        );
      }

      case 'interactive_accordion': {
        const items = data.items || [];
        const activeIdx = data.activeIndex ?? 0;
        return (
          <div className="py-6 px-4 max-w-3xl mx-auto space-y-4">
            {data.title && (
              <div className="text-center space-y-1">
                <h3 className="text-lg sm:text-xl font-black text-white">{data.title}</h3>
                {data.subtitle && <p className="text-xs text-slate-400">{data.subtitle}</p>}
              </div>
            )}
            <div className="space-y-2.5">
              {items.map((item, idx) => {
                const isOpen = activeIdx === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-md transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        updateBlockField(block.id, 'activeIndex', isOpen ? -1 : idx);
                        try { playTapBeep(); } catch(e) {}
                      }}
                      className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-800/50 transition cursor-pointer select-none"
                    >
                      <span className={`text-xs sm:text-sm font-bold ${isOpen ? 'text-blue-400' : 'text-white'}`}>
                        {item.q}
                      </span>
                      <span className={`p-1 rounded-lg text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : ''}`}>
                        ▼
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 bg-slate-950/40 animate-in fade-in duration-200">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'interactive_carousel': {
        const slides = data.slides || [];
        const current = data.currentSlide || 0;
        const activeSlide = slides[current] || slides[0] || {};
        return (
          <div className="py-6 px-4 max-w-2xl mx-auto text-center space-y-4">
            {data.headline && (
              <h3 className="text-lg font-black text-white">{data.headline}</h3>
            )}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-blue-500/30 shadow-2xl relative space-y-4 backdrop-blur-xl">
              <div className="flex items-center justify-center gap-1 text-amber-400 text-sm">
                {'★'.repeat(activeSlide.rating || 5)}
              </div>
              <p className="text-xs sm:text-sm text-slate-200 italic leading-relaxed">
                "{activeSlide.review || 'Excellent service et accompagnement.'}"
              </p>
              <div>
                <h4 className="text-xs font-bold text-white">{activeSlide.name}</h4>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">{activeSlide.role}</span>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const prev = current > 0 ? current - 1 : slides.length - 1;
                    updateBlockField(block.id, 'currentSlide', prev);
                    try { playTapBeep(); } catch(e) {}
                  }}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs cursor-pointer border border-slate-700"
                >
                  ◀
                </button>
                <div className="flex items-center gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => updateBlockField(block.id, 'currentSlide', i)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${current === i ? 'w-6 bg-blue-500' : 'w-2 bg-slate-700'}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = current < slides.length - 1 ? current + 1 : 0;
                    updateBlockField(block.id, 'currentSlide', next);
                    try { playTapBeep(); } catch(e) {}
                  }}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs cursor-pointer border border-slate-700"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 'interactive_slideshow': {
        const slides = data.slides || [];
        const current = data.currentIndex || 0;
        const activeSlide = slides[current] || slides[0] || {};
        return (
          <div className="py-6 px-4 max-w-4xl mx-auto space-y-3">
            {data.title && (
              <h3 className="text-base sm:text-lg font-black text-white text-center">{data.title}</h3>
            )}
            <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-black aspect-video sm:aspect-[21/9] shadow-2xl group">
              <img
                src={activeSlide.image}
                alt={activeSlide.caption || 'Slide'}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-5">
                {activeSlide.caption && (
                  <p className="text-xs sm:text-sm font-bold text-white bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-700/80 backdrop-blur-md">
                    {activeSlide.caption}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const prev = current > 0 ? current - 1 : slides.length - 1;
                  updateBlockField(block.id, 'currentIndex', prev);
                  try { playTapBeep(); } catch(e) {}
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center text-sm cursor-pointer shadow-lg"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = current < slides.length - 1 ? current + 1 : 0;
                  updateBlockField(block.id, 'currentIndex', next);
                  try { playTapBeep(); } catch(e) {}
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center text-sm cursor-pointer shadow-lg"
              >
                ▶
              </button>
            </div>
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => updateBlockField(block.id, 'currentIndex', i)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${current === i ? 'w-6 bg-blue-500' : 'w-2 bg-slate-700'}`}
                />
              ))}
            </div>
          </div>
        );
      }

      case 'product_visual_gallery': {
        const images = data.images || [];
        const selectedIdx = data.selectedIndex || 0;
        const currentImg = images[selectedIdx] || images[0];
        return (
          <div className="py-6 px-4 max-w-4xl mx-auto">
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <div className="aspect-square rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-inner">
                  <img
                    src={currentImg}
                    alt="Produit"
                    className="w-full h-full object-cover transition-all duration-300"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        updateBlockField(block.id, 'selectedIndex', idx);
                        try { playTapBeep(); } catch(e) {}
                      }}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                        selectedIdx === idx ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/30' : 'border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Miniature ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 text-left">
                {data.badge && (
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                    {data.badge}
                  </span>
                )}
                <h3 className="text-xl sm:text-2xl font-black text-white">{data.productName}</h3>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">
                    {formatCFA(data.priceCFA)}
                  </span>
                  {data.originalPriceCFA && (
                    <span className="text-sm text-slate-500 line-through font-mono">
                      {formatCFA(data.originalPriceCFA)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Profitez de notre garantie satisfaction totale. Produit authentifié et expédié avec suivi par notre hub logistique.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    try { playCashChime(); } catch(e) {}
                    triggerToast('🛍️ Redirection vers la caisse express...');
                  }}
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                >
                  {data.ctaText || 'Commander ce Produit 🛍️'}
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 'raw_html_block': {
        if (viewMode === 'preview') {
          return (
            <div
              className="w-full my-2"
              dangerouslySetInnerHTML={{ __html: data.rawHtml || '' }}
            />
          );
        }
        return (
          <div className="py-3 px-4 max-w-3xl mx-auto">
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 text-left space-y-2 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{data.label || 'Bloc HTML Brut (Injecté)'}</span>
                </span>
                <span className="text-[9.5px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                  Invisible sur le site final
                </span>
              </div>
              <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-cyan-300 font-mono overflow-x-auto">
                {data.rawHtml || '<!-- Code HTML personnalisé -->'}
              </pre>
            </div>
          </div>
        );
      }

      case 'inline_css_block': {
        return (
          <>
            {data.scopedCss && <style>{data.scopedCss}</style>}
            {viewMode !== 'preview' && (
              <div className="py-2 px-4 max-w-3xl mx-auto">
                <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/40 text-left space-y-2 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{data.label || 'Bloc CSS Inline (Scoped)'}</span>
                    </span>
                    <span className="text-[9.5px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                      Style appliqué en direct
                    </span>
                  </div>
                  <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-purple-300 font-mono overflow-x-auto">
                    {data.scopedCss || '/* Règles CSS */'}
                  </pre>
                </div>
              </div>
            )}
          </>
        );
      }

      case 'dynamic_button_link': {
        const alignClass = data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center';
        return (
          <div className={`py-4 px-4 max-w-xl mx-auto ${alignClass}`}>
            <button
              type="button"
              onClick={() => {
                try { playCashChime(); } catch(e) {}
                triggerToast('🚀 Clic sur le Bouton Dynamique !');
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-xs sm:text-sm tracking-wide shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1 border select-none"
              style={{
                backgroundColor: data.buttonColor || '#2563eb',
                color: data.buttonTextColor || '#ffffff',
                boxShadow: `0 12px 35px ${data.buttonColor || '#2563eb'}50`,
                borderColor: `${data.buttonColor || '#2563eb'}80`
              }}
            >
              <span>{data.label || 'COMMANDER MAINTENANT ⚡'}</span>
              {data.sublabel && (
                <span className="text-[10.5px] font-normal opacity-85">
                  {data.sublabel}
                </span>
              )}
            </button>
          </div>
        );
      }

      case 'icon_block': {
        const alignClass = data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center';
        const size = data.size || 64;
        const primary = data.iconColor || DEFAULT_NANA_BLUE;
        const secondary = data.accentColor || DEFAULT_NANA_ACCENT;
        const variant = data.styleVariant || 'duotone_glow';

        return (
          <div className={`py-5 px-4 max-w-md mx-auto ${alignClass} space-y-3`}>
            <div
              className={`inline-flex items-center justify-center transition-all duration-300 ${
                variant === 'duotone_glow'
                  ? 'p-4 rounded-3xl border'
                  : variant === 'badge_round'
                  ? 'p-4 rounded-full border-2'
                  : variant === 'glass_card'
                  ? 'p-6 rounded-3xl border backdrop-blur-xl w-full flex-col'
                  : 'p-2'
              }`}
              style={{
                backgroundColor: data.bgColor || '#081325',
                borderColor: `${primary}50`,
                boxShadow: variant === 'duotone_glow' ? `0 10px 40px ${data.glowColor || `${primary}40`}` : undefined
              }}
            >
              {renderNanaDuotoneIcon(data.iconId || data.iconName, {
                size,
                primaryColor: primary,
                secondaryColor: secondary
              })}

              {variant === 'glass_card' && (
                <div className="mt-3 text-center">
                  <h4 className="text-sm font-bold text-white">{data.title || data.iconName}</h4>
                  {data.caption && <p className="text-xs text-slate-400 mt-1">{data.caption}</p>}
                </div>
              )}
            </div>

            {variant !== 'glass_card' && (data.title || data.caption) && (
              <div className="space-y-1">
                {data.title && <h4 className="text-sm font-bold text-white">{data.title}</h4>}
                {data.caption && <p className="text-xs text-slate-400">{data.caption}</p>}
              </div>
            )}
          </div>
        );
      }

      case 'image_block': {
        const alignClass = data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center';
        const maxWidth = data.maxWidth || 'max-w-3xl';
        const radius = data.borderRadius || 'rounded-2xl';
        const shadow = data.shadowVariant || 'shadow-2xl shadow-blue-500/10';
        const aspect = data.aspectRatio || 'aspect-video';

        const imgElement = (
          <div className={`${maxWidth} mx-auto overflow-hidden ${radius} ${shadow} border border-slate-800 bg-slate-950 transition-all duration-300 group`}>
            <div className={`w-full ${aspect === 'aspect-auto' ? 'h-auto' : aspect} overflow-hidden bg-slate-900 flex items-center justify-center`}>
              <img
                src={data.imageUrl || activeProduct.image || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=80'}
                alt={data.altText || 'Visuel bannière'}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            {data.caption && (
              <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 text-center text-xs text-slate-400">
                <span>{data.caption}</span>
              </div>
            )}
          </div>
        );

        return (
          <div className={`py-4 px-4 ${alignClass}`}>
            {data.enableLink && data.targetUrl ? (
              <a
                href={data.targetUrl}
                target={data.openInNewTab ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className="inline-block w-full cursor-pointer"
                onClick={(e) => {
                  if (viewMode !== 'preview') e.preventDefault();
                }}
              >
                {imgElement}
              </a>
            ) : (
              imgElement
            )}
          </div>
        );
      }

      case 'bullet_list_block': {
        const alignClass = data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center';
        const maxWidth = data.maxWidth || 'max-w-2xl';
        const items = data.items || [];
        const bulletColor = data.bulletColor || '#10b981';

        const renderBulletIcon = () => {
          switch (data.bulletStyle) {
            case 'star':
              return <span className="font-bold text-sm" style={{ color: bulletColor }}>★</span>;
            case 'zap':
              return <Zap className="w-4 h-4 shrink-0" style={{ color: bulletColor }} />;
            case 'arrow':
              return <span className="font-bold text-sm" style={{ color: bulletColor }}>➔</span>;
            case 'check':
            default:
              return <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: bulletColor }} />;
          }
        };

        return (
          <div className={`py-5 px-4 ${alignClass}`}>
            <div className={`${maxWidth} mx-auto ${data.cardStyle !== false ? 'p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl' : 'p-2'} space-y-4`}>
              {data.title && (
                <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {data.title}
                </h4>
              )}
              <ul className="space-y-3 text-left">
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                    <div className="mt-0.5 shrink-0 flex items-center justify-center">
                      {renderBulletIcon()}
                    </div>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      }

      // ======================================================================
      // 1. BANNIÈRE STICKY DÉCOMPTE & CODE PROMO (HAUTE CONVERSION)
      // ======================================================================
      case 'banner_countdown_floating_top': {
        const hours = String(data.countdownHours ?? 3).padStart(2, '0');
        const mins = String(data.countdownMinutes ?? 45).padStart(2, '0');
        const secs = String(liveSeconds ?? 20).padStart(2, '0');
        const bg = data.bgColor || '#450a0a';
        const accent = data.accentColor || '#f43f5e';
        const textCol = data.textColor || '#ffffff';

        return (
          <div
            style={{ backgroundColor: bg }}
            className={`w-full py-2.5 px-3 sm:px-6 border-y border-white/10 shadow-lg text-center ${
              data.isSticky ? 'sticky top-0 z-40 backdrop-blur-md bg-opacity-95' : 'relative'
            }`}
          >
            <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Badge & Titre */}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  style={{ backgroundColor: `${accent}25`, borderColor: `${accent}50`, color: accent }}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider flex items-center gap-1 shrink-0"
                >
                  <Timer className="w-3 h-3" />
                  <span>{data.badgeText || 'VENTE FLASH'}</span>
                </span>
                <span style={{ color: textCol }} className="font-bold truncate text-[11px] sm:text-xs">
                  {data.headline || 'Offre Spéciale Limitée : Réduction Immédiate Disponible'}
                </span>
              </div>

              {/* Compte à rebours dynamique & Code Coupon */}
              <div className="flex items-center gap-2.5 shrink-0 mx-auto sm:mx-0">
                <div className="flex items-center gap-1 font-mono font-black text-white text-xs">
                  <div className="bg-black/50 border border-white/15 px-2 py-1 rounded-lg">
                    <span style={{ color: accent }}>{hours}</span>
                    <span className="text-[8px] text-slate-400 font-sans ml-0.5">h</span>
                  </div>
                  <span style={{ color: accent }}>:</span>
                  <div className="bg-black/50 border border-white/15 px-2 py-1 rounded-lg">
                    <span style={{ color: accent }}>{mins}</span>
                    <span className="text-[8px] text-slate-400 font-sans ml-0.5">m</span>
                  </div>
                  <span style={{ color: accent }}>:</span>
                  <div className="bg-black/50 border border-white/15 px-2 py-1 rounded-lg">
                    <span style={{ color: accent }}>{secs}</span>
                    <span className="text-[8px] text-slate-400 font-sans ml-0.5">s</span>
                  </div>
                </div>

                {data.couponCode && (
                  <span className="px-2 py-1 rounded-lg bg-white/10 border border-dashed border-white/30 text-[10px] font-mono font-bold text-amber-300">
                    CODE: {data.couponCode}
                  </span>
                )}

                <a
                  href={data.ctaLink || '#checkout'}
                  style={{ backgroundColor: accent }}
                  className="px-3 py-1.5 rounded-xl text-white font-extrabold text-[11px] shadow-md transition hover:brightness-110 active:scale-95 shrink-0"
                >
                  {data.ctaText || 'Profiter de l\'Offre'}
                </a>
              </div>
            </div>
          </div>
        );
      }

      // ======================================================================
      // 2. BANNIÈRE TICKER DÉFILANT & STOCK CRITIQUE (60 FPS)
      // ======================================================================
      case 'banner_stock_ticker_marquee': {
        const bg = data.bgColor || '#1c1002';
        const accent = data.accentColor || '#f59e0b';
        const textCol = data.textColor || '#fef3c7';

        return (
          <div
            style={{ backgroundColor: bg }}
            className="w-full py-2 px-3 border-y border-amber-500/30 overflow-hidden relative select-none"
          >
            <div className="flex items-center gap-6 whitespace-nowrap animate-marquee text-xs font-bold font-sans">
              <span className="flex items-center gap-1.5" style={{ color: accent }}>
                <Flame className="w-3.5 h-3.5 animate-bounce fill-current" />
                <span>⚠️ ALERTE STOCK : Plus que {data.stockRemaining || 4} unités réservées pour votre zone</span>
              </span>
              <span className="text-amber-500/50">✦</span>
              <span style={{ color: textCol }} className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" style={{ color: accent }} />
                <span>{data.deliveryText || 'Livraison express 24h & vérification du colis avant paiement'}</span>
              </span>
              <span className="text-amber-500/50">✦</span>
              <span style={{ color: textCol }} className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: accent }} />
                <span>{data.guaranteeText || 'Garantie Totale 12 Mois Satisfait ou Remboursé'}</span>
              </span>
              <span className="text-amber-500/50">✦</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>{data.liveBuyerText || 'Aïcha de Cocody vient de commander à l\'instant'}</span>
              </span>
              <span className="text-amber-500/50">✦</span>
              <span className="flex items-center gap-1.5" style={{ color: accent }}>
                <Zap className="w-3.5 h-3.5" />
                <span>Tarif Promotionnel Garanti pour cette Session</span>
              </span>
            </div>
          </div>
        );
      }

      // ======================================================================
      // 3. BANNIÈRE SPLIT PROMO & JAUGE DE RARÉFACTION (85% RÉCLAMÉ)
      // ======================================================================
      case 'banner_flash_stock_split': {
        const bg = data.bgColor || '#1f0412';
        const accent = data.accentColor || '#ec4899';
        const claimed = Number(data.claimedPercent) || 86;
        const remaining = Number(data.stockRemaining) || 5;
        const total = Number(data.stockTotal) || 40;

        return (
          <div className="py-4 px-3 sm:px-6 max-w-4xl mx-auto">
            <div
              style={{ backgroundColor: bg, borderColor: `${accent}40` }}
              className="p-4 sm:p-5 rounded-3xl border-2 shadow-2xl relative overflow-hidden"
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Gauche : Jauge de Raréfaction */}
                <div className="flex-1 space-y-2 text-left w-full">
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: `${accent}25`, borderColor: `${accent}50`, color: accent }}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider"
                    >
                      STOCK LIMITÉ
                    </span>
                    <h4 className="text-xs sm:text-sm font-black text-white">{data.title || 'Offre Spéciale de Clôture'}</h4>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {data.subtitle || 'Nos stocks physiques s\'épuisent rapidement. Réservez votre colis avant la rupture totale.'}
                  </p>

                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span style={{ color: accent }}>{claimed}% du stock promo alloué réclamé</span>
                      <span className="text-white font-mono">{remaining} / {total} restants</span>
                    </div>
                    <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                      <div
                        style={{ width: `${claimed}%`, backgroundColor: accent }}
                        className="h-full rounded-full transition-all duration-700 animate-pulse"
                      />
                    </div>
                  </div>
                </div>

                {/* Droite : Compte à Rebours & Bouton Direct */}
                <div className="flex flex-row md:flex-col items-center gap-3 shrink-0 w-full md:w-auto justify-between md:justify-center border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4">
                  <div className="text-center">
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Expiration</div>
                    <div className="flex items-center gap-1 font-mono font-black text-white text-xs">
                      <span className="bg-black/50 px-2 py-1 rounded-md border border-white/10" style={{ color: accent }}>
                        {String(data.countdownHours || 1).padStart(2, '0')}h
                      </span>
                      <span>:</span>
                      <span className="bg-black/50 px-2 py-1 rounded-md border border-white/10" style={{ color: accent }}>
                        {String(data.countdownMinutes || 28).padStart(2, '0')}m
                      </span>
                    </div>
                  </div>

                  <a
                    href={data.ctaLink || '#checkout'}
                    style={{ backgroundColor: accent, boxShadow: `0 8px 20px -4px ${accent}60` }}
                    className="px-4 py-2.5 rounded-xl text-white font-black text-xs transition hover:brightness-110 active:scale-95 text-center shrink-0"
                  >
                    {data.ctaText || 'Bloquer Mon Tarif ➔'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // ======================================================================
      // 4. BANNIÈRE FLOTTANTE BOTTOM BAR (COMMANDE 1-CLIC MOBILE & DESKTOP)
      // ======================================================================
      case 'banner_floating_sticky_bottom': {
        const bg = data.bgColor || '#021a12';
        const accent = data.accentColor || '#10b981';

        return (
          <div
            style={{ backgroundColor: bg, borderColor: `${accent}40` }}
            className="w-full py-2.5 px-3 sm:px-6 border-t-2 shadow-2xl backdrop-blur-xl relative"
          >
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 text-xs">
              {/* Info Produit & Miniature */}
              <div className="flex items-center gap-2.5 min-w-0">
                {data.imageUrl && (
                  <img
                    src={data.imageUrl}
                    alt="Produit"
                    className="w-10 h-10 rounded-xl object-cover border border-white/15 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="font-black text-white truncate max-w-[150px] sm:max-w-xs text-xs">
                    {data.productTitle || activeProduct?.name || 'Pack Élite NaNa Pro'}
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: accent }} className="font-mono font-black text-xs sm:text-sm">
                      {formatCFA(data.promoPrice || activeProduct?.price || 25000)}
                    </span>
                    {data.originalPrice && (
                      <span className="text-[10px] text-slate-500 line-through font-mono">
                        {formatCFA(data.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Urgence & Stock en direct */}
              <div className="hidden md:flex items-center gap-2 font-bold">
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px]">
                  {data.stockText || 'Seulement 3 en stock'}
                </span>
                <span className="text-slate-400 text-[11px] flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{data.countdownMinutes || 24} min restantes</span>
                </span>
              </div>

              {/* Bouton CTA d'Action 1-Clic */}
              <a
                href={data.ctaLink || '#checkout'}
                style={{
                  backgroundColor: accent,
                  boxShadow: `0 8px 25px -4px ${accent}60`
                }}
                className="px-4 py-2.5 rounded-xl text-white font-black text-xs sm:text-sm flex items-center gap-1.5 transition hover:brightness-110 active:scale-95 shrink-0"
              >
                <span>{data.ctaText || 'Commander Maintenant'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        );
      }

      // ======================================================================
      // 5. HERO STUDIO SHOWCASE 3D (SPLIT IMMERSIF & MESH GRADIENT)
      // ======================================================================
      case 'hero_studio_showcase_3d': {
        const bg = data.bgColor || '#060919';
        const accent = data.accentColor || '#6366f1';
        const benefits = data.benefits || [
          'Qualité certifiée et contrôlée',
          'Livraison express 24h sécurisée',
          'Paiement Wave & Orange Money'
        ];

        return (
          <section
            style={{ backgroundColor: bg }}
            className="py-10 sm:py-16 px-4 sm:px-8 relative overflow-hidden text-left"
          >
            {/* Halo lumineux mesh de fond */}
            <div
              style={{ background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)` }}
              className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl pointer-events-none"
            />
            <div
              style={{ background: `radial-gradient(circle, #f43f5e20 0%, transparent 70%)` }}
              className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none"
            />

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
              {/* Colonne Gauche : Copywriting Puissant */}
              <div className="space-y-5">
                <span
                  style={{ backgroundColor: `${accent}20`, borderColor: `${accent}40`, color: accent }}
                  className="px-3 py-1 rounded-full text-xs font-black border inline-flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>{data.kickerBadge || 'NOUVELLE COLLECTION STUDIO PRO'}</span>
                </span>

                <h1 className="text-3xl sm:text-5xl font-black text-white leading-[1.15] tracking-tight">
                  {data.headline || 'Révolutionnez Votre Activité avec Notre Solution Tout-en-Un'}
                </h1>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  {data.subheadline || 'Rejoignez les milliers d\'entrepreneurs et professionnels qui obtiennent des résultats concrets en moins de 7 jours grâce à une conception sur-mesure.'}
                </p>

                {/* Double Bouton CTA */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href={data.primaryCtaLink || '#checkout'}
                    style={{
                      backgroundColor: accent,
                      boxShadow: `0 12px 30px -6px ${accent}60`
                    }}
                    className="px-6 py-4 rounded-2xl text-white font-black text-sm flex items-center gap-2 transition hover:brightness-110 active:scale-95 cursor-pointer"
                  >
                    <span>{data.primaryCtaText || 'Commander Maintenant 🚀'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>

                  {data.secondaryCtaText && (
                    <a
                      href={data.secondaryCtaLink || '#video'}
                      className="px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/20 flex items-center gap-2 transition cursor-pointer backdrop-blur-md"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>{data.secondaryCtaText}</span>
                    </a>
                  )}
                </div>

                {/* Preuve Sociale & Étoiles */}
                <div className="pt-3 border-t border-slate-800 flex items-center gap-3 text-xs">
                  <div className="flex -space-x-2 shrink-0">
                    {['1534528741775-53994a69daeb', '1507003211169-0a1dd7228f2d', '1494790108377-be9c29b29330', '1500648767791-00dcc994a43e'].map((imgId, idx) => (
                      <img
                        key={idx}
                        src={`https://images.unsplash.com/photo-${imgId}?w=80&auto=format&fit=crop&q=80`}
                        alt="Client"
                        className="w-7 h-7 rounded-full border-2 border-slate-900 object-cover"
                      />
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center text-amber-400 text-xs">
                      <span>★★★★★</span>
                      <span className="font-bold text-white ml-1.5">{data.ratingScore || '4.98 / 5'}</span>
                    </div>
                    <p className="text-[10.5px] text-slate-400">{data.socialProofText || 'Rejoint par plus de 12 400 clients satisfaits'}</p>
                  </div>
                </div>
              </div>

              {/* Colonne Droite : Carte 3D Glassmorphism Showcase */}
              <div className="relative">
                <div
                  style={{
                    borderColor: `${accent}40`,
                    boxShadow: `0 25px 60px -15px ${accent}40`
                  }}
                  className="rounded-3xl p-3 sm:p-4 bg-slate-900/80 backdrop-blur-2xl border-2 relative space-y-3 group"
                >
                  {/* Badge Flottant Remise */}
                  {data.floatingBadge && (
                    <div className="absolute top-6 right-6 z-20 px-3 py-1 rounded-xl bg-rose-500 text-white font-black text-xs shadow-xl animate-bounce">
                      {data.floatingBadge}
                    </div>
                  )}

                  <div className="rounded-2xl overflow-hidden aspect-video bg-black/60 relative">
                    <img
                      src={data.imageUrl || activeProduct?.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80'}
                      alt="Vitrine Studio"
                      className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  </div>

                  {/* 3 Puces de réassurance flottantes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {benefits.map((b, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-slate-950/70 border border-white/10 text-[10.5px] font-semibold text-slate-200 flex items-center gap-1.5">
                        <CheckCircle2 style={{ color: accent }} className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      }

      // ======================================================================
      // 6. HERO VSL CINÉMATIQUE (VIDEO SALES MACHINE HAUTE CONVERSION)
      // ======================================================================
      case 'hero_vsl_cinematic': {
        const bg = data.bgColor || '#090306';
        const accent = data.accentColor || '#f43f5e';
        const guarantees = data.guarantees || [
          'Garantie Inconditionnelle 30 Jours',
          'Accès Immédiat & Téléchargeable',
          'Assistance Prioritaire 7j/7'
        ];

        return (
          <section
            style={{ backgroundColor: bg }}
            className="py-10 sm:py-14 px-4 sm:px-6 text-center relative overflow-hidden"
          >
            {/* Ticker Live Supérieur */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-xs font-black uppercase tracking-wider text-rose-400 mb-4">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
              <span>{data.liveStatusText || 'DIFFUSION EN DIRECT'} • <strong>{data.viewersCount || 342} participants</strong> connectés</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight max-w-4xl mx-auto tracking-tight">
              {data.headline || 'Comment Transformer Votre Approche en 3 Étapes Simples Sans Erreur'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto mt-3">
              {data.subheadline || 'Regardez cette vidéo de démonstration complète avant la fermeture des inscriptions à tarif réduit.'}
            </p>

            {/* Lecteur Vidéo Cinématique 16:9 */}
            <div className="max-w-4xl mx-auto mt-6">
              <div
                style={{
                  borderColor: `${accent}40`,
                  boxShadow: `0 25px 60px -15px ${accent}40`
                }}
                className="rounded-3xl overflow-hidden aspect-video bg-black border-2 relative shadow-2xl flex items-center justify-center group"
              >
                {data.videoUrl && (data.videoUrl.includes('youtube') || data.videoUrl.includes('youtu.be')) ? (
                  <iframe
                    src={data.videoUrl.replace('watch?v=', 'embed/')}
                    title="VSL Cinema"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : data.videoUrl && data.videoUrl.endsWith('.mp4') ? (
                  <video src={data.videoUrl} controls className="w-full h-full object-cover" poster={data.posterUrl} />
                ) : (
                  <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer">
                    {data.posterUrl && (
                      <img src={data.posterUrl} alt="Affiche" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition" />
                    )}
                    <div className="relative z-10 flex flex-col items-center gap-3">
                      <div
                        style={{ backgroundColor: accent, boxShadow: `0 0 35px ${accent}` }}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-white transition transform group-hover:scale-110 active:scale-95 shadow-2xl"
                      >
                        <Play className="w-8 h-8 fill-white ml-1" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-white bg-black/70 px-3 py-1 rounded-full border border-white/20">
                        Lancer la démonstration ({data.durationBadge || '12:45'})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bouton de Commande Direct Sous Vidéo */}
            <div className="max-w-xl mx-auto mt-6 space-y-3">
              {data.priceText && (
                <div style={{ color: accent }} className="text-base sm:text-lg font-black font-mono">
                  {data.priceText}
                </div>
              )}

              <a
                href={data.ctaLink || '#checkout'}
                style={{
                  backgroundColor: accent,
                  boxShadow: `0 12px 30px -6px ${accent}60`
                }}
                className="w-full py-4 px-6 rounded-2xl text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 transition hover:brightness-110 active:scale-95 cursor-pointer"
              >
                <span>{data.ctaText || 'Obtenir Mon Accès Immédiat au Tarif Réduit ➔'}</span>
              </a>

              {/* 3 Garanties en pied */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[11px] text-slate-400 font-medium">
                {guarantees.map((g, i) => (
                  <div key={i} className="flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: accent }} />
                    <span>{g}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      // ======================================================================
      // 7. HERO MINIMALIST LUXURY (SIGNATURE HIGH-TICKET & PRESTIGE)
      // ======================================================================
      case 'hero_luxury_signature': {
        const bg = data.bgColor || '#0a0804';
        const accent = data.accentColor || '#d97706';
        const bullets = data.bulletPoints || [
          'Matériaux nobles sélectionnés à la main',
          'Garantie Signature 24 Mois Échange à Neuf',
          'Expédition sous coffret rigide scellé'
        ];

        return (
          <section
            style={{ backgroundColor: bg }}
            className="py-12 sm:py-20 px-4 sm:px-8 text-left relative overflow-hidden"
          >
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
              {/* Gauche : Typographie Signature & Argumentaire */}
              <div className="space-y-5">
                <span
                  style={{ backgroundColor: `${accent}20`, borderColor: `${accent}40`, color: accent }}
                  className="px-3.5 py-1 rounded-full text-xs font-black border inline-flex items-center gap-1.5 uppercase tracking-widest"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{data.editionBadge || 'COLLECTION PRIVILÈGE • ÉDITION LIMITÉE'}</span>
                </span>

                <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight font-serif">
                  {data.headline || 'Le Joyau d\'Excellence et d\'Élégance Absolue'}
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                  {data.subheadline || 'Chaque détail a été façonné avec une précision d\'orfèvre pour offrir une expérience sensorielle et fonctionnelle sans compromis.'}
                </p>

                {/* Puces Prestige */}
                <div className="space-y-2.5 pt-1">
                  {bullets.map((b, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs font-medium text-slate-200">
                      <div
                        style={{ backgroundColor: `${accent}20`, color: accent }}
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      >
                        ✓
                      </div>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                {/* Tarification Double Prestige */}
                <div className="flex items-baseline gap-3 pt-2">
                  <span style={{ color: accent }} className="text-3xl sm:text-4xl font-black font-mono">
                    {formatCFA(data.price || activeProduct?.price || 49000)}
                  </span>
                  {data.originalPrice && (
                    <span className="text-sm text-slate-500 line-through font-mono">
                      {formatCFA(data.originalPrice)}
                    </span>
                  )}
                </div>

                <a
                  href={data.ctaLink || '#checkout'}
                  style={{
                    backgroundColor: accent,
                    boxShadow: `0 12px 30px -6px ${accent}60`
                  }}
                  className="inline-flex py-4 px-8 rounded-2xl text-slate-950 font-black text-sm items-center gap-2 transition hover:brightness-110 active:scale-95 cursor-pointer"
                >
                  <Crown className="w-4 h-4 text-slate-950" />
                  <span>{data.ctaText || 'Réserver Mon Coffret Numéroté 👑'}</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </a>
              </div>

              {/* Droite : Cadre Produit Haute Définition avec Lueur Dorée */}
              <div className="relative">
                <div
                  style={{
                    borderColor: `${accent}40`,
                    boxShadow: `0 25px 60px -15px ${accent}30`
                  }}
                  className="rounded-3xl overflow-hidden aspect-square bg-slate-950 border-2 relative flex items-center justify-center group"
                >
                  <img
                    src={data.imageUrl || activeProduct?.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80'}
                    alt="Luxe"
                    className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  {/* Badge Flottant VIP */}
                  <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-white/10 flex items-center justify-between text-xs">
                    <span style={{ color: accent }} className="font-mono font-bold">{data.vipPill || 'Exemplaire N° 084 / 200'}</span>
                    <span className="text-slate-400 font-medium">Authentifié NaNa</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      }

      // ======================================================================
      // 8. HERO DIRECT CONVERSION ENGINE (OFFRE CHOC & CAISSE RAPIDE)
      // ======================================================================
      case 'hero_lead_conversion_engine': {
        const bg = data.bgColor || '#04100c';
        const accent = data.accentColor || '#10b981';
        const badges = data.paymentBadges || ['Wave', 'Orange Money', 'MTN', 'Cash Livraison'];

        return (
          <section
            style={{ backgroundColor: bg }}
            className="py-10 sm:py-16 px-4 sm:px-8 text-center relative overflow-hidden"
          >
            {/* Note & Preuve Sociale */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-black text-emerald-400 mb-3">
              <span>★★★★★ {data.ratingScore || '4.95 / 5'}</span>
              <span className="text-white">• {data.reviewCount || '2 840 clients satisfaits'}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight max-w-4xl mx-auto tracking-tight">
              {data.headline || 'Multipliez Vos Ventes avec Notre Solution Tout-en-Un Clé en Main'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto mt-2">
              {data.subheadline || 'Commandez en 1 clic sans compte compliqué. Vérifiez votre colis à la réception avant tout paiement.'}
            </p>

            {/* Carte Produit Tout-en-Un Intégrée */}
            <div className="max-w-2xl mx-auto mt-6">
              <div
                style={{ borderColor: `${accent}40`, boxShadow: `0 20px 50px -10px ${accent}30` }}
                className="p-5 sm:p-7 rounded-3xl bg-slate-900 border-2 space-y-4 text-left shadow-2xl"
              >
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {data.imageUrl && (
                    <img
                      src={data.imageUrl}
                      alt="Produit"
                      className="w-full sm:w-40 aspect-square rounded-2xl object-cover border border-white/10 shrink-0"
                    />
                  )}
                  <div className="space-y-2 flex-1 w-full">
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-xs font-black border border-rose-500/30">
                      {data.discountBadge || '-45% AUJOURD\'HUI'}
                    </span>
                    <div className="flex items-baseline gap-3">
                      <span style={{ color: accent }} className="text-3xl font-black font-mono">
                        {formatCFA(data.price || activeProduct?.price || 24500)}
                      </span>
                      {data.originalPrice && (
                        <span className="text-sm text-slate-500 line-through font-mono">
                          {formatCFA(data.originalPrice)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-amber-300 font-bold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      <span>{data.urgencyText || 'Plus que 5 packs disponibles au tarif promotionnel'}</span>
                    </p>
                  </div>
                </div>

                <a
                  href={data.ctaLink || '#checkout'}
                  style={{
                    backgroundColor: accent,
                    boxShadow: `0 10px 25px -4px ${accent}60`
                  }}
                  className="w-full py-4 px-6 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 transition hover:brightness-110 active:scale-95 cursor-pointer text-center"
                >
                  <span>{data.ctaText || 'Commander avec Wave / Orange Money ➔'}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                {/* Badges de paiement sécurisé */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-slate-800 text-[10.5px] text-slate-400">
                  <span className="font-bold text-slate-300">Paiements Acceptés :</span>
                  {badges.map((b, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      }

      default:
        return (
          <div className="p-6 text-center text-xs text-slate-400">
            Module : {block.name}
          </div>
        );
    }
  };

  // ==========================================================================
  // 6. RENDU DE L'INSPECTEUR EN DIRECT (DATA BINDING SYNCHRONISÉ EN TEMPS RÉEL)
  // ==========================================================================
  const renderInspectorFields = () => {
    // 1. ONGLET PARAMÈTRES GLOBAUX DU FUNNEL
    if (inspectorTab === 'global') {
      return (
        <div className="space-y-4">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-black uppercase text-amber-400 block">Configuration Globale</span>
            <h4 className="text-xs font-bold text-white">Thème & Identité Visuelle</h4>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Preset Graphique Signature</label>
            <div className="space-y-1.5">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setFunnelSettings({ ...funnelSettings, themePreset: preset.name })}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition cursor-pointer ${
                    funnelSettings.themePreset === preset.name
                      ? 'bg-amber-500/15 border-amber-500/50 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.primary }} />
                    <span className="font-medium text-xs">{preset.name}</span>
                  </div>
                  {funnelSettings.themePreset === preset.name && (
                    <Check className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Page (SEO / WhatsApp)</label>
            <input
              type="text"
              value={funnelSettings.pageTitle}
              onChange={(e) => setFunnelSettings({ ...funnelSettings, pageTitle: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Description Persuasive</label>
            <textarea
              rows={2}
              value={funnelSettings.pageDescription}
              onChange={(e) => setFunnelSettings({ ...funnelSettings, pageDescription: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="flex items-center justify-between text-xs text-slate-300 font-medium cursor-pointer">
              <span>Barre Flottante CTA Mobile Sticky</span>
              <input
                type="checkbox"
                checked={funnelSettings.enableStickyMobileBar}
                onChange={(e) => setFunnelSettings({ ...funnelSettings, enableStickyMobileBar: e.target.checked })}
                className="rounded accent-amber-500"
              />
            </label>
          </div>
        </div>
      );
    }

    if (!activeBlock) {
      return (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Espace de Travail • Paramètres Actifs</span>
            <h4 className="text-xs font-black text-white">Paramètres Généraux du Tunnel</h4>
            <p className="text-[11px] text-slate-300">
              Paramètres globaux de votre funnel directement accessibles à l'extérieur.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Nom du Tunnel de Vente</label>
            <input
              type="text"
              value={funnelSettings.funnelName || ''}
              onChange={(e) => setFunnelSettings({ ...funnelSettings, funnelName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Preset Graphique Signature</label>
            <div className="space-y-1.5">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setFunnelSettings({ ...funnelSettings, themePreset: preset.name })}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition cursor-pointer ${
                    funnelSettings.themePreset === preset.name
                      ? 'bg-amber-500/15 border-amber-500/50 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.primary }} />
                    <span className="font-medium text-xs">{preset.name}</span>
                  </div>
                  {funnelSettings.themePreset === preset.name && (
                    <Check className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Page (SEO / Partage)</label>
            <input
              type="text"
              value={funnelSettings.pageTitle || ''}
              onChange={(e) => setFunnelSettings({ ...funnelSettings, pageTitle: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Description Persuasive</label>
            <textarea
              rows={2}
              value={funnelSettings.pageDescription || ''}
              onChange={(e) => setFunnelSettings({ ...funnelSettings, pageDescription: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="flex items-center justify-between text-xs text-slate-300 font-medium cursor-pointer">
              <span>Barre Flottante CTA Mobile Sticky</span>
              <input
                type="checkbox"
                checked={funnelSettings.enableStickyMobileBar}
                onChange={(e) => setFunnelSettings({ ...funnelSettings, enableStickyMobileBar: e.target.checked })}
                className="rounded accent-amber-500 w-4 h-4"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Paramètres Avancés (Domaine & CRM)</span>
          </button>
        </div>
      );
    }

    const data = activeBlock.data || {};

    // 2. ONGLET STYLE DU BLOC SÉLECTIONNÉ
    if (inspectorTab === 'style') {
      return (
        <div className="space-y-4">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] font-black uppercase text-indigo-400 block">Style du Module</span>
            <h4 className="text-xs font-bold text-white">{activeBlock.name}</h4>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Couleur d'Arrière-Plan</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={data.bgColor || '#070b14'}
                onChange={(e) => updateBlockField(activeBlock.id, 'bgColor', e.target.value)}
                className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
              />
              <input
                type="text"
                value={data.bgColor || '#070b14'}
                onChange={(e) => updateBlockField(activeBlock.id, 'bgColor', e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-300 mb-2">Fonds Prédéfinis Haute Fidélité</span>
            <div className="grid grid-cols-3 gap-2">
              {['#070b14', '#041014', '#0b0f19', '#14060b', '#080d1a', '#02040a'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updateBlockField(activeBlock.id, 'bgColor', color)}
                  className="h-8 rounded-lg border border-slate-700 hover:scale-105 transition cursor-pointer flex items-center justify-center"
                  style={{ backgroundColor: color }}
                >
                  {data.bgColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 3. ONGLET LOGIQUE CONDITIONNELLE (DISPLAY CONDITIONS PAR BLOC)
    if (inspectorTab === 'conditions') {
      const cond = activeBlock.conditions || { device: 'all', showIfUrlParam: '', hideIfPurchased: false };
      const condEval = evaluateBlockConditions(activeBlock);

      return (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 block">Ciblage & Affichage</span>
              <h4 className="text-xs font-bold text-white">{activeBlock.name}</h4>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
              condEval.isVisible
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {condEval.isVisible ? <Check className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>{condEval.isVisible ? 'Visible' : 'Masqué'}</span>
            </span>
          </div>

          {/* 1. Appareil Ciblé */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Appareil Ciblé (Device Display)
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => updateBlockCondition('device', 'all')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  cond.device === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5" />
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px]">Tous</span>
              </button>

              <button
                type="button"
                onClick={() => updateBlockCondition('device', 'desktop')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  cond.device === 'desktop'
                    ? 'bg-indigo-600 text-white shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="text-[10px]">Desktop</span>
              </button>

              <button
                type="button"
                onClick={() => updateBlockCondition('device', 'mobile')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  cond.device === 'mobile'
                    ? 'bg-emerald-600 text-white shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-[10px]">Mobile</span>
              </button>
            </div>
            <p className="text-[10.5px] text-slate-500">
              {cond.device === 'all' && 'Visible sur tous les écrans (Mobile, Tablette, Desktop).'}
              {cond.device === 'desktop' && 'Masqué automatiquement lors des visites sur smartphone.'}
              {cond.device === 'mobile' && 'Masqué automatiquement sur ordinateur et grand écran.'}
            </p>
          </div>

          {/* 2. Paramètre URL / UTM Requis */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Afficher si Paramètre d'URL Présent (UTM / Campagne)
            </label>
            <input
              type="text"
              value={cond.showIfUrlParam || ''}
              onChange={(e) => updateBlockCondition('showIfUrlParam', e.target.value)}
              placeholder="ex: utm_source=tiktok ou promo=vip"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
            />
            <p className="text-[10.5px] text-slate-500">
              Le module ne s'affichera que si l'URL contient cette chaîne (ex: campagnes ciblées TikTok, Facebook Ads, WhatsApp). Laisser vide pour afficher à tous.
            </p>
          </div>

          {/* 3. Masquer si déjà client */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="pr-2">
                <span className="text-xs font-bold text-white block">Masquer si déjà client</span>
                <span className="text-[10.5px] text-slate-400 block">
                  Cache ce module (ex: offre d'entrée, formulaire découverte) si le client a déjà finalisé une commande.
                </span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(cond.hideIfPurchased)}
                onChange={(e) => updateBlockCondition('hideIfPurchased', e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer shrink-0"
              />
            </label>
          </div>

          {/* Simulateur de Conditions en Direct */}
          <div className="p-3.5 rounded-2xl bg-amber-500/[0.04] border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Simulateur Visiteur en Direct</span>
              </span>
              <span className="text-[9.5px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                Test Live
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-300">
                Simuler un Paramètre URL (?query) :
              </label>
              <input
                type="text"
                value={conditionSimulation.simulatedUrlParam}
                onChange={(e) => setConditionSimulation(prev => ({ ...prev, simulatedUrlParam: e.target.value }))}
                placeholder="Tapez ex: utm_source=tiktok"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <label className="flex items-center justify-between cursor-pointer pt-1">
              <span className="text-[11px] font-medium text-slate-300">Simuler Visiteur Déjà Client :</span>
              <input
                type="checkbox"
                checked={conditionSimulation.simulatedIsCustomer}
                onChange={(e) => setConditionSimulation(prev => ({ ...prev, simulatedIsCustomer: e.target.checked }))}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
            </label>

            <div className="pt-2 border-t border-slate-800 text-[11px]">
              <span className="text-slate-400">Statut du module dans le Canvas : </span>
              {condEval.isVisible ? (
                <span className="text-emerald-400 font-bold">✅ 100% Visible</span>
              ) : (
                <span className="text-amber-400 font-bold">⚠️ Masqué ({condEval.reason})</span>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 4. ONGLET CONTENU DU BLOC SÉLECTIONNÉ (DATA BINDING RÉACTIF)
    return (
      <div className="space-y-4">
        {/* Sélecteur Universel de Module Actif avec Défilement Automatique */}
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-amber-400">
              Module Actif ({canvasBlocks.findIndex(b => String(b.id) === String(activeBlock.id)) + 1} / {canvasBlocks.length})
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Live Binding ⚡
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold block">
              Sélectionner le module à personnaliser :
            </label>
            <select
              value={activeBlock.id}
              onChange={(e) => {
                const targetId = e.target.value;
                setSelectedBlockId(targetId);
                setInspectorTab('content');
                if (typeof window !== 'undefined') {
                  const el = document.querySelector(`[data-block-id="${targetId}"]`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 hover:border-amber-500/80 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {canvasBlocks.map((b, idx) => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                  {idx + 1}. {b.name} ({b.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 1. CHAMPS SPÉCIFIQUES SELON LE TYPE DE MODULE */}
        {activeBlock.type === 'urgency' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de l'Alerte Urgence</label>
              <input
                type="text"
                value={data.headline || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Compte à Rebours (Heures : Min : Sec)</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min="0"
                  max="72"
                  value={data.countdownHours !== undefined ? data.countdownHours : 11}
                  onChange={(e) => updateBlockField(activeBlock.id, 'countdownHours', Number(e.target.value))}
                  placeholder="11h"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-rose-400 font-mono text-center font-bold"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={data.countdownMinutes !== undefined ? data.countdownMinutes : 42}
                  onChange={(e) => updateBlockField(activeBlock.id, 'countdownMinutes', Number(e.target.value))}
                  placeholder="42m"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-rose-400 font-mono text-center font-bold"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={data.countdownSeconds !== undefined ? data.countdownSeconds : 1}
                  onChange={(e) => updateBlockField(activeBlock.id, 'countdownSeconds', Number(e.target.value))}
                  placeholder="01s"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-rose-400 font-mono text-center font-bold"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Stock Restant</label>
                <input
                  type="number"
                  value={data.stockRemaining || 7}
                  onChange={(e) => updateBlockField(activeBlock.id, 'stockRemaining', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Stock Total (Jauge)</label>
                <input
                  type="number"
                  value={data.stockTotal || 20}
                  onChange={(e) => updateBlockField(activeBlock.id, 'stockTotal', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Entrepôt / Ville</label>
                <input
                  type="text"
                  value={data.stockCity || ''}
                  onChange={(e) => updateBlockField(activeBlock.id, 'stockCity', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Acheteur Récent (Preuve)</label>
                <input
                  type="text"
                  value={data.liveBuyerName || ''}
                  onChange={(e) => updateBlockField(activeBlock.id, 'liveBuyerName', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>
        )}

        {activeBlock.type === 'hero' && (
          <div className="space-y-3">
            {/* Contrôles Visage Personnel / Avatar (Module d'en-tête Funnel 1) */}
            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                  <span>👤 Visage Personnel / Avatar</span>
                </span>
                <input
                  type="checkbox"
                  checked={data.showAvatar ?? true}
                  onChange={(e) => updateBlockField(activeBlock.id, 'showAvatar', e.target.checked)}
                  className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
                />
              </div>

              {(data.showAvatar ?? true) && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      URL Photo de Profil / Visage
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={data.instructorAvatar || ''}
                      onChange={(e) => updateBlockField(activeBlock.id, 'instructorAvatar', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  {/* Suggestions d'avatars en 1-clic */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-medium">Modèles :</span>
                    {[
                      { label: 'Homme Pro', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
                      { label: 'Femme Pro', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
                      { label: 'Expert IA', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => updateBlockField(activeBlock.id, 'instructorAvatar', preset.url)}
                        className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-indigo-400 text-[10px] text-slate-300 hover:text-white cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-300 mb-1">Nom Auteur</label>
                      <input
                        type="text"
                        value={data.authorName || ''}
                        onChange={(e) => updateBlockField(activeBlock.id, 'authorName', e.target.value)}
                        placeholder="Ex: Prof. Ibrahim"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-300 mb-1">Titre / Rôle</label>
                      <input
                        type="text"
                        value={data.authorRole || ''}
                        onChange={(e) => updateBlockField(activeBlock.id, 'authorRole', e.target.value)}
                        placeholder="Ex: Formateur Certifié"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Badge Promo Supérieur</label>
              <input
                type="text"
                value={data.promoBadge || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'promoBadge', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre d'Accroche Choc (H1)</label>
              <textarea
                rows={3}
                value={data.headline || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Titre Persuasif</label>
              <textarea
                rows={3}
                value={data.subheadline || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'subheadline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Zone Géographique de Réassurance</label>
              <input
                type="text"
                value={data.badgeLocation || ''}
                placeholder="Zone UEMOA & Afrique de l'Ouest"
                onChange={(e) => updateBlockField(activeBlock.id, 'badgeLocation', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte du Bouton CTA Principal</label>
              <input
                type="text"
                value={data.ctaText || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte de Réassurance</label>
              <input
                type="text"
                value={data.ctaSubtext || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaSubtext', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {activeBlock.type === 'autoplay_video' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-indigo-200">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Économie de Bande Passante Firebase</span>
              </div>
              <p className="text-slate-400">
                Collez simplement l'URL directe de votre vidéo hébergée sur Cloudinary, BunnyCDN, S3 ou un lien direct MP4. Aucun fichier lourd n'est téléversé sur Firebase.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                URL de la Vidéo (Cloudinary, CDN ou .mp4 direct) *
              </label>
              <input
                type="url"
                value={data.videoUrl || ''}
                placeholder="https://res.cloudinary.com/.../video.mp4"
                onChange={(e) => updateBlockField(activeBlock.id, 'videoUrl', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
              {data.videoUrl ? (
                <p className="text-[10.5px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                  <span>✓ Vidéo connectée (Boucle native activée)</span>
                </p>
              ) : (
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Ex: https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Format d'Affichage (Ratio d'aspect)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: '16/9', label: '16:9', desc: 'Paysage' },
                  { id: '9/16', label: '9:16', desc: 'Vertical' },
                  { id: '1/1', label: '1:1', desc: 'Carré' },
                  { id: 'auto', label: 'Auto', desc: 'Adaptatif' }
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'aspectRatio', fmt.id)}
                    className={`p-1.5 rounded-xl border text-center transition ${
                      (data.aspectRatio || '16/9') === fmt.id
                        ? 'border-indigo-500 bg-indigo-500/20 text-white font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-[11px] font-bold">{fmt.label}</div>
                    <div className="text-[9px] text-slate-500">{fmt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Style des Coins (Design Épuré)
              </label>
              <select
                value={data.borderRadius || 'rounded-2xl'}
                onChange={(e) => updateBlockField(activeBlock.id, 'borderRadius', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="rounded-none">Angles droits (0px)</option>
                <option value="rounded-xl">Légèrement arrondi (12px)</option>
                <option value="rounded-2xl">Arrondi moderne (16px)</option>
                <option value="rounded-3xl">Grand arrondi prestige (24px)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Largeur Maximale du Conteneur
              </label>
              <select
                value={data.maxWidth || 'max-w-4xl'}
                onChange={(e) => updateBlockField(activeBlock.id, 'maxWidth', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="max-w-md">Compact (Mobile format - 448px)</option>
                <option value="max-w-lg">Intermédiaire (512px)</option>
                <option value="max-w-2xl">Moyen (672px)</option>
                <option value="max-w-4xl">Standard Pleine Largeur (896px)</option>
                <option value="max-w-full">100% Conteneur Parent (Plein écran)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Vidéo (Optionnel)</label>
              <input
                type="text"
                value={data.title || ''}
                placeholder="Ex: Démonstration produit en 10 secondes"
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 mb-1.5"
              />
              <input
                type="text"
                value={data.caption || ''}
                placeholder="Légende ou texte descriptif"
                onChange={(e) => updateBlockField(activeBlock.id, 'caption', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {activeBlock.type === 'video' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Lien ou Code Embed YouTube
              </label>
              <input
                type="text"
                value={data.videoUrl || data.embedCode || ''}
                placeholder="https://youtu.be/... ou <iframe src=...>"
                onChange={(e) => {
                  const val = e.target.value;
                  const extractedId = extractYouTubeVideoId(val);
                  updateBlockField(activeBlock.id, 'videoUrl', val);
                  if (extractedId) {
                    updateBlockField(activeBlock.id, 'youtubeId', extractedId);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
              {extractYouTubeVideoId(data.videoUrl || data.embedCode || data.youtubeId) ? (
                <p className="text-[10.5px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                  <span>✓ Vidéo YouTube connectée (ID : {extractYouTubeVideoId(data.videoUrl || data.embedCode || data.youtubeId)})</span>
                </p>
              ) : (
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Collez un lien standard, Shorts, Live ou le code iframe d'intégration.
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Section Vidéo</label>
              <input
                type="text"
                value={data.headline || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Titre Explicatif</label>
              <textarea
                rows={2}
                value={data.subheadline || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'subheadline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Texte du Badge Live</label>
                <input
                  type="text"
                  value={data.liveBadgeText || ''}
                  onChange={(e) => updateBlockField(activeBlock.id, 'liveBadgeText', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Spectateurs Live</label>
                <input
                  type="number"
                  value={data.viewersCount || 247}
                  onChange={(e) => updateBlockField(activeBlock.id, 'viewersCount', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-rose-400 font-mono font-bold"
                />
              </div>
            </div>
            <div>
              <ImageUploadInput
                value={data.posterUrl || ''}
                onChange={(newUrl) => updateBlockField(activeBlock.id, 'posterUrl', newUrl)}
                label="Image de Couverture (Poster URL)"
                badge="ImgBB Direct"
                showPreview={true}
                previewHeight="h-24"
                helperText="Collez une URL ou téléversez une miniature vidéo depuis votre appareil."
              />
            </div>
          </div>
        )}

        {activeBlock.type === 'benefits' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Tag / Sur-titre</label>
              <input
                type="text"
                value={data.sectionTag || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionTag', e.target.value)}
                placeholder="RÉSULTATS TANGIBLES"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Section</label>
              <input
                type="text"
                value={data.sectionTitle || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionTitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Titre de Présentation</label>
              <input
                type="text"
                value={data.sectionSubtitle || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionSubtitle', e.target.value)}
                placeholder="Une méthode pas-à-pas pensée pour produire des résultats..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-emerald-400">Bénéfices Individuels ({(data.items || []).length})</span>
                <button
                  type="button"
                  onClick={() => {
                    const newItems = [...(data.items || []), {
                      id: `b-${Date.now()}`,
                      number: `0${(data.items || []).length + 1}`,
                      title: 'Nouveau Bénéfice Clé',
                      desc: 'Description claire et persuasive de ce bénéfice direct pour l\'utilisateur.'
                    }];
                    updateBlockField(activeBlock.id, 'items', newItems);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer"
                >
                  + Ajouter un Bénéfice
                </button>
              </div>
              <div className="space-y-2">
                {(data.items || []).map((item, idx) => (
                  <div key={item.id || idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">N° :</span>
                        <input
                          type="text"
                          value={item.number || `0${idx + 1}`}
                          onChange={(e) => {
                            const newItems = [...(data.items || [])];
                            newItems[idx] = { ...newItems[idx], number: e.target.value };
                            updateBlockField(activeBlock.id, 'items', newItems);
                          }}
                          className="w-12 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] text-emerald-400 font-mono font-bold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = (data.items || []).filter((_, i) => i !== idx);
                          updateBlockField(activeBlock.id, 'items', newItems);
                        }}
                        className="text-rose-400 hover:text-rose-300 text-[10px] cursor-pointer"
                      >
                        Supprimer ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.title}
                      placeholder="Titre du bénéfice..."
                      onChange={(e) => {
                        const newItems = [...data.items];
                        newItems[idx] = { ...newItems[idx], title: e.target.value };
                        updateBlockField(activeBlock.id, 'items', newItems);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-bold"
                    />
                    <textarea
                      rows={2}
                      value={item.desc}
                      placeholder="Explication détaillée..."
                      onChange={(e) => {
                        const newItems = [...data.items];
                        newItems[idx] = { ...newItems[idx], desc: e.target.value };
                        updateBlockField(activeBlock.id, 'items', newItems);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeBlock.type === 'stats' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Tag / Sur-Titre</label>
              <input
                type="text"
                value={data.sectionTag || ''}
                placeholder="IMPACT & PERFORMANCE EN AFRIQUE"
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionTag', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Section Chiffres</label>
              <input
                type="text"
                value={data.sectionTitle || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionTitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-sky-400 block mb-1">Compteurs d'Impact ({(data.metrics || []).length}) :</span>
              {(data.metrics || []).map((m, idx) => (
                <div key={m.id || idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Valeur Chiffrée</label>
                      <input
                        type="text"
                        value={m.value}
                        onChange={(e) => {
                          const newM = [...data.metrics];
                          newM[idx] = { ...newM[idx], value: e.target.value };
                          updateBlockField(activeBlock.id, 'metrics', newM);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-sky-400 font-black font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Libellé</label>
                      <input
                        type="text"
                        value={m.label}
                        onChange={(e) => {
                          const newM = [...data.metrics];
                          newM[idx] = { ...newM[idx], label: e.target.value };
                          updateBlockField(activeBlock.id, 'metrics', newM);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Note explicative / Pays</label>
                    <input
                      type="text"
                      value={m.note || ''}
                      placeholder="Ex: Côte d'Ivoire, Sénégal, Burkina..."
                      onChange={(e) => {
                        const newM = [...data.metrics];
                        newM[idx] = { ...newM[idx], note: e.target.value };
                        updateBlockField(activeBlock.id, 'metrics', newM);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeBlock.type === 'comparison' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Badge / Tag Supérieur</label>
              <input
                type="text"
                value={data.sectionTag || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionTag', e.target.value)}
                placeholder="POURQUOI FAIRE CE CHOIX AUJOURD'HUI"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Section</label>
              <input
                type="text"
                value={data.sectionTitle || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionTitle', e.target.value)}
                placeholder="La Différence Fondamentale"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Titre de Réassurance</label>
              <input
                type="text"
                value={data.sectionSubtitle || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionSubtitle', e.target.value)}
                placeholder="Comparez par vous-même..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-rose-400 mb-1">Titre "Sans Nous"</label>
                <input
                  type="text"
                  value={data.withoutTitle || ''}
                  onChange={(e) => updateBlockField(activeBlock.id, 'withoutTitle', e.target.value)}
                  placeholder="Méthodes Traditionnelles"
                  className="w-full bg-slate-950 border border-rose-900/40 rounded-xl px-3 py-1.5 text-xs text-rose-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-400 mb-1">Titre "Avec Nous"</label>
                <input
                  type="text"
                  value={data.withTitle || ''}
                  onChange={(e) => updateBlockField(activeBlock.id, 'withTitle', e.target.value)}
                  placeholder="Avec Notre Solution"
                  className="w-full bg-slate-950 border border-emerald-900/40 rounded-xl px-3 py-1.5 text-xs text-emerald-300 focus:outline-none"
                />
              </div>
            </div>

            {/* Liste des Points Comparatifs */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-pink-400">Points de Comparaison ({(data.points || []).length})</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextPoints = [...(data.points || []), { without: 'Méthode manuelle lente', with: 'Automatisation 1-clic instantanée' }];
                    updateBlockField(activeBlock.id, 'points', nextPoints);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-pink-500/20 text-pink-300 text-[10px] font-bold border border-pink-500/40 hover:bg-pink-500/30 cursor-pointer"
                >
                  + Ajouter un Point
                </button>
              </div>

              {(data.points || []).map((pt, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">Point #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextPoints = (data.points || []).filter((_, i) => i !== idx);
                        updateBlockField(activeBlock.id, 'points', nextPoints);
                      }}
                      className="text-rose-400 hover:text-rose-300 text-[10px] cursor-pointer"
                    >
                      Supprimer ✕
                    </button>
                  </div>
                  <input
                    type="text"
                    value={pt.without || ''}
                    placeholder="Sans nous..."
                    onChange={(e) => {
                      const nextPoints = [...(data.points || [])];
                      nextPoints[idx] = { ...nextPoints[idx], without: e.target.value };
                      updateBlockField(activeBlock.id, 'points', nextPoints);
                    }}
                    className="w-full bg-slate-900 border border-rose-950/60 rounded-lg px-2 py-1 text-xs text-rose-300 placeholder-slate-600"
                  />
                  <input
                    type="text"
                    value={pt.with || ''}
                    placeholder="Avec nous..."
                    onChange={(e) => {
                      const nextPoints = [...(data.points || [])];
                      nextPoints[idx] = { ...nextPoints[idx], with: e.target.value };
                      updateBlockField(activeBlock.id, 'points', nextPoints);
                    }}
                    className="w-full bg-slate-900 border border-emerald-950/60 rounded-lg px-2 py-1 text-xs text-emerald-300 placeholder-slate-600 font-medium"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeBlock.type === 'founder' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nom du Fondateur / Auteur</label>
              <input
                type="text"
                value={data.authorName || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'authorName', e.target.value)}
                placeholder="Ex: Mamadou Diallo"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre / Rôle Officiel</label>
              <input
                type="text"
                value={data.authorRole || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'authorRole', e.target.value)}
                placeholder="Fondateur & Directeur Général"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-purple-400 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <ImageUploadInput
                value={data.authorImage || ''}
                onChange={(newUrl) => updateBlockField(activeBlock.id, 'authorImage', newUrl)}
                label="Photo de Profil du Fondateur (URL)"
                badge="ImgBB Direct"
                showPreview={true}
                previewHeight="h-20"
                helperText="Collez une URL ou téléversez une photo de profil depuis votre appareil."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Lettre Personnelle</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                placeholder="« Pourquoi j'ai conçu cette solution »"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white italic"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Paragraphe d'Accroche 1</label>
              <textarea
                rows={3}
                value={data.paragraph1 || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'paragraph1', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Paragraphe d'Accroche 2</label>
              <textarea
                rows={3}
                value={data.paragraph2 || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'paragraph2', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Signature de Clôture</label>
              <input
                type="text"
                value={data.signatureText || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'signatureText', e.target.value)}
                placeholder="— Mamadou Diallo, Fondateur"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-purple-300 font-mono italic"
              />
            </div>
          </div>
        )}

        {activeBlock.type === 'testimonials' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sur-Titre / Tag</label>
              <input
                type="text"
                value={data.sectionTag || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionTag', e.target.value)}
                placeholder="PREUVE SOCIALE & AUTORITÉ"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Section Témoignages</label>
              <input
                type="text"
                value={data.sectionTitle || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionTitle', e.target.value)}
                placeholder="Ce Que Disent les Professionnels et Dirigeants"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-400 mb-1">Note & Statistique Sociale</label>
              <input
                type="text"
                value={data.ratingText || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'ratingText', e.target.value)}
                placeholder="4.95 / 5 (840+ avis vérifiés)"
                className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-bold"
              />
            </div>

            {/* Liste des Témoignages */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400">Avis Clients ({(data.testimonials || []).length})</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextT = [...(data.testimonials || []), {
                      id: `t-${Date.now()}`,
                      name: 'Nouveau Client',
                      role: 'Chef d\'Entreprise',
                      comment: 'Un produit remarquable, livraison ultra rapide et support réactif !',
                      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
                      rating: 5
                    }];
                    updateBlockField(activeBlock.id, 'testimonials', nextT);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer"
                >
                  + Ajouter un Avis
                </button>
              </div>

              {(data.testimonials || []).map((t, idx) => (
                <div key={t.id || idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">Avis #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextT = (data.testimonials || []).filter((_, i) => i !== idx);
                        updateBlockField(activeBlock.id, 'testimonials', nextT);
                      }}
                      className="text-rose-400 hover:text-rose-300 text-[10px] cursor-pointer"
                    >
                      Supprimer ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={t.name || ''}
                      placeholder="Nom client"
                      onChange={(e) => {
                        const nextT = [...(data.testimonials || [])];
                        nextT[idx] = { ...nextT[idx], name: e.target.value };
                        updateBlockField(activeBlock.id, 'testimonials', nextT);
                      }}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-bold"
                    />
                    <input
                      type="text"
                      value={t.role || ''}
                      placeholder="Poste / Ville"
                      onChange={(e) => {
                        const nextT = [...(data.testimonials || [])];
                        nextT[idx] = { ...nextT[idx], role: e.target.value };
                        updateBlockField(activeBlock.id, 'testimonials', nextT);
                      }}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300"
                    />
                  </div>

                  {/* Note en Étoiles (1 à 5) */}
                  <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-lg px-2 py-1">
                    <span className="text-[10.5px] font-bold text-slate-400">Note :</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => {
                            const nextT = [...(data.testimonials || [])];
                            nextT[idx] = { ...nextT[idx], rating: starVal };
                            updateBlockField(activeBlock.id, 'testimonials', nextT);
                          }}
                          className={`p-0.5 transition cursor-pointer ${
                            (t.rating || 5) >= starVal ? 'text-amber-400' : 'text-slate-600'
                          }`}
                          title={`${starVal} étoile(s)`}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <ImageUploadInput
                    value={t.avatarUrl || ''}
                    onChange={(newUrl) => {
                      const nextT = [...(data.testimonials || [])];
                      nextT[idx] = { ...nextT[idx], avatarUrl: newUrl };
                      updateBlockField(activeBlock.id, 'testimonials', nextT);
                    }}
                    label="Photo de Profil / Avatar (URL)"
                    badge="ImgBB Direct"
                    showPreview={false}
                    previewHeight="h-10"
                    helperText="Collez une URL ou téléversez une photo de profil."
                  />
                  <textarea
                    rows={2}
                    value={t.comment || ''}
                    placeholder="Commentaire de l'acheteur..."
                    onChange={(e) => {
                      const nextT = [...(data.testimonials || [])];
                      nextT[idx] = { ...nextT[idx], comment: e.target.value };
                      updateBlockField(activeBlock.id, 'testimonials', nextT);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 resize-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeBlock.type === 'pricing' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Tag / Sur-Titre</label>
              <input
                type="text"
                value={data.sectionTag || ''}
                placeholder="OFFRE SPÉCIALE LIMITÉE"
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionTag', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Badge d'Offre (Réduction)</label>
              <input
                type="text"
                value={data.discountBadge || ''}
                placeholder="ÉCONOMISEZ 50% AUJOURD'HUI"
                onChange={(e) => updateBlockField(activeBlock.id, 'discountBadge', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de l'Offre</label>
              <input
                type="text"
                value={data.sectionTitle || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionTitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Prix Normal</label>
                <input
                  type="number"
                  value={data.originalPrice || 0}
                  onChange={(e) => updateBlockField(activeBlock.id, 'originalPrice', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-400 mb-1">Prix Promo</label>
                <input
                  type="number"
                  value={data.discountPrice || 0}
                  onChange={(e) => updateBlockField(activeBlock.id, 'discountPrice', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Devise</label>
                <input
                  type="text"
                  value={data.currency || 'FCFA'}
                  onChange={(e) => updateBlockField(activeBlock.id, 'currency', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-amber-300 focus:outline-none font-bold"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte du Bouton d'Achat</label>
              <input
                type="text"
                value={data.ctaText || ''}
                placeholder="Valider Ma Commande Immédiate ⚡"
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte de Réassurance Paiement</label>
              <input
                type="text"
                value={data.reassuranceText || ''}
                placeholder="Paiement sécurisé par Wave, Orange Money, Moov, MTN & Carte"
                onChange={(e) => updateBlockField(activeBlock.id, 'reassuranceText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300"
              />
            </div>

            {/* Éditeur de Bonus Inclus (The Offer Stack) */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400">🎁 Bonus Empilés Offerts ({(data.bonusList || []).length})</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextB = [...(data.bonusList || []), {
                      id: `bon-${Date.now()}`,
                      title: 'Guide Pratique Bonus',
                      value: 15000
                    }];
                    updateBlockField(activeBlock.id, 'bonusList', nextB);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer"
                >
                  + Ajouter Bonus
                </button>
              </div>

              {(data.bonusList || []).map((b, idx) => (
                <div key={b.id || idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">Bonus #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextB = (data.bonusList || []).filter((_, i) => i !== idx);
                        updateBlockField(activeBlock.id, 'bonusList', nextB);
                      }}
                      className="text-rose-400 hover:text-rose-300 text-[10px] cursor-pointer"
                    >
                      Supprimer ✕
                    </button>
                  </div>
                  <input
                    type="text"
                    value={b.title || ''}
                    placeholder="Titre du bonus offert..."
                    onChange={(e) => {
                      const nextB = [...(data.bonusList || [])];
                      nextB[idx] = { ...nextB[idx], title: e.target.value };
                      updateBlockField(activeBlock.id, 'bonusList', nextB);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-medium"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Valeur :</span>
                    <input
                      type="number"
                      value={b.value || 0}
                      onChange={(e) => {
                        const nextB = [...(data.bonusList || [])];
                        nextB[idx] = { ...nextB[idx], value: Number(e.target.value) };
                        updateBlockField(activeBlock.id, 'bonusList', nextB);
                      }}
                      className="w-28 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-emerald-400 font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-400">FCFA</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeBlock.type === 'checkout' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sur-Titre / Tag</label>
              <input
                type="text"
                value={data.sectionTag || ''}
                placeholder="COMMANDE SÉCURISÉE EN 1 MINUTE"
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionTag', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre du Formulaire</label>
              <input
                type="text"
                value={data.sectionTitle || ''}
                placeholder="Finalisez Votre Commande ci-dessous"
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionTitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Titre Explicatif</label>
              <input
                type="text"
                value={data.sectionSubtitle || ''}
                placeholder="Remplissez vos coordonnées pour recevoir immédiatement votre accès..."
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionSubtitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nom du Produit affiché</label>
              <input
                type="text"
                value={data.productName || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'productName', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Image Produit (URL)</label>
              <input
                type="text"
                value={data.productImage || ''}
                placeholder="https://..."
                onChange={(e) => updateBlockField(activeBlock.id, 'productImage', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono text-[11px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Prix Encaissé (FCFA)</label>
                <input
                  type="number"
                  value={data.productPrice || 0}
                  onChange={(e) => updateBlockField(activeBlock.id, 'productPrice', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-emerald-400 font-bold font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Badge Livraison</label>
                <input
                  type="text"
                  value={data.deliveryFee || ''}
                  placeholder="GRATUITE"
                  onChange={(e) => updateBlockField(activeBlock.id, 'deliveryFee', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Badge d'Expédition / Livraison</label>
              <input
                type="text"
                value={data.shippingBadge || ''}
                placeholder="LIVRAISON 100% GRATUITE À DOMICILE"
                onChange={(e) => updateBlockField(activeBlock.id, 'shippingBadge', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte Bouton Validation</label>
              <input
                type="text"
                value={data.ctaText || ''}
                placeholder="Confirmer Ma Commande & Mon Expédition 🚀"
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Mention de Garantie Légale</label>
              <input
                type="text"
                value={data.guaranteeNotice || ''}
                placeholder="Paiement sécurisé par protocole bancaire agréé BCEAO"
                onChange={(e) => updateBlockField(activeBlock.id, 'guaranteeNotice', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-400"
              />
            </div>
          </div>
        )}

        {activeBlock.type === 'guarantee' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-cyan-400 mb-1">Badge / Tag Supérieur</label>
              <input
                type="text"
                value={data.badgeText || ''}
                placeholder="ZÉRO RISQUE POUR VOUS"
                onChange={(e) => updateBlockField(activeBlock.id, 'badgeText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-cyan-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Garantie</label>
              <input
                type="text"
                value={data.title || ''}
                placeholder="Garantie Inconditionnelle 30 Jours"
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Titre de Réassurance</label>
              <input
                type="text"
                value={data.subtitle || ''}
                placeholder="Testez l'ensemble des fonctionnalités..."
                onChange={(e) => updateBlockField(activeBlock.id, 'subtitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Durée en Jours</label>
              <input
                type="number"
                value={data.durationDays || 30}
                onChange={(e) => updateBlockField(activeBlock.id, 'durationDays', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte Détaillé de l'Engagement</label>
              <textarea
                rows={3}
                value={data.description || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'description', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 resize-none leading-relaxed"
              />
            </div>
          </div>
        )}

        {activeBlock.type === 'faq' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Tag / Sur-Titre</label>
              <input
                type="text"
                value={data.sectionTag || ''}
                placeholder="TOUTES LES RÉPONSES"
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionTag', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la FAQ</label>
              <input
                type="text"
                value={data.sectionTitle || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'sectionTitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Titre de Réassurance</label>
              <input
                type="text"
                value={data.subtitle || ''}
                placeholder="Tout ce que vous devez savoir avant de commander..."
                onChange={(e) => updateBlockField(activeBlock.id, 'subtitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300"
              />
            </div>
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[11px] font-bold text-indigo-400 block mb-2">Questions & Réponses :</span>
              <div className="space-y-2">
                {(data.questions || []).map((q, idx) => (
                  <div key={q.id || idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <input
                      type="text"
                      value={q.q}
                      onChange={(e) => {
                        const newQ = [...data.questions];
                        newQ[idx] = { ...newQ[idx], q: e.target.value };
                        updateBlockField(activeBlock.id, 'questions', newQ);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-bold"
                      placeholder="Question..."
                    />
                    <textarea
                      rows={2}
                      value={q.a}
                      onChange={(e) => {
                        const newQ = [...data.questions];
                        newQ[idx] = { ...newQ[idx], a: e.target.value };
                        updateBlockField(activeBlock.id, 'questions', newQ);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 resize-none"
                      placeholder="Réponse..."
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeBlock.type === 'guarantee' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Garantie</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Engagement / Détails</label>
              <textarea
                rows={3}
                value={data.description || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'description', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          </div>
        )}

        {activeBlock.type === 'footer' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nom de l'Entreprise</label>
              <input
                type="text"
                value={data.companyName || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'companyName', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Mentions Légales & Disclaimer</label>
              <textarea
                rows={3}
                value={data.disclaimer || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'disclaimer', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* 1. WooCommerce Checkout Direct */}
        {activeBlock.type === 'woocommerce_checkout' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Caisse</label>
              <input
                type="text"
                value={data.headline || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Prix Produit (FCFA)</label>
              <input
                type="number"
                value={data.productPrice || 24500}
                onChange={(e) => updateBlockField(activeBlock.id, 'productPrice', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte Bouton Validation</label>
              <input
                type="text"
                value={data.ctaText || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Code Promo par Défaut</label>
              <input
                type="text"
                value={data.defaultCoupon || 'NANA10'}
                onChange={(e) => updateBlockField(activeBlock.id, 'defaultCoupon', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* 2. Paiement Mobile Afrique */}
        {activeBlock.type === 'mobile_money_afrique' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre du Module</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Montant à Payer (FCFA)</label>
              <input
                type="number"
                value={data.amountCFA || 24500}
                onChange={(e) => updateBlockField(activeBlock.id, 'amountCFA', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Numéro Marchand Wave</label>
              <input
                type="text"
                value={data.waveMerchantPhone || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'waveMerchantPhone', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Code USSD Orange Money</label>
              <input
                type="text"
                value={data.ussdOrange || '#144*391#'}
                onChange={(e) => updateBlockField(activeBlock.id, 'ussdOrange', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* 3. Cash on Delivery */}
        {activeBlock.type === 'cash_on_delivery' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de l'Offre</label>
              <input
                type="text"
                value={data.headline || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Délai Estimé de Livraison</label>
              <input
                type="text"
                value={data.deliveryTime || '24h à 48h chrono'}
                onChange={(e) => updateBlockField(activeBlock.id, 'deliveryTime', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte du Bouton</label>
              <input
                type="text"
                value={data.ctaText || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {/* 4. Live Stream */}
        {activeBlock.type === 'live_stream' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Session Live</label>
              <input
                type="text"
                value={data.sessionTitle || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'sessionTitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nom de l'Intervenant</label>
              <input
                type="text"
                value={data.speakerName || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'speakerName', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">ID Réunion / URL</label>
              <input
                type="text"
                value={data.meetingId || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'meetingId', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* 5. Google Classroom Sync */}
        {activeBlock.type === 'google_classroom' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nom du Cours</label>
              <input
                type="text"
                value={data.courseName || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'courseName', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Code du Cours Classroom</label>
              <input
                type="text"
                value={data.classCode || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'classCode', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">URL de la Classe</label>
              <input
                type="text"
                value={data.classroomUrl || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'classroomUrl', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* 6. Opt-in Brevo */}
        {activeBlock.type === 'brevo_optin' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de l'Offre Lead Magnet</label>
              <input
                type="text"
                value={data.headline || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">ID de Liste Brevo (Contacts)</label>
              <input
                type="text"
                value={data.brevoListId || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'brevoListId', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte du Bouton</label>
              <input
                type="text"
                value={data.buttonText || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'buttonText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {/* 7. Alerte SMS Twilio */}
        {activeBlock.type === 'twilio_sms' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de l'Alerte SMS</label>
              <input
                type="text"
                value={data.headline || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sender ID Twilio (Expéditeur)</label>
              <input
                type="text"
                value={data.senderId || 'NANA-ALERT'}
                onChange={(e) => updateBlockField(activeBlock.id, 'senderId', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase"
              />
            </div>
          </div>
        )}

        {/* 8. Heatmap & Tracking */}
        {activeBlock.type === 'heatmap_tracking' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Hotjar Site ID</label>
              <input
                type="text"
                value={data.hotjarId || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'hotjarId', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Microsoft Clarity Project ID</label>
              <input
                type="text"
                value={data.clarityId || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'clarityId', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Meta Pixel ID</label>
              <input
                type="text"
                value={data.metaPixelId || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'metaPixelId', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* 9. Formulaire Multi-Étapes */}
        {activeBlock.type === 'multistep_form' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre du Diagnostic</label>
              <input
                type="text"
                value={data.formTitle || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'formTitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-titre Explicatif</label>
              <input
                type="text"
                value={data.formSubtitle || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'formSubtitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte Bouton Final</label>
              <input
                type="text"
                value={data.ctaFinishText || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaFinishText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {/* 10. Evergreen Countdown */}
        {activeBlock.type === 'evergreen_countdown' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Accroche d'Urgence</label>
              <input
                type="text"
                value={data.headline || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Durée du Décompte (Minutes)</label>
              <input
                type="number"
                value={data.durationMinutes || 15}
                onChange={(e) => updateBlockField(activeBlock.id, 'durationMinutes', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte du Bouton CTA</label>
              <input
                type="text"
                value={data.ctaText || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {/* 11. Social Proof Popup */}
        {activeBlock.type === 'social_proof_popup' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nom du Produit Associé</label>
              <input
                type="text"
                value={data.productName || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'productName', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Badge d'Authenticité</label>
              <input
                type="text"
                value={data.badgeVerified || 'Commande Vérifiée ✓'}
                onChange={(e) => updateBlockField(activeBlock.id, 'badgeVerified', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* NOUVELLE SECTION A : ÉCOSYSTÈME NANA (VIP)                          */}
        {/* ================================================================== */}
        {activeBlock.type === 'nana_campus_social' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Communauté</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-titre / Description</label>
              <textarea
                rows={2}
                value={data.subtitle || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'subtitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Total Membres</label>
                <input
                  type="text"
                  value={data.membersCount || ''}
                  onChange={(e) => updateBlockField(activeBlock.id, 'membersCount', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Membres En Ligne</label>
                <input
                  type="text"
                  value={data.onlineCount || ''}
                  onChange={(e) => updateBlockField(activeBlock.id, 'onlineCount', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Lien de Redirection Interne</label>
              <input
                type="text"
                value={data.targetUrl || '/campus'}
                onChange={(e) => updateBlockField(activeBlock.id, 'targetUrl', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte du Bouton CTA</label>
              <input
                type="text"
                value={data.ctaText || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {activeBlock.type === 'nana_academie' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de l'Académie</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-titre / Promesse</label>
              <textarea
                rows={2}
                value={data.subtitle || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'subtitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre de Formations</label>
                <input
                  type="text"
                  value={data.coursesCount || ''}
                  onChange={(e) => updateBlockField(activeBlock.id, 'coursesCount', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Total Apprenants</label>
                <input
                  type="text"
                  value={data.studentsCount || ''}
                  onChange={(e) => updateBlockField(activeBlock.id, 'studentsCount', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Lien de Redirection Académie</label>
              <input
                type="text"
                value={data.targetUrl || '/academy'}
                onChange={(e) => updateBlockField(activeBlock.id, 'targetUrl', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte du Bouton CTA</label>
              <input
                type="text"
                value={data.ctaText || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {activeBlock.type === 'nana_live' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Diffusion Live</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nom de l'Intervenant</label>
              <input
                type="text"
                value={data.hostName || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'hostName', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Code de la Salle</label>
                <input
                  type="text"
                  value={data.roomCode || ''}
                  onChange={(e) => updateBlockField(activeBlock.id, 'roomCode', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Spectateurs Connectés</label>
                <input
                  type="text"
                  value={data.viewersCount || ''}
                  onChange={(e) => updateBlockField(activeBlock.id, 'viewersCount', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte du Bouton d'Accès</label>
              <input
                type="text"
                value={data.ctaText || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* NOUVELLE SECTION B : INTÉGRATIONS VIDÉO & LIVE (EMBEDS)              */}
        {/* ================================================================== */}
        {activeBlock.type === 'embed_youtube' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/30 text-[11px] text-red-300">
              Collez n'importe quel lien YouTube (vidéo, Short, direct Live ou code iframe complet).
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Lien ou Code Embed YouTube
              </label>
              <input
                type="text"
                value={data.videoUrl || data.embedCode || ''}
                placeholder="https://www.youtube.com/watch?v=... ou <iframe src=...>"
                onChange={(e) => {
                  const val = e.target.value;
                  const extractedId = extractYouTubeVideoId(val);
                  updateBlockField(activeBlock.id, 'videoUrl', val);
                  if (extractedId) {
                    updateBlockField(activeBlock.id, 'youtubeId', extractedId);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              />
              {extractYouTubeVideoId(data.videoUrl || data.embedCode || data.youtubeId) ? (
                <p className="text-[10.5px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                  <span>✓ Vidéo YouTube connectée (ID : {extractYouTubeVideoId(data.videoUrl || data.embedCode || data.youtubeId)})</span>
                </p>
              ) : (
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Collez un lien standard, Shorts, Live ou le code iframe d'intégration.
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Vidéo</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Ratio d'Affichage</label>
              <select
                value={data.aspectRatio || '16:9'}
                onChange={(e) => updateBlockField(activeBlock.id, 'aspectRatio', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                <option value="16:9">16:9 (Format Standard Paysage)</option>
                <option value="9:16">9:16 (Format Vertical Shorts / Mobile)</option>
                <option value="4:3">4:3 (Format Classique)</option>
                <option value="1:1">1:1 (Format Carré)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!data.autoplay}
                  onChange={(e) => updateBlockField(activeBlock.id, 'autoplay', e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-red-500"
                />
                <span>Lecture Auto</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!data.mute}
                  onChange={(e) => updateBlockField(activeBlock.id, 'mute', e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-red-500"
                />
                <span>Son Coupé (Muet)</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.controls !== false}
                  onChange={(e) => updateBlockField(activeBlock.id, 'controls', e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-red-500"
                />
                <span>Afficher Contrôles</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!data.loop}
                  onChange={(e) => updateBlockField(activeBlock.id, 'loop', e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-red-500"
                />
                <span>En Boucle</span>
              </label>
            </div>
          </div>
        )}

        {activeBlock.type === 'embed_tiktok' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-[11px] text-cyan-300">
              Format 9:16 vertical idéal pour les vidéos courtes virales TikTok.
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">URL Vidéo TikTok</label>
              <input
                type="text"
                value={data.videoUrl || ''}
                placeholder="https://www.tiktok.com/@user/video/..."
                onChange={(e) => updateBlockField(activeBlock.id, 'videoUrl', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Pseudo Créateur TikTok</label>
              <input
                type="text"
                value={data.creatorHandle || ''}
                placeholder="@votre_compte"
                onChange={(e) => updateBlockField(activeBlock.id, 'creatorHandle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Vidéo</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {activeBlock.type === 'embed_facebook' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">URL Vidéo / Live Facebook</label>
              <input
                type="text"
                value={data.videoUrl || ''}
                placeholder="https://www.facebook.com/.../videos/..."
                onChange={(e) => updateBlockField(activeBlock.id, 'videoUrl', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Vidéo</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {activeBlock.type === 'embed_instagram' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">URL Reel ou Post Instagram</label>
              <input
                type="text"
                value={data.videoUrl || ''}
                placeholder="https://www.instagram.com/reel/..."
                onChange={(e) => updateBlockField(activeBlock.id, 'videoUrl', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre du Reel</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {activeBlock.type === 'embed_linkedin' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">URL Post ou Direct LinkedIn</label>
              <input
                type="text"
                value={data.postUrl || ''}
                placeholder="https://www.linkedin.com/feed/update/..."
                onChange={(e) => updateBlockField(activeBlock.id, 'postUrl', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Publication</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* NOUVELLE SECTION C : RÉSEAUX SOCIAUX & PARTAGE DIRECT               */}
        {/* ================================================================== */}
        {activeBlock.type === 'social_share_bar' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Mode d'Action des Boutons</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateBlockField(activeBlock.id, 'mode', 'share')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    data.mode === 'share'
                      ? 'bg-purple-600 border-purple-500 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ Partager la Page
                </button>
                <button
                  type="button"
                  onClick={() => updateBlockField(activeBlock.id, 'mode', 'profile')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    data.mode === 'profile'
                      ? 'bg-purple-600 border-purple-500 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  👤 Liens Profils
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre Principal</label>
              <input
                type="text"
                value={data.headline || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-titre Incitatif</label>
              <input
                type="text"
                value={data.subheadline || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'subheadline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            {data.mode === 'share' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Message Pré-rempli de Partage</label>
                <textarea
                  rows={2}
                  value={data.shareMessage || ''}
                  onChange={(e) => updateBlockField(activeBlock.id, 'shareMessage', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Réseaux Actifs (10 Disponibles)</label>
              <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                {Object.keys(SOCIAL_NETWORKS_INFO).map((netKey) => {
                  const net = SOCIAL_NETWORKS_INFO[netKey];
                  const activeList = data.activeNetworks || Object.keys(SOCIAL_NETWORKS_INFO);
                  const isChecked = activeList.includes(netKey);
                  return (
                    <label key={netKey} className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer p-1 rounded hover:bg-slate-900">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...activeList, netKey]
                            : activeList.filter(k => k !== netKey);
                          updateBlockField(activeBlock.id, 'activeNetworks', next);
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-purple-600"
                      />
                      <span>{net.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Boutons Sociaux Individuels */}
        {activeBlock.type && activeBlock.type.startsWith('social_button_') && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Action au Clic</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateBlockField(activeBlock.id, 'mode', 'share')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    data.mode === 'share'
                      ? 'bg-purple-600 border-purple-500 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ Partager la Page
                </button>
                <button
                  type="button"
                  onClick={() => updateBlockField(activeBlock.id, 'mode', 'profile')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    data.mode === 'profile'
                      ? 'bg-purple-600 border-purple-500 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  👤 Rediriger vers Profil
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Libellé du Bouton</label>
              <input
                type="text"
                value={data.label || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'label', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {data.mode === 'profile' ? 'URL de votre Profil / Numéro' : 'URL Alternative de la Page'}
              </label>
              <input
                type="text"
                value={data.phoneOrProfileUrl || ''}
                placeholder={data.mode === 'profile' ? 'https://... ou numéro' : 'Laisser vide pour la page actuelle'}
                onChange={(e) => updateBlockField(activeBlock.id, 'phoneOrProfileUrl', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>

            {data.mode === 'share' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Message Pré-rempli</label>
                <textarea
                  rows={2}
                  value={data.shareMessage || ''}
                  onChange={(e) => updateBlockField(activeBlock.id, 'shareMessage', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* NOUVELLE CATÉGORIE : STRUCTURE & COMPOSANTS PRO & ICÔNES NANA */}
        {/* ============================================================== */}

        {/* 1. Grand Titre (H1/H2/H3) */}
        {activeBlock.type === 'text_heading' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-400 block">Structure Typographique</span>
              <h4 className="text-xs font-bold text-white">Grand Titre H1 / H2 / H3</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Niveau Sémantique (Balise)</label>
              <div className="grid grid-cols-3 gap-2">
                {['h1', 'h2', 'h3'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'tag', tag)}
                    className={`py-1.5 rounded-xl text-xs font-black uppercase border transition cursor-pointer ${
                      (data.tag || 'h1') === tag
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte du Titre</label>
              <textarea
                rows={3}
                value={data.text || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'text', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Alignement</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'left', label: 'Gauche' },
                  { id: 'center', label: 'Centre' },
                  { id: 'right', label: 'Droite' }
                ].map(align => (
                  <button
                    key={align.id}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'alignment', align.id)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      (data.alignment || 'center') === align.id
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {align.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Taille du Texte</label>
              <select
                value={data.fontSize || 'text-3xl sm:text-5xl'}
                onChange={(e) => updateBlockField(activeBlock.id, 'fontSize', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="text-2xl sm:text-3xl">Standard (2xl)</option>
                <option value="text-3xl sm:text-4xl">Grand (3xl)</option>
                <option value="text-3xl sm:text-5xl">Impact Hero (5xl)</option>
                <option value="text-4xl sm:text-6xl">Mega Headline (6xl)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-xs font-bold text-white block">Dégradé Lumineux</span>
                <span className="text-[10px] text-slate-400">Effet métallisé haute conversion</span>
              </div>
              <input
                type="checkbox"
                checked={data.gradientText !== false}
                onChange={(e) => updateBlockField(activeBlock.id, 'gradientText', e.target.checked)}
                className="rounded accent-blue-500 cursor-pointer"
              />
            </div>

            {data.gradientText !== false ? (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Preset de Dégradé</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Bleu NaNa', val: 'from-blue-400 via-indigo-200 to-white' },
                    { name: 'Or Solaire', val: 'from-amber-400 via-yellow-200 to-orange-400' },
                    { name: 'Émeraude', val: 'from-emerald-400 via-teal-200 to-white' },
                    { name: 'Pourpre Royal', val: 'from-purple-400 via-pink-300 to-white' }
                  ].map(p => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => updateBlockField(activeBlock.id, 'gradientPreset', p.val)}
                      className={`p-2 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                        (data.gradientPreset || 'from-blue-400 via-indigo-200 to-white') === p.val
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Couleur du Titre</label>
                <input
                  type="color"
                  value={data.textColor || '#ffffff'}
                  onChange={(e) => updateBlockField(activeBlock.id, 'textColor', e.target.value)}
                  className="w-full h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-bold text-white">Tout en Majuscules (UPPERCASE)</span>
              <input
                type="checkbox"
                checked={!!data.isUppercase}
                onChange={(e) => updateBlockField(activeBlock.id, 'isUppercase', e.target.checked)}
                className="rounded accent-blue-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* 2. Sous-Titre */}
        {activeBlock.type === 'text_subheading' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-400 block">Structure Typographique</span>
              <h4 className="text-xs font-bold text-white">Sous-Titre d'Accompagnement</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Badge Préfixe (Optionnel)</label>
              <input
                type="text"
                placeholder="Ex: ⚡ EXCLUSIF NANA"
                value={data.badgePrefix || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'badgePrefix', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte du Sous-Titre</label>
              <textarea
                rows={3}
                value={data.text || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'text', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Alignement</label>
              <div className="grid grid-cols-3 gap-2">
                {['left', 'center', 'right'].map(align => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'alignment', align)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition capitalize cursor-pointer ${
                      (data.alignment || 'center') === align
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {align === 'left' ? 'Gauche' : align === 'center' ? 'Centre' : 'Droite'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Taille</label>
              <select
                value={data.fontSize || 'text-base sm:text-xl'}
                onChange={(e) => updateBlockField(activeBlock.id, 'fontSize', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="text-sm sm:text-base">Discret (Sm)</option>
                <option value="text-base sm:text-xl">Équilibré (Base - Xl)</option>
                <option value="text-lg sm:text-2xl">Accentue (2xl)</option>
              </select>
            </div>
          </div>
        )}

        {/* 3. Paragraphe de Texte */}
        {activeBlock.type === 'text_paragraph' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-400 block">Structure Typographique</span>
              <h4 className="text-xs font-bold text-white">Paragraphe de Texte</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Contenu du Paragraphe</label>
              <textarea
                rows={6}
                value={data.content || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'content', e.target.value)}
                placeholder="Rédigez ou collez votre argumentaire ici..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 leading-relaxed font-normal"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Alignement</label>
              <div className="grid grid-cols-3 gap-2">
                {['left', 'center', 'right'].map(align => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'alignment', align)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      (data.alignment || 'center') === align
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {align === 'left' ? 'Gauche' : align === 'center' ? 'Centre' : 'Droite'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Largeur Maximale</label>
              <select
                value={data.maxWidth || 'max-w-2xl'}
                onChange={(e) => updateBlockField(activeBlock.id, 'maxWidth', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="max-w-xl">Étroit (max-w-xl)</option>
                <option value="max-w-2xl">Standard Persuasif (max-w-2xl)</option>
                <option value="max-w-3xl">Large (max-w-3xl)</option>
                <option value="max-w-4xl">Pleine Largeur (max-w-4xl)</option>
              </select>
            </div>
          </div>
        )}

        {/* 4. Accordéon Pro (FAQ) */}
        {activeBlock.type === 'interactive_accordion' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-black uppercase text-indigo-400 block">Composant Interactif</span>
              <h4 className="text-xs font-bold text-white">Accordéon Pro (FAQ)</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Section</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Titre</label>
              <input
                type="text"
                value={data.subtitle || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'subtitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Questions & Réponses ({data.items?.length || 0})</label>
                <button
                  type="button"
                  onClick={() => {
                    const current = data.items || [];
                    updateBlockField(activeBlock.id, 'items', [
                      ...current,
                      { q: 'Nouvelle question fréquente ?', a: 'Explication détaillée et rassurante ici.' }
                    ]);
                  }}
                  className="text-[10.5px] font-black text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20 cursor-pointer"
                >
                  + Ajouter une Question
                </button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {(data.items || []).map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">Question #{idx + 1}</span>
                      {(data.items || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = data.items.filter((_, i) => i !== idx);
                            updateBlockField(activeBlock.id, 'items', filtered);
                          }}
                          className="text-rose-400 hover:text-rose-300 text-[10px] cursor-pointer"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={item.q}
                      placeholder="Question"
                      onChange={(e) => {
                        const updated = [...data.items];
                        updated[idx] = { ...updated[idx], q: e.target.value };
                        updateBlockField(activeBlock.id, 'items', updated);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                    <textarea
                      rows={2}
                      value={item.a}
                      placeholder="Réponse"
                      onChange={(e) => {
                        const updated = [...data.items];
                        updated[idx] = { ...updated[idx], a: e.target.value };
                        updateBlockField(activeBlock.id, 'items', updated);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. Carrousel Témoignages */}
        {activeBlock.type === 'interactive_carousel' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-black uppercase text-indigo-400 block">Composant Interactif</span>
              <h4 className="text-xs font-bold text-white">Carrousel Avis Clients</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Section</label>
              <input
                type="text"
                value={data.headline || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Témoignages ({data.slides?.length || 0})</label>
                <button
                  type="button"
                  onClick={() => {
                    const current = data.slides || [];
                    updateBlockField(activeBlock.id, 'slides', [
                      ...current,
                      { name: 'Nouveau Client', role: 'Acheteur Vérifié', review: 'Ce produit a dépassé mes attentes, livraison rapide et soignée.', rating: 5 }
                    ]);
                  }}
                  className="text-[10.5px] font-black text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20 cursor-pointer"
                >
                  + Ajouter un Témoignage
                </button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {(data.slides || []).map((slide, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">Slide #{idx + 1}</span>
                      {(data.slides || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = data.slides.filter((_, i) => i !== idx);
                            updateBlockField(activeBlock.id, 'slides', filtered);
                          }}
                          className="text-rose-400 hover:text-rose-300 text-[10px] cursor-pointer"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={slide.name}
                        placeholder="Nom du client"
                        onChange={(e) => {
                          const updated = [...data.slides];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          updateBlockField(activeBlock.id, 'slides', updated);
                        }}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={slide.role}
                        placeholder="Rôle / Statut"
                        onChange={(e) => {
                          const updated = [...data.slides];
                          updated[idx] = { ...updated[idx], role: e.target.value };
                          updateBlockField(activeBlock.id, 'slides', updated);
                        }}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={slide.review}
                      placeholder="Texte de l'avis"
                      onChange={(e) => {
                        const updated = [...data.slides];
                        updated[idx] = { ...updated[idx], review: e.target.value };
                        updateBlockField(activeBlock.id, 'slides', updated);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. Slideshow / Diaporama */}
        {activeBlock.type === 'interactive_slideshow' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-black uppercase text-indigo-400 block">Composant Interactif</span>
              <h4 className="text-xs font-bold text-white">Diaporama / Slideshow</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre du Diaporama</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Images du Diaporama ({data.slides?.length || 0})</label>
                <button
                  type="button"
                  onClick={() => {
                    const current = data.slides || [];
                    updateBlockField(activeBlock.id, 'slides', [
                      ...current,
                      { image: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&q=80', caption: 'Nouvelle Slide' }
                    ]);
                  }}
                  className="text-[10.5px] font-black text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20 cursor-pointer"
                >
                  + Ajouter une Slide
                </button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {(data.slides || []).map((slide, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">Slide #{idx + 1}</span>
                      {(data.slides || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = data.slides.filter((_, i) => i !== idx);
                            updateBlockField(activeBlock.id, 'slides', filtered);
                          }}
                          className="text-rose-400 hover:text-rose-300 text-[10px] cursor-pointer"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={slide.image}
                      placeholder="URL de l'image"
                      onChange={(e) => {
                        const updated = [...data.slides];
                        updated[idx] = { ...updated[idx], image: e.target.value };
                        updateBlockField(activeBlock.id, 'slides', updated);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                    />
                    <input
                      type="text"
                      value={slide.caption}
                      placeholder="Légende d'accroche"
                      onChange={(e) => {
                        const updated = [...data.slides];
                        updated[idx] = { ...updated[idx], caption: e.target.value };
                        updateBlockField(activeBlock.id, 'slides', updated);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 7. Voir Produit (Galerie Visuelle) */}
        {activeBlock.type === 'product_visual_gallery' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-400 block">E-commerce Visuel</span>
              <h4 className="text-xs font-bold text-white">Galerie Produit & Miniatures</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nom du Produit</label>
              <input
                type="text"
                value={data.productName || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'productName', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Prix CFA</label>
                <input
                  type="number"
                  value={data.priceCFA || 0}
                  onChange={(e) => updateBlockField(activeBlock.id, 'priceCFA', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Prix Barré CFA</label>
                <input
                  type="number"
                  value={data.originalPriceCFA || 0}
                  onChange={(e) => updateBlockField(activeBlock.id, 'originalPriceCFA', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Badge d'Offre</label>
              <input
                type="text"
                value={data.badge || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'badge', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Libellé du Bouton</label>
              <input
                type="text"
                value={data.ctaText || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Galerie d'Images ({data.images?.length || 0})</label>
                <button
                  type="button"
                  onClick={() => {
                    const current = data.images || [];
                    updateBlockField(activeBlock.id, 'images', [
                      ...current,
                      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80'
                    ]);
                  }}
                  className="text-[10.5px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 cursor-pointer"
                >
                  + Ajouter Image
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(data.images || []).map((imgUrl, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={imgUrl}
                      onChange={(e) => {
                        const updated = [...data.images];
                        updated[idx] = e.target.value;
                        updateBlockField(activeBlock.id, 'images', updated);
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1 text-xs text-white font-mono"
                    />
                    {(data.images || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = data.images.filter((_, i) => i !== idx);
                          updateBlockField(activeBlock.id, 'images', filtered);
                        }}
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 8. Bloc HTML Brut */}
        {activeBlock.type === 'raw_html_block' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-1">
              <span className="text-[10px] font-black uppercase text-cyan-400 block">Code Natif Injecté</span>
              <h4 className="text-xs font-bold text-white">Bloc HTML Brut (Iframe / Widget)</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nom du Bloc</label>
              <input
                type="text"
                value={data.label || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'label', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Code HTML / Shortcodes</label>
              <textarea
                rows={8}
                value={data.rawHtml || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'rawHtml', e.target.value)}
                placeholder="<div>Votre HTML personnalisé...</div>"
                className="w-full bg-gray-900 border border-cyan-500/30 rounded-xl p-3 font-mono text-xs text-cyan-300 placeholder:text-slate-600 resize-y focus:outline-none focus:border-cyan-400 leading-relaxed shadow-inner"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* 9. Bloc CSS Inline */}
        {activeBlock.type === 'inline_css_block' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-1">
              <span className="text-[10px] font-black uppercase text-purple-400 block">Code Natif Injecté</span>
              <h4 className="text-xs font-bold text-white">Bloc CSS Inline (Scoped)</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nom du Bloc</label>
              <input
                type="text"
                value={data.label || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'label', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Règles CSS Personnalisées</label>
              <textarea
                rows={8}
                value={data.scopedCss || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'scopedCss', e.target.value)}
                placeholder="/* Vos styles CSS */&#10;.custom-hero { background: #000; }"
                className="w-full bg-gray-900 border border-purple-500/30 rounded-xl p-3 font-mono text-xs text-purple-300 placeholder:text-slate-600 resize-y focus:outline-none focus:border-purple-400 leading-relaxed shadow-inner"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* 10. Bouton Dynamique / Lien Court */}
        {activeBlock.type === 'dynamic_button_link' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-400 block">Conversion & Routage</span>
              <h4 className="text-xs font-bold text-white">Lien Court / Bouton Dynamique</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte Principal du Bouton</label>
              <input
                type="text"
                value={data.label || ''}
                onChange={(e) => updateBlockField(activeBlock.id, 'label', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Texte Persuasif</label>
              <input
                type="text"
                value={data.sublabel || ''}
                placeholder="Ex: Expédié en 24h • Paiement à la réception"
                onChange={(e) => updateBlockField(activeBlock.id, 'sublabel', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">URL de Redirection / Caisse</label>
              <input
                type="text"
                value={data.baseTargetUrl || ''}
                placeholder="https://... ou /commander"
                onChange={(e) => updateBlockField(activeBlock.id, 'baseTargetUrl', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Couleur du Bouton</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.buttonColor || '#2563eb'}
                  onChange={(e) => updateBlockField(activeBlock.id, 'buttonColor', e.target.value)}
                  className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                />
                <div className="grid grid-cols-4 gap-1 flex-1">
                  {['#2563eb', '#16a34a', '#d97706', '#dc2626'].map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => updateBlockField(activeBlock.id, 'buttonColor', col)}
                      className="h-7 rounded-lg border border-slate-700 transition cursor-pointer"
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Alignement</label>
              <div className="grid grid-cols-3 gap-2">
                {['left', 'center', 'right'].map(align => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'alignment', align)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      (data.alignment || 'center') === align
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {align === 'left' ? 'Gauche' : align === 'center' ? 'Centre' : 'Droite'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-xs font-bold text-white block">Transmettre les Paramètres UTM</span>
                <span className="text-[10px] text-slate-400">Conserve le tracking d'affiliation</span>
              </div>
              <input
                type="checkbox"
                checked={data.passQueryParams !== false}
                onChange={(e) => updateBlockField(activeBlock.id, 'passQueryParams', e.target.checked)}
                className="rounded accent-blue-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* 11. Icône NaNa Duotone */}
        {activeBlock.type === 'icon_block' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-400 block">Élément Graphique NaNa</span>
              <h4 className="text-xs font-bold text-white">Icône Duotone de Classe Mondiale</h4>
            </div>

            {/* Aperçu direct avec bouton pour ouvrir la modale */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-center">
                  {renderNanaDuotoneIcon(data.iconId || data.iconName, {
                    size: 32,
                    primaryColor: data.iconColor || DEFAULT_NANA_BLUE,
                    secondaryColor: data.accentColor || DEFAULT_NANA_ACCENT
                  })}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">{data.iconName || 'Icône NaNa'}</h5>
                  <span className="text-[10px] text-blue-400 font-mono">Duotone Réaliste</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIconPickerTargetBlockId(activeBlock.id);
                  setIsIconLibraryOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black transition cursor-pointer shadow-md shadow-blue-600/30"
              >
                Changer 💎
              </button>
            </div>

            {/* Style de Conteneur / Variantes */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Style d'Affichage</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'duotone_glow', label: 'Halo Lumineux' },
                  { id: 'badge_round', label: 'Badge Rond' },
                  { id: 'glass_card', label: 'Carte Glassmorphism' },
                  { id: 'flat_duotone', label: 'Icône Seule' }
                ].map(style => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'styleVariant', style.id)}
                    className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      (data.styleVariant || 'duotone_glow') === style.id
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Couleur Primaire (Bleu NaNa par défaut) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">Couleur Primaire (Traits & Corps)</label>
                <button
                  type="button"
                  onClick={() => updateBlockField(activeBlock.id, 'iconColor', DEFAULT_NANA_BLUE)}
                  className="text-[10px] font-bold text-blue-400 hover:underline cursor-pointer"
                >
                  Bleu NaNa
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.iconColor || DEFAULT_NANA_BLUE}
                  onChange={(e) => updateBlockField(activeBlock.id, 'iconColor', e.target.value)}
                  className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={data.iconColor || DEFAULT_NANA_BLUE}
                  onChange={(e) => updateBlockField(activeBlock.id, 'iconColor', e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Couleur Accent (Remplissage Duotone) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">Couleur Accent (Volume & Ombres)</label>
                <button
                  type="button"
                  onClick={() => updateBlockField(activeBlock.id, 'accentColor', DEFAULT_NANA_ACCENT)}
                  className="text-[10px] font-bold text-blue-300 hover:underline cursor-pointer"
                >
                  Bleu Ciel
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.accentColor || DEFAULT_NANA_ACCENT}
                  onChange={(e) => updateBlockField(activeBlock.id, 'accentColor', e.target.value)}
                  className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={data.accentColor || DEFAULT_NANA_ACCENT}
                  onChange={(e) => updateBlockField(activeBlock.id, 'accentColor', e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Taille de l'Icône */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">Taille de l'Icône</label>
                <span className="text-[11px] font-mono text-blue-400">{data.size || 64}px</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {[32, 48, 64, 80, 96, 128].map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'size', sz)}
                    className={`py-1 rounded-lg text-[11px] font-mono font-bold border transition cursor-pointer ${
                      (data.size || 64) === sz
                        ? 'bg-blue-600 border-blue-500 text-white shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Titre & Légende */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre d'Accompagnement</label>
              <input
                type="text"
                value={data.title || ''}
                placeholder="Titre sous l'icône"
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Légende / Argumentaire</label>
              <textarea
                rows={2}
                value={data.caption || ''}
                placeholder="Texte explicatif optionnel"
                onChange={(e) => updateBlockField(activeBlock.id, 'caption', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
              />
            </div>

            {/* Alignement */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Alignement</label>
              <div className="grid grid-cols-3 gap-2">
                {['left', 'center', 'right'].map(align => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'alignment', align)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      (data.alignment || 'center') === align
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {align === 'left' ? 'Gauche' : align === 'center' ? 'Centre' : 'Droite'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 12. Image & Bannière Responsive */}
        {activeBlock.type === 'image_block' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-sky-500/30 space-y-1">
              <span className="text-[10px] font-black uppercase text-sky-400 block">Structure & Visuel</span>
              <h4 className="text-xs font-bold text-white">Image & Bannière Responsive</h4>
            </div>

            {/* URL de l'image */}
            <div>
              <div className="flex items-center justify-between mb-1">
                {activeProduct?.image && (
                  <button
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'imageUrl', activeProduct.image)}
                    className="text-[10px] font-bold text-sky-400 hover:underline cursor-pointer ml-auto mb-1"
                  >
                    Utiliser l'image produit
                  </button>
                )}
              </div>
              <ImageUploadInput
                value={data.imageUrl || ''}
                onChange={(newUrl) => updateBlockField(activeBlock.id, 'imageUrl', newUrl)}
                label="Image de Mise en Avant"
                badge="ImgBB Direct"
                showPreview={true}
                previewHeight="h-28"
                helperText="Collez une URL ou téléversez votre image produit."
              />
            </div>

            {/* Texte Alternatif (SEO & A11y) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte Alternatif (Alt)</label>
              <input
                type="text"
                value={data.altText || ''}
                placeholder="Description de l'image pour le SEO"
                onChange={(e) => updateBlockField(activeBlock.id, 'altText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            {/* Légende sous l'image */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Légende (Optionnelle)</label>
              <input
                type="text"
                value={data.caption || ''}
                placeholder="Légende affichée sous l'image"
                onChange={(e) => updateBlockField(activeBlock.id, 'caption', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            {/* Ratio d'Aspect */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Ratio d'Aspect</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'aspect-video', label: '16:9 (Vidéo)' },
                  { id: 'aspect-square', label: '1:1 (Carré)' },
                  { id: 'aspect-auto', label: 'Auto (Naturel)' }
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'aspectRatio', r.id)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      (data.aspectRatio || 'aspect-video') === r.id
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rayon de Courbure (Arrondi) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Arrondi des Angles</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'rounded-none', label: 'Droit' },
                  { id: 'rounded-xl', label: 'Moyen' },
                  { id: 'rounded-2xl', label: 'Grand' },
                  { id: 'rounded-3xl', label: 'Pilule' }
                ].map(rd => (
                  <button
                    key={rd.id}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'borderRadius', rd.id)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      (data.borderRadius || 'rounded-2xl') === rd.id
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {rd.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Largeur Maximale */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Largeur Maximale</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'max-w-xl', label: 'Étroit' },
                  { id: 'max-w-2xl', label: 'Normal' },
                  { id: 'max-w-3xl', label: 'Large' },
                  { id: 'max-w-4xl', label: 'Plein' }
                ].map(w => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'maxWidth', w.id)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      (data.maxWidth || 'max-w-3xl') === w.id
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Alignement */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Alignement</label>
              <div className="grid grid-cols-3 gap-2">
                {['left', 'center', 'right'].map(align => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'alignment', align)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      (data.alignment || 'center') === align
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {align === 'left' ? 'Gauche' : align === 'center' ? 'Centre' : 'Droite'}
                  </button>
                ))}
              </div>
            </div>

            {/* Lien Cliquable */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Rendre l'Image Cliquable</label>
                <input
                  type="checkbox"
                  checked={data.enableLink || false}
                  onChange={(e) => updateBlockField(activeBlock.id, 'enableLink', e.target.checked)}
                  className="rounded accent-sky-500 cursor-pointer"
                />
              </div>

              {data.enableLink && (
                <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">URL de Destination</label>
                    <input
                      type="text"
                      value={data.targetUrl || ''}
                      placeholder="#checkout ou https://..."
                      onChange={(e) => updateBlockField(activeBlock.id, 'targetUrl', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">Ouvrir dans un nouvel onglet</span>
                    <input
                      type="checkbox"
                      checked={data.openInNewTab || false}
                      onChange={(e) => updateBlockField(activeBlock.id, 'openInNewTab', e.target.checked)}
                      className="rounded accent-sky-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 13. Liste à Puces Avancée */}
        {activeBlock.type === 'bullet_list_block' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-400 block">Structure & Argumentaire</span>
              <h4 className="text-xs font-bold text-white">Liste à Puces Haute Conversion</h4>
            </div>

            {/* Titre de la liste */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Liste</label>
              <input
                type="text"
                value={data.title || ''}
                placeholder="Ce que vous obtenez dans votre pack :"
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            {/* Style de Puce */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Style d'Icône de Puce</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'check', label: '✓ Coche' },
                  { id: 'star', label: '★ Étoile' },
                  { id: 'zap', label: '⚡ Éclair' },
                  { id: 'arrow', label: '➔ Flèche' }
                ].map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'bulletStyle', st.id)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      (data.bulletStyle || 'check') === st.id
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Couleur des Puces */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">Couleur des Puces</label>
                <div className="flex items-center gap-1.5">
                  {['#10b981', '#3b82f6', '#f59e0b', '#ec4899'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateBlockField(activeBlock.id, 'bulletColor', c)}
                      className="w-4 h-4 rounded-full border border-slate-700 hover:scale-110 transition cursor-pointer"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.bulletColor || '#10b981'}
                  onChange={(e) => updateBlockField(activeBlock.id, 'bulletColor', e.target.value)}
                  className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={data.bulletColor || '#10b981'}
                  onChange={(e) => updateBlockField(activeBlock.id, 'bulletColor', e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Éléments de la liste (une ligne par élément) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">Éléments de la Liste</label>
                <span className="text-[10px] text-slate-400 font-medium">1 ligne = 1 puce</span>
              </div>
              <textarea
                rows={5}
                value={(data.items || []).join('\n')}
                placeholder="Élément 1&#10;Élément 2&#10;Élément 3"
                onChange={(e) => {
                  const lines = e.target.value.split('\n');
                  updateBlockField(activeBlock.id, 'items', lines);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-sans leading-relaxed"
              />
            </div>

            {/* Style Boîte / Carte */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <label className="text-xs font-bold text-slate-300 block">Conteneur Carte Sombre</label>
                <span className="text-[10px] text-slate-400">Fond sombre stylisé avec bordure</span>
              </div>
              <input
                type="checkbox"
                checked={data.cardStyle !== false}
                onChange={(e) => updateBlockField(activeBlock.id, 'cardStyle', e.target.checked)}
                className="rounded accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Largeur Maximale */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Largeur Maximale</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'max-w-xl', label: 'Étroit' },
                  { id: 'max-w-2xl', label: 'Normal' },
                  { id: 'max-w-3xl', label: 'Large' }
                ].map(w => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'maxWidth', w.id)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      (data.maxWidth || 'max-w-2xl') === w.id
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Alignement */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Alignement Global</label>
              <div className="grid grid-cols-2 gap-2">
                {['left', 'center'].map(align => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'alignment', align)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      (data.alignment || 'left') === align
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {align === 'left' ? 'Gauche' : 'Centré'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* INSPECTEUR : BANNIÈRE STICKY DÉCOMPTE & CODE PROMO              */}
        {/* ================================================================ */}
        {activeBlock.type === 'banner_countdown_floating_top' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-400 block">Bannière & Urgence</span>
              <h4 className="text-xs font-bold text-white">Sticky Top Décompte & Code Promo</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Badge d'Urgence</label>
              <input
                type="text"
                value={data.badgeText || ''}
                placeholder="VENTE FLASH EXCLUSIVE"
                onChange={(e) => updateBlockField(activeBlock.id, 'badgeText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de l'Annonce</label>
              <input
                type="text"
                value={data.headline || ''}
                placeholder="Offre Spéciale Limitée : Réduction Immédiate Disponible"
                onChange={(e) => updateBlockField(activeBlock.id, 'headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Heures</label>
                <input
                  type="number"
                  value={data.countdownHours ?? 3}
                  onChange={(e) => updateBlockField(activeBlock.id, 'countdownHours', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Minutes</label>
                <input
                  type="number"
                  value={data.countdownMinutes ?? 45}
                  onChange={(e) => updateBlockField(activeBlock.id, 'countdownMinutes', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Secondes</label>
                <input
                  type="number"
                  value={data.countdownSeconds ?? 20}
                  onChange={(e) => updateBlockField(activeBlock.id, 'countdownSeconds', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Code Coupon Promo</label>
                <input
                  type="text"
                  value={data.couponCode || ''}
                  placeholder="FLASH30"
                  onChange={(e) => updateBlockField(activeBlock.id, 'couponCode', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Texte Bouton CTA</label>
                <input
                  type="text"
                  value={data.ctaText || ''}
                  placeholder="Profiter de l'Offre"
                  onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Lien Ancre du Bouton</label>
              <input
                type="text"
                value={data.ctaLink || '#checkout'}
                placeholder="#checkout"
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaLink', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <label className="text-xs font-bold text-slate-300 block">Position Sticky Fixe en Haut</label>
                <span className="text-[10px] text-slate-400">Reste visible lors du défilement</span>
              </div>
              <input
                type="checkbox"
                checked={data.isSticky !== false}
                onChange={(e) => updateBlockField(activeBlock.id, 'isSticky', e.target.checked)}
                className="rounded accent-rose-500 cursor-pointer w-4 h-4"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Couleur Fond</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={data.bgColor || '#450a0a'}
                    onChange={(e) => updateBlockField(activeBlock.id, 'bgColor', e.target.value)}
                    className="w-7 h-7 rounded-lg bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={data.bgColor || '#450a0a'}
                    onChange={(e) => updateBlockField(activeBlock.id, 'bgColor', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Couleur Accent</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={data.accentColor || '#f43f5e'}
                    onChange={(e) => updateBlockField(activeBlock.id, 'accentColor', e.target.value)}
                    className="w-7 h-7 rounded-lg bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={data.accentColor || '#f43f5e'}
                    onChange={(e) => updateBlockField(activeBlock.id, 'accentColor', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* INSPECTEUR : SCROLLYTELLING ANIMATION PRODUIT (APPLE / WEBFLOW) */}
        {/* ================================================================ */}
        {activeBlock.type === 'scrollytelling' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-1">
              <span className="text-[10px] font-black uppercase text-indigo-400 block flex items-center gap-1">
                <Layers className="w-3 h-3 text-indigo-400" />
                <span>Apple & Webflow Showcase • Scrollytelling 3D</span>
              </span>
              <h4 className="text-xs font-bold text-white">Présentation Produit Immersive au Scroll</h4>
              <p className="text-[11px] text-slate-400">
                L'image reste fixée (sticky) au centre pendant que les fonctionnalités défilent, puis libère la page.
              </p>
            </div>

            {/* Titre & Kicker */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Badge Kicker Supérieur</label>
              <input
                type="text"
                value={data.kickerBadge || ''}
                placeholder="PRÉSENTATION IMMERSIVE PRODUIT 3D"
                onChange={(e) => updateBlockField(activeBlock.id, 'kickerBadge', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de la Section Produit</label>
              <input
                type="text"
                value={data.productTitle || ''}
                placeholder="L'Ingénierie de Précision à Son Sommet"
                onChange={(e) => updateBlockField(activeBlock.id, 'productTitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
              />
            </div>

            {/* URL Image Produit */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Image du Produit Fixée (Sticky)</label>
              <input
                type="text"
                value={data.productImage || ''}
                placeholder="https://images.unsplash.com/..."
                onChange={(e) => updateBlockField(activeBlock.id, 'productImage', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-indigo-300 font-mono text-[11px]"
              />
            </div>

            {/* Options de défilement */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Hauteur Scroll (vh)</label>
                <input
                  type="number"
                  value={data.containerHeightVh ?? 320}
                  step={20}
                  min={200}
                  max={600}
                  onChange={(e) => updateBlockField(activeBlock.id, 'containerHeightVh', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center pt-3">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.imageScaleEffect !== false}
                    onChange={(e) => updateBlockField(activeBlock.id, 'imageScaleEffect', e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Effet Zoom & Rotation 3D</span>
                </label>
              </div>
            </div>

            {/* Fonctionnalités Séquentielles (Étapes au scroll) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Fonctionnalités au Défilement ({(data.features || []).length})</span>
                </label>
                <span className="text-[10px] text-indigo-400 font-mono">Défilement continu</span>
              </div>

              {(data.features || []).map((feat, fIndex) => (
                <div key={feat.id || fIndex} className="p-3 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-indigo-400">Étape {fIndex + 1}</span>
                    <input
                      type="text"
                      value={feat.highlightStat || ''}
                      placeholder="Métrique (ex: 72h Autonomie)"
                      onChange={(e) => {
                        const newFeats = [...(data.features || [])];
                        newFeats[fIndex] = { ...newFeats[fIndex], highlightStat: e.target.value };
                        updateBlockField(activeBlock.id, 'features', newFeats);
                      }}
                      className="w-36 bg-slate-900 border border-slate-800 rounded-md px-2 py-0.5 text-[10px] text-emerald-400 font-mono text-right"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={feat.title || ''}
                      placeholder="Titre de la fonctionnalité..."
                      onChange={(e) => {
                        const newFeats = [...(data.features || [])];
                        newFeats[fIndex] = { ...newFeats[fIndex], title: e.target.value };
                        updateBlockField(activeBlock.id, 'features', newFeats);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white font-bold"
                    />
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={feat.description || ''}
                      placeholder="Description détaillée de l'ingénierie..."
                      onChange={(e) => {
                        const newFeats = [...(data.features || [])];
                        newFeats[fIndex] = { ...newFeats[fIndex], description: e.target.value };
                        updateBlockField(activeBlock.id, 'features', newFeats);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-300 resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Bouton CTA Final */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Texte Bouton CTA</label>
                <input
                  type="text"
                  value={data.ctaText || ''}
                  placeholder="Commander Maintenant ➔"
                  onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Lien d'Action CTA</label>
                <input
                  type="text"
                  value={data.ctaLink || '#checkout'}
                  placeholder="#checkout"
                  onChange={(e) => updateBlockField(activeBlock.id, 'ctaLink', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-indigo-300 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* INSPECTEUR : TITRE DYNAMIQUE & PERSONNALISATION PRÉDICTIVE (DTR) */}
        {/* ================================================================ */}
        {activeBlock.type === 'dynamic_heading' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-400 block flex items-center gap-1">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span>Enterprise DTR • Personnalisation Prédictive</span>
              </span>
              <h4 className="text-xs font-bold text-white">Titre & Accroche Adaptatifs (URL Params)</h4>
              <p className="text-[11px] text-slate-400">
                Injecte en temps réel la ville, la source d'acquisition ou le prénom du prospect depuis l'URL avec fallback de sécurité.
              </p>
            </div>

            {/* Template du Titre Principal */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">Modèle du Titre Principal</label>
                <span className="text-[10px] text-emerald-400 font-mono">[ville] [source]</span>
              </div>
              <textarea
                rows={2}
                value={data.headlineTemplate || ''}
                placeholder="La Solution N°1 Plébiscitée à [ville] Pour Vos Commandes"
                onChange={(e) => updateBlockField(activeBlock.id, 'headlineTemplate', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white resize-none font-medium"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                💡 Utilisez les balises <span className="text-emerald-300 font-mono font-bold">[ville]</span>, <span className="text-emerald-300 font-mono font-bold">[source]</span> ou <span className="text-emerald-300 font-mono font-bold">[nom]</span>.
              </p>
            </div>

            {/* Template du Kicker Badge */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Badge Kicker Supérieur</label>
              <input
                type="text"
                value={data.kickerBadgeTemplate || ''}
                placeholder="📍 EXPÉDITION EXPRESS DIRECTE POUR [ville]"
                onChange={(e) => updateBlockField(activeBlock.id, 'kickerBadgeTemplate', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            {/* Template du Sous-titre */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Titre / Argumentaire</label>
              <textarea
                rows={2}
                value={data.subheadlineTemplate || ''}
                placeholder="Offre réservée aux utilisateurs venant de [source] avec paiement Wave ou à la livraison."
                onChange={(e) => updateBlockField(activeBlock.id, 'subheadlineTemplate', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white resize-none"
              />
            </div>

            {/* Configuration des Fallbacks (Valeurs de repli) */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <span className="text-[10.5px] font-bold text-amber-400 block uppercase flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Valeurs de Repli (Fallbacks de Sécurité)</span>
              </span>
              <p className="text-[10.5px] text-slate-400 leading-snug">
                Affichées si le visiteur arrive sans paramètre d'URL (ex: visite directe ou lien sans tracking).
              </p>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-mono">Fallback pour [ville]</label>
                <input
                  type="text"
                  value={data.fallbacks?.ville || ''}
                  placeholder="votre région"
                  onChange={(e) => {
                    const newFallbacks = { ...(data.fallbacks || {}), ville: e.target.value };
                    updateBlockField(activeBlock.id, 'fallbacks', newFallbacks);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-mono">Fallback pour [source]</label>
                <input
                  type="text"
                  value={data.fallbacks?.source || ''}
                  placeholder="nos membres privilégiés"
                  onChange={(e) => {
                    const newFallbacks = { ...(data.fallbacks || {}), source: e.target.value };
                    updateBlockField(activeBlock.id, 'fallbacks', newFallbacks);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-mono">Fallback pour [nom]</label>
                <input
                  type="text"
                  value={data.fallbacks?.nom || ''}
                  placeholder="cher client"
                  onChange={(e) => {
                    const newFallbacks = { ...(data.fallbacks || {}), nom: e.target.value };
                    updateBlockField(activeBlock.id, 'fallbacks', newFallbacks);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
            </div>

            {/* Niveau HTML & Alignement */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Niveau HTML</label>
                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                  {['h1', 'h2', 'h3'].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => updateBlockField(activeBlock.id, 'tagLevel', lvl)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold uppercase transition ${
                        (data.tagLevel || 'h1') === lvl ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Alignement</label>
                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                  {[
                    { id: 'left', label: 'Gauche' },
                    { id: 'center', label: 'Centre' },
                    { id: 'right', label: 'Droite' }
                  ].map(al => (
                    <button
                      key={al.id}
                      type="button"
                      onClick={() => updateBlockField(activeBlock.id, 'alignment', al.id)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition ${
                        (data.alignment || 'center') === al.id ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {al.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Couleur d'accentuation */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Couleur d'Accentuation du Kicker</label>
              <div className="flex items-center gap-2">
                {[
                  { name: 'Émeraude', color: '#10b981' },
                  { name: 'Indigo', color: '#6366f1' },
                  { name: 'Violet', color: '#8b5cf6' },
                  { name: 'Ambre', color: '#f59e0b' },
                  { name: 'Rose', color: '#f43f5e' }
                ].map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'accentColor', item.color)}
                    style={{ backgroundColor: item.color }}
                    className={`w-6 h-6 rounded-lg transition-transform ${
                      (data.accentColor || '#10b981') === item.color ? 'scale-125 ring-2 ring-white shadow-lg' : 'hover:scale-110 opacity-80'
                    }`}
                    title={item.name}
                  />
                ))}
                <input
                  type="text"
                  value={data.accentColor || '#10b981'}
                  onChange={(e) => updateBlockField(activeBlock.id, 'accentColor', e.target.value)}
                  className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono ml-auto"
                />
              </div>
            </div>

            {/* Simulateur Direct dans l'Éditeur */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase block flex items-center gap-1">
                <Sliders className="w-3 h-3" />
                <span>Simulateur d'Aperçu Rapide (Éditeur)</span>
              </span>
              <p className="text-[10.5px] text-slate-400">
                Prévisualisez immédiatement le rendu pour différentes villes sans changer l'URL du navigateur :
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['Ouagadougou', 'Abidjan', 'Dakar', 'Douala', 'Lomé'].map(city => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      const currentSim = { ...(data.simulationParams || {}) };
                      currentSim.ville = city;
                      updateBlockField(activeBlock.id, 'simulationParams', currentSim);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10.5px] font-medium border transition ${
                      data.simulationParams?.ville === city
                        ? 'bg-indigo-600 border-indigo-400 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {city}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const currentSim = { ...(data.simulationParams || {}) };
                    delete currentSim.ville;
                    updateBlockField(activeBlock.id, 'simulationParams', currentSim);
                  }}
                  className="px-2 py-0.5 rounded-lg text-[10.5px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title="Réinitialiser vers le Fallback"
                >
                  <RotateCcw className="w-3 h-3 inline mr-0.5" />
                  Fallback
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* INSPECTEUR : QUIZ DE MICRO-ENGAGEMENT (QUIZ FUNNEL 2.0)         */}
        {/* ================================================================ */}
        {activeBlock.type === 'quiz_funnel' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-purple-500/40 space-y-1">
              <span className="text-[10px] font-black uppercase text-purple-400 block flex items-center gap-1">
                <Target className="w-3 h-3 text-purple-400" />
                <span>CRO 2.0 • Micro-Engagement</span>
              </span>
              <h4 className="text-xs font-bold text-white">Quiz Funnel Interactif & Offre Dynamique</h4>
              <p className="text-[11px] text-slate-400">
                Posez 3 à 5 questions pour qualifier vos prospects et afficher une offre personnalisée par logique conditionnelle.
              </p>
            </div>

            {/* Titre & Accroches */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Badge Kicker Supérieur</label>
              <input
                type="text"
                value={data.badgeText || ''}
                placeholder="DIAGNOSTIC SUR-MESURE ⚡"
                onChange={(e) => updateBlockField(activeBlock.id, 'badgeText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre Principal du Quiz</label>
              <input
                type="text"
                value={data.title || ''}
                placeholder="Trouvez la Formule Exacte Adaptée à Votre Projet"
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Titre / Consigne</label>
              <textarea
                rows={2}
                value={data.subtitle || ''}
                placeholder="Répondez à quelques questions rapides pour débloquer votre offre sur-mesure..."
                onChange={(e) => updateBlockField(activeBlock.id, 'subtitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white resize-none"
              />
            </div>

            {/* Couleur d'accentuation */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Couleur d'Accentuation du Quiz</label>
              <div className="flex items-center gap-2">
                {[
                  { name: 'Violet', color: '#8b5cf6' },
                  { name: 'Indigo', color: '#6366f1' },
                  { name: 'Émeraude', color: '#10b981' },
                  { name: 'Ambre', color: '#f59e0b' },
                  { name: 'Rose', color: '#f43f5e' }
                ].map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => updateBlockField(activeBlock.id, 'accentColor', item.color)}
                    style={{ backgroundColor: item.color }}
                    className={`w-6 h-6 rounded-lg transition-transform ${
                      (data.accentColor || '#8b5cf6') === item.color ? 'scale-125 ring-2 ring-white shadow-lg' : 'hover:scale-110 opacity-80'
                    }`}
                    title={item.name}
                  />
                ))}
                <input
                  type="text"
                  value={data.accentColor || '#8b5cf6'}
                  onChange={(e) => updateBlockField(activeBlock.id, 'accentColor', e.target.value)}
                  className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono ml-auto"
                />
              </div>
            </div>

            {/* Options CRO d'expérience */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-[10.5px] font-bold text-slate-400 block uppercase">Options d'Expérience CRO</span>
              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.autoAdvance !== false}
                  onChange={(e) => updateBlockField(activeBlock.id, 'autoAdvance', e.target.checked)}
                  className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                />
                <span>Avance automatique fluide après sélection (280ms)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.showUrgencyTimer !== false}
                  onChange={(e) => updateBlockField(activeBlock.id, 'showUrgencyTimer', e.target.checked)}
                  className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                />
                <span>Afficher le compte à rebours d'urgence sur l'offre finale</span>
              </label>

              {/* Mention de Confidentialité & Bas de Page */}
              <div className="pt-1 border-t border-slate-900">
                <label className="block text-[10.5px] font-bold text-slate-400 mb-1">Mention de Confidentialité & Bas de Page</label>
                <input
                  type="text"
                  value={data.footerNotice || ''}
                  placeholder="100% Confidentiel • Résultat calculé en temps réel avec diagnostic instantané"
                  onChange={(e) => updateBlockField(activeBlock.id, 'footerNotice', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Questions Paramétrables (QCM) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                  <span>Questions du Quiz ({(data.questions || []).length})</span>
                </label>
                <span className="text-[10px] text-purple-400 font-semibold">Paramétrage direct</span>
              </div>

              {(data.questions || []).map((q, qIndex) => (
                <div key={q.id || qIndex} className="p-3 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="text-purple-400">Question {qIndex + 1}</span>
                    <span className="text-[10px] text-slate-500">{(q.options || []).length} choix</span>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={q.question || ''}
                      placeholder="Intitulé de la question..."
                      onChange={(e) => {
                        const newQuestions = [...(data.questions || [])];
                        newQuestions[qIndex] = { ...newQuestions[qIndex], question: e.target.value };
                        updateBlockField(activeBlock.id, 'questions', newQuestions);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-medium"
                    />
                  </div>

                  {/* Options de cette question */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Options de réponses :</span>
                    {(q.options || []).map((opt, optIndex) => (
                      <div key={opt.id || optIndex} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={opt.badge || ''}
                          placeholder="🚀"
                          title="Badge ou Émoji"
                          onChange={(e) => {
                            const newQuestions = [...(data.questions || [])];
                            const newOpts = [...(newQuestions[qIndex].options || [])];
                            newOpts[optIndex] = { ...newOpts[optIndex], badge: e.target.value };
                            newQuestions[qIndex] = { ...newQuestions[qIndex], options: newOpts };
                            updateBlockField(activeBlock.id, 'questions', newQuestions);
                          }}
                          className="w-9 bg-slate-900 border border-slate-800 rounded-lg py-1 text-center text-xs text-white"
                        />
                        <input
                          type="text"
                          value={opt.text || ''}
                          placeholder="Texte de l'option..."
                          onChange={(e) => {
                            const newQuestions = [...(data.questions || [])];
                            const newOpts = [...(newQuestions[qIndex].options || [])];
                            newOpts[optIndex] = { ...newOpts[optIndex], text: e.target.value };
                            newQuestions[qIndex] = { ...newQuestions[qIndex], options: newOpts };
                            updateBlockField(activeBlock.id, 'questions', newQuestions);
                          }}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                        />
                        <select
                          value={opt.profile || 'starter'}
                          onChange={(e) => {
                            const newQuestions = [...(data.questions || [])];
                            const newOpts = [...(newQuestions[qIndex].options || [])];
                            newOpts[optIndex] = { ...newOpts[optIndex], profile: e.target.value };
                            newQuestions[qIndex] = { ...newQuestions[qIndex], options: newOpts };
                            updateBlockField(activeBlock.id, 'questions', newQuestions);
                          }}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1 text-[10px] text-purple-300"
                          title="Profil cible de résultat"
                        >
                          <option value="scale">Élite</option>
                          <option value="automation">Pro</option>
                          <option value="starter">Starter</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Configuration des Offres Dynamiques de Résultat (Logique if/else) */}
            <div className="space-y-3 pt-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>Offres Dynamiques par Profil (Résultats)</span>
              </label>

              {(data.outcomes || []).map((outc, outcIndex) => (
                <div key={outc.id || outcIndex} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-400 uppercase tracking-wide">
                      Profil {outc.id === 'scale' ? 'Élite (Croissance)' : outc.id === 'automation' ? 'Pro (Système)' : 'Starter (Découverte)'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">id: {outc.id}</span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Titre de l'Offre / Diagnostic</label>
                    <input
                      type="text"
                      value={outc.headline || outc.title || ''}
                      onChange={(e) => {
                        const newOutcomes = [...(data.outcomes || [])];
                        newOutcomes[outcIndex] = { ...newOutcomes[outcIndex], headline: e.target.value, title: e.target.value };
                        updateBlockField(activeBlock.id, 'outcomes', newOutcomes);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Prix Promo (FCFA)</label>
                      <input
                        type="number"
                        value={outc.promoPrice ?? 35000}
                        onChange={(e) => {
                          const newOutcomes = [...(data.outcomes || [])];
                          newOutcomes[outcIndex] = { ...newOutcomes[outcIndex], promoPrice: Number(e.target.value) };
                          updateBlockField(activeBlock.id, 'outcomes', newOutcomes);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-emerald-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Prix Normal Barré</label>
                      <input
                        type="number"
                        value={outc.originalPrice ?? 65000}
                        onChange={(e) => {
                          const newOutcomes = [...(data.outcomes || [])];
                          newOutcomes[outcIndex] = { ...newOutcomes[outcIndex], originalPrice: Number(e.target.value) };
                          updateBlockField(activeBlock.id, 'outcomes', newOutcomes);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-400 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Texte Bouton CTA</label>
                      <input
                        type="text"
                        value={outc.ctaText || ''}
                        onChange={(e) => {
                          const newOutcomes = [...(data.outcomes || [])];
                          newOutcomes[outcIndex] = { ...newOutcomes[outcIndex], ctaText: e.target.value };
                          updateBlockField(activeBlock.id, 'outcomes', newOutcomes);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Lien d'Action CTA</label>
                      <input
                        type="text"
                        value={outc.ctaLink || '#checkout'}
                        onChange={(e) => {
                          const newOutcomes = [...(data.outcomes || [])];
                          newOutcomes[outcIndex] = { ...newOutcomes[outcIndex], ctaLink: e.target.value };
                          updateBlockField(activeBlock.id, 'outcomes', newOutcomes);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-indigo-300 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Réinitialisation Rapide */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  updateBlockField(activeBlock.id, 'questions', DEFAULT_QUIZ_FUNNEL_DATA.questions);
                  updateBlockField(activeBlock.id, 'outcomes', DEFAULT_QUIZ_FUNNEL_DATA.outcomes);
                  triggerToast('✅ Modèle de Quiz et Offres réinitialisés aux valeurs recommandées !');
                }}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurer les Questions & Offres Standard</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* INSPECTEUR : BANNIÈRE TICKER DÉFILANT & STOCK CRITIQUE          */}
        {/* ================================================================ */}
        {activeBlock.type === 'banner_stock_ticker_marquee' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-400 block">Ruban Scarcity</span>
              <h4 className="text-xs font-bold text-white">Bannière Ticker Défilant 60 FPS</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Message Stock Critique</label>
              <input
                type="text"
                value={data.urgencyText || ''}
                placeholder="Plus que 4 unités réservées pour la région"
                onChange={(e) => updateBlockField(activeBlock.id, 'urgencyText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Stock Restant</label>
                <input
                  type="number"
                  value={data.stockRemaining ?? 4}
                  onChange={(e) => updateBlockField(activeBlock.id, 'stockRemaining', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Stock Total</label>
                <input
                  type="number"
                  value={data.stockTotal ?? 30}
                  onChange={(e) => updateBlockField(activeBlock.id, 'stockTotal', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Notice Livraison Express</label>
              <input
                type="text"
                value={data.deliveryText || ''}
                placeholder="Livraison express 24h & vérification du colis avant paiement"
                onChange={(e) => updateBlockField(activeBlock.id, 'deliveryText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Avis de Garantie</label>
              <input
                type="text"
                value={data.guaranteeText || ''}
                placeholder="Garantie Totale 12 Mois Satisfait ou Remboursé"
                onChange={(e) => updateBlockField(activeBlock.id, 'guaranteeText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Preuve Sociale Récente</label>
              <input
                type="text"
                value={data.liveBuyerText || ''}
                placeholder="Kouassi d'Abidjan a validé sa commande il y a 2 min"
                onChange={(e) => updateBlockField(activeBlock.id, 'liveBuyerText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* INSPECTEUR : BANNIÈRE SPLIT PROMO & JAUGE DE RARÉFACTION        */}
        {/* ================================================================ */}
        {activeBlock.type === 'banner_flash_stock_split' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-pink-500/30 space-y-1">
              <span className="text-[10px] font-black uppercase text-pink-400 block">Jauge & Chrono</span>
              <h4 className="text-xs font-bold text-white">Bannière Split Promo Flash</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre de l'Offre</label>
              <input
                type="text"
                value={data.title || ''}
                placeholder="Offre Spéciale de Clôture"
                onChange={(e) => updateBlockField(activeBlock.id, 'title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Titre d'Urgence</label>
              <textarea
                rows={2}
                value={data.subtitle || ''}
                placeholder="Nos stocks physiques s'épuisent rapidement..."
                onChange={(e) => updateBlockField(activeBlock.id, 'subtitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">% Réclamé</label>
                <input
                  type="number"
                  value={data.claimedPercent ?? 86}
                  onChange={(e) => updateBlockField(activeBlock.id, 'claimedPercent', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Stock Restant</label>
                <input
                  type="number"
                  value={data.stockRemaining ?? 5}
                  onChange={(e) => updateBlockField(activeBlock.id, 'stockRemaining', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Stock Total</label>
                <input
                  type="number"
                  value={data.stockTotal ?? 40}
                  onChange={(e) => updateBlockField(activeBlock.id, 'stockTotal', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Texte Bouton</label>
                <input
                  type="text"
                  value={data.ctaText || ''}
                  placeholder="Bloquer Mon Tarif ➔"
                  onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Lien Bouton</label>
                <input
                  type="text"
                  value={data.ctaLink || '#checkout'}
                  placeholder="#checkout"
                  onChange={(e) => updateBlockField(activeBlock.id, 'ctaLink', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* INSPECTEUR : BANNIÈRE FLOTTANTE BOTTOM BAR                      */}
        {/* ================================================================ */}
        {activeBlock.type === 'banner_floating_sticky_bottom' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-400 block">Barre Bottom Flottante</span>
              <h4 className="text-xs font-bold text-white">Bottom Bar 1-Clic Commande</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nom du Produit / Offre</label>
              <input
                type="text"
                value={data.productTitle || ''}
                placeholder="Pack Élite NaNa Pro"
                onChange={(e) => updateBlockField(activeBlock.id, 'productTitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Prix Promo (FCFA)</label>
                <input
                  type="number"
                  value={data.promoPrice || 0}
                  onChange={(e) => updateBlockField(activeBlock.id, 'promoPrice', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Prix Barré (FCFA)</label>
                <input
                  type="number"
                  value={data.originalPrice || 0}
                  onChange={(e) => updateBlockField(activeBlock.id, 'originalPrice', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte Stock / Urgence</label>
              <input
                type="text"
                value={data.stockText || ''}
                placeholder="Seulement 3 en stock"
                onChange={(e) => updateBlockField(activeBlock.id, 'stockText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">URL Miniature Image</label>
              <input
                type="text"
                value={data.imageUrl || ''}
                placeholder="https://..."
                onChange={(e) => updateBlockField(activeBlock.id, 'imageUrl', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono text-[11px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Texte Bouton</label>
                <input
                  type="text"
                  value={data.ctaText || ''}
                  placeholder="Commander Maintenant"
                  onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Lien Ancre</label>
                <input
                  type="text"
                  value={data.ctaLink || '#checkout'}
                  placeholder="#checkout"
                  onChange={(e) => updateBlockField(activeBlock.id, 'ctaLink', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* INSPECTEUR : HERO STUDIO SHOWCASE 3D                            */}
        {/* ================================================================ */}
        {activeBlock.type === 'hero_studio_showcase_3d' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-1">
              <span className="text-[10px] font-black uppercase text-indigo-400 block">Section Hero Studio</span>
              <h4 className="text-xs font-bold text-white">Hero Studio Showcase 3D</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Pilule Kicker Supérieure</label>
              <input
                type="text"
                value={data.kickerBadge || ''}
                placeholder="NOUVELLE COLLECTION STUDIO PRO"
                onChange={(e) => updateBlockField(activeBlock.id, 'kickerBadge', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre d'Impact Principal (H1)</label>
              <textarea
                rows={2}
                value={data.headline || ''}
                placeholder="Révolutionnez Votre Activité avec Notre Solution"
                onChange={(e) => updateBlockField(activeBlock.id, 'headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Titre Explicatif Persuasif</label>
              <textarea
                rows={3}
                value={data.subheadline || ''}
                placeholder="Rejoignez les milliers d'entrepreneurs..."
                onChange={(e) => updateBlockField(activeBlock.id, 'subheadline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">URL Image Produit / Vitrine</label>
              <input
                type="text"
                value={data.imageUrl || ''}
                placeholder="https://..."
                onChange={(e) => updateBlockField(activeBlock.id, 'imageUrl', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Badge Flottant Remise</label>
              <input
                type="text"
                value={data.floatingBadge || ''}
                placeholder="-45% AUJOURD'HUI"
                onChange={(e) => updateBlockField(activeBlock.id, 'floatingBadge', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Texte Bouton Principal</label>
                <input
                  type="text"
                  value={data.primaryCtaText || ''}
                  placeholder="Commander Maintenant 🚀"
                  onChange={(e) => updateBlockField(activeBlock.id, 'primaryCtaText', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Lien Principal</label>
                <input
                  type="text"
                  value={data.primaryCtaLink || '#checkout'}
                  placeholder="#checkout"
                  onChange={(e) => updateBlockField(activeBlock.id, 'primaryCtaLink', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Texte Bouton Vidéo / Démo</label>
                <input
                  type="text"
                  value={data.secondaryCtaText || ''}
                  placeholder="Voir la Démonstration"
                  onChange={(e) => updateBlockField(activeBlock.id, 'secondaryCtaText', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Lien Vidéo</label>
                <input
                  type="text"
                  value={data.secondaryCtaLink || '#video'}
                  placeholder="#video"
                  onChange={(e) => updateBlockField(activeBlock.id, 'secondaryCtaLink', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte Preuve Sociale Clients</label>
              <input
                type="text"
                value={data.socialProofText || ''}
                placeholder="Rejoint par plus de 12 400 clients satisfaits"
                onChange={(e) => updateBlockField(activeBlock.id, 'socialProofText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* INSPECTEUR : HERO VSL CINÉMATIQUE                               */}
        {/* ================================================================ */}
        {activeBlock.type === 'hero_vsl_cinematic' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-400 block">Section Hero VSL</span>
              <h4 className="text-xs font-bold text-white">Hero VSL Cinématique</h4>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Statut Live</label>
                <input
                  type="text"
                  value={data.liveStatusText || ''}
                  placeholder="DIFFUSION EN DIRECT"
                  onChange={(e) => updateBlockField(activeBlock.id, 'liveStatusText', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Participants Live</label>
                <input
                  type="number"
                  value={data.viewersCount || 342}
                  onChange={(e) => updateBlockField(activeBlock.id, 'viewersCount', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre Accroche Vidéo (H1)</label>
              <textarea
                rows={2}
                value={data.headline || ''}
                placeholder="Comment Transformer Votre Approche en 3 Étapes..."
                onChange={(e) => updateBlockField(activeBlock.id, 'headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Titre d'Introduction</label>
              <textarea
                rows={2}
                value={data.subheadline || ''}
                placeholder="Regardez cette vidéo de démonstration complète..."
                onChange={(e) => updateBlockField(activeBlock.id, 'subheadline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">URL Vidéo (YouTube / MP4 / Vimeo)</label>
              <input
                type="text"
                value={data.videoUrl || ''}
                placeholder="https://..."
                onChange={(e) => updateBlockField(activeBlock.id, 'videoUrl', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte Tarif / Annonce Réduction</label>
              <input
                type="text"
                value={data.priceText || ''}
                placeholder="29 000 FCFA au lieu de 60 000 FCFA"
                onChange={(e) => updateBlockField(activeBlock.id, 'priceText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte Bouton Commande</label>
              <input
                type="text"
                value={data.ctaText || ''}
                placeholder="Obtenir Mon Accès Immédiat au Tarif Réduit ➔"
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
              />
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* INSPECTEUR : HERO MINIMALIST LUXURY                             */}
        {/* ================================================================ */}
        {activeBlock.type === 'hero_luxury_signature' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-400 block">Section Hero Prestige</span>
              <h4 className="text-xs font-bold text-white">Hero Minimalist Luxury</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Badge d'Édition</label>
              <input
                type="text"
                value={data.editionBadge || ''}
                placeholder="COLLECTION PRIVILÈGE • ÉDITION LIMITÉE"
                onChange={(e) => updateBlockField(activeBlock.id, 'editionBadge', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre Noble (H1)</label>
              <textarea
                rows={2}
                value={data.headline || ''}
                placeholder="Le Joyau d'Excellence et d'Élégance Absolue"
                onChange={(e) => updateBlockField(activeBlock.id, 'headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-serif font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte d'Orfèvre</label>
              <textarea
                rows={3}
                value={data.subheadline || ''}
                placeholder="Chaque détail a été façonné avec une précision d'orfèvre..."
                onChange={(e) => updateBlockField(activeBlock.id, 'subheadline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Prix Prestige (FCFA)</label>
                <input
                  type="number"
                  value={data.price || 0}
                  onChange={(e) => updateBlockField(activeBlock.id, 'price', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Prix Barré (FCFA)</label>
                <input
                  type="number"
                  value={data.originalPrice || 0}
                  onChange={(e) => updateBlockField(activeBlock.id, 'originalPrice', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Pilule VIP Numérotée</label>
              <input
                type="text"
                value={data.vipPill || ''}
                placeholder="Exemplaire N° 084 / 200"
                onChange={(e) => updateBlockField(activeBlock.id, 'vipPill', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">URL Image Produit Haute Définition</label>
              <input
                type="text"
                value={data.imageUrl || ''}
                placeholder="https://..."
                onChange={(e) => updateBlockField(activeBlock.id, 'imageUrl', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte Bouton Prestige</label>
              <input
                type="text"
                value={data.ctaText || ''}
                placeholder="Réserver Mon Coffret Numéroté 👑"
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
              />
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* INSPECTEUR : HERO DIRECT CONVERSION ENGINE                      */}
        {/* ================================================================ */}
        {activeBlock.type === 'hero_lead_conversion_engine' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-400 block">Section Hero Réponse Directe</span>
              <h4 className="text-xs font-bold text-white">Hero Direct Conversion Engine</h4>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Score Étoiles</label>
                <input
                  type="text"
                  value={data.ratingScore || ''}
                  placeholder="4.95 / 5"
                  onChange={(e) => updateBlockField(activeBlock.id, 'ratingScore', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre d'Avis</label>
                <input
                  type="text"
                  value={data.reviewCount || ''}
                  placeholder="2 840 clients satisfaits"
                  onChange={(e) => updateBlockField(activeBlock.id, 'reviewCount', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Titre Accrocheur (Bénéfice Clé)</label>
              <textarea
                rows={2}
                value={data.headline || ''}
                placeholder="Multipliez Vos Ventes avec Notre Solution..."
                onChange={(e) => updateBlockField(activeBlock.id, 'headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sous-Titre de Réassurance</label>
              <textarea
                rows={2}
                value={data.subheadline || ''}
                placeholder="Commandez en 1 clic sans compte compliqué..."
                onChange={(e) => updateBlockField(activeBlock.id, 'subheadline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Prix Promo (FCFA)</label>
                <input
                  type="number"
                  value={data.price || 0}
                  onChange={(e) => updateBlockField(activeBlock.id, 'price', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Prix Barré (FCFA)</label>
                <input
                  type="number"
                  value={data.originalPrice || 0}
                  onChange={(e) => updateBlockField(activeBlock.id, 'originalPrice', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Message d'Urgence Stock</label>
              <input
                type="text"
                value={data.urgencyText || ''}
                placeholder="Plus que 5 packs disponibles au tarif promotionnel"
                onChange={(e) => updateBlockField(activeBlock.id, 'urgencyText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">URL Image Produit</label>
              <input
                type="text"
                value={data.imageUrl || ''}
                placeholder="https://..."
                onChange={(e) => updateBlockField(activeBlock.id, 'imageUrl', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Texte Bouton Commande Directe</label>
              <input
                type="text"
                value={data.ctaText || ''}
                placeholder="Commander avec Wave / Orange Money ➔"
                onChange={(e) => updateBlockField(activeBlock.id, 'ctaText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
              />
            </div>
          </div>
        )}

        {/* Action rapide supprimer / dupliquer */}
        <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const idx = canvasBlocks.findIndex(b => b.id === activeBlock.id);
              if (idx !== -1) duplicateBlock(idx);
            }}
            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <DuplicateIcon className="w-3.5 h-3.5" />
            <span>Dupliquer</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const idx = canvasBlocks.findIndex(b => b.id === activeBlock.id);
              if (idx !== -1) deleteBlock(idx);
            }}
            className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
            title="Supprimer ce module"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 7. STRUCTURE COMPLÈTE DU BUILDER (3 COLONNES INDÉPENDANTES & MODE APERÇU)
  // ==========================================================================
  return (
    <div className={isPublicView
      ? "min-h-screen w-full bg-[#030610] flex flex-col font-sans select-none text-slate-100 overflow-y-auto"
      : "fixed inset-0 z-[100] h-screen h-[100dvh] max-h-screen w-screen max-w-[100vw] overflow-hidden bg-[#030610] flex flex-col font-sans select-none text-slate-100 animate-in fade-in duration-300"
    }>
      
      {/* ================================================================== */}
      {/* 1. EN-TÊTE FIXE DU BUILDER (STICKY TOP-0)                         */}
      {/* ================================================================== */}
      {!isPublicView && (
      <header className="sticky top-0 z-40 h-16 w-full px-4 bg-slate-900/95 border-b border-slate-800/80 flex items-center justify-between shrink-0 backdrop-blur-xl shadow-2xl select-none">
        
        {/* Identité & Nom du Tunnel */}
        <div className="flex items-center gap-2.5">
          {/* Bouton de Retour Dashboard */}
          <button
            type="button"
            onClick={() => {
              try { playTapBeep(); } catch (e) {}
              if (onClose) onClose();
            }}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
            title="Retour au Tableau de Bord"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline text-xs font-bold">Retour</span>
          </button>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white font-black shrink-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white" />
          </div>

          <div className="truncate">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <img src="/favicon.ico" alt="Nanasore" className="w-5 h-5 object-contain" />
                <h1 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5">
                  <span>Nana Funnel Studio 3.0</span>
                  <span className="text-indigo-400">⚡</span>
                </h1>
              </div>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Moteur Modulaire Actif
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              <span className="text-indigo-400 font-semibold">{activePage?.name || 'Page de Vente'}</span> • {canvasBlocks.length} Sections Empilées
            </p>
          </div>
        </div>

        {/* ================================================================ */}
        {/* LE SWITCHER DE PAGES DU FUNNEL (MENU DÉROULANT PAGE ACTUELLE)    */}
        {/* ================================================================ */}
        <div className="relative mx-2" ref={pageSwitcherRef}>
          <button
            type="button"
            onClick={() => setIsPageSwitcherOpen(prev => !prev)}
            className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition shadow-lg cursor-pointer ${
              isPageSwitcherOpen
                ? 'bg-slate-950 border-indigo-500/80 text-white ring-2 ring-indigo-500/20'
                : 'bg-slate-950/80 hover:bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white'
            }`}
            title="Changer d'étape dans le tunnel de vente"
          >
            <div className="flex items-center gap-1.5 min-w-0 text-left">
              <span className="text-indigo-400 font-medium text-[11px] hidden sm:inline">Page actuelle :</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
              <span className="text-white font-extrabold text-xs truncate max-w-[110px] sm:max-w-[160px] md:max-w-[200px]">
                {activePage?.name || 'Page de Vente'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 hidden md:inline shrink-0">
                {activePage?.path || '/vente'}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isPageSwitcherOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Menu déroulant des étapes du funnel */}
          {isPageSwitcherOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-2 w-72 sm:w-84 bg-slate-900/95 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-800 mb-1">
                <span>Étapes du Tunnel ({funnelPages.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsPageSwitcherOpen(false);
                    setSettingsActiveTab('funnel_steps');
                    setIsSettingsModalOpen(true);
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-bold text-[10px] cursor-pointer"
                >
                  Gérer ⚙️
                </button>
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                {funnelPages.map((page, idx) => {
                  const isActive = page.id === activePageId;
                  const pageTypeNames = {
                    sales: 'Vente',
                    optin: 'Capture',
                    checkout: 'Paiement',
                    upsell: 'Upsell',
                    downsell: 'Downsell',
                    thankyou: 'Confirmation'
                  };
                  return (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => {
                        setActivePageId(page.id);
                        setSelectedBlockId(page.blocks?.[0]?.id || null);
                        setIsPageSwitcherOpen(false);
                        try { playTapBeep(); } catch (e) {}
                      }}
                      className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition cursor-pointer text-xs ${
                        isActive
                          ? 'bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 font-black shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-black shrink-0 ${
                          isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{page.name}</span>
                            {isActive && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="font-mono text-indigo-400/80">{page.path}</span>
                            <span>•</span>
                            <span>{page.blocks?.length || 0} modules</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[9.5px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0 ml-1.5">
                        {pageTypeNames[page.type] || page.type}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 mt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsPageSwitcherOpen(false);
                    setSettingsActiveTab('funnel_steps');
                    setIsSettingsModalOpen(true);
                    setIsAddStepModalOpen(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Ajouter une nouvelle page</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* CONTRÔLES A/B TESTING & POPUP EXIT-INTENT                        */}
        {/* ================================================================ */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Switcher ou Créateur de Test A/B */}
          {activePage?.hasAbTest ? (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-indigo-500/40 shadow-inner">
              <span className="hidden xl:inline text-[10px] font-black uppercase tracking-wider text-indigo-400 px-1.5">
                Split Test :
              </span>
              <button
                type="button"
                onClick={() => handleSwitchVariant('A')}
                className={`px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  activeVariant === 'A'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Variante A (Contrôle original)"
              >
                <span>Variante A</span>
                <span className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                  activeVariant === 'A' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'
                }`}>
                  50%
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchVariant('B')}
                className={`px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  activeVariant === 'B'
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Variante B (Challenger du test A/B)"
              >
                <span>Variante B</span>
                <span className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                  activeVariant === 'B' ? 'bg-white/20 text-white font-bold' : 'bg-slate-900 text-slate-400'
                }`}>
                  50%
                </span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCreateAbTest}
              className="px-2.5 sm:px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-indigo-300 border border-slate-800 hover:border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Créer un test A/B : duplique la Variante A vers la Variante B"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Créer Test A/B</span>
              <span className="text-[10px] px-1 rounded bg-indigo-500/20 text-indigo-300 font-mono">Split</span>
            </button>
          )}

          {/* Bouton Édition Popup Exit-Intent */}
          <button
            type="button"
            onClick={() => {
              setIsEditingPopup(prev => !prev);
              try { playTapBeep(); } catch (e) {}
            }}
            className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border shadow-sm ${
              isEditingPopup
                ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-600/40 ring-2 ring-rose-500/30'
                : 'bg-slate-950 hover:bg-rose-950/30 text-rose-300 hover:text-rose-200 border-slate-800 hover:border-rose-500/40'
            }`}
            title="Personnaliser le Popup Exit-Intent qui retient les visiteurs"
          >
            <Flame className={`w-3.5 h-3.5 ${isEditingPopup ? 'text-white animate-pulse' : 'text-rose-400'}`} />
            <span className="hidden sm:inline">
              {isEditingPopup ? 'Quitter Popup' : '🔥 Éditer Popup Exit-Intent'}
            </span>
            <span className="sm:hidden">
              {isEditingPopup ? 'Popup ✕' : '🔥 Popup'}
            </span>
          </button>
        </div>

        {/* Actions Principales du Constructeur */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Bouton Gabarits Prêts à l'Emploi */}
          <button
            type="button"
            onClick={() => setShowTemplatesModal(true)}
            className="px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Gabarits 1-Clic</span>
          </button>

          {/* Bouton Paramètres Globaux du Funnel (Visibles directement sur l'espace de travail) */}
          <button
            type="button"
            onClick={() => {
              setInspectorTab('global');
              setSelectedBlockId(null);
              setIsSettingsOpen(true);
              try { playTapBeep(); } catch (e) {}
              triggerToast('⚙️ Paramètres du funnel affichés sur l\'espace de travail !');
            }}
            className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
            title="Afficher les Paramètres du Funnel sur l'Espace de Travail (Thème, SEO, Sous-Domaine)"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Paramètres</span>
            <span>⚙️</span>
          </button>

          {/* Mode Aperçu Visiteur */}
          <button
            type="button"
            onClick={() => {
              setViewMode(viewMode === 'builder' ? 'preview' : 'builder');
              try { playTapBeep(); } catch (e) {}
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              viewMode === 'preview'
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white'
            }`}
            title="Tester le rendu exactement comme vos visiteurs"
          >
            {viewMode === 'preview' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{viewMode === 'preview' ? 'Quitter Aperçu' : 'Aperçu Direct'}</span>
          </button>

          {/* Bouton Lien Public Court */}
          <a
            href={publicFunnelDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-700/60 shadow-sm"
            title={`Ouvrir le lien direct public du tunnel : ${publicFunnelDirectUrl}`}
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Lien Direct</span>
          </a>

          {/* Export Code / JSON */}
          <button
            type="button"
            onClick={handleExportJson}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-700/60 shadow-sm"
            title="Exporter la structure complète au format JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden lg:inline">Export JSON</span>
          </button>

          {/* Bouton Sauvegarder */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/30 cursor-pointer"
          >
            {saveStatus === 'saving' ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : saveStatus === 'saved' ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saveStatus === 'saved' ? 'Enregistré ✓' : 'Sauvegarder'}</span>
          </button>

          {/* Bouton Fermer */}
          <button
            type="button"
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
      )}

      {/* Notification Toast */}
      {toastMessage && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/95 border border-indigo-500/50 text-indigo-300 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* 2. ESPACE DE TRAVAIL MODULAIRE EN 3 COLONNES                       */}
      {/* ================================================================== */}
      <div className="flex-1 min-h-0 h-full w-full flex overflow-hidden relative">
        
        {/* ================================================================ */}
        {/* COLONNE GAUCHE : BIBLIOTHÈQUE DE MODULES DIVI (TIROIR MOBILE / FIXE DESKTOP) */}
        {/* ================================================================ */}
        {viewMode === 'builder' && (
          <>
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
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-200">
                      MODULES NANASORE
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      {DIVI_MODULES_CATALOG.length} Gabarits
                    </span>
                    {/* Bouton Fermer sur Mobile */}
                    <button
                      type="button"
                      onClick={() => setIsModulesOpen(false)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition lg:hidden cursor-pointer"
                      title="Fermer la liste des modules"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              {/* Recherche de modules */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={searchModuleQuery}
                  onChange={(e) => setSearchModuleQuery(e.target.value)}
                  placeholder="Chercher (Urgence, Hero, VSL, Prix, Checkout...)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-600 transition"
                />
              </div>
            </div>

            {/* Liste des modules déplaçables - Défilement indépendant façon macOS */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2.5 custom-scrollbar">
              <p className="text-[11px] text-slate-400 font-medium px-1 flex items-center gap-1">
                <MousePointer className="w-3 h-3 text-indigo-400" />
                <span>Glissez un module vers la page longue :</span>
              </p>

              {DIVI_MODULES_CATALOG
                .filter(m => m.name.toLowerCase().includes(searchModuleQuery.toLowerCase()) || m.description.toLowerCase().includes(searchModuleQuery.toLowerCase()))
                .map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <div
                      key={mod.type}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, mod)}
                      onDragEnd={handleDragEnd}
                      className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/40 transition-all duration-200 cursor-grab active:cursor-grabbing group shadow-sm flex flex-col gap-1.5 select-none relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="font-bold text-xs text-white group-hover:text-indigo-300 transition">
                            {mod.name}
                          </h4>
                        </div>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {mod.badge}
                        </span>
                      </div>

                      <p className="text-[10.5px] text-slate-400 leading-relaxed line-clamp-2">
                        {mod.description}
                      </p>

                      <div className="pt-1.5 flex items-center justify-between border-t border-slate-800/60 text-[10px] text-slate-500">
                        <span>Glisser vers le Canvas</span>
                        <button
                          type="button"
                          onClick={() => {
                            insertBlockAtIndex(mod, canvasBlocks.length);
                            setIsModulesOpen(false); // Ferme automatiquement le tiroir sur mobile
                            try { playValidationBeep(); } catch (e) {}
                            triggerToast(`✅ Module "${mod.name}" ajouté en bas de page !`);
                            setTimeout(() => {
                              if (canvasScrollRef.current) {
                                canvasScrollRef.current.scrollTo({
                                  top: canvasScrollRef.current.scrollHeight,
                                  behavior: 'smooth'
                                });
                              }
                            }, 100);
                          }}
                          className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Ajouter</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Pied fixe d'information */}
            <div className="p-3 bg-slate-950 border-t border-slate-800/80 text-[10.5px] text-slate-400 text-center shrink-0">
              <span>Moteur Nana • 12 Blocs Opérationnels</span>
            </div>

          </aside>
          </>
        )}

        {/* ================================================================ */}
        {/* COLONNE CENTRALE : LE CANVAS DE LA PAGE LONGUE (SCROLL INFINI)    */}
        {/* ================================================================ */}
        <main
          className="flex-1 w-full min-h-0 h-full max-h-full bg-[#02050e] flex flex-col overflow-hidden relative"
          onDragOver={handleCanvasDragOver}
          onDragEnter={handleCanvasDragEnter}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
        >
          {/* Barre d'Outils du Canvas (Sélecteur d'Écran Responsive - réservé au Builder, jamais affiché aux clients) */}
          {!isPublicView && viewMode === 'builder' && (
            <div className="h-12 px-4 sm:px-6 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between shrink-0 backdrop-blur-sm z-20">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Structure du Tunnel :</span>
                <span className="text-white bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                  {canvasBlocks.length} Modules Actifs
                </span>
              </div>

              {/* Sélecteur de périphérique */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    previewDevice === 'desktop' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Aperçu Grand Écran"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Desktop</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    previewDevice === 'tablet' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Aperçu Tablette Tactile"
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tablette</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    previewDevice === 'mobile' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Aperçu Smartphone"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mobile</span>
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* BARRE EXTÉRIEURE DE PARAMÈTRES DU FUNNEL (DIRECTEMENT VISIBLE)    */}
          {/* ================================================================ */}
          {viewMode === 'builder' && !isPublicView && (
            <div className="w-full bg-slate-900/90 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between gap-3 flex-wrap shrink-0 backdrop-blur-md z-20 shadow-sm">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 shrink-0">
                  <Settings className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Paramètres Funnel :</span>
                </div>
                <input
                  type="text"
                  value={funnelSettings.funnelName || ''}
                  onChange={(e) => setFunnelSettings(prev => ({ ...prev, funnelName: e.target.value }))}
                  placeholder="Nom du tunnel de vente..."
                  className="bg-slate-950/90 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-bold flex-1 min-w-[150px]"
                  title="Nom du tunnel de vente (visible en direct sur l'espace de travail)"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Statut du Funnel */}
                <div className="flex items-center gap-1 bg-slate-950/90 p-0.5 rounded-xl border border-slate-800 text-[10.5px] font-bold">
                  <span className="text-slate-400 px-1 text-[9.5px] uppercase font-extrabold hidden md:inline">Statut :</span>
                  {[
                    { id: 'published', label: 'En ligne 🟢' },
                    { id: 'draft', label: 'Brouillon 🟡' },
                    { id: 'maintenance', label: 'Pause 🔴' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setFunnelSettings(prev => ({ ...prev, funnelStatus: st.id }));
                        try { playTapBeep(); } catch (e) {}
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] transition cursor-pointer ${
                        funnelSettings.funnelStatus === st.id
                          ? 'bg-slate-800 text-white font-black shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* Bouton pour déployer les paramètres complets dans l'inspecteur latéral */}
                <button
                  type="button"
                  onClick={() => {
                    setInspectorTab('global');
                    setSelectedBlockId(null);
                    setIsSettingsOpen(true);
                    try { playTapBeep(); } catch (e) {}
                  }}
                  className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[11px] font-black flex items-center gap-1 transition cursor-pointer shadow-sm active:scale-95"
                  title="Modifier tous les paramètres à l'extérieur dans l'inspecteur"
                >
                  <Sliders className="w-3 h-3 text-amber-400" />
                  <span>Tous les Paramètres</span>
                </button>
              </div>
            </div>
          )}

          {/* Espace de Rendu du Canvas - Défilement infini avec marge de respiration étendue en bas */}
          <div
            ref={canvasScrollRef}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
            className={`flex-1 overflow-y-auto h-full min-h-0 overscroll-contain flex flex-col items-center custom-scrollbar relative ${
              isPublicView
                ? 'p-0 sm:p-4 pb-20'
                : 'p-4 sm:p-8 pb-48 sm:pb-64'
            }`}
          >
            {/* Bannière flottante d'aide au drop */}
            {isDraggingActive && !isPublicView && viewMode === 'builder' && (
              <div className="sticky top-2 z-40 mx-auto w-fit px-4 py-1.5 rounded-full bg-indigo-600 text-white font-black text-xs shadow-2xl shadow-indigo-600/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 mb-4">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Déposez n'importe où dans le Canvas pour empiler en bas</span>
              </div>
            )}

            {/* Bannière Mode Édition Popup Exit-Intent */}
            {isEditingPopup && (
              <div className="sticky top-2 z-40 w-full max-w-2xl mx-auto mb-5 p-4 rounded-2xl bg-slate-900/95 border-2 border-rose-500/80 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                    <Flame className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-black text-white truncate">
                        Éditeur de Popup Exit-Intent
                      </h3>
                      <span className="text-[10px] font-mono font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">
                        Mode Popup
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 truncate">
                      Personnalisez les modules qui retiennent le visiteur avant qu'il ne quitte votre boutique.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingPopup(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer shrink-0 border border-slate-700 hover:border-rose-500/50"
                >
                  Quitter Mode Popup ✕
                </button>
              </div>
            )}

            {/* Conteneur de la Page Longue ou du Popup avec adaptation responsive automatique */}
            <div
              onDragOver={handleCanvasDragOver}
              onDrop={handleCanvasDrop}
              className={`transition-all duration-300 h-fit min-h-full relative ${
                isEditingPopup
                  ? 'w-full max-w-2xl rounded-3xl border-2 border-rose-500/70 shadow-[0_25px_90px_rgba(244,63,94,0.25)] bg-slate-950 ring-4 ring-rose-500/20 pb-20'
                  : isPublicView || viewMode === 'preview'
                  ? 'w-full max-w-4xl mx-auto rounded-none sm:rounded-3xl border-0 sm:border sm:border-slate-800/80 shadow-none sm:shadow-2xl bg-slate-950 overflow-hidden pb-16'
                  : previewDevice === 'mobile'
                  ? 'w-full max-w-[390px] rounded-[44px] border-[8px] border-slate-800 shadow-[0_30px_90px_rgba(0,0,0,0.8)] bg-slate-950 ring-1 ring-slate-700/60 pb-56 sm:pb-72'
                  : previewDevice === 'tablet'
                  ? 'w-full max-w-[720px] rounded-3xl border-2 border-slate-800 shadow-2xl bg-slate-950 pb-56 sm:pb-72'
                  : 'w-full max-w-4xl rounded-3xl border border-slate-800/80 shadow-2xl bg-slate-950 pb-56 sm:pb-72'
              } ${
                isDraggingActive ? 'ring-2 ring-indigo-500/40 shadow-[0_0_50px_rgba(99,102,241,0.1)]' : ''
              }`}
            >
              {/* Header simulé de la modale Popup en mode édition */}
              {isEditingPopup && (
                <div className="p-4 border-b border-rose-500/30 bg-rose-950/20 flex items-center justify-between rounded-t-3xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                      Modale Exit-Intent ({popupBlocks.length} sections empilées)
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 opacity-60">
                    <X className="w-4 h-4" />
                  </div>
                </div>
              )}

              {/* BALISE DE STYLE DYNAMIQUE : INJECTION CSS EN TEMPS RÉEL (0ms) */}
              {customCSS && (
                <style>{customCSS}</style>
              )}

              {/* Encoche smartphone si mode mobile en mode builder uniquement */}
              {!isEditingPopup && previewDevice === 'mobile' && !isPublicView && viewMode === 'builder' && (
                <div className="h-6 bg-slate-900 flex items-center justify-center border-b border-slate-800/60">
                  <div className="w-24 h-3.5 bg-black rounded-full" />
                </div>
              )}

              {/* Zone de Dépôt Supérieure Permissive (si mode builder) */}
              {viewMode === 'builder' && (
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
                      ? 'h-16 bg-gradient-to-b from-indigo-500/20 to-transparent border-b-2 border-indigo-500 flex items-center justify-center'
                      : isDraggingActive
                      ? 'h-10 border-b border-dashed border-indigo-500/40 bg-indigo-500/[0.03] flex items-center justify-center'
                      : 'h-2 hover:h-6 opacity-0 hover:opacity-100 flex items-center justify-center'
                  }`}
                >
                  {(isDraggingActive || dropTargetZone === 'top') && (
                    <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1 rounded-full transition shadow-sm ${
                      dropTargetZone === 'top'
                        ? 'bg-indigo-600 text-white shadow-indigo-600/30 animate-pulse'
                        : 'bg-slate-900/90 text-indigo-400 border border-indigo-500/30'
                    }`}>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Insérer au tout début de la page</span>
                    </span>
                  )}
                </div>
              )}

              {/* Si aucun bloc, afficher une zone d'accueil permissive */}
              {canvasBlocks.length === 0 && (
                <div
                  onDragOver={handleCanvasDragOver}
                  onDrop={handleCanvasDrop}
                  className="p-12 text-center flex flex-col items-center justify-center space-y-4 border-2 border-dashed border-slate-800 rounded-3xl m-6 bg-slate-900/30 cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                    <Plus className="w-8 h-8" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h3 className="text-sm font-black text-white">Votre Page Longue est Prête</h3>
                    <p className="text-xs text-slate-400">
                      Glissez n'importe quel module depuis la colonne de gauche et lâchez-le ici pour commencer l'empilement.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                    ⚡ Glissez-déposez votre premier module
                  </span>
                </div>
              )}

              {/* Empilement des Modules de la Page Longue avec marge de respiration (pb-40) */}
              <div className="divide-y divide-slate-800/40 pb-40">
                {canvasBlocks.map((block, index) => {
                  const isSelected = String(block.id) === String(selectedBlockId) && viewMode === 'builder';
                  const isHoveredDropZone = dropTargetZone === index + 1;
                  const condEval = evaluateBlockConditions(block);

                  return (
                    <React.Fragment key={block.id}>
                      <CanvasBlockItem
                        block={block}
                        index={index}
                        totalBlocks={canvasBlocks.length}
                        isSelected={isSelected}
                        viewMode={viewMode}
                        condEval={condEval}
                        onSelect={handleSelectBlock}
                        onMoveUp={handleMoveBlockUp}
                        onMoveDown={handleMoveBlockDown}
                        onDuplicate={handleDuplicateBlock}
                        onDelete={handleDeleteBlock}
                        renderBlock={renderBlockWYSIWYG}
                        activeProduct={activeProduct}
                        liveSeconds={liveSeconds}
                      />

                      {/* Zone de Dépôt Inter-Blocs Permissive (si mode builder) */}
                      {viewMode === 'builder' && (
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
                              ? 'h-14 bg-gradient-to-r from-indigo-500/15 via-indigo-500/25 to-indigo-500/15 border-y-2 border-indigo-500'
                              : isDraggingActive
                              ? 'h-9 border-y border-dashed border-indigo-500/30 bg-indigo-500/[0.02]'
                              : 'h-2 hover:h-6'
                          }`}
                        >
                          {(isDraggingActive || isHoveredDropZone) && (
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold transition shadow-sm ${
                              isHoveredDropZone
                                ? 'bg-indigo-600 text-white scale-105 shadow-indigo-600/30'
                                : 'bg-slate-900/90 text-indigo-400 border border-indigo-500/20'
                            }`}>
                              <Plus className="w-3 h-3" />
                              <span>Insérer ici ⚡</span>
                            </div>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* INJECTION HTML BRUT PERSONNALISÉ (SHORTCODES, FORMULAIRES EXTERNES, SCRIPTS) */}
              {customHTML && (
                <div className="mx-4 sm:mx-6 my-4 p-4 rounded-2xl bg-slate-900/60 border border-indigo-500/30 shadow-xl overflow-hidden transition-all">
                  {viewMode === 'builder' && (
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-indigo-500/20 text-[11px] font-mono text-indigo-400">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Code2 className="w-3.5 h-3.5" />
                        <span>HTML / Shortcodes / Scripts (Nœud DOM Injecté)</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">dangerouslySetInnerHTML</span>
                    </div>
                  )}
                  <div
                    className="w-full text-slate-200 overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: customHTML }}
                  />
                </div>
              )}

              {/* Grande Zone de Dépôt Inférieure (Empilement "Coller en bas") */}
              {viewMode === 'builder' && !isPublicView && (
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
                    onDrop={handleCanvasDrop}
                    onClick={() => {
                      const firstMod = DIVI_MODULES_CATALOG[0];
                      if (firstMod) {
                        insertBlockAtIndex(firstMod, canvasBlocks.length);
                        try { playValidationBeep(); } catch (err) {}
                      }
                    }}
                    className={`w-full h-40 rounded-3xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-6 text-center cursor-pointer group select-none ${
                      dropTargetZone === 'bottom'
                        ? 'border-indigo-400 bg-indigo-500/15 text-indigo-200 scale-[1.01] shadow-2xl shadow-indigo-500/20 ring-4 ring-indigo-500/20'
                        : isDraggingActive
                        ? 'border-indigo-500/60 bg-indigo-500/[0.04] text-indigo-300 ring-2 ring-indigo-500/20 animate-pulse'
                        : 'border-slate-800 hover:border-indigo-500/50 bg-slate-900/40 hover:bg-slate-900/70 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-110 ${
                      dropTargetZone === 'bottom'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40'
                        : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                    }`}>
                      <Plus className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
                      <span>Zone de Dépôt Permanente (h-40)</span>
                      <span className="text-indigo-400">⚡</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Glissez et déposez n'importe quel module ici pour l'empiler tout en bas de la page.
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10.5px] font-semibold text-indigo-400/80 bg-indigo-500/10 px-3 py-0.5 rounded-full border border-indigo-500/20">
                      <ArrowDown className="w-3 h-3" />
                      <span>Drop Zone h-40 • Défilement infini</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Barre Sticky Mobile CTA de Bas de Page (pour conversions extrêmes sur smartphone) */}
              {funnelSettings.enableStickyMobileBar && (previewDevice === 'mobile' || isPublicView) && (
                <div className="sticky bottom-0 z-40 bg-slate-950/95 border-t border-slate-800 p-3 backdrop-blur-md flex items-center justify-between gap-3 shadow-2xl">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block leading-tight">Offre Spéciale :</span>
                    <span className="text-xs font-black text-emerald-400 font-mono">
                      {formatCFA(activeProduct.price || 24500)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleProceedToPrimaryCheckout()}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Commander ⚡</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        </main>

        {/* ================================================================ */}
        {/* COLONNE DROITE : L'INSPECTEUR EN DIRECT (TIROIR MOBILE / FIXE DESKTOP) */}
        {/* ================================================================ */}
        {viewMode === 'builder' && (
          <>
            {/* Backdrop sombre sur mobile */}
            {isSettingsOpen && (
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
                onClick={() => setIsSettingsOpen(false)}
              />
            )}

            <aside
              className={`fixed inset-y-0 right-0 z-50 w-[92vw] sm:w-96 max-w-md lg:relative lg:translate-x-0 lg:w-88 lg:sm:w-96 lg:shrink-0 h-full max-h-full bg-slate-900/95 border-l border-slate-800/80 flex flex-col shadow-2xl backdrop-blur-md overflow-hidden select-none transform transition-transform duration-300 ease-in-out ${
                isSettingsOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none lg:pointer-events-auto lg:translate-x-0'
              }`}
            >
              {/* En-tête fixe de l'inspecteur : Bascule Mode Visuel / Mode Code */}
              <div className="border-b border-slate-800/80 p-2.5 bg-slate-950/70 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/90 flex-1">
                    <button
                      type="button"
                      onClick={() => setInspectorMode('visual')}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        inspectorMode === 'visual'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Mode Visuel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInspectorMode('code')}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        inspectorMode === 'code'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Mode Code</span>
                    </button>
                  </div>

                  {/* Bouton Fermer sur Mobile */}
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition lg:hidden cursor-pointer shrink-0"
                    title="Fermer l'inspecteur"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sous-onglets Mode Visuel uniquement */}
                {inspectorMode === 'visual' && (
                  <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setInspectorTab('content')}
                      className={`flex-1 py-1 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                        inspectorTab === 'content'
                          ? 'bg-slate-800 text-indigo-400 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Type className="w-3 h-3" />
                      <span>Contenu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInspectorTab('style')}
                      className={`flex-1 py-1 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                        inspectorTab === 'style'
                          ? 'bg-slate-800 text-indigo-400 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Palette className="w-3 h-3" />
                      <span>Style</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInspectorTab('conditions')}
                      className={`flex-1 py-1 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                        inspectorTab === 'conditions'
                          ? 'bg-slate-800 text-indigo-400 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Conditions d'Affichage Dynamiques du Bloc"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Conditions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInspectorTab('global')}
                      className={`flex-1 py-1 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                        inspectorTab === 'global'
                          ? 'bg-slate-800 text-emerald-400 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ArrowDown className="w-3 h-3" />
                      <span>Funnel</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Corps défilable de l'inspecteur */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 custom-scrollbar">
                {inspectorMode === 'visual' ? (
                  renderInspectorFields()
                ) : (
                  /* MODE CODE NATIVE LEAN (Lazy-loaded via React.lazy) */
                  <Suspense fallback={
                    <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span>Chargement du Mode Code...</span>
                    </div>
                  }>
                    <FunnelCodeEditor
                      customCSS={customCSS}
                      setCustomCSS={setCustomCSS}
                      customHTML={customHTML}
                      setCustomHTML={setCustomHTML}
                    />
                  </Suspense>
                )}
              </div>


            </aside>
          </>
        )}

      </div>

      {/* ================================================================== */}
      {/* BOUTONS FLOTTANTS (FAB) MOBILE : ACCÈS UNIFIÉ SANS COLLISION (lg:hidden) */}
      {/* ================================================================== */}
      {viewMode === 'builder' && !isPublicView && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[60] lg:hidden flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-700/80 shadow-[0_12px_40px_rgba(0,0,0,0.85)] max-w-[96vw] overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setIsModulesOpen(true);
              setIsSettingsOpen(false);
              try { playTapBeep(); } catch (e) {}
            }}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black text-xs flex items-center gap-1 shadow-md active:scale-95 transition cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Modules</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSettingsOpen(true);
              setIsModulesOpen(false);
              try { playTapBeep(); } catch (e) {}
            }}
            className="px-3 py-2 rounded-xl bg-slate-800 text-white font-black text-xs flex items-center gap-1 border border-slate-700 active:scale-95 transition cursor-pointer shadow-sm shrink-0"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Éditer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsToolboxOpen(prev => !prev);
              try { playTapBeep(); } catch (e) {}
            }}
            className="px-2.5 py-2 rounded-xl bg-slate-800 text-indigo-300 font-bold text-xs flex items-center gap-1 border border-slate-700 active:scale-95 transition cursor-pointer shrink-0"
            title="Outils Pro"
          >
            <span>🧰</span>
            <span>Outils</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsIconLibraryOpen(true);
              try { playTapBeep(); } catch (e) {}
            }}
            className="px-2.5 py-2 rounded-xl bg-slate-800 text-sky-300 font-bold text-xs flex items-center gap-1 border border-slate-700 active:scale-95 transition cursor-pointer shrink-0"
            title="Icônes NaNa"
          >
            <span>💎</span>
            <span>Icônes</span>
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* 4. BOUTONS FLOTTANTS HUB INTÉGRATION & BIBLIOTHÈQUE (DESKTOP SEUL) */}
      {/* ================================================================== */}
      {viewMode === 'builder' && !isPublicView && (
        <div className="hidden lg:flex fixed bottom-6 left-6 z-[60] items-center gap-2.5">
          {/* Bouton 1 : Boîte à Outils Pro */}
          <button
            type="button"
            onClick={() => {
              setIsToolboxOpen(prev => !prev);
              try { playTapBeep(); } catch (e) {}
            }}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs shadow-[0_12px_40px_rgba(99,102,241,0.4)] hover:shadow-[0_16px_50px_rgba(99,102,241,0.6)] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2.5 cursor-pointer border border-indigo-400/40 select-none group"
            title="Ouvrir la Boîte à Outils Pro (Hub d'Intégration)"
          >
            <div className="w-7 h-7 rounded-xl bg-slate-950 text-indigo-400 flex items-center justify-center font-bold text-sm shadow-md group-hover:rotate-12 transition-transform">
              🧰
            </div>
            <div className="text-left leading-tight">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-indigo-200">
                Hub Intégration
              </span>
              <span className="block text-xs font-black text-white tracking-tight">
                Boîte à Outils Pro
              </span>
            </div>
          </button>

          {/* Bouton 2 : 💎 Icônes NaNa (Bibliothèque Duotone Pro) */}
          <button
            type="button"
            onClick={() => {
              setIsIconLibraryOpen(true);
              try { playTapBeep(); } catch (e) {}
            }}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-black text-xs shadow-[0_12px_40px_rgba(37,99,235,0.5)] hover:shadow-[0_16px_50px_rgba(37,99,235,0.7)] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2.5 cursor-pointer border border-blue-300/40 select-none group"
            title="Ouvrir la Bibliothèque d'Icônes NaNa (Duotone Pro)"
          >
            <div className="w-7 h-7 rounded-xl bg-slate-950 text-sky-400 flex items-center justify-center font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
              💎
            </div>
            <div className="text-left leading-tight">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-blue-200">
                Illustrations Duotone
              </span>
              <span className="block text-xs font-black text-white tracking-tight">
                Icônes NaNa
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* TIROIR RÉTRACTABLE : LA BOÎTE À OUTILS PRO (ACCORDÉON DRAG & DROP) */}
      {/* ================================================================== */}
      {isToolboxOpen && (
        <Suspense fallback={null}>
          <ToolboxDrawer
            isOpen={isToolboxOpen}
            onClose={() => setIsToolboxOpen(false)}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onInsertTool={(tool) => {
              insertBlockAtIndex(tool, canvasBlocks.length);
              try { playValidationBeep(); } catch (err) {}
              triggerToast(`✅ Outil Pro "${tool.name}" empilé en bas de page !`);
              setTimeout(() => {
                if (canvasScrollRef.current) {
                  canvasScrollRef.current.scrollTo({
                    top: canvasScrollRef.current.scrollHeight,
                    behavior: 'smooth'
                  });
                }
              }, 100);
            }}
          />
        </Suspense>
      )}

      {/* ================================================================== */}
      {/* MODALE INDÉPENDANTE : BIBLIOTHÈQUE D'ICÔNES NANA DUOTONE           */}
      {/* ================================================================== */}
      {isIconLibraryOpen && (
        <Suspense fallback={null}>
          <NanaIconLibraryModal
            isOpen={isIconLibraryOpen}
            onClose={() => {
              setIsIconLibraryOpen(false);
              setIconPickerTargetBlockId(null);
            }}
            onDragStart={handleDragStart}
            onSelectIcon={(tool) => {
              if (iconPickerTargetBlockId) {
                updateBlockField(iconPickerTargetBlockId, 'iconId', tool.data.iconId);
                updateBlockField(iconPickerTargetBlockId, 'iconName', tool.data.iconName);
                if (tool.data.title) updateBlockField(iconPickerTargetBlockId, 'title', tool.data.title);
                if (tool.data.caption) updateBlockField(iconPickerTargetBlockId, 'caption', tool.data.caption);
                try { playValidationBeep(); } catch (err) {}
                triggerToast(`💎 Icône mise à jour : "${tool.name}"`);
                setIconPickerTargetBlockId(null);
              } else {
                insertBlockAtIndex(tool, canvasBlocks.length);
                try { playValidationBeep(); } catch (err) {}
                triggerToast(`💎 Icône NaNa "${tool.name}" ajoutée en bas de page !`);
                setTimeout(() => {
                  if (canvasScrollRef.current) {
                    canvasScrollRef.current.scrollTo({
                      top: canvasScrollRef.current.scrollHeight,
                      behavior: 'smooth'
                    });
                  }
                }, 100);
              }
              setIsIconLibraryOpen(false);
            }}
          />
        </Suspense>
      )}

      {/* Pop-up interactif de confirmation Cash on Delivery (Test Live) */}
      {codConfirmOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-500/60 rounded-3xl p-6 shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg">
              <Truck className="w-7 h-7 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-white">🎉 Commande à la Livraison Enregistrée !</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Votre colis est en cours de préparation par notre entrepôt. Un agent logistique vous contacte sous 15 minutes par appel / WhatsApp pour convenir de l'heure exacte.
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Règlement :</span>
                <span className="text-emerald-400 font-bold">Espèces au livreur</span>
              </div>
              <div className="flex justify-between">
                <span>Délai :</span>
                <span className="text-white font-bold">24h - 48h ouvrées</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCodConfirmOpen(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer"
            >
              Compris, merci ! ✓
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL : GABARITS CLÉS-EN-MAIN 1-CLIC                              */}
      {/* ================================================================== */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-black text-white">Gabarits de Funnels Complets 1-Clic</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Chargez une architecture complète éprouvée. Tous les modules seront automatiquement pré-remplis avec les données de votre produit et prêts à convertir.
            </p>

            <div className="space-y-3">
              {PREMADE_FUNNEL_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 transition flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{tpl.name}</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        {tpl.types.length} modules
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400">{tpl.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadPremadeTemplate(tpl)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shrink-0 cursor-pointer shadow-lg shadow-indigo-600/25"
                  >
                    Charger ⚡
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL : PARAMÈTRES GLOBAUX DU FUNNEL (LE CERVEAU DE CONVERSION)    */}
      {/* ================================================================== */}
      {isSettingsModalOpen && (
        <Suspense fallback={null}>
          <FunnelSettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            funnelSettings={funnelSettings}
            setFunnelSettings={setFunnelSettings}
            funnelPages={funnelPages}
            activePageId={activePageId}
            setActivePageId={setActivePageId}
            setSelectedBlockId={setSelectedBlockId}
            movePage={movePage}
            deletePage={deletePage}
            updatePageMeta={updatePageMeta}
            setIsAddStepModalOpen={setIsAddStepModalOpen}
            triggerToast={triggerToast}
            activeProduct={activeProduct}
            canvasBlocks={canvasBlocks}
            onSave={async (savedPayload) => {
              if (savedPayload?.settings) {
                setFunnelSettings(savedPayload.settings);
              }
              await handleSave();
            }}
          />
        </Suspense>
      )}

      {/* ================================================================== */}
      {/* POPUP MODALE : AJOUTER UNE NOUVELLE ÉTAPE AU FUNNEL                */}
      {/* ================================================================== */}
      {isAddStepModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/90 rounded-3xl p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] space-y-5 animate-in zoom-in-95 duration-150">
            {/* En-tête */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white font-black shadow-md shadow-indigo-500/20">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Ajouter une étape au Funnel</h3>
                  <p className="text-[11px] text-slate-400">Configurez le type et le nom de votre nouvelle page.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStepModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStep} className="space-y-4">
              {/* 1. Type de page */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Type d'Étape
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'optin', name: 'Capture', desc: 'Lead Magnet / Ebook' },
                    { id: 'sales', name: 'Vente', desc: 'Page Principale' },
                    { id: 'checkout', name: 'Paiement', desc: 'Bon de commande' },
                    { id: 'upsell', name: 'Upsell', desc: 'Offre VIP 1-Clic' },
                    { id: 'downsell', name: 'Downsell', desc: 'Alternative Promo' },
                    { id: 'thankyou', name: 'Confirmation', desc: 'Page de Merci' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setNewStepType(t.id);
                        if (!newStepName) {
                          const defaultNames = {
                            optin: 'Page de Capture',
                            sales: 'Page de Vente',
                            checkout: 'Bon de Commande',
                            upsell: 'Mon Upsell VIP',
                            downsell: 'Offre Spéciale Downsell',
                            thankyou: 'Confirmation & Remerciement'
                          };
                          const def = defaultNames[t.id];
                          setNewStepName(def);
                          setNewStepPath(slugifyPath(def));
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        newStepType === t.id
                          ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300 font-bold ring-1 ring-indigo-500/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{t.name}</div>
                      <div className="text-[10px] text-slate-500">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Nom de la page */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nom de la Page
                </label>
                <input
                  type="text"
                  required
                  value={newStepName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewStepName(val);
                    setNewStepPath(slugifyPath(val));
                  }}
                  placeholder="Ex: Mon Upsell VIP"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-600 transition"
                  autoFocus
                />
              </div>

              {/* 3. Chemin URL (auto-généré et modifiable) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Chemin URL (Généré automatiquement)
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus-within:border-indigo-600">
                  <span className="text-slate-500 font-mono select-none">promo.nana.ci</span>
                  <input
                    type="text"
                    value={newStepPath}
                    onChange={(e) => setNewStepPath(e.target.value)}
                    placeholder="/mon-upsell-vip"
                    className="w-full bg-transparent font-mono text-indigo-300 text-xs focus:outline-none ml-1"
                  />
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStepModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs shadow-lg shadow-indigo-600/25 transition cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Créer l'Étape 🚀</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ================================================================== */}
      {/* POPUP EXIT-INTENT : RENDU MODAL VISITEUR (MODE APERÇU DIRECT)      */}
      {/* ================================================================== */}
      {isExitPopupOpen && viewMode === 'preview' && (
        <div className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 border-2 border-rose-500/70 rounded-3xl shadow-[0_25px_90px_rgba(244,63,94,0.35)] custom-scrollbar animate-in zoom-in-95 duration-200">
            {/* Bouton Fermer le Popup */}
            <button
              type="button"
              onClick={() => setIsExitPopupOpen(false)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-slate-900/90 hover:bg-rose-950 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-white transition cursor-pointer shadow-lg"
              title="Fermer le popup"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Badge d'urgence Exit-Intent */}
            <div className="px-6 pt-5 pb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-400">
                Offre Spéciale de Sortie • Réservée aux Visiteurs Directs
              </span>
            </div>

            {/* Blocs du Popup avec rendu WYSIWYG */}
            <div className="divide-y divide-slate-800/60">
              {popupBlocks.map((block) => (
                <div key={block.id} className="relative">
                  {renderBlockWYSIWYG(block)}
                </div>
              ))}
            </div>

            {/* Pied du Popup */}
            <div className="p-4 bg-slate-900/80 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={() => setIsExitPopupOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                Non merci, je renonce à mon offre exclusive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bouton Flottant pour Déclencher / Tester le Popup Exit-Intent en mode Preview (Admin uniquement) */}
      {viewMode === 'preview' && !isPublicView && (
        <div className="fixed bottom-5 right-5 z-[60]">
          <button
            type="button"
            onClick={() => {
              setIsExitPopupOpen(true);
              try { playCashChime(); } catch (err) {}
              triggerToast('🎯 Popup Exit-Intent déclenché manuellement !');
            }}
            className="px-4 py-2.5 rounded-full bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-black text-xs shadow-2xl shadow-rose-600/40 border border-rose-400/50 flex items-center gap-2 transition cursor-pointer hover:scale-105"
            title="Tester l'affichage du Popup Exit-Intent"
          >
            <Flame className="w-4 h-4" />
            <span>Tester Popup Exit-Intent 🎯</span>
          </button>
        </div>
      )}

      {/* Caisse Checkout Principale Sebpay Intégrée avec pré-remplissage 100% automatique */}
      {isPrimaryCheckoutOpen && (
        <Suspense fallback={null}>
          <UltimateCheckout
            isModal={true}
            isOpen={isPrimaryCheckoutOpen}
            product={checkoutProductPayload || {
              id: activeProduct?.id,
              name: activeProduct?.name || 'Offre Spéciale',
              price: Number(activeProduct?.price) || 25000,
              imageUrl: activeProduct?.image || '',
              quantity: 1
            }}
            amount={Number(checkoutProductPayload?.price || activeProduct?.price) || 25000}
            currency="FCFA"
            orderDescription={`Commande : ${checkoutProductPayload?.name || activeProduct?.name || 'Offre Spéciale'}`}
            defaultCustomerName={simulatedCheckout.fullName}
            defaultPhone={simulatedCheckout.phone}
            defaultAddress={simulatedCheckout.city}
            onClose={() => setIsPrimaryCheckoutOpen(false)}
            onCancel={() => setIsPrimaryCheckoutOpen(false)}
            onSuccess={() => {
              setIsPrimaryCheckoutOpen(false);
              setOrderConfirmed(true);
              triggerToast('🎉 Paiement validé avec succès ! Félicitations.');
            }}
          />
        </Suspense>
      )}

    </div>
  );
};

export default FunnelBuilder;
