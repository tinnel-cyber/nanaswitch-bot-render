import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limitToLast,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { compressImageFile } from '../utils/imageCompressor';
import { compressAndTrimVideo } from '../utils/videoCompressor';
import { sendTransactionalSms } from './smsSenderService';

export interface WameetChatProductCard {
  id: string;
  name: string;
  priceFcfa: number;
  imageUrl: string;
  badge?: string;
}

export interface WameetChatMessage {
  id: string;
  chatId?: string;
  sender: 'me' | 'them';
  senderHandle?: string;
  senderName?: string;
  senderAvatar?: string;
  recipientHandle?: string;
  recipientName?: string;
  createdAt: string;
  createdAtDate?: Date;
  expireAt?: any; // Timestamp Firestore
  expireDate?: Date;
  isEphemeral?: boolean;
  daysRemaining?: number;
  type: 'text' | 'voice' | 'image' | 'video' | 'product' | 'gift';
  text?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  waveformBars?: number[];
  mediaUrl?: string;
  productCard?: WameetChatProductCard;
  giftProduct?: any;
  read?: boolean;
  recipientPhone?: string;
}


export interface WameetChatThread {
  id: string;
  memberName: string;
  memberHandle: string;
  memberAvatar: string;
  memberBadge: string;
  isOnline: boolean;
  unreadCount: number;
  hasVoiceNote: boolean;
  hasShoppingCard: boolean;
  lastActivityLabel: string;
  messages: WameetChatMessage[];
  memberPhone?: string;
  expireAt?: any;
  updatedAt?: any;
}

export interface SendMessagePayload {
  chatId: string;
  senderHandle: string;
  senderName: string;
  senderAvatar: string;
  recipientHandle: string;
  recipientName: string;
  recipientAvatar: string;
  recipientBadge?: string;
  recipientPhone?: string;
  type: 'text' | 'voice' | 'image' | 'video' | 'product' | 'gift';
  text?: string;
  mediaUrl?: string;
  imageFile?: File | Blob;
  videoFile?: File | Blob;
  audioBlob?: Blob;
  audioDurationSec?: number;
  waveformBars?: number[];
  productCard?: WameetChatProductCard;
  giftProduct?: any;
}


/**
 * Normalise un identifiant ou un handle pour former un chatId déterministe
 */
export function normalizeChatUserHandle(handle: string): string {
  if (!handle) return 'unknown';
  return handle
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9_]/g, '_');
}

/**
 * Génère un identifiant de chat bilatéral déterministe
 * Garanti : userA + userB et userB + userA produisent exactement le même chatId.
 */
export function getDeterministicChatId(userAHandle: string, userBHandle: string): string {
  const normA = normalizeChatUserHandle(userAHandle);
  const normB = normalizeChatUserHandle(userBHandle);
  const sorted = [normA, normB].sort();
  return `wchat_${sorted[0]}__${sorted[1]}`;
}

/**
 * Calcule la date d'expiration pour le moteur de rétention éphémère (7 jours par défaut)
 */
export function calculateExpirationDate(days = 7): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Formate le temps restant avant auto-suppression par la politique TTL
 */
export function formatExpirationRemaining(expireDate?: Date | null): string {
  if (!expireDate) return '7j';
  const now = Date.now();
  const diffMs = expireDate.getTime() - now;
  if (diffMs <= 0) return 'Expiré';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days >= 1) {
    return `${days}j`;
  }
  return `${Math.max(1, hours)}h`;
}

/**
 * Téléversement éphémère vers Firebase Storage dans le dossier cloisonné /chat_medias/
 * Supporte :
 * 1) Image : Compression WebP < 180 Ko
 * 2) Note Vocale : WebM / Opus
 * 3) Nano-Vidéo : 480p < 5 Mo max 30s
 * Toutes les pièces sont marquées autoDeleteAfterDays=7 pour la règle GCP Lifecycle.
 */
