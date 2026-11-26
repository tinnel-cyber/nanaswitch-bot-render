/**
 * @file chromaKeyStudioService.ts
 * @description Moteur d'incrustation Fond Vert / Fond Bleu Pro (algorithme YCbCr Broadcast + Anti-Spill)
 * identique aux standards OBS Studio / Premiere Pro, 100 % côté client sans dénaturer le sujet.
 */

export type BackdropKeyMode = 'none' | 'green_screen' | 'blue_screen' | 'custom_color';

export interface ChromaKeyConfig {
  mode: BackdropKeyMode;
  keyColorHex: string;       // ex: '#00b140' (vert studio) ou '#0047bb' (bleu studio)
  similarity: number;        // 0.15 - 0.65 (tolérance chromatique YCbCr)
  smoothness: number;        // 0.02 - 0.30 (lissage doux des contours / cheveux)
  spillSuppression: number;  // 0 - 1 (suppression du reflet vert/bleu sur la peau)
  bgBlurPx: number;          // 0 - 12 px (flou bokeh naturel du décor de remplacement)
  backdropImageUrl?: string;
  backdropGradient?: string;
}

export const DEFAULT_CHROMA_CONFIG: ChromaKeyConfig = {
  mode: 'none',
  keyColorHex: '#00b140',
  similarity: 0.36,
  smoothness: 0.11,
  spillSuppression: 0.78,
  bgBlurPx: 2
};

export interface StudioBackdropPreset {
  id: string;
  name: string;
  badge: string;
  type: 'image' | 'gradient';
  value: string;
}

export const STUDIO_BACKDROP_PRESETS: StudioBackdropPreset[] = [
  {
    id: 'yt_neon',
    name: 'Studio YouTube Néon',
    badge: '🎬 YouTubeur',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1280&auto=format&fit=crop&q=80'
  },
  {
    id: 'ceo_office',
    name: 'Bureau CEO Moderne',
    badge: '💼 Business',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1280&auto=format&fit=crop&q=80'
  },
  {
    id: 'luxury_showroom',
    name: 'Showroom Luxe',
    badge: '👑 E-commerce',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1280&auto=format&fit=crop&q=80'
  },
  {
    id: 'podcast_studio',
    name: 'Plateau Podcast / TV',
    badge: '🎙️ Pro',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1280&auto=format&fit=crop&q=80'
  },
  {
    id: 'gradient_studio',
    name: 'Studio Épuré Bleu Nuit',
    badge: '✨ Minimal',
    type: 'gradient',
    value: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)'
  }
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [0, 177, 64];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToCbCr(r: number, g: number, b: number): [number, number] {
  // Espace chromatique BT.601 normalisé [0..1] (indépendant de la luminosité Y -> idéal ombres sur fond vert)
  const cb = 0.5 - 0.168736 * (r / 255) - 0.331264 * (g / 255) + 0.5 * (b / 255);
  const cr = 0.5 + 0.5 * (r / 255) - 0.418688 * (g / 255) - 0.081312 * (b / 255);
  return [cb, cr];
}

/**
 * Rend une frame vidéo avec incrustation Fond Vert / Fond Bleu YCbCr + Anti-Spill sur le Canvas cible.
 */
export function renderChromaKeyFrame(
  ctx: CanvasRenderingContext2D,
  offscreenCtx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement,
  width: number,
  height: number,
  config: ChromaKeyConfig,
  bgImage: HTMLImageElement | null,
  bgGradientCss?: string,
  filterCss?: string
): void {
  if (videoEl.readyState < 2) return;

  // 1. Dessiner le nouvel arrière-plan (Image ou Dégradé Studio) avec flou bokeh optionnel
  ctx.save();
  if (config.bgBlurPx > 0) {
    ctx.filter = `blur(${config.bgBlurPx}px)`;
  }
  if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
    // Cover proportionnel sans déformation
    const imgRatio = bgImage.naturalWidth / bgImage.naturalHeight;
    const canvasRatio = width / height;
    let drawW = width;
    let drawH = height;
    let offsetX = 0;
    let offsetY = 0;
    if (imgRatio > canvasRatio) {
      drawH = height;
      drawW = height * imgRatio;
      offsetX = (width - drawW) / 2;
    } else {
      drawW = width;
      drawH = width / imgRatio;
      offsetY = (height - drawH) / 2;
    }
    ctx.drawImage(bgImage, offsetX - 8, offsetY - 8, drawW + 16, drawH + 16);
  } else {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    if (bgGradientCss && bgGradientCss.includes('#1e3a8a')) {
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e3a8a');
      grad.addColorStop(1, '#312e81');
    } else {
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(1, '#1e293b');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();

  // 2. Dessiner la frame vidéo sur le canvas hors-écran (aspect-cover sans dénaturation)
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

  offscreenCtx.clearRect(0, 0, width, height);
  offscreenCtx.save();
  if (filterCss) offscreenCtx.filter = filterCss;
  offscreenCtx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, width, height);
  offscreenCtx.restore();

  if (config.mode === 'none') {
    ctx.drawImage(offscreenCtx.canvas, 0, 0);
    return;
  }

  // 3. Incrustation YCbCr + Feathering + Anti-Spill (qualité plateau TV / YouTubeur)
  const keyHex =
    config.mode === 'green_screen'
      ? '#00b140'
      : config.mode === 'blue_screen'
        ? '#0047bb'
        : config.keyColorHex || '#00b140';
  const [kr, kg, kb] = hexToRgb(keyHex);
  const [keyCb, keyCr] = rgbToCbCr(kr, kg, kb);

  const frame = offscreenCtx.getImageData(0, 0, width, height);
  const data = frame.data;
  const sim = Math.max(0.05, config.similarity);
  const smooth = Math.max(0.01, config.smoothness);
  const spill = Math.max(0, Math.min(1, config.spillSuppression));
  const isBlueKey = config.mode === 'blue_screen';

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const [cb, cr] = rgbToCbCr(r, g, b);
    const dist = Math.hypot(cb - keyCb, cr - keyCr);

    if (dist < sim) {
      data[i + 3] = 0;
    } else if (dist < sim + smooth) {
      const alphaFactor = (dist - sim) / smooth;
      data[i + 3] = Math.round(alphaFactor * 255);
    }

    // Anti-Spill : supprime le halo vert (ou bleu) sur les cheveux et la peau sans dénaturer les couleurs
    if (spill > 0 && data[i + 3] > 0) {
      if (!isBlueKey) {
        const maxAllowedGreen = (r + b) * 0.52;
        if (g > maxAllowedGreen) {
          g = Math.round(g - (g - maxAllowedGreen) * spill);
          data[i + 1] = g;
        }
      } else {
        const maxAllowedBlue = (r + g) * 0.52;
        if (b > maxAllowedBlue) {
          b = Math.round(b - (b - maxAllowedBlue) * spill);
          data[i + 2] = b;
        }
      }
    }
  }

  offscreenCtx.putImageData(frame, 0, 0);
  ctx.drawImage(offscreenCtx.canvas, 0, 0);
}
