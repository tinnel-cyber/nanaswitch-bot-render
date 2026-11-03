import React from 'react';
import {
  X,
  Home,
  Film,
  MessageCircle,
  Crown,
  ShoppingBag,
  Gift,
  Bike,
  Settings,
  GraduationCap,
  Sparkles,
  Users,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Lock,
  Video
} from 'lucide-react';
import { WameetProfileData } from '../../../../pages/wameet/WameetSupraApp';
import { playTapBeep } from '../../../../utils/audio';

export interface WameetNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: WameetProfileData;
  activeScreenIndex: 0 | 1 | 2;
  onSelectScreen: (index: 0 | 1 | 2) => void;
  onOpenSettings: () => void;
  onOpenVip: () => void;
  onOpenShop: () => void;
  onOpenCagnotte: () => void;
  onOpenDelivery: () => void;
  onOpenContacts: () => void;
  onOpenCampus: () => void;
  onBackToDashboard: () => void;
  onEditProfile?: () => void;
  onOpenWameetGenerator?: () => void;
}

export const WameetNavigationDrawer: React.FC<WameetNavigationDrawerProps> = ({
  isOpen,
  onClose,
  profile,
  activeScreenIndex,
  onSelectScreen,
  onOpenSettings,
  onOpenVip,
  onOpenShop,
  onOpenCagnotte,
  onOpenDelivery,
  onOpenContacts,
  onOpenCampus,
  onBackToDashboard,
  onEditProfile,
  onOpenWameetGenerator
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-200">
      {/* 1. Backdrop sombre flouté */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          playTapBeep();
          onClose();
        }}
      />

      {/* 2. Tiroir latéral gauche */}
      <div
        className="relative w-80 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-250 z-10"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)'
        }}
      >
        {/* En-tête : Profil Utilisateur */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-b from-blue-50/50 to-white">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="relative">
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-white ring-2 ring-[#2563EB] shadow-md bg-white"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';
                }}
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
            </div>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              aria-label="Fermer le menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h3 className="text-base font-black text-slate-900 leading-tight">
              {profile.name}
            </h3>
            <p className="text-xs font-bold text-[#4169E1] mt-0.5">
              {profile.handle}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[10px] font-black text-[#4169E1] border border-blue-200 truncate max-w-full">
                <span>{profile.statusBadge}</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs text-[10px] font-black text-slate-800">
                <span className="text-[#4169E1]">💎</span>
                <span>{(profile.impactScore || 18450).toLocaleString('fr-FR')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Corps du menu défilant */}
        <div className="flex-1 py-3 px-3 space-y-4 overflow-y-auto">
          {/* Section 1 : Les 3 Piliers de l'App (Navigation directe par swipe) */}
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1">
              Les 3 Piliers Wameet
            </div>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onSelectScreen(0);
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeScreenIndex === 0
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Home className="w-4 h-4" />
                <span>1. Accueil (Feed Social)</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20">Feed</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onSelectScreen(1);
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeScreenIndex === 1
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Film className="w-4 h-4" />
                <span>2. Wameet Reels</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20">Reels</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onSelectScreen(2);
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeScreenIndex === 2
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4" />
                <span>3. Wameet Chats</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20">Direct</span>
            </button>
          </div>

          {/* Section 2 : Univers Wameet & Outils Phygitaux */}
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1">
              Univers & Outils
            </div>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onOpenVip();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>Espaces VIP & Salons</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onOpenShop();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-[#2563EB] transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 text-[#2563EB]" />
                <span>Wameet Shop</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onOpenCagnotte();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Gift className="w-4 h-4 text-rose-500" />
                <span>Cagnotte & Tontine</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onOpenDelivery();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Bike className="w-4 h-4 text-emerald-500" />
                <span>Swarm Delivery Heatmap</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onOpenContacts();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-indigo-500" />
                <span>Synchroniser Contacts</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {onOpenWameetGenerator && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onOpenWameetGenerator();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-[#4169E1] transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Video className="w-4 h-4 text-[#4169E1]" />
                  <span>Générateur Wameet (Salon Privé)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>

          {/* Section 3 : Paramètres & Confidentialité */}
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1">
              Configuration
            </div>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onOpenSettings();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-slate-600" />
                <span>Paramètres & Confidentialité</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Section 4 : Pont & Écosystème */}
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onOpenCampus();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <GraduationCap className="w-4 h-4 text-[#2563EB]" />
                <span>Campus Privé</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onBackToDashboard();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>QG Nanasore POS</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Pied de page du tiroir */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Chiffré de bout en bout</span>
          </div>
          <span className="font-mono text-[10px]">Wameet v2.5</span>
        </div>
      </div>
    </div>
  );
};

export default WameetNavigationDrawer;
