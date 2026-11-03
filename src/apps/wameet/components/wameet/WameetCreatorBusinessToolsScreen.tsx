import React, { useState } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Crown,
  Truck,
  Sparkles,
  Sliders,
  Radio,
  Share2,
  CheckCircle2,
  Check,
  AlertCircle,
  Building,
  Store,
  Layers,
  ChevronRight,
  TrendingUp,
  MapPin,
  Clock,
  ExternalLink,
  ShieldCheck,
  Package,
  Users,
  Settings2,
  Zap,
  Info
} from 'lucide-react';
import {
  playTapBeep,
  playValidationBeep,
  playCashChime
} from '../../../../utils/audio';

export interface WameetCreatorBusinessToolsScreenProps {
  onBack?: () => void;
  onNavigateToVipRooms?: () => void;
  className?: string;
}

export interface VipRoomItem {
  id: string;
  title: string;
  type: 'course_room' | 'business_lounge';
  subscriptionPriceFcfa: number;
  activeSubscribersCount: number;
  monthlyRevenueFcfa: number;
  status: 'active' | 'draft' | 'live_now';
  lastActivity: string;
}

/**
 * PROMPT 37 : L'Écran "Outils Business & Créateur" (Liaison NaNa POS)
 * Panneau de configuration expert pour vendeurs, formateurs et créateurs Wameet.
 * 
 * Directives UI/UX au millimètre :
 * 1. Statut d'intégration NaNa POS :
 *    - Bloc statut "Synchronisation NaNa POS" avec un point vert clignotant "Connecté".
 *    - Bouton "Forcer la synchronisation des stocks".
 * 2. Paramètres des Lives Shopping :
 *    - Curseur (slider) pour définir la "Commission d'affiliation par défaut" (ex: 5%) pour le système Micro-relais.
 * 3. Gestion des Espaces VIP :
 *    - Liste des Salles/Salons actifs créés par l'utilisateur, avec le nombre d'abonnés payants actuels.
 * 4. Paramètres Logistiques (Swarm Delivery) :
 *    - Rayon de livraison maximal pour les enchères logistiques (ex: "Accepter livreurs à moins de 5km").
 */
