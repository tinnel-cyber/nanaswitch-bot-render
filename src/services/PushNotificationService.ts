import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  serverTimestamp, 
  deleteField 
} from 'firebase/firestore';
import { app, db } from '../firebase';

export const CLOUDFLARE_WORKER_URL = 'https://proud-block-9615.pousbila04.workers.dev/';
export const FCM_LOCAL_STORAGE_KEY = 'nana_fcm_token';
export const FIREBASE_VAPID_KEY = 'BOJi7t22t5CwP1jETmiQAQ-1fn3w7Z8EltEIw_pfbTRB6p68AwMrFwPync8PNNVHwOxGAPBVxWlG6B3HSMXRLwo';

let messagingInstance: Messaging | null = null;

/**
 * Vérifie si Firebase Messaging et les Web Push Notifications sont supportés par le navigateur actuel.
 */
export async function isPushNotificationSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;

  try {
    return await isSupported();
  } catch (error) {
    console.warn('[PushNotificationService] Erreur lors du test de compatibilité FCM :', error);
    return false;
  }
}

/**
 * Récupère ou instancie le SDK Messaging Firebase
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  const supported = await isPushNotificationSupported();
  if (!supported) {
    console.warn('[PushNotificationService] FCM n’est pas disponible sur cet environnement.');
    return null;
  }
  try {
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (error) {
    console.error('[PushNotificationService] Impossible d’initialiser getMessaging :', error);
    return null;
  }
}

/**
 * Demande la permission d'affichage des notifications au navigateur du marchand.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[PushNotificationService] L’API Notification n’est pas disponible.');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log(`[PushNotificationService] Permission accordée : ${permission}`);
    return permission;
  } catch (error) {
    console.error('[PushNotificationService] Erreur lors de la demande de permission :', error);
    return 'denied';
  }
}

/**
 * Récupère le jeton FCM de l'appareil courant via getToken(),
 * le stocke dans le localStorage et optionnellement dans le document Firestore du marchand.
 */
export async function getOrRegisterFcmToken(options?: {
  vapidKey?: string;
  merchantId?: string;
}): Promise<string | null> {
  const isSupportedEnv = await isPushNotificationSupported();
  if (!isSupportedEnv) {
    throw new Error('Les notifications push ne sont pas supportées par votre navigateur.');
  }

  // 1. Vérification / Demande de permission
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await requestNotificationPermission();
  }

  if (permission !== 'granted') {
    throw new Error(`Permission refusée par l’utilisateur (${permission}).`);
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    throw new Error('Service Firebase Messaging indisponible.');
  }

  // 2. Enregistrement ou récupération du Service Worker dédié
  let swRegistration: ServiceWorkerRegistration | undefined;
  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;
      console.log('[PushNotificationService] Service Worker FCM enregistré :', swRegistration.scope);
    } catch (swErr) {
      console.warn('[PushNotificationService] Erreur register SW dédié, fallback SW global :', swErr);
      swRegistration = (await navigator.serviceWorker.getRegistration()) || undefined;
    }
  }

  // 3. Récupération du Token FCM avec la clé VAPID Web Push
  const activeVapidKey = options?.vapidKey || FIREBASE_VAPID_KEY;
  const tokenOptions: { vapidKey: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = {
    vapidKey: activeVapidKey,
  };
  if (swRegistration) {
    tokenOptions.serviceWorkerRegistration = swRegistration;
  }

  try {
    const token = await getToken(messaging, tokenOptions);

    if (!token) {
      throw new Error('Aucun token d’enregistrement FCM reçu.');
    }

    // 4. Sauvegarde locale dans le navigateur
    localStorage.setItem(FCM_LOCAL_STORAGE_KEY, token);
    console.log('[PushNotificationService] Jeton FCM obtenu et mémorisé avec succès :', token);

    // 5. Sauvegarde unitaire dans Firestore pour le marchand (Écrase systématiquement l'ancien token)
    if (options?.merchantId && db) {
      try {
        const merchantRef = doc(db, 'merchants', options.merchantId);
        await setDoc(
          merchantRef,
          {
            fcmToken: token, // Remplace et écrase systématiquement l'unique jeton actif (pas de liste infinie)
            fcmTokens: deleteField(), // Nettoyage de sécurité : suppression de tout tableau historique obsolète
            fcmUpdatedAt: serverTimestamp(),
            notificationsEnabled: true,
          },
          { merge: true }
        );
        console.log(`[PushNotificationService] Jeton associé au marchand ${options.merchantId} dans storage (token unitaire écrasé).`);

        // Déclenchement automatique de la purge des notifications vieilles de plus de 7 jours
        cleanOldNotifications(options.merchantId, 7).catch(() => {});
      } catch (firestoreErr) {
        console.warn('[PushNotificationService] Impossible de mettre à jour storage :', storageErr);
      }
    }

    return token;
  } catch (err: any) {
    console.error('[PushNotificationService] Erreur lors de l’obtention du token FCM :', err);
    throw err;
  }
}

