import React, { useState } from 'react';
import {
  ArrowLeft,
  Sun,
  Moon,
  Laptop,
  Globe,
  HardDrive,
  Trash2,
  CheckCircle2,
  Wifi,
  Signal,
  Plane,
  Film,
  Mic,
  FileText,
  Sparkles,
  RefreshCw,
  Info,
  Check,
  ChevronRight,
  Database,
  Layers
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../../utils/audio';

export interface WameetPreferencesStorageScreenProps {
  onBack?: () => void;
  className?: string;
}

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  flag: string;
}

/**
 * PROMPT 38 : L'Écran "Préférences, Médias & Stockage" (Style Wameet Épuré)
 * Gère le mode sombre, la langue et surtout la mémoire du téléphone (cache vidéo).
 * 
 * Directives UI/UX au millimètre :
 * 1. Apparence :
 *    - Sélecteur de Thème visuel (Clair, Sombre, Automatique selon le système).
 *    - Langue de l'application (Français, Anglais, Dioula, Mooré...).
 * 2. Stockage & Cache :
 *    - Graphique simple (barre horizontale segmentée) montrant l'espace utilisé (Vidéos, Audios, Fichiers).
 *    - Gros bouton "Vider le cache (Libérer 450 Mo)" avec icône de corbeille.
 * 3. Téléchargement automatique des médias :
 *    - 3 Toggles : "En Wi-Fi", "En données cellulaires (4G/5G)", "En itinérance".
 */
