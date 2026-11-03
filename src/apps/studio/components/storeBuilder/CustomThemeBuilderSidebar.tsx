import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Plus, 
  Zap, 
  Layers, 
  Palette, 
  Tag, 
  Eye, 
  EyeOff, 
  Settings2, 
  ChevronRight, 
  ChevronDown, 
  Check, 
  RotateCcw, 
  Save, 
  ShoppingBag,
  Sliders,
  Type,
  LayoutGrid
} from 'lucide-react';
import { 
  ThemeCustomizationConfig, 
  CustomThemeSection, 
  CustomThemeSectionType, 
  CustomThemeMood, 
  CustomThemeButtonStyle 
} from '../../../../types';
import { StoreProductItem } from './types';
import { RECOMMENDED_DEFAULT_SECTIONS } from '../../../../themes/blankCustom/ThemeBlankCustom';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface CustomThemeBuilderSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  config: ThemeCustomizationConfig;
  onChange: (updated: ThemeCustomizationConfig) => void;
  products: StoreProductItem[];
  savedConfig: ThemeCustomizationConfig;
  hasUnsavedChanges: boolean;
  onReset: () => void;
  onPublish: () => Promise<void> | void;
  isPublishing?: boolean;
}

const AVAILABLE_MODULES: Array<{
  type: CustomThemeSectionType;
  title: string;
  badge: string;
  icon: string;
  desc: string;
  defaultTitle: string;
  defaultSubtitle: string;
}> = [
  {
    type: 'hero_split_banner',
    title: 'Bannière Hero Sur-Mesure',
    badge: 'ACCUEIL • CONVERSION',
    icon: '🖼️',
    desc: 'Grand visuel immersif (Split 50/50 ou Plein écran centré), texte fort et bouton direct vers le tunnel à 12 blocs.',
    defaultTitle: 'La Nouvelle Collection Nanasore',
    defaultSubtitle: 'OFFRE EXCLUSIVE • LIVRAISON 24H'
  },
  {
    type: 'spotify_product_shelf',
    title: 'Rail Produits Spotify',
    badge: 'PLAYLIST SOUS LE POUCE',
    icon: '🎧',
    desc: 'Carrousel horizontal ultra-fluide façon hits Spotify avec défilement tactile et boutons d\'achat direct.',
    defaultTitle: '🎧 Les Hits de la Semaine',
    defaultSubtitle: 'Nos meilleures ventes sélectionnées pour vous'
  },
  {
    type: 'product_grid_custom',
    title: 'Grille Catalogue Modulable',
    badge: 'CATALOGUE',
    icon: '📦',
    desc: 'Affichage en 2, 3 ou 4 colonnes avec filtres de catégories et barre de recherche rapide intégrée.',
    defaultTitle: '📦 Tout Notre Catalogue',
    defaultSubtitle: 'Explorez nos articles et commandez en un clic'
  },
  {
    type: 'spotlight_deal_countdown',
    title: 'Offre Flash & Compte à Rebours',
    badge: 'URGENCE & CHRONO',
    icon: '⚡',
    desc: 'Met en vedette 1 produit avec compte à rebours dynamique, jauge de stock et arguments techniques.',
    defaultTitle: '⚡ Offre Flash du Jour',
    defaultSubtitle: 'Stock limité : Tarif garanti jusqu\'à épuisement'
  },
  {
    type: 'video_story_reel',
    title: 'Galerie Vidéos / Démo UGC',
    badge: 'FORMAT REELS / TIKTOK',
    icon: '🎬',
    desc: '3 vidéos verticales immersives ou 1 grand lecteur vidéo avec commande directe sous chaque clip.',
    defaultTitle: '🎬 Démonstrations & Routines Vidéo',
    defaultSubtitle: 'Regardez nos produits en action avant d\'acheter'
  },
  {
    type: 'trust_badges_strip',
    title: 'Bandeau de Réassurance',
    badge: '4 GARANTIES CLÉ',
    icon: '🛡️',
    desc: 'Livraison express, paiement Mobile Money à la réception, support WhatsApp 24/7 et garantie satisfaction.',
    defaultTitle: 'Pourquoi Choisir Notre Boutique ?',
    defaultSubtitle: 'Votre satisfaction garantie à chaque commande'
  },
  {
    type: 'rich_story_banner',
    title: 'Histoire de la Marque & Promo',
    badge: 'BRANDING',
    icon: '📖',
    desc: 'Texte riche + image pour raconter votre histoire, valoriser votre savoir-faire ou promouvoir une collection.',
    defaultTitle: 'Notre Histoire & Nos Engagements',
    defaultSubtitle: 'L\'AUTHENTICITÉ AVANT TOUT'
  },
  {
    type: 'faq_accordion_section',
    title: 'Foire Aux Questions (FAQ)',
    badge: 'LEVÉE DES FREINS',
    icon: '❓',
    desc: '3 à 5 questions/réponses dépliables pour rassurer vos visiteurs avant le passage de commande.',
    defaultTitle: 'Questions Fréquentes',
    defaultSubtitle: 'Tout ce que vous devez savoir avant de commander'
  }
];

