/**
 * @file liveProductCallService.ts
 * @description Signalisation Temps Réel 100 % Supabase Realtime Broadcast pour
 * l'expérience "Voir le produit en direct avant achat" (Acheteur -> Vendeur).
 * Zéro Firebase, Zéro Daily.co — bascule directe vers la salle WebRTC native Nanasore.
 */

import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const LIVE_PRODUCT_CALL_CHANNEL = 'nanasore_live_product_calls_v1';

export interface LiveProductCallPayload {
  requestId: string;
  roomId: string;
  sellerId: string;
  buyerId: string;
  buyerName?: string;
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  storeName?: string;
  createdAt: number;
}

export interface LiveProductCallSignalEvent {
  requestId: string;
  roomId?: string;
  sellerId?: string;
  sellerName?: string;
  endedBy?: 'buyer' | 'seller';
  reason?: string;
  timestamp: number;
}

function normalizeId(val?: string | null): string {
  return (val || '').trim().toLowerCase().replace(/^store-/, '');
}

/**
 * Vérifie si un appel entrant est destiné au vendeur connecté.
 * Permet un routage strict par boutique tout en restant compatible
 * avec les fiches produits génériques ('merchant-direct' / sans storeId explicite).
 */
export function isCallForMerchant(
  incoming: Pick<LiveProductCallPayload, 'sellerId' | 'storeName'>,
  merchantId?: string,
  merchantStoreName?: string
): boolean {
  const normMerchant = normalizeId(merchantId);
  const normIncoming = normalizeId(incoming.sellerId);

  // SÉCURITÉ ANTI-SONNERIE GLOBALE : ne jamais faire sonner tous les marchands si l'identifiant est générique ou vide
  const isSpecificIncomingId =
    Boolean(normIncoming) &&
    normIncoming !== 'merchant-direct' &&
    normIncoming !== 'boutique' &&
    normIncoming !== 'default';

  if (normMerchant && isSpecificIncomingId && normIncoming === normMerchant) {
    return true;
  }

  const cleanMerchantStore = (merchantStoreName || '').trim().toLowerCase();
  const cleanIncomingStore = (incoming.storeName || '').trim().toLowerCase();
  const genericStoreNames = new Set(['', 'boutique', 'ma boutique', 'mon entreprise', 'boutique nanasore']);

  if (
    !genericStoreNames.has(cleanMerchantStore) &&
    !genericStoreNames.has(cleanIncomingStore) &&
    cleanMerchantStore === cleanIncomingStore
  ) {
    return true;
  }

  return false;
}

/**
 * Journalisation Supabase best-effort dans `wameet_messages` (sans jamais bloquer le temps réel)
 */
export async function logLiveProductCallToSupabase(
  payload: LiveProductCallPayload,
  status: 'ringing' | 'connected' | 'rejected' | 'completed'
): Promise<void> {
  try {
    if (status === 'ringing') {
      await supabase.from('wameet_messages').insert({
        id: payload.requestId,
        chat_id: payload.sellerId || 'boutique',
        type: 'call',
        status: 'ringing',
        sender_id: payload.buyerId,
        sender_name: payload.buyerName || 'Client Boutique',
        text: payload.productName,
        media_url: payload.roomId,
        created_at: new Date(payload.createdAt).toISOString(),
      });
    } else {
      await supabase
        .from('wameet_messages')
        .update({ status })
        .eq('id', payload.requestId);
    }
  } catch {
    // Non-bloquant : le canal Realtime Broadcast assure la signalisation < 100ms
  }
}

export async function updateLiveProductCallStatusInSupabase(
  requestId: string,
  status: 'connected' | 'rejected' | 'completed'
): Promise<void> {
  try {
    await supabase
      .from('wameet_messages')
      .update({ status })
      .eq('id', requestId);
  } catch {
    // Non-bloquant
  }
}

/**
 * Crée un canal Supabase Realtime Broadcast abonné et prêt à émettre/recevoir.
 */
export function createLiveProductCallChannel(
  handlers: {
    onIncomingCall?: (payload: LiveProductCallPayload) => void;
    onCallAccepted?: (event: LiveProductCallSignalEvent) => void;
    onCallRejected?: (event: LiveProductCallSignalEvent) => void;
    onCallEnded?: (event: LiveProductCallSignalEvent) => void;
    onSubscribed?: () => void;
  }
): {
  channel: RealtimeChannel;
  sendIncomingCall: (payload: LiveProductCallPayload) => Promise<void>;
  sendCallAccepted: (event: LiveProductCallSignalEvent) => Promise<void>;
  sendCallRejected: (event: LiveProductCallSignalEvent) => Promise<void>;
  sendCallEnded: (event: LiveProductCallSignalEvent) => Promise<void>;
  cleanup: () => void;
} {
  let isSubscribed = false;
  const pendingQueue: Array<{ event: string; payload: any }> = [];

  const channel = supabase.channel(LIVE_PRODUCT_CALL_CHANNEL, {
    config: {
      broadcast: { self: false, ack: false },
    },
  });

  if (handlers.onIncomingCall) {
    channel.on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
      if (payload?.requestId && payload?.roomId) {
        handlers.onIncomingCall?.(payload as LiveProductCallPayload);
      }
    });
  }

  if (handlers.onCallAccepted) {
    channel.on('broadcast', { event: 'call_accepted' }, ({ payload }) => {
      if (payload?.requestId) {
        handlers.onCallAccepted?.(payload as LiveProductCallSignalEvent);
      }
    });
  }

  if (handlers.onCallRejected) {
    channel.on('broadcast', { event: 'call_rejected' }, ({ payload }) => {
      if (payload?.requestId) {
        handlers.onCallRejected?.(payload as LiveProductCallSignalEvent);
      }
    });
  }

  if (handlers.onCallEnded) {
    channel.on('broadcast', { event: 'call_ended' }, ({ payload }) => {
      if (payload?.requestId) {
        handlers.onCallEnded?.(payload as LiveProductCallSignalEvent);
      }
    });
  }

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      isSubscribed = true;
      handlers.onSubscribed?.();
      while (pendingQueue.length > 0) {
        const item = pendingQueue.shift();
        if (item) {
          channel.send({ type: 'broadcast', event: item.event, payload: item.payload }).catch(() => {});
        }
      }
    }
  });

  const safeSend = async (event: string, payload: any) => {
    if (!isSubscribed) {
      pendingQueue.push({ event, payload });
      return;
    }
    try {
      await channel.send({ type: 'broadcast', event, payload });
    } catch {
      // Ignore transient broadcast send error
    }
  };

  return {
    channel,
    sendIncomingCall: (payload) => safeSend('incoming_call', payload),
    sendCallAccepted: (event) => safeSend('call_accepted', event),
    sendCallRejected: (event) => safeSend('call_rejected', event),
    sendCallEnded: (event) => safeSend('call_ended', event),
    cleanup: () => {
      isSubscribed = false;
      pendingQueue.length = 0;
      supabase.removeChannel(channel);
    },
  };
}
