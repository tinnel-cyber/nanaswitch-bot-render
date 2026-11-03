/**
 * Web Worker d'Arrière-Plan : Offline Sync & Batch Dispatcher
 *
 * Responsabilités :
 * 1. Surveille la file d'attente IndexedDB ('offlineSyncQueue') sans bloquer l'UI de la caisse.
 * 2. Regroupe les opérations par lots (20 à 50 opérations) pour déclencher les WriteBatch Firestore.
 * 3. Gère le throttling (tempo de 10s après la dernière vente ou seuil de 20 opérations).
 * 4. Fonctionne de manière silencieuse sans lever d'exceptions lors des coupures réseau.
 */

let isOnline = true;
let heartbeatTimer: any = null;
let lastFlushTimestamp = Date.now();
let isBusy = false;

const DB_NAME = 'nanasore_offline_db';
const DB_VERSION = 2;
const BATCH_THRESHOLD_COUNT = 20;
const BATCH_TIMEOUT_MS = 10000; // 10 secondes

function checkPendingQueueInDB(): Promise<number> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      return resolve(0);
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('offlineSyncQueue')) {
          db.close();
          return resolve(0);
        }

        try {
          const tx = db.transaction('offlineSyncQueue', 'readonly');
          const store = tx.objectStore('offlineSyncQueue');
          const countReq = store.count();
          countReq.onsuccess = () => {
            const count = countReq.result || 0;
            db.close();
            resolve(count);
          };
          countReq.onerror = () => {
            db.close();
            resolve(0);
          };
        } catch {
          db.close();
          resolve(0);
        }
      };

      request.onerror = () => resolve(0);
    } catch {
      resolve(0);
    }
  });
}

async function evaluateAndTriggerFlush(force = false) {
  if (!isOnline || isBusy) return;

  try {
    const pendingCount = await checkPendingQueueInDB();
    if (pendingCount === 0) return;

    const timeSinceLastFlush = Date.now() - lastFlushTimestamp;
    const shouldFlush = force || pendingCount >= BATCH_THRESHOLD_COUNT || timeSinceLastFlush >= BATCH_TIMEOUT_MS;

    if (shouldFlush) {
      isBusy = true;
      lastFlushTimestamp = Date.now();
      self.postMessage({
        type: 'EXECUTE_BATCH_FLUSH',
        pendingCount,
        maxBatchSize: 50,
        timestamp: Date.now(),
      });
    }
  } catch (err) {
    // Erreur silencieuse
  }
}

// Écouteur de messages du thread principal
self.addEventListener('message', (event: MessageEvent) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'START':
      isOnline = payload?.isOnline ?? true;
      if (!heartbeatTimer) {
        heartbeatTimer = setInterval(() => {
          evaluateAndTriggerFlush(false);
        }, 8000);
      }
      break;

    case 'TRIGGER_FLUSH':
      evaluateAndTriggerFlush(true);
      break;

    case 'ONLINE_STATUS':
      isOnline = Boolean(payload?.isOnline);
      if (isOnline) {
        evaluateAndTriggerFlush(true);
      }
      break;

    case 'BATCH_FINISHED':
      isBusy = false;
      lastFlushTimestamp = Date.now();
      break;

    default:
      break;
  }
});
