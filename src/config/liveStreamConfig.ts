/**
 * @file liveStreamConfig.ts
 * @description Configuration centralisée des endpoints Northflank & MediaMTX pour le Live Shopping
 * 
 * Nouveaux endpoints de production Northflank (HTTPS) :
 * 1. Backend API principal : https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run
 * 2. Serveur d'ingestion caméra vendeur (MediaMTX WHIP - port 8889) : https://p01--nanasore-live--p8yx28yyjhbx.code.run
 * 3. Serveur de diffusion lecteur acheteur (MediaMTX HLS - port 8888) : https://p02--nanasore-live--p8yx28yyjhbx.code.run
 */

// 1. URL API Backend Principale (Northflank)
export const DEFAULT_API_URL = 'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run';

export function getApiBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.VITE_PAYMENT_API_URL) return import.meta.env.VITE_PAYMENT_API_URL;
    if ((import.meta.env as any).PUBLIC_API_URL) return (import.meta.env as any).PUBLIC_API_URL;
  }
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.API_URL) return process.env.API_URL;
    if (process.env.VITE_API_URL) return process.env.VITE_API_URL;
    if (process.env.PAYMENT_API_URL) return process.env.PAYMENT_API_URL;
  }
  return DEFAULT_API_URL;
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
