/**
 * SERVICE D'APPEL VOCAL & VIDÉO DIRECT (100% WEBRTC P2P + FIRESTORE SIGNALING)
 * ------------------------------------------------------------------------------
 * Architecture Zéro-Stockage & Zéro-Bande-Passante Serveur :
 * 1. Capture locale : navigator.mediaDevices.getUserMedia() (Audio / Vidéo 720p).
 * 2. Serveur de signalisation éphémère Firestore :
 *    - /calls/{callId} (Offre & Réponse SDP)
 *    - /calls/{callId}/callerCandidates & calleeCandidates (Candidats ICE)
 * 3. Serveurs STUN gratuits Google : stun:stun.l.google.com:19302
 * 4. Nettoyage strict : dès que l'appel prend fin ou est rejeté, le document
 *    et ses sous-collections de signalisation sont intégralement purgés.
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { supabase } from '../lib/supabase';
import { normalizeChatUserHandle } from './wameetChatService';

export type Unsubscribe = () => void;

export type WameetCallType = 'audio' | 'video';
export type WameetCallStatus = 'ringing' | 'active' | 'ended' | 'rejected' | 'busy';

export interface WameetCallParticipant {
  handle: string;
  name: string;
  avatar: string;
}

export interface WameetCallDocument {
  id: string;
  callId: string;
  type: WameetCallType;
  caller: WameetCallParticipant;
  callee: WameetCallParticipant;
  callerHandle: string;
  calleeHandle: string;
  status: WameetCallStatus;
  offer?: {
    type: RTCSdpType;
    sdp: string;
  };
  answer?: {
    type: RTCSdpType;
    sdp: string;
  };
  createdAt?: any;
}

/**
 * Configuration WebRTC avec serveurs STUN publics et gratuits de Google
 */
export const WAMEET_RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302'
      ]
    }
  ],
  iceCandidatePoolSize: 10
};

/**
 * Capture du flux média local (Microphone et Caméra)
 */
export async function getLocalMediaStream(
  type: WameetCallType,
  facingMode: 'user' | 'environment' = 'user'
): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video:
      type === 'video'
        ? {
            facingMode,
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 }
          }
        : false
  };

  return await navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * Basculement Caméra Frontale / Arrière (Front / Back)
 */
export async function switchCameraTrack(
  currentStream: MediaStream,
  peerConnection: RTCPeerConnection | null,
  newFacingMode: 'user' | 'environment'
): Promise<{ facingMode: 'user' | 'environment' }> {
  // Stopper l'ancienne piste vidéo
  currentStream.getVideoTracks().forEach(t => t.stop());

  const newVideoStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: newFacingMode,
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 }
    }
  });

  const newVideoTrack = newVideoStream.getVideoTracks()[0];
  if (!newVideoTrack) {
    throw new Error('Aucune caméra détectée.');
  }

  // Remplacer la piste vidéo dans le flux local
  const oldTracks = currentStream.getVideoTracks();
  oldTracks.forEach(t => currentStream.removeTrack(t));
  currentStream.addTrack(newVideoTrack);

  // Mettre à jour le transmetteur WebRTC sans couper l'appel
  if (peerConnection) {
    const senders = peerConnection.getSenders();
    const videoSender = senders.find(s => s.track && s.track.kind === 'video');
    if (videoSender) {
      await videoSender.replaceTrack(newVideoTrack);
    }
  }

  return { facingMode: newFacingMode };
}

/**
 * Nettoyage impitoyable de la signalisation Firestore (Zéro Stockage résiduel)
 * Purge les sous-collections de candidats et le document d'appel.
 */
export async function cleanupCallData(callId: string): Promise<void> {
  if (!callId) return;

  try {
    const callDocRef = doc(db, 'calls', callId);

    // 1. Suppression des candidats callerCandidates
    const callerCandidatesCol = collection(db, 'calls', callId, 'callerCandidates');
    const callerDocs = await getDocs(callerCandidatesCol);
    const deleteCallerPromises = callerDocs.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deleteCallerPromises);

    // 2. Suppression des candidats calleeCandidates
    const calleeCandidatesCol = collection(db, 'calls', callId, 'calleeCandidates');
    const calleeDocs = await getDocs(calleeCandidatesCol);
    const deleteCalleePromises = calleeDocs.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deleteCalleePromises);

    // 3. Suppression du document racine de l'appel
    await deleteDoc(callDocRef);
  } catch (err) {
    console.warn('[WAMEET WEBRTC] Nettoyage signalisation storage ignoré ou déjà purgé :', err);
  }
}

export interface WameetActiveCallSession {
  callId: string;
  peerConnection: RTCPeerConnection;
  localStream: MediaStream;
  hangUp: () => Promise<void>;
  unsubscribes: Unsubscribe[];
}

