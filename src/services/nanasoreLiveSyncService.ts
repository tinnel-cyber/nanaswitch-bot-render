import { supabase } from '../lib/supabase';

export interface LiveEventProduct {
  id: string;
  title: string;
  name?: string;
  shortTitle?: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  badge?: string;
  stockLeft?: number;
  description?: string;
  category?: string;
}

export interface LiveEventDocument {
  id: string;
  title?: string;
  hostName?: string;
  hostAvatar?: string;
  storeId?: string;
  storeName?: string;
  activeProductId?: string | null;
  activeProduct?: LiveEventProduct | null;
  streamUrl?: string;
  status?: 'live' | 'ended' | 'scheduled';
  viewerCount?: number;
  updatedAt?: any;
}

export interface LiveOrderPayload {
  liveId: string;
  productId: string;
  productTitle: string;
  amountFcfa: number;
  paymentMethod: 'orange' | 'wave' | 'moov' | 'mtn';
  customerPhone: string;
  customerName?: string;
}

// Produits de démonstration par défaut si le document liveId n'a pas encore de produit complet
export const PRESET_LIVE_PRODUCTS: Record<string, LiveEventProduct> = {
  'prod-karite-royal': {
    id: 'prod-karite-royal',
    title: 'Coffret Karité Royal Or 100% Bio',
    shortTitle: 'Karité Royal Or Bio',
    price: 12500,
    originalPrice: 20000,
    imageUrl: 'https://images.unsplash.com/photo-1608248597359-0e6d526a6c58?w=500&auto=format&fit=crop&q=80',
    badge: '👑 VEDETTE LIVE (-37%)',
    stockLeft: 14,
    description: 'Soin nourrissant corps et cheveux pressé à froid de Bobo-Dioulasso.',
    category: 'Cosmétique Bio'
  },
  'prod-ringlight-pro': {
    id: 'prod-ringlight-pro',
    title: 'Ring Light Supra RGB 18" + Trépied Pro 2m10',
    shortTitle: 'Ring Light Supra RGB 18"',
    price: 24000,
    originalPrice: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?w=500&auto=format&fit=crop&q=80',
    badge: '⚡ FLASH STREAMING',
    stockLeft: 4,
    description: 'Éclairage haute fidélité pour vos Lives Wameet et TikTok.',
    category: 'Équipement Créateur'
  }
};

/**
 * 1. Écouteur temps réel (Supabase Realtime) sur le live event
 */
