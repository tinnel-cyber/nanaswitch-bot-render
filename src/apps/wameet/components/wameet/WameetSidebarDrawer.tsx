import React from 'react';
import {
  X,
  ShoppingBag,
  Coins,
  MapPin,
  Rocket,
  Settings,
  Wallet,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Lock,
  ArrowRight,
  Crown
} from 'lucide-react';
import { WameetProfileData } from '../../../../pages/wameet/WameetSupraApp';
import { playTapBeep } from '../../../../utils/audio';

export interface WameetSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: WameetProfileData;
  onOpenLiveShopping: () => void;
  onOpenCagnotte: () => void;
  onOpenSwarmDelivery: () => void;
  onOpenNanaPosPromo: () => void;
  onOpenPrivacySettings: () => void;
  onOpenWallet: () => void;
  onOpenCreateVip?: () => void;
  walletBalanceFcfa?: number;
}

/**
 * COMPOSANT SidebarDrawer (Prompt 43)
 * Directives UI/UX au millimètre :
 * - Overlay : bg-black/50 backdrop-blur-sm fixed inset-0 z-50
 * - Tiroir : w-4/5 max-w-sm h-full bg-white shadow-2xl transition-transform fixed inset-y-0 left-0 z-50
 * - Section 1 : Raccourcis Fonctionnels : "🛒 Live Shopping (Studio)", "💸 Farotage & Cagnottes", "📍 Swarm Delivery (Livreurs)"
 * - Section 2 : Page Promotionnelle NaNa POS : Gros bouton distinct "🚀 Passer Pro avec NaNa POS"
 * - Section 3 : Paramètres et Compte : "⚙️ Paramètres de confidentialité", "Mon Wallet Wameet"
 */
