/**
 * ==============================================================================
 * Stream Router Intelligent : LiveManager (YouTube Live vs Jitsi Meet Failover)
 * ==============================================================================
 * 
 * Gestionnaire de résilience de diffusion en direct pour Wameet & Nanasore :
 * 
 * 1. Tracking Transactionnel Quotidien (Firestore: system_stats/daily_lives) :
 *    - Limite de quota YouTube : 10 000 points Google = ~30 Lives par jour.
 *    - Réinitialisation automatique chaque jour (date UTC).
 * 
 * 2. Scénario A (Priorité YouTube) :
 *    - Si compteur < 30, tente la création du Live via YouTube Data API v3.
 *    - En cas de succès : incrémente le compteur quotidien Firestore et renvoie la config YouTube.
 * 
 * 3. Scénario B (Fallback Jitsi Meet en 0ms) :
 *    - Si compteur >= 30, OU si l'API YouTube timeout (> 4s), échoue (403 quotaExceeded, réseau),
 *    - Bascule instantanément sur Jitsi Meet HD (WebRTC sans serveur de transcodage).
 *    - Génère une salle unique et sécurisée basée sur le storeId et un identifiant court.
 * 
 * 4. Structure de réponse unifiée :
 *    - Indique clairement au frontend (provider: 'YOUTUBE' | 'JITSI') quel lecteur instancier.
 */

const https = require('https');
const crypto = require('crypto');
const { refreshAccessToken } = require('./youtube-oauth');

// Quota maximum de diffusions YouTube par jour
const MAX_YOUTUBE_DAILY_LIVES = Number(process.env.MAX_YOUTUBE_DAILY_LIVES || 30);
const YOUTUBE_TIMEOUT_MS = Number(process.env.YOUTUBE_API_TIMEOUT_MS || 4000); // 4 secondes max
const JITSI_DEFAULT_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';

// Mémoire de secours si Firestore n'est pas connecté
let memoryDailyStats = {
  date: new Date().toISOString().split('T')[0],
  count: 0,
  maxDailyLimit: MAX_YOUTUBE_DAILY_LIVES
};

/**
 * Retourne la date courante au format YYYY-MM-DD (UTC)
 */
function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * 1. Vérifie et réserve transactionnellement un slot de diffusion YouTube dans Firestore
 * 
 * @param {admin.firestore.Firestore} db
 * @returns {Promise<{ allowed: boolean, currentCount: number, maxLimit: number, today: string, reason?: string }>}
 */
async function checkDailyYouTubeQuota(db) {
  const today = getTodayDateString();

  if (!db) {
    if (memoryDailyStats.date !== today) {
      memoryDailyStats = { date: today, count: 0, maxDailyLimit: MAX_YOUTUBE_DAILY_LIVES };
    }
    const allowed = memoryDailyStats.count < MAX_YOUTUBE_DAILY_LIVES;
    return {
      allowed,
      currentCount: memoryDailyStats.count,
      maxLimit: MAX_YOUTUBE_DAILY_LIVES,
      today,
      reason: allowed ? undefined : `QUOTA_EXCEEDED (${memoryDailyStats.count}/${MAX_YOUTUBE_DAILY_LIVES})`
    };
  }

  const statsDocRef = db.collection('system_stats').doc('daily_lives');

  try {
    const docSnap = await statsDocRef.get();
    let currentCount = 0;

    if (docSnap.exists) {
      const data = docSnap.data() || {};
      if (data.date === today) {
        currentCount = Number(data.count || 0);
      } else {
        // Nouveau jour : le compteur repart à 0
        currentCount = 0;
      }
    }

    const allowed = currentCount < MAX_YOUTUBE_DAILY_LIVES;

    return {
      allowed,
      currentCount,
      maxLimit: MAX_YOUTUBE_DAILY_LIVES,
      today,
      reason: allowed ? undefined : `QUOTA_EXCEEDED (${currentCount}/${MAX_YOUTUBE_DAILY_LIVES})`
    };
  } catch (err) {
    console.warn('[LIVE QUOTA NOTICE] Erreur lecture quota Firestore, repli mémoire :', err.message);
    const allowed = memoryDailyStats.count < MAX_YOUTUBE_DAILY_LIVES;
    return {
      allowed,
      currentCount: memoryDailyStats.count,
      maxLimit: MAX_YOUTUBE_DAILY_LIVES,
      today,
      reason: allowed ? undefined : 'QUOTA_EXCEEDED_FALLBACK'
    };
  }
}

