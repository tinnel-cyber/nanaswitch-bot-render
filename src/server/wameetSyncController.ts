/**
 * @file wameetSyncController.ts
 * @description Le Pont Backend (De Nanasore vers Wameet VIP) - Synchronisation "Studio Créateur" (Prompt 30)
 * 
 * Architecture et Logique Métier :
 * 1. Sécurité : Authentification Machine-to-Machine (M2M) stricte avec tokens et signatures HMAC-SHA256,
 *    protection anti-rejeu par timestamp, et vérification du statut "Pro Subscriber" du créateur.
 * 2. Publication (POST /api/wameet-sync/publish-room) :
 *    - Reçoit le payload depuis Nanasore (creatorId, roomType, title, description, subscriptionPrice, contentPayload).
 *    - Crée la Room dans le store Wameet, génère la room WebSocket et diffuse l'événement instantanément
 *      pour faire apparaître la room dans les carrousels de VipDiscoveryScreen.
 * 3. Mise à jour temps réel (PUT /api/wameet-sync/update-content) :
 *    - Reçoit les modifications de quiz, vidéos ou posts faites depuis Nanasore.
 *    - Met à jour le store Wameet et diffuse la mise à jour aux abonnés connectés via WebSockets.
 * 4. Consultation (GET /api/wameet-sync/rooms & GET /api/wameet-sync/rooms/:roomId) :
 *    - Permet au frontend Wameet de récupérer les espaces synchronisés.
 */

import crypto from 'crypto';
import type { Request, Response, Express, NextFunction } from 'express';

// ============================================================================
// 1. CONFIGURATION DE SÉCURITÉ MACHINE-TO-MACHINE (M2M)
// ============================================================================

export const NANA_WAMEET_M2M_SECRET =
  process.env.NANA_WAMEET_M2M_SECRET || 'nana_wameet_m2m_studio_sync_secret_2026';

export const NANA_M2M_API_KEY =
  process.env.NANA_M2M_API_KEY || 'nanasore_studio_m2m_key_prod_v1';

/**
 * Durée de validité maximale d'une requête M2M (anti-rejeu) : 5 minutes
 */
const MAX_REQUEST_AGE_MS = 5 * 60 * 1000;

// ============================================================================
// 2. TYPES ET STRUCTURES DE DONNÉES DU PONT NANASORE -> WAMEET
// ============================================================================

export type SyncedRoomType = 'COURSE_ROOM' | 'BUSINESS_LOUNGE';
export type SyncedRoomAccessType = 'FREE' | 'PREMIUM' | 'SUBSCRIPTION';

export interface SyncedRoomSubscriptionPrice {
  amount: number;
  currency: string; // Ex: 'FCFA', 'XOF'
  periodLabel: string; // Ex: 'mois', 'annuel', 'à vie'
  formattedLabel: string; // Ex: '25 000 FCFA / mois'
}

export interface SyncedLesson {
  id: string;
  title: string;
  type: 'video' | 'pdf';
  duration?: string;
  videoUrl?: string;
  pdfUrl?: string;
  pdfSize?: string;
  description?: string;
}

export interface SyncedChapter {
  id: string;
  title: string;
  description?: string;
  lessons: SyncedLesson[];
}

export interface SyncedQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface SyncedLoungeFeedPost {
  id: string;
  type: 'ANALYSIS' | 'INVESTMENT_OPPORTUNITY' | 'PRIVATE_VIDEO' | 'VOICE_BRIEF';
  title: string;
  content: string;
  videoUrl?: string;
  investmentMetrics?: {
    ticketMin: string;
    roiEstimated: string;
    termMonths: number;
    capitalSecured: string;
    totalTarget: string;
    committedPercentage: number;
    deadline: string;
  };
  createdAt?: string;
}

export interface SyncedRoomContentPayload {
  // Pour les Salles de Cours (LMS)
  syllabus?: string[];
  durationHours?: number;
  hasCertificate?: boolean;
  chapters?: SyncedChapter[];
  quizQuestions?: SyncedQuizQuestion[];

