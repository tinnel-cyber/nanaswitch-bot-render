import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal, 
  ShoppingBag, 
  GraduationCap, 
  CreditCard, 
  Sparkles, 
  HelpCircle,
  Crown,
  Zap,
  ArrowRight
} from 'lucide-react';
import { 
  ComparisonFeatureItem, 
  COMPARISON_CATEGORIES, 
  ComparisonCategoryKey,
  subscribeToComparisonMatrix 
} from '../../../data/comparisonMatrixData';
import { ProCrownIcon } from '../../../components/common/ProFeatureGuard';
import { playTapBeep } from '../../../utils/audio';

export interface PricingComparisonMatrixProps {
  /**
   * Identifiant du plan actuellement sélectionné (ex: 'free', 'starter', 'pro', 'elite')
   */
  selectedPlanId?: string;
  /**
   * Callback déclenché lorsque l'utilisateur choisit un plan directement dans la matrice
   */
  onSelectPlan?: (planId: string) => void;
  /**
   * Contrôle externe de l'ouverture (optionnel)
   */
  defaultExpanded?: boolean;
  /**
   * Classes CSS conteneur
   */
  className?: string;
  /**
   * Masquer le bouton de déclenchement pour l'afficher directement ouvert (ex: dans une page dédiée)
   */
  alwaysOpen?: boolean;
}

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  ShoppingBag,
  GraduationCap,
  CreditCard,
  Sparkles
};

