/**
 * @file videoTimelineService.ts
 * @description Moteur de Timeline Multi-Clips Pro (Cut/Scinder, Suppression, Duplication, Réorganisation,
 * Vitesse, Mute, Trim In/Out et Export vidéo assemblé 100 % local sans stockage Cloud).
 */

import { renderChromaKeyFrame, type ChromaKeyConfig } from './chromaKeyStudioService';

export interface TimelineClip {
  id: string;
  label: string;
  sourceUrl: string;
  sourceFile?: File | null;
  startSec: number;
  endSec: number;
  sourceDurationSec: number;
  speed: number; // 0.5, 0.75, 1, 1.25, 1.5, 2
  muted: boolean;
}

export interface VisualOverlayLayer {
  id: string;
  kind: 'image' | 'badge';
  label: string;
  imageUrl?: string;
  badgeText?: string;
  badgeBg?: string;
  xPct: number;       // 0..100 (% centre X)
  yPct: number;       // 0..100 (% centre Y)
  sizePct: number;    // 8..65 (% de la largeur vidéo)
  opacity: number;    // 0.2..1
  shape: 'square' | 'rounded' | 'circle';
  rotationDeg: number; // -45..45
}

export interface TimelineExportOptions {
  width: number;
  height: number;
  filterCss?: string;
  overlayText?: string;
  overlayPosition?: 'top' | 'center' | 'bottom';
  overlayColor?: string;
  subtitles?: Array<{ startSec: number; endSec: number; text: string }>;
  subtitleColor?: string;
  visualLayers?: VisualOverlayLayer[];
  chromaKey?: ChromaKeyConfig;
  voiceOverUrl?: string;
  voiceOverVolume?: number;
  bgMusicUrl?: string;
  bgMusicVolume?: number;
  preferMp4?: boolean;
  onProgress?: (pct: number) => void;
}

export function drawVisualLayersOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layers: VisualOverlayLayer[],
  loadedImages: Map<string, HTMLImageElement>
): void {
  for (const layer of layers) {
    const cx = (layer.xPct / 100) * width;
    const cy = (layer.yPct / 100) * height;
    const boxW = Math.max(24, (layer.sizePct / 100) * width);

    ctx.save();
    ctx.globalAlpha = Math.max(0.1, Math.min(1, layer.opacity ?? 1));
    ctx.translate(cx, cy);
    if (layer.rotationDeg) {
      ctx.rotate((layer.rotationDeg * Math.PI) / 180);
    }

    if (layer.kind === 'image' && layer.imageUrl) {
      const img = loadedImages.get(layer.id);
      if (img && img.complete && img.naturalWidth > 0) {
        const aspect = img.naturalHeight / img.naturalWidth;
        const boxH = layer.shape === 'circle' ? boxW : boxW * aspect;
        const halfW = boxW / 2;
        const halfH = boxH / 2;

        if (layer.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, halfW, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
        } else if (layer.shape === 'rounded') {
          const r = Math.min(18, boxW * 0.14);
          ctx.beginPath();
          ctx.moveTo(-halfW + r, -halfH);
          ctx.arcTo(halfW, -halfH, halfW, halfH, r);
          ctx.arcTo(halfW, halfH, -halfW, halfH, r);
          ctx.arcTo(-halfW, halfH, -halfW, -halfH, r);
          ctx.arcTo(-halfW, -halfH, halfW, -halfH, r);
          ctx.closePath();
          ctx.clip();
        }

        ctx.drawImage(img, -halfW, -halfH, boxW, boxH);
      }
    } else if (layer.kind === 'badge' && layer.badgeText) {
      const fontSize = Math.max(12, Math.round(boxW * 0.16));
      ctx.font = `900 ${fontSize}px sans-serif`;
      const padX = Math.round(fontSize * 0.7);
      const padY = Math.round(fontSize * 0.45);
      const textW = ctx.measureText(layer.badgeText).width;
      const rectW = textW + padX * 2;
      const rectH = fontSize + padY * 2;
      const r = layer.shape === 'square' ? 4 : rectH / 2;

      ctx.fillStyle = layer.badgeBg || '#EF4444';
      ctx.beginPath();
      ctx.moveTo(-rectW / 2 + r, -rectH / 2);
      ctx.arcTo(rectW / 2, -rectH / 2, rectW / 2, rectH / 2, r);
      ctx.arcTo(rectW / 2, rectH / 2, -rectW / 2, rectH / 2, r);
      ctx.arcTo(-rectW / 2, rectH / 2, -rectW / 2, -rectH / 2, r);
      ctx.arcTo(-rectW / 2, -rectH / 2, rectW / 2, -rectH / 2, r);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(layer.badgeText, 0, 1);
    }

    ctx.restore();
  }
}

