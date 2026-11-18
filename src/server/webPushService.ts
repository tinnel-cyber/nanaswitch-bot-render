/**
 * @file webPushService.ts
 * @description Moteur souverain d'envoi de Notifications Web Push (VAPID RFC 8291 / 8292)
 * ZÉRO DÉPENDANCE FIREBASE - Utilise le standard W3C Web Push & Supabase SQL
 */

import webpush from 'web-push';
import { supabase } from '../../app/utils/supabase.server';

export const VAPID_PUBLIC_KEY = 
  process.env.VAPID_PUBLIC_KEY || 
  process.env.VITE_VAPID_PUBLIC_KEY || 
  'BPEjL4pdmUAfIC5tzapvW_kGem9woSuIPr8zerD45g5-IAYWNNQ8UL466CvEt__oP20wabjzNWxmEerEAyCdBYs';

export const VAPID_PRIVATE_KEY = 
  process.env.VAPID_PRIVATE_KEY || 
  'P-GqP1OZqb0EcF3lIdAlj4o76tnmumxyDRqoC98Rcb8';

export const VAPID_SUBJECT = 
  process.env.VAPID_SUBJECT || 
  'mailto:contact@nanasore.com';

// Configuration VAPID globale du serveur
try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[WEB PUSH SERVER] Certificat VAPID initialisé avec succès.');
} catch (err: any) {
  console.warn('[WEB PUSH SERVER] Avertissement configuration VAPID :', err?.message);
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, any>;
}

/**
 * Envoie une notification à un abonné unique et purge automatiquement si le jeton est expiré (410 / 404)
 */
export async function sendPushNotification(
  subscription: {
    endpoint: string;
    keys?: {
      p256dh: string;
      auth: string;
    };
    p256dh?: string;
    auth?: string;
  },
  payload: WebPushPayload
): Promise<{ success: boolean; statusCode?: number; purged?: boolean; error?: string }> {
  const p256dh = subscription.keys?.p256dh || subscription.p256dh;
  const auth = subscription.keys?.auth || subscription.auth;

  if (!subscription.endpoint || !p256dh || !auth) {
    return { success: false, error: 'Abonnement incomplet (clé p256dh ou auth absente)' };
  }

  const pushSubscription: webpush.PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh,
      auth
    }
  };

  const formattedPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icon.svg',
    badge: payload.badge || '/favicon.svg',
    url: payload.url || '/',
    data: {
      url: payload.url || '/',
      timestamp: Date.now(),
      ...payload.data
    }
  });

  try {
    const res = await webpush.sendNotification(pushSubscription, formattedPayload, {
      TTL: 86400, // 24 heures de conservation
      urgency: 'high'
    });

    return { success: true, statusCode: res.statusCode };
  } catch (err: any) {
    const statusCode = err?.statusCode || err?.status;

    // Purge automatique dans Supabase si l'abonnement a expiré ou a été révoqué par le client
    if (statusCode === 410 || statusCode === 404) {
      console.log(`[WEB PUSH PURGE] Abonnement expiré détecté (${statusCode}). Nettoyage dans Supabase : ${subscription.endpoint.slice(0, 45)}...`);
      try {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);
        return { success: false, statusCode, purged: true, error: 'Abonnement expiré et purgé' };
      } catch (delErr) {
        console.warn('[WEB PUSH PURGE ERROR]', delErr);
      }
    }

    console.warn(`[WEB PUSH SEND ERROR] (${statusCode || 'inconnu'}) :`, err?.message);
    return { success: false, statusCode, error: err?.message };
  }
}

/**
 * Déclencheur A : Envoi de l'alerte LIVE SHOPPING à tous les abonnés du magasin
 */
