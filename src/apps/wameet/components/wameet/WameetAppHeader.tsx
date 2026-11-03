import React from 'react';
import { Search, Bell } from 'lucide-react';
import { WameetLogo } from './WameetLogo';
import { playTapBeep } from '../../../../utils/audio';

export interface WameetAppHeaderProps {
  onOpenDrawer: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  activeScreenIndex: 0 | 1 | 2;
  onSelectScreen?: (index: 0 | 1 | 2) => void;
  unreadNotificationsCount?: number;
  impactScore?: number;
  className?: string;
}

/**
 * Header Global Wameet (Prompt 42 / 47 : Architecture Native App Shell)
 * Directives :
 * - shrink-0 z-40 bg-white/90 backdrop-blur-md sticky top-0
 * - En haut à gauche : Icône "3 points" (Menu hamburger stylisé) pour ouvrir le tiroir de navigation.
 * - Au centre : Le logo Wameet.
 * - En haut à droite : Icône de recherche et de notification.
 * - Disparaît automatiquement sur l'écran des Reels (activeScreenIndex === 1).
 */
export const WameetAppHeader: React.FC<WameetAppHeaderProps> = ({
  onOpenDrawer,
  onOpenSearch,
  onOpenNotifications,
  activeScreenIndex,
  onSelectScreen,
  unreadNotificationsCount = 3,
  impactScore = 18450,
  className = ''
}) => {
  const isReelsActive = activeScreenIndex === 1;

  if (isReelsActive) return null;

  return (
    <header
      className={`shrink-0 z-40 bg-white/90 backdrop-blur-md sticky top-0 border-b border-slate-100 px-3 sm:px-5 py-2 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all select-none ${className}`}
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.4rem)' }}
    >
      {/* 1. GAUCHE : Bouton 3 Points (Menu Hamburger Stylisé) */}
      <button
        type="button"
        onClick={() => {
          playTapBeep();
          onOpenDrawer();
        }}
        className="w-10 h-10 rounded-full bg-slate-100/90 hover:bg-blue-50 active:scale-95 text-slate-800 hover:text-[#4169E1] flex items-center justify-center transition-all cursor-pointer shadow-xs border border-slate-200/60"
        title="Ouvrir le menu de navigation Wameet"
        aria-label="Ouvrir le menu de navigation"
      >
        <div className="flex flex-col gap-1 items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-800 transition-colors" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#4169E1] transition-colors" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-800 transition-colors" />
        </div>
      </button>

      {/* 2. CENTRE : Logo Wameet uniquement (sans doublon de sous-onglets) */}
      <div className="flex flex-col items-center justify-center">
        <WameetLogo
          size="sm"
          showWordmark={true}
          showTagline={false}
          layout="horizontal"
          theme="on-light-pill"
        />
      </div>

      {/* 3. DROITE : Jauge d'Impact 💎 + Icône de Recherche & Notification */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Jauge d'Impact Gamification (Prompt 3 : 💎 {impactScore} en Bleu Royal) */}
        {impactScore !== undefined && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50/80 border border-blue-100 text-[11px] font-black text-slate-800 shadow-2xs">
            <span className="text-[#4169E1]">💎</span>
            <span>{impactScore.toLocaleString('fr-FR')}</span>
          </div>
        )}

        {/* Recherche */}
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onOpenSearch();
          }}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100/90 hover:bg-blue-50 active:scale-95 text-slate-800 hover:text-[#4169E1] flex items-center justify-center transition-all cursor-pointer shadow-xs border border-slate-200/60"
          title="Rechercher sur Wameet"
          aria-label="Recherche Wameet"
        >
          <Search className="w-4 h-4 text-slate-700" />
        </button>

        {/* Notifications avec pastille d'alerte */}
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onOpenNotifications();
          }}
          className="relative w-10 h-10 rounded-full bg-slate-100/90 hover:bg-blue-50 active:scale-95 text-slate-800 hover:text-[#2563EB] flex items-center justify-center transition-all cursor-pointer shadow-xs border border-slate-200/60"
          title="Notifications & Activité"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-slate-700" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
          )}
        </button>
      </div>
    </header>
  );
};

export default WameetAppHeader;