export const WameetSidebarDrawer: React.FC<WameetSidebarDrawerProps> = ({
  isOpen,
  onClose,
  profile,
  onOpenLiveShopping,
  onOpenCagnotte,
  onOpenSwarmDelivery,
  onOpenNanaPosPromo,
  onOpenPrivacySettings,
  onOpenWallet,
  onOpenCreateVip,
  walletBalanceFcfa = 145000
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-200">
      {/* 1. L'Overlay : fond sombre flouté */}
      <div
        className="bg-black/50 backdrop-blur-sm fixed inset-0 z-50 transition-opacity"
        onClick={() => {
          playTapBeep();
          onClose();
        }}
        aria-label="Fermer le tiroir"
      />

      {/* 2. Le Tiroir : glisse depuis la gauche w-4/5 max-w-sm h-full bg-white shadow-2xl */}
      <aside
        className="w-4/5 max-w-sm h-full bg-white shadow-2xl transition-transform fixed inset-y-0 left-0 z-50 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-250"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.8rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.8rem)'
        }}
      >
        {/* ===================================================================
            EN-TÊTE ÉPURÉ DU TIROIR : Profil & Identité Utilisateur
           =================================================================== */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-b from-blue-50/60 to-white">
          <div className="flex items-start justify-between gap-3 mb-3.5">
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
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onClose();
              }}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer border border-slate-200/60"
              aria-label="Fermer le menu latéral"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900 leading-tight">
              {profile.name}
            </h3>
            <p className="text-xs font-bold text-[#2563EB]">
              {profile.handle}
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100/80 text-[10px] font-black text-[#2563EB] border border-blue-200/80 max-w-full truncate">
                <span>{profile.statusBadge}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ===================================================================
            CORPS DÉFILANT DU MENU LATÉRAL
           =================================================================== */}
        <div className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
          {/* -----------------------------------------------------------------
              SECTION 1 : RACCOURCIS FONCTIONNELS (Sans désordre)
              Liste propre avec icônes :
              - "🛒 Live Shopping (Studio)"
              - "💸 Farotage & Cagnottes"
              - "📍 Swarm Delivery (Livreurs)"
             ----------------------------------------------------------------- */}
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
              Outils & Expériences
            </div>

            <div className="space-y-1.5">
              {/* 1. 🛒 Live Shopping (Studio) */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onOpenLiveShopping();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-rose-50/80 border border-slate-200/70 hover:border-rose-200 text-left transition-all cursor-pointer group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 group-hover:text-rose-700 transition-colors">
                      🛒 Live Shopping (Studio)
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      Ventes en direct & commandes instantanées
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* 2. 💸 Farotage & Cagnottes */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onOpenCagnotte();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-amber-50/80 border border-slate-200/70 hover:border-amber-200 text-left transition-all cursor-pointer group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 group-hover:text-amber-800 transition-colors">
                      💸 Farotage & Cagnottes
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      Tontine phygitale & cagnottes d'anniversaire
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* 3. 📍 Swarm Delivery (Livreurs) */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onOpenSwarmDelivery();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/80 border border-slate-200/70 hover:border-emerald-200 text-left transition-all cursor-pointer group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 group-hover:text-emerald-800 transition-colors">
                      📍 Swarm Delivery (Livreurs)
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      Enchères logistiques & tracking en direct
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* 4. 👑 Salon VIP (Abonnements & Salles) */}
              {onOpenCreateVip && (
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    onOpenCreateVip();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-amber-50/80 border border-slate-200/70 hover:border-amber-200 text-left transition-all cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 group-hover:text-amber-800 transition-colors">
                        👑 Salon VIP (Abonnements)
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        Monétisez vos masterclasses & cercles privés
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </div>
          </div>

          {/* -----------------------------------------------------------------
              SECTION 2 : LA PAGE PROMOTIONNELLE NANA POS (Isolée)
              Gros bouton distinct : "🚀 Passer Pro avec NaNa POS"
             ----------------------------------------------------------------- */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white shadow-xl border border-blue-500/30 space-y-3 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#2563EB]/20 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                <span>Commerce Physique & Caisse</span>
              </span>
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-sm bg-amber-400 text-slate-950">
                PRO
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-black tracking-tight leading-snug">
                Vous possédez aussi une boutique physique ?
              </h4>
              <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                Reliez vos Reels Wameet à la caisse enregistreuse NaNa POS : encaissement comptoir, scanner & stock synchronisé.
              </p>
            </div>

            {/* Gros bouton distinct qui ouvre la page dédiée */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onOpenNanaPosPromo();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-[#2563EB] hover:bg-blue-600 active:scale-95 text-white text-xs font-black shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Rocket className="w-4 h-4 text-amber-300 animate-bounce" />
              <span>🚀 Passer Pro avec NaNa POS</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          {/* -----------------------------------------------------------------
              SECTION 3 : PARAMÈTRES ET COMPTE
              En bas du tiroir :
              - "⚙️ Paramètres de confidentialité"
              - "Mon Wallet Wameet"
             ----------------------------------------------------------------- */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
              Compte & Sécurité Financière
            </div>

            <div className="space-y-1.5">
              {/* Mon Wallet Wameet */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onOpenWallet();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/70 hover:border-blue-200 text-left transition-all cursor-pointer group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#2563EB] flex items-center justify-center shrink-0 group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 group-hover:text-[#2563EB] transition-colors flex items-center gap-1.5">
                      <span>Mon Wallet Wameet</span>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-sm border border-emerald-200">
                        {walletBalanceFcfa.toLocaleString('fr-FR')} F
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      Solde disponible, retraits Mobile Money & Escrow
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* ⚙️ Paramètres de confidentialité */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onOpenPrivacySettings();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-left transition-all cursor-pointer group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-200/60 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 group-hover:text-slate-800 transition-colors">
                      ⚙️ Paramètres de confidentialité
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      Double-ticks, présence en ligne & sécurité 2FA
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ===================================================================
            PIED DU TIROIR : Rassurance & Cryptographie de Bout en Bout
           =================================================================== */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Chiffré de bout en bout</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 font-bold">Wameet v2.5</span>
        </div>
      </aside>
    </div>
  );
};

export default WameetSidebarDrawer;
