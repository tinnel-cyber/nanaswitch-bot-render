import React from 'react';
import {
  Home,
  Film,
  MessageCircle,
  ShoppingBag,
  Wallet
} from 'lucide-react';
import { playTapBeep } from '../../../../utils/audio';

export interface WameetBottomTabBarProps {
  activeScreenIndex: 0 | 1 | 2;
  onSelectScreen: (index: 0 | 1 | 2) => void;
  onOpenShop: () => void;
  onOpenWallet: () => void;
  unreadChatsCount?: number;
  className?: string;
}

/**
 * COMPOSANT WameetBottomTabBar (Prompt 47 : Architecture Native App Shell)
 * 
 * Directives architecturales :
 * - Classe stricte : shrink-0 z-40 bg-white border-t pb-[env(safe-area-inset-bottom)]
 * - Éléments fixes : Accueil [0], Reels [1], Chats [2], Boutique, Wallet
 * - Reste figé pendant le défilement infini de la zone centrale.
 */
export const WameetBottomTabBar: React.FC<WameetBottomTabBarProps> = ({
  activeScreenIndex,
  onSelectScreen,
  onOpenShop,
  onOpenWallet,
  unreadChatsCount = 3,
  className = ''
}) => {
  return (
    <nav
      className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] md:max-w-md lg:max-w-lg shrink-0 z-[90] bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 sm:px-6 pt-1.5 pb-2 flex items-center justify-around select-none shadow-[0_-6px_20px_rgba(0,0,0,0.08)] transition-all duration-300 ease-in-out will-change-transform ${className}`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
      aria-label="Barre de navigation principale"
    >
      {/* 1. Accueil (Feed Wameet) */}
      <button
        type="button"
        onClick={() => {
          playTapBeep();
          onSelectScreen(0);
        }}
        className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-150 cursor-pointer active:scale-95 ${
          activeScreenIndex === 0 ? 'text-[#4169E1]' : 'text-slate-400 hover:text-slate-700'
        }`}
        aria-label="Accueil Wameet"
      >
        <Home className={`w-5 h-5 ${activeScreenIndex === 0 ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
        <span className={`text-[10px] tracking-tight ${activeScreenIndex === 0 ? 'font-black' : 'font-semibold'}`}>
          Accueil
        </span>
      </button>

      {/* 2. Reels Wameet */}
      <button
        type="button"
        onClick={() => {
          playTapBeep();
          onSelectScreen(1);
        }}
        className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-150 cursor-pointer active:scale-95 ${
          activeScreenIndex === 1 ? 'text-[#4169E1]' : 'text-slate-400 hover:text-slate-700'
        }`}
        aria-label="Reels Wameet"
      >
        <Film className={`w-5 h-5 ${activeScreenIndex === 1 ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
        <span className={`text-[10px] tracking-tight ${activeScreenIndex === 1 ? 'font-black' : 'font-semibold'}`}>
          Reels
        </span>
      </button>

      {/* 3. Chats Wameet avec micro-badge non lu */}
      <button
        type="button"
        onClick={() => {
          playTapBeep();
          onSelectScreen(2);
        }}
        className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-150 cursor-pointer active:scale-95 relative ${
          activeScreenIndex === 2 ? 'text-[#4169E1]' : 'text-slate-400 hover:text-slate-700'
        }`}
        aria-label="Discussions Wameet"
      >
        <div className="relative">
          <MessageCircle className={`w-5 h-5 ${activeScreenIndex === 2 ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          {unreadChatsCount > 0 && (
            <span className="absolute -top-1 -right-2.5 px-1 py-0.2 min-w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs border border-white">
              {unreadChatsCount}
            </span>
          )}
        </div>
        <span className={`text-[10px] tracking-tight ${activeScreenIndex === 2 ? 'font-black' : 'font-semibold'}`}>
          Chats
        </span>
      </button>

      {/* 4. Boutique Wameet (Mini-Site) */}
      <button
        type="button"
        onClick={() => {
          playTapBeep();
          onOpenShop();
        }}
        className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-150 cursor-pointer active:scale-95 text-slate-400 hover:text-slate-700"
        aria-label="Boutique Wameet Shop"
      >
        <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
        <span className="text-[10px] font-semibold tracking-tight">
          Boutique
        </span>
      </button>

      {/* 5. Wallet Wameet (Monétisation & Solde) */}
      <button
        type="button"
        onClick={() => {
          playTapBeep();
          onOpenWallet();
        }}
        className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-150 cursor-pointer active:scale-95 text-slate-400 hover:text-slate-700"
        aria-label="Portefeuille Wameet Wallet"
      >
        <Wallet className="w-5 h-5 stroke-[1.8]" />
        <span className="text-[10px] font-semibold tracking-tight">
          Wallet
        </span>
      </button>
    </nav>
  );
};

export default WameetBottomTabBar;
