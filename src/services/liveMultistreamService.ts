/**
 * @file liveMultistreamService.ts
 * @description Service Frontend pour le pilotage du Live & Multistreaming Réel.
 *
 * SÉCURITÉ PRODUCTION :
 * - Les clés secrètes RTMP ne sont JAMAIS écrites ni lues dans `public.live_sessions` côté client.
 * - Elles sont chiffrées/stockées exclusivement dans `public.server_security_vault` via Northflank (#1 primaire).
 * - Les spectateurs publics utilisent uniquement `loadPublicLiveWhatsappUrl` (zéro secret exposé).
 */

import { getApiBaseUrl, fetchLiveApiWithFailover } from '../config/liveStreamConfig';
import {
  StoreMultistreamConfig,
  MultistreamStatusResponse,
} from '../types/multistream';

// Mémorisation en mémoire vive des jetons HMAC d'arrêt pour `navigator.sendBeacon` à la fermeture d'onglet
const relayStopTokenMemory = new Map<string, string>();

export const DEFAULT_MULTISTREAM_CONFIG: StoreMultistreamConfig = {
  storeSlug: '',
  isNanasoreLiveEnabled: true,
  youtubeStreamKey: '',
  youtubeEnabled: false,
  facebookStreamKey: '',
  facebookEnabled: false,
  twitchStreamKey: '',
  twitchEnabled: false,
  tiktokServerUrl: '',
  tiktokStreamKey: '',
  tiktokEnabled: false,
  instagramServerUrl: 'rtmps://live-upload.instagram.com:443/rtmp/',
  instagramStreamKey: '',
  instagramEnabled: false,
  linkedinServerUrl: '',
  linkedinStreamKey: '',
  linkedinEnabled: false,
  twitterServerUrl: '',
  twitterStreamKey: '',
  twitterEnabled: false,
  telegramServerUrl: 'rtmps://dc4-1.rtmp.t.me/s/',
  telegramStreamKey: '',
  telegramEnabled: false,
  whatsappChannelUrl: '',
  customRtmpDestinations: [],
};

/**
 * Lecture publique (spectateurs / acheteurs sur nsore.shop) : retourne UNIQUEMENT le lien WhatsApp public,
 * sans jamais requêter ni exposer aucune clé RTMP.
 */
export async function loadPublicLiveWhatsappUrl(storeSlug: string): Promise<string> {
  const cleanSlug = (storeSlug || '').trim();
  if (!cleanSlug) return '';

  try {
    const res = await fetchLiveApiWithFailover(
      `/api/lives/public-meta?storeSlug=${encodeURIComponent(cleanSlug)}`,
      { method: 'GET' },
      { attachAuth: false, timeoutMs: 4500 }
    );
    if (res.ok) {
      const data = await res.json();
      return String(data?.whatsappChannelUrl || '').trim();
    }
  } catch {
    // Silencieux en mode spectateur
  }
  return '';
}

/**
 * Récupère la configuration Multistream privée du marchand authentifié depuis le coffre serveur Northflank.
 */
export async function loadStoreMultistreamConfig(storeSlug: string): Promise<StoreMultistreamConfig> {
  if (!storeSlug) return { ...DEFAULT_MULTISTREAM_CONFIG };

  const cleanSlug = storeSlug.trim();
  let loadedConfig: Partial<StoreMultistreamConfig> = {};

  try {
    const res = await fetchLiveApiWithFailover(
      `/api/lives/multistream/config?storeSlug=${encodeURIComponent(cleanSlug)}`,
      { method: 'GET' }
    );
    if (res.ok) {
      const json = await res.json();
      if (json?.config && typeof json.config === 'object') {
        loadedConfig = { ...json.config };
      }
    }
  } catch (err) {
    console.warn('[MULTISTREAM SERVICE] Lecture coffre serveur en repli :', err);
  }

  return {
    ...DEFAULT_MULTISTREAM_CONFIG,
    ...loadedConfig,
    storeSlug: cleanSlug,
  };
}

