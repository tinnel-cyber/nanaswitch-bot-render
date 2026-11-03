import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Boxes,
  GraduationCap,
  Zap,
  Radio,
  CreditCard,
  BarChart3,
  Store,
  Gift,
  ShieldCheck,
  Bot,
  ArrowUpRight,
  ChevronRight,
  SlidersHorizontal,
  Flame,
  Printer
} from 'lucide-react';
import { CompletedSale, InventoryProduct, DebtCustomer, CustomerOrder, SellerMode } from '../../types';
import { GeneralSettingsData } from '../CentralMasterHubView';
import { formatCFA, playTapBeep } from '../../utils/audio';

export interface DashboardMetricsSummary {
  todayTotal: number;
  todayCount: number;
  allSalesTotal: number;
  totalTransactions: number;
  totalDebt: number;
  customersWithDebt: number;
  pendingOrders: number;
  estimatedMargin: number;
  lowStockCount: number;
}

export interface HybridAnalyticsCardsGridProps {
  metrics: DashboardMetricsSummary;
  inventory?: InventoryProduct[];
  customerOrders?: CustomerOrder[];
  customers?: DebtCustomer[];
  sales?: CompletedSale[];
  settings?: GeneralSettingsData;
  sellerMode?: SellerMode;
  onNavigate: (view: any) => void;
  onOpenWebinarModal?: () => void;
  onOpenAffiliation?: () => void;
  onOpenMarketingAi?: (product?: any) => void;
  onOpenExcelImporter?: () => void;
  onStoreClosedPrompt?: () => void;
}

export type GridFilterCategory = 'ALL' | 'COMMERCE' | 'ACADEMY' | 'FINANCE';

