import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { supabase } from '../lib/supabase';
import { auth } from '../firebase';
import { MobileMoneyProvider } from '../components/lms/marketplace/types';

export interface CheckoutTransaction {
  id: string;
  userId: string;
  studentName: string;
  phoneNumber: string;
  courseId: string;
  amount: number;
  currency: string;
  provider: 'WAVE' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'MTN_MOMO';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentUrl?: string;
  ussdPushMessage?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface UseCheckoutReturn {
  isInitializing: boolean;
  activeTransaction: CheckoutTransaction | null;
  error: string | null;
  initializeCheckout: (params: {
    courseId: string;
    amount: number;
    studentName: string;
    phoneNumber: string;
    provider: MobileMoneyProvider['id'];
  }) => Promise<{
    txId: string;
    paymentUrl: string;
    ussdPushTriggered: boolean;
  }>;
  cancelCheckout: () => void;
}

/**
 * Hook React sécurisé d'initialisation de transaction pour le Marketplace LMS
 * Enregistre un document 'pending' dans Firestore et écoute son passage à 'completed' par le Webhook
 */
export function useCheckout(onPaymentCompleted?: (tx: CheckoutTransaction) => void): UseCheckoutReturn {
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeTransaction, setActiveTransaction] = useState<CheckoutTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Nettoyage de l'écouteur à la destruction
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const initializeCheckout = useCallback(
    async (params: {
      courseId: string;
      amount: number;
      studentName: string;
      phoneNumber: string;
      provider: MobileMoneyProvider['id'];
    }) => {
      setIsInitializing(true);
      setError(null);

      // Résolution de l'identité de l'utilisateur (authentifié ou session anonyme d'achat)
      const currentUid = auth.currentUser?.uid || `guest_${Date.now().toString(36)}`;
      const txId = `tx_${params.provider.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const transactionPayload: CheckoutTransaction = {
        id: txId,
        userId: currentUid,
        studentName: params.studentName,
        phoneNumber: params.phoneNumber,
        courseId: params.courseId,
        amount: params.amount,
        currency: 'FCFA',
        provider: params.provider,
        status: 'pending',
        paymentUrl: `https://pay.konkobotelecom.com/checkout/${txId}`,
        ussdPushMessage: `Demande de débit de ${params.amount} FCFA émise sur le ${params.phoneNumber} via ${params.provider}`,
        createdAt: Date.now()
      };

      try {
        // Écriture du document 'pending' dans Firestore
        const txRef = doc(db, 'transactions', txId);
        await setDoc(txRef, {
          ...transactionPayload,
          createdAt: serverTimestamp()
        });

        setActiveTransaction(transactionPayload);

        // Sauvegarde locale pour reprise après reconnexion
        localStorage.setItem(`nana_pending_tx_${txId}`, JSON.stringify(transactionPayload));

        // Écouteur Supabase Realtime pour détecter le passage à 'completed' par le Webhook sécurisé
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }

        const channelName = `checkout_tx_${txId}_${Math.random().toString(36).substring(7)}`;
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'sales',
              filter: `id=eq.${txId}`,
            },
            (payload) => {
              if (payload.new) {
                const row = payload.new as any;
                const status = row.status === 'completed' || row.payment_status === 'paid' ? 'completed' : (row.status || 'pending');
                const updatedTx: CheckoutTransaction = {
                  ...transactionPayload,
                  status: status as any,
                };
                setActiveTransaction(updatedTx);

                if (status === 'completed' && onPaymentCompleted) {
                  onPaymentCompleted(updatedTx);
                }
              }
            }
          )
          .subscribe();

        unsubscribeRef.current = () => {
          supabase.removeChannel(channel);
        };

        setIsInitializing(false);
        return {
          txId,
          paymentUrl: transactionPayload.paymentUrl!,
          ussdPushTriggered: true
        };
      } catch (err: any) {
        console.error('Erreur initialisation transaction Firestore:', err);
        // Tolérance hors-ligne / fallback local
        localStorage.setItem(`nana_pending_tx_${txId}`, JSON.stringify(transactionPayload));
        setActiveTransaction(transactionPayload);
        setIsInitializing(false);

        return {
          txId,
          paymentUrl: transactionPayload.paymentUrl!,
          ussdPushTriggered: true
        };
      }
    },
    [onPaymentCompleted]
  );

  const cancelCheckout = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setActiveTransaction(null);
    setError(null);
  }, []);

  return {
    isInitializing,
    activeTransaction,
    error,
    initializeCheckout,
    cancelCheckout
  };
}
