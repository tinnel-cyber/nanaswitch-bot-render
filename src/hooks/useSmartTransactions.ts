import { useState, useEffect, useCallback, useRef } from 'react';
import {
  smartSocketClient,
  SmartSocketEventPayload
} from '../services/smartTransactionSocketService';
import {
  handlePaymentClick,
  releaseFunds,
  subscribeToEscrowMessage
} from '../services/wameetEscrowService';
import { SmartActionType } from '../components/wameet/WameetMessageInput';
import {
  SmartTransactionType,
  SmartTransactionData
} from '../components/wameet/SmartTransactionBubble';
import { playTapBeep, playValidationBeep } from '../utils/audio';
import { supabase } from '../lib/supabase';

// ============================================================================
// TYPES ET INTERFACES DU HOOK useSmartTransactions
// ============================================================================

export interface WameetTransactionChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderHandle?: string;
  senderAvatar?: string;
  recipientId?: string;
  recipientName?: string;
  type: 'transaction' | 'text' | 'voice' | 'product';
  transactionType: SmartTransactionType;
  transactionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'locked' | 'released' | 'failed' | 'active' | string;
  title: string;
  text?: string;
  data: SmartTransactionData;
  createdAt: string;
  createdAtTimestamp: number;
  isOptimistic?: boolean;
}

export interface EscrowPaymentModalState {
  isOpen: boolean;
  paymentUrl: string | null;
  transactionId: string | null;
  amount: number;
  title: string;
  currency: string;
  sellerId?: string;
  sellerName?: string;
  buyerPhone?: string;
  buyerName?: string;
}

export interface CurrentUserChatProfile {
  id?: string;
  uid?: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  phone?: string;
  [key: string]: any;
}

export interface UseSmartTransactionsOptions {
  initialMessages?: WameetTransactionChatMessage[];
  onTransactionUpdated?: (data: SmartSocketEventPayload) => void;
  onPaymentOpened?: (url: string, transactionId: string) => void;
  onReleaseSuccess?: (transactionId: string) => void;
}

export interface UseSmartTransactionsReturn {
  messages: WameetTransactionChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<WameetTransactionChatMessage[]>>;
  handleSendSmartAction: (
    type: SmartActionType | string,
    amount: number | string,
    payload?: Partial<SmartTransactionData> & Record<string, any>
  ) => Promise<WameetTransactionChatMessage>;
  handlePayEscrow: (
    transactionId: string,
    options?: { buyerPhone?: string; buyerName?: string; operator?: string }
  ) => Promise<{ success: boolean; paymentUrl?: string; error?: string }>;
  handleReleaseEscrow: (
    transactionId: string
  ) => Promise<{ success: boolean; error?: string }>;
  paymentModal: EscrowPaymentModalState;
  closePaymentModal: () => void;
  isProcessingAction: boolean;
  socketStatus: 'connected' | 'connecting' | 'disconnected';
  activeTransaction: WameetTransactionChatMessage | null;
  setActiveTransaction: (tx: WameetTransactionChatMessage | null) => void;
  error: string | null;
}

/**
 * CUSTOM HOOK useSmartTransactions (Wameet Production)
 * Connecte les boutons du SmartActionMenu aux actions réelles et assure
 * la synchronisation temps réel par WebSocket et Firestore (Dual-Sync Zero Downtime).
 */
