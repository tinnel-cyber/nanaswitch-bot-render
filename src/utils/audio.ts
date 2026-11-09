// Audio synthesizer using Web Audio API for responsive POS sounds

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Supermarket scanner confirmation beep (crisp double tone)
 */
export function playValidationBeep(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // First tone (1200 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Second tone (1800 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1800, now + 0.07);
    gain2.gain.setValueAtTime(0.2, now + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.07);
    osc2.stop(now + 0.18);
  } catch (e) {
    console.warn('Audio playback not allowed yet or not supported', e);
  }
}

/**
 * Fast sale tap sound (subtle click)
 */
export function playTapBeep(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {
    // Ignore audio errors
  }
}

/**
 * Cash payment success chime
 */
export function playCashChime(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  } catch (e) {
    // Ignore audio errors
  }
}

/**
 * Cancel or clear basket sound
 */
export function playCancelSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.12);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) {
    // Ignore audio errors
  }
}

/**
 * Alerte sonore festive et distincte pour nouvelle commande en ligne (Chime Ding-Dong double carillon)
 */
export function playNewOrderAlert(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Séquence carillon riche : Mi5 -> Do5 -> Sol5 -> Do6 -> Mi6 -> Sol6
    const notes = [
      { freq: 659.25, time: 0, duration: 0.18, gain: 0.22 },
      { freq: 523.25, time: 0.14, duration: 0.18, gain: 0.22 },
      { freq: 783.99, time: 0.32, duration: 0.22, gain: 0.25 },
      { freq: 1046.5, time: 0.50, duration: 0.45, gain: 0.30 },
      { freq: 1318.5, time: 0.70, duration: 0.35, gain: 0.20 },
      { freq: 1567.98, time: 0.88, duration: 0.50, gain: 0.22 }
    ];

    notes.forEach(({ freq, time, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const startTime = now + time;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(gain, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (e) {
    console.warn('Audio alert not permitted or not supported', e);
  }
}

/**
 * Cha-ching sonore jubilatoire (Caisse enregistreuse + tintement de pièces d'or)
 * Déclenché lors du gain d'une commission d'affiliation Micro-Relais
 */
export function playChaChingSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // 1. Coup mécanique initial de tiroir-caisse (Kick / Snap métallique)
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(320, now);
    snapOsc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    snapGain.gain.setValueAtTime(0.3, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.08);

    // 2. Cloche éclatante argentée (Bell Chime C7 - 2093 Hz & harmoniques brillantes)
    const bellFreqs = [2093, 2637, 3135.96, 4186];
    bellFreqs.forEach((freq, i) => {
      const bellOsc = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(freq, now + 0.04);
      const gainVal = i === 0 ? 0.28 : 0.15 / (i + 1);
      bellGain.gain.setValueAtTime(gainVal, now + 0.04);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
      bellOsc.connect(bellGain);
      bellGain.connect(ctx.destination);
      bellOsc.start(now + 0.04);
      bellOsc.stop(now + 0.95);
    });

    // 3. Tintements en cascade de pièces d'or qui s'entrechoquent (Coin Jingle)
    const coinTones = [
      { time: 0.12, freq: 1760, dur: 0.18, vol: 0.18 }, // A6
      { time: 0.17, freq: 2349, dur: 0.22, vol: 0.22 }, // D7
      { time: 0.24, freq: 2793, dur: 0.25, vol: 0.24 }, // F7
      { time: 0.32, freq: 3520, dur: 0.30, vol: 0.26 }, // A7
      { time: 0.40, freq: 4186, dur: 0.35, vol: 0.20 }  // C8
    ];

    coinTones.forEach(({ time, freq, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);
      gain.gain.setValueAtTime(vol, now + time);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  } catch (e) {
    console.warn('Cha-ching audio alert not permitted or not supported', e);
  }
}

/**
 * Format currency in F CFA with non-breaking spaces
 */
export function formatCFA(amount?: number | null): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : (Number(amount) || 0);
  const formatted = Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} F CFA`;
}