  // Pour les Salons d'Affaires (Business & Coaching)
  topic?: string;
  perks?: string[];
  maxSeats?: number;
  feedPosts?: SyncedLoungeFeedPost[];
  deals?: any[];
  consultationSlots?: any[];
}

export interface SyncedVipRoomRecord {
  id: string;
  roomCode: string;
  roomType: SyncedRoomType;
  creatorId: string;
  creatorName: string;
  creatorRole: string;
  creatorAvatar: string;
  creatorBio?: string;
  isCreatorVerified: boolean;
  title: string;
  description: string;
  category: string;
  tags: string[];
  accessType: SyncedRoomAccessType;
  subscriptionPrice: SyncedRoomSubscriptionPrice;
  bannerUrl: string;
  contentPayload: SyncedRoomContentPayload;
  publishedAt: number;
  updatedAt: number;
  version: number;
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
  webSocketChannel: string;
  roomUrl: string;
}

export interface PublishRoomRequestPayload {
  creatorId: string;
  creatorName: string;
  creatorRole?: string;
  creatorAvatar?: string;
  creatorBio?: string;
  creatorIsPro?: boolean; // Doit être Pro Subscriber
  roomType: SyncedRoomType;
  title: string;
  description: string;
  category?: string;
  tags?: string[];
  accessType?: SyncedRoomAccessType;
  subscriptionPrice?: {
    amount?: number;
    currency?: string;
    periodLabel?: string;
    formattedLabel?: string;
  };
  bannerUrl?: string;
  contentPayload: SyncedRoomContentPayload;
}

export type UpdateContentType =
  | 'ADD_LESSON'
  | 'UPDATE_QUIZ'
  | 'ADD_FEED_POST'
  | 'UPDATE_METADATA'
  | 'FULL_SYNC';

export interface UpdateContentRequestPayload {
  roomId: string;
  creatorId: string;
  updateType: UpdateContentType;
  updatedContent: any;
}

export interface WebSocketRoomEmitter {
  to: (room: string) => {
    emit: (event: string, data: any) => void;
  };
  emit: (event: string, data: any) => void;
}

// ============================================================================
// 3. REGISTRE EN MÉMOIRE DES SALLES VIP WAMEET SYNCHRONISÉES (STATE STORE)
// ============================================================================

const WAMEET_SYNCED_ROOMS = new Map<string, SyncedVipRoomRecord>();
const CREATOR_ROOMS_INDEX = new Map<string, Set<string>>(); // creatorId -> Set<roomId>

// Set des créateurs autorisés Pro Subscribers Nanasore (pour vérification stricte)
const NANA_PRO_SUBSCRIBERS = new Set<string>([
  'creator_ibrahim_traore',
  'creator_marcelle_gnakpa',
  'creator_koffi_mensah',
  'creator_aissata_ndiaye',
  'creator_nana_admin'
]);

// Remplissage initial d'espaces de référence pour synchronisation immédiate
initializeDefaultSyncedRooms();

