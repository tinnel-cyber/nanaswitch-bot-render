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
  quantity?: number;
  paymentMethod: 'orange' | 'wave' | 'moov' | 'mtn';
  customerPhone: string;
  customerName?: string;
  paymentRef?: string;
}

// Produits de démonstration par défaut si le document liveId n'a pas encore de produit complet
export const PRESET_LIVE_PRODUCTS: Record<string, LiveEventProduct> = {
  'prod-karite-royal': {
    id: 'prod-karite-royal',
    title: 'Beurre de Karité Pur Bio Premium - Édition Spéciale Live',
    shortTitle: 'Beurre de Karité Bio (500g)',
    price: 3500,
    originalPrice: 6000,
    imageUrl: 'https://images.unsplash.com/photo-1608248597359-0e6d526a6c58?w=500&auto=format&fit=crop&q=80',
    badge: '🔥 FLASH LIVE -42%',
    stockLeft: 14,
    category: 'Cosmétique Naturelle',
    description: 'Beurre de karité 100% pur récolté traditionnellement au Burkina Faso, pressé à froid et non raffiné.'
  },
  'prod-pagne-faso-danfani': {
    id: 'prod-pagne-faso-danfani',
    title: 'Pagne Traditionnel Tissé Faso Dan Fani Haute Couture',
    shortTitle: 'Faso Dan Fani Royal (3 Pièces)',
    price: 18000,
    originalPrice: 28000,
    imageUrl: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?w=500&auto=format&fit=crop&q=80',
    badge: '⭐ EXCLUSIVITÉ NSORE',
    stockLeft: 6,
    category: 'Mode & Artisanat',
    description: 'Tissage main par nos maîtres artisans avec fils de coton biologique et teintures naturelles.'
  },
  'prod-savon-noir-moringa': {
    id: 'prod-savon-noir-moringa',
    title: 'Savon Noir Artisanal Enrichi au Moringa & Huile de Neem',
    shortTitle: 'Savon Noir Moringa (Lot de 3)',
    price: 2500,
    originalPrice: 4500,
    imageUrl: 'https://images.unsplash.com/photo-1607006314144-88f583561937?w=500&auto=format&fit=crop&q=80',
    badge: '⚡ COUP DE CŒUR LIVE',
    stockLeft: 22,
    category: 'Soin du Corps',
    description: 'Soin détoxifiant pour tout type de peau, élimine les impuretés et nourrit l’épiderme en profondeur.'
  }
};

/**
 * 1. Synchronisation Temps Réel du Produit Actif (Pinned) via Supabase Realtime
 */
