/**
 * NANASORE - GESTIONNAIRE DE STOCKAGE & PURGE AUTOMATIQUE DU CACHE
 * 
 * Assure la longévité de l'application sur smartphone en :
 * 1. Purgeant automatiquement les brouillons, caches et états temporaires obsolètes (> 48h)
 * 2. Prémunissant le système contre les crashes QuotaExceededError (quota 5 Mo sur mobile)
 * 3. Assurant une dégradation gracieuse en cas de saturation du stockage local
 */

const MAX_DRAFT_AGE_MS = 48 * 3600 * 1000; // 48 heures
const STORAGE_EMERGENCY_THRESHOLD_BYTES = 4.2 * 1024 * 1024; // ~4.2 Mo (sur ~5 Mo alloués par défaut)

export interface StorageEstimateResult {
  usage: number; // en octets
  quota: number; // en octets
  percentUsed: number;
}

/**
 * Calcule l'espace approximatif consommé par le localStorage en octets
 */
export function getLocalStorageSize(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  let totalBytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key) || '';
      // En UTF-16 (JavaScript), chaque caractère compte environ pour 2 octets
      totalBytes += (key.length + value.length) * 2;
    }
  } catch (err) {
    console.warn('[STORAGE] Erreur calcul taille localStorage :', err);
  }
  return totalBytes;
}

/**
 * Estime le quota de stockage du navigateur (IndexedDB + Cache Storage + LocalStorage)
 */
export async function getStorageUsageEstimate(): Promise<StorageEstimateResult> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || getLocalStorageSize();
      const quota = estimate.quota || 50 * 1024 * 1024; // Défaut 50 Mo
      return {
        usage,
        quota,
        percentUsed: quota > 0 ? (usage / quota) * 100 : 0
      };
    } catch (e) {}
  }

  // Fallback sur estimation pure localStorage
  const localSize = getLocalStorageSize();
  const quota = 5 * 1024 * 1024; // 5 Mo standard navigateur
  return {
    usage: localSize,
    quota,
    percentUsed: (localSize / quota) * 100
  };
}

/**
 * Purge d'urgence des caches non critiques (historique de recherche, listes dupliquées, etc.)
 */
export function purgeNonCriticalCaches(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  let purgedCount = 0;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Caches non essentiels de requêtes ou de prévisualisations
      if (
        key.startsWith('nana_cache_search_') ||
        key.startsWith('nana_export_tmp_') ||
        key.startsWith('nana_temp_') ||
        key.startsWith('nana_preview_') ||
        key.startsWith('nana_tenant_guest_') ||
        key.startsWith('nana_tenant_temp_')
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
        purgedCount++;
      } catch (e) {}
    });

    if (purgedCount > 0) {
      console.log(`[STORAGE PURGER] ${purgedCount} clé(s) de cache non critique(s) purgée(s).`);
    }
  } catch (err) {
    console.warn('[STORAGE PURGER] Erreur pendant la purge d’urgence :', err);
  }

  return purgedCount;
}

/**
 * Système de Garbage Collection automatique complet
 * Exécuté au démarrage de l'application et de façon différée
 */
export function runAutomatedStorageGC(): { purgedKeys: number; freedEstimateBytes: number } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { purgedKeys: 0, freedEstimateBytes: 0 };
  }

  const initialBytes = getLocalStorageSize();
  const keysToRemove: string[] = [];
  const now = Date.now();

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 1. Clés temporaires orphelines
      if (
        key.startsWith('nana_temp_') ||
        key.startsWith('nana_export_tmp_') ||
        key.startsWith('nana_tenant_guest_') ||
        key.startsWith('nana_tenant_temp_')
      ) {
        keysToRemove.push(key);
        continue;
      }

      // 2. Brouillons de souscription ou paniers expirés (> 48h)
      if (key.startsWith('nana_pending_sub_') || key.startsWith('nana_pending_cart_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const timestamp = parsed.createdAt || parsed.timestamp || parsed.date;
            if (timestamp && now - new Date(timestamp).getTime() > MAX_DRAFT_AGE_MS) {
              keysToRemove.push(key);
              continue;
            }
          }
        } catch (parseErr) {
          // Si le JSON est corrompu, on l'élague
          keysToRemove.push(key);
          continue;
        }
      }

      // 3. Anciens tokens et sessions de test expirées
      if (key.startsWith('nana_test_token_') || key.startsWith('nana_demo_session_')) {
        keysToRemove.push(key);
        continue;
      }
    }

    // Exécution de l'élagage
    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });

    // 4. Si la taille dépasse toujours le seuil de sécurité, purge d'urgence additionnelle
    const afterBytes = getLocalStorageSize();
    if (afterBytes > STORAGE_EMERGENCY_THRESHOLD_BYTES) {
      console.warn('[STORAGE GC] Espace critique dépassé, déclenchement de la purge d’urgence...');
      purgeNonCriticalCaches();
    }

    const finalBytes = getLocalStorageSize();
    const freed = Math.max(0, initialBytes - finalBytes);

    if (keysToRemove.length > 0) {
      console.log(`[STORAGE GC] Nettoyage terminé : ${keysToRemove.length} clé(s) purgée(s), ~${Math.round(freed / 1024)} Ko libérés.`);
    }

    return { purgedKeys: keysToRemove.length, freedEstimateBytes: freed };
  } catch (err) {
    console.warn('[STORAGE GC] Exception lors du garbage collector :', err);
    return { purgedKeys: 0, freedEstimateBytes: 0 };
  }
}

/**
 * Écriture sécurisée dans le localStorage avec protection contre QuotaExceededError
 * Si le stockage est saturé, une purge automatique est déclenchée avant réessai.
 */
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014;

    if (isQuotaError) {
      console.warn(`[STORAGE SAFETY] QuotaExceededError détecté lors de l'enregistrement de "${key}". Déclenchement de la purge de secours...`);
      // 1. Purge immédiate des caches superflus
      purgeNonCriticalCaches();
      runAutomatedStorageGC();

      // 2. Deuxième tentative
      try {
        localStorage.setItem(key, value);
        console.log(`[STORAGE SAFETY] Enregistrement réussi après purge de secours pour "${key}".`);
        return true;
      } catch (retryErr) {
        console.error(`[STORAGE SAFETY] Échec persistant pour "${key}" même après purge.`, retryErr);
        return false;
      }
    }

    console.error(`[STORAGE SAFETY] Erreur inconnue lors de l'écriture de "${key}" :`, err);
    return false;
  }
}

/**
 * Lecture sécurisée
 */
export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[STORAGE SAFETY] Erreur lecture "${key}" :`, err);
    return null;
  }
}

/**
 * Suppression sécurisée
 */
export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[STORAGE SAFETY] Erreur suppression "${key}" :`, err);
  }
}
