import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  GripVertical,
  Plus,
  Sliders,
  Check,
  Zap
} from 'lucide-react';
import {
  NANA_ICONS_LIST,
  NANA_ICON_CATEGORIES,
  DEFAULT_NANA_BLUE,
  DEFAULT_NANA_ACCENT
} from './nanaIconsData';

/**
 * Composant NanaIconLibraryModal - La Bibliothèque d'Icônes NaNa Duotone
 * Panneau / Modale plein écran ou large tiroir dédié au choix d'icônes
 * illustratives et réalistes avec glisser-déposer vers le Canvas.
 */
export const NanaIconLibraryModal = ({
  isOpen = false,
  onClose = () => {},
  onSelectIcon = () => {},
  onDragStart = () => {}
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_NANA_BLUE);

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

  // Palette de prévisualisation rapide des couleurs de marque
  const COLOR_SWATCHES = [
    { name: 'Bleu NaNa (Officiel)', hex: '#2563eb', accent: '#93c5fd' },
    { name: 'Cyan Électrique', hex: '#0284c7', accent: '#7dd3fc' },
    { name: 'Émeraude Succès', hex: '#10b981', accent: '#6ee7b7' },
    { name: 'Or Solaire VIP', hex: '#f59e0b', accent: '#fde68a' },
    { name: 'Pourpre Royal', hex: '#8b5cf6', accent: '#c4b5fd' },
    { name: 'Rubis Urgent', hex: '#ef4444', accent: '#fca5a5' }
  ];

  const currentAccent = useMemo(() => {
    const swatch = COLOR_SWATCHES.find(c => c.hex === selectedColor);
    return swatch ? swatch.accent : DEFAULT_NANA_ACCENT;
  }, [selectedColor]);

  // Filtrage combiné par recherche et par catégorie
  const filteredIcons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return NANA_ICONS_LIST.filter(icon => {
      const matchCat = activeCategory === 'all' || icon.category === activeCategory;
      const matchQuery = !q || icon.name.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [searchQuery, activeCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* Conteneur Principal de la Modale */}
      <div className="w-full max-w-5xl h-[94vh] sm:h-[88vh] max-h-[94dvh] bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* En-tête Premium */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 border border-blue-400/30">
                <span className="text-2xl">💎</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                    Bibliothèque d'Icônes NaNa
                  </h2>
                  <span className="text-[10px] font-mono font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded-full shadow-sm">
                    Duotone Pro
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Icônes illustratives à deux tons • Couleur officielle Bleu NaNa • 100% vectoriel net
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
              title="Fermer la bibliothèque"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Ligne d'outils : Recherche + Palette de Nuances */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Champ de recherche */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une icône (Panier, Bouclier, Carte, Fusée, Couronne, WhatsApp...)"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sélecteur de Nuance pour prévisualisation */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" />
                <span>Teinte :</span>
              </span>
              <div className="flex items-center gap-1.5">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => setSelectedColor(swatch.hex)}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                    style={{
                      backgroundColor: swatch.hex,
                      borderColor: selectedColor === swatch.hex ? '#ffffff' : 'transparent'
                    }}
                    title={swatch.name}
                  >
                    {selectedColor === swatch.hex && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Badges de Catégories (Filtres Rapides) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 no-scrollbar text-xs">
            {NANA_ICON_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3.5 py-2 min-h-[44px] rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer border ${
                    isActive
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Note d'utilisation Drag & Drop */}
        <div className="px-6 py-2 bg-blue-600/[0.07] border-b border-blue-500/20 flex items-center justify-between text-xs text-blue-300">
          <span className="flex items-center gap-2 font-medium">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>Glissez une icône directement sur le Canvas ou cliquez sur <strong>[+ Insérer]</strong></span>
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {filteredIcons.length} icônes disponibles
          </span>
        </div>

        {/* Grille d'Icônes Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {filteredIcons.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <span className="text-3xl">🔍</span>
              <p className="text-sm font-bold text-slate-400">Aucune icône ne correspond à votre recherche.</p>
              <p className="text-xs text-slate-600">Essayez un autre mot-clé ou réinitialisez les filtres.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredIcons.map((icon) => {
                const toolModule = {
                  type: 'icon_block',
                  name: icon.name,
                  category: 'structure_components_pro',
                  iconId: icon.name,
                  createDefaultData: () => ({
                    iconId: icon.name,
                    iconName: icon.name,
                    iconColor: selectedColor,
                    accentColor: currentAccent,
                    bgColor: '#081325',
                    glowColor: `${selectedColor}40`,
                    size: 64,
                    styleVariant: 'duotone_glow',
                    alignment: 'center',
                    title: icon.name,
                    caption: 'Garantie et valeur ajoutée reconnues',
                    showBadge: true
                  })
                };

                return (
                  <div
                    key={icon.id}
                    draggable={true}
                    onDragStart={(e) => onDragStart(e, toolModule)}
                    className="group p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-blue-500/80 hover:bg-slate-800/60 transition-all duration-200 flex flex-col items-center text-center gap-2.5 relative cursor-grab active:cursor-grabbing shadow-sm hover:shadow-xl hover:shadow-blue-500/10"
                  >
                    {/* Badge Drag Indicateur */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-500 group-hover:text-blue-400 transition">
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    {/* Rendu de l'icône Duotone avec halo */}
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800/90 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-inner group-hover:shadow-lg group-hover:shadow-blue-500/20">
                      {icon.render({
                        size: 38,
                        primaryColor: selectedColor,
                        secondaryColor: currentAccent
                      })}
                    </div>

                    {/* Nom de l'icône */}
                    <div className="min-w-0 w-full">
                      <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition truncate">
                        {icon.name}
                      </h4>
                      <span className="text-[9.5px] font-mono text-slate-500 capitalize">
                        {icon.category}
                      </span>
                    </div>

                    {/* Bouton d'action direct */}
                    <button
                      type="button"
                      onClick={() => onSelectIcon(toolModule)}
                      className="w-full min-h-[40px] py-2 px-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Insérer</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pied de Modale */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Zap className="w-4 h-4 text-blue-400" />
            <span>Toutes les icônes supportent le changement de taille, couleur et ombre dans l'inspecteur.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default NanaIconLibraryModal;
