/**
 * Service de Gestion du Social Campus (BuddyBoss Natif)
 * Synchronisation Firestore en temps réel (onSnapshot), pagination par curseur,
 * messagerie directe 1-à-1 et moteur de réputation/gamification.
 */

import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  increment,
  DocumentSnapshot,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { supabase } from '../lib/supabase';
import { 
  CommunityPost, 
  PostComment, 
  DirectMessage, 
  DirectConversation, 
  LearnerProfile, 
  LearnerBadge, 
  LearnerCertificateItem,
  CommunityTopicTag
} from '../types/community';
import { StoreUser } from '../types';

// ============================================================================
// BADGES & RÉPUTATION DU SOCIAL CAMPUS
// ============================================================================
export const SYSTEM_BADGES: LearnerBadge[] = [
  {
    id: 'badge-first-step',
    name: 'Pionnier du Campus',
    icon: '🚀',
    description: 'A rejoint la communauté et complété sa première leçon interactive.',
    rarity: 'COMMON',
    category: 'PROGRESSION'
  },
  {
    id: 'badge-fintech-master',
    name: 'Maître FinTech UEMOA',
    icon: '⚡',
    description: 'A validé avec succès tous les ateliers d\'intégration USSD & Mobile Money.',
    rarity: 'EPIC',
    category: 'EXCELLENCE'
  },
  {
    id: 'badge-top-helper',
    name: 'Mentor d\'Entraide',
    icon: '🤝',
    description: 'A publié au moins 3 réponses validées par l\'enseignant dans le salon communautaire.',
    rarity: 'RARE',
    category: 'COMMUNITY'
  },
  {
    id: 'badge-certified-pro',
    name: 'Expert Certifié',
    icon: '🎓',
    description: 'Diplômé officiel avec vérification cryptographique sur le registre NaNa LMS.',
    rarity: 'LEGENDARY',
    category: 'SPECIAL'
  }
];

// ============================================================================
// PROFILES APPRENANTS PAR DÉFAUT / SEED
// ============================================================================
const SEED_PROFILES: Record<string, LearnerProfile> = {
  'usr-salif': {
    userId: 'usr-salif',
    name: 'Salif Ouédraogo',
    email: 'salif.oued@fintech-sahel.bf',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Développeur Fullstack passionné par les paiements mobiles instantanés et les protocoles bancaires ouverts dans l\'espace UEMOA.',
    role: 'STUDENT',
    title: 'Ingénieur Passerelles de Paiement',
    location: 'Ouagadougou, Burkina Faso',
    reputationPoints: 340,
    levelTitle: 'Praticien USSD Confirmé',
    enrolledCourses: [
      {
        courseId: 'course-fintech-1',
        courseTitle: 'Intégration Passerelles de Paiement Mobile Money & USSD',
        progressPercent: 75,
        completedLessonsCount: 6,
        totalLessonsCount: 8,
        enrolledAt: Date.now() - 86400000 * 14,
        lastActiveAt: Date.now() - 3600000 * 2
      }
    ],
    badges: [
      { ...SYSTEM_BADGES[0], unlockedAt: Date.now() - 86400000 * 12 },
      { ...SYSTEM_BADGES[2], unlockedAt: Date.now() - 86400000 * 3 }
    ],
    certificates: [
      {
        id: 'cert-bf-9921',
        courseId: 'course-fintech-1',
        courseTitle: 'Architecture Distribuée des Systèmes de Caisse POS',
        issuedAt: Date.now() - 86400000 * 20,
        studentName: 'Salif Ouédraogo',
        verificationCode: 'NANA-CERT-9921BF',
        score: 94
      }
    ],
    joinedAt: Date.now() - 86400000 * 30,
    isOnline: true
  },
  'usr-ibrahim': {
    userId: 'usr-ibrahim',
    name: 'Ibrahim Pousbila Konkobo',
    email: 'ibrahim.konkobo@nana-pos.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'Architecte Logiciel Senior & Fondateur de NaNa POS Pro. Plus de 12 ans d\'expérience dans l\'intégration de systèmes transactionnels haute disponibilité.',
    role: 'INSTRUCTOR',
    title: 'Instructeur Principal & CTO',
    location: 'Ouagadougou • Dakar',
    reputationPoints: 2450,
    levelTitle: 'Grand Maître Formateur',
    enrolledCourses: [],
    badges: [
      { ...SYSTEM_BADGES[0], unlockedAt: Date.now() - 86400000 * 90 },
      { ...SYSTEM_BADGES[1], unlockedAt: Date.now() - 86400000 * 60 },
      { ...SYSTEM_BADGES[2], unlockedAt: Date.now() - 86400000 * 45 },
      { ...SYSTEM_BADGES[3], unlockedAt: Date.now() - 86400000 * 30 }
    ],
    certificates: [],
    joinedAt: Date.now() - 86400000 * 365,
    isOnline: true
  },
  'usr-aicha': {
    userId: 'usr-aicha',
    name: 'Aïcha Konaté',
    email: 'aicha.konate@distrib-ci.com',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    bio: 'Responsable Opérations Retail à Abidjan. Auditrice des flux financiers de caisse et réconciliation multicanale.',
    role: 'STUDENT',
    title: 'Gestionnaire de Réseau Commercial',
    location: 'Abidjan, Côte d\'Ivoire',
    reputationPoints: 180,
    levelTitle: 'Apprenante Assidue',
    enrolledCourses: [
      {
        courseId: 'course-fintech-1',
        courseTitle: 'Intégration Passerelles de Paiement Mobile Money & USSD',
        progressPercent: 40,
        completedLessonsCount: 3,
        totalLessonsCount: 8,
        enrolledAt: Date.now() - 86400000 * 6,
        lastActiveAt: Date.now() - 3600000 * 5
      }
    ],
    badges: [
      { ...SYSTEM_BADGES[0], unlockedAt: Date.now() - 86400000 * 5 }
    ],
    certificates: [],
    joinedAt: Date.now() - 86400000 * 15,
    isOnline: false
  }
};

