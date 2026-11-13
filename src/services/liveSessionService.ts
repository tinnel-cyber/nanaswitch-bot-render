import { supabase } from '../lib/supabase';
import { 
  LiveSession, 
  LiveSessionStatus,
  LiveChatMessage, 
  LiveQuizQuestion, 
  LiveQuizResponse, 
  LiveAssignment, 
  LiveSubmission, 
  HandRaisedUser 
} from '../types/liveSession';
import { StoreProductItem } from '../components/storeBuilder/types';

// Produits de démonstration pour les sessions Live
const DEMO_LIVE_PRODUCTS: StoreProductItem[] = [
  {
    id: 'live-prod-01',
    name: 'Pack VIP : Formation Live Shopping & Vente IA 2026',
    price: 35000,
    originalPrice: 75000,
    badge: 'Offre du Live (-53%)',
    category: 'Formations & Live',
    image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&auto=format&fit=crop&q=80',
    stock: 25,
    shortDescription: 'Accès exclusif à la masterclass en direct + modèles de tunnels de vente prêts à déployer.'
  },
  {
    id: 'live-prod-02',
    name: 'E-Book Officiel : Réussir son Business en Afrique',
    price: 15000,
    originalPrice: 30000,
    badge: 'Best-Seller',
    category: 'E-Books & Guides',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
    stock: 999,
    shortDescription: 'Le guide complet de 180 pages pour créer et rentabiliser votre activité avec le Mobile Money.'
  },
  {
    id: 'live-prod-03',
    name: 'Session de Coaching 1-to-1 Privée (45 min)',
    price: 40000,
    originalPrice: 80000,
    badge: 'Places Limitées (3 restantes)',
    category: 'Coaching 1-to-1',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80',
    stock: 3,
    shortDescription: 'Audit complet de votre boutique et stratégie de croissance personnalisée avec votre formateur.'
  },
  {
    id: 'live-prod-04',
    name: 'Pack 50+ Templates Canva Pro & Scripts WhatsApp',
    price: 20000,
    originalPrice: 45000,
    badge: 'Téléchargement Immédiat',
    category: 'Logiciels & Outils',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    stock: 999,
    shortDescription: 'Tous les visuels réseaux sociaux et argumentaires de vente pour convertir vos prospects.'
  }
];

