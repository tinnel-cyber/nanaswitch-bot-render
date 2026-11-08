import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { supabase } from '../lib/supabase';
import { db } from '../firebase';
import { EscrowStatus } from '../components/wameet/EscrowMessageBubble';

// ============================================================================
// 1. MODÈLE DE DONNÉES DU MESSAGE SMART ESCROW (PRODUCTION)
// ============================================================================

export interface WameetEscrowMessage {
  id: string;
  chatId: string;
  type: 'escrow';
  senderId: string;
  recipientId: string;
  sellerId: string;
  buyerId: string;
  itemTitle: string;
  amount: number; // Montant en FCFA
  currency: 'XOF' | 'FCFA';
  transactionId?: string;
  escrowStatus: EscrowStatus; // 'pending' | 'locked' | 'released'
  itemImageUrl?: string;
  paymentUrl?: string;
  paymentOperator?: string;
  lockedAt?: string | null;
  releasedAt?: string | null;
  createdAt: string;
}

// URL de base du micro-service de paiement sur Render (ou fallback local)
const PAYMENT_API_BASE_URL =
  import.meta.env.VITE_PAYMENT_API_URL ||
  'https://nana-payment-api.onrender.com';

// ============================================================================
// 2. FONCTION FRONTEND : INITIATION DU PAIEMENT MOBILE MONEY (handlePaymentClick)
// ============================================================================

export interface InitiatePaymentParams {
  chatId: string;
  messageId: string;
  transactionId?: string;
  itemTitle: string;
  amount: number;
  currency?: string;
  buyerPhone: string;
  buyerName?: string;
  buyerId: string;
  sellerId: string;
  operator?: string;
}

/**
 * Appelle l'API Render pour générer le lien de paiement Mobile Money sécurisé (Sebpay/CinetPay)
 * et ouvre la passerelle de paiement (dans un nouvel onglet ou modale).
 */
export async function handlePaymentClick(
  params: InitiatePaymentParams
): Promise<{ success: boolean; paymentUrl?: string; transactionId: string; error?: string }> {
  try {
    console.log(`[SMART ESCROW] Initiation du paiement pour ${params.itemTitle} (${params.amount} FCFA)...`);

    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/escrow/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chatId: params.chatId,
        messageId: params.messageId,
        transactionId: params.transactionId,
        itemTitle: params.itemTitle,
        amount: params.amount,
        currency: params.currency || 'XOF',
        buyerPhone: params.buyerPhone,
        buyerName: params.buyerName || 'Client Wameet',
        buyerId: params.buyerId,
        sellerId: params.sellerId,
        operator: params.operator || 'MOMO'
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Échec de la génération du lien de paiement.');
    }

    const paymentUrl = data.paymentUrl || data.provider_link || data.redirectUrl;

    if (paymentUrl) {
      // Ouvre la passerelle Mobile Money (Wave, Orange, MTN, Moov)
      window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    }

    return {
      success: true,
      paymentUrl,
      transactionId: data.transactionId
    };
  } catch (err: any) {
    console.error('[SMART ESCROW PAYMENT ERROR]', err);
    return {
      success: false,
      transactionId: params.transactionId || '',
      error: err.message || 'Erreur réseau lors de l\'initiation du paiement'
    };
  }
}

// ============================================================================
// 3. SYNCHRONISATION TEMPS RÉEL DU STATUT ESCROW (onSnapshot)
// ============================================================================

/**
 * Écoute en temps réel les changements de statut de la bulle Escrow via Supabase Realtime.
 * Dès que le webhook valide le paiement bancaire, la bulle passe de 'pending' à 'locked' instantanément !
 */
export function subscribeToEscrowMessage(
  chatId: string,
  messageId: string,
  onUpdate: (message: Partial<WameetEscrowMessage>) => void
): () => void {
  const channelName = `escrow_msg_${messageId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'wameet_messages',
        filter: `id=eq.${messageId}`,
      },
      (payload) => {
        if (payload.new) {
          const data = payload.new as any;
          onUpdate({
            id: data.id || messageId,
            chatId,
            transactionId: data.transaction_id,
            escrowStatus: (data.escrow_status || data.status || 'pending') as EscrowStatus,
            amount: data.amount,
            itemTitle: data.item_title || data.text,
            lockedAt: data.locked_at,
            releasedAt: data.released_at
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================================
// 4. FONCTION FRONTEND : LIBÉRATION DES FONDS PAR L'ACHETEUR (releaseFunds)
// ============================================================================

export interface ReleaseFundsParams {
  transactionId: string;
  chatId: string;
  messageId: string;
  buyerId: string;
}

/**
 * Déclenchée par l'acheteur au clic sur "Confirmer la réception".
 * Appelle l'API backend pour débloquer les fonds et créditer le vendeur.
 */
export async function releaseFunds(
  params: ReleaseFundsParams
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    console.log(`[SMART ESCROW] Déblocage des fonds pour la transaction ${params.transactionId}...`);

    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/escrow/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionId: params.transactionId,
        chatId: params.chatId,
        messageId: params.messageId,
        buyerId: params.buyerId
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Échec de la libération des fonds.');
    }

    return {
      success: true,
      message: data.message || 'Fonds libérés avec succès au vendeur.'
    };
  } catch (err: any) {
    console.error('[SMART ESCROW RELEASE ERROR]', err);
    return {
      success: false,
      error: err.message || 'Erreur réseau lors de la libération des fonds'
    };
  }
}
