/**
 * [DEPRECATED & NEUTRALISÉ] Service SMS Firebase RTDB
 * L'ancienne logique de forward sender et de polling SMS sur /sms_recus.json est définitivement dépréciée.
 * 100% des paiements sont traités par le micro-service Render (nana-payment-api avec sortie Fixie 54.195.3.54).
 * Ce fichier conserve les signatures TypeScript pour rétro-compatibilité sans émettre aucune requête réseau vers /sms_recus.
 */

import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { addUserCredits } from '../utils/firestoreService';
import { verifyPaymentTransaction } from './paymentApiService';

export const RTDB_BASE_URL = "https://nanasore-default-rtdb.firebaseio.com";
export const RTDB_SMS_BASE = `${RTDB_BASE_URL}/sms_recus`;
export const RTDB_ARCHIVE_BASE = `${RTDB_BASE_URL}/transactions_validees`;
export const RTDB_COMMANDES_ATTENTE_BASE = `${RTDB_BASE_URL}/commandes_attente`;

export async function persistPendingOrderToRtdb(orderRef: string, orderData: any): Promise<boolean> {
  // Déprécié : No-op sécurisé
  return true;
}

export async function simulateIncomingPaymentSms(params: {
  operator: 'Orange' | 'Moov' | 'Wave' | 'MTN';
  amount: number;
  transactionRef: string;
  senderPhone?: string;
}): Promise<boolean> {
  // Déprécié : No-op sécurisé
  return true;
}

export const MOBILE_MONEY_KEYWORDS = [
  'fcfa',
  'f cfa',
  'recu',
  'reçu',
  'depot',
  'dépôt',
  'transfert',
  'solde',
  'trans',
  'transaction',
  'paiement'
];

export const PAYMENT_KEYWORDS = MOBILE_MONEY_KEYWORDS;

export const TEST_MARKERS = [
  '[sms_message]',
  '[sms_body]',
  '{sms_body}',
  'test5000',
  'test'
];

export function isTestSms(rawText: string): boolean {
  if (!rawText) return true;
  const lower = rawText.toLowerCase();
  return TEST_MARKERS.some(marker => lower.includes(marker));
}

export function hasMobileMoneyKeyword(rawText: string): boolean {
  if (!rawText) return false;
  const lower = rawText.toLowerCase();
  return MOBILE_MONEY_KEYWORDS.some(kw => lower.includes(kw));
}

export const isPaymentRelatedSms = hasMobileMoneyKeyword;

export function hasSmsAmount(rawText: string): boolean {
  if (!rawText) return false;
  return /\b\d{3,7}\b/.test(rawText);
}

export function extractSmsTimestamp(sms: any): number {
  if (!sms) return Date.now();
  if (typeof sms.timestamp === 'number') return sms.timestamp;
  if (typeof sms.date === 'number') return sms.date;
  return Date.now();
}

export async function deleteSmsFromRtdb(smsId: string): Promise<boolean> {
  // Déprécié : No-op sécurisé
  return true;
}

export async function isTransactionAlreadyValidated(transactionRef: string): Promise<boolean> {
  // Déprécié : No-op sécurisé
  return false;
}

export async function archiveAndConsumeSms(
  smsId: string,
  transactionRef: string,
  metadata?: {
    amount?: number;
    phone?: string;
    storeId?: string;
    userId?: string;
  }
): Promise<boolean> {
  // Déprécié : No-op sécurisé
  return true;
}

export async function consumeAndPurgeValidatedSms(
  smsId: string,
  transactionRef?: string,
  metadata?: { amount?: number; phone?: string; storeId?: string; userId?: string }
): Promise<boolean> {
  return true;
}

export interface AutoCleanSmsReport {
  totalDeleted: number;
  purgedExpired24h: number;
  purgedInvalidOrNoKeyword: number;
  remainingCount: number;
}

export interface PurgeReport extends AutoCleanSmsReport {
  purgedTests: number;
  purgedNonPayment: number;
  purgedExpired: number;
  totalPurged: number;
}

export async function autoCleanSmsDatabase(): Promise<AutoCleanSmsReport> {
  return {
    totalDeleted: 0,
    purgedExpired24h: 0,
    purgedInvalidOrNoKeyword: 0,
    remainingCount: 0
  };
}

export async function purgeAndCleanSmsDatabase(): Promise<PurgeReport> {
  return {
    totalDeleted: 0,
    purgedExpired24h: 0,
    purgedInvalidOrNoKeyword: 0,
    remainingCount: 0,
    purgedTests: 0,
    purgedNonPayment: 0,
    purgedExpired: 0,
    totalPurged: 0
  };
}

export interface VerifyPaymentResult {
  success: boolean;
  message: string;
  transactionRef?: string;
  amountFound?: number;
  alreadyValidated?: boolean;
  totalAnalyzed?: number;
  matchedSms?: any;
}

/**
 * Route exclusivement vers la nouvelle API Render
 */
export async function verifyAndMatchClientPayment(criteria: {
  amount?: number;
  phone?: string;
  transactionId?: string;
  storeId?: string;
  userId?: string;
  planId?: string;
  creditBonus?: number;
}): Promise<VerifyPaymentResult> {
  const txId = criteria.transactionId?.trim() || '';
  if (!txId || txId.length < 3) {
    return {
      success: false,
      message: "Identifiant de transaction requis."
    };
  }

  try {
    const res = await verifyPaymentTransaction(txId, criteria.amount, criteria.phone);
    if (res.success) {
      if (criteria.storeId && criteria.storeId !== 'nanasore_central_hub') {
        try {
          const storeRef = doc(db, 'stores', criteria.storeId);
          await updateDoc(storeRef, {
            'subscription.status': 'ACTIVE',
            'subscription.lastPaymentMethod': 'RENDER_PAYMENT_API',
            'subscription.lastAmountPaid': criteria.amount || 0,
            'subscription.transactionRef': txId,
            'subscription.datePaiement': Date.now(),
            'subscription.updatedAt': Date.now()
          }).catch(async () => {
            await setDoc(storeRef, {
              subscription: {
                status: 'ACTIVE',
                lastPaymentMethod: 'RENDER_PAYMENT_API',
                lastAmountPaid: criteria.amount || 0,
                transactionRef: txId,
                datePaiement: Date.now(),
                updatedAt: Date.now()
              }
            }, { merge: true });
          });
        } catch {}
      }

      if (criteria.userId && criteria.creditBonus && criteria.creditBonus > 0) {
        try {
          await addUserCredits(criteria.userId, criteria.creditBonus, txId);
        } catch {}
      }

      return {
        success: true,
        transactionRef: res.transactionRef || txId,
        amountFound: criteria.amount,
        message: res.message || "Paiement validé avec succès par la passerelle de paiement !"
      };
    }

    return {
      success: false,
      transactionRef: txId,
      message: res.message || "En attente de confirmation par le serveur bancaire."
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Erreur lors de la vérification bancaire."
    };
  }
}