export function getClipOutputDuration(clip: TimelineClip): number {
  const raw = Math.max(0.1, (clip.endSec || 0) - (clip.startSec || 0));
  const spd = Math.max(0.25, Number(clip.speed) || 1);
  return Number((raw / spd).toFixed(2));
}

export function getTotalTimelineDuration(clips: TimelineClip[]): number {
  return Number(
    clips.reduce((sum, c) => sum + getClipOutputDuration(c), 0).toFixed(2)
  );
}

/**
 * Coupe (Cut / Scinde) un clip exactement à la position source `splitAtSourceSec`.
 * Retourne la nouvelle liste de clips et l'ID du nouveau segment de droite.
 */
export function splitClipAtTime(
  clips: TimelineClip[],
  clipId: string,
  splitAtSourceSec: number
): { clips: TimelineClip[]; rightClipId: string | null } {
  const idx = clips.findIndex(c => c.id === clipId);
  if (idx < 0) return { clips, rightClipId: null };

  const target = clips[idx];
  const minMargin = 0.25;
  const clampedSplit = Number(splitAtSourceSec.toFixed(2));

  if (clampedSplit <= target.startSec + minMargin || clampedSplit >= target.endSec - minMargin) {
    return { clips, rightClipId: null };
  }

  const leftClip: TimelineClip = {
    ...target,
    endSec: clampedSplit,
    label: target.label.includes('(1)') ? target.label : `${target.label} (1)`
  };

  const rightClipId = `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const rightClip: TimelineClip = {
    ...target,
    id: rightClipId,
    startSec: clampedSplit,
    label: `${target.label.replace(/\s*\(\d+\)$/, '')} (2)`
  };

  const next = [...clips];
  next.splice(idx, 1, leftClip, rightClip);
  return { clips: next, rightClipId };
}

/**
 * Supprime un segment de la timeline (au début, au milieu ou à la fin).
 */
export function deleteClipFromTimeline(clips: TimelineClip[], clipId: string): TimelineClip[] {
  return clips.filter(c => c.id !== clipId);
}

/**
 * Duplique un segment immédiatement après lui.
 */
export function duplicateClipInTimeline(
  clips: TimelineClip[],
  clipId: string
): { clips: TimelineClip[]; newClipId: string | null } {
  const idx = clips.findIndex(c => c.id === clipId);
  if (idx < 0) return { clips, newClipId: null };

  const src = clips[idx];
  const newClipId = `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const copy: TimelineClip = {
    ...src,
    id: newClipId,
    label: `${src.label} (Copie)`
  };

  const next = [...clips];
  next.splice(idx + 1, 0, copy);
  return { clips: next, newClipId };
}

/**
 * Déplace un clip vers la gauche ou la droite sur la timeline.
 */
export function moveClipInTimeline(
  clips: TimelineClip[],
  clipId: string,
  direction: 'left' | 'right'
): TimelineClip[] {
  const idx = clips.findIndex(c => c.id === clipId);
  if (idx < 0) return clips;
  const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= clips.length) return clips;

  const next = [...clips];
  const [moved] = next.splice(idx, 1);
  next.splice(targetIdx, 0, moved);
  return next;
}

/**
 * Met à jour les propriétés d'un clip (Trim In/Out, vitesse, mute, nom).
 */
export function updateClipInTimeline(
  clips: TimelineClip[],
  clipId: string,
  patch: Partial<Pick<TimelineClip, 'startSec' | 'endSec' | 'speed' | 'muted' | 'label'>>
): TimelineClip[] {
  return clips.map(c => {
    if (c.id !== clipId) return c;
    const nextStart = patch.startSec !== undefined ? Math.max(0, Math.min(patch.startSec, c.sourceDurationSec - 0.25)) : c.startSec;
    const nextEnd = patch.endSec !== undefined ? Math.max(nextStart + 0.25, Math.min(patch.endSec, c.sourceDurationSec)) : Math.max(nextStart + 0.25, c.endSec);
    return {
      ...c,
      ...patch,
      startSec: Number(nextStart.toFixed(2)),
      endSec: Number(nextEnd.toFixed(2))
    };
  });
}

/**
 * Assemble et exporte tous les clips de la timeline dans l'ordre exact en un seul fichier vidéo local.
 * Respecte : Cut/Suppression, Trim In/Out, Vitesse, Mute, Filtres, Texte commercial & Sous-titres synchronisés.
 */
