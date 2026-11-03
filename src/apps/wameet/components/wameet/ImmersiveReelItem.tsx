import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { getOfflineVideoBlobUrl } from '../../../../services/wameetOfflineReelsService';
import { resolvePosterFromVideoUrl } from '../../../../services/s3UploadService';

export interface ImmersiveReelItemProps {
  videoUrl: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  isActive?: boolean;
  className?: string;
  isMuted?: boolean;
  muted?: boolean;
  videoRef?: React.Ref<HTMLVideoElement>;
  onClick?: (e: React.MouseEvent<HTMLDivElement | HTMLVideoElement>) => void;
}

export default function ImmersiveReelItem({
  videoUrl,
  posterUrl,
  thumbnailUrl,
  isActive = false,
  className = 'w-full h-full object-cover',
  isMuted,
  muted,
  videoRef: externalVideoRef,
  onClick
}: ImmersiveReelItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>(videoUrl);
  const [isOfflineSource, setIsOfflineSource] = useState<boolean>(false);

  // Poster prioritaire : thumbnail explicite, puis poster explicite, puis poster.jpg déduit de compressed-reels
  const effectivePoster = thumbnailUrl || posterUrl || resolvePosterFromVideoUrl(resolvedVideoUrl) || resolvePosterFromVideoUrl(videoUrl);

  // 1. Résolution de la source : vérification du CacheStorage avant tout fetch réseau
  useEffect(() => {
    let isCancelled = false;

    getOfflineVideoBlobUrl(videoUrl)
      .then((blobUrl) => {
        if (isCancelled) return;
        if (blobUrl) {
          setResolvedVideoUrl(blobUrl);
          setIsOfflineSource(true);
        } else {
          setResolvedVideoUrl(videoUrl);
          setIsOfflineSource(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setResolvedVideoUrl(videoUrl);
          setIsOfflineSource(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [videoUrl]);

  // Synchronisation de la ref externe
  useEffect(() => {
    if (!externalVideoRef) return;
    if (typeof externalVideoRef === 'function') {
      externalVideoRef(videoRef.current);
    } else if (typeof externalVideoRef === 'object') {
      (externalVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = videoRef.current;
    }
  }, [externalVideoRef]);

  // Synchronisation du son
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (typeof isMuted === 'boolean') {
      video.muted = isMuted;
    } else if (typeof muted === 'boolean') {
      video.muted = muted;
    }
  }, [isMuted, muted]);

  // 2. Gestion du flux vidéo : support natif Safari / iOS ou attachement Hls.js pour flux .m3u8 S3
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Nettoyage de l'instance Hls précédente
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!resolvedVideoUrl) return;

    const isHls = resolvedVideoUrl.includes('.m3u8');

    if (isHls) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Support HLS natif (Safari iOS / macOS)
        video.src = resolvedVideoUrl;
      } else if (Hls.isSupported()) {
        // Navigateurs modernes avec MSE (Chrome, Android, Edge, Firefox)
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          maxBufferLength: 15,
        });
        hls.loadSource(resolvedVideoUrl);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          if (isActive) {
            video.play().catch(() => {});
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });
      } else {
        video.src = resolvedVideoUrl;
      }
    } else {
      // Fichier MP4 standard, WebM ou blob CacheStorage
      video.src = resolvedVideoUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [resolvedVideoUrl]);

  // 3. Contrôle de lecture par rapport au statut actif/inactif du Reel
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      setIsLoading(true);
      if (video.ended) {
        video.currentTime = 0;
      }
      
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsLoading(false);
          })
          .catch((err) => {
            console.warn("Autoplay bloqué, passage en mode mute forcé :", err);
            video.muted = true;
            video.play().then(() => setIsLoading(false)).catch(() => setIsLoading(false));
          });
      }
    } else {
      video.pause();
      setIsLoading(false);
    }
  }, [isActive]);

  // Repli automatique vers le blob CacheStorage en cas d'erreur de lecture réseau
  const handleVideoError = async () => {
    if (!isOfflineSource) {
      try {
        const fallbackBlob = await getOfflineVideoBlobUrl(videoUrl);
        if (fallbackBlob && fallbackBlob !== resolvedVideoUrl) {
          setResolvedVideoUrl(fallbackBlob);
          setIsOfflineSource(true);
          return;
        }
      } catch {}
    }
    setIsLoading(false);
  };

  return (
    <div
      onClick={onClick}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none"
    >
      {/* Poster d'attente instantané pour éliminer tout écran noir avant le démarrage de la vidéo */}
      {effectivePoster && (
        <img
          src={effectivePoster}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${
            isLoading ? 'opacity-100 z-5' : 'opacity-0 -z-10'
          }`}
          loading="eager"
        />
      )}

      {/* Indicateur de chargement discret */}
      {isLoading && isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 pointer-events-none">
          <div className="w-8 h-8 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      <video
        ref={videoRef}
        poster={effectivePoster}
        playsInline
        webkit-playsinline="true"
        loop
        muted={isMuted !== undefined ? isMuted : (muted !== undefined ? muted : true)}
        preload="auto"
        autoPlay={isActive}
        className={className}
        onLoadedData={() => setIsLoading(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onError={handleVideoError}
      />
    </div>
  );
}
