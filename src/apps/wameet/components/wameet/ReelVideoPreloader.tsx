/**
 * @file ReelVideoPreloader.tsx
 * @description Composant de pré-chargement invisible haute performance pour les Reels WaMeet.
 * 
 * Stratégie :
 * 1. Télécharge silencieusement les URLs des 2 vidéos suivantes (index + 1 et index + 2).
 * 2. Instancie des éléments <video preload="auto" muted playsInline /> invisibles
 *    pour initialiser la mémoire tampon du décodeur matériel vidéo natif du navigateur.
 * 3. Enclenche simultanément le pré-chauffage réseau dans le CacheStorage de la PWA.
 * Résultat : Déclenchement instantané à 0 ms dès que l'utilisateur swipe sur le Reel suivant.
 */

import React, { useEffect, useState } from 'react';
import { getOfflineVideoBlobUrl, REELS_VIDEO_CACHE_NAME, normalizeVideoUrl } from '../../../../services/wameetOfflineReelsService';

export interface ReelVideoPreloaderProps {
  urls: string[];
}

export const ReelVideoPreloader: React.FC<ReelVideoPreloaderProps> = ({ urls }) => {
  const [resolvedUrls, setResolvedUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!Array.isArray(urls) || urls.length === 0) {
      setResolvedUrls([]);
      return;
    }

    let isCancelled = false;

    // Résoudre en priorité les versions Blob du CacheStorage si déjà téléchargées
    Promise.all(
      urls.map(async (url) => {
        try {
          const blobUrl = await getOfflineVideoBlobUrl(url);
          return blobUrl || url;
        } catch {
          return url;
        }
      })
    ).then((finalUrls) => {
      if (!isCancelled) {
        setResolvedUrls(finalUrls.filter(Boolean));
      }
    });

    // Pré-chargement réseau discret dans le CacheStorage pour les 2 prochaines vidéos
    if (typeof window !== 'undefined' && 'caches' in window && navigator.onLine) {
      caches.open(REELS_VIDEO_CACHE_NAME).then((cache) => {
        urls.forEach((rawUrl) => {
          if (!rawUrl || rawUrl.startsWith('blob:') || rawUrl.includes('youtube.com')) return;
          const normalized = normalizeVideoUrl(rawUrl);

          cache.match(normalized).then((cached) => {
            if (!cached) {
              fetch(normalized, { mode: 'cors', credentials: 'omit' })
                .then((res) => {
                  if (res && (res.status === 200 || res.type === 'opaque')) {
                    cache.put(normalized, res);
                  }
                })
                .catch(() => {
                  // Repli sans échec
                  fetch(normalized, { mode: 'no-cors' })
                    .then((fallbackRes) => {
                      if (fallbackRes) cache.put(normalized, fallbackRes);
                    })
                    .catch(() => {});
                });
            }
          });
        });
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [urls]);

  if (resolvedUrls.length === 0) return null;

  const canPlayNativeHls = typeof document !== 'undefined' && Boolean(document.createElement('video').canPlayType('application/vnd.apple.mpegurl'));
  const preloadableVideoElements = resolvedUrls.filter(u => !u.includes('.m3u8') || canPlayNativeHls);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: 0,
        pointerEvents: 'none',
        opacity: 0,
        zIndex: -9999,
      }}
    >
      {preloadableVideoElements.map((videoSrc, i) => (
        <video
          key={`${videoSrc}-${i}`}
          src={videoSrc}
          preload="auto"
          muted
          playsInline
          webkit-playsinline="true"
          crossOrigin="anonymous"
          style={{ width: 1, height: 1 }}
        />
      ))}
    </div>
  );
};

export default ReelVideoPreloader;
