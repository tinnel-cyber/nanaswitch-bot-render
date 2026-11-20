import { StoreProductItem } from '../components/storeBuilder/types';

export type LiveSessionMode = 
  | 'live_shopping'       // 🛍️ Live Shopping & Vente Flash
  | 'webinar_training'    // 🎓 Webinaire & Formation Magistrale
  | 'coaching_1to1'       // 🤝 Rencontre & Appel Coaching 1-to-1 en Direct
  | 'interactive_class';  // 🏫 Classe Interactive & Coaching de Groupe

export type LiveSourceType = 
  | 'native_room'         // Salle WebRTC / Caméra & Écran natif dans le navigateur
  | 'youtube'             // YouTube Live
  | 'facebook'            // Facebook Live
  | 'tiktok'              // TikTok Live Embed
  | 'twitch'              // Twitch Stream
  | 'vimeo'               // Vimeo Live / Video
  | 'hls'                 // Flux HLS (.m3u8)
  | 'mp4';                // Vidéo MP4 pré-enregistrée (Simulive)

export type LiveAspectRatio = 'auto' | '16:9' | '9:16' | '1:1' | '4:3';

export type LiveBadgeColor = 'red' | 'blue' | 'emerald' | 'indigo' | 'amber';

export type LiveSessionStatus = 'scheduled' | 'live' | 'ended';

export interface LiveChatMessage {
  id: string;
  sessionId: string;
  senderName: string;
  senderId?: string;
  senderRole?: 'host' | 'student' | 'viewer';
  text: string;
  isQuestion?: boolean;
  isHandRaise?: boolean;
  isPinned?: boolean;
  createdAt: number;
  avatar?: string;
}

export interface LiveQuizOption {
  id: string;
  label: string; // 'A', 'B', 'C', 'D'
  text: string;
  votesCount?: number;
}

export interface LiveQuizQuestion {
  id: string;
  question: string;
  options: LiveQuizOption[];
  correctOptionId: string;
  explanation?: string;
  isActive: boolean;
  startedAt?: number;
  totalVotes?: number;
  votesBreakdown?: Record<string, number>;
}

export interface LiveQuizResponse {
  id: string;
  quizId: string;
  studentName: string;
  studentId?: string;
  selectedOptionId: string;
  isCorrect: boolean;
  createdAt: number;
}

export interface LiveAssignment {
  id: string;
  title: string;
  instructions: string;
  pdfUrl?: string;
  pdfName?: string;
  durationMinutes?: number;
  deadline?: number;
  isActive: boolean;
  submissionsCount?: number;
  createdAt?: number;
}

export interface LiveSubmission {
  id: string;
  assignmentId?: string;
  studentName: string;
  studentContact?: string; // WhatsApp ou Email
  studentPhone?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  textContent?: string;
  submittedAt: number;
  grade?: string; // ex: "18/20 - Félicitations !"
  feedback?: string;
  status: 'submitted' | 'graded' | 'reviewed';
}

export interface HandRaisedUser {
  id: string;
  name: string;
  timestamp: number;
}

export interface LiveSession {
  id: string;
  storeId: string;
  storeName: string;
  sessionSlug: string;
  title: string;
  subtitle?: string;
  description?: string;
  sessionMode: LiveSessionMode;
  status: LiveSessionStatus;
  sourceType: LiveSourceType;
  streamUrl?: string;
  nativeRoomId?: string;
  posterUrl?: string;
  aspectRatio: LiveAspectRatio;
  scheduledAt?: number;
  startedAt?: number;
  endedAt?: number;
  viewerCount?: number;
  countdownTitle?: string;
  countdownEndsAt?: number;
  pinnedProductId?: string | null;
  pinnedProduct?: StoreProductItem | null;
  productIds?: string[];
  products?: StoreProductItem[];
  whatsappPhone?: string;
  hostName?: string;
  hostAvatar?: string;
  isHost?: boolean;
  allowChat?: boolean;
  recordingUrl?: string;
  createdAt?: number;
  updatedAt?: number;
  
  // Nouveaux champs interactifs Salle de classe & Coaching
  activeQuiz?: LiveQuizQuestion | null;
  activeAssignment?: LiveAssignment | null;
  pinnedMessage?: LiveChatMessage | null;
  handRaisedUsers?: HandRaisedUser[];
  coachingRoomUrl?: string;

  // Contrôle d'accès Cours Payant / Adhésion Membre VIP
  isPaid?: boolean;
  accessPrice?: number;
  accessCurrency?: string;
  accessLabel?: string;

  // Badge de rencontre personnalisable (remplace "Live Shopping" / "Salle de Formation" par tout type d'événement)
  customBadgeLabel?: string;
  customBadgeColor?: LiveBadgeColor;
}
