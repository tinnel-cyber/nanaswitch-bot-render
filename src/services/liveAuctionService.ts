/**
 * @file liveAuctionService.ts
 * @description Moteur de Vente aux Enchères en Direct 100 % Temps Réel
 * (Supabase Realtime Broadcast + persistance Supabase `live_auctions` & `live_auction_bids`).
 */

import { supabase } from '../lib/supabase';
import { fetchLiveApiWithFailover } from '../config/liveStreamConfig';

export interface LiveAuctionBid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  createdAt: number;
}

export interface LiveAuctionState {
  id: string;
  sessionId: string;
  productId?: string;
  productName: string;
  productImage?: string;
  startingPrice: number;
  currentPrice: number;
  minStep: number;
  highestBidderId?: string;
  highestBidderName?: string;
  bidsCount: number;
  recentBids: LiveAuctionBid[];
  status: 'active' | 'ended';
  endsAt: number;
  createdAt: number;
}

const AUCTION_STORAGE_PREFIX = 'nana_live_auction_';

export function getSavedLiveAuction(sessionId: string): LiveAuctionState | null {
  if (typeof window === 'undefined' || !sessionId) return null;
  try {
    const raw = localStorage.getItem(`${AUCTION_STORAGE_PREFIX}${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalLiveAuction(sessionId: string, auction: LiveAuctionState | null): void {
  if (typeof window === 'undefined' || !sessionId) return;
  try {
    if (!auction) {
      localStorage.removeItem(`${AUCTION_STORAGE_PREFIX}${sessionId}`);
    } else {
      localStorage.setItem(`${AUCTION_STORAGE_PREFIX}${sessionId}`, JSON.stringify(auction));
    }
  } catch {}
}

export async function persistAuctionToSupabase(auction: LiveAuctionState): Promise<void> {
  try {
    await supabase.from('live_auctions').upsert({
      id: auction.id,
      session_id: auction.sessionId,
      product_id: auction.productId || null,
      product_name: auction.productName,
      product_image: auction.productImage || null,
      starting_price: auction.startingPrice,
      current_price: auction.currentPrice,
      min_step: auction.minStep,
      highest_bidder_id: auction.highestBidderId || null,
      highest_bidder_name: auction.highestBidderName || null,
      bids_count: auction.bidsCount,
      status: auction.status,
      ends_at: new Date(auction.endsAt).toISOString(),
    });
  } catch {
    // Non-bloquant : réservé à l'hôte authentifié
  }
}

export async function persistAuctionBidToSupabase(
  sessionId: string,
  bid: LiveAuctionBid
): Promise<boolean> {
  try {
    const res = await fetchLiveApiWithFailover(
      '/api/lives/auctions/bid',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          auctionId: bid.auctionId,
          bidderId: bid.bidderId,
          bidderName: bid.bidderName,
          amount: bid.amount,
        }),
      },
      { attachAuth: false }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export function createLiveAuctionChannel(
  sessionId: string,
  handlers: {
    onAuctionSync?: (auction: LiveAuctionState | null) => void;
    onBidPlaced?: (bid: LiveAuctionBid) => void;
  }
) {
  let isSubscribed = false;
  const queue: Array<{ event: string; payload: any }> = [];

  const channel = supabase.channel(`live_auction_${sessionId}`, {
    config: { broadcast: { self: false, ack: false } },
  });

  channel.on('broadcast', { event: 'auction_sync' }, ({ payload }) => {
    const incoming: LiveAuctionState | null = payload?.auction ?? null;
    const prev = getSavedLiveAuction(sessionId);

    // SÉCURITÉ ANTI-MANIPULATION : un message broadcast ne peut pas abaisser le prix courant d'une même enchère active
    if (
      prev &&
      incoming &&
      prev.id === incoming.id &&
      incoming.status === 'active' &&
      incoming.currentPrice < prev.currentPrice
    ) {
      return;
    }

    saveLocalLiveAuction(sessionId, incoming);
    handlers.onAuctionSync?.(incoming);
  });

  channel.on('broadcast', { event: 'auction_bid' }, ({ payload }) => {
    if (payload?.bid) {
      handlers.onBidPlaced?.(payload.bid as LiveAuctionBid);
    }
  });

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
    broadcastAuction: (auction: LiveAuctionState | null, persistDb: boolean = true) => {
      saveLocalLiveAuction(sessionId, auction);
      if (auction && persistDb) persistAuctionToSupabase(auction);
      return send('auction_sync', { auction });
    },
    broadcastBid: async (bid: LiveAuctionBid) => {
      await persistAuctionBidToSupabase(sessionId, bid);
      return send('auction_bid', { bid });
    },
    cleanup: () => {
      isSubscribed = false;
      queue.length = 0;
      supabase.removeChannel(channel);
    },
  };
}
