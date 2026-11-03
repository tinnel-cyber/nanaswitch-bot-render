/**
 * Types & Interfaces pour le Hub VIP Wameet (Prompt 26)
 * Découverte des Salles VIP (Éducation/Cours) et Salons VIP (Affaires/Networking)
 */

export type VipLoungeAccessType = 'SUBSCRIPTION' | 'VIP_PASS';
export type VipCourseAccessType = 'FREE' | 'PREMIUM';
export type VipFilterCategory = 'ALL' | 'BUSINESS' | 'COURSES' | 'LIVE_NOW' | 'TOP_RATED';

/**
 * Salon d'Affaires & Coaching (Tons or / noir)
 */
export interface VipBusinessLounge {
  id: string;
  title: string;
  topic: string;
  category: string;
  coachName: string;
  coachRole: string;
  coachAvatar: string;
  coachBio?: string;
  isCoachVerified?: boolean;
  isOnline?: boolean;
  rating: number; // ex: 4.95
  reviewsCount: number; // ex: 128
  activeMembersCount: number; // ex: 48
  accessType: VipLoungeAccessType; // 'SUBSCRIPTION'
  badgeLabel?: string; // ex: 'Accès sur Abonnement'
  subscriptionPriceLabel: string; // ex: '25 000 FCFA / mois'
  subscriptionPeriod?: string;
  tags: string[];
  nextLiveDate?: string; // ex: 'Ce soir à 20h00 GMT'
  isLiveNow?: boolean;
  bannerUrl?: string;
  roomCode?: string;
  perks?: string[];
  maxSeats?: number;
  availableSeats?: number;
}

/**
 * Salle de Cours & Masterclass (Tons bleu nuit / argent)
 */
export interface VipCourseRoom {
  id: string;
  title: string;
  category: string;
  instructorName: string;
  instructorRole: string;
  instructorAvatar: string;
  isInstructorVerified?: boolean;
  studentsCount: number; // ex: 1420
  completionRate?: number; // ex: 96 (%)
  accessType: VipCourseAccessType; // 'FREE' | 'PREMIUM'
  badgeLabel?: string; // ex: 'Accès Gratuit' | 'Premium'
  priceLabel?: string; // ex: 'Offert' | '45 000 FCFA'
  rating: number; // ex: 4.9
  reviewsCount: number; // ex: 310
  modulesCount: number; // ex: 16
  durationHours: number; // ex: 24
  level: 'Tous Niveaux' | 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Masterclass';
  tags: string[];
  nextSessionDate?: string; // ex: 'Jeudi 19h00 GMT'
  isLiveNow?: boolean;
  bannerUrl?: string;
  syllabus?: string[];
  hasCertificate?: boolean;
}

/**
 * Props pour le composant InfiniteCarouselRow
 */
export interface InfiniteCarouselRowProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: 'gold' | 'silver' | 'emerald' | 'blue';
  icon?: React.ReactNode;
  speed?: 'slow' | 'normal' | 'fast';
  direction?: 'left' | 'right';
  pauseOnHover?: boolean;
  showNavigationControls?: boolean;
  actionButton?: {
    label: string;
    onClick?: () => void;
  };
  className?: string;
  countLabel?: string;
}

/**
 * Props pour la Carte Salon VIP
 */
export interface VipBusinessLoungeCardProps {
  lounge: VipBusinessLounge;
  onSelect?: (lounge: VipBusinessLounge) => void;
  onSubscribe?: (lounge: VipBusinessLounge) => void;
  className?: string;
}

/**
 * Props pour la Carte Salle de Cours VIP
 */
export interface VipCourseRoomCardProps {
  course: VipCourseRoom;
  onSelect?: (course: VipCourseRoom) => void;
  onEnroll?: (course: VipCourseRoom) => void;
  className?: string;
}

/**
 * Props pour l'Écran Hub VipDiscoveryScreen
 */