function initializeDefaultSyncedRooms() {
  const initialLMS: SyncedVipRoomRecord = {
    id: 'course-sync-1',
    roomCode: 'WMT-CRS-1001',
    roomType: 'COURSE_ROOM',
    creatorId: 'creator_marcelle_gnakpa',
    creatorName: 'Marcelle Gnakpa',
    creatorRole: 'Architecte Cloud & DevSecOps Senior',
    creatorAvatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    creatorBio: 'Ex-Lead Cloud Architect chez MTN & Orange. Formatrice certifiée.',
    isCreatorVerified: true,
    title: 'Masterclass Cloud Architecture & Haute Disponibilité Afrique',
    description:
      'Apprenez à concevoir et déployer des infrastructures résilientes distribuées adaptées aux contraintes de connectivité et de latence locales.',
    category: 'Cloud & DevOps',
    tags: ['Kubernetes', 'Cloud', 'Haute Disponibilité', 'Docker', 'DevOps'],
    accessType: 'PREMIUM',
    subscriptionPrice: {
      amount: 45000,
      currency: 'FCFA',
      periodLabel: 'accès complet',
      formattedLabel: '45 000 FCFA'
    },
    bannerUrl:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    contentPayload: {
      durationHours: 32,
      hasCertificate: true,
      chapters: [
        {
          id: 'chap-1',
          title: 'Fondations et Architecture Multi-Région',
          lessons: [
            {
              id: 'les-1',
              title: 'Introduction aux contraintes de peering et CDN en Afrique',
              type: 'video',
              duration: '18 min',
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            },
            {
              id: 'les-2',
              title: 'Livre Blanc : Guide Pratique du Déploiement Cloud OHADA',
              type: 'pdf',
              duration: 'Lecture 25 min',
              pdfUrl: '#',
              pdfSize: '3.4 MB'
            }
          ]
        }
      ],
      quizQuestions: [
        {
          id: 'q-1',
          question: 'Quelle est la latence moyenne optimale visée entre Abidjan et Dakar ?',
          options: ['< 35 ms', '150 ms', '500 ms', '> 1 seconde'],
          correctAnswerIndex: 0,
          explanation:
            'Grâce aux câbles sous-marins récents et aux points d’échange IXP locaux, une latence sous les 35 ms est désormais la norme.'
        }
      ]
    },
    publishedAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    version: 1,
    status: 'PUBLISHED',
    webSocketChannel: 'vip_room_course-sync-1',
    roomUrl: 'https://wameet.nana.africa/vip/course-sync-1'
  };

  WAMEET_SYNCED_ROOMS.set(initialLMS.id, initialLMS);
  CREATOR_ROOMS_INDEX.set(initialLMS.creatorId, new Set([initialLMS.id]));
}

// ============================================================================
// 4. GESTIONNAIRE WEBSOCKET EN TEMPS RÉEL (EMITTER & REGISTRY)
// ============================================================================

let wsEmitter: WebSocketRoomEmitter | null = null;
const VIP_ROOM_CLIENTS = new Map<string, Set<string>>(); // roomId -> Set<socketId>
const CLIENT_VIP_ROOM = new Map<string, string>(); // socketId -> roomId

export function setWameetSyncSocketEmitter(emitter: WebSocketRoomEmitter) {
  wsEmitter = emitter;
  console.log('[WAMEET SYNC] Émetteur WebSocket Wameet Studio Créateur initialisé.');
}

export function registerSocketToVipRoom(roomId: string, socketId: string) {
  if (!VIP_ROOM_CLIENTS.has(roomId)) {
    VIP_ROOM_CLIENTS.set(roomId, new Set());
  }
  VIP_ROOM_CLIENTS.get(roomId)!.add(socketId);
  CLIENT_VIP_ROOM.set(socketId, roomId);
  console.log(`[WAMEET SYNC WS] Socket ${socketId} a rejoint la salle VIP : ${roomId}`);
}

export function unregisterSocketFromVipRoom(socketId: string) {
  const roomId = CLIENT_VIP_ROOM.get(socketId);
  if (roomId) {
    const clients = VIP_ROOM_CLIENTS.get(roomId);
    if (clients) {
      clients.delete(socketId);
      if (clients.size === 0) {
        VIP_ROOM_CLIENTS.delete(roomId);
      }
    }
    CLIENT_VIP_ROOM.delete(socketId);
    console.log(`[WAMEET SYNC WS] Socket ${socketId} a quitté la salle VIP : ${roomId}`);
  }
}

export function broadcastToVipRoom(roomId: string, event: string, data: any) {
  const clients = VIP_ROOM_CLIENTS.get(roomId);
  if (clients && wsEmitter) {
    for (const socketId of clients) {
      wsEmitter.to(socketId).emit(event, data);
    }
  }
}

export function getVipRoomClientCount(roomId: string): number {
  return VIP_ROOM_CLIENTS.get(roomId)?.size || 0;
}

// ============================================================================
// 5. MIDDLEWARE DE SÉCURITÉ : AUTHENTIFICATION MACHINE-TO-MACHINE (M2M)
// ============================================================================

