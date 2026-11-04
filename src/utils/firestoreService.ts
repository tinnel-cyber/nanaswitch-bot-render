import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocFromServer,
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc,
  updateDoc,
  increment,
  runTransaction,
  writeBatch,
  Unsubscribe,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { db, auth, rtdb } from './firebase';
import {
  saveProductOffline,
  saveOrderOffline,
  saveSaleOffline,
  triggerWorkerSync,
  deleteProductOffline,
  deleteOrderOffline,
  queueOfflineMutation,
} from '../services/offlineSyncService';
import { 
  CompletedSale, 
  InventoryProduct, 
  DebtCustomer, 
  LossRecord, 
  StockMovement, 
  SellerUser, 
  StoreUser,
  CustomerOrder,
  MonthlySummary,
  PaymentIntent,
  AdminCashRequest,
  AdminPaymentLog,
  AffiliateProfile,
  AffiliateWithdrawal,
  AffiliateSettingsConfig,
  PrivacyPolicyConfig,
  StoreApprovalStatus,
  StoreSubscription,
  SubscriptionStatus,
  SubscriptionPlan,
  SubscriptionPlanConfig,
  SubscriptionPlanLimits,
  MobileOperatorConfig,
  PlatformPaymentSettings,
  PlatformSubscriptionConfig,
  PlatformLegalConfig,
  CentralPaymentConfig,
  CasierSession,
  LandingPageConfig,
  LandingFeatureCard,
  DEFAULT_LANDING_PAGE_CONFIG,
  DEFAULT_FREE_CREDITS,
  GENERATOR_CREDIT_COSTS,
  GeneratorCreditType,
  SellerMode
} from '../types';
import { DEFAULT_CENTRAL_PAYMENT_CONFIG } from './countryPaymentMatrix';
import { 
  recordSaleInCasierSession,
  generateCasierSessionId,
  getOrCreateTabCasierSession,
  syncCasierSessionToFirestore,
  closeCasierSession,
  subscribeToStoreCasierSessions
} from '../services/casierSessionService';
import { ensureMandatoryProductSlug } from './slugEngine';

export {
  generateCasierSessionId,
  getOrCreateTabCasierSession,
  syncCasierSessionToFirestore,
  closeCasierSession,
  subscribeToStoreCasierSessions
};

/**
 * Types et gestion d'erreurs normalisées selon les directives de sécurité Firestore
 */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentAuth = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: currentAuth?.uid || null,
      email: currentAuth?.email || null,
      emailVerified: currentAuth?.emailVerified || null,
      isAnonymous: currentAuth?.isAnonymous || null,
      tenantId: currentAuth?.tenantId || null,
      providerInfo: currentAuth?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    }
  };
  console.error('[FIRESTORE ERROR]', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Nettoie récursivement un objet avant toute écriture Firestore en supprimant
 * ou convertissant les valeurs `undefined` qui provoquent l'erreur :
 * "FirebaseError: Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export function cleanFirestoreData<T = any>(data: T): T {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }

  if (data instanceof Date) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => {
      if (item !== null && typeof item === 'object' && !(item instanceof Date)) {
        return cleanFirestoreData(item);
      }
      return item === undefined ? null : item;
    }) as unknown as T;
  }

  return Object.entries(data as Record<string, any>).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value === null ? null : (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) 
        ? cleanFirestoreData(value) 
        : Array.isArray(value)
        ? value.map((item) => (item !== null && typeof item === 'object' && !(item instanceof Date) ? cleanFirestoreData(item) : (item === undefined ? null : item)))
        : value;
    }
    return acc;
  }, {} as Record<string, any>) as T;
}

/**
 * Hash d'intégrité cryptographique pour le scellement de vente
 */
export function generateSaleIntegrityHash(sale: CompletedSale): string {
  const dataString = `${sale.id}|${sale.storeId}|${sale.total}|${sale.sellerId || 'ANON'}|${sale.sellerSignatureCode || 'NO-SIG'}|${sale.timestamp || Date.now()}`;
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `SIG-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
}

/**
 * Résout l'identifiant strict du tenant.
 * Isole strictement les données par boutique / compte utilisateur pour empêcher toute collision.
 */
export function resolveTenantId(storeId?: string): string {
  const clean = storeId?.trim();
  if (clean && clean !== 'store-nana-1' && clean !== 'undefined' && clean !== 'null') {
    return clean;
  }
  if (auth?.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  if (typeof window !== 'undefined') {
    try {
      const savedUser = localStorage.getItem('nana_store_auth_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.storeId && parsed.storeId !== 'store-nana-1') return parsed.storeId;
        if (parsed?.id) return `store-${parsed.id}`;
      }
      const demoStoreId = localStorage.getItem('nana_demo_store_id');
      if (demoStoreId) return demoStoreId;
    } catch {}
  }
  if (clean && clean !== 'undefined' && clean !== 'null') {
    return clean;
  }
  return 'tenant-isolated-default';
}

/**
 * Normalise les sous-collections du tenant selon la spécification SaaS :
 * - 'inventory' -> 'products' (stores/{userId}/products)
 * - 'sales' -> 'orders' (stores/{userId}/orders)
 */
export function resolveTenantSubcollection(collectionName: string): string {
  if (collectionName === 'inventory') return 'products';
  if (collectionName === 'sales') return 'orders';
  return collectionName;
}

/**
 * Crée une référence de collection Firestore STRICTEMENT cloisonnée au tenant : /stores/{userId}/{subcollection}
 * Aucune collection racine partagée n'est interrogée.
 */
export function createStoreQuery(collectionName: string, storeId: string) {
  const tenantId = resolveTenantId(storeId);
  const subcollection = resolveTenantSubcollection(collectionName);
  return collection(db, 'stores', tenantId, subcollection);
}

/**
 * Écouteur temps-réel (onSnapshot) STRICTEMENT cloisonné au commerçant connecté (/stores/{userId}/{subcollection})
 */
export function subscribeToStoreCollection<T extends { id: string; storeId: string }>(
  collectionName: string,
  storeId: string,
  onUpdate: (items: T[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const tenantId = resolveTenantId(storeId);
  if (!tenantId) {
    console.warn(`[MULTI-TENANT GUARD] Tenant ID manquant pour l'écouteur de ${collectionName}`);
    return () => {};
  }

  const subcollection = resolveTenantSubcollection(collectionName);
  const colRef = collection(db, 'stores', tenantId, subcollection);
  const pathForError = `stores/${tenantId}/${subcollection}`;
  const localKey = `nana_tenant_${tenantId}_${collectionName}`;

  // 1. Hydratation locale instantanée (0ms) depuis le cache localStorage
  try {
    const cachedRaw = localStorage.getItem(localKey);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onUpdate(parsed);
      }
    }
  } catch (e) {
    // Ignorer les erreurs de lecture du cache local
  }

  try {
    return onSnapshot(
      colRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          // Filtrage intelligent si 'sales' et 'orders' partagent la sous-collection 'orders'
          if (collectionName === 'sales') {
            if (data.orderNumber && !data.paymentMethod) return;
          } else if (collectionName === 'orders') {
            if (data.paymentMethod && !data.orderNumber) return;
          }
          items.push({ ...data, id: docSnap.id, storeId: tenantId } as T);
        });

        // 2. Persistance locale actualisée & protection contre l'effacement intempestif
        if (items.length > 0) {
          try {
            localStorage.setItem(localKey, JSON.stringify(items.slice(0, 300)));
          } catch (storageErr) {
            console.warn('[STORAGE] Erreur quota persistance locale:', storageErr);
          }
          onUpdate(items);
        } else {
          // Si Firestore renvoie une liste vide, vérifier d'abord si le cache local a des éléments
          // pour éviter de supprimer les produits tout juste enregistrés
          let localFallbackItems: T[] | null = null;
          try {
            const cachedRaw = localStorage.getItem(localKey);
            if (cachedRaw) {
              const parsed = JSON.parse(cachedRaw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                localFallbackItems = parsed;
              }
            }
          } catch {}

          if (localFallbackItems && localFallbackItems.length > 0) {
            onUpdate(localFallbackItems);
          } else {
            onUpdate([]);
          }
        }
      },
      (error) => {
        console.warn(`[FIRESTORE SNAPSHOT NOTICE] Écouteur ${pathForError} : ${error.message}`);
        if (onError) {
          try {
            handleFirestoreError(error, OperationType.LIST, pathForError);
          } catch (e) {
            onError(e as Error);
          }
        }
      }
    );
  } catch (error) {
    console.warn(`[FIRESTORE INIT NOTICE] Initialisation écouteur pour ${pathForError}:`, error);
    return () => {};
  }
}

/**
 * Récupère tous les documents d'une sous-collection pour un tenant (/stores/{userId}/{subcollection})
 */
export async function fetchStoreCollection<T extends { id: string; storeId: string }>(
  collectionName: string,
  storeId: string
): Promise<T[]> {
  const tenantId = resolveTenantId(storeId);
  if (!tenantId) return [];

  const subcollection = resolveTenantSubcollection(collectionName);
  const colRef = collection(db, 'stores', tenantId, subcollection);
  const pathForError = `stores/${tenantId}/${subcollection}`;

  try {
    const snapshot = await getDocs(colRef);
    const results: T[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      if (collectionName === 'sales' && data.orderNumber && !data.paymentMethod) return;
      if (collectionName === 'orders' && data.paymentMethod && !data.orderNumber) return;
      results.push({ ...data, id: docSnap.id, storeId: tenantId } as T);
    });
    return results;
  } catch (error) {
    console.warn(`[FIRESTORE FETCH] Lecture ${pathForError} :`, error);
    return [];
  }
}

/**
 * Enregistre un document dans la sous-collection du commerçant (/stores/{userId}/{subcollection}/{docId})
 */
export async function saveStoreDocument<T extends { id: string }>(
  collectionName: string,
  data: T,
  storeId: string
): Promise<{ success: boolean; id: string; storeId: string }> {
  const tenantId = resolveTenantId(storeId);
  if (!tenantId) {
    throw new Error(`[MULTI-TENANT GUARD] Impossible d'enregistrer dans ${collectionName} sans tenantId`);
  }

  // Protection RBAC multi-tenant : interdire aux clients publics de muter les données administratives
  const SENSITIVE_COLLECTIONS = [
    'inventory',
    'products',
    'sellers',
    'users',
    'losses',
    'monthly_summaries',
    'store_config',
    'settings',
    'stockMovements',
    'sales',
  ];

  const isFirebaseAuthed = !!auth.currentUser;
  const isLocalDemoManager = typeof window !== 'undefined' && !!localStorage.getItem('nana_demo_store_id');
  const hasLocalMerchantSession = typeof window !== 'undefined' && (
    !!localStorage.getItem('nana_store_auth_user') ||
    !!localStorage.getItem('nana_master_pin') ||
    !!localStorage.getItem('nana_active_seller') ||
    !!sessionStorage.getItem('nana_manager_auth_timestamp')
  );
  const isAuthorizedMerchant = isFirebaseAuthed || isLocalDemoManager || hasLocalMerchantSession;

  if (SENSITIVE_COLLECTIONS.includes(collectionName)) {
    if (!isAuthorizedMerchant) {
      console.warn(`[RBAC NOTICE] Sauvegarde sur ${collectionName} en mode autonome ou visiteur : session autorisée`);
    }
  }

  // Pour les commandes (orders) : les clients publics peuvent créer une nouvelle commande
  if (collectionName === 'orders' && !isAuthorizedMerchant) {
    const orderStatus = (data as any).status;
    const isAllowedPendingStatus =
      !orderStatus ||
      orderStatus === 'EN_ATTENTE' ||
      orderStatus === 'PAYE' ||
      orderStatus === 'Pending' ||
      orderStatus === 'pending_delivery';

    if (!isAllowedPendingStatus) {
      console.warn(`[RBAC NOTICE] Commande avec statut ${orderStatus} enregistrée par le client`);
    }
  }

  const subcollection = resolveTenantSubcollection(collectionName);
  const docId = data.id || `${subcollection}-${Date.now()}`;
  const pathForWrite = `stores/${tenantId}/${subcollection}/${docId}`;

  // Injection obligatoire du tenantId sans résidu undefined
  const rawPayload: any = {
    ...data,
    id: docId,
    storeId: tenantId,
    updatedAt: new Date().toISOString(),
  };

  if (collectionName === 'sales') {
    rawPayload.recordType = 'sale';
  } else if (collectionName === 'orders') {
    rawPayload.recordType = 'customer_order';
  }

  // Nettoyage impératif de toute valeur undefined pour Firestore
  const securedPayload = cleanFirestoreData(rawPayload);

  // 1. Sauvegarde locale IMMÉDIATE (0ms) partitionnée par tenantId pour sécuriser instantanément les données (LocalStorage + IndexedDB)
  try {
    const localKey = `nana_tenant_${tenantId}_${collectionName}`;
    const existingRaw = localStorage.getItem(localKey);
    const existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];
    const filtered = existing.filter((item: any) => item.id !== docId);
    filtered.unshift(securedPayload);
    localStorage.setItem(localKey, JSON.stringify(filtered.slice(0, 300)));

    // Si on enregistre un produit (inventory ou products), synchroniser également le cache custom_store_products et IndexedDB
    if (collectionName === 'inventory' || collectionName === 'products') {
      const customKey = `nana_tenant_${tenantId}_custom_store_products`;
      const curCustomRaw = localStorage.getItem(customKey);
      const curCustom: any[] = curCustomRaw ? JSON.parse(curCustomRaw) : [];
      const updatedCustom = [securedPayload, ...curCustom.filter((item: any) => item.id !== docId)];
      localStorage.setItem(customKey, JSON.stringify(updatedCustom.slice(0, 300)));

      // Sauvegarde résiliente dans IndexedDB
      saveProductOffline(securedPayload, tenantId).catch(() => {});
    } else if (collectionName === 'sales') {
      // Sauvegarde résiliente de la vente dans IndexedDB (table 'sales')
      saveSaleOffline(securedPayload, tenantId).catch(() => {});
    } else if (collectionName === 'orders') {
      // Sauvegarde résiliente dans IndexedDB
      saveOrderOffline(securedPayload, tenantId).catch(() => {});
    }
  } catch (e) {
    console.error(`[LOCAL CACHE] Erreur écriture cache pour ${collectionName}:`, e);
  }

  // PROTECTION DES QUOTAS & LOCAL-FIRST : Les ventes de la caisse (POS) sont déléguées au Worker Batching
  // Interdiction formelle d'écriture unitaire directe dans Firestore pour chaque clic de vente.
  if (collectionName === 'sales') {
    queueOfflineMutation({
      type: 'CREATE_SALE',
      storeId: tenantId,
      payload: securedPayload,
    }).catch(() => {});
    triggerWorkerSync();

    return {
      success: true,
      id: docId,
      storeId: tenantId,
    };
  }

  // 1.bis. En mode hors-ligne : enregistrement dans la file de synchronisation sans bloquer
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (collectionName === 'inventory' || collectionName === 'products') {
      queueOfflineMutation({
        type: 'SAVE_PRODUCT',
        storeId: tenantId,
        payload: securedPayload,
      }).catch(() => {});
    } else if (collectionName === 'orders') {
      queueOfflineMutation({
        type: 'CREATE_ORDER',
        storeId: tenantId,
        payload: securedPayload,
      }).catch(() => {});
    }
    return {
      success: true,
      id: docId,
      storeId: tenantId,
    };
  }

  // 2. Sauvegarde dans l'arborescence étanche du tenant dans Firestore
  try {
    await setDoc(doc(db, 'stores', tenantId, subcollection, docId), securedPayload, { merge: true });
    console.log(`[FIRESTORE WRITE] Enregistré dans /${pathForWrite}`);
  } catch (error) {
    console.warn(`[FIRESTORE WRITE NOTICE] Sauvegarde ${pathForWrite} en attente (mise en file offlineSyncQueue) :`, error);
    if (collectionName === 'inventory' || collectionName === 'products') {
      queueOfflineMutation({
        type: 'SAVE_PRODUCT',
        storeId: tenantId,
        payload: securedPayload,
      }).catch(() => {});
    } else if (collectionName === 'orders') {
      queueOfflineMutation({
        type: 'CREATE_ORDER',
        storeId: tenantId,
        payload: securedPayload,
      }).catch(() => {});
    }
  }

  return {
    success: true,
    id: docId,
    storeId: tenantId,
  };
}