export const CustomThemeBuilderSidebar: React.FC<CustomThemeBuilderSidebarProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  products = [],
  savedConfig,
  hasUnsavedChanges,
  onReset,
  onPublish,
  isPublishing = false
}) => {
  const [activeTab, setActiveTab] = useState<'sections' | 'mood' | 'identity'>('sections');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentSections: CustomThemeSection[] = config.customSections || [];

  const handleUpdateSections = (next: CustomThemeSection[]) => {
    onChange({
      ...config,
      customSections: next
    });
  };

  const handleAddSection = (type: CustomThemeSectionType) => {
    playValidationBeep();
    const meta = AVAILABLE_MODULES.find(m => m.type === type);
    const newSection: CustomThemeSection = {
      id: `sec-${type}-${Date.now()}`,
      type,
      title: meta?.defaultTitle || "Nouveau Bloc",
      subtitle: meta?.defaultSubtitle || "",
      enabled: true,
      visible: true,
      config: {}
    };

    const next = [...currentSections, newSection];
    handleUpdateSections(next);
    setShowAddModal(false);
    setEditingSectionId(newSection.id);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    playTapBeep();
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentSections.length) return;
    const next = [...currentSections];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    handleUpdateSections(next);
  };

  const handleDeleteSection = (id: string) => {
    playTapBeep();
    const next = currentSections.filter(s => s.id !== id);
    handleUpdateSections(next);
    if (editingSectionId === id) setEditingSectionId(null);
  };

  const handleToggleSectionVisibility = (id: string) => {
    playTapBeep();
    const next = currentSections.map(s => {
      if (s.id === id) {
        return { ...s, visible: s.visible === false ? true : false };
      }
      return s;
    });
    handleUpdateSections(next);
  };

  const handleUpdateSectionData = (id: string, updates: Partial<CustomThemeSection>) => {
    const next = currentSections.map(s => {
      if (s.id === id) {
        return {
          ...s,
          ...updates,
          config: {
            ...(s.config || {}),
            ...(updates.config || {})
          }
        };
      }
      return s;
    });
    handleUpdateSections(next);
  };

  const handleLoadRecommended = () => {
    playValidationBeep();
    handleUpdateSections(RECOMMENDED_DEFAULT_SECTIONS);
  };

  const activeEditingSection = currentSections.find(s => s.id === editingSectionId);

  return (
    <aside 
      className="w-[360px] lg:w-[400px] shrink-0 h-[calc(100vh-64px)] bg-white border-r border-slate-200 flex flex-col shadow-2xl z-40 select-none text-slate-900 animate-in slide-in-from-left duration-200"
      aria-label="Constructeur de sections personnalisées"
    >
      {/* 1. En-Tête du Constructeur (Bleu & Blanc Nanasore) */}
      <div className="h-16 px-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-blue-100 text-blue-700">
              <Layers className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              Architecte de Thème
            </h2>
          </div>
          <p className="text-[10px] font-bold text-blue-600 mt-0.5">
            Page Blanche & Sections Modulaires (0ms)
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onClose();
          }}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Onglets Navigation Studio (Shopify OS 2.0 & Spotify) */}
      <div className="flex items-center border-b border-slate-200 bg-white text-xs font-bold shrink-0">
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            setActiveTab('sections');
            setEditingSectionId(null);
          }}
          className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'sections'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Sections ({currentSections.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTapBeep();
            setActiveTab('mood');
            setEditingSectionId(null);
          }}
          className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'mood'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Ambiance & Style</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTapBeep();
            setActiveTab('identity');
            setEditingSectionId(null);
          }}
          className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'identity'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Marque</span>
        </button>
      </div>

      {/* 3. Corps Scrollable du Constructeur */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* ========================================================================= */}
        {/* ONGLET 1 : ARBORESCENCE DES SECTIONS */}
        {/* ========================================================================= */}
        {activeTab === 'sections' && (
          <div className="space-y-4">
            {/* Si un bloc précis est en cours d'édition */}
            {activeEditingSection ? (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingSectionId(null)}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>← Retour aux sections</span>
                  </button>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                    {activeEditingSection.type}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Titre de la section :
                    </label>
                    <input
                      type="text"
                      value={activeEditingSection.title || ''}
                      onChange={(e) => handleUpdateSectionData(activeEditingSection.id, { title: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Sous-titre / Badge d'urgence :
                    </label>
                    <input
                      type="text"
                      value={activeEditingSection.subtitle || ''}
                      onChange={(e) => handleUpdateSectionData(activeEditingSection.id, { subtitle: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                    />
                  </div>

                  {/* Contrôles spécifiques au type Hero Split */}
                  {activeEditingSection.type === 'hero_split_banner' && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Disposition (Layout) :
                        </label>
                        <select
                          value={activeEditingSection.config?.layout || 'split'}
                          onChange={(e) => handleUpdateSectionData(activeEditingSection.id, {
                            config: { ...activeEditingSection.config, layout: e.target.value }
                          })}
                          className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 outline-none"
                        >
                          <option value="split">Split 50/50 (Texte à gauche, Grande image à droite)</option>
                          <option value="centered">Plein écran centré (Immersif)</option>
                          <option value="compact">Format Compact</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Texte du bouton CTA :
                        </label>
                        <input
                          type="text"
                          value={activeEditingSection.config?.ctaText || 'Commander maintenant'}
                          onChange={(e) => handleUpdateSectionData(activeEditingSection.id, {
                            config: { ...activeEditingSection.config, ctaText: e.target.value }
                          })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Produit lié au bouton CTA :
                        </label>
                        <select
                          value={activeEditingSection.config?.linkedProductId || ''}
                          onChange={(e) => handleUpdateSectionData(activeEditingSection.id, {
                            config: { ...activeEditingSection.config, linkedProductId: e.target.value }
                          })}
                          className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 outline-none"
                        >
                          <option value="">-- Premier produit du catalogue --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.price.toLocaleString('fr-FR')} F)</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Contrôles spécifiques au type Grille */}
                  {activeEditingSection.type === 'product_grid_custom' && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Colonnes sur Grand Écran (Desktop) :
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[2, 3, 4].map(col => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => handleUpdateSectionData(activeEditingSection.id, {
                                config: { ...activeEditingSection.config, columns: col }
                              })}
                              className={`py-2 rounded-xl font-bold border text-xs transition cursor-pointer ${
                                (activeEditingSection.config?.columns || 3) === col
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {col} Colonnes
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-bold text-slate-700">Barre de recherche rapide</span>
                        <input
                          type="checkbox"
                          checked={activeEditingSection.config?.showSearch ?? true}
                          onChange={(e) => handleUpdateSectionData(activeEditingSection.id, {
                            config: { ...activeEditingSection.config, showSearch: e.target.checked }
                          })}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Filtres par catégories</span>
                        <input
                          type="checkbox"
                          checked={activeEditingSection.config?.showCategories ?? true}
                          onChange={(e) => handleUpdateSectionData(activeEditingSection.id, {
                            config: { ...activeEditingSection.config, showCategories: e.target.checked }
                          })}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                      </div>
                    </div>
                  )}

                  {/* Contrôles spécifiques au type Spotlight Deal */}
                  {activeEditingSection.type === 'spotlight_deal_countdown' && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Produit Vedette Flash :
                        </label>
                        <select
                          value={activeEditingSection.config?.productId || ''}
                          onChange={(e) => handleUpdateSectionData(activeEditingSection.id, {
                            config: { ...activeEditingSection.config, productId: e.target.value }
                          })}
                          className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 outline-none"
                        >
                          <option value="">-- Sélectionner un produit --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.price.toLocaleString('fr-FR')} F)</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Durée du Chrono (Heures) :
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={72}
                          value={activeEditingSection.config?.countdownHours || 12}
                          onChange={(e) => handleUpdateSectionData(activeEditingSection.id, {
                            config: { ...activeEditingSection.config, countdownHours: Number(e.target.value) }
                          })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Bouton d'Ajout Principal */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setShowAddModal(true);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Ajouter une Section</span>
                </button>

                {/* Bouton Charger Template si vide */}
                {currentSections.length === 0 && (
                  <button
                    type="button"
                    onClick={handleLoadRecommended}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>⚡ Charger la structure recommandée</span>
                  </button>
                )}

                {/* Liste Ordonnée des Sections */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Sections de votre boutique ({currentSections.length}) :
                  </span>

                  {currentSections.map((sec, sIdx) => {
                    const meta = AVAILABLE_MODULES.find(m => m.type === sec.type);
                    const isVisible = sec.visible !== false;

                    return (
                      <div
                        key={sec.id || sIdx}
                        className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 bg-white ${
                          isVisible
                            ? 'border-slate-200 hover:border-blue-400 hover:shadow-sm'
                            : 'border-slate-200/60 bg-slate-50 opacity-60'
                        }`}
                      >
                        <div 
                          onClick={() => setEditingSectionId(sec.id)}
                          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                        >
                          <span className="text-lg shrink-0">{meta?.icon || '📦'}</span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-slate-900 truncate">
                              {sec.title || meta?.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-medium">
                              #{sIdx + 1} • {meta?.badge}
                            </span>
                          </div>
                        </div>

                        {/* Actions Rapides sur la Ligne */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={sIdx === 0}
                            onClick={() => handleMoveSection(sIdx, 'up')}
                            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                              sIdx === 0 ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                            title="Monter"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={sIdx === currentSections.length - 1}
                            onClick={() => handleMoveSection(sIdx, 'down')}
                            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                              sIdx === currentSections.length - 1 ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                            title="Descendre"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleSectionVisibility(sec.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                            title={isVisible ? "Masquer" : "Afficher"}
                          >
                            {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-amber-500" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingSectionId(sec.id)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Configurer"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSection(sec.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 2 : AMBIANCE & STYLE (SPOTIFY MOODS) */}
        {/* ========================================================================= */}
        {activeTab === 'mood' && (
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                1. Ambiance de Couleur (Style Spotify) :
              </span>

              <div className="space-y-2.5">
                {[
                  {
                    id: 'blue_white' as CustomThemeMood,
                    name: 'Bleu Nanasore Original',
                    desc: 'L\'ADN officiel : Blanc pur, typographie nette et Bleu Royal #2563EB',
                    colors: ['#2563EB', '#FFFFFF', '#1D4ED8'],
                    isOfficial: true
                  },
                  {
                    id: 'spotify_dark' as CustomThemeMood,
                    name: 'Spotify Dark Mode',
                    desc: 'Noir profond, cartes contrastées et vert émeraude percutant',
                    colors: ['#121212', '#1DB954', '#181818']
                  },
                  {
                    id: 'sand_nature' as CustomThemeMood,
                    name: 'Nature & Sable Doux',
                    desc: 'Tons chauds, élégance végétale et sérénité organique',
                    colors: ['#FAF7F2', '#0F4C3A', '#E7E1D8']
                  },
                  {
                    id: 'luxury_gold' as CustomThemeMood,
                    name: 'Luxe Noir & Or Champagne',
                    desc: 'Contraste noir absolu et accents or pour boutiques haut de gamme',
                    colors: ['#0A0A0A', '#D4AF37', '#141414']
                  }
                ].map((item) => {
                  const isSelected = (config.customMood || 'blue_white') === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        playTapBeep();
                        onChange({ ...config, customMood: item.id });
                      }}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            {item.name}
                          </span>
                          {item.isOfficial && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white">
                              Défaut Nanasore
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          {item.desc}
                        </p>
                      </div>

                      {/* Pastilles de couleur d'ambiance */}
                      <div className="flex items-center gap-1 shrink-0">
                        {item.colors.map((c, cIdx) => (
                          <span 
                            key={cIdx} 
                            className="w-4 h-4 rounded-full border border-black/10 shadow-xs" 
                            style={{ backgroundColor: c }} 
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Forme des Boutons */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                2. Style des Boutons CTA :
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'rounded-xl' as CustomThemeButtonStyle, label: 'Arrondis Modernes' },
                  { id: 'rounded-full' as CustomThemeButtonStyle, label: 'Pilules (Spotify)' },
                  { id: 'rounded-none' as CustomThemeButtonStyle, label: 'Carrés Nets' }
                ].map(style => {
                  const isSelected = (config.customButtonStyle || 'rounded-xl') === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        onChange({ ...config, customButtonStyle: style.id });
                      }}
                      className={`py-2 px-1 text-center font-bold text-[11px] border transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {style.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 3 : IDENTITÉ, CONTACT & BARRE D'ANNONCE */}
        {/* ========================================================================= */}
        {activeTab === 'identity' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nom officiel de la boutique :
              </label>
              <input
                type="text"
                value={config.storeName || ''}
                onChange={(e) => onChange({ ...config, storeName: e.target.value })}
                placeholder="Ex: Élégance Abidjan"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Slogan / Tagline :
              </label>
              <input
                type="text"
                value={config.storeTagline || ''}
                onChange={(e) => onChange({ ...config, storeTagline: e.target.value })}
                placeholder="Ex: Mode & Accessoires Haut de Gamme"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Numéro WhatsApp Commandes :
              </label>
              <input
                type="tel"
                value={config.whatsappNumber || ''}
                onChange={(e) => onChange({ ...config, whatsappNumber: e.target.value })}
                placeholder="+225 07 00 00 00"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Texte du bandeau d'annonce supérieur :
              </label>
              <textarea
                rows={2}
                value={config.announcementBarText || ''}
                onChange={(e) => onChange({ ...config, announcementBarText: e.target.value })}
                placeholder="🔥 Livraison Express 24-48h • Paiement Mobile Money & Cash"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Pied de Panneau : Sauvegarde & Publication */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onReset();
          }}
          disabled={!hasUnsavedChanges || isPublishing}
          className={`px-3 py-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold transition cursor-pointer ${
            hasUnsavedChanges && !isPublishing
              ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
          }`}
          title="Réinitialiser"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Annuler</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onPublish();
          }}
          disabled={isPublishing}
          className={`flex-1 py-3 px-4 rounded-xl text-white font-black text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
            isPublishing
              ? 'bg-blue-400 cursor-wait'
              : 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-blue-600/30 ring-1 ring-blue-400'
          }`}
        >
          {isPublishing ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Publication...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>💾 Publier sur nsore.shop</span>
            </>
          )}
        </button>
      </div>

      {/* 5. Modale Visuelle "+ Ajouter une Section" (8 Modules) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[3000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Bibliothèque des 8 Modules
                </h3>
                <p className="text-xs text-slate-500">
                  Choisissez une section à empiler sur votre vitrine (Style Shopify OS 2.0)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
              {AVAILABLE_MODULES.map((mod) => (
                <div
                  key={mod.type}
                  onClick={() => handleAddSection(mod.type)}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer bg-white group flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{mod.icon}</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {mod.badge}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition">
                      {mod.title}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {mod.desc}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <span className="text-xs font-bold text-blue-600 group-hover:underline flex items-center gap-1">
                      <span>Insérer ce bloc</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default CustomThemeBuilderSidebar;
