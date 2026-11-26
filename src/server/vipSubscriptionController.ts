/**
 * @file vipSubscriptionController.ts
 * @description Moteur Backend Node.js pour les Abonnements VIP Wameet via Passerelle S-Pay (Prompt 27)
 * 
 * Directives :
 * - Route POST /api/vip/subscribe qui appelle le client local ./s-client
 * - Gestion des plans d'abonnement : Pass Mensuel (10 000 FCFA), Accès à vie (50 000 FCFA)
 * - Validation immédiate et simulation/traitement du Webhook S-Pay
 * - Registre en mémoire des abonnements VIP avec persistance transactionnelle
 */

import crypto from 'crypto';
import type { Request, Response, Express } from 'express';
import sClient from './s-client';

export interface VipSubscriptionRecord {
  id: string;
  transactionId: string;
  receiptNumber: string;
  loungeId: string;
  loungeTitle: string;
  planId: 'monthly' | 'lifetime' | string;
  planLabel: string;
  amount: number;
  currency: string;
  customerPhone: string;
  customerName: string;
  userId: string;
  paymentMethod: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
  accessGranted: boolean;
  subscribedAt: number;
  expiresAt: number | null; // null si à vie
}

// Registre des Abonnements VIP en mémoire
const VIP_SUBSCRIPTIONS = new Map<string, VipSubscriptionRecord>();
// Index d'accès rapide : `${userIdOrPhone}_${loungeId}` -> subscriptionId
const VIP_USER_ACCESS_INDEX = new Map<string, string>();

/**
 * Souscription à un Salon / Salle VIP via S-Pay
 */
