/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sidebar SaaS Principale avec section "📌 Mes Applications" :
 * 1. Fonctionnalités de base nettoyées (Tableau de Bord, Wameet, Vitrine, Caisse)
 * 2. Section dynamique "📌 Mes Applications" synchronisée avec Firebase RTDB
 * 3. Épingler / Désépingler des applications en 1 clic
 * 4. Bouton d'ajout rapide relié à l'Omnibar
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, 
  Store, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  LayoutGrid,
  PlusCircle,
  Lock,
  Pin,
  PinOff,
  Sparkles,
  Crown,
  ArrowUpRight,
  Palette,
  ExternalLink,
  ShieldAlert,
  Search,
  X,
  Layers,
  Box,
  Cpu,
  Wrench,
  Check,
  ChevronDown
} from 'lucide-react';
import { StoreUser, StoreSubscription, SellerMode } from '../../types';
import { 
  isFreePlan, 
  resolveVendorType, 
  resolveSellerMode,
  persistSellerModeLocally 
} from '../../utils/planFeatures';
import { updateSellerModeInFirestore } from '../../utils/firestoreService';
import { playTapBeep, playValidationBeep } from '../../utils/audio';
import { isSuperAdminLocally } from '../../services/superAdminService';
import { WameetSquircleIcon } from '../wameet/WameetLogo';
import { NanasorePasserelleIcon } from './NanasoreLogo';
import { 
  resolveCurrentTenantId, 
  listenToTenantApps, 
  togglePinApp, 
  InstalledAppData 
} from '../../services/appActivationService';
import { APPS_REGISTRY, AppRegistryItem } from '../../data/appsRegistry';

export type TaxonomyType = 'APPLICATION' | 'SERVICE' | 'MODULE' | 'OUTIL';

export interface CatalogItem {
  id: string;
  name: string;
  taxonomy: TaxonomyType;
  category: string;
  description: string;
  view?: string;
  route?: string;
  actionId?: string;
}

