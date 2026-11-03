export type SearchTabType =
  | 'top'
  | 'users'
  | 'shorts'
  | 'longs'
  | 'lives'
  | 'sounds'
  | 'hashtags';

export type SearchSortOption = 'most_viewed' | 'newest';

export interface CreatorPlaylistItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoUrl?: string;
  viewsCount: number;
  duration: string;
  category: 'shorts' | 'longs' | 'lives';
  createdAt: string;
  createdAtTimestamp: number;
  likesCount: number;
  productTag?: {
    name: string;
    priceFcfa: number;
  };
}

export interface CreatorProfile {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  badge?: string;
  verified?: boolean;
  isLiveNow?: boolean;
  liveTitle?: string;
  liveViewersCount?: number;
  followersCount: number;
  likesCount: number;
  salesCount?: number;
  bio: string;
  category: string;
  playlist: CreatorPlaylistItem[];
}

export interface ShortVideoResult {
  id: string;
  title: string;
  creatorName: string;
  creatorHandle: string;
  creatorAvatar: string;
  thumbnailUrl: string;
  videoUrl?: string;
  viewsCount: number;
  likesCount: number;
  createdAt: string;
  createdAtTimestamp: number;
  hashtags: string[];
  productTag?: {
    name: string;
    priceFcfa: number;
  };
}

export interface LongVideoResult {
  id: string;
  title: string;
  creatorName: string;
  creatorHandle: string;
  creatorAvatar: string;
  thumbnailUrl: string;
  videoUrl?: string;
  duration: string;
  viewsCount: number;
  createdAt: string;
  createdAtTimestamp: number;
  category: string;
}

export interface LiveSessionResult {
  id: string;
  title: string;
  creatorName: string;
  creatorHandle: string;
  creatorAvatar: string;
  thumbnailUrl: string;
  viewersCount: number;
  category: string;
  isLive: boolean;
  productLiveBadge?: string;
  startedAt: string;
  createdAtTimestamp: number;
}

export interface SoundResult {
  id: string;
  title: string;
  artist: string;
  duration: string;
  usesCount: number;
  coverUrl: string;
  audioPreviewUrl?: string;
  isTrending?: boolean;
}

export interface HashtagResult {
  id: string;
  tag: string;
  viewsCount: number;
  postsCount: number;
  isTrending?: boolean;
}

export interface SearchDataCollection {
  creators: CreatorProfile[];
  shorts: ShortVideoResult[];
  longs: LongVideoResult[];
  lives: LiveSessionResult[];
  sounds: SoundResult[];
  hashtags: HashtagResult[];
}