// ============================================================================
// POSTS COMMUTATIFS PAR DÉFAUT / SEED
// ============================================================================
const SEED_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post-101',
    courseId: 'course-fintech-1',
    authorId: 'usr-ibrahim',
    authorName: 'Ibrahim Pousbila Konkobo',
    authorRole: 'INSTRUCTOR',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    authorTitle: 'Formateur Référent',
    authorReputation: 2450,
    content: `📢 **Bienvenue dans la Communauté Développeurs UEMOA !**\n\nCet espace est dédié à vos partages de code, vos devoirs d'intégration et l'entraide technique en temps réel.\n\n💡 *Règle d'or* : Dès que vous terminez le simulateur de Webhook Orange Money / Wave du Module 2, partagez la capture de votre console pour validation et gagnez **+50 points de réputation** !`,
    likesCount: 14,
    likedBy: ['usr-salif', 'usr-aicha'],
    commentsCount: 2,
    createdAt: Date.now() - 3600000 * 4,
    topicTag: 'ANNONCE',
    isPinned: true
  },
  {
    id: 'post-102',
    courseId: 'course-fintech-1',
    authorId: 'usr-salif',
    authorName: 'Salif Ouédraogo',
    authorRole: 'STUDENT',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    authorTitle: 'Ingénieur Passerelles',
    authorReputation: 340,
    content: `Voici le rendu de mon devoir sur le **traitement des erreurs de timeout USSD**. J'ai implémenté une file de réessai exponentielle (Exponential Backoff) qui évite les double-débits lors des saturations réseau des opérateurs. Qu'en pensez-vous ?`,
    attachmentUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&auto=format&fit=crop&q=80',
    attachmentType: 'IMAGE',
    attachmentTitle: 'Diagramme-Sequence-Retry-USSD.png',
    likesCount: 8,
    likedBy: ['usr-ibrahim'],
    commentsCount: 2,
    createdAt: Date.now() - 3600000 * 2,
    topicTag: 'DEVOIR'
  },
  {
    id: 'post-103',
    courseId: 'course-fintech-1',
    authorId: 'usr-aicha',
    authorName: 'Aïcha Konaté',
    authorRole: 'STUDENT',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    authorTitle: 'Gestionnaire Réseau Commercial',
    authorReputation: 180,
    content: `Petite astuce pour ceux qui testent Wave à Abidjan : n'oubliez pas d'autoriser les IP du webhook dans vos règles de sécurité Cloud Firestore si vous déployez en Edge server. Ça m'a économisé 2h de débogage !`,
    likesCount: 6,
    likedBy: ['usr-salif'],
    commentsCount: 1,
    createdAt: Date.now() - 3600000 * 1,
    topicTag: 'ASTUCE'
  }
];

