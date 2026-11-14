import { supabase } from '../lib/supabase';
import { FlashLiveRequest, FlashLiveStatus } from '../types/flashLive';

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

  // 2. Écriture Supabase wameet_messages
  try {
    await supabase.from('wameet_messages').insert({
      id,
      chat_id: params.merchantId || 'store-konkobo-telecom',
      sender_id: id,
      sender_name: params.customerName || 'Client',
      text: params.productName,
      type: 'call',
      status: 'pending',
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[FLASH_LIVE] Supabase write fallback:', err);
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

  // 3. Écouteur Supabase Realtime
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
            productName: row.text || 'Produit Flash',
            merchantId: row.chat_id || '',
            customerName: row.sender_name || 'Client',
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
    window.removeEventListener('nana_flash_live_update', handleLocalUpdate);
    window.removeEventListener('storage', handleStorageEvent);
    supabase.removeChannel(channel);
  };
}

/**
 * Génère une URL Daily.co unique et sécurisée pour la session Flash Live
 */
export function generateFlashRoomUrl(requestId: string): string {
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
    dailyRoomUrl: roomUrl,
    acceptedAt: Date.now()
  };

  saveLocalRequest(updated);

  try {
    await supabase
      .from('wameet_messages')
      .update({
        status: 'accepted',
        media_url: roomUrl
      })
      .eq('id', requestId);
  } catch (err) {
    console.warn('[FLASH_LIVE] Accept update Supabase fallback:', err);
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
    await supabase
      .from('wameet_messages')
      .update({ status: 'rejected' })
      .eq('id', requestId);
  } catch (err) {}
}

/**
 * Fin normale de l'appel
 */
export async function completeFlashLiveRequest(requestId: string): Promise<void> {
  const current = getLocalRequests()[requestId];
  if (current) {
    current.status = 'completed';
    current.endedAt = Date.now();
    saveLocalRequest(current);
  }

  try {
    await supabase
      .from('wameet_messages')
      .update({ status: 'completed' })
      .eq('id', requestId);
  } catch (err) {}
}

/**
 * Le client annule sa demande
 */
export async function cancelFlashLiveRequest(requestId: string): Promise<void> {
  const current = getLocalRequests()[requestId];
  if (current) {
    current.status = 'cancelled';
    current.endedAt = Date.now();
    saveLocalRequest(current);
  }

  try {
    await supabase
      .from('wameet_messages')
      .update({ status: 'cancelled' })
      .eq('id', requestId);
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
    
    const playRingBurst = (timeOffset: number) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, now + timeOffset);
      osc2.frequency.setValueAtTime(480, now + timeOffset);

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
