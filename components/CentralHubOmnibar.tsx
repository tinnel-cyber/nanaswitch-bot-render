import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../src/lib/supabase';
import { APPS_REGISTRY, searchAppsRegistry, AppRegistryItem } from '../src/data/appsRegistry';
import { useActiveOmnibarApps } from '../src/hooks/useActiveOmnibarApps';
import { toggleModuleStatus } from '../src/services/moduleActivationService';
import { OFFICIAL_MODULES, getOfficialModuleById, getModuleByRoute, AppModule } from '../src/config/appRegistry';
import { 
  Search, 
  X, 
  Play, 
  Zap, 
  Star, 
  ArrowRight, 
  Video, 
  Image as ImageIcon, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  ExternalLink,
  Boxes,
  Check,
  Plus,
  Compass,
  ChevronDown,
  ChevronUp,
  Eye,
  Lock,
  ShieldAlert,
  CreditCard
} from 'lucide-react';
import { SlideModuleBlock } from './SlideModuleBlock';
import {
  evaluateClientModuleAccess,
  getLocalUserLicense,
  consumeWalletForPayPerUse,
  buyModuleAlaCarte,
  getUniverseRequiredCta,
} from '../src/services/contextualLicensingService';

export interface HubCardItem {
  id: string;
  title: string;
  description: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  routeUrl?: string;
  subtitle?: string;
  palmares?: string;
  trialBadge?: string;
  tutorialUrl?: string;
  trialType?: 'credits' | 'time_trial' | 'freemium' | string;
  priceMonthly?: number;
  targetView?: string;
  isRootApp?: boolean;
  linkedModuleIds?: string[];
  isActivated?: boolean;
  blocks?: any[];
}

export interface HubRowItem {
  id?: string;
  rowTitle: string;
  cards: HubCardItem[];
}

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to?: string;
}

export const Link: React.FC<LinkProps> = ({ to = '#', onClick, children, className = '', ...rest }) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
    }
    if (to && to !== '#') {
      if (to.startsWith('http://') || to.startsWith('https://')) {
        return;
      }
      e.preventDefault();
      try {
        window.history.pushState({}, '', to);
        window.dispatchEvent(new PopStateEvent('popstate'));
        window.dispatchEvent(new CustomEvent('app_navigate', { detail: { path: to } }));
      } catch (_) {
        window.location.href = to;
      }
    }
  };

  return (
    <a href={to || '#'} onClick={handleClick} className={className} {...rest}>
      {children}
    </a>
  );
};

export interface CentralHubOmnibarProps {
  onNavigate?: (view: string) => void;
  onOpenApp?: (app: any) => void;
  onOpenCreateUniverse?: (moduleInfo?: { id: string; name: string; type?: string }) => void;
  className?: string;
  placeholder?: string;
}

// REGISTRE OFFICIEL DE LA SUITE CAISSE ENREGISTREUSE & POS NANA (GARANTIE DE CHARGEMENT PERMANENT)
export const OFFICIAL_POS_CORE_APP: HubCardItem & { subtitle?: string; rowTitle?: string } = {
  id: 'pos-caisse-core',
  title: 'Caisse Tactile & Point de Vente (POS)',
  subtitle: 'Caisse Magasin Offline • Encaissement Comptoir',
  palmares: 'N°1 des Ventes • POS Certifié',
  description: 'Interface tactile ultra-rapide pour encaissement comptoir, tickets de caisse, lecteur code-barres, gestion multi-vendeurs et synchronisation automatique hors-ligne.',
  mediaType: 'image',
  mediaUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&auto=format&fit=crop&q=80',
  routeUrl: '/dashboard/apps/pos',
  targetView: 'POS',
  trialBadge: 'Inclus • Illimité',
  isRootApp: true,
  rowTitle: 'Commerce & Caisse (POS)',
  linkedModuleIds: [
    'mod_credit_book',
    'mod_barcode_scanner',
    'mod_cashier_sessions',
    'mod_offline_sync'
  ]
};

export const OFFICIAL_POS_MODULES: HubCardItem[] = [
  {
    id: 'mod_pos_closing',
    title: 'Clôture Journalière & Rapport Z de Caisse',
    subtitle: 'Comptabilité de Caisse',
    palmares: 'Indispensable',
    description: 'Génération instantanée du Z de caisse, comptage des espèces, réconciliation Mobile Money (Wave, Orange, Moov) et exportation PDF.',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    routeUrl: '/dashboard/apps/pos-closing',
    targetView: 'POS',
    trialBadge: 'Inclus'
  },
  {
    id: 'mod_receipt_printer',
    title: 'Imprimante Ticket Thermique (58/80mm)',
    subtitle: 'Matériel & Périphériques',
    palmares: 'Bluetooth / USB',
    description: 'Impression automatique des tickets de caisse, duplicatas et factures proforma avec en-tête personnalisée et logo.',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1607344645866-009c320b5ab8?w=600&auto=format&fit=crop&q=80',
    routeUrl: '/dashboard/apps/receipt-printer',
    targetView: 'SETTINGS',
    trialBadge: 'Prêt'
  },
  {
    id: 'mod_credit_book',
    title: 'Carnet de Dettes & Ventes à Crédit',
    subtitle: 'Gestion des Créances Clients',
    palmares: 'Relances WhatsApp',
    description: 'Enregistrement des ardoises et crédits clients directement depuis la caisse avec rappels automatiques SMS et WhatsApp.',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
    routeUrl: '/dashboard/apps/credit-book',
    targetView: 'DEBT_BOOK',
    trialBadge: 'Actif'
  },
  {
    id: 'mod_barcode_scanner',
    title: 'Scanner Code-Barres & Douchette Laser',
    subtitle: 'Saisie Ultra-Rapide',
    palmares: 'Caméra & USB',
    description: 'Bip ultra-rapide des articles en rayon, gestion des codes EAN-13, QR codes et saisie automatique au panier sans contact.',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    routeUrl: '/dashboard/apps/barcode-scanner',
    targetView: 'POS',
    trialBadge: 'Inclus'
  },
  {
    id: 'mod_cashier_sessions',
    title: 'Multi-Caissiers & Gestion des Shifts',
    subtitle: 'Sécurité & Traçabilité',
    palmares: 'Anti-Fraude',
    description: 'Attribution de fonds de caisse individuels, code PIN par caissier, audit des écarts et historique complet des annulations.',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&auto=format&fit=crop&q=80',
    routeUrl: '/dashboard/apps/cashier-sessions',
    targetView: 'SETTINGS',
    trialBadge: 'Sécurisé'
  },
  {
    id: 'mod_offline_sync',
    title: 'Mode Secours Hors-Ligne (Offline First)',
    subtitle: 'Résilience Réseau',
    palmares: 'Zéro Coupure',
    description: 'Continuez d\'encaisser vos clients même en cas de panne internet ou coupure réseau, avec synchronisation automatique au retour de la connexion.',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
    routeUrl: '/dashboard/apps/pos',
    targetView: 'POS',
    trialBadge: 'Garanti'
  }
];

export const cleanUrl = (url: string | undefined): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  const match = trimmed.match(/\((https?:\/\/[^\)]+)\)/);
  const resolved = match ? match[1] : trimmed.replace(/^\[(.*?)\]$/, '$1').trim();
  return resolved;
};

export const cleanCategoryName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/\s*\(\s*IA\s*&\s*WhatsApp\s*\)/gi, '')
    .replace(/\s*\(\s*IA\s*\)/gi, '')
    .trim();
};

export const MODULE_THUMBNAILS: Record<string, string> = {
  // Caisse & Point de Vente (POS)
  'app-pos': 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=600&auto=format&fit=crop&q=80',
  'pos-caisse-core': 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=600&auto=format&fit=crop&q=80',
  'mod-pos': 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=600&auto=format&fit=crop&q=80',
  'mod_pos_closing': 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
  'mod_receipt_printer': 'https://images.unsplash.com/photo-1607344645866-009c320b5ab8?w=600&auto=format&fit=crop&q=80',
  'mod_credit_book': 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
  'mod_barcode_scanner': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
  'mod_cashier_sessions': 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&auto=format&fit=crop&q=80',
  'mod_offline_sync': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
  'mod-inventory': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
  'mod-debts': 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
  
  // LMS, Éducation, Campus & Formation
  'srv-lms-marketplace': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
  'lms-marketplace': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
  'app-cours-forge': 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&auto=format&fit=crop&q=80',
  'cours-forge': 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&auto=format&fit=crop&q=80',
  'srv-certificates': 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&auto=format&fit=crop&q=80',
  'official-cert': 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&auto=format&fit=crop&q=80',
  'srv-academy': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80',
  'nana-academy': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80',
  
  // Commerce en Ligne, Vitrine & Social
  'app-studio': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=80',
  'app-wameet': 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
  'app-nanagenerator': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  'app-ultimate-funnel': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
  'app-docusign': 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
  'app-webinar': 'https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=600&auto=format&fit=crop&q=80',
  'app-nanamarket': 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&auto=format&fit=crop&q=80',
  'srv-crm-automation': 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80'
};

export const getCardMediaUrl = (card: any): string => {
  if (!card) return '';
  const clean = cleanUrl(card.mediaUrl || card.imageUrl);
  if (clean && clean.length > 5) return clean;
  if (card.appLogo && card.appLogo.length > 5) return card.appLogo;
  if (card.slides && card.slides.length > 0 && card.slides[0]?.imageUrl) return cleanUrl(card.slides[0].imageUrl);
  if (card.blocks && Array.isArray(card.blocks)) {
    const slider = card.blocks.find((b: any) => b?.type === 'image_slider');
    if (slider?.slides?.[0]?.imageUrl) return cleanUrl(slider.slides[0].imageUrl);
    const img = card.blocks.find((b: any) => b?.type === 'image');
    if (img?.url || img?.imageUrl) return cleanUrl(img.url || img.imageUrl);
  }
  const id = String(card.id || '').toLowerCase();
  if (MODULE_THUMBNAILS[id]) return MODULE_THUMBNAILS[id];
  const title = String(card.title || card.name || '').toLowerCase();
  for (const [key, url] of Object.entries(MODULE_THUMBNAILS)) {
    const simpleKey = key.replace(/^(app-|srv-|mod[-_])/, '');
    if (simpleKey.length > 2 && (id.includes(simpleKey) || title.includes(simpleKey))) {
      return url;
    }
  }
  if (title.includes('lms') || title.includes('marketplace')) return MODULE_THUMBNAILS['lms-marketplace'];
  if (title.includes('certificat') || title.includes('qr')) return MODULE_THUMBNAILS['official-cert'];
  if (title.includes('académie') || title.includes('tutoriel') || title.includes('video')) return MODULE_THUMBNAILS['nana-academy'];
  if (title.includes('caisse') || title.includes('pos')) return MODULE_THUMBNAILS['app-pos'];
  if (title.includes('stock') || title.includes('inventaire')) return MODULE_THUMBNAILS['mod-inventory'];
  if (title.includes('cours') || title.includes('forge') || title.includes('centre')) return MODULE_THUMBNAILS['app-cours-forge'];
  if (title.includes('live') || title.includes('webinar')) return MODULE_THUMBNAILS['app-webinar'];
  return 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=600&auto=format&fit=crop&q=80';
};

export interface ExpandableModuleDescriptionProps {
  id?: string;
  description?: string;
  className?: string;
  defaultClamped?: string;
}