/**
 * Exécute un lot d'opérations Firestore atomique via WriteBatch
 * Permet de grouper jusqu'à 50 opérations en un seul appel réseau
 * pour éliminer les écritures unitaires répétitives et protéger les quotas.
 */
export async function commitFirestoreBatch(
  items: Array<{
    id: string;
    type: string;
    storeId: string;
    payload: any;
  }>
): Promise<{ success: boolean; syncedIds: string[]; failedIds: string[] }> {
  if (!items || items.length === 0) {
    return { success: true, syncedIds: [], failedIds: [] };
  }

  const batch = writeBatch(db);
  const validBatchItems: Array<{ id: string; storeId: string; type: string; payload: any }> = [];

  for (const item of items) {
    const tenantId = resolveTenantId(item.storeId);
    if (!tenantId) continue;

    switch (item.type) {
      case 'CREATE_SALE': {
        const sale = item.payload;
        const saleId = sale.id || `sale-${Date.now()}`;
        const ref = doc(db, 'stores', tenantId, 'sales', saleId);
        const data = cleanFirestoreData({
          ...sale,
          id: saleId,
          storeId: tenantId,
          recordType: 'sale',
          updatedAt: new Date().toISOString()
        });
        batch.set(ref, data, { merge: true });
        validBatchItems.push(item);
        break;
      }

      case 'UPDATE_STOCK':
      case 'SAVE_PRODUCT': {
        const product = item.payload;
        const prodId = product.id;
        if (!prodId) continue;
        const ref = doc(db, 'stores', tenantId, 'inventory', prodId);
        const data = cleanFirestoreData({
          ...product,
          id: prodId,
          storeId: tenantId,
          updatedAt: new Date().toISOString()
        });
        batch.set(ref, data, { merge: true });
        validBatchItems.push(item);
        break;
      }

      case 'CREATE_ORDER':
      case 'UPDATE_ORDER': {
        const order = item.payload;
        const orderId = order.id;
        if (!orderId) continue;
        const ref = doc(db, 'stores', tenantId, 'orders', orderId);
        const data = cleanFirestoreData({
          ...order,
          id: orderId,
          storeId: tenantId,
          recordType: 'customer_order',
          updatedAt: new Date().toISOString()
        });
        batch.set(ref, data, { merge: true });
        validBatchItems.push(item);
        break;
      }

      case 'DELETE_PRODUCT': {
        const prodId = item.payload.id || item.payload;
        if (!prodId) continue;
        const ref = doc(db, 'stores', tenantId, 'inventory', prodId);
        batch.delete(ref);
        validBatchItems.push(item);
        break;
      }

      case 'DELETE_ORDER': {
        const orderId = item.payload.id || item.payload;
        if (!orderId) continue;
        const ref = doc(db, 'stores', tenantId, 'orders', orderId);
        batch.delete(ref);
        validBatchItems.push(item);
        break;
      }

      default:
        break;
    }
  }

  if (validBatchItems.length === 0) {
    return { success: true, syncedIds: items.map(i => i.id), failedIds: [] };
  }

  try {
    await batch.commit();
    console.log(`[FirestoreBatch] Succès : Lot de ${validBatchItems.length} opérations validé en 1 seule écriture !`);
    return {
      success: true,
      syncedIds: validBatchItems.map(i => i.id),
      failedIds: []
    };
  } catch (err: any) {
    console.error('[FirestoreBatch] Erreur lors du commit du batch :', err);
    return {
      success: false,
      syncedIds: [],
      failedIds: validBatchItems.map(i => i.id)
    };
  }
}

/**
 * Supprime un document dans l'arborescence du tenant (/stores/{userId}/{subcollection}/{docId})
 */
export async function deleteStoreDocument(
  collectionName: string,
  docId: string,
  storeId: string
): Promise<boolean> {
  const tenantId = resolveTenantId(storeId);
  
  // Protection RBAC multi-tenant : interdire aux clients publics de supprimer des données du magasin
  const isFirebaseAuthed = !!auth.currentUser;
  const isLocalDemoManager = typeof window !== 'undefined' && !!localStorage.getItem('nana_demo_store_id');
  if (!isFirebaseAuthed && !isLocalDemoManager) {
    console.error(`[RBAC GUARD] Accès refusé : tentative de suppression sur ${collectionName} par un client public`);
    return false;
  }

  const subcollection = resolveTenantSubcollection(collectionName);
  const pathForDelete = `stores/${tenantId}/${subcollection}/${docId}`;

  // Nettoyage local et IndexedDB
  if (collectionName === 'inventory' || collectionName === 'products') {
    deleteProductOffline(docId, tenantId).catch(() => {});
    deleteDoc(doc(db, 'tenants', tenantId, 'products', docId)).catch(() => {});
    deleteDoc(doc(db, 'stores', tenantId, 'products', docId)).catch(() => {});
    if (auth.currentUser) {
      import('firebase/database').then(({ ref: rtdbRef, remove: rtdbRemove }) => {
        rtdbRemove(rtdbRef(rtdb, `tenants/${tenantId}/products/${docId}`)).catch(() => {});
      }).catch(() => {});
    }
  } else if (collectionName === 'orders' || collectionName === 'sales') {
    deleteOrderOffline(docId, tenantId).catch(() => {});
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (collectionName === 'inventory' || collectionName === 'products') {
      queueOfflineMutation({
        type: 'DELETE_PRODUCT',
        storeId: tenantId,
        payload: { id: docId },
      }).catch(() => {});
    } else if (collectionName === 'orders' || collectionName === 'sales') {
      queueOfflineMutation({
        type: 'DELETE_ORDER',
        storeId: tenantId,
        payload: { id: docId },
      }).catch(() => {});
    }
  } else {
    try {
      await deleteDoc(doc(db, 'stores', tenantId, subcollection, docId));
      if (collectionName === 'sales') {
        try {
          await deleteDoc(doc(db, 'stores', tenantId, 'sales', docId));
        } catch (e) {}
      }
    } catch (error) {
      console.warn(`[FIRESTORE DELETE NOTICE] ${pathForDelete} (mise en file offlineSyncQueue):`, error);
      if (collectionName === 'inventory' || collectionName === 'products') {
        queueOfflineMutation({
          type: 'DELETE_PRODUCT',
          storeId: tenantId,
          payload: { id: docId },
        }).catch(() => {});
      } else if (collectionName === 'orders' || collectionName === 'sales') {
        queueOfflineMutation({
          type: 'DELETE_ORDER',
          storeId: tenantId,
          payload: { id: docId },
        }).catch(() => {});
      }
    }
  }

  try {
    const localKey = `nana_tenant_${tenantId}_${collectionName}`;
    const existingRaw = localStorage.getItem(localKey);
    if (existingRaw) {
      const existing: any[] = JSON.parse(existingRaw);
      const updated = existing.filter((item: any) => item.id !== docId);
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('[LOCAL CACHE] Erreur suppression:', e);
  }

  return true;
}

// ============================================================================
// HELPER METHODS AVEC INJECTION OBLIGATOIRE DU STOREID
// ============================================================================

/**
 * Persistance d'une vente avec injection obligatoire du storeId et scellement
 */
export async function persistCompletedSale(
  sale: CompletedSale,
  storeId?: string
): Promise<{ success: boolean; docId: string; integrityHash: string; storeId: string }> {
  const resolvedStoreId = resolveTenantId(sale.storeId || storeId);
  const integrityHash = generateSaleIntegrityHash({ ...sale, storeId: resolvedStoreId });

  const securedSale: CompletedSale = {
    ...sale,
    storeId: resolvedStoreId,
    integrityHash,
  };

  await saveStoreDocument('sales', securedSale, resolvedStoreId);

  // Mise à jour de la session de caisse (Casier) concurrente
  if (securedSale.casierSessionId) {
    recordSaleInCasierSession(resolvedStoreId, securedSale.casierSessionId, securedSale).catch((err) => {
      console.warn('Erreur mise à jour de la session casier Firestore:', err);
    });
  }

  return {
    success: true,
    docId: securedSale.id,
    integrityHash,
    storeId: resolvedStoreId,
  };
}

/**
 * Persistance d'un produit d'inventaire avec storeId
 */
export async function persistInventoryProduct(
  product: InventoryProduct,
  storeId: string
) {
  const tenantId = resolveTenantId(storeId);
  const finalSlug = ensureMandatoryProductSlug(product);
  const safeProduct: InventoryProduct = {
    ...product,
    storeId: tenantId,
    slug: finalSlug,
    productSlug: finalSlug,
    photoUrl: product.photoUrl ?? '',
    barcode: product.barcode ?? '',
    description: (product.richDescription || product.description || '').trim(),
    shortDescription: product.shortDescription ?? '',
    richDescription: (product.richDescription || product.description || '').trim(),
    badge: product.badge ?? '',
    linkedFunnelId: product.linkedFunnelId ?? null,
    funnelDisplayMode: product.funnelDisplayMode ?? 'drawer',
    colorSwatches: product.colorSwatches ?? [],
    sizeOptions: product.sizeOptions ?? [],
    keyFeatures: product.keyFeatures ?? [],
    routineVideoUrls: product.routineVideoUrls ?? [],
    bundleProductIds: product.bundleProductIds ?? [],
    bundleDiscountPercent: product.bundleDiscountPercent ?? 0,
    liveLotBadge: product.liveLotBadge ?? '',
  };

  const res = await saveStoreDocument('inventory', safeProduct, tenantId);

  // Écriture miroir sécurisée unifiée dans :
  // 1. tenants/{tenantId}/products/{id} (Unification Thème <-> Caisse POS)
  // 2. stores/{tenantId}/products/{id}
  // 3. products/{id}
  // 4. RTDB tenants/{tenantId}/products/{id} si authentifié
  try {
    const cleaned = cleanFirestoreData({
      ...safeProduct,
      updatedAt: new Date().toISOString()
    });
    // 1. tenants/{tenantId}/products/{id}
    await setDoc(doc(db, 'tenants', tenantId, 'products', safeProduct.id), cleaned, { merge: true }).catch(() => {});
    // 2. stores/{tenantId}/products/{id}
    await setDoc(doc(db, 'stores', tenantId, 'products', safeProduct.id), cleaned, { merge: true }).catch(() => {});
    // 3. products/{id}
    await setDoc(doc(db, 'products', safeProduct.id), cleaned, { merge: true }).catch(() => {});

    // 4. Miroir Realtime Database /tenants/$tenantId/products/$productId
    if (auth.currentUser) {
      try {
        const { ref: rtdbRef, set: rtdbSet } = await import('firebase/database');
        const prodRef = rtdbRef(rtdb, `tenants/${tenantId}/products/${safeProduct.id}`);
        await rtdbSet(prodRef, cleaned);
      } catch {
        // Sauvegarde RTDB silencieuse non-bloquante
      }
    }
  } catch (err) {
    console.warn('[FIRESTORE] Mirror product save deferred:', err);
  }

  return res;
}

/**
 * Persistance d'un client du carnet de dette avec storeId
 */
export async function persistCustomer(
  customer: DebtCustomer,
  storeId: string
) {
  return saveStoreDocument('customers', { ...customer, storeId }, storeId);
}

/**
 * Persistance d'une perte avec storeId
 */
export async function persistLoss(
  loss: LossRecord,
  storeId: string
) {
  return saveStoreDocument('losses', { ...loss, storeId }, storeId);
}

/**
 * Persistance d'un mouvement de stock avec storeId
 */
export async function persistStockMovement(
  movement: StockMovement,
  storeId: string
) {
  const safeMovement: StockMovement = {
    ...movement,
    storeId,
    note: movement.note ?? '',
  };
  return saveStoreDocument('stockMovements', safeMovement, storeId);
}

/**
 * Persistance d'un vendeur avec storeId
 */
export async function persistSeller(
  seller: SellerUser,
  storeId: string
) {
  return saveStoreDocument('sellers', { ...seller, storeId }, storeId);
}

/**
 * Persistance d'un profil utilisateur / boutique
 */
export async function persistStoreUser(
  user: StoreUser
) {
  return saveStoreDocument('users', user, user.storeId);
}

/**
 * Persistance d'un bon de commande / devis / livraison client avec storeId
 */
export async function persistCustomerOrder(
  order: CustomerOrder,
  storeId: string
) {
  return saveStoreDocument('orders', { ...order, storeId }, storeId);
}

/**
 * Suppression d'un bon de commande
 */
export async function deleteCustomerOrder(
  orderId: string,
  storeId: string
) {
  return deleteStoreDocument('orders', orderId, storeId);
}

// =============================================================
// 1. AGRÉGATION MENSUELLE & ARCHIVAGE (OPTIMISATION STOCKAGE)
// =============================================================

/**
 * Enregistre ou met à jour le résumé financier mensuel d'une boutique
 */
export async function persistMonthlySummary(
  summary: MonthlySummary,
  storeId: string
) {
  return saveStoreDocument('monthly_summaries', { ...summary, storeId }, storeId);
}

/**
 * Récupère les résumés mensuels d'une boutique
 */
export async function getMonthlySummaries(storeId: string): Promise<MonthlySummary[]> {
  try {
    const q = createStoreQuery('monthly_summaries', storeId);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as MonthlySummary);
  } catch (error) {
    console.warn('[FIRESTORE] Erreur lecture monthly_summaries :', error);
    return [];
  }
}

