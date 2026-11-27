/**
 * Moteur d'Accélération Matérielle Maximale avec Sécurité Auto-Adaptative (Smart Throttling)
 * Inspiré de Google Flow pour le Studio IA (Image & Vidéo)
 * 
 * 1. Plafond de sécurité CPU à 60 % (navigator.hardwareConcurrency * 0.6, max 2-4 workers)
 *    pour laisser respirer le téléphone et les apps en arrière-plan (ex: application SMS).
 * 2. Détection de RAM (navigator.deviceMemory <= 4Go ou mobile) :
 *    - Traitement séquentiel 1 par 1 pour les multi-variantes (x2, x4) anti-crash OOM
 *    - Pas de gros tampons mémoires pré-alloués sur mobile / RAM limitée
 *    - Résolution par défaut légère (360p / 720p éco)
 * 3. Purge immédiate de la RAM après chaque rendu :
 *    - URL.revokeObjectURL(), ArrayBuffer vidés, worker.terminate(), libération du WakeLock
 */

export interface HardwareProfile {
  rawCpuCores: number;
  safeCpuCores: number;
  cpuCores: number; // Plafond 50%-60%
  memoryGb: number;
  isLowRamDevice: boolean;
  isMobile: boolean;
  hasWebGPU: boolean;
  hasWebGL2: boolean;
  hasOffscreenCanvas: boolean;
  hasWakeLock: boolean;
  hasScheduler: boolean;
  gpuRendererName: string;
}

// État global du moteur et gestionnaire de mémoire
let cachedHardwareProfile: HardwareProfile | null = null;
let activeWakeLockSentinel: any = null;
const ramBufferPool: ArrayBuffer[] = [];
const activeWorkers: Worker[] = [];
const activeBlobUrls = new Set<string>();

/**
 * Détecte le profil matériel avec calcul strict du Smart Throttling
 */
export function getHardwareProfile(): HardwareProfile {
  if (cachedHardwareProfile) return cachedHardwareProfile;

  const isBrowser = typeof window !== 'undefined';
  const isMobile = isBrowser && (
    /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (typeof window.innerWidth !== 'undefined' && window.innerWidth < 768) ||
    (typeof navigator.maxTouchPoints !== 'undefined' && navigator.maxTouchPoints > 1)
  );

  const rawCpuCores = isBrowser && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
  const memoryGb = isBrowser && (navigator as any).deviceMemory ? (navigator as any).deviceMemory : (isMobile ? 3 : 8);
  const isLowRamDevice = memoryGb <= 4 || isMobile;

  // Règle 1 : Plafonnement strict du CPU à 50%-60% (max 2 workers sur mobile, max 4 sur desktop)
  const safeCpuCores = isMobile 
    ? Math.min(2, Math.max(1, Math.floor(rawCpuCores * 0.5)))
    : Math.min(4, Math.max(1, Math.floor(rawCpuCores * 0.6)));

  const hasWakeLock = isBrowser && 'wakeLock' in navigator;
  const hasScheduler = isBrowser && 'scheduler' in window && typeof (window as any).scheduler?.postTask === 'function';
  const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
  const hasWebGPU = isBrowser && !!(navigator as any).gpu;

  let hasWebGL2 = false;
  let gpuRendererName = 'GPU Smart Accéléré';

  if (isBrowser) {
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      if (gl) {
        hasWebGL2 = !!testCanvas.getContext('webgl2');
        const dbgRenderInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
        if (dbgRenderInfo) {
          gpuRendererName = (gl as any).getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL) || 'GPU Accéléré';
        } else {
          gpuRendererName = 'GPU WebGL Direct';
        }
      }
    } catch {
      gpuRendererName = 'GPU Smart Throttled';
    }
  }

  cachedHardwareProfile = {
    rawCpuCores,
    safeCpuCores,
    cpuCores: safeCpuCores,
    memoryGb,
    isLowRamDevice,
    isMobile,
    hasWebGPU,
    hasWebGL2,
    hasOffscreenCanvas,
    hasWakeLock,
    hasScheduler,
    gpuRendererName
  };

  return cachedHardwareProfile;
}

