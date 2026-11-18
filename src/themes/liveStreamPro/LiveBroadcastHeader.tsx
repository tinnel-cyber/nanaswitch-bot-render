import React, { useState, useEffect } from 'react';
import { ShoppingBag, Bell, Radio } from 'lucide-react';
import { StoreConfig } from '../../components/storeBuilder/types';
import { ThemeCustomizationConfig } from '../../types';
import { 
  FacebookLiveIcon, 
  TikTokLiveIcon, 
  YouTubeLiveIcon, 
  InstagramLiveIcon 
} from './liveStreamAssets';

interface LiveBroadcastHeaderProps {
  storeConfig: StoreConfig;
  cartCount: number;
  onOpenCart?: () => void;
  onOpenAlertModal?: () => void;
  customConfig?: ThemeCustomizationConfig;
}

export const LiveBroadcastHeader: React.FC<LiveBroadcastHeaderProps> = ({
  storeConfig,
  cartCount,
  onOpenCart,
  onOpenAlertModal,
  customConfig
}) => {
  // Compteur de spectateurs vivant avec micro-fluctuations naturelles
  const [viewerCount, setViewerCount] = useState(1420);
  const displayStoreName = customConfig?.storeName || storeConfig.name || storeConfig.storeName || '';
  const displayLogo = customConfig?.logoUrl || storeConfig.logo_url || storeConfig.logoUrl;

  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuation douce de -4 à +5 spectateurs
      const delta = Math.floor(Math.random() * 10) - 4;
      setViewerCount((prev) => Math.max(1380, Math.min(1510, prev + delta)));
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 w-full h-[75px] live-glass-header transition-all duration-200"
      style={customConfig?.headerBgColor ? { backgroundColor: customConfig.headerBgColor } : undefined}
    >
      <div className="max-w-[1440px] h-full mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* ================= GAUCHE : LOGO DE LA BOUTIQUE + BADGE LIVE STUDIO ================= */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
          {displayLogo ? (
            <img 
              src={displayLogo} 
              alt={displayStoreName || 'Store'} 
              className="h-9 sm:h-10 w-auto max-w-[120px] sm:max-w-[150px] object-contain"
            />
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-500/30">
                {(displayStoreName || 'N').charAt(0).toUpperCase()}
              </div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white select-none hidden min-[400px]:inline-block">
                {displayStoreName || 'Studio Broadcast'}
              </span>
            </div>
          )}

          {/* Badge animé : ● LIVE STUDIO */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.12] backdrop-blur-md select-none shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF2A54] live-pulse-dot shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-1">
              <span>LIVE</span>
              <span className="text-[#94A3B8] font-semibold hidden sm:inline">STUDIO</span>
            </span>
          </div>
        </div>

        {/* ================= CENTRE : INDICATEURS MULTISTREAMING (PILULE EN VERRE) ================= */}
        <div className="hidden md:flex items-center">
          <div className="flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-2 rounded-full bg-white/[0.04] border border-white/[0.1] backdrop-blur-md shadow-inner text-xs">
            <span className="text-[#94A3B8] font-medium hidden lg:inline">
              Diffusion simultanée sur :
            </span>

            {/* Réseaux sociaux avec point vert actif */}
            <div className="flex items-center gap-2.5 lg:gap-3">
              {/* Facebook Live */}
              <div 
                className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-full border border-white/[0.06]" 
                title="En direct sur Facebook Live"
              >
                <FacebookLiveIcon className="w-3.5 h-3.5" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] live-green-dot" />
              </div>

              {/* TikTok */}
              <div 
                className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-full border border-white/[0.06]" 
                title="En direct sur TikTok Live"
              >
                <TikTokLiveIcon className="w-3.5 h-3.5" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] live-green-dot" />
              </div>

              {/* YouTube */}
              <div 
                className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-full border border-white/[0.06]" 
                title="En direct sur YouTube Live"
              >
                <YouTubeLiveIcon className="w-3.5 h-3.5" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] live-green-dot" />
              </div>

              {/* Instagram */}
              <div 
                className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-full border border-white/[0.06]" 
                title="En direct sur Instagram Live"
              >
                <InstagramLiveIcon className="w-3.5 h-3.5" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] live-green-dot" />
              </div>
            </div>

            <div className="w-[1px] h-3.5 bg-white/20" />

            {/* Compteur de spectateurs temps réel */}
            <div className="flex items-center gap-1.5 font-bold text-white select-none">
              <span className="text-sm">👁️</span>
              <span className="tabular-nums tracking-tight font-extrabold text-[#F8FAFC]">
                {viewerCount.toLocaleString('fr-FR')}
              </span>
              <span className="text-[#94A3B8] font-normal text-[11px]">spectateurs</span>
            </div>
          </div>
        </div>

        {/* Pilule compacte pour Mobile/Tablette */}
        <div className="flex md:hidden items-center">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs">
            <span className="text-xs">👁️</span>
            <span className="tabular-nums font-extrabold text-white text-xs">
              {viewerCount.toLocaleString('fr-FR')}
            </span>
          </div>
        </div>

        {/* ================= DROITE : BOUTON ALERTE & PANIER AVEC BADGE ================= */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Bouton d'alerte : 🔔 M'alerter du prochain Live */}
          <button
            type="button"
            onClick={onOpenAlertModal}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.15] text-white text-xs sm:text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm hover:border-indigo-400/50"
            title="Recevoir une alerte WhatsApp ou SMS avant le prochain direct"
          >
            <Bell className="w-3.5 h-3.5 text-[#F59E0B] animate-bounce-subtle" />
            <span className="hidden sm:inline">M'alerter du prochain Live</span>
            <span className="sm:hidden">Alerte</span>
          </button>

          {/* Icône du Panier avec badge rouge */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label="Voir le panier"
            className="relative w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-sm"
          >
            <ShoppingBag className="w-4 h-4 text-white" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-[#FF2A54] text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-[#FF2A54]/40 border-2 border-[#090A0F] tabular-nums">
                {cartCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
