/**
 * @file liveStreamConfig.ts
 * @description Configuration centralisée des endpoints Live & Backend Haute Disponibilité.
 *
 * Architecture Production Dual-Cloud (Northflank #1 Primaire Always-On, Render #2 Secours) :
 * 1. Backend API Principal (#1 Always-On, zéro sommeil) : https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run
 * 2. Backend API Secondaire (#2 Failover secours)      : https://nanaswitch-bot-render-0kqp.onrender.com
 * 3. Ingestion caméra vendeur (MediaMTX WHIP - 8889)   : https://p01--nanasore-live--p8yx28yyjhbx.code.run
 * 4. Diffusion lecteur acheteur (MediaMTX HLS - 8888)  : https://p02--nanasore-live--p8yx28yyjhbx.code.run
 */

import { supabase } from '../lib/supabase';

// 1. Endpoints Backend API (Northflank en #1 absolu, Render en #2 secours)
export const PRIMARY_NORTHFLANK_API_URL = 'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run';
export const SECONDARY_RENDER_API_URL = 'https://nanaswitch-bot-render-0kqp.onrender.com';
export const DEFAULT_API_URL = PRIMARY_NORTHFLANK_API_URL;

// Domaine Jitsi sans coupure 5 minutes ni mur modérateur (remplace meet.jit.si public)
export const DEFAULT_JITSI_DOMAIN = 'meet.ffmuc.net';

export function getSafeJitsiDomain(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JITSI_DOMAIN) {
    const custom = String(import.meta.env.VITE_JITSI_DOMAIN).trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (custom && custom !== 'meet.jit.si') return custom;
  }
  return DEFAULT_JITSI_DOMAIN;
}

/**
 * Réécrit toute URL meet.jit.si héritée (coupure 5 min en iframe) vers un cluster Jitsi ouvert sans limite.
 */
export function normalizeSafeJitsiUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes('meet.jit.si/')) {
    return trimmed.replace(/https?:\/\/meet\.jit\.si\//i, `https://${getSafeJitsiDomain()}/`);
  }
  return trimmed;
}

export function getApiBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_NORTHFLANK_API_URL) {
      return String(import.meta.env.VITE_NORTHFLANK_API_URL).replace(/\/+$/, '');
    }
    if (import.meta.env.VITE_API_URL) {
      const candidate = String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '');
      // Garantit que Northflank reste toujours prioritaire face à un ancien domaine Render endormi
      if (candidate && !candidate.includes('onrender.com')) {
        return candidate;
      }
    }
    if ((import.meta.env as any).PUBLIC_API_URL) {
      const pub = String((import.meta.env as any).PUBLIC_API_URL).trim().replace(/\/+$/, '');
      if (pub && !pub.includes('onrender.com')) return pub;
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    const srvUrl = process.env.NORTHFLANK_API_URL || process.env.API_URL || process.env.VITE_API_URL;
    if (srvUrl && !srvUrl.includes('onrender.com')) {
      return srvUrl.replace(/\/+$/, '');
    }
  }
  return PRIMARY_NORTHFLANK_API_URL;
}

/**
 * Retourne la liste ordonnée des backends à interroger :
 * En production : 1) Northflank (Always-On) -> 2) Origine courante -> 3) Render (Secours)
 * En développement local : 1) Origine locale / localhost:10000 -> 2) Northflank
 */
export function getOrderedApiBaseUrls(): string[] {
  const list: string[] = [];
  const pushUnique = (u?: string | null) => {
    const clean = (u || '').trim().replace(/\/+$/, '');
    if (clean && !list.includes(clean)) list.push(clean);
  };

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
      pushUnique(window.location.port === '10000' ? window.location.origin : 'http://localhost:10000');
      pushUnique(window.location.origin);
      pushUnique(PRIMARY_NORTHFLANK_API_URL);
      return list;
    }
  }

  // Production : Northflank TOUJOURS en #1 (ne dort jamais)
  pushUnique(getApiBaseUrl());
  pushUnique(PRIMARY_NORTHFLANK_API_URL);
  if (typeof window !== 'undefined' && window.location.origin.startsWith('http')) {
    pushUnique(window.location.origin);
  }
  pushUnique(SECONDARY_RENDER_API_URL);
  return list;
}

/**
 * Récupère les en-têtes d'authentification (Bearer JWT Supabase) sans jamais bloquer l'appelant.
 */
export async function getLiveApiAuthHeaders(
  extraHeaders?: Record<string, string>
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    ...(extraHeaders || {}),
  };

  if (!headers['Authorization'] && !headers['authorization']) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Mode spectateur public anonyme
    }
  }

  return headers;
}

/**
 * Exécute un appel HTTP vers Northflank (#1 primaire Always-On) avec bascule automatique
 * vers l'origine courante / Render (#2 secours) uniquement en cas d'indisponibilité réseau ou 502/503/504.
 */
