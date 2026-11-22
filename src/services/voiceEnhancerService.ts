/**
 * @file voiceEnhancerService.ts
 * @description Processeur DSP Audio Studio côté client (Web Audio API OfflineAudioContext).
 * - Suppression de bruit (High-Pass 85 Hz + Low-Pass 12 kHz + Noise Gate adaptatif)
 * - Égaliseur de voix 3 bandes (Graves 180 Hz, Médiums 1.8 kHz, Aigus 5.5 kHz)
 * - Amélioration de voix Broadcast (Présence 3.2 kHz + Compresseur dynamique + Normalisation)
 * - Export WAV 16-bit PCM 100 % local (zéro stockage Cloud)
 */

export interface VoiceDspSettings {
  noiseReduction: boolean;      // Coupe-bas 85Hz + Coupe-haut 12kHz + Noise Gate
  noiseGateThresholdDb: number; // Seuil gate (ex: -42 dB)
  voiceEnhance: boolean;        // Compresseur Broadcast + Boost présence 3.2 kHz + Normalisation
  eqBassDb: number;             // -12 à +12 dB (180 Hz)
  eqMidDb: number;              // -12 à +12 dB (1800 Hz)
  eqTrebleDb: number;           // -12 à +12 dB (5500 Hz)
}

export const VOICE_EQ_PRESETS: Record<string, { label: string; desc: string; settings: VoiceDspSettings }> = {
  broadcast_pub: {
    label: '🎙️ Pub & Radio Punchy',
    desc: 'Voix puissante, nette et compressée pour TikTok/Reels',
    settings: {
      noiseReduction: true,
      noiseGateThresholdDb: -40,
      voiceEnhance: true,
      eqBassDb: 3,
      eqMidDb: 2.5,
      eqTrebleDb: 4
    }
  },
  podcast_warm: {
    label: '🎧 Podcast Chaleureux',
    desc: 'Graves profonds et clarté douce pour formations/cours',
    settings: {
      noiseReduction: true,
      noiseGateThresholdDb: -44,
      voiceEnhance: true,
      eqBassDb: 5,
      eqMidDb: 1,
      eqTrebleDb: 2
    }
  },
  phone_clarity: {
    label: '📱 Clarté Téléphone Max',
    desc: 'Coupe les bruits ambiants et maximise l\'intelligibilité',
    settings: {
      noiseReduction: true,
      noiseGateThresholdDb: -36,
      voiceEnhance: true,
      eqBassDb: -2,
      eqMidDb: 4.5,
      eqTrebleDb: 3.5
    }
  },
  natural: {
    label: '🌿 Voix Naturelle',
    desc: 'Égalisation neutre avec léger nettoyage du souffle',
    settings: {
      noiseReduction: true,
      noiseGateThresholdDb: -48,
      voiceEnhance: false,
      eqBassDb: 0,
      eqMidDb: 0,
      eqTrebleDb: 0
    }
  }
};

function encodeAudioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = Math.min(2, buffer.numberOfChannels);
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Applique un Noise Gate doux (atténuation du souffle de fond entre les mots)
 * et une normalisation de crête (-1 dBFS) sur un AudioBuffer.
 */
function applyNoiseGateAndNormalize(buffer: AudioBuffer, settings: VoiceDspSettings): void {
  const thresholdLinear = Math.pow(10, (settings.noiseGateThresholdDb || -42) / 20);
  const windowSize = Math.max(64, Math.floor(buffer.sampleRate * 0.015)); // 15 ms RMS

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);

    if (settings.noiseReduction) {
      let gain = 1;
      for (let i = 0; i < data.length; i += windowSize) {
        const end = Math.min(data.length, i + windowSize);
        let sumSq = 0;
        for (let j = i; j < end; j++) {
          sumSq += data[j] * data[j];
        }
        const rms = Math.sqrt(sumSq / (end - i));
        const targetGain = rms < thresholdLinear ? 0.08 : 1.0;
        for (let j = i; j < end; j++) {
          gain += (targetGain - gain) * 0.08;
          data[j] *= gain;
        }
      }
    }

    if (settings.voiceEnhance) {
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
      }
      if (peak > 0.01) {
        const targetPeak = 0.89; // -1 dBFS
        const mult = Math.min(3.0, targetPeak / peak);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.max(-0.98, Math.min(0.98, data[i] * mult));
        }
      }
    }
  }
}

/**
 * Traite un Blob audio (WebM/MP3/WAV) avec toute la chaîne DSP Studio et retourne un Blob WAV prêt à télécharger.
 */
export async function processVoiceWithDsp(
  inputBlob: Blob,
  settings: VoiceDspSettings
): Promise<{ wavBlob: Blob; wavUrl: string; durationSec: number }> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx || typeof OfflineAudioContext === 'undefined') {
    throw new Error('Votre navigateur ne supporte pas le moteur audio Web Audio API.');
  }

  const arrayBuffer = await inputBlob.arrayBuffer();
  const tempCtx = new AudioCtx();
  const decoded = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
  await tempCtx.close().catch(() => {});

  const offline = new OfflineAudioContext(
    Math.min(2, decoded.numberOfChannels),
    decoded.length,
    decoded.sampleRate
  );

  const source = offline.createBufferSource();
  source.buffer = decoded;

  let currentNode: AudioNode = source;

  // 1. Suppression de bruit : Filtre Passe-Haut 85 Hz (vent/bourdonnement) + Passe-Bas 12 kHz (sifflements)
  if (settings.noiseReduction) {
    const highPass = offline.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = 85;
    highPass.Q.value = 0.8;

    const lowPass = offline.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = 12000;
    lowPass.Q.value = 0.7;

    currentNode.connect(highPass);
    highPass.connect(lowPass);
    currentNode = lowPass;
  }

  // 2. Égaliseur de Voix 3 Bandes
  const eqBass = offline.createBiquadFilter();
  eqBass.type = 'lowshelf';
  eqBass.frequency.value = 180;
  eqBass.gain.value = settings.eqBassDb;

  const eqMid = offline.createBiquadFilter();
  eqMid.type = 'peaking';
  eqMid.frequency.value = 1800;
  eqMid.Q.value = 1.0;
  eqMid.gain.value = settings.eqMidDb;

  const eqTreble = offline.createBiquadFilter();
  eqTreble.type = 'highshelf';
  eqTreble.frequency.value = 5500;
  eqTreble.gain.value = settings.eqTrebleDb;

  currentNode.connect(eqBass);
  eqBass.connect(eqMid);
  eqMid.connect(eqTreble);
  currentNode = eqTreble;

  // 3. Amélioration de Voix Broadcast (Boost présence 3.2 kHz + Compresseur dynamique)
  if (settings.voiceEnhance) {
    const presence = offline.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 3200;
    presence.Q.value = 1.2;
    presence.gain.value = 3.2;

    const compressor = offline.createDynamicsCompressor();
    compressor.threshold.value = -22;
    compressor.knee.value = 18;
    compressor.ratio.value = 4.5;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.14;

    currentNode.connect(presence);
    presence.connect(compressor);
    currentNode = compressor;
  }

  currentNode.connect(offline.destination);
  source.start(0);

  const rendered = await offline.startRendering();
  applyNoiseGateAndNormalize(rendered, settings);

  const wavBlob = encodeAudioBufferToWavBlob(rendered);
  const wavUrl = URL.createObjectURL(wavBlob);

  return {
    wavBlob,
    wavUrl,
    durationSec: rendered.duration
  };
}