const SEED_COMMENTS: Record<string, PostComment[]> = {
  'post-101': [
    {
      id: 'comm-1',
      postId: 'post-101',
      authorId: 'usr-salif',
      authorName: 'Salif Ouédraogo',
      authorRole: 'STUDENT',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      content: 'Superbe initiative ! Prêt pour le challenge USSD de cette semaine.',
      createdAt: Date.now() - 3600000 * 3,
      likesCount: 2,
      likedBy: ['usr-ibrahim']
    },
    {
      id: 'comm-2',
      postId: 'post-101',
      authorId: 'usr-aicha',
      authorName: 'Aïcha Konaté',
      authorRole: 'STUDENT',
      authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      content: 'Merci Monsieur Konkobo. Le simulateur en direct est particulièrement clair.',
      createdAt: Date.now() - 3600000 * 2,
      likesCount: 1,
      likedBy: []
    }
  ],
  'post-102': [
    {
      id: 'comm-3',
      postId: 'post-102',
      authorId: 'usr-ibrahim',
      authorName: 'Ibrahim Pousbila Konkobo',
      authorRole: 'INSTRUCTOR',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      content: 'Excellente gestion du jitter sur l\'intervalle de réessai Salif. C\'est exactement ce qu\'exigent les spécifications Orange Money API v2.',
      createdAt: Date.now() - 3600000 * 1,
      likesCount: 4,
      likedBy: ['usr-salif', 'usr-aicha'],
      isInstructorEndorsed: true,
      endorsedByInstructorName: 'Ibrahim Pousbila Konkobo'
    }
  ]
};

// ============================================================================
// MESSAGERIE DIRECTE : CONVERSATIONS & MESSAGES SEED
// ============================================================================
const SEED_CONVERSATIONS: DirectConversation[] = [
  {
    id: 'conv-salif-ibrahim',
    participants: ['usr-salif', 'usr-ibrahim'],
    participantDetails: {
      'usr-salif': {
        name: 'Salif Ouédraogo',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'STUDENT',
        title: 'Étudiant FinTech'
      },
      'usr-ibrahim': {
        name: 'Ibrahim Pousbila Konkobo',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        role: 'INSTRUCTOR',
        title: 'Formateur Principal'
      }
    },
    lastMessage: 'Votre soumission d\'exercice a été validée avec la note de 19/20.',
    lastMessageAt: Date.now() - 1800000,
    unreadCounts: {
      'usr-salif': 1,
      'usr-ibrahim': 0
    }
  }
];

const SEED_DIRECT_MESSAGES: Record<string, DirectMessage[]> = {
  'conv-salif-ibrahim': [
    {
      id: 'dm-1',
      conversationId: 'conv-salif-ibrahim',
      senderId: 'usr-salif',
      senderName: 'Salif Ouédraogo',
      recipientId: 'usr-ibrahim',
      recipientName: 'Ibrahim Pousbila Konkobo',
      text: 'Bonjour Monsieur Konkobo, j\'ai une question concernant le certificat SSL pour la passerelle USSD.',
      createdAt: Date.now() - 7200000,
      read: true
    },
    {
      id: 'dm-2',
      conversationId: 'conv-salif-ibrahim',
      senderId: 'usr-ibrahim',
      senderName: 'Ibrahim Pousbila Konkobo',
      recipientId: 'usr-salif',
      recipientName: 'Salif Ouédraogo',
      text: 'Bonjour Salif. Il vous faut obligatoirement un certificat de niveau TLS 1.3 avec chiffrement ECDSA. Regardez la leçon 4 pour le script de configuration.',
      createdAt: Date.now() - 3600000,
      read: true
    },
    {
      id: 'dm-3',
      conversationId: 'conv-salif-ibrahim',
      senderId: 'usr-ibrahim',
      senderName: 'Ibrahim Pousbila Konkobo',
      recipientId: 'usr-salif',
      recipientName: 'Salif Ouédraogo',
      text: 'Votre soumission d\'exercice a été validée avec la note de 19/20.',
      createdAt: Date.now() - 1800000,
      read: false
    }
  ]
};

