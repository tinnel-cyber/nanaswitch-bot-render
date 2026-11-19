/**
 * @file liveRelayController.ts
 * @description Contrôleur Backend pour le Relais Simultané RTMP (YouTube Live, Facebook Live, Twitch, TikTok,
 * Instagram, LinkedIn, X/Twitter, Telegram, Destinations personnalisées) depuis MediaMTX via FFmpeg réel.
 * 
 * ZÉRO MOCK, ZÉRO SIMULATION : Lance un processus FFmpeg réel par destination pour garantir l'isolation
 * des flux (si une clé expire sur TikTok, le stream YouTube/Facebook ne s'interrompt pas).
 */

import { Request, Response } from 'express';
import { spawn, ChildProcess } from 'child_process';

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

/**
 * Construit l'URL RTMP/RTMPS complète et valide pour chaque plateforme
 */
export function buildFullRtmpDestinationUrl(
  platformId: string,
  credentials: { serverUrl?: string; streamKey?: string }
): { fullUrl: string; maskedKey: string; platformName: string } | null {
  const streamKey = (credentials.streamKey || '').trim();
  const serverUrl = (credentials.serverUrl || '').trim();

  if (!streamKey) return null;

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
      if (!serverUrl) return null;
      return {
        fullUrl: `${serverUrl.replace(/\/+$/, '')}/${streamKey}`,
        maskedKey,
        platformName: 'TikTok Live'
      };

    case 'instagram': {
      const baseInsta = serverUrl || 'rtmps://live-upload.instagram.com:443/rtmp/';
      return {
        fullUrl: `${baseInsta.replace(/\/+$/, '')}/${streamKey}`,
        maskedKey,
        platformName: 'Instagram Live'
      };
    }

    case 'linkedin':
      if (!serverUrl) return null;
      return {
        fullUrl: `${serverUrl.replace(/\/+$/, '')}/${streamKey}`,
        maskedKey,
        platformName: 'LinkedIn Live'
      };

    case 'twitter':
    case 'x':
      if (!serverUrl) return null;
      return {
        fullUrl: `${serverUrl.replace(/\/+$/, '')}/${streamKey}`,
        maskedKey,
        platformName: 'X (Twitter) Live'
      };

    case 'telegram': {
      const baseTg = serverUrl || 'rtmps://dc4-1.rtmp.t.me/s/';
      return {
        fullUrl: `${baseTg.replace(/\/+$/, '')}/${streamKey}`,
        maskedKey,
        platformName: 'Telegram Live'
      };
    }

    default:
      // RTMP Personnalisé
      if (!serverUrl) return null;
      return {
        fullUrl: `${serverUrl.replace(/\/+$/, '')}/${streamKey}`,
        maskedKey,
        platformName: platformId
      };
  }
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

  // Si un processus tourne déjà sur cette destination (starting ou streaming), on l'arrête d'abord
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

  // Arguments FFmpeg optimisés pour Northflank :
  // -reconnect* : tolère le court délai d'initialisation du manifeste HLS après le handshake WHIP
  // -re : cadence temps réel
  // -c:v copy : zéro transcodage vidéo = charge CPU minimale
  // -c:a aac -ar 44100 -b:a 128k : ré-encodage audio AAC 44.1kHz compatible tous CDN RTMP/RTMPS
  // -f flv : muxer RTMP standard
  const ffmpegArgs = [
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

  console.log(`[FFMPEG RELAY] Démarrage du relais vers ${platformName} pour [${storeSlug}] : ${inputSource} -> ${fullRtmpUrl.replace(/:[^/@]+@/, ':***@')}`);

  try {
    const proc = spawn('ffmpeg', ffmpegArgs);
    record.process = proc;
    record.pid = proc.pid;

    proc.stdout?.on('data', (chunk) => {
      const msg = chunk.toString();
      record.logs.push(msg);
      if (record.logs.length > 30) record.logs.shift();
    });

    proc.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      record.logs.push(text);
      if (record.logs.length > 30) record.logs.shift();

      // Détection des erreurs d'authentification ou réseau RTMP
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
        record.errorMessage = text.slice(0, 220).trim();
        console.error(`[FFMPEG RELAY ERROR] [${platformName}] (PID ${record.pid}):`, record.errorMessage);
      } else if (record.status === 'starting' && /frame=\s*\d+/i.test(text)) {
        // Dès que des frames FLV sortent, le flux est actif !
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

/**
 * Arrête proprement un relais FFmpeg
 */
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

/**
 * Arrête tous les relais actifs pour un storeSlug donné
 */
export function stopAllRelaysForStore(storeSlug: string): number {
  const cleanSlug = encodeURIComponent(String(storeSlug).replace(/[^a-zA-Z0-9_-]/g, ''));
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

// Nettoyage automatique de tous les processus FFmpeg lors de l'arrêt du conteneur Node.js
for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.once(sig, () => {
    for (const [key, record] of activeRelayProcesses.entries()) {
      stopRelayProcess(record);
      activeRelayProcesses.delete(key);
    }
  });
}

// ============================================================================
// HANDLERS API EXPRESS
// ============================================================================

/**
 * POST /api/lives/multistream/start
 * Démarre le multidiffusion simultané vers tous les réseaux sociaux configurés
 */
export async function handleStartMultistream(req: Request, res: Response): Promise<void> {
  const { storeSlug, destinations } = req.body;

  if (!storeSlug || !destinations || typeof destinations !== 'object') {
    res.status(400).json({
      success: false,
      error: "Paramètres manquants : 'storeSlug' et 'destinations' sont requis."
    });
    return;
  }

  const cleanSlug = encodeURIComponent(String(storeSlug).replace(/[^a-zA-Z0-9_-]/g, ''));
  const inputSource = `${MEDIAMTX_HLS_BASE.replace(/\/+$/, '')}/${cleanSlug}/index.m3u8`;

  const results: Record<string, { status: string; message: string; fullUrl?: string }> = {};
  let totalLaunched = 0;

  // 1. Plateformes fixes (YouTube, Facebook, Twitch, TikTok, Instagram, LinkedIn, Twitter, Telegram)
  const standardPlatforms = ['youtube', 'facebook', 'twitch', 'tiktok', 'instagram', 'linkedin', 'twitter', 'telegram'];

  for (const plat of standardPlatforms) {
    const cfg = destinations[plat];
    if (cfg && cfg.enabled && cfg.streamKey) {
      const built = buildFullRtmpDestinationUrl(plat, cfg);
      if (built) {
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
    }
  }

  // 2. Destinations RTMP Personnalisées
  if (Array.isArray(destinations.custom)) {
    destinations.custom.forEach((dest: any, index: number) => {
      if (dest && dest.enabled && dest.serverUrl && dest.streamKey) {
        const customId = dest.id || `custom_${index}`;
        const customName = dest.name || `RTMP Perso ${index + 1}`;
        const built = buildFullRtmpDestinationUrl(customName, dest);
        if (built) {
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
        }
      }
    });
  }

  res.json({
    success: true,
    storeSlug: cleanSlug,
    inputSource,
    totalLaunched,
    results
  });
}

/**
 * POST /api/lives/multistream/stop
 * Arrête les relais (tous ou par plateforme spécifique)
 */
export async function handleStopMultistream(req: Request, res: Response): Promise<void> {
  const { storeSlug, platformId } = req.body;

  if (!storeSlug) {
    res.status(400).json({ success: false, error: "Le paramètre 'storeSlug' est requis." });
    return;
  }

  const cleanSlug = encodeURIComponent(String(storeSlug).replace(/[^a-zA-Z0-9_-]/g, ''));
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

/**
 * GET /api/lives/multistream/status?storeSlug=xyz
 * Retourne l'état précis en temps réel de chaque relais
 */
export async function handleGetMultistreamStatus(req: Request, res: Response): Promise<void> {
  const { storeSlug } = req.query;

  if (!storeSlug) {
    res.status(400).json({ success: false, error: "Le paramètre 'storeSlug' est requis." });
    return;
  }

  const cleanSlug = encodeURIComponent(String(storeSlug).replace(/[^a-zA-Z0-9_-]/g, ''));
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

/**
 * Rétro-compatibilité : /api/lives/relay/start
 */
export async function handleStartLiveRelay(req: Request, res: Response): Promise<void> {
  const { storeSlug, targetPlatform = 'youtube', rtmpUrl, streamKey } = req.body;
  if (!storeSlug || !streamKey) {
    res.status(400).json({ success: false, error: "'storeSlug' et 'streamKey' sont requis." });
    return;
  }

  const cleanSlug = encodeURIComponent(String(storeSlug).replace(/[^a-zA-Z0-9_-]/g, ''));
  const inputSource = `${MEDIAMTX_HLS_BASE.replace(/\/+$/, '')}/${cleanSlug}/index.m3u8`;

  const built = buildFullRtmpDestinationUrl(targetPlatform, { serverUrl: rtmpUrl, streamKey });
  if (!built) {
    res.status(400).json({ success: false, error: "URL ou clé RTMP invalide." });
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
    startedAt: record.startedAt
  });
}

/**
 * Rétro-compatibilité : /api/lives/relay/stop
 */
export async function handleStopLiveRelay(req: Request, res: Response): Promise<void> {
  const { storeSlug, targetPlatform, relayId } = req.body;
  let targetSlug = storeSlug;
  let targetPlat = targetPlatform;

  if (relayId && relayId.includes('__')) {
    const parts = relayId.split('__');
    targetSlug = parts[0];
    targetPlat = parts[1];
  }

  if (!targetSlug) {
    res.status(400).json({ success: false, error: "storeSlug ou relayId requis." });
    return;
  }

  const key = `${targetSlug}__${targetPlat || 'youtube'}`;
  const record = activeRelayProcesses.get(key);

  if (record) {
    stopRelayProcess(record);
    activeRelayProcesses.delete(key);
    res.json({ success: true, message: "Relais arrêté avec succès.", relayId: key });
  } else {
    res.status(404).json({ success: false, error: "Aucun relais actif trouvé pour cet identifiant." });
  }
}

/**
 * Rétro-compatibilité : /api/lives/relay/status
 */
export async function handleGetLiveRelayStatus(req: Request, res: Response): Promise<void> {
  const { storeSlug } = req.query;
  const relays = Array.from(activeRelayProcesses.values())
    .filter((r) => !storeSlug || r.storeSlug === storeSlug)
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

/**
 * Route /api/lives/start : démarre une session Live Shopping (MediaMTX WHIP / HLS)
 */
export async function handleStartLiveSession(req: Request, res: Response): Promise<void> {
  const { storeId = 'nanasore_central_hub', title = 'Live Shopping Wameet 🔥', description, hostName, hostAvatar } = req.body;
  const cleanSlug = encodeURIComponent(String(storeId).replace(/[^a-zA-Z0-9_-]/g, ''));

  const liveId = `live_${cleanSlug}_${Date.now()}`;
  const whipUrl = `${MEDIAMTX_WHIP_BASE.replace(/\/+$/, '')}/${cleanSlug}/whip`;
  const hlsUrl = `${MEDIAMTX_HLS_BASE.replace(/\/+$/, '')}/${cleanSlug}/index.m3u8`;

  // Déclencheur temps réel automatique : Envoi réel Web Push à tous les abonnés du store_slug
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
    status: 'live',
    startedAt: new Date().toISOString()
  });
}

/**
 * Attache toutes les routes Live & Multistream à l'application Express
 */
export function attachLiveRelayRoutes(app: any): void {
  // Routes de session Live
  app.post('/api/lives/start', handleStartLiveSession);
  app.get('/api/lives/quota', (_req: Request, res: Response) => {
    res.json({
      todayCount: activeRelayProcesses.size,
      maxDailyLimit: 100,
      date: new Date().toISOString().split('T')[0],
      quotaExceeded: false
    });
  });
  app.post('/api/lives/:liveId/stop', (req: Request, res: Response) => {
    const storeSlug = req.body?.storeSlug || req.params.liveId;
    const stoppedRelays = stopAllRelaysForStore(storeSlug);
    res.json({ success: true, liveId: req.params.liveId, status: 'ended', stoppedRelays });
  });

  // Nouvelles routes de multidiffusion temps réel (MediaMTX -> multi-réseaux)
  app.post('/api/lives/multistream/start', handleStartMultistream);
  app.post('/api/lives/multistream/stop', handleStopMultistream);
  app.get('/api/lives/multistream/status', handleGetMultistreamStatus);

  // Routes rétrocompatibles
  app.post('/api/lives/relay/start', handleStartLiveRelay);
  app.post('/api/lives/relay/stop', handleStopLiveRelay);
  app.get('/api/lives/relay/status', handleGetLiveRelayStatus);
}