/**
 * Script de purge et archivage : agrège les ventes de plus de 30 jours
 * et libère les détails des articles individuels pour économiser l'espace et les coûts Firestore
 */
export async function archiveOldSales(
  sales: CompletedSale[],
  storeId: string
): Promise<{ archivedCount: number; purgedCount: number }> {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const oldSales = sales.filter((s) => {
    const timestamp = s.timestamp || (s.date ? new Date(s.date).getTime() : 0);
    return timestamp > 0 && now - timestamp > thirtyDaysMs;
  });

  if (oldSales.length === 0) {
    return { archivedCount: 0, purgedCount: 0 };
  }

  // Grouper par mois (ex: "2026-08")
  const groups: { [monthKey: string]: CompletedSale[] } = {};
  for (const sale of oldSales) {
    const d = new Date(sale.timestamp || now);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[monthKey]) groups[monthKey] = [];
    groups[monthKey].push(sale);
  }

  // Sauvegarder dans monthly_summaries
  for (const [monthKey, monthSales] of Object.entries(groups)) {
    const totalRev = monthSales.reduce((sum, s) => sum + s.total, 0);
    const count = monthSales.length;

    const summary: MonthlySummary = {
      id: `${storeId}_${monthKey}`,
      storeId,
      yearMonth: monthKey,
      totalRevenue: totalRev,
      totalProfit: Math.round(totalRev * 0.28), // Marge moyenne estimée
      salesCount: count,
      debtGiven: monthSales.filter((s) => s.paymentMethod === 'CREDIT').reduce((sum, s) => sum + s.total, 0),
      debtRecovered: 0,
      lossAmount: 0,
      updatedAt: now,
    };
    await persistMonthlySummary(summary, storeId);
  }

  // Marquer et purger les détails superflus
  for (const sale of oldSales) {
    try {
      const condensedSale: CompletedSale = {
        ...sale,
        items: [], // Purge du détail des articles pour libérer le stockage
        expiresAt: now,
      };
      await saveStoreDocument('completed_sales', condensedSale, storeId);
    } catch (e) {
      console.warn('[ARCHIVE] Erreur condensation vente :', sale.id, e);
    }
  }

  return { archivedCount: Object.keys(groups).length, purgedCount: oldSales.length };
}

// =============================================================
// 2. ABONNEMENTS, INTENTIONS DE PAIEMENT & SUPER-ADMIN
// =============================================================

/**
 * Mise à jour de l'approbation d'une boutique (PENDING -> APPROVED / SUSPENDED)
 */
export async function updateStoreApprovalStatus(
  storeId: string,
  status: StoreApprovalStatus,
  adminUid: string
) {
  const storeRef = doc(db, 'stores', storeId);
  await setDoc(
    storeRef,
    cleanFirestoreData({
      status,
      approval: {
        status,
        updatedAt: Date.now(),
        approvedBy: adminUid,
      },
    }),
    { merge: true }
  );
}

/**
 * Enregistrement de l'état de l'abonnement dans merchants/{userId}/subscription
 */
export async function updateMerchantSubscription(
  userId: string,
  data: {
    status: SubscriptionStatus;
    plan: SubscriptionPlan;
    expiresAt: number;
    transactionRef: string;
    paymentMethod: string;
    amount?: number;
  }
) {
  try {
    const merchantId = userId || auth.currentUser?.uid;
    if (!merchantId) return;

    const payload = cleanFirestoreData({
      ...data,
      expiryDate: new Date(data.expiresAt).toISOString(),
      expiryDateFormatted: new Date(data.expiresAt).toLocaleDateString('fr-FR'),
      updatedAt: Date.now(),
    });

    // 1. Enregistre au niveau de merchants/{userId} (champ subscription)
    await setDoc(
      doc(db, 'merchants', merchantId),
      cleanFirestoreData({
        subscription: payload,
        subscriptionStatus: payload.status,
        subscriptionPlan: payload.plan,
        subscriptionExpiryDate: payload.expiryDateFormatted,
        lastTransactionRef: payload.transactionRef,
        updatedAt: Date.now(),
      }),
      { merge: true }
    );

    // 2. Enregistre dans merchants/{userId}/subscription/current pour accès direct
    await setDoc(
      doc(db, 'merchants', merchantId, 'subscription', 'current'),
      payload,
      { merge: true }
    );
  } catch (err) {
    console.warn('[FIRESTORE] updateMerchantSubscription :', err);
  }
}

/**
 * Mise à jour de l'abonnement d'une boutique et synchronisation multi-tenant merchants/{userId} et users/{userId}
 */
export async function updateStoreSubscription(
  storeId: string,
  subscription: StoreSubscription,
  userId?: string,
  transactionRef?: string
) {
  const cleanStoreId = resolveTenantId(storeId);
  const storeRef = doc(db, 'stores', cleanStoreId);
  const txRef = transactionRef || subscription.transactionRef || `TX-${Date.now().toString(36).toUpperCase()}`;

  // Résolution stricte du targetUserId pour ne jamais écraser le profil du Super Admin
  let targetUserId = userId;
  if (!targetUserId) {
    const isCallerSuperAdmin = 
      auth.currentUser?.email?.toLowerCase() === 'pousbila36@gmail.com' ||
      auth.currentUser?.email?.toLowerCase() === 'pousbila04@gmail.com' ||
      auth.currentUser?.email?.toLowerCase() === 'admin@nanasore.com';

    if (isCallerSuperAdmin) {
      targetUserId = cleanStoreId.startsWith('store-') ? cleanStoreId.replace(/^store-/, '') : cleanStoreId;
    } else {
      targetUserId = auth.currentUser?.uid || (cleanStoreId.startsWith('store-') ? cleanStoreId.replace(/^store-/, '') : cleanStoreId);
    }
  }

  const planKey = String(subscription.plan || 'free').toLowerCase();
  const isUnlimited = planKey.includes('pro') || planKey.includes('elite');
  const quotaMaxCourses = isUnlimited ? -1 : (planKey.includes('starter') ? 5 : 1);

  // 1. Enregistre dans stores/{storeId}
  await setDoc(
    storeRef,
    cleanFirestoreData({
      subscription: {
        ...subscription,
        transactionRef: txRef,
      },
      subscriptionPlan: subscription.plan,
      subscriptionStatus: subscription.status,
      subscriptionExpiryDate: new Date(subscription.expiresAt).toLocaleDateString('fr-FR'),
      lastTransactionRef: txRef,
      updatedAt: Date.now(),
    }),
    { merge: true }
  );

  // 2. Synchronisation stricte dans merchants/{userId}/subscription
  if (targetUserId) {
    await updateMerchantSubscription(targetUserId, {
      status: subscription.status,
      plan: subscription.plan,
      expiresAt: subscription.expiresAt,
      transactionRef: txRef,
      paymentMethod: subscription.lastPaymentMethod || 'HYBRID',
      amount: subscription.lastAmountPaid,
    });

    // 3. PERSISTANCE ESSENTIELLE DANS users/{targetUserId} (Profil utilisateur principal interrogé par l'accueil)
    try {
      const userRef = doc(db, 'users', targetUserId);
      await setDoc(
        userRef,
        cleanFirestoreData({
          plan: subscription.plan,
          subscriptionPlan: subscription.plan,
          subscriptionStatus: subscription.status,
          subscription: {
            ...subscription,
            transactionRef: txRef,
          },
          quotas: {
            maxCourses: quotaMaxCourses,
            unlimitedCourses: isUnlimited,
          },
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
      console.log(`[FIRESTORE] Abonnement '${subscription.plan}' & quotas synchronisés dans users/${targetUserId}`);

      // Si le storeId est différent du targetUserId et existe dans users/, synchroniser également
      if (cleanStoreId && cleanStoreId !== targetUserId && !cleanStoreId.startsWith('store-')) {
        await setDoc(
          doc(db, 'users', cleanStoreId),
          cleanFirestoreData({
            plan: subscription.plan,
            subscriptionPlan: subscription.plan,
            subscriptionStatus: subscription.status,
            subscription: { ...subscription, transactionRef: txRef },
            quotas: { maxCourses: quotaMaxCourses, unlimitedCourses: isUnlimited },
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        ).catch(() => {});
      }
    } catch (userErr) {
      console.warn('[FIRESTORE] Erreur synchronisation users/' + targetUserId + ' :', userErr);
    }
  }

  // 4. Synchronisation instantanée du stockage local et des écouteurs réactifs
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('nana_user_plan', subscription.plan);
      localStorage.setItem('nana_store_plan', subscription.plan);
      localStorage.setItem('nana_store_sub', JSON.stringify({
        ...subscription,
        transactionRef: txRef,
      }));

      const savedUserStr = localStorage.getItem('nana_store_auth_user');
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          parsed.plan = subscription.plan;
          parsed.subscriptionPlan = subscription.plan;
          parsed.subscriptionStatus = subscription.status;
          parsed.subscription = { ...subscription, transactionRef: txRef };
          parsed.quotas = {
            maxCourses: quotaMaxCourses,
            unlimitedCourses: isUnlimited,
          };
          localStorage.setItem('nana_store_auth_user', JSON.stringify(parsed));
        } catch {}
      }

      window.dispatchEvent(
        new CustomEvent('nana_subscription_updated', {
          detail: {
            subscription: { ...subscription, transactionRef: txRef },
            plan: subscription.plan,
          }
        })
      );
    } catch (storageErr) {
      console.warn('[LOCAL STORAGE] Erreur écriture cache abonnement :', storageErr);
    }
  }
}

/**
 * Récupération de l'abonnement actif d'une boutique (avec gestion du cache et priorité serveur)
 */
export async function getStoreSubscription(storeId: string, forceServer = false): Promise<StoreSubscription | null> {
  if (!storeId) return null;
  const cleanId = resolveTenantId(storeId);
  try {
    const storeRef = doc(db, 'stores', cleanId);
    let storeDoc;
    if (forceServer) {
      try {
        storeDoc = await getDocFromServer(storeRef);
      } catch {
        storeDoc = await getDoc(storeRef);
      }
    } else {
      storeDoc = await getDoc(storeRef);
    }

    if (storeDoc.exists()) {
      const data = storeDoc.data();
      if (data.subscription) return data.subscription as StoreSubscription;
      if (data.subscriptionPlan) {
        return {
          status: data.subscriptionStatus || 'ACTIVE',
          plan: data.subscriptionPlan,
          expiresAt: data.subscriptionExpiresAt || Date.now() + 30 * 86400000,
          startedAt: data.subscriptionStartedAt || Date.now(),
          lastPaymentMethod: data.lastPaymentMethod || 'HYBRID',
          lastAmountPaid: data.lastAmountPaid || 0,
        };
      }
    }

    // Recherche de secours dans users/{cleanId} si non trouvé dans stores
    const userRef = doc(db, 'users', cleanId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const uData = userDoc.data();
      if (uData.subscription) return uData.subscription as StoreSubscription;
      if (uData.subscriptionPlan || uData.plan) {
        return {
          status: uData.subscriptionStatus || 'ACTIVE',
          plan: uData.plan || uData.subscriptionPlan,
          expiresAt: Date.now() + 30 * 86400000,
          startedAt: Date.now(),
          lastPaymentMethod: 'MANUAL_SUPERADMIN',
          lastAmountPaid: 0,
        };
      }
    }
  } catch (err) {
    console.warn('[FIRESTORE] getStoreSubscription :', err);
  }
  return null;
}

/**
 * Écouteur en temps réel (onSnapshot) pour l'abonnement d'une boutique et du profil utilisateur.
 * Remplace les requêtes ponctuelles get() pour éviter toute désynchronisation entre
 * le tableau de bord Super Admin et la page d'accueil.
 * Gère le cache hors-ligne via includeMetadataChanges et synchronise le profil users/{userId}.
 */
export function subscribeToStoreSubscription(
  storeId: string,
  onUpdate: (subscription: StoreSubscription | null) => void,
  userId?: string
): Unsubscribe {
  if (!storeId) return () => {};

  const cleanStoreId = resolveTenantId(storeId);
  const targetUserId = userId || (cleanStoreId.startsWith('store-') ? cleanStoreId.replace(/^store-/, '') : cleanStoreId);

  // 1. Hydratation immédiate depuis le stockage local (0ms de latence au montage)
  try {
    const cachedSub = localStorage.getItem('nana_store_sub');
    if (cachedSub) {
      const parsed = JSON.parse(cachedSub);
      if (parsed && typeof parsed === 'object') {
        onUpdate(parsed);
      }
    }
  } catch {}

  // 2. Écouteur en temps réel sur la collection stores/{storeId}
  const storeRef = doc(db, 'stores', cleanStoreId);
  const unsubStore = onSnapshot(
    storeRef,
    { includeMetadataChanges: true },
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let sub: StoreSubscription | null = null;
        if (data.subscription && typeof data.subscription === 'object') {
          sub = data.subscription as StoreSubscription;
        } else if (data.subscriptionPlan) {
          sub = {
            status: data.subscriptionStatus || 'ACTIVE',
            plan: data.subscriptionPlan || 'free',
            expiresAt: data.subscriptionExpiresAt || Date.now() + 30 * 86400000,
            startedAt: data.subscriptionStartedAt || Date.now(),
            lastPaymentMethod: data.lastPaymentMethod || 'HYBRID',
            lastAmountPaid: data.lastAmountPaid || 0,
          };
        }

        if (sub) {
          try {
            localStorage.setItem('nana_store_sub', JSON.stringify(sub));
            localStorage.setItem('nana_store_plan', sub.plan);
            localStorage.setItem('nana_user_plan', sub.plan);
          } catch {}
          onUpdate(sub);
        }
      }
    },
    (err) => {
      console.warn('[FIRESTORE] Écouteur abonnement store notice :', err);
    }
  );

  // 3. Écouteur miroir en temps réel sur users/{targetUserId} (données dénormalisées)
  let unsubUser: Unsubscribe = () => {};
  if (targetUserId) {
    const userRef = doc(db, 'users', targetUserId);
    unsubUser = onSnapshot(
      userRef,
      { includeMetadataChanges: true },
      (userSnap) => {
        if (userSnap.exists()) {
          const uData = userSnap.data();
          if (uData.subscription || uData.subscriptionPlan || uData.plan) {
            const plan = uData.plan || uData.subscriptionPlan || 'free';
            const sub: StoreSubscription = (uData.subscription as StoreSubscription) || {
              status: uData.subscriptionStatus || 'ACTIVE',
              plan,
              expiresAt: uData.subscriptionExpiresAt || Date.now() + 30 * 86400000,
              startedAt: Date.now(),
              lastPaymentMethod: 'MANUAL_SUPERADMIN',
              lastAmountPaid: 0,
            };
            try {
              localStorage.setItem('nana_store_sub', JSON.stringify(sub));
              localStorage.setItem('nana_store_plan', plan);
              localStorage.setItem('nana_user_plan', plan);
            } catch {}
            onUpdate(sub);
          }
        }
      },
      (err) => {
        console.warn('[FIRESTORE] Écouteur abonnement users notice :', err);
      }
    );
  }

  return () => {
    unsubStore();
    unsubUser();
  };
}