export function useSmartTransactions(
  chatId: string,
  currentUser: CurrentUserChatProfile,
  options?: UseSmartTransactionsOptions
): UseSmartTransactionsReturn {
  const [messages, setMessages] = useState<WameetTransactionChatMessage[]>(
    options?.initialMessages || []
  );
  const [socketStatus, setSocketStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTransaction, setActiveTransaction] = useState<WameetTransactionChatMessage | null>(null);

  // État de la modale de paiement sécurisée pour l'acheteur
  const [paymentModal, setPaymentModal] = useState<EscrowPaymentModalState>({
    isOpen: false,
    paymentUrl: null,
    transactionId: null,
    amount: 0,
    title: '',
    currency: 'FCFA'
  });

  const userId = currentUser.id || currentUser.uid || 'anonymous_user';
  const userName = currentUser.name || 'Utilisateur Wameet';

  // --------------------------------------------------------------------------
  // 1. INITIALISATION DE LA CONNEXION WEBSOCKET & ÉCOUTEURS TEMPS RÉEL
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!chatId || !userId) return;

    // Connecte le socket pour ce chat
    smartSocketClient.connect(chatId, userId);
    setSocketStatus(smartSocketClient.getStatus());

    // Écouteur de statut de connexion
    const unsubStatus = smartSocketClient.on('connection_status', (data) => {
      if (data.status) {
        setSocketStatus(data.status as any);
      }
    });

    // ------------------------------------------------------------------------
    // FONCTIONNALITÉ 2 : LISTENER on('transaction_updated', data)
    // Met à jour instantanément le message concerné de "pending" à "locked"
    // ou "released" sans re-render destructif global.
    // ------------------------------------------------------------------------
    const unsubUpdate = smartSocketClient.on('transaction_updated', (updatedData) => {
      console.log('[SMART HOOK] Événement transaction_updated reçu via WebSocket :', updatedData);

      try {
        playValidationBeep();
      } catch {}

      const newStatus = updatedData.status || updatedData.escrowStatus || 'locked';

      // Mise à jour granulaire et ciblée dans le tableau d'état
      setMessages((prevMessages) => {
        let isMatched = false;
        const next = prevMessages.map((msg) => {
          const matchTxId = msg.transactionId && msg.transactionId === updatedData.transactionId;
          const matchMsgId = msg.id && msg.id === updatedData.messageId;

          if (matchTxId || matchMsgId) {
            isMatched = true;
            return {
              ...msg,
              status: newStatus,
              isOptimistic: false,
              data: {
                ...msg.data,
                ...updatedData,
                status: newStatus,
                transactionId: updatedData.transactionId || msg.transactionId
              }
            };
          }
          return msg;
        });

        // Si la transaction n'était pas encore dans la liste (ex: reçue par le pair)
        if (!isMatched && updatedData.transactionId && updatedData.type) {
          const incomingMessage: WameetTransactionChatMessage = {
            id: updatedData.messageId || `msg_${Date.now()}`,
            chatId,
            senderId: updatedData.sender?.id || 'partner',
            senderName: updatedData.sender?.name || 'Partenaire Commercial',
            type: 'transaction',
            transactionType: (updatedData.type === 'pool' ? 'cagnotte' : updatedData.type) as SmartTransactionType,
            transactionId: updatedData.transactionId,
            amount: Number(updatedData.amount || 0),
            currency: updatedData.currency || 'FCFA',
            status: newStatus,
            title: updatedData.title || updatedData.payload?.title || 'Transaction Wameet',
            text: updatedData.message || updatedData.payload?.message || '',
            createdAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            createdAtTimestamp: Date.now(),
            data: {
              ...(updatedData.payload || {}),
              amount: Number(updatedData.amount || 0),
              status: newStatus,
              transactionId: updatedData.transactionId
            }
          };
          return [...next, incomingMessage];
        }

        return next;
      });

      // Si une modale est ouverte pour cette transaction et qu'elle est payée, fermer ou mettre à jour
      setPaymentModal((prev) => {
        if (prev.isOpen && prev.transactionId === updatedData.transactionId) {
          return { ...prev, isOpen: false };
        }
        return prev;
      });

      if (options?.onTransactionUpdated) {
        options.onTransactionUpdated(updatedData);
      }
    });

    // Écouteur pour nouvelle transaction initiée par le pair
    const unsubNewTx = smartSocketClient.on('smart_transaction_received', (newTxData) => {
      console.log('[SMART HOOK] Transaction reçue en direct :', newTxData);
      try {
        playTapBeep();
      } catch {}

      setMessages((prev) => {
        const exists = prev.some(
          (m) => m.transactionId === newTxData.transactionId || m.id === newTxData.messageId
        );
        if (exists) return prev;

        const newMsg: WameetTransactionChatMessage = {
          id: newTxData.messageId || `tx_msg_${Date.now()}`,
          chatId,
          senderId: newTxData.sender?.id || 'partner',
          senderName: newTxData.sender?.name || 'Contact',
          type: 'transaction',
          transactionType: (newTxData.type === 'pool' ? 'cagnotte' : newTxData.type) as SmartTransactionType,
          transactionId: newTxData.transactionId,
          amount: Number(newTxData.amount || 0),
          currency: newTxData.currency || 'FCFA',
          status: newTxData.status || 'pending',
          title: newTxData.title || 'Nouvelle transaction',
          text: newTxData.payload?.message || '',
          createdAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          createdAtTimestamp: Date.now(),
          data: {
            ...(newTxData.payload || {}),
            amount: Number(newTxData.amount || 0),
            status: newTxData.status || 'pending',
            transactionId: newTxData.transactionId
          }
        };

        return [...prev, newMsg];
      });
    });

    // ------------------------------------------------------------------------
    // DUAL-SYNC : ÉCOUTEUR SUPABASE REALTIME (Secours résilient en cas de micro-coupure)
    // ------------------------------------------------------------------------
    let realtimeChannel: any = null;
    try {
      const channelName = `smart_tx_${chatId}_${Math.random().toString(36).substring(7)}`;
      realtimeChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'wameet_messages',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            if (payload.new) {
              const data = payload.new as any;
              const updatedStatus = data.escrow_status || data.status;
              if (updatedStatus) {
                setMessages((prev) =>
                  prev.map((msg) => {
                    if (msg.id === data.id || (msg.transactionId && msg.transactionId === data.transaction_id)) {
                      return {
                        ...msg,
                        status: updatedStatus,
                        data: {
                          ...msg.data,
                          ...data,
                          status: updatedStatus
                        }
                      };
                    }
                    return msg;
                  })
                );
              }
            }
          }
        )
        .subscribe();
    } catch (err: any) {
      console.warn('[SMART HOOK] Notice Realtime sync :', err.message);
    }

    return () => {
      unsubStatus();
      unsubUpdate();
      unsubNewTx();
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
      smartSocketClient.disconnect();
    };
  }, [chatId, userId, options]);

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 1 : handleSendSmartAction(type, amount, payload)
  // Génère optimistiquement le message et émet l'événement WebSocket
  // --------------------------------------------------------------------------
  const handleSendSmartAction = useCallback(
    async (
      type: SmartActionType | string,
      amount: number | string,
      payload: Partial<SmartTransactionData> & Record<string, any> = {}
    ): Promise<WameetTransactionChatMessage> => {
      setIsProcessingAction(true);
      setError(null);

      // Normalisation du montant
      const numericAmount =
        typeof amount === 'number'
          ? amount
          : Number(amount.toString().replace(/[^0-9.-]+/g, '')) || 0;

      // Normalisation du type ('pool' -> 'cagnotte')
      const normalizedType: SmartTransactionType =
        type === 'pool' ? 'cagnotte' : (type as SmartTransactionType);

      // Génération des identifiants uniques
      const tempMessageId = `smart_msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const prefix =
        normalizedType === 'escrow'
          ? 'ESC'
          : normalizedType === 'farotage'
          ? 'FARO'
          : normalizedType === 'gift'
          ? 'GIFT'
          : 'POOL';
      const newTransactionId =
        payload.transactionId || `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      const formattedTime = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Titre par défaut si non spécifié
      const resolvedTitle =
        payload.title ||
        (normalizedType === 'escrow'
          ? 'Paiement Sécurisé Smart Escrow'
          : normalizedType === 'farotage'
          ? 'Farotage d\'encouragement'
          : normalizedType === 'gift'
          ? 'Cadeau surprise'
          : 'Cagnotte solidaire');

      // 1. CRÉATION DU MESSAGE OPTIMISTE (STATUT 'pending')
      const optimisticMessage: WameetTransactionChatMessage = {
        id: tempMessageId,
        chatId,
        senderId: userId,
        senderName: userName,
        senderHandle: currentUser.handle,
        senderAvatar: currentUser.avatarUrl,
        recipientId: payload.recipientId,
        recipientName: payload.recipientName,
        type: 'transaction',
        transactionType: normalizedType,
        transactionId: newTransactionId,
        amount: numericAmount,
        currency: payload.currency || 'FCFA',
        status: 'pending', // Fluidité absolue : immédiatement visible
        title: resolvedTitle,
        text: payload.message || '',
        createdAt: formattedTime,
        createdAtTimestamp: Date.now(),
        isOptimistic: true,
        data: {
          ...payload,
          title: resolvedTitle,
          amount: numericAmount,
          currency: payload.currency || 'FCFA',
          status: 'pending',
          transactionId: newTransactionId,
          senderName: userName
        }
      };

      // 2. AJOUT OPTIMISTE DANS LE STATE DU CHAT (Zero-latency UI)
      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        playTapBeep();
      } catch {}

      // 3. ÉMISSION DE L'ÉVÉNEMENT WEBSOCKET send_smart_transaction
      const socketPayload: SmartSocketEventPayload = {
        chatId,
        messageId: tempMessageId,
        transactionId: newTransactionId,
        type: normalizedType,
        amount: numericAmount,
        currency: payload.currency || 'FCFA',
        status: 'pending',
        title: resolvedTitle,
        sender: {
          id: userId,
          name: userName,
          phone: currentUser.phone
        },
        payload: {
          ...payload,
          title: resolvedTitle,
          amount: numericAmount,
          transactionId: newTransactionId
        }
      };

      const emitted = smartSocketClient.emit('send_smart_transaction', socketPayload);
      if (!emitted) {
        console.log('[SMART HOOK NOTICE] Socket en attente, diffusion de secours activée.');
      }

      // 4. PERSISTANCE EN ARRIÈRE-PLAN DANS SUPABASE (Non-bloquante)
      try {
        supabase.from('app_registry').upsert({
          key: `wameet_msg_${tempMessageId}`,
          name: `wameet_msg_${tempMessageId}`,
          module_key: 'wameet_messages',
          config_json: {
            id: tempMessageId,
            chatId,
            senderId: userId,
            senderName: userName,
            type: 'transaction',
            transactionType: normalizedType,
            transactionId: newTransactionId,
            amount: numericAmount,
            currency: payload.currency || 'FCFA',
            status: 'pending',
            title: resolvedTitle,
            text: payload.message || '',
            data: optimisticMessage.data,
            createdAt: formattedTime,
            createdAtServer: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        }).catch((err: any) => {
          console.warn('[SMART HOOK] Notice sauvegarde Supabase :', err?.message);
        });

        // Si c'est un séquestre Escrow, enregistrement dans app_registry sous le module wameet_escrow
        if (normalizedType === 'escrow') {
          supabase.from('app_registry').upsert({
            key: `escrow_${newTransactionId}`,
            name: `escrow_${newTransactionId}`,
            module_key: 'wameet_escrow',
            config_json: {
              transactionId: newTransactionId,
              chatId,
              messageId: tempMessageId,
              sellerId: userId,
              sellerName: userName,
              buyerId: payload.recipientId || '',
              buyerName: payload.recipientName || '',
              amount: numericAmount,
              currency: 'FCFA',
              escrowStatus: 'pending',
              status: 'pending',
              title: resolvedTitle,
              createdAtServer: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('[SMART HOOK] Notice Supabase non-bloquante :', e);
      }

      setIsProcessingAction(false);
      return optimisticMessage;
    },
    [chatId, userId, userName, currentUser]
  );

  // --------------------------------------------------------------------------
  // SÉCURITÉ : handlePayEscrow(transactionId)
  // Appelle l'API Render pour générer l'URL sécurisée et ouvrir la modale
  // --------------------------------------------------------------------------
  const handlePayEscrow = useCallback(
    async (
      transactionId: string,
      payOptions?: { buyerPhone?: string; buyerName?: string; operator?: string }
    ): Promise<{ success: boolean; paymentUrl?: string; error?: string }> => {
      setIsProcessingAction(true);
      setError(null);

      // Retrouve le message correspondant pour avoir le montant et le titre
      const targetMessage = messages.find((m) => m.transactionId === transactionId);
      const amount = targetMessage?.amount || 5000;
      const title = targetMessage?.title || 'Achat Sécurisé Escrow';
      const sellerId = targetMessage?.senderId || 'seller_id';

      try {
        console.log(`[SMART HOOK] Initiation paiement Escrow pour ${transactionId}...`);
        
        const result = await handlePaymentClick({
          chatId,
          messageId: targetMessage?.id || `msg_${transactionId}`,
          transactionId,
          itemTitle: title,
          amount,
          currency: 'XOF',
          buyerPhone: payOptions?.buyerPhone || currentUser.phone || '',
          buyerName: payOptions?.buyerName || userName,
          buyerId: userId,
          sellerId,
          operator: payOptions?.operator || 'MOMO'
        });

        setIsProcessingAction(false);

        if (result.success && result.paymentUrl) {
          // Ouvre la modale sécurisée pour l'acheteur
          setPaymentModal({
            isOpen: true,
            paymentUrl: result.paymentUrl,
            transactionId,
            amount,
            title,
            currency: 'FCFA',
            sellerId,
            buyerPhone: payOptions?.buyerPhone || currentUser.phone,
            buyerName: payOptions?.buyerName || userName
          });

          if (options?.onPaymentOpened) {
            options.onPaymentOpened(result.paymentUrl, transactionId);
          }

          return { success: true, paymentUrl: result.paymentUrl };
        } else {
          const err = result.error || 'Impossible de générer le lien de paiement.';
          setError(err);
          return { success: false, error: err };
        }
      } catch (err: any) {
        setIsProcessingAction(false);
        const errMsg = err.message || 'Erreur lors du déclenchement du paiement Escrow.';
        setError(errMsg);
        return { success: false, error: errMsg };
      }
    },
    [chatId, messages, userId, userName, currentUser, options]
  );

  // --------------------------------------------------------------------------
  // SÉCURITÉ : handleReleaseEscrow(transactionId)
  // Libère les fonds séquestrés vers le vendeur
  // --------------------------------------------------------------------------
  const handleReleaseEscrow = useCallback(
    async (transactionId: string): Promise<{ success: boolean; error?: string }> => {
      setIsProcessingAction(true);
      setError(null);

      const targetMessage = messages.find((m) => m.transactionId === transactionId);

      try {
        const result = await releaseFunds({
          transactionId,
          chatId,
          messageId: targetMessage?.id || '',
          buyerId: userId
        });

        setIsProcessingAction(false);

        if (result.success) {
          // Mise à jour optimiste locale immédiate
          setMessages((prev) =>
            prev.map((m) => {
              if (m.transactionId === transactionId) {
                return {
                  ...m,
                  status: 'released',
                  data: { ...m.data, status: 'released' }
                };
              }
              return m;
            })
          );

          try {
            playValidationBeep();
          } catch {}

          if (options?.onReleaseSuccess) {
            options.onReleaseSuccess(transactionId);
          }

          return { success: true };
        } else {
          setError(result.error || 'Erreur lors de la libération des fonds');
          return { success: false, error: result.error };
        }
      } catch (err: any) {
        setIsProcessingAction(false);
        setError(err.message);
        return { success: false, error: err.message };
      }
    },
    [chatId, messages, userId, options]
  );

  const closePaymentModal = useCallback(() => {
    setPaymentModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    messages,
    setMessages,
    handleSendSmartAction,
    handlePayEscrow,
    handleReleaseEscrow,
    paymentModal,
    closePaymentModal,
    isProcessingAction,
    socketStatus,
    activeTransaction,
    setActiveTransaction,
    error
  };
}