// ============================================================================
// GESTION DU CACHE LOCAL POUR EXPÉRIENCE INSTANTANÉE & HORS-LIGNE
// ============================================================================
function getLocalCommunityPosts(courseId: string): CommunityPost[] {
  try {
    const raw = localStorage.getItem(`nana_community_posts_${courseId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[COMMUNITY] Cache read error', e);
  }
  return SEED_COMMUNITY_POSTS.filter(p => p.courseId === courseId || p.courseId === 'GLOBAL');
}

function saveLocalCommunityPosts(courseId: string, posts: CommunityPost[]) {
  try {
    localStorage.setItem(`nana_community_posts_${courseId}`, JSON.stringify(posts));
  } catch (e) {
    console.warn('[COMMUNITY] Cache write error', e);
  }
}

// ============================================================================
// API DU FLUX COMMUNAUTAIRE (AVEC CURSOR PAGINATION)
// ============================================================================

export interface FeedPaginationResult {
  posts: CommunityPost[];
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
}

/**
 * Souscrit en temps réel au fil d'actualité d'une communauté de cours avec support de pagination par curseur
 */
export function subscribeToCourseFeed(
  courseId: string,
  onUpdate: (result: FeedPaginationResult) => void,
  pageSize: number = 10,
  startAfterDocSnapshot: DocumentSnapshot | null = null
): () => void {
  try {
    const postsRef = collection(db, 'course_communities', courseId, 'posts');
    
    let q = query(
      postsRef,
      orderBy('createdAt', 'desc'),
      limit(pageSize + 1)
    );

    if (startAfterDocSnapshot) {
      q = query(
        postsRef,
        orderBy('createdAt', 'desc'),
        startAfter(startAfterDocSnapshot),
        limit(pageSize + 1)
      );
    }

    const fetchPosts = async () => {
      try {
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docs = snapshot.docs;
          const hasMore = docs.length > pageSize;
          const actualDocs = hasMore ? docs.slice(0, pageSize) : docs;
          const lastDoc = actualDocs[actualDocs.length - 1] || null;

          const posts: CommunityPost[] = actualDocs.map(d => ({
            id: d.id,
            ...d.data()
          } as CommunityPost));

          saveLocalCommunityPosts(courseId, posts);
          onUpdate({ posts, hasMore, lastDoc });
        } else {
          const local = getLocalCommunityPosts(courseId);
          onUpdate({
            posts: local,
            hasMore: false,
            lastDoc: null
          });
        }
      } catch (error) {
        console.warn('[COMMUNITY] Erreur lecture posts :', error);
        const local = getLocalCommunityPosts(courseId);
        onUpdate({
          posts: local,
          hasMore: false,
          lastDoc: null
        });
      }
    };

    fetchPosts();

    const channelName = `comm_posts_${courseId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wameet_messages',
          filter: `chat_id=eq.${courseId}`,
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[COMMUNITY] Initialisation Realtime échouée :', err);
    const local = getLocalCommunityPosts(courseId);
    onUpdate({
      posts: local,
      hasMore: false,
      lastDoc: null
    });
    return () => {};
  }
}

/**
 * Charge la page suivante de publications avec le curseur Firestore
 */
export async function loadMoreCourseFeed(
  courseId: string,
  pageSize: number = 10,
  startAfterDocSnapshot: DocumentSnapshot | null = null
): Promise<FeedPaginationResult> {
  if (!startAfterDocSnapshot) {
    return { posts: [], hasMore: false, lastDoc: null };
  }

  try {
    const postsRef = collection(db, 'course_communities', courseId, 'posts');
    const q = query(
      postsRef,
      orderBy('createdAt', 'desc'),
      startAfter(startAfterDocSnapshot),
      limit(pageSize + 1)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docs = snapshot.docs;
      const hasMore = docs.length > pageSize;
      const actualDocs = hasMore ? docs.slice(0, pageSize) : docs;
      const lastDoc = actualDocs[actualDocs.length - 1] || null;

      const posts: CommunityPost[] = actualDocs.map(d => ({
        id: d.id,
        ...d.data()
      } as CommunityPost));

      return { posts, hasMore, lastDoc };
    }
  } catch (err) {
    console.warn('[COMMUNITY] Cursor pagination fetch error:', err);
  }

  return { posts: [], hasMore: false, lastDoc: null };
}

/**
 * Ajoute automatiquement l'étudiant au groupe communautaire de son cours
 */
export async function ensureStudentInCommunityGroup(
  courseId: string,
  user?: StoreUser | null
): Promise<void> {
  if (!user && !auth.currentUser) return;
  const uid = user?.id || auth.currentUser?.uid;
  if (!uid) return;

  try {
    const memberRef = doc(db, 'course_communities', courseId, 'members', uid);
    await setDoc(memberRef, {
      userId: uid,
      name: user?.name || auth.currentUser?.displayName || 'Apprenant NaNa',
      email: user?.email || auth.currentUser?.email || '',
      joinedAt: Date.now(),
      role: 'STUDENT'
    }, { merge: true });

    // Enregistrement dans le cache local
    localStorage.setItem(`nana_community_member_${courseId}_${uid}`, 'true');
  } catch (e) {
    localStorage.setItem(`nana_community_member_${courseId}_${uid}`, 'true');
  }
}

/**
 * Publie un nouveau message riche dans le fil communautaire
 */
export async function createCommunityPost(
  courseId: string,
  postData: Omit<CommunityPost, 'id' | 'createdAt' | 'likesCount' | 'likedBy' | 'commentsCount'>
): Promise<CommunityPost> {
  const newPost: CommunityPost = {
    ...postData,
    id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    courseId,
    createdAt: Date.now(),
    likesCount: 0,
    likedBy: [],
    commentsCount: 0
  };

  // 1. Sauvegarde Firestore
  try {
    const postRef = doc(db, 'course_communities', courseId, 'posts', newPost.id);
    await setDoc(postRef, newPost);
  } catch (err) {
    console.warn('[COMMUNITY] Firestore indisponible, enregistrement local :', err);
  }

  // 2. Mise à jour cache local
  const local = getLocalCommunityPosts(courseId);
  const updated = [newPost, ...local];
  saveLocalCommunityPosts(courseId, updated);

  // 3. Attribution automatique de points de réputation pour contribution
  await awardReputationPoints(postData.authorId, 15, 'Publication d\'un post communautaire');

  return newPost;
}

/**
 * Alterne le like sur une publication
 */
export async function toggleLikePost(
  courseId: string,
  postId: string,
  userId: string
): Promise<{ likesCount: number; isLiked: boolean }> {
  const local = getLocalCommunityPosts(courseId);
  const post = local.find(p => p.id === postId);
  let isLiked = false;
  let newLikesCount = 0;

  if (post) {
    const hasLiked = post.likedBy.includes(userId);
    if (hasLiked) {
      post.likedBy = post.likedBy.filter(id => id !== userId);
      post.likesCount = Math.max(0, post.likesCount - 1);
      isLiked = false;
    } else {
      post.likedBy.push(userId);
      post.likesCount += 1;
      isLiked = true;
    }
    newLikesCount = post.likesCount;
    saveLocalCommunityPosts(courseId, local);
  }

  // Mise à jour Firestore
  try {
    const postRef = doc(db, 'course_communities', courseId, 'posts', postId);
    await updateDoc(postRef, {
      likesCount: increment(isLiked ? 1 : -1),
      likedBy: isLiked 
        ? [...(post?.likedBy || []), userId]
        : (post?.likedBy || []).filter(id => id !== userId)
    });
  } catch (e) {
    console.warn('[COMMUNITY] Firestore like update offline fallback', e);
  }

  return { likesCount: newLikesCount, isLiked };
}

export const togglePostLike = toggleLikePost;

/**
 * Souscrit aux commentaires imbriqués d'un post
 */
export function subscribeToPostComments(
  courseId: string,
  postId: string,
  onUpdate: (comments: PostComment[]) => void
): () => void {
  try {
    const commentsRef = collection(db, 'course_communities', courseId, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const fetchComments = async () => {
      try {
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const comments = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as PostComment));
          onUpdate(comments);
        } else {
          onUpdate(SEED_COMMENTS[postId] || []);
        }
      } catch (err) {
        console.warn('[COMMUNITY] Erreur lecture commentaires, fallback seed :', err);
        onUpdate(SEED_COMMENTS[postId] || []);
      }
    };

    fetchComments();

    const channelName = `post_comments_${postId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wameet_messages',
          filter: `chat_id=eq.${postId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    onUpdate(SEED_COMMENTS[postId] || []);
    return () => {};
  }
}

/**
 * Ajoute un commentaire sous un post
 */
export async function addPostComment(
  courseId: string,
  postId: string,
  commentData: Omit<PostComment, 'id' | 'createdAt' | 'likesCount' | 'likedBy'>
): Promise<PostComment> {
  const newComment: PostComment = {
    ...commentData,
    id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    postId,
    createdAt: Date.now(),
    likesCount: 0,
    likedBy: []
  };

  try {
    const commRef = doc(db, 'course_communities', courseId, 'posts', postId, 'comments', newComment.id);
    await setDoc(commRef, newComment);

    const postRef = doc(db, 'course_communities', courseId, 'posts', postId);
    await updateDoc(postRef, {
      commentsCount: increment(1)
    });
  } catch (e) {
    console.warn('[COMMUNITY] Firestore comment error, seed fallback', e);
  }

  if (!SEED_COMMENTS[postId]) SEED_COMMENTS[postId] = [];
  SEED_COMMENTS[postId].push(newComment);

  // Récompense de gamification (+10 réputation pour entraide)
  await awardReputationPoints(commentData.authorId, 10, 'Commentaire d\'entraide');

  return newComment;
}

/**
 * Validation par le formateur d'une réponse d'élève ("Réponse Validée par le Formateur")
 */
export async function endorseCommentByInstructor(
  courseId: string,
  postId: string,
  commentId: string,
  instructorName: string,
  commentAuthorId: string
): Promise<void> {
  try {
    const commRef = doc(db, 'course_communities', courseId, 'posts', postId, 'comments', commentId);
    await updateDoc(commRef, {
      isInstructorEndorsed: true,
      endorsedByInstructorName: instructorName
    });
  } catch (e) {
    console.warn('[COMMUNITY] Endorsement error Firestore fallback', e);
  }

  // Bonus de réputation majeur (+30 points) pour réponse validée par l'enseignant !
  await awardReputationPoints(commentAuthorId, 30, 'Réponse validée par l\'enseignant !');
}

export const addCommentToPost = addPostComment;

export async function endorsePost(
  courseId: string,
  postId: string,
  instructorName: string
): Promise<void> {
  try {
    const postRef = doc(db, 'course_communities', courseId, 'posts', postId);
    await updateDoc(postRef, {
      isInstructorEndorsed: true,
      endorsedByInstructorName: instructorName
    });
  } catch (e) {
    console.warn('[COMMUNITY] Post endorsement error Firestore fallback', e);
  }
}

// ============================================================================
// API PROFIL APPRENANT & GAMIFICATION
// ============================================================================

/**
 * Récupère le profil apprenant dynamique
 */
export async function getLearnerProfile(userId: string, currentUserFallback?: StoreUser | null): Promise<LearnerProfile> {
  // 1. Essai Firestore
  try {
    const profileDoc = await getDoc(doc(db, 'learner_profiles', userId));
    if (profileDoc.exists()) {
      return profileDoc.data() as LearnerProfile;
    }
  } catch (e) {
    console.warn('[COMMUNITY] Profile fetch offline, using seed/fallback', e);
  }

  // 2. Vérification dans le seed
  if (SEED_PROFILES[userId]) {
    return SEED_PROFILES[userId];
  }

  // 3. Synthèse d'un profil propre pour tout nouvel utilisateur
  const userName = currentUserFallback?.name || currentUserFallback?.email?.split('@')[0] || 'Apprenant NaNa';
  const newProfile: LearnerProfile = {
    userId,
    name: userName,
    email: currentUserFallback?.email,
    avatarUrl: (currentUserFallback as any)?.photoURL || (currentUserFallback as any)?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
    bio: 'Passionné par la tech et les solutions de paiement d\'Afrique de l\'Ouest.',
    role: 'STUDENT',
    title: 'Apprenant Débutant',
    location: 'UEMOA',
    reputationPoints: 45,
    levelTitle: 'Pionnier Curieux',
    enrolledCourses: [
      {
        courseId: 'course-fintech-1',
        courseTitle: 'Intégration Passerelles de Paiement Mobile Money & USSD',
        progressPercent: 25,
        completedLessonsCount: 2,
        totalLessonsCount: 8,
        enrolledAt: Date.now() - 86400000 * 2,
        lastActiveAt: Date.now()
      }
    ],
    badges: [SYSTEM_BADGES[0]],
    certificates: [],
    joinedAt: Date.now(),
    isOnline: true
  };

  SEED_PROFILES[userId] = newProfile;
  return newProfile;
}

/**
 * Met à jour les informations du profil apprenant
 */
export async function updateLearnerProfile(
  userId: string,
  updates: Partial<Pick<LearnerProfile, 'bio' | 'title' | 'location' | 'avatarUrl'>>
): Promise<void> {
  try {
    const profRef = doc(db, 'learner_profiles', userId);
    await updateDoc(profRef, updates);
  } catch (e) {
    console.warn('[COMMUNITY] Profil update Firestore fallback', e);
  }

  if (SEED_PROFILES[userId]) {
    SEED_PROFILES[userId] = {
      ...SEED_PROFILES[userId],
      ...updates
    };
  }
}

/**
 * Attribue des points de réputation et vérifie l'obtention de nouveaux badges
 */
export async function awardReputationPoints(
  userId: string,
  points: number,
  reason: string
): Promise<{ newTotal: number; newBadgeUnlocked?: LearnerBadge }> {
  let profile = SEED_PROFILES[userId];
  if (!profile) {
    profile = await getLearnerProfile(userId);
  }

  profile.reputationPoints += points;
  let unlockedBadge: LearnerBadge | undefined;

  // Calcul du titre selon le palier
  if (profile.reputationPoints >= 1000) {
    profile.levelTitle = 'Légende du Campus';
  } else if (profile.reputationPoints >= 500) {
    profile.levelTitle = 'Expert FinTech UEMOA';
  } else if (profile.reputationPoints >= 200) {
    profile.levelTitle = 'Praticien Confirmé';
  } else if (profile.reputationPoints >= 50) {
    profile.levelTitle = 'Apprenant Actif';
  }

  // Vérification de déblocage de badges
  if (profile.reputationPoints >= 200 && !profile.badges.some(b => b.id === 'badge-top-helper')) {
    unlockedBadge = { ...SYSTEM_BADGES[2], unlockedAt: Date.now() };
    profile.badges.push(unlockedBadge);
  } else if (profile.reputationPoints >= 500 && !profile.badges.some(b => b.id === 'badge-fintech-master')) {
    unlockedBadge = { ...SYSTEM_BADGES[1], unlockedAt: Date.now() };
    profile.badges.push(unlockedBadge);
  }

  // Persistance Firestore
  try {
    const profRef = doc(db, 'learner_profiles', userId);
    await setDoc(profRef, profile, { merge: true });
  } catch (e) {
    console.warn('[GAMIFICATION] Points update offline fallback', e);
  }

  console.log(`[GAMIFICATION] +${points} pts attribués à ${profile.name} (${reason}). Total: ${profile.reputationPoints}`);
  return { newTotal: profile.reputationPoints, newBadgeUnlocked: unlockedBadge };
}

// ============================================================================
// API MESSAGERIE DIRECTE 1-À-1 (TIROIR FLUIDE & TEMPS RÉEL)
// ============================================================================

/**
 * Souscrit en temps réel aux conversations d'un utilisateur
 */
export function subscribeToUserConversations(
  userId: string,
  onUpdate: (conversations: DirectConversation[]) => void
): () => void {
  try {
    const convsRef = collection(db, 'direct_conversations');
    const q = query(convsRef, where('participants', 'array-contains', userId));

    const fetchConvs = async () => {
      try {
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const convs = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as DirectConversation));
          onUpdate(convs);
        } else {
          const seedMatches = SEED_CONVERSATIONS.filter(c => c.participants.includes(userId));
          onUpdate(seedMatches.length > 0 ? seedMatches : SEED_CONVERSATIONS);
        }
      } catch (err) {
        console.warn('[DM] Erreur lecture conversations, seed fallback', err);
        onUpdate(SEED_CONVERSATIONS);
      }
    };

    fetchConvs();

    const channelName = `dm_convs_${userId}_${Math.random().toString(36).substring(7)}`;
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
          fetchConvs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    onUpdate(SEED_CONVERSATIONS);
    return () => {};
  }
}