export interface VipDiscoveryScreenProps {
  businessLounges?: VipBusinessLounge[];
  courseRooms?: VipCourseRoom[];
  currentUserProfile?: {
    name: string;
    handle: string;
    avatarUrl: string;
    isVipMember?: boolean;
  };
  onSelectLounge?: (lounge: VipBusinessLounge) => void;
  onSelectCourse?: (course: VipCourseRoom) => void;
  onBackToApp?: () => void;
  onCreateVipSpace?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * PROMPT 28 : Types pour l'Intérieur de la Salle VIP (LMS Wameet)
 */

export interface VipLessonItem {
  id: string;
  title: string;
  type: 'video' | 'pdf';
  duration?: string; // ex: '24 min'
  videoUrl?: string;
  pdfUrl?: string;
  pdfSize?: string; // ex: '3.8 MB'
  isCompleted?: boolean;
  description?: string;
}

export interface VipChapterItem {
  id: string;
  title: string;
  description?: string;
  lessons: VipLessonItem[];
}

export interface VipQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface VipQnaAnswer {
  authorName: string;
  authorAvatar: string;
  authorRole: string;
  answerText: string;
  answeredAt: string;
}

export interface VipQnaMessage {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorRole: 'STUDENT' | 'INSTRUCTOR' | 'MODERATOR';
  questionText: string;
  createdAt: string;
  isPinned: boolean;
  upvotesCount: number;
  hasUpvoted?: boolean;
  instructorAnswer?: VipQnaAnswer;
}

export interface VipCourseRoomViewProps {
  course?: VipCourseRoom | null;
  chapters?: VipChapterItem[];
  quizQuestions?: VipQuizQuestion[];
  initialQnaMessages?: VipQnaMessage[];
  currentUser?: {
    name: string;
    avatarUrl?: string;
    isSubscribed?: boolean;
    isInstructor?: boolean;
  };
  onBackToHub?: () => void;
  className?: string;
}

/**
 * =====================================================================
 * PROMPT 29 : Types pour l'Intérieur du "Salon VIP" (Business & Networking)
 * =====================================================================
 */

export type VipLoungePostType =
  | 'ANALYSIS'
  | 'INVESTMENT_OPPORTUNITY'
  | 'PRIVATE_VIDEO'
  | 'VOICE_BRIEF';

export interface VipLoungeAttachment {
  title: string;
  type: 'pdf' | 'excel' | 'link';
  size?: string;
  url: string;
}

export interface VipInvestmentMetrics {
  ticketMin: string; // ex: "5 000 000 FCFA"
  roiEstimated: string; // ex: "18% à 24% brut"
  termMonths: number; // ex: 18 mois
  capitalSecured: string; // ex: "Hypothèque foncière / Nantissement"
  totalTarget: string; // ex: "50 000 000 FCFA"
  committedPercentage: number; // ex: 68 (%)
  deadline: string; // ex: "30 Novembre 2026"
}

export interface VipLoungeComment {
  id: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface VipLoungeFeedPost {
  id: string;
  type: VipLoungePostType;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  isOwner: boolean;
  title: string;
  content: string;
  createdAt: string;
  isConfidential: boolean;
  tags: string[];
  likesCount: number;
  hasLiked?: boolean;
  videoUrl?: string;
  audioUrl?: string;
  audioDuration?: string;
  investmentMetrics?: VipInvestmentMetrics;
  attachments?: VipLoungeAttachment[];
  comments?: VipLoungeComment[];
}

export interface Vip1to1ConsultationType {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  priceLabel: string;
  iconName?: string;
}

export interface Vip1to1Slot {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  isAvailable: boolean;
}

export interface Vip1to1BookingData {
  consultationType: string;
  date: string;
  time: string;
  memberNotes: string;
  memberPhone?: string;
  confidentialAttachmentName?: string;
}

export type VipDealStatus = 'PENDING' | 'APPROVED' | 'FUNDED' | 'REJECTED';
export type VipDealCategory =
  | 'FINANCING'
  | 'PARTNERSHIP'
  | 'COFOUNDER'
  | 'COMMERCIAL_TENDER'
  | 'ACQUISITION';

export interface VipDealRequest {
  id: string;
  title: string;
  category: VipDealCategory;
  categoryLabel: string;
  status: VipDealStatus;
  targetAmount?: string; // ex: "35 000 000 FCFA"
  country: string; // ex: "Côte d'Ivoire"
  authorName: string;
  authorCompany: string;
  authorRole: string;
  authorAvatar: string;
  summary: string;
  createdAt: string;
  reviewedByOwnerAt?: string;
  verifiedBadge?: boolean;
  ndaRequired?: boolean;
  metrics?: {
    currentRevenue?: string;
    ebitdaMargin?: string;
    teamSize?: number;
  };
}

export interface VipBusinessLoungeViewProps {
  lounge?: VipBusinessLounge | null;
  feedPosts?: VipLoungeFeedPost[];
  deals?: VipDealRequest[];
  currentUser?: {
    name: string;
    avatarUrl?: string;
    company?: string;
    isVipMember?: boolean;
    isOwner?: boolean;
  };
  onBackToHub?: () => void;
  className?: string;
}

