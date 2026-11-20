/**
 * @file nativeCoachingRtcService.ts
 * @description Moteur WebRTC Mesh multi-participants (2 à 6 personnes) natif Nanasore utilisant
 * Supabase Realtime (Broadcast) comme signalisation (ZÉRO Jitsi, ZÉRO Firebase, 100 % marque blanche).
 */

import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type CoachingRtcStatus =
  | 'idle'
  | 'acquiring_media'
  | 'waiting_peer'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface RemotePeerInfo {
  peerId: string;
  displayName: string;
  stream: MediaStream;
  connectionState: RTCPeerConnectionState;
}

export interface CoachingRtcCallbacks {
  onStatusChange?: (status: CoachingRtcStatus) => void;
  onLocalStream?: (stream: MediaStream | null) => void;
  onPeersChange?: (peers: RemotePeerInfo[]) => void;
  onError?: (message: string) => void;
}

const MAX_REMOTE_PEERS = 5; // Jusqu'à 6 participants au total (soi + 5 distants)

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];

  const turnUrl =
    typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_TURN_URL : undefined;
  const turnUser =
    typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_TURN_USERNAME : undefined;
  const turnCred =
    typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_TURN_CREDENTIAL : undefined;

  if (turnUrl && String(turnUrl).trim()) {
    servers.push({
      urls: String(turnUrl).trim(),
      username: turnUser ? String(turnUser).trim() : undefined,
      credential: turnCred ? String(turnCred).trim() : undefined,
    });
  }

  return servers;
}

export function formatRtcError(err: any): string {
  if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
    return 'Connexion HTTPS requise pour activer la caméra et le micro en visio.';
  }
  const name = err?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Accès caméra/micro refusé. Autorisez la caméra et le micro dans votre navigateur puis réessayez.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Aucune caméra ou aucun microphone détecté sur cet appareil.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'La caméra ou le micro est déjà utilisé par une autre application.';
  }
  return err?.message || 'Erreur lors de la connexion WebRTC.';
}

interface InternalPeerEntry {
  peerId: string;
  displayName: string;
  pc: RTCPeerConnection;
  stream: MediaStream;
  pendingIce: RTCIceCandidateInit[];
}

export class NativeCoachingRtcSession {
  private roomId: string;
  private peerId: string;
  private displayName: string;
  private isHost: boolean;
  private callbacks: CoachingRtcCallbacks;

  private peers = new Map<string, InternalPeerEntry>();
  private channel: RealtimeChannel | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private facingMode: 'user' | 'environment' = 'user';
  private closed = false;

