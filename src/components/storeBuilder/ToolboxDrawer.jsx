import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Zap,
  Info
} from 'lucide-react';
import { TOOLBOX_PRO_CATEGORIES, TOOLBOX_PRO_CATALOG } from './toolboxData';

/**
 * Composant ToolboxDrawer - Le Hub d'Intégration Pro du Funnel Builder
 * Fournit un panneau rétractable latéral en accordéon avec tous les outils
 * avancés 100% compatibles Drag & Drop natif.
 */
export const ToolboxDrawer = ({
  isOpen = false,
  onClose = () => {},
  onDragStart = () => {},
  onDragEnd = () => {},
  onInsertTool = () => {}
}) => {
  // Recherche rapide d'outils
  const [searchQuery, setSearchQuery] = useState('');

  // Verrouillage du scroll du body en arrière-plan
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // État des accordéons de catégories (les nouvelles sections ouvertes par défaut)
  const [expandedCategories, setExpandedCategories] = useState({
    urgency_scarcity_banners: true,
    hero_sections_pro: true,
    structure_components_pro: true,
    nana_ecosystem: true,
    video_live_embeds: true,
    social_sharing: true,
    ecommerce_payment: true,
    webinar_elearning: false,
    crm_automation: false,
    tracking_behavior: false,
    premium_pro: false
  });

  const toggleCategory = (catId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  // Filtrage des modules par recherche
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return TOOLBOX_PRO_CATALOG;
    return TOOLBOX_PRO_CATALOG.filter(mod =>
      mod.name.toLowerCase().includes(q) ||
      mod.description.toLowerCase().includes(q) ||
      mod.badge.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Si le tiroir est fermé, on ne rend rien (ou on peut le cacher via transform)
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop sombre avec flou d'arrière-plan */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Panneau Latéral Coulissant Gauche (Drawer Accordéon) */}
      <aside
        className="fixed inset-y-0 left-0 z-50 w-full sm:w-[420px] max-w-full sm:max-w-[92vw] bg-slate-900/98 border-r border-slate-800/90 shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden select-none animate-in slide-in-from-left duration-300"
      >
        {/* En-tête Premium du Hub */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/25">
                <span className="text-lg">🧰</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-white tracking-tight">
                    Boîte à Outils Pro
                  </h2>
                  <span className="text-[10px] font-mono font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                    Hub 3.0
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Intégrations & Modules Avancés Drag & Drop
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
              title="Fermer la boîte à outils"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Barre de Recherche Filtrante */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher (YouTube, TikTok, WhatsApp, Campus, Académie, Wave...)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Note informative Drag & Drop */}
        <div className="px-4 py-2 bg-indigo-600/[0.04] border-b border-indigo-500/20 flex items-center justify-between text-[11px] text-indigo-300">
          <span className="flex items-center gap-1.5 font-medium">
            <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Glissez un outil ou cliquez sur [+] pour l'insérer</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {filteredCatalog.length} modules
          </span>
        </div>

        {/* Corps Déroulant avec Accordéon par Catégorie */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3 custom-scrollbar">
          {TOOLBOX_PRO_CATEGORIES.map((category) => {
            const CatIcon = category.icon;
            // Outils appartenant à cette catégorie et correspondant à la recherche
            const categoryTools = filteredCatalog.filter(tool =>
              tool.category === category.id
            );

            // Si recherche active et aucun résultat dans cette catégorie, masquer
            if (searchQuery && categoryTools.length === 0) return null;

            const isExpanded = expandedCategories[category.id] ?? true;

            return (
              <div
                key={category.id}
                className="rounded-2xl border border-slate-800/90 bg-slate-950/60 overflow-hidden shadow-sm transition-all"
              >
                {/* En-tête Accordéon de la Catégorie (Cliquable) */}
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="w-full min-h-[48px] p-3 flex items-center justify-between text-left hover:bg-slate-900/80 transition cursor-pointer bg-slate-900/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${category.color}15`,
                        borderColor: `${category.color}40`,
                        color: category.color
                      }}
                    >
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-white truncate">
                          {category.title}
                        </h3>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0">
                          {categoryTools.length}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 truncate">
                        {category.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg text-slate-400 hover:text-white shrink-0 ml-2">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Contenu Déroulable de l'Accordéon */}
                {isExpanded && (
                  <div className="p-2 space-y-2 border-t border-slate-800/80 bg-slate-950/30">
                    {categoryTools.map((tool) => {
                      const ToolIcon = tool.icon;
                      return (
                        <div
                          key={tool.type}
                          draggable={true}
                          onDragStart={(e) => onDragStart(e, tool)}
                          onDragEnd={onDragEnd}
                          className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-800/60 transition-all duration-200 cursor-grab active:cursor-grabbing group flex flex-col gap-2 relative shadow-sm select-none"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105"
                                style={{
                                  backgroundColor: `${tool.color}20`,
                                  borderColor: `${tool.color}50`,
                                  color: tool.color
                                }}
                              >
                                <ToolIcon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition truncate">
                                  {tool.name}
                                </h4>
                                <span className="text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/80">
                                  {tool.badge}
                                </span>
                              </div>
                            </div>

                            {/* Poignée Grip et Bouton d'ajout rapide 1-clic */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInsertTool(tool);
                                }}
                                className="px-2.5 py-1.5 sm:px-2 sm:py-1 min-h-[38px] sm:min-h-0 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[10.5px] font-bold flex items-center gap-1 transition cursor-pointer"
                                title="Ajouter directement en bas du Canvas"
                              >
                                <Plus className="w-3 h-3 stroke-[3]" />
                                <span>Ajouter</span>
                              </button>
                              <div className="p-1 text-slate-600 group-hover:text-indigo-400 transition">
                                <GripVertical className="w-4 h-4" />
                              </div>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {tool.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pied du Hub d'Intégration */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Moteur d'injection temps réel prêt</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </aside>
    </>
  );
};

export default ToolboxDrawer;