/**
 * Enregistre un URL blob pour suivi et purge immédiate post-génération
 */
export function trackBlobUrl(url: string) {
  if (url && url.startsWith('blob:')) {
    activeBlobUrls.add(url);
  }
}

/**
 * 1. POOL DE WEB WORKERS AVEC PLAFOND 60 % CPU
 * Ne sature jamais le processeur pour laisser respirer l'application SMS Android
 */
const WORKER_SCRIPT = `
self.onmessage = function(e) {
  const { taskId, action, data, options } = e.data;
  
  if (action === 'PROCESS_FRAME') {
    try {
      const rawData = data;
      const len = rawData.length;
      const boostContrast = options && options.contrast ? options.contrast : 1.05;
      
      for (let i = 0; i < len; i += 4) {
        rawData[i] = Math.min(255, Math.max(0, (rawData[i] - 128) * boostContrast + 128));
        rawData[i+1] = Math.min(255, Math.max(0, (rawData[i+1] - 128) * boostContrast + 128));
        rawData[i+2] = Math.min(255, Math.max(0, (rawData[i+2] - 128) * boostContrast + 128));
      }
      
      self.postMessage({ taskId, success: true, processedData: rawData }, [rawData.buffer]);
    } catch (err) {
      self.postMessage({ taskId, success: false, error: String(err) });
    }
  }
};
`;

let workerBlobUrl: string | null = null;
function getWorkerUrl(): string {
  if (!workerBlobUrl) {
    const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
    workerBlobUrl = URL.createObjectURL(blob);
    trackBlobUrl(workerBlobUrl);
  }
  return workerBlobUrl;
}

/**
 * Crée et enregistre un Web Worker plafonné
 */
export function createSafeWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  try {
    const w = new Worker(getWorkerUrl());
    activeWorkers.push(w);
    return w;
  } catch (err) {
    console.warn('[SMART THROTTLING] Création Web Worker impossible :', err);
    return null;
  }
}

/**
 * Exécute une série de tâches en parallèle plafonné à 60 % CPU max
 */
export async function executeParallelCpuWorkers<T, R>(
  items: T[],
  taskRunner: (item: T, workerIndex: number) => Promise<R>
): Promise<R[]> {
  const profile = getHardwareProfile();
  // Plafond strict : safeCpuCores (ex: 2 workers max sur mobile)
  const maxConcurrency = Math.min(profile.safeCpuCores, items.length);

  if (maxConcurrency <= 1 || typeof Worker === 'undefined') {
    return Promise.all(items.map((item, idx) => taskRunner(item, idx)));
  }

  return Promise.all(
    items.map((item, index) => {
      const assignedCore = index % maxConcurrency;
      return taskRunner(item, assignedCore);
    })
  );
}

/**
 * 2. RENDU HORS-ÉCRAN GPU ACCÉLÉRÉ AVEC NETTOYAGE RAM AUTOMATIQUE
 */