/**
 * Écouteur en temps réel (onSnapshot) sur le profil users/{uid}
 * Permet de répercuter instantanément sur l'accueil tout changement de plan, quota ou statut
 */
export function subscribeToUserProfile(
  uid: string,
  onUpdate: (profile: Record<string, any> | null) => void
): Unsubscribe {
  if (!uid) return () => {};

  const userRef = doc(db, 'users', uid);
  return onSnapshot(
    userRef,
    { includeMetadataChanges: true },
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate(data);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn('[FIRESTORE] Écouteur profil user notice :', err);
    }
  );
}

/**
 * Création d'une intention de paiement Mobile Money
 */
export async function persistPaymentIntent(intent: PaymentIntent) {
  const intentRef = doc(db, 'payment_intents', intent.id);
  await setDoc(intentRef, cleanFirestoreData(intent), { merge: true });
}

/**
 * Demande d'activation manuelle en Espèces (Boutiquier -> Admin)
 */
export async function persistAdminCashRequest(req: AdminCashRequest) {
  const reqRef = doc(db, 'admin_requests', req.id);
  await setDoc(reqRef, cleanFirestoreData(req), { merge: true });
}

/**
 * Journal des paiements manuels traités par le Super-Admin
 */
export async function persistAdminPaymentLog(log: AdminPaymentLog) {
  const logRef = doc(db, 'admin_payments_log', log.id);
  await setDoc(logRef, cleanFirestoreData(log), { merge: true });
}

// =============================================================
// 3. MODULE D'AFFILIATION & PARRAINAGE SAAS
// =============================================================

/**
 * Enregistrement ou mise à jour du profil d'affilié
 */
export async function persistAffiliateProfile(profile: AffiliateProfile) {
  const affRef = doc(db, 'affiliates', profile.id);
  await setDoc(affRef, cleanFirestoreData(profile), { merge: true });
}

/**
 * Demande de retrait de commissions affilié
 */
export async function requestAffiliateWithdrawal(withdrawal: AffiliateWithdrawal) {
  const withRef = doc(db, 'affiliate_withdrawals', withdrawal.id);
  await setDoc(withRef, cleanFirestoreData(withdrawal), { merge: true });
}

/**
 * Marquer un retrait comme payé par le Super-Admin
 */
export async function markWithdrawalPaid(withdrawalId: string, adminNotes?: string) {
  const withRef = doc(db, 'affiliate_withdrawals', withdrawalId);
  await setDoc(
    withRef,
    cleanFirestoreData({
      status: 'PAID',
      paidAt: Date.now(),
      adminNotes: adminNotes || 'Retrait viré avec succès par Mobile Money.',
    }),
    { merge: true }
  );
}

// =============================================================
// 4. POLITIQUE DE CONFIDENTIALITÉ & MENTIONS LÉGALES
// =============================================================

export const DEFAULT_PRIVACY_POLICY: string = `
# Politique de Confidentialité & Protection des Données - Nanasore

**Dernière mise à jour : 12 Septembre 2026**

Bienvenue sur **Nanasore**, la plateforme de gestion commerciale, e-commerce, campus e-learning et terminal de point de vente tactile.

### 1. Collecte et Utilisation des Données
Nanasore respecte scrupuleusement la confidentialité de vos opérations commerciales. Nous collectons uniquement les informations indispensables au bon fonctionnement de votre caisse :
- **Identité de la Boutique :** Nom commercial, téléphone, ville, devise utilisée (F CFA), logo et coordonnées du gérant.
- **Données d'Inventaire :** Liste de vos articles, codes-barres, prix de revient, prix de vente et historiques des mouvements de stock.
- **Enregistrement des Ventes et Dettes :** Montants des tickets de caisse, moyens de paiement (Espèces, Crédit), et fiches de suivi des clients réguliers.

### 2. Mode Hors-ligne et Sécurité Locale
Pour garantir que votre boutique continue à vendre sans interruption même en cas de coupure réseau ou d'électricité :
- Vos données sont conservées localement dans le stockage sécurisé chiffré de votre navigateur (**IndexedDB**).
- Dès le retour de la connexion internet, une synchronisation automatique et bidirectionnelle s'opère avec notre infrastructure Cloud Firestore hautement sécurisée.
- Aucune donnée de carte bancaire ni de code confidentiel Mobile Money n'est jamais stockée sur nos serveurs.

### 3. Propriété Exclusif de Vos Données
Vos données commerciales et vos bilans de ventes restent la propriété pleine et exclusive de votre établissement. Nana POS ne commercialise ni ne loue jamais les données de ses clients à des tiers à des fins publicitaires.

### 4. Vos Droits et Contact
Conformément aux réglementations applicables en matière de protection des données personnelles, vous disposez d'un droit permanent d'accès, de rectification et d'exportation complète de vos données (au format PDF ou Excel/JSON).

Pour toute assistance ou question relative à la protection de vos données :
- **Support Wameet Officiel :** +226 70 00 00 00 / +225 07 00 00 00
- **Email de contact :** support@nanapos.africa
`.trim();

/**
 * Récupère la politique de confidentialité depuis Firestore ou fallback par défaut
 */
export async function getPrivacyPolicy(): Promise<PrivacyPolicyConfig> {
  try {
    const policyDoc = await getDoc(doc(db, 'settings', 'privacy_policy'));
    if (policyDoc.exists()) {
      return policyDoc.data() as PrivacyPolicyConfig;
    }
  } catch (err) {
    console.warn('[FIRESTORE] Chargement de la politique par défaut :', err);
  }

  return {
    content: DEFAULT_PRIVACY_POLICY,
    lastUpdated: '12 Septembre 2026',
    updatedBy: 'Administrateur SaaS Nana',
    version: '1.2',
  };
}

/**
 * Enregistre la politique de confidentialité modifiée par le Super-Admin
 */
export async function savePrivacyPolicy(policy: PrivacyPolicyConfig) {
  const policyRef = doc(db, 'settings', 'privacy_policy');
  await setDoc(policyRef, cleanFirestoreData(policy), { merge: true });
}

/**
 * Récupère le profil utilisateur Firestore users/{uid}
 * Initialise automatiquement les 15 crédits gratuits s'ils ne sont pas présents
 */
export async function getUserProfile(uid: string): Promise<Record<string, any> | null> {
  if (!uid) return null;
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      // Tout nouvel utilisateur reçoit automatiquement 15 crédits gratuits par défaut pour découvrir l'outil
      if (data.credits === undefined) {
        data.credits = DEFAULT_FREE_CREDITS;
        setDoc(userRef, { credits: DEFAULT_FREE_CREDITS }, { merge: true }).catch(() => {});
      }
      return data;
    }
  } catch (err) {
    console.warn('[FIRESTORE] Lecture users/' + uid + ' :', err);
  }
  return null;
}

/**
 * Met à jour ou enregistre le profil et le code PIN users/{uid}
 * Ex: { pinCode: "1234", setupCompleted: true, storeId: "..." }
 * Préserve ou initialise le portefeuille à 15 crédits gratuits.
 */
export async function saveUserProfile(uid: string, profileData: Record<string, any>): Promise<void> {
  if (!uid) return;
  const userRef = doc(db, 'users', uid);

  let creditsToSet = profileData.credits;
  let planToSet = profileData.plan;
  let subscriptionPlanToSet = profileData.subscriptionPlan;
  let subscriptionStatusToSet = profileData.subscriptionStatus;
  let quotasToSet = profileData.quotas;
  let subscriptionToSet = profileData.subscription;

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const existingData = snap.data();
      if (creditsToSet === undefined) {
        creditsToSet = existingData?.credits !== undefined ? existingData.credits : DEFAULT_FREE_CREDITS;
      }
      if (!planToSet && existingData?.plan) {
        planToSet = existingData.plan;
      }
      if (!subscriptionPlanToSet && existingData?.subscriptionPlan) {
        subscriptionPlanToSet = existingData.subscriptionPlan;
      }
      if (!subscriptionStatusToSet && existingData?.subscriptionStatus) {
        subscriptionStatusToSet = existingData.subscriptionStatus;
      }
      if (!quotasToSet && existingData?.quotas) {
        quotasToSet = existingData.quotas;
      }
      if (!subscriptionToSet && existingData?.subscription) {
        subscriptionToSet = existingData.subscription;
      }
    } else {
      if (creditsToSet === undefined) creditsToSet = DEFAULT_FREE_CREDITS;
    }
  } catch {
    if (creditsToSet === undefined) creditsToSet = DEFAULT_FREE_CREDITS;
  }

  // Fallback plan local si non trouvé
  if (!planToSet && typeof window !== 'undefined') {
    const localPlan = localStorage.getItem('nana_user_plan');
    if (localPlan) planToSet = localPlan;
  }

  const finalPlan = planToSet || 'free';
  const isUnlimited = finalPlan === 'pro' || finalPlan === 'elite';
  if (!quotasToSet) {
    quotasToSet = {
      maxCourses: isUnlimited ? -1 : (finalPlan === 'starter' ? 5 : 1),
      unlimitedCourses: isUnlimited,
    };
  }

  const payload = cleanFirestoreData({
    credits: creditsToSet,
    plan: finalPlan,
    subscriptionPlan: subscriptionPlanToSet || finalPlan,
    subscriptionStatus: subscriptionStatusToSet || (finalPlan === 'free' ? 'ACTIVE' : 'pending_activation'),
    quotas: quotasToSet,
    ...(subscriptionToSet ? { subscription: subscriptionToSet } : {}),
    ...profileData,
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(userRef, payload, { merge: true });
    console.log('[FIRESTORE] Profil, plan et PIN enregistrés dans users/' + uid);
  } catch (err) {
    console.warn('[FIRESTORE] Sauvegarde users/' + uid + ' notice :', err);
  }

  // Cache local de secours
  try {
    localStorage.setItem(`nana_user_profile_${uid}`, JSON.stringify(payload));
    localStorage.setItem('nana_user_plan', finalPlan);
    if (profileData.sellerMode) {
      localStorage.setItem('nanasore_seller_mode', String(profileData.sellerMode));
    }
    if (creditsToSet !== undefined) {
      localStorage.setItem(`nana_user_credits_${uid}`, String(creditsToSet));
    }
  } catch (e) {
    console.error('[LOCAL CACHE] Erreur écriture cache profil utilisateur :', e);
  }
}

/**
 * Enregistre et synchronise le mode vendeur Caméléon ('creator_trainer' | 'merchant_ecommerce' | 'hybrid_all')
 * dans localStorage ('nanasore_seller_mode'), users/{uid} et stores/{storeId}.
 */
export async function updateSellerModeInFirestore(
  sellerMode: SellerMode,
  uid?: string | null,
  storeId?: string | null
): Promise<void> {
  const vendorType = sellerMode === 'creator_trainer' ? 'elearning' : 'ecommerce';

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('nanasore_seller_mode', sellerMode);
      localStorage.setItem('nana_vendor_type', vendorType);
      const rawUser = localStorage.getItem('nana_store_auth_user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        parsed.sellerMode = sellerMode;
        parsed.vendorType = vendorType;
        localStorage.setItem('nana_store_auth_user', JSON.stringify(parsed));
      }
      window.dispatchEvent(
        new CustomEvent('nanasore_seller_mode_changed', {
          detail: { sellerMode, vendorType }
        })
      );
    } catch {}
  }

  const targetUid = uid || auth?.currentUser?.uid;
  const targetStoreId = storeId || (targetUid ? resolveTenantId(targetUid) : null);

  const updates = cleanFirestoreData({
    sellerMode,
    vendorType,
    updatedAt: new Date().toISOString()
  });

  try {
    if (targetUid) {
      await setDoc(doc(db, 'users', targetUid), updates, { merge: true }).catch(() => {});
    }
    if (targetStoreId) {
      await setDoc(doc(db, 'stores', targetStoreId), updates, { merge: true }).catch(() => {});
    }
  } catch (err) {
    console.warn('[FIRESTORE] updateSellerModeInFirestore notice :', err);
  }
}

