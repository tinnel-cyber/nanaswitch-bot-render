/**
 * Coordinateur Client du Web Worker d'Arrière-Plan (Offline Sync & Batching)
 *
 * Gère le cycle de vie du worker, la reconnexion automatique et l'exécution
 * des lots de WriteBatch Firestore sans bloquer le thread principal du POS.
 */

import { flushOfflineSyncQueue } from '../services/offlineSyncService';

class OfflineSyncWorkerManager {
  private static instance: OfflineSyncWorkerManager | null = null;
  private worker: Worker | null = null;
  private fallbackTimer: any = null;
  private isInitialized = false;

  public static getInstance(): OfflineSyncWorkerManager {
    if (!OfflineSyncWorkerManager.instance) {
      OfflineSyncWorkerManager.instance = new OfflineSyncWorkerManager();
    }
    return OfflineSyncWorkerManager.instance;
  }

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    try {
      // 1. Initialiser le Worker si supporté
      if (typeof Worker !== 'undefined') {
        this.worker = new Worker(
          new URL('./offlineSyncWorker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = async (event: MessageEvent) => {
          const { type, maxBatchSize } = event.data || {};
          if (type === 'EXECUTE_BATCH_FLUSH') {
            try {
              await flushOfflineSyncQueue(maxBatchSize || 50);
            } finally {
              this.worker?.postMessage({ type: 'BATCH_FINISHED' });
            }
          }
        };

        this.worker.postMessage({
          type: 'START',
          payload: { isOnline: navigator.onLine },
        });

        console.log('[OfflineSyncWorker] Web Worker démarré avec succès pour le traitement local.');
      } else {
        this.startFallbackScheduler();
      }
    } catch (err) {
      console.warn('[OfflineSyncWorker] Initialisation worker échouée, activation du scheduler principal:', err);
      this.startFallbackScheduler();
    }

    // 2. Écouter les événements réseau
    window.addEventListener('online', () => {
      this.worker?.postMessage({
        type: 'ONLINE_STATUS',
        payload: { isOnline: true },
      });
      if (!this.worker) {
        flushOfflineSyncQueue(50).catch(() => {});
      }
    });

    window.addEventListener('offline', () => {
      this.worker?.postMessage({
        type: 'ONLINE_STATUS',
        payload: { isOnline: false },
      });
    });

    // 3. Écouter les déclenchements de vente POS
    window.addEventListener('nana_trigger_worker_sync', () => {
      this.triggerSync();
    });
  }

  public triggerSync(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'TRIGGER_FLUSH' });
    } else {
      setTimeout(() => {
        flushOfflineSyncQueue(50).catch(() => {});
      }, 500);
    }
  }

  private startFallbackScheduler(): void {
    if (this.fallbackTimer) return;
    this.fallbackTimer = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        flushOfflineSyncQueue(50).catch(() => {});
      }
    }, 10000);
  }
}

export const offlineSyncWorkerManager = OfflineSyncWorkerManager.getInstance();

/**
 * Helper d'initialisation global
 */
export function initOfflineSyncWorker(): void {
  offlineSyncWorkerManager.init();
}
