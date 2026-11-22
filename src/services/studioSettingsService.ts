/**
 * @file studioSettingsService.ts
 * @description Paramètres persistants dédiés au Studio de Montage Pro & à l'Enregistreur d'Écran.
 * Stockés localement (`localStorage`) pour une persistance immédiate entre chaque session (0 stockage Cloud).
 */

import type {
  CamBubbleCorner,
  CamBubbleShape,
  RecorderMode,
  RecorderQuality
} from './screenRecorderService';

export type StudioAspectRatio = '16:9' | '9:16' | '1:1';
export type CaptureAngleMode = 'full' | 'zoom_center' | 'left_half' | 'right_half';
export type RecorderOutputFormat = 'auto' | 'mp4' | 'webm';
export type RecorderFps = 24 | 30 | 60;
export type RecorderCountdownSec = 0 | 3 | 5;
export type ExportResSetting = '480p' | '720p' | '1080p';
export type SubtitleLangCode = 'fr' | 'en' | 'es' | 'ar';

export interface VideoStudioSettings {
  // 1. Périphériques Enregistreur (Caméra & Micro)
  defaultRecorderMode: RecorderMode;
  selectedCameraDeviceId: string;
  selectedMicDeviceId: string;
  includeMic: boolean;
  includeSystemAudio: boolean;

  // 2. Capture Écran, Barre d'adresse & Angle
  hideBrowserAddressBar: boolean;
  captureAngle: CaptureAngleMode;

  // 3. Bulle Caméra (PiP)
  bubbleEnabled: boolean;
  bubbleShape: CamBubbleShape;
  bubbleCorner: CamBubbleCorner;
  bubbleSizePct: number;
  bubbleMirror: boolean;

  // 4. Format, Qualité & Sortie Enregistreur
  recorderAspectRatio: StudioAspectRatio;
  recorderQuality: RecorderQuality;
  recorderFps: RecorderFps;
  recorderOutputFormat: RecorderOutputFormat;

  // 5. Démarrage, Compteur & Automatisation
  countdownSec: RecorderCountdownSec;
  showLiveTimerBadge: boolean;
  autoDownloadOnStop: boolean;
  autoLoadIntoTimeline: boolean;

  // 6. Préférences Monteur Pro & Export
  defaultSocialFormat: StudioAspectRatio;
  defaultExportResolution: ExportResSetting;
  defaultExportContainer: 'mp4' | 'webm';
  defaultSubtitleLanguage: SubtitleLangCode;

  // 7. Signature & Filigrane de Marque (pendant l'enregistrement)
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkLogoDataUrl: string;
  watermarkCorner: CamBubbleCorner;
  watermarkOpacity: number; // 0.2 .. 1.0
  watermarkColor: string;
  watermarkSizePct: number; // 8 .. 22
}

const STORAGE_KEY = 'nana_video_studio_settings_v1';

export const DEFAULT_VIDEO_STUDIO_SETTINGS: VideoStudioSettings = {
  defaultRecorderMode: 'screen',
  selectedCameraDeviceId: '',
  selectedMicDeviceId: '',
  includeMic: true,
  includeSystemAudio: true,

  hideBrowserAddressBar: false,
  captureAngle: 'full',

  bubbleEnabled: true,
  bubbleShape: 'circle',
  bubbleCorner: 'bottom-right',
  bubbleSizePct: 20,
  bubbleMirror: true,

  recorderAspectRatio: '16:9',
  recorderQuality: '720p',
  recorderFps: 30,
  recorderOutputFormat: 'auto',

  countdownSec: 3,
  showLiveTimerBadge: true,
  autoDownloadOnStop: true,
  autoLoadIntoTimeline: false,

  defaultSocialFormat: '9:16',
  defaultExportResolution: '720p',
  defaultExportContainer: 'mp4',
  defaultSubtitleLanguage: 'fr',

  watermarkEnabled: false,
  watermarkText: '',
  watermarkLogoDataUrl: '',
  watermarkCorner: 'top-left',
  watermarkOpacity: 0.8,
  watermarkColor: '#FFFFFF',
  watermarkSizePct: 12
};

export function loadVideoStudioSettings(): VideoStudioSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_VIDEO_STUDIO_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VIDEO_STUDIO_SETTINGS };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return { ...DEFAULT_VIDEO_STUDIO_SETTINGS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_VIDEO_STUDIO_SETTINGS };
}

export function saveVideoStudioSettings(settings: VideoStudioSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function resetVideoStudioSettings(): VideoStudioSettings {
  const fresh = { ...DEFAULT_VIDEO_STUDIO_SETTINGS };
  saveVideoStudioSettings(fresh);
  return fresh;
}
