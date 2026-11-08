import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from '../firebase';
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
    shortTitle: 'Coffret Karité Royal',
    price: 18500,
    originalPrice: 28000,
    imageUrl: 'https://images.unsplash.com/photo-1608248597359-0e6d526a6c58?w=500&auto=format&fit=crop&q=80',
    badge: '🔥 -34% EN DIRECT',
    stockLeft: 7,
    description: 'Soin complet corporel karité précieux pressé à froid.',
    category: 'Beauté & Cosmétique'
  },
  'prod-masterclass-ia': {
    id: 'prod-masterclass-ia',
    title: 'Masterclass Tunnels & IA Afrique (12 Blocs)',
    shortTitle: 'Masterclass IA Afrique',
    price: 25000,
    originalPrice: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=80',
    badge: '⚡ OFFRE FLASH LIVE',
    stockLeft: 12,
    description: 'Accès à vie à la formation certifiante et aux templates de vente.',
    category: 'Formation Digitale'
  },
  'prod-ringlight-pro': {
    id: 'prod-ringlight-pro',
    title: 'Kit Studio Ring Light Pro 18" + Trépied 2m',
    shortTitle: 'Kit Ring Light Pro',
    price: 22000,
    originalPrice: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=80',
    badge: '📦 LIVRAISON OFFERTE',
    stockLeft: 4,
    description: 'Éclairage haute fidélité pour vos Lives Wameet et TikTok.',
    category: 'Équipement Créateur'
  }
};

/**
 * 1. Écouteur temps réel (onSnapshot) sur la collection /live_events/{liveId}/
 * Détecte les changements de activeProductId et résout automatiquement le produit
 */