/**
 * Envoie une requête POST vers le Cloudflare Worker pour déclencher l'envoi de la notification Push FCM v1.
 * @param fcmToken Le jeton FCM du destinataire
 * @param title Le titre de la notification
 * @param body Le message ou corps de la notification
 * @param data Données additionnelles facultatives (payload JSON)
 */
export async function triggerNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!fcmToken) {
    return { success: false, error: 'Token FCM manquant pour l’envoi de la notification.' };
  }

  const payload: Record<string, any> = {
    fcmToken,
    title: title || 'NaNa Studio Notification',
    body: body || 'Test de notification push en temps réel.',
  };

  if (data && Object.keys(data).length > 0) {
    payload.data = data;
  }

  try {
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = result?.error || `Erreur Worker HTTP ${response.status}: ${response.statusText}`;
      return { success: false, error: errorMsg, data: result };
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error('[PushNotificationService] Échec de transmission au Worker :', error);
    return {
      success: false,
      error: error?.message || 'Erreur réseau lors de la communication avec le Cloudflare Worker.',
    };
  }
}

/**
 * Envoie une notification vers un topic Wameet spécifique via le Cloudflare Worker.
 * Cible l'application partenaire Wameet pour router les ventes et commandes en temps réel.
 */
export async function triggerWameetTopicNotification(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!topic) {
    return { success: false, error: 'Topic Wameet manquant.' };
  }

  const cleanTopic = topic.startsWith('/topics/') ? topic : `/topics/${topic}`;

  const payload: Record<string, any> = {
    topic: cleanTopic,
    title: title || '🎉 [Wameet] Nouvelle Vente !',
    body: body || 'Vous avez reçu une nouvelle commande dans votre boutique Wameet.',
    data: {
      ...(data || {}),
      targetApp: 'WAMEET',
      sourceOrigin: 'PULSE_ROUTER_V1',
      emittedAt: String(Date.now()),
    },
  };

  try {
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pulse-Routing-Origin': 'PULSE_ROUTER_V1',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = result?.error || `Erreur Worker HTTP ${response.status}: ${response.statusText}`;
      return { success: false, error: errorMsg, data: result };
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error('[PushNotificationService] Échec envoi topic Wameet :', error);
    return {
      success: false,
      error: error?.message || 'Erreur réseau lors de la communication avec le Worker Wameet.',
    };
  }
}

/**
 * Récupère le jeton FCM actuellement stocké en local dans le navigateur
 */
export function getStoredFcmToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(FCM_LOCAL_STORAGE_KEY);
}

/**
 * Écoute les notifications FCM entrantes lorsque l'application est ouverte au premier plan (Foreground).
 */
export async function onForegroundNotification(
  callback: (payload: any) => void
): Promise<(() => void) | null> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  return onMessage(messaging, (payload) => {
    console.log('[PushNotificationService] Message FCM reçu au premier plan :', payload);
    callback(payload);
  });
}