export async function uploadChatMediaToStorage(
  chatId: string,
  fileOrBlob: File | Blob,
  mediaType: 'image' | 'voice' | 'video'
): Promise<string> {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 6);

  try {
    if (mediaType === 'image') {
      let uploadFile: File | Blob = fileOrBlob;
      try {
        const compressed = await compressImageFile(fileOrBlob, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.78,
          maxSizeBytes: 180 * 1024 // < 180 Ko strict
        });
        uploadFile = compressed.file;
      } catch (compErr) {
        console.warn('[WAMEET CHAT STORAGE] Compression image ignorée (fallback original):', compErr);
      }

      const storagePath = `chat_medias/${chatId}/img_${timestamp}_${randomSuffix}.webp`;
      const storageRef = ref(storage, storagePath);
      const res = await uploadBytes(storageRef, uploadFile, {
        contentType: 'image/webp',
        customMetadata: {
          chatId,
          type: 'chat_image',
          autoDeleteAfterDays: '7',
          ephemeral: 'true'
        }
      });
      return await getDownloadURL(res.ref);
    } else if (mediaType === 'voice') {
      // Audio Note Vocale (Support universel iOS Safari / Android Chrome)
      const rawType = fileOrBlob.type || '';
      const isMp4OrAac =
        rawType.includes('mp4') ||
        rawType.includes('aac') ||
        rawType.includes('m4a') ||
        (fileOrBlob as File).name?.endsWith('.mp4') ||
        (fileOrBlob as File).name?.endsWith('.m4a');
      const isOgg = rawType.includes('ogg');
      const ext = isMp4OrAac ? 'mp4' : isOgg ? 'ogg' : 'webm';
      const contentType = rawType || (isMp4OrAac ? 'audio/mp4' : 'audio/webm');

      const storagePath = `chat_medias/${chatId}/audio_${timestamp}_${randomSuffix}.${ext}`;
      const storageRef = ref(storage, storagePath);
      const res = await uploadBytes(storageRef, fileOrBlob, {
        contentType,
        customMetadata: {
          chatId,
          type: 'chat_voice_note',
          autoDeleteAfterDays: '7',
          ephemeral: 'true'
        }
      });
      return await getDownloadURL(res.ref);
    } else {
      // Verrouillage Anti-Explosion des quotas & Stratégie Nano-Vidéo (< 2Mo - 3Mo max)
      let uploadVideoFile: File | Blob = fileOrBlob;
      if (fileOrBlob.size > 2 * 1024 * 1024) {
        try {
          const compResult = await compressAndTrimVideo(fileOrBlob, {
            maxDurationSec: 30,
            targetMaxDimension: 854,
            targetBitrate: 600_000,
            maxSizeLimitBytes: 3.5 * 1024 * 1024
          });
          uploadVideoFile = compResult.file;
        } catch (videoCompErr: any) {
          console.warn('[WAMEET CHAT STORAGE] Compression vidéo fallback :', videoCompErr);
          throw new Error('Vidéo trop longue pour le chat rapide. Veuillez raccourcir la vidéo ou insérer un lien externe (TikTok/Drive/YouTube).');
        }
      }

      if (uploadVideoFile.size > 5 * 1024 * 1024) {
        throw new Error('Vidéo trop longue pour le chat rapide. Veuillez raccourcir la vidéo ou insérer un lien externe (TikTok/Drive/YouTube).');
      }

      const isMp4 =
        (uploadVideoFile as File).name?.endsWith('.mp4') || uploadVideoFile.type?.includes('mp4');
      const ext = isMp4 ? 'mp4' : 'webm';
      const storagePath = `chat_medias/${chatId}/video_${timestamp}_${randomSuffix}.${ext}`;
      const storageRef = ref(storage, storagePath);
      const res = await uploadBytes(storageRef, uploadVideoFile, {
        contentType: uploadVideoFile.type || (isMp4 ? 'video/mp4' : 'video/webm'),
        customMetadata: {
          chatId,
          type: 'chat_nano_video',
          autoDeleteAfterDays: '7',
          ephemeral: 'true'
        }
      });
      return await getDownloadURL(res.ref);
    }
  } catch (error: any) {
    if (error?.message?.includes('trop longue')) {
      throw error;
    }
    console.warn('[WAMEET CHAT STORAGE] Téléversement Storage échoué, repli vers DataURL / URL locale:', error);
    // En cas d'échec de stockage Cloud (ex: hors-ligne), encoder en Base64 Data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(URL.createObjectURL(fileOrBlob));
      reader.readAsDataURL(fileOrBlob);
    });
  }
}

/**
 * Envoi d'un message dans Firestore avec synchronisation bilatérale instantanée
 * et horodatage TTL expireAt (7 jours).
 */
