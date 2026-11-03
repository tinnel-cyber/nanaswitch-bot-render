import { Course, CourseModule, CourseLesson } from '../../../../../types';

export interface MarketplaceCourse extends Course {
  status: 'published' | 'draft' | 'archived';
  isFeatured?: boolean;
  trailerVideoUrl?: string; // Preview MP4 pour le Hover-to-Play
  discountPrice?: number;
  originalPrice?: number;
  reviewsCount?: number;
  badge?: 'Bestseller' | 'Tendance UEMOA' | 'Nouveau' | 'Certifiant' | 'Coup de Cœur';
  tags?: string[];
  durationLabel?: string;
  createdAt?: number;
  updatedAt?: number;
}

export type CourseCategory = 
  | 'ALL'
  | 'FINTECH_MOBILE_MONEY'
  | 'TELECOM_POS'
  | 'POS_COMMERCE'
  | 'LIVE_SHOPPING'
  | 'CYBERSECURITY_AUDIT';

export interface MobileMoneyProvider {
  id: 'WAVE' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'MTN_MOMO';
  name: string;
  country: string;
  color: string;
  feeLabel: string;
  iconBg: string;
}
