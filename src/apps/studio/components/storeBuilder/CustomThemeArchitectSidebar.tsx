import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Undo2, 
  Redo2, 
  Plus, 
  GripVertical, 
  ArrowUp, 
  ArrowDown, 
  Copy, 
  Eye, 
  EyeOff, 
  Trash2, 
  Settings2, 
  X, 
  Sparkles, 
  Save, 
  RotateCcw, 
  ChevronRight, 
  ChevronDown,
  Palette, 
  Layers, 
  HelpCircle,
  Zap,
  Check,
  Smartphone,
  Sliders,
  Settings,
  QrCode,
  ExternalLink,
  Download,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { arePixelsConfigured } from '../../../../utils/pixelTrackingEngine';
import { 
  ThemeCustomizationConfig, 
  CustomSectionInstance, 
  CustomSectionType, 
  CustomThemeMood, 
  CustomThemeMoodPreset,
  HeaderStyleType,
  FooterStyleType,
  ThemeSavedPreset,
  SavedThemePreset
} from '../../../../types';
import { StoreProductItem } from './types';
import { THEME_MOOD_PRESETS, resolveCustomThemeMood } from '../../../../themes/blankCustom/moodStyles';
import { ARCHITECT_BLUEPRINTS, ArchitectBlueprint } from '../../../../themes/blankCustom/blueprints';
import { 
  ARCHITECT_RECOMMENDED_SECTIONS, 
  ARCHITECT_MODULES, 
  ModuleDefinition, 
  HEADER_STYLES_LIST, 
  FOOTER_STYLES_LIST 
} from '../../../../themes/blankCustom/architectModules';
export { 
  ARCHITECT_RECOMMENDED_SECTIONS, 
  ARCHITECT_MODULES, 
  HEADER_STYLES_LIST, 
  FOOTER_STYLES_LIST 
};
export type { ModuleDefinition };
import { CustomSectionInspector } from './CustomSectionInspector';
import { ThemePresetsAndDraftManager } from './ThemePresetsAndDraftManager';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface CustomThemeArchitectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  config: ThemeCustomizationConfig;
  onChange: (updated: ThemeCustomizationConfig) => void;
  products: StoreProductItem[];
  categories?: string[];
  savedConfig: ThemeCustomizationConfig;
  hasUnsavedChanges: boolean;
  onReset: () => void;
  onPublish: () => Promise<void> | void;
  isPublishing?: boolean;
  selectedSectionId?: string | null;
  onSelectSection?: (sectionId: string | null) => void;
  storeSlug?: string;
}

