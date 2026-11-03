import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeCustomizationConfig, FooterStyleType } from '../../../../../types';
import { StoreProductItem } from '../types';
import { BentoMapTrustFooter } from './BentoMapTrustFooter';
import { EditorialPrestigeFooter } from './EditorialPrestigeFooter';
import { ConversionCommandFooter } from './ConversionCommandFooter';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';
import { Anchor, Sparkles, Check, X, ShieldCheck, ArrowRight } from 'lucide-react';

export interface AdaptiveFooterEngineProps {
  config: ThemeCustomizationConfig;
  products?: StoreProductItem[];
  categories?: string[];
  storeSlug?: string;
  onOpenFunnel?: (product: StoreProductItem) => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  onResetToHome?: () => void;
  onSelectCategory?: (category: string) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
  className?: string;
  onChangeFooterStyle?: (style: FooterStyleType) => void;
}

// Définition des 3 Footers Premium Nanasore
export const THREE_PREMIUM_FOOTERS: {
  id: FooterStyleType;
  title: string;
  badge: string;
  icon: string;
  category: string;
  desc: string;
}[] = [
  {
    id: 'bento_map_trust_footer',
    title: 'Bento Map & Trust Hub',
    badge: 'Apple & Linear Minimal',
    icon: '🗺️',
    category: 'Bento Grid • Mini-Map Zoom • Club VIP',
    desc: 'Architecture modulaire en cartes bento, newsletter VIP, mini-map zoomable 10x-18x et réassurance maximale.'
  },
  {
    id: 'editorial_prestige_footer',
    title: 'Éditorial Prestige & VIP Club',
    badge: 'Style GLOWING / Sephora',
    icon: '💎',
    category: 'Beauté & Cosmétique • Showroom Galerie',
    desc: 'Bandeau e-mailing de prestige centré, 4 colonnes aérées, showroom d\'expédition avec mini-map interactive.'
  },
  {
    id: 'conversion_command_footer',
    title: 'Conversion Command Dock & QR',
    badge: 'Cockpit Haute Conversion',
    icon: '⚡',
    category: 'Dock Express • Pilules Rayons • QR Code',
    desc: 'Dock supérieur e-mailing & WhatsApp, mini-map radar avec sonar clignotant, QR code et nuage de catégories.'
  }
];

export const AdaptiveFooterEngine: React.FC<AdaptiveFooterEngineProps> = ({
  config = {} as ThemeCustomizationConfig,
  products = [],
  categories = [],
  storeSlug = 'boutique',
  onOpenFunnel,
  onSelectProduct,
  onResetToHome,
  onSelectCategory,
  isPublicView = false,
  isAdminPreview = false,
  className = '',
  onChangeFooterStyle
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  // Style de footer actif (bento_map_trust_footer par défaut)
  const [currentStyle, setCurrentStyle] = useState<FooterStyleType>(
    () => config?.footerStyle || 'bento_map_trust_footer'
  );

  // État de la modal de sélection rapide du footer en mode Studio
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState<boolean>(false);

  // Synchronisation avec config.footerStyle
  useEffect(() => {
    if (config?.footerStyle && config.footerStyle !== currentStyle) {
      setCurrentStyle(config.footerStyle);
    }
  }, [config?.footerStyle]);

  // Écoute de l'événement global pour changement de style de footer en 0ms
  useEffect(() => {
    const handleGlobalChange = (e: Event) => {
      const customEvt = e as CustomEvent<any>;
      const style = customEvt.detail?.style || customEvt.detail;
      if (style && style !== currentStyle) {
        setCurrentStyle(style);
      }
    };
    window.addEventListener('nana_change_footer_style', handleGlobalChange);
    return () => window.removeEventListener('nana_change_footer_style', handleGlobalChange);
  }, [currentStyle]);

  // Gestionnaire de changement de style de footer
  const handleSelectStyle = useCallback((style: FooterStyleType) => {
    playValidationBeep();
    setCurrentStyle(style);
    setIsSelectorModalOpen(false);

    if (onChangeFooterStyle) {
      onChangeFooterStyle(style);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nana_change_footer_style', { detail: { style } }));
    }
  }, [onChangeFooterStyle]);

  // Props communes passées aux footers
  const commonProps = useMemo(() => ({
    config: {
      ...(config || {}),
      footerStyle: currentStyle
    },
    products,
    categories,
    storeSlug,
    onOpenFunnel,
    onSelectProduct,
    onResetToHome,
    onSelectCategory,
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
    isPublicView,
    isAdminPreview,
    className
  ]);

  // Rendu du footer selon le style choisi
  const renderFooter = () => {
    switch (currentStyle) {
      case 'bento_map_trust_footer':
        return <BentoMapTrustFooter {...commonProps} />;

      case 'editorial_prestige_footer':
        return <EditorialPrestigeFooter {...commonProps} />;

      case 'conversion_command_footer':
        return <ConversionCommandFooter {...commonProps} />;

      default:
        return <BentoMapTrustFooter {...commonProps} />;
    }
  };

  return (
    <div className="relative w-full">
      {/* 1. LE FOOTER ACTIF MONTÉ EN 0MS */}
      {renderFooter()}

      {/* 2. BOUTON FLOTTANT DU STUDIO (isAdminPreview === true) */}
      {isAdminPreview && (
        <div className="fixed bottom-24 right-4 z-50 animate-in fade-in">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsSelectorModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-white shadow-xl px-3.5 py-2 rounded-full text-xs font-black flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 select-none"
            title="Ouvrir le Sélecteur Visuel des 3 Footers Premium"
          >
            <Anchor className="w-3.5 h-3.5 text-blue-200" />
            <span>⚓ Changer de style de pied de page</span>
          </button>
        </div>
      )}

      {/* 3. MODAL SÉLECTEUR VISUEL DES 3 FOOTERS PREMIUM (Bleu Royal #2563EB & Blanc Pur #FFFFFF) */}
      {isSelectorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full border-2 border-blue-600 shadow-2xl p-5 sm:p-7 relative overflow-hidden text-slate-900 max-h-[90vh] flex flex-col">
            
            {/* Entête du Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-blue-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-600/30">
                  ⚓
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Style de Pied de Page de la Boutique (3 Modèles Premium)
                  </h3>
                  <p className="text-xs text-blue-600 font-semibold mt-0.5">
                    Sélectionnez votre footer — bascule instantanée en 0ms sur l'aperçu !
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

            {/* Grille des 3 Cartes Visuelles Cliquables */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-4 overflow-y-auto pr-1">
              {THREE_PREMIUM_FOOTERS.map((footer) => {
                const isActive = currentStyle === footer.id;
                return (
                  <div
                    key={footer.id}
                    onClick={() => handleSelectStyle(footer.id)}
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
                          <span className="text-2xl">{footer.icon}</span>
                          <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            {footer.badge}
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
                        {footer.title}
                      </h4>

                      {/* Catégorie / Inspirations */}
                      <p className="text-[10px] font-bold text-blue-600 mt-0.5 uppercase tracking-wide">
                        {footer.category}
                      </p>

                      {/* Description */}
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">
                        {footer.desc}
                      </p>
                    </div>

                    {/* Bouton d'activation en bas */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                        {isActive ? 'Footer actuellement actif' : 'Cliquer pour activer'}
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

export default THREE_PREMIUM_FOOTERS;