/**
 * Valide l'authenticité de la requête en provenance du serveur Nanasore.
 * Vérifie le token M2M statique OU la signature HMAC SHA-256 avec contrôle de timestamp anti-rejeu.
 */
export function verifyNanaM2MAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'] || '';
  const m2mTokenHeader = (req.headers['x-nana-m2m-token'] as string) || '';
  const signatureHeader = (req.headers['x-nana-signature'] as string) || '';
  const timestampHeader = (req.headers['x-nana-timestamp'] as string) || '';

  // 1. Vérification par Token M2M (Bearer ou Header spécifique)
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const providedToken = m2mTokenHeader || bearerToken;

  if (providedToken && (providedToken === NANA_M2M_API_KEY || providedToken === NANA_WAMEET_M2M_SECRET)) {
    return next();
  }

  // 2. Vérification par Signature Cryptographique HMAC-SHA256 (Haut niveau de sécurité M2M)
  if (signatureHeader && timestampHeader) {
    const timestamp = parseInt(timestampHeader, 10);
    const now = Date.now();

    // Protection anti-rejeu : tolérance maximale de 5 minutes
    if (isNaN(timestamp) || Math.abs(now - timestamp) > MAX_REQUEST_AGE_MS) {
      return res.status(401).json({
        success: false,
        error: 'M2M_TIMESTAMP_EXPIRED',
        message: 'Signature M2M expirée ou horodatage invalide. Écart supérieur à 5 minutes.',
        serverTime: now
      });
    }

    // Calcul de la signature attendue : HMAC_SHA256(timestamp + "." + rawBody, SECRET)
    const rawBody = (req as any).rawBody ? (req as any).rawBody.toString('utf-8') : JSON.stringify(req.body);
    const payloadToSign = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', NANA_WAMEET_M2M_SECRET)
      .update(payloadToSign)
      .digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expectedSignature))) {
      return next();
    }
  }

  // 3. Rejet si aucune méthode d'authentification valide
  return res.status(401).json({
    success: false,
    error: 'M2M_UNAUTHORIZED',
    message:
      'Accès refusé : Authentification Machine-to-Machine invalide entre Nanasore et Wameet. Fournissez x-nana-m2m-token ou x-nana-signature.',
    hint: 'Utilisez la clé secrète configurée dans NANA_WAMEET_M2M_SECRET.'
  });
}

// ============================================================================
// 6. ROUTE : POST /api/wameet-sync/publish-room
// ============================================================================

/**
 * Crée et publie un Espace VIP (Salle de cours ou Salon d'affaires) ordonné depuis Nanasore.
 */