export const CustomThemeArchitectSidebar: React.FC<CustomThemeArchitectSidebarProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  products = [],
  categories = [],
  savedConfig,
  hasUnsavedChanges,
  onReset,
  onPublish,
  isPublishing = false,
  selectedSectionId,
  onSelectSection,
  storeSlug = 'boutique'
}) => {
  const safeConfig = config || ({} as ThemeCustomizationConfig);
  const currentSections = Array.isArray(safeConfig.customSections) ? safeConfig.customSections : [];

  // Pile d'Historique pour Undo / Redo
  const [historyStack, setHistoryStack] = useState<CustomSectionInstance[][]>(() => [
    currentSections
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // État de l'Inspecteur Contextuel
  const [activeInspectSectionId, setActiveInspectSectionId] = useState<string | null>(selectedSectionId || null);

  // Synchronisation lorsque selectedSectionId change de l'extérieur (ex: clic sur l'aperçu)
  useEffect(() => {
    if (selectedSectionId) {
      setActiveInspectSectionId(selectedSectionId);
    }
  }, [selectedSectionId]);

  // Modale d'ajout de section & Blueprints
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showBlueprintsModal, setShowBlueprintsModal] = useState<boolean>(false);
  const [showPresetsModal, setShowPresetsModal] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [addModalTab, setAddModalTab] = useState<'fundamental' | 'nanasore_original'>('fundamental');
  const [isHeaderSectionExpanded, setIsHeaderSectionExpanded] = useState<boolean>(false);
  const [isHeaderOptionsExpanded, setIsHeaderOptionsExpanded] = useState<boolean>(false);
  const [isFooterSectionExpanded, setIsFooterSectionExpanded] = useState<boolean>(false);
  const [isFooterOptionsExpanded, setIsFooterOptionsExpanded] = useState<boolean>(false);

  // États du Panneau Marketing, Pixels Publicitaires & Liens Directs (Prompt 2/3)
  const [isMarketingPanelExpanded, setIsMarketingPanelExpanded] = useState<boolean>(false);
  const [copiedLinkInfo, setCopiedLinkInfo] = useState<string | null>(null);
  const [marketingProductSearch, setMarketingProductSearch] = useState<string>('');

  // Gestion du Drag & Drop HTML5 natif
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Résolution du Mood actif
  const currentMood = resolveCustomThemeMood(safeConfig.customMood);

  // Enregistrement dans l'historique quand les sections changent
  const pushToHistory = useCallback((newSections: CustomSectionInstance[]) => {
    setHistoryStack(prev => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newSections];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Handler de mise à jour des sections avec historisation
  const updateSections = useCallback((nextSections: CustomSectionInstance[]) => {
    pushToHistory(nextSections);
    onChange({
      ...config,
      customSections: nextSections
    });
  }, [config, onChange, pushToHistory]);

  // Undo (Ctrl+Z)
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      playTapBeep();
      const targetIndex = historyIndex - 1;
      const targetSections = historyStack[targetIndex];
      setHistoryIndex(targetIndex);
      onChange({
        ...config,
        customSections: targetSections
      });
    }
  }, [historyIndex, historyStack, config, onChange]);

  // Redo (Ctrl+Y / Ctrl+Shift+Z)
  const handleRedo = useCallback(() => {
    if (historyIndex < historyStack.length - 1) {
      playTapBeep();
      const targetIndex = historyIndex + 1;
      const targetSections = historyStack[targetIndex];
      setHistoryIndex(targetIndex);
      onChange({
        ...config,
        customSections: targetSections
      });
    }
  }, [historyIndex, historyStack, config, onChange]);

  // 3 Presets d'Excellence par Défaut
  const defaultPresets: ThemeSavedPreset[] = useMemo(() => [
    {
      id: 'preset_standard_normale',
      name: 'Configuration Normale',
      createdAt: 'Officiel Nanasore',
      description: 'Bento Hero, Spotify Shelf, Flash Deal Vault, Mega-Hub Marketplace, Bento Map & Trust Footer.',
      headerStyle: 'mega_hub_marketplace',
      footerStyle: 'bento_map_trust_footer',
      config: {},
      sections: ARCHITECT_RECOMMENDED_SECTIONS
    },
    {
      id: 'preset_fetes_tabaski',
      name: 'Spécial Promo Tabaski / Fêtes',
      createdAt: 'Haute Conversion',
      description: 'Flash Deal Vault, Dynamic Island Glass, Pack Lab & Conversion Command Dock.',
      headerStyle: 'dynamic_island_glass',
      footerStyle: 'conversion_command_footer',
      config: {},
      sections: [
        {
          id: 'sec_tabaski_flash',
          type: 'flash_deal_vault',
          title: '⚡ Vente Flash Exclusive Fêtes & Tabaski',
          subtitle: 'Offre limitée jusqu\'à épuisement des stocks',
          visible: true,
          settings: { countdownHours: 24 }
        },
        {
          id: 'sec_tabaski_bento',
          type: 'bento_hero',
          title: 'Les Incontournables de la Célébration',
          subtitle: 'LIVRAISON GARANTIE SOUS 24H',
          visible: true,
          settings: { ctaText: 'Commander maintenant' }
        },
        {
          id: 'sec_tabaski_bundle',
          type: 'interactive_bundle_lab',
          title: '🧪 Composez Votre Pack & Économisez',
          subtitle: 'Cochez vos articles préférés pour -15% immédiats',
          visible: true,
          settings: { discountTier1: 15, discountTier2: 25 }
        }
      ]
    },
    {
      id: 'preset_live_mode',
      name: 'Mode Live Shopping & VIP',
      createdAt: 'Direct & Viral',
      description: 'Omni Live Studio, Stories Rings Viral, Mur WhatsApp & Editorial Prestige.',
      headerStyle: 'stories_rings_viral',
      footerStyle: 'editorial_prestige_footer',
      config: {},
      sections: [
        {
          id: 'sec_live_omni',
          type: 'omni_live_studio',
          title: '🔴 Studio Live & Coaching Direct',
          subtitle: 'Posez vos questions au vendeur et commandez en direct',
          visible: true,
          settings: { status: 'live' }
        },
        {
          id: 'sec_live_scratch',
          type: 'vip_mystery_scratch',
          title: '🎟️ Carte à Gratter Mystère Spécial Direct',
          subtitle: 'Découvrez votre cadeau exclusif réservé au live',
          visible: true,
          settings: {}
        },
        {
          id: 'sec_live_wall',
          type: 'social_wall_whatsapp',
          title: '💬 Retours & Preuves WhatsApp en Direct',
          subtitle: 'Ce que nos clients disent de nos produits',
          visible: true,
          settings: {}
        }
      ]
    }
  ], []);

  const activeSavedPresets = useMemo(() => {
    return (config.savedPresets && config.savedPresets.length > 0)
      ? config.savedPresets
      : defaultPresets;
  }, [config.savedPresets, defaultPresets]);

  const handleSaveCurrentPreset = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    playValidationBeep();
    const newPreset: ThemeSavedPreset = {
      id: `preset_${Date.now()}`,
      name: newPresetName.trim(),
      createdAt: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      headerStyle: config.headerStyle || 'mega_hub_marketplace',
      footerStyle: config.footerStyle || 'bento_map_trust_footer',
      config: {
        customMood: config.customMood
      },
      sections: currentSections,
      description: `${currentSections.length} modules • En-tête ${config.headerStyle || 'standard'} • Footer ${config.footerStyle || 'standard'}`
    };

    const nextPresets = [newPreset, ...(config.savedPresets || defaultPresets)];
    onChange({
      ...config,
      savedPresets: nextPresets
    });
    setNewPresetName('');
  }, [newPresetName, config, currentSections, defaultPresets, onChange]);

  const handleApplySavedPreset = useCallback((preset: SavedThemePreset | ThemeSavedPreset) => {
    playValidationBeep();
    const sourceSections = preset.sections || preset.configSnapshot?.customSections || [];
    const restoredSections = sourceSections.map((s, idx) => ({
      ...s,
      id: `sec_${s.type}_${Date.now()}_${idx}`
    }));

    updateSections(restoredSections);
    onChange({
      ...config,
      ...(preset.configSnapshot || {}),
      customSections: restoredSections,
      headerStyle: preset.headerStyle || preset.configSnapshot?.headerStyle || config.headerStyle,
      footerStyle: preset.footerStyle || preset.configSnapshot?.footerStyle || config.footerStyle,
      customMood: preset.configSnapshot?.customMood || preset.config?.customMood || config.customMood
    });
    setShowPresetsModal(false);
  }, [config, onChange, updateSections]);

  const handleDeleteSavedPreset = useCallback((presetId: string) => {
    playTapBeep();
    const updated = activeSavedPresets.filter(p => p.id !== presetId);
    onChange({
      ...config,
      savedPresets: updated
    });
  }, [activeSavedPresets, config, onChange]);
  // Écouteur clavier pour Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  if (!isOpen) return null;

  // Résolution de la section en cours d'inspection
  const inspectedSection = useMemo(() => {
    if (!activeInspectSectionId) return null;
    return currentSections.find(s => s.id === activeInspectSectionId) || null;
  }, [activeInspectSectionId, currentSections]);

  // Actions sur les sections
  const handleInspectSection = (id: string) => {
    playTapBeep();
    setActiveInspectSectionId(id);
    onSelectSection?.(id);
    // Scroll automatique vers la section dans l'aperçu
    const element = document.getElementById(`section-${id}`) || document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleCloseInspector = () => {
    playTapBeep();
    setActiveInspectSectionId(null);
    onSelectSection?.(null);
  };

  const handleSelectSection = (id: string) => {
    handleInspectSection(id);
  };

  const handleLoadBlueprint = (bp: ArchitectBlueprint) => {
    playValidationBeep();

    // 🛡️ Filet de Sécurité Automatique avant d'écraser la vitrine par un Blueprint (1-Clic)
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const safetyPreset: SavedThemePreset = {
      id: `safety_bp_${Date.now()}`,
      name: `🛡️ Sauvegarde auto avant Blueprint (${timeStr})`,
      savedAt: Date.now(),
      createdAt: timeStr,
      sectionsCount: currentSections.length,
      configSnapshot: { ...config },
      config: { customMood: config.customMood },
      sections: [...currentSections],
      headerStyle: config.headerStyle,
      footerStyle: config.footerStyle,
      description: `Sauvegarde de secours automatique avant application du Blueprint "${bp.name}".`
    };

    const nextPresets = [safetyPreset, ...(config.savedPresets || defaultPresets)];

    // Déclencher le Toast de sécurité avec action d'annulation immédiate
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nana:blueprint_safety_toast', {
        detail: {
          message: `🛡️ Sauvegarde auto avant Blueprint (${timeStr}) créée !`,
          previousConfig: { ...config }
        }
      }));
    }

    const nextMood = THEME_MOOD_PRESETS[bp.moodPreset];
    const freshSections = bp.sections.map((s, idx) => ({
      ...s,
      id: `sec_${s.type}_${Date.now()}_${idx}`
    }));
    updateSections(freshSections);
    onChange({
      ...config,
      savedPresets: nextPresets,
      customSections: freshSections,
      customMood: nextMood,
      headerStyle: bp.headerStyle || config.headerStyle || 'mega_hub_marketplace',
      footerStyle: (bp as any).footerStyle || config.footerStyle || 'bento_map_trust_footer'
    });
    setShowBlueprintsModal(false);
  };

  const handleAddModule = (mod: ModuleDefinition) => {
    playValidationBeep();
    const newInstance: CustomSectionInstance = {
      id: `sec_${mod.type}_${Date.now()}`,
      type: mod.type,
      title: mod.defaultTitle,
      subtitle: mod.defaultSubtitle,
      visible: true,
      spacingTop: 'md',
      spacingBottom: 'md',
      backgroundStyle: 'default',
      settings: { ...mod.defaultSettings }
    };

    const nextSections = [...currentSections, newInstance];
    updateSections(nextSections);
    setShowAddModal(false);
    handleSelectSection(newInstance.id);
  };

  const handleDuplicateSection = (index: number) => {
    playValidationBeep();
    const target = currentSections[index];
    const clone: CustomSectionInstance = {
      ...target,
      id: `sec_${target.type}_${Date.now()}`,
      title: `${target.title} (Copie)`,
      settings: { ...(target.settings || {}) }
    };
    const nextSections = [...currentSections];
    nextSections.splice(index + 1, 0, clone);
    updateSections(nextSections);
    handleSelectSection(clone.id);
  };

  const handleDeleteSection = (index: number) => {
    playTapBeep();
    const nextSections = currentSections.filter((_, i) => i !== index);
    updateSections(nextSections);
    if (selectedSectionId === currentSections[index]?.id) {
      onSelectSection?.(null);
    }
  };

  const handleToggleVisibility = (index: number) => {
    playTapBeep();
    const nextSections = currentSections.map((sec, i) => {
      if (i === index) {
        return { ...sec, visible: !sec.visible };
      }
      return sec;
    });
    updateSections(nextSections);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    playTapBeep();
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentSections.length) return;
    const nextSections = [...currentSections];
    const [item] = nextSections.splice(index, 1);
    nextSections.splice(targetIdx, 0, item);
    updateSections(nextSections);
  };

  // Drag & Drop HTML5 Handlers (Sécurisé pour mobiles et tactiles)
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    if (e?.dataTransfer) {
      try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      } catch {}
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (e?.dataTransfer) {
      try {
        e.dataTransfer.dropEffect = 'move';
      } catch {}
    }
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    playValidationBeep();
    const nextSections = [...currentSections];
    const [moved] = nextSections.splice(draggedIndex, 1);
    nextSections.splice(targetIndex, 0, moved);
    updateSections(nextSections);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Sélecteur de Mood & Tokens
  const handleSelectMoodPreset = (presetId: CustomThemeMoodPreset) => {
    playTapBeep();
    const nextMood = THEME_MOOD_PRESETS[presetId];
    onChange({
      ...config,
      customMood: nextMood
    });
  };

  const handleSelectButtonRadius = (radius: 'none' | 'md' | 'xl' | 'full') => {
    playTapBeep();
    onChange({
      ...config,
      customMood: {
        ...currentMood,
        buttonRadius: radius
      }
    });
  };

  // Handlers Marketing, Pixels & Partage Viral (Prompt 2/3)
  const handleCopyMarketingLink = useCallback((url: string, key: string) => {
    playTapBeep();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLinkInfo(key);
      setTimeout(() => setCopiedLinkInfo(null), 2500);
    }
  }, []);

  const handleDownloadProductQrCode = useCallback((prod: StoreProductItem) => {
    playValidationBeep();
    const prodSlug = prod.slug || prod.productSlug || prod.id;
    const targetUrl = `https://nsore.shop/s/${storeSlug || 'boutique'}?product=${encodeURIComponent(prodSlug)}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(targetUrl)}&format=png`;

    if (typeof window !== 'undefined') {
      fetch(qrImageUrl)
        .then(res => res.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `qrcode-${prodSlug}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        })
        .catch(() => {
          window.open(qrImageUrl, '_blank');
        });
    }
  }, [storeSlug]);

  const filteredMarketingProducts = useMemo(() => {
    if (!marketingProductSearch.trim()) return products;
    const q = marketingProductSearch.toLowerCase().trim();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, marketingProductSearch]);

  const pixelsAreActive = useMemo(() => {
    return arePixelsConfigured(config);
  }, [config]);

  // Si un module est sélectionné pour édition -> Afficher l'Inspecteur Contextuel
  if (inspectedSection) {
    return (
      <aside 
        className="w-full md:w-[380px] lg:w-[410px] shrink-0 h-[calc(100vh-64px)] bg-slate-950 text-white border-r border-slate-800/80 flex flex-col shadow-2xl z-40 select-none animate-in slide-in-from-left duration-200"
        aria-label="Nanasore Architect OS - Section Inspector"
      >
        <CustomSectionInspector
          section={inspectedSection}
          onUpdateSection={(updated) => {
            const nextSections = currentSections.map(s => s.id === updated.id ? updated : s);
            updateSections(nextSections);
          }}
          onClose={handleCloseInspector}
          onDeleteSection={() => {
            const idx = currentSections.findIndex(s => s.id === inspectedSection.id);
            if (idx !== -1) {
              handleDeleteSection(idx);
              handleCloseInspector();
            }
          }}
          onDuplicateSection={() => {
            const idx = currentSections.findIndex(s => s.id === inspectedSection.id);
            if (idx !== -1) {
              handleDuplicateSection(idx);
            }
          }}
          products={products}
          categories={categories}
        />
      </aside>
    );
  }

  return (
    <aside 
      className="w-full md:w-[380px] lg:w-[410px] shrink-0 h-[calc(100vh-64px)] bg-slate-950 text-white border-r border-slate-800/80 flex flex-col shadow-2xl z-40 select-none animate-in slide-in-from-left duration-200"
      aria-label="Nanasore Architect OS - Layer Tree"
    >
      {/* 1. Barre Supérieure d'Outils Architecte */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                Architecte OS
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-600 text-white">
                  5A • D&D
                </span>
              </h2>
              <p className="text-[10px] text-slate-400">
                Arborescence & Design Tokens en temps réel
              </p>
            </div>
          </div>

          {/* Outils Undo / Redo & Fermeture */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={historyIndex <= 0}
              onClick={handleUndo}
              title="Annuler (Ctrl+Z)"
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                historyIndex > 0
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800 active:scale-90'
                  : 'text-slate-600 cursor-not-allowed opacity-40'
              }`}
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={historyIndex >= historyStack.length - 1}
              onClick={handleRedo}
              title="Rétablir (Ctrl+Y)"
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                historyIndex < historyStack.length - 1
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800 active:scale-90'
                  : 'text-slate-600 cursor-not-allowed opacity-40'
              }`}
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onClose();
              }}
              title="Masquer le panneau"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Sélecteur rapide de "Mood & Design System" (5 Pastilles + Boutons) */}
        <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Palette className="w-3 h-3 text-blue-400" />
              Ambiance & Design Tokens
            </span>
            <span className="text-[10px] font-black text-blue-400 capitalize">
              {currentMood.presetId.replace('-', ' ')}
            </span>
          </div>

          {/* 5 Pastilles de Mood */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            {[
              { id: 'nanasore-royal' as CustomThemeMoodPreset, name: 'Bleu Nanasore', dot: '#2563EB', ring: 'ring-blue-500' },
              { id: 'spotify-obsidian' as CustomThemeMoodPreset, name: 'Spotify Obsidian', dot: '#1DB954', ring: 'ring-emerald-500' },
              { id: 'hermes-sand' as CustomThemeMoodPreset, name: 'Sable Hermes', dot: '#C25E00', ring: 'ring-amber-500' },
              { id: 'emerald-botanic' as CustomThemeMoodPreset, name: 'Émeraude Botanique', dot: '#10B981', ring: 'ring-emerald-400' },
              { id: 'cyber-neon' as CustomThemeMoodPreset, name: 'Cyber Neon', dot: '#06B6D4', ring: 'ring-cyan-500' }
            ].map((p) => {
              const isSelected = currentMood.presetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectMoodPreset(p.id)}
                  title={p.name}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? `ring-2 ${p.ring} scale-110 shadow-lg`
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: p.dot }}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              );
            })}
          </div>

          {/* Arrondi des Boutons */}
          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-1 text-[10px]">
            <span className="text-slate-400 font-medium">Arrondi boutons :</span>
            <div className="flex items-center gap-1">
              {[
                { id: 'none' as const, label: 'Carré' },
                { id: 'md' as const, label: 'Doux' },
                { id: 'xl' as const, label: 'Moderne' },
                { id: 'full' as const, label: 'Pilule' }
              ].map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectButtonRadius(r.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    currentMood.buttonRadius === r.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 Bouton 1-Clic Blueprints Pré-Assemblés */}
      <div className="px-3 pt-3 pb-0 bg-slate-900/40">
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            setShowBlueprintsModal(true);
          }}
          className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 hover:from-blue-900/80 hover:to-indigo-900/80 text-blue-200 font-bold text-xs border border-blue-500/40 flex items-center justify-between transition cursor-pointer active:scale-98 shadow-sm group"
        >
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-white">⚡ 4 Blueprints en 1 Clic</span>
          </span>
          <span className="text-[10px] text-blue-300 font-bold bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-600/40">
            Charger →
          </span>
        </button>
      </div>

      {/* 2.6 Bouton 💾 Mes Presets de Boutique (Snapshots) */}
      <div className="px-3 pt-2 pb-0 bg-slate-900/40">
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            setShowPresetsModal(true);
          }}
          className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-200 font-bold text-xs border border-blue-500/30 flex items-center justify-between transition cursor-pointer active:scale-98 shadow-sm group"
        >
          <span className="flex items-center gap-1.5">
            <span className="text-sm">💾</span>
            <span className="text-white">Mes Presets &amp; Snapshots</span>
          </span>
          <span className="text-[10px] text-blue-300 font-bold bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-600/40">
            {activeSavedPresets.length} sauvegardés →
          </span>
        </button>
      </div>

      {/* 2.7 Bouton Rapide : 🚀 Marketing, Pixels & Liens Publicitaires (Prompt 2/3) */}
      <div className="px-3 pt-2 pb-0 bg-slate-900/40">
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            setIsMarketingPanelExpanded(prev => !prev);
          }}
          className={`w-full py-2.5 px-3.5 rounded-xl border flex items-center justify-between transition cursor-pointer active:scale-98 shadow-sm group ${
            isMarketingPanelExpanded
              ? 'bg-blue-600 text-white border-blue-400 shadow-blue-600/30'
              : 'bg-slate-900 hover:bg-slate-800 text-blue-200 border-blue-500/30'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="text-sm">🚀</span>
            <span className={isMarketingPanelExpanded ? 'text-white font-extrabold text-xs' : 'text-white text-xs'}>
              Marketing, Pixels &amp; Liens Pub
            </span>
          </span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${
            pixelsAreActive
              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
              : 'bg-slate-950 text-slate-400 border-slate-700'
          }`}>
            <span>{pixelsAreActive ? '🟢 Actifs' : '⚪ Configurer'}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isMarketingPanelExpanded ? 'rotate-180' : ''}`} />
          </span>
        </button>
      </div>

      {/* 3. Bouton Principal : + Ajouter un Module */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/40">
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            setShowAddModal(true);
          }}
          className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer transition active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Ajouter un Module à ma Boutique</span>
        </button>
      </div>

      {/* 4. Arborescence des Sections en Glisser-Déposer (Drag & Drop natif HTML5) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* ========================================================================= */}
        {/* 🚀 PANNEAU MARKETING, PIXELS PUBLICITAIRES & LIENS DIRECTS (PROMPT 2/3) */}
        {/* ========================================================================= */}
        {isMarketingPanelExpanded && (
          <div className="rounded-2xl border-2 border-blue-500 bg-white text-slate-900 p-4 shadow-2xl mb-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Header du Panneau */}
            <div className="flex items-center justify-between pb-3 border-b border-blue-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm shadow-md shadow-blue-600/20">
                  🎯
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-950 tracking-wider">
                    Hub Marketing &amp; Pixels Pub
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Meta Pixel, TikTok Pixel &amp; Liens Directs Vues Larges
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMarketingPanelExpanded(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. INDICATEUR D'ÉTAT DYNAMIQUE */}
            {pixelsAreActive ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0 shadow-sm" />
                <span>🟢 Pixels actifs sur vos Grilles, Vues Larges, Tunnels &amp; Boutons WhatsApp.</span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-blue-900 text-[11px] font-medium flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                <span>⚪ Pixels inactifs — Renseignez vos IDs pour tracker vos pubs Facebook Ads &amp; TikTok Ads en temps réel.</span>
              </div>
            )}

            {/* 2. FORMULAIRE DE SAISIE DES PIXELS EN 1 CLIC */}
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider block">
                ⚙️ Configuration des Identifiants Pixels
              </span>

              {/* Champ Meta / Facebook Pixel */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
                  <span>ID Pixel Facebook / Meta :</span>
                  <span className="text-[10px] font-semibold text-blue-600 font-mono">fbq</span>
                </label>
                <input
                  type="text"
                  value={config.metaPixelId || ''}
                  placeholder="Ex: 1234567890123456"
                  onChange={(e) => {
                    onChange({
                      ...config,
                      metaPixelId: e.target.value.trim()
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition shadow-2xs"
                />
              </div>

              {/* Champ TikTok Pixel */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
                  <span>ID Pixel TikTok :</span>
                  <span className="text-[10px] font-semibold text-pink-600 font-mono">ttq</span>
                </label>
                <input
                  type="text"
                  value={config.tiktokPixelId || ''}
                  placeholder="Ex: C9ABCDE1234567890"
                  onChange={(e) => {
                    onChange({
                      ...config,
                      tiktokPixelId: e.target.value.trim()
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition shadow-2xs"
                />
              </div>

              {/* Champ Google Tag / GA4 (Optionnel) */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
                  <span>ID Google Tag / GA4 (Optionnel) :</span>
                  <span className="text-[10px] font-semibold text-amber-600 font-mono">gtag</span>
                </label>
                <input
                  type="text"
                  value={config.googleTagId || ''}
                  placeholder="Ex: G-XXXXXXXXXX ou AW-XXXXXXXXX"
                  onChange={(e) => {
                    onChange({
                      ...config,
                      googleTagId: e.target.value.trim()
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition shadow-2xs"
                />
              </div>
            </div>

            {/* 3. GÉNÉRATEUR DE LIENS DIRECTS "PORTE OUVERTE" & QR CODES */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    🔗 Liens Directs "Porte Ouverte" Publicités
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Atterrissage direct sans clic intermédiaire pour vos campagnes Facebook Ads &amp; TikTok Ads
                  </p>
                </div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {filteredMarketingProducts.length} articles
                </span>
              </div>

              {/* Barre de recherche si plus de 2 produits */}
              {products.length > 2 && (
                <input
                  type="text"
                  value={marketingProductSearch}
                  placeholder="🔍 Filtrer les produits..."
                  onChange={(e) => setMarketingProductSearch(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              )}

              {/* Liste des produits avec les 3 boutons */}
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {filteredMarketingProducts.map((prod) => {
                  const prodSlug = prod.slug || prod.productSlug || prod.id;
                  const wideUrl = `https://nsore.shop/s/${storeSlug}?product=${encodeURIComponent(prodSlug)}`;
                  const funnelUrl = `https://nsore.shop/s/${storeSlug}?funnel=${encodeURIComponent(prod.linkedFunnelId || prod.id)}`;
                  const wideKey = `wide_${prod.id}`;
                  const funnelKey = `funnel_${prod.id}`;

                  return (
                    <div 
                      key={prod.id}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/40 border border-slate-200 transition-colors space-y-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={prod.image || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200'}
                          alt={prod.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 truncate">
                            {prod.name}
                          </h5>
                          <span className="text-[11px] font-extrabold text-blue-600">
                            {prod.price?.toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                      </div>

                      {/* Les 3 Boutons d'Action Clairs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1">
                        {/* Bouton 1 : 🔗 Copier Lien Vue Large Shopify */}
                        <button
                          type="button"
                          onClick={() => handleCopyMarketingLink(wideUrl, wideKey)}
                          title="Lien direct vers la Grande Vue Produit ouverte (parfait pour Facebook/TikTok Ads)"
                          className={`py-1.5 px-2 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                            copiedLinkInfo === wideKey
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                          }`}
                        >
                          {copiedLinkInfo === wideKey ? (
                            <>
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>✓ Copié !</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3 h-3" />
                              <span>🔗 Vue Large Pub</span>
                            </>
                          )}
                        </button>

                        {/* Bouton 2 : ⚡ Copier Lien Tunnel Direct */}
                        <button
                          type="button"
                          onClick={() => handleCopyMarketingLink(funnelUrl, funnelKey)}
                          title="Lien direct ouvrant le tiroir tunnel d'achat instantané"
                          className={`py-1.5 px-2 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                            copiedLinkInfo === funnelKey
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                          }`}
                        >
                          {copiedLinkInfo === funnelKey ? (
                            <>
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>✓ Copié !</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3" />
                              <span>⚡ Lien Tunnel</span>
                            </>
                          )}
                        </button>

                        {/* Bouton 3 : 📱 Télécharger le QR Code du Produit */}
                        <button
                          type="button"
                          onClick={() => handleDownloadProductQrCode(prod)}
                          title="Télécharger le QR Code haute définition de ce produit (affiche boutique, flyer)"
                          className="py-1.5 px-2 rounded-lg font-bold text-[10px] bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <QrCode className="w-3 h-3 text-blue-600" />
                          <span>📱 QR Code</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* BLOC SPÉCIAL ÉPINGLÉ : 👑 EN-TÊTE DE LA BOUTIQUE (HEADER) */}
        <div className="rounded-2xl border-2 border-blue-500/70 bg-gradient-to-b from-blue-950/40 to-slate-900/90 p-3 shadow-lg shadow-blue-950/50 mb-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">👑</span>
              <div>
                <span className="text-xs font-black text-white tracking-wide block">
                  En-Tête de la Boutique (Header)
                </span>
                <span className="text-[10px] text-blue-400 font-bold">
                  {HEADER_STYLES_LIST.find(h => h.id === (config.headerStyle || 'mega_hub_marketplace'))?.title}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm">
              ÉPINGLÉ
            </span>
          </div>

          {/* Boutons d'actions Header : Changer de Style & Personnaliser */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsHeaderSectionExpanded(!isHeaderSectionExpanded);
                if (isHeaderOptionsExpanded) setIsHeaderOptionsExpanded(false);
              }}
              className="py-1.5 px-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-between transition cursor-pointer"
            >
              <span className="truncate">🎨 Style ({HEADER_STYLES_LIST.length})</span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isHeaderSectionExpanded ? 'rotate-180 text-blue-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsHeaderOptionsExpanded(!isHeaderOptionsExpanded);
                if (isHeaderSectionExpanded) setIsHeaderSectionExpanded(false);
              }}
              className="py-1.5 px-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-between transition cursor-pointer"
            >
              <span className="truncate">⚙️ Options</span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isHeaderOptionsExpanded ? 'rotate-180 text-blue-400' : ''}`} />
            </button>
          </div>

          {/* 1. Grille des 6 styles d'en-têtes */}
          {isHeaderSectionExpanded && (
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800 animate-in fade-in duration-150">
              {HEADER_STYLES_LIST.map((hs) => {
                const isActive = (config.headerStyle || 'mega_hub_marketplace') === hs.id;
                return (
                  <button
                    key={hs.id}
                    type="button"
                    onClick={() => {
                      playValidationBeep();
                      onChange({
                        ...config,
                        headerStyle: hs.id
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      isActive
                        ? 'bg-blue-600/40 border-blue-500 shadow-sm ring-1 ring-blue-400 text-white'
                        : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 w-full">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{hs.icon}</span>
                          <span className="text-xs font-bold truncate">{hs.title}</span>
                        </div>
                        {isActive && (
                          <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 mt-1 block">
                        {hs.badge}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1 leading-tight line-clamp-2">
                        {hs.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. Panneau de personnalisation du Header (Texte Annonce, Mega-Menu, Couleurs d'Accent) */}
          {isHeaderOptionsExpanded && (
            <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-3 animate-in fade-in duration-150 text-xs">
              
              {/* Texte de la Barre d'Annonce Supérieure */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  📢 Texte Barre d'Annonce Supérieure :
                </label>
                <input
                  type="text"
                  value={config.headerSettings?.announcementText ?? config.announcementBarText ?? '✨ Livraison rapide sur toutes vos commandes • Paiement sécurisé'}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({
                      ...config,
                      announcementBarText: val,
                      headerSettings: {
                        ...(config.headerSettings || {}),
                        announcementText: val
                      }
                    });
                  }}
                  placeholder="✨ Livraison offerte dès 15 000 FCFA..."
                  className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Commutateur Affichage Mega-Menu */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-300">
                  Afficher le Mega-Menu Déroulant
                </span>
                <input
                  type="checkbox"
                  checked={config.headerSettings?.showMegaMenu !== false}
                  onChange={(e) => {
                    playTapBeep();
                    onChange({
                      ...config,
                      headerSettings: {
                        ...(config.headerSettings || {}),
                        showMegaMenu: e.target.checked
                      }
                    });
                  }}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Palette Couleurs d'Accent de l'En-Tête */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  🎨 Couleur d'Accent de l'En-Tête :
                </span>
                <div className="flex items-center gap-2">
                  {[
                    { id: '#2563EB', name: 'Bleu Royal Nanasore (Officiel)', dot: '#2563EB', ring: 'ring-blue-400' },
                    { id: '#FFFFFF', name: 'Blanc Pur & Perle', dot: '#FFFFFF', ring: 'ring-slate-300' },
                    { id: '#0F172A', name: 'Anthracite Luxe', dot: '#0F172A', ring: 'ring-slate-500' },
                    { id: '#10B981', name: 'Émeraude Botanique', dot: '#10B981', ring: 'ring-emerald-400' },
                    { id: '#D97706', name: 'Or Prestige', dot: '#D97706', ring: 'ring-amber-400' }
                  ].map((c) => {
                    const isSelected = (config.headerSettings?.accentColor || '#2563EB') === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          onChange({
                            ...config,
                            headerSettings: {
                              ...(config.headerSettings || {}),
                              accentColor: c.id
                            }
                          });
                        }}
                        title={c.name}
                        className={`w-6 h-6 rounded-full border border-slate-600 flex items-center justify-center transition-all cursor-pointer ${
                          isSelected ? `ring-2 ${c.ring} scale-110 shadow-md` : 'opacity-80 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.dot }}
                      >
                        {isSelected && (
                          <Check className={`w-3 h-3 stroke-[3] ${c.id === '#FFFFFF' ? 'text-slate-900' : 'text-white'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contrôles spécifiques au Header Stories Rings Viral */}
              {(config.headerStyle === 'stories_rings_viral' || !config.headerStyle) && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                  <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1">
                    <span>📱 Stories Rings Viral :</span>
                  </span>

                  {/* Titre du Rail de Stories */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">
                      Titre du Rail d'Anneaux :
                    </label>
                    <input
                      type="text"
                      value={config.headerSettings?.storiesRailTitle ?? '🔥 Stories & Offres Flash'}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChange({
                          ...config,
                          headerSettings: {
                            ...(config.headerSettings || {}),
                            storiesRailTitle: val
                          }
                        });
                      }}
                      placeholder="🔥 Stories & Offres Flash..."
                      className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Filtre des Stories : Tous vs Promo Seule */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">
                      Produits dans les Stories :
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'all', label: 'Tout le Catalogue' },
                        { id: 'promo_only', label: '🔥 Promos Seules' }
                      ].map((f) => {
                        const isSelected = (config.headerSettings?.storiesFilter || 'all') === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              onChange({
                                ...config,
                                headerSettings: {
                                  ...(config.headerSettings || {}),
                                  storiesFilter: f.id
                                }
                              });
                            }}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer text-center ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-900 text-slate-400 hover:text-white'
                            }`}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Contrôles spécifiques au Header Dynamic Island Glass */}
              {config.headerStyle === 'dynamic_island_glass' && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                  <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1">
                    <span>🏝️ Dynamic Island Glass :</span>
                  </span>

                  {/* Commutateur Micro-Notifications Toast */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div>
                      <span className="text-[11px] font-bold text-slate-300 block">
                        Micro-Notifications Live
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        Pulsations de forte demande & stock (20s)
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.headerSettings?.enableDynamicToasts !== false}
                      onChange={(e) => {
                        playTapBeep();
                        onChange({
                          ...config,
                          headerSettings: {
                            ...(config.headerSettings || {}),
                            enableDynamicToasts: e.target.checked
                          }
                        });
                      }}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Contrôles spécifiques au Header Live Radar & Vocal Concierge */}
              {config.headerStyle === 'live_radar_vocal' && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                  <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1">
                    <span>🎙️ Live Radar &amp; Vocal Concierge :</span>
                  </span>

                  {/* Message Vocal d'Accueil Lu par l'IA */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">
                      Texte lu par la voix IA de bienvenue :
                    </label>
                    <textarea
                      rows={2}
                      value={config.headerSettings?.welcomeSpeechText ?? ''}
                      placeholder={`Bienvenue sur ${config.storeName || 'notre boutique'} ! Découvrez nos meilleures offres...`}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChange({
                          ...config,
                          headerSettings: {
                            ...(config.headerSettings || {}),
                            welcomeSpeechText: val
                          }
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium resize-none"
                    />
                  </div>

                  {/* URL Audio Personnalisé (MP3) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">
                      Fichier Audio Personnalisé (URL MP3 facultative) :
                    </label>
                    <input
                      type="url"
                      value={config.headerSettings?.welcomeAudioUrl ?? ''}
                      placeholder="https://.../mot-de-bienvenue.mp3"
                      onChange={(e) => {
                        const val = e.target.value;
                        onChange({
                          ...config,
                          headerSettings: {
                            ...(config.headerSettings || {}),
                            welcomeAudioUrl: val
                          }
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  {/* Flux Live Stream ou Replay Video URL */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">
                      Lien Vidéo Live / Webinaire (YouTube, HLS ou MP4) :
                    </label>
                    <input
                      type="url"
                      value={config.headerSettings?.liveStreamVideoUrl ?? ''}
                      placeholder="https://youtube.com/live/... ou vidéo"
                      onChange={(e) => {
                        const val = e.target.value;
                        onChange({
                          ...config,
                          headerSettings: {
                            ...(config.headerSettings || {}),
                            liveStreamVideoUrl: val
                          }
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  {/* Bascule Session Live Actif */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div>
                      <span className="text-[11px] font-bold text-slate-300 block">
                        Session en Direct Active
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        Affiche le badge clignotant &quot;EN DIRECT&quot;
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(config.headerSettings?.isLiveActive)}
                      onChange={(e) => {
                        playTapBeep();
                        onChange({
                          ...config,
                          headerSettings: {
                            ...(config.headerSettings || {}),
                            isLiveActive: e.target.checked
                          }
                        });
                      }}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1 py-1">
          <span className="uppercase tracking-wider">
            Sections sur la page ({currentSections.length})
          </span>
          <span className="text-[10px] text-blue-400 font-mono">
            Glisser-Déposer ⠿
          </span>
        </div>

        {currentSections.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-800 space-y-3">
            <span className="text-3xl block">🎨</span>
            <p className="text-xs font-bold text-slate-300">
              Aucun module sur votre page
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Cliquez sur le bouton ci-dessus pour composer votre boutique sur-mesure !
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {currentSections.map((sec, idx) => {
              const meta = ARCHITECT_MODULES.find(m => m.type === sec.type);
              const isSelected = selectedSectionId === sec.id;
              const isOver = dragOverIndex === idx;

              return (
                <div
                  key={sec.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleSelectSection(sec.id)}
                  className={`group relative rounded-xl border p-2.5 transition-all duration-150 flex items-center justify-between gap-2.5 cursor-pointer ${
                    isOver ? 'border-t-2 border-t-blue-500 scale-[1.01]' : ''
                  } ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                      : sec.visible
                        ? 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/60 border-slate-850 opacity-50'
                  }`}
                >
                  {/* Poignée Drag Handle */}
                  <div 
                    className="p-1 text-slate-500 hover:text-white cursor-grab active:cursor-grabbing shrink-0"
                    title="Maintenir et glisser pour réordonner"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Détails du Module */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base shrink-0">{meta?.icon || '📦'}</span>
                      <h4 className="text-xs font-black text-white truncate">
                        {sec.title || meta?.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                      <span className="font-mono text-blue-400">#{idx + 1}</span>
                      <span>•</span>
                      <span className="truncate">{meta?.badge || sec.type}</span>
                    </div>
                  </div>

                  {/* Actions Rapides sur la Ligne */}
                  <div 
                    className="flex items-center gap-0.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSection(idx, 'up')}
                      title="Monter"
                      className={`p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition ${
                        idx === 0 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={idx === currentSections.length - 1}
                      onClick={() => handleMoveSection(idx, 'down')}
                      title="Descendre"
                      className={`p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition ${
                        idx === currentSections.length - 1 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicateSection(idx)}
                      title="Dupliquer ce bloc"
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInspectSection(sec.id)}
                      title="Personnaliser ce bloc (Inspecteur)"
                      className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-blue-950/40 transition cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(idx)}
                      title={sec.visible ? "Masquer ce bloc" : "Afficher ce bloc"}
                      className={`p-1 rounded transition cursor-pointer ${
                        sec.visible
                          ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                          : 'text-amber-400 bg-amber-950/40 hover:bg-amber-900/50'
                      }`}
                    >
                      {sec.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSection(idx)}
                      title="Supprimer ce bloc"
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BLOC SPÉCIAL ÉPINGLÉ : ⚓ PIED DE PAGE DE LA BOUTIQUE (FOOTER - 3 MODÈLES PREMIUM) */}
        <div className="rounded-2xl border-2 border-blue-500/70 bg-gradient-to-b from-blue-950/40 to-slate-900/90 p-3 shadow-lg shadow-blue-950/50 mt-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">⚓</span>
              <div>
                <span className="text-xs font-black text-white tracking-wide block">
                  Pied de Page de la Boutique (Footer)
                </span>
                <span className="text-[10px] text-blue-400 font-bold">
                  {FOOTER_STYLES_LIST.find(f => f.id === (config.footerStyle || 'bento_map_trust_footer'))?.title}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm">
              ÉPINGLÉ
            </span>
          </div>

          {/* Boutons d'actions Footer : Changer de Style & Personnaliser */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsFooterSectionExpanded(!isFooterSectionExpanded);
                if (isFooterOptionsExpanded) setIsFooterOptionsExpanded(false);
              }}
              className="py-1.5 px-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-between transition cursor-pointer"
            >
              <span className="truncate">🎨 Style ({FOOTER_STYLES_LIST.length})</span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isFooterSectionExpanded ? 'rotate-180 text-blue-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsFooterOptionsExpanded(!isFooterOptionsExpanded);
                if (isFooterSectionExpanded) setIsFooterSectionExpanded(false);
              }}
              className="py-1.5 px-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-between transition cursor-pointer"
            >
              <span className="truncate">⚙️ Options</span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isFooterOptionsExpanded ? 'rotate-180 text-blue-400' : ''}`} />
            </button>
          </div>

          {/* 1. Grille des 3 styles de pied de page */}
          {isFooterSectionExpanded && (
            <div className="mt-2.5 grid grid-cols-1 gap-2 pt-2 border-t border-slate-800 animate-in fade-in duration-150">
              {FOOTER_STYLES_LIST.map((fs) => {
                const isActive = (config.footerStyle || 'bento_map_trust_footer') === fs.id;
                return (
                  <button
                    key={fs.id}
                    type="button"
                    onClick={() => {
                      playValidationBeep();
                      onChange({
                        ...config,
                        footerStyle: fs.id
                      });
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('nana_change_footer_style', { detail: { style: fs.id } }));
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      isActive
                        ? 'bg-blue-600/40 border-blue-500 shadow-sm ring-1 ring-blue-400 text-white'
                        : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 w-full">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{fs.icon}</span>
                          <span className="text-xs font-bold truncate">{fs.title}</span>
                        </div>
                        {isActive && (
                          <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                          {fs.badge}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-400 line-clamp-2 leading-tight">
                        {fs.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. Tiroir d'Options Avancées du Footer (Carte GPS & Newsletter) */}
          {isFooterOptionsExpanded && (
            <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-3 animate-in fade-in duration-150">
              <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1">
                <span>📍</span>
                <span>Localisation & Mini-Map</span>
              </span>

              {/* Ville de la boutique */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Ville & Pays affichés :
                </label>
                <input
                  type="text"
                  value={config.footerMapCity || ''}
                  placeholder="Bobo-Dioulasso, Burkina Faso"
                  onChange={(e) => {
                    onChange({
                      ...config,
                      footerMapCity: e.target.value
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Adresse physique */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Adresse physique :
                </label>
                <input
                  type="text"
                  value={config.footerAddress || ''}
                  placeholder="Avenue de la Nation, Secteur 1"
                  onChange={(e) => {
                    onChange({
                      ...config,
                      footerAddress: e.target.value
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Coordonnées GPS */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Coordonnées GPS (latitude, longitude) :
                </label>
                <input
                  type="text"
                  value={config.footerMapCoordinates || ''}
                  placeholder="11.1771, -4.2979"
                  onChange={(e) => {
                    onChange({
                      ...config,
                      footerMapCoordinates: e.target.value
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  Ex: Bobo: 11.1771, -4.2979 | Ouaga: 12.3714, -1.5197 | Abidjan: 5.3600, -4.0083
                </span>
              </div>

              <div className="pt-2 border-t border-slate-850">
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1 mb-2">
                  <span>📧</span>
                  <span>Bannière E-mailing VIP</span>
                </span>

                {/* Titre Newsletter */}
                <div className="mb-2">
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Titre de la Newsletter :
                  </label>
                  <input
                    type="text"
                    value={config.footerNewsletterTitle || ''}
                    placeholder="Rejoignez le Cercle Privé VIP"
                    onChange={(e) => {
                      onChange({
                        ...config,
                        footerNewsletterTitle: e.target.value
                      });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Sous-titre Newsletter */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Sous-titre / Promesse :
                  </label>
                  <input
                    type="text"
                    value={config.footerNewsletterSubtitle || ''}
                    placeholder="-15% immédiats avec le code secret VIP15 dès votre inscription"
                    onChange={(e) => {
                      onChange({
                        ...config,
                        footerNewsletterSubtitle: e.target.value
                      });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Texte À Propos du Footer */}
              <div className="pt-2 border-t border-slate-850">
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1 mb-2">
                  <span>📝</span>
                  <span>Texte À Propos & Présentation</span>
                </span>
                <textarea
                  rows={2}
                  value={config.footerAboutText || ''}
                  placeholder="Boutique officielle certifiée Nanasore. Produits 100% authentiques..."
                  onChange={(e) => {
                    onChange({
                      ...config,
                      footerAboutText: e.target.value
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Liens Réseaux Sociaux */}
              <div className="pt-2 border-t border-slate-850 space-y-2">
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1 mb-1">
                  <span>📱</span>
                  <span>Réseaux Sociaux du Vendeur</span>
                </span>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">WhatsApp (numéro ou lien) :</label>
                  <input
                    type="text"
                    value={config.whatsappNumber || ''}
                    placeholder="+225 07 00 00 00 00"
                    onChange={(e) => onChange({ ...config, whatsappNumber: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">TikTok (URL) :</label>
                  <input
                    type="text"
                    value={config.socialLinks?.tiktok || ''}
                    placeholder="https://tiktok.com/@maboutique"
                    onChange={(e) => onChange({ ...config, socialLinks: { ...(config.socialLinks || {}), tiktok: e.target.value } })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Facebook (URL) :</label>
                  <input
                    type="text"
                    value={config.socialLinks?.facebook || ''}
                    placeholder="https://facebook.com/maboutique"
                    onChange={(e) => onChange({ ...config, socialLinks: { ...(config.socialLinks || {}), facebook: e.target.value } })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Instagram (URL) :</label>
                  <input
                    type="text"
                    value={config.socialLinks?.instagram || ''}
                    placeholder="https://instagram.com/maboutique"
                    onChange={(e) => onChange({ ...config, socialLinks: { ...(config.socialLinks || {}), instagram: e.target.value } })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. SYSTÈME DE LA BARRE MOBILE APP BASSE (iOS/Android 5 Onglets au Pouce) */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📱</span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase text-slate-200 tracking-wider">
                    Barre Mobile App Basse
                  </h4>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                    5 Onglets
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Navigation ergonomique style application mobile (Accueil, Rayons, Live, Panier, WhatsApp)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onChange({
                  ...config,
                  showMobileBottomBar: config.showMobileBottomBar === false ? true : false
                });
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                config.showMobileBottomBar !== false ? 'bg-blue-600' : 'bg-slate-700'
              }`}
              title={config.showMobileBottomBar !== false ? 'Désactiver la barre mobile' : 'Activer la barre mobile'}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  config.showMobileBottomBar !== false ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Pied de Page : Sauvegarde & Publication */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/90 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onReset();
          }}
          disabled={!hasUnsavedChanges || isPublishing}
          className={`px-3 py-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold transition cursor-pointer ${
            hasUnsavedChanges && !isPublishing
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
          }`}
          title="Annuler les modifications non publiées"
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
          className={`flex-1 py-2.5 px-4 rounded-xl text-white font-black text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
            isPublishing
              ? 'bg-blue-400 cursor-wait'
              : 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-blue-600/30'
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

      {/* 6. Modale Visuelle des 15 Modules (8 Fondamentaux + 7 Exclusivités Mondiales) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[4000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-slate-950 text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[88vh]">
            {/* Header de la Modale */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Bibliothèque Nanasore Architect OS</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white">
                    15 Modules
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choisissez un module à insérer sur votre page en un clic
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Onglets des 2 Catégories */}
            <div className="flex border-b border-slate-800 bg-slate-900/40 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAddModalTab('fundamental')}
                className={`flex-1 py-3 px-4 border-b-2 text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                  addModalTab === 'fundamental'
                    ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>🧱 Modules Fondamentaux E-Commerce (8)</span>
              </button>

              <button
                type="button"
                onClick={() => setAddModalTab('nanasore_original')}
                className={`flex-1 py-3 px-4 border-b-2 text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                  addModalTab === 'nanasore_original'
                    ? 'border-amber-500 text-amber-400 bg-amber-950/20'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>🚀 Exclusivités Mondiales Nanasore (7)</span>
              </button>
            </div>

            {/* Grille des Modules de la Catégorie Active */}
            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
              {ARCHITECT_MODULES.filter(m => m.category === addModalTab).map((mod) => (
                <div
                  key={mod.type}
                  onClick={() => handleAddModule(mod)}
                  className="p-4 rounded-2xl border border-slate-800 hover:border-blue-500 bg-slate-900/60 hover:bg-slate-900 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{mod.icon}</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        mod.category === 'nanasore_original'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                          : 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                      }`}>
                        {mod.badge}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-white group-hover:text-blue-400 transition">
                      {mod.title}
                    </h4>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {mod.desc}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end border-t border-slate-800/60">
                    <span className="text-xs font-bold text-blue-400 group-hover:underline flex items-center gap-1">
                      <span>Insérer ce module</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. Modale des 4 Blueprints Pré-Assemblés en 1 Clic */}
      {showBlueprintsModal && (
        <div className="fixed inset-0 z-[4000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-950 text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[88vh]">
            <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>4 Blueprints Architecte Pré-Assemblés</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ne partez jamais d'une page blanche : déployez une combinaison gagnante en 1 clic
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBlueprintsModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              {ARCHITECT_BLUEPRINTS.map((bp) => (
                <div
                  key={bp.id}
                  onClick={() => handleLoadBlueprint(bp)}
                  className="p-4.5 rounded-2xl border border-slate-800 hover:border-blue-500 bg-slate-900/60 hover:bg-slate-900 transition-all cursor-pointer group flex flex-col justify-between space-y-3 shadow-md"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{bp.icon}</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-500/40">
                        {bp.badge}
                      </span>
                    </div>

                    <h4 className="font-black text-sm text-white group-hover:text-blue-400 transition">
                      {bp.name}
                    </h4>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {bp.subtitle}
                    </p>

                    <div className="pt-2 text-[10px] text-slate-500 space-y-0.5">
                      <span className="block font-bold text-slate-400">Modules inclus ({bp.sections.length}) :</span>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {bp.sections.map((s, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px]">
                            {s.type.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-bold text-blue-400">
                    <span className="text-[10px] text-slate-400">Ambiance : {bp.moodPreset}</span>
                    <span className="group-hover:underline flex items-center gap-1">
                      <span>Déployer ce template</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. Modale Mes Presets de Boutique (Snapshots) & Sauvegardes */}
      {showPresetsModal && (
        <ThemePresetsAndDraftManager
          isOpen={showPresetsModal}
          onClose={() => setShowPresetsModal(false)}
          currentConfig={config}
          onApplyPreset={(preset) => {
            handleApplySavedPreset(preset);
            setShowPresetsModal(false);
          }}
          onSavePresetsList={(updatedPresets) => {
            onChange({
              ...config,
              savedPresets: updatedPresets
            });
          }}
          storeSlug={storeSlug}
        />
      )}
    </aside>
  );
};

export default CustomThemeArchitectSidebar;
