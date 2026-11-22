/**
 * @file subtitleStudioService.ts
 * @description Émetteur de sous-titres automatique (Auto-Captions), modèles de textes viraux les plus utilisés
 * (Hormozi/MrBeast, TikTok/CapCut, Netflix, WhatsApp Promo, Podcast, Luxe, Néon) et export .SRT / .VTT.
 */

export interface SubtitleCue {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
}

export type SubtitleTemplateId =
  | 'hormozi_viral'
  | 'tiktok_karaoke'
  | 'netflix_cinema'
  | 'whatsapp_promo'
  | 'news_podcast'
  | 'luxe_minimal'
  | 'neon_cyber'
  | 'yellow_classic';

export interface SubtitleTemplate {
  id: SubtitleTemplateId;
  name: string;
  badge: string;
  desc: string;
  previewClass: string;
  textColor: string;
  bgColor?: string;
  strokeColor?: string;
  uppercase?: boolean;
}

export const SUBTITLE_TEXT_TEMPLATES: SubtitleTemplate[] = [
  {
    id: 'hormozi_viral',
    name: 'Hormozi / MrBeast',
    badge: '🔥 #1 TikTok/Reels',
    desc: 'MAJUSCULES bold jaune vif + contour noir épais ultra viral.',
    previewClass:
      'uppercase font-black tracking-tight text-yellow-300 text-base sm:text-lg leading-tight drop-shadow-[0_3px_2px_rgba(0,0,0,0.95)] [text-shadow:2px_2px_0_#000,-2px_-2px_0_#000,2px_-2px_0_#000,-2px_2px_0_#000]',
    textColor: '#FDE047',
    strokeColor: '#000000',
    uppercase: true
  },
  {
    id: 'tiktok_karaoke',
    name: 'CapCut / TikTok Box',
    badge: '⚡ Populaire',
    desc: 'Fond noir arrondi très lisible + accent émeraude dynamique.',
    previewClass:
      'font-extrabold text-white bg-black/85 border border-emerald-400/60 px-3 py-1.5 rounded-xl text-sm shadow-xl',
    textColor: '#FFFFFF',
    bgColor: 'rgba(0,0,0,0.85)'
  },
  {
    id: 'netflix_cinema',
    name: 'Cinéma / Netflix',
    badge: '🎬 Pro',
    desc: 'Blanc pur élégant avec légère ombre, parfait pour YouTube & cours.',
    previewClass:
      'font-semibold text-white text-sm sm:text-base tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]',
    textColor: '#FFFFFF',
    strokeColor: '#000000'
  },
  {
    id: 'whatsapp_promo',
    name: 'Promo Flash WhatsApp',
    badge: '💰 Vente',
    desc: 'Fond rouge/or haute visibilité pour prix FCFA et ventes flash.',
    previewClass:
      'uppercase font-black text-white bg-gradient-to-r from-red-600 to-amber-500 border border-yellow-200/80 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm shadow-lg',
    textColor: '#FFFFFF',
    bgColor: '#DC2626',
    uppercase: true
  },
  {
    id: 'news_podcast',
    name: 'Podcast / Interview',
    badge: '🎙️ Studio',
    desc: 'Boîte sombre translucide + barre cyan pour contenus éducatifs.',
    previewClass:
      'font-bold text-slate-100 bg-slate-950/80 backdrop-blur-md border-l-4 border-cyan-400 px-3 py-1.5 rounded-r-xl text-xs sm:text-sm shadow-lg',
    textColor: '#F1F5F9',
    bgColor: 'rgba(2,6,23,0.82)'
  },
  {
    id: 'luxe_minimal',
    name: 'Luxe & Mode',
    badge: '👑 Premium',
    desc: 'Lettres espacées fines dorées sur voile noir chic.',
    previewClass:
      'uppercase font-semibold tracking-[0.18em] text-amber-200 bg-black/65 border border-amber-400/50 px-4 py-1.5 rounded-full text-xs shadow-xl',
    textColor: '#FDE68A',
    bgColor: 'rgba(0,0,0,0.65)',
    uppercase: true
  },
  {
    id: 'neon_cyber',
    name: 'Néon Glow Viral',
    badge: '✨ Tendance',
    desc: 'Effet néon lumineux cyan/rose pour accroches modernes.',
    previewClass:
      'uppercase font-black text-cyan-200 bg-slate-950/75 border border-fuchsia-500/70 px-3.5 py-1.5 rounded-xl text-sm shadow-[0_0_18px_rgba(217,70,239,0.55)]',
    textColor: '#A5F3FC',
    bgColor: 'rgba(15,23,42,0.8)',
    uppercase: true
  },
  {
    id: 'yellow_classic',
    name: 'Sous-Titre TV Jaune',
    badge: '📺 Classique',
    desc: 'Jaune cinéma intemporel à fort contraste sur fond clair ou sombre.',
    previewClass:
      'font-bold text-amber-300 text-sm sm:text-base [text-shadow:1px_1px_2px_#000,-1px_-1px_2px_#000]',
    textColor: '#FCD34D',
    strokeColor: '#000000'
  }
];