/**
 * Souscrit aux messages d'une conversation spécifique en temps réel
 */
export function subscribeToConversationMessages(
  conversationId: string,
  onUpdate: (messages: DirectMessage[]) => void
): () => void {
  try {
    const msgsRef = collection(db, 'direct_conversations', conversationId, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'));

    const fetchMsgs = async () => {
      try {
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const msgs = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as DirectMessage));
          onUpdate(msgs);
        } else {
          onUpdate(SEED_DIRECT_MESSAGES[conversationId] || []);
        }
      } catch (err) {
        console.warn('[DM] Erreur messages lecture, seed fallback', err);
        onUpdate(SEED_DIRECT_MESSAGES[conversationId] || []);
      }
    };

    fetchMsgs();

    const channelName = `dm_msgs_${conversationId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wameet_messages',
          filter: `chat_id=eq.${conversationId}`,
        },
        () => {
          fetchMsgs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    onUpdate(SEED_DIRECT_MESSAGES[conversationId] || []);
    return () => {};
  }
}

/**
 * Souscrit aux messages directs entre deux utilisateurs (par identifiants)
 */
export function subscribeToDirectMessages(
  userId1: string,
  userId2: string,
  onUpdate: (messages: DirectMessage[]) => void
): () => void {
  const convId = [userId1, userId2].sort().join('_');
  return subscribeToConversationMessages(convId, onUpdate);
}

/**
 * Envoie un message direct privé
 */
export async function sendDirectMessage(
  arg1: string,
  arg2: string | { id: string; name: string; avatar?: string },
  arg3?: string | { id: string; name: string },
  arg4?: string,
  arg5?: string,
  arg6?: string
): Promise<DirectMessage> {
  let conversationId: string;
  let sender: { id: string; name: string; avatar?: string };
  let recipient: { id: string; name: string };
  let text: string;

  if (typeof arg2 === 'object' && arg2 !== null) {
    conversationId = arg1;
    sender = arg2;
    recipient = arg3 as { id: string; name: string };
    text = (arg4 as string) || '';
  } else {
    const senderId = arg1;
    const targetUserId = arg2 as string;
    text = (arg3 as string) || '';
    const senderName = arg4 || 'Expéditeur';
    const targetUserName = arg5 || 'Destinataire';
    const senderAvatar = arg6;

    conversationId = [senderId, targetUserId].sort().join('_');
    sender = { id: senderId, name: senderName, avatar: senderAvatar };
    recipient = { id: targetUserId, name: targetUserName };
  }

  const newMsg: DirectMessage = {
    id: `dm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    conversationId,
    senderId: sender.id,
    senderName: sender.name,
    senderAvatar: sender.avatar,
    recipientId: recipient.id,
    recipientName: recipient.name,
    text,
    createdAt: Date.now(),
    read: false
  };

  // 1. Sauvegarde Firestore
  try {
    const msgRef = doc(db, 'direct_conversations', conversationId, 'messages', newMsg.id);
    await setDoc(msgRef, newMsg);

    const convRef = doc(db, 'direct_conversations', conversationId);
    await updateDoc(convRef, {
      lastMessage: text,
      lastMessageAt: Date.now(),
      [`unreadCounts.${recipient.id}`]: increment(1)
    });
  } catch (e) {
    console.warn('[DM] Envoi hors-ligne, mise à jour mémoire', e);
  }

  // 2. Mise à jour mémoire
  if (!SEED_DIRECT_MESSAGES[conversationId]) {
    SEED_DIRECT_MESSAGES[conversationId] = [];
  }
  SEED_DIRECT_MESSAGES[conversationId].push(newMsg);

  const conv = SEED_CONVERSATIONS.find(c => c.id === conversationId);
  if (conv) {
    conv.lastMessage = text;
    conv.lastMessageAt = Date.now();
  }

  return newMsg;
}
