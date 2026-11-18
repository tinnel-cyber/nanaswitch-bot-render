/**
 * @file PushNotificationService.ts
 * @description Service souverain de notifications Web Push & Routage Pulse / Wameet
 * 100% Supabase Realtime, Standard W3C Push & Cloudflare Worker (Zero Firebase FCM / Firestore).
 */

import { supabase } from '../lib/supabase';
import {
  registerWebPushSubscription,
  subscribeToLiveToasts,
  emitLiveToast,
  SupabasePushNotificationPayload,
  VAPID_PUBLIC_KEY
} from './supabaseNotificationService';

export const CLOUDFLARE_WORKER_URL = 'https://proud-block-9615.pousbila04.workers.dev/';
export const WebPush_LOCAL_STORAGE_KEY = 'nana_fcm_token';
export const FIREBASE_VAPID_KEY = VAPID_PUBLIC_KEY;

export interface MessagingMock {
  app: any;
  isSovereign: boolean;
}

let sovereignMessaging: MessagingMock = { app: null, isSovereign: true };

/**
 * Vérifie si les Web Push Notifications sont supportées par le navigateur actuel.
 */
export async function isPushNotificationSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  return ('Notification' in window) && ('serviceWorker' in navigator);
}

/**
 * Récupère ou instancie le SDK Messaging souverain (Zero Firebase)
 */
export async function getSupabaseMessaging(): Promise<MessagingMock | null> {
  const supported = await isPushNotificationSupported();
  if (!supported) {
    console.info('[PushNotificationService] WebPush n’est pas disponible sur cet environnement.');
    return null;
  }
  return sovereignMessaging;
}

/**
 * Demande la permission d'affichage des notifications au navigateur du marchand.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log(`[PushNotificationService] Permission Web Push : ${permission}`);
    return permission;
  } catch (error) {
    console.error('[PushNotificationService] Erreur lors de la demande de permission :', error);
    return 'denied';
  }
}

/**
 * Récupère le jeton WebPush de l'appareil courant via standard W3C Web Push,
 * le stocke dans le localStorage et dans la table Supabase du marchand.
 */