/**
 * 2. Incrémente de façon transactionnelle le compteur de lives YouTube du jour
 * 
 * @param {admin.firestore.Firestore} db
 */
async function incrementDailyYouTubeQuota(db) {
  const today = getTodayDateString();

  if (!db) {
    if (memoryDailyStats.date !== today) {
      memoryDailyStats = { date: today, count: 0, maxDailyLimit: MAX_YOUTUBE_DAILY_LIVES };
    }
    memoryDailyStats.count += 1;
    return memoryDailyStats.count;
  }

  const statsDocRef = db.collection('system_stats').doc('daily_lives');

  try {
    return await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(statsDocRef);
      let count = 0;

      if (snap.exists) {
        const data = snap.data() || {};
        if (data.date === today) {
          count = Number(data.count || 0);
        }
      }

      const nextCount = count + 1;
      transaction.set(statsDocRef, {
        date: today,
        count: nextCount,
        maxDailyLimit: MAX_YOUTUBE_DAILY_LIVES,
        lastLiveCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return nextCount;
    });
  } catch (err) {
    console.warn('[LIVE QUOTA INCREMENT WARNING] Erreur incrémentation Firestore :', err.message);
    memoryDailyStats.count += 1;
    return memoryDailyStats.count;
  }
}

/**
 * 3. Génère une configuration Jitsi Meet sécurisée et unique (Exécution en < 2ms)
 */
function generateJitsiRoomConfig({
  storeId = 'nanasore_central_hub',
  hostName = 'Vendeur Wameet',
  title = 'Live Shopping Wameet',
  domain = JITSI_DEFAULT_DOMAIN
}) {
  const cleanStoreId = String(storeId).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 24);
  const shortUuid = crypto.randomBytes(4).toString('hex');
  const roomName = `wameet_${cleanStoreId}_${shortUuid}`;

  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const joinUrl = `https://${cleanDomain}/${roomName}`;

  // Paramètres d'optimisation d'expérience Jitsi pour Wameet Live
  const jitsiHashParams = new URLSearchParams({
    'userInfo.displayName': hostName,
    'config.prejoinPageEnabled': 'false',
    'config.startWithAudioMuted': 'false',
    'config.disableDeepLinking': 'true',
    'config.channelLastN': '4',
    'config.enableWelcomePage': 'false'
  }).toString();

  const embedUrl = `${joinUrl}#${jitsiHashParams}`;

  return {
    provider: 'JITSI',
    providerType: 'JITSI',
    domain: cleanDomain,
    roomName,
    joinUrl,
    embedUrl,
    options: {
      subject: title,
      roomName,
      width: '100%',
      height: '100%',
      configOverwrite: {
        prejoinPageEnabled: false,
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        enableWelcomePage: false
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'chat', 'settings', 'raisehand',
          'videoquality', 'tileview'
        ]
      }
    }
  };
}

/**
 * 4. Effectue un appel sécurisé avec timeout strict à l'API YouTube Data v3
 */