export const PricingComparisonMatrix: React.FC<PricingComparisonMatrixProps> = ({
  selectedPlanId = 'pro',
  onSelectPlan,
  defaultExpanded = false,
  className = '',
  alwaysOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(alwaysOpen || defaultExpanded);
  const [features, setFeatures] = useState<ComparisonFeatureItem[]>([]);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Synchronisation temps réel avec Firestore (platform_settings/comparison_matrix)
  useEffect(() => {
    const unsub = subscribeToComparisonMatrix((matrix) => {
      setFeatures(matrix);
    });
    return () => unsub();
  }, []);

  // Regroupement des fonctionnalités par catégorie
  const groupedFeatures = useMemo(() => {
    const map: Record<ComparisonCategoryKey, ComparisonFeatureItem[]> = {
      ecommerce: [],
      elearning: [],
      payments_domains: [],
      marketing_live: []
    };

    features.forEach((feat) => {
      if (map[feat.category]) {
        map[feat.category].push(feat);
      } else {
        map.ecommerce.push(feat);
      }
    });

    return map;
  }, [features]);

  const toggleAccordion = () => {
    playTapBeep();
    setIsOpen(!isOpen);
    // Auto-scroll doux vers le tableau s'il s'ouvre
    if (!isOpen) {
      setTimeout(() => {
        tableContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  };

  /**
   * Rendu intelligent du contenu d'une cellule
   */
  const renderCellValue = (value: boolean | string, isProPlan: boolean = false) => {
    if (typeof value === 'boolean') {
      if (value) {
        return (
          <div className="flex items-center justify-center">
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm ${
              isProPlan 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20' 
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }`}>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
          </div>
        );
      }
      return (
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800/80 text-slate-500 border border-slate-700/50">
            <X className="w-3 h-3 stroke-[2.5]" />
          </span>
        </div>
      );
    }

    // Valeur textuelle quantitative (ex: '3 produits', 'Illimité', etc.)
    const isUnlimited = String(value).toLowerCase().includes('illimité');
    return (
      <div className="flex items-center justify-center">
        <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border text-center whitespace-nowrap ${
          isUnlimited
            ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
            : isProPlan
            ? 'bg-blue-500/20 text-blue-200 border-blue-400/40'
            : 'bg-slate-800/90 text-slate-200 border-slate-700'
        }`}>
          {value}
        </span>
      </div>
    );
  };

  return (
    <div className={`w-full ${className}`} ref={tableContainerRef}>
      {/* =========================================================================
          1. LE DÉCLENCHEUR (BOUTON CENTRÉ HAUTE VISIBILITÉ)
         ========================================================================= */}
      {!alwaysOpen && (
        <div className="flex flex-col items-center justify-center pt-4 pb-2">
          <button
            type="button"
            onClick={toggleAccordion}
            className={`
              group relative overflow-hidden px-6 py-3 rounded-2xl border text-xs sm:text-sm font-black
              transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer select-none active:scale-98
              ${isOpen
                ? 'bg-slate-800 text-amber-300 border-amber-400/60 shadow-lg shadow-amber-500/10'
                : 'bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 hover:from-slate-800 hover:to-slate-800 text-slate-200 hover:text-white border-slate-700 hover:border-slate-500 shadow-xl'
              }
            `}
            title="Déplier la grille comparative détaillée des fonctionnalités"
          >
            {/* Halo lumineux subtil */}
            <span className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 via-blue-500/20 to-teal-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />

            <div className="relative flex items-center gap-2.5">
              <SlidersHorizontal className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'text-amber-400 rotate-90' : 'text-blue-400 group-hover:scale-110'}`} />
              <span className="tracking-wide">
                {isOpen ? 'Masquer la comparaison détaillée' : 'Comparer tous les plans en détail'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-400 border border-slate-700 font-mono">
                {features.length} critères
              </span>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-amber-400 transition-transform" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform group-hover:translate-y-0.5" />
              )}
            </div>
          </button>
        </div>
      )}

      {/* =========================================================================
          2. LE TABLEAU DE COMPARAISON EN ACCORDÉON FLUIDE
         ========================================================================= */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
        isOpen ? 'max-h-[5000px] opacity-100 mt-4' : 'max-h-0 opacity-0 pointer-events-none'
      }`}>
        <div className="bg-[#0b1222] border border-slate-800 rounded-3xl p-3 sm:p-5 shadow-2xl relative">
          
          {/* Note de défilement horizontal sur Mobile */}
          <div className="flex md:hidden items-center justify-between gap-2 px-2 py-1.5 mb-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <span>← Glissez horizontalement pour comparer les 4 formules →</span>
            </span>
            <span className="text-amber-400 font-black shrink-0">4 Plans</span>
          </div>

          {/* Conteneur Tableau avec Défilement Horizontal */}
          <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 rounded-2xl border border-slate-800/80">
            <table className="w-full min-w-[700px] sm:min-w-[820px] text-left border-collapse table-fixed">
              
              {/* LARGEURS DES COLONNES */}
              <colgroup>
                <col className="w-[38%] min-w-[240px]" />
                <col className="w-[15%] min-w-[110px]" />
                <col className="w-[15%] min-w-[110px]" />
                <col className="w-[17%] min-w-[130px]" />
                <col className="w-[15%] min-w-[110px]" />
              </colgroup>

              {/* EN-TÊTE FIXE (STICKY HEADER) */}
              <thead className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-md">
                <tr>
                  {/* Colonne 1 : Titre Fonctionnalités (Sticky gauche sur mobile pour rester lisible) */}
                  <th className="py-4 px-4 sm:px-5 font-black text-xs uppercase tracking-wider text-slate-400 sticky left-0 z-30 bg-slate-950/95 border-r border-slate-800/80 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                      <span>Fonctionnalités</span>
                    </div>
                  </th>

                  {/* Colonne 2 : Plan Gratuit */}
                  <th 
                    onClick={() => onSelectPlan && onSelectPlan('free')}
                    className={`py-4 px-2.5 text-center transition-colors ${
                      onSelectPlan ? 'cursor-pointer hover:bg-slate-900/60' : ''
                    } ${selectedPlanId === 'free' ? 'bg-emerald-500/10' : ''}`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                        Gratuit
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                        0 F CFA
                      </span>
                      <span className="mt-1 text-[8.5px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        Freemium
                      </span>
                    </div>
                  </th>

                  {/* Colonne 3 : Plan Starter */}
                  <th 
                    onClick={() => onSelectPlan && onSelectPlan('starter')}
                    className={`py-4 px-2.5 text-center transition-colors ${
                      onSelectPlan ? 'cursor-pointer hover:bg-slate-900/60' : ''
                    } ${selectedPlanId === 'starter' ? 'bg-blue-500/10' : ''}`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-black text-blue-400 uppercase tracking-wide">
                        Starter
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                        4 900 F / mois
                      </span>
                      <span className="mt-1 text-[8.5px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                        Croissance
                      </span>
                    </div>
                  </th>

                  {/* Colonne 4 : Plan Pro (Mise en avant VIP Recommandé) */}
                  <th 
                    onClick={() => onSelectPlan && onSelectPlan('pro')}
                    className={`py-4 px-2.5 text-center relative border-x border-amber-500/30 bg-gradient-to-b from-amber-500/15 via-slate-900/90 to-slate-950/95 transition-colors ${
                      onSelectPlan ? 'cursor-pointer hover:from-amber-500/25' : ''
                    }`}
                  >
                    {/* Badge VIP Populaire */}
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[8.5px] font-black uppercase tracking-wider shadow-md whitespace-nowrap">
                      ★ Recommandé
                    </div>
                    <div className="flex flex-col items-center pt-1">
                      <span className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span>Pro</span>
                      </span>
                      <span className="text-[10px] text-amber-200 font-bold mt-0.5">
                        9 900 F / mois
                      </span>
                      <span className="mt-1 text-[8.5px] px-1.5 py-0.2 rounded bg-amber-400/25 text-amber-200 font-extrabold border border-amber-400/40">
                        Tout Illimité
                      </span>
                    </div>
                  </th>

                  {/* Colonne 5 : Plan Elite */}
                  <th 
                    onClick={() => onSelectPlan && onSelectPlan('elite')}
                    className={`py-4 px-2.5 text-center transition-colors ${
                      onSelectPlan ? 'cursor-pointer hover:bg-slate-900/60' : ''
                    } ${selectedPlanId === 'elite' ? 'bg-purple-500/10' : ''}`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-black text-purple-400 uppercase tracking-wide">
                        Elite
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                        19 900 F / mois
                      </span>
                      <span className="mt-1 text-[8.5px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                        Entreprise VIP
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>

              {/* CORPS DU TABLEAU REGROUPÉ PAR CATÉGORIES */}
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {COMPARISON_CATEGORIES.map((category) => {
                  const items = groupedFeatures[category.id] || [];
                  if (items.length === 0) return null;

                  const IconComp = CATEGORY_ICONS[category.iconName] || ShoppingBag;

                  return (
                    <React.Fragment key={category.id}>
                      {/* LIGNE DE SÉPARATION / SECTION DE CATÉGORIE */}
                      <tr className="bg-slate-900/90 border-t-2 border-b border-slate-700/80">
                        <td colSpan={5} className="py-2.5 px-4 sm:px-5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                                <IconComp className="w-3 h-3 text-blue-400" />
                              </div>
                              <span className="font-black text-white text-xs uppercase tracking-wider">
                                {category.title}
                              </span>
                              <span className="hidden sm:inline text-[11px] text-slate-400">
                                • {category.description}
                              </span>
                            </div>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              {category.badge}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* LIGNES DES FONCTIONNALITÉS */}
                      {items.map((item, idx) => {
                        const isEven = idx % 2 === 0;
                        const isTooltipOpen = activeTooltipId === item.id;

                        return (
                          <tr 
                            key={item.id}
                            className={`transition-colors hover:bg-slate-800/40 ${
                              isEven ? 'bg-transparent' : 'bg-slate-900/30'
                            }`}
                          >
                            {/* Colonne 1 : Nom Fonctionnalité + Couronne VIP (Sticky gauche) */}
                            <td className="py-3 px-4 sm:px-5 sticky left-0 z-10 bg-[#0b1222]/95 border-r border-slate-800/80 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {item.isVipCrown && (
                                    <span title="Exclusivité VIP Starter / Pro / Elite">
                                      <ProCrownIcon size="xs" />
                                    </span>
                                  )}
                                  <span className={`font-semibold text-xs truncate ${
                                    item.isVipCrown ? 'text-slate-100 font-bold' : 'text-slate-200'
                                  }`}>
                                    {item.name}
                                  </span>
                                </div>

                                {/* Infobulle explicative (Tooltip) */}
                                {item.tooltip && (
                                  <div className="relative shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setActiveTooltipId(isTooltipOpen ? null : item.id)}
                                      onMouseEnter={() => setActiveTooltipId(item.id)}
                                      onMouseLeave={() => setActiveTooltipId(null)}
                                      className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 cursor-pointer"
                                      title={item.tooltip}
                                    >
                                      <HelpCircle className="w-3 h-3" />
                                    </button>
                                    
                                    {isTooltipOpen && (
                                      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-50 w-56 p-2 rounded-xl bg-slate-900 text-slate-200 text-[10px] font-medium border border-slate-700 shadow-2xl animate-in fade-in duration-150 pointer-events-none">
                                        {item.tooltip}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Colonne 2 : Plan Gratuit */}
                            <td className={`py-3 px-2 text-center ${selectedPlanId === 'free' ? 'bg-emerald-500/5' : ''}`}>
                              {renderCellValue(item.free, false)}
                            </td>

                            {/* Colonne 3 : Plan Starter */}
                            <td className={`py-3 px-2 text-center ${selectedPlanId === 'starter' ? 'bg-blue-500/5' : ''}`}>
                              {renderCellValue(item.starter, false)}
                            </td>

                            {/* Colonne 4 : Plan Pro (Mise en avant border) */}
                            <td className={`py-3 px-2 text-center border-x border-amber-500/20 bg-amber-500/5 ${
                              selectedPlanId === 'pro' ? 'bg-amber-500/10' : ''
                            }`}>
                              {renderCellValue(item.pro, true)}
                            </td>

                            {/* Colonne 5 : Plan Elite */}
                            <td className={`py-3 px-2 text-center ${selectedPlanId === 'elite' ? 'bg-purple-500/5' : ''}`}>
                              {renderCellValue(item.elite, false)}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>

              {/* PIED DE TABLEAU AVEC BOUTONS DE CHOIX DIRECT */}
              {onSelectPlan && (
                <tfoot className="border-t-2 border-slate-800 bg-slate-950/90">
                  <tr>
                    <td className="py-4 px-4 sm:px-5 sticky left-0 z-10 bg-slate-950 border-r border-slate-800/80 font-black text-xs text-slate-400">
                      Choisir votre formule :
                    </td>
                    <td className="py-4 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectPlan('free')}
                        className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black text-[11px] border border-emerald-500/30 transition cursor-pointer active:scale-95"
                      >
                        Sélectionner
                      </button>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectPlan('starter')}
                        className="py-1.5 px-3 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white font-black text-[11px] transition cursor-pointer active:scale-95 shadow-md shadow-blue-900/30"
                      >
                        Sélectionner
                      </button>
                    </td>
                    <td className="py-4 px-2 text-center border-x border-amber-500/30 bg-amber-500/10">
                      <button
                        type="button"
                        onClick={() => onSelectPlan('pro')}
                        className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-[11px] transition cursor-pointer active:scale-95 shadow-lg shadow-amber-950/40"
                      >
                        Sélectionner Pro
                      </button>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectPlan('elite')}
                        className="py-1.5 px-3 rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white font-black text-[11px] transition cursor-pointer active:scale-95 shadow-md shadow-purple-900/30"
                      >
                        Sélectionner
                      </button>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Réassurance de bas de tableau */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 px-2">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Changement de plan instantané à tout moment avec report automatique du prorata.</span>
            </span>
            <span className="text-slate-500 font-mono text-[10px]">
              0% de commission sur les ventes • Paiement Mobile Money & CB
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PricingComparisonMatrix;