/**
 * Sauvegarde la configuration Multistream dans le coffre serveur sécurisé (`server_security_vault`).
 * Supprime également toute ancienne trace en clair qui aurait pu exister dans localStorage.
 */
export async function saveStoreMultistreamConfig(
  storeSlug: string,
  config: StoreMultistreamConfig
): Promise<boolean> {
  if (!storeSlug) return false;
  const cleanSlug = storeSlug.trim();
  const payloadToSave: StoreMultistreamConfig = {
    ...config,
    storeSlug: cleanSlug,
    updatedAt: new Date().toISOString(),
  };

  // Nettoyage proactif d'éventuelles anciennes clés en clair stockées autrefois dans localStorage
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`nanasore_multistream_cfg_${cleanSlug}`);
    }
  } catch {}

  try {
    const res = await fetchLiveApiWithFailover('/api/lives/multistream/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeSlug: cleanSlug,
        config: payloadToSave,
      }),
    });

    if (!res.ok) {
      return false;
    }
    const data = await res.json();
    return Boolean(data?.success);
  } catch (err) {
    console.error('[MULTISTREAM SERVICE] Échec sauvegarde coffre serveur :', err);
    return false;
  }
}

/**
 * Démarre la multidiffusion simultanée côté serveur (Northflank #1 Primaire / FFmpeg)
 */
export async function startMultistreamRelay(
  storeSlug: string,
  config: StoreMultistreamConfig
): Promise<{ success: boolean; message?: string; totalLaunched?: number; error?: string }> {
  const destinationsPayload: any = {
    youtube: {
      enabled: !!config.youtubeEnabled && !!config.youtubeStreamKey,
      streamKey: config.youtubeStreamKey || '',
    },
    facebook: {
      enabled: !!config.facebookEnabled && !!config.facebookStreamKey,
      streamKey: config.facebookStreamKey || '',
    },
    twitch: {
      enabled: !!config.twitchEnabled && !!config.twitchStreamKey,
      streamKey: config.twitchStreamKey || '',
    },
    tiktok: {
      enabled: !!config.tiktokEnabled && !!config.tiktokStreamKey,
      serverUrl: config.tiktokServerUrl || '',
      streamKey: config.tiktokStreamKey || '',
    },
    instagram: {
      enabled: !!config.instagramEnabled && !!config.instagramStreamKey,
      serverUrl: config.instagramServerUrl || 'rtmps://live-upload.instagram.com:443/rtmp/',
      streamKey: config.instagramStreamKey || '',
    },
    linkedin: {
      enabled: !!config.linkedinEnabled && !!config.linkedinStreamKey,
      serverUrl: config.linkedinServerUrl || '',
      streamKey: config.linkedinStreamKey || '',
    },
    twitter: {
      enabled: !!config.twitterEnabled && !!config.twitterStreamKey,
      serverUrl: config.twitterServerUrl || '',
      streamKey: config.twitterStreamKey || '',
    },
    telegram: {
      enabled: !!config.telegramEnabled && !!config.telegramStreamKey,
      serverUrl: config.telegramServerUrl || 'rtmps://dc4-1.rtmp.t.me/s/',
      streamKey: config.telegramStreamKey || '',
    },
    custom: (config.customRtmpDestinations || []).filter((d) => d.enabled && d.serverUrl && d.streamKey),
  };

  try {
    const res = await fetchLiveApiWithFailover('/api/lives/multistream/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeSlug,
        destinations: destinationsPayload,
      }),
    });

    const data = await res.json();
    if (data?.stopToken && storeSlug) {
      relayStopTokenMemory.set(storeSlug.trim(), String(data.stopToken));
    }
    return data;
  } catch (err: any) {
    console.error('[MULTISTREAM START] Erreur requête :', err);
    return {
      success: false,
      error: `Erreur communication serveur : ${err?.message}`,
    };
  }
}

