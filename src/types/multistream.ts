/**
 * @file multistream.ts
 * @description Types et structures de données pour la multidiffusion en direct (MediaMTX -> Réseaux Sociaux)
 */

export interface CustomRtmpDestination {
  id: string;
  name: string;
  serverUrl: string;
  streamKey: string;
  enabled: boolean;
}

export interface MultistreamPlatformConfig {
  enabled: boolean;
  serverUrl?: string;
  streamKey: string;
}

export interface StoreMultistreamConfig {
  storeSlug: string;
  isNanasoreLiveEnabled: boolean;
  // Plateformes 1 champ (Stream Key uniquement)
  youtubeStreamKey?: string;
  youtubeEnabled?: boolean;
  facebookStreamKey?: string;
  facebookEnabled?: boolean;
  twitchStreamKey?: string;
  twitchEnabled?: boolean;
  // Plateformes 2 champs (Server URL + Stream Key)
  tiktokServerUrl?: string;
  tiktokStreamKey?: string;
  tiktokEnabled?: boolean;
  instagramServerUrl?: string;
  instagramStreamKey?: string;
  instagramEnabled?: boolean;
  linkedinServerUrl?: string;
  linkedinStreamKey?: string;
  linkedinEnabled?: boolean;
  twitterServerUrl?: string;
  twitterStreamKey?: string;
  twitterEnabled?: boolean;
  telegramServerUrl?: string;
  telegramStreamKey?: string;
  telegramEnabled?: boolean;
  // WhatsApp
  whatsappChannelUrl?: string;
  // Destinations personnalisées
  customRtmpDestinations?: CustomRtmpDestination[];
  updatedAt?: string;
}

export type RelayStatus = 'idle' | 'starting' | 'streaming' | 'error' | 'stopped';

export interface PlatformRelayState {
  platform: string;
  name: string;
  status: RelayStatus;
  startedAt?: number;
  durationSeconds?: number;
  errorMessage?: string | null;
  pid?: number;
}

export interface MultistreamStatusResponse {
  success: boolean;
  storeSlug: string;
  inputSource: string;
  activeCount: number;
  destinations: Record<string, PlatformRelayState>;
}