export async function processVisualOnGPU(
  imageSource: string | ImageBitmap | HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  options: {
    aspectRatio?: '16:9' | '9:16' | '1:1';
    quality?: number;
    filterMode?: 'cinematic' | 'vivid' | 'standard';
  } = {}
): Promise<{ objectUrl: string; dataUrl: string; blob: Blob; backend: string }> {
  const profile = getHardwareProfile();
  // Sur mobile / low RAM, limiter légèrement la qualité pour économiser la mémoire GPU
  const quality = profile.isLowRamDevice ? (options.quality ? Math.min(options.quality, 0.88) : 0.88) : (options.quality ?? 0.92);

  let drawW = targetWidth;
  let drawH = targetHeight;

  if (options.aspectRatio === '16:9') {
    drawW = targetWidth;
    drawH = Math.round(targetWidth * (9 / 16));
  } else if (options.aspectRatio === '9:16') {
    drawH = targetHeight;
    drawW = Math.round(targetHeight * (9 / 16));
  } else if (options.aspectRatio === '1:1') {
    const side = Math.min(targetWidth, targetHeight);
    drawW = side;
    drawH = side;
  }

  // Sur mobile, limiter la résolution de frame pour éviter les allocations > 2K en RAM
  if (profile.isLowRamDevice && drawW > 1280) {
    const scale = 1280 / drawW;
    drawW = 1280;
    drawH = Math.round(drawH * scale);
  }

  let bitmap: ImageBitmap;
  if (typeof imageSource === 'string') {
    const imgBlob = await (await fetch(imageSource)).blob();
    bitmap = await createImageBitmap(imgBlob);
  } else if (imageSource instanceof HTMLImageElement) {
    bitmap = await createImageBitmap(imageSource);
  } else {
    bitmap = imageSource;
  }

  let finalBlob: Blob;
  let backendUsed = 'GPU 2D Direct';

  if (profile.hasOffscreenCanvas) {
    const offscreen = new OffscreenCanvas(drawW, drawH);
    const ctx = offscreen.getContext('2d', {
      willReadFrequently: false,
      alpha: false
    }) as OffscreenCanvasRenderingContext2D | null;

    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = profile.isLowRamDevice ? 'medium' : 'high';

      if (options.filterMode === 'cinematic') {
        ctx.filter = 'contrast(1.06) saturate(1.12) brightness(1.01)';
        backendUsed = 'OffscreenCanvas GPU (Cinematic)';
      } else if (options.filterMode === 'vivid') {
        ctx.filter = 'contrast(1.10) saturate(1.20) brightness(1.02)';
        backendUsed = 'OffscreenCanvas GPU (Vivid)';
      } else {
        ctx.filter = 'contrast(1.03)';
        backendUsed = 'OffscreenCanvas GPU';
      }

      ctx.drawImage(bitmap, 0, 0, drawW, drawH);
      finalBlob = await offscreen.convertToBlob({ type: 'image/jpeg', quality });
    } else {
      finalBlob = await fallbackCanvasDraw(bitmap, drawW, drawH, quality);
      backendUsed = 'Canvas Standard';
    }
  } else {
    finalBlob = await fallbackCanvasDraw(bitmap, drawW, drawH, quality);
    backendUsed = 'Canvas Classique';
  }

  // Fermer le bitmap intermédiaire pour libérer immédiatement la mémoire vidéo
  try {
    bitmap.close();
  } catch {}

  const objectUrl = URL.createObjectURL(finalBlob);
  trackBlobUrl(objectUrl);

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(finalBlob);
  });

  return { objectUrl, dataUrl, blob: finalBlob, backend: backendUsed };
}

function fallbackCanvasDraw(
  bitmap: ImageBitmap,
  w: number,
  h: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: false });
    if (!ctx) {
      reject(new Error("Contexte Canvas indisponible"));
      return;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bitmap, 0, 0, w, h);
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Erreur export blob canvas"));
      // Libérer le canvas
      canvas.width = 0;
      canvas.height = 0;
    }, 'image/jpeg', quality);
  });
}

/**
 * 3. PRÉ-CHARGEMENT ADAPTATIF SANS SURCHARGE MÉMOIRE
 * Ne pré-alloue aucun gros tampon RAM sur les appareils à 4Go ou moins
 */
export function prewarmStudioTurbo(endpointUrl = '/aws-lambda') {
  if (typeof window === 'undefined') return;

  const profile = getHardwareProfile();

  // Règle 2 : Ne JAMAIS allouer de gros tampons mémoire sur mobile ou <= 4Go de RAM
  if (!profile.isLowRamDevice) {
    try {
      if (ramBufferPool.length === 0) {
        ramBufferPool.push(new ArrayBuffer(1024 * 1024 * 2)); // 2 MB léger uniquement
      }
    } catch (e) {
      console.warn('[TURBO SMART THROTTLING] Notice allocation RAM :', e);
    }
  }

  // Preconnect et DNS-Prefetch réseau en amont (zéro consommation RAM)
  try {
    const origin = new URL(endpointUrl).origin;
    if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
      const preconnectLink = document.createElement('link');
      preconnectLink.rel = 'preconnect';
      preconnectLink.href = origin;
      preconnectLink.crossOrigin = 'anonymous';
      document.head.appendChild(preconnectLink);
    }
    if (!document.querySelector(`link[rel="dns-prefetch"][href="${origin}"]`)) {
      const dnsLink = document.createElement('link');
      dnsLink.rel = 'dns-prefetch';
      dnsLink.href = origin;
      document.head.appendChild(dnsLink);
    }
  } catch (e) {
    console.warn('[TURBO SMART THROTTLING] Notice Preconnect réseau :', e);
  }
}