/**
 * Supprime automatiquement les notifications de l'historique marchand vieilles de plus de X jours (défaut : 7 jours).
 * Empêche toute saturation inutile de la mémoire Firestore.
 */
export async function cleanOldNotifications(
  merchantId: string,
  daysThreshold: number = 7
): Promise<number> {
  if (!merchantId || !db) return 0;
  try {
    const cutoffTime = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;
    const notifsRef = collection(db, 'merchants', merchantId, 'notifications');
    const q = query(notifsRef, where('createdAtMs', '<', cutoffTime));
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    console.log(`[PushNotificationService] Nettoyage storage : ${snap.size} notification(s) expirée(s) (> ${daysThreshold} jours) purgée(s).`);
    return snap.size;
  } catch (err) {
    console.warn('[PushNotificationService] Nettoyage auto des notifications ignoré :', err);
    return 0;
  }
}

/**
 * Archive la notification dans l'historique Firestore du marchand et déclenche la purge (> 7 jours).
 */
export async function saveMerchantNotification(
  merchantId: string,
  notification: { title: string; body: string; data?: Record<string, any> }
): Promise<void> {
  if (!merchantId || !db) return;
  try {
    // Purge en arrière-plan des entrées obsolètes
    cleanOldNotifications(merchantId, 7).catch(() => {});

    const notifRef = doc(collection(db, 'merchants', merchantId, 'notifications'));
    await setDoc(notifRef, {
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      createdAtMs: Date.now(),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[PushNotificationService] Impossible d’archiver la notification :', err);
  }
}

export interface NewOrderNotificationParams {
  merchantId?: string;
  storeId?: string;
  customerName: string;
  orderTotal: number | string;
  productName: string;
  orderId?: string;
  merchantProfile?: {
    hasPhysicalRegister?: boolean;
    hasPhysicalPos?: boolean;
    name?: string;
    fcmToken?: string;
    [key: string]: any;
  };
  hasPhysicalRegister?: boolean;
  posSettings?: {
    hasPhysicalRegister?: boolean;
    [key: string]: any;
  };
  loopGuardToken?: string;
  hopCount?: number;
  sourceOrigin?: string;
}

/**
 * Déclencheur du flux de commande (Checkout) & Routage Pulse / Wameet :
 * 
 * 1. Vérification de sécurité Anti-Boucle (hopCount > 1).
 * 2. Vérification rigoureuse de l'abonnement PRO.
 * 3. Règle Stricte Pulse : La charge utile de la notification de commande est envoyée
 *    EXCLUSIVEMENT vers le topic Wameet (/topics/wameet_merchant_${merchantId}).
 * 4. Désactivation de la notification sur l'application principale Nanasore
 *    pour forcer les commerçants à installer Wameet.
 * 5. Exception Matérielle (Caisse Physique) :
 *    Si merchantProfile.hasPhysicalRegister === true (ou caisse physique active),
 *    le blocage Nanasore est LEVÉ : réception simultanée sur Nanasore ET sur Wameet (Dual Dispatch).
 * 6. Archivage et purge de l'historique (> 7 jours).
 */
export async function notifyMerchantNewOrder(
  params: NewOrderNotificationParams
): Promise<{ success: boolean; skipped?: boolean; reason?: string; error?: string; data?: any }> {
  const merchantId = params.merchantId || params.storeId;
  if (!merchantId) {
    return { success: false, skipped: true, reason: 'NO_MERCHANT_ID', error: 'Identifiant marchand absent.' };
  }

  // 1. Protection Anti-Boucle stricte
  if ((params.hopCount && params.hopCount > 1) || params.sourceOrigin === 'PULSE_ROUTED_LOOP') {
    console.warn(`[PulseRouter] Protection Anti-Boucle activée : notification ignorée pour ${merchantId}.`);
    return { success: true, skipped: true, reason: 'ANTI_LOOP_GUARD_TRIGGERED' };
  }

  if (!db) {
    return { success: false, skipped: true, reason: 'NO_DB', error: 'Firestore indisponible.' };
  }

  try {
    // 2. Récupération du document du marchand / boutique
    let merchantSnap = await getDoc(doc(db, 'merchants', merchantId));
    if (!merchantSnap.exists()) {
      merchantSnap = await getDoc(doc(db, 'stores', merchantId));
    }
    if (!merchantSnap.exists()) {
      merchantSnap = await getDoc(doc(db, 'users', merchantId));
    }

    if (!merchantSnap.exists()) {
      console.warn(`[PushNotificationService] Boutique/Marchand ${merchantId} non trouvé pour la notification.`);
      return { success: false, skipped: true, reason: 'MERCHANT_NOT_FOUND' };
    }

    const data = merchantSnap.data() || {};

    // 3. Vérification rigoureuse de l'abonnement PRO
    const subscription = data.subscription || {};
    const plan = (subscription.plan || data.plan || '').toLowerCase();
    const status = (subscription.status || '').toUpperCase();
    
    // Le marchand est Pro s'il a un forfait Pro / Elite actif
    const isPro = (plan === 'pro' || plan === 'elite' || data.isPro === true) && status !== 'EXPIRED';

    if (!isPro) {
      console.log(`[PushNotificationService] Marchand ${merchantId} sur plan gratuit (${plan || 'free'}). Alertes Push désactivées (Pro requis).`);
      return {
        success: false,
        skipped: true,
        reason: 'NOT_PRO_PLAN',
        error: 'Le marchand est sur le plan gratuit. Passer au Plan Pro est requis pour les alertes en direct.',
      };
    }

    // 4. Détection de l'Exception Matérielle (Caisse Physique)
    const hasPhysicalRegister = Boolean(
      params.hasPhysicalRegister === true ||
      params.merchantProfile?.hasPhysicalRegister === true ||
      params.posSettings?.hasPhysicalRegister === true ||
      data.hasPhysicalRegister === true ||
      data.merchantProfile?.hasPhysicalRegister === true ||
      data.posSettings?.hasPhysicalRegister === true ||
      data.deviceType === 'PHYSICAL_POS' ||
      data.hasHardwareTerminal === true
    );

    // 5. Formatage des données
    const formattedAmount = typeof params.orderTotal === 'number'
      ? `${params.orderTotal.toLocaleString('fr-FR')} FCFA`
      : String(params.orderTotal);

    const title = '🎉 Nouvelle commande reçue !';
    const body = `Client : ${params.customerName || 'Client anonyme'} • ${formattedAmount} • ${params.productName || 'Article'}`;
    const wameetTopic = `/topics/wameet_merchant_${merchantId}`;
    const routingToken = `pulse_order_${params.orderId || Date.now()}_${Date.now()}`;

    const orderData: Record<string, string> = {
      type: 'NEW_ORDER',
      orderId: params.orderId || '',
      customerName: params.customerName || '',
      amount: String(params.orderTotal),
      timestamp: String(Date.now()),
      merchantId,
      routingMode: hasPhysicalRegister ? 'DUAL_DISPATCH' : 'EXCLUSIVE_WAMEET',
      hasPhysicalRegister: String(hasPhysicalRegister),
      nanasoreBlocked: String(!hasPhysicalRegister),
      sourceOrigin: 'PULSE_ROUTER_V1',
      routingToken
    };

    // 6. RÈGLE STRICTE : Routage systématique de la notification vers le topic Wameet
    console.log(`[PulseRouter] Envoi de la commande ${params.orderId || ''} vers le topic Wameet ${wameetTopic}...`);
    const wameetResult = await triggerWameetTopicNotification(
      wameetTopic,
      `[Wameet] ${title}`,
      `Vente : ${params.customerName || 'Client'} • ${formattedAmount} • ${params.productName || 'Article'}`,
      {
        ...orderData,
        targetApp: 'WAMEET',
        clickAction: `wameet://orders/${params.orderId || ''}`,
      }
    );

    // 7. GESTION DE LA NOTIFICATION SUR NANASORE
    let nanasoreResult: { success: boolean; skipped?: boolean; reason?: string; error?: string } = {
      success: false,
      skipped: true,
      reason: 'MERCHANT_MUST_INSTALL_WAMEET'
    };

    const fcmToken = params.merchantProfile?.fcmToken || data.fcmToken || data.lastFcmToken;

    if (hasPhysicalRegister) {
      // EXCEPTION MATÉRIELLE CONFIRMÉE : Le commerçant possède une caisse physique
      // Le blocage est levé : il reçoit la notification sur Nanasore ET sur Wameet (Dual Dispatch)
      console.log(`[PulseRouter] 🟢 Exception Matérielle validée pour le marchand ${merchantId} (Caisse Physique). Déblocage de la notification Nanasore.`);
      if (fcmToken) {
        nanasoreResult = await triggerNotification(
          fcmToken,
          '🎉 Nouvelle commande reçue (Caisse Physique) !',
          body,
          {
            ...orderData,
            targetApp: 'NANASORE',
            hardwareMode: 'PHYSICAL_REGISTER_DUAL_DELIVERY',
          }
        );
      } else {
        console.warn(`[PulseRouter] Caisse physique détectée mais aucun fcmToken Nanasore trouvé pour ${merchantId}.`);
        nanasoreResult = { success: false, skipped: true, reason: 'NO_NANASORE_FCM_TOKEN' };
      }
    } else {
      // BLOCAGE NANASORE ACTIF : Le commerçant n'a pas de caisse physique
      // Règle stricte : notification Nanasore désactivée pour forcer l'usage de Wameet
      console.log(`[PulseRouter] 🔴 Notification Nanasore bloquée pour ${merchantId} (Pas de caisse physique). Trafic exclusivement dirigé vers Wameet.`);
    }

    // 8. Sauvegarde de la transaction et auto-nettoyage (> 7 jours)
    saveMerchantNotification(merchantId, {
      title,
      body,
      data: {
        orderId: params.orderId,
        total: params.orderTotal,
        wameetTopic,
        wameetSent: wameetResult.success,
        hasPhysicalRegister,
        nanasoreBlocked: !hasPhysicalRegister,
        nanasoreSent: nanasoreResult.success,
        routingMode: hasPhysicalRegister ? 'DUAL_DISPATCH' : 'EXCLUSIVE_WAMEET',
        routingToken
      },
    }).catch(() => {});

    return {
      success: wameetResult.success || (hasPhysicalRegister && nanasoreResult.success),
      skipped: false,
      reason: hasPhysicalRegister ? 'DUAL_DISPATCH_COMPLETED' : 'EXCLUSIVE_WAMEET_ROUTED',
      data: {
        hasPhysicalRegister,
        nanasoreBlocked: !hasPhysicalRegister,
        wameetTopic,
        wameetResult,
        nanasoreResult
      }
    };
  } catch (err: any) {
    console.error('[PushNotificationService] Erreur lors du routage Pulse de la notification de commande :', err);
    return { success: false, error: err?.message || 'Erreur inconnue.' };
  }
}

// Export par défaut pour commodité d'import
const PushNotificationService = {
  isPushNotificationSupported,
  getFirebaseMessaging,
  requestNotificationPermission,
  getOrRegisterFcmToken,
  triggerNotification,
  triggerWameetTopicNotification,
  getStoredFcmToken,
  onForegroundNotification,
  cleanOldNotifications,
  saveMerchantNotification,
  notifyMerchantNewOrder,
  CLOUDFLARE_WORKER_URL,
  FIREBASE_VAPID_KEY,
};

export default PushNotificationService;