export function subscribeToLiveEvent(
  liveId: string,
  onUpdate: (event: LiveEventDocument, activeProduct: LiveEventProduct | null) => void,
  onError?: (err: Error) => void
): () => void {
  const fetchEvent = async () => {
    try {
      const { data: row } = await supabase
        .from('app_registry')
        .select('*')
        .eq('key', `live_event_${liveId}`)
        .maybeSingle();

      if (!row || !row.config_json) {
        const fallbackDoc: LiveEventDocument = {
          id: liveId,
          title: 'Vente Flash & Live Shopping Nanasore',
          hostName: 'Ibrahim Pousbila Konkobo',
          status: 'live',
          activeProductId: 'prod-karite-royal',
          activeProduct: PRESET_LIVE_PRODUCTS['prod-karite-royal'],
          viewerCount: 342
        };
        onUpdate(fallbackDoc, fallbackDoc.activeProduct || null);
        return;
      }

      const eventData = { id: liveId, ...(row.config_json as any) } as LiveEventDocument;
      const activeId = eventData.activeProductId;

      if (!activeId) {
        onUpdate(eventData, null);
        return;
      }

      if (eventData.activeProduct && eventData.activeProduct.id === activeId) {
        onUpdate(eventData, eventData.activeProduct);
        return;
      }

      const preset = PRESET_LIVE_PRODUCTS[activeId] || {
        id: activeId,
        title: `Offre Live Spéciale #${activeId.substring(0, 6)}`,
        shortTitle: `Offre #${activeId.substring(0, 6)}`,
        price: 15000,
        originalPrice: 25000,
        imageUrl: 'https://images.unsplash.com/photo-1608248597359-0e6d526a6c58?w=500&auto=format&fit=crop&q=80',
        badge: '⚡ OFFRE EN DIRECT',
        stockLeft: 5
      };

      onUpdate(eventData, preset);
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchEvent();

  const channelName = `live_event_${liveId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_registry',
        filter: `key=eq.live_event_${liveId}`,
      },
      () => {
        fetchEvent();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * 2. Déclencheur côté Vendeur : Pousse un produit en direct (activeProductId)
 */
export async function pushLiveActiveProduct(
  liveId: string,
  productId: string | null,
  productData?: LiveEventProduct
): Promise<void> {
  const payload: any = {
    id: liveId,
    activeProductId: productId,
    activeProduct: productData || (productId ? PRESET_LIVE_PRODUCTS[productId] || null : null),
    updatedAt: new Date().toISOString()
  };

  await supabase.from('app_registry').upsert({
    key: `live_event_${liveId}`,
    tenant_id: 'default',
    module_key: 'live_events',
    config_json: payload
  }, { onConflict: 'key' });
}

/**
 * 3. Enregistrement d'une commande passée en direct via le Bottom Sheet
 */
export async function recordLiveOrder(payload: LiveOrderPayload): Promise<{ orderId: string }> {
  const orderId = `live_ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const orderDocData = {
    id: orderId,
    order_number: orderId,
    live_id: payload.liveId,
    product_id: payload.productId,
    customer_name: payload.customerName || 'Acheteur Live',
    customer_phone: payload.customerPhone,
    total_amount: payload.amountFcfa,
    payment_method: payload.paymentMethod,
    payment_status: 'PAID',
    fulfillment_status: 'EN_ATTENTE_LIVRAISON',
    metadata: {
      productTitle: payload.productTitle,
      source: 'nanasore_live_bottom_sheet'
    }
  };

  try {
    await supabase.from('orders').upsert(orderDocData, { onConflict: 'order_number' });
    await supabase.from('app_registry').upsert({
      key: `order_${orderId}`,
      tenant_id: 'default',
      module_key: 'orders',
      config_json: orderDocData
    }, { onConflict: 'key' });
  } catch (err) {
    console.warn('[NANASORE LIVE ORDER] Erreur Supabase SQL :', err);
  }

  return { orderId };
}

// =========================================================================
// 4. CHAT EN TEMPS RÉEL
// =========================================================================

export interface LiveEventChatMessage {
  id: string;
  liveId: string;
  senderName: string;
  senderId: string;
  senderAvatar?: string;
  senderRole?: 'host' | 'viewer';
  text: string;
  createdAt: number;
}

export const DEFAULT_DEMO_CHAT_MESSAGES: Record<string, LiveEventChatMessage[]> = {
  default: [
    {
      id: 'msg-init-1',
      liveId: 'default',
      senderName: 'Fatou Ouédraogo',
      senderId: 'demo-u1',
      senderRole: 'viewer',
      text: 'Bonsoir ! La livraison à Ouaga 2000 est gratuite ? 🙏',
      createdAt: Date.now() - 1000 * 60 * 3
    },
    {
      id: 'msg-init-2',
      liveId: 'default',
      senderName: 'Ibrahim Pousbila Konkobo',
      senderId: 'host-1',
      senderRole: 'host',
      text: 'Oui Fatou ! Livraison offerte dès 2 coffrets commandés en direct ! 👑',
      createdAt: Date.now() - 1000 * 60 * 2
    },
    {
      id: 'msg-init-3',
      liveId: 'default',
      senderName: 'Moussa Sanogo (Abidjan)',
      senderId: 'demo-u2',
      senderRole: 'viewer',
      text: 'Je viens de valider 1 coffret par Wave ! Reçu direct ! 🚀',
      createdAt: Date.now() - 1000 * 30
    }
  ]
};

// Mémoire locale pour affichage instantané (0 milliseconde)
const localLiveChatCache: Record<string, LiveEventChatMessage[]> = {};

/**
 * Abonnement au Chat Supabase
 */
export function subscribeToLiveChat(
  liveId: string,
  onMessages: (messages: LiveEventChatMessage[]) => void
): () => void {
  const initial = localLiveChatCache[liveId] || DEFAULT_DEMO_CHAT_MESSAGES.default;
  onMessages([...initial]);

  const fetchChat = async () => {
    try {
      const { data: rows } = await supabase
        .from('app_registry')
        .select('config_json')
        .eq('tenant_id', liveId)
        .eq('module_key', 'live_chat')
        .limit(80);

      if (rows && rows.length > 0) {
        const msgs: LiveEventChatMessage[] = rows
          .map(r => r.config_json as LiveEventChatMessage)
          .filter(Boolean)
          .sort((a, b) => a.createdAt - b.createdAt);

        localLiveChatCache[liveId] = msgs;
        onMessages(msgs);
      }
    } catch (err) {
      console.warn('[NANASORE LIVE CHAT] Lecture chat Supabase :', err);
    }
  };

  fetchChat();

  const channelName = `live_chat_sync_${liveId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_registry',
        filter: `tenant_id=eq.${liveId}`,
      },
      () => {
        fetchChat();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Envoi d'un message texte instantané
 */
export async function sendLiveChatMessage(
  liveId: string,
  message: {
    senderName: string;
    senderId?: string;
    senderAvatar?: string;
    senderRole?: 'host' | 'viewer';
    text: string;
  }
): Promise<LiveEventChatMessage> {
  const newMsg: LiveEventChatMessage = {
    id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    liveId,
    senderName: message.senderName.trim() || 'Spectateur Wameet',
    senderId: message.senderId || 'anon',
    senderAvatar: message.senderAvatar,
    senderRole: message.senderRole || 'viewer',
    text: message.text.trim(),
    createdAt: Date.now()
  };

  if (!localLiveChatCache[liveId]) {
    localLiveChatCache[liveId] = [...DEFAULT_DEMO_CHAT_MESSAGES.default];
  }
  localLiveChatCache[liveId].push(newMsg);

  try {
    await supabase.from('app_registry').upsert({
      key: `live_msg_${newMsg.id}`,
      tenant_id: liveId,
      module_key: 'live_chat',
      config_json: newMsg
    }, { onConflict: 'key' });
  } catch (err) {
    console.warn('[NANASORE LIVE CHAT] Écriture Supabase (préservé en mémoire) :', err);
  }

  return newMsg;
}