// Session par défaut de secours haute fidélité
export const FALLBACK_LIVE_SESSION: LiveSession = {
  id: 'live-demo-session',
  storeId: 'demo-store',
  storeName: 'Académie Nanasore Pro',
  sessionSlug: 'masterclass-direct',
  title: '🔴 Masterclass en Direct : Vente Multi-Canaux & Stratégie Mobile Money 2026',
  description: 'Rejoignez la session interactive exclusive : audit en direct, questions-réponses et offres flash réservées aux participants du direct.',
  sessionMode: 'live_shopping',
  status: 'live',
  sourceType: 'youtube',
  streamUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  posterUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1080&auto=format&fit=crop&q=85',
  aspectRatio: '16:9',
  scheduledAt: Date.now(),
  startedAt: Date.now() - 1000 * 60 * 18,
  viewerCount: 168,
  countdownTitle: '⏳ Tarif Flash du Direct garanti pendant :',
  countdownEndsAt: Date.now() + 1000 * 3600 * 2,
  pinnedProductId: 'live-prod-01',
  pinnedProduct: DEMO_LIVE_PRODUCTS[0],
  products: DEMO_LIVE_PRODUCTS,
  whatsappPhone: '+2250700000000',
  hostName: 'Coach Ibrahim',
  hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  allowChat: true,
  createdAt: Date.now()
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(val: string): boolean {
  return UUID_REGEX.test((val || '').trim());
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Convertit un document webinar local en LiveSession complète avec le vrai lien collé
 */
function mapWebinarToLiveSession(id: string, w: any): LiveSession {
  const realUrl = (w.streamUrl || w.meetingUrl || w.socialStreamUrl || '').trim();
  const plat = String(w.platform || '').toLowerCase();
  const isMeetingRoom =
    plat === 'google_meet' ||
    plat === 'zoom' ||
    plat === 'google_classroom' ||
    plat === 'jitsi' ||
    realUrl.includes('meet.google.com') ||
    realUrl.includes('zoom.us') ||
    realUrl.includes('classroom.google.com') ||
    realUrl.includes('meet.jit.si');

  return {
    ...FALLBACK_LIVE_SESSION,
    id,
    sessionSlug: w.sessionSlug || id,
    storeId: w.merchantId || w.storeId || FALLBACK_LIVE_SESSION.storeId,
    storeName: w.storeName || FALLBACK_LIVE_SESSION.storeName,
    title: w.title || FALLBACK_LIVE_SESSION.title,
    description: w.description || FALLBACK_LIVE_SESSION.description,
    sessionMode: w.roomMode === 'CLASSROOM' ? 'interactive_class' : (w.sessionMode || 'live_shopping'),
    status: 'live',
    sourceType: plat === 'facebook' ? 'facebook' : (realUrl.endsWith('.mp4') ? 'mp4' : realUrl.endsWith('.m3u8') ? 'hls' : 'youtube'),
    streamUrl: realUrl || FALLBACK_LIVE_SESSION.streamUrl,
    coachingRoomUrl: isMeetingRoom ? realUrl : w.coachingRoomUrl,
    aspectRatio: w.aspectRatio || '16:9',
    scheduledAt: w.date ? new Date(w.date).getTime() : Date.now(),
    createdAt: typeof w.createdAt === 'number' ? w.createdAt : Date.now()
  };
}

/**
 * Convertit une ligne Supabase `public.live_sessions` en `LiveSession` complète
 */
function mapSupabaseRowToLiveSession(row: any): LiveSession {
  const rawPinned = row?.pinned_product_data || {};
  const meta = rawPinned?._meta || {};
  const pinnedProduct: StoreProductItem | null = rawPinned?.id
    ? (rawPinned as StoreProductItem)
    : (rawPinned?.product || FALLBACK_LIVE_SESSION.pinnedProduct || null);

  const realUrl = (
    row?.stream_url ||
    meta?.streamUrl ||
    meta?.meetingUrl ||
    meta?.socialStreamUrl ||
    ''
  ).trim();

  const plat = String(meta?.platform || '').toLowerCase();
  const isMeetingRoom =
    plat === 'google_meet' ||
    plat === 'zoom' ||
    plat === 'google_classroom' ||
    plat === 'jitsi' ||
    realUrl.includes('meet.google.com') ||
    realUrl.includes('zoom.us') ||
    realUrl.includes('classroom.google.com') ||
    realUrl.includes('meet.jit.si');

  return {
    ...FALLBACK_LIVE_SESSION,
    id: row.id,
    sessionSlug: meta.sessionSlug || row.id,
    storeId: row.tenant_id || meta.storeId || FALLBACK_LIVE_SESSION.storeId,
    storeName: meta.storeName || FALLBACK_LIVE_SESSION.storeName,
    title: row.title || FALLBACK_LIVE_SESSION.title,
    description: row.description ?? FALLBACK_LIVE_SESSION.description,
    sessionMode: meta.sessionMode || (meta.roomMode === 'CLASSROOM' ? 'interactive_class' : 'live_shopping'),
    status: (row.status || 'live') as LiveSessionStatus,
    sourceType: plat === 'facebook' ? 'facebook' : (realUrl.endsWith('.mp4') ? 'mp4' : realUrl.endsWith('.m3u8') ? 'hls' : 'youtube'),
    streamUrl: realUrl || FALLBACK_LIVE_SESSION.streamUrl,
    coachingRoomUrl: meta.coachingRoomUrl || (isMeetingRoom ? realUrl : undefined),
    aspectRatio: meta.aspectRatio || '16:9',
    viewerCount: typeof row.viewer_count === 'number' && row.viewer_count > 0 ? row.viewer_count : FALLBACK_LIVE_SESSION.viewerCount,
    pinnedProductId: row.pinned_product_id !== undefined ? row.pinned_product_id : FALLBACK_LIVE_SESSION.pinnedProductId,
    pinnedProduct: row.pinned_product_id === null ? null : pinnedProduct,
    activeQuiz: meta.activeQuiz || undefined,
    activeAssignment: meta.activeAssignment || undefined,
    handRaisedUsers: Array.isArray(meta.handRaisedUsers) ? meta.handRaisedUsers : undefined,
    pinnedMessage: meta.pinnedMessage || undefined,
    scheduledAt: meta.date ? new Date(meta.date).getTime() : (row.created_at ? new Date(row.created_at).getTime() : Date.now()),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
  };
}

/**
 * Helper interne pour mettre à jour les métadonnées JSONB `_meta` d'une session dans Supabase `public.live_sessions`
 */
async function updateSupabaseSessionMeta(
  sessionId: string,
  metaPatch: Record<string, any>,
  columnPatch: Record<string, any> = {}
): Promise<void> {
  if (!sessionId) return;

  // Mise à jour du cache local immédiate
  if (typeof window !== 'undefined') {
    try {
      const rawSessCache = localStorage.getItem('nana_live_sessions_cache');
      if (rawSessCache) {
        const parsed = JSON.parse(rawSessCache);
        if (parsed && parsed[sessionId]) {
          parsed[sessionId] = { ...parsed[sessionId], ...metaPatch };
          localStorage.setItem('nana_live_sessions_cache', JSON.stringify(parsed));
        }
      }
    } catch {}
  }

  if (!isUuid(sessionId)) return;

  try {
    const { data: existing } = await supabase
      .from('live_sessions')
      .select('pinned_product_data')
      .eq('id', sessionId)
      .maybeSingle();

    const currentPinned = existing?.pinned_product_data || {};
    const currentMeta = currentPinned._meta || {};

    await supabase
      .from('live_sessions')
      .update({
        ...columnPatch,
        pinned_product_data: {
          ...currentPinned,
          _meta: {
            ...currentMeta,
            ...metaPatch
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  } catch (err) {
    console.warn('[liveSessionService] Supabase meta update warning:', err);
  }
}

/**
 * Récupère une session Live par son slug ou son ID depuis Supabase (`public.live_sessions`) et le cache local
 */
export async function getLiveSessionBySlug(slug: string): Promise<LiveSession | null> {
  if (!slug) return FALLBACK_LIVE_SESSION;

  // 1. Recherche prioritaire dans Supabase PostgreSQL (table public.live_sessions)
  try {
    if (isUuid(slug)) {
      const { data: directRow, error: directErr } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', slug)
        .maybeSingle();

      if (!directErr && directRow) {
        return mapSupabaseRowToLiveSession(directRow);
      }
    }

    // Recherche par sessionSlug dans les dernières sessions Supabase
    const { data: recentRows, error: listErr } = await supabase
      .from('live_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!listErr && Array.isArray(recentRows)) {
      const matched = recentRows.find((r: any) => {
        const metaSlug = r?.pinned_product_data?._meta?.sessionSlug;
        return r.id === slug || metaSlug === slug;
      });
      if (matched) {
        return mapSupabaseRowToLiveSession(matched);
      }
    }
  } catch (err) {
    console.warn('[liveSessionService] Supabase lookup fallback to local cache:', err);
  }

  // 2. Vérification dans le cache local (pour résilience hors-ligne ou ID locaux)
  if (typeof window !== 'undefined') {
    try {
      const rawSessCache = localStorage.getItem('nana_live_sessions_cache');
      if (rawSessCache) {
        const parsedSess = JSON.parse(rawSessCache);
        if (parsedSess && parsedSess[slug]) {
          const cached = parsedSess[slug];
          const realUrl = (cached.streamUrl || cached.meetingUrl || cached.socialStreamUrl || '').trim();
          return {
            ...FALLBACK_LIVE_SESSION,
            ...cached,
            streamUrl: realUrl || FALLBACK_LIVE_SESSION.streamUrl,
            id: cached.id || slug,
            sessionSlug: cached.sessionSlug || slug
          };
        }
      }
      const rawWebinars = localStorage.getItem('nana_merchant_webinars');
      if (rawWebinars) {
        const parsedWebinars = JSON.parse(rawWebinars);
        if (Array.isArray(parsedWebinars)) {
          const foundW = parsedWebinars.find((item: any) => item && (item.id === slug || item.sessionSlug === slug));
          if (foundW) {
            return mapWebinarToLiveSession(foundW.id || slug, foundW);
          }
        }
      }
    } catch {}
  }

  // 3. Fallback propre de démonstration
  return {
    ...FALLBACK_LIVE_SESSION,
    sessionSlug: slug,
    id: slug
  };
}

/**
 * Abonnement en temps réel aux mises à jour de la session Live via Supabase Realtime (`public.live_sessions`)
 */
export function subscribeLiveSession(
  sessionId: string,
  onUpdate: (session: LiveSession) => void
): () => void {
  if (!sessionId) return () => {};

  const fetchSession = async () => {
    try {
      if (!isUuid(sessionId)) return;
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (!error && data) {
        onUpdate(mapSupabaseRowToLiveSession(data));
      }
    } catch (err) {
      console.warn('[liveSessionService] Lecture Supabase session :', err);
    }
  };

  fetchSession();

  const channelName = `live_sess_${sessionId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'live_sessions',
        filter: isUuid(sessionId) ? `id=eq.${sessionId}` : undefined,
      },
      (payload) => {
        if (payload.new && (payload.new as any).id === sessionId) {
          onUpdate(mapSupabaseRowToLiveSession(payload.new));
        } else {
          fetchSession();
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Épingler un produit en direct à l'écran chez tous les spectateurs (Supabase `public.live_sessions`)
 */
export async function updatePinnedProduct(
  sessionId: string,
  product: StoreProductItem | null
): Promise<void> {
  if (!sessionId) return;
  try {
    if (!isUuid(sessionId)) return;
    const { data: existing } = await supabase
      .from('live_sessions')
      .select('pinned_product_data')
      .eq('id', sessionId)
      .maybeSingle();

    const currentMeta = existing?.pinned_product_data?._meta || {};

    await supabase
      .from('live_sessions')
      .update({
        pinned_product_id: product ? product.id : null,
        pinned_product_data: {
          ...(product ? { product } : {}),
          _meta: currentMeta
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  } catch (err) {
    console.warn('[liveSessionService] updatePinnedProduct Supabase warning:', err);
  }
}

/**
 * Mettre à jour le statut du direct dans Supabase (`public.live_sessions`)
 */
export async function updateLiveSessionStatus(
  sessionId: string,
  status: LiveSessionStatus
): Promise<void> {
  if (!sessionId) return;
  const normalizedStatus = status === 'live' || status === 'ended' ? status : 'scheduled';
  await updateSupabaseSessionMeta(
    sessionId,
    { status },
    { status: normalizedStatus, is_live: normalizedStatus === 'live' }
  );
}

/**
 * Crée ou met à jour une session Live dans Supabase (`public.live_sessions`)
 */
export async function createLiveSession(data: Partial<LiveSession>): Promise<LiveSession> {
  const sessionId = data.id && isUuid(data.id) ? data.id : generateUuid();
  const slug = data.sessionSlug || sessionId;

  const sessionObj: LiveSession = {
    ...FALLBACK_LIVE_SESSION,
    ...data,
    id: sessionId,
    sessionSlug: slug,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  try {
    await supabase
      .from('live_sessions')
      .upsert({
        id: sessionId,
        tenant_id: sessionObj.storeId || 'default',
        host_id: sessionObj.storeId || 'host',
        title: sessionObj.title,
        description: sessionObj.description,
        is_live: sessionObj.status === 'live',
        viewer_count: sessionObj.viewerCount || 1,
        stream_url: sessionObj.streamUrl,
        status: sessionObj.status === 'ended' ? 'ended' : sessionObj.status === 'live' ? 'live' : 'scheduled',
        pinned_product_id: sessionObj.pinnedProductId || null,
        pinned_product_data: {
          ...(sessionObj.pinnedProduct ? { product: sessionObj.pinnedProduct } : {}),
          _meta: {
            sessionSlug: slug,
            storeId: sessionObj.storeId,
            storeName: sessionObj.storeName,
            sessionMode: sessionObj.sessionMode,
            streamUrl: sessionObj.streamUrl,
            coachingRoomUrl: sessionObj.coachingRoomUrl,
            aspectRatio: sessionObj.aspectRatio
          }
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[liveSessionService] createLiveSession Supabase warning:', err);
  }

  return sessionObj;
}

/**
 * Génère les liens de partage 1-clic pour tous les réseaux sociaux
 */
export function generateLiveShareLinks(
  sessionSlug: string,
  title: string = 'Rejoignez notre Live en Direct',
  storeName: string = 'Boutique Nanasore'
) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nsore.shop';
  const liveUrl = `${origin}/live/${sessionSlug}`;
  const encodedUrl = encodeURIComponent(liveUrl);
  
  const invitationMessage = `🔴 *DIRECT EN COURS SUR ${storeName.toUpperCase()}* 🔴\n\n📺 *${title}*\n\n👉 Cliquez ici pour nous rejoindre immédiatement et profiter des offres exclusives : \n${liveUrl}\n\n⚡ Offres limitées aux spectateurs du direct !`;
  const encodedMsg = encodeURIComponent(invitationMessage);

  return {
    liveUrl,
    invitationMessage,
    whatsappUrl: `https://wa.me/?text=${encodedMsg}`,
    facebookUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMsg}`,
    telegramUrl: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMsg}`,
    tiktokBioUrl: liveUrl
  };
}

// =========================================================================
// 2. CHAT EN TEMPS RÉEL (Supabase table `public.wameet_messages`)
// =========================================================================

const localChatMemory: Record<string, LiveChatMessage[]> = {
  'live-demo-session': [
    {
      id: 'msg-01',
      sessionId: 'live-demo-session',
      senderName: 'Coach Ibrahim',
      senderRole: 'host',
      text: 'Bienvenue à tous sur ce direct ! Posez vos questions dans le chat ou levez la main ✋.',
      isPinned: true,
      createdAt: Date.now() - 1000 * 60 * 12
    },
    {
      id: 'msg-02',
      sessionId: 'live-demo-session',
      senderName: 'Amina (Abidjan)',
      senderRole: 'student',
      text: 'Le son et l\'image sont parfaits depuis la Côte d\'Ivoire ! 👏',
      createdAt: Date.now() - 1000 * 60 * 10
    },
    {
      id: 'msg-03',
      sessionId: 'live-demo-session',
      senderName: 'Moussa K.',
      senderRole: 'student',
      text: 'Est-ce que le pack templates inclut les tunnels pour WhatsApp ?',
      isQuestion: true,
      createdAt: Date.now() - 1000 * 60 * 5
    }
  ]
};

/**
 * Envoie un message dans le chat du direct via Supabase (`public.wameet_messages`)
 */
export async function sendLiveChatMessage(
  sessionId: string,
  message: {
    senderName: string;
    senderId?: string;
    senderRole?: 'host' | 'student' | 'viewer';
    text: string;
    isQuestion?: boolean;
    avatar?: string;
  }
): Promise<LiveChatMessage> {
  const newMsg: LiveChatMessage = {
    id: generateUuid(),
    sessionId,
    senderName: message.senderName || 'Participant',
    senderId: message.senderId || 'participant',
    senderRole: message.senderRole || 'student',
    text: message.text,
    isQuestion: !!message.isQuestion,
    createdAt: Date.now(),
    avatar: message.avatar
  };

  if (!localChatMemory[sessionId]) localChatMemory[sessionId] = [];
  localChatMemory[sessionId].push(newMsg);

  try {
    await supabase.from('wameet_messages').insert({
      id: newMsg.id,
      conversation_id: sessionId,
      sender_id: newMsg.senderId || 'participant',
      sender_name: newMsg.senderName,
      recipient_id: newMsg.senderRole || 'student',
      content: newMsg.text,
      media_url: newMsg.avatar || null,
      media_type: newMsg.isQuestion ? 'question' : 'chat'
    });
  } catch (err) {
    console.warn('[liveSessionService] sendLiveChatMessage Supabase warning (saved locally):', err);
  }

  return newMsg;
}

/**
 * Abonnement en temps réel aux messages du chat via Supabase (`public.wameet_messages`)
 */
export function subscribeLiveChatMessages(
  sessionId: string,
  callback: (messages: LiveChatMessage[]) => void
): () => void {
  const initial = localChatMemory[sessionId] || localChatMemory['live-demo-session'] || [];
  callback([...initial]);

  const fetchMessages = async () => {
    try {
      const { data: rows, error } = await supabase
        .from('wameet_messages')
        .select('*')
        .eq('conversation_id', sessionId)
        .neq('media_type', 'submission')
        .order('created_at', { ascending: true })
        .limit(150);

      if (!error && Array.isArray(rows) && rows.length > 0) {
        const supabaseMsgs: LiveChatMessage[] = rows.map((r: any) => ({
          id: r.id,
          sessionId: r.conversation_id,
          senderName: r.sender_name || 'Participant',
          senderId: r.sender_id,
          senderRole: (r.recipient_id === 'host' || r.recipient_id === 'viewer' ? r.recipient_id : 'student'),
          text: r.content,
          isQuestion: r.media_type === 'question',
          avatar: r.media_url || undefined,
          createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now()
        }));
        localChatMemory[sessionId] = supabaseMsgs;
        callback(supabaseMsgs);
      }
    } catch (err) {
      console.warn('[liveSessionService] Lecture Supabase chat messages :', err);
    }
  };

  fetchMessages();

  const channelName = `live_chat_${sessionId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'wameet_messages',
        filter: `conversation_id=eq.${sessionId}`,
      },
      () => {
        fetchMessages();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Épingle ou désépingle un message du formateur tout en haut du chat
 */
export async function pinLiveChatMessage(sessionId: string, message: LiveChatMessage | null): Promise<void> {
  await updateSupabaseSessionMeta(sessionId, { pinnedMessage: message });
}

// =========================================================================
// 3. LEVÉE DE MAIN EN DIRECT (HAND RAISING - Supabase `public.live_sessions`)
// =========================================================================

export async function raiseHandInSession(sessionId: string, user: HandRaisedUser): Promise<void> {
  if (!sessionId || !isUuid(sessionId)) return;
  try {
    const { data } = await supabase
      .from('live_sessions')
      .select('pinned_product_data')
      .eq('id', sessionId)
      .maybeSingle();

    const currentList: HandRaisedUser[] = data?.pinned_product_data?._meta?.handRaisedUsers || [];
    const filtered = currentList.filter(u => u.id !== user.id);
    await updateSupabaseSessionMeta(sessionId, { handRaisedUsers: [...filtered, user] });
  } catch (err) {
    console.warn('[liveSessionService] raiseHandInSession Supabase warning:', err);
  }
}

export async function lowerHandInSession(sessionId: string, userId: string): Promise<void> {
  if (!sessionId || !isUuid(sessionId)) return;
  try {
    const { data } = await supabase
      .from('live_sessions')
      .select('pinned_product_data')
      .eq('id', sessionId)
      .maybeSingle();

    const currentList: HandRaisedUser[] = data?.pinned_product_data?._meta?.handRaisedUsers || [];
    const updated = currentList.filter(u => u.id !== userId);
    await updateSupabaseSessionMeta(sessionId, { handRaisedUsers: updated });
  } catch (err) {
    console.warn('[liveSessionService] lowerHandInSession Supabase warning:', err);
  }
}

// =========================================================================
// 4. QUIZ EN DIRECT ÉPINGLÉ (PINNED LIVE QUIZ - Supabase `public.live_sessions`)
// =========================================================================

export async function pinLiveQuiz(sessionId: string, quiz: LiveQuizQuestion): Promise<void> {
  await updateSupabaseSessionMeta(sessionId, {
    activeQuiz: {
      ...quiz,
      isActive: true,
      startedAt: Date.now(),
      totalVotes: 0,
      votesBreakdown: {}
    }
  });
}

export async function closeLiveQuiz(sessionId: string): Promise<void> {
  await updateSupabaseSessionMeta(sessionId, { activeQuiz: null });
}

export async function submitQuizAnswer(
  sessionId: string,
  quizId: string,
  response: {
    studentName: string;
    studentId?: string;
    selectedOptionId: string;
    isCorrect: boolean;
  }
): Promise<void> {
  if (!sessionId || !isUuid(sessionId)) return;
  const respObj: LiveQuizResponse = {
    id: generateUuid(),
    quizId,
    studentName: response.studentName,
    studentId: response.studentId || 'anon',
    selectedOptionId: response.selectedOptionId,
    isCorrect: response.isCorrect,
    createdAt: Date.now()
  };

  try {
    const { data } = await supabase
      .from('live_sessions')
      .select('pinned_product_data')
      .eq('id', sessionId)
      .maybeSingle();

    const activeQuiz = data?.pinned_product_data?._meta?.activeQuiz as LiveQuizQuestion | undefined;
    const quizResponses: LiveQuizResponse[] = data?.pinned_product_data?._meta?.quizResponses || [];

    if (activeQuiz && activeQuiz.id === quizId) {
      const breakdown = { ...(activeQuiz.votesBreakdown || {}) };
      breakdown[response.selectedOptionId] = (breakdown[response.selectedOptionId] || 0) + 1;
      const totalVotes = (activeQuiz.totalVotes || 0) + 1;

      await updateSupabaseSessionMeta(sessionId, {
        activeQuiz: {
          ...activeQuiz,
          votesBreakdown: breakdown,
          totalVotes
        },
        quizResponses: [...quizResponses, respObj]
      });
    }
  } catch (err) {
    console.warn('[liveSessionService] submitQuizAnswer Supabase warning:', err);
  }
}

// =========================================================================
// 5. DEVOIR, SUPPORT PDF & SOUMISSIONS ÉLÈVES (Supabase)
// =========================================================================

const localSubmissionsMemory: Record<string, LiveSubmission[]> = {
  'live-demo-session': [
    {
      id: 'sub-01',
      assignmentId: 'assign-demo-1',
      studentName: 'Fatou Traoré',
      studentContact: '+22507889900',
      studentPhone: '+22507889900',
      fileName: 'Devoir_Tunnel_Vente_Fatou.pdf',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      textContent: 'Voici la structure de mon offre irrésistible et le calcul de marge pour les packs beauté.',
      submittedAt: Date.now() - 1000 * 60 * 15,
      grade: '19/20 - Excellent travail !',
      feedback: 'Très bon ciblage et offre bien packagée.',
      status: 'graded'
    }
  ]
};

export async function publishLiveAssignment(
  sessionId: string,
  assignment: Omit<LiveAssignment, 'isActive' | 'createdAt' | 'submissionsCount'>
): Promise<void> {
  const assignmentObj: LiveAssignment = {
    ...assignment,
    isActive: true,
    createdAt: Date.now(),
    submissionsCount: 0
  };
  await updateSupabaseSessionMeta(sessionId, { activeAssignment: assignmentObj });
}

export async function closeLiveAssignment(sessionId: string): Promise<void> {
  await updateSupabaseSessionMeta(sessionId, { activeAssignment: null });
}

export async function submitLiveAssignmentWork(
  sessionId: string,
  submission: Omit<LiveSubmission, 'id' | 'submittedAt' | 'status'>
): Promise<LiveSubmission> {
  const subObj: LiveSubmission = {
    ...submission,
    id: generateUuid(),
    submittedAt: Date.now(),
    status: 'submitted'
  };

  if (!localSubmissionsMemory[sessionId]) localSubmissionsMemory[sessionId] = [];
  localSubmissionsMemory[sessionId].push(subObj);

  try {
    await supabase.from('wameet_messages').insert({
      id: subObj.id,
      conversation_id: sessionId,
      sender_id: subObj.studentContact || 'student',
      sender_name: subObj.studentName,
      recipient_id: subObj.assignmentId,
      content: JSON.stringify(subObj),
      media_url: subObj.fileUrl || null,
      media_type: 'submission'
    });

    if (isUuid(sessionId)) {
      const { data } = await supabase
        .from('live_sessions')
        .select('pinned_product_data')
        .eq('id', sessionId)
        .maybeSingle();

      const activeAssignment = data?.pinned_product_data?._meta?.activeAssignment;
      if (activeAssignment) {
        await updateSupabaseSessionMeta(sessionId, {
          activeAssignment: {
            ...activeAssignment,
            submissionsCount: (activeAssignment.submissionsCount || 0) + 1
          }
        });
      }
    }
  } catch (err) {
    console.warn('[liveSessionService] submitLiveAssignmentWork Supabase warning (saved locally):', err);
  }

  return subObj;
}

export function subscribeLiveSubmissions(
  sessionId: string,
  callback: (submissions: LiveSubmission[]) => void
): () => void {
  const initial = localSubmissionsMemory[sessionId] || localSubmissionsMemory['live-demo-session'] || [];
  callback([...initial]);

  const fetchSubs = async () => {
    try {
      const { data: rows, error } = await supabase
        .from('wameet_messages')
        .select('*')
        .eq('conversation_id', sessionId)
        .eq('media_type', 'submission')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && Array.isArray(rows) && rows.length > 0) {
        const subs: LiveSubmission[] = rows.map((r: any) => {
          try {
            return { ...JSON.parse(r.content), id: r.id };
          } catch {
            return {
              id: r.id,
              assignmentId: r.recipient_id || 'assign',
              studentName: r.sender_name || 'Élève',
              studentContact: r.sender_id || '',
              fileUrl: r.media_url || undefined,
              textContent: r.content,
              submittedAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
              status: 'submitted'
            } as LiveSubmission;
          }
        });
        localSubmissionsMemory[sessionId] = subs;
        callback(subs);
      }
    } catch (err) {
      console.warn('[liveSessionService] Lecture Supabase submissions :', err);
    }
  };

  fetchSubs();

  const channelName = `live_subs_${sessionId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'wameet_messages',
        filter: `conversation_id=eq.${sessionId}`,
      },
      () => {
        fetchSubs();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function gradeLiveSubmission(
  sessionId: string,
  submissionId: string,
  grade: string,
  feedback?: string
): Promise<void> {
  let updatedTarget: LiveSubmission | undefined;
  if (localSubmissionsMemory[sessionId]) {
    const target = localSubmissionsMemory[sessionId].find(s => s.id === submissionId);
    if (target) {
      target.grade = grade;
      target.feedback = feedback;
      target.status = 'graded';
      updatedTarget = target;
    }
  }

  try {
    if (updatedTarget && isUuid(submissionId)) {
      await supabase
        .from('wameet_messages')
        .update({ content: JSON.stringify(updatedTarget) })
        .eq('id', submissionId);
    }
  } catch (err) {
    console.warn('[liveSessionService] gradeLiveSubmission Supabase warning:', err);
  }
}

export async function updateCoachingRoom(sessionId: string, roomUrl: string): Promise<void> {
  await updateSupabaseSessionMeta(sessionId, { coachingRoomUrl: roomUrl });
}