export async function sendWameetMessage(payload: SendMessagePayload): Promise<string> {
  const {
    chatId,
    senderHandle,
    senderName,
    senderAvatar,
    recipientHandle,
    recipientName,
    recipientAvatar,
    recipientBadge = '🌟 Membre Wameet',
    type,
    text = '',
    imageFile,
    videoFile,
    audioBlob,
    audioDurationSec = 0,
    waveformBars = [],
    productCard
  } = payload;

  let mediaUrl = payload.mediaUrl || '';
  let audioUrl = '';

  // 1. Upload de l'image si fichier fourni
  if (imageFile) {
    mediaUrl = await uploadChatMediaToStorage(chatId, imageFile, 'image');
  }

  // 1b. Upload de la vidéo si fichier nano-vidéo fourni
  if (videoFile) {
    mediaUrl = await uploadChatMediaToStorage(chatId, videoFile, 'video');
  }

  // 2. Upload de l'audio si Blob vocal fourni
  if (audioBlob) {
    audioUrl = await uploadChatMediaToStorage(chatId, audioBlob, 'voice');
  }

  const expireDate = calculateExpirationDate(7);
  const expireAtTimestamp = Timestamp.fromDate(expireDate);
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Document de message individuel (Subcollection)
  const messageDocRef = doc(db, 'wameet_chats', chatId, 'messages', messageId);

  const messageData = {
    id: messageId,
    chatId,
    senderHandle,
    senderName,
    senderAvatar,
    recipientHandle,
    recipientName,
    recipientAvatar,
    type,
    text: text.trim(),
    mediaUrl,
    audioUrl,
    audioDurationSec,
    waveformBars,
    productCard: productCard || null,
    giftProduct: payload.giftProduct || null,
    createdAt: serverTimestamp(),
    expireAt: expireAtTimestamp,
    isEphemeral: true,
    ttlDays: 7,
    read: false,
    recipientPhone: payload.recipientPhone || null,
    smsFallbackScheduledAt: Timestamp.fromMillis(Date.now() + 3 * 60 * 1000), // Chronomètre 3 minutes
    smsFallbackStatus: 'pending'
  };

  // Aperçu pour le fil de discussion principal
  let previewText = text.trim();
  if (type === 'voice') previewText = '🎙️ Note vocale';
  else if (type === 'image') previewText = '📷 Photo';
  else if (type === 'video') previewText = '🎬 Vidéo';
  else if (type === 'product' && productCard) previewText = `🛍️ ${productCard.name}`;
  else if (type === 'gift') previewText = '🎁 Cadeau mystère';


  const chatParentRef = doc(db, 'wameet_chats', chatId);

  // Écriture du message dans la sous-collection
  await setDoc(messageDocRef, messageData);

  // Mise à jour atomique du parent (wameet_chats)
  await setDoc(
    chatParentRef,
    {
      id: chatId,
      participants: [senderHandle, recipientHandle],
      participantDetails: {
        [senderHandle]: {
          name: senderName,
          handle: senderHandle,
          avatarUrl: senderAvatar
        },
        [recipientHandle]: {
          name: recipientName,
          handle: recipientHandle,
          avatarUrl: recipientAvatar,
          badge: recipientBadge
        }
      },
      lastMessage: {
        text: previewText,
        type,
        senderHandle,
        createdAt: serverTimestamp(),
        expireAt: expireAtTimestamp
      },
      updatedAt: serverTimestamp(),
      expireAt: expireAtTimestamp,
      isEphemeral: true
    },
    { merge: true }
  );

  // Déclencheur automatique de secours SMS si le destinataire n'a pas lu après 3 minutes
  if (payload.recipientPhone) {
    const targetPhone = payload.recipientPhone;
    setTimeout(() => {
      triggerPendingSmsFallbacks(chatId, targetPhone).catch((err) => {
        console.warn('[WAMEET SMS FALLBACK] Erreur tâche de fond 3min :', err);
      });
    }, 3 * 60 * 1000 + 1500);
  }

  return messageId;
}

/**
 * Écouteur Firestore temps réel (onSnapshot) pour une conversation bilatérale
 */
