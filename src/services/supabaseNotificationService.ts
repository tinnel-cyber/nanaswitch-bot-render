/**
 * @file supabaseNotificationService.ts
 * @description Service de notifications en temps réel souverain (100% Supabase Realtime & Standard W3C Web Push)
 * Remplace l'ancien couplage Firebase Messaging / firebase-messaging-sw.js
 */

import { supabase } from '../lib/supabase';

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface SupabasePushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, any>;
}

// Clé publique VAPID pour les Pushs du navigateur standard (RFC 8291)
export const VAPID_PUBLIC_KEY = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY) ||
  (typeof process !== 'undefined' && process.env?.VAPID_PUBLIC_KEY) ||
  'BPEjL4pdmUAfIC5tzapvW_kGem9woSuIPr8zerD45g5-IAYWNNQ8UL466CvEt__oP20wabjzNWxmEerEAyCdBYs';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * 1. Écouteur en direct pour les Toasts au premier plan (Supabase Realtime Broadcast)
 * Latence < 20ms, zéro dépendance Firebase
 */
export function subscribeToLiveToasts(
  channelKey: string,
  onToast: (payload: SupabasePushNotificationPayload) => void
): () => void {
  const channelName = `toasts_${channelKey || 'global'}`;
  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'new_toast' }, ({ payload }) => {
      if (payload) {
        onToast(payload as SupabasePushNotificationPayload);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * 2. Émetteur de Toast en temps réel vers tous les clients ou un marchand
 */
export async function emitLiveToast(
  channelKey: string,
  toast: SupabasePushNotificationPayload
): Promise<void> {
  try {
    const channelName = `toasts_${channelKey || 'global'}`;
    const channel = supabase.channel(channelName);
    await channel.send({
      type: 'broadcast',
      event: 'new_toast',
      payload: toast
    });
  } catch (err) {
    console.warn('[SupabaseNotification] Erreur émission Toast :', err);
  }
}

/**
 * 3. Enregistrement de l'abonnement Web Push standard dans Supabase SQL
 * Utilise le Service Worker unifié /sw.js
 */
export async function registerWebPushSubscription(userId?: string, storeSlug?: string): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.info('[SupabaseNotification] Les notifications Web Push ne sont pas supportées.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('[SupabaseNotification] Permission push refusée par l’utilisateur.');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    if (subscription) {
      const subJson = subscription.toJSON();
      const endpoint = subJson.endpoint || '';
      const p256dh = subJson.keys?.p256dh || '';
      const auth = subJson.keys?.auth || '';
      const cleanSlug = storeSlug ? String(storeSlug).trim().replace(/[^a-zA-Z0-9_-]/g, '') : null;

      // 1. Sauvegarde dans la table Supabase push_subscriptions
      try {
        await supabase
          .from('push_subscriptions')
          .upsert({
            endpoint,
            p256dh,
            auth,
            user_id: userId || 'anonymous',
            store_slug: cleanSlug,
            updated_at: new Date().toISOString()
          }, { onConflict: 'endpoint' });
      } catch (sqlErr) {
        console.warn('[SupabaseNotification] Note: Sauvegarde table push_subscriptions :', sqlErr);
      }

      // 2. Enregistrement miroir auprès du backend API (Northflank)
      try {
        fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subJson,
            storeSlug: cleanSlug,
            userId: userId || 'anonymous'
          })
        }).catch(() => {});
      } catch (_) {}

      console.log(`[SupabaseNotification] Souscription Web Push enregistrée avec succès (Boutique: ${cleanSlug || 'globale'}).`);
    }

    return subscription;
  } catch (error) {
    console.warn('[SupabaseNotification] Erreur enregistrement Web Push :', error);
    return null;
  }
}