/**
 * 1. INITIALISATION D'UN APPEL PAR L'APPELANT (CALLER)
 * - Crée RTCPeerConnection
 * - Crée l'offre SDP et l'enregistre dans /calls/{callId}
 * - Écoute la réponse de l'appelé et les candidats ICE
 */
export async function startOutgoingCall(params: {
  callId: string;
  type: WameetCallType;
  caller: WameetCallParticipant;
  callee: WameetCallParticipant;
  localStream: MediaStream;
  onRemoteStream: (stream: MediaStream) => void;
  onCallAnswered: () => void;
  onCallEnded: () => void;
}): Promise<WameetActiveCallSession> {
  const {
    callId,
    type,
    caller,
    callee,
    localStream,
    onRemoteStream,
    onCallAnswered,
    onCallEnded
  } = params;

  const unsubscribes: Unsubscribe[] = [];
  const peerConnection = new RTCPeerConnection(WAMEET_RTC_CONFIGURATION);
  const callDocRef = doc(db, 'calls', callId);

  // 1. Ajouter les pistes audio et vidéo locales
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // 2. Réception du flux distant de l'appelé
  peerConnection.ontrack = event => {
    if (event.streams && event.streams[0]) {
      onRemoteStream(event.streams[0]);
    }
  };

  // 3. Gestion de l'état de la connexion WebRTC
  peerConnection.onconnectionstatechange = () => {
    if (
      peerConnection.connectionState === 'disconnected' ||
      peerConnection.connectionState === 'failed' ||
      peerConnection.connectionState === 'closed'
    ) {
      onCallEnded();
    }
  };

  // 4. Générer l'offre SDP
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // 5. Publier l'offre SDP dans Firestore
  await setDoc(callDocRef, {
    id: callId,
    callId,
    type,
    caller,
    callee,
    callerHandle: normalizeChatUserHandle(caller.handle),
    calleeHandle: normalizeChatUserHandle(callee.handle),
    status: 'ringing',
    offer: {
      type: offer.type,
      sdp: offer.sdp
    },
    createdAt: serverTimestamp()
  });

  // 6. Écouter et envoyer nos candidats ICE locaux (callerCandidates)
  const callerCandidatesCol = collection(db, 'calls', callId, 'callerCandidates');
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      setDoc(doc(callerCandidatesCol), event.candidate.toJSON()).catch(err => {
        console.warn('[WAMEET WEBRTC] Erreur écriture candidat appelant :', err);
      });
    }
  };

  // 7. Écouter la réponse SDP et candidats ICE via canal Supabase Realtime Signaling
  const channelName = `call_signaling_${callId}_${Math.random().toString(36).substring(7)}`;
  const signalingChannel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'answer' }, async (payload) => {
      if (payload.payload?.answer && !peerConnection.currentRemoteDescription) {
        const rtcSessionDescription = new RTCSessionDescription(payload.payload.answer);
        await peerConnection.setRemoteDescription(rtcSessionDescription);
        onCallAnswered();
      }
    })
    .on('broadcast', { event: 'callee-ice' }, async (payload) => {
      if (payload.payload?.candidate) {
        try {
          const candidate = new RTCIceCandidate(payload.payload.candidate);
          await peerConnection.addIceCandidate(candidate);
        } catch (iceErr) {
          console.warn('[WAMEET WEBRTC] Erreur ajout candidat ICE reçu :', iceErr);
        }
      }
    })
    .on('broadcast', { event: 'call-ended' }, () => {
      onCallEnded();
    })
    .subscribe();

  unsubscribes.push(() => {
    supabase.removeChannel(signalingChannel);
  });

  const hangUp = async () => {
    unsubscribes.forEach(unsub => unsub());
    peerConnection.close();
    localStream.getTracks().forEach(t => t.stop());
    await cleanupCallData(callId);
  };

  return {
    callId,
    peerConnection,
    localStream,
    hangUp,
    unsubscribes
  };
}

/**
 * 2. RÉPONSE À UN APPEL PAR L'APPELÉ (CALLEE)
 * - Récupère l'offre SDP depuis /calls/{callId}
 * - Crée l'answer SDP et la met à jour dans Firestore
 * - Échange les candidats ICE avec l'appelant
 */