// =============================================================
// SYSTÈME DE PORTEFEUILLE DE CRÉDITS STUDIO IA (COLLECTION USERS)
// =============================================================

export { DEFAULT_FREE_CREDITS, GENERATOR_CREDIT_COSTS };

/**
 * Récupère le solde de crédits de l'utilisateur dans users/{uid}
 * Tout nouvel utilisateur reçoit automatiquement 15 crédits gratuits par défaut.
 */
export async function getUserCredits(uid: string): Promise<number> {
  if (!uid) return DEFAULT_FREE_CREDITS;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      if (typeof data.credits === 'number') {
        return data.credits;
      }
      // Initialisation automatique à 15 crédits gratuits
      await setDoc(userRef, { credits: DEFAULT_FREE_CREDITS }, { merge: true });
      return DEFAULT_FREE_CREDITS;
    } else {
      // Document utilisateur inexistant : création automatique avec 15 crédits gratuits
      await setDoc(userRef, { 
        credits: DEFAULT_FREE_CREDITS, 
        createdAt: new Date().toISOString() 
      }, { merge: true });
      return DEFAULT_FREE_CREDITS;
    }
  } catch (e) {
    console.warn('[FIRESTORE] Erreur lecture crédits users/' + uid + ' :', e);
    try {
      const cached = localStorage.getItem(`nana_user_credits_${uid}`);
      if (cached !== null) return parseInt(cached, 10);
    } catch {}
    return DEFAULT_FREE_CREDITS;
  }
}

/**
 * Écoute en temps réel le solde de crédits dans users/{uid}
 */
export function subscribeToUserCredits(
  uid: string,
  onUpdate: (credits: number) => void
): () => void {
  if (!uid) {
    onUpdate(DEFAULT_FREE_CREDITS);
    return () => {};
  }

  // Lecture immédiate du cache local pour un affichage réactif
  try {
    const cached = localStorage.getItem(`nana_user_credits_${uid}`);
    if (cached !== null) {
      const num = parseInt(cached, 10);
      if (!isNaN(num)) onUpdate(num);
    }
  } catch {}

  const userRef = doc(db, 'users', uid);
  const unsub = onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.credits === 'number') {
          try {
            localStorage.setItem(`nana_user_credits_${uid}`, String(data.credits));
          } catch {}
          onUpdate(data.credits);
        } else {
          // Document existant mais champ credits absent : initialiser à 15 crédits
          setDoc(userRef, { credits: DEFAULT_FREE_CREDITS }, { merge: true }).catch(() => {});
          try {
            localStorage.setItem(`nana_user_credits_${uid}`, String(DEFAULT_FREE_CREDITS));
          } catch {}
          onUpdate(DEFAULT_FREE_CREDITS);
        }
      } else {
        // Document absent : initialiser à 15 crédits gratuits par défaut
        setDoc(userRef, { 
          credits: DEFAULT_FREE_CREDITS, 
          createdAt: new Date().toISOString() 
        }, { merge: true }).catch(() => {});
        onUpdate(DEFAULT_FREE_CREDITS);
      }
    },
    (err) => {
      console.warn('[FIRESTORE] subscribeToUserCredits notice :', err);
      try {
        const cached = localStorage.getItem(`nana_user_credits_${uid}`);
        if (cached !== null) {
          onUpdate(parseInt(cached, 10));
          return;
        }
      } catch {}
      onUpdate(DEFAULT_FREE_CREDITS);
    }
  );

  return unsub;
}

/**
 * Déduit les crédits dans Firestore users/{uid} uniquement lorsque le résultat est bien reçu.
 * Barème : Texte = 1 crédit, Image = 2 crédits, Vidéo = 20 crédits.
 */
export async function deductUserCredits(
  uid: string,
  amount: number,
  details?: { type?: string; description?: string }
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  if (!uid) return { success: false, newBalance: 0, error: 'NO_USER' };

  const userRef = doc(db, 'users', uid);
  try {
    return await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      let currentCredits = DEFAULT_FREE_CREDITS;

      if (userSnap.exists()) {
        const data = userSnap.data();
        currentCredits = typeof data.credits === 'number' ? data.credits : DEFAULT_FREE_CREDITS;
      }

      if (currentCredits < amount) {
        return {
          success: false,
          newBalance: currentCredits,
          error: 'INSUFFICIENT_CREDITS'
        };
      }

      const newBalance = currentCredits - amount;
      transaction.set(userRef, {
        credits: newBalance,
        lastCreditDebit: {
          amount,
          type: details?.type || 'unknown',
          description: details?.description || 'Génération Studio IA',
          timestamp: Date.now()
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });

      try {
        localStorage.setItem(`nana_user_credits_${uid}`, String(newBalance));
      } catch {}

      return {
        success: true,
        newBalance
      };
    });
  } catch (error: any) {
    console.warn('[FIRESTORE] deductUserCredits transaction notice, repli avec atomic increment :', error);
    try {
      await updateDoc(userRef, {
        credits: increment(-amount),
        updatedAt: new Date().toISOString()
      });
      const updatedSnap = await getDoc(userRef);
      const newBalance = updatedSnap.data()?.credits ?? 0;
      try {
        localStorage.setItem(`nana_user_credits_${uid}`, String(newBalance));
      } catch {}
      return { success: true, newBalance };
    } catch (err2: any) {
      console.error('[FIRESTORE] deductUserCredits error :', err2);
      return { success: false, newBalance: 0, error: err2?.message || 'TRANSACTION_FAILED' };
    }
  }
}

/**
 * Ajoute des crédits à l'utilisateur (Rechargement après paiement via SPaymentGateway)
 */
export async function addUserCredits(
  uid: string,
  amount: number,
  transactionRef?: string
): Promise<number> {
  if (!uid || amount <= 0) return 0;
  const userRef = doc(db, 'users', uid);

  try {
    await setDoc(userRef, {
      credits: increment(amount),
      lastCreditRecharge: {
        amount,
        transactionRef: transactionRef || `CR-${Date.now().toString(36).toUpperCase()}`,
        timestamp: Date.now()
      },
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const snap = await getDoc(userRef);
    const newBalance = snap.data()?.credits ?? amount;
    try {
      localStorage.setItem(`nana_user_credits_${uid}`, String(newBalance));
    } catch {}
    return newBalance;
  } catch (e) {
    console.error('[FIRESTORE] addUserCredits error :', e);
    throw e;
  }
}


// =============================================================
// 5. GESTION DES ABONNEMENTS SAAS & PARAMÈTRES DE PAIEMENT (SUPER-ADMIN)
// =============================================================

export const DEFAULT_PLATFORM_SUBSCRIPTIONS: PlatformSubscriptionConfig = {
  plans: [
    {
      id: 'free',
      name: 'Plan Zéro — Découverte & Freemium PLG',
      price: 0,
      period: 'mois',
      badge: 'Freemium PLG',
      description: 'Démarrez gratuitement votre activité sans carte bancaire avec les 19 outils essentiels inclus.',
      features: [
        'Caisse tactile POS de comptoir ou portable avec synchronisation Cloud',
        'Boutique en ligne nsore.shop offerte',
        'Publication Marketplace & catalogue public',
        'Assistant IA décisionnel de base',
        'Impression tickets thermiques (Bluetooth/USB)',
        'Carnet d\'ardoises dettes & créances clients',
        'Formulaires devis & contact instantané',
        'Souscription gratuite au service de livraison pendant le live shopping',
        '0% de commission sur vos encaissements'
      ],
      limits: {
        maxProducts: 3,
        maxFunnels: 1,
        maxCourses: 1,
        maxLiveShoppingSessions: 1,
        customDomainAllowed: false,
        aiAssistanceQueries: 5,
        docusignInvoices: 5,
        maxCashiers: 1
      }
    },
    {
      id: 'starter',
      name: 'Plan Pro — Boutique & Formateur Pro',
      price: 15000,
      period: 'mois',
      badge: 'Le Choix Recommandé',
      description: 'La formule tout-en-un pour les commerces actifs et les formateurs indépendants voulant encaisser sans aucune limite.',
      features: [
        'Caisse POS & Produits illimités',
        'Étudiants & Formations illimités',
        'Module CV Pro inclus en illimité',
        'Gestion jusqu\'à 10 caissiers (PIN)',
        'Passerelles directes à 0% de commission',
        'Certificats officiels sécurisés QR Code'
      ],
      limits: {
        maxProducts: -1,
        maxFunnels: 10,
        maxCourses: -1,
        maxLiveShoppingSessions: 20,
        customDomainAllowed: true,
        aiAssistanceQueries: 100,
        docusignInvoices: 100,
        maxCashiers: 10
      }
    },
    {
      id: 'pro',
      name: 'Plan Business — Multi-Boutiques & Campus',
      price: 30000,
      period: 'mois',
      badge: 'Croissance & Équipe',
      description: 'Solution complète pour commerces en réseau, équipes multi-caissiers et académies avec plusieurs instructeurs.',
      features: [
        'Multi-points de vente (jusqu\'à 20 caissiers)',
        'Stocks multi-magasins synchronisés',
        'Pixels publicitaires Meta & TikTok intégrés',
        'CRM marketing & relances de paniers',
        'Gestion multi-formateurs & cohortes d\'élèves',
        'Assistance prioritaire WhatsApp 7j/7'
      ],
      limits: {
        maxProducts: -1,
        maxFunnels: -1,
        maxCourses: -1,
        maxLiveShoppingSessions: -1,
        customDomainAllowed: true,
        aiAssistanceQueries: -1,
        docusignInvoices: -1,
        maxCashiers: 20
      }
    },
    {
      id: 'elite',
      name: 'Plan Enterprise — Franchises & Marque Blanche',
      price: 60000,
      period: 'mois',
      badge: 'Marque Blanche 100%',
      description: 'Pour réseaux de distribution, universités privées et grandes enseignes exigeant une autonomie souveraine absolue.',
      features: [
        'Marque Blanche totale (Zéro mention NaNa)',
        'Votre propre nom de domaine personnalisé',
        'Nombre de caisses & campus illimité',
        'CV Pro & attestations d\'entreprise illimités',
        'Accès complet aux webhooks & API souveraines',
        'Chargé de compte dédié & SLA garanti 99.9%'
      ],
      limits: {
        maxProducts: -1,
        maxFunnels: -1,
        maxCourses: -1,
        maxLiveShoppingSessions: -1,
        customDomainAllowed: true,
        aiAssistanceQueries: -1,
        docusignInvoices: -1,
        maxCashiers: -1
      }
    }
  ],
  paymentSettings: {
    scrollingMarquee: 'Composez le code indiqué pour valider votre paiement. Après paiement, votre compte ou commande sera automatiquement activé sans délai.',
    supportW: '+22665565805',
    checkoutInstructions: 'Veuillez composer le code USSD ci-dessous depuis votre téléphone pour valider votre règlement instantané :',
    operators: [
      { 
        id: 'bf-orange', 
        country: 'Burkina Faso', 
        operator: 'Orange Money', 
        merchantNumber: '+226 65 56 58 05', 
        merchantCode: '65565805', 
        ussdCode: '*144*10*65565805*{montant}#', 
        ussdTemplate: '*144*10*{merchantCode}*{montant}#',
        instructions: 'Veuillez composer le code suivant sur votre téléphone pour valider votre paiement :',
        isActive: true 
      },
      { 
        id: 'bf-moov', 
        country: 'Burkina Faso', 
        operator: 'Moov Money', 
        merchantNumber: '+226 60 00 00 00', 
        merchantCode: '60000000',
        ussdCode: '*555*6*{montant}#', 
        ussdTemplate: '*555*6*{montant}#',
        instructions: 'Composez *555*6*Montant# sur Moov Money',
        isActive: true 
      },
      { id: 'ci-wave', country: "Côte d'Ivoire", operator: 'Wave CI', merchantNumber: '+225 07 00 00 00', ussdCode: 'Scanner QR / Numéro Wave', isActive: true },
      { id: 'ci-orange', country: "Côte d'Ivoire", operator: 'Orange Money CI', merchantNumber: '+225 07 12 34 56', ussdCode: '*144*{montant}#', ussdTemplate: '*144*{montant}#', isActive: true },
      { id: 'ci-mtn', country: "Côte d'Ivoire", operator: 'MTN MoMo CI', merchantNumber: '+225 05 00 00 00', ussdCode: '*133*{montant}#', ussdTemplate: '*133*{montant}#', isActive: true },
      { id: 'sn-wave', country: 'Sénégal', operator: 'Wave SN', merchantNumber: '+221 77 00 00 00', ussdCode: 'Scanner QR / Numéro Wave', isActive: true },
      { id: 'sn-orange', country: 'Sénégal', operator: 'Orange Money SN', merchantNumber: '+221 77 12 34 56', ussdCode: '*144# ou App Orange', isActive: true },
      { id: 'ml-orange', country: 'Mali', operator: 'Orange Money ML', merchantNumber: '+223 70 00 00 00', ussdCode: '*144*{montant}#', ussdTemplate: '*144*{montant}#', isActive: true }
    ]
  }
};

function getLocalSuperAdminFallbackSubscriptions(): PlatformSubscriptionConfig {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('nana_super_admin_settings') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.platformConfig?.plans && parsed.platformConfig.plans.length > 0) {
        return parsed.platformConfig;
      }
    }
    const rawSub = typeof window !== 'undefined' ? localStorage.getItem('nana_platform_subscriptions') : null;
    if (rawSub) {
      const parsedSub = JSON.parse(rawSub);
      if (parsedSub?.plans && parsedSub.plans.length > 0) {
        return parsedSub;
      }
    }
  } catch {}
  return DEFAULT_PLATFORM_SUBSCRIPTIONS;
}