export async function fetchLiveApiWithFailover(
  endpointPath: string,
  init: RequestInit = {},
  options: { timeoutMs?: number; attachAuth?: boolean } = {}
): Promise<Response> {
  const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const bases = getOrderedApiBaseUrls();
  const timeoutMs = options.timeoutMs ?? 8000;
  const shouldAttachAuth = options.attachAuth !== false;

  const baseHeaders: Record<string, string> = {};
  if (init.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => {
        baseHeaders[k] = v;
      });
    } else if (Array.isArray(init.headers)) {
      for (const [k, v] of init.headers) baseHeaders[k] = v;
    } else {
      Object.assign(baseHeaders, init.headers as Record<string, string>);
    }
  }

  const finalHeaders = shouldAttachAuth ? await getLiveApiAuthHeaders(baseHeaders) : baseHeaders;
  let lastError: any = null;
  let lastGatewayResponse: Response | null = null;

  for (let i = 0; i < bases.length; i++) {
    const url = `${bases[i]}${cleanPath}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...init,
        headers: finalHeaders,
        signal: init.signal || controller.signal,
      });
      clearTimeout(timer);

      // Si le backend répond (même 4xx métier/auth), on retourne immédiatement sans basculer
      if (res.status !== 502 && res.status !== 503 && res.status !== 504) {
        return res;
      }
      lastGatewayResponse = res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
    }
  }

  if (lastGatewayResponse) return lastGatewayResponse;
  throw lastError || new Error(`Impossible de joindre le serveur Live (${cleanPath}).`);
}

// 2. Serveur d'Ingestion Vendeur WebRTC WHIP (MediaMTX)
export const DEFAULT_LIVE_WHIP_URL = 'https://p01--nanasore-live--p8yx28yyjhbx.code.run';

export function getLiveWhipBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_LIVE_WHIP_URL) return import.meta.env.VITE_LIVE_WHIP_URL;
    if ((import.meta.env as any).PUBLIC_LIVE_WHIP_URL) return (import.meta.env as any).PUBLIC_LIVE_WHIP_URL;
  }
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.VITE_LIVE_WHIP_URL) return process.env.VITE_LIVE_WHIP_URL;
    if (process.env.LIVE_WHIP_URL) return process.env.LIVE_WHIP_URL;
  }
  return DEFAULT_LIVE_WHIP_URL;
}

// 3. Serveur de Diffusion Acheteur HLS (MediaMTX)
export const DEFAULT_LIVE_HLS_URL = 'https://p02--nanasore-live--p8yx28yyjhbx.code.run';

export function getLiveHlsBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_LIVE_HLS_URL) return import.meta.env.VITE_LIVE_HLS_URL;
    if ((import.meta.env as any).PUBLIC_LIVE_HLS_URL) return (import.meta.env as any).PUBLIC_LIVE_HLS_URL;
  }
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.VITE_LIVE_HLS_URL) return process.env.VITE_LIVE_HLS_URL;
    if (process.env.LIVE_HLS_URL) return process.env.LIVE_HLS_URL;
  }
  return DEFAULT_LIVE_HLS_URL;
}

/**
 * Construit l'URL d'ingestion WHIP complète pour un vendeur / une boutique
 * Format MediaMTX : ${LIVE_WHIP_URL}/${cleanSlug}/whip
 */
export function buildStoreWhipUrl(storeSlug: string): string {
  const base = getLiveWhipBaseUrl().replace(/\/+$/, '');
  const cleanSlug = encodeURIComponent((storeSlug || 'live-master').replace(/[^a-zA-Z0-9_-]/g, ''));
  return `${base}/${cleanSlug}/whip`;
}

/**
 * Construit l'URL de diffusion HLS pour les spectateurs / acheteurs
 * Format MediaMTX : ${LIVE_HLS_URL}/${cleanSlug}/index.m3u8
 */
export function buildStoreHlsUrl(storeSlug: string): string {
  const base = getLiveHlsBaseUrl().replace(/\/+$/, '');
  const cleanSlug = encodeURIComponent((storeSlug || 'live-master').replace(/[^a-zA-Z0-9_-]/g, ''));
  return `${base}/${cleanSlug}/index.m3u8`;
}

/**
 * Configuration ICE WebRTC partagée (STUN multi-opérateurs + TURN 4G CGNAT si configuré via env ou Northflank)
 */
let cachedServerIceServers: RTCIceServer[] | null = null;

export function getSharedWebRtcIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const turnRaw =
    typeof import.meta !== 'undefined'
      ? (import.meta as any).env?.VITE_TURN_URLS || (import.meta as any).env?.VITE_TURN_URL
      : undefined;
  const turnUser =
    typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_TURN_USERNAME : undefined;
  const turnCred =
    typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_TURN_CREDENTIAL : undefined;

  if (turnRaw && String(turnRaw).trim()) {
    const urls = String(turnRaw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (urls.length > 0) {
      servers.push({
        urls: urls.length === 1 ? urls[0] : urls,
        username: turnUser ? String(turnUser).trim() : undefined,
        credential: turnCred ? String(turnCred).trim() : undefined,
      });
    }
  }

  if (cachedServerIceServers && cachedServerIceServers.length > 0) {
    return [...servers, ...cachedServerIceServers];
  }

  return servers;
}

export async function resolveWebRtcIceServers(): Promise<RTCIceServer[]> {
  if (!cachedServerIceServers) {
    try {
      const res = await fetchLiveApiWithFailover(
        '/api/lives/ice-servers',
        { method: 'GET' },
        { timeoutMs: 2500, attachAuth: false }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.iceServers) && data.iceServers.length > 0) {
          cachedServerIceServers = data.iceServers;
        }
      }
    } catch {
      // Repli immédiat sur STUN + VITE_TURN_URL
    }
  }
  return getSharedWebRtcIceServers();
}
