/**
 * Service Central Super Admin
 * Gère la persistance synchrone et asynchrone absolue dans Firebase Realtime Database
 * (https://pos-app-1759a-default-rtdb.firebaseio.com/super_admin_settings.json)
 * ainsi que dans le localStorage et le bus d'événements de l'application (superAdminUpdated).
 */

import { 
  PlatformSubscriptionConfig, 
  CentralPaymentConfig, 
  StoreApprovalStatus, 
  SaasStore,
  PlatformLegalConfig,
  LandingPageConfig,
  SubscriptionPlanConfig
} from '../types';
import { DEFAULT_PLATFORM_SUBSCRIPTIONS, cleanFirestoreData } from '../utils/firestoreService';
import { DEFAULT_CENTRAL_PAYMENT_CONFIG } from '../utils/countryPaymentMatrix';
import { auth, db, RTDB_DEFAULT_URL } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';

export const RTDB_SUPER_ADMIN_URL = 'https://pos-app-1759a-default-rtdb.firebaseio.com/super_admin_settings.json';
export const RTDB_MERCHANTS_BASE_URL = 'https://pos-app-1759a-default-rtdb.firebaseio.com/merchants';
export const LOCAL_SUPER_ADMIN_KEY = 'nana_super_admin_settings';

/**
 * Liste officielle des UIDs autorisés Super-Admin Nanasore (Firebase RTDB /admins/{uid})
 */
export const KNOWN_SUPERADMIN_UIDS = [
  'Jz9wo3HN4YXdgTnYtDJFsNvnJKv1', // Administrateur Officiel pousbila36
  'rgLiIgFUFjQLfjzPlmSY9jy6mBE3'  // Administrateur Officiel pousbila04
];

/**
 * Liste blanche officielle des emails Super-Admin autorisés
 */
export const SUPER_ADMIN_EMAILS = [
  'pousbila36@gmail.com',
  'pousbila04@gmail.com',
  'contact@nanasore.com',
  'admin@nanasore.com'
];

export const KNOWN_SUPERADMIN_EMAILS = SUPER_ADMIN_EMAILS;

export interface SuperAdminSettings {
  platformConfig?: PlatformSubscriptionConfig;
  centralPaymentConfig?: CentralPaymentConfig;
  paymentRouting?: {
    orangeNumber?: string;
    moovNumber?: string;
    waveNumber?: string;
    mtnNumber?: string;
    wavePaymentLink?: string;
    enabledMethods?: string[];
  };
  approvalStatuses?: Record<string, StoreApprovalStatus>;
  stores?: SaasStore[];
  creditsByUid?: Record<string, number>;
  legalConfig?: PlatformLegalConfig;
  landingConfig?: LandingPageConfig;
  lastUpdated?: number;
  updatedBy?: string;
  [key: string]: any;
}

// Mémoire vive pour accès synchrone instantané
let memoryCache: SuperAdminSettings | null = null;

/**
 * Obtient le jeton d'authentification Firebase Auth pour autoriser les requêtes RTDB sans erreur 401
 */
export async function getRtdbAuthToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
  } catch (err) {
    console.warn('[SUPER_ADMIN_SERVICE] Impossible d\'obtenir le jeton Auth RTDB:', err);
  }
  return null;
}

/**
 * Promeut l'utilisateur localement au rôle SUPER_ADMIN et débloque tous les accès
 */
export function promoteSuperAdminLocally(uid?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('nana_is_superadmin', 'true');
    localStorage.setItem('nana_superadmin_unlocked', 'true');
    localStorage.setItem('nana_registered_role', 'admin');
    localStorage.setItem('nana_kyc_status', 'verified');
    localStorage.setItem('nana_store_approval_status', 'APPROVED');
    localStorage.setItem('nana_user_plan', 'elite');

    // Mettre à jour nana_store_auth_user
    const savedUser = localStorage.getItem('nana_store_auth_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && typeof parsed === 'object') {
          parsed.role = 'SUPER_ADMIN';
          parsed.isSuperAdmin = true;
          parsed.kycStatus = 'verified';
          parsed.storeApprovalStatus = 'APPROVED';
          parsed.plan = 'elite';
          parsed.subscriptionStatus = 'active';
          localStorage.setItem('nana_store_auth_user', JSON.stringify(parsed));
        }
      } catch {}
    }

    // Déclencher un événement système global
    window.dispatchEvent(new CustomEvent('superAdminStatusVerified', {
      detail: { isSuperAdmin: true, uid: uid || 'super-admin' }
    }));
    window.dispatchEvent(new Event('superAdminUpdated'));
  } catch (e) {
    console.warn('[SUPER_ADMIN_SERVICE] Erreur promoteSuperAdminLocally:', e);
  }
}