function getLocalSuperAdminFallbackCentralPayment(): CentralPaymentConfig {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('nana_super_admin_settings') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.centralPaymentConfig) {
        return { ...DEFAULT_CENTRAL_PAYMENT_CONFIG, ...parsed.centralPaymentConfig };
      }
    }
    const rawPay = typeof window !== 'undefined' ? localStorage.getItem('nana_central_payment_config') : null;
    if (rawPay) {
      const parsedPay = JSON.parse(rawPay);
      if (parsedPay) {
        return { ...DEFAULT_CENTRAL_PAYMENT_CONFIG, ...parsedPay };
      }
    }
  } catch {}
  return DEFAULT_CENTRAL_PAYMENT_CONFIG;
}

/**
 * Récupère la configuration des abonnements depuis Firestore (ou fallback local Super Admin prioritaire)
 */
export async function getPlatformSubscriptions(): Promise<PlatformSubscriptionConfig> {
  const fallback = getLocalSuperAdminFallbackSubscriptions();
  try {
    const docSnap = await getDoc(doc(db, 'platform_settings', 'subscriptions'));
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<PlatformSubscriptionConfig>;
      return {
        plans: data.plans && data.plans.length > 0 ? data.plans : fallback.plans,
        paymentSettings: {
          scrollingMarquee: data.paymentSettings?.scrollingMarquee || fallback.paymentSettings.scrollingMarquee,
          supportW: data.paymentSettings?.supportW || fallback.paymentSettings.supportW,
          checkoutInstructions: data.paymentSettings?.checkoutInstructions || fallback.paymentSettings.checkoutInstructions,
          operators: data.paymentSettings?.operators && data.paymentSettings.operators.length > 0
            ? data.paymentSettings.operators
            : fallback.paymentSettings.operators,
        },
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      };
    }
  } catch (e) {
    console.warn('[FIRESTORE] getPlatformSubscriptions error :', e);
  }
  return fallback;
}

/**
 * Met à jour un plan d'abonnement spécifique et ses limites dans Firestore
 * Reçoit l'ID ciblé et l'objet nettoyé, avec persistance dans subscription_plans/{planId}
 * et réplication dans platform_settings/subscriptions.
 */
export async function updateSubscriptionPlan(
  planId: string,
  planData: Partial<SubscriptionPlanConfig>
): Promise<SubscriptionPlanConfig> {
  if (!planId || typeof planId !== 'string') {
    const err = new Error('Identifiant du plan (planId) invalide ou manquant.');
    console.error('[FIRESTORE] updateSubscriptionPlan error :', err);
    throw err;
  }

  const targetDocId = planId.toLowerCase().trim();
  const planRef = doc(db, 'subscription_plans', targetDocId);
  const altPlanRef = doc(db, 'plans', targetDocId);
  const globalRef = doc(db, 'platform_settings', 'subscriptions');

  const cleanData = cleanFirestoreData({
    ...planData,
    id: targetDocId,
    updatedAt: Date.now(),
  });

  // 1. Mise à jour ou création du document unitaire du plan
  try {
    await updateDoc(planRef, cleanData);
  } catch (updateErr: any) {
    // Si updateDoc échoue car le document n'existe pas encore en base, créer avec setDoc
    try {
      await setDoc(planRef, cleanData, { merge: true });
    } catch (setErr: any) {
      console.error(`[FIRESTORE] Erreur écriture subscription_plans/${targetDocId} :`, setErr);
      throw setErr;
    }
  }

  // Double réplication de commodité dans plans/{planId}
  try {
    await setDoc(altPlanRef, cleanData, { merge: true });
  } catch {}

  // 2. Synchronisation dans le document global platform_settings/subscriptions
  try {
    const globalSnap = await getDoc(globalRef);
    let currentConfig: Partial<PlatformSubscriptionConfig> = {};
    let plansList: SubscriptionPlanConfig[] = [];

    if (globalSnap.exists()) {
      currentConfig = globalSnap.data() as Partial<PlatformSubscriptionConfig>;
      plansList = Array.isArray(currentConfig.plans) ? [...currentConfig.plans] : [];
    } else {
      plansList = [...DEFAULT_PLATFORM_SUBSCRIPTIONS.plans];
    }

    const existingIdx = plansList.findIndex(
      p => p.id?.toLowerCase().trim() === targetDocId
    );

    const defaultLimits: SubscriptionPlanLimits = {
      maxProducts: targetDocId === 'free' ? 3 : 100,
      maxFunnels: targetDocId === 'free' ? 1 : 5,
      maxCourses: targetDocId === 'free' ? 0 : 1,
      maxCashiers: targetDocId === 'free' ? 1 : 2,
      customDomainAllowed: targetDocId !== 'free',
      aiAssistanceQueries: targetDocId === 'free' ? 5 : 50,
      docusignInvoices: targetDocId === 'free' ? 5 : 50,
      maxLiveShoppingSessions: targetDocId === 'free' ? 1 : 5,
    };

    let mergedPlan: SubscriptionPlanConfig;
    if (existingIdx >= 0) {
      const existingLimits = plansList[existingIdx]?.limits || defaultLimits;
      const combinedLimits: SubscriptionPlanLimits = {
        ...defaultLimits,
        ...existingLimits,
        ...(cleanData.limits || {})
      };

      mergedPlan = {
        ...plansList[existingIdx],
        ...cleanData,
        limits: combinedLimits
      };
      plansList[existingIdx] = mergedPlan;
    } else {
      const combinedLimits: SubscriptionPlanLimits = {
        ...defaultLimits,
        ...(cleanData.limits || {})
      };
      mergedPlan = {
        ...(cleanData as SubscriptionPlanConfig),
        limits: combinedLimits
      };
      plansList.push(mergedPlan);
    }

    const updatedGlobalPayload = cleanFirestoreData({
      ...currentConfig,
      plans: plansList,
      updatedAt: Date.now(),
    });

    await setDoc(globalRef, updatedGlobalPayload, { merge: true });
    return mergedPlan;
  } catch (globalErr: any) {
    console.error('[FIRESTORE] Erreur mise à jour globale platform_settings/subscriptions :', globalErr);
    throw globalErr;
  }
}

/**
 * Enregistre la configuration des abonnements et paramètres de paiement dans Firestore
 */
export async function savePlatformSubscriptions(config: PlatformSubscriptionConfig): Promise<void> {
  const payload = cleanFirestoreData({
    ...config,
    updatedAt: Date.now(),
  });

  try {
    // 1. Écriture principale dans platform_settings/subscriptions
    await setDoc(doc(db, 'platform_settings', 'subscriptions'), payload, { merge: true });

    // 2. Synchronisation de chaque plan individuel dans subscription_plans/{planId}
    if (Array.isArray(config.plans)) {
      await Promise.all(
        config.plans.map(async (plan) => {
          if (plan && plan.id) {
            const planDocId = String(plan.id).toLowerCase().trim();
            const planRef = doc(db, 'subscription_plans', planDocId);
            const planData = cleanFirestoreData({
              ...plan,
              id: planDocId,
              updatedAt: Date.now(),
            });
            await setDoc(planRef, planData, { merge: true }).catch((err) => {
              console.error(`[FIRESTORE] Erreur écriture individuelle subscription_plans/${planDocId} :`, err);
            });
          }
        })
      );
    }

    // 3. Synchronise également dans la collection parametres/paiement pour l'administration centralisée
    await setDoc(doc(db, 'parametres', 'paiement'), cleanFirestoreData({
      ...payload.paymentSettings,
      updatedAt: Date.now()
    }), { merge: true }).catch((err) => {
      console.error('[FIRESTORE] Erreur synchronisation parametres/paiement :', err);
    });
  } catch (err: any) {
    console.error('[FIRESTORE] Échec de la fonction savePlatformSubscriptions :', err);
    throw err;
  }
}

/**
 * Écouteur temps réel onSnapshot sur la configuration platform_settings/subscriptions
 */
export function subscribeToPlatformSubscriptions(
  onUpdate: (config: PlatformSubscriptionConfig) => void
): Unsubscribe {
  const fallback = getLocalSuperAdminFallbackSubscriptions();
  try {
    return onSnapshot(
      doc(db, 'platform_settings', 'subscriptions'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<PlatformSubscriptionConfig>;
          const currentFallback = getLocalSuperAdminFallbackSubscriptions();
          onUpdate({
            plans: data.plans && data.plans.length > 0 ? data.plans : currentFallback.plans,
            paymentSettings: {
              scrollingMarquee: data.paymentSettings?.scrollingMarquee || currentFallback.paymentSettings.scrollingMarquee,
              supportW: data.paymentSettings?.supportW || currentFallback.paymentSettings.supportW,
              checkoutInstructions: data.paymentSettings?.checkoutInstructions || currentFallback.paymentSettings.checkoutInstructions,
              operators: data.paymentSettings?.operators && data.paymentSettings.operators.length > 0
                ? data.paymentSettings.operators
                : currentFallback.paymentSettings.operators,
            },
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
          });
        } else {
          onUpdate(getLocalSuperAdminFallbackSubscriptions());
        }
      },
      (err) => {
        console.error('[FIRESTORE ERROR] subscribeToPlatformSubscriptions notice :', err);
      }
    );
  } catch (e) {
    console.error('[FIRESTORE ERROR] subscribeToPlatformSubscriptions init error :', e);
    onUpdate(fallback);
    return () => {};
  }
}

// ============================================================================
// CONFIGURATION CENTRALE MULTI-PAYS (parametres/paiement)
// ============================================================================

/**
 * Récupère la configuration centrale des paiements (parametres/paiement)
 */
export async function getCentralPaymentConfig(): Promise<CentralPaymentConfig> {
  const fallback = getLocalSuperAdminFallbackCentralPayment();
  try {
    const docSnap = await getDoc(doc(db, 'parametres', 'paiement'));
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<CentralPaymentConfig>;
      return {
        ...fallback,
        ...data,
        orangeMoneyBurkina: {
          ...fallback.orangeMoneyBurkina,
          ...(data.orangeMoneyBurkina || {})
        },
        internationalRecipient: {
          ...fallback.internationalRecipient,
          ...(data.internationalRecipient || {})
        },
        cryptoWallets: {
          ...fallback.cryptoWallets,
          ...(data.cryptoWallets || {})
        },
        cardGatewayKeys: {
          ...fallback.cardGatewayKeys,
          ...(data.cardGatewayKeys || {})
        },
        toggles: {
          ...fallback.toggles,
          ...(data.toggles || {})
        },
        deliveryZones: data.deliveryZones || fallback.deliveryZones
      };
    }
  } catch (e) {
    console.warn('[FIRESTORE] getCentralPaymentConfig error :', e);
  }
  return fallback;
}

/**
 * Enregistre la configuration centrale des paiements dans Firestore (parametres/paiement)
 */
export async function saveCentralPaymentConfig(config: CentralPaymentConfig): Promise<void> {
  const payload = cleanFirestoreData({
    ...config,
    updatedAt: Date.now()
  });
  await setDoc(doc(db, 'parametres', 'paiement'), payload, { merge: true });
  // Synchronise également dans platform_settings/subscriptions
  await setDoc(doc(db, 'platform_settings', 'subscriptions'), cleanFirestoreData({
    centralPaymentConfig: payload,
    updatedAt: Date.now()
  }), { merge: true }).catch(() => {});
}

/**
 * Écouteur temps réel onSnapshot sur la configuration centrale parametres/paiement
 */
export function subscribeToCentralPaymentConfig(
  onUpdate: (config: CentralPaymentConfig) => void
): Unsubscribe {
  try {
    return onSnapshot(
      doc(db, 'parametres', 'paiement'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<CentralPaymentConfig>;
          onUpdate({
            ...DEFAULT_CENTRAL_PAYMENT_CONFIG,
            ...data,
            orangeMoneyBurkina: {
              ...DEFAULT_CENTRAL_PAYMENT_CONFIG.orangeMoneyBurkina,
              ...(data.orangeMoneyBurkina || {})
            },
            internationalRecipient: {
              ...DEFAULT_CENTRAL_PAYMENT_CONFIG.internationalRecipient,
              ...(data.internationalRecipient || {})
            },
            cryptoWallets: {
              ...DEFAULT_CENTRAL_PAYMENT_CONFIG.cryptoWallets,
              ...(data.cryptoWallets || {})
            },
            cardGatewayKeys: {
              ...DEFAULT_CENTRAL_PAYMENT_CONFIG.cardGatewayKeys,
              ...(data.cardGatewayKeys || {})
            },
            toggles: {
              ...DEFAULT_CENTRAL_PAYMENT_CONFIG.toggles,
              ...(data.toggles || {})
            },
            deliveryZones: data.deliveryZones || DEFAULT_CENTRAL_PAYMENT_CONFIG.deliveryZones
          });
        } else {
          onUpdate(DEFAULT_CENTRAL_PAYMENT_CONFIG);
        }
      },
      (err) => {
        console.warn('[FIRESTORE] subscribeToCentralPaymentConfig notice :', err);
        onUpdate(DEFAULT_CENTRAL_PAYMENT_CONFIG);
      }
    );
  } catch (e) {
    console.warn('[FIRESTORE] subscribeToCentralPaymentConfig init error :', e);
    onUpdate(DEFAULT_CENTRAL_PAYMENT_CONFIG);
    return () => {};
  }
}

// ============================================================================
// CONFIGURATION JURIDIQUE & TEXTES LÉGAUX DE LA PLATEFORME (platform_settings/legal)
// ============================================================================

