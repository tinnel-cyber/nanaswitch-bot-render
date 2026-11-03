import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  ShoppingBag, 
  CreditCard, 
  MessageSquare, 
  Star, 
  ArrowRight,
  Package,
  GraduationCap,
  Users,
  Video,
  FileText,
  BarChart3,
  Store,
  Printer,
  Globe,
  QrCode,
  Truck,
  ShieldCheck,
  FileBadge,
  Cpu,
  Crown,
  Layers,
  Search
} from 'lucide-react';
import { 
  APPS_REGISTRY, 
  AppRegistryItem, 
  getAppTrialLabel, 
  getAppPalmaresBadge 
} from '../../data/appsRegistry';
import { togglePinApp, isAppPinnedToSidebar } from '../../services/appActivationService';
import { playTapBeep, playValidationBeep } from '../../utils/audio';

// Résolveur d'icônes par application ou catégorie
function getAppIcon(app: AppRegistryItem) {
  const id = app.id.toLowerCase();
  const cat = (app.category || '').toLowerCase();

  if (id.includes('nanagenerator') || id.includes('studio-ia') || id.includes('gemini')) return Sparkles;
  if (id.includes('pos') || id.includes('caisse')) return ShoppingBag;
  if (id.includes('vitrine') || id.includes('eshop') || id.includes('market')) return Store;
  if (id.includes('wameet') || id.includes('sms') || id.includes('marketing-campaigns')) return MessageSquare;
  if (id.includes('live') || id.includes('webinar')) return Video;
  if (id.includes('debt') || id.includes('finance') || id.includes('sovereign')) return CreditCard;
  if (id.includes('report') || id.includes('analytics')) return BarChart3;
  if (id.includes('partner') || id.includes('affiliate')) return Users;
  if (id.includes('inventory') || id.includes('stock') || id.includes('excel')) return Package;
  if (id.includes('barcode') || id.includes('scanner')) return QrCode;
  if (id.includes('delivery') || id.includes('heatmap')) return Truck;
  if (id.includes('printer') || id.includes('thermal')) return Printer;
  if (id.includes('domain')) return Globe;
  if (id.includes('academy') || id.includes('lms') || id.includes('instructor') || id.includes('certificate')) return GraduationCap;
  if (id.includes('docusign')) return FileText;
  if (id.includes('kyc') || id.includes('white-label')) return ShieldCheck;
  if (id.includes('cv-pro')) return FileBadge;
  if (id.includes('connectors') || id.includes('webhook')) return Cpu;
  if (id.includes('saas-admin')) return Crown;

  // Par défaut selon catégorie
  if (cat.includes('marketing')) return Sparkles;
  if (cat.includes('commerce')) return ShoppingBag;
  if (cat.includes('finance')) return CreditCard;
  if (cat.includes('stock') || cat.includes('gestion')) return Package;
  if (cat.includes('formation')) return GraduationCap;
  if (cat.includes('communication')) return MessageSquare;
  if (cat.includes('légal') || cat.includes('sécurité')) return ShieldCheck;
  return Layers;
}

// Catégories ciblées (SUPPRESSION DEFINITIVE DE "TOUS")
const CATEGORIES = [
  { id: 'marketing', label: 'Marketing & Studio IA', match: ['Marketing & Studio', 'Marketing & Studio IA'] },
  { id: 'commerce', label: 'Commerce & Ventes', match: ['Commerce & Ventes'] },
  { id: 'finances', label: 'Finances & Trésorerie', match: ['Finances & Trésorerie'] },
  { id: 'gestion', label: 'Gestion & Stock', match: ['Gestion & Stock'] },
  { id: 'communication', label: 'Communication & WA', match: ['Communication & Réseau', 'Communication & WA'] },
  { id: 'formation', label: 'Formation & Académie', match: ['Formation & Coaching', 'Formation & Académie'] },
  { id: 'rh_legal', label: 'RH, Légal & Tech', match: ['Sécurité & Légal', 'Productivité & RH', 'Technologie & API', 'Administration'] },
];

export interface AppsSearchPanelProps {
  searchQuery: string;
  onClose: () => void;
  onNavigate?: (view: string) => void;
  onOpenApp?: (app: any) => void;
}

