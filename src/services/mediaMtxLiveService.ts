/**
 * @file mediaMtxLiveService.ts
 * @description Moteur WebRTC WHIP (WebRTC-HTTP Ingestion Protocol) & HLS pour MediaMTX sur Northflank
 * 
 * Supporte :
 * 1. Capture locale (caméra mobile avant/arrière, micro)
 * 2. Handshake WHIP RFC draft avec MediaMTX (POST application/sdp -> 201 Created)
 * 3. Gestion de la session WHIP (sauvegarde du Location header pour suppression DELETE propre)
 * 4. Nettoyage complet des MediaStreamTrack et de la RTCPeerConnection
 */

import { buildStoreWhipUrl, buildStoreHlsUrl, getLiveHlsBaseUrl } from '../config/liveStreamConfig';

export interface WhipBroadcastSession {
  peerConnection: RTCPeerConnection;
  stream: MediaStream;
  locationUrl?: string;
  storeSlug: string;
  whipEndpoint: string;
  hlsPlaybackUrl: string;
  startedAt: number;
}

export interface StartBroadcastOptions {
  storeSlug: string;
  facingMode?: 'user' | 'environment';
  videoDeviceId?: string;
  audioDeviceId?: string;
  existingStream?: MediaStream;
  iceServers?: RTCIceServer[];
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

/**
 * Capture le flux média du vendeur (vidéo + audio) avec gestion du facingMode mobile
 */
export async function getCameraStream(options: {
  facingMode?: 'user' | 'environment';
  videoDeviceId?: string;
  audioDeviceId?: string;
} = {}): Promise<MediaStream> {
  const facingMode = options.facingMode || 'environment';

  const videoConstraints: MediaTrackConstraints = options.videoDeviceId
    ? { deviceId: { exact: options.videoDeviceId } }
    : {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 }
      };

  const audioConstraints: MediaTrackConstraints = options.audioDeviceId
    ? { deviceId: { exact: options.audioDeviceId } }
    : {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: audioConstraints
    });
  } catch (err: any) {
    // Fallback avec contraintes allégées si contraintes idéales refusées
    console.warn('[WHIP CAMERA] Échec contraintes HD, tentative fallback standard :', err);
    return await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
  }
}

/**
 * Démarre une diffusion WebRTC WHIP vers MediaMTX
 */
export async function startWhipBroadcast(
  options: StartBroadcastOptions
): Promise<WhipBroadcastSession> {
  const storeSlug = options.storeSlug || 'live-master';
  const whipEndpoint = buildStoreWhipUrl(storeSlug);
  const hlsPlaybackUrl = buildStoreHlsUrl(storeSlug);

  // 1. Obtenir le flux média (soit fourni, soit capturé)
  const stream = options.existingStream || (await getCameraStream({
    facingMode: options.facingMode
  }));

  // 2. Initialiser la RTCPeerConnection avec serveurs STUN
  const pc = new RTCPeerConnection({
    iceServers: options.iceServers || DEFAULT_ICE_SERVERS,
    bundlePolicy: 'max-bundle'
  });

  // 3. Ajouter les pistes audio et vidéo en mode sendonly
  stream.getTracks().forEach((track) => {
    pc.addTransceiver(track, {
      direction: 'sendonly',
      streams: [stream]
    });
  });

  // 4. Générer l'offre SDP locale
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // 5. Attendre la complétion de la collecte ICE ou un timeout de 1.5s
  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }

    const checkIce = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', checkIce);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', checkIce);

    // Timeout de sécurité : si les candidats prennent du temps, on envoie le SDP actuel
    setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', checkIce);
      resolve();
    }, 1500);
  });

  const localSdp = pc.localDescription?.sdp || offer.sdp;
  if (!localSdp) {
    throw new Error("Impossible d'extraire la description SDP locale pour le direct.");
  }

  // 6. Envoi de l'offre SDP vers l'endpoint WHIP via HTTP POST
  console.log(`[WHIP BROADCAST] Envoi de l'offre SDP vers ${whipEndpoint}`);
  const response = await fetch(whipEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sdp',
      'Accept': 'application/sdp'
    },
    body: localSdp
  });

  if (response.status !== 201 && response.status !== 200) {
    const errorText = await response.text().catch(() => '');
    pc.close();
    stream.getTracks().forEach(t => t.stop());
    throw new Error(`MediaMTX WHIP a refusé la connexion (${response.status}): ${errorText || response.statusText}`);
  }

  // 7. Récupération de l'URL Location pour la fermeture de session
  let locationUrl: string | undefined = response.headers.get('Location') || response.headers.get('location') || undefined;
  if (locationUrl && !locationUrl.startsWith('http')) {
    // Résoudre l'URL relative par rapport à l'endpoint WHIP
    const parsedEndpoint = new URL(whipEndpoint);
    locationUrl = `${parsedEndpoint.origin}${locationUrl.startsWith('/') ? '' : '/'}${locationUrl}`;
  }

  // 8. Application de la réponse SDP de MediaMTX
  const answerSdp = await response.text();
  await pc.setRemoteDescription({
    type: 'answer',
    sdp: answerSdp
  });

  console.log(`[WHIP BROADCAST] ✅ Connexion WebRTC établie avec succès pour ${storeSlug} ! Location: ${locationUrl || 'non fournie'}`);

  return {
    peerConnection: pc,
    stream,
    locationUrl,
    storeSlug,
    whipEndpoint,
    hlsPlaybackUrl,
    startedAt: Date.now()
  };
}

/**
 * Arrête proprement une session de diffusion WHIP
 */
export async function stopWhipBroadcast(session: WhipBroadcastSession | null | undefined): Promise<void> {
  if (!session) return;

  console.log(`[WHIP BROADCAST] 🛑 Arrêt de la diffusion pour ${session.storeSlug}...`);

  // 1. Envoyer la requête DELETE à l'URL de ressource WHIP (Location)
  if (session.locationUrl) {
    try {
      await fetch(session.locationUrl, {
        method: 'DELETE'
      });
      console.log(`[WHIP BROADCAST] Session WHIP fermée côté MediaMTX via DELETE`);
    } catch (delErr) {
      console.warn('[WHIP BROADCAST] Erreur fermeture DELETE WHIP :', delErr);
    }
  }

  // 2. Fermer la RTCPeerConnection
  try {
    session.peerConnection.close();
  } catch (pcErr) {
    console.warn('[WHIP BROADCAST] Erreur fermeture RTCPeerConnection :', pcErr);
  }

  // 3. Couper toutes les pistes média
  try {
    session.stream.getTracks().forEach((track) => {
      track.stop();
    });
  } catch (trackErr) {
    console.warn('[WHIP BROADCAST] Erreur arrêt des pistes média :', trackErr);
  }
}

/**
 * Teste la disponibilité du flux HLS (ping HTTP HEAD léger)
 */
export async function checkHlsStreamAvailable(hlsUrl: string): Promise<boolean> {
  try {
    const res = await fetch(hlsUrl, {
      method: 'HEAD',
      cache: 'no-cache'
    });
    return res.ok;
  } catch {
    return false;
  }
}
