/**
 * @file vipRoomsService.ts
 * @description Service de gestion des Salles VIP multi-salles pour l'e-learning (Supabase Realtime & SQL)
 * Fournit la synchronisation temps réel, l'accès hors-ligne, et les masterclasses d'experts pré-configurées.
 */

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
 */
export const DEFAULT_VIP_ROOMS: VipRoom[] = [
  {
    id: 'telecom-fintech-masterclass',
    title: 'Masterclass Télécoms & Infrastructure Fintech Afrique',
    subtitle: 'Réseaux USSD, passerelles Mobile Money souveraines et télécoms de nouvelle génération',
    description: 'Une formation complète dispensée par les ingénieurs et directeurs télécoms leaders en Afrique de l’Ouest. Apprenez à concevoir une architecture de paiement résiliente, à router les transactions vers Orange, Moov, Wave et MTN, et à sécuriser vos backends bancaires face aux ruptures de réseau.',
    expertName: 'Dr. Ousmane Ouédraogo',
    expertRole: 'Architecte Réseaux Télécoms & Spécialiste Monétique',
    expertAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    category: 'Télécoms & Fintech',
    bannerUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
    badge: 'Masterclass Certifiante',
    accessType: 'VIP',
    priceLabel: 'Inclus Abonnement VIP',
    rating: 4.95,
    studentsCount: 342,
    isLiveNow: true,
    liveStreamUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['Télécoms', 'USSD', 'Mobile Money', 'Fintech', 'Afrique de l’Ouest'],
    lessons: [
      {
        id: 'lesson-1-telecom-intro',
        title: 'Session 1 : Les protocoles SS7 et USSD dans les paiements mobiles',
        duration: '42 min',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        description: 'Plongée au cœur des protocoles de signalisation mobile et de la couche applicative USSD pour les transactions financières.',
        isFreePreview: true
      },
      {
        id: 'lesson-2-mobile-money-switch',
        title: 'Session 2 : Conception d’un Switch de paiement souverain et redondance multi-opérateurs',
        duration: '58 min',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        description: 'Comment interconnecter en haute disponibilité Orange Money, Wave et MTN via webhooks et files de messages RabbitMQ / Redis.',
        isFreePreview: false
      },
      {
        id: 'lesson-3-compliance-pci-dss',
        title: 'Session 3 : Conformité BCEAO, sécurité PCI-DSS et gestion des litiges',
        duration: '51 min',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        description: 'Les règles réglementaires fondamentales pour opérer légalement et protéger les fonds des commerçants.',
        isFreePreview: false
      }
    ]
  },
  {
    id: 'agro-export-masterclass',
    title: 'Stratégie Agro-Business & Export International',
    subtitle: 'De la production locale aux marchés européens et asiatiques à forte valeur ajoutée',
    description: 'Transformez vos produits locaux (karité, sésame, cajou, mangues séchées) en marques d’export premium conformes aux normes HACCP et ISO 22000. Stratégies de négociation avec les acheteurs internationaux et financement d’exportation.',
    expertName: 'Mariam Konaté',
    expertRole: 'Directrice Export & Négociatrice Internationale Agro-Industrie',
    expertAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    category: 'Agro-Business & Export',
    bannerUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    badge: 'Direct Disponible',
    accessType: 'VIP',
    priceLabel: 'Inclus Abonnement VIP',
    rating: 4.88,
    studentsCount: 218,
    isLiveNow: false,
    liveStreamUrl: '',
    tags: ['Agrobusiness', 'Export', 'Certification Bio', 'Commerce International'],
    lessons: [
      {
        id: 'agro-lesson-1',
        title: 'Session 1 : Trouver des acheteurs solvables en Europe et au Moyen-Orient',
        duration: '35 min',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        description: 'Techniques de prospection B2B, salons professionnels et plateformes de mise en relation.',
        isFreePreview: true
      },
      {
        id: 'agro-lesson-2',
        title: 'Session 2 : Emballages, conservation et logistique maritime / aérienne',
        duration: '49 min',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        description: 'Optimisation de la chaîne du froid, conteneurs ventilés et négociation avec les transitaires.',
        isFreePreview: false
      }
    ]
  },
  {
    id: 'ai-ecommerce-masterclass',
    title: 'Intelligence Artificielle & Automatisation du Commerce Digital',
    subtitle: 'Vendre 24h/24 avec des agents WhatsApp conversationnels et des vidéos générées par IA',
    description: 'Automatisez 100% de votre relation client et de vos relances de paniers abandonnés sur WhatsApp avec des agents intelligents. Générez des visuels et vidéos de déballage produit ultra-réalistes grâce aux modèles d’IA générative.',
    expertName: 'Jean-Luc Amany',
    expertRole: 'Ingénieur IA & Consultant E-Commerce Growth',
    expertAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    category: 'Intelligence Artificielle & Marketing',
    bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    badge: 'Nouveau',
    accessType: 'VIP',
    priceLabel: 'Inclus Abonnement VIP',
    rating: 4.98,
    studentsCount: 512,
    isLiveNow: false,
    liveStreamUrl: '',
    tags: ['IA', 'WhatsApp Bot', 'Automatisation', 'Live Shopping'],
    lessons: [
      {
        id: 'ai-lesson-1',
        title: 'Session 1 : Créer son agent de vente autonome sur WhatsApp Cloud API',
        duration: '45 min',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        description: 'Configuration pas-à-pas des webhooks, de l’arbre de décision et des relances automatiques.',
        isFreePreview: true
      },
      {
        id: 'ai-lesson-2',
        title: 'Session 2 : Scripts de closing à fort taux de conversion pour le marché africain',
        duration: '38 min',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        description: 'Comment lever les objections sur les frais de livraison et rassurer les clients sur le paiement Mobile Money.',
        isFreePreview: false
      }
    ]
  }
];

