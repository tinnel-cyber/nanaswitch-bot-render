/**
 * @file liveRelayController.ts
 * @description Contrôleur Backend Production (Northflank #1 Primaire / Render #2 Secours) pour :
 * - Relais Simultané RTMP via FFmpeg réel (protégé JWT + anti-SSRF + plafond RAM)
 * - Coffre-fort serveur des clés RTMP (`server_security_vault` — zéro fuite dans `live_sessions`)
 * - Billetterie & Sas Payant VIP signé HMAC (`live_session_enrollments`)
 * - Enchères Live atomiques & Commissions d'Affiliation (`live_auctions`, `affiliate_commissions`)
 * - Serveurs ICE/TURN WebRTC pour réseaux mobiles 4G CGNAT
 */

import { Request, Response, NextFunction } from 'express';
import { spawn, ChildProcess } from 'child_process';
import crypto from 'crypto';

export interface DestinationRelayProcess {
  platformId: string;
  platformName: string;
  storeSlug: string;
  fullRtmpUrl: string;
  maskedKey: string;
  pid?: number;
  process?: ChildProcess;
  startedAt: number;
  status: 'starting' | 'streaming' | 'error' | 'stopped';
  stoppedByUser?: boolean;
  errorMessage?: string | null;
  logs: string[];
}

// Map globale : clé = `${cleanSlug}__${platformId}`
const activeRelayProcesses = new Map<string, DestinationRelayProcess>();

// Plafonds mémoire stricts (protection Northflank & Render 512 Mo)
const MAX_TOTAL_CONCURRENT_RELAYS = Math.max(1, Number(process.env.MAX_LIVE_FFMPEG_RELAYS) || 6);
const MAX_RELAYS_PER_STORE = Math.max(1, Number(process.env.MAX_LIVE_RELAYS_PER_STORE) || 4);

const MEDIAMTX_WHIP_BASE =
  process.env.LIVE_WHIP_URL ||
  process.env.VITE_LIVE_WHIP_URL ||
  process.env.PUBLIC_LIVE_WHIP_URL ||
  'https://p01--nanasore-live--p8yx28yyjhbx.code.run';

const MEDIAMTX_HLS_BASE =
  process.env.LIVE_HLS_INTERNAL_URL ||
  process.env.VITE_LIVE_HLS_URL ||
  process.env.LIVE_HLS_URL ||
  process.env.PUBLIC_LIVE_HLS_URL ||
  'https://p02--nanasore-live--p8yx28yyjhbx.code.run';

const LIVE_HMAC_SECRET =
  process.env.LIVE_TOKEN_SECRET ||
  process.env.PAYMENT_WEBHOOK_SECRET ||
  process.env.INTERNAL_API_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'nanasore_live_hmac_fallback_v1';

// Rate-limiter léger en mémoire pour routes publiques sensibles (anti-énumération / anti-spam)
const livePublicRateMap = new Map<string, { count: number; resetAt: number }>();
function checkLiveRateLimit(bucket: string, ip: string, maxPerWindow: number, windowMs: number): boolean {
  const now = Date.now();
  if (livePublicRateMap.size > 5000) {
    for (const [k, v] of livePublicRateMap.entries()) {
      if (v.resetAt <= now) livePublicRateMap.delete(k);
    }
  }
  const key = `${bucket}:${ip}`;
  const entry = livePublicRateMap.get(key);
  if (!entry || entry.resetAt <= now) {
    livePublicRateMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxPerWindow) return false;
  entry.count += 1;
  return true;
}

function getClientIp(req: Request): string {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || req.ip || 'unknown';
}

function sanitizeSlug(raw: any): string {
  return encodeURIComponent(String(raw || '').trim().replace(/[^a-zA-Z0-9_-]/g, ''));
}

function signLiveHmac(payload: string): string {
  return crypto.createHmac('sha256', LIVE_HMAC_SECRET).update(payload).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

export function createRelayStopToken(cleanSlug: string): string {
  const bucket = Math.floor(Date.now() / (12 * 3600 * 1000)); // Valide ~12-24h
  const sig = signLiveHmac(`relay_stop:${cleanSlug}:${bucket}`);
  return `${bucket}.${sig}`;
}

function verifyRelayStopToken(cleanSlug: string, token?: string): boolean {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [bucketStr, sig] = token.split('.');
  const bucket = Number(bucketStr);
  const currentBucket = Math.floor(Date.now() / (12 * 3600 * 1000));
  if (!Number.isFinite(bucket) || Math.abs(currentBucket - bucket) > 1) return false;
  const expected = signLiveHmac(`relay_stop:${cleanSlug}:${bucket}`);
  return safeEqualHex(sig, expected);
}

export function createLiveEnrollmentAccessToken(sessionId: string, contact: string): string {
  const exp = Date.now() + 30 * 24 * 3600 * 1000; // 30 jours
  const normContact = String(contact || '').trim().toLowerCase();
  const payloadB64 = Buffer.from(JSON.stringify({ s: sessionId, c: normContact, e: exp }), 'utf8').toString('base64url');
  const sig = signLiveHmac(`live_enroll:${payloadB64}`);
  return `${payloadB64}.${sig}`;
}

export function verifyLiveEnrollmentAccessToken(
  sessionId: string,
  token?: string
): { valid: boolean; contact?: string } {
  if (!token || typeof token !== 'string' || !token.includes('.')) return { valid: false };
  const [payloadB64, sig] = token.split('.');
  const expected = signLiveHmac(`live_enroll:${payloadB64}`);
  if (!safeEqualHex(sig, expected)) return { valid: false };
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!parsed || parsed.s !== sessionId || Number(parsed.e) < Date.now()) {
      return { valid: false };
    }
    return { valid: true, contact: parsed.c };
  } catch {
    return { valid: false };
  }
}

async function getServerSupabase() {
  const mod = await import('../../app/utils/supabase.server');
  return mod.supabase;
}

async function resolveLiveAuthUser(req: Request): Promise<any | null> {
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;
  try {
    const supabase = await getServerSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) return data.user;
  } catch {
    // ignore
  }
  return null;
}

export async function requireLiveMerchantAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const internalSecret = process.env.ADMIN_API_KEY || process.env.INTERNAL_API_SECRET || '';
  const providedKey = String(req.headers['x-admin-api-key'] || req.headers['x-internal-secret'] || '');
  if (internalSecret && providedKey && safeEqualHex(providedKey, internalSecret)) {
    (req as any).isInternalAdmin = true;
    next();
    return;
  }

  const user = await resolveLiveAuthUser(req);
  if (user) {
    (req as any).authUser = user;
    next();
    return;
  }

  res.status(401).json({
    success: false,
    error: 'Authentification marchand requise (jeton Bearer Supabase valide).',
  });
}

