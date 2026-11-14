// ============================================================================
// SERVICE FRONTEND WAMEET : SALONS DE LIVE SHOPPING ÉPHÉMÈRES & PUSH PRODUIT
// ============================================================================

import { supabase } from '../lib/supabase';
import { LiveProductItem } from '../components/wameet/LiveProductCard';

export interface FlashLiveRoomData {
  roomId: string;
  title: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar?: string;
  location: string;
  durationMinutes: number;
  youtubeUrl?: string;
  createdAtMs?: number;
  expiresAt: string; // Date ISO
  expiresAtMs: number;
  status: 'active' | 'closed';
  isExpired?: boolean;
  pushedProduct: LiveProductItem | null;
  pushedAt?: any;
  viewersCount?: number;
  farewellMessage?: string;
}

export interface InitFlashRoomParams {
  roomId: string;
  title?: string;
  sellerId?: string;
  sellerName?: string;
  sellerAvatar?: string;
  location?: string;
  durationMinutes?: number;
  youtubeUrl?: string;
  initialProduct?: LiveProductItem | null;
}

const PAYMENT_API_BASE_URL =
  (typeof process !== 'undefined' && (process as any).env?.VITE_PAYMENT_API_URL) ||
  'https://nana-payment-api.onrender.com';

/**
 * 1. Initialise un salon de Live Shopping éphémère avec expiresAt via Supabase
 */
export async function initFlashLiveRoom(
  params: InitFlashRoomParams
): Promise<FlashLiveRoomData> {
  const {
    roomId,
    title = 'Vente Flash Live Shopping Wameet 🔥',
    sellerId = 'seller_wameet_01',
    sellerName = 'Boutique Partenaire',
    sellerAvatar,
    location = 'Abidjan • Cocody (15 km)',
    durationMinutes = 45,
    youtubeUrl = 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    initialProduct = null
  } = params;

  const nowMs = Date.now();
  const expiresAtMs = nowMs + durationMinutes * 60 * 1000;
  const expiresAt = new Date(expiresAtMs).toISOString();

  const defaultRoom: FlashLiveRoomData = {
    roomId,
    title,
    sellerId,
    sellerName,
    sellerAvatar,
    location,
    durationMinutes,
    youtubeUrl,
    createdAtMs: nowMs,
    expiresAt,
    expiresAtMs,
    status: 'active',
    isExpired: false,
    pushedProduct: initialProduct,
    pushedAt: initialProduct ? nowMs : null,
    viewersCount: Math.floor(Math.random() * 8) + 12
  };

  // 1. Sauvegarde Supabase SQL live_sessions
  try {
    await supabase
      .from('live_sessions')
      .upsert({
        id: roomId,
        title,
        host_name: sellerName,
        status: 'live',
        stream_url: youtubeUrl,
        pinned_product_data: initialProduct,
        viewer_count: defaultRoom.viewersCount,
        created_at: new Date(nowMs).toISOString(),
        updated_at: new Date(nowMs).toISOString()
      });
  } catch (supaErr) {
    console.warn('[FLASH ROOM INIT SUPABASE WARNING]', supaErr);
  }

  // 2. Appel API backend optionnel
  try {
    fetch(`${PAYMENT_API_BASE_URL}/api/flash-live/rooms/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(defaultRoom)
    }).catch(() => {});
  } catch (_e) {}

  return defaultRoom;
}

/**
 * 2. Déclencheur côté Vendeur : Pousse instantanément un produit en direct via Supabase
 */
export async function pushLiveProduct(
  roomId: string,
  product: LiveProductItem
): Promise<boolean> {
  if (!roomId || !product) return false;

  try {
    await supabase
      .from('live_sessions')
      .update({
        pinned_product_data: product,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId);

    // Broadcast instantané
    const channel = supabase.channel(`flash_room_channel_${roomId}`);
    channel.send({
      type: 'broadcast',
      event: 'product_pushed',
      payload: { product }
    });

    return true;
  } catch (err) {
    console.error('[PUSH PRODUCT SUPABASE ERROR]', err);
    return false;
  }
}

/**
 * 3. Fermeture et destruction du salon éphémère
 */
export async function closeFlashLiveRoom(
  roomId: string,
  farewellMessage?: string
): Promise<{ success: boolean; farewellMessage: string }> {
  const defaultFarewell =
    farewellMessage ||
    "Merci d'avoir participé à notre Vente Flash Live Shopping ! À très bientôt sur Wameet.";

  try {
    await supabase
      .from('live_sessions')
      .update({
        status: 'ended',
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId);

    const channel = supabase.channel(`flash_room_channel_${roomId}`);
    channel.send({
      type: 'broadcast',
      event: 'room_closed',
      payload: { farewellMessage: defaultFarewell }
    });

    return { success: true, farewellMessage: defaultFarewell };
  } catch (err) {
    console.error('[CLOSE ROOM SUPABASE ERROR]', err);
    return { success: true, farewellMessage: defaultFarewell };
  }
}

/**
 * 4. Abonnement en temps réel aux événements du salon via Supabase Realtime
 */
export function subscribeToFlashLiveRoom(
  roomId: string,
  onUpdate: (room: FlashLiveRoomData) => void
): () => void {
  if (!roomId) return () => {};

  const fetchRoom = async () => {
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();

      if (data && !error) {
        onUpdate({
          roomId,
          title: data.title || 'Live Flash',
          sellerId: data.host_id || 'seller',
          sellerName: data.host_name || 'Vendeur Wameet',
          location: 'Abidjan',
          durationMinutes: 45,
          expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
          expiresAtMs: Date.now() + 45 * 60 * 1000,
          status: data.status === 'ended' ? 'closed' : 'active',
          isExpired: data.status === 'ended',
          pushedProduct: data.pinned_product_data || null,
          viewersCount: data.viewer_count || 12
        });
      }
    } catch (err) {
      console.warn('[SUBSCRIBE FLASH ROOM NOTICE]', err);
    }
  };

  fetchRoom();

  const channelName = `flash_room_channel_${roomId}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'live_sessions',
        filter: `id=eq.${roomId}`,
      },
      () => {
        fetchRoom();
      }
    )
    .on('broadcast', { event: 'product_pushed' }, ({ payload }) => {
      if (payload?.product) {
        fetchRoom();
      }
    })
    .on('broadcast', { event: 'room_closed' }, () => {
      fetchRoom();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