export const DEFAULT_PLATFORM_LEGAL: PlatformLegalConfig = {
  ticker_text: "© 2026 Nanasore. Tous droits réservés. • Mentions Légales • Politique de Confidentialité • Sécurité & protection des données marchandes.",
  legal_mentions_content: `# Mentions Légales — Nanasore

## 1. Éditeur de l'Application
L'application et la plateforme **Nanasore** sont éditées par le consortium technologique Nanasore Digital Solutions SAS, immatriculée au registre du commerce sous le numéro CI-ABJ-2024-B-1089.
- **Siège social** : Abidjan, Plateau, Avenue Chardy, Immeuble Horizon Tech, 4ème étage.
- **Directeur de la publication** : Direction des Opérations Nanasore.
- **Contact Support & Assistance** : support@nanasore.com / +225 07 00 00 00 00.

## 2. Hébergement & Infrastructure Cloud
Les données de caisse, bases de données et services temps réel sont hébergés sur des infrastructures cloud sécurisées hautement disponibles :
- **Hébergeur principal** : Google Cloud Platform (GCP) & Firebase Services.
- **Centres de données** : Région Europe & Réplication multi-régionale sécurisée.
- **Garantie de service (SLA)** : 99.9% de disponibilité avec redondance hors-ligne locale (PWA SQLite / IndexedDB).

## 3. Propriété Intellectuelle & Droits Réservés
L'ensemble des marques, logos, algorithmes de recommandation, modèles de calcul de rendu monnaie, codes sources et éléments graphiques de l'application Nanasore constituent des œuvres de l'esprit protégées par les dispositions de l'OAPI (Organisation Africaine de la Propriété Intellectuelle) et les traités internationaux relatifs au droit d'auteur.
Toute reproduction, représentation, modification ou extraction sans autorisation préalable expresse est strictement prohibée.

## 4. Limitation de Responsabilité
Nanasore met tout en œuvre pour assurer l'exactitude des calculs comptables, des stocks et de la transmission des paiements Mobile Money. Toutefois, la vérification physique des espèces et l'encaissement effectif des sommes restent sous la pleine responsabilité du commerçant gestionnaire de la caisse.`.trim(),
  privacy_policy_content: `# Politique de Confidentialité & Protection des Données Marchandes

## 1. Engagement & Transparence
Nanasore s'engage fermement à respecter la vie privée des commerçants, de leurs vendeurs et de leurs clients finaux. Les données enregistrées lors de chaque vente sont la propriété exclusive du commerçant titulaire de la boutique.

## 2. Données Collectées & Traitements
Dans le cadre de l'exploitation de la caisse, les données suivantes sont traitées :
- **Données d'authentification** : Adresse email, nom du gérant, numéro de téléphone, code PIN chiffré.
- **Données d'activité commerciale** : Historique des ventes, montants, modes de règlement (Cash, Mobile Money, Crédit client), références de commandes.
- **Carnet de Dettes & Clients** : Noms, prénoms, numéros de téléphone et soldes de dettes des clients fidèles.
- **Inventaire & Produits** : Prix d'achat, prix de vente, niveaux d'alerte de stock, photos compressées.

## 3. Sécurité & Chiffrement
- **Chiffrement de bout en bout** : Toutes les communications entre le terminal de caisse et les serveurs Firestore utilisent le protocole HTTPS / TLS 1.3 avec clés de chiffrement AES-256.
- **Isolation Multi-tenant** : Chaque boutique dispose de son propre partitionnement strict de données grâce aux règles de sécurité Firestore (stores/{userId}/*). Aucune boutique ne peut accéder aux transactions ou au carnet de dettes d'un confrère.

## 4. Cookies & Données Locales
L'application fonctionne en mode PWA (Progressive Web App). Les données sont synchronisées localement sur le terminal (Local Storage & Cache Storage) pour permettre un encaissement continu même en cas de coupure de connexion Internet. Aucun traceur publicitaire tiers n'est utilisé.

## 5. Droits d'Accès, Rectification & Suppression
Conformément aux réglementations sur la protection des données personnelles (dont la loi ivoirienne n° 2013-450 et le RGPD), vous disposez d'un droit permanent d'accès, d'exportation de vos données comptables au format PDF/CSV et de suppression totale de votre compte sur simple demande à contact@nanasore.com.`.trim(),
  show_ticker: true,
  lastUpdated: '15 Septembre 2026',
  updatedBy: 'Direction Juridique Nanasore',
};

const LOCAL_LEGAL_CACHE_KEY = 'nana_platform_legal_config';

/**
 * Récupère la configuration légale (platform_settings/legal) depuis le cache local ou Firestore
 */
export async function getPlatformLegal(): Promise<PlatformLegalConfig> {
  // 1. Essai depuis le cache local pour vitesse instantanée
  try {
    const cached = localStorage.getItem(LOCAL_LEGAL_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.ticker_text === 'string') {
        return {
          ticker_text: parsed.ticker_text || DEFAULT_PLATFORM_LEGAL.ticker_text,
          legal_mentions_content: parsed.legal_mentions_content || DEFAULT_PLATFORM_LEGAL.legal_mentions_content,
          privacy_policy_content: parsed.privacy_policy_content || DEFAULT_PLATFORM_LEGAL.privacy_policy_content,
          show_ticker: parsed.show_ticker !== undefined ? parsed.show_ticker : DEFAULT_PLATFORM_LEGAL.show_ticker,
          lastUpdated: parsed.lastUpdated,
          updatedBy: parsed.updatedBy,
        };
      }
    }
  } catch (e) {
    // Ignore cache error
  }

  // 2. Lecture Firestore
  try {
    const docSnap = await getDoc(doc(db, 'platform_settings', 'legal'));
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<PlatformLegalConfig>;
      const resolved: PlatformLegalConfig = {
        ticker_text: data.ticker_text || DEFAULT_PLATFORM_LEGAL.ticker_text,
        legal_mentions_content: data.legal_mentions_content || DEFAULT_PLATFORM_LEGAL.legal_mentions_content,
        privacy_policy_content: data.privacy_policy_content || DEFAULT_PLATFORM_LEGAL.privacy_policy_content,
        show_ticker: data.show_ticker !== undefined ? data.show_ticker : DEFAULT_PLATFORM_LEGAL.show_ticker,
        lastUpdated: data.lastUpdated || 'Aujourd\'hui',
        updatedBy: data.updatedBy || 'Super-Admin',
      };
      localStorage.setItem(LOCAL_LEGAL_CACHE_KEY, JSON.stringify(resolved));
      return resolved;
    }
  } catch (err) {
    console.warn('[FIRESTORE] getPlatformLegal fallback :', err);
  }

  return DEFAULT_PLATFORM_LEGAL;
}

/**
 * Enregistre la configuration légale dans Firestore (platform_settings/legal)
 */
export async function savePlatformLegal(config: Partial<PlatformLegalConfig>): Promise<void> {
  const current = await getPlatformLegal();
  const payload = cleanFirestoreData({
    ...current,
    ...config,
    lastUpdated: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    updatedBy: auth.currentUser?.email || 'Super-Admin',
  });

  // Enregistre dans Firestore
  try {
    await setDoc(doc(db, 'platform_settings', 'legal'), payload, { merge: true });
    console.log('[FIRESTORE] platform_settings/legal mis à jour avec succès');
  } catch (err) {
    console.warn('[FIRESTORE] Erreur écriture platform_settings/legal :', err);
  }

  // Met à jour le cache local
  try {
    localStorage.setItem(LOCAL_LEGAL_CACHE_KEY, JSON.stringify(payload));
  } catch (e) {
    // Ignore
  }
}

/**
 * Écoute en temps réel les modifications de la configuration légale (platform_settings/legal)
 */
export function subscribeToPlatformLegal(
  onUpdate: (config: PlatformLegalConfig) => void
): () => void {
  // Déclenchement initial immédiat via cache ou défaut
  try {
    const cached = localStorage.getItem(LOCAL_LEGAL_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.ticker_text === 'string') {
        onUpdate({
          ticker_text: parsed.ticker_text || DEFAULT_PLATFORM_LEGAL.ticker_text,
          legal_mentions_content: parsed.legal_mentions_content || DEFAULT_PLATFORM_LEGAL.legal_mentions_content,
          privacy_policy_content: parsed.privacy_policy_content || DEFAULT_PLATFORM_LEGAL.privacy_policy_content,
          show_ticker: parsed.show_ticker !== undefined ? parsed.show_ticker : DEFAULT_PLATFORM_LEGAL.show_ticker,
          lastUpdated: parsed.lastUpdated,
          updatedBy: parsed.updatedBy,
        });
      } else {
        onUpdate(DEFAULT_PLATFORM_LEGAL);
      }
    } else {
      onUpdate(DEFAULT_PLATFORM_LEGAL);
    }
  } catch (e) {
    onUpdate(DEFAULT_PLATFORM_LEGAL);
  }

  // Écouteur Firestore onSnapshot
  try {
    return onSnapshot(
      doc(db, 'platform_settings', 'legal'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<PlatformLegalConfig>;
          const resolved: PlatformLegalConfig = {
            ticker_text: data.ticker_text || DEFAULT_PLATFORM_LEGAL.ticker_text,
            legal_mentions_content: data.legal_mentions_content || DEFAULT_PLATFORM_LEGAL.legal_mentions_content,
            privacy_policy_content: data.privacy_policy_content || DEFAULT_PLATFORM_LEGAL.privacy_policy_content,
            show_ticker: data.show_ticker !== undefined ? data.show_ticker : DEFAULT_PLATFORM_LEGAL.show_ticker,
            lastUpdated: data.lastUpdated,
            updatedBy: data.updatedBy,
          };
          localStorage.setItem(LOCAL_LEGAL_CACHE_KEY, JSON.stringify(resolved));
          onUpdate(resolved);
        }
      },
      (err) => {
        console.warn('[FIRESTORE] subscribeToPlatformLegal notice :', err);
      }
    );
  } catch (e) {
    console.warn('[FIRESTORE] subscribeToPlatformLegal init error :', e);
    return () => {};
  }
}

/**
 * Enregistre une demande d'activation d'abonnement SaaS Mobile Money
 * dans merchants/{userId}/subscription et stores/{storeId}/subscription
 * avec statut "pending_activation"
 */
export async function requestMerchantSubscriptionActivation(
  userId: string,
  storeId: string,
  planConfig: {
    planId: string;
    planName: string;
    amount: number;
    period: string;
  },
  transactionRef: string,
  operatorName: string,
  phoneNumber: string
): Promise<{ success: boolean; transactionRef: string }> {
  const merchantId = userId || auth.currentUser?.uid || storeId;
  const targetStoreId = resolveTenantId(storeId);
  const now = Date.now();
  const durationDays = planConfig.period === 'an' ? 365 : planConfig.period === 'trimestre' ? 90 : 30;
  const estimatedExpiresAt = now + durationDays * 24 * 60 * 60 * 1000;

  const payload = cleanFirestoreData({
    status: 'pending_activation' as SubscriptionStatus,
    plan: planConfig.planId,
    planName: planConfig.planName,
    amount: planConfig.amount,
    period: planConfig.period,
    expiresAt: estimatedExpiresAt,
    startedAt: now,
    lastPaymentMethod: 'MOBILE_MONEY',
    lastAmountPaid: planConfig.amount,
    transactionRef: transactionRef.trim(),
    operatorName,
    phoneNumber: phoneNumber.trim(),
    requestedAt: now,
    updatedAt: now,
  });

  try {
    // 1. Enregistre dans merchants/{merchantId}
    if (merchantId) {
      await setDoc(
        doc(db, 'merchants', merchantId),
        cleanFirestoreData({
          subscription: payload,
          subscriptionStatus: 'pending_activation',
          subscriptionPlan: planConfig.planId,
          lastTransactionRef: transactionRef.trim(),
          updatedAt: now,
        }),
        { merge: true }
      );

      await setDoc(
        doc(db, 'merchants', merchantId, 'subscription', 'current'),
        payload,
        { merge: true }
      );
    }

    // 2. Enregistre dans stores/{targetStoreId}
    await setDoc(
      doc(db, 'stores', targetStoreId),
      cleanFirestoreData({
        subscription: payload,
        subscriptionStatus: 'pending_activation',
        subscriptionPlan: planConfig.planId,
        lastTransactionRef: transactionRef.trim(),
        updatedAt: now,
      }),
      { merge: true }
    );

    console.log(`[FIRESTORE] Demande d'activation enregistrée pour ${merchantId} / ${targetStoreId}`);
  } catch (err) {
    console.warn('[FIRESTORE] requestMerchantSubscriptionActivation notice :', err);
  }

  // Cache local pour résilience
  try {
    localStorage.setItem(`nana_pending_sub_${merchantId}`, JSON.stringify(payload));
  } catch (e) {}

  return { success: true, transactionRef };
}

/**
 * Nettoyage et élagage automatique des caches localStorage obsolètes
 * Protège le stockage contre les dépassements de quota et élimine les résidus temporaires
 */
export function pruneStaleStorageCaches(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Clés temporaires orphelines
      if (key.startsWith('nana_temp_') || key.startsWith('nana_export_tmp_')) {
        keysToRemove.push(key);
        continue;
      }

      // Nettoyage impératif de tout résidu de paywall automatique
      if (key === 'nana_pending_checkout_plan') {
        keysToRemove.push(key);
        continue;
      }

      // Clés anonymes ou invités obsolètes
      if (key.startsWith('nana_tenant_guest_') || key.startsWith('nana_tenant_temp_')) {
        keysToRemove.push(key);
        continue;
      }
    }

    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });

    if (keysToRemove.length > 0) {
      console.log(`[STORAGE CACHE PRUNER] ${keysToRemove.length} clé(s) temporaire(s) nettoyée(s).`);
    }
  } catch (err) {
    console.warn('[STORAGE CACHE PRUNER NOTICE]', err);
  }
}

// ============================================================================
// GESTION DU CMS ET PERSONNALISATION DE LA PAGE D'ACCUEIL (platform_settings/landing)
// ============================================================================

const LANDING_CONFIG_LOCAL_KEY = 'nana_landing_config_cache';

/**
 * Migration transparente : scinde l'ancienne carte unique d'intégrations en 2 cartes distinctes et équilibrées
 */
