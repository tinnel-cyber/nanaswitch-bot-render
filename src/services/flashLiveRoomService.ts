// ============================================================================
// SERVICE FRONTEND WAMEET : SALONS DE LIVE SHOPPING ÉPHÉMÈRES & PUSH PRODUIT
// ============================================================================

import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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
 * 1. Initialise un salon de Live Shopping éphémère avec expiresAt
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

  const now = Date.now();
  const durationMs = durationMinutes * 60 * 1000;
  const expiresAtMs = now + durationMs;
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
    createdAtMs: now,
    expiresAt,
    expiresAtMs,
    status: 'active',
    isExpired: false,
    pushedProduct: initialProduct,
    viewersCount: 1
  };

  // Appel API backend Express
  try {
    const res = await fetch(`${PAYMENT_API_BASE_URL}/api/flash-live/rooms/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.room) return data.room;
    }
  } catch (err: any) {
    console.warn('[FLASH ROOM INIT API NOTICE] Erreur API, fallback Firestore direct :', err.message);
  }

  // Fallback Firestore direct
  try {
    if (db) {
      const roomRef = doc(db, 'flash_live_rooms', roomId);
      await setDoc(roomRef, {
        ...defaultRoom,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Synchronisation avec live_events
      const liveRef = doc(db, 'live_events', roomId);
      await setDoc(liveRef, {
        id: roomId,
        title,
        hostName: sellerName,
        status: 'live',
        activeProductId: initialProduct?.id || null,
        activeProduct: initialProduct || null,
        expiresAt,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (fsErr) {
    console.warn('[FLASH ROOM INIT FIRESTORE ERROR]', fsErr);
  }

  return defaultRoom;
}

/**
 * 2. Déclencheur côté Vendeur : Pousse instantanément un produit en direct à tous les spectateurs
 */
export async function pushLiveProduct(
  roomId: string,
  product: LiveProductItem
): Promise<boolean> {
  if (!roomId || !product) return false;

  // 1. Appel API backend
  try {
    const res = await fetch(`${PAYMENT_API_BASE_URL}/api/flash-live/rooms/push-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, product })
    });
    if (res.ok) {
      return true;
    }
  } catch (err: any) {
    console.warn('[PUSH PRODUCT API NOTICE] Fallback direct Firestore :', err.message);
  }

  // 2. Fallback Firestore direct
  try {
    if (db) {
      const roomRef = doc(db, 'flash_live_rooms', roomId);
      await setDoc(roomRef, {
        pushedProduct: product,
        pushedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      const liveRef = doc(db, 'live_events', roomId);
      await setDoc(liveRef, {
        activeProductId: product.id,
        activeProduct: product,
        updatedAt: serverTimestamp()
      }, { merge: true });

      return true;
    }
  } catch (err) {
    console.error('[PUSH PRODUCT FIRESTORE ERROR]', err);
  }

  return false;
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
    const res = await fetch(`${PAYMENT_API_BASE_URL}/api/flash-live/rooms/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, farewellMessage: defaultFarewell })
    });
    if (res.ok) {
      return { success: true, farewellMessage: defaultFarewell };
    }
  } catch (err: any) {
    console.warn('[CLOSE ROOM API NOTICE] Fallback direct Firestore :', err.message);
  }

  try {
    if (db) {
      const roomRef = doc(db, 'flash_live_rooms', roomId);
      await setDoc(roomRef, {
        status: 'closed',
        isExpired: true,
        closedAt: serverTimestamp(),
        farewellMessage: defaultFarewell,
        updatedAt: serverTimestamp()
      }, { merge: true });

      const liveRef = doc(db, 'live_events', roomId);
      await setDoc(liveRef, {
        status: 'ended',
        endedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      return { success: true, farewellMessage: defaultFarewell };
    }
  } catch (err) {
    console.error('[CLOSE ROOM FIRESTORE ERROR]', err);
  }

  return { success: true, farewellMessage: defaultFarewell };
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
      const roomRef = doc(db, 'flash_live_rooms', roomId);
      const docSnap = await getDoc(roomRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as FlashLiveRoomData;
        onUpdate(data);
      } else {
        const fallbackLiveRef = doc(db, 'live_events', roomId);
        const liveSnap = await getDoc(fallbackLiveRef);
        if (liveSnap.exists()) {
          const ld = liveSnap.data();
          onUpdate({
            roomId,
            title: ld.title || 'Live Flash',
            sellerId: ld.hostId || 'seller',
            sellerName: ld.hostName || 'Vendeur Wameet',
            location: ld.location || 'Abidjan',
            durationMinutes: 45,
            expiresAt: ld.expiresAt || new Date(Date.now() + 45 * 60 * 1000).toISOString(),
            expiresAtMs: Date.now() + 45 * 60 * 1000,
            status: ld.status === 'ended' ? 'closed' : 'active',
            isExpired: ld.status === 'ended',
            pushedProduct: ld.activeProduct || null,
            viewersCount: ld.viewerCount || 10
          });
        }
      }
    } catch (err) {
      console.warn('[SUBSCRIBE FLASH ROOM NOTICE]', err);
    }
  };

  fetchRoom();

  const channelName = `flash_room_${roomId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'wameet_messages',
        filter: `chat_id=eq.${roomId}`,
      },
      () => {
        fetchRoom();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