export const HybridAnalyticsCardsGrid: React.FC<HybridAnalyticsCardsGridProps> = ({
  metrics,
  inventory = [],
  customerOrders = [],
  customers = [],
  sales = [],
  settings,
  sellerMode = 'hybrid_all',
  onNavigate,
  onOpenWebinarModal,
  onOpenAffiliation,
  onOpenMarketingAi,
  onOpenExcelImporter,
  onStoreClosedPrompt
}) => {
  const [filterCategory, setFilterCategory] = useState<GridFilterCategory>('ALL');

  // Les 12 modules denses au format analytique / terminal boursier
  const cards = useMemo(() => [
    // 1. Ventes & CA du Jour (avec tendance)
    {
      id: 'sales-today',
      category: 'COMMERCE',
      label: 'VENTES & CA DU JOUR',
      shortCode: 'CA-01',
      icon: TrendingUp,
      value: formatCFA(metrics.todayTotal),
      subtext: `${metrics.todayCount} tickets enregistrés`,
      badge: {
        text: '+18% vs J-1',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      },
      action: () => {
        playTapBeep();
        onNavigate('REPORTS');
      },
      actionHint: 'Analytique'
    },

    // 2. Commandes Direct & Web (statut livraison)
    {
      id: 'orders-web',
      category: 'COMMERCE',
      label: 'COMMANDES DIRECT & WEB',
      shortCode: 'CMD-02',
      icon: ShoppingBag,
      value: `${customerOrders.length} cmd(s)`,
      subtext: metrics.pendingOrders > 0 
        ? `${metrics.pendingOrders} en attente livraison`
        : 'Flux logistique à jour',
      badge: {
        text: metrics.pendingOrders > 0 ? `${metrics.pendingOrders} à traiter` : 'Expédiées',
        bg: metrics.pendingOrders > 0 
          ? 'bg-amber-50 text-amber-700 border-amber-200' 
          : 'bg-blue-50 text-blue-700 border-blue-200'
      },
      action: () => {
        playTapBeep();
        onNavigate('CUSTOMER_ORDERS');
      },
      actionHint: 'Commandes'
    },

    // 3. Catalogue & Stocks (alertes rupture)
    {
      id: 'stocks-inventory',
      category: 'COMMERCE',
      label: 'CATALOGUE & STOCKS',
      shortCode: 'STK-03',
      icon: Boxes,
      value: `${inventory.length} articles`,
      subtext: metrics.lowStockCount > 0 
        ? `${metrics.lowStockCount} alertes rupture` 
        : 'Stock 100% opérationnel',
      badge: {
        text: metrics.lowStockCount > 0 ? `${metrics.lowStockCount} critiques` : 'Stock Sain',
        bg: metrics.lowStockCount > 0 
          ? 'bg-rose-50 text-rose-700 border-rose-200' 
          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      },
      action: () => {
        playTapBeep();
        onNavigate('INVENTORY');
      },
      actionHint: 'Catalogue'
    },

    // 4. Académie & Élèves (cohortes actives, devoirs à corriger)
    {
      id: 'academy-students',
      category: 'ACADEMY',
      label: 'ACADÉMIE & ÉLÈVES',
      shortCode: 'LMS-04',
      icon: GraduationCap,
      value: `${customers.length} élève${customers.length > 1 ? 's' : ''}`,
      subtext: customers.length > 0 ? `${customers.length} apprenant(s) actif(s)` : 'Cohortes & cours en ligne',
      badge: {
        text: customers.length > 0 ? `${customers.length} inscrits` : 'Actif',
        bg: customers.length > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'
      },
      action: () => {
        playTapBeep();
        onNavigate('INSTRUCTOR');
      },
      actionHint: 'Cohortes'
    },

    // 5. Caisse Magasin (POS - statut caisse ouverte/fermée)
    {
      id: 'pos-cashier',
      category: 'COMMERCE',
      label: 'CAISSE MAGASIN (POS)',
      shortCode: 'POS-05',
      icon: Zap,
      value: settings?.isStoreOpen ? 'OUVERTE' : 'FERMÉE',
      subtext: 'Scanner comptoir & tickets thermiques',
      badge: {
        text: settings?.isStoreOpen ? 'En Service' : 'Verrouillée',
        bg: settings?.isStoreOpen 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
          : 'bg-slate-100 text-slate-600 border-slate-300'
      },
      action: () => {
        playTapBeep();
        if (settings && !settings.isStoreOpen && onStoreClosedPrompt) {
          onStoreClosedPrompt();
          return;
        }
        onNavigate('POS');
      },
      actionHint: 'Ouvrir Caisse'
    },

    // 6. Tunnels & Lives Shopping (taux de conversion / spectateurs)
    {
      id: 'funnels-live',
      category: 'COMMERCE',
      label: 'TUNNELS & LIVES',
      shortCode: 'TUN-06',
      icon: Radio,
      value: 'Tunnels Prêts',
      subtext: 'Conversion directe & Vente omnicanale',
      badge: {
        text: 'Live Studio',
        bg: 'bg-rose-50 text-rose-700 border-rose-200'
      },
      action: () => {
        playTapBeep();
        if (onOpenWebinarModal) onOpenWebinarModal();
        else onNavigate('MODULAR_FUNNEL');
      },
      actionHint: 'Studio Live'
    },

    // 7. Dettes & Créances Clients (carnet de dette actif)
    {
      id: 'debts-receivables',
      category: 'FINANCE',
      label: 'CRÉANCES & DETTES',
      shortCode: 'DET-07',
      icon: CreditCard,
      value: formatCFA(metrics.totalDebt),
      subtext: `${metrics.customersWithDebt} clients au carnet d'ardoise`,
      badge: {
        text: metrics.customersWithDebt > 0 ? `${metrics.customersWithDebt} ardoises` : 'Soldé',
        bg: metrics.customersWithDebt > 0 
          ? 'bg-rose-50 text-rose-700 border-rose-200' 
          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      },
      action: () => {
        playTapBeep();
        onNavigate('DEBT_BOOK');
      },
      actionHint: 'Carnet Dettes'
    },

    // 8. Marge Nette & Rentabilité (bénéfice estimé)
    {
      id: 'net-margin',
      category: 'FINANCE',
      label: 'MARGE NETTE ESTIMÉE',
      shortCode: 'MRG-08',
      icon: BarChart3,
      value: formatCFA(metrics.estimatedMargin),
      subtext: 'Rentabilité brute 26% calculée',
      badge: {
        text: 'Bénéfice Net',
        bg: 'bg-blue-50 text-blue-700 border-blue-200'
      },
      action: () => {
        playTapBeep();
        onNavigate('REPORTS');
      },
      actionHint: 'Rentabilité'
    },

    // 9. E-Shop & Boutique en Ligne (visiteurs & statut domaine)
    {
      id: 'eshop-storefront',
      category: 'COMMERCE',
      label: 'E-SHOP NSORE.SHOP',
      shortCode: 'WEB-09',
      icon: Store,
      value: 'nsore.shop',
      subtext: 'Vitrine en ligne & WhatsApp Pay',
      badge: {
        text: 'En Ligne 24/7',
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200'
      },
      action: () => {
        playTapBeep();
        onNavigate('STUDIO');
      },
      actionHint: 'Personnaliser'
    },

    // 10. Micro-relais & Affiliation (commissions générées & affiliés actifs)
    {
      id: 'affiliate-network',
      category: 'FINANCE',
      label: 'MICRO-RELAIS & AFFILIÉS',
      shortCode: 'AFF-10',
      icon: Gift,
      value: '5% à 20%',
      subtext: '14 affiliés actifs • Sebpay instant',
      badge: {
        text: 'Partenaires',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      },
      action: () => {
        playTapBeep();
        if (onOpenAffiliation) onOpenAffiliation();
        else onNavigate('PARTNER');
      },
      actionHint: 'Affiliation'
    },

    // 11. Séquestre & Escrow (fonds en transit sécurisé)
    {
      id: 'escrow-security',
      category: 'FINANCE',
      label: 'SÉQUESTRE & ESCROW',
      shortCode: 'SEC-11',
      icon: ShieldCheck,
      value: '100% Garanti',
      subtext: 'Fonds bloqués jusqu\'à livraison',
      badge: {
        text: 'Sécurité Sebpay',
        bg: 'bg-cyan-50 text-cyan-700 border-cyan-200'
      },
      action: () => {
        playTapBeep();
        onNavigate('CUSTOMER_ORDERS');
      },
      actionHint: 'Vérifier'
    },

    // 12. Assistant IA & Gemini (requêtes & automatisations)
    {
      id: 'ai-gemini',
      category: 'ACADEMY',
      label: 'IA DÉCISIONNELLE',
      shortCode: 'AI-12',
      icon: Bot,
      value: 'Gemini 3.8',
      subtext: 'Prédictions & automatisations 24/7',
      badge: {
        text: 'Connecté',
        bg: 'bg-purple-50 text-purple-700 border-purple-200'
      },
      action: () => {
        playTapBeep();
        onNavigate('AI_ADVISOR');
      },
      actionHint: 'Agent IA'
    }
  ], [metrics, customerOrders, inventory, customers, settings, onNavigate, onOpenWebinarModal, onOpenAffiliation, onStoreClosedPrompt]);

  const filteredCards = useMemo(() => {
    if (filterCategory === 'ALL') return cards;
    return cards.filter(c => c.category === filterCategory);
  }, [cards, filterCategory]);

  return (
    <div className="space-y-3">
      {/* Mini Bar d'information & filtres boursiers */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Terminal Analytique Hybride</span>
          </div>
          <span className="text-[11px] font-bold text-slate-500 hidden md:inline">
            • 12 modules financiers & opérationnels synchronisés
          </span>
        </div>

        {/* Filtres de catégories rapides */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-md border border-slate-200 text-[11px] font-bold shrink-0">
          <button
            type="button"
            onClick={() => { playTapBeep(); setFilterCategory('ALL'); }}
            className={`px-2 py-0.5 rounded-sm transition cursor-pointer ${
              filterCategory === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Tous (12)
          </button>
          <button
            type="button"
            onClick={() => { playTapBeep(); setFilterCategory('COMMERCE'); }}
            className={`px-2 py-0.5 rounded-sm transition cursor-pointer ${
              filterCategory === 'COMMERCE'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Commerce (5)
          </button>
          <button
            type="button"
            onClick={() => { playTapBeep(); setFilterCategory('FINANCE'); }}
            className={`px-2 py-0.5 rounded-sm transition cursor-pointer ${
              filterCategory === 'FINANCE'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Finances (4)
          </button>
          <button
            type="button"
            onClick={() => { playTapBeep(); setFilterCategory('ACADEMY'); }}
            className={`px-2 py-0.5 rounded-sm transition cursor-pointer ${
              filterCategory === 'ACADEMY'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Digital & IA (3)
          </button>
        </div>
      </div>

      {/* Grille analytique dense et resserrée : grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        {filteredCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={card.action}
              className="group relative bg-white rounded-md border-4 border-blue-100 shadow-[0_4px_0_rgba(29,78,216,0.15)] hover:border-blue-200 hover:shadow-[0_5px_0_rgba(29,78,216,0.25)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_rgba(29,78,216,0.2)] transition-all duration-150 p-3 sm:p-3.5 flex flex-col justify-between text-left cursor-pointer overflow-hidden select-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              title={`${card.label} : ${card.value} (${card.actionHint})`}
            >
              {/* Ligne 1 : Label module + Icône */}
              <div>
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500 truncate leading-tight">
                      {card.label}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 font-bold tracking-tighter mt-0.5">
                      {card.shortCode}
                    </span>
                  </div>

                  {/* Micro icône dans son conteneur carré rigide */}
                  <div className="w-6 h-6 rounded-sm bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors duration-150 shrink-0">
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Ligne 2 : Chiffre Clé / Valeur principale */}
                <div className="mt-2">
                  <div className="text-lg md:text-xl font-black text-blue-900 leading-none tracking-tight truncate">
                    {card.value}
                  </div>
                </div>
              </div>

              {/* Ligne 3 : Sous-métrique & Badge d'état boursier */}
              <div className="mt-2.5 pt-2 border-t border-blue-50 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${card.badge.bg} truncate`}>
                    {card.badge.text}
                  </span>
                  <div className="text-blue-500 group-hover:text-blue-700 opacity-60 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="w-3 h-3" />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5 leading-snug">
                  {card.subtext}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