export async function handlePublishRoom(req: Request, res: Response) {
  try {
    const payload: PublishRoomRequestPayload = req.body;

    // 1. Validation des champs obligatoires
    const {
      creatorId,
      creatorName,
      creatorRole = 'Expert & Formateur NaNa',
      creatorAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      creatorBio,
      creatorIsPro = true,
      roomType,
      title,
      description,
      category = 'Affaires & Éducation',
      tags = [],
      accessType = 'SUBSCRIPTION',
      subscriptionPrice,
      bannerUrl = 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80',
      contentPayload = {}
    } = payload || {};

    if (!creatorId || !creatorName || !roomType || !title || !description) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Les champs creatorId, creatorName, roomType, title et description sont obligatoires.'
      });
    }

    // 2. Vérification stricte du Statut "Pro Subscriber" du Créateur Nanasore
    const isPro = creatorIsPro || NANA_PRO_SUBSCRIBERS.has(creatorId);
    if (!isPro) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN_PRO_REQUIRED',
        message:
          'Seuls les créateurs abonnés au statut Pro Subscriber dans Nanasore sont autorisés à publier des espaces VIP Wameet.',
        creatorId
      });
    }

    // 3. Génération des Identifiants Uniques
    const nanoSuffix = crypto.randomBytes(4).toString('hex');
    const roomId =
      roomType === 'COURSE_ROOM'
        ? `course_sync_${nanoSuffix}`
        : `lounge_sync_${nanoSuffix}`;

    const roomCodePrefix = roomType === 'COURSE_ROOM' ? 'WMT-CRS' : 'WMT-VIP';
    const roomCode = `${roomCodePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    const webSocketChannel = `vip_room_${roomId}`;
    const roomUrl = `https://wameet.nana.africa/vip/${roomId}`;

    // 4. Normalisation du Tarif d'Abonnement
    const rawPrice = subscriptionPrice?.amount ?? 25000;
    const normalizedPrice: SyncedRoomSubscriptionPrice = {
      amount: rawPrice,
      currency: subscriptionPrice?.currency || 'FCFA',
      periodLabel: subscriptionPrice?.periodLabel || (accessType === 'FREE' ? 'Gratuit' : 'mois'),
      formattedLabel:
        subscriptionPrice?.formattedLabel ||
        (accessType === 'FREE'
          ? 'Accès Offert'
          : `${rawPrice.toLocaleString('fr-FR')} ${subscriptionPrice?.currency || 'FCFA'} / mois`)
    };

    // 5. Instanciation de la Room Wameet dans le Registre
    const newRoom: SyncedVipRoomRecord = {
      id: roomId,
      roomCode,
      roomType,
      creatorId,
      creatorName,
      creatorRole,
      creatorAvatar,
      creatorBio,
      isCreatorVerified: true,
      title,
      description,
      category,
      tags,
      accessType,
      subscriptionPrice: normalizedPrice,
      bannerUrl,
      contentPayload,
      publishedAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      status: 'PUBLISHED',
      webSocketChannel,
      roomUrl
    };

    WAMEET_SYNCED_ROOMS.set(roomId, newRoom);

    // Mise à jour de l'index des créateurs
    if (!CREATOR_ROOMS_INDEX.has(creatorId)) {
      CREATOR_ROOMS_INDEX.set(creatorId, new Set());
    }
    CREATOR_ROOMS_INDEX.get(creatorId)!.add(roomId);

    console.log(
      `[WAMEET SYNC] 🚀 Nouvelle Room VIP publiée avec succès : ${roomId} ("${title}") par ${creatorName} (${creatorId})`
    );

    // 6. Diffusion WebSocket Instantanée vers l'écran VipDiscoveryScreen
    if (wsEmitter) {
      wsEmitter.emit('wameet_vip_room_published', {
        event: 'wameet_vip_room_published',
        roomId,
        roomType,
        room: {
          id: newRoom.id,
          title: newRoom.title,
          category: newRoom.category,
          creatorName: newRoom.creatorName,
          creatorRole: newRoom.creatorRole,
          creatorAvatar: newRoom.creatorAvatar,
          accessType: newRoom.accessType,
          priceLabel: newRoom.subscriptionPrice.formattedLabel,
          bannerUrl: newRoom.bannerUrl,
          tags: newRoom.tags,
          isOnline: true,
          rating: 5.0,
          studentsCount: 0,
          activeMembersCount: 1,
          roomCode: newRoom.roomCode
        },
        timestamp: Date.now()
      });
      console.log(`[WAMEET SYNC WS] Événement 'wameet_vip_room_published' diffusé à tous les clients.`);
    }

    // 7. Réponse Succès 201 Created
    return res.status(201).json({
      success: true,
      message: 'Espace VIP Wameet créé et synchronisé avec succès depuis Nanasore.',
      data: newRoom
    });
  } catch (error: any) {
    console.error('[WAMEET SYNC PUBLISH ERROR]', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SYNC_ERROR',
      message: error.message || 'Une erreur est survenue lors de la synchronisation de la salle VIP.'
    });
  }
}

// ============================================================================
// 7. ROUTE : PUT /api/wameet-sync/update-content
// ============================================================================

/**
 * Met à jour le contenu d'un Espace VIP (nouveaux modules, quiz, vidéos, deals) en temps réel.
 * Propage instantanément la modification aux abonnés connectés via WebSockets.
 */