/**
 * Vérifie de façon synchrone si l'utilisateur courant possède le statut Super Admin
 */
export function isSuperAdminLocally(user?: { id?: string; uid?: string; email?: string; role?: string; isSuperAdmin?: boolean } | null): boolean {
  if (typeof window === 'undefined') return false;

  const currentAuth = auth.currentUser;
  const targetUid = user?.id || user?.uid || currentAuth?.uid || '';
  const targetEmail = (user?.email || currentAuth?.email || '').toLowerCase();

  // Révocation absolue du compte obsolète
  if (targetEmail === 'ibrahimcanva111@gmail.com' || targetUid === 'REXOSTjomRXXIMAT8bcHbVVaqeR2') {
    return false;
  }

  if (targetUid && KNOWN_SUPERADMIN_UIDS.includes(targetUid)) return true;
  if (targetEmail && KNOWN_SUPERADMIN_EMAILS.includes(targetEmail)) return true;

  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.isSuperAdmin === true) return true;

  try {
    if (
      localStorage.getItem('nana_is_superadmin') === 'true' ||
      localStorage.getItem('nana_superadmin_unlocked') === 'true' ||
      localStorage.getItem('nana_registered_role') === 'admin'
    ) {
      return true;
    }
  } catch {}

  return false;
}

/**
 * Vérifie et valide les droits Super Admin de l'utilisateur connecté dans Firebase
 * (Lecture du nœud /admins/{uid} en RTDB et de la collection admins/{uid} en Firestore)
 */
