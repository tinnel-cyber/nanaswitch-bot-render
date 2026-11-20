/**
 * @file liveAuctionService.ts
 * @description Moteur de Vente aux Enchères en Direct 100 % Temps Réel
 * (Supabase Realtime Broadcast + persistance Supabase `live_auctions` & `live_auction_bids`).
 */

import { supabase } from '../lib/supabase';

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
    // Non-bloquant : Broadcast assure le temps réel immédiat
  }
}

export async function persistAuctionBidToSupabase(
  sessionId: string,
  bid: LiveAuctionBid
): Promise<void> {
  try {
    await supabase.from('live_auction_bids').insert({
      auction_id: bid.auctionId,
      session_id: sessionId,
      bidder_id: bid.bidderId,
      bidder_name: bid.bidderName,
      amount: bid.amount,
    });
  } catch {
    // Non-bloquant
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
    const state = payload?.auction ?? null;
    saveLocalLiveAuction(sessionId, state);
    handlers.onAuctionSync?.(state);
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
    broadcastAuction: (auction: LiveAuctionState | null) => {
      saveLocalLiveAuction(sessionId, auction);
      if (auction) persistAuctionToSupabase(auction);
      return send('auction_sync', { auction });
    },
    broadcastBid: (bid: LiveAuctionBid) => {
      persistAuctionBidToSupabase(sessionId, bid);
      return send('auction_bid', { bid });
    },
    cleanup: () => {
      isSubscribed = false;
      queue.length = 0;
      supabase.removeChannel(channel);
    },
  };
}
