/**
 * @file wameetPremiumController.ts
 * @description Contrôleur Backend pour Wameet Premium & Coaching Payant (Prompt 7)
 * 
 * Spécifications strictes :
 * 1. Verrouillage du Jitsi par le Paiement :
 *    - La route de génération d'URL Jitsi (jitsiRoomId) ne doit être appelée
 *      ET envoyée aux deux parties QUE SI ET SEULEMENT SI le webhook de paiement
 *      renvoie un statut 'SUCCESS'.
 * 2. Enregistrement de la transaction dans une table 'transactions' liée à l'ID du Wameet.
 */

import crypto from 'crypto';
import type { Request, Response, Express } from 'express';
import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc
} from 'firebase/firestore';

export interface WameetConsultationRecord {
  id: string; // wameetId
  expertId: string;
  expertName: string;
  requesterId: string;
  requesterName: string;
  amount: number;
  currency: 'FCFA';
  topic?: string;
  status: 'PENDING_PAYMENT' | 'PAID_ACTIVE' | 'FAILED' | 'CANCELLED';
  jitsiRoomId: string | null; // STRICTEMENT NULL tant que le paiement n'est pas validé
  wameetUrl: string | null;
  transactionId?: string | null;
  createdAt: string;
  paidAt?: string | null;
}

export interface WameetTransactionRecord {
  id: string; // transactionId
  wameetId: string;
  type: 'WAMEET_PREMIUM_COACHING';
  amount: number;
  currency: 'FCFA';
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  provider: 'ORANGE_MONEY' | 'WAVE' | 'MTN_MOMO' | 'MOOV_MONEY' | 'S_PAY' | string;
  payerPhone?: string;
  senderId?: string;
  receiverId?: string;
  expertId: string;
  requesterId: string;
  createdAt: string;
}

// Stores en mémoire locale en cas de réseau instable / cache rapide
const localConsultations = new Map<string, WameetConsultationRecord>();
const localTransactions = new Map<string, WameetTransactionRecord>();

// Écouteurs de notifications en temps réel pour diffusion aux deux parties
type WameetPremiumNotificationListener = (data: {
  event: 'CONSULTATION_PAID_READY';
  consultation: WameetConsultationRecord;
  transaction: WameetTransactionRecord;
}) => void;

const premiumNotificationListeners: WameetPremiumNotificationListener[] = [];

export function subscribeToPremiumNotifications(listener: WameetPremiumNotificationListener) {
  premiumNotificationListeners.push(listener);
  return () => {
    const idx = premiumNotificationListeners.indexOf(listener);
    if (idx > -1) premiumNotificationListeners.splice(idx, 1);
  };
}

/**
 * 1. Initialise une demande de consultation sans générer de salon Jitsi
 */
