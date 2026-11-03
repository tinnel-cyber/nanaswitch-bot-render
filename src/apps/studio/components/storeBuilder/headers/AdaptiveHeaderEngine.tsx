import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeCustomizationConfig, HeaderStyleType } from '../../../../../types';
import { StoreProductItem } from '../types';
import { MegaHubMarketplaceHeader } from './MegaHubMarketplaceHeader';
import { EditorialGlowingHeader } from './EditorialGlowingHeader';
import { StoriesRingsHeader } from './StoriesRingsHeader';
import { DynamicIslandHeader } from './DynamicIslandHeader';
import { LiveRadarVocalHeader } from './LiveRadarVocalHeader';
import { SmartRewardHeader } from './SmartRewardHeader';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';
import { Crown, Sparkles, Check, X, ArrowRight, ShieldCheck } from 'lucide-react';

export interface AdaptiveHeaderEngineProps {
  config: ThemeCustomizationConfig;
  products?: StoreProductItem[];
  categories?: string[];
  storeSlug?: string;
  onOpenFunnel?: (product: StoreProductItem) => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  onResetToHome?: () => void;
  onSelectCategory?: (category: string) => void;
  onSearch?: (query: string) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
  className?: string;
  onChangeHeaderStyle?: (style: HeaderStyleType) => void;
}

// Définition des 6 En-Têtes Premium Nanasore
export const SIX_PREMIUM_HEADERS: {
  id: HeaderStyleType;
  title: string;
  badge: string;
  icon: string;
  category: string;
  desc: string;
}[] = [
  {
    id: 'mega_hub_marketplace',
    title: 'Mega-Hub Marketplace',
    badge: 'Marketplace Pro',
    icon: '🏪',
    category: 'You&Me Shop • Ruban Défilant • Villes',
    desc: 'Idéal pour grands catalogues, multi-villes et rayons rapides avec hotline WhatsApp.'
  },
  {
    id: 'editorial_glowing_luxe',
    title: 'Éditorial Luxe & Prestige',
    badge: 'Beauté, Santé & Cosmétique',
    icon: '💎',
    category: 'GLOWING • Mega-Menu Visuel 3 Colonnes',
    desc: 'Typographie haute couture, logo centré, navigation gauche & bandeau d\'expédition.'
  },
  {
    id: 'stories_rings_viral',
    title: 'Stories Rings Viral',
    badge: 'TikTok, Instagram & Statuts WhatsApp',
    icon: '📱',
    category: 'Anneaux de Stories Shoppables 1-Clic',
    desc: 'Rail horizontal d\'anneaux lumineux avec lecteur de Story plein écran et achat immédiat.'
  },
  {
    id: 'dynamic_island_glass',
    title: 'Dynamic Island Glass',
    badge: 'Apple Minimal & Linear Style',
    icon: '🏝️',
    category: 'Pilule Flottante en Verre Dépoli',
    desc: 'Morphing fluide au scroll, spotlight search et notifications live intégrées à l\'îlot.'
  },
  {
    id: 'live_radar_vocal',
    title: 'Live Radar & Vocal Concierge',
    badge: 'Formations, Webinaires & Live Shopping',
    icon: '🎙️',
    category: 'Note Vocale Vendeur + Radar Clignotant',
    desc: 'Bulle audio interactive avec ondes animées, radar live clignotant et aperçu vidéo 1080×1080.'
  },
  {
    id: 'smart_reward_bar',
    title: 'Smart Reward & Conversion Pure',
    badge: 'Psychologie Panier & Cadeau VIP',
    icon: '🎁',
    category: 'Jauge Interactive à 2 Paliers & Conseiller',
    desc: 'Jauge dynamique de livraison offerte + cadeau secret, carte conseiller WhatsApp 1 min.'
  }
];