/**
 * Découpe automatiquement un script ou texte parlé en sous-titres rythmés (style TikTok/Reels : 4 à 6 mots par segment).
 */
export function generateTimedSubtitlesFromScript(script: string, totalDurationSec: number = 30): SubtitleCue[] {
  const clean = String(script || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return [];

  const words = clean.split(' ');
  const chunks: string[] = [];
  const wordsPerChunk = words.length > 24 ? 5 : 4;

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }

  const safeDuration = Math.max(3, Number(totalDurationSec) || 30);
  const segDur = safeDuration / Math.max(1, chunks.length);

  return chunks.map((text, idx) => ({
    id: `cue_${Date.now()}_${idx}`,
    startSec: Number((idx * segDur).toFixed(2)),
    endSec: Number(Math.min(safeDuration, (idx + 1) * segDur).toFixed(2)),
    text
  }));
}

function formatSrtTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function formatVttTime(seconds: number): string {
  return formatSrtTime(seconds).replace(',', '.');
}

export function exportSubtitlesToSrt(cues: SubtitleCue[]): string {
  return cues
    .map((c, idx) => `${idx + 1}\n${formatSrtTime(c.startSec)} --> ${formatSrtTime(c.endSec)}\n${c.text.trim()}\n`)
    .join('\n');
}

export function exportSubtitlesToVtt(cues: SubtitleCue[]): string {
  const body = cues
    .map((c) => `${formatVttTime(c.startSec)} --> ${formatVttTime(c.endSec)}\n${c.text.trim()}\n`)
    .join('\n');
  return `WEBVTT\n\n${body}`;
}

export function downloadSubtitleFile(content: string, filename: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function encodeMono16kWav(samples: Float32Array, sampleRate: number): Blob {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Extrait et compresse localement la piste audio d'une vidéo/audio en WAV mono 16 kHz léger
 * (évite d'envoyer une vidéo MP4 de 30 Mo en Base64).
 */
async function extractCompactWavFromMediaBlob(mediaBlob: Blob): Promise<Blob> {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return mediaBlob;
    const arrBuf = await mediaBlob.arrayBuffer();
    const ctx = new AudioCtx();
    const decoded = await ctx.decodeAudioData(arrBuf.slice(0));
    ctx.close().catch(() => {});

    const targetRate = 16000;
    const maxSec = Math.min(decoded.duration, 120); // jusqu'à 2 minutes
    const frameCount = Math.max(1, Math.floor(maxSec * targetRate));
    const offline = new OfflineAudioContext(1, frameCount, targetRate);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();
    return encodeMono16kWav(rendered.getChannelData(0), targetRate);
  } catch {
    return mediaBlob;
  }
}

/**
 * Transcription automatique via le serveur (/api/ai/transcribe) sur un Blob vidéo ou audio,
 * avec extraction audio locale légère (WAV 16kHz) puis découpage horodaté prêt pour l'incrustation et .SRT / .VTT.
 */
export async function autoTranscribeBlobToSubtitles(
  mediaBlob: Blob,
  durationSec: number
): Promise<{ text: string; cues: SubtitleCue[] }> {
  const payloadBlob =
    mediaBlob.type.startsWith('video/') || mediaBlob.size > 1_500_000
      ? await extractCompactWavFromMediaBlob(mediaBlob)
      : mediaBlob;

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = String(reader.result || '');
      resolve(res.includes(',') ? res.split(',')[1] : res);
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier audio.'));
    reader.readAsDataURL(payloadBlob);
  });

  const res = await fetch('/api/ai/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64: base64,
      mimeType: payloadBlob.type || 'audio/wav',
      language: 'fr',
      mode: 'video_subtitles'
    })
  });

  const json = await res.json().catch(() => null);
  const transcript = String(json?.text || json?.transcript || '').trim();
  if (!res.ok || !transcript) {
    throw new Error(
      json?.error ||
        json?.message ||
        'Aucune parole détectée ou transcription indisponible — utilisez la Dictée Micro directe ou saisissez votre script ci-dessous.'
    );
  }

  return {
    text: transcript,
    cues: generateTimedSubtitlesFromScript(transcript, durationSec)
  };
}
