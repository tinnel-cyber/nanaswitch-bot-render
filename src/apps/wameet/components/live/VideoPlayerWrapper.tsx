import React, { useMemo, useState, useCallback } from 'react';
import { LivePlatform, LivePinnedProduct } from '../../../../types';
import { DailyNativePlayer } from './DailyNativePlayer';
import { 
  Radio, ShoppingBag, ExternalLink, ShieldCheck, Sparkles, 
  Volume2, Eye, Flame, Maximize2, Minimize2, Check, RefreshCw, Play
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface VideoPlayerWrapperProps {
  platform: LivePlatform;
  streamUrl?: string;
  dailyRoomUrl?: string;
  isHost?: boolean;
  userName?: string;
  pinnedProduct?: LivePinnedProduct | null;
  onOrderPinnedProduct?: (product: LivePinnedProduct) => void;
  onLeaveLive?: () => void;
  isCutoff?: boolean;
  aspectRatio?: '16:9' | '9:16';
  resolution?: '360p' | '480p' | '720p' | '1080p';
  className?: string;
}

export const VideoPlayerWrapper: React.FC<VideoPlayerWrapperProps> = React.memo(({
  platform,
  streamUrl = '',
  dailyRoomUrl,
  isHost = false,
  userName = 'Spectateur',
  pinnedProduct,
  onOrderPinnedProduct,
  onLeaveLive,
  isCutoff = false,
  aspectRatio = '16:9',
  resolution = '720p',
  className = ''
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlayerActive, setIsPlayerActive] = useState(false);

  // 1. Extraction et formatage des URLs d'intégration sécurisées (sans redirection)
  const embedData = useMemo(() => {
    const raw = streamUrl.trim();

    switch (platform) {
      case 'youtube': {
        // Formats : https://www.youtube.com/watch?v=VIDEO_ID, https://youtu.be/VIDEO_ID, https://www.youtube.com/live/VIDEO_ID
        let videoId = 'jfKfPfyJRdk'; // Fallback démo live stream
        if (raw) {
          const matchWatch = raw.match(/[?&]v=([^&]+)/);
          const matchShort = raw.match(/youtu\.be\/([^?&]+)/);
          const matchLive = raw.match(/youtube\.com\/live\/([^?&]+)/);
          const matchEmbed = raw.match(/embed\/([^?&]+)/);
          if (matchWatch) videoId = matchWatch[1];
          else if (matchShort) videoId = matchShort[1];
          else if (matchLive) videoId = matchLive[1];
          else if (matchEmbed) videoId = matchEmbed[1];
          else if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) videoId = raw;
        }
        return {
          src: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&modestbranding=1&rel=0&controls=1`,
          type: 'iframe' as const,
          label: 'YouTube Live',
          brandColor: 'text-red-500',
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        };
      }

      case 'facebook': {
        const fbUrl = raw || 'https://www.facebook.com/facebook/videos/10153231379946729/';
        return {
          src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fbUrl)}&show_text=0&autoplay=1`,
          type: 'iframe' as const,
          label: 'Facebook Live',
          brandColor: 'text-blue-500',
          thumbnail: null
        };
      }

      case 'tiktok': {
        // Extrait ID TikTok ou utilise le lecteur de flux
        let tiktokId = '7170000000000000000';
        const matchTiktok = raw.match(/\/video\/(\d+)/) || raw.match(/\/live\/(\d+)/);
        if (matchTiktok) tiktokId = matchTiktok[1];
        return {
          src: `https://www.tiktok.com/player/v1/${tiktokId}?autoplay=1&music_info=1&description=1`,
          type: 'iframe' as const,
          label: 'TikTok Live',
          brandColor: 'text-rose-400',
          thumbnail: null
        };
      }

      case 'instagram': {
        let instaPath = 'reel/C4X9y2';
        const matchInsta = raw.match(/instagram\.com\/(p|reel|tv)\/([^/?#&]+)/);
        if (matchInsta) instaPath = `${matchInsta[1]}/${matchInsta[2]}`;
        return {
          src: `https://www.instagram.com/${instaPath}/embed/captioned/`,
          type: 'iframe' as const,
          label: 'Instagram Live',
          brandColor: 'text-fuchsia-400',
          thumbnail: null
        };
      }

      case 'linkedin': {
        return {
          src: raw ? `https://www.linkedin.com/embed/feed/update/${raw}` : 'https://www.linkedin.com/embed/feed/update/urn:li:activity:6850000000000000000',
          type: 'iframe' as const,
          label: 'LinkedIn Live',
          brandColor: 'text-sky-400',
          thumbnail: null
        };
      }

      case 'jitsi': {
        const rawUrl = raw || dailyRoomUrl || 'nana-live-room';
        const roomName = rawUrl.includes('meet.jit.si/') 
          ? rawUrl.split('meet.jit.si/')[1]?.split('?')[0]?.split('#')[0] 
          : rawUrl.replace(/[^a-zA-Z0-9_-]/g, '');
        return {
          src: `https://meet.jit.si/${encodeURIComponent(roomName || 'nana-live-room')}#userInfo.displayName="${encodeURIComponent(userName)}"&config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.disableDeepLinking=true`,
          type: 'jitsi' as const,
          label: 'Jitsi Meet HD',
          brandColor: 'text-cyan-400',
          thumbnail: null
        };
      }

      case 'zoom': {
        return {
          src: raw,
          type: 'meeting' as const,
          label: 'Zoom Meeting',
          brandColor: 'text-blue-400',
          thumbnail: null
        };
      }

      case 'google_meet': {
        return {
          src: raw,
          type: 'meeting' as const,
          label: 'Google Meet',
          brandColor: 'text-emerald-400',
          thumbnail: null
        };
      }

      case 'google_classroom': {
        return {
          src: raw,
          type: 'meeting' as const,
          label: 'Google Classroom',
          brandColor: 'text-amber-400',
          thumbnail: null
        };
      }

      case 'daily':
      default:
        return {
          src: dailyRoomUrl || raw || '',
          type: 'daily' as const,
          label: 'NaNa Live HD',
          brandColor: 'text-emerald-400',
          thumbnail: null
        };
    }
  }, [platform, streamUrl, dailyRoomUrl, userName]);

  const isVertical = aspectRatio === '9:16';
  const aspectContainerClass = isVertical 
    ? 'w-full max-w-sm sm:max-w-md aspect-[9/16] mx-auto' 
    : 'w-full aspect-video';

  return (
    <div className={`relative ${aspectContainerClass} rounded-2xl sm:rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center select-none ${className}`}>
      
      {/* 1. Rendu Native Daily.co (NaNa Live) */}
      {embedData.type === 'daily' ? (
        <DailyNativePlayer
          roomUrl={embedData.src}
          isHost={isHost}
          userName={userName}
          onLeave={onLeaveLive}
          isCutoff={isCutoff}
          className="w-full h-full"
        />
      ) : embedData.type === 'jitsi' ? (
        /* Rendu Salle Jitsi Meet Interactive intégrée */
        <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
          <iframe
            src={embedData.src}
            title={embedData.label}
            className="w-full h-full border-0 aspect-video pointer-events-auto"
            allow="camera; microphone; display-capture; autoplay; clipboard-run; fullscreen"
            allowFullScreen
          />
        </div>
      ) : embedData.type === 'meeting' ? (
        /* Rendu Session Réunion Externe (Zoom, Google Meet, Google Classroom) */
        <div className="w-full h-full relative flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/70 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-lg">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-white">{embedData.label}</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Votre accès sécurisé Nanasore est actif. Cliquez pour rejoindre la session en direct avec l'animateur :
            </p>
          </div>
          {embedData.src && (
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <a
                href={embedData.src}
                target="_blank"
                rel="noopener noreferrer"
                onClick={playValidationBeep}
                className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 transition cursor-pointer min-h-[44px]"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Ouvrir la session {embedData.label}</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  navigator.clipboard.writeText(embedData.src);
                }}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl transition cursor-pointer min-h-[44px]"
              >
                <span>Copier le lien</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Rendu Universel des Réseaux Sociaux avec Facade Pattern (Économie de bande passante 3G/4G) */
        <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
          {isPlayerActive ? (
            /*
              CRITICAL ANTI-REDIRECT SECURITY:
              Le sandbox omet délibérément 'allow-top-navigation' et 'allow-top-navigation-by-user-activation'
              pour bloquer toute tentative de redirection externe de la page principale !
            */
            <iframe
              src={embedData.src}
              title={embedData.label}
              className="w-full h-full border-0 aspect-video pointer-events-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
            />
          ) : (
            /* FACADE PLACEHOLDER : 0 script tiers téléchargé avant le clic utilisateur */
            <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
              {embedData.thumbnail ? (
                <img
                  src={embedData.thumbnail}
                  alt={embedData.label}
                  className="absolute inset-0 w-full h-full object-cover opacity-50 filter blur-[1px] scale-105"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/90" />
              )}

              {/* Voile d'ombrage & Vignettage */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/70 pointer-events-none" />

              {/* Bouton de déclenchement central avec interaction tactile instantanée */}
              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  setIsPlayerActive(true);
                }}
                className="group relative z-10 flex flex-col items-center gap-3 p-5 sm:p-6 rounded-3xl bg-slate-950/85 backdrop-blur-xl border border-white/15 hover:border-emerald-500/60 shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer max-w-[280px] sm:max-w-xs text-center"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/50 group-hover:from-emerald-500 group-hover:to-teal-400 group-hover:shadow-emerald-950/60 transition-all duration-300">
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 text-white fill-white ml-1 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-black text-white tracking-wide block">
                    Lancer le Live {embedData.label}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block mt-1">
                    Économiseur 3G/4G • Clic pour activer
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Bandeau d'en-tête de protection et identité */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-20">
            <div className="flex items-center gap-2 pointer-events-auto">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/95 text-white text-[10.5px] font-black shadow-lg backdrop-blur-md animate-pulse">
                <Radio className="w-3 h-3" />
                <span>DIRECT</span>
              </span>

              <span className="px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-200 text-[10.5px] font-bold shadow-md backdrop-blur-md">
                {embedData.label}
              </span>

              <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-slate-300 text-[10px] font-bold shadow-md backdrop-blur-md">
                {isVertical ? '▯ 9:16' : '▭ 16:9'} • {resolution || '720p HD'}
              </span>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold backdrop-blur-md">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Lecteur Sécurisé Anti-Redirection</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Bannière Flottante du Produit Épinglé en Direct (Live Shopping Overlay) */}
      {pinnedProduct && !isCutoff && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-sm z-30 animate-in slide-in-from-bottom duration-300">
          <div className="bg-slate-950/90 backdrop-blur-xl border-2 border-emerald-500/70 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 relative">
                {pinnedProduct.photoUrl ? (
                  <img src={pinnedProduct.photoUrl} alt={pinnedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-emerald-400 font-bold text-xs">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                )}
                <span className="absolute top-0 right-0 bg-rose-600 text-[8px] font-black px-1 rounded-bl">PROMO</span>
              </div>

              <div className="min-w-0">
                <div className="text-[10px] uppercase font-black tracking-wider text-emerald-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>En Vedette pendant le Direct</span>
                </div>
                <div className="text-xs font-black truncate">{pinnedProduct.name}</div>
                <div className="text-xs font-extrabold text-emerald-400">
                  {pinnedProduct.price.toLocaleString('fr-FR')} F CFA
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                if (onOrderPinnedProduct) onOrderPinnedProduct(pinnedProduct);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition shrink-0 cursor-pointer min-h-[40px] flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Acheter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default VideoPlayerWrapper;
