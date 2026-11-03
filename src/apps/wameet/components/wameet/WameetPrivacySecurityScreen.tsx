import React, { useState } from 'react';
import {
  ArrowLeft,
  Lock,
  ShieldCheck,
  CheckCheck,
  Eye,
  MapPin,
  KeyRound,
  Laptop,
  Fingerprint,
  UserX,
  Clock,
  ChevronRight,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  X,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface WameetPrivacySecurityScreenProps {
  onBack?: () => void;
  className?: string;
}

interface LinkedDevice {
  id: string;
  name: string;
  platform: string;
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

/**
 * Composant Interrupteur ToggleRow (Style iOS)
 */
interface ToggleRowProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = React.memo(({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled = false
}) => {
  return (
    <div
      onClick={() => {
        if (!disabled) {
          playTapBeep();
          onChange(!checked);
        }
      }}
      className={`min-h-[52px] p-4 flex items-start justify-between gap-4 transition-colors select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon && <div className="mt-0.5 shrink-0 text-slate-500 dark:text-slate-400">{icon}</div>}
        <div className="min-w-0">
          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
            {title}
          </h4>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Switch Toggle Style iOS (Vert émeraude quand activé, transform-gpu anti-jank) */}
      <div
        className={`w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0 mt-0.5 ${
          checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow-md transform-gpu will-change-transform transition-transform duration-200 absolute top-0.5 left-0.5 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  );
});

ToggleRow.displayName = 'ToggleRow';

/**
 * PROMPT 35 : L'Écran "Compte & Confidentialité" (Style Wameet Épuré)
 * Mission : UI/UX - Écran "Confidentialité & Sécurité" (Wameet)
 * 
 * Directives UI/UX au millimètre :
 * - Header de Rassurance : Grande bannière subtile avec un cadenas vert et le texte :
 *   "Vos discussions et transactions financières sont chiffrées de bout en bout."
 * - Composant ToggleRow (Interrupteurs style iOS, vert quand activé) :
 *   - "Confirmations de lecture" (double-ticks bleus)
 *   - "Présence en ligne" (qui peut voir quand je suis en ligne)
 *   - "Autoriser le GPS pour les Cadeaux Mystères" (spécifique Wameet)
 * - Section Sécurité Renforcée :
 *   - "Vérification en deux étapes (2FA)" : Protège l'accès au Wallet Wameet
 *   - "Appareils liés" : Voir si le compte est connecté sur Wameet Web
 */
export const WameetPrivacySecurityScreen: React.FC<WameetPrivacySecurityScreenProps> = ({
  onBack,
  className = ''
}) => {
  // 1. États des Toggles (useState)
  const [readReceipts, setReadReceipts] = useState<boolean>(true);
  const [onlinePresence, setOnlinePresence] = useState<boolean>(true);
  const [gpsMysteryGift, setGpsMysteryGift] = useState<boolean>(true);
  const [biometricLock, setBiometricLock] = useState<boolean>(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);

  // 2. Modales & Sous-menus
  const [show2FaModal, setShow2FaModal] = useState<boolean>(false);
  const [twoFaPin, setTwoFaPin] = useState<string>('');
  const [showLinkedDevicesModal, setShowLinkedDevicesModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 3. Liste des appareils liés (Wameet Web)
  const [linkedDevices, setLinkedDevices] = useState<LinkedDevice[]>([
    {
      id: 'dev-1',
      name: 'Wameet Web pour Mac',
      platform: 'macOS Sonoma',
      browser: 'Google Chrome 132',
      location: 'Abidjan, Côte d’Ivoire',
      lastActive: 'Actif maintenant',
      isCurrent: false
    },
    {
      id: 'dev-2',
      name: 'Wameet Desktop Windows',
      platform: 'Windows 11 Pro',
      browser: 'Application Native',
      location: 'Dakar, Sénégal',
      lastActive: 'Il y a 3 heures',
      isCurrent: false
    }
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleBack = () => {
    playTapBeep();
    if (onBack) onBack();
    else if (typeof window !== 'undefined' && window.history.length > 1) window.history.back();
  };

  const handleSave2FaPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFaPin.length !== 6) return;
    playValidationBeep();
    setTwoFactorEnabled(true);
    setShow2FaModal(false);
    showToast('🔒 Vérification en deux étapes activée pour votre Wallet Wameet !');
  };

  const handleDisconnectDevice = (deviceId: string) => {
    playValidationBeep();
    setLinkedDevices((prev) => prev.filter((d) => d.id !== deviceId));
    showToast('Appareil déconnecté avec succès.');
  };

  const handleDisconnectAllDevices = () => {
    playValidationBeep();
    setLinkedDevices([]);
    showToast('Toutes les sessions Wameet Web ont été fermées.');
  };

  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(3rem,calc(env(safe-area-inset-bottom)+2rem))] selection:bg-emerald-500/20 selection:text-emerald-700 ${className}`}
    >
      {/* Toast de notification flottante avec accélération matérielle */}
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
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center gap-2">
        {/* FIXED: Zone tactile standard 44x44 px */}
        <button
          type="button"
          onClick={handleBack}
          className="w-11 h-11 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex items-center justify-center shrink-0"
          title="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
            Confidentialité & Sécurité
          </h1>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
            Gestion de la visibilité et protection du compte Wameet
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* =====================================================================
            DIRECTIVE PROMPT 35 : HEADER DE RASSURANCE (CADENAS VERT ET CHIFFREMENT)
           ===================================================================== */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 shadow-sm flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
            <Lock className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              Vos discussions et transactions financières sont chiffrées de bout en bout.
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Ni Wameet, ni votre opérateur télécom ne peuvent lire vos messages, écouter vos appels vocaux
              ou intercepter vos ordres de paiement Wameet. Vos clés privées restent sur vos appareils.
            </p>
          </div>
        </div>

        {/* =====================================================================
            DIRECTIVE PROMPT 35 : SECTION 1 - CONFIDENTIALITÉ & VISIBILITÉ (TOGGLES)
           ===================================================================== */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-3">
            Visibilité & Présence
          </h3>

          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {/* TOGGLE 1 : CONFIRMATIONS DE LECTURE */}
            <ToggleRow
              icon={<CheckCheck className="w-5 h-5 text-blue-500" />}
              title="Confirmations de lecture"
              description="Affiche les doubles-ticks bleus lorsque vos messages sont lus. Si désactivé, vous n'enverrez ni ne recevrez de confirmations de lecture dans les discussions individuelles."
              checked={readReceipts}
              onChange={(val) => {
                setReadReceipts(val);
                showToast(val ? 'Confirmations de lecture activées' : 'Confirmations de lecture désactivées');
              }}
            />

            {/* TOGGLE 2 : PRÉSENCE EN LIGNE */}
            <ToggleRow
              icon={<Eye className="w-5 h-5 text-emerald-500" />}
              title="Présence en ligne"
              description="Permet à vos contacts de savoir quand vous êtes connecté à Wameet. Si désactivé, votre statut 'En ligne' est masqué à tous les utilisateurs."
              checked={onlinePresence}
              onChange={(val) => {
                setOnlinePresence(val);
                showToast(val ? 'Présence en ligne visible' : 'Présence en ligne masquée');
              }}
            />

            {/* TOGGLE 3 : AUTORISER LE GPS POUR LES CADEAUX MYSTÈRES (WAMEET SPÉCIFIQUE) */}
            <ToggleRow
              icon={<MapPin className="w-5 h-5 text-amber-500" />}
              title="Autoriser le GPS pour les Cadeaux Mystères"
              description="Permet aux livreurs partenaires NaNa Swarm et à vos amis de livrer des cadeaux physiques réels sans divulguer vos coordonnées GPS exactes sur votre profil public."
              checked={gpsMysteryGift}
              onChange={(val) => {
                setGpsMysteryGift(val);
                showToast(val ? 'Géolocalisation Cadeaux Mystères activée' : 'Géolocalisation Cadeaux Mystères désactivée');
              }}
            />
          </div>
        </div>

        {/* =====================================================================
            DIRECTIVE PROMPT 35 : SECTION 2 - SÉCURITÉ RENFORCÉE (2FA & APPAREILS LIÉS)
           ===================================================================== */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-3">
            Sécurité Renforcée du Compte
          </h3>

          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {/* 1. VÉRIFICATION EN DEUX ÉTAPES (2FA) */}
            <div
              onClick={() => {
                playTapBeep();
                setShow2FaModal(true);
              }}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                      Vérification en deux étapes (2FA)
                    </h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        twoFactorEnabled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                      }`}
                    >
                      {twoFactorEnabled ? 'Activée' : 'Recommandée'}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Protège l'accès à votre Wallet Wameet et aux transferts d'argent par un code PIN à 6 chiffres.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* 2. APPAREILS LIÉS (WAMEET WEB) */}
            <div
              onClick={() => {
                playTapBeep();
                setShowLinkedDevicesModal(true);
              }}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Laptop className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                      Appareils liés
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {linkedDevices.length} session{linkedDevices.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Gérer les ordinateurs et navigateurs connectés à votre compte Wameet Web.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* 3. VERROUILLAGE BIOMÉTRIQUE (STYLE WAMEET) */}
            <ToggleRow
              icon={<Fingerprint className="w-5 h-5 text-indigo-500" />}
              title="Verrouillage par empreinte digitale / Face ID"
              description="Exige l'authentification biométrique de votre appareil à chaque ouverture de Wameet."
              checked={biometricLock}
              onChange={(val) => {
                setBiometricLock(val);
                showToast(val ? 'Verrouillage biométrique activé' : 'Verrouillage biométrique désactivé');
              }}
            />
          </div>
        </div>

        {/* =====================================================================
            SECTION 3 : GESTION DES CONTACTS & MESSAGES ÉPHÉMÈRES
           ===================================================================== */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-3">
            Contrôle des Échanges
          </h3>

          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <div
              onClick={() => {
                playTapBeep();
                showToast('Aucun contact actuellement bloqué.');
              }}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <UserX className="w-5 h-5 text-red-500" />
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                    Contacts bloqués
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    0 contact bloqué
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div
              onClick={() => {
                playTapBeep();
                showToast('Délai des messages éphémères : Désactivé');
              }}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-cyan-500" />
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                    Délai de disparition des messages
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Désactivé (les messages sont conservés)
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODALE 1 : CONFIGURATION 2FA (CODE PIN WAMEET)
         ===================================================================== */}
      {show2FaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white space-y-4 transform-gpu will-change-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black">Code PIN de Sécurité Wameet (2FA)</h3>
              </div>
              {/* FIXED: Tap Target 44x44px standard ergonomique */}
              <button
                type="button"
                onClick={() => setShow2FaModal(false)}
                className="w-10 h-10 -mr-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Définissez un code PIN secret à 6 chiffres qui sera exigé lors de chaque connexion sur un nouvel appareil
              ou lors du déblocage de fonds dans votre portefeuille Wameet.
            </p>

            <form onSubmit={handleSave2FaPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Code PIN secret (6 chiffres)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  pattern="[0-9]{6}"
                  value={twoFaPin}
                  onChange={(e) => setTwoFaPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.5em] text-lg font-black py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShow2FaModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex-1"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={twoFaPin.length !== 6}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 disabled:opacity-50 text-white font-black text-xs hover:bg-emerald-600 transition-colors flex-1"
                >
                  Activer le 2FA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALE 2 : GESTION DES APPAREILS LIÉS (WAMEET WEB)
         ===================================================================== */}
      {showLinkedDevicesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white space-y-4 transform-gpu will-change-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                  <Laptop className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black">Appareils Connectés à Wameet Web</h3>
              </div>
              {/* FIXED: Tap Target 44x44px standard ergonomique */}
              <button
                type="button"
                onClick={() => setShowLinkedDevicesModal(false)}
                className="w-10 h-10 -mr-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Vos messages sont synchronisés en direct avec ces sessions via un pont chiffré de bout en bout.
            </p>

            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {linkedDevices.length > 0 ? (
                linkedDevices.map((dev) => (
                  <div
                    key={dev.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Laptop className="w-5 h-5 text-purple-500 shrink-0" />
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {dev.name}
                        </h5>
                        <p className="text-[10px] text-slate-400 truncate">
                          {dev.browser} • {dev.location}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {dev.lastActive}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDisconnectDevice(dev.id)}
                      className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:hover:bg-red-950/60 dark:text-red-400 text-[11px] font-bold transition-colors shrink-0"
                    >
                      Déconnecter
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  Aucun appareil externe lié. Vos sessions Web sont fermées.
                </div>
              )}
            </div>

            {linkedDevices.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDisconnectAllDevices}
                  className="w-full py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors shadow-sm"
                >
                  Déconnecter toutes les sessions
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WameetPrivacySecurityScreen;