export const AppsSearchPanel: React.FC<AppsSearchPanelProps> = ({ 
  searchQuery, 
  onClose,
  onNavigate,
  onOpenApp
}) => {
  // Par défaut aucune catégorie sélectionnée (Fast Load)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [pinnedState, setPinnedState] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    APPS_REGISTRY.forEach(a => {
      map[a.id] = isAppPinnedToSidebar(a.id);
    });
    return map;
  });

  // Sélection automatique de la catégorie correspondante lors de la saisie
  useEffect(() => {
    const query = (searchQuery || '').trim().toLowerCase();
    if (!query) return;

    // Trouver le module principal qui correspond au mot-clé
    const directMatch = APPS_REGISTRY.find(app => 
      app.appName.toLowerCase().includes(query) ||
      (app.keywords || []).some(k => k.toLowerCase().includes(query))
    );

    if (directMatch) {
      const targetCategory = directMatch.category;
      const catConfig = CATEGORIES.find(c => 
        c.match.some(m => targetCategory.toLowerCase().includes(m.toLowerCase()))
      );
      if (catConfig) {
        setSelectedCategory(catConfig.id);
      }
    }
  }, [searchQuery]);

  // LOGIQUE DE RECHERCHE ET PRIORISATION DYNAMIQUE EN 3 PALIERS :
  // 1. L'application exacte dont le nom/mot-clé correspond le plus (sort en #1)
  // 2. Les applications ressemblantes ayant les mêmes mots-clés
  // 3. Les applications en lien direct avec l'écosystème/catégorie de l'application #1
  const { filteredApps, tierMap } = useMemo(() => {
    const cleanQ = (searchQuery || '').trim().toLowerCase();

    // 1. Si aucune recherche et aucune catégorie cliquée -> Liste vide (Fast Load)
    if (!cleanQ && !selectedCategory) {
      return { filteredApps: [], tierMap: new Map<string, 'exact' | 'similar_keywords' | 'related_category'>() };
    }

    const tMap = new Map<string, 'exact' | 'similar_keywords' | 'related_category'>();

    // 2. Si l'utilisateur tape du texte
    if (cleanQ) {
      const seenIds = new Set<string>();

      // A. Recherche du meilleur match direct pour l'application principale (#1)
      let bestPrimaryApp: AppRegistryItem | null = null;

      // Priorité A1 : Le nom commence exactement par la recherche (ex: "caisse" -> "Caisse Tactile")
      bestPrimaryApp = APPS_REGISTRY.find(app => 
        app.appName.toLowerCase().startsWith(cleanQ)
      ) || null;

      // Priorité A2 : Le nom contient la recherche
      if (!bestPrimaryApp) {
        bestPrimaryApp = APPS_REGISTRY.find(app => 
          app.appName.toLowerCase().includes(cleanQ)
        ) || null;
      }

      // Priorité A3 : Un des mots-clés commence par ou est égal à la recherche
      if (!bestPrimaryApp) {
        bestPrimaryApp = APPS_REGISTRY.find(app => 
          (app.keywords || []).some(k => k.toLowerCase() === cleanQ || k.toLowerCase().startsWith(cleanQ))
        ) || null;
      }

      // Priorité A4 : Un des mots-clés contient la recherche
      if (!bestPrimaryApp) {
        bestPrimaryApp = APPS_REGISTRY.find(app => 
          (app.keywords || []).some(k => k.toLowerCase().includes(cleanQ))
        ) || null;
      }

      if (bestPrimaryApp) {
        const primaryApp = bestPrimaryApp;
        seenIds.add(primaryApp.id);
        tMap.set(primaryApp.id, 'exact');

        const primaryKeywords = new Set((primaryApp.keywords || []).map(k => k.toLowerCase()));
        const primaryCategory = (primaryApp.category || '').toLowerCase();
        const queryTerms = cleanQ.split(/\s+/).filter(Boolean);

        // --- PALIER 1 : Application concernée en premier + autres correspondances directes sur le titre ---
        const tier1: AppRegistryItem[] = [primaryApp];

        const otherDirectNameMatches = APPS_REGISTRY.filter(app => 
          !seenIds.has(app.id) && app.appName.toLowerCase().includes(cleanQ)
        );
        otherDirectNameMatches.forEach(app => {
          seenIds.add(app.id);
          tMap.set(app.id, 'exact');
          tier1.push(app);
        });

        // --- PALIER 2 : Ressemblances (applications ayant les mêmes mots-clés) ---
        const tier2Scored: { app: AppRegistryItem; score: number }[] = [];

        APPS_REGISTRY.forEach(app => {
          if (seenIds.has(app.id)) return;

          const appKeywords = (app.keywords || []).map(k => k.toLowerCase());
          
          // Mots-clés en commun avec l'application principale #1
          const sharedWithPrimary = appKeywords.filter(k => primaryKeywords.has(k)).length;
          
          // Mots-clés correspondant directement aux termes recherchés
          const matchQueryTerms = appKeywords.filter(k => 
            queryTerms.some(qt => k.includes(qt) || qt.includes(k))
          ).length;

          const score = (sharedWithPrimary * 2) + (matchQueryTerms * 3);

          if (score > 0) {
            tier2Scored.push({ app, score });
          }
        });

        // Tri par pertinence de mots-clés
        tier2Scored.sort((a, b) => b.score - a.score);
        const tier2: AppRegistryItem[] = tier2Scored.map(item => {
          seenIds.add(item.app.id);
          tMap.set(item.app.id, 'similar_keywords');
          return item.app;
        });

        // --- PALIER 3 : Applications en lien avec la première application (même catégorie / univers) ---
        const catConfig = CATEGORIES.find(c => 
          c.match.some(m => primaryCategory.includes(m.toLowerCase()))
        );

        const tier3: AppRegistryItem[] = APPS_REGISTRY.filter(app => {
          if (seenIds.has(app.id)) return false;

          const inSameCat = catConfig
            ? catConfig.match.some(m => app.category.toLowerCase().includes(m.toLowerCase()))
            : app.category.toLowerCase() === primaryCategory;

          if (inSameCat) {
            seenIds.add(app.id);
            tMap.set(app.id, 'related_category');
            return true;
          }
          return false;
        });

        // --- PALIER 4 (Fallback) : Autres correspondances sur description ---
        const tier4: AppRegistryItem[] = APPS_REGISTRY.filter(app => {
          if (seenIds.has(app.id)) return false;
          if (app.shortDescription.toLowerCase().includes(cleanQ)) {
            seenIds.add(app.id);
            tMap.set(app.id, 'related_category');
            return true;
          }
          return false;
        });

        // Ordre strict demandé : 
        // 1. Application concernée en tête
        // 2. Ressemblances (même mots-clés)
        // 3. Applications en lien avec la première application
        return { 
          filteredApps: [...tier1, ...tier2, ...tier3, ...tier4],
          tierMap: tMap 
        };
      }

      // Si aucune correspondance stricte trouvée
      const fallbackMatches = APPS_REGISTRY.filter(app => 
        app.shortDescription.toLowerCase().includes(cleanQ)
      );
      return { filteredApps: fallbackMatches, tierMap: tMap };
    }

    // 3. Si filtrage direct par clic sur une catégorie à gauche
    const currentCategoryConfig = CATEGORIES.find(c => c.id === selectedCategory);
    if (currentCategoryConfig) {
      const catApps = APPS_REGISTRY.filter(app => 
        currentCategoryConfig.match.some(m => app.category.toLowerCase().includes(m.toLowerCase()))
      );
      return { filteredApps: catApps, tierMap: tMap };
    }

    return { filteredApps: [], tierMap: tMap };
  }, [searchQuery, selectedCategory]);

  const handleLaunch = (e: React.MouseEvent, app: AppRegistryItem) => {
    e.preventDefault();
    playValidationBeep();
    onClose();

    if (onOpenApp) {
      onOpenApp(app);
      return;
    }

    if (onNavigate && app.targetView && app.targetView !== 'STANDALONE_APP') {
      onNavigate(app.targetView);
      return;
    }

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', app.route);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, app: AppRegistryItem) => {
    e.stopPropagation();
    e.preventDefault();
    playTapBeep();
    const newStatus = !pinnedState[app.id];
    setPinnedState(prev => ({ ...prev, [app.id]: newStatus }));
    await togglePinApp(app.id, newStatus);
  };

  const activeCategoryObj = CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden h-[540px]">
      
      {/* COLONNE DE GAUCHE : CATÉGORIES (25% Largeur - Sans bouton "Tous") */}
      <div className="w-full md:w-1/4 bg-[#181825] border-r border-slate-800 p-4 overflow-y-auto shrink-0 scrollbar-thin">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
          Catégories
        </p>
        <div className="space-y-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  playTapBeep();
                  setSelectedCategory(cat.id);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[#4169E1] text-white shadow-lg shadow-[#4169E1]/30 font-bold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* COLONNE DE DROITE : ÉTAT NEUTRE OU SUGGESTIONS PRIORISÉES (75% Largeur) */}
      <div className="flex-1 bg-[#1E1E2E] p-4 sm:p-6 overflow-y-auto space-y-3.5 scrollbar-thin">
        {/* En-tête de la liste */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-slate-800/80">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {filteredApps.length > 0 
              ? `Résultats & Suggestions (${filteredApps.length})` 
              : 'Recherche d\'applications'}
          </p>
          {activeCategoryObj && (
            <span className="text-[11px] font-bold text-[#82a4ff] bg-[#4169E1]/15 px-2.5 py-0.5 rounded-full border border-[#4169E1]/30">
              {activeCategoryObj.label}
            </span>
          )}
        </div>

        {/* CAS 1 : AUCUNE RECHERCHE ET AUCUNE CATÉGORIE CLIQUEE -> ÉTAT NEUTRE RAPIDE */}
        {!searchQuery && !selectedCategory ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[360px] py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#4169E1] shadow-inner">
              <Search className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md">
              <p className="text-sm sm:text-base font-bold text-white">
                🔍 Saisissez un mot-clé ou choisissez une catégorie à gauche
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Recherchez instantanément par nom de module (ex: Caisse, Nanagénérateur, WhatsApp, Stock, Devis) ou parcourez le catalogue officiel par thématique.
              </p>
            </div>
          </div>
        ) : filteredApps.length === 0 ? (
          /* CAS 2 : RECHERCHE SANS RESULTATS */
          <div className="flex flex-col items-center justify-center h-full min-h-[320px] py-16 text-center text-slate-400 space-y-2">
            <p className="text-sm font-semibold text-slate-200">
              Aucun module ne correspond à "{searchQuery}"
            </p>
            <p className="text-xs text-slate-500">
              Vérifiez l'orthographe ou cliquez sur une catégorie à gauche.
            </p>
          </div>
        ) : (
          /* CAS 3 : AFFICHAGE PRIORISÉ (Direct match en tête, puis mots-clés similaires, puis même catégorie) */
          filteredApps.map((app, index) => {
            const IconComponent = getAppIcon(app);
            const isPinned = pinnedState[app.id];
            const palmares = getAppPalmaresBadge(app);
            const trialLabel = getAppTrialLabel(app);
            const tier = searchQuery ? tierMap.get(app.id) : null;
            const isFirstMatch = searchQuery && index === 0;

            return (
              <div
                key={app.id}
                onClick={(e) => handleLaunch(e, app)}
                className={`group relative flex items-start gap-3.5 sm:gap-4 p-3.5 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isFirstMatch
                    ? 'bg-[#2E2E48] border-[#4169E1] shadow-xl shadow-[#4169E1]/20 ring-1 ring-[#4169E1]/50'
                    : 'bg-[#28283D] border-slate-700/50 hover:border-[#4169E1] hover:shadow-xl hover:shadow-[#4169E1]/10'
                }`}
              >
                {/* Logo / Icône Carré Bleu Royal */}
                <div className={`p-3 rounded-xl border transition-colors shrink-0 ${
                  isFirstMatch
                    ? 'bg-[#4169E1] text-white border-[#4169E1]'
                    : 'bg-[#4169E1]/20 border-[#4169E1]/40 text-[#4169E1] group-hover:bg-[#4169E1] group-hover:text-white'
                }`}>
                  <IconComponent className="w-5 h-5 sm:w-6 sm:h-6"/>
                </div>

                {/* Contenu principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={app.route}
                      onClick={(e) => handleLaunch(e, app)}
                      className="text-sm sm:text-base font-bold text-white hover:text-[#4169E1] transition-colors flex items-center gap-1.5"
                    >
                      <span className="truncate">{app.appName}</span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-[#4169E1]"/>
                    </a>

                    {tier === 'exact' && (
                      <span className="px-2 py-0.5 text-[10px] font-black bg-[#4169E1] text-white rounded-full shadow-xs">
                        🎯 Correspondance directe
                      </span>
                    )}

                    {tier === 'similar_keywords' && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 rounded-full">
                        ✨ Mots-clés similaires
                      </span>
                    )}

                    {tier === 'related_category' && (
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-full">
                        🔗 Même écosystème
                      </span>
                    )}
                    
                    {/* Badge Palmarès */}
                    {palmares && (
                      <span className="px-2 py-0.5 text-[10.5px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full shrink-0">
                        {palmares}
                      </span>
                    )}

                    {app.isPro && (
                      <span className="px-1.5 py-0.2 text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded uppercase">
                        PRO
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300/90 mt-1 line-clamp-2 leading-relaxed">
                    {app.shortDescription}
                  </p>

                  <div className="mt-2.5 flex items-center gap-2.5 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-md flex items-center gap-1">
                      <span>🎁</span>
                      <span>{trialLabel}</span>
                    </span>

                    {app.priceMonthly > 0 ? (
                      <span className="text-[11px] text-slate-400">
                        {app.priceMonthly.toLocaleString('fr-FR')} F/mois
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-medium">
                        Inclus
                      </span>
                    )}
                  </div>
                </div>

                {/* Bouton Favori / Épingler */}
                <button 
                  type="button"
                  onClick={(e) => handleTogglePin(e, app)}
                  title={isPinned ? "Désépingler de la barre latérale" : "Épingler dans la barre latérale"} 
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    isPinned ? 'text-amber-400 bg-amber-400/10' : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'
                  }`}
                >
                  <Star className={`w-5 h-5 ${isPinned ? 'fill-amber-400' : ''}`}/>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