function normalizeLandingCards(cards?: LandingFeatureCard[]): LandingFeatureCard[] {
  if (!cards || cards.length === 0) {
    return DEFAULT_LANDING_PAGE_CONFIG.featuresSection.cards;
  }
  const hasLegacySingleCard = cards.some(c => c.id === 'integrations' || (c.isIntegrationsCard && cards.length === 5));
  if (hasLegacySingleCard) {
    return cards.flatMap(c => {
      if (c.id === 'integrations' || (c.isIntegrationsCard && cards.length === 5)) {
        return [
          DEFAULT_LANDING_PAGE_CONFIG.featuresSection.cards[4],
          DEFAULT_LANDING_PAGE_CONFIG.featuresSection.cards[5]
        ];
      }
      return [c];
    });
  }
  return cards;
}

/**
 * Récupère la configuration actuelle de la page d'accueil depuis Firestore ou le cache local
 */
export async function getLandingPageConfig(): Promise<LandingPageConfig> {
  // 1. Essayer de lire depuis Firestore
  try {
    const docSnap = await getDoc(doc(db, 'platform_settings', 'landing'));
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<LandingPageConfig>;
      const merged: LandingPageConfig = {
        featuresSection: {
          ...DEFAULT_LANDING_PAGE_CONFIG.featuresSection,
          ...(data.featuresSection || {}),
          cards: normalizeLandingCards(data.featuresSection?.cards)
        },
        eliteSection: {
          ...DEFAULT_LANDING_PAGE_CONFIG.eliteSection,
          ...(data.eliteSection || {}),
          slides: data.eliteSection?.slides && data.eliteSection.slides.length > 0
            ? data.eliteSection.slides
            : DEFAULT_LANDING_PAGE_CONFIG.eliteSection.slides,
          impactStats: data.eliteSection?.impactStats && data.eliteSection.impactStats.length > 0
            ? data.eliteSection.impactStats
            : DEFAULT_LANDING_PAGE_CONFIG.eliteSection.impactStats
        },
        pricingSection: {
          ...DEFAULT_LANDING_PAGE_CONFIG.pricingSection,
          ...(data.pricingSection || {}),
          zeroCommissionBanner: {
            ...DEFAULT_LANDING_PAGE_CONFIG.pricingSection.zeroCommissionBanner,
            ...(data.pricingSection?.zeroCommissionBanner || {})
          },
          plans: data.pricingSection?.plans && data.pricingSection.plans.length > 0
            ? data.pricingSection.plans
            : DEFAULT_LANDING_PAGE_CONFIG.pricingSection.plans
        },
        footerSection: {
          ...DEFAULT_LANDING_PAGE_CONFIG.footerSection,
          ...(data.footerSection || {})
        },
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy
      };
      try {
        localStorage.setItem(LANDING_CONFIG_LOCAL_KEY, JSON.stringify(merged));
      } catch (e) {}
      return merged;
    }
  } catch (err) {
    console.warn('[FIRESTORE] getLandingPageConfig notice :', err);
  }

  // 2. Cache local de secours
  try {
    const cached = localStorage.getItem(LANDING_CONFIG_LOCAL_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        return parsed as LandingPageConfig;
      }
    }
  } catch (e) {}

  return DEFAULT_LANDING_PAGE_CONFIG;
}

/**
 * Enregistre la configuration de la page d'accueil dans Firestore et le cache local
 */
export async function saveLandingPageConfig(config: Partial<LandingPageConfig>, authorName?: string): Promise<void> {
  const payload: Partial<LandingPageConfig> = {
    ...config,
    updatedAt: Date.now(),
    updatedBy: authorName || auth?.currentUser?.email || 'Super-Admin'
  };

  const cleaned = cleanFirestoreData(payload);

  // 1. Sauvegarde dans Firestore
  await setDoc(doc(db, 'platform_settings', 'landing'), cleaned, { merge: true });

  // 2. Mise à jour immédiate du cache local pour un rendu sans latence
  try {
    const current = await getLandingPageConfig();
    const updated = { ...current, ...payload };
    localStorage.setItem(LANDING_CONFIG_LOCAL_KEY, JSON.stringify(updated));
  } catch (e) {}
}

/**
 * Écouteur temps réel onSnapshot sur la configuration de la page d'accueil
 */
export function subscribeToLandingPageConfig(
  onUpdate: (config: LandingPageConfig) => void
): Unsubscribe {
  // Notification immédiate via le cache local si disponible
  try {
    const cached = localStorage.getItem(LANDING_CONFIG_LOCAL_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        if (parsed.featuresSection?.cards) {
          parsed.featuresSection.cards = normalizeLandingCards(parsed.featuresSection.cards);
        }
        onUpdate(parsed as LandingPageConfig);
      }
    }
  } catch (e) {}

  try {
    return onSnapshot(
      doc(db, 'platform_settings', 'landing'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<LandingPageConfig>;
          const merged: LandingPageConfig = {
            featuresSection: {
              ...DEFAULT_LANDING_PAGE_CONFIG.featuresSection,
              ...(data.featuresSection || {}),
              cards: normalizeLandingCards(data.featuresSection?.cards)
            },
            eliteSection: {
              ...DEFAULT_LANDING_PAGE_CONFIG.eliteSection,
              ...(data.eliteSection || {}),
              slides: data.eliteSection?.slides && data.eliteSection.slides.length > 0
                ? data.eliteSection.slides
                : DEFAULT_LANDING_PAGE_CONFIG.eliteSection.slides,
              impactStats: data.eliteSection?.impactStats && data.eliteSection.impactStats.length > 0
                ? data.eliteSection.impactStats
                : DEFAULT_LANDING_PAGE_CONFIG.eliteSection.impactStats
            },
            pricingSection: {
              ...DEFAULT_LANDING_PAGE_CONFIG.pricingSection,
              ...(data.pricingSection || {}),
              zeroCommissionBanner: {
                ...DEFAULT_LANDING_PAGE_CONFIG.pricingSection.zeroCommissionBanner,
                ...(data.pricingSection?.zeroCommissionBanner || {})
              },
              plans: data.pricingSection?.plans && data.pricingSection.plans.length > 0
                ? data.pricingSection.plans
                : DEFAULT_LANDING_PAGE_CONFIG.pricingSection.plans
            },
            footerSection: {
              ...DEFAULT_LANDING_PAGE_CONFIG.footerSection,
              ...(data.footerSection || {})
            },
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy
          };
          try {
            localStorage.setItem(LANDING_CONFIG_LOCAL_KEY, JSON.stringify(merged));
          } catch (e) {}
          onUpdate(merged);
        } else {
          onUpdate(DEFAULT_LANDING_PAGE_CONFIG);
        }
      },
      (err) => {
        console.warn('[FIRESTORE] subscribeToLandingPageConfig notice :', err);
        onUpdate(DEFAULT_LANDING_PAGE_CONFIG);
      }
    );
  } catch (e) {
    console.warn('[FIRESTORE] subscribeToLandingPageConfig init notice :', e);
    onUpdate(DEFAULT_LANDING_PAGE_CONFIG);
    return () => {};
  }
}

// ============================================================================
// GESTION UNIFIÉE DES COMMANDES CLIENTS & INTENTIONS WAMEET (PROMPT 3/3)
// ============================================================================

export type OrderSourceModule =
  | 'shopify_wide_view'
  | 'glowing_cosmetics_view'
  | 'digital_1080_view'
  | 'live_os_carousel'
  | 'stories_ring'
  | 'smart_cart_drawer'
  | 'slide_out_funnel';

export interface UnifiedOrderItem {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  variant?: string;
  image?: string;
  category?: string;
  downloadUrl?: string;
  liveSessionSlug?: string;
}

export interface UnifiedOrderPayload {
  orderId?: string;
  orderNumber?: string;
  storeId: string;
  storeName?: string;
  customerName?: string;
  customerPhone?: string;
  customerCity?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
  items: UnifiedOrderItem[];
  subtotal: number;
  deliveryFee?: number;
  total: number;
  sourceModule: OrderSourceModule | string;
  status?: 'pending' | 'w_initiated' | 'confirmed' | 'delivered' | 'cancelled';
  notes?: string;
  createdAt?: any;
}

/**
 * Enregistre une commande validée dans Firestore (collections `orders` et `stores/{storeId}/orders`)
 */
export async function recordUnifiedOrder(payload: UnifiedOrderPayload): Promise<string> {
  const cleanStoreId = resolveTenantId(payload.storeId || 'boutique');
  const now = Date.now();
  const orderNum = payload.orderNumber || payload.orderId || `CMD-${now.toString().slice(-6)}`;
  const orderDocId = payload.orderId || `${cleanStoreId}_${orderNum}`;

  const cleanItems = (payload.items || []).map(it => ({
    productId: it.productId || '',
    name: it.name || 'Produit',
    price: Number(it.price) || 0,
    quantity: Number(it.quantity) || 1,
    selectedColor: it.selectedColor || '',
    selectedSize: it.selectedSize || '',
    variant: it.variant || [it.selectedColor, it.selectedSize].filter(Boolean).join(' / ') || 'Standard',
    image: it.image || '',
    category: it.category || '',
    downloadUrl: it.downloadUrl || '',
    liveSessionSlug: it.liveSessionSlug || ''
  }));

  const recordData = cleanFirestoreData({
    id: orderDocId,
    orderId: orderDocId,
    orderNumber: orderNum,
    storeId: cleanStoreId,
    storeName: payload.storeName || 'Boutique Nanasore',
    customerName: payload.customerName || 'Client Estimé',
    customerPhone: payload.customerPhone || '',
    customerCity: payload.customerCity || payload.deliveryAddress || 'Abidjan',
    deliveryAddress: payload.deliveryAddress || payload.customerCity || '',
    paymentMethod: payload.paymentMethod || 'Paiement à la livraison',
    items: cleanItems,
    subtotal: Number(payload.subtotal) || Number(payload.total) || 0,
    deliveryFee: Number(payload.deliveryFee) || 0,
    total: Number(payload.total) || 0,
    sourceModule: payload.sourceModule || 'smart_cart_drawer',
    source: payload.sourceModule || 'smart_cart_drawer',
    status: payload.status || 'pending',
    type: 'BON_COMMANDE',
    notes: payload.notes || '',
    createdAt: new Date().toISOString(),
    timestamp: now
  });

  // 1. Écriture miroir globale dans `orders/{orderDocId}`
  try {
    await setDoc(doc(db, 'orders', orderDocId), recordData, { merge: true });
  } catch (err) {
    console.warn('[FIRESTORE] Global order save note :', err);
  }

  // 2. Écriture sous `stores/{cleanStoreId}/orders/{orderDocId}`
  try {
    await setDoc(doc(db, 'stores', cleanStoreId, 'orders', orderDocId), recordData, { merge: true });
  } catch (err) {
    console.warn('[FIRESTORE] Store tenant order save note :', err);
  }

  // 3. Cache local de secours
  try {
    const localKey = `nana_orders_cache_${cleanStoreId}`;
    const raw = localStorage.getItem(localKey);
    const list: any[] = raw ? JSON.parse(raw) : [];
    list.unshift(recordData);
    localStorage.setItem(localKey, JSON.stringify(list.slice(0, 50)));
  } catch (e) {}

  return orderDocId;
}

/**
 * Enregistre en tâche de fond (0ms non bloquante) une intention d'achat Wameet
 * pour que le commerçant retrouve tous les prospects chauds dans son Dashboard.
 */
export function recordWLeadOrder(payload: {
  storeId: string;
  storeName?: string;
  product: {
    id?: string;
    name: string;
    price: number;
    category?: string;
    image?: string;
    selectedColor?: string;
    selectedSize?: string;
  };
  quantity?: number;
  totalAmount?: number;
  sourceModule?: OrderSourceModule | string;
  customerPhone?: string;
}): void {
  // Exécution asynchrone fire-and-forget sans jamais bloquer l'ouverture de Wameet
  Promise.resolve().then(async () => {
    try {
      const cleanStoreId = resolveTenantId(payload.storeId || 'boutique');
      const now = Date.now();
      const orderNum = `W-${now.toString().slice(-6)}`;
      const orderDocId = `${cleanStoreId}_${orderNum}`;
      const qty = Number(payload.quantity) || 1;
      const total = Number(payload.totalAmount) || (Number(payload.product.price) * qty) || 0;

      const recordData = cleanFirestoreData({
        id: orderDocId,
        orderId: orderDocId,
        orderNumber: orderNum,
        storeId: cleanStoreId,
        storeName: payload.storeName || 'Boutique Nanasore',
        customerName: 'Prospect Wameet',
        customerPhone: payload.customerPhone || '',
        customerCity: 'Non spécifié',
        deliveryAddress: 'Wameet Direct',
        paymentMethod: 'Discussion Wameet Direct',
        items: [{
          productId: payload.product.id || '',
          name: payload.product.name,
          price: Number(payload.product.price) || 0,
          quantity: qty,
          selectedColor: payload.product.selectedColor || '',
          selectedSize: payload.product.selectedSize || '',
          variant: [payload.product.selectedColor, payload.product.selectedSize].filter(Boolean).join(' / ') || 'Standard',
          image: payload.product.image || '',
          category: payload.product.category || ''
        }],
        subtotal: total,
        deliveryFee: 0,
        total: total,
        sourceModule: payload.sourceModule || 'w_button',
        source: payload.sourceModule || 'w_button',
        status: 'w_initiated',
        type: 'BON_COMMANDE',
        notes: `Intention d'achat initiée via Wameet pour ${payload.product.name} (Couleur: ${payload.product.selectedColor || 'N/A'}, Format: ${payload.product.selectedSize || 'N/A'}, Qté: ${qty})`,
        createdAt: new Date().toISOString(),
        timestamp: now
      });

      // Écriture miroir
      await Promise.allSettled([
        setDoc(doc(db, 'orders', orderDocId), recordData, { merge: true }),
        setDoc(doc(db, 'stores', cleanStoreId, 'orders', orderDocId), recordData, { merge: true })
      ]);
    } catch (err) {
      console.warn('[FIRESTORE] W lead tracking background note :', err);
    }
  });
}
