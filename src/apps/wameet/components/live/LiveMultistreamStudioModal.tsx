/**
 * @file LiveMultistreamStudioModal.tsx
 * @description Générateur & Console Vendeur pour le Live Shopping & Multistreaming Réel
 * 
 * Permet de diffuser le live simultanément sur Nanasore, YouTube, Facebook, Twitch,
 * TikTok, Instagram, LinkedIn, X (Twitter), Telegram, WhatsApp et tout serveur RTMP tiers.
 * 
 * ZÉRO MOCK, ZÉRO SIMULATION : Connexion réelle Supabase SQL & FFmpeg Node.js Northflank.
 */

import React, { useState, useEffect, useCallback, useId } from 'react';
import { 
  X, 
  Radio, 
  Share2, 
  Check, 
  Copy, 
  Eye, 
  EyeOff, 
  Save, 
  Play, 
  Square, 
  ExternalLink, 
  Plus, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  MessageCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { 
  StoreMultistreamConfig, 
  CustomRtmpDestination, 
  PlatformRelayState 
} from '../../../../types/multistream';
import { 
  DEFAULT_MULTISTREAM_CONFIG,
  loadStoreMultistreamConfig, 
  saveStoreMultistreamConfig, 
  startMultistreamRelay, 
  stopMultistreamRelay, 
  getMultistreamStatus, 
  buildWhatsAppLiveShare 
} from '../../../../services/liveMultistreamService';
import { buildStoreHlsUrl } from '../../../../config/liveStreamConfig';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface LiveMultistreamStudioModalProps {
  isOpen: boolean;
  storeSlug: string;
  storeName?: string;
  liveTitle?: string;
  inline?: boolean;
  onClose: () => void;
}

export const LiveMultistreamStudioModal: React.FC<LiveMultistreamStudioModalProps> = ({
  isOpen,
  storeSlug,
  storeName = 'Boutique Nanasore',
  liveTitle = 'Live Shopping Exclusif 🔥',
  inline = false,
  onClose
}) => {
  const [config, setConfig] = useState<StoreMultistreamConfig | null>(() => ({
    ...DEFAULT_MULTISTREAM_CONFIG,
    storeSlug: storeSlug || 'boutique'
  }));
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Visibilité des mots de passe (clés de flux)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Statuts réels reçus du backend
  const [relayStatuses, setRelayStatuses] = useState<Record<string, PlatformRelayState>>({});
  const [isRelayRunning, setIsRelayRunning] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const cleanSlug = storeSlug || 'boutique';
  const hlsPlayerUrl = buildStoreHlsUrl(cleanSlug);
  const { publicLiveUrl, whatsAppShareUrl } = buildWhatsAppLiveShare(cleanSlug, storeName, liveTitle);

  // Basculer l'affichage du mot de passe
  const toggleKeyVisibility = (key: string) => {
    playTapBeep();
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Copier un lien
  const handleCopy = (text: string, fieldId: string) => {
    playTapBeep();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  // Chargement de la configuration
  useEffect(() => {
    if (!isOpen || !storeSlug) return;
    let isMounted = true;
    setLoading(true);

    loadStoreMultistreamConfig(cleanSlug).then(res => {
      if (isMounted) {
        setConfig(res);
        setLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [isOpen, cleanSlug, storeSlug]);

  // Polling du statut réel du backend Northflank quand la modale est ouverte
  const fetchStatus = useCallback(async () => {
    if (!cleanSlug) return;
    const res = await getMultistreamStatus(cleanSlug);
    if (res && res.destinations) {
      setRelayStatuses(res.destinations);
      const hasStreaming = Object.values(res.destinations).some(
        d => d.status === 'streaming' || d.status === 'starting'
      );
      setIsRelayRunning(hasStreaming);
    }
  }, [cleanSlug]);

  useEffect(() => {
    if (!isOpen) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, [isOpen, fetchStatus]);

  if (!isOpen) return null;

  // Sauvegarder dans Supabase
  const handleSaveConfig = async () => {
    if (!config) return;
    playValidationBeep();
    setSaving(true);
    setActionError(null);
    setSaveSuccess(false);

    const ok = await saveStoreMultistreamConfig(cleanSlug, config);
    setSaving(false);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setActionError("Échec de l'enregistrement dans la base de données.");
    }
  };

  // Lancer tous les relais
  const handleStartRelays = async () => {
    if (!config) return;
    playValidationBeep();
    setActionError(null);

    // Sauvegarde d'abord
    await saveStoreMultistreamConfig(cleanSlug, config);

    const res = await startMultistreamRelay(cleanSlug, config);
    if (res.success) {
      setIsRelayRunning(true);
      await fetchStatus();
    } else {
      setActionError(res.error || "Impossible de démarrer le relais. Vérifiez que votre direct caméra est actif.");
    }
  };

  // Arrêter tous les relais
  const handleStopRelays = async () => {
    playTapBeep();
    setActionError(null);
    const res = await stopMultistreamRelay(cleanSlug);
    if (res.success) {
      setIsRelayRunning(false);
      await fetchStatus();
    } else {
      setActionError(res.error || "Erreur lors de l'arrêt des relais.");
    }
  };

  // Ajout destination RTMP personnalisée
  const handleAddCustomDestination = () => {
    playTapBeep();
    if (!config) return;
    const newDest: CustomRtmpDestination = {
      id: `custom_${Date.now()}`,
      name: `Mon Serveur RTMP ${((config.customRtmpDestinations || []).length + 1)}`,
      serverUrl: 'rtmp://',
      streamKey: '',
      enabled: true
    };
    setConfig({
      ...config,
      customRtmpDestinations: [...(config.customRtmpDestinations || []), newDest]
    });
  };

  // Suppression destination personnalisée
  const handleRemoveCustomDestination = (id: string) => {
    playTapBeep();
    if (!config) return;
    setConfig({
      ...config,
      customRtmpDestinations: (config.customRtmpDestinations || []).filter(d => d.id !== id)
    });
  };

  // Rendu badge statut réel
  const renderStatusBadge = (platformId: string) => {
    const state = relayStatuses[platformId];
    if (!state) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          En attente
        </span>
      );
    }

    if (state.status === 'streaming') {
      return (
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          En direct ({state.durationSeconds || 0}s)
        </span>
      );
    }

    if (state.status === 'starting') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
          Connexion...
        </span>
      );
    }

    if (state.status === 'error') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40" title={state.errorMessage || 'Erreur RTMP'}>
          Erreur de clé
        </span>
      );
    }

    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
        Déconnecté
      </span>
    );
  };

  return (
    <div className={inline ? 'w-full' : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto'}>
      <div className={inline ? 'relative w-full flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl text-slate-100 overflow-hidden' : 'relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 overflow-hidden'}>
        
        {/* EN-TÊTE MODALE */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2 flex-wrap">
                Générateur de Live & Multistreaming Réel
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  MediaMTX + FFmpeg
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Collez vos clés de stream et URL serveurs pour diffuser sur Nanasore + tous vos réseaux sociaux
              </p>
            </div>
          </div>

          {!inline && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* CONTENU AVEC DÉFILEMENT */}
        <div className={inline ? 'p-4 sm:p-5 space-y-5' : 'flex-1 overflow-y-auto p-4 sm:p-6 space-y-6'}>

          {/* MESSAGE D'ERREUR OU SUCCÈS */}
          {actionError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{actionError}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Configuration et clés de flux enregistrées avec succès dans Supabase !</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* DESTINATION 0 : NANASORE NATIVE LIVE SHOPPING (ACTIVÉE PAR DÉFAUT) */}
          {/* ================================================================= */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-850 to-indigo-950/40 border border-blue-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-ping" />
                <span className="font-extrabold text-sm text-white">0. Diffusion Native à l'intérieur de Nanasore</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white">
                  Activée par défaut
                </span>
              </div>
              <span className="text-xs text-blue-400 font-semibold">Port HLS 8888</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Votre direct vidéo est immédiatement lisible par vos acheteurs sur votre boutique avec le panier interactif et le paiement Mobile Money sans quitter l'écran.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 truncate select-all">
                {publicLiveUrl}
              </div>
              <button
                type="button"
                onClick={() => handleCopy(publicLiveUrl, 'nanasore_live')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
              >
                {copiedField === 'nanasore_live' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedField === 'nanasore_live' ? 'Lien Copié !' : 'Copier le lien public'}</span>
              </button>
              <a
                href={publicLiveUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Tester</span>
              </a>
            </div>
          </div>

          {/* ================================================================= */}
          {/* DESTINATIONS 1, 2, 3 : YOUTUBE, FACEBOOK, TWITCH (1 SEUL CHAMP : CLÉ) */}
          {/* ================================================================= */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Grandes Plateformes (Clé de stream uniquement)
            </h3>

            {/* 1. YOUTUBE LIVE */}
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-xs">
                    ▶
                  </div>
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    1. YouTube Live
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  {renderStatusBadge('youtube')}
                  <input
                    type="checkbox"
                    checked={config?.youtubeEnabled ?? false}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, youtubeEnabled: e.target.checked }) : null)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Clé de flux YouTube (Stream Key)</label>
                <div className="relative">
                  <input
                    type={showKeys['youtube'] ? 'text' : 'password'}
                    value={config?.youtubeStreamKey || ''}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, youtubeStreamKey: e.target.value }) : null)}
                    placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility('youtube')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showKeys['youtube'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                💡 <span className="font-semibold text-slate-300">Comment l'obtenir :</span> Ouvrez YouTube Studio → Cliquez sur « Passer au direct » (icône caméra en haut à droite) → Onglet « Diffuser » → Copiez la « Clé de flux ».
              </p>
            </div>

            {/* 2. FACEBOOK LIVE */}
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                    f
                  </div>
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    2. Facebook Live
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  {renderStatusBadge('facebook')}
                  <input
                    type="checkbox"
                    checked={config?.facebookEnabled ?? false}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, facebookEnabled: e.target.checked }) : null)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Clé de streaming Facebook</label>
                <div className="relative">
                  <input
                    type={showKeys['facebook'] ? 'text' : 'password'}
                    value={config?.facebookStreamKey || ''}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, facebookStreamKey: e.target.value }) : null)}
                    placeholder="FB-xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility('facebook')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showKeys['facebook'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                💡 <span className="font-semibold text-slate-300">Comment l'obtenir :</span> Allez sur <span className="text-blue-400">facebook.com/live/producer</span> → Cliquez sur « Passer en direct » → Sélectionnez « Logiciel de streaming » → Copiez la « Clé de streaming ».
              </p>
            </div>

            {/* 3. TWITCH */}
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-xs">
                    👾
                  </div>
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    3. Twitch
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  {renderStatusBadge('twitch')}
                  <input
                    type="checkbox"
                    checked={config?.twitchEnabled ?? false}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, twitchEnabled: e.target.checked }) : null)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Clé de stream principale Twitch</label>
                <div className="relative">
                  <input
                    type={showKeys['twitch'] ? 'text' : 'password'}
                    value={config?.twitchStreamKey || ''}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, twitchStreamKey: e.target.value }) : null)}
                    placeholder="live_xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility('twitch')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showKeys['twitch'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                💡 <span className="font-semibold text-slate-300">Comment l'obtenir :</span> Tableau de bord des créateurs Twitch → Paramètres → Stream → Copiez la « Clé de stream principale ».
              </p>
            </div>
          </div>

          {/* ================================================================= */}
          {/* DESTINATIONS 4, 5, 6, 7, 8 : TIKTOK, INSTAGRAM, LINKEDIN, X, TELEGRAM (2 CHAMPS : URL + CLÉ) */}
          {/* ================================================================= */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-indigo-400" />
              Plateformes Dynamiques (URL Serveur + Clé de stream)
            </h3>

            {/* 4. TIKTOK LIVE */}
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-black border border-slate-750 text-white flex items-center justify-center font-black text-xs">
                    🎵
                  </div>
                  <label className="text-sm font-bold text-white">4. TikTok Live</label>
                </div>
                <div className="flex items-center gap-2">
                  {renderStatusBadge('tiktok')}
                  <input
                    type="checkbox"
                    checked={config?.tiktokEnabled ?? false}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, tiktokEnabled: e.target.checked }) : null)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">URL du serveur TikTok (Server URL)</label>
                  <input
                    type="text"
                    value={config?.tiktokServerUrl || ''}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, tiktokServerUrl: e.target.value }) : null)}
                    placeholder="rtmp://push-rtmp-l11-sg01.tiktokcdn.com/game/"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Clé de flux TikTok (Stream Key)</label>
                  <div className="relative">
                    <input
                      type={showKeys['tiktok'] ? 'text' : 'password'}
                      value={config?.tiktokStreamKey || ''}
                      onChange={(e) => setConfig(prev => prev ? ({ ...prev, tiktokStreamKey: e.target.value }) : null)}
                      placeholder="stream-xxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility('tiktok')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showKeys['tiktok'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                💡 <span className="font-semibold text-slate-300">Comment l'obtenir :</span> Ouvrez TikTok Live Studio ou l'app TikTok → « Passer en LIVE » → Choisissez « Diffuser sur PC/Mac » → Copiez l'URL du serveur ET la Clé de flux générées pour cette session.
              </p>
            </div>

            {/* 5. INSTAGRAM LIVE */}
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white flex items-center justify-center font-black text-xs">
                    📸
                  </div>
                  <label className="text-sm font-bold text-white">5. Instagram Live</label>
                </div>
                <div className="flex items-center gap-2">
                  {renderStatusBadge('instagram')}
                  <input
                    type="checkbox"
                    checked={config?.instagramEnabled ?? false}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, instagramEnabled: e.target.checked }) : null)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">URL du serveur Instagram (Stream URL)</label>
                  <input
                    type="text"
                    value={config?.instagramServerUrl || 'rtmps://live-upload.instagram.com:443/rtmp/'}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, instagramServerUrl: e.target.value }) : null)}
                    placeholder="rtmps://live-upload.instagram.com:443/rtmp/"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Clé de flux Instagram (Stream Key)</label>
                  <div className="relative">
                    <input
                      type={showKeys['instagram'] ? 'text' : 'password'}
                      value={config?.instagramStreamKey || ''}
                      onChange={(e) => setConfig(prev => prev ? ({ ...prev, instagramStreamKey: e.target.value }) : null)}
                      placeholder="xxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility('instagram')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showKeys['instagram'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                💡 <span className="font-semibold text-slate-300">Comment l'obtenir :</span> Sur ordinateur, allez sur <span className="text-pink-400">instagram.com</span> → Cliquez sur « + Créer » → « Vidéo en direct » → Donnez un titre et choisissez « Public » → Copiez l'URL du flux et la Clé de diffusion.
              </p>
            </div>

            {/* 6. LINKEDIN LIVE */}
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-700 text-white flex items-center justify-center font-black text-xs">
                    in
                  </div>
                  <label className="text-sm font-bold text-white">6. LinkedIn Live</label>
                </div>
                <div className="flex items-center gap-2">
                  {renderStatusBadge('linkedin')}
                  <input
                    type="checkbox"
                    checked={config?.linkedinEnabled ?? false}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, linkedinEnabled: e.target.checked }) : null)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">URL du serveur LinkedIn (Server URL)</label>
                  <input
                    type="text"
                    value={config?.linkedinServerUrl || ''}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, linkedinServerUrl: e.target.value }) : null)}
                    placeholder="rtmps://..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Clé de flux LinkedIn (Stream Key)</label>
                  <div className="relative">
                    <input
                      type={showKeys['linkedin'] ? 'text' : 'password'}
                      value={config?.linkedinStreamKey || ''}
                      onChange={(e) => setConfig(prev => prev ? ({ ...prev, linkedinStreamKey: e.target.value }) : null)}
                      placeholder="xxxxxxxx"
                      className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility('linkedin')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showKeys['linkedin'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                💡 <span className="font-semibold text-slate-300">Comment l'obtenir :</span> Sur LinkedIn, créez un événement ou cliquez sur « Passer au direct » → Sélectionnez « Utiliser un logiciel de diffusion (RTMP personnalisé) » → Copiez l'URL du serveur et la Clé de stream.
              </p>
            </div>

            {/* 7. X / TWITTER LIVE */}
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-black border border-slate-700 text-white flex items-center justify-center font-black text-xs">
                    𝕏
                  </div>
                  <label className="text-sm font-bold text-white">7. X / Twitter Live</label>
                </div>
                <div className="flex items-center gap-2">
                  {renderStatusBadge('twitter')}
                  <input
                    type="checkbox"
                    checked={config?.twitterEnabled ?? false}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, twitterEnabled: e.target.checked }) : null)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">URL du serveur X / Twitter (RTMP URL)</label>
                  <input
                    type="text"
                    value={config?.twitterServerUrl || ''}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, twitterServerUrl: e.target.value }) : null)}
                    placeholder="rtmps://..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Clé de flux X / Twitter (Stream Key)</label>
                  <div className="relative">
                    <input
                      type={showKeys['twitter'] ? 'text' : 'password'}
                      value={config?.twitterStreamKey || ''}
                      onChange={(e) => setConfig(prev => prev ? ({ ...prev, twitterStreamKey: e.target.value }) : null)}
                      placeholder="xxxxxxxx"
                      className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility('twitter')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showKeys['twitter'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                💡 <span className="font-semibold text-slate-300">Comment l'obtenir :</span> Ouvrez X Media Studio (<span className="text-slate-200">studio.x.com</span>) → Onglet « Producer » → Créez une source RTMP → Copiez l'URL du serveur RTMP et la Clé de diffusion.
              </p>
            </div>

            {/* 8. TELEGRAM LIVE */}
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center font-black text-xs">
                    ✈
                  </div>
                  <label className="text-sm font-bold text-white">8. Telegram Live</label>
                </div>
                <div className="flex items-center gap-2">
                  {renderStatusBadge('telegram')}
                  <input
                    type="checkbox"
                    checked={config?.telegramEnabled ?? false}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, telegramEnabled: e.target.checked }) : null)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">URL du serveur Telegram (Server URL)</label>
                  <input
                    type="text"
                    value={config?.telegramServerUrl || 'rtmps://dc4-1.rtmp.t.me/s/'}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, telegramServerUrl: e.target.value }) : null)}
                    placeholder="rtmps://dc4-1.rtmp.t.me/s/"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Clé de flux Telegram (Stream Key)</label>
                  <div className="relative">
                    <input
                      type={showKeys['telegram'] ? 'text' : 'password'}
                      value={config?.telegramStreamKey || ''}
                      onChange={(e) => setConfig(prev => prev ? ({ ...prev, telegramStreamKey: e.target.value }) : null)}
                      placeholder="xxxxxxxx:xxxxxxxx"
                      className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility('telegram')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showKeys['telegram'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                💡 <span className="font-semibold text-slate-300">Comment l'obtenir :</span> Ouvrez votre Canal ou Groupe Telegram → Cliquez sur l'icône « Diffusion en direct / Chat vidéo » → Choisissez « Diffuser avec... » (Stream With) → Copiez l'URL du serveur et la Clé de stream.
              </p>
            </div>
          </div>

          {/* ================================================================= */}
          {/* DESTINATION 9 : WHATSAPP LIVE SHARE & CANAL */}
          {/* ================================================================= */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-850 to-emerald-950/20 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-emerald-600/30">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">9. WhatsApp (Diffusion Directe & Partage en 1 clic)</h4>
                  <span className="text-[11px] text-slate-400 block">WhatsApp ne propose pas d'ingestion RTMP : le live se partage avec aperçu vidéo</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Numéro ou Lien de groupe/chaîne WhatsApp (Optionnel)
                </label>
                <input
                  type="text"
                  value={config?.whatsappChannelUrl || ''}
                  onChange={(e) => setConfig(prev => prev ? ({ ...prev, whatsappChannelUrl: e.target.value }) : null)}
                  placeholder="https://chat.whatsapp.com/... ou +225..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-col justify-end">
                <a
                  href={whatsAppShareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Partager le Live sur WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* DESTINATION 10 : AUTRES SITES / DESTINATIONS RTMP PERSONNALISÉES */}
          {/* ================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-blue-400" />
                10. Autre Site / RTMP Personnalisé (Kick, Rumble, Vimeo, etc.)
              </h3>
              <button
                type="button"
                onClick={handleAddCustomDestination}
                className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ajouter une destination RTMP</span>
              </button>
            </div>

            {(config?.customRtmpDestinations || []).map((dest, index) => (
              <div key={dest.id} className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={dest.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfig(prev => {
                          if (!prev) return null;
                          const list = [...(prev.customRtmpDestinations || [])];
                          list[index] = { ...list[index], name: val };
                          return { ...prev, customRtmpDestinations: list };
                        });
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white w-48"
                      placeholder="Nom (ex: Kick)"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {renderStatusBadge(dest.id)}
                    <input
                      type="checkbox"
                      checked={dest.enabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setConfig(prev => {
                          if (!prev) return null;
                          const list = [...(prev.customRtmpDestinations || [])];
                          list[index] = { ...list[index], enabled: checked };
                          return { ...prev, customRtmpDestinations: list };
                        });
                      }}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomDestination(dest.id)}
                      className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">URL du serveur RTMP/RTMPS</label>
                    <input
                      type="text"
                      value={dest.serverUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfig(prev => {
                          if (!prev) return null;
                          const list = [...(prev.customRtmpDestinations || [])];
                          list[index] = { ...list[index], serverUrl: val };
                          return { ...prev, customRtmpDestinations: list };
                        });
                      }}
                      placeholder="rtmp://..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Clé de flux (Stream Key)</label>
                    <div className="relative">
                      <input
                        type={showKeys[dest.id] ? 'text' : 'password'}
                        value={dest.streamKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfig(prev => {
                            if (!prev) return null;
                            const list = [...(prev.customRtmpDestinations || [])];
                            list[index] = { ...list[index], streamKey: val };
                            return { ...prev, customRtmpDestinations: list };
                          });
                        }}
                        placeholder="xxxxxxxx"
                        className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility(dest.id)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showKeys[dest.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* PIED DE MODALE : ACTIONS DE CONTRÔLE */}
        <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2 border border-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Enregistrement...' : 'Enregistrer les Clés (Supabase)'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isRelayRunning ? (
              <button
                type="button"
                onClick={handleStopRelays}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-rose-950 transition cursor-pointer active:scale-95"
              >
                <Square className="w-4 h-4" />
                <span>Arrêter le Multistreaming</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartRelays}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 transition cursor-pointer active:scale-95"
              >
                <Play className="w-4 h-4" />
                <span>Lancer le Multistreaming Réel</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LiveMultistreamStudioModal;