export const WameetCreatorBusinessToolsScreen: React.FC<WameetCreatorBusinessToolsScreenProps> = ({
  onBack,
  onNavigateToVipRooms,
  className = ''
}) => {
  // 1. États de Synchronisation NaNa POS
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Il y a 3 minutes');
  const [syncedItemsCount, setSyncedItemsCount] = useState<number>(142);
  const [posStoreName] = useState<string>('Boutique Traoré Mode & Luxe - Caisse #POS-01');

  // 2. Paramètres des Lives Shopping & Micro-relais
  const [affiliateCommission, setAffiliateCommission] = useState<number>(5); // 5% par défaut
  const [allowInstantWStories, setAllowInstantWStories] = useState<boolean>(true);
  const [highlightNanaBadge, setHighlightNanaBadge] = useState<boolean>(true);

  // 3. Gestion des Espaces VIP (Salles de Cours & Salons)
  const [vipRooms, setVipRooms] = useState<VipRoomItem[]>([
    {
      id: 'room-1',
      title: 'Masterclass E-commerce & Importation Asie',
      type: 'course_room',
      subscriptionPriceFcfa: 15000,
      activeSubscribersCount: 48,
      monthlyRevenueFcfa: 720000,
      status: 'active',
      lastActivity: 'Module 4 publié ce matin'
    },
    {
      id: 'room-2',
      title: 'Business Lounge - Cercle d’Investisseurs Privé',
      type: 'business_lounge',
      subscriptionPriceFcfa: 25000,
      activeSubscribersCount: 32,
      monthlyRevenueFcfa: 800000,
      status: 'live_now',
      lastActivity: 'Webinaire Privé en cours'
    },
    {
      id: 'room-3',
      title: 'Coaching Juridique & Fiscalité OHADA',
      type: 'course_room',
      subscriptionPriceFcfa: 10000,
      activeSubscribersCount: 19,
      monthlyRevenueFcfa: 190000,
      status: 'active',
      lastActivity: 'Q&A hebdomadaire vendredi'
    }
  ]);

  // 4. Paramètres Logistiques (Swarm Delivery)
  const [maxDeliveryRadiusKm, setMaxDeliveryRadiusKm] = useState<number>(5); // 5 km par défaut
  const [dispatchMode, setDispatchMode] = useState<'bidding' | 'fastest'>('bidding');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number>(20);

  // 5. Toast & Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleBack = () => {
    playTapBeep();
    if (onBack) onBack();
    else if (typeof window !== 'undefined' && window.history.length > 1) window.history.back();
  };

  // Action : Forcer la synchronisation des stocks NaNa POS
  const handleForceSync = () => {
    if (isSyncing) return;
    playTapBeep();
    setIsSyncing(true);

    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime('À l’instant');
      setSyncedItemsCount((prev) => prev + 3);
      playValidationBeep();
      showToast('✅ Stocks NaNa POS synchronisés avec succès (145 articles à jour).');
    }, 1200);
  };

  // Calcul du revenu mensuel récurrent total des Espaces VIP
  const totalMonthlyVipRevenue = vipRooms.reduce((acc, r) => acc + r.monthlyRevenueFcfa, 0);
  const totalActiveSubscribers = vipRooms.reduce((acc, r) => acc + r.activeSubscribersCount, 0);

  // Simulation de calcul de commission d'affiliation
  const sampleProductPrice = 20000;
  const sampleAffiliateCut = Math.round((sampleProductPrice * affiliateCommission) / 100);
  const sampleSellerCut = sampleProductPrice - sampleAffiliateCut;

  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] selection:bg-indigo-500/20 selection:text-indigo-700 ${className}`}
    >
      {/* Toast de confirmation flottant avec accélération matérielle */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-bounce-subtle transform-gpu will-change-transform">
          <div className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* =====================================================================
          1. HEADER NAVIGATION (44x44 TAP TARGET & SAFE AREA TOP)
         ===================================================================== */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* FIXED: Tap Target 44x44px standard ergonomique */}
          <button
            type="button"
            onClick={handleBack}
            className="w-11 h-11 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
              <span>Outils Business & Créateur</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                PRO Studio
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              Passerelle NaNa POS, Espaces VIP & Logistique Swarm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Certifié NaNa</span>
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* =====================================================================
            DIRECTIVE PROMPT 37 : 1. STATUT D'INTÉGRATION NANA POS
            - Bloc statut : "Synchronisation NaNa POS" avec point vert clignotant "Connecté"
            - Bouton "Forcer la synchronisation des stocks"
           ===================================================================== */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          {/* Lueur décorative */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner mt-0.5">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Synchronisation NaNa POS
                  </h3>

                  {/* POINT VERT CLIGNOTANT "CONNECTÉ" */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200/60 dark:border-emerald-800/60">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span>Connecté</span>
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {posStoreName}
                </p>
              </div>
            </div>
          </div>

          {/* Grille d'indicateurs de statut */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4 text-xs">
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
              <span className="text-[10px] text-slate-400 block font-medium">Articles synchronisés</span>
              <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                {syncedItemsCount} articles
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
              <span className="text-[10px] text-slate-400 block font-medium">Protocole M2M</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>WebSockets TLS</span>
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 block font-medium">Dernière mise à jour</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5 block">
                {lastSyncTime}
              </span>
            </div>
          </div>

          {/* BOUTON D'ACTION : FORCER LA SYNCHRONISATION DES STOCKS */}
          <button
            type="button"
            onClick={handleForceSync}
            disabled={isSyncing}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-sm disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing
                ? 'Synchronisation des stocks en cours...'
                : 'Forcer la synchronisation des stocks'}
            </span>
          </button>
        </div>

        {/* =====================================================================
            DIRECTIVE PROMPT 37 : 2. PARAMÈTRES DES LIVES SHOPPING (MICRO-RELAIS)
            - Curseur (slider) pour définir la "Commission d'affiliation par défaut" (ex: 5%)
           ===================================================================== */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Paramètres des Lives Shopping & Affiliation
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Rémunération du réseau Micro-relais Wameet
                </p>
              </div>
            </div>

            <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
              {affiliateCommission}% de commission
            </span>
          </div>

          {/* LE SLIDER DE COMMISSION D'AFFILIATION */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <label htmlFor="affiliate-slider">Commission d'affiliation par défaut</label>
              <span className="text-purple-600 dark:text-purple-400 font-black">
                {affiliateCommission} %
              </span>
            </div>

            <input
              id="affiliate-slider"
              type="range"
              min={1}
              max={30}
              step={1}
              value={affiliateCommission}
              onChange={(e) => {
                setAffiliateCommission(Number(e.target.value));
              }}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
              <span>1% (Discret)</span>
              <span>5% (Recommandé)</span>
              <span>15% (Attractif)</span>
              <span>30% (Super Relais)</span>
            </div>
          </div>

          {/* CALCULATEUR EN DIRECT : ESTIMATION DE GAIN */}
          <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-200">
              <Info className="w-3.5 h-3.5 text-purple-600" />
              <span>Simulation sur une vente moyenne de 20 000 FCFA :</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-purple-800 dark:text-purple-300 pt-1">
              <span>Gain de l'affilié ({affiliateCommission}%) :</span>
              <strong className="font-black text-purple-700 dark:text-purple-300">
                {sampleAffiliateCut.toLocaleString('fr-FR')} FCFA
              </strong>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
              <span>Votre encaissement net boutique :</span>
              <strong className="font-black text-slate-900 dark:text-white">
                {sampleSellerCut.toLocaleString('fr-FR')} FCFA
              </strong>
            </div>
          </div>

          {/* OPTION SUPPLÉMENTAIRE : REPARTAGE INSTANTANÉ STORIES WAMEET */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div
              onClick={() => {
                playTapBeep();
                setAllowInstantWStories(!allowInstantWStories);
                showToast(
                  !allowInstantWStories
                    ? 'Repartage Stories Wameet activé'
                    : 'Repartage Stories Wameet restreint'
                );
              }}
              className="flex items-center justify-between gap-3 cursor-pointer select-none"
            >
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  Repartage instantané en Stories Wameet
                </h4>
                <p className="text-[10px] sm:text-[11px] text-slate-400">
                  Génère automatiquement une capsule 15s avec lien de parrainage pour vos relais
                </p>
              </div>

              {/* iOS Switch */}
              <div
                className={`w-10 h-5.5 rounded-full transition-colors relative shrink-0 ${
                  allowInstantWStories ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transform transition-transform absolute top-0.5 left-0.5 ${
                    allowInstantWStories ? 'translate-x-4.5' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            DIRECTIVE PROMPT 37 : 3. GESTION DES ESPACES VIP
            - Liste des Salles/Salons actifs créés par l'utilisateur
            - Nombre d'abonnés payants actuels
           ===================================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Gestion des Espaces VIP
              </h3>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40">
              <Users className="w-3 h-3" />
              <span>{totalActiveSubscribers} abonnés au total</span>
            </div>
          </div>

          <div className="space-y-3">
            {vipRooms.map((room) => (
              <div
                key={room.id}
                className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        room.type === 'course_room'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {room.type === 'course_room' ? 'Salle de Cours (LMS)' : 'Salon VIP Business'}
                    </span>

                    {room.status === 'live_now' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 text-[10px] font-black animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                        <span>LIVE</span>
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {room.subscriptionPriceFcfa.toLocaleString('fr-FR')} FCFA
                    </span>
                    <span className="text-[10px] text-slate-400 block">/ mois</span>
                  </div>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {room.title}
                </h4>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                      <Users className="w-3.5 h-3.5 text-amber-500" />
                      <span>{room.activeSubscribersCount} abonnés payants</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      {room.lastActivity}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      if (onNavigateToVipRooms) onNavigateToVipRooms();
                      else showToast(`Ouverture de ${room.title}`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 hover:text-amber-600 text-[11px] font-bold transition-all flex items-center gap-1"
                  >
                    <span>Gérer</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Récapitulatif MRR & Bouton de création */}
          <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                Revenus Mensuels Récurrents (MRR VIP)
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {totalMonthlyVipRevenue.toLocaleString('fr-FR')} FCFA / mois
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                showToast('Le Studio NaNa POS est prêt pour créer une nouvelle Salle ou Salon.');
              }}
              className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
            >
              Créer un nouvel Espace VIP
            </button>
          </div>
        </div>

        {/* =====================================================================
            DIRECTIVE PROMPT 37 : 4. PARAMÈTRES LOGISTIQUES (SWARM DELIVERY)
            - Rayon de livraison maximal pour les enchères logistiques (ex: "Accepter livreurs à moins de 5km")
           ===================================================================== */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-inner">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Paramètres Logistiques (Swarm Delivery)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Flotte autonome de motos & coursiers NaNa
                </p>
              </div>
            </div>

            <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300">
              Rayon : {maxDeliveryRadiusKm} km
            </span>
          </div>

          {/* SÉLECTEUR DE RAYON DE LIVRAISON */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <label htmlFor="radius-slider">
                Rayon de livraison maximal pour les enchères logistiques
              </label>
              <span className="text-cyan-600 dark:text-cyan-400 font-black">
                {maxDeliveryRadiusKm} km
              </span>
            </div>

            <input
              id="radius-slider"
              type="range"
              min={1}
              max={25}
              step={1}
              value={maxDeliveryRadiusKm}
              onChange={(e) => setMaxDeliveryRadiusKm(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />

            {/* Paliers rapides cliquables */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[2, 5, 10, 20].map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setMaxDeliveryRadiusKm(km);
                  }}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                    maxDeliveryRadiusKm === km
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
              Seuls les coursiers NaNa Swarm géolocalisés à moins de{' '}
              <strong className="text-cyan-600 font-bold">{maxDeliveryRadiusKm} km</strong> de votre
              magasin recevront les notifications d'enlèvement express.
            </p>
          </div>

          {/* MODE D'ATTRIBUTION DES COURSES */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Algorithme d'attribution des courses
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setDispatchMode('bidding');
                  showToast('Mode enchère au mieux-disant activé');
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  dispatchMode === 'bidding'
                    ? 'border-cyan-500 bg-cyan-50/30 dark:bg-cyan-950/30 ring-1 ring-cyan-500'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Enchère au mieux-disant</span>
                  {dispatchMode === 'bidding' && (
                    <Check className="w-4 h-4 text-cyan-600" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Optimise le tarif de livraison pour vous et vos clients
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setDispatchMode('fastest');
                  showToast('Mode rapidité maximale activé');
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  dispatchMode === 'fastest'
                    ? 'border-cyan-500 bg-cyan-50/30 dark:bg-cyan-950/30 ring-1 ring-cyan-500'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Premier disponible</span>
                  {dispatchMode === 'fastest' && (
                    <Check className="w-4 h-4 text-cyan-600" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Prise en charge ultra-rapide en moins de 15 minutes
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            BOUTON DE SAUVEGARDE GLOBALE DES PARAMÈTRES
           ===================================================================== */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              playValidationBeep();
              showToast('✨ Tous les paramètres professionnels NaNa ont été enregistrés !');
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Enregistrer la configuration professionnelle</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WameetCreatorBusinessToolsScreen;