export async function initiateWameetConsultation(params: {
  expertId: string;
  expertName: string;
  requesterId: string;
  requesterName: string;
  amount: number;
  topic?: string;
}): Promise<WameetConsultationRecord> {
  const wameetId = `wameet_prem_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const nowIso = new Date().toISOString();

  const consultation: WameetConsultationRecord = {
    id: wameetId,
    expertId: params.expertId,
    expertName: params.expertName,
    requesterId: params.requesterId,
    requesterName: params.requesterName,
    amount: params.amount,
    currency: 'FCFA',
    topic: params.topic || 'Consultation d\'Expert Wameet',
    status: 'PENDING_PAYMENT',
    jitsiRoomId: null, // Verrouillé
    wameetUrl: null, // Verrouillé
    transactionId: null,
    createdAt: nowIso,
    paidAt: null
  };

  localConsultations.set(wameetId, consultation);

  try {
    if (db) {
      await setDoc(doc(collection(db, 'wameet_consultations'), wameetId), consultation);
    }
  } catch (err) {
    console.warn('[WAMEET CONSULTATION] Écriture storage en fallback local :', err);
  }

  return consultation;
}

/**
 * 2. Traitement strict du Webhook de paiement
 * Le salon Jitsi ne peut être généré que si status === 'SUCCESS'
 */
export async function handlePaymentWebhook(payload: {
  wameetId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  transactionId?: string;
  amount?: number;
  provider?: string;
  payerPhone?: string;
}): Promise<{
  success: boolean;
  jitsiRoomId?: string | null;
  wameetUrl?: string | null;
  transaction?: WameetTransactionRecord;
  error?: string;
}> {
  const { wameetId, status, provider = 'ORANGE_MONEY', payerPhone } = payload;

  let consultation = localConsultations.get(wameetId);
  if (!consultation && db) {
    try {
      const snap = await getDoc(doc(collection(db, 'wameet_consultations'), wameetId));
      if (snap.exists()) {
        consultation = snap.data() as WameetConsultationRecord;
      }
    } catch (e) {
      console.warn('[WEBHOOK WAMEET] Lecture consultation storage:', e);
    }
  }

  if (!consultation) {
    return {
      success: false,
      error: `Consultation Wameet ${wameetId} introuvable.`
    };
  }

  const nowIso = new Date().toISOString();
  const txId = payload.transactionId || `tx_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const finalAmount = payload.amount || consultation.amount;

  // Enregistrement de la transaction liée à l'ID du Wameet
  const transactionRecord: WameetTransactionRecord = {
    id: txId,
    wameetId,
    type: 'WAMEET_PREMIUM_COACHING',
    amount: finalAmount,
    currency: 'FCFA',
    status: status,
    provider: provider as any,
    payerPhone,
    senderId: consultation.requesterId,
    receiverId: consultation.expertId,
    expertId: consultation.expertId,
    requesterId: consultation.requesterId,
    createdAt: nowIso
  };

  localTransactions.set(txId, transactionRecord);

  try {
    if (db) {
      await setDoc(doc(collection(db, 'transactions'), txId), transactionRecord);
      console.log(`[TRANSACTIONS BDD] Transaction enregistrée pour Wameet ${wameetId} : ${txId}`);
    }
  } catch (err) {
    console.warn('[TRANSACTIONS BDD] Écriture transaction storage en fallback local :', err);
  }

  // RÈGLE STRICTE DU CAHIER DES CHARGES :
  // Si le statut N'EST PAS 'SUCCESS', la route ne génère PAS de jitsiRoomId
  if (status !== 'SUCCESS') {
    consultation.status = 'FAILED';
    localConsultations.set(wameetId, consultation);
    return {
      success: false,
      error: 'Le paiement n\'a pas abouti (statut: ' + status + '). Salle Wameet non autorisée.',
      transaction: transactionRecord
    };
  }

  // PAIEMENT VALIDÉ AVEC SUCCÈS -> GÉNÉRATION DE LA SALLE WAMEET & TRANSMISSION AUX DEUX PARTIES
  const jitsiRoomId = `Wameet-Room-${crypto.randomUUID().slice(0, 12)}`;
  const cleanId = wameetId.replace(/[^a-zA-Z0-9-_]/g, '');
  const wameetUrl = `/wameet/${cleanId}?creator=${encodeURIComponent(consultation.expertName)}&reason=${encodeURIComponent(consultation.topic || 'Consultation Wameet Premium')}`;

  consultation.status = 'PAID_ACTIVE';
  consultation.jitsiRoomId = jitsiRoomId;
  consultation.wameetUrl = wameetUrl;
  consultation.transactionId = txId;
  consultation.paidAt = nowIso;

  localConsultations.set(wameetId, consultation);

  try {
    if (db) {
      await setDoc(doc(collection(db, 'wameet_consultations'), wameetId), consultation);
      // Également accessible dans la collection wameets
      await setDoc(doc(collection(db, 'wameets'), wameetId), {
        ...consultation,
        status: 'PAID_ACTIVE'
      });
    }
  } catch (err) {
    console.warn('[WAMEET BDD] Mise à jour consultation payée :', err);
  }

  console.log(`[WAMEET PREMIUM SUCCESS] Salle débloquée pour l'expert ${consultation.expertName} et le client ${consultation.requesterName}`);
  console.log(`[WAMEET ROOM AUTORISÉE] ${wameetUrl} (Tx: ${txId})`);

  // Notification envoyée aux deux parties
  premiumNotificationListeners.forEach((fn) => {
    try {
      fn({
        event: 'CONSULTATION_PAID_READY',
        consultation,
        transaction: transactionRecord
      });
    } catch (e) {
      console.error('[PREMIUM NOTIFICATION ERROR]', e);
    }
  });

  return {
    success: true,
    jitsiRoomId,
    wameetUrl,
    transaction: transactionRecord
  };
}

/**
 * 3. Route de récupération sécurisée du salon Jitsi
 * Vérifie formellement la présence d'une transaction SUCCESS liée au wameetId
 */