async function canUserManageLiveSlug(req: Request, cleanSlug: string): Promise<boolean> {
  if ((req as any).isInternalAdmin) return true;
  const user = (req as any).authUser;
  if (!user?.id) return false;

  const appRole = String(user.app_metadata?.role || '').toUpperCase();
  if (appRole === 'SUPER_ADMIN' || appRole === 'ADMIN') return true;

  const uid = String(user.id);
  const meta = user.user_metadata || {};
  if (
    cleanSlug === uid ||
    cleanSlug === String(meta.store_id || '') ||
    cleanSlug === String(meta.tenant_id || '') ||
    cleanSlug === String(meta.store_slug || '')
  ) {
    return true;
  }

  try {
    const supabase = await getServerSupabase();
    if (!supabase) return true;

    // Vérifier super_admins
    const { data: sa } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', uid)
      .maybeSingle();
    if (sa?.user_id) return true;

    // Vérifier la session Live existante si présente
    const { data: sess } = await supabase
      .from('live_sessions')
      .select('id, host_id, tenant_id')
      .or(`id.eq.${cleanSlug},tenant_id.eq.${cleanSlug}`)
      .limit(1)
      .maybeSingle();

    if (!sess) {
      // Nouveau slug de direct pas encore réservé : autorisé pour le marchand authentifié
      return true;
    }
    if (sess.host_id === uid || sess.tenant_id === uid) return true;

    // Vérifier propriété via universes / merchants
    if (sess.tenant_id) {
      const { data: univ } = await supabase
        .from('universes')
        .select('id, user_id, owner_id')
        .eq('id', sess.tenant_id)
        .maybeSingle();
      if (univ && ((univ as any).user_id === uid || (univ as any).owner_id === uid)) return true;

      const { data: merch } = await supabase
        .from('merchants')
        .select('id, owner_id, user_id')
        .eq('id', sess.tenant_id)
        .maybeSingle();
      if (merch && ((merch as any).owner_id === uid || (merch as any).user_id === uid)) return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Vérifie qu'une URL serveur RTMP/RTMPS contient bien un protocole valide et un hôte public sûr
 * (bloque tout SSRF vers localhost / IP privées / metadata cloud 169.254.169.254).
 */
export function isValidRtmpServerUrl(url: string): boolean {
  const trimmed = (url || '').trim();
  if (!/^rtmps?:\/\/[a-zA-Z0-9.-]+(?::\d+)?(?:\/[^\s]*)?$/i.test(trimmed)) {
    return false;
  }
  try {
    const parsed = new URL(trimmed.replace(/^rtmps:/i, 'https:').replace(/^rtmp:/i, 'http:'));
    const host = parsed.hostname.toLowerCase();
    if (
      !host ||
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^0\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Construit l'URL RTMP/RTMPS complète et valide pour chaque plateforme.
 */
export function buildFullRtmpDestinationUrl(
  platformId: string,
  credentials: { serverUrl?: string; streamKey?: string }
): { fullUrl: string; maskedKey: string; platformName: string } | null {
  const streamKey = typeof credentials.streamKey === 'string' ? credentials.streamKey.trim() : '';
  const serverUrl = typeof credentials.serverUrl === 'string' ? credentials.serverUrl.trim() : '';

  // Sécurité : rejeter tout caractère de contrôle ou d'injection d'espace/option
  if (!streamKey || /[\s\r\n\0]/.test(streamKey)) return null;

  const maskedKey = streamKey.length > 6
    ? `${streamKey.slice(0, 3)}***${streamKey.slice(-3)}`
    : '***';

  switch (platformId.toLowerCase()) {
    case 'youtube':
      return {
        fullUrl: `rtmp://a.rtmp.youtube.com/live2/${streamKey}`,
        maskedKey,
        platformName: 'YouTube Live'
      };

    case 'facebook':
      return {
        fullUrl: `rtmps://live-api-s.facebook.com:443/rtmp/${streamKey}`,
        maskedKey,
        platformName: 'Facebook Live'
      };

    case 'twitch':
      return {
        fullUrl: `rtmp://live.twitch.tv/app/${streamKey}`,
        maskedKey,
        platformName: 'Twitch'
      };

    case 'tiktok':
      if (!isValidRtmpServerUrl(serverUrl)) return null;
      return {
        fullUrl: `${serverUrl.replace(/\/+$/, '')}/${streamKey}`,
        maskedKey,
        platformName: 'TikTok Live'
      };

    case 'instagram': {
      const baseInsta = serverUrl || 'rtmps://live-upload.instagram.com:443/rtmp/';
      if (!isValidRtmpServerUrl(baseInsta)) return null;
      return {
        fullUrl: `${baseInsta.replace(/\/+$/, '')}/${streamKey}`,
        maskedKey,
        platformName: 'Instagram Live'
      };
    }

    case 'linkedin':
      if (!isValidRtmpServerUrl(serverUrl)) return null;
      return {
        fullUrl: `${serverUrl.replace(/\/+$/, '')}/${streamKey}`,
        maskedKey,
        platformName: 'LinkedIn Live'
      };

    case 'twitter':
    case 'x':
      if (!isValidRtmpServerUrl(serverUrl)) return null;
      return {
        fullUrl: `${serverUrl.replace(/\/+$/, '')}/${streamKey}`,
        maskedKey,
        platformName: 'X (Twitter) Live'
      };

    case 'telegram': {
      const baseTg = serverUrl || 'rtmps://dc4-1.rtmp.t.me/s/';
      if (!isValidRtmpServerUrl(baseTg)) return null;
      return {
        fullUrl: `${baseTg.replace(/\/+$/, '')}/${streamKey}`,
        maskedKey,
        platformName: 'Telegram Live'
      };
    }

    default:
      if (!isValidRtmpServerUrl(serverUrl)) return null;
      return {
        fullUrl: `${serverUrl.replace(/\/+$/, '')}/${streamKey}`,
        maskedKey,
        platformName: platformId
      };
  }
}

function countActiveRunningRelays(filterSlug?: string): number {
  let count = 0;
  for (const r of activeRelayProcesses.values()) {
    if (filterSlug && r.storeSlug !== filterSlug) continue;
    if (r.status === 'starting' || r.status === 'streaming') {
      count++;
    }
  }
  return count;
}

/**
 * Lance un processus FFmpeg réel pour relayer une source MediaMTX vers une destination RTMP
 */
function spawnSingleRelay(
  storeSlug: string,
  platformId: string,
  platformName: string,
  fullRtmpUrl: string,
  maskedKey: string,
  inputSource: string
): DestinationRelayProcess {
  const relayKey = `${storeSlug}__${platformId}`;

  const existing = activeRelayProcesses.get(relayKey);
  if (existing && existing.process && !existing.process.killed) {
    existing.stoppedByUser = true;
    try {
      existing.process.kill('SIGTERM');
    } catch (_) {}
  }

  const record: DestinationRelayProcess = {
    platformId,
    platformName,
    storeSlug,
    fullRtmpUrl,
    maskedKey,
    startedAt: Date.now(),
    status: 'starting',
    stoppedByUser: false,
    errorMessage: null,
    logs: []
  };

  activeRelayProcesses.set(relayKey, record);

  const ffmpegArgs = [
    '-nostdin',
    '-loglevel', 'warning',
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-re',
    '-i', inputSource,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-ar', '44100',
    '-b:a', '128k',
    '-f', 'flv',
    fullRtmpUrl
  ];

  console.log(`[FFMPEG RELAY] Démarrage du relais vers ${platformName} pour [${storeSlug}] -> clé ${maskedKey}`);

  try {
    const proc = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    record.process = proc;
    record.pid = proc.pid;

    proc.stdout?.on('data', (chunk) => {
      const msg = chunk.toString();
      record.logs.push(msg);
      if (record.logs.length > 25) record.logs.shift();
    });

    proc.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      // Masquer toute fuite accidentelle d'URL RTMP complète dans les logs renvoyés au front
      const redacted = text.replace(/rtmps?:\/\/[^\s'"]+/gi, '[RTMP_REDACTED]');
      record.logs.push(redacted);
      if (record.logs.length > 25) record.logs.shift();

      if (
        /Authentication failed/i.test(text) ||
        /NetStream\.Publish\.BadName/i.test(text) ||
        /RTMP_Connect/i.test(text) ||
        /Server returned 403/i.test(text) ||
        /Server returned 401/i.test(text) ||
        /404 Not Found/i.test(text) ||
        /Connection refused/i.test(text) ||
        /Connection timed out/i.test(text) ||
        /Operation timed out/i.test(text) ||
        /Failed to resolve/i.test(text) ||
        /Broken pipe/i.test(text) ||
        /Failed to open/i.test(text) ||
        /Input\/output error/i.test(text) ||
        /Server error/i.test(text)
      ) {
        record.status = 'error';
        record.errorMessage = redacted.slice(0, 220).trim();
        console.error(`[FFMPEG RELAY ERROR] [${platformName}] (PID ${record.pid}):`, record.errorMessage);
      } else if (record.status === 'starting' && /frame=\s*\d+/i.test(text)) {
        record.status = 'streaming';
      }
    });

    proc.on('error', (err) => {
      console.error(`[FFMPEG RELAY PROC ERROR] [${platformName}] :`, err);
      record.status = 'error';
      record.errorMessage = err.message;
    });

    proc.on('close', (code) => {
      console.log(`[FFMPEG RELAY CLOSED] [${platformName}] (PID ${record.pid}) Code sortie : ${code}`);
      if (record.stoppedByUser) {
        record.status = 'stopped';
      } else if (code !== 0 && record.status !== 'error') {
        record.status = 'error';
        const lastLog = record.logs[record.logs.length - 1] || `Processus FFmpeg interrompu (code ${code})`;
        record.errorMessage = lastLog.slice(0, 220).trim();
      } else if (record.status !== 'error') {
        record.status = 'stopped';
      }
    });
  } catch (err: any) {
    record.status = 'error';
    record.errorMessage = `Erreur instanciation FFmpeg : ${err?.message}`;
    console.error(`[FFMPEG RELAY SPAWN FAILED] [${platformName}] :`, err);
  }

  return record;
}

function stopRelayProcess(record: DestinationRelayProcess): void {
  record.stoppedByUser = true;
  if (record.process && !record.process.killed) {
    try {
      record.process.kill('SIGTERM');
      setTimeout(() => {
        if (record.process && !record.process.killed) {
          try { record.process.kill('SIGKILL'); } catch (_) {}
        }
      }, 1500);
    } catch (_) {}
  }
  record.status = 'stopped';
}

export function stopAllRelaysForStore(storeSlug: string): number {
  const cleanSlug = sanitizeSlug(storeSlug);
  let stoppedCount = 0;
  for (const [key, record] of activeRelayProcesses.entries()) {
    if (record.storeSlug === cleanSlug) {
      stopRelayProcess(record);
      activeRelayProcesses.delete(key);
      stoppedCount++;
    }
  }
  return stoppedCount;
}

for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.once(sig, () => {
    for (const [key, record] of activeRelayProcesses.entries()) {
      stopRelayProcess(record);
      activeRelayProcesses.delete(key);
    }
  });
}

// ============================================================================
// 1. COFFRE-FORT SERVEUR DES CLÉS RTMP (`server_security_vault`)
// ============================================================================

export async function handleGetMultistreamVaultConfig(req: Request, res: Response): Promise<void> {
  const cleanSlug = sanitizeSlug(req.query.storeSlug);
  if (!cleanSlug) {
    res.status(400).json({ success: false, error: "Paramètre 'storeSlug' requis." });
    return;
  }

  const allowed = await canUserManageLiveSlug(req, cleanSlug);
  if (!allowed) {
    res.status(403).json({ success: false, error: 'Accès non autorisé à la configuration RTMP de cette boutique.' });
    return;
  }

  try {
    const supabase = await getServerSupabase();
    const vaultKey = `multistream_cfg:${cleanSlug}`;
    const { data: vaultRow } = await supabase
      .from('server_security_vault')
      .select('secret_json')
      .eq('key', vaultKey)
      .maybeSingle();

    if (vaultRow?.secret_json && typeof vaultRow.secret_json === 'object') {
      res.json({ success: true, config: vaultRow.secret_json });
      return;
    }

    // Migration transparente unique si d'anciennes clés résidaient encore dans live_sessions
    const { data: legacy } = await supabase
      .from('live_sessions')
      .select('multistream_config, whatsapp_channel_url')
      .or(`id.eq.${cleanSlug},tenant_id.eq.${cleanSlug}`)
      .limit(1)
      .maybeSingle();

    if (legacy?.multistream_config && typeof legacy.multistream_config === 'object') {
      await supabase.from('server_security_vault').upsert({
        key: vaultKey,
        category: 'live_multistream',
        tenant_id: cleanSlug,
        secret_json: legacy.multistream_config,
        updated_at: new Date().toISOString(),
      });
      // Purge immédiate de live_sessions
      await supabase
        .from('live_sessions')
        .update({
          multistream_config: null,
          youtube_stream_key: null,
          facebook_stream_key: null,
          twitch_stream_key: null,
          tiktok_stream_key: null,
          instagram_stream_key: null,
          linkedin_stream_key: null,
          twitter_stream_key: null,
          telegram_stream_key: null,
          custom_rtmp_destinations: [],
        })
        .eq('id', cleanSlug);

      res.json({ success: true, config: legacy.multistream_config });
      return;
    }

    res.json({
      success: true,
      config: legacy?.whatsapp_channel_url ? { whatsappChannelUrl: legacy.whatsapp_channel_url } : null,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Erreur lecture coffre RTMP.' });
  }
}

export async function handleSaveMultistreamVaultConfig(req: Request, res: Response): Promise<void> {
  const { storeSlug, config } = req.body || {};
  const cleanSlug = sanitizeSlug(storeSlug);
  if (!cleanSlug || !config || typeof config !== 'object') {
    res.status(400).json({ success: false, error: "'storeSlug' et 'config' sont requis." });
    return;
  }

  const allowed = await canUserManageLiveSlug(req, cleanSlug);
  if (!allowed) {
    res.status(403).json({ success: false, error: 'Accès refusé pour modifier la configuration RTMP de cette boutique.' });
    return;
  }

  const user = (req as any).authUser;
  const nowIso = new Date().toISOString();
  const safeVaultPayload = {
    ...config,
    storeSlug: cleanSlug,
    updatedAt: nowIso,
  };

  try {
    const supabase = await getServerSupabase();
    const { error: vaultErr } = await supabase.from('server_security_vault').upsert({
      key: `multistream_cfg:${cleanSlug}`,
      category: 'live_multistream',
      tenant_id: cleanSlug,
      secret_json: safeVaultPayload,
      updated_at: nowIso,
    });

    if (vaultErr) {
      res.status(500).json({ success: false, error: vaultErr.message });
      return;
    }

    // Seul le lien public WhatsApp est conservé sur live_sessions (toutes les clés RTMP sont purgées à NULL)
    await supabase
      .from('live_sessions')
      .upsert(
        {
          id: cleanSlug,
          tenant_id: cleanSlug,
          host_id: user?.id || cleanSlug,
          whatsapp_channel_url: config.whatsappChannelUrl || null,
          multistream_config: null,
          youtube_stream_key: null,
          facebook_stream_key: null,
          twitch_stream_key: null,
          tiktok_stream_key: null,
          instagram_stream_key: null,
          linkedin_stream_key: null,
          twitter_stream_key: null,
          telegram_stream_key: null,
          custom_rtmp_destinations: [],
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );

    res.json({ success: true, storeSlug: cleanSlug, updatedAt: nowIso });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Erreur sauvegarde coffre RTMP.' });
  }
}

export async function handleGetPublicLiveMeta(req: Request, res: Response): Promise<void> {
  const cleanSlug = sanitizeSlug(req.query.storeSlug);
  if (!cleanSlug) {
    res.status(400).json({ success: false, error: "Paramètre 'storeSlug' requis." });
    return;
  }

  try {
    const supabase = await getServerSupabase();
    const { data } = await supabase
      .from('live_sessions')
      .select('id, whatsapp_channel_url, status, is_live')
      .or(`id.eq.${cleanSlug},tenant_id.eq.${cleanSlug}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    res.json({
      success: true,
      storeSlug: cleanSlug,
      whatsappChannelUrl: data?.whatsapp_channel_url || '',
      isLive: Boolean(data?.is_live || data?.status === 'live'),
    });
  } catch {
    res.json({ success: true, storeSlug: cleanSlug, whatsappChannelUrl: '', isLive: false });
  }
}

// ============================================================================
// 2. RELAIS FFMPEG MULTISTREAM (PROTÉGÉ JWT + PLAFOND RAM)
// ============================================================================

export async function handleStartMultistream(req: Request, res: Response): Promise<void> {
  const { storeSlug, destinations } = req.body || {};

  if (!storeSlug || !destinations || typeof destinations !== 'object') {
    res.status(400).json({
      success: false,
      error: "Paramètres manquants : 'storeSlug' et 'destinations' sont requis."
    });
    return;
  }

  const cleanSlug = sanitizeSlug(storeSlug);
  const allowed = await canUserManageLiveSlug(req, cleanSlug);
  if (!allowed) {
    res.status(403).json({ success: false, error: 'Non autorisé à démarrer le relais pour cette boutique.' });
    return;
  }

  const inputSource = `${MEDIAMTX_HLS_BASE.replace(/\/+$/, '')}/${cleanSlug}/index.m3u8`;
  const results: Record<string, { status: string; message: string }> = {};
  const skipped: string[] = [];
  let totalLaunched = 0;

  const standardPlatforms = ['youtube', 'facebook', 'twitch', 'tiktok', 'instagram', 'linkedin', 'twitter', 'telegram'];

  for (const plat of standardPlatforms) {
    const cfg = destinations[plat];
    const trimmedKey = typeof cfg?.streamKey === 'string' ? cfg.streamKey.trim() : '';
    const trimmedUrl = typeof cfg?.serverUrl === 'string' ? cfg.serverUrl.trim() : '';

    if (!cfg || cfg.enabled !== true || !trimmedKey) {
      skipped.push(plat);
      continue;
    }

    if (
      countActiveRunningRelays() >= MAX_TOTAL_CONCURRENT_RELAYS ||
      countActiveRunningRelays(cleanSlug) >= MAX_RELAYS_PER_STORE
    ) {
      results[plat] = {
        status: 'error',
        message: `Limite de relais simultanés atteinte (${MAX_RELAYS_PER_STORE} max par boutique).`,
      };
      continue;
    }

    const built = buildFullRtmpDestinationUrl(plat, {
      serverUrl: trimmedUrl,
      streamKey: trimmedKey
    });

    if (!built) {
      skipped.push(plat);
      continue;
    }

    const record = spawnSingleRelay(
      cleanSlug,
      plat,
      built.platformName,
      built.fullUrl,
      built.maskedKey,
      inputSource
    );
    totalLaunched++;
    results[plat] = {
      status: record.status,
      message: `Relais vers ${built.platformName} initialisé.`
    };
  }

  if (Array.isArray(destinations.custom)) {
    destinations.custom.forEach((dest: any, index: number) => {
      const customId = (typeof dest?.id === 'string' && dest.id.trim()) || `custom_${index}`;
      const customName = (typeof dest?.name === 'string' && dest.name.trim()) || `RTMP Perso ${index + 1}`;
      const trimmedKey = typeof dest?.streamKey === 'string' ? dest.streamKey.trim() : '';
      const trimmedUrl = typeof dest?.serverUrl === 'string' ? dest.serverUrl.trim() : '';

      if (!dest || dest.enabled !== true || !trimmedKey || !trimmedUrl) {
        skipped.push(customId);
        return;
      }

      if (
        countActiveRunningRelays() >= MAX_TOTAL_CONCURRENT_RELAYS ||
        countActiveRunningRelays(cleanSlug) >= MAX_RELAYS_PER_STORE
      ) {
        results[customId] = {
          status: 'error',
          message: `Limite de relais simultanés atteinte (${MAX_RELAYS_PER_STORE} max par boutique).`,
        };
        return;
      }

      const built = buildFullRtmpDestinationUrl(customName, {
        serverUrl: trimmedUrl,
        streamKey: trimmedKey
      });

      if (!built) {
        skipped.push(customId);
        return;
      }

      const record = spawnSingleRelay(
        cleanSlug,
        customId,
        customName,
        built.fullUrl,
        built.maskedKey,
        inputSource
      );
      totalLaunched++;
      results[customId] = {
        status: record.status,
        message: `Relais personnalisé ${customName} initialisé.`
      };
    });
  }

  res.json({
    success: true,
    storeSlug: cleanSlug,
    inputSource,
    totalLaunched,
    skipped,
    results,
    stopToken: createRelayStopToken(cleanSlug),
    message:
      totalLaunched === 0
        ? 'Aucune destination RTMP active avec clé/URL valide (champs vides ignorés).'
        : `${totalLaunched} relais FFmpeg actif(s) démarré(s).`
  });
}

/**
 * POST /api/lives/multistream/stop
 * Accepte soit un JWT Bearer valide du marchand, soit un `stopToken` HMAC (pour `navigator.sendBeacon` à la fermeture d'onglet).
 */
export async function handleStopMultistream(req: Request, res: Response): Promise<void> {
  const { storeSlug, platformId, stopToken } = req.body || {};

  if (!storeSlug) {
    res.status(400).json({ success: false, error: "Le paramètre 'storeSlug' est requis." });
    return;
  }

  const cleanSlug = sanitizeSlug(storeSlug);
  const validStopToken = verifyRelayStopToken(cleanSlug, stopToken);

  if (!validStopToken) {
    const user = await resolveLiveAuthUser(req);
    (req as any).authUser = user;
    const allowed = await canUserManageLiveSlug(req, cleanSlug);
    if (!allowed) {
      res.status(401).json({ success: false, error: 'Non autorisé à arrêter ce relais Live.' });
      return;
    }
  }

  let stoppedCount = 0;
  for (const [key, record] of activeRelayProcesses.entries()) {
    if (record.storeSlug === cleanSlug) {
      if (!platformId || record.platformId === platformId) {
        stopRelayProcess(record);
        activeRelayProcesses.delete(key);
        stoppedCount++;
      }
    }
  }

  res.json({
    success: true,
    message: `${stoppedCount} relais arrêté(s) pour [${cleanSlug}].`,
    stoppedCount
  });
}

export async function handleGetMultistreamStatus(req: Request, res: Response): Promise<void> {
  const { storeSlug } = req.query;
  if (!storeSlug) {
    res.status(400).json({ success: false, error: "Le paramètre 'storeSlug' est requis." });
    return;
  }

  const cleanSlug = sanitizeSlug(storeSlug);
  const allowed = await canUserManageLiveSlug(req, cleanSlug);
  if (!allowed) {
    res.status(403).json({ success: false, error: 'Accès non autorisé au statut multistream.' });
    return;
  }

  const inputSource = `${MEDIAMTX_HLS_BASE.replace(/\/+$/, '')}/${cleanSlug}/index.m3u8`;
  const destinations: Record<string, any> = {};
  let activeCount = 0;

  for (const [_, record] of activeRelayProcesses.entries()) {
    if (record.storeSlug === cleanSlug) {
      if (record.status === 'streaming' || record.status === 'starting') {
        activeCount++;
      }
      destinations[record.platformId] = {
        platform: record.platformId,
        name: record.platformName,
        status: record.status,
        pid: record.pid,
        startedAt: record.startedAt,
        durationSeconds: Math.floor((Date.now() - record.startedAt) / 1000),
        errorMessage: record.errorMessage,
        maskedKey: record.maskedKey,
        recentLogs: record.logs.slice(-3)
      };
    }
  }

  res.json({
    success: true,
    storeSlug: cleanSlug,
    inputSource,
    activeCount,
    destinations
  });
}

export async function handleStartLiveRelay(req: Request, res: Response): Promise<void> {
  const { storeSlug, targetPlatform = 'youtube', rtmpUrl, streamKey } = req.body || {};
  if (!storeSlug || !streamKey) {
    res.status(400).json({ success: false, error: "'storeSlug' et 'streamKey' sont requis." });
    return;
  }

  const cleanSlug = sanitizeSlug(storeSlug);
  const allowed = await canUserManageLiveSlug(req, cleanSlug);
  if (!allowed) {
    res.status(403).json({ success: false, error: 'Non autorisé.' });
    return;
  }

  if (
    countActiveRunningRelays() >= MAX_TOTAL_CONCURRENT_RELAYS ||
    countActiveRunningRelays(cleanSlug) >= MAX_RELAYS_PER_STORE
  ) {
    res.status(429).json({
      success: false,
      error: `Plafond de relais FFmpeg simultanés atteint (${MAX_RELAYS_PER_STORE} max par boutique).`,
    });
    return;
  }

  const inputSource = `${MEDIAMTX_HLS_BASE.replace(/\/+$/, '')}/${cleanSlug}/index.m3u8`;
  const built = buildFullRtmpDestinationUrl(targetPlatform, { serverUrl: rtmpUrl, streamKey });
  if (!built) {
    res.status(400).json({ success: false, error: 'URL ou clé RTMP invalide ou interdite.' });
    return;
  }

  const record = spawnSingleRelay(cleanSlug, targetPlatform, built.platformName, built.fullUrl, built.maskedKey, inputSource);

  res.json({
    success: true,
    message: `Relais vers ${built.platformName} démarré.`,
    relayId: `${cleanSlug}__${targetPlatform}`,
    storeSlug: cleanSlug,
    targetPlatform,
    status: record.status,
    pid: record.pid,
    startedAt: record.startedAt,
    stopToken: createRelayStopToken(cleanSlug),
  });
}

export async function handleStopLiveRelay(req: Request, res: Response): Promise<void> {
  const { storeSlug, targetPlatform, relayId } = req.body || {};
  let targetSlug = storeSlug;
  let targetPlat = targetPlatform;

  if (relayId && String(relayId).includes('__')) {
    const parts = String(relayId).split('__');
    targetSlug = parts[0];
    targetPlat = parts[1];
  }

  if (!targetSlug) {
    res.status(400).json({ success: false, error: 'storeSlug ou relayId requis.' });
    return;
  }

  const cleanSlug = sanitizeSlug(targetSlug);
  const allowed = await canUserManageLiveSlug(req, cleanSlug);
  if (!allowed) {
    res.status(403).json({ success: false, error: 'Non autorisé.' });
    return;
  }

  const key = `${cleanSlug}__${targetPlat || 'youtube'}`;
  const record = activeRelayProcesses.get(key);

  if (record) {
    stopRelayProcess(record);
    activeRelayProcesses.delete(key);
    res.json({ success: true, message: 'Relais arrêté avec succès.', relayId: key });
  } else {
    res.status(404).json({ success: false, error: 'Aucun relais actif trouvé pour cet identifiant.' });
  }
}

export async function handleGetLiveRelayStatus(req: Request, res: Response): Promise<void> {
  const cleanSlug = req.query.storeSlug ? sanitizeSlug(req.query.storeSlug) : '';
  if (cleanSlug) {
    const allowed = await canUserManageLiveSlug(req, cleanSlug);
    if (!allowed) {
      res.status(403).json({ success: false, error: 'Non autorisé.' });
      return;
    }
  }

  const relays = Array.from(activeRelayProcesses.values())
    .filter((r) => !cleanSlug || r.storeSlug === cleanSlug)
    .map((r) => ({
      id: `${r.storeSlug}__${r.platformId}`,
      storeSlug: r.storeSlug,
      targetPlatform: r.platformId,
      platformName: r.platformName,
      status: r.status,
      pid: r.pid,
      startedAt: r.startedAt,
      durationSeconds: Math.floor((Date.now() - r.startedAt) / 1000),
      errorMessage: r.errorMessage,
      recentLogs: r.logs.slice(-3)
    }));

  res.json({
    success: true,
    totalActive: relays.filter(r => r.status === 'streaming').length,
    relays
  });
}

export async function handleStartLiveSession(req: Request, res: Response): Promise<void> {
  const { storeId = 'nanasore_central_hub', title = 'Live Shopping Wameet 🔥', description, hostName, hostAvatar } = req.body || {};
  const cleanSlug = sanitizeSlug(storeId) || 'nanasore_central_hub';

  const allowed = await canUserManageLiveSlug(req, cleanSlug);
  if (!allowed) {
    res.status(403).json({ success: false, error: 'Non autorisé à démarrer un direct pour cette boutique.' });
    return;
  }

  const liveId = `live_${cleanSlug}_${Date.now()}`;
  const whipUrl = `${MEDIAMTX_WHIP_BASE.replace(/\/+$/, '')}/${cleanSlug}/whip`;
  const hlsUrl = `${MEDIAMTX_HLS_BASE.replace(/\/+$/, '')}/${cleanSlug}/index.m3u8`;

  import('./webPushService').then(({ sendLiveShoppingPushToStoreSubscribers }) => {
    sendLiveShoppingPushToStoreSubscribers({
      storeSlug: cleanSlug,
      storeName: hostName || title || cleanSlug
    }).catch(pushErr => console.warn('[LIVE START PUSH ERROR]', pushErr));
  }).catch(() => {});

  res.json({
    success: true,
    liveId,
    storeId: cleanSlug,
    title,
    description,
    hostName: hostName || 'Vendeur Wameet',
    hostAvatar,
    provider: 'MEDIAMTX',
    providerType: 'MEDIAMTX',
    isFallback: false,
    whipUrl,
    hlsUrl,
    streamUrl: hlsUrl,
    embedUrl: hlsUrl,
    stopToken: createRelayStopToken(cleanSlug),
    status: 'live',
    startedAt: new Date().toISOString()
  });
}

// ============================================================================
// 3. BILLETTERIE & SAS PAYANT VIP (`live_session_enrollments` + JETON HMAC)
// ============================================================================

export async function handleRecordLiveEnrollment(req: Request, res: Response): Promise<void> {
  const ip = getClientIp(req);
  if (!checkLiveRateLimit('enroll_rec', ip, 15, 5 * 60_000)) {
    res.status(429).json({ success: false, error: 'Trop de tentatives. Réessayez dans quelques minutes.' });
    return;
  }

  const { sessionId, studentName, studentContact, amountPaid, transactionId, paymentMethod } = req.body || {};
  const cleanSessionId = String(sessionId || '').trim();
  const cleanContact = String(studentContact || '').trim().toLowerCase();
  const cleanTx = String(transactionId || '').trim();
  const numericAmount = Number(amountPaid) || 0;

  if (!cleanSessionId || !cleanContact || !cleanTx || numericAmount <= 0) {
    res.status(400).json({
      success: false,
      error: 'Informations de paiement incomplètes (sessionId, contact, montant > 0 et transactionId requis).',
    });
    return;
  }

  try {
    const supabase = await getServerSupabase();

    // Vérifie si la session exige un tarif minimal dans live_sessions._meta
    const { data: sess } = await supabase
      .from('live_sessions')
      .select('pinned_product_data')
      .eq('id', cleanSessionId)
      .maybeSingle();

    const meta = (sess?.pinned_product_data as any)?._meta;
    const expectedPrice = Number(meta?.price || meta?.accessPrice || 0);
    if (meta?.isPaid && expectedPrice > 0 && numericAmount < expectedPrice) {
      res.status(402).json({
        success: false,
        error: `Montant réglé insuffisant (${numericAmount} < ${expectedPrice} FCFA).`,
      });
      return;
    }

    await supabase.from('live_session_enrollments').insert({
      session_id: cleanSessionId,
      student_name: String(studentName || 'Étudiant VIP').trim().slice(0, 120),
      student_contact: cleanContact.slice(0, 160),
      amount_paid: numericAmount,
      currency: 'XOF',
      transaction_id: cleanTx.slice(0, 140),
      payment_method: String(paymentMethod || 'MOBILE_MONEY').slice(0, 60),
      status: 'paid',
    });

    const accessToken = createLiveEnrollmentAccessToken(cleanSessionId, cleanContact);
    res.json({
      success: true,
      enrolled: true,
      studentName: String(studentName || 'Étudiant VIP').trim(),
      accessToken,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Erreur enregistrement inscription.' });
  }
}

export async function handleVerifyLiveEnrollment(req: Request, res: Response): Promise<void> {
  const ip = getClientIp(req);
  if (!checkLiveRateLimit('enroll_ver', ip, 8, 5 * 60_000)) {
    res.status(429).json({
      success: false,
      enrolled: false,
      error: 'Trop de vérifications. Veuillez patienter 5 minutes.',
    });
    return;
  }

  const { sessionId, contact } = req.body || {};
  const cleanSessionId = String(sessionId || '').trim();
  const cleanContact = String(contact || '').trim().toLowerCase();

  if (!cleanSessionId || cleanContact.length < 5) {
    res.status(400).json({ success: false, enrolled: false, error: 'Session et contact valides requis.' });
    return;
  }

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('live_session_enrollments')
      .select('id, student_name, status')
      .eq('session_id', cleanSessionId)
      .eq('student_contact', cleanContact)
      .eq('status', 'paid')
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const accessToken = createLiveEnrollmentAccessToken(cleanSessionId, cleanContact);
      res.json({
        success: true,
        enrolled: true,
        studentName: data.student_name,
        accessToken,
      });
      return;
    }

    res.json({ success: true, enrolled: false });
  } catch {
    res.json({ success: false, enrolled: false });
  }
}

export async function handleCheckEnrollmentToken(req: Request, res: Response): Promise<void> {
  const sessionId = String(req.query.sessionId || '').trim();
  const token = String(req.query.token || '').trim();
  if (!sessionId || !token) {
    res.json({ valid: false });
    return;
  }
  const verified = verifyLiveEnrollmentAccessToken(sessionId, token);
  res.json({ valid: verified.valid });
}

// ============================================================================
// 4. AFFILIATION LIVE & ENCHÈRES ATOMIQUES (`nsore.shop` -> `service_role`)
// ============================================================================

export async function handleRecordAffiliateCommission(req: Request, res: Response): Promise<void> {
  const ip = getClientIp(req);
  if (!checkLiveRateLimit('aff_rec', ip, 20, 5 * 60_000)) {
    res.status(429).json({ success: false, error: 'Trop de requêtes.' });
    return;
  }

  const {
    merchantId,
    sessionId,
    productId,
    productName,
    referrerCode,
    referrerPhone,
    buyerName,
    buyerContact,
    orderAmount,
    commissionPercent,
    transactionId,
  } = req.body || {};

  const cleanCode = String(referrerCode || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const numericOrder = Number(orderAmount) || 0;
  // Plafonne la commission entre 0.5% et 50% contre toute manipulation client
  const clampedPercent = Math.min(50, Math.max(0.5, Number(commissionPercent) || 10));
  const commissionAmount = Math.round((numericOrder * clampedPercent) / 100);
  const cleanTx = String(transactionId || '').trim();

  if (!cleanCode || !productName || numericOrder <= 0 || commissionAmount <= 0) {
    res.status(400).json({ success: false, error: 'Paramètres de commission invalides.' });
    return;
  }

  try {
    const supabase = await getServerSupabase();

    // Anti-doublon par transaction_id si fourni
    if (cleanTx) {
      const { data: dup } = await supabase
        .from('affiliate_commissions')
        .select('id')
        .eq('transaction_id', cleanTx)
        .limit(1)
        .maybeSingle();
      if (dup?.id) {
        res.json({ success: true, id: dup.id, deduplicated: true });
        return;
      }
    }

    const { data, error } = await supabase
      .from('affiliate_commissions')
      .insert({
        merchant_id: String(merchantId || 'boutique').trim(),
        session_id: sessionId ? String(sessionId).trim() : null,
        product_id: productId ? String(productId).trim() : null,
        product_name: String(productName).trim().slice(0, 180),
        referrer_code: cleanCode,
        referrer_phone: referrerPhone ? String(referrerPhone).trim().slice(0, 40) : null,
        buyer_name: buyerName ? String(buyerName).trim().slice(0, 100) : null,
        buyer_contact: buyerContact ? String(buyerContact).trim().slice(0, 120) : null,
        order_amount: numericOrder,
        commission_percent: clampedPercent,
        commission_amount: commissionAmount,
        currency: 'XOF',
        transaction_id: cleanTx || null,
        status: 'pending',
      })
      .select()
      .maybeSingle();

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, commission: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Erreur commission affiliée.' });
  }
}

export async function handleGetAffiliateCommissionsByCode(req: Request, res: Response): Promise<void> {
  const cleanCode = String(req.query.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!cleanCode) {
    res.json({ success: true, commissions: [] });
    return;
  }

  try {
    const supabase = await getServerSupabase();
    // SÉCURITÉ PII : ne sélectionne PAS buyer_contact pour la vue publique affilié
    const { data, error } = await supabase
      .from('affiliate_commissions')
      .select('id, merchant_id, session_id, product_id, product_name, referrer_code, order_amount, commission_percent, commission_amount, currency, status, paid_at, created_at')
      .eq('referrer_code', cleanCode)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      res.json({ success: true, commissions: [] });
      return;
    }

    res.json({ success: true, commissions: data || [] });
  } catch {
    res.json({ success: true, commissions: [] });
  }
}

export async function handleMarkAffiliateCommissionPaid(req: Request, res: Response): Promise<void> {
  const { commissionId } = req.body || {};
  if (!commissionId) {
    res.status(400).json({ success: false, error: "'commissionId' requis." });
    return;
  }

  try {
    const supabase = await getServerSupabase();
    const { data: row } = await supabase
      .from('affiliate_commissions')
      .select('id, merchant_id')
      .eq('id', String(commissionId))
      .maybeSingle();

    if (!row) {
      res.status(404).json({ success: false, error: 'Commission introuvable.' });
      return;
    }

    const allowed = await canUserManageLiveSlug(req, sanitizeSlug(row.merchant_id));
    if (!allowed) {
      res.status(403).json({ success: false, error: 'Non autorisé à valider cette commission.' });
      return;
    }

    const paidAt = new Date().toISOString();
    const { error } = await supabase
      .from('affiliate_commissions')
      .update({ status: 'paid', paid_at: paidAt })
      .eq('id', row.id);

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, id: row.id, status: 'paid', paidAt });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Erreur mise à jour commission.' });
  }
}

export async function handlePlaceLiveAuctionBid(req: Request, res: Response): Promise<void> {
  const ip = getClientIp(req);
  if (!checkLiveRateLimit('auction_bid', ip, 40, 60_000)) {
    res.status(429).json({ success: false, error: 'Trop d’enchères rapprochées. Ralentissez légèrement.' });
    return;
  }

  const { sessionId, auctionId, bidderId, bidderName, amount } = req.body || {};
  const cleanSessionId = String(sessionId || '').trim();
  const cleanAuctionId = String(auctionId || '').trim();
  const numericAmount = Number(amount) || 0;

  if (!cleanSessionId || !cleanAuctionId || !bidderId || numericAmount <= 0) {
    res.status(400).json({ success: false, error: 'Enchère invalide.' });
    return;
  }

  try {
    const supabase = await getServerSupabase();
    const { data: auction } = await supabase
      .from('live_auctions')
      .select('*')
      .eq('id', cleanAuctionId)
      .maybeSingle();

    if (auction) {
      if (auction.status !== 'active') {
        res.status(409).json({ success: false, error: "Cette enchère est terminée." });
        return;
      }
      const currentPrice = Number(auction.current_price) || 0;
      const minStep = Math.max(1, Number(auction.min_step) || 500);
      const minAllowed = Number(auction.bids_count) > 0 ? currentPrice + minStep : Math.max(1, Number(auction.starting_price) || currentPrice);
      if (numericAmount < minAllowed) {
        res.status(409).json({
          success: false,
          error: `Offre trop basse (minimum requis : ${minAllowed} FCFA).`,
          currentPrice,
        });
        return;
      }

      await supabase
        .from('live_auctions')
        .update({
          current_price: numericAmount,
          highest_bidder_id: String(bidderId).slice(0, 100),
          highest_bidder_name: String(bidderName || 'Acheteur Live').slice(0, 100),
          bids_count: (Number(auction.bids_count) || 0) + 1,
        })
        .eq('id', cleanAuctionId);
    }

    await supabase.from('live_auction_bids').insert({
      auction_id: cleanAuctionId,
      session_id: cleanSessionId,
      bidder_id: String(bidderId).slice(0, 100),
      bidder_name: String(bidderName || 'Acheteur Live').slice(0, 100),
      amount: numericAmount,
    });

    res.json({ success: true, amount: numericAmount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Erreur enregistrement enchère.' });
  }
}

// ============================================================================
// 5. SERVEURS ICE / TURN WEBRTC POUR 4G CGNAT (ORANGE / MTN / MOOV)
// ============================================================================

export async function handleGetWebRtcIceServers(_req: Request, res: Response): Promise<void> {
  const iceServers: any[] = [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // 1. Support Cloudflare Calls TURN dynamique (si configuré dans les secrets serveur Northflank)
  const cfTurnTokenId = process.env.CLOUDFLARE_TURN_TOKEN_ID;
  const cfTurnApiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (cfTurnTokenId && cfTurnApiToken) {
    try {
      const cfRes = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(cfTurnTokenId)}/credentials/generate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfTurnApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ttl: 14400 }),
          signal: AbortSignal.timeout(3000),
        }
      );
      if (cfRes.ok) {
        const cfData: any = await cfRes.json();
        if (cfData?.iceServers) {
          const extra = Array.isArray(cfData.iceServers) ? cfData.iceServers : [cfData.iceServers];
          res.json({ success: true, iceServers: [...iceServers, ...extra] });
          return;
        }
      }
    } catch {
      // Repli vers TURN statique ou STUN
    }
  }

  // 2. Support TURN statique (Coturn / Metered / Twilio) via variables serveur
  const turnRaw = process.env.TURN_URLS || process.env.TURN_URL || process.env.VITE_TURN_URL;
  if (turnRaw && String(turnRaw).trim()) {
    const urls = String(turnRaw)
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length > 0) {
      iceServers.push({
        urls: urls.length === 1 ? urls[0] : urls,
        username: process.env.TURN_USERNAME || process.env.VITE_TURN_USERNAME || undefined,
        credential: process.env.TURN_CREDENTIAL || process.env.VITE_TURN_CREDENTIAL || undefined,
      });
    }
  }

  res.json({ success: true, iceServers });
}

/**
 * Attache toutes les routes Live, Multistream, Coffre RTMP, Sas VIP, Affiliation & Enchères
 */
export function attachLiveRelayRoutes(app: any): void {
  // Routes de session Live (protégées JWT)
  app.post('/api/lives/start', requireLiveMerchantAuth, handleStartLiveSession);
  app.get('/api/lives/quota', (_req: Request, res: Response) => {
    res.json({
      todayCount: countActiveRunningRelays(),
      maxDailyLimit: MAX_TOTAL_CONCURRENT_RELAYS,
      date: new Date().toISOString().split('T')[0],
      quotaExceeded: countActiveRunningRelays() >= MAX_TOTAL_CONCURRENT_RELAYS
    });
  });
  app.post('/api/lives/:liveId/stop', requireLiveMerchantAuth, async (req: Request, res: Response) => {
    const storeSlug = sanitizeSlug(req.body?.storeSlug || req.params.liveId);
    const allowed = await canUserManageLiveSlug(req, storeSlug);
    if (!allowed) {
      res.status(403).json({ success: false, error: 'Non autorisé.' });
      return;
    }
    const stoppedRelays = stopAllRelaysForStore(storeSlug);
    res.json({ success: true, liveId: req.params.liveId, status: 'ended', stoppedRelays });
  });

  // Coffre-fort serveur des clés RTMP + métadonnées publiques sans secret
  app.get('/api/lives/multistream/config', requireLiveMerchantAuth, handleGetMultistreamVaultConfig);
  app.post('/api/lives/multistream/config', requireLiveMerchantAuth, handleSaveMultistreamVaultConfig);
  app.get('/api/lives/public-meta', handleGetPublicLiveMeta);

  // Multidiffusion temps réel (MediaMTX -> multi-réseaux) protégée JWT / stopToken HMAC
  app.post('/api/lives/multistream/start', requireLiveMerchantAuth, handleStartMultistream);
  app.post('/api/lives/multistream/stop', handleStopMultistream);
  app.get('/api/lives/multistream/status', requireLiveMerchantAuth, handleGetMultistreamStatus);

  // Routes rétrocompatibles protégées
  app.post('/api/lives/relay/start', requireLiveMerchantAuth, handleStartLiveRelay);
  app.post('/api/lives/relay/stop', requireLiveMerchantAuth, handleStopLiveRelay);
  app.get('/api/lives/relay/status', requireLiveMerchantAuth, handleGetLiveRelayStatus);

  // Billetterie & Sas Payant VIP signé HMAC
  app.post('/api/lives/enrollments/record', handleRecordLiveEnrollment);
  app.post('/api/lives/enrollments/verify', handleVerifyLiveEnrollment);
  app.get('/api/lives/enrollments/check-token', handleCheckEnrollmentToken);

  // Affiliation Live & Enchères atomiques
  app.post('/api/lives/affiliate/record', handleRecordAffiliateCommission);
  app.get('/api/lives/affiliate/by-code', handleGetAffiliateCommissionsByCode);
  app.post('/api/lives/affiliate/mark-paid', requireLiveMerchantAuth, handleMarkAffiliateCommissionPaid);
  app.post('/api/lives/auctions/bid', handlePlaceLiveAuctionBid);

  // Serveurs ICE / TURN WebRTC 4G
  app.get('/api/lives/ice-servers', handleGetWebRtcIceServers);
}