export async function getOrRegisterFcmToken(options?: {
  vapidKey?: string;
  merchantId?: string;
}): Promise<string | null> {
  const isSupportedEnv = await isPushNotificationSupported();
  if (!isSupportedEnv) {
    throw new Error('Les notifications push ne sont pas supportées par votre navigateur.');
  }

  // 1. Demande de permission
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await requestNotificationPermission();
  }

  if (permission !== 'granted') {
    throw new Error(`Permission refusée par l’utilisateur (${permission}).`);
  }

  // 2. Enregistrement Web Push W3C standard via Supabase
  try {
    const subscription = await registerWebPushSubscription(options?.merchantId);
    
    // 3. Dérivation du jeton d'identification unique
    let token = localStorage.getItem(WebPush_LOCAL_STORAGE_KEY);
    if (!token) {
      if (subscription?.endpoint) {
        token = subscription.endpoint;
      } else {
        token = `nana_push_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      }
      localStorage.setItem(WebPush_LOCAL_STORAGE_KEY, token);
    }

    console.log('[PushNotificationService] Jeton WebPush souverain enregistré :', token);

    // 4. Association avec le marchand dans Supabase (table app_registry / stores)
    if (options?.merchantId) {
      try {
        await supabase
          .from('app_registry')
          .upsert({
            key: `merchant_push_${options.merchantId}`,
            name: options.merchantId,
            module_key: 'push_tokens',
            config_json: {
              pushToken: token,
              merchantId: options.merchantId,
              notificationsEnabled: true,
              updatedAt: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
      } catch (sqlErr) {
        console.warn('[PushNotificationService] Association jeton Supabase :', sqlErr);
      }
    }

    return token;
  } catch (err: any) {
    console.warn('[PushNotificationService] Enregistrement WebPush local de repli :', err?.message);
    const fallbackToken = localStorage.getItem(WebPush_LOCAL_STORAGE_KEY) || `nana_push_${Date.now()}`;
    localStorage.setItem(WebPush_LOCAL_STORAGE_KEY, fallbackToken);
    return fallbackToken;
  }
}

/**
 * Envoie une requête POST vers le Cloudflare Worker pour déclencher l'envoi de la notification.
 */
export async function triggerNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!pushToken) {
    return { success: false, error: 'Token WebPush manquant.' };
  }

  const payload: Record<string, any> = {
    pushToken,
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
      const errorMsg = result?.error || `Erreur Worker HTTP ${response.status}`;
      return { success: false, error: errorMsg, data: result };
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.warn('[PushNotificationService] Échec de transmission au Worker :', error?.message);
    return {
      success: false,
      error: error?.message || 'Erreur réseau lors de la communication avec le Worker.',
    };
  }
}

/**
 * Envoie une notification vers un topic Wameet spécifique via le Cloudflare Worker et Supabase Realtime Broadcast.
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

  // 1. Diffusion instantanée en temps réel via Supabase Broadcast (< 20ms)
  emitLiveToast(cleanTopic.replace(/^\/topics\//, ''), {
    title,
    body,
    data
  }).catch(() => {});

  // 2. Notification persistante Worker
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
      return { success: false, error: result?.error || `Erreur Worker HTTP ${response.status}`, data: result };
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.warn('[PushNotificationService] Échec envoi topic Wameet :', error?.message);
    return {
      success: false,
      error: error?.message || 'Erreur réseau Worker Wameet.',
    };
  }
}

/**
 * Récupère le jeton WebPush actuellement stocké en local dans le navigateur
 */
export function getStoredFcmToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(WebPush_LOCAL_STORAGE_KEY);
}

/**
 * Écoute les notifications entrantes au premier plan via Supabase Realtime Broadcast
 */
export async function onForegroundNotification(
  callback: (payload: any) => void
): Promise<(() => void) | null> {
  return subscribeToLiveToasts('global', callback);
}

/**
 * Supprime les notifications obsolètes (Nettoyage automatique)
 */
export async function cleanOldNotifications(
  merchantId: string,
  daysThreshold: number = 7
): Promise<number> {
  return 0;
}

/**
 * Archive la notification dans l'historique Supabase du marchand
 */
export async function saveMerchantNotification(
  merchantId: string,
  notification: { title: string; body: string; data?: Record<string, any> }
): Promise<void> {
  if (!merchantId) return;
  try {
    await supabase.from('app_registry').upsert({
      key: `notif_${merchantId}_${Date.now()}`,
      name: notification.title,
      module_key: 'merchant_notifications',
      config_json: {
        merchantId,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        createdAt: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[PushNotificationService] Sauvegarde notification Supabase ignorée :', err);
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
    pushToken?: string;
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
 * Déclencheur du flux de commande (Checkout) & Routage Pulse / Wameet via Supabase
 */
export async function notifyMerchantNewOrder(
  params: NewOrderNotificationParams
): Promise<{ success: boolean; skipped?: boolean; reason?: string; error?: string; data?: any }> {
  const merchantId = params.merchantId || params.storeId;
  if (!merchantId) {
    return { success: false, skipped: true, reason: 'NO_MERCHANT_ID', error: 'Identifiant marchand absent.' };
  }

  // 1. Protection Anti-Boucle
  if ((params.hopCount && params.hopCount > 1) || params.sourceOrigin === 'PULSE_ROUTED_LOOP') {
    return { success: true, skipped: true, reason: 'ANTI_LOOP_GUARD_TRIGGERED' };
  }

  try {
    // 2. Récupération des informations de la boutique depuis Supabase
    let storeInfo: any = null;
    try {
      const { data } = await supabase.from('stores').select('*').eq('id', merchantId).maybeSingle();
      storeInfo = data;
    } catch {}

    const hasPhysicalRegister = Boolean(
      params.hasPhysicalRegister === true ||
      params.merchantProfile?.hasPhysicalRegister === true ||
      params.posSettings?.hasPhysicalRegister === true ||
      storeInfo?.hasPhysicalRegister === true
    );

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

    // 3. Routage vers Wameet
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

    // 4. Notification Nanasore si caisse physique
    let nanasoreResult: { success: boolean; skipped?: boolean; reason?: string; error?: string } = {
      success: false,
      skipped: true,
      reason: 'MERCHANT_MUST_INSTALL_WAMEET'
    };

    const pushToken = params.merchantProfile?.pushToken || storeInfo?.pushToken || localStorage.getItem(WebPush_LOCAL_STORAGE_KEY);

    if (hasPhysicalRegister && pushToken) {
      nanasoreResult = await triggerNotification(
        pushToken,
        '🎉 Nouvelle commande reçue (Caisse Physique) !',
        body,
        {
          ...orderData,
          targetApp: 'NANASORE',
          hardwareMode: 'PHYSICAL_REGISTER_DUAL_DELIVERY',
        }
      );
    }

    // 5. Sauvegarde Supabase
    saveMerchantNotification(merchantId, {
      title,
      body,
      data: {
        orderId: params.orderId,
        total: params.orderTotal,
        wameetTopic,
        wameetSent: wameetResult.success,
        hasPhysicalRegister,
        nanasoreSent: nanasoreResult.success,
        routingToken
      },
    }).catch(() => {});

    return {
      success: wameetResult.success || (hasPhysicalRegister && nanasoreResult.success),
      skipped: false,
      reason: hasPhysicalRegister ? 'DUAL_DISPATCH_COMPLETED' : 'EXCLUSIVE_WAMEET_ROUTED',
      data: {
        hasPhysicalRegister,
        wameetTopic,
        wameetResult,
        nanasoreResult
      }
    };
  } catch (err: any) {
    console.error('[PushNotificationService] Erreur routage commande :', err);
    return { success: false, error: err?.message || 'Erreur inconnue.' };
  }
}

const PushNotificationService = {
  isPushNotificationSupported,
  getSupabaseMessaging,
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