  constructor(options: {
    roomId: string;
    displayName: string;
    isHost: boolean;
    callbacks?: CoachingRtcCallbacks;
  }) {
    this.roomId = String(options.roomId || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
    this.peerId = `peer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    this.displayName = options.displayName || (options.isHost ? 'Coach' : 'Participant');
    this.isHost = options.isHost;
    this.callbacks = options.callbacks || {};
  }

  private setStatus(status: CoachingRtcStatus) {
    if (!this.closed) {
      this.callbacks.onStatusChange?.(status);
    }
  }

  private emitPeers() {
    if (this.closed) return;
    const list: RemotePeerInfo[] = Array.from(this.peers.values()).map((entry) => ({
      peerId: entry.peerId,
      displayName: entry.displayName,
      stream: entry.stream,
      connectionState: entry.pc.connectionState,
    }));
    this.callbacks.onPeersChange?.(list);

    const anyConnected = list.some((p) => p.connectionState === 'connected');
    const anyConnecting = list.some((p) => p.connectionState === 'connecting' || p.connectionState === 'new');
    if (anyConnected) this.setStatus('connected');
    else if (anyConnecting) this.setStatus('connecting');
    else this.setStatus('waiting_peer');
  }

  async start(): Promise<void> {
    this.closed = false;
    this.setStatus('acquiring_media');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const msg = formatRtcError(new Error('getUserMedia indisponible'));
      this.callbacks.onError?.(msg);
      this.setStatus('error');
      return;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.facingMode,
          width: { ideal: 960 },
          height: { ideal: 540 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.callbacks.onLocalStream?.(this.localStream);
    } catch (err) {
      const msg = formatRtcError(err);
      this.callbacks.onError?.(msg);
      this.setStatus('error');
      return;
    }

    this.connectSignalingChannel();
  }

  private getOrCreatePeer(remotePeerId: string, remoteDisplayName: string): InternalPeerEntry | null {
    const existing = this.peers.get(remotePeerId);
    if (existing) {
      if (remoteDisplayName) existing.displayName = remoteDisplayName;
      return existing;
    }

    if (this.peers.size >= MAX_REMOTE_PEERS) {
      return null;
    }

    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    const remoteStream = new MediaStream();
    const entry: InternalPeerEntry = {
      peerId: remotePeerId,
      displayName: remoteDisplayName || 'Participant',
      pc,
      stream: remoteStream,
      pendingIce: [],
    };
    this.peers.set(remotePeerId, entry);

    const activeVideoTrack = this.screenStream?.getVideoTracks()[0] || this.localStream?.getVideoTracks()[0];
    const activeAudioTrack = this.localStream?.getAudioTracks()[0];

    if (activeVideoTrack && this.localStream) {
      pc.addTrack(activeVideoTrack, this.localStream);
    }
    if (activeAudioTrack && this.localStream) {
      pc.addTrack(activeAudioTrack, this.localStream);
    }

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((t) => {
        if (!entry.stream.getTracks().some((e) => e.id === t.id)) {
          entry.stream.addTrack(t);
        }
      });
      if (event.track && !entry.stream.getTracks().some((e) => e.id === event.track.id)) {
        entry.stream.addTrack(event.track);
      }
      this.emitPeers();
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && this.channel) {
        this.channel.send({
          type: 'broadcast',
          event: 'rtc_signal',
          payload: {
            kind: 'ice',
            from: this.peerId,
            to: remotePeerId,
            candidate: event.candidate.toJSON(),
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.closed) return;
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(remotePeerId);
      } else {
        this.emitPeers();
      }
    };

    this.emitPeers();
    return entry;
  }

  private removePeer(remotePeerId: string) {
    const entry = this.peers.get(remotePeerId);
    if (!entry) return;
    try {
      entry.pc.close();
    } catch (_) {}
    this.peers.delete(remotePeerId);
    this.emitPeers();
  }

  private connectSignalingChannel() {
    const channelName = `coaching_group_${this.roomId}`;
    this.setStatus('waiting_peer');

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });
    this.channel = channel;

    channel
      .on('broadcast', { event: 'rtc_signal' }, async ({ payload }) => {
        if (this.closed || !payload || payload.from === this.peerId) return;
        if (payload.to && payload.to !== this.peerId) return;

        const remoteId = String(payload.from);
        const remoteName = String(payload.displayName || 'Participant');

        try {
          if (payload.kind === 'join') {
            // Chaque participant déjà présent crée une offre vers le nouvel arrivant
            const entry = this.getOrCreatePeer(remoteId, remoteName);
            if (!entry) return;
            const offer = await entry.pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            await entry.pc.setLocalDescription(offer);
            this.channel?.send({
              type: 'broadcast',
              event: 'rtc_signal',
              payload: {
                kind: 'offer',
                from: this.peerId,
                to: remoteId,
                displayName: this.displayName,
                sdp: offer,
              },
            });
          } else if (payload.kind === 'offer' && payload.sdp) {
            const entry = this.getOrCreatePeer(remoteId, remoteName);
            if (!entry) return;
            await entry.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            await this.flushPendingIce(entry);
            const answer = await entry.pc.createAnswer();
            await entry.pc.setLocalDescription(answer);
            this.channel?.send({
              type: 'broadcast',
              event: 'rtc_signal',
              payload: {
                kind: 'answer',
                from: this.peerId,
                to: remoteId,
                displayName: this.displayName,
                sdp: answer,
              },
            });
          } else if (payload.kind === 'answer' && payload.sdp) {
            const entry = this.peers.get(remoteId);
            if (entry && entry.pc.signalingState === 'have-local-offer') {
              if (remoteName) entry.displayName = remoteName;
              await entry.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              await this.flushPendingIce(entry);
              this.emitPeers();
            }
          } else if (payload.kind === 'ice' && payload.candidate) {
            const entry = this.peers.get(remoteId);
            if (!entry) return;
            if (entry.pc.remoteDescription) {
              await entry.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } else {
              entry.pendingIce.push(payload.candidate);
            }
          } else if (payload.kind === 'leave' || payload.kind === 'hangup') {
            this.removePeer(remoteId);
          }
        } catch (err) {
          console.warn('[NativeCoachingRTC] Erreur signalisation:', err);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !this.closed) {
          channel.send({
            type: 'broadcast',
            event: 'rtc_signal',
            payload: {
              kind: 'join',
              from: this.peerId,
              isHost: this.isHost,
              displayName: this.displayName,
            },
          });
        }
      });
  }

  private async flushPendingIce(entry: InternalPeerEntry) {
    if (!entry.pc.remoteDescription) return;
    while (entry.pendingIce.length > 0) {
      const candidate = entry.pendingIce.shift();
      if (candidate) {
        try {
          await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (_) {}
      }
    }
  }

  toggleAudio(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const track = this.localStream.getAudioTracks()[0];
    if (!track) return false;
    track.enabled = enabled !== undefined ? enabled : !track.enabled;
    return track.enabled;
  }

  toggleVideo(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const track = this.localStream.getVideoTracks()[0];
    if (!track) return false;
    track.enabled = enabled !== undefined ? enabled : !track.enabled;
    return track.enabled;
  }

  private async replaceVideoTrackOnAllPeers(newTrack: MediaStreamTrack) {
    const tasks: Promise<void>[] = [];
    for (const entry of this.peers.values()) {
      const sender = entry.pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        tasks.push(sender.replaceTrack(newTrack).catch(() => {}));
      }
    }
    await Promise.all(tasks);
  }

  async switchCamera(): Promise<'user' | 'environment'> {
    const nextMode: 'user' | 'environment' = this.facingMode === 'user' ? 'environment' : 'user';
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: nextMode, width: { ideal: 960 }, height: { ideal: 540 } },
      audio: false,
    });
    const newVideoTrack = newStream.getVideoTracks()[0];
    if (!newVideoTrack) return this.facingMode;

    const oldVideoTrack = this.localStream?.getVideoTracks()[0];
    if (this.localStream && oldVideoTrack) {
      this.localStream.removeTrack(oldVideoTrack);
      oldVideoTrack.stop();
      this.localStream.addTrack(newVideoTrack);
    }

    await this.replaceVideoTrackOnAllPeers(newVideoTrack);
    this.facingMode = nextMode;
    this.callbacks.onLocalStream?.(this.localStream);
    return nextMode;
  }

  async toggleScreenShare(enable: boolean): Promise<boolean> {
    if (enable) {
      if (!navigator.mediaDevices?.getDisplayMedia) return false;
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = this.screenStream.getVideoTracks()[0];
      if (!screenTrack) return false;

      await this.replaceVideoTrackOnAllPeers(screenTrack);

      screenTrack.onended = () => {
        this.toggleScreenShare(false).catch(() => {});
      };
      return true;
    } else {
      if (this.screenStream) {
        this.screenStream.getTracks().forEach((t) => t.stop());
        this.screenStream = null;
      }
      const camTrack = this.localStream?.getVideoTracks()[0];
      if (camTrack) {
        await this.replaceVideoTrackOnAllPeers(camTrack);
      }
      return false;
    }
  }

  hangup() {
    this.closed = true;
    try {
      this.channel?.send({
        type: 'broadcast',
        event: 'rtc_signal',
        payload: { kind: 'leave', from: this.peerId },
      });
    } catch (_) {}

    if (this.channel) {
      try {
        supabase.removeChannel(this.channel);
      } catch (_) {}
      this.channel = null;
    }

    for (const entry of this.peers.values()) {
      try {
        entry.pc.close();
      } catch (_) {}
    }
    this.peers.clear();

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    this.callbacks.onLocalStream?.(null);
    this.callbacks.onPeersChange?.([]);
    this.callbacks.onStatusChange?.('disconnected');
  }
}