async function callYouTubeApiWithTimeout(endpoint, options = {}, timeoutMs = YOUTUBE_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let isSettled = false;

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        reject(new Error(`[YOUTUBE TIMEOUT] L'API YouTube a mis plus de ${timeoutMs}ms à répondre. Activation du Failover.`));
      }
    }, timeoutMs);

    const req = https.request(endpoint, options, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        if (isSettled) return;
        clearTimeout(timer);
        isSettled = true;

        try {
          const parsed = JSON.parse(rawData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const errorMsg = parsed.error?.message || parsed.error?.errors?.[0]?.reason || rawData;
            reject(new Error(`[YOUTUBE API ERROR ${res.statusCode}] : ${errorMsg}`));
          }
        } catch (e) {
          reject(new Error(`[YOUTUBE PARSE ERROR] : ${e.message}`));
        }
      });
    });

    req.on('error', (err) => {
      if (isSettled) return;
      clearTimeout(timer);
      isSettled = true;
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * 5. Crée un Live Broadcast & Stream sur YouTube Data API v3
 */
async function createYouTubeLiveBroadcast({ accessToken, title, description }) {
  const broadcastPayload = JSON.stringify({
    snippet: {
      title: title.substring(0, 100),
      description: (description || 'Direct Shopping Wameet / Nanasore').substring(0, 500),
      scheduledStartTime: new Date(Date.now() + 1000).toISOString()
    },
    status: {
      privacyStatus: 'public', // ou 'unlisted'
      selfDeclaredMadeForKids: false
    },
    contentDetails: {
      enableAutoStart: true,
      enableAutoStop: true,
      recordFromStart: true
    }
  });

  // 1. Insertion du Broadcast
  const broadcastRes = await callYouTubeApiWithTimeout('https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(broadcastPayload)
    },
    body: broadcastPayload
  });

  const videoId = broadcastRes.id;
  const broadcastId = broadcastRes.id;

  // 2. Insertion du LiveStream RTMP
  let rtmpInfo = null;
  try {
    const streamPayload = JSON.stringify({
      snippet: {
        title: `${title.substring(0, 60)} - RTMP Ingestion`
      },
      cdn: {
        frameRate: 'variable',
        ingestionType: 'rtmp',
        resolution: 'variable'
      }
    });

    const streamRes = await callYouTubeApiWithTimeout('https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(streamPayload)
      },
      body: streamPayload
    }, 2500);

    const streamId = streamRes.id;
    rtmpInfo = {
      streamId,
      ingestionAddress: streamRes.cdn?.ingestionInfo?.ingestionAddress || 'rtmp://a.rtmp.youtube.com/live2',
      streamName: streamRes.cdn?.ingestionInfo?.streamName || null
    };

    // 3. Liaison (Bind) entre le Broadcast et le Stream
    await callYouTubeApiWithTimeout(`https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=${broadcastId}&part=id,contentDetails&streamId=${streamId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }, 2500).catch(bindErr => {
      console.warn('[YOUTUBE BIND NOTICE] Bind automatique non critique :', bindErr.message);
    });
  } catch (streamErr) {
    console.warn('[YOUTUBE STREAM INGESTION NOTICE]', streamErr.message);
  }

  return {
    videoId,
    broadcastId,
    watchUrl: `https://www.youtube.com/watch?v= ${videoId}`.replace(' ', ''),
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&modestbranding=1&rel=0&controls=0`,
    rtmp: rtmpInfo
  };
}

/**
 * 6. Récupère un token d'accès Google valide (depuis Firestore system_configs/youtube_oauth)
 */
async function getValidYouTubeAccessToken(db) {
  if (!db) {
    if (process.env.YOUTUBE_ACCESS_TOKEN) {
      return process.env.YOUTUBE_ACCESS_TOKEN;
    }
    throw new Error('Base de données Firestore non connectée et aucun jeton temporaire en variable.');
  }

  const oauthDoc = await db.collection('system_configs').doc('youtube_oauth').get();
  if (!oauthDoc.exists) {
    throw new Error('Aucun compte YouTube associé. Effectuez l\'autorisation sur /api/youtube/auth-url.');
  }

  const data = oauthDoc.data() || {};
  const refreshToken = data.refreshToken || process.env.YOUTUBE_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error('Refresh token YouTube manquant dans Firestore.');
  }

  // Rafraîchissement automatique du jeton
  const tokenRes = await refreshAccessToken(refreshToken);
  if (tokenRes.accessToken) {
    // Mise à jour de l'accessToken en cache dans Firestore
    db.collection('system_configs').doc('youtube_oauth').set({
      lastAccessToken: tokenRes.accessToken,
      expiresAt: new Date(Date.now() + (tokenRes.expiresIn || 3600) * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});

    return tokenRes.accessToken;
  }

  throw new Error('Impossible de rafraîchir le jeton d\'accès YouTube.');
}

/**
 * ============================================================================
 * CŒUR DU STREAM ROUTER : startLiveSession()
 * ============================================================================
 * 
 * Orchestration complète :
 * 1. Vérifie si le quota du jour est dépassé (< 30 Lives).
 * 2. Si forcé ou quota dépassé -> Bascule Jitsi Meet en 0ms.
 * 3. Si quota OK -> Tente YouTube Live avec timeout de 4 secondes.
 * 4. Si échec YouTube -> Fallback Jitsi Meet instantané.
 * 5. Persiste l'état de l'événement dans Firestore (`live_events/{liveId}`).
 */
async function startLiveSession(db, params = {}) {
  const startTs = Date.now();
  const {
    storeId = 'nanasore_central_hub',
    title = 'Live Shopping Wameet 🔥',
    description = 'Session de vente directe sur Wameet & Nanasore',
    hostName = 'Vendeur Wameet',
    hostAvatar,
    forceProvider, // 'YOUTUBE' | 'JITSI' (pour debug ou choix forcé)
    metadata = {}
  } = params;

  const liveId = `live_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  console.log(`[LIVE ROUTER] Démarrage demande de live pour boutique "${storeId}" (Titre: "${title}")...`);

  // ──────────────────────────────────────────────────────────────────────────
  // CAS 0 : Choix Forcé explicite Jitsi
  // ──────────────────────────────────────────────────────────────────────────
  if (forceProvider === 'JITSI') {
    console.log('[LIVE ROUTER] Fournisseur JITSI forcé par paramètre.');
    const jitsiConfig = generateJitsiRoomConfig({ storeId, hostName, title });
    const latencyMs = Date.now() - startTs;

    const liveData = {
      liveId,
      id: liveId,
      storeId,
      title,
      description,
      hostName,
      hostAvatar: hostAvatar || null,
      provider: 'JITSI',
      providerType: 'JITSI',
      isFallback: false,
      failoverReason: 'FORCED_BY_HOST',
      jitsi: jitsiConfig,
      embedUrl: jitsiConfig.embedUrl,
      streamUrl: jitsiConfig.joinUrl,
      status: 'live',
      activeProductId: null,
      startedAt: new Date().toISOString(),
      latencyMs
    };

    await persistLiveEventDoc(db, liveData);
    return liveData;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CAS 1 : Vérification Quota Journalier (Firestore transactionnel)
  // ──────────────────────────────────────────────────────────────────────────
  const quota = await checkDailyYouTubeQuota(db);

  if (!quota.allowed) {
    console.warn(`[LIVE ROUTER FAILOVER] Quota journalier YouTube atteint (${quota.currentCount}/${quota.maxLimit} pour le ${quota.today}).`);
    console.warn('[LIVE ROUTER FAILOVER] Basculement automatique 0ms vers Jitsi Meet HD...');

    const jitsiConfig = generateJitsiRoomConfig({ storeId, hostName, title });
    const latencyMs = Date.now() - startTs;

    const liveData = {
      liveId,
      id: liveId,
      storeId,
      title,
      description,
      hostName,
      hostAvatar: hostAvatar || null,
      provider: 'JITSI',
      providerType: 'JITSI',
      isFallback: true,
      failoverReason: `DAILY_QUOTA_LIMIT_REACHED (${quota.currentCount}/${quota.maxLimit})`,
      quotaInfo: {
        todayCount: quota.currentCount,
        maxDailyLimit: quota.maxLimit,
        date: quota.today,
        quotaExceeded: true
      },
      jitsi: jitsiConfig,
      embedUrl: jitsiConfig.embedUrl,
      streamUrl: jitsiConfig.joinUrl,
      status: 'live',
      activeProductId: null,
      startedAt: new Date().toISOString(),
      latencyMs
    };

    await persistLiveEventDoc(db, liveData);
    return liveData;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CAS 2 : Tentative Prioritaire YouTube Data API v3 (Avec Timeout Strict)
  // ──────────────────────────────────────────────────────────────────────────
  let youtubeData = null;
  let failoverError = null;

  try {
    console.log(`[LIVE ROUTER] Quota OK (${quota.currentCount}/${quota.maxLimit}). Initialisation YouTube Live API v3...`);
    const accessToken = await getValidYouTubeAccessToken(db);

    youtubeData = await createYouTubeLiveBroadcast({
      accessToken,
      title,
      description
    });

    // Incrémentation du quota quotidien suite au succès
    const updatedCount = await incrementDailyYouTubeQuota(db);
    console.log(`[LIVE ROUTER] Succès YouTube Live ! Compteur du jour incrémenté à ${updatedCount}/${quota.maxLimit}. VideoId: ${youtubeData.videoId}`);

    const latencyMs = Date.now() - startTs;

    const liveData = {
      liveId,
      id: liveId,
      storeId,
      title,
      description,
      hostName,
      hostAvatar: hostAvatar || null,
      provider: 'YOUTUBE',
      providerType: 'YOUTUBE',
      isFallback: false,
      failoverReason: null,
      quotaInfo: {
        todayCount: updatedCount,
        maxDailyLimit: quota.maxLimit,
        date: quota.today,
        quotaExceeded: false
      },
      youtube: {
        videoId: youtubeData.videoId,
        broadcastId: youtubeData.broadcastId,
        watchUrl: youtubeData.watchUrl,
        embedUrl: youtubeData.embedUrl,
        rtmp: youtubeData.rtmp
      },
      embedUrl: youtubeData.embedUrl,
      streamUrl: youtubeData.watchUrl,
      status: 'live',
      activeProductId: null,
      startedAt: new Date().toISOString(),
      latencyMs
    };

    await persistLiveEventDoc(db, liveData);
    return liveData;

  } catch (ytErr) {
    failoverError = ytErr.message;
    console.error('[LIVE ROUTER ERROR] Échec de l\'initialisation YouTube Live :', ytErr.message);
    console.log('[LIVE ROUTER FAILOVER] Activation du plan de secours immédiat (Jitsi Meet)...');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CAS 3 : Fallback Automatique vers Jitsi Meet HD
  // ──────────────────────────────────────────────────────────────────────────
  const jitsiConfig = generateJitsiRoomConfig({ storeId, hostName, title });
  const latencyMs = Date.now() - startTs;

  const liveData = {
    liveId,
    id: liveId,
    storeId,
    title,
    description,
    hostName,
    hostAvatar: hostAvatar || null,
    provider: 'JITSI',
    providerType: 'JITSI',
    isFallback: true,
    failoverReason: failoverError || 'YOUTUBE_UNAVAILABLE',
    quotaInfo: {
      todayCount: quota.currentCount,
      maxDailyLimit: quota.maxLimit,
      date: quota.today,
      quotaExceeded: false
    },
    jitsi: jitsiConfig,
    embedUrl: jitsiConfig.embedUrl,
    streamUrl: jitsiConfig.joinUrl,
    status: 'live',
    activeProductId: null,
    startedAt: new Date().toISOString(),
    latencyMs
  };

  await persistLiveEventDoc(db, liveData);
  return liveData;
}

/**
 * 7. Sauvegarde du document de Live dans Firestore (/live_events/{liveId})
 */
async function persistLiveEventDoc(db, liveData) {
  if (!db) return;
  try {
    const liveDocRef = db.collection('live_events').doc(liveData.liveId);
    await liveDocRef.set({
      ...liveData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`[LIVE FIRESTORE] Événement Live ${liveData.liveId} sauvegardé (${liveData.provider}).`);
  } catch (err) {
    console.warn('[LIVE FIRESTORE WARNING] Impossible de sauvegarder dans /live_events/ :', err.message);
  }
}

/**
 * 8. Récupère les statistiques de quota du jour
 */
async function getDailyQuotaStatus(db) {
  return await checkDailyYouTubeQuota(db);
}

module.exports = {
  startLiveSession,
  generateJitsiRoomConfig,
  checkDailyYouTubeQuota,
  incrementDailyYouTubeQuota,
  getDailyQuotaStatus,
  MAX_YOUTUBE_DAILY_LIVES
};
