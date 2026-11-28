/**
 * @file whipBroadcastService.ts
 * @description Service WebRTC WHIP (WebRTC-HTTP Ingestion Protocol) de production pour Nanasore -> MediaMTX.
 *
 * ZÉRO MOCK, ZÉRO SIMULATION :
 * - Capture caméra/micro navigateur via navigator.mediaDevices.getUserMedia (user / environment)
 * - Handshake WHIP réel (POST application/sdp -> 201 Created -> setRemoteDescription)
 * - Gestion explicite des erreurs (HTTPS requis, permission refusée, caméra absente, WHIP injoignable)
 * - Fermeture propre (DELETE WHIP Location + RTCPeerConnection.close() + track.stop())
 */

import {
  buildStoreWhipUrl,
  buildStoreHlsUrl,
  getSharedWebRtcIceServers,
  resolveWebRtcIceServers,
} from '../config/liveStreamConfig';

export type CameraFacingMode = 'user' | 'environment';

export interface WhipBroadcastSession {
  peerConnection: RTCPeerConnection;
  stream: MediaStream;
  locationUrl?: string;
  storeSlug: string;
  whipEndpoint: string;
  hlsPlaybackUrl: string;
  startedAt: number;
}

export interface WhipCameraOptions {
  facingMode?: CameraFacingMode;
  videoDeviceId?: string;
  audioDeviceId?: string;
}

export interface StartWhipOptions extends WhipCameraOptions {
  storeSlug: string;
  existingStream?: MediaStream;
  iceServers?: RTCIceServer[];
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

/**
 * Formate une erreur getUserMedia en message utilisateur clair (français)
 */
export function formatCameraError(err: any): string {
  if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
    return "Accès caméra bloqué : une connexion HTTPS sécurisée est requise pour diffuser en direct.";
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return "Votre navigateur ne supporte pas la capture caméra/micro WebRTC ou le site n'est pas ouvert en HTTPS.";
  }

  const name = err?.name || '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return "Accès à la caméra ou au microphone refusé. Autorisez la caméra/micro dans les paramètres de votre navigateur puis réessayez.";
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return "Aucune caméra ou microphone détecté sur cet appareil.";
    case 'NotReadableError':
    case 'TrackStartError':
      return "La caméra ou le micro est déjà utilisé par une autre application. Fermez-la puis réessayez.";
    case 'OverconstrainedError':
      return "Les paramètres vidéo demandés ne sont pas supportés par votre caméra.";
    default:
      return err?.message || "Impossible d'accéder à la caméra ou au microphone.";
  }
}

/**
 * Capture le flux caméra + micro du navigateur avec gestion du facingMode (avant/arrière)
 */
export async function captureCameraStream(options: WhipCameraOptions = {}): Promise<MediaStream> {
  if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
    throw new Error("Accès caméra bloqué : une connexion HTTPS sécurisée est requise pour diffuser en direct.");
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Votre navigateur ne supporte pas la capture caméra/micro WebRTC (HTTPS requis).");
  }

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
    // Si refus de permission ou absence de matériel, ne pas masquer l'erreur
    if (
      err?.name === 'NotAllowedError' ||
      err?.name === 'PermissionDeniedError' ||
      err?.name === 'NotFoundError' ||
      err?.name === 'NotReadableError'
    ) {
      throw new Error(formatCameraError(err));
    }

    // Repli contraintes standard si la résolution HD n'est pas supportée
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: true
      });
    } catch (fallbackErr: any) {
      throw new Error(formatCameraError(fallbackErr));
    }
  }
}

/**
 * Arrête proprement toutes les pistes d'un MediaStream
 */
export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (_) {}
    });
  } catch (_) {}
}

/**
 * Remplace la piste vidéo en direct dans une RTCPeerConnection active (bascule caméra avant/arrière sans couper le live)
 */
export async function switchBroadcastCamera(
  session: WhipBroadcastSession,
  nextFacingMode: CameraFacingMode
): Promise<MediaStream> {
  const newStream = await captureCameraStream({ facingMode: nextFacingMode });
  const newVideoTrack = newStream.getVideoTracks()[0];

  if (newVideoTrack) {
    const videoSender = session.peerConnection
      .getSenders()
      .find((sender) => sender.track?.kind === 'video');
    if (videoSender) {
      await videoSender.replaceTrack(newVideoTrack);
    }
  }

  // Remplacer aussi l'audio si nécessaire ou conserver les anciennes pistes coupées proprement
  const oldStream = session.stream;
  session.stream = newStream;
  stopMediaStream(oldStream);

  return newStream;
}

