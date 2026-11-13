import { db } from '../firebaseConfig';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  addDoc, 
  orderBy, 
  limit, 
  deleteDoc 
} from 'firebase/firestore';
import { supabase } from '../lib/supabase';
import { 
  LiveSession, 
  LiveSessionMode, 
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
  streamUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', // Stream live démo stable
  posterUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1080&auto=format&fit=crop&q=85',
  aspectRatio: '16:9',
  scheduledAt: Date.now(),
  startedAt: Date.now() - 1000 * 60 * 18,
  viewerCount: 168,
  countdownTitle: '⏳ Tarif Flash du Direct garanti pendant :',
  countdownEndsAt: Date.now() + 1000 * 3600 * 2, // 2h de chrono
  pinnedProductId: 'live-prod-01',
  pinnedProduct: DEMO_LIVE_PRODUCTS[0],
  products: DEMO_LIVE_PRODUCTS,
  whatsappPhone: '+2250700000000',
  hostName: 'Coach Ibrahim',
  hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  allowChat: true,
  createdAt: Date.now()
};

/**
 * Convertit un document webinar (CreateWebinarModal) en LiveSession complète avec le vrai lien collé
 */
function mapWebinarToLiveSession(id: string, w: any): LiveSession {
  const realUrl = (w.streamUrl || w.meetingUrl || w.socialStreamUrl || '').trim();
  const plat = String(w.platform || '').toLowerCase();
  const isMeetingRoom = plat === 'google_meet' || plat === 'zoom' || plat === 'google_classroom' || plat === 'jitsi' ||
    realUrl.includes('meet.google.com') || realUrl.includes('zoom.us') || realUrl.includes('classroom.google.com') || realUrl.includes('meet.jit.si');

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
 * Récupère une session Live par son slug ou son ID depuis Firestore (live_sessions + webinars) et le cache local
 */
export async function getLiveSessionBySlug(slug: string): Promise<LiveSession | null> {
  if (!slug) return FALLBACK_LIVE_SESSION;

  // 0. Vérification rapide dans le cache local (pour un accès instantané après création)
  if (typeof window !== 'undefined') {
    try {
      const rawSessCache = localStorage.getItem('nana_live_sessions_cache');
      if (rawSessCache) {
        const parsedSess = JSON.parse(rawSessCache);
        if (parsedSess && parsedSess[slug]) {
          return {
            ...FALLBACK_LIVE_SESSION,
            ...parsedSess[slug],
            id: parsedSess[slug].id || slug,
            sessionSlug: parsedSess[slug].sessionSlug || slug
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

  try {
    // 1. Recherche par sessionSlug dans live_sessions
    const sessionsRef = collection(db, 'live_sessions');
    const q = query(sessionsRef, where('sessionSlug', '==', slug));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docData = snapshot.docs[0].data() as any;
      const realUrl = (docData.streamUrl || docData.meetingUrl || docData.socialStreamUrl || '').trim();
      return {
        ...FALLBACK_LIVE_SESSION,
        ...docData,
        streamUrl: realUrl || docData.streamUrl || FALLBACK_LIVE_SESSION.streamUrl,
        id: snapshot.docs[0].id
      };
    }

    // 2. Recherche par ID direct dans live_sessions
    const docRef = doc(db, 'live_sessions', slug);
    const directSnap = await getDoc(docRef);
    if (directSnap.exists()) {
      const docData = directSnap.data() as any;
      const realUrl = (docData.streamUrl || docData.meetingUrl || docData.socialStreamUrl || '').trim();
      return {
        ...FALLBACK_LIVE_SESSION,
        ...docData,
        streamUrl: realUrl || docData.streamUrl || FALLBACK_LIVE_SESSION.streamUrl,
        id: directSnap.id
      };
    }

    // 3. Recherche par ID direct dans webinars (sessions créées via le Générateur de Live CreateWebinarModal)
    const webinarRef = doc(db, 'webinars', slug);
    const webinarSnap = await getDoc(webinarRef);
    if (webinarSnap.exists()) {
      return mapWebinarToLiveSession(webinarSnap.id, webinarSnap.data());
    }
  } catch (err) {
    console.warn('[liveSessionService] Firestore offline or error, using fallback session:', err);
  }

  // Fallback propre pour la démonstration
  return {
    ...FALLBACK_LIVE_SESSION,
    sessionSlug: slug,
    id: `session-${slug}`
  };
}

/**
 * Abonnement en temps réel aux mises à jour de la session Live (spectateurs, produit épinglé, etc.)
 */
export function subscribeLiveSession(
  sessionId: string,
  onUpdate: (session: LiveSession) => void
): () => void {
  if (!sessionId) return () => {};

  const fetchSession = async () => {
    try {
      const docRef = doc(db, 'live_sessions', sessionId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as LiveSession;
        onUpdate({ ...data, id: snap.id });
      }
    } catch (err) {
      console.warn('[liveSessionService] Lecture session :', err);
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
        table: 'wameet_messages',
        filter: `chat_id=eq.${sessionId}`,
      },
      () => {
        fetchSession();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Épingler un produit en direct à l'écran chez tous les spectateurs
 */
export async function updatePinnedProduct(
  sessionId: string,
  product: StoreProductItem | null
): Promise<void> {
  if (!sessionId) return;
  try {
    const docRef = doc(db, 'live_sessions', sessionId);
    await updateDoc(docRef, {
      pinnedProductId: product ? product.id : null,
      pinnedProduct: product || null,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('[liveSessionService] updatePinnedProduct warning (local sync):', err);
  }
}

/**
 * Mettre à jour le statut du direct
 */
export async function updateLiveSessionStatus(
  sessionId: string,
  status: LiveSessionStatus
): Promise<void> {
  if (!sessionId) return;
  try {
    const docRef = doc(db, 'live_sessions', sessionId);
    await updateDoc(docRef, {
      status,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('[liveSessionService] updateLiveSessionStatus warning:', err);
  }
}

/**
 * Crée ou met à jour une session Live
 */
export async function createLiveSession(data: Partial<LiveSession>): Promise<LiveSession> {
  const sessionId = data.id || `live_${Date.now()}`;
  const slug = data.sessionSlug || data.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || `session-${Date.now()}`;

  const sessionObj: LiveSession = {
    ...FALLBACK_LIVE_SESSION,
    ...data,
    id: sessionId,
    sessionSlug: slug,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  try {
    const docRef = doc(db, 'live_sessions', sessionId);
    await setDoc(docRef, sessionObj, { merge: true });
  } catch (err) {
    console.warn('[liveSessionService] createLiveSession warning (local only):', err);
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
// 2. CHAT EN TEMPS RÉEL (live_sessions/{sessionId}/messages)
// =========================================================================

// Mémoire locale de secours pour le chat en mode prévisualisation / hors-ligne
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
 * Envoie un message dans le chat du direct
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
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sessionId,
    senderName: message.senderName || 'Participant',
    senderId: message.senderId,
    senderRole: message.senderRole || 'student',
    text: message.text,
    isQuestion: !!message.isQuestion,
    createdAt: Date.now(),
    avatar: message.avatar
  };

  // Ajout local immédiat
  if (!localChatMemory[sessionId]) localChatMemory[sessionId] = [];
  localChatMemory[sessionId].push(newMsg);

  try {
    const colRef = collection(db, 'live_sessions', sessionId, 'messages');
    await addDoc(colRef, newMsg);
  } catch (err) {
    console.warn('[liveSessionService] sendLiveChatMessage firestore warning (saved locally):', err);
  }

  return newMsg;
}

/**
 * Abonnement en temps réel aux messages du chat
 */
export function subscribeLiveChatMessages(
  sessionId: string,
  callback: (messages: LiveChatMessage[]) => void
): () => void {
  const initial = localChatMemory[sessionId] || localChatMemory['live-demo-session'] || [];
  callback([...initial]);

  const fetchMessages = async () => {
    try {
      const colRef = collection(db, 'live_sessions', sessionId, 'messages');
      const q = query(colRef, orderBy('createdAt', 'asc'), limit(150));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const firestoreMsgs: LiveChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          firestoreMsgs.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        callback(firestoreMsgs);
      }
    } catch (err) {
      console.warn('[liveSessionService] Lecture chat messages :', err);
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
        filter: `chat_id=eq.${sessionId}`,
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
  try {
    const docRef = doc(db, 'live_sessions', sessionId);
    await updateDoc(docRef, { pinnedMessage: message });
  } catch (err) {
    console.warn('[liveSessionService] pinLiveChatMessage warning:', err);
  }
}

// =========================================================================
// 3. LEVÉE DE MAIN EN DIRECT (HAND RAISING)
// =========================================================================

/**
 * Lever la main pour intervenir en direct
 */
export async function raiseHandInSession(sessionId: string, user: HandRaisedUser): Promise<void> {
  try {
    const sessionDoc = doc(db, 'live_sessions', sessionId);
    const snap = await getDoc(sessionDoc);
    const currentList: HandRaisedUser[] = snap.exists() ? (snap.data().handRaisedUsers || []) : [];
    
    // Éviter les doublons
    const filtered = currentList.filter(u => u.id !== user.id);
    const updated = [...filtered, user];
    
    await updateDoc(sessionDoc, { handRaisedUsers: updated });
  } catch (err) {
    console.warn('[liveSessionService] raiseHandInSession warning:', err);
  }
}

/**
 * Baisser la main
 */
export async function lowerHandInSession(sessionId: string, userId: string): Promise<void> {
  try {
    const sessionDoc = doc(db, 'live_sessions', sessionId);
    const snap = await getDoc(sessionDoc);
    const currentList: HandRaisedUser[] = snap.exists() ? (snap.data().handRaisedUsers || []) : [];
    const updated = currentList.filter(u => u.id !== userId);
    await updateDoc(sessionDoc, { handRaisedUsers: updated });
  } catch (err) {
    console.warn('[liveSessionService] lowerHandInSession warning:', err);
  }
}

// =========================================================================
// 4. QUIZ EN DIRECT ÉPINGLÉ (PINNED LIVE QUIZ)
// =========================================================================

/**
 * Épingle et lance un Quiz en direct chez tous les élèves
 */
export async function pinLiveQuiz(sessionId: string, quiz: LiveQuizQuestion): Promise<void> {
  try {
    const sessionDoc = doc(db, 'live_sessions', sessionId);
    await updateDoc(sessionDoc, {
      activeQuiz: {
        ...quiz,
        isActive: true,
        startedAt: Date.now(),
        totalVotes: 0,
        votesBreakdown: {}
      }
    });
  } catch (err) {
    console.warn('[liveSessionService] pinLiveQuiz warning:', err);
  }
}

/**
 * Clôture le Quiz en direct
 */
export async function closeLiveQuiz(sessionId: string): Promise<void> {
  try {
    const sessionDoc = doc(db, 'live_sessions', sessionId);
    await updateDoc(sessionDoc, { activeQuiz: null });
  } catch (err) {
    console.warn('[liveSessionService] closeLiveQuiz warning:', err);
  }
}

/**
 * Soumission de réponse élève au Quiz
 */
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
  const respObj: LiveQuizResponse = {
    id: `resp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    quizId,
    studentName: response.studentName,
    studentId: response.studentId || 'anon',
    selectedOptionId: response.selectedOptionId,
    isCorrect: response.isCorrect,
    createdAt: Date.now()
  };

  try {
    // 1. Sauvegarder dans la sous-collection quiz_responses
    const colRef = collection(db, 'live_sessions', sessionId, 'quiz_responses');
    await addDoc(colRef, respObj);

    // 2. Mettre à jour les stats du quiz dans le doc session
    const sessionDoc = doc(db, 'live_sessions', sessionId);
    const snap = await getDoc(sessionDoc);
    if (snap.exists()) {
      const activeQuiz = snap.data().activeQuiz as LiveQuizQuestion;
      if (activeQuiz && activeQuiz.id === quizId) {
        const breakdown = activeQuiz.votesBreakdown || {};
        breakdown[response.selectedOptionId] = (breakdown[response.selectedOptionId] || 0) + 1;
        const totalVotes = (activeQuiz.totalVotes || 0) + 1;
        await updateDoc(sessionDoc, {
          'activeQuiz.votesBreakdown': breakdown,
          'activeQuiz.totalVotes': totalVotes
        });
      }
    }
  } catch (err) {
    console.warn('[liveSessionService] submitQuizAnswer warning:', err);
  }
}

// =========================================================================
// 5. DEVOIR, SUPPORT PDF & SOUMISSIONS ÉLÈVES (ASSIGNMENTS & SUBMISSIONS)
// =========================================================================

// Mémoire locale de secours pour les devoirs soumis
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

/**
 * Publie un devoir ou support PDF en direct
 */
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
    const sessionDoc = doc(db, 'live_sessions', sessionId);
    await updateDoc(sessionDoc, { activeAssignment: assignmentObj });
  } catch (err) {
    console.warn('[liveSessionService] publishLiveAssignment warning:', err);
  }
}

/**
 * Clôture le devoir actif
 */
export async function closeLiveAssignment(sessionId: string): Promise<void> {
  try {
    const sessionDoc = doc(db, 'live_sessions', sessionId);
    await updateDoc(sessionDoc, { activeAssignment: null });
  } catch (err) {
    console.warn('[liveSessionService] closeLiveAssignment warning:', err);
  }
}

/**
 * Soumission du devoir par l'élève (PDF ou texte)
 */
export async function submitLiveAssignmentWork(
  sessionId: string,
  submission: Omit<LiveSubmission, 'id' | 'submittedAt' | 'status'>
): Promise<LiveSubmission> {
  const subObj: LiveSubmission = {
    ...submission,
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    submittedAt: Date.now(),
    status: 'submitted'
  };

  if (!localSubmissionsMemory[sessionId]) localSubmissionsMemory[sessionId] = [];
  localSubmissionsMemory[sessionId].push(subObj);

  try {
    const colRef = collection(db, 'live_sessions', sessionId, 'submissions');
    await addDoc(colRef, subObj);

    // Incrémente le compteur dans la session
    const sessionDoc = doc(db, 'live_sessions', sessionId);
    const snap = await getDoc(sessionDoc);
    if (snap.exists()) {
      const activeAssignment = snap.data().activeAssignment;
      if (activeAssignment) {
        await updateDoc(sessionDoc, {
          'activeAssignment.submissionsCount': (activeAssignment.submissionsCount || 0) + 1
        });
      }
    }
  } catch (err) {
    console.warn('[liveSessionService] submitLiveAssignmentWork firestore warning (saved locally):', err);
  }

  return subObj;
}

/**
 * Abonnement en temps réel aux devoirs soumis (côté formateur)
 */
export function subscribeLiveSubmissions(
  sessionId: string,
  callback: (submissions: LiveSubmission[]) => void
): () => void {
  const initial = localSubmissionsMemory[sessionId] || localSubmissionsMemory['live-demo-session'] || [];
  callback([...initial]);

  const fetchSubs = async () => {
    try {
      const colRef = collection(db, 'live_sessions', sessionId, 'submissions');
      const q = query(colRef, orderBy('submittedAt', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const firestoreSubs: LiveSubmission[] = [];
        snapshot.forEach((docSnap) => {
          firestoreSubs.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        callback(firestoreSubs);
      }
    } catch (err) {
      console.warn('[liveSessionService] Lecture submissions :', err);
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
        filter: `chat_id=eq.${sessionId}`,
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

/**
 * Noter / corriger un devoir soumis et envoyer feedback
 */
export async function gradeLiveSubmission(
  sessionId: string,
  submissionId: string,
  grade: string,
  feedback?: string
): Promise<void> {
  // Mise à jour locale
  if (localSubmissionsMemory[sessionId]) {
    const target = localSubmissionsMemory[sessionId].find(s => s.id === submissionId);
    if (target) {
      target.grade = grade;
      target.feedback = feedback;
      target.status = 'graded';
    }
  }

  try {
    const subDoc = doc(db, 'live_sessions', sessionId, 'submissions', submissionId);
    await updateDoc(subDoc, {
      grade,
      feedback: feedback || '',
      status: 'graded'
    });
  } catch (err) {
    console.warn('[liveSessionService] gradeLiveSubmission warning:', err);
  }
}

/**
 * Mise à jour de l'URL de salle de Coaching 1-to-1
 */
export async function updateCoachingRoom(sessionId: string, roomUrl: string): Promise<void> {
  try {
    const sessionDoc = doc(db, 'live_sessions', sessionId);
    await updateDoc(sessionDoc, { coachingRoomUrl: roomUrl });
  } catch (err) {
    console.warn('[liveSessionService] updateCoachingRoom warning:', err);
  }
}
