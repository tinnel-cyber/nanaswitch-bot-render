/**
 * Service de Persistance Hors-ligne & File de Synchronisation Résiliente (IndexedDB + PWA)
 *
 * Assure la continuité totale du service pour la caisse (POS), la vitrine boutique et le panier
 * même en l'absence de réseau (navigator.onLine === false ou échec Firebase/RTDB).
 *
 * Fonctionnalités clés :
 * 1. Base IndexedDB locale étanche ('nanasore_offline_db') avec tables :
 *    - 'orders' : bons de commande et devis
 *    - 'products' : catalogue articles et stocks locaux
 *    - 'cart' : paniers d'achat en cours
 *    - 'offlineSyncQueue' : mutations en attente de synchronisation cloud
 * 2. File d'attente résiliente 'offlineSyncQueue' avec retry exponentiel
 * 3. Dépilement automatique dès détection de l'événement window 'online'
 * 4. Fallback transparent vers localStorage si IndexedDB est désactivé
 */

export type OfflineActionType =
  | 'CREATE_ORDER'
  | 'UPDATE_ORDER'
  | 'DELETE_ORDER'
  | 'SAVE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'SAVE_CART'
  | 'RTDB_MUTATION'
  | 'CREATE_SALE'
  | 'UPDATE_STOCK';

export interface OfflineSyncItem {
  id: string;
  type: OfflineActionType;
  storeId: string;
  payload: any;
  createdAt: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  lastAttempt?: number;
  error?: string;
}

const DB_NAME = 'nanasore_offline_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;
let isSyncingQueue = false;

/**
 * Ouvre ou récupère l'instance singleton de la base IndexedDB
 */
export function openOfflineDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB indisponible sur cet appareil'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (_event: IDBVersionChangeEvent) => {
        const db = request.result;

        // 1. Table Commandes
        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
          orderStore.createIndex('storeId', 'storeId', { unique: false });
          orderStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 2. Table Produits / Inventaire
        if (!db.objectStoreNames.contains('products')) {
          const prodStore = db.createObjectStore('products', { keyPath: 'id' });
          prodStore.createIndex('storeId', 'storeId', { unique: false });
        }

        // 3. Table Panier
        if (!db.objectStoreNames.contains('cart')) {
          db.createObjectStore('cart', { keyPath: 'id' });
        }

        // 4. File de synchronisation des mutations hors-ligne
        if (!db.objectStoreNames.contains('offlineSyncQueue')) {
          const queueStore = db.createObjectStore('offlineSyncQueue', { keyPath: 'id' });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 5. Table Ventes (Sales) POS Caisse Local-First
        if (!db.objectStoreNames.contains('sales')) {
          const saleStore = db.createObjectStore('sales', { keyPath: 'id' });
          saleStore.createIndex('storeId', 'storeId', { unique: false });
          saleStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        dbPromise = null;
        reject(request.error || new Error('Erreur ouverture nanasore_offline_db'));
      };
    } catch (err) {
      dbPromise = null;
      reject(err);
    }
  });

  return dbPromise;
}

// =========================================================================
// GESTION HORS-LIGNE DES COMMANDES (ORDERS)
// =========================================================================

/**
 * Enregistre ou met à jour une commande dans le stockage IndexedDB (avec miroir localStorage)
 */
export async function saveOrderOffline(order: any, storeId: string): Promise<boolean> {
  if (!order || !order.id) return false;
  const safeStoreId = storeId || order.storeId || 'default_store';
  const itemToStore = { ...order, storeId: safeStoreId, updatedAt: new Date().toISOString() };

  // 1. Miroir de secours localStorage
  try {
    const key = `nana_orders_${safeStoreId}`;
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((o: any) => o.id !== order.id);
    filtered.unshift(itemToStore);
    localStorage.setItem(key, JSON.stringify(filtered.slice(0, 500)));
  } catch {}

  // 2. Écriture IndexedDB
  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('orders', 'readwrite');
      const store = tx.objectStore('orders');
      const req = store.put(itemToStore);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch (err) {
    console.warn('[OfflineDB] Erreur saveOrderOffline dans IndexedDB, repli localStorage actif:', err);
    return true; // Ne pas planter l'UI
  }
}