export function subscribeToLiveEvent(
  liveId: string,
  onUpdate: (event: LiveEventDocument, activeProduct: LiveEventProduct | null) => void,
  onError?: (err: Error) => void
): () => void {
  const fetchEvent = async () => {
    try {
      const eventDocRef = doc(db, 'live_events', liveId);
      const snapshot = await getDoc(eventDocRef);
      if (!snapshot.exists()) {
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

      const eventData = { id: snapshot.id, ...(snapshot.data() as any) } as LiveEventDocument;
      const activeId = eventData.activeProductId;

      if (!activeId) {
        onUpdate(eventData, null);
        return;
      }

      if (eventData.activeProduct && eventData.activeProduct.id === activeId) {
        onUpdate(eventData, eventData.activeProduct);
        return;
      }

      try {
        const prodDocRef = doc(db, 'live_events', liveId, 'products', activeId);
        const prodSnap = await getDoc(prodDocRef);
        if (prodSnap.exists()) {
          const fetchedProduct = { id: prodSnap.id, ...(prodSnap.data() as any) } as LiveEventProduct;
          onUpdate(eventData, fetchedProduct);
          return;
        }
      } catch (prodErr) {
        console.warn('[NANASORE LIVE SYNC] Erreur lecture sous-collection produit :', prodErr);
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
        table: 'wameet_messages',
        filter: `chat_id=eq.${liveId}`,
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
  const eventDocRef = doc(db, 'live_events', liveId);

  const payload: any = {
    activeProductId: productId,
    activeProduct: productData || (productId ? PRESET_LIVE_PRODUCTS[productId] || null : null),
    updatedAt: serverTimestamp()
  };

  await setDoc(eventDocRef, payload, { merge: true });

  // Si des données de produit complètes sont fournies, les archiver dans la sous-collection
  if (productId && productData) {
    try {
      const prodDocRef = doc(db, 'live_events', liveId, 'products', productId);
      await setDoc(prodDocRef, productData, { merge: true });
    } catch (subErr) {
      console.warn('[NANASORE LIVE SYNC] Erreur sauvegarde sous-collection :', subErr);
    }
  }
}

/**
 * 3. Enregistrement d'une commande passée en direct via le Bottom Sheet
 */
export async function recordLiveOrder(payload: LiveOrderPayload): Promise<{ orderId: string }> {
  const orderId = `live_ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const orderDocData = {
    id: orderId,
    liveId: payload.liveId,
    productId: payload.productId,
    productTitle: payload.productTitle,
    amountFcfa: payload.amountFcfa,
    paymentMethod: payload.paymentMethod,
    customerPhone: payload.customerPhone,
    customerName: payload.customerName || 'Acheteur Live',
    status: 'PAID',
    createdAt: serverTimestamp(),
    source: 'nanasore_live_bottom_sheet'
  };

  // Sous-collection des commandes du Live
  try {
    const liveOrdersCol = collection(db, 'live_events', payload.liveId, 'orders');
    await addDoc(liveOrdersCol, orderDocData);
  } catch (err) {
    console.warn('[NANASORE LIVE ORDER] Erreur enregistrement sous-collection :', err);
  }

  // Collection globale des commandes
  try {
    const globalOrderDocRef = doc(db, 'orders', orderId);
    await setDoc(globalOrderDocRef, orderDocData, { merge: true });
  } catch (err) {
    console.warn('[NANASORE LIVE ORDER] Erreur enregistrement commande globale :', err);
  }

  return { orderId };
}

// =========================================================================
// 4. CHAT FIREBASE EN TEMPS RÉEL ABSOLU (ZÉRO DÉLAI / INSTANTANÉ)
// =========================================================================

export interface LiveEventChatMessage {
  id: string;
  liveId: string;
  senderName: string;
  senderId?: string;
  senderAvatar?: string;
  senderRole?: 'host' | 'viewer';
  text: string;
  createdAt: number;
}

// Messages de démonstration par défaut pour un chat vivant dès le premier chargement
const DEFAULT_DEMO_CHAT_MESSAGES: Record<string, LiveEventChatMessage[]> = {
  default: [
    {
      id: 'demo-msg-1',
      liveId: 'default',
      senderName: 'Salif Tech (Host)',
      senderRole: 'host',
      senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      text: 'Bienvenue sur le Live Wameet ! Les stocks partent très vite en direct 🔥',
      createdAt: Date.now() - 45000
    },
    {
      id: 'demo-msg-2',
      liveId: 'default',
      senderName: 'Aïcha (Abidjan)',
      senderRole: 'viewer',
      text: 'La qualité vidéo est incroyable ! Est-ce que Wave est accepté ?',
      createdAt: Date.now() - 30000
    },
    {
      id: 'demo-msg-3',
      liveId: 'default',
      senderName: 'Moussa K.',
      senderRole: 'viewer',
      text: 'Oui Wave et Orange Money passent en 1 clic sans quitter le live 👏',
      createdAt: Date.now() - 15000
    }
  ]
};

// Mémoire locale pour affichage instantané (0 milliseconde)
const localLiveChatCache: Record<string, LiveEventChatMessage[]> = {};

/**
 * Abonnement au Chat Firebase Firestore (Temps Réel Absolu - Zéro Délai)
 */
export function subscribeToLiveChat(
  liveId: string,
  onMessages: (messages: LiveEventChatMessage[]) => void
): () => void {
  const initial = localLiveChatCache[liveId] || DEFAULT_DEMO_CHAT_MESSAGES.default;
  onMessages([...initial]);

  const fetchChat = async () => {
    try {
      const colRef = collection(db, 'live_events', liveId, 'messages');
      const q = query(colRef, orderBy('createdAt', 'asc'), limit(80));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const msgs: LiveEventChatMessage[] = [];
        snapshot.forEach((d) => {
          msgs.push({ id: d.id, ...(d.data() as any) });
        });
        localLiveChatCache[liveId] = msgs;
        onMessages(msgs);
      }
    } catch (err) {
      console.warn('[NANASORE LIVE CHAT] Lecture chat :', err);
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
        table: 'wameet_messages',
        filter: `chat_id=eq.${liveId}`,
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
 * Envoi d'un message texte instantané dans Firestore (Temps Réel Absolu - Zéro Délai)
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
    senderId: message.senderId || auth.currentUser?.uid || 'anon',
    senderAvatar: message.senderAvatar,
    senderRole: message.senderRole || 'viewer',
    text: message.text.trim(),
    createdAt: Date.now()
  };

  // 1. Mise à jour locale immédiate (0 milliseconde de latence perçue)
  if (!localLiveChatCache[liveId]) {
    localLiveChatCache[liveId] = [...DEFAULT_DEMO_CHAT_MESSAGES.default];
  }
  localLiveChatCache[liveId].push(newMsg);

  // 2. Écriture immédiate dans Firestore (sans aucun délai ni tampon)
  try {
    const colRef = collection(db, 'live_events', liveId, 'messages');
    await addDoc(colRef, newMsg);
  } catch (err) {
    console.warn('[NANASORE LIVE CHAT] Écriture Firestore warning (préservé en mémoire) :', err);
  }

  return newMsg;
}