export function subscribeToChatMessages(
  chatId: string,
  currentHandle: string,
  onUpdate: (messages: WameetChatMessage[]) => void,
  onError?: (err: Error) => void
): () => void {
  const messagesColRef = collection(db, 'wameet_chats', chatId, 'messages');
  // Requête légère et stable SANS condition temporelle (50 derniers messages) pour préserver le cache local Firestore
  const q = query(messagesColRef, orderBy('createdAt', 'asc'), limitToLast(50));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const list: WameetChatMessage[] = [];

      snapshot.forEach((docSnap) => {
        const d = docSnap.data();

        // Récupération de la date d'expiration pour la politique d'auto-suppression
        let expDate: Date | undefined;
        if (d.expireAt && typeof d.expireAt.toDate === 'function') {
          expDate = d.expireAt.toDate();
        } else if (d.expireAt && d.expireAt.seconds) {
          expDate = new Date(d.expireAt.seconds * 1000);
        }

        // Filtre PUREMENT FRONT-END : éliminer les messages expirés visuellement
        // sans condition where('expireAt', ...) continue dans Firestore
        if (expDate && expDate.getTime() < now) {
          return;
        }

        // Formatage de la date de création
        let createdTimeLabel = "À l'instant";
        let createdDate = new Date();
        if (d.createdAt && typeof d.createdAt.toDate === 'function') {
          createdDate = d.createdAt.toDate();
          createdTimeLabel = createdDate.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          });
        } else if (d.createdAt && d.createdAt.seconds) {
          createdDate = new Date(d.createdAt.seconds * 1000);
          createdTimeLabel = createdDate.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          });
        }

        const isMe =
          d.senderHandle === currentHandle ||
          normalizeChatUserHandle(d.senderHandle || '') === normalizeChatUserHandle(currentHandle);

        list.push({
          id: d.id || docSnap.id,
          chatId: d.chatId || chatId,
          sender: isMe ? 'me' : 'them',
          senderHandle: d.senderHandle,
          senderName: d.senderName,
          senderAvatar: d.senderAvatar,
          recipientHandle: d.recipientHandle,
          recipientName: d.recipientName,
          createdAt: createdTimeLabel,
          createdAtDate: createdDate,
          expireAt: d.expireAt,
          expireDate: expDate,
          isEphemeral: d.isEphemeral !== false,
          daysRemaining: expDate ? Math.max(0, Math.ceil((expDate.getTime() - now) / (1000 * 60 * 60 * 24))) : 7,
          type: d.type || 'text',
          text: d.text,
          mediaUrl: d.mediaUrl,
          audioUrl: d.audioUrl,
          audioDurationSec: d.audioDurationSec,
          waveformBars: d.waveformBars,
          productCard: d.productCard,
          read: d.read === true,
          recipientPhone: d.recipientPhone
        });
      });

      onUpdate(list);
    },
    (err) => {
      console.warn('[WAMEET CHAT] Erreur onSnapshot messages :', err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * Marque les messages reçus comme lus (désactive le chronomètre SMS de 3 minutes)
 */
export async function markChatMessagesAsRead(chatId: string, currentHandle: string): Promise<void> {
  try {
    const messagesColRef = collection(db, 'wameet_chats', chatId, 'messages');
    const q = query(messagesColRef, where('read', '==', false), limitToLast(25));
    const snapshot = await getDocs(q);
    const normMe = normalizeChatUserHandle(currentHandle);

    const updatePromises = snapshot.docs
      .filter(d => normalizeChatUserHandle(d.data().recipientHandle || '') === normMe)
      .map(d => updateDoc(d.ref, { read: true, smsFallbackStatus: 'cancelled' }));

    await Promise.all(updatePromises);
  } catch (err) {
    // Non-bloquant
  }
}

/**
 * Déclencheur du Fallback SMS si un message urgent reste non lu après 3 minutes
 * et que le destinataire est hors-ligne.
 */
export async function triggerPendingSmsFallbacks(
  chatId: string,
  recipientPhone?: string
): Promise<number> {
  if (!recipientPhone) return 0;
  let sentCount = 0;

  try {
    const messagesColRef = collection(db, 'wameet_chats', chatId, 'messages');
    const q = query(
      messagesColRef,
      where('read', '==', false),
      where('smsFallbackStatus', '==', 'pending'),
      limitToLast(10)
    );
    const snapshot = await getDocs(q);
    const now = Date.now();

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      let scheduledMillis = 0;
      if (data.smsFallbackScheduledAt?.toMillis) {
        scheduledMillis = data.smsFallbackScheduledAt.toMillis();
      } else if (data.smsFallbackScheduledAt?.seconds) {
        scheduledMillis = data.smsFallbackScheduledAt.seconds * 1000;
      }

      // Si le délai de 3 minutes est dépassé
      if (scheduledMillis > 0 && now >= scheduledMillis) {
        const textSample = (data.text || (data.type === 'voice' ? 'Note vocale' : data.type) || 'message').substring(0, 45);
        const smsMessage = `Wameet: Nouveau message de ${data.senderName || '@' + data.senderHandle} : "${textSample}...". Répondre en direct : https://nanasore.com`;

        const res = await sendTransactionalSms({
          to: recipientPhone,
          message: smsMessage
        });

        if (res.success) {
          sentCount++;
          await updateDoc(docSnap.ref, {
            smsFallbackStatus: 'sent',
            smsSentAt: serverTimestamp()
          });
        }
      }
    }
  } catch (err) {
    console.warn('[WAMEET SMS FALLBACK] Erreur traitement fallback SMS :', err);
  }

  return sentCount;
}

/**
 * Écouteur Firestore temps réel (onSnapshot) pour la boîte de réception des discussions de l'utilisateur
 */
export function subscribeToUserChats(
  userHandle: string,
  onUpdate: (threads: WameetChatThread[]) => void
): () => void {
  const normUser = normalizeChatUserHandle(userHandle);
  const chatsColRef = collection(db, 'wameet_chats');
  const q = query(chatsColRef, where('participants', 'array-contains', userHandle));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const list: WameetChatThread[] = [];

      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const details = d.participantDetails || {};

        // Trouver l'autre interlocuteur
        let otherHandle = '';
        let otherDetails: any = null;

        if (Array.isArray(d.participants)) {
          otherHandle = d.participants.find(
            (p: string) => normalizeChatUserHandle(p) !== normUser
          ) || d.participants[0] || 'contact';
          otherDetails = details[otherHandle] || {};
        }

        let lastLabel = "À l'instant";
        if (d.updatedAt && typeof d.updatedAt.toDate === 'function') {
          const uDate = d.updatedAt.toDate();
          lastLabel = uDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        }

        list.push({
          id: docSnap.id,
          memberName: otherDetails?.name || otherHandle || 'Membre Wameet',
          memberHandle: otherHandle.startsWith('@') ? otherHandle : `@${otherHandle}`,
          memberAvatar:
            otherDetails?.avatarUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
          memberBadge: otherDetails?.badge || '🌟 Membre Wameet',
          isOnline: true,
          unreadCount: 0,
          hasVoiceNote: d.lastMessage?.type === 'voice',
          hasShoppingCard: d.lastMessage?.type === 'product',
          lastActivityLabel: lastLabel,
          messages: [],
          memberPhone: otherDetails?.phone || undefined,
          expireAt: d.expireAt,
          updatedAt: d.updatedAt
        });
      });

      onUpdate(list);
    },
    (err) => {
      console.warn('[WAMEET CHAT] Erreur onSnapshot fils de discussion :', err);
    }
  );

  return unsubscribe;
}

