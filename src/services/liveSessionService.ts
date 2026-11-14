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
export const DEMO_LIVE_PRODUCTS: StoreProductItem[] = [
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
    category: 'Outils & Templates',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    stock: 999,
    shortDescription: 'Tous nos scripts de closing WhatsApp et bannières publicitaires prêts à copier-coller.'
  }
];

// Session de repli par défaut ultra-complète
export const FALLBACK_LIVE_SESSION: LiveSession = {
  id: 'live-demo-session',
  storeId: 'demo-store-001',
  storeName: 'Académie Business Afrique',
  sessionSlug: 'masterclass-live-2026',
  title: 'Masterclass Direct : Lancer et Rentabiliser son Business E-Commerce en 2026',
  description: 'Posez vos questions en direct, téléchargez vos supports de cours, répondez aux quiz et commandez vos accès exclusifs avec Orange Money, Wave, Moov et MTN.',
  sessionMode: 'webinar_formation',
  status: 'live',
  sourceType: 'youtube',
  streamUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  viewerCount: 284,
  pinnedProductId: 'live-prod-01',
  pinnedProduct: DEMO_LIVE_PRODUCTS[0],
  products: DEMO_LIVE_PRODUCTS,
  scheduledAt: Date.now() - 1000 * 60 * 20,
  whatsappPhone: '+2250700000000',
  hostName: 'Coach Ibrahim',
  hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  allowChat: true,
  createdAt: Date.now()
};

/**
 * Récupère une session Live par son slug ou son ID depuis Supabase
 */