// Mémoire locale pour les salles
let localVipRooms: VipRoom[] = [...DEFAULT_VIP_ROOMS];

/**
 * Récupère toutes les salles VIP depuis Supabase
 */
export async function getVipRooms(): Promise<VipRoom[]> {
  try {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .limit(50);

    if (error || !data || data.length === 0) {
      return localVipRooms;
    }

    const fetched: VipRoom[] = data.map((d: any) => ({
      id: d.id,
      title: d.title || 'Salle VIP',
      subtitle: d.description || '',
      description: d.description || '',
      expertName: d.host_name || 'Expert Formateur',
      expertRole: 'Coach & Expert Certifié',
      expertAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      category: 'E-learning VIP',
      bannerUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
      badge: 'Masterclass VIP',
      accessType: 'VIP',
      priceLabel: 'Inclus VIP',
      rating: 5.0,
      studentsCount: d.viewer_count || 50,
      isLiveNow: d.status === 'live',
      liveStreamUrl: d.stream_url || '',
      lessons: [],
      tags: ['E-learning', 'VIP'],
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }));

    return fetched.length > 0 ? fetched : localVipRooms;
  } catch (error) {
    console.warn('[VIP ROOMS SERVICE] Erreur lecture Supabase, utilisation des données locales :', error);
    return localVipRooms;
  }
}

/**
 * Souscription en temps réel aux salles VIP via Supabase Realtime
 */
export function subscribeToVipRooms(callback: (rooms: VipRoom[]) => void): () => void {
  callback(localVipRooms);

  const fetchRooms = async () => {
    const rooms = await getVipRooms();
    callback(rooms);
  };

  fetchRooms();

  const channel = supabase
    .channel('public_vip_rooms')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'live_sessions'
      },
      () => {
        fetchRooms();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Récupère une salle VIP par son identifiant unique
 */
export async function getVipRoomById(roomId: string): Promise<VipRoom | null> {
  const defaultFound = DEFAULT_VIP_ROOMS.find((r) => r.id === roomId);

  try {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('id', roomId)
      .maybeSingle();

    if (data && !error) {
      return {
        id: data.id,
        title: data.title || defaultFound?.title || 'Salle VIP',
        subtitle: defaultFound?.subtitle || '',
        description: data.description || defaultFound?.description || '',
        expertName: data.host_name || defaultFound?.expertName || 'Expert Formateur',
        expertRole: defaultFound?.expertRole || 'Coach & Formateur Certifié',
        expertAvatar: defaultFound?.expertAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        category: defaultFound?.category || 'E-learning VIP',
        bannerUrl: defaultFound?.bannerUrl || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
        badge: defaultFound?.badge || 'Masterclass VIP',
        accessType: defaultFound?.accessType || 'VIP',
        priceLabel: defaultFound?.priceLabel || 'Inclus VIP',
        rating: defaultFound?.rating || 5.0,
        studentsCount: data.viewer_count || defaultFound?.studentsCount || 45,
        isLiveNow: data.status === 'live',
        liveStreamUrl: data.stream_url || defaultFound?.liveStreamUrl || '',
        lessons: defaultFound?.lessons || [],
        tags: defaultFound?.tags || ['VIP'],
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }
  } catch (err) {
    console.warn('[VIP ROOMS SERVICE] Erreur getVipRoomById Supabase :', err);
  }

  return defaultFound || null;
}

/**
 * Enregistre ou met à jour une salle VIP dans Supabase
 */
export async function saveVipRoom(room: Partial<VipRoom> & { id: string }): Promise<void> {
  try {
    await supabase
      .from('live_sessions')
      .upsert({
        id: room.id,
        title: room.title,
        description: room.description,
        host_name: room.expertName,
        stream_url: room.liveStreamUrl,
        status: room.isLiveNow ? 'live' : 'scheduled',
        updated_at: new Date().toISOString()
      });
  } catch (err) {
    console.warn('[VIP ROOMS SERVICE] Erreur saveVipRoom Supabase:', err);
  }
}