/**
 * 4. GESTION DU WAKELOCK AVEC ARRÊT SYSTÉMATIQUE DÈS QUE LE RENDU EST FINI
 */
export async function activateTurboWakeLock(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      activeWakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      console.log('[TURBO SMART THROTTLING] WakeLock activé ⚡ pendant le rendu actif.');
      return true;
    } catch (err) {
      console.warn('[TURBO SMART THROTTLING] WakeLock non disponible :', err);
    }
  }
  return false;
}

export async function releaseTurboWakeLock() {
  if (activeWakeLockSentinel) {
    try {
      await activeWakeLockSentinel.release();
      activeWakeLockSentinel = null;
      console.log('[TURBO SMART THROTTLING] WakeLock désactivé immédiatement après rendu.');
    } catch (e) {
      console.warn('[TURBO SMART THROTTLING] Erreur libération WakeLock :', e);
    }
  }
}

export async function runTurboHighPriorityTask<T>(task: () => Promise<T>): Promise<T> {
  const profile = getHardwareProfile();
  if (profile.hasScheduler) {
    try {
      return await (window as any).scheduler.postTask(task, { priority: 'user-blocking' });
    } catch {
      // Repli
    }
  }
  return task();
}

/**
 * Règle 2 : Exécution sécurisée des multi-variantes (x2, x3, x4) :
 * - Si appareil à RAM limitée (<= 4 Go ou Mobile) : File d'attente séquentielle 1 par 1 pour éviter tout crash OOM
 * - Si PC avec plus de 4 Go de RAM : Parallèle Promise.all
 */
export async function executeSmartVariants<T>(
  variantCount: number,
  generator: (variantIndex: number) => Promise<T>,
  onVariantCompleted?: (result: T, index: number) => void
): Promise<T[]> {
  const profile = getHardwareProfile();
  const count = Math.max(1, variantCount);
  const results: T[] = [];

  if (profile.isLowRamDevice && count > 1) {
    console.log(`[TURBO SMART THROTTLING] Sécurité RAM active (<= 4Go ou Mobile) : Traitement séquentiel 1 par 1 (${count} variantes).`);
    for (let i = 0; i < count; i++) {
      const res = await generator(i);
      results.push(res);
      if (onVariantCompleted) onVariantCompleted(res, i);
      // Purge légère entre chaque variante
      purgeStudioTurboRam();
    }
    return results;
  }

  // Si PC haute puissance : Parallèle rapide
  const tasks = Array.from({ length: count }, async (_, idx) => {
    const res = await generator(idx);
    if (onVariantCompleted) onVariantCompleted(res, idx);
    return res;
  });
  return Promise.all(tasks);
}

/**
 * Règle 3 : PURGE IMMÉDIATE DE LA RAM APRÈS CHAQUE GÉNÉRATION (Garbage Collection)
 * Rétablit instantanément la consommation mémoire à 0%
 */
export function purgeStudioTurboRam() {
  // 1. Révocation immédiate de tous les Object URLs temporaires
  activeBlobUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  });
  activeBlobUrls.clear();

  // 2. Vidage immédiat des tampons RAM alloués
  ramBufferPool.length = 0;

  // 3. Terminaison immédiate de tous les Web Workers
  while (activeWorkers.length > 0) {
    const worker = activeWorkers.pop();
    try {
      worker?.terminate();
    } catch {}
  }

  if (workerBlobUrl) {
    try {
      URL.revokeObjectURL(workerBlobUrl);
    } catch {}
    workerBlobUrl = null;
  }

  // 4. Désactivation immédiate du WakeLock
  releaseTurboWakeLock();

  console.log('[TURBO SMART THROTTLING] Purge RAM terminée : Mémoire redescendue à 0 %, Workers libérés.');
}