export const ALL_SOLUTIONS_CATALOG: CatalogItem[] = [
  // --- 14 APPLICATIONS ---
  {
    id: 'app-pos',
    name: 'Caisse Tactile Magasin (POS)',
    taxonomy: 'APPLICATION',
    category: 'Commerce & Vente',
    description: 'Encaissement express au comptoir, tickets & paiements.',
    view: 'POS',
    route: '/pos'
  },
  {
    id: 'app-studio',
    name: 'Vitrine en Ligne (E-Shop)',
    taxonomy: 'APPLICATION',
    category: 'Commerce & Vente',
    description: 'Boutique connectée, panier client & commande WhatsApp.',
    view: 'STUDIO',
    route: '/shop'
  },
  {
    id: 'app-wameet',
    name: 'Wameet',
    taxonomy: 'APPLICATION',
    category: 'Réseau & Social',
    description: 'Réseau social professionnel, messagerie & stories marchands.',
    view: 'WAMEET',
    route: '/wameet'
  },
  {
    id: 'app-nanagenerator',
    name: 'Nanagénérateur AI',
    taxonomy: 'APPLICATION',
    category: 'Studio IA',
    description: 'Création de vidéos et visuels publicitaires par intelligence artificielle.',
    view: 'APPS_NANAGENERATOR',
    route: '/dashboard/apps/nanagenerator'
  },
  {
    id: 'app-ultimate-funnel',
    name: 'Ultimate Funnel Builder',
    taxonomy: 'APPLICATION',
    category: 'Tunnels de Vente',
    description: 'Constructeur de tunnels haute conversion avec upsells et paiements express.',
    view: 'ULTIMATE_FUNNEL',
    route: '/dashboard/funnel/ultimate'
  },
  {
    id: 'app-modular-funnel',
    name: 'Funnel Builder Modulaire',
    taxonomy: 'APPLICATION',
    category: 'Tunnels de Vente',
    description: 'Concepteur modulaire par blocs drag & drop pour tunnels sur-mesure.',
    view: 'MODULAR_FUNNEL',
    route: '/dashboard/funnel/modular'
  },
  {
    id: 'app-deal-builder',
    name: 'Public Deal Page Builder',
    taxonomy: 'APPLICATION',
    category: 'Tunnels de Vente',
    description: 'Créateur de pages d\'offres flash et de deals publics physiques à conversion immédiate.',
    view: 'PHYSICAL_FUNNEL',
    route: '/dashboard/funnel/physical'
  },
  {
    id: 'app-cours-forge',
    name: 'Cours Forge',
    taxonomy: 'APPLICATION',
    category: 'Éducation',
    description: 'Atelier complet de conception et génération de cours, modules vidéo et quiz.',
    view: 'COURSE_CREATE',
    route: '/dashboard/courses/create'
  },
  {
    id: 'app-nanamarket',
    name: 'NaNa Market (Annuaire B2B2C)',
    taxonomy: 'APPLICATION',
    category: 'Marketplace',
    description: 'Place de marché nationale et annuaire des marchands vérifiés.',
    view: 'MARKET_DIRECTORY',
    route: '/dashboard/market'
  },
  {
    id: 'app-webinar',
    name: 'Studio de Génération de Live et Webinaire',
    taxonomy: 'APPLICATION',
    category: 'Direct Live',
    description: 'Diffusion vidéo en direct avec vente de produits en temps réel.',
    view: 'WEBINAR',
    route: '/webinar'
  },
  {
    id: 'app-docusign',
    name: 'DocuSign Hub & Contrats Signés',
    taxonomy: 'APPLICATION',
    category: 'Juridique',
    description: 'Signature électronique légale de contrats de vente et partenariats.',
    view: 'DOCUSIGN',
    route: '/docusign'
  },

  // --- SERVICES ---
  {
    id: 'srv-crm-automation',
    name: 'CRM et Automation',
    taxonomy: 'SERVICE',
    category: 'Intégrations & Extensions',
    description: 'Paramètres & Intégrations (Modules Extensions) : WooCommerce, Passerelle SMS / OTP, Emailing Brevo et connecteurs.',
    view: 'SETTINGS_EXTENSIONS',
    route: '/dashboard/connecteurs'
  },
  {
    id: 'srv-theme-builder',
    name: 'Studio de Choix et Construction de Thème',
    taxonomy: 'SERVICE',
    category: 'Boutique & Design',
    description: 'Sélectionnez, prévisualisez et construisez le thème pour votre vitrine e-commerce.',
    view: 'STUDIO',
    route: '/dashboard/vitrine'
  },
  {
    id: 'srv-partner',
    name: 'Espace Partenaire & Affiliation',
    taxonomy: 'SERVICE',
    category: 'Croissance',
    description: 'Programme d\'affiliation avec commissions automatiques et liens parrainage.',
    view: 'PARTNER',
    route: '/partner'
  },
  {
    id: 'srv-course-create',
    name: 'Centre de Création de Cours, et De Formation',
    taxonomy: 'SERVICE',
    category: 'Formation',
    description: 'Correction des devoirs, suivi des cohortes et gestion pédagogique.',
    view: 'INSTRUCTOR',
    route: '/dashboard/formateur'
  },
  {
    id: 'srv-academy-support',
    name: 'Centre de Formation et D\'Accompagnement',
    taxonomy: 'SERVICE',
    category: 'Éducation',
    description: 'Espace cours, leçons vidéo et accompagnement des apprenants.',
    view: 'ACADEMY',
    route: '/academy'
  },
  {
    id: 'srv-nana-switch',
    name: 'NaNa Switch Cloud (Multi-Comptes)',
    taxonomy: 'SERVICE',
    category: 'Communication & Réseau',
    description: 'Basculez instantanément entre vos boutiques et comptes sans vous reconnecter.',
    view: 'NANA_SWITCH',
    route: '/dashboard/switch'
  },
  {
    id: 'srv-kyc',
    name: 'Chaîne d\'Identification KYC & Sécurité',
    taxonomy: 'SERVICE',
    category: 'Conformité',
    description: 'Vérification des pièces d\'identité et conformité juridique des marchands.',
    view: 'KYC_VERIFICATION',
    route: '/kyc'
  },

  // --- MODULES ---
  {
    id: 'mod-inventory',
    name: 'Stock & Inventaire Intelligent',
    taxonomy: 'MODULE',
    category: 'Gestion',
    description: 'Suivi en temps réel des quantités, alertes de rupture et codes-barres.',
    view: 'INVENTORY',
    route: '/inventory'
  },
  {
    id: 'mod-debts',
    name: 'Gestion des Dettes (Ardoises clients)',
    taxonomy: 'MODULE',
    category: 'Trésorerie',
    description: 'Carnet de crédits clients, échéanciers et relances WhatsApp en 1 clic.',
    view: 'DEBT_BOOK',
    route: '/dashboard/dettes'
  },
  {
    id: 'mod-analytics',
    name: 'Analytique & Courbe des Gains',
    taxonomy: 'MODULE',
    category: 'Statistiques',
    description: 'Graphiques de chiffre d\'affaires, marges bénéficiaires et produits phares.',
    view: 'REPORTS',
    route: '/dashboard/rapports'
  },
  {
    id: 'mod-team-employees',
    name: 'Gestion des Employés / Caissiers',
    taxonomy: 'MODULE',
    category: 'Sécurité & RH',
    description: 'Droits d\'accès par code PIN, caissiers multiples et traçabilité des ventes.',
    actionId: 'EMPLOYEE_MANAGEMENT'
  },
  {
    id: 'mod-cvpro',
    name: 'CVPro & Création Documentaire',
    taxonomy: 'MODULE',
    category: 'Documents',
    description: 'Générateur de CV professionnels, attestations et portfolios vendeurs.',
    view: 'CV_CREATOR',
    route: '/dashboard/cv'
  },
  {
    id: 'mod-pixels-crm',
    name: 'Pixels de Tracking / CRM Avancé',
    taxonomy: 'MODULE',
    category: 'Marketing',
    description: 'Connexion des pixels Facebook Meta, Google Analytics & TikTok Ads.',
    actionId: 'TRACKING_PIXELS_CRM'
  },

  // --- OUTILS ---
  {
    id: 'tool-scanner',
    name: 'Scanner Code-Barres & Douchette USB/Caméra',
    taxonomy: 'OUTIL',
    category: 'Matériel POS',
    description: 'Détection instantanée via douchette physique laser ou caméra mobile.',
    view: 'BARCODE_SCANNER',
    route: '/scanner'
  },
  {
    id: 'tool-excel',
    name: 'Import & Export de Fichiers Excel / CSV',
    taxonomy: 'OUTIL',
    category: 'Données',
    description: 'Importation en masse de catalogues produits et export comptable.',
    view: 'EXCEL_IMPORT',
    route: '/excel'
  },
  {
    id: 'tool-gateway',
    name: 'Passerelle Souveraine / Connecter API Nanasore',
    taxonomy: 'OUTIL',
    category: 'Intégration API',
    description: 'Intégration directe des API souveraines et webhooks temps réel.',
    actionId: 'SOVEREIGN_GATEWAY'
  }
];

