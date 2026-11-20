/**
 * @file liveMultistreamService.ts
 * @description Service Frontend pour le pilotage du générateur de Live & Multistreaming Réel
 * Communique avec Supabase (persistance SQL des configurations) et Northflank (pilotage FFmpeg).
 */

import { supabase } from '../lib/supabase';
import { getApiBaseUrl } from '../config/liveStreamConfig';
import { 
  StoreMultistreamConfig, 
  MultistreamStatusResponse, 
  PlatformRelayState 
} from '../types/multistream';

const STORAGE_KEY_PREFIX = 'nanasore_multistream_cfg_';

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
  customRtmpDestinations: []
};

/**
 * Récupère la configuration Multistream depuis Supabase (avec fallback LocalStorage)
 */
export async function loadStoreMultistreamConfig(storeSlug: string): Promise<StoreMultistreamConfig> {
  if (!storeSlug) return { ...DEFAULT_MULTISTREAM_CONFIG };

  const cleanSlug = storeSlug.trim();
  let loadedConfig: Partial<StoreMultistreamConfig> = {};

  try {
    // 1. Tente de lire depuis la table live_sessions
    const { data, error } = await supabase
      .from('live_sessions')
      .select('multistream_config, youtube_stream_key, facebook_stream_key, twitch_stream_key, tiktok_server_url, tiktok_stream_key, instagram_server_url, instagram_stream_key, linkedin_server_url, linkedin_stream_key, twitter_server_url, twitter_stream_key, telegram_server_url, telegram_stream_key, whatsapp_channel_url, custom_rtmp_destinations')
      .or(`id.eq.${cleanSlug},tenant_id.eq.${cleanSlug}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      if (data.multistream_config && typeof data.multistream_config === 'object') {
        loadedConfig = { ...data.multistream_config };
      } else {
        // Lecture colonnes individuelles
        loadedConfig = {
          youtubeStreamKey: data.youtube_stream_key || '',
          youtubeEnabled: !!data.youtube_stream_key,
          facebookStreamKey: data.facebook_stream_key || '',
          facebookEnabled: !!data.facebook_stream_key,
          twitchStreamKey: data.twitch_stream_key || '',
          twitchEnabled: !!data.twitch_stream_key,
          tiktokServerUrl: data.tiktok_server_url || '',
          tiktokStreamKey: data.tiktok_stream_key || '',
          tiktokEnabled: !!data.tiktok_stream_key,
          instagramServerUrl: data.instagram_server_url || 'rtmps://live-upload.instagram.com:443/rtmp/',
          instagramStreamKey: data.instagram_stream_key || '',
          instagramEnabled: !!data.instagram_stream_key,
          linkedinServerUrl: data.linkedin_server_url || '',
          linkedinStreamKey: data.linkedin_stream_key || '',
          linkedinEnabled: !!data.linkedin_stream_key,
          twitterServerUrl: data.twitter_server_url || '',
          twitterStreamKey: data.twitter_stream_key || '',
          twitterEnabled: !!data.twitter_stream_key,
          telegramServerUrl: data.telegram_server_url || 'rtmps://dc4-1.rtmp.t.me/s/',
          telegramStreamKey: data.telegram_stream_key || '',
          telegramEnabled: !!data.telegram_stream_key,
          whatsappChannelUrl: data.whatsapp_channel_url || '',
          customRtmpDestinations: Array.isArray(data.custom_rtmp_destinations) ? data.custom_rtmp_destinations : []
        };
      }
    }
  } catch (err) {
    console.warn('[MULTISTREAM SERVICE] Supabase read fallback:', err);
  }

  // Fallback cache local si des champs sont manquants
  try {
    const rawLocal = localStorage.getItem(`${STORAGE_KEY_PREFIX}${cleanSlug}`);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      loadedConfig = { ...parsed, ...loadedConfig };
    }
  } catch (_) {}

  return {
    ...DEFAULT_MULTISTREAM_CONFIG,
    ...loadedConfig,
    storeSlug: cleanSlug
  };
}

/**
 * Sauvegarde la configuration Multistream dans Supabase SQL et en local
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
    updatedAt: new Date().toISOString()
  };

  // 1. Sauvegarde locale immédiate
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${cleanSlug}`, JSON.stringify(payloadToSave));
  } catch (_) {}

  // 2. Sauvegarde Supabase SQL
  try {
    const { error } = await supabase
      .from('live_sessions')
      .upsert({
        id: cleanSlug,
        tenant_id: cleanSlug,
        multistream_config: payloadToSave,
        youtube_stream_key: payloadToSave.youtubeStreamKey || null,
        facebook_stream_key: payloadToSave.facebookStreamKey || null,
        twitch_stream_key: payloadToSave.twitchStreamKey || null,
        tiktok_server_url: payloadToSave.tiktokServerUrl || null,
        tiktok_stream_key: payloadToSave.tiktokStreamKey || null,
        instagram_server_url: payloadToSave.instagramServerUrl || null,
        instagram_stream_key: payloadToSave.instagramStreamKey || null,
        linkedin_server_url: payloadToSave.linkedinServerUrl || null,
        linkedin_stream_key: payloadToSave.linkedinStreamKey || null,
        twitter_server_url: payloadToSave.twitterServerUrl || null,
        twitter_stream_key: payloadToSave.twitterStreamKey || null,
        telegram_server_url: payloadToSave.telegramServerUrl || null,
        telegram_stream_key: payloadToSave.telegramStreamKey || null,
        whatsapp_channel_url: payloadToSave.whatsappChannelUrl || null,
        custom_rtmp_destinations: payloadToSave.customRtmpDestinations || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.warn('[MULTISTREAM SERVICE] Erreur upsert Supabase :', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[MULTISTREAM SERVICE] Échec persistance Supabase :', err);
    return false;
  }
}

/**
 * Démarre le multidiffusion simultané côté serveur (Northflank Node.js / FFmpeg)
 */
export async function startMultistreamRelay(
  storeSlug: string,
  config: StoreMultistreamConfig
): Promise<{ success: boolean; message?: string; totalLaunched?: number; error?: string }> {
  const baseUrl = getApiBaseUrl();

  const destinationsPayload: any = {
    youtube: {
      enabled: !!config.youtubeEnabled && !!config.youtubeStreamKey,
      streamKey: config.youtubeStreamKey || ''
    },
    facebook: {
      enabled: !!config.facebookEnabled && !!config.facebookStreamKey,
      streamKey: config.facebookStreamKey || ''
    },
    twitch: {
      enabled: !!config.twitchEnabled && !!config.twitchStreamKey,
      streamKey: config.twitchStreamKey || ''
    },
    tiktok: {
      enabled: !!config.tiktokEnabled && !!config.tiktokStreamKey,
      serverUrl: config.tiktokServerUrl || '',
      streamKey: config.tiktokStreamKey || ''
    },
    instagram: {
      enabled: !!config.instagramEnabled && !!config.instagramStreamKey,
      serverUrl: config.instagramServerUrl || 'rtmps://live-upload.instagram.com:443/rtmp/',
      streamKey: config.instagramStreamKey || ''
    },
    linkedin: {
      enabled: !!config.linkedinEnabled && !!config.linkedinStreamKey,
      serverUrl: config.linkedinServerUrl || '',
      streamKey: config.linkedinStreamKey || ''
    },
    twitter: {
      enabled: !!config.twitterEnabled && !!config.twitterStreamKey,
      serverUrl: config.twitterServerUrl || '',
      streamKey: config.twitterStreamKey || ''
    },
    telegram: {
      enabled: !!config.telegramEnabled && !!config.telegramStreamKey,
      serverUrl: config.telegramServerUrl || 'rtmps://dc4-1.rtmp.t.me/s/',
      streamKey: config.telegramStreamKey || ''
    },
    custom: (config.customRtmpDestinations || []).filter(d => d.enabled && d.serverUrl && d.streamKey)
  };

  try {
    const res = await fetch(`${baseUrl}/api/lives/multistream/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeSlug,
        destinations: destinationsPayload
      })
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('[MULTISTREAM START] Erreur requête :', err);
    return {
      success: false,
      error: `Erreur communication serveur : ${err?.message}`
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
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/lives/multistream/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeSlug, platformId })
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
    config.customRtmpDestinations.some(d => d.enabled && d.serverUrl?.trim() && d.streamKey?.trim())
  ) {
    return true;
  }
  return false;
}

/**
 * Envoie un signal d'arrêt fiable lors de la fermeture de l'onglet navigateur (beforeunload)
 */
export function stopMultistreamRelayBeacon(storeSlug: string): void {
  if (!storeSlug) return;
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/lives/multistream/stop`;
  const body = JSON.stringify({ storeSlug });

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
      keepalive: true
    }).catch(() => {});
  } catch (_) {}
}

/**
 * Récupère le statut en temps réel de tous les relais d'une boutique
 */
export async function getMultistreamStatus(
  storeSlug: string
): Promise<MultistreamStatusResponse | null> {
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/lives/multistream/status?storeSlug=${encodeURIComponent(storeSlug)}`);
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

  const shareMessage = `🔴 *DIRECT EN COURS SUR ${storeName.toUpperCase()}* 🔴\n\n` +
    `📺 *${liveTitle}*\n\n` +
    `Profitez des offres exclusives en direct et commandez en 1 clic par Mobile Money !\n\n` +
    `👉 Cliquez sur le lien pour voir le Live :\n${publicLiveUrl}`;

  const whatsAppShareUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  return {
    publicLiveUrl,
    shareMessage,
    whatsAppShareUrl
  };
}
