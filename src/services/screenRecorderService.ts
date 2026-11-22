/**
 * @file screenRecorderService.ts
 * @description Enregistreur d'écran & capture d'image professionnel 100% local (zéro stockage Cloud).
 * - Capture d'écran (PC) ou Caméra directe (Mobile / Facecam)
 * - Bulle Caméra (PiP) activable/désactivable en temps réel : Rond ou Carré arrondi, 4 coins, redimensionnable, miroir
 * - Mixage audio propre (Micro + Audio système via AudioContext)
 * - Capture photo instantanée (.PNG) avec téléchargement direct
 * - Enregistrement vidéo (.MP4 / .WebM) avec Pause/Reprendre et téléchargement direct sur l'appareil
 */

export type RecorderMode = 'screen' | 'camera';
export type CamBubbleShape = 'circle' | 'square';
export type CamBubbleCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type RecorderQuality = '720p' | '1080p';

export interface CamBubbleConfig {
  enabled: boolean;
  shape: CamBubbleShape;
  corner: CamBubbleCorner;
  sizePct: number; // 14 .. 34
  mirror: boolean;
}

export interface BrandWatermarkConfig {
  enabled: boolean;
  text: string;
  logoDataUrl?: string;
  corner: CamBubbleCorner;
  opacity: number; // 0.2 .. 1.0
  color: string;
  sizePct: number; // 8 .. 22
}

export interface ScreenRecorderOptions {
  mode: RecorderMode;
  quality: RecorderQuality;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  fps?: 24 | 30 | 60;
  outputFormat?: 'auto' | 'mp4' | 'webm';
  hideBrowserAddressBar?: boolean;
  captureAngle?: 'full' | 'zoom_center' | 'left_half' | 'right_half';
  autoDownload?: boolean;
  includeMic: boolean;
  includeSystemAudio: boolean;
  cameraDeviceId?: string;
  micDeviceId?: string;
  facingMode?: 'user' | 'environment';
  bubble: CamBubbleConfig;
  watermark?: BrandWatermarkConfig;
  previewCanvas?: HTMLCanvasElement | null;
  onStop?: (result: RecordedMediaResult) => void;
  onError?: (message: string) => void;
}

export interface RecordedMediaResult {
  file: File;
  blob: Blob;
  url: string;
  mimeType: string;
  durationSec: number;
  sizeBytes: number;
}

export interface MediaDeviceLists {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
}

export async function listAvailableMediaDevices(requestPermissionIfNeeded = false): Promise<MediaDeviceLists> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return { cameras: [], microphones: [] };
  }
  if (requestPermissionIfNeeded && navigator.mediaDevices.getUserMedia) {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      tmp.getTracks().forEach((t) => t.stop());
    } catch {
      try {
        const tmpAudio = await navigator.mediaDevices.getUserMedia({ audio: true });
        tmpAudio.getTracks().forEach((t) => t.stop());
      } catch {}
    }
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      cameras: devices.filter((d) => d.kind === 'videoinput'),
      microphones: devices.filter((d) => d.kind === 'audioinput')
    };
  } catch {
    return { cameras: [], microphones: [] };
  }
}

export function isScreenCaptureSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices) &&
    typeof (navigator.mediaDevices as any).getDisplayMedia === 'function'
  );
}

export function triggerDirectDownload(blobOrUrl: Blob | string, filename: string): void {
  const isBlob = typeof blobOrUrl !== 'string';
  const url = isBlob ? URL.createObjectURL(blobOrUrl) : blobOrUrl;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (isBlob) {
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }
}

function resolveRecorderCanvasSize(
  quality: RecorderQuality,
  aspectRatio: '16:9' | '9:16' | '1:1' = '16:9'
): { width: number; height: number } {
  const baseShort = quality === '1080p' ? 1080 : 720;
  if (aspectRatio === '9:16') {
    return { width: baseShort, height: quality === '1080p' ? 1920 : 1280 };
  }
  if (aspectRatio === '1:1') {
    return { width: baseShort, height: baseShort };
  }
  return { width: quality === '1080p' ? 1920 : 1280, height: baseShort };
}

function drawBrandWatermarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  wm: BrandWatermarkConfig | undefined,
  logoImg: HTMLImageElement | null
): void {
  if (!wm || !wm.enabled) return;
  const cleanText = String(wm.text || '').trim();
  const hasLogo = Boolean(logoImg && logoImg.complete && logoImg.naturalWidth > 0);
  if (!cleanText && !hasLogo) return;

  const margin = Math.round(Math.min(W, H) * 0.03);
  const scaleFactor = Math.max(8, Math.min(22, Number(wm.sizePct) || 12)) / 100;
  const logoH = hasLogo ? Math.round(Math.min(W, H) * scaleFactor * 0.65) : 0;
  const logoW = hasLogo && logoImg ? Math.round((logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight)) * logoH) : 0;
  const fontSize = Math.max(14, Math.round(Math.min(W, H) * scaleFactor * 0.24));
  const padX = Math.round(fontSize * 0.75);
  const padY = Math.round(fontSize * 0.45);
  const gap = hasLogo && cleanText ? Math.round(fontSize * 0.5) : 0;

  ctx.save();
  ctx.globalAlpha = Math.max(0.2, Math.min(1, Number(wm.opacity) || 0.8));
  ctx.font = `800 ${fontSize}px system-ui, -apple-system, sans-serif`;
  const textW = cleanText ? Math.ceil(ctx.measureText(cleanText).width) : 0;

  const boxW = padX * 2 + logoW + gap + textW;
  const boxH = Math.max(logoH, fontSize) + padY * 2;

  let bx = margin;
  let by = margin;
  if (wm.corner === 'top-right') {
    bx = W - boxW - margin;
    by = margin;
  } else if (wm.corner === 'bottom-left') {
    bx = margin;
    by = H - boxH - margin;
  } else if (wm.corner === 'bottom-right') {
    bx = W - boxW - margin;
    by = H - boxH - margin;
  }

  // Cartouche vitrée discrète si texte présent (garantit lisibilité sur fond clair ou sombre)
  if (cleanText) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.58)';
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, Math.round(boxH * 0.32));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  let cursorX = bx + padX;
  if (hasLogo && logoImg) {
    const ly = by + (boxH - logoH) / 2;
    ctx.drawImage(logoImg, cursorX, ly, logoW, logoH);
    cursorX += logoW + gap;
  }

  if (cleanText) {
    ctx.fillStyle = wm.color || '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 4;
    ctx.fillText(cleanText, cursorX, by + boxH / 2);
  }

  ctx.restore();
}

export class ProScreenRecorderSession {
  private screenStream: MediaStream | null = null;
  private camStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private screenVideo: HTMLVideoElement | null = null;
  private camVideo: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private previewCanvas: HTMLCanvasElement | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private rafId: number | null = null;
  private startedAtMs = 0;
  private pausedAccumMs = 0;
  private pausedSinceMs: number | null = null;
  private stopped = false;
  private bubbleConfig: CamBubbleConfig;
  private watermarkConfig?: BrandWatermarkConfig;
  private watermarkImg: HTMLImageElement | null = null;
  private mode: RecorderMode;
  private fps: number;
  private outputFormat: 'auto' | 'mp4' | 'webm';
  private hideBrowserAddressBar: boolean;
  private captureAngle: 'full' | 'zoom_center' | 'left_half' | 'right_half';
  private autoDownload: boolean;
  private cameraDeviceId?: string;
  private micDeviceId?: string;
  private onStopCb?: (result: RecordedMediaResult) => void;
  private onErrorCb?: (message: string) => void;

  constructor(options: ScreenRecorderOptions) {
    this.mode = options.mode;
    this.bubbleConfig = { ...options.bubble };
    this.watermarkConfig = options.watermark ? { ...options.watermark } : undefined;
    this.loadWatermarkImage(options.watermark?.logoDataUrl);
    this.previewCanvas = options.previewCanvas || null;
    this.fps = options.fps || 30;
    this.outputFormat = options.outputFormat || 'auto';
    this.hideBrowserAddressBar = Boolean(options.hideBrowserAddressBar);
    this.captureAngle = options.captureAngle || 'full';
    this.autoDownload = options.autoDownload !== false;
    this.cameraDeviceId = options.cameraDeviceId || undefined;
    this.micDeviceId = options.micDeviceId || undefined;
    this.onStopCb = options.onStop;
    this.onErrorCb = options.onError;

    const dims = resolveRecorderCanvasSize(options.quality, options.aspectRatio || '16:9');
    this.canvas = document.createElement('canvas');
    this.canvas.width = dims.width;
    this.canvas.height = dims.height;
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Contexte Canvas 2D indisponible.');
    this.ctx = ctx;
  }

