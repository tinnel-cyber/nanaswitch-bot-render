import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Radio, 
  Users, 
  Zap, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  Monitor, 
  Play, 
  Pause, 
  Sparkles, 
  ChevronRight, 
  Check, 
  Share2, 
  ShoppingBag, 
  RotateCcw,
  Smartphone,
  Tv,
  Square,
  GraduationCap,
  MessageCircle,
  X
} from 'lucide-react';
import { LiveSession, LiveAspectRatio, LiveSessionMode, LiveSourceType } from '../../../../types/liveSession';
import { StoreProductItem } from '../../../../components/storeBuilder/types';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface NanasoreOmniPlayerProps {
  session: LiveSession;
  isHost?: boolean;
  onOpenFunnel?: (product: StoreProductItem) => void;
  onBuyWhatsApp?: (product: StoreProductItem) => void;
  onShareClick?: () => void;
  onUnpinProduct?: () => void;
  className?: string;
}

export const NanasoreOmniPlayer: React.FC<NanasoreOmniPlayerProps> = ({
  session,
  isHost = false,
  onOpenFunnel,
  onBuyWhatsApp,
  onShareClick,
  onUnpinProduct,
  className = ''
}) => {
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET DU COMPOSANT (ZÉRO ERREUR #310)
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [aspectRatio, setAspectRatio] = useState<LiveAspectRatio>(session.aspectRatio || '16:9');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(isHost);
  const [isMicActive, setIsMicActive] = useState<boolean>(isHost);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [showPinnedCard, setShowPinnedCard] = useState<boolean>(true);
  const [isFaceToFaceActive, setIsFaceToFaceActive] = useState<boolean>(session.sessionMode === 'coaching_1to1');

  // Compte à Rebours en Direct (Bleu & Blanc)
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>(() => {
    const remaining = Math.max(0, (session.countdownEndsAt || (Date.now() + 1000 * 7200)) - Date.now());
    const totalSecs = Math.floor(remaining / 1000);
    return {
      days: Math.floor(totalSecs / 86400),
      hours: Math.floor((totalSecs % 86400) / 3600),
      minutes: Math.floor((totalSecs % 3600) / 60),
      seconds: totalSecs % 60
    };
  });

  // Ticker du chrono chaque seconde
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return { days: 0, hours: 2, minutes: 45, seconds: 18 }; // Relance élégante
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Synchronisation du produit épinglé
  useEffect(() => {
    if (session.pinnedProduct) {
      setShowPinnedCard(true);
    }
  }, [session.pinnedProductId, session.pinnedProduct]);

  // Gestion du flux WebRTC / Caméra locale pour le mode natif
  useEffect(() => {
    let localStream: MediaStream | null = null;

    if (session.sourceType === 'native_room' && isHost) {
      navigator.mediaDevices?.getUserMedia?.({ video: true, audio: true })
        .then(stream => {
          localStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setIsCameraActive(true);
          setIsMicActive(true);
        })
        .catch(err => {
          console.warn('[NanasoreOmniPlayer] WebRTC media access error:', err);
          setStreamError("Caméra ou micro inaccessible. Activez les permissions du navigateur.");
        });
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [session.sourceType, isHost]);

  // Bascule du partage d'écran pour le formateur/hôte
  const handleToggleScreenShare = useCallback(async () => {
    playTapBeep();
    if (isScreenSharing) {
      // Revenir à la caméra
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = camStream;
        }
        setIsScreenSharing(false);
      } catch (e) {
        console.warn('Could not revert to camera:', e);
      }
    } else {
      // Partager l'écran
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
      } catch (err) {
        console.warn('Screen share canceled or error:', err);
      }
    }
  }, [isScreenSharing]);

  // Bascule du plein écran
  const handleToggleFullscreen = useCallback(() => {
    playTapBeep();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Détection et conversion de la source vidéo universelle
  const embedSource = useMemo(() => {
    const raw = (session.streamUrl || '').trim();

    // 1. YouTube Live / Vidéo
    const ytMatch = raw.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/live\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return {
        type: 'youtube',
        url: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=${isMuted ? 1 : 0}&enablejsapi=1&rel=0`
      };
    }

    // 2. Facebook Live
    if (raw.includes('facebook.com')) {
      return {
        type: 'facebook',
        url: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&autoplay=true&mute=${isMuted ? '1' : '0'}`
      };
    }

    // 3. Vimeo
    const vimeoMatch = raw.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        type: 'vimeo',
        url: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=${isMuted ? 1 : 0}`
      };
    }

    // 4. Twitch
    if (raw.includes('twitch.tv')) {
      const channel = raw.split('twitch.tv/')[1]?.split('/')[0]?.split('?')[0];
      const host = typeof window !== 'undefined' ? window.location.hostname : 'nsore.shop';
      return {
        type: 'twitch',
        url: `https://player.twitch.tv/?channel=${channel}&parent=${host}&autoplay=true`
      };
    }

    // 5. MP4 / HLS / Simulive
    if (raw.endsWith('.mp4') || raw.endsWith('.m3u8') || session.sourceType === 'mp4' || session.sourceType === 'hls') {
      return {
        type: 'html5',
        url: raw
      };
    }

    return null;
  }, [session.streamUrl, session.sourceType, isMuted]);

  // Résolution du badge dynamique selon le mode de session
  const badgeConfig = useMemo(() => {
    switch (session.sessionMode) {
      case 'live_shopping':
        return { label: '🔴 EN DIRECT • LIVE SHOPPING', icon: ShoppingBag, color: 'bg-rose-600' };
      case 'webinar_training':
        return { label: '🎓 WEBINAIRE & FORMATION EN DIRECT', icon: GraduationCap, color: 'bg-blue-600' };
      case 'coaching_1to1':
        return { label: '🤝 COACHING 1-TO-1 EN DIRECT', icon: Sparkles, color: 'bg-emerald-600' };
      case 'interactive_class':
        return { label: '🏫 CLASSE INTERACTIVE EN DIRECT', icon: Users, color: 'bg-indigo-600' };
      default:
        return { label: '🔴 EN DIRECT', icon: Radio, color: 'bg-blue-600' };
    }
  }, [session.sessionMode]);

  // Classe CSS selon le ratio Caméléon choisi
  const ratioClasses = useMemo(() => {
    if (aspectRatio === '9:16') {
      return 'aspect-[9/16] max-h-[85vh] mx-auto';
    }
    if (aspectRatio === '1:1') {
      return 'aspect-square max-h-[75vh] mx-auto';
    }
    return 'aspect-video w-full'; // 16:9 Cinema par défaut
  }, [aspectRatio]);

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('fr-FR').format(p) + ' F CFA';
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full rounded-3xl overflow-hidden bg-slate-950 text-white relative shadow-2xl border border-blue-900/40 select-none ${className}`}
    >
      {/* 1. EN-TÊTE DU LECTEUR : BADGE EN DIRECT + SPECTATEURS + COMPTE À REBOURS BLEU & BLANC */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 sm:p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pointer-events-auto">
        {/* Gauche : Badge Statut + Nombre de Spectateurs */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${badgeConfig.color} text-white text-[11px] font-black uppercase tracking-wider shadow-lg animate-pulse`}>
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>{badgeConfig.label}</span>
          </span>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-bold text-slate-200">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>{session.viewerCount || 142} spectateurs</span>
          </div>
        </div>

          {/* Droite : Bouton Face-à-Face 1-to-1 + Compte à Rebours Bleu & Blanc + Switcher de Format Caméléon */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {session.sessionMode === 'coaching_1to1' && (
            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                setIsFaceToFaceActive(!isFaceToFaceActive);
              }}
              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{isFaceToFaceActive ? '📺 Stream' : '📹 Face-à-Face 1-to-1'}</span>
            </button>
          )}

          {/* Chrono Compact Lumineux */}
          <div className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-1 rounded-xl border border-blue-400/40 shadow-md">
            <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300 animate-pulse shrink-0" />
            <div className="flex items-center gap-1 text-[11px] font-black tracking-tight text-white">
              <span className="bg-white text-blue-600 px-1.5 py-0.5 rounded font-black text-[10px]">
                {String(timeLeft.hours).padStart(2, '0')}h
              </span>
              <span>:</span>
              <span className="bg-white text-blue-600 px-1.5 py-0.5 rounded font-black text-[10px]">
                {String(timeLeft.minutes).padStart(2, '0')}m
              </span>
              <span>:</span>
              <span className="bg-white text-blue-600 px-1.5 py-0.5 rounded font-black text-[10px]">
                {String(timeLeft.seconds).padStart(2, '0')}s
              </span>
            </div>
          </div>

          {/* Sélecteur de Ratio Caméléon (9:16 / 1:1 / 16:9) */}
          <div className="hidden sm:flex items-center bg-black/60 backdrop-blur-md rounded-xl p-0.5 border border-white/15">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setAspectRatio('16:9');
              }}
              title="Format 16:9 Cinéma"
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                aspectRatio === '16:9' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setAspectRatio('1:1');
              }}
              title="Format 1:1 Carré"
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                aspectRatio === '1:1' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setAspectRatio('9:16');
              }}
              title="Format 9:16 Mobile / TikTok"
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                aspectRatio === '9:16' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. ZONE CENTRALE DU LECTEUR CAMÉLÉON (AVEC FOND AMBIANT FLOUTÉ EN 9:16) */}
      <div className="relative w-full overflow-hidden flex items-center justify-center bg-slate-950 min-h-[360px] sm:min-h-[480px]">
        {/* Fond d'ambiance flouté (effet glassmorphism haute immersion) */}
        {aspectRatio === '9:16' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            <img 
              src={session.posterUrl || session.pinnedProduct?.image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1080&auto=format&fit=crop&q=80'}
              alt="Fond ambiant"
              className="w-full h-full object-cover filter blur-3xl scale-150"
            />
          </div>
        )}

        {/* Le Conteneur Vidéo Adapté */}
        <div className={`relative ${ratioClasses} flex items-center justify-center transition-all duration-300 z-10`}>
          {isFaceToFaceActive ? (
            /* SALLE FACE-À-FACE COACHING 1-TO-1 PRIVÉE */
            <div className="w-full h-full relative bg-slate-900">
              <iframe
                src={session.coachingRoomUrl || `https://meet.jit.si/nanasore-coaching-${session.id}#config.startWithAudioMuted=false&config.startWithVideoMuted=false`}
                title="Salon Face-à-Face Coaching 1-to-1"
                className="w-full h-full border-none"
                allow="camera; microphone; fullscreen; display-capture"
                allowFullScreen
              />
            </div>
          ) : session.sourceType === 'native_room' ? (
            /* SALLE WEBRTC / CAMÉRA ET MICRO NATIF */
            <div className="w-full h-full relative bg-slate-900 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isHost || isMuted}
                className="w-full h-full object-cover"
              />
              {/* Overlay d'état si caméra coupée */}
              {!isCameraActive && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
                    <CameraOff className="w-8 h-8 text-blue-400" />
                  </div>
                  <span className="text-sm font-bold text-slate-300">Caméra désactivée par le présentateur</span>
                </div>
              )}
            </div>
          ) : embedSource ? (
            /* LECTEURS EXTERNES (YOUTUBE, FACEBOOK, VIMEO, TWITCH, HTML5) */
            embedSource.type === 'youtube' || embedSource.type === 'facebook' || embedSource.type === 'vimeo' || embedSource.type === 'twitch' ? (
              <iframe
                src={embedSource.url}
                title={session.title}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <video
                ref={videoRef}
                src={embedSource.url}
                poster={session.posterUrl}
                preload="none"
                autoPlay
                controls
                playsInline
                muted={isMuted}
                className="w-full h-full object-cover"
              />
            )
          ) : (
            /* AFFICHE SIMULIVE 1080x1080 EN COUVERTURE AVEC BOUTON PLAY */
            <div className="w-full h-full relative flex items-center justify-center cursor-pointer group">
              <img
                src={session.posterUrl || session.pinnedProduct?.image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1080&auto=format&fit=crop&q=80'}
                alt={session.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-colors flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-500 text-white border-4 border-white shadow-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 fill-white ml-1" />
                </div>
                <span className="px-4 py-2 rounded-full bg-slate-900/80 backdrop-blur-md text-xs font-black text-white border border-white/20">
                  ▶️ Rejoindre la Session en Direct
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. 🔥 CARTE LUMINEUSE DU PRODUIT ÉPINGLÉ FLASH EN DIRECT (EN BAS DU LECTEUR) */}
      {session.pinnedProduct && showPinnedCard && (
        <div className="absolute bottom-16 sm:bottom-18 left-3 sm:left-6 right-3 sm:right-6 z-30 animate-in slide-in-from-bottom-3 duration-300 pointer-events-auto">
          <div className="bg-white text-slate-900 rounded-2xl p-3 sm:p-4 shadow-2xl border-2 border-blue-600 flex items-center justify-between gap-3 sm:gap-4 relative overflow-hidden group">
            {/* Onde lumineuse bleue de l'offre */}
            <div className="absolute -right-12 -top-12 w-28 h-28 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

            {/* Miniature Produit + Titre + Prix */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-blue-200 shrink-0 bg-slate-50 relative">
                <img
                  src={session.pinnedProduct.image || session.posterUrl}
                  alt={session.pinnedProduct.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  📌 FLASH
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                    ⚡ OFFRE DU LIVE EN DIRECT
                  </span>
                </div>
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 line-clamp-1 leading-snug">
                  {session.pinnedProduct.name}
                </h4>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-base sm:text-lg font-black text-blue-600">
                    {formatPrice(session.pinnedProduct.price)}
                  </span>
                  {session.pinnedProduct.originalPrice && session.pinnedProduct.originalPrice > session.pinnedProduct.price && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatPrice(session.pinnedProduct.originalPrice)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Boutons d'Action Rapide de la Carte Épinglée */}
            <div className="flex items-center gap-2 shrink-0">
              {onBuyWhatsApp && (
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    onBuyWhatsApp(session.pinnedProduct!);
                  }}
                  className="hidden md:inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-xs py-2.5 px-3.5 rounded-xl shadow transition cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  if (onOpenFunnel) {
                    onOpenFunnel(session.pinnedProduct!);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs sm:text-sm py-2.5 sm:py-3 px-3.5 sm:px-5 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span className="hidden sm:inline">Payer / Profiter de l'Offre</span>
                <span className="sm:hidden">Acheter</span>
              </button>

              {/* Bouton Fermer la Carte Épinglée pour le spectateur ou désépingler pour le formateur */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (isHost && onUnpinProduct) {
                    onUnpinProduct();
                  } else {
                    setShowPinnedCard(false);
                  }
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                title={isHost ? "Désépingler du live" : "Masquer"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONTRÔLES INFÉRIEURS DU LECTEUR (SON, CAMÉRA/MICRO HÔTE, PLEIN ÉCRAN, PARTAGE) */}
      <div className="p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between gap-3 z-20 relative pointer-events-auto">
        {/* Contrôles Formateur / Hôte en mode WebRTC direct */}
        {isHost && session.sourceType === 'native_room' ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsCameraActive(!isCameraActive);
              }}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isCameraActive ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'
              }`}
              title="Activer/Désactiver la caméra"
            >
              {isCameraActive ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
              <span className="hidden sm:inline">Caméra</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsMicActive(!isMicActive);
              }}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isMicActive ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'
              }`}
              title="Activer/Couper le microphone"
            >
              {isMicActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span className="hidden sm:inline">Micro</span>
            </button>

            <button
              type="button"
              onClick={handleToggleScreenShare}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isScreenSharing ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title="Partager mon écran d'ordinateur"
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Écran</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsMuted(!isMuted);
              }}
              className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isMuted ? 'Activer le son' : 'Son activé'}</span>
            </button>
          </div>
        )}

        {/* Boutons d'Action Droite : Partager ce Live + Plein Écran */}
        <div className="flex items-center gap-2">
          {onShareClick && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onShareClick();
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Partager</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white transition cursor-pointer"
            title="Plein écran"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NanasoreOmniPlayer;
