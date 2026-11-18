/**
 * @file liveRelayController.ts
 * @description Contrôleur Backend pour le Relais Simultané RTMP (YouTube Live, Facebook Live, Twitch)
 * depuis les flux MediaMTX (Northflank) via FFmpeg / MediaMTX API.
 * 
 * Permet aux vendeurs de diffuser simultanément sur les réseaux sociaux
 * sans avoir besoin d'ouvrir de port 1935 entrant sur leur navigateur.
 */

import { Request, Response } from 'express';
import { spawn, ChildProcess } from 'child_process';

interface ActiveRelay {
  id: string;
  storeSlug: string;
  targetPlatform: 'youtube' | 'facebook' | 'twitch' | 'custom';
  rtmpUrl: string;
  streamKey: string;
  process?: ChildProcess;
  startedAt: number;
  status: 'starting' | 'running' | 'error' | 'stopped';
  logs: string[];
}

const activeRelays = new Map<string, ActiveRelay>();

const MEDIAMTX_HLS_BASE = process.env.LIVE_HLS_INTERNAL_URL || 
  process.env.VITE_LIVE_HLS_URL || 
  'https://p02--nanasore-live--p8yx28yyjhbx.code.run';

/**
 * Démarre un relais FFmpeg depuis MediaMTX vers une destination RTMP externe
 */
export async function handleStartLiveRelay(req: Request, res: Response): Promise<void> {
  const { storeSlug, targetPlatform = 'youtube', rtmpUrl, streamKey } = req.body;

  if (!storeSlug || !rtmpUrl || !streamKey) {
    res.status(400).json({
      success: false,
      error: "Paramètres manquants : 'storeSlug', 'rtmpUrl' et 'streamKey' sont requis."
    });
    return;
  }

  const cleanSlug = encodeURIComponent(String(storeSlug).replace(/[^a-zA-Z0-9_-]/g, ''));
  const relayId = `${cleanSlug}_${targetPlatform}_${Date.now()}`;
  const fullRtmpDest = `${rtmpUrl.replace(/\/+$/, '')}/${streamKey}`;

  // Vérifier si un relais existe déjà pour ce couple store + plateforme
  const existingKey = Array.from(activeRelays.entries()).find(
    ([_, r]) => r.storeSlug === cleanSlug && r.targetPlatform === targetPlatform && r.status === 'running'
  );

  if (existingKey) {
    res.json({
      success: true,
      message: "Un relais est déjà en cours pour cette plateforme.",
      relayId: existingKey[0],
      status: existingKey[1].status,
      startedAt: existingKey[1].startedAt
    });
    return;
  }

  // URL source HLS depuis MediaMTX
  const inputSource = `${MEDIAMTX_HLS_BASE.replace(/\/+$/, '')}/${cleanSlug}/index.m3u8`;

  const relayRecord: ActiveRelay = {
    id: relayId,
    storeSlug: cleanSlug,
    targetPlatform,
    rtmpUrl,
    streamKey: `${streamKey.slice(0, 4)}***`,
    startedAt: Date.now(),
    status: 'starting',
    logs: []
  };

  activeRelays.set(relayId, relayRecord);

  try {
    // Arguments FFmpeg optimisés pour le restreaming basse latence
    const ffmpegArgs = [
      '-re',
      '-i', inputSource,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-f', 'flv',
      fullRtmpDest
    ];

    console.log(`[LIVE RELAY] Démarrage FFmpeg pour ${cleanSlug} vers ${targetPlatform} (${inputSource} -> RTMP)`);
    const ffmpegProc = spawn('ffmpeg', ffmpegArgs);
    relayRecord.process = ffmpegProc;
    relayRecord.status = 'running';

    ffmpegProc.stdout?.on('data', (chunk) => {
      const msg = chunk.toString();
      relayRecord.logs.push(msg);
      if (relayRecord.logs.length > 50) relayRecord.logs.shift();
    });

    ffmpegProc.stderr?.on('data', (chunk) => {
      const msg = chunk.toString();
      relayRecord.logs.push(msg);
      if (relayRecord.logs.length > 50) relayRecord.logs.shift();
    });

    ffmpegProc.on('error', (err) => {
      console.error(`[LIVE RELAY ERROR] Erreur FFmpeg (${relayId}) :`, err);
      relayRecord.status = 'error';
      relayRecord.logs.push(`Process Error: ${err.message}`);
    });

    ffmpegProc.on('close', (code) => {
      console.log(`[LIVE RELAY] FFmpeg terminé avec le code ${code} (${relayId})`);
      relayRecord.status = 'stopped';
      activeRelays.delete(relayId);
    });

    res.json({
      success: true,
      message: `Relais RTMP vers ${targetPlatform} démarré avec succès.`,
      relayId,
      storeSlug: cleanSlug,
      inputSource,
      targetPlatform,
      status: 'running',
      startedAt: relayRecord.startedAt
    });
  } catch (err: any) {
    console.error('[LIVE RELAY] Échec instanciation FFmpeg :', err);
    relayRecord.status = 'error';
    res.status(500).json({
      success: false,
      error: `Impossible de lancer le relais FFmpeg : ${err?.message}`
    });
  }
}