export const subscribeUserThreads = subscribeToUserChats;

/**
 * Moteur de requête de filtrage par statut transactionnel ('COMMANDE' | 'LIVRER' | 'PAYE' | 'UNREAD' | 'ALL')
 * Recharge les conversations filtrées selon les métadonnées de transaction ou de commande.
 */
export function subscribeUserThreadsByTransactionStatus(
  currentUserHandle: string,
  statusFilter: 'ALL' | 'UNREAD' | 'COMMANDE' | 'LIVRER' | 'PAYE',
  onUpdate: (threads: WameetChatThread[]) => void
) {
  return subscribeUserThreads(currentUserHandle, (allThreads) => {
    if (statusFilter === 'ALL') {
      onUpdate(allThreads);
      return;
    }
    if (statusFilter === 'UNREAD') {
      onUpdate(allThreads.filter(t => t.unreadCount > 0));
      return;
    }
    // Filtrage transactionnel ciblé (Commande, Livrer, Payé)
    const filtered = allThreads.filter(t => {
      const msgs = t.messages || [];
      const hasMatchingTransaction = msgs.some(m => {
        const title = (m.text || '').toLowerCase();
        if (statusFilter === 'COMMANDE') {
          return title.includes('commande') || title.includes('cmd') || title.includes('achat') || t.hasShoppingCard;
        }
        if (statusFilter === 'LIVRER') {
          return title.includes('livr') || title.includes('coursier') || title.includes('swarm');
        }
        if (statusFilter === 'PAYE') {
          return title.includes('pay') || title.includes('farotage') || title.includes('crédit') || title.includes('sebpay');
        }
        return false;
      });
      return hasMatchingTransaction;
    });
    onUpdate(filtered);
  });
}