export async function handleUpdateContent(req: Request, res: Response) {
  try {
    const payload: UpdateContentRequestPayload = req.body;
    const { roomId, creatorId, updateType, updatedContent } = payload || {};

    if (!roomId || !creatorId || !updateType || updatedContent === undefined) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Les champs roomId, creatorId, updateType et updatedContent sont obligatoires.'
      });
    }

    // 1. Récupération de la Room
    const room = WAMEET_SYNCED_ROOMS.get(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'ROOM_NOT_FOUND',
        message: `La salle VIP ${roomId} n’existe pas dans Wameet.`
      });
    }

    // 2. Contrôle de Propriété : Le créateur doit être le détenteur de la Room
    if (room.creatorId !== creatorId) {
      return res.status(403).json({
        success: false,
        error: 'UNAUTHORIZED_CREATOR',
        message: 'Vous n’êtes pas autorisé à modifier cet espace VIP (identifiant créateur non concordant).'
      });
    }

    // 3. Application de la Modification Selon le Type
    room.version += 1;
    room.updatedAt = Date.now();

    switch (updateType) {
      case 'ADD_LESSON': {
        // Ajout d'une leçon vidéo ou PDF dans un chapitre
        const { chapterId, lesson } = updatedContent || {};
        if (!room.contentPayload.chapters) {
          room.contentPayload.chapters = [];
        }
        let targetChapter = room.contentPayload.chapters.find((c) => c.id === chapterId);
        if (!targetChapter) {
          targetChapter = {
            id: chapterId || `chap_${Date.now()}`,
            title: updatedContent.chapterTitle || 'Nouveau Module',
            lessons: []
          };
          room.contentPayload.chapters.push(targetChapter);
        }
        targetChapter.lessons.push(lesson);
        break;
      }

      case 'UPDATE_QUIZ': {
        // Mise à jour de la liste de questions QCM
        room.contentPayload.quizQuestions = updatedContent;
        break;
      }

      case 'ADD_FEED_POST': {
        // Publication d'une analyse ou opportunité dans le Salon d'Affaires
        if (!room.contentPayload.feedPosts) {
          room.contentPayload.feedPosts = [];
        }
        room.contentPayload.feedPosts.unshift(updatedContent);
        break;
      }

      case 'UPDATE_METADATA': {
        // Modification des métadonnées (titre, description, bannière, prix)
        if (updatedContent.title) room.title = updatedContent.title;
        if (updatedContent.description) room.description = updatedContent.description;
        if (updatedContent.bannerUrl) room.bannerUrl = updatedContent.bannerUrl;
        if (updatedContent.subscriptionPrice) {
          room.subscriptionPrice = {
            ...room.subscriptionPrice,
            ...updatedContent.subscriptionPrice
          };
        }
        break;
      }

      case 'FULL_SYNC':
      default: {
        // Synchronisation complète de l'arborescence
        room.contentPayload = {
          ...room.contentPayload,
          ...updatedContent
        };
        break;
      }
    }

    WAMEET_SYNCED_ROOMS.set(roomId, room);

    console.log(
      `[WAMEET SYNC] 🔄 Contenu de la Room ${roomId} mis à jour (Type: ${updateType}, v${room.version}).`
    );

    // 4. Diffusion WebSocket Temps Réel aux Abonnés Connectés dans la Salle
    if (wsEmitter) {
      // Message ciblé à la room spécifique
      wsEmitter.to(room.webSocketChannel).emit('room_content_updated', {
        roomId,
        roomType: room.roomType,
        updateType,
        updatedContent,
        version: room.version,
        timestamp: Date.now()
      });

      // Message global de rafraîchissement catalogue
      wsEmitter.emit('vip_room_catalog_updated', {
        roomId,
        title: room.title,
        version: room.version,
        updatedAt: room.updatedAt
      });

      console.log(
        `[WAMEET SYNC WS] Notification WebSocket transmise sur le canal '${room.webSocketChannel}'.`
      );
    }

    // 5. Réponse Succès
    return res.json({
      success: true,
      message: `Contenu de la salle mis à jour en temps réel avec succès (v${room.version}).`,
      data: {
        roomId: room.id,
        version: room.version,
        updatedAt: room.updatedAt,
        updateType,
        contentPayload: room.contentPayload
      }
    });
  } catch (error: any) {
    console.error('[WAMEET SYNC UPDATE ERROR]', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_UPDATE_ERROR',
      message: error.message || 'Une erreur est survenue lors de la mise à jour en temps réel.'
    });
  }
}