export async function verifySuperAdminPrivileges(userArg?: FirebaseUser | null): Promise<boolean> {
  const user = userArg || auth.currentUser;
  const uid = user?.uid || (typeof window !== 'undefined' ? (localStorage.getItem('nana_store_auth_user') ? JSON.parse(localStorage.getItem('nana_store_auth_user') || '{}')?.id : null) : null);
  const email = user?.email?.toLowerCase() || '';

  // 1. Validation immédiate par UID officiel connu (Zéro latence)
  if (uid && KNOWN_SUPERADMIN_UIDS.includes(uid)) {
    promoteSuperAdminLocally(uid);
    return true;
  }

  // 2. Validation immédiate par email officiel connu
  if (email && KNOWN_SUPERADMIN_EMAILS.includes(email)) {
    promoteSuperAdminLocally(uid || 'admin');
    return true;
  }

  // Si aucun UID actif, vérifier le cache local
  if (!uid) {
    return isSuperAdminLocally();
  }

  let isAdminConfirmed = false;

  // 3. Vérification dans Firebase Realtime Database : /admins/{uid}.json avec jeton sécurisé
  try {
    const token = await getRtdbAuthToken();
    const rtdbUrl = `https://pos-app-1759a-default-rtdb.firebaseio.com/admins/${uid}.json${token ? `?auth=${encodeURIComponent(token)}` : ''}`;
    const res = await fetch(rtdbUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (res.ok) {
      const val = await res.json();
      if (val === true || (typeof val === 'object' && val !== null && val.active !== false)) {
        isAdminConfirmed = true;
      }
    } else if (res.status === 401) {
      console.info('[SUPER_ADMIN_SERVICE] Lecture RTDB /admins/ 401 non critique. Poursuite des validations.');
    }
  } catch (err) {
    console.warn('[SUPER_ADMIN_SERVICE] Vérification RTDB /admins non-bloquante:', err);
  }

  // 4. Vérification complémentaire dans Cloud Firestore : admins/{uid}
  if (!isAdminConfirmed) {
    try {
      const adminDocRef = doc(db, 'admins', uid);
      const snap = await getDoc(adminDocRef);
      if (snap.exists()) {
        const d = snap.data();
        if (d?.active !== false) {
          isAdminConfirmed = true;
        }
      }
    } catch (err) {
      // Ignorer si hors-ligne
    }
  }

  if (isAdminConfirmed) {
    promoteSuperAdminLocally(uid);
    return true;
  }

  return isSuperAdminLocally();
}

/**
 * Récupère immédiatement la configuration Super Admin depuis le cache mémoire ou localStorage
 */
export function getSuperAdminSettingsLocal(): SuperAdminSettings | null {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(LOCAL_SUPER_ADMIN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        memoryCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[SUPER_ADMIN_SERVICE] Erreur lecture localStorage:', e);
  }

  return null;
}

/**
 * Récupère la configuration en direct depuis Firebase Realtime Database
 * Protégé contre les requêtes superflues 401 sur les vitrines publiques client
 */
export async function fetchSuperAdminSettingsFromFirebase(): Promise<SuperAdminSettings | null> {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || '';
    const pathname = window.location.pathname || '';
    const isPublicStorefront = 
      hostname.includes('nsore.shop') ||
      pathname.startsWith('/s/') ||
      pathname.startsWith('/shop/') ||
      pathname.startsWith('/boutique/') ||
      pathname.startsWith('/store/') ||
      pathname.startsWith('/vitrine/') ||
      /^\/[a-z0-9]+\/[^/?#]+/i.test(pathname);

    // Sur une vitrine publique (visiteur anonyme), ne JAMAIS déclencher de requête vers /super_admin_settings (évite tout 401)
    if (isPublicStorefront && !isSuperAdminLocally()) {
      return getSuperAdminSettingsLocal();
    }
  }

  // Ne pas tenter d'interroger la RTDB sans privilèges d'administrateur
  if (!isSuperAdminLocally() && !auth.currentUser) {
    return getSuperAdminSettingsLocal();
  }

  try {
    const token = await getRtdbAuthToken();
    // Sans jeton auth, RTDB super_admin_settings retournera systématiquement 401
    if (!token && !isSuperAdminLocally()) {
      return getSuperAdminSettingsLocal();
    }

    const queryParts = [`t=${Date.now()}`];
    if (token) queryParts.push(`auth=${encodeURIComponent(token)}`);
    const sep = RTDB_SUPER_ADMIN_URL.includes('?') ? '&' : '?';
    const finalUrl = `${RTDB_SUPER_ADMIN_URL}${sep}${queryParts.join('&')}`;

    const res = await fetch(finalUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        // Sauvegarde locale
        memoryCache = data;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_SUPER_ADMIN_KEY, JSON.stringify(data));
            
            // Mise à jour des clés secondaires pour compatibilité rétroactive
            if (data.platformConfig) {
              localStorage.setItem('nana_platform_subscriptions', JSON.stringify(data.platformConfig));
            }
            if (data.centralPaymentConfig) {
              localStorage.setItem('nana_central_payment_config', JSON.stringify(data.centralPaymentConfig));
            }
            if (data.approvalStatuses) {
              localStorage.setItem('nana_approval_statuses', JSON.stringify(data.approvalStatuses));
            }
          } catch (e) {
            console.warn('[SUPER_ADMIN_SERVICE] Erreur écriture cache:', e);
          }

          // Déclencher l'événement de mise à jour immédiate
          window.dispatchEvent(new CustomEvent('superAdminUpdated', { detail: data }));
          window.dispatchEvent(new Event('superAdminUpdated'));
        }
        return data;
      }
    } else if (res.status === 401) {
      // 401 Unauthorized silencieux : repli immédiat sur le cache local
      return getSuperAdminSettingsLocal();
    }
  } catch (e) {
    // Erreur réseau silencieuse
  }

  return getSuperAdminSettingsLocal();
}

/**
 * Sauvegarde persistante dans Firebase Realtime Database ET localStorage
 */