export interface AppSidebarProps {
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  currentView?: string;
  onNavigate: (view: string) => void;
  onOpenPaywall?: () => void;
  onOpenSettings?: () => void;
  onOpenEmployeeManagement?: () => void;
  onOpenSovereignGateway?: () => void;
  onOpenCustomDomain?: () => void;
  onOpenTrackingCrm?: () => void;
  onOpenWhiteLabel?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  isStoreOpen?: boolean;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentUser,
  subscription,
  currentView = 'MASTER_HUB',
  isStoreOpen = true,
  onNavigate,
  onOpenPaywall,
  onOpenSettings,
  onOpenEmployeeManagement,
  onOpenSovereignGateway,
  onOpenCustomDomain,
  onOpenTrackingCrm,
  onOpenWhiteLabel,
  collapsed = false,
  onToggleCollapse,
  className = ''
}) => {
  const isFree = isFreePlan(subscription);
  const isSuperAdmin = useMemo(() => isSuperAdminLocally(currentUser), [currentUser]);
  const [sellerMode, setSellerMode] = useState<SellerMode>(() => resolveSellerMode(currentUser));
  const tenantId = useMemo(() => resolveCurrentTenantId(currentUser), [currentUser]);

  // État du magnifique bouton "Liste de nos Services, Applications, Modules et Outils"
  const [isServicesMenuOpen, setIsServicesMenuOpen] = useState(false);
  const [servicesSearch, setServicesSearch] = useState('');
  const [servicesTaxonomyFilter, setServicesTaxonomyFilter] = useState<'ALL' | TaxonomyType>('ALL');
  const servicesMenuRef = useRef<HTMLDivElement>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggleServicesMenu = () => {
    playTapBeep();
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setIsServicesMenuOpen(prev => !prev);
  };

  const handleServicesMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handleServicesMouseLeave = () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setIsServicesMenuOpen(false);
    }, 350); // Fermeture dynamique avec élégance
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (servicesMenuRef.current && !servicesMenuRef.current.contains(e.target as Node)) {
        setIsServicesMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsServicesMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  const filteredSolutions = useMemo(() => {
    return ALL_SOLUTIONS_CATALOG.filter(item => {
      if (servicesTaxonomyFilter !== 'ALL' && item.taxonomy !== servicesTaxonomyFilter) {
        return false;
      }
      if (!servicesSearch.trim()) return true;
      const q = servicesSearch.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.taxonomy.toLowerCase().includes(q)
      );
    });
  }, [servicesSearch, servicesTaxonomyFilter]);

  const handleSolutionClick = (item: CatalogItem) => {
    playTapBeep();
    setIsServicesMenuOpen(false);

    if (item.actionId === 'EMPLOYEE_MANAGEMENT' && onOpenEmployeeManagement) {
      onOpenEmployeeManagement();
      return;
    }
    if (item.actionId === 'SOVEREIGN_GATEWAY' && onOpenSovereignGateway) {
      onOpenSovereignGateway();
      return;
    }
    if (item.actionId === 'TRACKING_PIXELS_CRM' && onOpenTrackingCrm) {
      onOpenTrackingCrm();
      return;
    }

    if (item.route && typeof window !== 'undefined') {
      window.history.pushState({}, '', item.route);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    if (item.view) {
      handleNav(item.view, item.route);
    }
  };

  const getTaxonomyBadgeStyle = (tax: TaxonomyType) => {
    switch (tax) {
      case 'APPLICATION':
        return 'bg-blue-500/20 text-blue-300 border-blue-400/40 shadow-[0_0_8px_rgba(59,130,246,0.3)]';
      case 'SERVICE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
      case 'MODULE':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/40 shadow-[0_0_8px_rgba(168,85,247,0.3)]';
      case 'OUTIL':
        return 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
    }
  };

  const getTaxonomyLabel = (tax: TaxonomyType) => {
    switch (tax) {
      case 'APPLICATION': return 'Application';
      case 'SERVICE': return 'Service';
      case 'MODULE': return 'Module';
      case 'OUTIL': return 'Outil';
    }
  };

  // État temps réel des applications installées / épinglées depuis Firebase RTDB
  const [installedAppsMap, setInstalledAppsMap] = useState<Record<string, InstalledAppData>>({});

  useEffect(() => {
    setSellerMode(resolveSellerMode(currentUser));
  }, [currentUser?.sellerMode, currentUser?.vendorType]);

  // Synchronisation temps réel avec Firebase RTDB (/tenants/{tenantId}/installedApps)
  useEffect(() => {
    const unsubscribe = listenToTenantApps(tenantId, (apps) => {
      setInstalledAppsMap(apps);
    });
    return unsubscribe;
  }, [tenantId]);

  const handleSelectSellerMode = (mode: SellerMode) => {
    playTapBeep();
    setSellerMode(mode);
    persistSellerModeLocally(mode);
    updateSellerModeInFirestore(mode, currentUser?.id, currentUser?.storeId).catch(() => {});
  };

  const handleNav = (view: string, appRoute?: string) => {
    playTapBeep();
    if (appRoute && typeof window !== 'undefined') {
      window.history.pushState({}, '', appRoute);
    }
    onNavigate(view);
  };

  // Liste des applications épinglées pour affichage dans la Sidebar
  const pinnedApps = useMemo(() => {
    const list: { app: AppRegistryItem; data: InstalledAppData }[] = [];
    Object.entries(installedAppsMap).forEach(([appId, data]) => {
      if (data.pinnedToSidebar) {
        const item = APPS_REGISTRY.find((a) => a.id === appId);
        if (item) {
          list.push({ app: item, data });
        }
      }
    });
    return list;
  }, [installedAppsMap]);

  // Désépingler une application avec synchronisation RTDB
  const handleTogglePin = async (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
    playTapBeep();
    await togglePinApp(appId, false, tenantId);
  };

  // Déclencher l'Omnibar pour explorer et ajouter des applications
  const handleOpenOmnibar = () => {
    playTapBeep();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nanasore_open_omnibar'));
    }
  };

  return (
    <aside 
      className={`h-full flex flex-col bg-[#071124]/95 backdrop-blur-xl border-r border-white/[0.08] text-slate-200 transition-all duration-300 select-none z-30 shrink-0 ${
        collapsed ? 'w-16' : 'w-64'
      } ${className}`}
    >
      {/* 1. Header Sidebar : Logo Officiel Nanasore + Identité Entreprise */}
      <div className="h-16 border-b border-white/[0.08] px-3.5 flex items-center justify-between gap-2 shrink-0 bg-white/[0.01]">
        <div 
          onClick={() => handleNav('MASTER_HUB')}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
          title="Nanasore — Tableau de Bord Central"
        >
          <div className="shrink-0 transition-transform group-hover:scale-105">
            <NanasorePasserelleIcon pixelSize={32} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-sm font-black tracking-tight block truncate">
                <span className="text-white">Nana</span>
                <span className="text-[#22D3EE]">sore</span>
              </span>
              <span className="text-[10px] text-slate-400 block truncate font-medium">
                {currentUser?.storeName || 'Mon Entreprise'}
              </span>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
            title={collapsed ? 'Agrandir le menu' : 'Replier le menu'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* =======================================================================
          LE MAGNIFIQUE BOUTON : LISTE DE NOS SERVICES, APPLICATIONS, MODULES ET OUTILS
          Efface les 3 mots (Formateur, Boutique, Hybride) et regroupe tous les noms.
          Au clic : ouvre et déballe la liste.
          Au laisser : se referme dynamiquement avec élégance (onMouseLeave / timer).
         ======================================================================= */}
      <div 
        ref={servicesMenuRef}
        className="relative px-2.5 pt-2 pb-1.5 border-b border-white/[0.08] bg-black/20"
        onMouseEnter={handleServicesMouseEnter}
        onMouseLeave={handleServicesMouseLeave}
      >
        <button
          type="button"
          onClick={handleToggleServicesMenu}
          className={`w-full relative group overflow-hidden rounded-xl p-[1px] transition-all duration-300 cursor-pointer text-left select-none focus:outline-none ${
            isServicesMenuOpen 
              ? 'ring-2 ring-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.6)]' 
              : 'hover:shadow-[0_0_20px_rgba(37,99,235,0.45)]'
          }`}
          title="Liste de nos Services, Applications, Modules et Outils"
        >
          {/* Bordure et halo lumineux animé */}
          <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity blur-[0.5px]" />
          
          <div className="relative px-2 py-2 rounded-xl bg-gradient-to-b from-[#0c1a38] via-[#091326] to-[#060d1b] flex items-center justify-between gap-1.5 border border-blue-400/40 group-hover:border-blue-300/80 transition-all">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-blue-500/25 border border-cyan-400/40 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(34,211,238,0.4)] group-hover:scale-110 transition-transform">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-[9.5px] font-black text-white leading-tight tracking-tight drop-shadow truncate">
                    Liste de nos Services; Applications, Modules et Outils
                  </div>
                  <div className="text-[8px] font-bold text-cyan-300/90 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span className="truncate">36 Solutions • Cliquez pour déballer</span>
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <ChevronDown 
                className={`w-3.5 h-3.5 text-blue-300 transition-transform duration-300 shrink-0 ${
                  isServicesMenuOpen ? 'rotate-180 text-cyan-300' : 'group-hover:translate-y-0.5'
                }`} 
              />
            )}
          </div>
        </button>

        {/* TIROIR DÉROULANT / FLYOUT DÉBALLÉ AU CLIC */}
        {isServicesMenuOpen && (
          <div 
            className="fixed md:absolute left-2 right-2 md:left-full md:right-auto md:top-0 md:ml-3 w-auto md:w-[460px] max-h-[82vh] md:max-h-[86vh] rounded-2xl bg-[#081226]/98 backdrop-blur-2xl border-2 border-[#3B82F6]/60 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(59,130,246,0.35)] z-[999999] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onMouseEnter={handleServicesMouseEnter}
            onMouseLeave={handleServicesMouseLeave}
          >
            {/* Entête du Tiroir */}
            <div className="p-3.5 border-b border-blue-900/60 bg-gradient-to-r from-blue-950/80 to-[#0c1836] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-white tracking-tight truncate">
                    Catalogue des Solutions NaNa
                  </h3>
                  <p className="text-[10px] text-cyan-300/80 truncate">
                    36 Services, Applications, Modules et Outils prêts à l'emploi
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsServicesMenuOpen(false);
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Champ de recherche rapide à l'intérieur du tiroir */}
            <div className="p-2.5 border-b border-white/[0.06] bg-black/30 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={servicesSearch}
                  onChange={(e) => setServicesSearch(e.target.value)}
                  placeholder="Tapez pour chercher un Service, App, Module ou Outil..."
                  className="w-full bg-[#0c1a38] border border-blue-500/40 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 transition"
                  autoFocus
                />
                {servicesSearch && (
                  <button
                    type="button"
                    onClick={() => setServicesSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Pilules de Taxonomie */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setServicesTaxonomyFilter('ALL'); }}
                  className={`px-2 py-1 rounded-lg text-[9.5px] font-black transition cursor-pointer shrink-0 ${
                    servicesTaxonomyFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white/[0.05] text-slate-300 hover:bg-white/10'
                  }`}
                >
                  Tous (36)
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setServicesTaxonomyFilter('APPLICATION'); }}
                  className={`px-2 py-1 rounded-lg text-[9.5px] font-black transition cursor-pointer shrink-0 ${
                    servicesTaxonomyFilter === 'APPLICATION'
                      ? 'bg-blue-500 text-white shadow-xs'
                      : 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                  }`}
                >
                  [Application] (14)
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setServicesTaxonomyFilter('SERVICE'); }}
                  className={`px-2 py-1 rounded-lg text-[9.5px] font-black transition cursor-pointer shrink-0 ${
                    servicesTaxonomyFilter === 'SERVICE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  }`}
                >
                  [Service] (8)
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setServicesTaxonomyFilter('MODULE'); }}
                  className={`px-2 py-1 rounded-lg text-[9.5px] font-black transition cursor-pointer shrink-0 ${
                    servicesTaxonomyFilter === 'MODULE'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
                  }`}
                >
                  [Module] (8)
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setServicesTaxonomyFilter('OUTIL'); }}
                  className={`px-2 py-1 rounded-lg text-[9.5px] font-black transition cursor-pointer shrink-0 ${
                    servicesTaxonomyFilter === 'OUTIL'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                  }`}
                >
                  [Outil] (6)
                </button>
              </div>
            </div>

            {/* Liste Déroulante des 36 Solutions : Liens Allumants Bleus & Badges */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1.5 scrollbar-thin">
              {filteredSolutions.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Aucun élément ne correspond à votre recherche.
                </div>
              ) : (
                filteredSolutions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSolutionClick(item)}
                    className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-blue-900/35 border border-white/[0.06] hover:border-blue-500/50 transition-all cursor-pointer group flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* LIEN ALLUMANT BLEU AVEC NÉON DROP-SHADOW */}
                        <span 
                          className="text-xs sm:text-sm font-black text-blue-400 group-hover:text-blue-200 transition-all cursor-pointer"
                          style={{
                            textShadow: '0 0 10px rgba(59, 130, 246, 0.85), 0 0 20px rgba(37, 99, 235, 0.4)'
                          }}
                        >
                          {item.name}
                        </span>
                        
                        {/* BADGE DE TAXONOMIE */}
                        <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border shadow-xs ${getTaxonomyBadgeStyle(item.taxonomy)}`}>
                          [{getTaxonomyLabel(item.taxonomy)}]
                        </span>
                      </div>

                      <p className="text-[10.5px] text-slate-400 group-hover:text-slate-300 line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                      
                      <div className="text-[9px] text-cyan-300/80 font-semibold mt-0.5 flex items-center gap-1.5">
                        <span>• {item.category}</span>
                      </div>
                    </div>

                    <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all drop-shadow-[0_0_6px_rgba(59,130,246,0.8)] mt-0.5" />
                  </div>
                ))
              )}
            </div>

            {/* Pied du Tiroir : Indication d'élégance */}
            <div className="px-3 py-2 border-t border-white/[0.06] bg-[#060e20] flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1 text-cyan-300/90 font-medium">
                ✨ {filteredSolutions.length} / 36 éléments
              </span>
              <span className="text-slate-500">
                Se referme élégamment au départ du curseur
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Menu Navigation Déroulant (Fonctionnalités de Base + "Mes Applications") */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-3 px-2 space-y-4 scrollbar-thin">
        
        {/* =======================================================================
            SECTION 1 : FONCTIONNALITÉS DE BASE
           ======================================================================= */}
        <div>
          {!collapsed && (
            <div className="px-2 pb-1 text-[9.5px] font-black text-slate-400 uppercase tracking-wider">
              <span>Général</span>
            </div>
          )}

          <div className="space-y-1">
            {/* Tableau de Bord Central */}
            <button
              type="button"
              onClick={() => handleNav('MASTER_HUB')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-bold text-xs transition cursor-pointer group ${
                currentView === 'MASTER_HUB'
                  ? 'bg-[#2563EB] text-white shadow-md shadow-blue-900/30'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
              title="Tableau de Bord Central"
            >
              <LayoutGrid className="w-4 h-4 shrink-0 text-blue-400 group-hover:text-white" />
              {!collapsed && <span>Tableau de Bord</span>}
            </button>

            {/* Wameet Supra-App */}
            <button
              type="button"
              onClick={() => handleNav('WAMEET')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left font-bold text-xs transition cursor-pointer group ${
                currentView === 'WAMEET' || currentView === 'wameet'
                  ? 'bg-[#070E22] text-white shadow-md shadow-blue-900/30 border-2 border-[#38BDF8]'
                  : 'text-slate-200 bg-[#0A132C] border border-blue-500/40 hover:bg-[#0D1938]'
              }`}
              title="Wameet — Réseau & Communauté"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <WameetSquircleIcon pixelSize={20} className="shrink-0" />
                {!collapsed && (
                  <span className="truncate font-black tracking-tight">
                    <span className="text-[#3B82F6]">Wa</span>
                    <span className="text-white">meet</span>
                  </span>
                )}
              </div>
              {!collapsed && (
                <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-blue-600 text-white">
                  Réseau
                </span>
              )}
            </button>

            {/* Vitrine en Ligne / E-Shop */}
            <button
              type="button"
              onClick={() => handleNav('STUDIO')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-bold text-xs transition cursor-pointer group ${
                currentView === 'STUDIO' || currentView === 'BOUTIQUE'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
              title="Vitrine en Ligne (E-Shop)"
            >
              <Store className="w-4 h-4 shrink-0 text-indigo-400 group-hover:text-white" />
              {!collapsed && <span>Vitrine en Ligne</span>}
            </button>

            {/* Caisse POS (Si Commerçant ou Hybride) */}
            {sellerMode !== 'creator_trainer' && (
              <button
                type="button"
                onClick={() => handleNav('POS')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left font-bold text-xs transition cursor-pointer group ${
                  !isStoreOpen
                    ? 'text-slate-400 bg-slate-900/60 border border-slate-800'
                    : currentView === 'POS'
                    ? 'bg-emerald-600 text-slate-950 font-black shadow-md'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
                title={isStoreOpen ? "Caisse Tactile Magasin" : "Caisse Fermée"}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isStoreOpen ? (
                    <ShoppingBag className="w-4 h-4 shrink-0 text-emerald-400 group-hover:text-emerald-300" />
                  ) : (
                    <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                  )}
                  {!collapsed && <span>{isStoreOpen ? 'Caisse Magasin' : 'Caisse'}</span>}
                </div>
                {!collapsed && !isStoreOpen && (
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1 rounded">Fermée</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* =======================================================================
            SECTION 2 : 📌 MES APPLICATIONS (Chargées depuis Firebase RTDB)
           ======================================================================= */}
        <div className="pt-2 border-t border-white/[0.06]">
          {!collapsed && (
            <div className="px-2 pb-1.5 text-[9.5px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>📌 Mes Applications</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-500/30">
                {pinnedApps.length}
              </span>
            </div>
          )}

          <div className="space-y-1">
            {pinnedApps.length === 0 ? (
              !collapsed && (
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center space-y-1.5">
                  <p className="text-[11px] text-slate-400">Aucune app épinglée</p>
                  <button
                    type="button"
                    onClick={handleOpenOmnibar}
                    className="w-full py-1.5 px-2 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-cyan-300 hover:text-white text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>Ajouter une application</span>
                  </button>
                </div>
              )
            ) : (
              pinnedApps.map(({ app, data }) => {
                const isCurrentActive = 
                  currentView === app.targetView || 
                  (typeof window !== 'undefined' && window.location.pathname === `/dashboard/apps/${app.id}`);

                return (
                  <div
                    key={app.id}
                    className="group relative flex items-center"
                  >
                    <button
                      type="button"
                      onClick={() => handleNav(app.targetView || 'STANDALONE_APP', `/dashboard/apps/${app.id}`)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left font-bold text-xs transition-all cursor-pointer ${
                        isCurrentActive
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-900/40 border border-cyan-400/30'
                          : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                      title={`${app.appName} — ${app.shortDescription}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Logo Vectoriel miniature */}
                        <div className="shrink-0 w-5 h-5 rounded-md bg-white/[0.06] p-0.5 flex items-center justify-center overflow-hidden border border-white/10">
                          {app.appLogo ? (
                            <img src={app.appLogo} alt={app.appName} className="w-full h-full object-contain" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                          )}
                        </div>
                        {!collapsed && (
                          <span className="truncate text-xs tracking-tight">
                            {app.appName}
                          </span>
                        )}
                      </div>

                      {/* Indicateur de statut ou bouton désépingler au survol */}
                      {!collapsed && (
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Pastille active */}
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] group-hover:hidden" />
                          {/* Bouton désépingler au survol */}
                          <button
                            type="button"
                            onClick={(e) => handleTogglePin(e, app.id)}
                            className="hidden group-hover:flex p-1 rounded hover:bg-white/10 text-slate-400 hover:text-rose-400 transition"
                            title="Désépingler de la barre latérale"
                          >
                            <PinOff className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })
            )}

            {/* Bouton pour explorer et ajouter une application (+ Explorer le catalogue) */}
            <button
              type="button"
              onClick={handleOpenOmnibar}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-bold text-xs text-cyan-400 hover:text-white hover:bg-cyan-500/15 border border-dashed border-cyan-500/30 hover:border-cyan-400/50 transition-all cursor-pointer mt-2"
              title="Explorer le catalogue d'applications (Omnibar)"
            >
              <PlusCircle className="w-4 h-4 shrink-0 text-cyan-400" />
              {!collapsed && <span>+ Ajouter une application</span>}
            </button>
          </div>
        </div>

      </div>

      {/* 3. Footer Sidebar : Paramètres & Upsell Starter */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 space-y-2 shrink-0">
        {!collapsed && isFree && (
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-amber-600/15 border border-amber-500/30 text-slate-100 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-amber-400 font-black text-xs">
              <span className="flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                <span>Passez en Illimité</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  if (onOpenPaywall) onOpenPaywall();
                }}
                className="text-[10px] font-black underline text-amber-300 hover:text-white"
              >
                Starter →
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            playTapBeep();
            if (onOpenSettings) onOpenSettings();
            else handleNav('SETTINGS_EXTENSIONS');
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-bold text-xs text-slate-400 hover:bg-slate-900 hover:text-white transition cursor-pointer"
          title="Paramètres de l'Entreprise"
        >
          <Settings className="w-4 h-4 shrink-0 text-slate-400" />
          {!collapsed && <span>Paramètres Boutique</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