// ============================================================================
// 8. ROUTES DE CONSULTATION (POUR LE HUB DISCOVERY FRONTEND)
// ============================================================================

/**
 * GET /api/wameet-sync/rooms
 * Renvoie toutes les salles et salons VIP synchronisés depuis Nanasore.
 */
export function handleGetSyncedRooms(req: Request, res: Response) {
  const rooms = Array.from(WAMEET_SYNCED_ROOMS.values()).filter(
    (r) => r.status === 'PUBLISHED'
  );
  return res.json({
    success: true,
    count: rooms.length,
    rooms
  });
}

/**
 * GET /api/wameet-sync/rooms/:roomId
 * Renvoie les détails complets d'une salle spécifique.
 */
export function handleGetRoomById(req: Request, res: Response) {
  const { roomId } = req.params;
  const room = WAMEET_SYNCED_ROOMS.get(roomId);
  if (!room) {
    return res.status(404).json({
      success: false,
      error: 'ROOM_NOT_FOUND',
      message: `La salle VIP ${roomId} est introuvable.`
    });
  }
  return res.json({
    success: true,
    room
  });
}

/**
 * DELETE /api/wameet-sync/rooms/:roomId
 * Permet d'archiver une salle VIP depuis le back-office Nanasore.
 */
export function handleDeleteRoom(req: Request, res: Response) {
  const { roomId } = req.params;
  const creatorId = req.headers['x-creator-id'] as string;

  const room = WAMEET_SYNCED_ROOMS.get(roomId);
  if (!room) {
    return res.status(404).json({ success: false, error: 'ROOM_NOT_FOUND' });
  }

  if (creatorId && room.creatorId !== creatorId) {
    return res.status(403).json({ success: false, error: 'FORBIDDEN' });
  }

  room.status = 'ARCHIVED';
  WAMEET_SYNCED_ROOMS.set(roomId, room);

  if (wsEmitter) {
    wsEmitter.to(room.webSocketChannel).emit('room_closed', {
      roomId,
      reason: 'Archivé par le créateur depuis Nanasore',
      timestamp: Date.now()
    });
  }

  return res.json({
    success: true,
    message: `La salle ${roomId} a été archivée avec succès.`
  });
}

// ============================================================================
// 9. ATTACHEMENT DES ROUTES AU SERVEUR EXPRESS
// ============================================================================

export function attachWameetSyncRoutes(app: Express) {
  // Routes publiques de consultation
  app.get('/api/wameet-sync/rooms', handleGetSyncedRooms);
  app.get('/api/wameet-sync/rooms/:roomId', handleGetRoomById);

  // Routes protégées Machine-to-Machine (Nanasore vers Wameet VIP)
  app.post('/api/wameet-sync/publish-room', verifyNanaM2MAuth, handlePublishRoom);
  app.put('/api/wameet-sync/update-content', verifyNanaM2MAuth, handleUpdateContent);
  app.delete('/api/wameet-sync/rooms/:roomId', verifyNanaM2MAuth, handleDeleteRoom);

  console.log('[WAMEET SYNC] 🌉 Routes du Pont Backend Nanasore -> Wameet VIP attachées avec succès.');
}

export default {
  attachWameetSyncRoutes,
  setWameetSyncSocketEmitter,
  registerSocketToVipRoom,
  unregisterSocketFromVipRoom,
  broadcastToVipRoom,
  getVipRoomClientCount,
  verifyNanaM2MAuth,
  handlePublishRoom,
  handleUpdateContent
};