export async function saveSuperAdminSettings(
  partialSettings: Partial<SuperAdminSettings>,
  updatedBy: string = 'Super-Admin'
): Promise<{ success: boolean; data: SuperAdminSettings }> {
  // Récupérer la configuration existante
  const current = getSuperAdminSettingsLocal() || {};

  // Fusion profonde
  const updated: SuperAdminSettings = {
    ...current,
    ...partialSettings,
    platformConfig: partialSettings.platformConfig 
      ? { ...current.platformConfig, ...partialSettings.platformConfig } 
      : current.platformConfig,
    centralPaymentConfig: partialSettings.centralPaymentConfig
      ? { ...current.centralPaymentConfig, ...partialSettings.centralPaymentConfig }
      : current.centralPaymentConfig,
    paymentRouting: {
      ...(current.paymentRouting || {}),
      ...(partialSettings.paymentRouting || {})
    },
    approvalStatuses: {
      ...(current.approvalStatuses || {}),
      ...(partialSettings.approvalStatuses || {})
    },
    creditsByUid: {
      ...(current.creditsByUid || {}),
      ...(partialSettings.creditsByUid || {})
    },
    stores: partialSettings.stores || current.stores,
    legalConfig: partialSettings.legalConfig ? { ...current.legalConfig, ...partialSettings.legalConfig } : current.legalConfig,
    landingConfig: partialSettings.landingConfig ? { ...current.landingConfig, ...partialSettings.landingConfig } : current.landingConfig,
    lastUpdated: Date.now(),
    updatedBy: updatedBy || 'Super-Admin'
  };

  // Mettre à jour le cache mémoire
  memoryCache = updated;

  // 1. Sauvegarde synchrone dans localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_SUPER_ADMIN_KEY, JSON.stringify(updated));
      
      // Synchronisation des clés secondaires
      if (updated.platformConfig) {
        localStorage.setItem('nana_platform_subscriptions', JSON.stringify(updated.platformConfig));
      }
      if (updated.centralPaymentConfig) {
        localStorage.setItem('nana_central_payment_config', JSON.stringify(updated.centralPaymentConfig));
      }
      if (updated.approvalStatuses) {
        localStorage.setItem('nana_approval_statuses', JSON.stringify(updated.approvalStatuses));
      }
      if (updated.paymentRouting) {
        localStorage.setItem('nanasore_payment_routing_settings', JSON.stringify({
          orangeNumber: updated.paymentRouting.orangeNumber,
          moovNumber: updated.paymentRouting.moovNumber,
          waveNumber: updated.paymentRouting.waveNumber,
          mtnNumber: updated.paymentRouting.mtnNumber,
          wavePaymentLink: updated.paymentRouting.wavePaymentLink,
          enabledMethods: updated.paymentRouting.enabledMethods
        }));
      }
    } catch (e) {
      console.warn('[SUPER_ADMIN_SERVICE] Erreur localStorage:', e);
    }
  }

  // 2. Sauvegarde persistante dans Firebase Realtime Database
  let rtdbSuccess = false;
  try {
    const token = await getRtdbAuthToken();
    const putUrl = token ? `${RTDB_SUPER_ADMIN_URL}?auth=${encodeURIComponent(token)}` : RTDB_SUPER_ADMIN_URL;
    const res = await fetch(putUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    rtdbSuccess = res.ok;
    if (!res.ok) {
      console.warn(`[SUPER_ADMIN_SERVICE] Échec HTTP écriture RTDB super_admin_settings: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.warn('[SUPER_ADMIN_SERVICE] Échec écriture Firebase RTDB super_admin_settings:', err);
  }

  // 3. Sauvegarde dans les nœuds marchands individuels si des statuts d'approbation ont été modifiés
  if (partialSettings.approvalStatuses) {
    try {
      const token = await getRtdbAuthToken();
      await Promise.all(
        Object.entries(partialSettings.approvalStatuses).map(async ([storeId, status]) => {
          const merchantUrl = `${RTDB_MERCHANTS_BASE_URL}/${storeId}/approvalStatus.json${token ? `?auth=${encodeURIComponent(token)}` : ''}`;
          await fetch(merchantUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(status)
          }).catch(() => {});
        })
      );
    } catch (e) {
      console.warn('[SUPER_ADMIN_SERVICE] Synchronisation nœuds marchands RTDB:', e);
    }
  }

  // 4. Déclencher immédiatement l'événement de rafraîchissement global
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('superAdminUpdated', { detail: updated }));
    window.dispatchEvent(new Event('superAdminUpdated'));
  }

  return { success: rtdbSuccess, data: updated };
}

/**
 * Initialise les écouteurs et le chargement au démarrage de l'application
 */
export function initSuperAdminSync(): () => void {
  // 1. Ne charger depuis Firebase RTDB que si ce n'est PAS une vitrine publique anonyme
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || '';
    const pathname = window.location.pathname || '';
    const isPublicStorefront = 
      hostname.includes('nsore.shop') || 
      pathname.startsWith('/s/') || 
      pathname.startsWith('/shop/') || 
      pathname.startsWith('/boutique/') ||
      pathname.startsWith('/vitrine/') ||
      /^\/[a-z0-9]+\/[^/?#]+/i.test(pathname);

    if (!isPublicStorefront && (isSuperAdminLocally() || auth.currentUser)) {
      fetchSuperAdminSettingsFromFirebase();
    }
  } else {
    fetchSuperAdminSettingsFromFirebase();
  }

  // 2. Écouteur sur le storage cross-tab
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === LOCAL_SUPER_ADMIN_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        memoryCache = parsed;
        window.dispatchEvent(new CustomEvent('superAdminUpdated', { detail: parsed }));
        window.dispatchEvent(new Event('superAdminUpdated'));
      } catch {}
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageChange);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageChange);
    }
  };
}

/**
 * Récupère les limites de plan configurées par le Super Admin ou les limites par défaut
 */
export function getSuperAdminPlanLimits(planId: string): any {
  const settings = getSuperAdminSettingsLocal();
  if (settings?.platformConfig?.plans && Array.isArray(settings.platformConfig.plans)) {
    const plan = settings.platformConfig.plans.find(
      (p: SubscriptionPlanConfig) => p.id?.toLowerCase() === planId.toLowerCase()
    );
    if (plan && plan.limits) {
      return plan.limits;
    }
  }
  return null;
}

/**
 * Récupère l'intégralité de la configuration des formules SaaS avec priorité Super Admin
 */
export function getSuperAdminPlatformConfig(): PlatformSubscriptionConfig {
  const settings = getSuperAdminSettingsLocal();
  if (settings?.platformConfig && Array.isArray(settings.platformConfig.plans) && settings.platformConfig.plans.length > 0) {
    return settings.platformConfig;
  }
  return DEFAULT_PLATFORM_SUBSCRIPTIONS;
}

/**
 * Récupère la configuration centrale de paiement avec priorité Super Admin
 */
export function getSuperAdminCentralPaymentConfig(): CentralPaymentConfig {
  const settings = getSuperAdminSettingsLocal();
  if (settings?.centralPaymentConfig) {
    return settings.centralPaymentConfig;
  }
  return DEFAULT_CENTRAL_PAYMENT_CONFIG;
}

/**
 * Récupère les plans d'abonnement avec priorité absolue aux réglages Super Admin
 */
export function getSuperAdminPlans(): SubscriptionPlanConfig[] {
  const settings = getSuperAdminSettingsLocal();
  if (settings?.platformConfig?.plans && Array.isArray(settings.platformConfig.plans) && settings.platformConfig.plans.length > 0) {
    return settings.platformConfig.plans;
  }
  return DEFAULT_PLATFORM_SUBSCRIPTIONS.plans;
}

/**
 * Récupère les numéros de réception Mobile Money configurés par le Super Admin
 */
export function getSuperAdminPaymentNumbers(): {
  orangeNumber: string;
  moovNumber: string;
  waveNumber: string;
  mtnNumber: string;
  wavePaymentLink: string;
} {
  const settings = getSuperAdminSettingsLocal();
  
  // 1. Vérification dans paymentRouting
  if (settings?.paymentRouting) {
    const pr = settings.paymentRouting;
    return {
      orangeNumber: pr.orangeNumber || '+226 65 56 58 05',
      moovNumber: pr.moovNumber || '+226 65 56 58 05',
      waveNumber: pr.waveNumber && !pr.waveNumber.includes('07 00 00') ? pr.waveNumber : '+226 65 56 58 05',
      mtnNumber: pr.mtnNumber || '+226 65 56 58 05',
      wavePaymentLink: pr.wavePaymentLink || 'https://pay.wave.com'
    };
  }

  // 2. Vérification dans platformConfig.paymentSettings.operators
  if (settings?.platformConfig?.paymentSettings?.operators) {
    const ops = settings.platformConfig.paymentSettings.operators;
    const findOp = (name: string) => ops.find((o: any) => o.operator?.toLowerCase().includes(name.toLowerCase()) || o.id?.toLowerCase().includes(name.toLowerCase()))?.merchantNumber;
    const foundWave = findOp('wave');
    return {
      orangeNumber: findOp('orange') || '+226 65 56 58 05',
      moovNumber: findOp('moov') || '+226 65 56 58 05',
      waveNumber: foundWave && !foundWave.includes('07 00 00') ? foundWave : '+226 65 56 58 05',
      mtnNumber: findOp('mtn') || '+226 65 56 58 05',
      wavePaymentLink: 'https://pay.wave.com'
    };
  }

  // 3. Fallback officiel : Trésorerie Marchand Nanasore (+226 65 56 58 05)
  return {
    orangeNumber: '+226 65 56 58 05',
    moovNumber: '+226 65 56 58 05',
    waveNumber: '+226 65 56 58 05',
    mtnNumber: '+226 65 56 58 05',
    wavePaymentLink: 'https://pay.wave.com'
  };
}

/**
 * Récupère les parcours des utilisateurs supervisés depuis la vue SQL admin_user_overview
 * Réservée aux Super Admins pour filtrer : Usage Ponctuel, Branche Commission, Branche Abonnement.
 */
export async function fetchAdminUserOverview(parcoursFilter?: string): Promise<any[]> {
  try {
    const url = parcoursFilter 
      ? `/api/admin-users?parcours=${encodeURIComponent(parcoursFilter)}`
      : '/api/admin-users';
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.users : [];
  } catch (e) {
    console.warn('[AdminUserOverview] Erreur chargement vue admin:', e);
    return [];
  }
}
