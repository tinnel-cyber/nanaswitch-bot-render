import { db } from '../firebaseConfig';
import { supabase } from '../lib/supabase';
import { FlashLiveRequest, FlashLiveStatus } from '../types/flashLive';

// Dynamic on-demand Firestore loader to protect initial bundle size
let firestorePromise: Promise<typeof import('firebase/firestore')> | null = null;
function loadFirestore() {
  if (!firestorePromise) {
    firestorePromise = import('firebase/firestore');
  }
  return firestorePromise;
}

const LOCAL_STORAGE_KEY = 'nana_flash_requests_cache';

// Local storage helper for instant 0ms offline and cross-tab synchronization
function getLocalRequests(): Record<string, FlashLiveRequest> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveLocalRequest(req: FlashLiveRequest): void {
  try {
    const current = getLocalRequests();
    current[req.id] = req;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
    // Dispatch cross-window and in-tab notifications
    window.dispatchEvent(new CustomEvent('nana_flash_live_update', { detail: req }));
  } catch (e) {}
}

/**
 * Création d'une nouvelle demande de Flash Live par un client
 */
export async function createFlashLiveRequest(params: {
  productId: string;
  productName: string;
  productPrice: number;
  productPhoto?: string;
  merchantId?: string;
  storeName?: string;
  customerName?: string;
}): Promise<FlashLiveRequest> {
  const id = `fl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const request: FlashLiveRequest = {
    id,
    productId: params.productId,
    productName: params.productName,
    productPrice: params.productPrice,
    productPhoto: params.productPhoto || '',
    merchantId: params.merchantId || 'store-konkobo-telecom',
    storeName: params.storeName || 'ENTREPRISE KONKOBO POUSBILA',
    customerName: params.customerName || 'Client Intéressé (Boutique)',
    status: 'pending',
    createdAt: Date.now()
  };

  // 1. Sauvegarde locale immédiate pour réactivité instantanée
  saveLocalRequest(request);

  // 2. Écriture Firestore en tâche de fond (asynchrone)
  try {
    const { doc, setDoc } = await loadFirestore();
    const docRef = doc(db, 'flash_requests', id);
    await setDoc(docRef, request);
  } catch (err) {
    console.warn('[FLASH_LIVE] storage write fallback to local event bus:', err);
  }

  return request;
}

/**
 * Écoute en temps réel d'une demande spécifique (Client ou Commerçant)
 */
export function subscribeToFlashLiveRequest(
  requestId: string,
  onUpdate: (request: FlashLiveRequest | null) => void
): () => void {
  let isSubscribed = true;

  // 1. Émission immédiate depuis le cache local
  const cached = getLocalRequests()[requestId];
  if (cached) {
    onUpdate(cached);
  }

  // 2. Écouteur d'événements locaux (cross-tab / intra-application)
  const handleLocalUpdate = (e: Event) => {
    const custom = e as CustomEvent<FlashLiveRequest>;
    if (custom.detail && custom.detail.id === requestId) {
      onUpdate(custom.detail);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
      try {
        const parsed: Record<string, FlashLiveRequest> = JSON.parse(e.newValue);
        if (parsed[requestId]) {
          onUpdate(parsed[requestId]);
        }
      } catch (err) {}
    }
  };

  window.addEventListener('nana_flash_live_update', handleLocalUpdate);
  window.addEventListener('storage', handleStorageEvent);

  // 3. Écouteur Supabase Realtime (remplace Firestore onSnapshot)
  const channelName = `flash_req_${requestId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'wameet_messages',
        filter: `id=eq.${requestId}`,
      },
      (payload) => {
        if (payload.new) {
          const row = payload.new as any;
          const updatedReq: FlashLiveRequest = {
            id: requestId,
            productId: row.product_id || '',
            productName: row.product_name || 'Produit Flash',
            merchantId: row.merchant_id || '',
            buyerName: row.sender_name || 'Client',
            buyerPhone: row.sender_phone || '',
            status: (row.status || 'pending') as FlashLiveStatus,
            dailyRoomUrl: row.media_url,
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          };
          saveLocalRequest(updatedReq);
          onUpdate(updatedReq);
        }
      }
    )
    .subscribe();

  return () => {
    isSubscribed = false;
    window.removeEventListener('nana_flash_live_update', handleLocalUpdate);
    window.removeEventListener('storage', handleStorageEvent);
    supabase.removeChannel(channel);
  };
}

/**
 * Écoute des demandes entrantes en attente pour le commerçant (Dashboard Central)
 */