export async function exportTimelineToVideoBlob(
  clips: TimelineClip[],
  options: TimelineExportOptions
): Promise<{ blob: Blob; mimeType: string; extension: 'mp4' | 'webm'; durationSec: number }> {
  if (!clips.length) {
    throw new Error('La timeline est vide. Ajoutez au moins un clip vidéo.');
  }
  if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') {
    throw new Error('Votre navigateur ne supporte pas l\'export multi-clips local.');
  }

  const width = options.width || 720;
  const height = options.height || 1280;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexte graphique Canvas indisponible.');

  // Préchargement des logos / images superposés (calques visuels)
  const loadedLayerImages = new Map<string, HTMLImageElement>();
  if (options.visualLayers && options.visualLayers.length > 0) {
    await Promise.all(
      options.visualLayers
        .filter(l => l.kind === 'image' && l.imageUrl)
        .map(
          l =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                loadedLayerImages.set(l.id, img);
                resolve();
              };
              img.onerror = () => resolve();
              img.src = l.imageUrl!;
            })
        )
    );
  }

  // Préchargement de l'image de fond Chroma Key si activé
  let chromaBgImg: HTMLImageElement | null = null;
  let chromaOffscreenCtx: CanvasRenderingContext2D | null = null;
  const isChromaActive = Boolean(options.chromaKey && options.chromaKey.mode !== 'none');
  if (isChromaActive) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    chromaOffscreenCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (options.chromaKey?.backdropImageUrl) {
      chromaBgImg = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = options.chromaKey!.backdropImageUrl!;
      });
    }
  }

  const totalDuration = Math.max(0.5, getTotalTimelineDuration(clips));
  const canvasStream = canvas.captureStream(24);

  // Mixage audio propre via AudioContext (clips + Voix Off + Musique de fond)
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = AudioCtx ? new AudioCtx() : null;
  if (audioCtx && audioCtx.state === 'suspended') {
    await audioCtx.resume().catch(() => {});
  }
  const audioDest = audioCtx ? audioCtx.createMediaStreamDestination() : null;

  const extraAudioEls: HTMLAudioElement[] = [];
  if (audioCtx && audioDest) {
    const attachExtraAudio = (url: string | undefined, vol: number, loop: boolean) => {
      if (!url) return;
      try {
        const audioEl = document.createElement('audio');
        audioEl.crossOrigin = 'anonymous';
        audioEl.src = url;
        audioEl.loop = loop;
        const src = audioCtx.createMediaElementSource(audioEl);
        const gain = audioCtx.createGain();
        gain.gain.value = Math.max(0, Math.min(1, vol));
        src.connect(gain);
        gain.connect(audioDest);
        extraAudioEls.push(audioEl);
      } catch {}
    };
    attachExtraAudio(options.voiceOverUrl, options.voiceOverVolume ?? 1, false);
    attachExtraAudio(options.bgMusicUrl, options.bgMusicVolume ?? 0.35, true);
  }

  const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
  if (audioDest) {
    combinedTracks.push(...audioDest.stream.getAudioTracks());
  }
  const combinedStream = new MediaStream(combinedTracks);

  // Choix honnête du conteneur supporté nativement (vrai MP4 si supporté, sinon WebM réel, sinon défaut navigateur)
  const mp4Candidates = ['video/mp4;codecs=avc1,mp4a', 'video/mp4;codecs=avc1', 'video/mp4'];
  const webmCandidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const supportedMp4 = options.preferMp4 !== false
    ? mp4Candidates.find((m) => MediaRecorder.isTypeSupported(m))
    : undefined;
  const supportedWebm = webmCandidates.find((m) => MediaRecorder.isTypeSupported(m));
  const preferredMime = supportedMp4 || supportedWebm;

  const videoBitsPerSecond = width >= 1080 ? 3_500_000 : width >= 720 ? 2_000_000 : 1_100_000;
  const recorder = preferredMime
    ? new MediaRecorder(combinedStream, { mimeType: preferredMime, videoBitsPerSecond })
    : new MediaRecorder(combinedStream, { videoBitsPerSecond });

  const mimeType = recorder.mimeType || preferredMime || 'video/mp4';
  const extension: 'mp4' | 'webm' = mimeType.toLowerCase().includes('webm') ? 'webm' : 'mp4';

  const chunks: Blob[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data.size > 0) chunks.push(ev.data);
  };

  const stopPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('Erreur lors de l\'encodage de la timeline.'));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  recorder.start(250);
  for (const extraEl of extraAudioEls) {
    extraEl.play().catch(() => {});
  }
  let timelineElapsedSec = 0;

  try {
    for (const clip of clips) {
      const videoEl = document.createElement('video');
      videoEl.crossOrigin = 'anonymous';
      videoEl.playsInline = true;
      videoEl.muted = clip.muted;
      videoEl.playbackRate = clip.speed || 1;
      videoEl.src = clip.sourceUrl;

      await new Promise<void>((resolve, reject) => {
        videoEl.onloadedmetadata = () => resolve();
        videoEl.onerror = () => reject(new Error(`Impossible de lire le clip "${clip.label}".`));
      });

      if (audioCtx && audioDest && !clip.muted) {
        try {
          const srcNode = audioCtx.createMediaElementSource(videoEl);
          srcNode.connect(audioDest);
        } catch {}
      }

      videoEl.currentTime = Math.max(0, clip.startSec);
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          videoEl.removeEventListener('seeked', onSeeked);
          resolve();
        };
        videoEl.addEventListener('seeked', onSeeked);
      });

      const clipOutDur = getClipOutputDuration(clip);
      const clipStartWall = performance.now();
      await videoEl.play().catch(() => {});

      await new Promise<void>((resolve) => {
        const drawStep = () => {
          const wallSec = (performance.now() - clipStartWall) / 1000;
          const currentTimelineSec = timelineElapsedSec + wallSec;

          // Rendu vidéo proportionnel (aspect cover) + filtre
          const vW = videoEl.videoWidth || width;
          const vH = videoEl.videoHeight || height;
          const vRatio = vW / vH;
          const cRatio = width / height;
          let sx = 0, sy = 0, sw = vW, sh = vH;
          if (vRatio > cRatio) {
            sw = vH * cRatio;
            sx = (vW - sw) / 2;
          } else {
            sh = vW / cRatio;
            sy = (vH - sh) / 2;
          }

          if (isChromaActive && options.chromaKey && chromaOffscreenCtx) {
            renderChromaKeyFrame(ctx, chromaOffscreenCtx, videoEl, width, height, options.chromaKey, chromaBgImg);
          } else {
            ctx.save();
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);
            if (options.filterCss) ctx.filter = options.filterCss;
            ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, width, height);
            ctx.restore();
          }

          // Incrustation des éléments visuels superposés (Logos, Images PiP, Badges)
          if (options.visualLayers && options.visualLayers.length > 0) {
            drawVisualLayersOnCanvas(ctx, width, height, options.visualLayers, loadedLayerImages);
          }

          // Incrustation sous-titres synchronisés
          const activeSub = options.subtitles?.find(
            s => currentTimelineSec >= s.startSec && currentTimelineSec <= s.endSec
          );
          if (activeSub?.text) {
            ctx.save();
            const fontSize = Math.round(width * 0.055);
            ctx.font = `900 ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.14));
            ctx.strokeStyle = '#000000';
            ctx.fillStyle = options.subtitleColor || '#FDE047';
            const subY = height * 0.78;
            ctx.strokeText(activeSub.text.toUpperCase(), width / 2, subY, width * 0.88);
            ctx.fillText(activeSub.text.toUpperCase(), width / 2, subY, width * 0.88);
            ctx.restore();
          }

          // Incrustation habillage commercial
          if (options.overlayText) {
            ctx.save();
            const fontSize = Math.round(width * 0.042);
            ctx.font = `800 ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            const yPos =
              options.overlayPosition === 'top'
                ? height * 0.1
                : options.overlayPosition === 'center'
                  ? height * 0.5
                  : height * 0.9;
            ctx.fillStyle = 'rgba(0,0,0,0.68)';
            ctx.fillRect(width * 0.06, yPos - fontSize, width * 0.88, fontSize * 1.6);
            ctx.fillStyle = options.overlayColor || '#FFFFFF';
            ctx.fillText(options.overlayText, width / 2, yPos + fontSize * 0.15, width * 0.84);
            ctx.restore();
          }

          options.onProgress?.(Math.min(98, Math.round((currentTimelineSec / totalDuration) * 100)));

          if (videoEl.currentTime >= clip.endSec || videoEl.ended || wallSec >= clipOutDur + 0.15) {
            videoEl.pause();
            resolve();
            return;
          }
          requestAnimationFrame(drawStep);
        };
        requestAnimationFrame(drawStep);
      });

      timelineElapsedSec += clipOutDur;
    }
  } finally {
    for (const extraEl of extraAudioEls) {
      try {
        extraEl.pause();
        extraEl.src = '';
      } catch {}
    }
    if (recorder.state !== 'inactive') recorder.stop();
    if (audioCtx) {
      audioCtx.close().catch(() => {});
    }
  }

  const blob = await stopPromise;
  options.onProgress?.(100);
  return { blob, mimeType, extension, durationSec: totalDuration };
}