export async function acceptIncomingCall(params: {
  callId: string;
  localStream: MediaStream;
  onRemoteStream: (stream: MediaStream) => void;
  onCallEnded: () => void;
}): Promise<WameetActiveCallSession> {
  const { callId, localStream, onRemoteStream, onCallEnded } = params;
  const unsubscribes: Unsubscribe[] = [];
  const peerConnection = new RTCPeerConnection(WAMEET_RTC_CONFIGURATION);
  const callDocRef = doc(db, 'calls', callId);

  // 1. Ajouter nos pistes audio et vidéo locales
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // 2. Écouter le flux distant
  peerConnection.ontrack = event => {
    if (event.streams && event.streams[0]) {
      onRemoteStream(event.streams[0]);
    }
  };

  peerConnection.onconnectionstatechange = () => {
    if (
      peerConnection.connectionState === 'disconnected' ||
      peerConnection.connectionState === 'failed' ||
      peerConnection.connectionState === 'closed'
    ) {
      onCallEnded();
    }
  };

  // 3. Récupérer l'offre SDP
  const callDocSnap = await getDoc(callDocRef);
  if (!callDocSnap.exists()) {
    throw new Error("L'appel n'existe plus ou a été annulé.");
  }
  const callData = callDocSnap.data() as WameetCallDocument;
  if (!callData.offer) {
    throw new Error("L'offre SDP de l'appelant est introuvable.");
  }

  // 4. Définir l'offre comme RemoteDescription
  await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));

  // 5. Créer et enregistrer la réponse SDP (Answer)
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  await updateDoc(callDocRef, {
    status: 'active',
    answer: {
      type: answer.type,
      sdp: answer.sdp
    }
  });

  // 6. Écouter nos candidats locaux et les insérer dans calleeCandidates
  const calleeCandidatesCol = collection(db, 'calls', callId, 'calleeCandidates');
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      setDoc(doc(calleeCandidatesCol), event.candidate.toJSON()).catch(err => {
        console.warn('[WAMEET WEBRTC] Erreur écriture candidat appelé :', err);
      });
    }
  };

  // 7. Écouter les candidats et statuts via canal Supabase Realtime Signaling
  const calleeChannelName = `call_signaling_${callId}_${Math.random().toString(36).substring(7)}`;
  const calleeSignalingChannel = supabase
    .channel(calleeChannelName)
    .on('broadcast', { event: 'caller-ice' }, async (payload) => {
      if (payload.payload?.candidate) {
        try {
          const candidate = new RTCIceCandidate(payload.payload.candidate);
          await peerConnection.addIceCandidate(candidate);
        } catch (iceErr) {
          console.warn('[WAMEET WEBRTC] Erreur ajout candidat ICE appelant :', iceErr);
        }
      }
    })
    .on('broadcast', { event: 'call-ended' }, () => {
      onCallEnded();
    })
    .subscribe();

  unsubscribes.push(() => {
    supabase.removeChannel(calleeSignalingChannel);
  });

  const hangUp = async () => {
    unsubscribes.forEach(unsub => unsub());
    peerConnection.close();
    localStream.getTracks().forEach(t => t.stop());
    await cleanupCallData(callId);
  };

  return {
    callId,
    peerConnection,
    localStream,
    hangUp,
    unsubscribes
  };
}

/**
 * 3. REJET D'UN APPEL ENTRANT (CALLEE DECLINE)
 */
export async function declineIncomingCall(callId: string): Promise<void> {
  if (!callId) return;
  try {
    const callDocRef = doc(db, 'calls', callId);
    await updateDoc(callDocRef, { status: 'rejected' });
    // Délai de 800ms pour notifier l'appelant avant la purge définitive
    setTimeout(() => {
      cleanupCallData(callId).catch(() => {});
    }, 800);
  } catch (err) {
    cleanupCallData(callId).catch(() => {});
  }
}

/**
 * 4. ÉCOUTEUR EN TEMPS RÉEL DES APPELS ENTRANTS POUR L'UTILISATEUR
 */
export function subscribeToIncomingCalls(
  userHandle: string,
  onIncomingCall: (call: WameetCallDocument | null) => void
): Unsubscribe {
  if (!userHandle) return () => {};
  const normHandle = normalizeChatUserHandle(userHandle);

  const channelName = `incoming_calls_${normHandle}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'incoming-call' }, (payload) => {
      if (payload.payload?.call) {
        onIncomingCall(payload.payload.call as WameetCallDocument);
      } else {
        onIncomingCall(null);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Synthétiseur de Sonnerie Téléphonique Léger (Web Audio API)
 * Zéro fichier MP3 externe, fonctionne instantanément sur tous navigateurs.
 */
export class WameetRingtonePlayer {
  private audioCtx: AudioContext | null = null;
  private intervalId: number | null = null;
  private isPlaying = false;

  playRingtone() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      this.audioCtx = new AudioCtxClass();

      const playTone = () => {
        if (!this.audioCtx || this.audioCtx.state === 'closed') return;
        const now = this.audioCtx.currentTime;

        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now); // La 440 Hz
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now); // Bip combiné double tonalité

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gainNode.gain.setValueAtTime(0.2, now + 1.2);
        gainNode.gain.linearRampToValueAtTime(0, now + 1.3);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.3);
        osc2.stop(now + 1.3);
      };

      playTone();
      this.intervalId = window.setInterval(playTone, 3200);
    } catch (e) {
      console.info('[WAMEET AUDIO] Synthétiseur sonnerie non disponible');
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}