export function subscribeToMerchantFlashRequests(
  merchantId: string,
  onRequestsChange: (pendingRequests: FlashLiveRequest[]) => void
): () => void {
  let isSubscribed = true;

  const emitFilteredLocal = () => {
    const all = getLocalRequests();
    const now = Date.now();
    // Ne retenir que les demandes pending créées il y a moins de 10 minutes
    const filtered = Object.values(all).filter(r => 
      r.status === 'pending' && 
      (now - r.createdAt < 10 * 60 * 1000) &&
      (!merchantId || r.merchantId === merchantId || merchantId === 'all')
    );
    onRequestsChange(filtered);
  };

  // Émission initiale
  emitFilteredLocal();

  const handleLocalUpdate = () => {
    emitFilteredLocal();
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_KEY) {
      emitFilteredLocal();
    }
  };

  window.addEventListener('nana_flash_live_update', handleLocalUpdate);
  window.addEventListener('storage', handleStorageEvent);

  // Écouteur Supabase Realtime (remplace Firestore onSnapshot)
  const channelName = `merchant_flash_${merchantId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'wameet_messages',
      },
      () => {
        emitFilteredLocal();
      }
    )
    .subscribe();

  return () => {
    isSubscribed = false;
    window.removeEventListener('nana_flash_live_update', handleLocalUpdate);
    window.removeEventListener('storage', handleStorageEvent);
    supabase.removeChannel(channel);
  };
}

/**
 * Génère une URL Daily.co unique et sécurisée pour la session Flash Live
 */
export function generateFlashRoomUrl(requestId: string): string {
  // Utilise le domaine Daily.co officiel nanasore
  const cleanId = requestId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `https://nanasore.daily.co/flash-${cleanId}`;
}

/**
 * Le commerçant accepte la demande -> Passage à 'accepted' avec roomUrl et timestamp
 */
export async function acceptFlashLiveRequest(
  requestId: string,
  customRoomUrl?: string
): Promise<FlashLiveRequest> {
  const current = getLocalRequests()[requestId];
  const roomUrl = customRoomUrl || generateFlashRoomUrl(requestId);
  const updated: FlashLiveRequest = {
    ...(current || {
      id: requestId,
      productId: 'prod-unknown',
      productName: 'Produit Boutique',
      productPrice: 0,
      merchantId: 'store-konkobo-telecom',
      status: 'pending',
      createdAt: Date.now()
    }),
    status: 'accepted',
    roomUrl,
    acceptedAt: Date.now()
  };

  saveLocalRequest(updated);

  try {
    const { doc, updateDoc } = await loadFirestore();
    const docRef = doc(db, 'flash_requests', requestId);
    await updateDoc(docRef, {
      status: 'accepted',
      roomUrl,
      acceptedAt: updated.acceptedAt
    });
  } catch (err) {
    console.warn('[FLASH_LIVE] Accept update fallback:', err);
  }

  return updated;
}

/**
 * Le commerçant refuse ou est indisponible
 */
export async function rejectFlashLiveRequest(requestId: string): Promise<void> {
  const current = getLocalRequests()[requestId];
  if (current) {
    current.status = 'rejected';
    current.endedAt = Date.now();
    saveLocalRequest(current);
  }

  try {
    const { doc, updateDoc } = await loadFirestore();
    const docRef = doc(db, 'flash_requests', requestId);
    await updateDoc(docRef, {
      status: 'rejected',
      endedAt: Date.now()
    });
  } catch (err) {}
}

/**
 * Fin normale de l'appel (ou coupure automatique par kill switch 300s)
 */
export async function completeFlashLiveRequest(requestId: string): Promise<void> {
  const current = getLocalRequests()[requestId];
  if (current) {
    current.status = 'completed';
    current.endedAt = Date.now();
    saveLocalRequest(current);
  }

  try {
    const { doc, updateDoc } = await loadFirestore();
    const docRef = doc(db, 'flash_requests', requestId);
    await updateDoc(docRef, {
      status: 'completed',
      endedAt: Date.now()
    });
  } catch (err) {}
}

/**
 * Le client annule sa demande avant que le marchand ne décroche
 */
export async function cancelFlashLiveRequest(requestId: string): Promise<void> {
  const current = getLocalRequests()[requestId];
  if (current) {
    current.status = 'cancelled';
    current.endedAt = Date.now();
    saveLocalRequest(current);
  }

  try {
    const { doc, updateDoc } = await loadFirestore();
    const docRef = doc(db, 'flash_requests', requestId);
    await updateDoc(docRef, {
      status: 'cancelled',
      endedAt: Date.now()
    });
  } catch (err) {}
}

/**
 * Synthétiseur audio Web Audio API pour la sonnerie d'appel entrant commerçant
 */
export function playIncomingCallRingtone(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    
    // Cadence de sonnerie de téléphone moderne (bip double doux et pénétrant)
    const playRingBurst = (timeOffset: number) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, now + timeOffset); // La standard 440 Hz
      osc2.frequency.setValueAtTime(480, now + timeOffset); // Fréquence téléphone

      gain.gain.setValueAtTime(0.2, now + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + timeOffset + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now + timeOffset);
      osc2.start(now + timeOffset);
      osc1.stop(now + timeOffset + 0.35);
      osc2.stop(now + timeOffset + 0.35);
    };

    playRingBurst(0);
    playRingBurst(0.45);
  } catch (e) {
    console.warn('Audio ringtone notice:', e);
  }
}
