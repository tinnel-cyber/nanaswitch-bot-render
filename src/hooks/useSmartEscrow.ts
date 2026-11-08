import { useState, useEffect, useCallback } from 'react';
import {
  WameetEscrowMessage,
  handlePaymentClick,
  subscribeToEscrowMessage,
  releaseFunds
} from '../services/wameetEscrowService';
import { EscrowStatus } from '../components/wameet/EscrowMessageBubble';

export interface UseSmartEscrowOptions {
  chatId: string;
  messageId: string;
  initialMessage?: Partial<WameetEscrowMessage>;
  currentUserId?: string;
  userRole?: 'buyer' | 'seller';
  onStatusChange?: (newStatus: EscrowStatus) => void;
}

export function useSmartEscrow({
  chatId,
  messageId,
  initialMessage,
  currentUserId,
  userRole = 'buyer',
  onStatusChange
}: UseSmartEscrowOptions) {
  const [status, setStatus] = useState<EscrowStatus>(
    (initialMessage?.escrowStatus || 'pending') as EscrowStatus
  );
  const [transactionId, setTransactionId] = useState<string>(
    initialMessage?.transactionId || ''
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentUrl, setPaymentUrl] = useState<string | undefined>(
    initialMessage?.paymentUrl
  );
  const [error, setError] = useState<string | null>(null);

  // 1. Écoute en temps réel via Supabase Realtime (remplace Firestore onSnapshot)
  // Dès que le webhook sur Render valide le paiement Sebpay, le statut passe automatiquement à 'locked' !
  useEffect(() => {
    if (!chatId || !messageId) return;

    const unsubscribe = subscribeToEscrowMessage(chatId, messageId, updated => {
      if (updated.escrowStatus && updated.escrowStatus !== status) {
        console.log(`[USE SMART ESCROW] Mise à jour en temps réel : ${status} -> ${updated.escrowStatus}`);
        setStatus(updated.escrowStatus);
        if (onStatusChange) {
          onStatusChange(updated.escrowStatus);
        }
      }
      if (updated.transactionId) {
        setTransactionId(updated.transactionId);
      }
    });

    return () => unsubscribe();
  }, [chatId, messageId, status, onStatusChange]);

  // 2. Déclenchement du paiement Mobile Money par l'acheteur
  const onPay = useCallback(async (buyerPhone?: string, buyerName?: string) => {
    if (!initialMessage?.amount || !initialMessage?.itemTitle) {
      setError('Informations de commande incomplètes.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const result = await handlePaymentClick({
      chatId,
      messageId,
      transactionId,
      itemTitle: initialMessage.itemTitle,
      amount: initialMessage.amount,
      buyerPhone: buyerPhone || '',
      buyerName: buyerName || 'Acheteur Wameet',
      buyerId: currentUserId || 'buyer_default',
      sellerId: initialMessage.sellerId || 'seller_default'
    });

    setIsProcessing(false);

    if (result.success && result.paymentUrl) {
      setPaymentUrl(result.paymentUrl);
      if (result.transactionId) {
        setTransactionId(result.transactionId);
      }
    } else if (result.error) {
      setError(result.error);
    }
  }, [chatId, messageId, transactionId, initialMessage, currentUserId]);

  // 3. Libération des fonds vers le vendeur par l'acheteur
  const onConfirmDelivery = useCallback(async () => {
    if (!transactionId) {
      setError('Identifiant de transaction manquant.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const result = await releaseFunds({
      transactionId,
      chatId,
      messageId,
      buyerId: currentUserId || 'buyer_default'
    });

    setIsProcessing(false);

    if (result.success) {
      setStatus('released');
      if (onStatusChange) {
        onStatusChange('released');
      }
    } else if (result.error) {
      setError(result.error);
    }
  }, [transactionId, chatId, messageId, currentUserId, onStatusChange]);

  return {
    status,
    transactionId,
    paymentUrl,
    isProcessing,
    error,
    onPay,
    onConfirmDelivery,
    userRole
  };
}

export default useSmartEscrow;