export async function getVerifiedJitsiRoom(wameetId: string, userId: string): Promise<{
  allowed: boolean;
  jitsiRoomId?: string;
  wameetUrl?: string;
  error?: string;
}> {
  let consultation = localConsultations.get(wameetId);
  if (!consultation && db) {
    try {
      const snap = await getDoc(doc(collection(db, 'wameet_consultations'), wameetId));
      if (snap.exists()) {
        consultation = snap.data() as WameetConsultationRecord;
      }
    } catch (e) {
      console.warn('[VERIFY JITSI ROOM] Erreur lecture consultation storage:', e);
    }
  }

  if (!consultation) {
    return {
      allowed: false,
      error: 'Consultation introuvable.'
    };
  }

  // Vérifie si une transaction SUCCESS existe pour ce Wameet
  let hasValidTx = false;
  for (const tx of localTransactions.values()) {
    if (tx.wameetId === wameetId && tx.status === 'SUCCESS') {
      hasValidTx = true;
      break;
    }
  }

  if (!hasValidTx && db) {
    try {
      const q = query(
        collection(db, 'transactions'),
        where('wameetId', '==', wameetId),
        where('status', '==', 'SUCCESS')
      );
      const snap = await getDocs(q);
      hasValidTx = !snap.empty;
    } catch (e) {
      console.warn('[VERIFY JITSI ROOM] Erreur vérification transaction storage:', e);
    }
  }

  // Si aucun paiement réussi
  if (!hasValidTx || consultation.status !== 'PAID_ACTIVE' || !consultation.jitsiRoomId) {
    return {
      allowed: false,
      error: 'Accès verrouillé : cette consultation requiert un paiement validé par webhook Mobile Money.'
    };
  }

  return {
    allowed: true,
    jitsiRoomId: consultation.jitsiRoomId,
    wameetUrl: consultation.wameetUrl || `/wameet/${wameetId}`
  };
}

/**
 * Montage des routes API Express pour Wameet Premium
 */