  private loadWatermarkImage(dataUrl?: string): void {
    if (!dataUrl) {
      this.watermarkImg = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = dataUrl;
    this.watermarkImg = img;
  }

  public updateBubbleConfig(patch: Partial<CamBubbleConfig>): void {
    this.bubbleConfig = { ...this.bubbleConfig, ...patch };
    if (this.bubbleConfig.enabled && !this.camStream && !this.stopped && this.mode === 'screen') {
      this.startCameraBubble().catch(() => {});
    }
  }

  public updateWatermarkConfig(next: BrandWatermarkConfig): void {
    const prevLogo = this.watermarkConfig?.logoDataUrl;
    this.watermarkConfig = { ...next };
    if (next.logoDataUrl !== prevLogo) {
      this.loadWatermarkImage(next.logoDataUrl);
    }
  }

  public setPreviewCanvas(canvas: HTMLCanvasElement | null): void {
    this.previewCanvas = canvas;
  }

  private async startCameraBubble(facingMode: 'user' | 'environment' = 'user'): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const videoConstraint: MediaTrackConstraints = this.cameraDeviceId
        ? { deviceId: { ideal: this.cameraDeviceId }, width: { ideal: 640 }, height: { ideal: 640 } }
        : { facingMode, width: { ideal: 640 }, height: { ideal: 640 } };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraint,
        audio: false
      });
      this.camStream = stream;
      const vid = document.createElement('video');
      vid.srcObject = stream;
      vid.muted = true;
      vid.playsInline = true;
      await vid.play().catch(() => {});
      this.camVideo = vid;
    } catch (err) {
      console.warn('[ScreenRecorder] Caméra bulle indisponible:', err);
    }
  }

  public async start(options: Pick<ScreenRecorderOptions, 'includeMic' | 'includeSystemAudio' | 'facingMode'>): Promise<void> {
    // 1. Source vidéo principale (Écran ou Caméra directe)
    if (this.mode === 'screen') {
      if (!isScreenCaptureSupported()) {
        throw new Error(
          'La capture d\'écran système n\'est pas supportée sur ce navigateur mobile. Passez en mode « Caméra directe ».'
        );
      }
      this.screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: {
          frameRate: { ideal: this.fps, max: this.fps },
          width: { ideal: Math.max(1280, this.canvas.width) },
          height: { ideal: Math.max(720, this.canvas.height) }
        },
        audio: Boolean(options.includeSystemAudio)
      });

      const screenVid = document.createElement('video');
      screenVid.srcObject = this.screenStream;
      screenVid.muted = true;
      screenVid.playsInline = true;
      await screenVid.play().catch(() => {});
      this.screenVideo = screenVid;

      const primaryTrack = this.screenStream?.getVideoTracks()[0];
      if (primaryTrack) {
        primaryTrack.onended = () => {
          if (!this.stopped) this.stop();
        };
      }

      if (this.bubbleConfig.enabled) {
        await this.startCameraBubble(options.facingMode || 'user');
      }
    } else {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Caméra non disponible sur cet appareil.');
      }
      const videoConstraint: MediaTrackConstraints = this.cameraDeviceId
        ? {
            deviceId: { ideal: this.cameraDeviceId },
            width: { ideal: this.canvas.width },
            height: { ideal: this.canvas.height }
          }
        : {
            facingMode: options.facingMode || 'user',
            width: { ideal: this.canvas.width },
            height: { ideal: this.canvas.height }
          };
      this.screenStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraint,
        audio: false
      });
      const camMain = document.createElement('video');
      camMain.srcObject = this.screenStream;
      camMain.muted = true;
      camMain.playsInline = true;
      await camMain.play().catch(() => {});
      this.screenVideo = camMain;
    }

    // 2. Mixage Audio (Micro sélectionné + Audio système)
    const audioTracks: MediaStreamTrack[] = [];
    if (options.includeMic && navigator.mediaDevices?.getUserMedia) {
      try {
        const audioConstraint: MediaTrackConstraints = {
          ...(this.micDeviceId ? { deviceId: { ideal: this.micDeviceId } } : {}),
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        };
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraint,
          video: false
        });
      } catch (err) {
        console.warn('[ScreenRecorder] Micro refusé/indisponible:', err);
      }
    }

    const sysAudioTracks = this.screenStream?.getAudioTracks() || [];
    const micAudioTracks = this.micStream?.getAudioTracks() || [];

    if (sysAudioTracks.length > 0 && micAudioTracks.length > 0) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        this.audioCtx = ctx;
        const dest = ctx.createMediaStreamDestination();
        const sysSrc = ctx.createMediaStreamSource(new MediaStream(sysAudioTracks));
        const micSrc = ctx.createMediaStreamSource(new MediaStream(micAudioTracks));
        sysSrc.connect(dest);
        micSrc.connect(dest);
        audioTracks.push(...dest.stream.getAudioTracks());
      } catch {
        audioTracks.push(...micAudioTracks);
      }
    } else if (micAudioTracks.length > 0) {
      audioTracks.push(...micAudioTracks);
    } else if (sysAudioTracks.length > 0) {
      audioTracks.push(...sysAudioTracks);
    }

    // 3. Démarrer la boucle de rendu Canvas (Écran + Angle + Masquage barre d'adresse + Bulle Caméra)
    const renderLoop = () => {
      if (this.stopped) return;
      this.drawFrame();
      this.rafId = requestAnimationFrame(renderLoop);
    };
    this.drawFrame();
    this.rafId = requestAnimationFrame(renderLoop);

    // 4. Lancer MediaRecorder sur le flux composité
    const canvasStream = this.canvas.captureStream(this.fps);
    const composedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks
    ]);

    const mp4Candidates = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'];
    const webmCandidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    const mimeCandidates =
      this.outputFormat === 'webm'
        ? [...webmCandidates, ...mp4Candidates]
        : [...mp4Candidates, ...webmCandidates];

    const mimeType =
      mimeCandidates.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ||
      'video/webm';

    this.chunks = [];
    this.startedAtMs = Date.now();
    this.pausedAccumMs = 0;
    this.pausedSinceMs = null;

    const rec = new MediaRecorder(composedStream, {
      mimeType,
      videoBitsPerSecond: Math.max(this.canvas.width, this.canvas.height) >= 1920 ? 5_200_000 : 3_200_000
    });
    this.recorder = rec;

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    rec.onstop = () => {
      const totalMs = Math.max(
        500,
        Date.now() - this.startedAtMs - this.pausedAccumMs - (this.pausedSinceMs ? Date.now() - this.pausedSinceMs : 0)
      );
      const durationSec = Number((totalMs / 1000).toFixed(1));
      const cleanMime = mimeType.includes('mp4') ? 'video/mp4' : 'video/webm';
      const ext = cleanMime === 'video/mp4' ? 'mp4' : 'webm';
      const blob = new Blob(this.chunks, { type: cleanMime });
      const filename = `nana-enregistrement-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`;
      const file = new File([blob], filename, { type: cleanMime });
      const url = URL.createObjectURL(blob);

      if (this.autoDownload) {
        triggerDirectDownload(blob, filename);
      }

      this.cleanup();
      this.onStopCb?.({
        file,
        blob,
        url,
        mimeType: cleanMime,
        durationSec,
        sizeBytes: blob.size
      });
    };

    rec.onerror = (ev: any) => {
      this.onErrorCb?.(ev?.error?.message || 'Erreur lors de l\'enregistrement vidéo.');
      this.stop();
    };

    rec.start(500);
  }

  private drawFrame(): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const ctx = this.ctx;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, W, H);

    // 1. Source principale avec gestion du masquage barre d'adresse & de l'angle de capture
    const mainVid = this.screenVideo;
    if (mainVid && mainVid.readyState >= 2 && mainVid.videoWidth > 0 && mainVid.videoHeight > 0) {
      const vw = mainVid.videoWidth;
      const vh = mainVid.videoHeight;

      // Rognage haut optionnel (~10%) pour masquer la barre d'adresse / onglets du navigateur
      const topCropPx = this.mode === 'screen' && this.hideBrowserAddressBar ? Math.round(vh * 0.1) : 0;
      let sx = 0;
      let sy = topCropPx;
      let sw = vw;
      let sh = Math.max(100, vh - topCropPx);

      // Angle de capture
      if (this.captureAngle === 'zoom_center') {
        const zoom = 1.28;
        const newW = sw / zoom;
        const newH = sh / zoom;
        sx += (sw - newW) / 2;
        sy += (sh - newH) / 2;
        sw = newW;
        sh = newH;
      } else if (this.captureAngle === 'left_half') {
        sw = sw / 2;
      } else if (this.captureAngle === 'right_half') {
        sx += sw / 2;
        sw = sw / 2;
      }

      // Adaptation propre (contain pour 16:9, cover élégant si angle zoomé ou format vertical/carré)
      const useCover = this.canvas.width <= this.canvas.height || this.captureAngle !== 'full';
      const scale = useCover ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      const dx = (W - dw) / 2;
      const dy = (H - dh) / 2;

      ctx.save();
      if (this.mode === 'camera' && this.bubbleConfig.mirror) {
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(mainVid, sx, sy, sw, sh, dx, dy, dw, dh);
      ctx.restore();
    }

    // 2. Bulle Caméra PiP (Rond ou Carré arrondi) si activée en mode écran
    if (
      this.mode === 'screen' &&
      this.bubbleConfig.enabled &&
      this.camVideo &&
      this.camVideo.readyState >= 2 &&
      this.camVideo.videoWidth > 0
    ) {
      const bubbleSize = Math.round((W * Math.max(12, Math.min(36, this.bubbleConfig.sizePct))) / 100);
      const margin = Math.round(W * 0.025);
      let bx = margin;
      let by = H - bubbleSize - margin;

      if (this.bubbleConfig.corner === 'top-left') {
        bx = margin;
        by = margin;
      } else if (this.bubbleConfig.corner === 'top-right') {
        bx = W - bubbleSize - margin;
        by = margin;
      } else if (this.bubbleConfig.corner === 'bottom-right') {
        bx = W - bubbleSize - margin;
        by = H - bubbleSize - margin;
      }

      const cx = bx + bubbleSize / 2;
      const cy = by + bubbleSize / 2;
      const radius = this.bubbleConfig.shape === 'circle' ? bubbleSize / 2 : Math.round(bubbleSize * 0.14);

      ctx.save();
      // Ombre portée élégante
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;

      ctx.beginPath();
      if (this.bubbleConfig.shape === 'circle') {
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      } else {
        ctx.roundRect(bx, by, bubbleSize, bubbleSize, radius);
      }
      ctx.closePath();
      ctx.fillStyle = '#0F172A';
      ctx.fill();

      // Clip & dessin caméra en mode cover centré
      ctx.shadowColor = 'transparent';
      ctx.clip();

      const cw = this.camVideo.videoWidth;
      const ch = this.camVideo.videoHeight;
      const cScale = Math.max(bubbleSize / cw, bubbleSize / ch);
      const drawW = cw * cScale;
      const drawH = ch * cScale;
      const drawX = cx - drawW / 2;
      const drawY = cy - drawH / 2;

      if (this.bubbleConfig.mirror) {
        ctx.translate(cx * 2, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(this.camVideo, drawX, drawY, drawW, drawH);
      ctx.restore();

      // Bordure pro lumineuse autour de la bulle
      ctx.save();
      ctx.beginPath();
      if (this.bubbleConfig.shape === 'circle') {
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      } else {
        ctx.roundRect(bx, by, bubbleSize, bubbleSize, radius);
      }
      ctx.closePath();
      ctx.lineWidth = Math.max(3, Math.round(W * 0.0032));
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.stroke();
      ctx.restore();
    }

    // 2B. Signature & Marque (Filigrane Live sur chaque image enregistrée)
    drawBrandWatermarkOnCanvas(ctx, W, H, this.watermarkConfig, this.watermarkImg);

    // 3. Miroir dans le canvas d'aperçu UI si fourni
    if (this.previewCanvas) {
      const pCtx = this.previewCanvas.getContext('2d');
      if (pCtx) {
        if (this.previewCanvas.width !== 640 || this.previewCanvas.height !== 360) {
          this.previewCanvas.width = 640;
          this.previewCanvas.height = 360;
        }
        pCtx.drawImage(this.canvas, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
      }
    }
  }

  public pause(): void {
    if (this.recorder && this.recorder.state === 'recording') {
      this.recorder.pause();
      this.pausedSinceMs = Date.now();
    }
  }

  public resume(): void {
    if (this.recorder && this.recorder.state === 'paused') {
      if (this.pausedSinceMs) {
        this.pausedAccumMs += Date.now() - this.pausedSinceMs;
        this.pausedSinceMs = null;
      }
      this.recorder.resume();
    }
  }

  public async takeScreenshotPng(): Promise<string> {
    this.drawFrame();
    const blob = await new Promise<Blob | null>((resolve) =>
      this.canvas.toBlob((b) => resolve(b), 'image/png', 1)
    );
    if (!blob) throw new Error('Impossible de générer la capture d\'image.');
    const filename = `nana-capture-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    triggerDirectDownload(blob, filename);
    return filename;
  }

  public stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.recorder && this.recorder.state !== 'inactive') {
      try {
        this.recorder.stop();
      } catch {
        this.cleanup();
      }
    } else {
      this.cleanup();
    }
  }

  private cleanup(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.camStream?.getTracks().forEach((t) => t.stop());
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.audioCtx?.close().catch(() => {});
    this.screenStream = null;
    this.camStream = null;
    this.micStream = null;
    this.audioCtx = null;
    this.screenVideo = null;
    this.camVideo = null;
  }
}

/**
 * Capture d'écran image unique (.PNG) en 1 clic (sans démarrer d'enregistrement vidéo)
 * avec téléchargement immédiat sur l'ordinateur.
 */
export async function captureOneShotScreenPng(
  bubble?: CamBubbleConfig,
  watermark?: BrandWatermarkConfig
): Promise<{ filename: string; dataUrl: string }> {
  if (!isScreenCaptureSupported()) {
    throw new Error('La capture d\'écran instantanée nécessite un navigateur sur ordinateur.');
  }
  const stream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({
    video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false
  });

  let camStream: MediaStream | null = null;
  try {
    const vid = document.createElement('video');
    vid.srcObject = stream;
    vid.muted = true;
    vid.playsInline = true;
    await vid.play();
    await new Promise((r) => setTimeout(r, 220));

    const W = vid.videoWidth || 1280;
    const H = vid.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponible');
    ctx.drawImage(vid, 0, 0, W, H);

    if (bubble?.enabled && navigator.mediaDevices?.getUserMedia) {
      try {
        camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
          audio: false
        });
        const cv = document.createElement('video');
        cv.srcObject = camStream;
        cv.muted = true;
        cv.playsInline = true;
        await cv.play();
        await new Promise((r) => setTimeout(r, 180));

        const size = Math.round((W * Math.max(12, Math.min(36, bubble.sizePct))) / 100);
        const margin = Math.round(W * 0.025);
        let bx = margin;
        let by = H - size - margin;
        if (bubble.corner === 'top-left') { bx = margin; by = margin; }
        else if (bubble.corner === 'top-right') { bx = W - size - margin; by = margin; }
        else if (bubble.corner === 'bottom-right') { bx = W - size - margin; by = H - size - margin; }

        const cx = bx + size / 2;
        const cy = by + size / 2;
        const radius = bubble.shape === 'circle' ? size / 2 : Math.round(size * 0.14);

        ctx.save();
        ctx.beginPath();
        if (bubble.shape === 'circle') ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        else ctx.roundRect(bx, by, size, size, radius);
        ctx.closePath();
        ctx.clip();
        const cScale = Math.max(size / (cv.videoWidth || 640), size / (cv.videoHeight || 640));
        const dw = (cv.videoWidth || 640) * cScale;
        const dh = (cv.videoHeight || 640) * cScale;
        if (bubble.mirror) {
          ctx.translate(cx * 2, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(cv, cx - dw / 2, cy - dh / 2, dw, dh);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        if (bubble.shape === 'circle') ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        else ctx.roundRect(bx, by, size, size, radius);
        ctx.closePath();
        ctx.lineWidth = Math.max(3, Math.round(W * 0.0032));
        ctx.strokeStyle = 'rgba(255,255,255,0.92)';
        ctx.stroke();
        ctx.restore();
      } catch {}
    }

    if (watermark?.enabled) {
      let wmImg: HTMLImageElement | null = null;
      if (watermark.logoDataUrl) {
        wmImg = await new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = watermark.logoDataUrl!;
        });
      }
      drawBrandWatermarkOnCanvas(ctx, W, H, watermark, wmImg);
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 1));
    if (!blob) throw new Error('Échec de création de l\'image PNG.');
    const filename = `nana-capture-ecran-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    triggerDirectDownload(blob, filename);
    const dataUrl = URL.createObjectURL(blob);
    return { filename, dataUrl };
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    camStream?.getTracks().forEach((t) => t.stop());
  }
}