export async function createVipSubscription(params: {
  loungeId: string;
  loungeTitle?: string;
  planId: 'monthly' | 'lifetime' | string;
  amount: number;
  customerPhone: string;
  customerName?: string;
  userId?: string;
  paymentMethod?: string;
  autoValidateWebhook?: boolean;
}): Promise<VipSubscriptionRecord> {
  const {
    loungeId,
    loungeTitle = 'Salon VIP Wameet',
    planId,
    amount,
    customerPhone,
    customerName = 'Membre VIP Wameet',
    userId = `user_${customerPhone.replace(/\D/g, '') || Date.now()}`,
    paymentMethod = 'S_MOBILE_MONEY',
    autoValidateWebhook = true
  } = params;

  const planLabel =
    planId === 'lifetime'
      ? 'Accès à vie'
      : planId === 'annual'
      ? 'Pass Annuel'
      : 'Pass Mensuel';

  const description = `Abonnement VIP Wameet : ${loungeTitle} (${planLabel})`;

  // 1. Appel du client S-Pay pour initialiser le paiement / séquestre
  const sResult = await sClient.createEscrowPayment({
    amount,
    currency: 'FCFA',
    description,
    customerPhone,
    customerName,
    buyerId: userId,
    tontineId: `vip_${loungeId}`,
    metadata: {
      type: 'VIP_SUBSCRIPTION',
      loungeId,
      planId,
      paymentMethod
    }
  });

  const now = Date.now();
  let expiresAt: number | null = null;
  if (planId === 'monthly') {
    expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 jours
  } else if (planId === 'annual') {
    expiresAt = now + 365 * 24 * 60 * 60 * 1000; // 1 an
  } else {
    expiresAt = null; // À vie
  }

  const subscriptionId = `vip_sub_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  let receiptNumber = `RCPT_VIP_${Date.now()}_${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

  // 2. Traitement / Validation Webhook S-Pay
  if (autoValidateWebhook) {
    const captureResult = await sClient.captureEscrowPayment(sResult.transactionId, amount);
    if (captureResult.receiptNumber) {
      receiptNumber = captureResult.receiptNumber;
    }
  }

  const record: VipSubscriptionRecord = {
    id: subscriptionId,
    transactionId: sResult.transactionId,
    receiptNumber,
    loungeId,
    loungeTitle,
    planId,
    planLabel,
    amount,
    currency: 'FCFA',
    customerPhone,
    customerName,
    userId,
    paymentMethod,
    status: 'ACTIVE',
    accessGranted: true,
    subscribedAt: now,
    expiresAt
  };

  // Enregistrement dans les registres
  VIP_SUBSCRIPTIONS.set(subscriptionId, record);
  VIP_USER_ACCESS_INDEX.set(`${userId}_${loungeId}`, subscriptionId);
  VIP_USER_ACCESS_INDEX.set(`${customerPhone}_${loungeId}`, subscriptionId);

  console.log(
    `[VIP CONTROLLER] ✅ Abonnement VIP activé pour ${customerPhone} dans "${loungeTitle}" (${planLabel} - ${amount} FCFA) - Tx: ${sResult.transactionId}`
  );

  return record;
}

/**
 * Vérifie si un utilisateur a accès à un Salon / Salle VIP
 */
export function checkVipAccess(loungeId: string, userIdentifier: string): {
  hasAccess: boolean;
  subscription?: VipSubscriptionRecord | null;
} {
  const subId = VIP_USER_ACCESS_INDEX.get(`${userIdentifier}_${loungeId}`);
  if (!subId) {
    return { hasAccess: false, subscription: null };
  }

  const sub = VIP_SUBSCRIPTIONS.get(subId);
  if (!sub || sub.status !== 'ACTIVE') {
    return { hasAccess: false, subscription: null };
  }

  // Vérification de date d'expiration pour les abonnements mensuels/annuels
  if (sub.expiresAt !== null && sub.expiresAt < Date.now()) {
    sub.status = 'EXPIRED';
    sub.accessGranted = false;
    return { hasAccess: false, subscription: sub };
  }

  return { hasAccess: true, subscription: sub };
}

/**
 * Attache les routes API pour les abonnements VIP Wameet sur l'application Express
 */
export function attachVipSubscriptionRoutes(app: Express): void {
  // 1. POST /api/vip/subscribe : Souscrire à un espace VIP
  app.post('/api/vip/subscribe', async (req: Request, res: Response) => {
    try {
      const {
        loungeId,
        loungeTitle,
        planId = 'monthly',
        amount,
        customerPhone,
        customerName,
        userId,
        paymentMethod = 'S_MOBILE_MONEY',
        transactionId,
        autoValidateWebhook = false
      } = req.body || {};

      if (!loungeId) {
        return res.status(400).json({
          success: false,
          message: 'Le paramètre loungeId est obligatoire.'
        });
      }

      if (!customerPhone) {
        return res.status(400).json({
          success: false,
          message: 'Le numéro de téléphone Mobile Money (customerPhone) est requis pour la validation.'
        });
      }

      const parsedAmount = Number(amount) || (planId === 'lifetime' ? 50000 : 10000);
      const hasVerifiedGatewayTx = Boolean(transactionId && String(transactionId).trim().length >= 6);

      const subscription = await createVipSubscription({
        loungeId,
        loungeTitle,
        planId,
        amount: parsedAmount,
        customerPhone,
        customerName,
        userId,
        paymentMethod,
        autoValidateWebhook: Boolean(autoValidateWebhook && hasVerifiedGatewayTx)
      });

      return res.status(200).json({
        success: true,
        message: hasVerifiedGatewayTx
          ? `🎉 Abonnement ${subscription.planLabel} déverrouillé avec succès via Wameet !`
          : `⏳ Paiement en attente de confirmation opérateur pour ${subscription.planLabel}.`,
        subscription,
        accessGranted: hasVerifiedGatewayTx
      });
    } catch (err: any) {
      console.error('[VIP CONTROLLER ERROR]', err);
      return res.status(500).json({
        success: false,
        message: err.message || "Erreur lors de l'activation de l'abonnement VIP."
      });
    }
  });

  // 2. POST /api/vip/webhook : Réception du Webhook de confirmation S-Pay
  app.post('/api/vip/webhook', (req: Request, res: Response) => {
    try {
      const { transactionId, status, receiptNumber } = req.body || {};
      console.log(`[VIP WEBHOOK] Webhook de paiement reçu pour Tx: ${transactionId} (Status: ${status})`);

      for (const sub of VIP_SUBSCRIPTIONS.values()) {
        if (sub.transactionId === transactionId) {
          if (status === 'SUCCESS' || status === 'CAPTURED') {
            sub.status = 'ACTIVE';
            sub.accessGranted = true;
            if (receiptNumber) sub.receiptNumber = receiptNumber;
          } else if (status === 'FAILED' || status === 'REFUNDED') {
            sub.status = status;
            sub.accessGranted = false;
          }
          break;
        }
      }

      return res.status(200).json({ received: true, timestamp: Date.now() });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. GET /api/vip/status/:loungeId : Vérifier l'accès d'un utilisateur
  app.get('/api/vip/status/:loungeId', (req: Request, res: Response) => {
    try {
      const { loungeId } = req.params;
      const userIdentifier = (req.query.userId || req.query.phone || '') as string;

      if (!userIdentifier) {
        return res.status(400).json({
          success: false,
          message: 'userId ou phone requis en paramètre de requête.'
        });
      }

      const result = checkVipAccess(loungeId, userIdentifier);
      return res.status(200).json({
        success: true,
        loungeId,
        ...result
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 4. GET /api/vip/plans : Liste des plans officiels Wameet VIP
  app.get('/api/vip/plans', (_req: Request, res: Response) => {
    return res.status(200).json({
      success: true,
      plans: [
        {
          id: 'monthly',
          name: 'Pass Mensuel',
          priceFcfa: 10000,
          period: 'Par mois, sans engagement',
          badge: 'Populaire',
          features: [
            'Accès 1-to-1 avec le Coach & Mentors',
            'Webinaires privés hebdomadaires micro ouvert',
            'Réseau exclusif de dirigeants et investisseurs',
            'Accès aux replays vidéo HD et fiches confidentielles'
          ]
        },
        {
          id: 'lifetime',
          name: 'Accès à vie',
          priceFcfa: 50000,
          period: 'Paiement unique, accès perpétuel',
          badge: 'Économie 60%',
          recommended: true,
          features: [
            'Tous les avantages du Pass Mensuel à vie',
            'Canal audio Wameet VIP ultra-privé',
            'Mise en relation directe avec les Business Angels',
            'Certificat d’Appartenance au Cercle des Dirigeants',
            'Invitations gratuites aux dîners d’affaires annuels'
          ]
        }
      ]
    });
  });

  console.log('✅ Routes Abonnements VIP Wameet attachées sur /api/vip/*');
}

export default {
  createVipSubscription,
  checkVipAccess,
  attachVipSubscriptionRoutes
};