export async function getLiveSessionBySlug(slug: string): Promise<LiveSession | null> {
  if (!slug) return FALLBACK_LIVE_SESSION;

  try {
    // 1. Recherche par ID direct
    const { data: byId } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('id', slug)
      .maybeSingle();

    if (byId) {
      return {
        id: byId.id,
        storeId: byId.tenant_id,
        storeName: 'Boutique Nanasore',
        sessionSlug: slug,
        title: byId.title,
        description: byId.description || '',
        sessionMode: 'live_shopping',
        status: byId.status as any,
        sourceType: 'youtube',
        streamUrl: byId.stream_url || '',
        viewerCount: byId.viewer_count || 42,
        pinnedProductId: byId.pinned_product_id,
        pinnedProduct: byId.pinned_product_data,
        scheduledAt: new Date(byId.created_at).getTime(),
        allowChat: true,
        createdAt: new Date(byId.created_at).getTime()
      };
    }
  } catch (err) {
    console.warn('[liveSessionService] Supabase offline or error, using fallback session:', err);
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
 * Abonnement en temps réel aux mises à jour de la session Live (spectateurs, produit épinglé, etc.)
 * Utilise Supabase Realtime broadcast & postgres_changes sur live_sessions
 */
export function subscribeLiveSession(
  sessionId: string,
  onUpdate: (session: LiveSession) => void
): () => void {
  if (!sessionId) return () => {};

  const fetchSession = async () => {
    try {
      const { data: supaLive } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (supaLive) {
        onUpdate({
          id: supaLive.id,
          storeId: supaLive.tenant_id,
          storeName: 'Boutique Nanasore',
          sessionSlug: sessionId,
          title: supaLive.title,
          description: supaLive.description || '',
          sessionMode: 'live_shopping',
          status: supaLive.status as any,
          sourceType: 'youtube',
          streamUrl: supaLive.stream_url || '',
          viewerCount: supaLive.viewer_count || 42,
          pinnedProductId: supaLive.pinned_product_id,
          pinnedProduct: supaLive.pinned_product_data,
          scheduledAt: new Date(supaLive.created_at).getTime(),
          allowChat: true,
          createdAt: new Date(supaLive.created_at).getTime()
        });
      }
    } catch (_e) {}
  };

  fetchSession();

  // Écouteur Supabase ciblé sur les modifications de la table live_sessions
  const channelName = `live_sess_pub_${sessionId}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_sessions',
        filter: `id=eq.${sessionId}`,
      },
      (payload) => {
        if (payload.new) {
          const row = payload.new as any;
          onUpdate({
            id: row.id,
            title: row.title,
            status: row.status,
            viewerCount: row.viewer_count,
            pinnedProductId: row.pinned_product_id,
            pinnedProduct: row.pinned_product_data,
            streamUrl: row.stream_url
          } as any);
        }
      }
    )
    .on(
      'broadcast',
      { event: 'session_update' },
      ({ payload }) => {
        if (payload) {
          onUpdate(payload);
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

  // 1. Mise à jour Supabase SQL prioritaire
  try {
    await supabase
      .from('live_sessions')
      .update({
        pinned_product_id: product ? product.id : null,
        pinned_product_data: product || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  } catch (supaErr) {
    console.warn('[liveSessionService] updatePinnedProduct Supabase warning:', supaErr);
  }

  // 2. Diffusion Realtime Broadcast instantanée pour tous les spectateurs (0 latence)
  try {
    const channel = supabase.channel(`live_sess_pub_${sessionId}`);
    channel.send({
      type: 'broadcast',
      event: 'session_update',
      payload: {
        pinnedProductId: product ? product.id : null,
        pinnedProduct: product || null
      }
    });
  } catch (_bErr) {}
}

/**
 * Mettre à jour le statut du direct dans Supabase
 */
export async function updateLiveSessionStatus(
  sessionId: string,
  status: LiveSessionStatus
): Promise<void> {
  if (!sessionId) return;

  try {
    await supabase
      .from('live_sessions')
      .update({
        status,
        is_live: status === 'live',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  } catch (supaErr) {
    console.warn('[liveSessionService] updateLiveSessionStatus Supabase warning:', supaErr);
  }
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
        tenant_id: data.storeId || 'default',
        host_id: data.hostName || 'host-default',
        title: data.title || 'Session Directe',
        description: data.description || '',
        status: data.status || 'scheduled',
        is_live: data.status === 'live',
        stream_url: data.streamUrl || '',
        viewer_count: data.viewerCount || 0,
        pinned_product_id: data.pinnedProductId || null,
        pinned_product_data: data.pinnedProduct || null,
        updated_at: new Date().toISOString()
      });
  } catch (supaErr) {
    console.warn('[liveSessionService] createLiveSession Supabase warning:', supaErr);
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
// 2. CHAT EN TEMPS RÉEL (REALTIME LIVE CHAT)
// =========================================================================

const localChatMemory: Record<string, LiveChatMessage[]> = {
  'live-demo-session': [
    {
      id: 'demo-1',
      sessionId: 'live-demo-session',
      senderName: 'Fatou Diallo',
      senderRole: 'student',
      text: 'Bonsoir Coach ! Les diapositives seront-elles téléchargeables après la session ?',
      isQuestion: true,
      createdAt: Date.now() - 1000 * 60 * 12
    },
    {
      id: 'demo-2',
      sessionId: 'live-demo-session',
      senderName: 'Coach Ibrahim',
      senderRole: 'instructor',
      text: 'Oui absolument Fatou ! Le PDF complet est disponible dans l\'onglet Devoirs & Supports en haut.',
      isQuestion: false,
      createdAt: Date.now() - 1000 * 60 * 10
    },
    {
      id: 'demo-3',
      sessionId: 'live-demo-session',
      senderName: 'Moussa Koné',
      senderRole: 'student',
      text: 'Je viens de commander le Pack VIP via Wave, validation instantanée reçue merci ! 🎉',
      isQuestion: false,
      createdAt: Date.now() - 1000 * 60 * 4
    }
  ]
};

/**
 * Envoi d'un message dans le chat du direct via Supabase Realtime Broadcast
 */
export async function sendLiveChatMessage(
  sessionId: string,
  message: {
    senderName: string;
    senderId?: string;
    senderRole?: 'instructor' | 'student' | 'moderator';
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
    const channel = supabase.channel(`live_chat_chan_${sessionId}`);
    channel.send({
      type: 'broadcast',
      event: 'chat_msg',
      payload: newMsg
    });
  } catch (err) {
    console.warn('[liveSessionService] sendLiveChatMessage Supabase broadcast warning:', err);
  }

  return newMsg;
}

/**
 * Abonnement en temps réel aux messages du chat via Supabase Broadcast
 */
export function subscribeLiveChatMessages(
  sessionId: string,
  callback: (messages: LiveChatMessage[]) => void
): () => void {
  const initial = localChatMemory[sessionId] || localChatMemory['live-demo-session'] || [];
  callback([...initial]);

  const channelName = `live_chat_chan_${sessionId}`;
  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'chat_msg' }, ({ payload }) => {
      if (payload && payload.sessionId === sessionId) {
        if (!localChatMemory[sessionId]) localChatMemory[sessionId] = [];
        localChatMemory[sessionId].push(payload as LiveChatMessage);
        callback([...localChatMemory[sessionId]]);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Épingle ou désépingle un message du formateur tout en haut du chat
 */
export async function pinLiveChatMessage(sessionId: string, message: LiveChatMessage | null): Promise<void> {
  try {
    await supabase
      .from('live_sessions')
      .update({ pinned_product_data: message })
      .eq('id', sessionId);
  } catch (err) {
    console.warn('[liveSessionService] pinLiveChatMessage warning:', err);
  }
}

// =========================================================================
// 3. LEVÉE DE MAIN EN DIRECT (HAND RAISING - Supabase `public.live_sessions`)
// =========================================================================

const localHandRaisedMemory: Record<string, HandRaisedUser[]> = {};

/**
 * Lever la main pour intervenir en direct
 */
export async function raiseHandInSession(sessionId: string, user: HandRaisedUser): Promise<void> {
  if (!localHandRaisedMemory[sessionId]) localHandRaisedMemory[sessionId] = [];
  localHandRaisedMemory[sessionId] = localHandRaisedMemory[sessionId].filter(u => u.id !== user.id);
  localHandRaisedMemory[sessionId].push(user);

  try {
    const channel = supabase.channel(`live_hands_${sessionId}`);
    channel.send({
      type: 'broadcast',
      event: 'hand_raised',
      payload: user
    });
  } catch (err) {
    console.warn('[liveSessionService] raiseHandInSession Supabase warning:', err);
  }
}

export async function lowerHandInSession(sessionId: string, userId: string): Promise<void> {
  if (localHandRaisedMemory[sessionId]) {
    localHandRaisedMemory[sessionId] = localHandRaisedMemory[sessionId].filter(u => u.id !== userId);
  }

  try {
    const channel = supabase.channel(`live_hands_${sessionId}`);
    channel.send({
      type: 'broadcast',
      event: 'hand_lowered',
      payload: { userId }
    });
  } catch (err) {
    console.warn('[liveSessionService] lowerHandInSession Supabase warning:', err);
  }
}

// =========================================================================
// 4. QUIZ EN DIRECT ÉPINGLÉ (PINNED LIVE QUIZ - Supabase `public.live_sessions`)
// =========================================================================

export async function pinLiveQuiz(sessionId: string, quiz: LiveQuizQuestion): Promise<void> {
  const quizPayload = {
    ...quiz,
    isActive: true,
    startedAt: Date.now(),
    totalVotes: 0,
    votesBreakdown: {}
  };

  try {
    const channel = supabase.channel(`live_quiz_${sessionId}`);
    channel.send({
      type: 'broadcast',
      event: 'quiz_pinned',
      payload: quizPayload
    });
  } catch (err) {
    console.warn('[liveSessionService] pinLiveQuiz warning:', err);
  }
}

export async function closeLiveQuiz(sessionId: string): Promise<void> {
  try {
    const channel = supabase.channel(`live_quiz_${sessionId}`);
    channel.send({
      type: 'broadcast',
      event: 'quiz_closed',
      payload: {}
    });
  } catch (err) {
    console.warn('[liveSessionService] closeLiveQuiz warning:', err);
  }
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
    const channel = supabase.channel(`live_quiz_${sessionId}`);
    channel.send({
      type: 'broadcast',
      event: 'quiz_answer',
      payload: respObj
    });
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

  try {
    const channel = supabase.channel(`live_assign_${sessionId}`);
    channel.send({
      type: 'broadcast',
      event: 'assignment_published',
      payload: assignmentObj
    });
  } catch (err) {
    console.warn('[liveSessionService] publishLiveAssignment warning:', err);
  }
}

export async function closeLiveAssignment(sessionId: string): Promise<void> {
  try {
    const channel = supabase.channel(`live_assign_${sessionId}`);
    channel.send({
      type: 'broadcast',
      event: 'assignment_closed',
      payload: {}
    });
  } catch (err) {
    console.warn('[liveSessionService] closeLiveAssignment warning:', err);
  }
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
    const channel = supabase.channel(`live_assign_${sessionId}`);
    channel.send({
      type: 'broadcast',
      event: 'work_submitted',
      payload: subObj
    });
  } catch (err) {
    console.warn('[liveSessionService] submitLiveAssignmentWork warning:', err);
  }

  return subObj;
}

export function subscribeLiveSubmissions(
  sessionId: string,
  callback: (submissions: LiveSubmission[]) => void
): () => void {
  const initial = localSubmissionsMemory[sessionId] || localSubmissionsMemory['live-demo-session'] || [];
  callback([...initial]);

  const channelName = `live_assign_${sessionId}`;
  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'work_submitted' }, ({ payload }) => {
      if (payload) {
        if (!localSubmissionsMemory[sessionId]) localSubmissionsMemory[sessionId] = [];
        localSubmissionsMemory[sessionId].unshift(payload as LiveSubmission);
        callback([...localSubmissionsMemory[sessionId]]);
      }
    })
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
    const channel = supabase.channel(`live_assign_${sessionId}`);
    channel.send({
      type: 'broadcast',
      event: 'work_graded',
      payload: { submissionId, grade, feedback }
    });
  } catch (err) {
    console.warn('[liveSessionService] gradeLiveSubmission Supabase warning:', err);
  }
}

export async function updateCoachingRoom(sessionId: string, roomUrl: string): Promise<void> {
  try {
    await supabase
      .from('live_sessions')
      .update({ stream_url: roomUrl })
      .eq('id', sessionId);
  } catch (err) {
    console.warn('[liveSessionService] updateCoachingRoom warning:', err);
  }
}
