/**
 * ==============================================================================
 * Service Frontend : LiveStreamRouterService (Wameet / Nanasore Live Commerce)
 * ==============================================================================
 * 
 * Communique avec le Stream Router intelligent du backend (/api/lives/start) :
 * - Gère la sélection dynamique YouTube Live vs Jitsi Meet HD
 * - Récupère la configuration adaptée au lecteur vidéo du client
 * - Fournit l'état en temps réel du quota quotidien
 */

export type LiveStreamProvider = 'YOUTUBE' | 'JITSI';

export interface StartLiveOptions {
  storeId?: string;
  title?: string;
  description?: string;
  hostName?: string;
  hostAvatar?: string;
  forceProvider?: LiveStreamProvider;
  metadata?: Record<string, any>;
}

export interface LiveStreamQuotaInfo {
  todayCount: number;
  maxDailyLimit: number;
  date: string;
  quotaExceeded: boolean;
}

export interface StartLiveResponse {
  success: boolean;
  liveId: string;
  storeId: string;
  title: string;
  description?: string;
  hostName?: string;
  hostAvatar?: string;
  provider: LiveStreamProvider;
  providerType: LiveStreamProvider;
  isFallback: boolean;
  failoverReason?: string | null;
  quotaInfo?: LiveStreamQuotaInfo;
  youtube?: {
    videoId: string;
    broadcastId: string;
    watchUrl: string;
    embedUrl: string;
    rtmp?: {
      streamId: string;
      ingestionAddress: string;
      streamName?: string;
    };
  };
  jitsi?: {
    domain: string;
    roomName: string;
    joinUrl: string;
    embedUrl: string;
    options?: any;
  };
  embedUrl: string;
  streamUrl: string;
  status: 'live' | 'ended';
  startedAt: string;
  latencyMs?: number;
  error?: string;
}

import { getApiBaseUrl } from '../config/liveStreamConfig';

const API_BASE_URL = typeof window !== 'undefined'
  ? (window.location.hostname === 'localhost' ? 'http://localhost:10000' : getApiBaseUrl())
  : getApiBaseUrl();

/**
 * 1. Déclenche une session Live avec Stream Router & Failover automatique
 */
export async function startLiveStream(options: StartLiveOptions = {}): Promise<StartLiveResponse> {
  const payload = {
    storeId: options.storeId || 'nanasore_central_hub',
    title: options.title || 'Live Shopping Wameet 🔥',
    description: options.description || 'Session de vente en direct',
    hostName: options.hostName || 'Vendeur Wameet',
    hostAvatar: options.hostAvatar,
    forceProvider: options.forceProvider,
    metadata: options.metadata || {}
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/lives/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Erreur serveur ${res.status}: ${res.statusText}`);
    }

    const data: StartLiveResponse = await res.json();
    return data;
  } catch (err: any) {
    console.warn('[LIVE ROUTER CLIENT] Erreur appel API backend, fallback local Jitsi :', err.message);

    // Fallback local d'extrême urgence si le backend Render est en veille (Cold Start)
    const storeClean = (options.storeId || 'nanasore').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const shortId = Math.random().toString(36).substring(2, 8);
    const roomName = `wameet_${storeClean}_${shortId}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}`;

    return {
      success: true,
      liveId: `live_fallback_${Date.now()}`,
      storeId: options.storeId || 'nanasore_central_hub',
      title: options.title || 'Live Shopping Wameet',
      provider: 'JITSI',
      providerType: 'JITSI',
      isFallback: true,
      failoverReason: `CLIENT_OFFLINE_OR_COLD_START: ${err.message}`,
      jitsi: {
        domain: 'meet.jit.si',
        roomName,
        joinUrl: jitsiUrl,
        embedUrl: `${jitsiUrl}#userInfo.displayName="${encodeURIComponent(options.hostName || 'Vendeur')}"&config.prejoinPageEnabled=false`
      },
      embedUrl: jitsiUrl,
      streamUrl: jitsiUrl,
      status: 'live',
      startedAt: new Date().toISOString(),
      latencyMs: 1
    };
  }
}

/**
 * 2. Récupère le statut du quota YouTube quotidien
 */
export async function getLiveStreamQuota(): Promise<LiveStreamQuotaInfo | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/lives/quota`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      todayCount: data.currentCount || data.todayCount || 0,
      maxDailyLimit: data.maxLimit || data.maxDailyLimit || 30,
      date: data.today || data.date || new Date().toISOString().split('T')[0],
      quotaExceeded: !data.allowed
    };
  } catch (err) {
    console.warn('[LIVE ROUTER CLIENT] Impossible de lire le quota :', err);
    return null;
  }
}

/**
 * 3. Arrête une session de Live
 */
export async function stopLiveStream(liveId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/lives/${liveId}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ liveId })
    });
    return res.ok;
  } catch (err) {
    console.warn('[LIVE ROUTER CLIENT] Erreur clôture live :', err);
    return false;
  }
}
