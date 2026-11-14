import React, { useState } from 'react';
import {
  X,
  Video,
  Camera,
  Boxes,
  Store,
  Sparkles,
  Crown,
  Coins,
  ShieldCheck,
  Check,
  MapPin,
  Bike,
  Navigation,
  Car,
  ChevronRight,
  Flame,
  Radio,
  Sliders,
  DollarSign
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../../utils/audio';

// ===========================================================================
// 1. LE MODÈLE DE SAS RÉUTILISABLE : ActionBottomSheet
//    Directives : fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6
// ===========================================================================

export interface ActionBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ActionBottomSheet: React.FC<ActionBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  className = ''
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-200">
      {/* Backdrop sombre flouté */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          playTapBeep();
          onClose();
        }}
        aria-label="Fermer"
      />

      {/* Le Tiroir qui glisse du bas de l'écran */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 max-w-lg mx-auto max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 flex flex-col justify-between ${className}`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poignée de glissement tactile (Drag Handle) */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mb-4 shrink-0" />

        {/* En-tête du Sas */}
        <div className="flex items-start justify-between gap-3 mb-5 shrink-0">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/80">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-slate-500 font-medium mt-0.5 leading-snug">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps de configuration du Sas */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// ===========================================================================
// 2. SAS "LANCER UN LIVE SHOPPING" : LiveShoppingGatewayBottomSheet
//    Demande : Titre du Live, Catégorie, boutons de permission ("Autoriser Caméra", "Lier le catalogue Nanasore")
//    Gros bouton : "Démarrer le Live"
// ===========================================================================

export interface LiveShoppingConfig {
  title: string;
  category: string;
  cameraAllowed: boolean;
  nanaPosLinked: boolean;
}

export interface LiveShoppingGatewayBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchLive: (config: LiveShoppingConfig) => void;
}

export const LiveShoppingGatewayBottomSheet: React.FC<LiveShoppingGatewayBottomSheetProps> = ({
  isOpen,
  onClose,
  onLaunchLive
}) => {
  const [liveTitle, setLiveTitle] = useState('Vente Flash du Soir • Déstockage & Nouveautés 🔥');
  const [liveCategory, setLiveCategory] = useState('Mode & Beauté');
  const [cameraAllowed, setCameraAllowed] = useState(true);
  const [nanaPosLinked, setNanaPosLinked] = useState(true);

  const categories = [
    'Mode & Beauté',
    'Tech & Gadgets',
    'Formation & Coaching',
    'Alimentation & Saveurs',
    'Art & Artisanat'
  ];

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    onLaunchLive({
      title: liveTitle,
      category: liveCategory,
      cameraAllowed,
      nanaPosLinked
    });
    onClose();
  };

  return (
    <ActionBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Configuration du Live Shopping"
      subtitle="Préparez votre studio avant d'émettre en direct auprès de vos abonnés"
      icon={<Video className="w-5 h-5 text-rose-500" />}
    >
      <form onSubmit={handleStart} className="space-y-4">
        {/* 1. Titre du Live */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">
            Titre de la session en direct :
          </label>
          <input
            type="text"
            required
            value={liveTitle}
            onChange={(e) => setLiveTitle(e.target.value)}
            placeholder="Ex: Déstockage Bijoux & Robes de soirée..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#2563EB] text-xs font-semibold text-slate-900 focus:outline-none"
          />
        </div>

        {/* 2. Catégorie du Live */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1.5">
            Catégorie du Live Shopping :
          </label>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  playTapBeep();
                  setLiveCategory(cat);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  liveCategory === cat
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Les 2 Permissions Clés requises par le Sas */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            Permissions & Équipements
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Bouton Permission 1 : Autoriser Caméra */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setCameraAllowed((prev) => !prev);
              }}
              className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition cursor-pointer active:scale-95 ${
                cameraAllowed
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  cameraAllowed ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold flex items-center gap-1">
                  <span>Autoriser Caméra</span>
                  {cameraAllowed && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {cameraAllowed ? 'Flux vidéo HD activé' : 'Cliquez pour autoriser'}
                </div>
              </div>
            </button>

            {/* Bouton Permission 2 : Lier le catalogue Nanasore */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setNanaPosLinked((prev) => !prev);
              }}
              className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition cursor-pointer active:scale-95 ${
                nanaPosLinked
                  ? 'bg-blue-50/80 border-blue-300 text-blue-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  nanaPosLinked ? 'bg-[#2563EB] text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                <Boxes className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold flex items-center gap-1">
                  <span>Lier Nanasore</span>
                  {nanaPosLinked && <Check className="w-3.5 h-3.5 text-[#2563EB]" />}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {nanaPosLinked ? 'Catalogue relié' : 'Stock hors-ligne'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 4. Rassurance Financière Wameet & Affiliation */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>Commission Micro-relais fixée à 5%</span>
          </span>
          <span className="font-bold text-emerald-700">Wameet Escrow</span>
        </div>

        {/* 5. Gros Bouton "Démarrer le Live" */}
        <button
          type="submit"
          className="w-full py-3.5 px-4 rounded-2xl bg-[#2563EB] hover:bg-blue-700 active:scale-95 text-white text-xs font-black shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
          <span>Démarrer le Live Shopping</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </form>
    </ActionBottomSheet>
  );
};

// ===========================================================================
// 3. SAS "CRÉER UN SALON VIP" : VipLoungeGatewayBottomSheet
//    Demande : Nom du Salon, Prix de l'abonnement mensuel (via Wameet), Type de contenu
//    Gros bouton : "Créer le Salon VIP"
// ===========================================================================

export interface VipLoungeConfig {
  name: string;
  monthlyPriceFcfa: number;
  contentType: string;
  youtubeLiveUrl: string;
}

export interface VipLoungeGatewayBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchVip: (config: VipLoungeConfig) => void;
}

export const VipLoungeGatewayBottomSheet: React.FC<VipLoungeGatewayBottomSheetProps> = ({
  isOpen,
  onClose,
  onLaunchVip
}) => {
  const [loungeName, setLoungeName] = useState('Club Élite Business & Tontine Privée');
  const [monthlyPrice, setMonthlyPrice] = useState(10000);
  const [contentType, setContentType] = useState('Masterclasses & Réseau');
  const [youtubeLiveUrl, setYoutubeLiveUrl] = useState('https://www.youtube.com/watch?v=jfKfPfyJRdk');

  const contentTypes = [
    'Masterclasses & Réseau',
    'Coaching 1-sur-1 Privé',
    'Signaux Import-Export',
    'Tontine VIP Sécurisée'
  ];

  const pricePresets = [5000, 10000, 25000, 50000];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    playCashChime();
    onLaunchVip({
      name: loungeName,
      monthlyPriceFcfa: monthlyPrice,
      contentType,
      youtubeLiveUrl: youtubeLiveUrl.trim() || 'https://www.youtube.com/watch?v=jfKfPfyJRdk'
    });
    onClose();
  };

  return (
    <ActionBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Créer un Salon Privé VIP"
      subtitle="Monétisez vos conseils, cours et opportunités business via abonnements mensuels"
      icon={<Crown className="w-5 h-5 text-amber-500" />}
    >
      <form onSubmit={handleCreate} className="space-y-4">
        {/* 1. Nom du Salon */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">
            Nom de votre Salon VIP :
          </label>
          <input
            type="text"
            required
            value={loungeName}
            onChange={(e) => setLoungeName(e.target.value)}
            placeholder="Ex: Club Élite Entrepreneurs Ouaga..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-amber-500 text-xs font-semibold text-slate-900 focus:outline-none"
          />
        </div>

        {/* 2. Lien ou ID du Live YouTube (Stream HD Headless Wameet) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-800">
              Lien ou ID du Live YouTube :
            </label>
            <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
              HD SANS PUB
            </span>
          </div>
          <input
            type="text"
            value={youtubeLiveUrl}
            onChange={(e) => setYoutubeLiveUrl(e.target.value)}
            placeholder="Ex: https://youtube.com/live/xyz... ou ID YouTube"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-amber-500 text-xs font-semibold text-slate-900 focus:outline-none"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Lecteur Wameet natif sans contrôles YouTube, optimisé pour la stabilité et l'économie de bande passante.
          </p>
        </div>

        {/* 3. Prix de l'abonnement mensuel (via Wameet) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-800">
              Tarif abonnement mensuel (Wameet) :
            </label>
            <span className="text-xs font-black text-amber-600">
              {monthlyPrice.toLocaleString('fr-FR')} FCFA / mois
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {pricePresets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  playTapBeep();
                  setMonthlyPrice(p);
                }}
                className={`py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  monthlyPrice === p
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p / 1000}k F
              </button>
            ))}
          </div>

          <input
            type="range"
            min={2000}
            max={100000}
            step={1000}
            value={monthlyPrice}
            onChange={(e) => setMonthlyPrice(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* 4. Type de Contenu VIP */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1.5">
            Nature des avantages proposés :
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {contentTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  playTapBeep();
                  setContentType(t);
                }}
                className={`p-2.5 rounded-xl text-xs font-bold border text-left transition cursor-pointer ${
                  contentType === t
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Rassurance Sécurisée */}
        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Fonds séquestrés automatiquement via Wameet Escrow chaque 1er du mois.</span>
        </div>

        {/* 6. Gros Bouton "Créer le Salon VIP" */}
        <button
          type="submit"
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white text-xs font-black shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Crown className="w-4 h-4 text-white" />
          <span>Créer mon Salon VIP</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </form>
    </ActionBottomSheet>
  );
};

// ===========================================================================
// 4. SAS "LIVREUR SWARM DELIVERY" : SwarmDeliveryGatewayBottomSheet
//    Demande : Activation du GPS ("Partager ma position en arrière-plan"), Validation du véhicule
//    Gros bouton : "Ouvrir la Heatmap"
// ===========================================================================

export interface SwarmDeliveryConfig {
  gpsEnabled: boolean;
  vehicleType: 'moto' | 'velo' | 'voiture';
  radiusKm: number;
}

export interface SwarmDeliveryGatewayBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchDelivery: (config: SwarmDeliveryConfig) => void;
}

export const SwarmDeliveryGatewayBottomSheet: React.FC<SwarmDeliveryGatewayBottomSheetProps> = ({
  isOpen,
  onClose,
  onLaunchDelivery
}) => {
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [vehicleType, setVehicleType] = useState<'moto' | 'velo' | 'voiture'>('moto');
  const [radiusKm, setRadiusKm] = useState(5);

  const vehicles = [
    { id: 'moto' as const, label: 'Moto / Scooter', icon: Bike, desc: 'Rapide en ville (< 10kg)' },
    { id: 'velo' as const, label: 'Vélo Électrique', icon: Navigation, desc: 'Quartiers denses (< 5kg)' },
    { id: 'voiture' as const, label: 'Voiture / Fourgon', icon: Car, desc: 'Gros volumes & cartons' }
  ];

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    onLaunchDelivery({
      gpsEnabled,
      vehicleType,
      radiusKm
    });
    onClose();
  };

  return (
    <ActionBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Accès Espace Livreur Swarm"
      subtitle="Participez aux enchères de livraison locales et suivez les courses en direct"
      icon={<MapPin className="w-5 h-5 text-emerald-600" />}
    >
      <form onSubmit={handleLaunch} className="space-y-4">
        {/* 1. Activation du GPS (Obligatoire) */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1.5">
            Géolocalisation & Enchères temps réel :
          </label>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setGpsEnabled((prev) => !prev);
            }}
            className={`w-full p-3 rounded-2xl border text-left flex items-start justify-between gap-3 transition cursor-pointer active:scale-95 ${
              gpsEnabled
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : 'bg-rose-50/80 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  gpsEnabled ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}
              >
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">
                  {gpsEnabled ? '✓ GPS & Position en arrière-plan Actifs' : '⚠️ GPS Inactif'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Précision 3m • Requis pour capter les courses les plus proches
                </div>
              </div>
            </div>

            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                gpsEnabled
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}
            >
              {gpsEnabled ? 'Connecté' : 'Désactivé'}
            </span>
          </button>
        </div>

        {/* 2. Validation du Véhicule */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1.5">
            Sélectionnez votre type de véhicule :
          </label>
          <div className="space-y-1.5">
            {vehicles.map((v) => {
              const Icon = v.icon;
              const isSelected = vehicleType === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setVehicleType(v.id);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{v.label}</div>
                      <div className="text-[10px] text-slate-500">{v.desc}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Rayon d'action maximal */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-800">
              Rayon maximal des enchères :
            </label>
            <span className="text-xs font-black text-emerald-700">
              {radiusKm} km autour de vous
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={25}
            step={1}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        {/* 4. Gros Bouton "Ouvrir la Heatmap" */}
        <button
          type="submit"
          className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Navigation className="w-4 h-4 text-white" />
          <span>Activer le Mode Livreur & Ouvrir la Heatmap</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </form>
    </ActionBottomSheet>
  );
};

export default ActionBottomSheet;
