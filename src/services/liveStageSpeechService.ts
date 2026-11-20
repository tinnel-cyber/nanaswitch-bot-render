/**
 * @file liveStageSpeechService.ts
 * @description Signalisation Temps Réel Supabase Broadcast pour la "Prise de Parole"
 * (Audio / Visio WebRTC native) entre Formateur et Étudiant dans la salle Live.
 */

import { supabase } from '../lib/supabase';

export interface StageSpeechInvite {
  inviteId: string;
  sessionId: string;
  roomId: string;
  targetUserId: string;
  targetName: string;
  hostName: string;
  mode: 'audio' | 'video';
  createdAt: number;
}

export interface StageSpeechResponse {
  inviteId: string;
  roomId: string;
  accepted: boolean;
  participantName: string;
  timestamp: number;
}

export function createLiveStageSpeechChannel(
  sessionId: string,
  handlers: {
    onInvite?: (invite: StageSpeechInvite) => void;
    onResponse?: (res: StageSpeechResponse) => void;
    onStageEnded?: (payload: { roomId: string; endedBy: string }) => void;
  }
) {
  let isSubscribed = false;
  const queue: Array<{ event: string; payload: any }> = [];

  const channel = supabase.channel(`live_stage_speech_${sessionId}`, {
    config: { broadcast: { self: false, ack: false } },
  });

  if (handlers.onInvite) {
    channel.on('broadcast', { event: 'stage_invite' }, ({ payload }) => {
      if (payload?.roomId) handlers.onInvite?.(payload as StageSpeechInvite);
    });
  }
  if (handlers.onResponse) {
    channel.on('broadcast', { event: 'stage_response' }, ({ payload }) => {
      if (payload?.roomId) handlers.onResponse?.(payload as StageSpeechResponse);
    });
  }
  if (handlers.onStageEnded) {
    channel.on('broadcast', { event: 'stage_ended' }, ({ payload }) => {
      if (payload?.roomId) handlers.onStageEnded?.(payload);
    });
  }

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      isSubscribed = true;
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) {
          channel.send({ type: 'broadcast', event: item.event, payload: item.payload }).catch(() => {});
        }
      }
    }
  });

  const send = async (event: string, payload: any) => {
    if (!isSubscribed) {
      queue.push({ event, payload });
      return;
    }
    try {
      await channel.send({ type: 'broadcast', event, payload });
    } catch {}
  };

  return {
    sendInvite: (invite: StageSpeechInvite) => send('stage_invite', invite),
    sendResponse: (res: StageSpeechResponse) => send('stage_response', res),
    sendStageEnded: (roomId: string, endedBy: string) =>
      send('stage_ended', { roomId, endedBy, timestamp: Date.now() }),
    cleanup: () => {
      isSubscribed = false;
      queue.length = 0;
      supabase.removeChannel(channel);
    },
  };
}
