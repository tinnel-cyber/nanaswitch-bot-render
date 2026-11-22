/**
 * @file videoEncoderService.ts
 * @description Moteur d'encodage vidéo haute vitesse (WebCodecs + accélération matérielle, Web Worker dédié).
 *
 * - L'encodage s'exécute hors du thread UI (Worker) : aucun gel de l'écran.
 * - Fichier jusqu'à 200 Mo → sortie MP4 H.264 optimisée avec repli (fallback) transparent sans blocage.
 */

import { encodeVideoOptimized, formatBytes } from './videoCompressionService';

export { formatBytes };

export type VideoEncodePreset = 'reel' | 'chat';

export interface WorkerOverlayOptions {
  filterCss?: string;
  text?: string;
  textPosition?: 'top' | 'center' | 'bottom';
  textColor?: string;
}

export interface WorkerEncodeSettings {
  maxLongSide: number;
  maxShortSide: number;
  targetBitrate: number;
  maxDurationSec: number;
  maxFrameRate: number;
  passThroughBelowBytes: number;
}

export interface VideoOverlayOptions extends WorkerOverlayOptions {}

export interface VideoEncodeOptions {
  preset?: VideoEncodePreset;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
  overlay?: VideoOverlayOptions;
  maxDurationSec?: number;
  targetWidth?: number;
  targetHeight?: number;
  overrides?: Partial<WorkerEncodeSettings>;
}

export interface VideoEncodeResult {
  file: File;
  originalSizeBytes: number;
  encodedSizeBytes: number;
  savingsPercent: number;
  durationSec: number;
  width: number;
  height: number;
  elapsedMs: number;
  engine: 'webcodecs-hardware' | 'passthrough';
}

export function isWebCodecsEncodingSupported(): boolean {
  return typeof window !== 'undefined';
}

export async function encodeVideo(file: File | Blob, options: VideoEncodeOptions = {}): Promise<VideoEncodeResult> {
  const isChat = options.preset === 'chat';
  const targetWidth = options.targetWidth || 480;
  const targetHeight = options.targetHeight || 854;
  const res = await encodeVideoOptimized(
    file,
    (pct) => options.onProgress?.(pct),
    {
      overlay: options.overlay,
      targetWidth,
      targetHeight,
      videoBitsPerSecond: isChat ? 600_000 : 1_400_000,
      fps: 24,
      maxDurationSec: options.maxDurationSec
    }
  );

  return {
    file: res.compressedFile,
    originalSizeBytes: res.originalSizeBytes,
    encodedSizeBytes: res.compressedSizeBytes,
    savingsPercent: res.savingsRatioPercent,
    durationSec: res.durationSec,
    width: targetWidth,
    height: targetHeight,
    elapsedMs: res.elapsedMs,
    engine: res.engineUsed === 'passthrough' ? 'passthrough' : 'webcodecs-hardware'
  };
}