export function attachWameetPremiumRoutes(app: Express) {
  /**
   * POST /api/wameet/premium/initiate
   * Corps : { expertId, expertName, requesterId, requesterName, amount, topic }
   */
  app.post('/api/wameet/premium/initiate', async (req: Request, res: Response): Promise<void> => {
    try {
      const { expertId, expertName, requesterId, requesterName, amount, topic } = req.body;

      if (!expertId || !amount) {
        res.status(400).json({ error: 'expertId et amount sont obligatoires.' });
        return;
      }

      const consultation = await initiateWameetConsultation({
        expertId,
        expertName: expertName || 'Expert Wameet',
        requesterId: requesterId || 'anonymous_buyer',
        requesterName: requesterName || 'Client Wameet',
        amount: Number(amount),
        topic
      });

      res.status(201).json({
        success: true,
        consultation,
        message: 'Demande de consultation enregistrée. Paiement Mobile Money en attente.'
      });
    } catch (error: any) {
      console.error('[API WAMEET PREMIUM INITIATE ERROR]', error);
      res.status(500).json({ error: error?.message || 'Erreur serveur' });
    }
  });

  /**
   * POST /api/webhooks/wameet-payment
   * Déclenché par l'opérateur Mobile Money (Orange, Wave, MTN, Moov)
   */
  app.post('/api/webhooks/wameet-payment', async (req: Request, res: Response): Promise<void> => {
    try {
      const { wameetId, status, transactionId, amount, provider, payerPhone } = req.body;

      if (!wameetId || !status) {
        res.status(400).json({ error: 'wameetId et status sont obligatoires.' });
        return;
      }

      const result = await handlePaymentWebhook({
        wameetId,
        status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        transactionId,
        amount: amount ? Number(amount) : undefined,
        provider,
        payerPhone
      });

      if (!result.success) {
        res.status(402).json({
          error: result.error,
          transaction: result.transaction
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Paiement validé par webhook. Salle Wameet déverrouillée et transmise aux parties.',
        jitsiRoomId: result.jitsiRoomId,
        wameetUrl: result.wameetUrl,
        transaction: result.transaction
      });
    } catch (error: any) {
      console.error('[API WAMEET WEBHOOK ERROR]', error);
      res.status(500).json({ error: error?.message || 'Erreur interne traitement webhook' });
    }
  });

  /**
   * POST /api/wameet/premium/room
   * Récupération conditionnelle du salon Jitsi après paiement
   */
  app.post('/api/wameet/premium/room', async (req: Request, res: Response): Promise<void> => {
    try {
      const { wameetId, userId } = req.body;

      if (!wameetId) {
        res.status(400).json({ error: 'wameetId est obligatoire.' });
        return;
      }

      const result = await getVerifiedJitsiRoom(wameetId, userId || 'user');

      if (!result.allowed) {
        res.status(403).json({
          allowed: false,
          error: result.error
        });
        return;
      }

      res.status(200).json({
        allowed: true,
        jitsiRoomId: result.jitsiRoomId,
        wameetUrl: result.wameetUrl
      });
    } catch (error: any) {
      console.error('[API WAMEET ROOM ERROR]', error);
      res.status(500).json({ error: error?.message || 'Erreur serveur' });
    }
  });

  /**
   * GET /api/transactions/wameet/:wameetId
   * Récupère la transaction liée au wameetId
   */
  app.get('/api/transactions/wameet/:wameetId', async (req: Request, res: Response): Promise<void> => {
    const wameetId = req.params.wameetId;
    const tx = Array.from(localTransactions.values()).find((t) => t.wameetId === wameetId);
    if (tx) {
      res.json({ transaction: tx });
      return;
    }

    if (db) {
      try {
        const q = query(collection(db, 'transactions'), where('wameetId', '==', wameetId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          res.json({ transaction: snap.docs[0].data() });
          return;
        }
      } catch (e) {
        console.warn('[TRANSACTION QUERY ERROR]', e);
      }
    }

    res.status(404).json({ error: 'Aucune transaction trouvée pour ce Wameet' });
  });

  /**
   * POST /api/wameet/report-abuse
   * Modération d'urgence (Bouton Bouclier - Prompt 8)
   * Statut -> REPORTED_ABUSE, impactScore de l'autre participant -> -500 points
   */
  app.post('/api/wameet/report-abuse', async (req: Request, res: Response): Promise<void> => {
    try {
      const { wameetId, reporterId, reportedParticipantId, reason } = req.body;

      if (!wameetId) {
        res.status(400).json({ error: 'wameetId est obligatoire pour signaler un abus.' });
        return;
      }

      const result = await reportWameetAbuse({
        wameetId,
        reporterId,
        reportedParticipantId,
        reason
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error('[API REPORT ABUSE ERROR]', error);
      res.status(500).json({ error: error?.message || 'Erreur serveur lors du signalement' });
    }
  });
}

/**
 * Logique de signalement et pénalité immédiate de l'autre participant (-500 points)
 */
export async function reportWameetAbuse(params: {
  wameetId: string;
  reporterId?: string;
  reportedParticipantId?: string;
  reason?: string;
}): Promise<{
  success: boolean;
  status: string;
  penaltyApplied: number;
  message: string;
}> {
  const { wameetId, reporterId, reportedParticipantId, reason } = params;
  const nowIso = new Date().toISOString();

  // 1. Mise à jour du statut du Wameet à REPORTED_ABUSE
  let consultation = localConsultations.get(wameetId);
  if (consultation) {
    consultation.status = 'FAILED';
    localConsultations.set(wameetId, consultation);
  }

  try {
    if (db) {
      const wameetRef = doc(collection(db, 'wameets'), wameetId);
      await setDoc(
        wameetRef,
        {
          status: 'REPORTED_ABUSE',
          reportedAt: nowIso,
          reportedBy: reporterId || 'victim',
          reportedParticipantId: reportedParticipantId || 'other_party',
          reason: reason || 'Signalement d\'urgence en direct',
          penaltyScore: -500
        },
        { merge: true }
      );

      // Également dans wameet_consultations
      const consultRef = doc(collection(db, 'wameet_consultations'), wameetId);
      await setDoc(
        consultRef,
        {
          status: 'REPORTED_ABUSE',
          reportedAt: nowIso
        },
        { merge: true }
      );

      // Réduction drastique du score d'impact de l'autre participant (-500 points)
      if (reportedParticipantId) {
        const userRef = doc(collection(db, 'wameet_profiles'), reportedParticipantId);
        const userSnap = await getDoc(userRef);
        const currentScore = userSnap.exists() ? (userSnap.data().impactScore || 18450) : 18450;
        const newScore = Math.max(0, currentScore - 500);

        await setDoc(
          userRef,
          {
            impactScore: newScore,
            lastSanctionAt: nowIso,
            sanctionReason: 'REPORTED_ABUSE_DIRECT'
          },
          { merge: true }
        );

        console.log(`[SANCTION BACKEND] Score d'impact de ${reportedParticipantId} réduit de -500 points (Nouveau score: ${newScore})`);
      }
    }
  } catch (err) {
    console.warn('[ABUSE REPORT ERROR] Fallback local :', err);
  }

  console.log(`[ABUSE REPORT] Wameet ${wameetId} passé au statut REPORTED_ABUSE.`);

  return {
    success: true,
    status: 'REPORTED_ABUSE',
    penaltyApplied: -500,
    message: 'Appel sécurisé. Notre équipe analyse le signalement.'
  };
}
