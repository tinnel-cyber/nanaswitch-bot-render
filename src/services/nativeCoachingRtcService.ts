/**
 * @file nativeCoachingRtcService.ts
 * @description Moteur WebRTC 1-to-1 natif Nanasore utilisant Supabase Realtime (Broadcast)
 * comme canal de signalisation (ZÉRO Jitsi, ZÉRO Firebase, ZÉRO serveur externe, 100 % marque blanche).
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

export interface CoachingRtcCallbacks {
  onStatusChange?: (status: CoachingRtcStatus) => void;
  onLocalStream?: (stream: MediaStream | null) => void;
  onRemoteStream?: (stream: MediaStream | null) => void;
  onPeerName?: (name: string) => void;
  onError?: (message: string) => void;
}

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
    return 'Connexion HTTPS requise pour activer la caméra et le micro en visio 1-to-1.';
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
  return err?.message || 'Erreur lors de la connexion WebRTC 1-to-1.';
}

export class NativeCoachingRtcSession {
  private roomId: string;
  private peerId: string;
  private displayName: string;
  private isHost: boolean;
  private callbacks: CoachingRtcCallbacks;

  private pc: RTCPeerConnection | null = null;
  private channel: RealtimeChannel | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private facingMode: 'user' | 'environment' = 'user';
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
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
          width: { ideal: 1280 },
          height: { ideal: 720 },
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

    this.createPeerConnection();
    this.connectSignalingChannel();
  }

  private createPeerConnection() {
    if (this.pc) {
      try {
        this.pc.close();
      } catch (_) {}
    }

    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    this.pc = pc;
    this.pendingIceCandidates = [];
    this.remoteStream = new MediaStream();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.ontrack = (event) => {
      if (!this.remoteStream) this.remoteStream = new MediaStream();
      event.streams[0]?.getTracks().forEach((t) => {
        if (!this.remoteStream!.getTracks().some((existing) => existing.id === t.id)) {
          this.remoteStream!.addTrack(t);
        }
      });
      if (event.track && !this.remoteStream.getTracks().some((existing) => existing.id === event.track.id)) {
        this.remoteStream.addTrack(event.track);
      }
      this.callbacks.onRemoteStream?.(this.remoteStream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && this.channel) {
        this.channel.send({
          type: 'broadcast',
          event: 'rtc_signal',
          payload: {
            kind: 'ice',
            from: this.peerId,
            candidate: event.candidate.toJSON(),
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.closed) return;
      switch (pc.connectionState) {
        case 'connecting':
          this.setStatus('connecting');
          break;
        case 'connected':
          this.setStatus('connected');
          break;
        case 'disconnected':
        case 'failed':
          this.setStatus('waiting_peer');
          break;
        case 'closed':
          this.setStatus('disconnected');
          break;
      }
    };
  }

  private connectSignalingChannel() {
    const channelName = `coaching_1to1_${this.roomId}`;
    this.setStatus('waiting_peer');

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });
    this.channel = channel;

    channel
      .on('broadcast', { event: 'rtc_signal' }, async ({ payload }) => {
        if (this.closed || !payload || payload.from === this.peerId) return;

        try {
          if (payload.kind === 'join') {
            if (payload.displayName) this.callbacks.onPeerName?.(String(payload.displayName));
            // L'hôte (ou le peer ayant l'ID le plus petit si même rôle) initie l'offre SDP
            const shouldInitiate = this.isHost || (!payload.isHost && this.peerId < payload.from);
            if (shouldInitiate) {
              await this.sendOffer();
            } else {
              // Répondre présent pour que l'autre pair initie l'offre
              this.channel?.send({
                type: 'broadcast',
                event: 'rtc_signal',
                payload: {
                  kind: 'ready',
                  from: this.peerId,
                  isHost: this.isHost,
                  displayName: this.displayName,
                },
              });
            }
          } else if (payload.kind === 'ready') {
            if (payload.displayName) this.callbacks.onPeerName?.(String(payload.displayName));
            await this.sendOffer();
          } else if (payload.kind === 'offer' && payload.sdp) {
            if (payload.displayName) this.callbacks.onPeerName?.(String(payload.displayName));
            this.setStatus('connecting');
            if (!this.pc || this.pc.signalingState === 'closed') {
              this.createPeerConnection();
            }
            await this.pc!.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            await this.flushPendingIce();
            const answer = await this.pc!.createAnswer();
            await this.pc!.setLocalDescription(answer);
            this.channel?.send({
              type: 'broadcast',
              event: 'rtc_signal',
              payload: {
                kind: 'answer',
                from: this.peerId,
                displayName: this.displayName,
                sdp: answer,
              },
            });
          } else if (payload.kind === 'answer' && payload.sdp && this.pc) {
            if (payload.displayName) this.callbacks.onPeerName?.(String(payload.displayName));
            if (this.pc.signalingState === 'have-local-offer') {
              await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              await this.flushPendingIce();
            }
          } else if (payload.kind === 'ice' && payload.candidate && this.pc) {
            if (this.pc.remoteDescription) {
              await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } else {
              this.pendingIceCandidates.push(payload.candidate);
            }
          } else if (payload.kind === 'hangup') {
            this.callbacks.onRemoteStream?.(null);
            this.createPeerConnection();
            this.setStatus('waiting_peer');
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

  private async sendOffer() {
    if (!this.pc || this.pc.signalingState === 'closed') {
      this.createPeerConnection();
    }
    this.setStatus('connecting');
    const offer = await this.pc!.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.pc!.setLocalDescription(offer);
    this.channel?.send({
      type: 'broadcast',
      event: 'rtc_signal',
      payload: {
        kind: 'offer',
        from: this.peerId,
        displayName: this.displayName,
        sdp: offer,
      },
    });
  }

  private async flushPendingIce() {
    if (!this.pc || !this.pc.remoteDescription) return;
    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      if (candidate) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
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

  async switchCamera(): Promise<'user' | 'environment'> {
    const nextMode: 'user' | 'environment' = this.facingMode === 'user' ? 'environment' : 'user';
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: nextMode, width: { ideal: 1280 }, height: { ideal: 720 } },
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

    const sender = this.pc?.getSenders().find((s) => s.track?.kind === 'video');
    if (sender) {
      await sender.replaceTrack(newVideoTrack);
    }

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

      const sender = this.pc?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(screenTrack);
      }

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
      const sender = this.pc?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && camTrack) {
        await sender.replaceTrack(camTrack);
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
        payload: { kind: 'hangup', from: this.peerId },
      });
    } catch (_) {}

    if (this.channel) {
      try {
        supabase.removeChannel(this.channel);
      } catch (_) {}
      this.channel = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch (_) {}
      this.pc = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    this.remoteStream = null;
    this.callbacks.onLocalStream?.(null);
    this.callbacks.onRemoteStream?.(null);
    this.callbacks.onStatusChange?.('disconnected');
  }
}