export const ExpandableModuleDescription: React.FC<ExpandableModuleDescriptionProps> = ({
  id,
  description,
  className = "",
  defaultClamped = "line-clamp-2"
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description) return null;

  const isLong = description.length > 50;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      onClick={isLong ? handleToggle : undefined}
      className={`group/desc mt-1 select-text transition-all duration-200 ${isLong ? 'cursor-pointer' : ''} ${className}`}
      title={isLong ? (isExpanded ? "Cliquer pour replier" : "Cliquer pour déballer le texte complet") : undefined}
    >
      <div className="relative">
        <p
          className={`text-xs text-slate-300 leading-relaxed font-normal transition-colors ${
            isExpanded
              ? 'text-slate-100 whitespace-pre-line bg-slate-950/80 p-2.5 rounded-lg border border-blue-500/40 shadow-lg ring-1 ring-blue-500/20'
              : `${defaultClamped} group-hover/desc:text-white`
          }`}
        >
          {description}
        </p>

        {isLong && (
          <div className="flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handleToggle}
              className={`inline-flex items-center gap-1 text-[10.5px] font-bold transition-all px-1.5 py-0.5 rounded cursor-pointer ${
                isExpanded
                  ? 'text-blue-300 hover:text-white bg-blue-500/20 border border-blue-500/40 mt-1'
                  : 'text-blue-400 group-hover/desc:text-cyan-300 hover:underline'
              }`}
            >
              <span>{isExpanded ? 'Réduire' : 'Lire la suite...'}</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export interface OmnibarItemProps {
  block: any;
  index?: number;
  searchQuery?: string;
  hoveredCardId?: string | null;
  setHoveredCardId?: (id: string | null) => void;
  checkedModules?: Record<string, boolean>;
  toggleModuleCheck?: (id: string) => void;
  onOpenTutorial?: (e: React.MouseEvent, url?: string) => void;
  onActivateModule?: (e: React.MouseEvent, mod: any, linkedIds?: string[]) => void;
  isModuleActive?: (id: string) => boolean;
  onToggleModule?: (id: string, targetStatus?: boolean) => Promise<boolean>;
  onClose?: () => void;
}

export const OmnibarItem: React.FC<OmnibarItemProps> = ({
  block,
  index = 0,
  searchQuery = '',
  hoveredCardId,
  setHoveredCardId,
  checkedModules: externalCheckedModules,
  toggleModuleCheck: externalToggleModuleCheck,
  onOpenTutorial,
  onActivateModule,
  isModuleActive,
  onToggleModule,
  onClose,
}) => {
  const [localHoveredId, setLocalHoveredId] = useState<string | null>(null);
  const [localChecked, setLocalChecked] = useState<Record<string, boolean>>({});

  const currentHoveredId = hoveredCardId !== undefined ? hoveredCardId : localHoveredId;
  const setHovered = (id: string | null) => {
    if (setHoveredCardId) setHoveredCardId(id);
    else setLocalHoveredId(id);
  };

  const isChecked = (id: string) =>
    externalCheckedModules ? !!externalCheckedModules[id] : !!localChecked[id];

  const handleToggleCheck = (id: string) => {
    if (externalToggleModuleCheck) externalToggleModuleCheck(id);
    else setLocalChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTutorial = (e: React.MouseEvent, url?: string) => {
    if (onOpenTutorial) {
      onOpenTutorial(e, url);
    } else if (url) {
      window.open(cleanUrl(url), '_blank');
    } else {
      alert("Ce module dispose d'un tutoriel vidéo interactif bientôt disponible !");
    }
  };

  const handleActivate = (e: React.MouseEvent, mod: any, linkedIds?: string[]) => {
    if (onActivateModule) {
      onActivateModule(e, mod, linkedIds);
    } else {
      if (mod.routeUrl && mod.routeUrl !== '#') {
        window.history.pushState({}, '', mod.routeUrl);
        window.dispatchEvent(new PopStateEvent('popstate'));
        window.dispatchEvent(new CustomEvent('app_navigate', { detail: { path: mod.routeUrl } }));
      }
      alert(`⚡ Module « ${mod.title || 'App'} » activé avec succès !`);
      if (onClose) onClose();
    }
  };

  const q = (searchQuery || '').trim().toLowerCase();

  // Helper d'extraction d'une carte
  const extractCard = (c: any, cIdx: number) => {
    const rawBlocks = Array.isArray(c?.blocks) ? c.blocks : [];
    const h = rawBlocks.find((b: any) => b?.type === 'header');
    const d = rawBlocks.find((b: any) => b?.type === 'description');
    const m = rawBlocks.find((b: any) => b?.type === 'image' || b?.type === 'video');
    const slider = rawBlocks.find((b: any) => b?.type === 'image_slider');
    const cta = rawBlocks.find((b: any) => b?.type === 'cta');

    const title = c?.title || h?.title || 'Module';
    const subtitle = c?.subtitle || h?.badge || c?.palmares || '';
    const palmares = c?.palmares || h?.badge || '';
    const description = c?.description || d?.text || '';
    const rawUrl = c?.mediaUrl || c?.imageUrl || m?.url || m?.imageUrl || slider?.slides?.[0]?.imageUrl || '';
    const mediaUrl = cleanUrl(rawUrl);
    const mediaType = c?.mediaType || (m?.type === 'video' || mediaUrl.includes('.mp4') ? 'video' : 'image');
    const tutorialUrl = c?.tutorialUrl || cta?.tutorialUrl || '';
    const trialBadge = c?.trialBadge || cta?.trialBadge || '';
    const routeUrl = c?.routeUrl || (c?.id === 'card-2' ? '/dashboard/apps/pos' : c?.id === 'card-1' ? '/dashboard/apps/ai-generator' : '');
    const linkedModuleIds = c?.linkedModuleIds || cta?.linkedModuleIds || [];
    const isRootApp = Boolean(c?.isRootApp || (linkedModuleIds && linkedModuleIds.length > 0));

    return {
      id: c?.id || `card-${index}-${cIdx}`,
      title,
      subtitle,
      palmares,
      description,
      mediaUrl,
      mediaType,
      tutorialUrl,
      trialBadge,
      routeUrl,
      linkedModuleIds,
      isRootApp
    };
  };

  // Déterminer si le block est une Rangée (Row)
  const rawCards: any[] = Array.isArray(block?.cards)
    ? block.cards
    : block?.cards && typeof block.cards === 'object'
    ? Object.values(block.cards)
    : [];

  const isRow = rawCards.length > 0 || Boolean(block?.rowTitle);

  if (isRow) {
    const rowTitle = block?.rowTitle || block?.title || `Section ${index + 1}`;
    const allCards = rawCards.map(extractCard);

    // Filtrage sur la requête si active
    const matchingCards = q
      ? allCards.filter(
          (c) =>
            rowTitle.toLowerCase().includes(q) ||
            c.title.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.palmares.toLowerCase().includes(q) ||
            c.subtitle.toLowerCase().includes(q)
        )
      : allCards;

    if (q && matchingCards.length === 0) return null;

    // Détection de l'Application Principale (BLOC 1)
    const rootCard = allCards.find((c) => c.isRootApp);
    const companionCards = rootCard
      ? allCards.filter((c) => c.id !== rootCard.id && (rootCard.linkedModuleIds.includes(c.id) || !c.isRootApp))
      : [];

    return (
      <div className="space-y-4 bg-slate-900/40 p-4 sm:p-5 rounded-2xl border border-slate-800/80 mb-6">
        {/* Titre de Section / Rangée */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2.5">
            <Boxes className="w-4 h-4 text-[#4169E1]" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
              {rowTitle}
            </h3>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
            {allCards.length} module{allCards.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* CAS A : Rangée avec Application Racine (BLOC 1 + BLOC 2) */}
        {rootCard && (!q || matchingCards.some((c) => c.id === rootCard.id)) ? (
          <div className="space-y-4">
            {/* BLOC 1 : APPLICATION PRINCIPALE */}
            <div 
              onMouseEnter={() => setHovered(rootCard.id)}
              onMouseLeave={() => setHovered(null)}
              className="bg-[#28283D] border border-emerald-500/50 rounded-xl p-5 hover:border-emerald-400 transition-all shadow-xl shadow-emerald-500/5 cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <a 
                    href={rootCard.routeUrl || '#'} 
                    onClick={(e) => {
                      e.preventDefault();
                      if (onClose) onClose();
                      handleActivate(e, rootCard);
                    }} 
                    className="text-base sm:text-lg font-black text-blue-400 hover:text-blue-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.85)] hover:underline transition-all flex items-center gap-2 cursor-pointer"
                    style={{ textShadow: '0 0 10px rgba(59, 130, 246, 0.8)' }}
                  >
                    <span>{rootCard.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider bg-blue-500/15 text-blue-300 border border-blue-400/30 shadow-xs shadow-blue-500/10 shrink-0">
                      [{getTaxonomyBadge(rootCard)}]
                    </span>
                    <ExternalLink className="w-4 h-4 text-blue-400 shrink-0" />
                    {rootCard.trialBadge && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20 no-underline">
                        {rootCard.trialBadge}
                      </span>
                    )}
                  </a>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Module Racine
                    </span>
                    {rootCard.palmares && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/25 shrink-0">
                        {rootCard.palmares}
                      </span>
                    )}
                  </div>
                </div>
                {rootCard.subtitle && <p className="text-xs text-slate-400">{rootCard.subtitle}</p>}
                <ExpandableModuleDescription 
                  id={rootCard.id}
                  description={rootCard.description}
                  defaultClamped="line-clamp-3"
                  className="mt-2"
                />
                {rootCard.blocks?.some((b: any) => b.type === 'image_slider') && (
                  <div className="mt-3">
                    {rootCard.blocks.filter((b: any) => b.type === 'image_slider').map((sb: any) => (
                      <SlideModuleBlock
                        key={sb.id}
                        id={sb.id}
                        settings={sb.slideSettings || { autoplay: true, interval: 4000, aspectRatio: 'wide' }}
                        slides={sb.slides || []}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-3 pt-3 border-t border-slate-700/80">

                <div className="flex items-center gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTutorial(e, rootCard.tutorialUrl);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-600 transition cursor-pointer active:scale-98"
                  >
                    ▶️ Voir le Tutoriel
                  </button>
                  
                  {isModuleActive && isModuleActive(rootCard.id) ? (
                    <div className="flex items-center gap-2 flex-1">
                      <button 
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (onToggleModule) await onToggleModule(rootCard.id, false);
                        }}
                        className="px-4 py-2 bg-emerald-950/60 hover:bg-rose-950/60 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer group"
                        title="Désactiver ce module"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:hidden" />
                        <X className="w-4 h-4 text-rose-400 hidden group-hover:inline" />
                        <span className="group-hover:hidden">✓ Actif</span>
                        <span className="hidden group-hover:inline">Désactiver</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivate(e, rootCard);
                        }}
                        className="flex-1 px-4 py-2 bg-[#4169E1] hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-lg shadow-[#4169E1]/20 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
                      >
                        <span>Ouvrir {rootCard.title}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const selectedMods = companionCards.filter((m) => isChecked(m.id)).map((m) => m.id);
                        if (onToggleModule) {
                          await onToggleModule(rootCard.id, true);
                          for (const smId of selectedMods) {
                            await onToggleModule(smId, true);
                          }
                        }
                        handleActivate(e, rootCard, selectedMods);
                      }}
                      className="flex-1 px-5 py-2.5 bg-[#4169E1] hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-lg shadow-[#4169E1]/20 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>
                        {companionCards.filter((m) => isChecked(m.id)).length > 0 
                          ? `${getTaxonomyBadge(rootCard) === 'Outil' ? '🛒 Acheter' : '⚡ Activer'} ${rootCard.title} (+ ${companionCards.filter((m) => isChecked(m.id)).length} module${companionCards.filter((m) => isChecked(m.id)).length > 1 ? 's' : ''})` 
                          : `${getTaxonomyBadge(rootCard) === 'Outil' ? '🛒 Acheter' : '⚡ Activer'} ${rootCard.title}`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* BLOC 2 : FONCTIONNALITÉS & MODULES ASSOCIÉS */}
            {companionCards.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-[#4169E1]" />
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-[#4169E1]">
                      FONCTIONNALITÉS & MODULES ASSOCIÉS
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Cochez pour activer simultanément
                  </span>
                </div>

                <div className="space-y-2.5">
                  {companionCards.map((mod, mIdx) => {
                    const checked = isChecked(mod.id);
                    return (
                      <div 
                        key={mod.id || mIdx}
                        onClick={() => handleToggleCheck(mod.id)}
                        className={`bg-[#28283D] border rounded-xl p-3.5 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                          checked 
                            ? 'border-[#4169E1] bg-[#2E2E48] shadow-md shadow-[#4169E1]/15' 
                            : 'border-slate-700/60 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              id={`check-${mod.id}`}
                              checked={checked}
                              onChange={() => handleToggleCheck(mod.id)}
                              className="w-4 h-4 rounded accent-[#4169E1] cursor-pointer"
                            />
                          </div>
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <a 
                                href={mod.routeUrl || '#'}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onClose) onClose();
                                  handleActivate(e, mod);
                                }}
                                className="text-xs sm:text-sm font-bold text-blue-400 hover:text-blue-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.85)] hover:underline flex items-center gap-1 transition-all cursor-pointer"
                                style={{ textShadow: '0 0 8px rgba(59, 130, 246, 0.75)' }}
                              >
                                <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0 drop-shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                                <span>{mod.title}</span>
                              </a>
                              <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold tracking-wider bg-blue-500/15 text-blue-300 border border-blue-400/30 shadow-xs shrink-0">
                                [{getTaxonomyBadge(mod)}]
                              </span>
                              {mod.palmares && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                                  {mod.palmares}
                                </span>
                              )}
                              {mod.trialBadge && (
                                <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20">
                                  {mod.trialBadge}
                                </span>
                              )}
                            </div>
                            <ExpandableModuleDescription 
                              id={mod.id}
                              description={mod.description}
                              defaultClamped="line-clamp-2"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                          {mod.tutorialUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTutorial(e, mod.tutorialUrl);
                              }}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                              title="Voir le tutoriel"
                            >
                              <Play className="w-3.5 h-3.5 text-[#4169E1]" />
                            </button>
                          )}
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCheck(mod.id);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                              checked 
                                ? 'bg-blue-600 text-white border-blue-500' 
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                            }`}
                          >
                            {checked ? '✓ Sélectionné' : '+ Cocher'}
                          </button>
                          {isModuleActive && isModuleActive(mod.id) ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (onToggleModule) await onToggleModule(mod.id, false);
                                }}
                                className="px-2.5 py-1 bg-emerald-950/60 hover:bg-rose-950/60 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer group"
                                title="Désactiver"
                              >
                                <Check className="w-3 h-3 text-emerald-400 group-hover:hidden" />
                                <X className="w-3 h-3 text-rose-400 hidden group-hover:inline" />
                                <span className="group-hover:hidden">Actif</span>
                                <span className="hidden group-hover:inline">Désactiver</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActivate(e, mod);
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-600 transition"
                              >
                                Ouvrir
                              </button>
                            </div>
                          ) : (
                            <button 
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (onToggleModule) await onToggleModule(mod.id, true);
                                handleActivate(e, mod);
                              }}
                              className="px-2.5 py-1 bg-[#4169E1] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition cursor-pointer active:scale-95"
                            >
                              {getTaxonomyBadge(mod) === 'Outil' ? '🛒 Acheter seul' : '⚡ Activer seul'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Barre collective d'activation */}
                <div className="pt-1">
                  <div className="bg-gradient-to-r from-blue-950/60 to-slate-900 border border-[#4169E1]/40 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-slate-300">
                      Options sélectionnées : <strong className="text-emerald-400">{companionCards.filter((m) => isChecked(m.id)).length}</strong> sur {companionCards.length} module(s)
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={(e) => handleActivate(e, rootCard)}
                        className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-600 transition"
                      >
                        {getTaxonomyBadge(rootCard) === 'Outil' ? `Acheter ${rootCard.title} seule` : `Activer ${rootCard.title} seule`}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          const selectedMods = companionCards.filter((m) => isChecked(m.id)).map((m) => m.id);
                          handleActivate(e, rootCard, selectedMods);
                        }}
                        className="flex-1 sm:flex-initial px-4 py-1.5 bg-[#4169E1] hover:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-[#4169E1]/30 transition"
                      >
                        {getTaxonomyBadge(rootCard) === 'Outil' ? '🛒 Acheter Tout Ensemble' : '⚡ Activer Tout Ensemble'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* CAS B : Rangée Standard / Sans Application Racine (ex: Nanagénérateur AI) */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {matchingCards.map((card, cIdx) => (
              <div 
                key={card.id || cIdx}
                onMouseEnter={() => setHovered(card.id)}
                onMouseLeave={() => setHovered(null)}
                className="bg-[#28283D] border border-slate-700/60 hover:border-[#4169E1] rounded-xl p-4.5 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <a 
                        href={card.routeUrl || '#'}
                        onClick={(e) => {
                          e.preventDefault();
                          handleActivate(e, card);
                        }}
                        className="text-sm font-bold text-blue-400 hover:text-blue-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.85)] hover:underline flex items-center gap-1.5 transition-all cursor-pointer"
                        style={{ textShadow: '0 0 8px rgba(59, 130, 246, 0.75)' }}
                      >
                        <span>{card.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      </a>
                      <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold tracking-wider bg-blue-500/15 text-blue-300 border border-blue-400/30 shadow-xs shrink-0">
                        [{getTaxonomyBadge(card)}]
                      </span>
                    </div>
                    {card.palmares && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 shrink-0">
                        {card.palmares}
                      </span>
                    )}
                  </div>
                  {card.subtitle && <p className="text-[11px] text-slate-400 font-medium">{card.subtitle}</p>}
                  <ExpandableModuleDescription 
                    id={card.id}
                    description={card.description}
                    defaultClamped="line-clamp-2"
                  />
                  {card.blocks?.some((b: any) => b.type === 'image_slider') && (
                    <div className="mt-2.5">
                      {card.blocks.filter((b: any) => b.type === 'image_slider').map((sb: any) => (
                        <SlideModuleBlock
                          key={sb.id}
                          id={sb.id}
                          settings={sb.slideSettings || { autoplay: true, interval: 4000, aspectRatio: 'wide' }}
                          slides={sb.slides || []}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                  {card.trialBadge ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20">
                      {card.trialBadge}
                    </span>
                  ) : <span />}

                  <div className="flex items-center gap-2">
                    {card.tutorialUrl && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTutorial(e, card.tutorialUrl);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold border border-slate-600 transition"
                      >
                        ▶️ Tuto
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActivate(e, card);
                      }}
                      className="px-3 py-1.5 bg-[#4169E1] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-md active:scale-95"
                    >
                      {getTaxonomyBadge(card) === 'Outil' ? '🛒 Acheter' : '⚡ Activer'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // CAS C : Le block est une Carte unique directe
  const singleCard = extractCard(block, index);
  if (q && !singleCard.title.toLowerCase().includes(q) && !singleCard.description.toLowerCase().includes(q)) {
    return null;
  }

  return (
    <div 
      className="bg-[#28283D] border border-slate-700/60 hover:border-[#4169E1] rounded-xl p-4.5 transition-all flex flex-col justify-between group shadow-lg mb-4"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <a
              href={singleCard.routeUrl || '#'}
              onClick={(e) => {
                e.preventDefault();
                handleActivate(e, singleCard);
              }}
              className="text-sm font-bold text-blue-400 hover:text-blue-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.85)] hover:underline flex items-center gap-1.5 transition-all cursor-pointer"
              style={{ textShadow: '0 0 8px rgba(59, 130, 246, 0.75)' }}
            >
              <span>{singleCard.title}</span>
              <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            </a>
            <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold tracking-wider bg-blue-500/15 text-blue-300 border border-blue-400/30 shadow-xs shrink-0">
              [{getTaxonomyBadge(singleCard)}]
            </span>
          </div>
          {singleCard.palmares && (
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 shrink-0">
              {singleCard.palmares}
            </span>
          )}
        </div>
        <ExpandableModuleDescription 
          id={singleCard.id}
          description={singleCard.description}
          defaultClamped="line-clamp-2"
        />
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
        {singleCard.trialBadge ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20">
            {singleCard.trialBadge}
          </span>
        ) : <span />}

        {isModuleActive && isModuleActive(singleCard.id) ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (onToggleModule) await onToggleModule(singleCard.id, false);
              }}
              className="px-2.5 py-1 bg-emerald-950/60 hover:bg-rose-950/60 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer group"
              title="Désactiver"
            >
              <Check className="w-3 h-3 text-emerald-400 group-hover:hidden" />
              <X className="w-3 h-3 text-rose-400 hidden group-hover:inline" />
              <span className="group-hover:hidden">Actif</span>
              <span className="hidden group-hover:inline">Désactiver</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleActivate(e, singleCard);
              }}
              className="px-3 py-1.5 bg-[#4169E1] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-md active:scale-95 flex items-center gap-1"
            >
              <span>Ouvrir</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button 
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              if (onToggleModule) await onToggleModule(singleCard.id, true);
              handleActivate(e, singleCard);
            }}
            className="px-3 py-1.5 bg-[#4169E1] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-md active:scale-95"
          >
            {getTaxonomyBadge(singleCard) === 'Outil' ? '🛒 Acheter' : '⚡ Activer'}
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * SYSTÈME DE BADGES VISUELS (TAXONOMIE) :
 * 4 types distincts : [Service], [Application], [Module], [Outil]
 */
export type TaxonomyBadgeType = 'Service' | 'Application' | 'Module' | 'Outil';

export function getTaxonomyBadge(item: any): TaxonomyBadgeType {
  if (!item) return 'Module';

  // 1. Propriété explicite prioritaire si définie dans la base
  const explicit = (
    item.taxonomyType || 
    item.badgeType || 
    item.itemType || 
    item.type ||
    item.taxonomy
  )?.toString().toLowerCase();

  if (explicit === 'service') return 'Service';
  if (explicit === 'application' || explicit === 'app') return 'Application';
  if (explicit === 'module') return 'Module';
  if (explicit === 'outil' || explicit === 'tool') return 'Outil';

  const title = (item.title || item.appName || item.name || '').toLowerCase();
  const cat = (item.category || item.subtitle || item.rowTitle || '').toLowerCase();
  const id = (item.id || '').toLowerCase();

  // 1.5 Mappings et priorités explicites
  if (
    title.includes('crm et automation') || 
    title.includes('crm & automation') || 
    id.includes('crm-automation') || 
    id === 'mod-crm-automation' ||
    id === 'connectors-webhooks'
  ) {
    return 'Service';
  }

  if (
    title.includes('studio de choix et construction') || 
    id.includes('theme-builder') ||
    id === 'mod-theme-builder-studio'
  ) {
    return 'Service';
  }

  if (
    title.includes('centre de creation de cours') || 
    title.includes('centre de création de cours') || 
    title.includes('espace formateur') || 
    id.includes('instructor')
  ) {
    return 'Service';
  }

  if (
    title.includes('centre de formation et d') || 
    title.includes('accompagnement') || 
    title.includes('aprend') || 
    id.includes('lms-academy')
  ) {
    return 'Service';
  }

  if (
    title.includes('nanaschish') || 
    title.includes('nana switch') || 
    title.includes('switch cloud') || 
    id.includes('nana-switch')
  ) {
    return 'Service';
  }

  if (
    title.includes('cours forge') || 
    title.includes('course forge') || 
    id.includes('cours-forge')
  ) {
    return 'Application';
  }

  if (
    title.includes('studio de generation de live') || 
    title.includes('studio de génération de live') || 
    id.includes('live-webinar')
  ) {
    return 'Application';
  }

  if (
    title.includes('wamett') || 
    title.includes('wameet') || 
    id.includes('wameet')
  ) {
    return 'Application';
  }

  if (
    title.includes('ultimate funnel') || 
    title.includes('funnel builder modulaire') || 
    title.includes('public deal') || 
    id.includes('ultimate-funnel') || 
    id.includes('modular-funnel') || 
    id.includes('public-deal')
  ) {
    return 'Application';
  }

  // 2. Détection [Module] prioritaire si c'est explicitement un module compagnon/fils
  if (item.isCompanion || id.startsWith('mod_') || item.companionFor) {
    return 'Module';
  }

  // 3. Détection [Service] : Livraisons, SMS direct, campagnes marketing, passerelles, coaching, formation
  if (
    title.includes('livraison') ||
    title.includes('sms') ||
    title.includes('campagne') ||
    title.includes('service') ||
    title.includes('formation') ||
    title.includes('coaching') ||
    title.includes('passerelle') ||
    title.includes('paiement') ||
    title.includes('support') ||
    title.includes('conciergerie') ||
    cat.includes('formation & coaching') ||
    cat.includes('service') ||
    cat.includes('communication & réseau') ||
    id.includes('delivery') ||
    id.includes('sms')
  ) {
    return 'Service';
  }

  // 4. Détection [Outil] : Matériel, périphériques, scanner, imprimante, importateurs, converters, PDF
  if (
    title.includes('scanner') ||
    title.includes('douchette') ||
    title.includes('imprimante') ||
    title.includes('barcode') ||
    title.includes('code-barre') ||
    title.includes('import') ||
    title.includes('export') ||
    title.includes('pdf') ||
    title.includes('excel') ||
    id.includes('scanner') ||
    id.includes('printer') ||
    id.includes('importer') ||
    cat.includes('technologie & api') ||
    cat.includes('matériel') ||
    cat.includes('outil')
  ) {
    return 'Outil';
  }

  // 5. Détection [Application] : Grandes applications autonomes et plateformes racines
  if (
    item.isRootApp ||
    title.includes('caisse') ||
    title.includes('pos') ||
    title.includes('studio') ||
    title.includes('tunnel') ||
    title.includes('nanagénérateur') ||
    title.includes('nanagenerator') ||
    title.includes('crm') ||
    title.includes('wameet') ||
    title.includes('boutique') ||
    title.includes('store') ||
    cat.includes('commerce') ||
    cat.includes('application')
  ) {
    return 'Application';
  }

  // 6. Détection [Module] : Sous-fonctionnalités, extensions, fiches de gestion, clôture, carnet, inventaire
  if (
    title.includes('module') ||
    title.includes('stock') ||
    title.includes('inventaire') ||
    title.includes('factur') ||
    title.includes('devis') ||
    title.includes('dette') ||
    title.includes('crédit') ||
    title.includes('clôture') ||
    title.includes('shift') ||
    title.includes('conseiller') ||
    cat.includes('gestion & stock') ||
    cat.includes('finances & trésorerie')
  ) {
    return 'Module';
  }

  return item.isRootApp ? 'Application' : 'Module';
}

/**
 * CONDITION 2 : Calcul de 4 suggestions de succession pertinentes selon la recherche du client
 * Règle stricte : MAXIMUM 4 MODULES (Interdit de déverser tous les modules)
 */
export function getSuccessionSuggestions(
  primaryModule: any,
  allAvailableCards: any[]
): any[] {
  if (!primaryModule || !Array.isArray(allAvailableCards)) return [];

  const excludedIds = new Set<string>([
    String(primaryModule.id || '').toLowerCase(),
    String(primaryModule.title || primaryModule.appName || '').toLowerCase()
  ]);

  const candidates: any[] = [];

  const addCandidate = (item: any) => {
    if (!item) return;
    const id = String(item.id || `mod-${candidates.length}`);
    const idLower = id.toLowerCase();
    const resolvedTitle = String(item.title || item.appName || item.name || 'Module Nanasore');
    const titleLower = resolvedTitle.toLowerCase();
    if (!excludedIds.has(idLower) && !excludedIds.has(titleLower)) {
      excludedIds.add(idLower);
      excludedIds.add(titleLower);
      candidates.push({
        id,
        title: resolvedTitle,
        subtitle: item.subtitle || item.category || '',
        description: item.description || item.shortDescription || '',
        palmares: item.palmares || item.badgePalmares || '⭐ 98% de satisfaction',
        trialBadge: item.trialBadge || item.trialLabel || 'Essai disponible',
        mediaUrl: item.mediaUrl || item.appLogo || '',
        mediaType: 'image' as const,
        routeUrl: item.routeUrl || item.route || `/dashboard/apps/${id}`,
        targetView: item.targetView,
        tutorialUrl: item.tutorialUrl || ''
      });
    }
  };

  const primaryTitle = String(primaryModule.title || '').toLowerCase();
  const primaryCategory = String(primaryModule.subtitle || primaryModule.category || primaryModule.rowTitle || '').toLowerCase();

  // A. Paires de workflow métier stratégiques (succession naturelle)
  const WORKFLOW_PAIRS: Record<string, string[]> = {
    whatsapp: ['pos', 'funnel-builder', 'sms-broadcast', 'crm-pro'],
    caisse: ['inventory', 'invoices', 'credit-book', 'whatsapp'],
    pos: ['inventory', 'invoices', 'credit-book', 'whatsapp'],
    stock: ['pos', 'invoices', 'delivery-tracker', 'barcode-scanner'],
    inventaire: ['pos', 'invoices', 'delivery-tracker', 'barcode-scanner'],
    nanagenerator: ['funnel-builder', 'studio-ia', 'ai-gemini', 'pos'],
    ia: ['nanagenerator', 'funnel-builder', 'studio-ia', 'pos'],
    funnel: ['whatsapp-crm', 'nanagenerator', 'pos', 'delivery-tracker'],
    tunnel: ['whatsapp-crm', 'nanagenerator', 'pos', 'delivery-tracker'],
    factur: ['pos', 'debts', 'accounting', 'docusign'],
    devis: ['pos', 'debts', 'accounting', 'docusign'],
    livraison: ['pos', 'whatsapp-crm', 'invoices', 'inventory'],
    dette: ['pos', 'invoices', 'accounting', 'whatsapp-crm']
  };

  const matchedKey = Object.keys(WORKFLOW_PAIRS).find((k) => primaryTitle.includes(k) || String(primaryModule.id || '').toLowerCase().includes(k));
  if (matchedKey) {
    const desiredIds = WORKFLOW_PAIRS[matchedKey];
    for (const dId of desiredIds) {
      const match = allAvailableCards.find(
        (c) =>
          c &&
          (String(c.id || '').toLowerCase() === dId ||
            String(c.id || '').toLowerCase().includes(dId) ||
            String(c.title || '').toLowerCase().includes(dId))
      );
      if (match) addCandidate(match);
      if (candidates.length >= 4) break;
    }
  }

  // B. Suggestions complémentaires dans la MÊME catégorie
  if (candidates.length < 4) {
    const sameCatMatches = allAvailableCards.filter((c) => {
      if (!c) return false;
      const s = String(c.subtitle || c.category || c.rowTitle || '').toLowerCase();
      return Boolean(primaryCategory && s && (s.includes(primaryCategory) || primaryCategory.includes(s)));
    });
    for (const item of sameCatMatches) {
      addCandidate(item);
      if (candidates.length >= 4) break;
    }
  }

  // C. Suggestions des applications indispensables / piliers Nanasore
  if (candidates.length < 4) {
    const flagshipKeywords = ['caisse', 'nanagénérateur', 'whatsapp', 'tunnels', 'stock', 'factures'];
    for (const fKey of flagshipKeywords) {
      const match = allAvailableCards.find((c) => c && String(c.title || '').toLowerCase().includes(fKey));
      if (match) addCandidate(match);
      if (candidates.length >= 4) break;
    }
  }

  // STRICTEMENT 4 MODULES AU MAXIMUM (Interdit de déverser tous les modules)
  return candidates.slice(0, 4);
}

export const CentralHubOmnibar: React.FC<CentralHubOmnibarProps> = ({
  onNavigate,
  onOpenApp,
  onOpenCreateUniverse,
  className = '',
  placeholder
}) => {
  const {
    modules: dynamicModules,
    activeModules,
    inactiveModules,
    isModuleActive,
    toggleModule,
    tenantId: currentTenantId
  } = useActiveOmnibarApps();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // État pour la licence contextuelle
  const [licenseState, setLicenseState] = useState(() => getLocalUserLicense(currentTenantId));
  const [walletFeedback, setWalletFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleLicenseUpdated = (e: any) => {
      if (e?.detail) {
        setLicenseState(e.detail);
      }
    };
    window.addEventListener('nana_license_updated', handleLicenseUpdated);
    return () => window.removeEventListener('nana_license_updated', handleLicenseUpdated);
  }, []);

  const handleOpenCreateUniverse = (moduleId: string, moduleName: string, moduleType?: string) => {
    setIsOpen(false);
    if (onOpenCreateUniverse) {
      onOpenCreateUniverse({ id: moduleId, name: moduleName, type: moduleType });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nanasore_open_create_universe', {
        detail: { id: moduleId, name: moduleName, type: moduleType }
      }));
    }
  };

  const handlePayPerUseConsume = async (e: React.MouseEvent, moduleId: string, moduleName: string) => {
    e.stopPropagation();
    try {
      const res = await consumeWalletForPayPerUse({
        userId: currentTenantId || 'current-user',
        moduleKey: moduleId,
        amount: 250,
        description: `Consommation usage module ${moduleName}`
      });
      if (res.success) {
        setWalletFeedback(`✓ Débité de votre Wallet (Nouveau solde: ${res.new_balance} FCFA). Aucun KYC requis !`);
        setTimeout(() => setWalletFeedback(null), 4000);
      } else {
        alert(res.error || "Solde insuffisant dans votre Portefeuille. Veuillez recharger votre solde.");
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors du paiement à l'usage");
    }
  };

  const handleBuyAlaCarte = async (e: React.MouseEvent, moduleId: string, moduleName: string) => {
    e.stopPropagation();
    try {
      const res = await buyModuleAlaCarte({
        userId: currentTenantId || 'current-user',
        moduleKey: moduleId,
        price: 1500
      });
      if (res.success) {
        setWalletFeedback(`✓ Module ${moduleName} injecté à la carte dans votre Thème Gratuit !`);
        setTimeout(() => setWalletFeedback(null), 4000);
      } else {
        alert(res.error || "Erreur lors de l'achat à la carte");
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'achat");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Normalisation & assainissement absolu des données Firebase RTDB (Array ou Object)
  const normalizeHubData = (rawData: any): HubRowItem[] => {
    if (!rawData) return [];
    let list: any[] = [];
    if (Array.isArray(rawData)) {
      list = rawData.filter(Boolean);
    } else if (typeof rawData === 'object') {
      list = Object.values(rawData).filter(Boolean);
    }

    if (list.length === 0) return [];

    const sanitizeCard = (c: any, cIdx: number) => {
      const sanitizedUrl = cleanUrl(c?.mediaUrl || c?.url || c?.imageUrl);
      let sanitizedBlocks = c?.blocks;
      if (Array.isArray(c?.blocks)) {
        sanitizedBlocks = c.blocks.map((b: any) => {
          if (b.type === 'image' || b.type === 'video') {
            return { ...b, url: cleanUrl(b.url || b.imageUrl) };
          }
          return b;
        });
      }
      return {
        ...c,
        id: c?.id || `card-${cIdx}`,
        mediaUrl: sanitizedUrl,
        imageUrl: sanitizedUrl,
        routeUrl: c?.routeUrl || c?.routeOrAction || '',
        blocks: sanitizedBlocks
      };
    };

    const rows: HubRowItem[] = [];
    const directCards: any[] = [];

    list.forEach((item: any, idx: number) => {
      if (!item) return;
      if (Array.isArray(item.cards) || (item.cards && typeof item.cards === 'object')) {
        let rowCards: any[] = Array.isArray(item.cards)
          ? item.cards.filter(Boolean)
          : Object.values(item.cards).filter(Boolean);
        rows.push({
          ...item,
          id: item.id || `row-${idx}`,
          rowTitle: item.rowTitle || item.title || `Section #${idx + 1}`,
          cards: rowCards.map(sanitizeCard)
        });
      } else {
        // Bloc ou carte unifiée isolée (HubBlockConfig)
        directCards.push(sanitizeCard(item, idx));
      }
    });

    if (directCards.length > 0) {
      rows.push({
        id: 'direct-published-row',
        rowTitle: 'Modules & Blocs Publiés',
        cards: directCards
      });
    }

    return rows;
  };

  const [blocks, setBlocks] = useState<any[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        // Purge de l'ancien cache Central Hub conflictuel
        localStorage.removeItem('central_hub_config');
        const cachedRegistry = localStorage.getItem('app_registry_cache');
        if (cachedRegistry) {
          const regParsed = JSON.parse(cachedRegistry);
          return Object.values(regParsed).filter(Boolean);
        }
      }
    } catch (_) {}
    return [];
  });

  const [configRows, setConfigRows] = useState<HubRowItem[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const cachedRegistry = localStorage.getItem('app_registry_cache');
        if (cachedRegistry) {
          const regParsed = JSON.parse(cachedRegistry);
          const combined = Object.values(regParsed).filter(Boolean);
          const normalized = normalizeHubData(combined);
          if (normalized.length > 0) return normalized;
        }
      }
    } catch (_) {}
    return [];
  });

  // 1. Synchronisation 100% Supabase (public.app_registry) et Registre Canonique (appRegistry.ts)
  useEffect(() => {
    let isMounted = true;

    const loadFromLocalCache = () => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('central_hub_config');
          const cachedRegistryRaw = localStorage.getItem('app_registry_cache');
          let combined: any[] = [];
          if (cachedRegistryRaw) {
            const regParsed = JSON.parse(cachedRegistryRaw);
            combined = Object.values(regParsed).filter(Boolean);
          }
          if (isMounted) {
            setBlocks(combined);
            setConfigRows(normalizeHubData(combined));
          }
        }
      } catch (_) {}
    };

    const syncFromSupabaseRegistry = async () => {
      try {
        const { data, error } = await supabase
          .from('app_registry')
          .select('*')
          .order('updated_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const registryMap: Record<string, any> = {};
          const activeList: any[] = [];
          data.forEach((row: any) => {
            if (row && row.id && row.is_active !== false) {
              registryMap[row.id] = row;
              activeList.push(row);
            }
          });
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('app_registry_cache', JSON.stringify(registryMap));
            }
          } catch (_) {}
          if (isMounted) {
            setBlocks(activeList);
            setConfigRows(normalizeHubData(activeList));
          }
          return;
        }
      } catch (err) {
        console.warn('[OMNIBAR SUPABASE REGISTRY FALLBACK]:', err);
      }
      loadFromLocalCache();
    };

    syncFromSupabaseRegistry();

    const handleRegistryUpdate = () => {
      loadFromLocalCache();
    };

    window.addEventListener('storage', handleRegistryUpdate);
    window.addEventListener('hub_registry_updated', handleRegistryUpdate);
    const handleOpenOmnibar = () => {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    window.addEventListener('nanasore_open_omnibar', handleOpenOmnibar);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleRegistryUpdate);
      window.removeEventListener('hub_registry_updated', handleRegistryUpdate);
      window.removeEventListener('nanasore_open_omnibar', handleOpenOmnibar);
    };
  }, []);

  // 2. Blocage du scroll de l'arrière-plan quand l'overlay est actif (Masquage total)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
      setHoveredCardId(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 3. Gestion des raccourcis clavier (Échap pour fermer, Ctrl+K / Cmd+K pour ouvrir)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Extraction sécurisée des propriétés d'une carte (qu'elle soit au format blocs modulaire ou plate)
  const getCardDetails = (card: any): HubCardItem => {
    if (!card || typeof card !== 'object') {
      return {
        id: `card-${Math.random()}`,
        title: 'Module Nanasore',
        routeUrl: '',
        subtitle: '',
        palmares: '',
        description: '',
        mediaType: 'image',
        mediaUrl: '',
        tutorialUrl: '',
        trialBadge: '',
        isRootApp: false,
        linkedModuleIds: []
      };
    }

    const safeBlocks = Array.isArray(card.blocks)
      ? card.blocks.filter((b: any) => b && typeof b === 'object')
      : card.blocks && typeof card.blocks === 'object'
      ? Object.values(card.blocks).filter((b: any) => b && typeof b === 'object')
      : [];

    const rawLinked =
      card.linkedModuleIds ||
      safeBlocks.find((b: any) => b?.linkedModuleIds)?.linkedModuleIds ||
      [];
    const linkedModuleIds: string[] = Array.isArray(rawLinked)
      ? rawLinked.filter(Boolean).map(String)
      : rawLinked && typeof rawLinked === 'object'
      ? Object.values(rawLinked).filter(Boolean).map(String)
      : [];

    const isRootApp = Boolean(card.isRootApp || linkedModuleIds.length > 0);
    const fallbackRoute =
      card.routeUrl ||
      card.routeOrAction ||
      (card.id === 'card-3'
        ? '/dashboard/apps/pos'
        : card.id === 'card-1'
        ? '/dashboard/apps/ai-generator'
        : card.id === 'card-2'
        ? '/dashboard/apps/wameet'
        : '');
    const resolvedMediaUrl = card.mediaUrl || card.imageUrl || '';
    const resolvedKeywords = Array.isArray(card.keywords)
      ? card.keywords.filter(Boolean).map(String)
      : [];

    const normalizeSlides = (rawSlides: any) => {
      const arr = Array.isArray(rawSlides)
        ? rawSlides
        : rawSlides && typeof rawSlides === 'object'
        ? Object.values(rawSlides)
        : [];
      return arr
        .filter((s: any) => s && typeof s === 'object' && (s.imageUrl || s.url))
        .map((s: any, idx: number) => ({
          id: String(s.id || `slide-${idx}`),
          imageUrl: cleanUrl(s.imageUrl || s.url),
          captionTitle: String(s.captionTitle || s.title || ''),
          captionText: String(s.captionText || s.text || '')
        }));
    };

    const normalizeSlideSettings = (rawSettings: any) => {
      if (rawSettings && typeof rawSettings === 'object') {
        return {
          autoplay: rawSettings.autoplay ?? true,
          interval: Number(rawSettings.interval) || 3500,
          aspectRatio: rawSettings.aspectRatio || 'wide'
        };
      }
      return { autoplay: true, interval: 3500, aspectRatio: 'wide' };
    };

    if (safeBlocks.length > 0) {
      const h = safeBlocks.find((b: any) => b?.type === 'header');
      const d = safeBlocks.find((b: any) => b?.type === 'description');
      const m = safeBlocks.find((b: any) => b?.type === 'image' || b?.type === 'video');
      const c = safeBlocks.find((b: any) => b?.type === 'cta');
      const slider = safeBlocks.find((b: any) => b?.type === 'image_slider');
      const safeSlides = normalizeSlides(slider?.slides || card.slides);
      const sliderImg = safeSlides[0]?.imageUrl;

      return {
        id: String(card.id || `card-${Math.random()}`),
        title: String(card.title || h?.title || card.appName || card.name || 'Module Nanasore'),
        routeUrl: card.routeUrl || card.routeOrAction || fallbackRoute,
        subtitle: String(card.subtitle || h?.badge || card.category || card.palmares || ''),
        palmares: String(card.palmares || h?.badge || ''),
        description: String(card.description || d?.text || ''),
        mediaType: card.mediaType || (m ? m.type : 'image'),
        mediaUrl: resolvedMediaUrl || sliderImg || m?.url || '',
        tutorialUrl: String(card.tutorialUrl || c?.tutorialUrl || ''),
        trialBadge: String(card.trialBadge || c?.trialBadge || ''),
        targetView: card.targetView,
        isRootApp,
        linkedModuleIds,
        keywords: resolvedKeywords,
        blocks: safeBlocks,
        slides: safeSlides,
        slideSettings: normalizeSlideSettings(slider?.slideSettings || card.slideSettings || card.settings)
      } as any;
    }

    const safeSlides = normalizeSlides(card.slides);
    return {
      id: String(card.id || `card-${Math.random()}`),
      title: String(card.title || card.appName || card.name || 'Module Nanasore'),
      routeUrl: card.routeUrl || card.routeOrAction || fallbackRoute,
      subtitle: String(card.subtitle || card.category || card.palmares || ''),
      palmares: String(card.palmares || ''),
      description: String(card.description || ''),
      mediaType: card.mediaType || 'image',
      mediaUrl: resolvedMediaUrl,
      tutorialUrl: String(card.tutorialUrl || ''),
      trialBadge: String(card.trialBadge || ''),
      targetView: card.targetView,
      isRootApp,
      linkedModuleIds,
      keywords: resolvedKeywords,
      blocks: [],
      slides: safeSlides,
      slideSettings: normalizeSlideSettings(card.slideSettings || card.settings)
    } as any;
  };

  // Helper de normalisation sans accents ni pluriels stricts pour comparaison tolérante de catégories
  const normCategoryText = (str: string) =>
    String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  // Synonymes métiers entre les catégories d'OFFICIAL_MODULES et d'APPS_REGISTRY
  const getCategoryTokens = (catName: string): string[] => {
    const base = normCategoryText(cleanCategoryName(catName));
    if (!base) return [];
    const rawTokens = base
      .split(/[\s&,\/\-()]+/)
      .filter((w) => w.length >= 2 && !['les', 'des', 'aux', 'sur', 'par', 'pour', 'dans', 'avec'].includes(w))
      .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w));

    const expanded = new Set<string>(rawTokens);
    if (base.includes('commerce') || base.includes('vente') || base.includes('caisse')) {
      expanded.add('commerce');
      expanded.add('vente');
      expanded.add('caisse');
      expanded.add('boutique');
      expanded.add('vitrine');
    }
    if (base.includes('marketing') || base.includes('studio') || base.includes('communication')) {
      expanded.add('marketing');
      expanded.add('studio');
      expanded.add('campagne');
      expanded.add('emailing');
      expanded.add('publicite');
    }
    if (base.includes('finance') || base.includes('tresorerie') || base.includes('comptabilite')) {
      expanded.add('finance');
      expanded.add('tresorerie');
      expanded.add('comptabilite');
      expanded.add('dette');
      expanded.add('facture');
    }
    if (base.includes('gestion') || base.includes('stock') || base.includes('operation')) {
      expanded.add('gestion');
      expanded.add('stock');
      expanded.add('inventaire');
      expanded.add('operation');
      expanded.add('livraison');
    }
    if (base.includes('formation') || base.includes('coaching') || base.includes('education') || base.includes('lms') || base.includes('academie')) {
      expanded.add('formation');
      expanded.add('coaching');
      expanded.add('education');
      expanded.add('lms');
      expanded.add('cours');
      expanded.add('academie');
      expanded.add('certificat');
    }
    if (base.includes('securite') || base.includes('legal') || base.includes('docusign')) {
      expanded.add('securite');
      expanded.add('legal');
      expanded.add('contrat');
      expanded.add('signature');
      expanded.add('kyc');
    }
    if (base.includes('productivite') || base.includes('rh') || base.includes('equipe')) {
      expanded.add('productivite');
      expanded.add('employe');
      expanded.add('equipe');
      expanded.add('cv');
    }
    if (base.includes('technologie') || base.includes('api') || base.includes('infrastructure') || base.includes('administration')) {
      expanded.add('technologie');
      expanded.add('api');
      expanded.add('infrastructure');
      expanded.add('connecteur');
      expanded.add('domaine');
      expanded.add('admin');
    }
    return Array.from(expanded);
  };

  // Catalogue complet unifié (OFFICIAL_MODULES + APPS_REGISTRY + Supabase app_registry) mémorisé
  const allAvailableCards = useMemo(() => {
    const customBlocksById = new Map<string, any>();
    const standaloneCustomCards: any[] = [];

    if (blocks && Array.isArray(blocks)) {
      blocks.forEach((row: any, rIdx: number) => {
        if (!row || typeof row !== 'object') return;
        const card = getCardDetails(row);
        const matchedOfficial =
          getOfficialModuleById(String(card.id || '')) ||
          getOfficialModuleById(String(card.title || '')) ||
          (card.routeUrl ? getModuleByRoute(String(card.routeUrl)) : undefined);

        if (matchedOfficial) {
          customBlocksById.set(matchedOfficial.id.toLowerCase(), card);
        } else if (row.id && row.title && row.type !== 'image_slider') {
          standaloneCustomCards.push({
            ...card,
            id: String(card.id || `block-${rIdx}`),
            title: String(card.title || row.title || 'Module Nanasore'),
            rowTitle: String(row.category || row.rowTitle || 'Modules Publiés'),
            category: String(row.category || card.subtitle || 'Modules Publiés'),
            altCategory: String(row.rowTitle || ''),
            isRtdb: false,
            allRowCards: []
          });
        }
      });
    }

    const isCardExcluded = (idLower: string, titleLower: string) =>
      Boolean(
        idLower === 'nana-switch' ||
          idLower === 'crm-automation' ||
          idLower === 'wameet' ||
          idLower === 'app-wameet' ||
          idLower === 'srv-nana-switch' ||
          idLower === 'srv-crm-automation' ||
          idLower.includes('crm-automation') ||
          titleLower.includes('wameet') ||
          titleLower.includes('crm et automation') ||
          titleLower.includes('crm & automation')
      );

    // 1. Source de vérité primaire : Les 27 modules canoniques d'OFFICIAL_MODULES (src/config/appRegistry.ts)
    const officialCatalogCards: any[] = [];
    OFFICIAL_MODULES.forEach((official) => {
      const idLower = String(official.id || '').toLowerCase();
      const titleLower = String(official.name || '').toLowerCase().trim();

      if (isCardExcluded(idLower, titleLower)) {
        return;
      }

      const matchingRegistryApp = APPS_REGISTRY.find(
        (a) =>
          String(a.id || '').toLowerCase() === idLower ||
          String(a.appName || '').toLowerCase().trim() === titleLower ||
          (official.aliases && official.aliases.some((al) => String(al).toLowerCase() === String(a.id || '').toLowerCase())) ||
          getOfficialModuleById(a.id)?.id === official.id
      );

      const customOverride = customBlocksById.get(idLower);
      const active = isModuleActive(official.id);

      officialCatalogCards.push({
        id: String(official.id),
        title: String(customOverride?.title || official.name || 'Module Nanasore'),
        subtitle: matchingRegistryApp?.category || official.category || '',
        category: official.category || '',
        altCategory: matchingRegistryApp?.category || customOverride?.subtitle || '',
        description: String(customOverride?.description || official.description || matchingRegistryApp?.shortDescription || ''),
        palmares: active
          ? '✅ Module Actif'
          : customOverride?.palmares || matchingRegistryApp?.badgePalmares || (official.defaultActive ? 'Inclus' : 'Disponible'),
        trialBadge: active ? 'Actif' : customOverride?.trialBadge || matchingRegistryApp?.trialLabel || "Prêt à l'emploi",
        mediaUrl: customOverride?.mediaUrl || getCardMediaUrl(official),
        mediaType: customOverride?.mediaType || ('image' as const),
        // Route et vue canoniques TOUJOURS garanties par appRegistry.ts
        routeUrl: official.route || `/dashboard/apps/${official.id}`,
        targetView: official.view || official.actionId,
        actionId: official.actionId,
        taxonomyType:
          official.taxonomy === 'APPLICATION'
            ? 'Application'
            : official.taxonomy === 'SERVICE'
            ? 'Service'
            : official.taxonomy === 'MODULE'
            ? 'Module'
            : 'Outil',
        badge: official.taxonomy,
        isRootApp: official.id === 'app-pos' || official.id === 'pos',
        linkedModuleIds:
          official.id === 'app-pos' || official.id === 'pos'
            ? ['inventory', 'debts', 'scanner', 'mod-inventory', 'mod-debts', 'tool-scanner']
            : [],
        keywords: Array.from(
          new Set([
            ...(official.keywords || []),
            ...(matchingRegistryApp?.keywords || []),
            ...(customOverride?.keywords || [])
          ])
        ),
        isOfficialCatalog: true,
        isActive: active,
        blocks: customOverride?.blocks || [],
        slides: customOverride?.slides || [],
        slideSettings: customOverride?.slideSettings
      });
    });

    // 2. Modules complémentaires d'APPS_REGISTRY (sans aucun doublon avec OFFICIAL_MODULES)
    const registryCards: any[] = [];
    APPS_REGISTRY.forEach((app) => {
      const idLower = String(app.id || '').toLowerCase();
      const titleLower = String(app.appName || '').toLowerCase().trim();

      if (isCardExcluded(idLower, titleLower)) return;

      // Si ce module correspond déjà à un module canonique (par ID, alias ou nom), il est déjà enrichi ci-dessus
      const matchedCanonical =
        getOfficialModuleById(app.id) ||
        getOfficialModuleById(app.appName) ||
        (app.route ? getModuleByRoute(app.route) : undefined);

      if (matchedCanonical) return;
      if (
        officialCatalogCards.some(
          (c) =>
            String(c.id || '').toLowerCase() === idLower ||
            String(c.title || '').toLowerCase().trim() === titleLower ||
            (app.targetView && c.targetView === app.targetView)
        )
      ) {
        return;
      }

      registryCards.push({
        id: String(app.id),
        title: String(app.appName || 'Module Nanasore'),
        subtitle: String(app.category || ''),
        category: String(app.category || ''),
        altCategory: String(app.category || ''),
        description: String(app.shortDescription || ''),
        palmares: String(app.badgePalmares || app.palmares || '⭐ 98% de satisfaction'),
        trialBadge: String(app.trialLabel || 'Essai disponible'),
        mediaUrl: app.appLogo || getCardMediaUrl({ id: app.id, title: app.appName }),
        mediaType: 'image' as const,
        routeUrl: app.route || `/dashboard/apps/${app.id}`,
        targetView: app.targetView,
        taxonomyType: app.taxonomyType || (app as any).taxonomy,
        badge: app.badge,
        isRootApp: false,
        linkedModuleIds: [],
        keywords: Array.isArray(app.keywords) ? app.keywords : [],
        isOfficialCatalog: false,
        isRtdb: false,
        blocks: [],
        slides: []
      });
    });

    const filteredCustomCards = standaloneCustomCards.filter((c) => {
      const idL = String(c.id || '').toLowerCase();
      const titleL = String(c.title || '').toLowerCase();
      return !isCardExcluded(idL, titleL);
    });

    return [...officialCatalogCards, ...registryCards, ...filteredCustomCards];
  }, [blocks, activeModules]);

  // Vérifie si une carte appartient à une catégorie (exacte ou par tokens/synonymes métiers)
  const matchCardToCategory = (card: any, categoryLabel: string): { matches: boolean; exact: boolean } => {
    if (!card || !categoryLabel) return { matches: false, exact: false };
    const normCat = normCategoryText(cleanCategoryName(categoryLabel));
    if (!normCat) return { matches: false, exact: false };

    const combinedCat = [card.subtitle, card.category, card.altCategory, card.rowTitle]
      .filter(Boolean)
      .map((c) => cleanCategoryName(String(c)))
      .join(' ');
    const normS = normCategoryText(combinedCat);

    if (normS && (normS.includes(normCat) || (normCat.includes(normS) && normS.length >= 4))) {
      return { matches: true, exact: true };
    }

    const catTokens = getCategoryTokens(categoryLabel);
    if (catTokens.length === 0) return { matches: false, exact: false };

    const normT = normCategoryText(card.title || '');
    const normKw = Array.isArray(card.keywords) ? card.keywords.map(normCategoryText).join(' ') : '';

    const tokenHit = catTokens.some(
      (tok) => normS.includes(tok) || normT.includes(tok) || normKw.includes(tok)
    );
    return { matches: tokenHit, exact: false };
  };

  // Catégories déduites des rangées RTDB + catalogue Nanasore (garanties 100% non-vides)
  const categories = useMemo(() => {
    const candidateList: string[] = [];
    if (blocks && Array.isArray(blocks)) {
      blocks.forEach((r: any) => {
        const rawCards = Array.isArray(r?.cards)
          ? r.cards.filter(Boolean)
          : r?.cards && typeof r.cards === 'object'
          ? Object.values(r.cards).filter(Boolean)
          : [];
        if (rawCards.length > 0) {
          const t = cleanCategoryName(r?.rowTitle || r?.title);
          if (t) candidateList.push(t);
        }
      });
    }
    APPS_REGISTRY.forEach((app) => {
      if (app.category) {
        const cleaned = cleanCategoryName(app.category);
        if (cleaned && cleaned.toLowerCase() !== 'academic' && !cleaned.toLowerCase().includes('super admin')) {
          candidateList.push(cleaned);
        }
      }
    });
    OFFICIAL_MODULES.forEach((mod) => {
      if (mod.category) {
        const cleaned = cleanCategoryName(mod.category);
        if (cleaned && cleaned.toLowerCase() !== 'academic') {
          candidateList.push(cleaned);
        }
      }
    });

    const uniqueCandidates = Array.from(new Set(candidateList));
    // Ne conserver que les catégories qui retournent au moins 1 module réel
    return uniqueCandidates.filter((cat) =>
      allAvailableCards.some((card) => matchCardToCategory(card, cat).matches)
    );
  }, [blocks, allAvailableCards]);

  // =========================================================================
  // RECHERCHE STRUCTURÉE (CONDITION 1 & CONDITION 2) :
  // - Quand on ne tape rien : RIEN NE SORT (prompt propre des 35+ modules)
  // - Quand on tape un module ou sélectionne une catégorie :
  //   * Le module principal sort en haut
  //   * Condition 1 : S'il a des modules liés -> ils suivent en bas
  //   * Condition 2 : Tous les autres modules de la catégorie ou 4 modules de succession suivent
  // =========================================================================
  const structuredOutput = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    const activeCat = selectedCategory ? selectedCategory.trim() : null;

    if (!q && !activeCat) {
      return null;
    }

    const scoredMatches: { card: any; score: number }[] = [];

    allAvailableCards.forEach((card) => {
      if (!card) return;
      const t = String(card.title || '').toLowerCase();
      const d = String(card.description || '').toLowerCase();
      const p = String(card.palmares || '').toLowerCase();
      const combinedCat = [card.subtitle, card.category, card.altCategory, card.rowTitle].filter(Boolean).join(' ');
      const s = combinedCat.toLowerCase();
      const kw = Array.isArray(card.keywords) ? card.keywords.map((k: string) => String(k || '').toLowerCase()) : [];

      let catMatchResult = { matches: true, exact: false };
      if (activeCat) {
        catMatchResult = matchCardToCategory(card, activeCat);
        if (!catMatchResult.matches) {
          return;
        }
      }

      if (!q) {
        scoredMatches.push({
          card,
          score: (catMatchResult.exact ? 300 : 100) + (card.isRootApp ? 80 : 40) + (card.isOfficialCatalog ? 30 : 0)
        });
        return;
      }

      let score = 0;
      if (t === q) score += 1200;
      else if (t.startsWith(q)) score += 800;
      else if (t.includes(q)) score += 400;

      if (kw.some((k: string) => k === q)) score += 500;
      else if (kw.some((k: string) => k.includes(q))) score += 250;

      if (d.includes(q)) score += 100;
      if (p.includes(q)) score += 80;
      if (s.includes(q)) score += 60;
      if (card.isRootApp) score += 100;
      if (card.isOfficialCatalog) score += 250;

      if (score > 0) {
        scoredMatches.push({ card, score });
      }
    });

    // Fallback de sécurité absolu : si une catégorie est sélectionnée mais aucun match direct, proposer les piliers Nanasore
    if (scoredMatches.length === 0 && activeCat && !q && allAvailableCards.length > 0) {
      allAvailableCards.slice(0, 6).forEach((card, idx) => {
        scoredMatches.push({ card, score: 100 - idx });
      });
    }

    if (scoredMatches.length === 0) {
      return null;
    }

    // Trier par score décroissant : le meilleur match est le MODULE PRINCIPAL
    scoredMatches.sort((a, b) => b.score - a.score);
    const primaryMatch = scoredMatches[0].card;

    // 4. CONDITION 1 : Déterminer si le Module Principal a des modules liés
    let linkedModules: any[] = [];
    const primaryLinkedIds: string[] = Array.isArray(primaryMatch.linkedModuleIds) ? primaryMatch.linkedModuleIds : [];

    if (primaryMatch.allRowCards && Array.isArray(primaryMatch.allRowCards)) {
      const siblings = primaryMatch.allRowCards.filter((c: any) => c && c.id !== primaryMatch.id);
      if (primaryLinkedIds.length > 0) {
        linkedModules = siblings.filter((c: any) => primaryLinkedIds.includes(c.id));
        if (linkedModules.length === 0) {
          linkedModules = siblings.filter((c: any) => !c.isRootApp);
        }
      } else if (primaryMatch.isRootApp) {
        linkedModules = siblings;
      }
    } else if (primaryLinkedIds.length > 0) {
      linkedModules = allAvailableCards.filter(
        (c: any) => c && c.id !== primaryMatch.id && primaryLinkedIds.includes(c.id)
      );
    }

    const hasLinkedModules = linkedModules.length > 0;
    const linkedIdsSet = new Set(linkedModules.map((m: any) => String(m?.id || '')));

    // 5. CONDITION 2 : Modules de la catégorie sélectionnée ou 4 modules de succession
    let suggestedModules: any[] = [];
    if (activeCat) {
      const remainingCategoryMatches = scoredMatches
        .slice(1)
        .map((m) => m.card)
        .filter((c) => c && c.id !== primaryMatch.id && !linkedIdsSet.has(String(c.id || '')));
      const extraSuggestions = getSuccessionSuggestions(primaryMatch, allAvailableCards).filter(
        (sug) =>
          sug &&
          sug.id !== primaryMatch.id &&
          !linkedIdsSet.has(String(sug.id || '')) &&
          !remainingCategoryMatches.some((rm) => rm.id === sug.id)
      );
      suggestedModules = [...remainingCategoryMatches, ...extraSuggestions].slice(0, 10);
    } else if (!hasLinkedModules) {
      suggestedModules = getSuccessionSuggestions(primaryMatch, allAvailableCards);
    }

    return {
      primaryModule: primaryMatch,
      hasLinkedModules,
      linkedModules,
      suggestedModules
    };
  }, [allAvailableCards, searchQuery, selectedCategory]);

  // État des cases à cocher pour les modules associés
  const [checkedModules, setCheckedModules] = useState<Record<string, boolean>>({});

  const toggleModuleCheck = (modId: string) => {
    setCheckedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const hasSearchInput = Boolean(searchQuery.trim() || selectedCategory);

  const handleOpenTutorial = (e: React.MouseEvent, tutorialUrl?: string) => {
    e.stopPropagation();
    if (tutorialUrl) {
      window.open(cleanUrl(tutorialUrl), '_blank');
    } else {
      alert("Ce module dispose d'un tutoriel vidéo interactif bientôt disponible !");
    }
  };

  const handleActivateModule = async (e: React.MouseEvent, card: HubCardItem, activatedSubModuleIds?: string[]) => {
    e.stopPropagation();

    // Résolution canonique via src/config/appRegistry.ts
    const official =
      getOfficialModuleById(card.id) ||
      getOfficialModuleById(card.title || '') ||
      (card.targetView ? getOfficialModuleById(card.targetView) : undefined) ||
      (card.routeUrl ? getModuleByRoute(card.routeUrl) : undefined);

    const canonicalId = official?.id || card.id;
    const idLower = (canonicalId || '').toLowerCase();

    // 0. Modules en construction ou désactivés de l'appel
    const isUnderConstruction = Boolean(
      official?.isUnderConstruction ||
      (card as any).isUnderConstruction ||
      idLower === 'nana-switch' ||
      idLower === 'crm-automation' ||
      idLower === 'wameet' ||
      idLower === 'app-wameet' ||
      idLower === 'srv-nana-switch' ||
      idLower === 'srv-crm-automation'
    );

    if (isUnderConstruction) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nana_show_toast', {
          detail: {
            title: 'Module en construction',
            message: `Le module "${card.title || official?.name || 'Sélectionné'}" est actuellement en cours de développement et sera disponible prochainement.`,
            type: 'info'
          }
        }));
      }
      return;
    }

    // 1. Persistance dynamique dans Supabase (organization_blocks) & LocalStorage
    try {
      await toggleModule(canonicalId, true);
      if (activatedSubModuleIds && activatedSubModuleIds.length > 0) {
        for (const subId of activatedSubModuleIds) {
          const subOff = getOfficialModuleById(subId);
          await toggleModule(subOff?.id || subId, true);
        }
      }
    } catch (err) {
      console.warn('[OMNIBAR] Erreur activation module Supabase :', err);
    }

    setIsOpen(false);

    // 2. Résolution de la route et de la vue canoniques (AppRegistry)
    const canonicalRoute = official?.route || card.routeUrl || (card as any).route || `/dashboard/apps/${canonicalId}`;
    const canonicalView = official?.view || official?.actionId || card.targetView || (card as any).actionId;

    if (canonicalRoute && canonicalRoute !== '#') {
      try {
        window.history.pushState({}, '', canonicalRoute);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (_) {}
      window.dispatchEvent(
        new CustomEvent('app_navigate', {
          detail: {
            path: canonicalRoute,
            view: canonicalView,
            actionId: official?.actionId,
            moduleId: canonicalId
          }
        })
      );
    }

    if (onOpenApp) {
      onOpenApp({
        ...card,
        id: canonicalId,
        routeUrl: canonicalRoute,
        targetView: canonicalView,
        activatedSubModuleIds,
        isActivated: true
      });
      return;
    }

    if (onNavigate) {
      if (canonicalView) {
        onNavigate(canonicalView);
        return;
      }
      if (canonicalRoute && canonicalRoute !== '#') {
        onNavigate(canonicalRoute);
        return;
      }
    }
  };

  return (
    <>
      {/* =========================================================================
          1. BARRE STATIQUE FIXÉE DANS LE HEADER (STICKY TOP-0)
         ========================================================================= */}
      <div className={`w-full max-w-2xl mx-auto ${className}`}>
        <div
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="flex items-center gap-3 px-4 py-2 sm:py-2.5 bg-white border border-slate-300 rounded-xl shadow-xs hover:border-[#4169E1] transition-all group cursor-pointer"
          role="search"
        >
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-[#4169E1] transition-colors shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              if (!isOpen) setIsOpen(true);
            }}
            placeholder={placeholder || "Tapez pour chercher un Service, une Application, un Module ou un Outil..."}
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 text-xs sm:text-sm focus:outline-none cursor-text font-medium"
            aria-label="Rechercher un module"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 rounded border border-slate-200 shrink-0 pointer-events-none">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* =========================================================================
          2. OVERLAY SOMBRE PLEIN ÉCRAN & FLOUTÉ (PORTAIL DIRECT SUR DOCUMENT.BODY)
         ========================================================================= */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-start pt-4 sm:pt-8 px-3 sm:px-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop plein écran clicable pour fermer */}
          <div 
            className="absolute inset-0 z-0 bg-slate-950/80 backdrop-blur-md cursor-pointer" 
            onClick={() => setIsOpen(false)} 
          />

          {/* =======================================================================
              PANNEAU PRINCIPAL CENTRAL HUB (MODÈLE 1 COLONNE STACK)
             ======================================================================= */}
          <div className="relative z-10 w-full max-w-4xl bg-[#1E1E2E] rounded-2xl shadow-2xl border border-[#4169E1]/40 overflow-hidden flex flex-col max-h-[88vh] animate-in slide-in-from-top-4 duration-200">
            
            {/* Header Input avec icône loupe et bouton de fermeture */}
            <div className="flex items-center gap-3 px-5 py-4 bg-[#181825] border-b border-slate-800 shrink-0">
              <Search className="w-6 h-6 text-[#4169E1] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tapez pour chercher un Service, une Application, un Module ou un Outil..."
                className="w-full bg-transparent text-white placeholder-slate-400 text-base sm:text-lg focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Effacer la recherche"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Fermer l'overlay (Échap)"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Bannière de notification Wallet / Feedback */}
            {walletFeedback && (
              <div className="px-5 py-2 bg-emerald-950/70 border-b border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
                <span>{walletFeedback}</span>
                <button type="button" onClick={() => setWalletFeedback(null)} className="text-emerald-400 hover:text-white cursor-pointer">✕</button>
              </div>
            )}

            {/* Catégories rapides en pilules horizontales */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2 px-5 py-2.5 bg-[#141420] border-b border-slate-800/80 overflow-x-auto text-xs shrink-0 scrollbar-none">
                <span className="text-slate-400 shrink-0 font-medium">Catégories :</span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      if (selectedCategory === cat) {
                        setSelectedCategory(null);
                      } else {
                        setSelectedCategory(cat);
                      }
                    }}
                    className={`px-3 py-1 rounded-full font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      selectedCategory === cat
                        ? 'bg-[#4169E1] text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Layers className="w-3 h-3 text-blue-400 opacity-80 shrink-0" />
                    <span>{cleanCategoryName(cat)}</span>
                  </button>
                ))}
                {selectedCategory && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs text-rose-400 hover:underline shrink-0 ml-1 cursor-pointer"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            )}

            {/* =======================================================================
                ZONE DE CONTENU : RECHERCHE STRUCTURÉE (CONDITION 1 & CONDITION 2)
               ======================================================================= */}
            <div className="p-6 overflow-y-auto space-y-6 h-[600px] scrollbar-thin scrollbar-thumb-slate-700">
              {!searchQuery.trim() && !selectedCategory ? (
                /* État initial : Quand on touche la barre, RIEN ne sort par défaut */
                <div className="py-14 px-6 text-center text-slate-400 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#28283D] border border-slate-700/80 flex items-center justify-center mb-4 text-3xl shadow-xl shadow-blue-950/30">
                    🔍
                  </div>
                  <h4 className="text-base font-bold text-slate-200">
                    Rechercher parmi les 35+ Services, Applications, Modules et Outils Nanasore
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 max-w-md leading-relaxed">
                    Tapez le nom d'un élément pour l'afficher (ex : <strong>Caisse</strong>, <strong>Nanagénérateur</strong>, <strong>WhatsApp</strong>, <strong>Stock</strong>, <strong>Factures</strong>, <strong>Tunnels</strong>)...
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-5 max-w-lg">
                    {['Caisse', 'Nanagénérateur', 'Stock', 'Comptabilité', 'WhatsApp', 'Tunnels', 'Devis', 'Livraison'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSearchQuery(tag.toLowerCase())}
                        className="px-3 py-1 bg-slate-800/80 hover:bg-[#4169E1]/20 hover:border-[#4169E1] text-slate-300 hover:text-white rounded-lg text-xs border border-slate-700 transition cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  {/* Catalogue dynamique des 27 solutions officielles Nanasore synchronisées Firebase RTDB */}
                  <div className="w-full mt-8 text-left">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-[#4169E1]" />
                        <h5 className="text-xs font-black uppercase tracking-wider text-slate-200">
                          Catalogue Officiel Nanasore (36 Solutions : Applications, Services, Modules & Outils)
                        </h5>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        {activeModules.length} / {dynamicModules.length} Actif(s)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {dynamicModules.map((m) => {
                        const active = m.enabled;
                        const access = evaluateClientModuleAccess(m.id, licenseState);
                        const official = getOfficialModuleById(m.id);

                        return (
                          <div
                            key={m.id}
                            className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                              access.readOnly
                                ? 'bg-slate-900/40 border-amber-500/30 hover:border-amber-500/60'
                                : active
                                  ? 'bg-slate-900/70 border-emerald-500/40 hover:border-emerald-500/60'
                                  : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-white truncate">{m.name}</span>
                                <span className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-emerald-400 shadow-xs shadow-emerald-400' : 'bg-slate-600'}`} />
                                {access.readOnly && (
                                  <span className="text-[9px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/30 flex items-center gap-1">
                                    <Eye className="w-2.5 h-2.5" />
                                    <span>Mode Lecture</span>
                                  </span>
                                )}
                                {access.isPayPerUse && (
                                  <span className="text-[9px] font-bold text-purple-400 bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-500/30 flex items-center gap-1">
                                    <CreditCard className="w-2.5 h-2.5" />
                                    <span>À l'usage (Sans KYC)</span>
                                  </span>
                                )}
                              </div>
                              <ExpandableModuleDescription 
                                id={m.id}
                                description={m.description}
                                defaultClamped="line-clamp-1"
                                className="mt-0.5"
                              />
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[10px] text-slate-500 font-semibold">{m.category}</span>
                                <span className="text-[9px] font-bold text-blue-400 bg-blue-950/40 px-1.5 py-0.2 rounded border border-blue-500/20">
                                  [{m.taxonomy}]
                                </span>
                                {active && (
                                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                    En ligne
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions selon licence contextuelle */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                              {/* CTA d'activation ou indicateur */}
                              {access.readOnly ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCreateUniverse(m.id, m.name, m.taxonomy || m.type);
                                  }}
                                  className="px-2.5 py-1 bg-amber-500/90 hover:bg-amber-500 text-slate-950 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                                  title={getUniverseRequiredCta(m.taxonomy || m.type)}
                                >
                                  <ShieldAlert className="w-3 h-3 text-slate-950" />
                                  <span>{getUniverseRequiredCta(m.taxonomy || m.type)}</span>
                                </button>
                              ) : access.isPayPerUse ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => handlePayPerUseConsume(e, m.id, m.name)}
                                    className="px-2 py-0.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 rounded text-[10px] font-bold transition cursor-pointer"
                                    title="Débit Wallet sans KYC"
                                  >
                                    💳 Wallet
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleBuyAlaCarte(e, m.id, m.name)}
                                    className="px-2 py-0.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/40 rounded text-[10px] font-bold transition cursor-pointer"
                                    title="Achat à la carte dans le Thème Gratuit"
                                  >
                                    + Thème Gratuit
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await toggleModule(m.id, !active);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                    active
                                      ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                                      : 'bg-[#4169E1] text-white'
                                  }`}
                                >
                                  {active ? 'Désactiver' : 'Activer'}
                                </button>
                              )}

                              {/* Bouton d'accès en mode lecture ou complet */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActivateModule(e, {
                                    id: m.id,
                                    title: m.name,
                                    description: m.description,
                                    mediaType: 'image',
                                    mediaUrl: getCardMediaUrl(official),
                                    routeUrl: m.route,
                                    targetView: m.view || m.targetView
                                  });
                                }}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1 shrink-0 ml-auto"
                                title={access.readOnly ? "Consulter en mode lecture seule (aperçu)" : "Accéder au module"}
                              >
                                {access.readOnly ? (
                                  <>
                                    <Eye className="w-3 h-3 text-amber-400" />
                                    <span>Aperçu</span>
                                  </>
                                ) : (
                                  <span>Ouvrir</span>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : !structuredOutput ? (
                /* Aucun résultat pour la recherche tapée */
                <div className="py-14 px-6 text-center text-slate-400 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-3 text-xl">
                    🔍
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    Aucun module trouvé pour « {searchQuery || selectedCategory} »
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Vérifiez l'orthographe ou parcourez nos catégories ci-dessus.
                  </p>
                </div>
              ) : (
                /* RÉSULTAT DE SORTIE DE BLOC STRUCTURÉ */
                <div className="space-y-6">

                  {/* 1. MODULE PRINCIPAL : SORT EN HAUT */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ⭐ Module Principal
                        </span>
                        {structuredOutput.primaryModule.subtitle && (
                          <span className="text-xs text-slate-400 font-medium">
                            {structuredOutput.primaryModule.subtitle}
                          </span>
                        )}
                      </div>
                      {structuredOutput.primaryModule.palmares && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/25">
                          {structuredOutput.primaryModule.palmares}
                        </span>
                      )}
                    </div>

                    {/* Présentation Visuelle Complète : Image / Slide Module + Blocs & Liens */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/30 via-slate-900 to-slate-900/90 border border-blue-500/40 hover:border-blue-400/70 transition-all shadow-xl">
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        
                        {/* VIGNETTE D'IMAGE / SLIDE DU MODULE PRINCIPAL */}
                        {(() => {
                          const primImg = getCardMediaUrl(structuredOutput.primaryModule);
                          const hasSlides = Array.isArray(structuredOutput.primaryModule.slides) && structuredOutput.primaryModule.slides.length > 0;
                          
                          if (hasSlides) {
                            return (
                              <div className="w-full sm:w-56 rounded-xl overflow-hidden shrink-0 border border-blue-500/30 shadow-md">
                                <SlideModuleBlock
                                  id={String(structuredOutput.primaryModule.id || 'primary-slide')}
                                  slides={structuredOutput.primaryModule.slides}
                                  settings={
                                    structuredOutput.primaryModule.slideSettings && typeof structuredOutput.primaryModule.slideSettings === 'object'
                                      ? structuredOutput.primaryModule.slideSettings
                                      : { autoplay: true, interval: 3500, aspectRatio: 'wide' }
                                  }
                                />
                              </div>
                            );
                          }

                          if (primImg) {
                            return (
                              <div className="relative w-full sm:w-44 h-28 sm:h-28 rounded-xl overflow-hidden shrink-0 border border-slate-700/80 bg-slate-950 shadow-md group">
                                <img
                                  src={primImg}
                                  alt={structuredOutput.primaryModule.title || 'Module'}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  crossOrigin="anonymous"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
                              </div>
                            );
                          }
                          return null;
                        })()}

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <a
                              href={structuredOutput.primaryModule.routeUrl || '#'}
                              onClick={(e) => {
                                e.preventDefault();
                                handleActivateModule(e, structuredOutput.primaryModule);
                              }}
                              className="text-base sm:text-lg font-black text-blue-400 hover:text-blue-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.85)] hover:drop-shadow-[0_0_14px_rgba(96,165,250,1)] transition-all duration-200 cursor-pointer hover:underline inline-flex items-center gap-1.5"
                              style={{ textShadow: '0 0 10px rgba(59, 130, 246, 0.8), 0 0 20px rgba(37, 99, 235, 0.4)' }}
                            >
                              <span>{structuredOutput.primaryModule.title || 'Module Nanasore'}</span>
                              <ExternalLink className="w-4 h-4 text-blue-400 shrink-0 drop-shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                            </a>
                            <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold tracking-wider bg-blue-500/15 text-blue-300 border border-blue-400/30 shadow-xs shadow-blue-500/10 shrink-0">
                              [{getTaxonomyBadge(structuredOutput.primaryModule)}]
                            </span>
                            {structuredOutput.primaryModule.trialBadge && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-500/15 text-blue-300 rounded-full border border-blue-500/30 shrink-0">
                                {structuredOutput.primaryModule.trialBadge}
                              </span>
                            )}
                          </div>
                          <ExpandableModuleDescription 
                            id={structuredOutput.primaryModule.id}
                            description={structuredOutput.primaryModule.description}
                            defaultClamped="line-clamp-2"
                          />

                          {/* Blocs et Attributs du Module */}
                          {structuredOutput.primaryModule.blocks && Array.isArray(structuredOutput.primaryModule.blocks) && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {structuredOutput.primaryModule.blocks.filter((b: any) => b?.type !== 'header' && b?.type !== 'image_slider').map((b: any, bIdx: number) => (
                                <span key={b.id || bIdx} className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 font-medium">
                                  {b.type === 'cta' ? (b.buttonText || 'Bouton Action') : b.type === 'description' ? '📄 Descriptif' : b.type === 'image' ? '🖼️ Visuel' : `Bloc ${b.type}`}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                          {structuredOutput.primaryModule.tutorialUrl && (
                            <button 
                              type="button"
                              onClick={(e) => handleOpenTutorial(e, structuredOutput.primaryModule.tutorialUrl)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-600 transition cursor-pointer active:scale-95"
                            >
                              ▶️ Voir Tuto
                            </button>
                          )}
                          {(() => {
                            const primAccess = evaluateClientModuleAccess(structuredOutput.primaryModule.id, licenseState);
                            
                            if (primAccess.readOnly) {
                              const moduleType = structuredOutput.primaryModule.taxonomy || structuredOutput.primaryModule.type;
                              const ctaText = getUniverseRequiredCta(moduleType);
                              return (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenCreateUniverse(
                                        structuredOutput.primaryModule.id,
                                        structuredOutput.primaryModule.title,
                                        moduleType
                                      );
                                    }}
                                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition shadow-md flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    <span>{ctaText}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleActivateModule(e, { ...structuredOutput.primaryModule, isReadOnly: true })}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                                    title="Consulter en aperçu lecture seule"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Aperçu</span>
                                  </button>
                                </div>
                              );
                            }

                            if (primAccess.isPayPerUse) {
                              return (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => handlePayPerUseConsume(e, structuredOutput.primaryModule.id, structuredOutput.primaryModule.title)}
                                    className="px-3 py-1.5 bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-500/50 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                                    title="Débit de votre portefeuille sans KYC requis"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    <span>Utiliser via Wallet (Sans KYC)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleBuyAlaCarte(e, structuredOutput.primaryModule.id, structuredOutput.primaryModule.title)}
                                    className="px-2.5 py-1.5 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/50 rounded-lg text-xs font-bold transition cursor-pointer"
                                    title="Injecter dans le Thème Gratuit"
                                  >
                                    + Thème Gratuit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleActivateModule(e, structuredOutput.primaryModule)}
                                    className="px-3 py-1.5 bg-[#4169E1] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-md flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>Ouvrir</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            }

                            if (isModuleActive(structuredOutput.primaryModule.id)) {
                              return (
                                <div className="flex items-center gap-2">
                                  <button 
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await toggleModule(structuredOutput.primaryModule.id, false);
                                    }}
                                    className="px-3 py-1.5 bg-emerald-950/60 hover:bg-rose-950/60 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer group"
                                    title="Désactiver ce module"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 group-hover:hidden" />
                                    <X className="w-3.5 h-3.5 text-rose-400 hidden group-hover:inline" />
                                    <span className="group-hover:hidden">✓ Actif</span>
                                    <span className="hidden group-hover:inline">Désactiver</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleActivateModule(e, structuredOutput.primaryModule)}
                                    className="px-3.5 py-1.5 bg-[#4169E1] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-md active:scale-95 flex items-center gap-1"
                                  >
                                    <span>Ouvrir</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <button 
                                type="button"
                                onClick={(e) => handleActivateModule(e, structuredOutput.primaryModule)}
                                className="px-4 py-1.5 bg-[#4169E1] hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-md shadow-[#4169E1]/20 flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
                              >
                                <Zap className="w-3.5 h-3.5 fill-current" />
                                <span>{getTaxonomyBadge(structuredOutput.primaryModule) === 'Outil' ? '🛒 Acheter' : '⚡ Activer'}</span>
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. CONDITION 1 : LES MODULES LIÉS AU MODULE PRINCIPAL SUIVENT EN BAS */}
                  {structuredOutput.hasLinkedModules && structuredOutput.linkedModules.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[#4169E1]" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#4169E1]">
                            Modules Liés au Module Principal ({structuredOutput.linkedModules.length})
                          </h4>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Cochez pour activer simultanément
                        </span>
                      </div>

                      <div className="space-y-2">
                        {structuredOutput.linkedModules.map((mod: any, mIdx: number) => {
                          const checked = !!checkedModules[mod.id];
                          const modImg = getCardMediaUrl(mod);
                          return (
                            <div 
                              key={mod.id || mIdx}
                              onClick={() => toggleModuleCheck(mod.id)}
                              className={`py-2 px-3 rounded-xl transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer border ${
                                checked 
                                  ? 'border-[#4169E1] bg-blue-950/30 shadow-xs' 
                                  : 'border-slate-800/80 hover:border-blue-500/30 bg-slate-900/30 hover:bg-slate-900/60'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <input 
                                    type="checkbox"
                                    id={`check-${mod.id}`}
                                    checked={checked}
                                    onChange={() => toggleModuleCheck(mod.id)}
                                    className="w-4 h-4 rounded accent-[#4169E1] cursor-pointer"
                                  />
                                </div>
                                {modImg ? (
                                  <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-slate-700/80 bg-slate-950 shadow-sm relative group">
                                    <img
                                      src={modImg}
                                      alt={mod.title || 'Module'}
                                      className="w-full h-full object-cover"
                                      crossOrigin="anonymous"
                                      loading="lazy"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-11 h-11 rounded-lg shrink-0 border border-blue-500/30 bg-blue-950/40 flex items-center justify-center text-blue-400 font-bold text-xs">
                                    {String(mod.title || 'MO').slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <a
                                      href={mod.routeUrl || '#'}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleActivateModule(e, mod);
                                      }}
                                      className="text-xs sm:text-sm font-bold text-blue-400 hover:text-blue-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.85)] hover:drop-shadow-[0_0_12px_rgba(96,165,250,1)] transition-all cursor-pointer hover:underline inline-flex items-center gap-1"
                                      style={{ textShadow: '0 0 8px rgba(59, 130, 246, 0.75)' }}
                                    >
                                      <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0 drop-shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                                      <span>{mod.title || 'Module'}</span>
                                    </a>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold tracking-wider bg-blue-500/15 text-blue-300 border border-blue-400/30 shadow-xs shrink-0">
                                      [{getTaxonomyBadge(mod)}]
                                    </span>
                                    {mod.palmares && (
                                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                                        {mod.palmares}
                                      </span>
                                    )}
                                    {mod.trialBadge && (
                                      <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20">
                                        {mod.trialBadge}
                                      </span>
                                    )}
                                  </div>
                                  <ExpandableModuleDescription 
                                    id={mod.id}
                                    description={mod.description}
                                    defaultClamped="line-clamp-1 sm:line-clamp-2"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                {mod.tutorialUrl && (
                                  <button 
                                    type="button"
                                    onClick={(e) => handleOpenTutorial(e, mod.tutorialUrl)}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-600 transition"
                                  >
                                    ▶️ Tuto
                                  </button>
                                )}
                                {isModuleActive(mod.id) ? (
                                  <div className="flex items-center gap-1.5">
                                    <button 
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        await toggleModule(mod.id, false);
                                      }}
                                      className="px-2 py-1 bg-emerald-950/60 hover:bg-rose-950/60 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer group"
                                      title="Désactiver"
                                    >
                                      <Check className="w-3 h-3 text-emerald-400 group-hover:hidden" />
                                      <X className="w-3 h-3 text-rose-400 hidden group-hover:inline" />
                                      <span className="group-hover:hidden">Actif</span>
                                      <span className="hidden group-hover:inline">Désactiver</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleActivateModule(e, mod)}
                                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-600 transition"
                                    >
                                      Ouvrir
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    type="button"
                                    onClick={(e) => handleActivateModule(e, mod)}
                                    className="px-2.5 py-1 bg-[#4169E1] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition cursor-pointer active:scale-95"
                                  >
                                    {getTaxonomyBadge(mod) === 'Outil' ? '🛒 Acheter seul' : '⚡ Activer seul'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Barre collective d'activation */}
                      <div className="pt-2">
                        <div className="bg-gradient-to-r from-blue-950/60 to-slate-900 border border-[#4169E1]/40 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="text-xs text-slate-300">
                            Options sélectionnées : <strong className="text-emerald-400">{structuredOutput.linkedModules.filter((m: any) => !!checkedModules[m.id]).length}</strong> sur {structuredOutput.linkedModules.length} module(s)
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={(e) => handleActivateModule(e, structuredOutput.primaryModule)}
                              className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-600 transition"
                            >
                              {getTaxonomyBadge(structuredOutput.primaryModule) === 'Outil' ? `Acheter ${structuredOutput.primaryModule.title} seule` : `Activer ${structuredOutput.primaryModule.title} seule`}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                const selectedMods = structuredOutput.linkedModules.filter((m: any) => !!checkedModules[m.id]).map((m: any) => m.id);
                                handleActivateModule(e, structuredOutput.primaryModule, selectedMods);
                              }}
                              className="flex-1 sm:flex-initial px-4 py-1.5 bg-[#4169E1] hover:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-[#4169E1]/30 transition"
                            >
                              {getTaxonomyBadge(structuredOutput.primaryModule) === 'Outil' ? '🛒 Acheter Tout Ensemble' : '⚡ Activer Tout Ensemble'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. CONDITION 2 : MODULES DE LA CATÉGORIE SÉLECTIONNÉE OU 4 MODULES DE SUCCESSION */}
                  {(!structuredOutput.hasLinkedModules || Boolean(selectedCategory)) && structuredOutput.suggestedModules && structuredOutput.suggestedModules.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Compass className="w-4 h-4 text-amber-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                            {selectedCategory
                              ? `Autres modules de la catégorie « ${cleanCategoryName(selectedCategory)} » (${structuredOutput.suggestedModules.length})`
                              : 'Modules de succession conseillés (4 suggestions utiles selon vos recherches)'}
                          </h4>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {selectedCategory ? 'Catalogue thématique' : 'Recommandations ciblées'}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {structuredOutput.suggestedModules.map((sug: any, sIdx: number) => {
                          const sugImg = getCardMediaUrl(sug);
                          return (
                            <div 
                              key={sug.id || sIdx}
                              className="py-2.5 px-3.5 rounded-xl border border-slate-800/80 hover:border-blue-500/40 bg-slate-900/40 hover:bg-slate-900/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {sugImg ? (
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border border-slate-700/80 bg-slate-950 shadow-sm relative group">
                                    <img
                                      src={sugImg}
                                      alt={sug.title || 'Module'}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                      crossOrigin="anonymous"
                                      loading="lazy"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl shrink-0 border border-blue-500/30 bg-blue-950/40 flex items-center justify-center text-blue-400 font-bold text-xs shadow-sm">
                                    {String(sug.title || 'MO').slice(0, 2).toUpperCase()}
                                  </div>
                                )}

                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <a
                                      href={sug.routeUrl || '#'}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleActivateModule(e, sug);
                                      }}
                                      className="text-xs sm:text-sm font-bold text-blue-400 hover:text-blue-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.85)] hover:drop-shadow-[0_0_12px_rgba(96,165,250,1)] transition-all cursor-pointer hover:underline inline-flex items-center gap-1"
                                      style={{ textShadow: '0 0 8px rgba(59, 130, 246, 0.75)' }}
                                    >
                                      <span>{sug.title}</span>
                                      <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    </a>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold tracking-wider bg-blue-500/15 text-blue-300 border border-blue-400/30 shadow-xs shrink-0">
                                      [{getTaxonomyBadge(sug)}]
                                    </span>
                                    {sug.palmares && (
                                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 shrink-0">
                                        {sug.palmares}
                                      </span>
                                    )}
                                    {sug.trialBadge && (
                                      <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20 shrink-0">
                                        {sug.trialBadge}
                                      </span>
                                    )}
                                  </div>
                                  <ExpandableModuleDescription 
                                    id={sug.id}
                                    description={sug.description}
                                    defaultClamped="line-clamp-1 sm:line-clamp-2"
                                  />
                                </div>
                              </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              {sug.tutorialUrl && (
                                <button 
                                  type="button"
                                  onClick={(e) => handleOpenTutorial(e, sug.tutorialUrl)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold border border-slate-600 transition"
                                >
                                  ▶️ Tuto
                                </button>
                              )}
                              {isModuleActive(sug.id) ? (
                                <div className="flex items-center gap-1.5">
                                  <button 
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await toggleModule(sug.id, false);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-950/60 hover:bg-rose-950/60 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer group"
                                    title="Désactiver"
                                  >
                                    <Check className="w-3 h-3 text-emerald-400 group-hover:hidden" />
                                    <X className="w-3 h-3 text-rose-400 hidden group-hover:inline" />
                                    <span className="group-hover:hidden">Actif</span>
                                    <span className="hidden group-hover:inline">Désactiver</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleActivateModule(e, sug)}
                                    className="px-3 py-1 bg-[#4169E1] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-md active:scale-95 flex items-center gap-1"
                                  >
                                    <span>Ouvrir</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  type="button"
                                  onClick={(e) => handleActivateModule(e, sug)}
                                  className="px-3 py-1 bg-[#4169E1] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-md active:scale-95"
                                >
                                  {getTaxonomyBadge(sug) === 'Outil' ? '🛒 Acheter' : '⚡ Activer'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Pied du panneau overlay : Raccourci de fermeture */}
            <div className="px-5 py-2.5 bg-[#141420] border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
              <span>Appuyez sur <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">Échap</kbd> ou cliquez à l'extérieur pour fermer</span>
              <span className="text-[#4169E1] font-semibold">Central Hub dynamique</span>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default CentralHubOmnibar;