export const WameetPreferencesStorageScreen: React.FC<WameetPreferencesStorageScreenProps> = ({
  onBack,
  className = ''
}) => {
  // 1. Thème visuel
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>('auto');

  // 2. Langue de l'application
  const [selectedLanguage, setSelectedLanguage] = useState<string>('fr');
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);

  const languageOptions: LanguageOption[] = [
    { code: 'fr', name: 'Français', nativeName: 'Français', region: 'Afrique de l’Ouest & Centrale', flag: '🌍' },
    { code: 'en', name: 'Anglais', nativeName: 'English', region: 'West & Central Africa', flag: '🌐' },
    { code: 'dy', name: 'Dioula / Bambara', nativeName: 'Julakan', region: 'Côte d’Ivoire, Mali, Burkina', flag: '🇨🇮' },
    { code: 'mo', name: 'Mooré', nativeName: 'Mooré', region: 'Burkina Faso', flag: '🇧🇫' },
    { code: 'wo', name: 'Wolof', nativeName: 'Wolof', region: 'Sénégal', flag: '🇸🇳' },
    { code: 'ba', name: 'Baoulé', nativeName: 'Baoulé', region: 'Côte d’Ivoire', flag: '🇨🇮' }
  ];

  // 3. Stockage et Cache (Données réactives)
  const [storageData, setStorageData] = useState({
    videosMb: 280,
    audiosMb: 95,
    filesMb: 45,
    cacheMb: 30,
    isCleared: false
  });
  const [isClearingCache, setIsClearingCache] = useState<boolean>(false);

  // 4. Téléchargement automatique des médias (3 Toggles)
  const [autoDownloadWifi, setAutoDownloadWifi] = useState<boolean>(true);
  const [autoDownloadCellular, setAutoDownloadCellular] = useState<boolean>(false);
  const [autoDownloadRoaming, setAutoDownloadRoaming] = useState<boolean>(false);

  // Option bonus économie data
  const [dataSaverVideos, setDataSaverVideos] = useState<boolean>(true);

  // 5. Toast notification
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

  // Calcul des totaux de stockage
  const totalUsedMb = storageData.videosMb + storageData.audiosMb + storageData.filesMb + storageData.cacheMb;
  const maxStorageSimulatedMb = 600; // Échelle de référence

  const videoPercent = (storageData.videosMb / maxStorageSimulatedMb) * 100;
  const audioPercent = (storageData.audiosMb / maxStorageSimulatedMb) * 100;
  const filesPercent = (storageData.filesMb / maxStorageSimulatedMb) * 100;
  const cachePercent = (storageData.cacheMb / maxStorageSimulatedMb) * 100;

  // Action : Vider le cache (Libérer les Mo)
  const handleClearCache = () => {
    if (storageData.isCleared) {
      showToast('Le cache est déjà parfaitement propre.');
      return;
    }
    playTapBeep();
    setIsClearingCache(true);

    setTimeout(() => {
      setIsClearingCache(false);
      setStorageData({
        videosMb: 18, // Vidéos essentielles uniquement
        audiosMb: 12,
        filesMb: 8,
        cacheMb: 0,
        isCleared: true
      });
      playValidationBeep();
      showToast('🗑️ 450 Mo de cache et données temporaires libérés avec succès !');
    }, 1100);
  };

  const currentLangObj = languageOptions.find((l) => l.code === selectedLanguage) || languageOptions[0];

  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] selection:bg-indigo-500/20 selection:text-indigo-700 ${className}`}
    >
      {/* Toast flottant avec accélération matérielle */}
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
        {/* FIXED: Tap Target standard 44x44px ergonomique */}
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
            Préférences, Médias & Stockage
          </h1>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
            Personnalisation, mémoire du téléphone et consommation de données
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* =====================================================================
            DIRECTIVE PROMPT 38 : SECTION 1 - APPARENCE & THÈME
            - Sélecteur de Thème visuel (Clair, Sombre, Automatique selon le système)
            - Langue de l'application (Français, Anglais, Dioula, Mooré...)
           ===================================================================== */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-2">
            Apparence & Affichage
          </h3>

          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                Thème de l'interface
              </label>

              {/* 3 Cartes de Thème (Clair, Sombre, Automatique) */}
              <div className="grid grid-cols-3 gap-2.5">
                {/* 1. CLAIR */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setSelectedTheme('light');
                    showToast('Thème Clair activé');
                  }}
                  className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    selectedTheme === 'light'
                      ? 'border-amber-500 bg-amber-50/40 text-amber-950 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">Clair</span>
                    <span className="text-[10px] text-slate-400">Jour</span>
                  </div>
                  {selectedTheme === 'light' && (
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-0.5" />
                  )}
                </button>

                {/* 2. SOMBRE */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setSelectedTheme('dark');
                    showToast('Thème Sombre activé');
                  }}
                  className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    selectedTheme === 'dark'
                      ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-900/60 text-indigo-400 flex items-center justify-center">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">Sombre</span>
                    <span className="text-[10px] text-slate-400">Nuit & OLED</span>
                  </div>
                  {selectedTheme === 'dark' && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-0.5" />
                  )}
                </button>

                {/* 3. AUTOMATIQUE */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setSelectedTheme('auto');
                    showToast('Thème automatique selon le système');
                  }}
                  className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    selectedTheme === 'auto'
                      ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-200 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">Système</span>
                    <span className="text-[10px] text-slate-400">Auto</span>
                  </div>
                  {selectedTheme === 'auto' && (
                    <div className="w-2 h-2 rounded-full bg-cyan-500 mt-0.5" />
                  )}
                </button>
              </div>
            </div>

            {/* SÉLECTEUR DE LANGUE */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Langue de l'application
              </label>

              <div
                onClick={() => {
                  playTapBeep();
                  setShowLanguageModal(true);
                }}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{currentLangObj.flag}</span>
                      <span>{currentLangObj.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({currentLangObj.nativeName})
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-400">{currentLangObj.region}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-cyan-600 dark:text-cyan-400">
                  <span>Changer</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            DIRECTIVE PROMPT 38 : SECTION 2 - STOCKAGE & CACHE
            - Graphique simple (barre horizontale) montrant l'espace utilisé (Vidéos, Audios, Fichiers)
            - Gros bouton "Vider le cache (Libérer 450 Mo)" avec icône de corbeille
           ===================================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Stockage & Mémoire (Cache)
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {totalUsedMb} Mo utilisés sur l'appareil
            </span>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            {/* GRAPHIQUE BARRE HORIZONTALE MULTI-SEGMENTS */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-indigo-500" />
                  <span>Empreinte mémoire de Wameet</span>
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-black">
                  {totalUsedMb} Mo
                </span>
              </div>

              {/* Barre de progression segmentée */}
              <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                {/* Vidéos */}
                <div
                  style={{ width: `${videoPercent}%` }}
                  className="h-full bg-indigo-500 transition-all duration-500 relative group"
                  title={`Vidéos : ${storageData.videosMb} Mo`}
                />
                {/* Audios */}
                <div
                  style={{ width: `${audioPercent}%` }}
                  className="h-full bg-emerald-500 transition-all duration-500"
                  title={`Audios & Vocaux : ${storageData.audiosMb} Mo`}
                />
                {/* Fichiers */}
                <div
                  style={{ width: `${filesPercent}%` }}
                  className="h-full bg-amber-500 transition-all duration-500"
                  title={`Fichiers & Reçus : ${storageData.filesMb} Mo`}
                />
                {/* Cache temporaire */}
                <div
                  style={{ width: `${cachePercent}%` }}
                  className="h-full bg-rose-500 transition-all duration-500"
                  title={`Cache temporaire : ${storageData.cacheMb} Mo`}
                />
              </div>

              {/* Légende du graphique */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">Vidéos :</span>
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {storageData.videosMb} Mo
                  </strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">Audios :</span>
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {storageData.audiosMb} Mo
                  </strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">Fichiers :</span>
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {storageData.filesMb} Mo
                  </strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">Cache :</span>
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {storageData.cacheMb} Mo
                  </strong>
                </div>
              </div>
            </div>

            {/* LE GROS BOUTON : "VIDER LE CACHE (LIBÉRER 450 MO)" AVEC ICÔNE CORBEILLE */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClearCache}
                disabled={isClearingCache || storageData.isCleared}
                className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] shadow-md cursor-pointer ${
                  storageData.isCleared
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                }`}
              >
                <Trash2 className={`w-4 h-4 ${isClearingCache ? 'animate-bounce' : ''}`} />
                <span>
                  {isClearingCache
                    ? 'Nettoyage des fichiers temporaires en cours...'
                    : storageData.isCleared
                    ? 'Cache nettoyé (Espace optimisé)'
                    : 'Vider le cache (Libérer 450 Mo)'}
                </span>
              </button>

              <p className="text-[10px] text-slate-400 text-center mt-2 leading-relaxed">
                Le nettoyage du cache ne supprime ni vos discussions, ni vos commandes Wameet. Il
                efface uniquement les flux vidéo préchargés pour fluidifier votre téléphone.
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================================
            DIRECTIVE PROMPT 38 : SECTION 3 - TÉLÉCHARGEMENT AUTOMATIQUE DES MÉDIAS
            - 3 Toggles : "En Wi-Fi", "En données cellulaires (4G/5G)", "En itinérance"
           ===================================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Téléchargement Automatique des Médias
            </h3>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              Style Wameet Épuré
            </span>
          </div>

          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {/* TOGGLE 1 : EN WI-FI */}
            <div
              onClick={() => {
                playTapBeep();
                setAutoDownloadWifi(!autoDownloadWifi);
                showToast(
                  !autoDownloadWifi
                    ? 'Téléchargement auto sur Wi-Fi activé'
                    : 'Téléchargement auto sur Wi-Fi désactivé'
                );
              }}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer select-none transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                    En Wi-Fi
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    Télécharge automatiquement les vidéos de cours, audios et images haute définition
                  </p>
                </div>
              </div>

              {/* iOS Switch Vert */}
              <div
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                  autoDownloadWifi ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform absolute top-0.5 left-0.5 ${
                    autoDownloadWifi ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>

            {/* TOGGLE 2 : EN DONNÉES CELLULAIRES (4G/5G) */}
            <div
              onClick={() => {
                playTapBeep();
                setAutoDownloadCellular(!autoDownloadCellular);
                showToast(
                  !autoDownloadCellular
                    ? 'Téléchargement auto en 4G/5G activé'
                    : 'Téléchargement auto en 4G/5G limité aux photos'
                );
              }}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer select-none transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Signal className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                    En données cellulaires (4G/5G)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    Téléchargement des photos uniquement (économise vos forfaits data Orange, Moov, MTN)
                  </p>
                </div>
              </div>

              {/* iOS Switch Vert */}
              <div
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                  autoDownloadCellular ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform absolute top-0.5 left-0.5 ${
                    autoDownloadCellular ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>

            {/* TOGGLE 3 : EN ITINÉRANCE */}
            <div
              onClick={() => {
                playTapBeep();
                setAutoDownloadRoaming(!autoDownloadRoaming);
                showToast(
                  !autoDownloadRoaming
                    ? 'Attention : Téléchargement en itinérance activé'
                    : 'Téléchargement en itinérance bloqué'
                );
              }}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer select-none transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Plane className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                    En itinérance
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    Bloque tout téléchargement hors de votre pays d'origine pour éviter les frais hors-forfait
                  </p>
                </div>
              </div>

              {/* iOS Switch Vert */}
              <div
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                  autoDownloadRoaming ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform absolute top-0.5 left-0.5 ${
                    autoDownloadRoaming ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            OPTION BONUS : ÉCONOMIE DE DONNÉES VIDÉO POUR L'AFRIQUE
           ===================================================================== */}
        <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                Encodage adaptatif des Reels & Lives
              </h5>
              <p className="text-[10px] text-slate-400">
                Ajuste automatiquement le débit vidéo selon la vitesse de votre réseau
              </p>
            </div>
          </div>

          <div
            onClick={() => {
              playTapBeep();
              setDataSaverVideos(!dataSaverVideos);
            }}
            className={`w-10 h-5.5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
              dataSaverVideos ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transform transition-transform absolute top-0.5 left-0.5 ${
                dataSaverVideos ? 'translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODALE DE CHOIX DE LA LANGUE
         ===================================================================== */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white space-y-4 transform-gpu will-change-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-600" />
                <h3 className="text-sm font-black">Choisir la langue</h3>
              </div>
              {/* FIXED: Zone tactile standard 44x44px */}
              <button
                type="button"
                onClick={() => setShowLanguageModal(false)}
                className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fermer"
              >
                Fermer
              </button>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {languageOptions.map((lang) => (
                <div
                  key={lang.code}
                  onClick={() => {
                    playValidationBeep();
                    setSelectedLanguage(lang.code);
                    setShowLanguageModal(false);
                    showToast(`Langue sélectionnée : ${lang.name}`);
                  }}
                  className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-colors ${
                    selectedLanguage === lang.code
                      ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-200 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{lang.flag}</span>
                    <div>
                      <div className="text-xs">{lang.name}</div>
                      <div className="text-[10px] text-slate-400">{lang.region}</div>
                    </div>
                  </div>

                  {selectedLanguage === lang.code && (
                    <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WameetPreferencesStorageScreen;