export const AdaptiveHeaderEngine: React.FC<AdaptiveHeaderEngineProps> = ({
  config = {} as ThemeCustomizationConfig,
  products = [],
  categories = [],
  storeSlug = 'boutique',
  onOpenFunnel,
  onSelectProduct,
  onResetToHome,
  onSelectCategory,
  onSearch,
  isPublicView = false,
  isAdminPreview = false,
  className = '',
  onChangeHeaderStyle
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (ZÉRO ERREUR #310)
  // =========================================================================

  // Style d'en-tête actif avec synchronisation réactive
  const [currentStyle, setCurrentStyle] = useState<HeaderStyleType>(
    () => config?.headerStyle || 'mega_hub_marketplace'
  );

  // État du modal de sélection rapide d'en-tête en mode Studio
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState<boolean>(false);

  // Synchronisation avec config.headerStyle lors des changements externes
  useEffect(() => {
    if (config?.headerStyle && config.headerStyle !== currentStyle) {
      setCurrentStyle(config.headerStyle);
    }
  }, [config?.headerStyle]);

  // Écoute de l'événement global pour changement d'en-tête instantané en 0ms
  useEffect(() => {
    const handleGlobalChange = (e: Event) => {
      const customEvt = e as CustomEvent<HeaderStyleType>;
      if (customEvt.detail && customEvt.detail !== currentStyle) {
        setCurrentStyle(customEvt.detail);
      }
    };
    window.addEventListener('nana_change_header_style', handleGlobalChange);
    return () => window.removeEventListener('nana_change_header_style', handleGlobalChange);
  }, [currentStyle]);

  // Gestionnaire de changement d'en-tête
  const handleSelectStyle = useCallback((style: HeaderStyleType) => {
    playValidationBeep();
    setCurrentStyle(style);
    setIsSelectorModalOpen(false);

    if (onChangeHeaderStyle) {
      onChangeHeaderStyle(style);
    }

    // Déclenchement de l'événement pour persistance globale dans le Studio
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nana_change_header_style', { detail: style }));
    }
  }, [onChangeHeaderStyle]);

  // Props communes à injecter dans chaque en-tête
  const commonProps = useMemo(() => ({
    config: {
      ...(config || {}),
      headerStyle: currentStyle
    },
    products,
    categories,
    storeSlug,
    onOpenFunnel,
    onSelectProduct,
    onResetToHome,
    onSelectCategory,
    onSearch,
    isPublicView,
    isAdminPreview,
    className
  }), [
    config,
    currentStyle,
    products,
    categories,
    storeSlug,
    onOpenFunnel,
    onSelectProduct,
    onResetToHome,
    onSelectCategory,
    onSearch,
    isPublicView,
    isAdminPreview,
    className
  ]);

  // Rendu de l'en-tête actif
  const renderHeader = () => {
    switch (currentStyle) {
      case 'mega_hub_marketplace':
        return <MegaHubMarketplaceHeader {...commonProps} />;

      case 'editorial_glowing_luxe':
        return <EditorialGlowingHeader {...commonProps} />;

      case 'stories_rings_viral':
        return <StoriesRingsHeader {...commonProps} />;

      case 'dynamic_island_glass':
        return <DynamicIslandHeader {...commonProps} />;

      case 'live_radar_vocal':
        return <LiveRadarVocalHeader {...commonProps} />;

      case 'smart_reward_bar':
        return <SmartRewardHeader {...commonProps} />;

      default:
        return <MegaHubMarketplaceHeader {...commonProps} />;
    }
  };

  return (
    <div className="relative w-full">
      
      {/* 1. L'EN-TÊTE ACTIF MONTÉ EN 0MS */}
      {renderHeader()}

      {/* 2. BOUTON FLOTTANT DU STUDIO (isAdminPreview === true) */}
      {isAdminPreview && (
        <div className="fixed top-24 right-4 z-50 animate-in fade-in">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsSelectorModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-white shadow-xl px-3.5 py-2 rounded-full text-xs font-black flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 select-none"
            title="Ouvrir le Sélecteur Visuel des 6 En-Têtes Premium"
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span>👑 Changer de style d'en-tête</span>
          </button>
        </div>
      )}

      {/* 3. MODAL SÉLECTEUR VISUEL DES 6 EN-TÊTES PREMIUM (Bleu Royal #2563EB & Blanc Pur #FFFFFF) */}
      {isSelectorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full border-2 border-blue-600 shadow-2xl p-5 sm:p-7 relative overflow-hidden text-slate-900 max-h-[90vh] flex flex-col">
            
            {/* Entête du Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-blue-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-600/30">
                  👑
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Style d'En-Tête de la Boutique (6 Modèles Premium)
                  </h3>
                  <p className="text-xs text-blue-600 font-semibold mt-0.5">
                    Sélectionnez votre en-tête — bascule en 0ms sur l'aperçu !
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSelectorModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Grille des 6 Cartes Visuelles Cliquables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-4 overflow-y-auto pr-1">
              {SIX_PREMIUM_HEADERS.map((header) => {
                const isActive = currentStyle === header.id;
                return (
                  <div
                    key={header.id}
                    onClick={() => handleSelectStyle(header.id)}
                    className={`rounded-2xl p-4 border-2 transition-all cursor-pointer text-left relative flex flex-col justify-between group ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/30'
                        : 'border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50/30 shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Icône + Badge */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{header.icon}</span>
                          <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            {header.badge}
                          </span>
                        </div>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                            <Check className="w-2.5 h-2.5" />
                            ACTIF
                          </span>
                        )}
                      </div>

                      {/* Titre */}
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                        {header.title}
                      </h4>

                      {/* Catégorie / Inspirations */}
                      <p className="text-[10px] font-bold text-blue-600 mt-0.5 uppercase tracking-wide">
                        {header.category}
                      </p>

                      {/* Description */}
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">
                        {header.desc}
                      </p>
                    </div>

                    {/* Bouton d'activation en bas */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                        {isActive ? 'En-tête actuellement actif' : 'Cliquer pour activer'}
                      </span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        isActive ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white'
                      }`}>
                        →
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pied du modal */}
            <div className="pt-3 border-t border-blue-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                100% Compatible Desktop &amp; Mobile iPhone 412px
              </span>
              <button
                type="button"
                onClick={() => setIsSelectorModalOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default SIX_PREMIUM_HEADERS;