/**
 * Arrête un relais RTMP actif
 */
export async function handleStopLiveRelay(req: Request, res: Response): Promise<void> {
  const { relayId, storeSlug, targetPlatform } = req.body;

  let targetRelay: ActiveRelay | undefined;

  if (relayId && activeRelays.has(relayId)) {
    targetRelay = activeRelays.get(relayId);
  } else if (storeSlug) {
    targetRelay = Array.from(activeRelays.values()).find(
      (r) => r.storeSlug === storeSlug && (!targetPlatform || r.targetPlatform === targetPlatform)
    );
  }

  if (!targetRelay) {
    res.status(404).json({
      success: false,
      error: "Aucun relais actif trouvé pour ces critères."
    });
    return;
  }

  try {
    if (targetRelay.process && !targetRelay.process.killed) {
      targetRelay.process.kill('SIGTERM');
      setTimeout(() => {
        if (targetRelay?.process && !targetRelay.process.killed) {
          targetRelay.process.kill('SIGKILL');
        }
      }, 2000);
    }

    targetRelay.status = 'stopped';
    activeRelays.delete(targetRelay.id);

    res.json({
      success: true,
      message: "Relais RTMP arrêté avec succès.",
      relayId: targetRelay.id
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Erreur arrêt relais : ${err?.message}`
    });
  }
}

/**
 * Retourne le statut des relais en cours
 */
export async function handleGetLiveRelayStatus(req: Request, res: Response): Promise<void> {
  const { storeSlug } = req.query;

  const relays = Array.from(activeRelays.values())
    .filter((r) => !storeSlug || r.storeSlug === storeSlug)
    .map((r) => ({
      id: r.id,
      storeSlug: r.storeSlug,
      targetPlatform: r.targetPlatform,
      rtmpUrl: r.rtmpUrl,
      streamKey: r.streamKey,
      status: r.status,
      startedAt: r.startedAt,
      durationSeconds: Math.floor((Date.now() - r.startedAt) / 1000),
      recentLogs: r.logs.slice(-5)
    }));

  res.json({
    success: true,
    totalActive: relays.length,
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
  const whipUrl = `https://p01--nanasore-live--p8yx28yyjhbx.code.run/${cleanSlug}/whip`;
  const hlsUrl = `https://p02--nanasore-live--p8yx28yyjhbx.code.run/${cleanSlug}/index.m3u8`;

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
 * Attache les routes de Live Streaming & Relais RTMP à l'application Express
 */
export function attachLiveRelayRoutes(app: any): void {
  // Routes de gestion du direct
  app.post('/api/lives/start', handleStartLiveSession);
  app.get('/api/lives/quota', (_req: Request, res: Response) => {
    res.json({
      todayCount: 1,
      maxDailyLimit: 100,
      date: new Date().toISOString().split('T')[0],
      quotaExceeded: false
    });
  });
  app.post('/api/lives/:liveId/stop', (req: Request, res: Response) => {
    res.json({ success: true, liveId: req.params.liveId, status: 'ended' });
  });

  // Routes de relais simultané RTMP
  app.post('/api/lives/relay/start', handleStartLiveRelay);
  app.post('/api/lives/relay/stop', handleStopLiveRelay);
  app.get('/api/lives/relay/status', handleGetLiveRelayStatus);
}