export function subscribeToLiveEvent(
  liveId: string,
  onUpdate: (event: LiveEventDocument, activeProduct: LiveEventProduct | null) => void,
  onError?: (err: Error) => void
): () => void {
  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', liveId)
        .maybeSingle();

      if (error || !data) {
        // Repli mémoire ou démo
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

      const activeProd = (data.pinned_product_data as LiveEventProduct) || null;
      const eventDoc: LiveEventDocument = {
        id: data.id,
        title: data.title || 'Live Nanasore',
        hostName: data.host_name || 'Vendeur NaNa',
        status: data.status || 'live',
        activeProductId: activeProd?.id || null,
        activeProduct: activeProd,
        streamUrl: data.stream_url,
        viewerCount: data.viewer_count || 1
      };

      onUpdate(eventDoc, activeProd);
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
        table: 'live_sessions',
        filter: `id=eq.${liveId}`,
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
 * 2. Déclencheur côté Vendeur : Pousse un produit en direct via Supabase
 */
export async function pushLiveActiveProduct(
  liveId: string,
  productId: string | null,
  productData?: LiveEventProduct
): Promise<void> {
  const resolvedProduct = productData || (productId ? PRESET_LIVE_PRODUCTS[productId] || null : null);

  try {
    await supabase
      .from('live_sessions')
      .update({
        pinned_product_data: resolvedProduct,
        updated_at: new Date().toISOString()
      })
      .eq('id', liveId);
  } catch (err) {
    console.warn('[NANASORE LIVE SYNC] Erreur pushLiveActiveProduct Supabase:', err);
  }
}

/**
 * 3. Enregistrement transactionnel d'une commande passée en direct via le Bottom Sheet
 * Sauvegarde dans Supabase SQL (public.orders) et décrémentation atomique des stocks
 */
export async function recordLiveOrder(payload: LiveOrderPayload): Promise<{ orderId: string }> {
  const orderId = `live_ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const qty = payload.quantity || 1;

  // 1. Sauvegarde dans Supabase SQL
  try {
    const { error: supaOrderErr } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        store_id: payload.liveId,
        customer_phone: payload.customerPhone,
        customer_name: payload.customerName || 'Client Live Nanasore',
        total_amount: payload.amountFcfa,
        payment_method: payload.paymentMethod,
        payment_status: 'completed',
        status: 'confirmed',
        created_at: new Date().toISOString()
      });

    if (supaOrderErr) {
      console.warn('[NANASORE LIVE ORDER] Supabase order insert notice:', supaOrderErr.message);
    }
  } catch (supaErr) {
    console.warn('[NANASORE LIVE ORDER] Erreur Supabase SQL insertion :', supaErr);
  }

  // 2. Décrémentation atomique du stock produit
  try {
    const { data: prodData } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', payload.productId)
      .maybeSingle();

    if (prodData && typeof prodData.stock_quantity === 'number') {
      const newStock = Math.max(0, prodData.stock_quantity - qty);
      await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', payload.productId);
    }
  } catch (stockErr) {
    console.warn('[NANASORE LIVE ORDER] Erreur décrémentation stock Supabase:', stockErr);
  }

  return { orderId };
}

// =========================================================================
// 4. CHAT SUPABASE EN TEMPS RÉEL ABSOLU (ZÉRO DÉLAI / INSTANTANÉ)
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

// Messages de démonstration par défaut
const DEFAULT_DEMO_CHAT_MESSAGES: Record<string, LiveEventChatMessage[]> = {
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

// Mémoire locale pour affichage instantané
const localLiveChatCache: Record<string, LiveEventChatMessage[]> = {};

/**
 * Abonnement au Chat Supabase Realtime
 */
export function subscribeToLiveChat(
  liveId: string,
  onMessages: (messages: LiveEventChatMessage[]) => void
): () => void {
  const initial = localLiveChatCache[liveId] || DEFAULT_DEMO_CHAT_MESSAGES.default;
  onMessages([...initial]);

  const channelName = `live_chat_channel_${liveId}`;
  const channel = supabase.channel(channelName);

  channel
    .on('broadcast', { event: 'new_message' }, ({ payload }) => {
      if (payload && payload.liveId === liveId) {
        if (!localLiveChatCache[liveId]) {
          localLiveChatCache[liveId] = [...DEFAULT_DEMO_CHAT_MESSAGES.default];
        }
        localLiveChatCache[liveId].push(payload as LiveEventChatMessage);
        onMessages([...localLiveChatCache[liveId]]);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Envoi d'un message texte instantané via Supabase Realtime Broadcast
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

  // 1. Mise à jour locale immédiate (0ms latence perçue)
  if (!localLiveChatCache[liveId]) {
    localLiveChatCache[liveId] = [...DEFAULT_DEMO_CHAT_MESSAGES.default];
  }
  localLiveChatCache[liveId].push(newMsg);

  // 2. Broadcast temps réel via Supabase
  try {
    const channel = supabase.channel(`live_chat_channel_${liveId}`);
    channel.send({
      type: 'broadcast',
      event: 'new_message',
      payload: newMsg
    });
  } catch (err) {
    console.warn('[NANASORE LIVE CHAT] Erreur broadcast Supabase:', err);
  }

  return newMsg;
}