/**
 * Arrête tous les relais ou une destination spécifique
 */
export async function stopMultistreamRelay(
  storeSlug: string,
  platformId?: string
): Promise<{ success: boolean; stoppedCount?: number; error?: string }> {
  try {
    const stopToken = relayStopTokenMemory.get((storeSlug || '').trim());
    const res = await fetchLiveApiWithFailover('/api/lives/multistream/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeSlug, platformId, stopToken }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Vérifie si au moins une destination RTMP est activée et configurée
 */
export function hasEnabledMultistreamDestinations(config: StoreMultistreamConfig | null): boolean {
  if (!config) return false;
  if (config.youtubeEnabled && config.youtubeStreamKey?.trim()) return true;
  if (config.facebookEnabled && config.facebookStreamKey?.trim()) return true;
  if (config.twitchEnabled && config.twitchStreamKey?.trim()) return true;
  if (config.tiktokEnabled && config.tiktokServerUrl?.trim() && config.tiktokStreamKey?.trim()) return true;
  if (config.instagramEnabled && config.instagramStreamKey?.trim()) return true;
  if (config.linkedinEnabled && config.linkedinServerUrl?.trim() && config.linkedinStreamKey?.trim()) return true;
  if (config.twitterEnabled && config.twitterServerUrl?.trim() && config.twitterStreamKey?.trim()) return true;
  if (config.telegramEnabled && config.telegramStreamKey?.trim()) return true;
  if (
    Array.isArray(config.customRtmpDestinations) &&
    config.customRtmpDestinations.some((d) => d.enabled && d.serverUrl?.trim() && d.streamKey?.trim())
  ) {
    return true;
  }
  return false;
}

/**
 * Envoie un signal d'arrêt authentifié par `stopToken` HMAC lors de la fermeture de l'onglet navigateur (beforeunload)
 */
export function stopMultistreamRelayBeacon(storeSlug: string): void {
  if (!storeSlug) return;
  const cleanSlug = storeSlug.trim();
  const stopToken = relayStopTokenMemory.get(cleanSlug);
  if (!stopToken) return;

  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/lives/multistream/stop`;
  const body = JSON.stringify({ storeSlug: cleanSlug, stopToken });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
      return;
    }
  } catch (_) {}

  try {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch (_) {}
}

/**
 * Récupère le statut en temps réel de tous les relais d'une boutique (protégé JWT marchand)
 */
export async function getMultistreamStatus(
  storeSlug: string
): Promise<MultistreamStatusResponse | null> {
  try {
    const res = await fetchLiveApiWithFailover(
      `/api/lives/multistream/status?storeSlug=${encodeURIComponent(storeSlug)}`,
      { method: 'GET' }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

/**
 * Génère le lien de partage WhatsApp pré-rempli et le lien public Live Nanasore
 */
export function buildWhatsAppLiveShare(
  storeSlug: string,
  storeName: string = 'Notre Boutique',
  liveTitle: string = 'Vente Directe en Direct 🔥'
): {
  publicLiveUrl: string;
  shareMessage: string;
  whatsAppShareUrl: string;
} {
  const publicLiveOrigin =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PUBLIC_LIVE_DOMAIN) ||
    'https://nsore.shop';
  const publicLiveUrl = `${String(publicLiveOrigin).replace(/\/+$/, '')}/live/${storeSlug}`;

  const shareMessage =
    `🔴 *DIRECT EN COURS SUR ${storeName.toUpperCase()}* 🔴\n\n` +
    `📺 *${liveTitle}*\n\n` +
    `Profitez des offres exclusives en direct et commandez en 1 clic par Mobile Money !\n\n` +
    `👉 Cliquez sur le lien pour voir le Live :\n${publicLiveUrl}`;

  const whatsAppShareUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  return {
    publicLiveUrl,
    shareMessage,
    whatsAppShareUrl,
  };
}