/**
 * Démarre la diffusion WebRTC WHIP vers MediaMTX (${VITE_LIVE_WHIP_URL}/${storeSlug}/whip)
 */
export async function startWhipBroadcast(
  options: StartWhipOptions
): Promise<WhipBroadcastSession> {
  const storeSlug = (options.storeSlug || 'live-master').trim();
  const whipEndpoint = buildStoreWhipUrl(storeSlug);
  const hlsPlaybackUrl = buildStoreHlsUrl(storeSlug);

  if (typeof RTCPeerConnection === 'undefined') {
    throw new Error("WebRTC (RTCPeerConnection) n'est pas disponible sur ce navigateur.");
  }

  // 1. Flux média local (réutilisé depuis l'aperçu ou capturé)
  const ownsStream = !options.existingStream;
  const stream = options.existingStream || (await captureCameraStream({
    facingMode: options.facingMode,
    videoDeviceId: options.videoDeviceId,
    audioDeviceId: options.audioDeviceId
  }));

  // 2. Création de la RTCPeerConnection (STUN + TURN 4G CGNAT résolus depuis Northflank si configurés)
  const resolvedIce = options.iceServers || (await resolveWebRtcIceServers().catch(() => getSharedWebRtcIceServers()));
  const pc = new RTCPeerConnection({
    iceServers: resolvedIce,
    bundlePolicy: 'max-bundle'
  });

  if (options.onConnectionStateChange) {
    pc.onconnectionstatechange = () => {
      options.onConnectionStateChange?.(pc.connectionState);
    };
  }

  // 3. Ajout des pistes audio & vidéo en sendonly
  stream.getTracks().forEach((track) => {
    pc.addTransceiver(track, {
      direction: 'sendonly',
      streams: [stream]
    });
  });

  // 4. Création de l'offre SDP et attente ICE gathering (max 1.5s)
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }

    const onIceChange = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', onIceChange);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', onIceChange);

    setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', onIceChange);
      resolve();
    }, 1500);
  });

  const localSdp = pc.localDescription?.sdp || offer.sdp;
  if (!localSdp) {
    pc.close();
    if (ownsStream) stopMediaStream(stream);
    throw new Error("Impossible de générer l'offre SDP WebRTC.");
  }

  // 5. Envoi HTTP POST application/sdp vers l'endpoint WHIP MediaMTX
  let response: Response;
  try {
    response = await fetch(whipEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        'Accept': 'application/sdp'
      },
      body: localSdp
    });
  } catch (netErr: any) {
    pc.close();
    if (ownsStream) stopMediaStream(stream);
    throw new Error(
      `Serveur d'ingestion WHIP inaccessible (${whipEndpoint}). Vérifiez votre connexion internet et l'état du serveur MediaMTX. Détail : ${netErr?.message || 'Erreur réseau'}`
    );
  }

  if (response.status !== 201 && response.status !== 200) {
    const errorText = await response.text().catch(() => '');
    pc.close();
    if (ownsStream) stopMediaStream(stream);
    throw new Error(
      `Le serveur WHIP MediaMTX a refusé la diffusion (HTTP ${response.status})${errorText ? ` : ${errorText.slice(0, 180)}` : '.'}`
    );
  }

  // 6. En-tête Location pour fermeture propre (DELETE)
  let locationUrl: string | undefined =
    response.headers.get('Location') || response.headers.get('location') || undefined;
  if (locationUrl && !locationUrl.startsWith('http')) {
    try {
      const parsedEndpoint = new URL(whipEndpoint);
      locationUrl = `${parsedEndpoint.origin}${locationUrl.startsWith('/') ? '' : '/'}${locationUrl}`;
    } catch (_) {}
  }

  // 7. Application de la réponse SDP distante
  const answerSdp = await response.text();
  try {
    await pc.setRemoteDescription({
      type: 'answer',
      sdp: answerSdp
    });
  } catch (sdpErr: any) {
    pc.close();
    if (ownsStream) stopMediaStream(stream);
    throw new Error(`Réponse SDP invalide reçue de MediaMTX : ${sdpErr?.message || 'Erreur SDP'}`);
  }

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
 * Arrête proprement une session WHIP (DELETE ressource + fermeture RTCPeerConnection + arrêt tracks)
 */
export async function stopWhipBroadcast(
  session: WhipBroadcastSession | null | undefined
): Promise<void> {
  if (!session) return;

  if (session.locationUrl) {
    try {
      await fetch(session.locationUrl, { method: 'DELETE' });
    } catch (_) {}
  }

  try {
    session.peerConnection.onconnectionstatechange = null;
    session.peerConnection.close();
  } catch (_) {}

  stopMediaStream(session.stream);
}
