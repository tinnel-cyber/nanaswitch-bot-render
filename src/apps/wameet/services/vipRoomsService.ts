/**
 * @file vipRoomsService.ts
 * @description Service de gestion des Salles VIP multi-salles pour l'e-learning (Firebase Firestore collection 'rooms')
 * Fournit la synchronisation temps réel, l'accès hors-ligne, et les masterclasses d'experts pré-configurées.
 */

import { db } from '../../../firebaseConfig';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { supabase } from '@/lib/supabase';

export interface VipLesson {
  id: string;
  title: string;
  duration: string;
  videoUrl: string; // Lien S3 pré-signé / Amazon S3 bucket ou YouTube
  description?: string;
  thumbnailUrl?: string;
  isFreePreview?: boolean;
}

export interface VipRoom {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  expertName: string;
  expertRole: string;
  expertAvatar: string;
  category: string;
  bannerUrl: string;
  badge: string; // Ex: 'Certifiante', 'Direct Disponible', 'Masterclass VIP'
  accessType: 'FREE' | 'VIP';
  priceLabel: string;
  rating: number;
  studentsCount: number;
  isLiveNow: boolean;
  liveStreamUrl?: string; // YouTube Live / WebRTC / Jitsi
  lessons: VipLesson[];
  tags: string[];
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Salles VIP par défaut pré-configurées pour garantir un affichage immédiat
 * même si la collection Firestore 'rooms' est initialement vide.
 */
export const DEFAULT_VIP_ROOMS: VipRoom[] = [
  {
    id: 'telecom-fintech-masterclass',
    title: 'Masterclass Télécoms & Infrastructure Fintech Afrique',
    subtitle: 'Architecture des passerelles Mobile Money (Orange, Wave, Moov) et résilience réseau',
    description: 'Une formation complète pour ingénieurs et entrepreneurs tech en Afrique de l’Ouest. Apprenez à concevoir des passerelles de paiement haute disponibilité, à négocier les agrégations bancaires et à interconnecter les APIs télécoms.',
    expertName: 'Dr. Konkobo Pousbila',
    expertRole: 'Architecte Systèmes & Fondateur Nanasore',
    expertAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    category: 'Fintech & Télécoms',
    bannerUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
    badge: 'Masterclass VIP',
    accessType: 'VIP',
    priceLabel: 'Inclus VIP',
    rating: 4.95,
    studentsCount: 342,
    isLiveNow: true,
    liveStreamUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    tags: ['Telecom', 'Mobile Money', 'Passerelles', 'API', 'UEMOA'],
    lessons: [
      {
        id: 'lesson-1',
        title: 'Module 1 : Anatomie d’une transaction Mobile Money en Afrique subsaharienne',
        duration: '18:45',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        description: 'Flux de bout-en-bout : du push USSD au webhook de notification bancaire.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80',
        isFreePreview: true
      },
      {
        id: 'lesson-2',
        title: 'Module 2 : Sécurité des Webhooks & Cryptographie HMAC-SHA256',
        duration: '24:10',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        description: 'Mise en place de signatures infalsifiables et de fenêtres de tolérance anti-rejeu.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'lesson-3',
        title: 'Module 3 : Réconciliation automatique avec Nanasore & Sebpay',
        duration: '31:20',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        description: 'Automatisation des flux comptables et gestion des impayés avec clôture de caisse.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80'
      }
    ]
  },
  {
    id: 'swarm-logistics-masterclass',
    title: 'E-commerce Transfrontalier & Logistique Swarm en Afrique',
    subtitle: 'Comment piloter une flotte de livreurs motocyclistes et synchroniser les stocks en temps réel',
    description: 'Découvrez les stratégies de distribution dernier kilomètre adaptées aux métropoles africaines (Abidjan, Ouagadougou, Dakar). Maîtrisez le Cash on Delivery (COD) sécurisé et le routage intelligent.',
    expertName: 'Aïssatou Traoré',
    expertRole: 'Directrice Opérations Logistiques Swarm',
    expertAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    category: 'E-Commerce & Logistique',
    bannerUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
    badge: 'Certifiante',
    accessType: 'VIP',
    priceLabel: 'Inclus VIP',
    rating: 4.88,
    studentsCount: 215,
    isLiveNow: false,
    liveStreamUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['Logistique', 'Swarm', 'Dernier Kilomètre', 'E-commerce', 'Afrique'],
    lessons: [
      {
        id: 'swarm-1',
        title: 'Module 1 : Cartographie et géolocalisation sans adresse postale formelle',
        duration: '15:30',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        description: 'Repérage par points d’intérêt (stations, carrefours) et balises WhatsApp.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80',
        isFreePreview: true
      },
      {
        id: 'swarm-2',
        title: 'Module 2 : Séquestre financier du livreur et anti-fraude',
        duration: '22:45',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        description: 'Blocage du montant produit dans Sebpay jusqu’à remise effective au client final.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1556742049-0a67e5572249?auto=format&fit=crop&w=600&q=80'
      }
    ]
  },
  {
    id: 'ia-multimodal-studio',
    title: 'IA Générative Multimodale appliquée au Commerce & Vente Live',
    subtitle: 'Création d’avatars, automatisation de vidéos promotionnelles et négociation dynamique',
    description: 'Exploitez la puissance de Gemini 2.5 et des modèles multimodaux pour automatiser la génération de vos visuels, de vos scripts de vente et de vos relances clients intelligentes.',
    expertName: 'Ibrahim Canva',
    expertRole: 'Lead AI Engineer & Formateur Émérite',
    expertAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    category: 'Intelligence Artificielle',
    bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    badge: 'Direct Disponible',
    accessType: 'VIP',
    priceLabel: 'Inclus VIP',
    rating: 4.98,
    studentsCount: 489,
    isLiveNow: true,
    liveStreamUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    tags: ['IA', 'Gemini', 'Automatisation', 'Prompt Engineering', 'Marketing'],
    lessons: [
      {
        id: 'ia-1',
        title: 'Module 1 : Architecture des agents IA Gemini connectés au catalogue Nanasore',
        duration: '20:15',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
        description: 'Comment brancher le catalogue produits en temps réel pour des recommandations ultra-ciblées.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=600&q=80',
        isFreePreview: true
      },
      {
        id: 'ia-2',
        title: 'Module 2 : Création de vidéos de démonstration avec le pipeline AWS S3',
        duration: '27:50',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        description: 'Upload direct de vidéos formateurs sur S3 et diffusion instantanée dans les salles.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=600&q=80'
      }
    ]
  }
];

/**
 * Récupère toutes les salles VIP depuis Firestore (collection 'rooms')
 * avec fusion harmonieuse des salles par défaut si la base est vide.
 */
export async function getVipRooms(): Promise<VipRoom[]> {
  try {
    const roomsCol = collection(db, 'rooms');
    const snapshot = await getDocs(roomsCol);

    if (snapshot.empty) {
      // Pré-remplir silencieusement la collection avec les salles par défaut pour initialiser la DB
      try {
        for (const defaultRoom of DEFAULT_VIP_ROOMS) {
          await setDoc(doc(db, 'rooms', defaultRoom.id), {
            ...defaultRoom,
            createdAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (seedErr) {
        console.warn('[VIP ROOMS SERVICE] Note: Seeding Firestore optionnel non bloquant :', seedErr);
      }
      return DEFAULT_VIP_ROOMS;
    }

    const rooms: VipRoom[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      rooms.push({
        id: docSnap.id,
        title: data.title || 'Salle VIP',
        subtitle: data.subtitle || '',
        description: data.description || '',
        expertName: data.expertName || data.instructorName || 'Expert Formateur',
        expertRole: data.expertRole || data.instructorRole || 'Coach & Expert Certifié',
        expertAvatar: data.expertAvatar || data.instructorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        category: data.category || 'E-learning VIP',
        bannerUrl: data.bannerUrl || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
        badge: data.badge || 'Masterclass VIP',
        accessType: data.accessType || 'VIP',
        priceLabel: data.priceLabel || 'Inclus VIP',
        rating: typeof data.rating === 'number' ? data.rating : 5.0,
        studentsCount: typeof data.studentsCount === 'number' ? data.studentsCount : 50,
        isLiveNow: Boolean(data.isLiveNow),
        liveStreamUrl: data.liveStreamUrl || '',
        lessons: Array.isArray(data.lessons) ? data.lessons : [],
        tags: Array.isArray(data.tags) ? data.tags : ['E-learning', 'VIP'],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });

    return rooms;
  } catch (error) {
    console.warn('[VIP ROOMS SERVICE] Erreur lecture Firestore, utilisation des données locales :', error);
    return DEFAULT_VIP_ROOMS;
  }
}

/**
 * Souscription en temps réel aux salles VIP via Supabase Realtime (remplace Firestore onSnapshot)
 */
export function subscribeToVipRooms(callback: (rooms: VipRoom[]) => void): () => void {
  try {
    const fetchRooms = async () => {
      try {
        const roomsCol = collection(db, 'rooms');
        const snapshot = await getDocs(roomsCol);
        if (snapshot.empty) {
          callback(DEFAULT_VIP_ROOMS);
          return;
        }
        const rooms: VipRoom[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          rooms.push({
            id: docSnap.id,
            title: data.title || 'Salle VIP',
            subtitle: data.subtitle || '',
            description: data.description || '',
            expertName: data.expertName || data.instructorName || 'Expert Formateur',
            expertRole: data.expertRole || data.instructorRole || 'Coach & Expert Certifié',
            expertAvatar: data.expertAvatar || data.instructorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
            category: data.category || 'E-learning VIP',
            bannerUrl: data.bannerUrl || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
            badge: data.badge || 'Masterclass VIP',
            accessType: data.accessType || 'VIP',
            priceLabel: data.priceLabel || 'Inclus VIP',
            rating: typeof data.rating === 'number' ? data.rating : 5.0,
            studentsCount: typeof data.studentsCount === 'number' ? data.studentsCount : 50,
            isLiveNow: Boolean(data.isLiveNow),
            liveStreamUrl: data.liveStreamUrl || '',
            lessons: Array.isArray(data.lessons) ? data.lessons : [],
            tags: Array.isArray(data.tags) ? data.tags : ['E-learning', 'VIP'],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          });
        });
        callback(rooms);
      } catch (err) {
        console.warn('[VIP ROOMS SERVICE] Erreur lecture salles, bascule sur défaut :', err);
        callback(DEFAULT_VIP_ROOMS);
      }
    };

    fetchRooms();

    const channelName = `vip_rooms_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrollments',
        },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[VIP ROOMS SERVICE] Exception init Realtime :', err);
    callback(DEFAULT_VIP_ROOMS);
    return () => {};
  }
}

/**
 * Récupère une salle VIP par son identifiant unique
 */
export async function getVipRoomById(roomId: string): Promise<VipRoom | null> {
  // 1. Chercher d'abord dans les salles par défaut
  const defaultFound = DEFAULT_VIP_ROOMS.find((r) => r.id === roomId);

  try {
    const roomRef = doc(db, 'rooms', roomId);
    const snap = await getDoc(roomRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        title: data.title || defaultFound?.title || 'Salle VIP',
        subtitle: data.subtitle || defaultFound?.subtitle || '',
        description: data.description || defaultFound?.description || '',
        expertName: data.expertName || data.instructorName || defaultFound?.expertName || 'Expert Formateur',
        expertRole: data.expertRole || data.instructorRole || defaultFound?.expertRole || 'Coach & Formateur Certifié',
        expertAvatar: data.expertAvatar || data.instructorAvatar || defaultFound?.expertAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        category: data.category || defaultFound?.category || 'E-learning VIP',
        bannerUrl: data.bannerUrl || defaultFound?.bannerUrl || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
        badge: data.badge || defaultFound?.badge || 'Masterclass VIP',
        accessType: data.accessType || defaultFound?.accessType || 'VIP',
        priceLabel: data.priceLabel || defaultFound?.priceLabel || 'Inclus VIP',
        rating: typeof data.rating === 'number' ? data.rating : (defaultFound?.rating || 5.0),
        studentsCount: typeof data.studentsCount === 'number' ? data.studentsCount : (defaultFound?.studentsCount || 45),
        isLiveNow: typeof data.isLiveNow === 'boolean' ? data.isLiveNow : Boolean(defaultFound?.isLiveNow),
        liveStreamUrl: data.liveStreamUrl || defaultFound?.liveStreamUrl || '',
        lessons: Array.isArray(data.lessons) && data.lessons.length > 0 ? data.lessons : (defaultFound?.lessons || []),
        tags: Array.isArray(data.tags) ? data.tags : (defaultFound?.tags || ['VIP']),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    }
  } catch (err) {
    console.warn('[VIP ROOMS SERVICE] Erreur getVipRoomById Firestore :', err);
  }

  return defaultFound || null;
}

/**
 * Enregistre ou met à jour une salle VIP dans Firestore
 */
export async function saveVipRoom(room: Partial<VipRoom> & { id: string }): Promise<void> {
  const roomRef = doc(db, 'rooms', room.id);
  await setDoc(roomRef, {
    ...room,
    updatedAt: serverTimestamp()
  }, { merge: true });
}