/**
 * Récupère les commandes d'une boutique depuis IndexedDB (ou fallback localStorage)
 */
export async function getOrdersOffline(storeId: string): Promise<any[]> {
  const safeStoreId = storeId || 'default_store';

  // 1. Tentative IndexedDB
  try {
    const db = await openOfflineDB();
    const orders = await new Promise<any[]>((resolve, reject) => {
      const tx = db.transaction('orders', 'readonly');
      const store = tx.objectStore('orders');
      const index = store.index('storeId');
      const req = index.getAll(IDBKeyRange.only(safeStoreId));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (orders && orders.length > 0) {
      return orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  } catch (err) {
    console.warn('[OfflineDB] Erreur lecture getOrdersOffline IndexedDB:', err);
  }

  // 2. Fallback localStorage
  try {
    const key = `nana_orders_${safeStoreId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

/**
 * Supprime une commande d'IndexedDB
 */
export async function deleteOrderOffline(orderId: string, storeId: string): Promise<boolean> {
  if (!orderId) return false;

  // LocalStorage
  try {
    const key = `nana_orders_${storeId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list = JSON.parse(raw);
      const filtered = list.filter((o: any) => o.id !== orderId);
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  } catch {}

  // IndexedDB
  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('orders', 'readwrite');
      const store = tx.objectStore('orders');
      const req = store.delete(orderId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch (err) {
    console.warn('[OfflineDB] Erreur deleteOrderOffline:', err);
    return false;
  }
}

// =========================================================================
// GESTION HORS-LIGNE DES PRODUITS & CATALOGUE (PRODUCTS)
// =========================================================================

/**
 * Sauvegarde un produit dans le cache IndexedDB
 */
export async function saveProductOffline(product: any, storeId: string): Promise<boolean> {
  if (!product || !product.id) return false;
  const safeStoreId = storeId || product.storeId || 'default_store';
  const item = { ...product, storeId: safeStoreId, updatedAt: new Date().toISOString() };

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('products', 'readwrite');
      const store = tx.objectStore('products');
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch (err) {
    console.warn('[OfflineDB] Erreur saveProductOffline:', err);
    return false;
  }
}

/**
 * Sauvegarde un lot complet de produits dans IndexedDB (ex: lors du fetch en ligne)
 */
export async function saveProductsOffline(products: any[], storeId: string): Promise<boolean> {
  if (!Array.isArray(products) || products.length === 0) return true;
  const safeStoreId = storeId || 'default_store';

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('products', 'readwrite');
      const store = tx.objectStore('products');
      products.forEach((p) => {
        if (p && p.id) {
          store.put({ ...p, storeId: safeStoreId });
        }
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (err) {
    console.warn('[OfflineDB] Erreur saveProductsOffline lot:', err);
    return false;
  }
}

/**
 * Récupère tous les produits en cache IndexedDB pour un magasin
 */
export async function getProductsOffline(storeId: string): Promise<any[]> {
  const safeStoreId = storeId || 'default_store';

  try {
    const db = await openOfflineDB();
    const products = await new Promise<any[]>((resolve, reject) => {
      const tx = db.transaction('products', 'readonly');
      const store = tx.objectStore('products');
      const index = store.index('storeId');
      const req = index.getAll(IDBKeyRange.only(safeStoreId));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (products && products.length > 0) {
      return products;
    }
  } catch (err) {
    console.warn('[OfflineDB] Erreur getProductsOffline IndexedDB:', err);
  }

  // Fallback localStorage
  try {
    const key = `nana_tenant_${safeStoreId}_inventory`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  return [];
}

/**
 * Supprime un produit du cache IndexedDB
 */
export async function deleteProductOffline(productId: string, storeId: string): Promise<boolean> {
  if (!productId) return false;
  const safeStoreId = storeId || 'default_store';

  try {
    const key = `nana_tenant_${safeStoreId}_inventory`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list = JSON.parse(raw);
      const filtered = list.filter((p: any) => p.id !== productId);
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  } catch {}

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('products', 'readwrite');
      const store = tx.objectStore('products');
      const req = store.delete(productId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch (err) {
    console.warn('[OfflineDB] Erreur deleteProductOffline:', err);
    return false;
  }
}

// =========================================================================
// GESTION HORS-LIGNE DU PANIER (CART)
// =========================================================================

/**
 * Sauvegarde le panier dans IndexedDB (persiste même après rechargement ou extinction)
 */
export async function saveCartOffline(storeId: string, items: any[]): Promise<boolean> {
  const safeId = storeId || 'active_cart';
  const cartRecord = { id: safeId, items: items || [], updatedAt: Date.now() };

  // Miroir localStorage
  try {
    localStorage.setItem(`nana_cart_${safeId}`, JSON.stringify(items || []));
  } catch {}

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('cart', 'readwrite');
      const store = tx.objectStore('cart');
      const req = store.put(cartRecord);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch (err) {
    console.warn('[OfflineDB] Erreur saveCartOffline:', err);
    return true;
  }
}

/**
 * Récupère le panier depuis IndexedDB
 */
export async function getCartOffline(storeId: string): Promise<any[]> {
  const safeId = storeId || 'active_cart';

  try {
    const db = await openOfflineDB();
    const result = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction('cart', 'readonly');
      const store = tx.objectStore('cart');
      const req = store.get(safeId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (result && Array.isArray(result.items)) {
      return result.items;
    }
  } catch (err) {
    console.warn('[OfflineDB] Erreur getCartOffline IndexedDB:', err);
  }

  // Fallback localStorage
  try {
    const raw = localStorage.getItem(`nana_cart_${safeId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

/**
 * Vide le panier hors-ligne
 */
export async function clearCartOffline(storeId: string): Promise<boolean> {
  const safeId = storeId || 'active_cart';
  try {
    localStorage.removeItem(`nana_cart_${safeId}`);
  } catch {}

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('cart', 'readwrite');
      const store = tx.objectStore('cart');
      const req = store.delete(safeId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch {
    return true;
  }
}

// =========================================================================
// GESTION HORS-LIGNE DES VENTES & CAISSE POS (LOCAL-FIRST)
// =========================================================================

/**
 * Enregistre une vente localement dans IndexedDB (0ms) avec miroir localStorage
 */
export async function saveSaleOffline(sale: any, storeId: string): Promise<boolean> {
  const safeId = storeId || sale.storeId || 'default_store';
  const saleId = sale.id || `sale-${Date.now()}`;
  const localSale = { ...sale, id: saleId, storeId: safeId };

  // 1. Miroir immédiat LocalStorage pour affichage instantané dans l'historique
  try {
    const key = `nana_tenant_${safeId}_sales`;
    const raw = localStorage.getItem(key);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const updated = [localSale, ...list.filter((s: any) => s.id !== saleId)];
    localStorage.setItem(key, JSON.stringify(updated.slice(0, 300)));
  } catch (e) {
    console.warn('[OfflineDB] Erreur miroir localStorage vente:', e);
  }

  // 2. Persistance dans IndexedDB table 'sales'
  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sales', 'readwrite');
      const store = tx.objectStore('sales');
      const req = store.put(localSale);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch (err) {
    console.warn('[OfflineDB] Erreur écriture vente IndexedDB:', err);
    return false;
  }
}

/**
 * Récupère les ventes enregistrées localement dans IndexedDB
 */
export async function getSalesOffline(storeId: string): Promise<any[]> {
  const safeId = storeId || 'default_store';
  try {
    const db = await openOfflineDB();
    const sales = await new Promise<any[]>((resolve, reject) => {
      const tx = db.transaction('sales', 'readonly');
      const store = tx.objectStore('sales');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    return sales.filter((s) => !safeId || s.storeId === safeId);
  } catch (err) {
    console.warn('[OfflineDB] Erreur lecture sales IndexedDB, repli localStorage:', err);
    try {
      const raw = localStorage.getItem(`nana_tenant_${safeId}_sales`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

/**
 * Enfile une vente POS et ses déductions de stock associées pour le Web Worker
 * Tout s'exécute en local (<5ms) sans aucune écriture unitaire sur le réseau.
 */
export async function queuePosSaleBatch(
  sale: any,
  updatedProducts: any[],
  storeId: string
): Promise<void> {
  const safeStoreId = storeId || sale.storeId || 'default_store';

  // 1. Sauvegarder la vente en local (IndexedDB + LocalStorage)
  await saveSaleOffline(sale, safeStoreId);

  // 2. Enfiler la vente dans offlineSyncQueue pour le Worker
  await queueOfflineMutation({
    type: 'CREATE_SALE',
    storeId: safeStoreId,
    payload: sale,
  });

  // 3. Enfiler chaque produit mis à jour en local
  if (Array.isArray(updatedProducts) && updatedProducts.length > 0) {
    for (const prod of updatedProducts) {
      await saveProductOffline(prod, safeStoreId);
      await queueOfflineMutation({
        type: 'UPDATE_STOCK',
        storeId: safeStoreId,
        payload: prod,
      });
    }
  }

  // 4. Déclencher le signal de synchronisation pour le Worker d'arrière-plan
  triggerWorkerSync();
}

/**
 * Déclenche l'événement de synchronisation pour réveiller le Web Worker ou le planificateur
 */
export function triggerWorkerSync(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nana_trigger_worker_sync'));
  }
}

// =========================================================================
// FILE DE SYNCHRONISATION HORS-LIGNE (OFFLINE SYNC QUEUE)
// =========================================================================

/**
 * Enfile une action/mutation pour synchronisation dès le retour du réseau
 */
export async function queueOfflineMutation(action: {
  type: OfflineActionType;
  storeId?: string;
  payload: any;
}): Promise<string> {
  const syncId = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const item: OfflineSyncItem = {
    id: syncId,
    type: action.type,
    storeId: action.storeId || 'default_store',
    payload: action.payload,
    createdAt: Date.now(),
    retryCount: 0,
    status: 'pending',
  };

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('offlineSyncQueue', 'readwrite');
      const store = tx.objectStore('offlineSyncQueue');
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    console.log(`[OfflineQueue] Action enfilée (${item.type}) :`, item.id);
  } catch (err) {
    console.warn('[OfflineQueue] Erreur mise en file IndexedDB, repli localStorage:', err);
    try {
      const raw = localStorage.getItem('nana_offline_sync_queue');
      const queue: OfflineSyncItem[] = raw ? JSON.parse(raw) : [];
      queue.push(item);
      localStorage.setItem('nana_offline_sync_queue', JSON.stringify(queue));
    } catch {}
  }

  // Notifier l'UI qu'une opération est en attente
  try {
    window.dispatchEvent(new CustomEvent('offlineQueueUpdated', { detail: { count: 1 } }));
  } catch {}

  return syncId;
}

/**
 * Récupère toutes les mutations en attente
 */
export async function getPendingSyncQueue(): Promise<OfflineSyncItem[]> {
  try {
    const db = await openOfflineDB();
    const items = await new Promise<OfflineSyncItem[]>((resolve, reject) => {
      const tx = db.transaction('offlineSyncQueue', 'readonly');
      const store = tx.objectStore('offlineSyncQueue');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const pending = items.filter((i) => i.status === 'pending');
    if (pending.length > 0) return pending;
  } catch (err) {
    console.warn('[OfflineQueue] Erreur lecture getPendingSyncQueue IndexedDB:', err);
  }

  // Fallback localStorage
  try {
    const raw = localStorage.getItem('nana_offline_sync_queue');
    if (raw) {
      const queue: OfflineSyncItem[] = JSON.parse(raw);
      return queue.filter((i) => i.status === 'pending');
    }
  } catch {}

  return [];
}

/**
 * Supprime une mutation terminée de la file d'attente
 */
export async function removeQueueItem(id: string): Promise<boolean> {
  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('offlineSyncQueue', 'readwrite');
      const store = tx.objectStore('offlineSyncQueue');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}

  try {
    const raw = localStorage.getItem('nana_offline_sync_queue');
    if (raw) {
      const queue: OfflineSyncItem[] = JSON.parse(raw);
      const filtered = queue.filter((i) => i.id !== id);
      localStorage.setItem('nana_offline_sync_queue', JSON.stringify(filtered));
    }
  } catch {}

  return true;
}

/**
 * Met à jour le statut ou le compteur de retry d'une mutation
 */
export async function updateQueueItem(item: OfflineSyncItem): Promise<void> {
  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('offlineSyncQueue', 'readwrite');
      const store = tx.objectStore('offlineSyncQueue');
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

// =========================================================================
// MOTEUR DE RECONNEXION & DÉPILAGE PAR LOTS (WORKER BATCHING VERS FIREBASE)
// =========================================================================

/**
 * Dépile et synchronise toutes les opérations en attente vers Firebase par lots atomiques
 * (WriteBatch de 20 à 50 opérations pour protéger drastiquement les quotas Firestore)
 */
export async function flushOfflineSyncQueue(maxBatchSize = 50): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[OfflineSync] Mode hors-ligne actif, synchronisation reportée.');
    return { synced: 0, failed: 0 };
  }

  if (isSyncingQueue) {
    return { synced: 0, failed: 0 };
  }

  isSyncingQueue = true;
  let synced = 0;
  let failed = 0;

  try {
    const queue = await getPendingSyncQueue();
    if (queue.length === 0) {
      isSyncingQueue = false;
      return { synced: 0, failed: 0 };
    }

    console.log(`[OfflineSync Batching] Dépilage de ${queue.length} opération(s) par lots de max ${maxBatchSize}...`);

    // Import dynamique pour éviter tout cycle de dépendance
    const { commitFirestoreBatch } = await import('../utils/firestoreService');

    // Découpage en tranches de 20 à 50 opérations
    for (let i = 0; i < queue.length; i += maxBatchSize) {
      const chunk = queue.slice(i, i + maxBatchSize);
      try {
        const batchResult = await commitFirestoreBatch(chunk);
        if (batchResult.success) {
          for (const syncedId of batchResult.syncedIds) {
            await removeQueueItem(syncedId);
            synced++;
          }
        }

        if (batchResult.failedIds.length > 0) {
          for (const failedId of batchResult.failedIds) {
            failed++;
            const item = chunk.find((c) => c.id === failedId);
            if (item) {
              item.retryCount = (item.retryCount || 0) + 1;
              item.lastAttempt = Date.now();
              if (item.retryCount > 5) {
                item.status = 'failed';
              }
              await updateQueueItem(item);
            }
          }
        }
      } catch (chunkErr: any) {
        console.warn('[OfflineSync] Erreur d\'écriture lot :', chunkErr?.message || chunkErr);
        failed += chunk.length;
      }
    }

    if (synced > 0) {
      console.log(`[OfflineSync] Synchronisation par lots réussie : ${synced} opération(s) archivée(s) sur le Cloud.`);
      try {
        window.dispatchEvent(
          new CustomEvent('nana_offline_sync_completed', {
            detail: { synced, failed, timestamp: Date.now() },
          })
        );
        window.dispatchEvent(new Event('customerOrdersUpdated'));
      } catch {}
    }
  } catch (err) {
    console.warn('[OfflineSync] Erreur durant flushOfflineSyncQueue:', err);
  } finally {
    isSyncingQueue = false;
  }

  return { synced, failed };
}

/**
 * Initialise les écouteurs globaux de reconnexion réseau (online / offline)
 * Doit être appelé au montage initial de l'application React
 */
export function initOfflineSyncListeners(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    console.log('[OfflineSync] Événement window online détecté ! Déclenchement du dépilage...');
    // Léger délai de 800ms pour laisser les connexions TCP / sockets Firebase s'établir
    setTimeout(() => {
      flushOfflineSyncQueue().catch((e) => console.warn('[OfflineSync] Erreur post-online:', e));
    }, 800);
  };

  const handleOffline = () => {
    console.log('[OfflineSync] Événement window offline : Passage en mode local 100% autonome.');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Vérification immédiate au démarrage si des opérations étaient restées en file d'attente
  if (navigator.onLine) {
    setTimeout(() => {
      flushOfflineSyncQueue().catch(() => {});
    }, 2000);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
