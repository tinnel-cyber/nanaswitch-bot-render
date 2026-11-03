import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Store,
  ArrowRight,
  CheckCircle2,
  Rocket,
  ShieldCheck,
  Smartphone,
  Video,
  ShoppingBag,
  ExternalLink,
  Loader2,
  DollarSign,
  TrendingUp,
  X
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import {
  upgradeWameetUserToNanasore,
  checkUserHasNanasoreStore,
  NanasoreShopDocument
} from '../../../../services/nanasoreBridgeService';

export interface WameetMonetizationBridgeBannerProps {
  userProfile: {
    name: string;
    handle: string;
    avatarUrl: string;
    phone?: string;
  };
  currentUserUid?: string;
  onOpenNanasoreDashboard: () => void;
  className?: string;
}

export const WameetMonetizationBridgeBanner: React.FC<WameetMonetizationBridgeBannerProps> = ({
  userProfile,
  currentUserUid,
  onOpenNanasoreDashboard,
  className = ''
}) => {
  const [hasStore, setHasStore] = useState<boolean>(false);
  const [shopData, setShopData] = useState<NanasoreShopDocument | null>(null);
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);
  const [upgradeStep, setUpgradeStep] = useState<number>(0);
  const [showCelebrationModal, setShowCelebrationModal] = useState<boolean>(false);

  const UPGRADE_STEPS = [
    { title: 'Vérification du compte Wameet', desc: 'UID partagé Firebase authentifié...' },
    { title: 'Génération de l’espace Nanasore', desc: 'Création du catalogue et des formations...' },
    { title: 'Connexion Orange / Wave / Moov', desc: 'Passerelles de paiement activées...' },
    { title: 'Ouverture du QG Vendeur', desc: 'Bienvenue sur votre Dashboard Nanasore !' }
  ];

  // Vérifier si l'utilisateur possède déjà une boutique
  useEffect(() => {
    let isMounted = true;
    checkUserHasNanasoreStore(currentUserUid).then(res => {
      if (isMounted) {
        setHasStore(res.hasStore);
        if (res.shopData) setShopData(res.shopData);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [currentUserUid]);

  const handleLaunchBridge = async () => {
    playTapBeep();

    // Si déjà vendeur, basculer directement sans recréer
    if (hasStore) {
      onOpenNanasoreDashboard();
      return;
    }

    setIsUpgrading(true);
    setUpgradeStep(0);

    // Étape 1
    const timer1 = setTimeout(() => setUpgradeStep(1), 300);
    // Étape 2
    const timer2 = setTimeout(() => setUpgradeStep(2), 650);
    // Étape 3
    const timer3 = setTimeout(() => setUpgradeStep(3), 1050);

    try {
      const result = await upgradeWameetUserToNanasore({
        uid: currentUserUid,
        name: userProfile.name,
        handle: userProfile.handle,
        avatarUrl: userProfile.avatarUrl,
        phone: userProfile.phone
      });

      setHasStore(true);
      if (result.shopData) setShopData(result.shopData);

      // Petite pause pour laisser l'animation de succès se terminer
      setTimeout(() => {
        playValidationBeep();
        setIsUpgrading(false);
        setShowCelebrationModal(true);
      }, 1400);
    } catch (err) {
      console.error('[WAMEET MONETIZATION BRIDGE] Erreur activation boutique :', err);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsUpgrading(false);
      // En cas de problème réseau, ouvrir tout de même le Dashboard (fallback résilient)
      onOpenNanasoreDashboard();
    }
  };

  const handleConfirmEnterDashboard = () => {
    playValidationBeep();
    setShowCelebrationModal(false);
    onOpenNanasoreDashboard();
  };

  return (
    <>
      {/* ============================================================== */}
      {/* 1. L'ENCART INCITATIF DE PROFIL WAMEET (BANNIÈRE MONÉTISATION) */}
      {/* ============================================================== */}
      <section
        className={`relative overflow-hidden rounded-[28px] p-5 sm:p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 border-2 border-indigo-500/40 shadow-xl shadow-indigo-950/40 text-white ${className}`}
      >
        {/* Lueur et reflets décoratifs d'arrière-plan */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Côté Gauche : Titre percutant & Avantages clés */}
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Passerelle de Monétisation Wameet ➔ Nanasore</span>
            </div>

            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white leading-tight">
              Monétisez votre audience. Ouvrez votre boutique ou lancez votre formation vidéo en 1 clic.
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Transformez chaque Reel Wameet et chaque discussion privée en vente directe. Vos abonnés achètent via le tiroir Nanasore et paient instantanément par Mobile Money (Orange, Wave, Moov).
            </p>

            {/* Badges Avantages Rapides */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold">
              <span className="px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Zéro re-login (Compte lié)
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-blue-300 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
                E-Commerce & Formations
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-amber-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                Mobile Money 1-Clic
              </span>
            </div>
          </div>

          {/* Côté Droit : Bouton d'action CTA interactif */}
          <div className="shrink-0 flex flex-col items-start sm:items-end justify-center gap-2">
            <button
              type="button"
              disabled={isUpgrading}
              onClick={handleLaunchBridge}
              className={`w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-lg cursor-pointer ${
                hasStore
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-emerald-900/40 border border-emerald-400/30'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/40 border border-white/20'
              }`}
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Activation de votre boutique...</span>
                </>
              ) : hasStore ? (
                <>
                  <Store className="w-4 h-4 text-emerald-200" />
                  <span>Gérer mon espace Nanasore</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                  <span>Créer mon espace Nanasore</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <span className="text-[10px] text-slate-400 font-semibold self-center sm:self-end">
              {hasStore ? '🟢 Espace Nanasore actif & synchronisé' : '⚡ Gratuit • Activation instantanée en 1 clic'}
            </span>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. OVERLAY ANIMÉ PENDANT LA CONSTRUCTION DE LA BOUTIQUE (UX) */}
      {/* ============================================================== */}
      {isUpgrading && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-[32px] bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/50 shadow-2xl text-white text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Icône animée */}
            <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Rocket className="w-10 h-10 text-white animate-bounce" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
              </span>
            </div>

            <div>
              <h3 className="text-xl font-black tracking-tight text-white">
                Construction de votre espace Nanasore...
              </h3>
              <p className="text-xs text-slate-300 mt-1 font-medium">
                Passerelle Zéro-Friction depuis votre compte Wameet {userProfile.handle}
              </p>
            </div>

            {/* Liste des étapes dynamiques */}
            <div className="space-y-2.5 text-left bg-black/30 p-4 rounded-2xl border border-white/10">
              {UPGRADE_STEPS.map((step, idx) => {
                const isPassed = upgradeStep > idx;
                const isCurrent = upgradeStep === idx;
                return (
                  <div
                    key={step.title}
                    className={`flex items-start gap-3 text-xs transition-opacity duration-300 ${
                      isPassed || isCurrent ? 'opacity-100' : 'opacity-35'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-500" />
                      )}
                    </div>
                    <div>
                      <p className={`font-bold ${isCurrent ? 'text-amber-300' : 'text-slate-200'}`}>
                        {step.title}
                      </p>
                      <p className="text-[10px] text-slate-400">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Barre de progression */}
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-2 transition-all duration-300"
                style={{ width: `${Math.min(100, (upgradeStep + 1) * 25)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MODALE DE CÉLÉBRATION ET OUVERTURE DU DASHBOARD NANASORE    */}
      {/* ============================================================== */}
      {showCelebrationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 sm:p-7 rounded-[32px] bg-gradient-to-b from-slate-900 to-indigo-950 border-2 border-emerald-500/50 shadow-2xl text-white text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                Félicitations • Boutique Active
              </span>
              <h3 className="text-xl font-black text-white">
                Votre espace Nanasore est prêt !
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Votre compte Wameet est désormais lié au Dashboard Nanasore. Vous pouvez ajouter des fiches produits, publier vos formations vidéo et encaisser par Mobile Money.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-left text-xs space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Nom de l'espace :</span>
                <span className="font-bold text-white">{shopData?.storeName || `Boutique ${userProfile.name}`}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Rôle attribué :</span>
                <span className="font-bold text-emerald-300">Vendeur & Formateur Certifié</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Paiements supportés :</span>
                <span className="font-bold text-amber-300">Orange • Wave • Moov</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleConfirmEnterDashboard}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <Store className="w-4 h-4" />
                <span>Ouvrir mon Dashboard Nanasore</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCelebrationModal(false)}
                className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WameetMonetizationBridgeBanner;