export async function sendLiveShoppingPushToStoreSubscribers(options: {
  storeSlug: string;
  storeName: string;
  customTitle?: string;
  customBody?: string;
  customUrl?: string;
}): Promise<{ success: boolean; total: number; sent: number; failed: number; purged: number }> {
  const { storeSlug, storeName, customTitle, customBody, customUrl } = options;
  const cleanSlug = String(storeSlug || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');

  console.log(`[LIVE PUSH BROADCAST] 🚀 Déclenchement alerte Live pour la boutique [${cleanSlug}] (${storeName})...`);

  let subscriptions: any[] = [];
  try {
    // Récupérer les abonnés spécifiques à cette boutique ET les abonnés globaux
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .or(`store_slug.eq.${cleanSlug},store_slug.is.null`);

    if (!error && Array.isArray(data)) {
      subscriptions = data;
    }
  } catch (err: any) {
    console.warn('[LIVE PUSH BROADCAST] Erreur lecture push_subscriptions :', err?.message);
  }

  // Émission miroir Supabase Realtime Toast pour les utilisateurs actuellement connectés sur le site
  try {
    const channelName = `toasts_${cleanSlug}`;
    const channel = supabase.channel(channelName);
    await channel.send({
      type: 'broadcast',
      event: 'new_toast',
      payload: {
        title: customTitle || `🔴 ${storeName} est en DIRECT !`,
        body: customBody || 'Rejoignez le Live Shopping maintenant et profitez des offres exclusives.',
        url: customUrl || `/live/${cleanSlug}`
      }
    });
  } catch (_) {}

  if (subscriptions.length === 0) {
    console.log(`[LIVE PUSH BROADCAST] Aucun abonné Push enregistré pour [${cleanSlug}].`);
    return { success: true, total: 0, sent: 0, failed: 0, purged: 0 };
  }

  const payload: WebPushPayload = {
    title: customTitle || `🔴 ${storeName} est en DIRECT !`,
    body: customBody || 'Rejoignez le Live Shopping maintenant et profitez des offres exclusives.',
    icon: '/icon.svg',
    badge: '/favicon.svg',
    url: customUrl || `/live/${cleanSlug}`,
    data: {
      type: 'LIVE_SHOPPING_STARTED',
      storeSlug: cleanSlug,
      storeName
    }
  };

  let sent = 0;
  let failed = 0;
  let purged = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const res = await sendPushNotification(sub, payload);
      if (res.success) {
        sent++;
      } else {
        failed++;
        if (res.purged) purged++;
      }
    })
  );

  console.log(`[LIVE PUSH BROADCAST] ✅ Résultat envoi alerte [${cleanSlug}] : ${sent} reçus, ${failed} échecs, ${purged} purgés (sur ${subscriptions.length} abonnés).`);

  return {
    success: true,
    total: subscriptions.length,
    sent,
    failed,
    purged
  };
}

/**
 * Déclencheur B : Notification Nouvelle Commande / Paiement reçu au Vendeur
 */
export async function sendNewOrderPushToSeller(options: {
  merchantId: string;
  orderId?: string | number;
  customerName?: string;
  totalAmount?: string | number;
  currency?: string;
  productName?: string;
}): Promise<{ success: boolean; sent: number; purged: number }> {
  const { merchantId, orderId, customerName, totalAmount, currency = 'FCFA', productName } = options;

  if (!merchantId) {
    return { success: false, sent: 0, purged: 0 };
  }

  console.log(`[ORDER PUSH] 💰 Déclenchement notification commande pour le marchand [${merchantId}]...`);

  let subscriptions: any[] = [];
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', merchantId);

    if (!error && Array.isArray(data)) {
      subscriptions = data;
    }
  } catch (err: any) {
    console.warn('[ORDER PUSH] Erreur recherche abonnements marchand :', err?.message);
  }

  const formattedAmount = typeof totalAmount === 'number'
    ? `${totalAmount.toLocaleString('fr-FR')} ${currency}`
    : `${totalAmount || '0'} ${currency}`;

  const payload: WebPushPayload = {
    title: '🎉 Nouvelle commande reçue !',
    body: `Client : ${customerName || 'Client'} • ${formattedAmount} • ${productName || 'Article'}`,
    icon: '/icon.svg',
    badge: '/favicon.svg',
    url: '/dashboard?tab=orders',
    data: {
      type: 'NEW_ORDER',
      orderId: String(orderId || ''),
      merchantId
    }
  };

  // Broadcast Toast instantané Supabase Realtime
  try {
    const channel = supabase.channel(`toasts_merchant_${merchantId}`);
    await channel.send({
      type: 'broadcast',
      event: 'new_toast',
      payload
    });
  } catch (_) {}

  let sent = 0;
  let purged = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const res = await sendPushNotification(sub, payload);
      if (res.success) {
        sent++;
      } else if (res.purged) {
        purged++;
      }
    })
  );

  console.log(`[ORDER PUSH] ✅ Notification commande envoyée au marchand [${merchantId}] : ${sent} reçus, ${purged} expirés purgés.`);
  return { success: true, sent, purged };
}
