import { useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { playValidationBeep, playChaChingSound } from '../utils/audio';

export type VipSubscriptionStatus =
  | 'IDLE'
  | 'LOADING'
  | 'PENDING_S_PAY'
  | 'VERIFYING_WEBHOOK'
  | 'UNLOCKED'
  | 'ERROR';

export interface VipSubscriptionPlan {
  id: 'monthly' | 'lifetime' | string;
  name: string;
  priceFcfa: number;
  period: string;
  badge?: string;
  recommended?: boolean;
  features: string[];
}

export interface SubscribeParams {
  loungeId: string;
  loungeTitle?: string;
  planId: 'monthly' | 'lifetime' | string;
  amount: number;
  customerPhone: string;
  customerName?: string;
  userId?: string;
  paymentMethod?: string;
  transactionId?: string;
}

export interface UseVipSubscriptionReturn {
  status: VipSubscriptionStatus;
  isUnlocked: boolean;
  isProcessing: boolean;
  error: string | null;
  subscriptionData: any | null;
  subscribe: (params: SubscribeParams) => Promise<boolean>;
  checkAccess: (loungeId: string, userPhoneOrId: string) => Promise<boolean>;
  reset: () => void;
  triggerUnlockAnimation: () => void;
}

export const VIP_DEFAULT_PLANS: VipSubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Pass Mensuel VIP',
    priceFcfa: 10000,
    period: 'Facturé par mois • Sans engagement',
    badge: 'Flexibilité',
    features: [
      'Accès 1-to-1 avec le Coach & Mentors',
      'Webinaires privés & sessions hebdomadaires',
      'Réseau exclusif de dirigeants et investisseurs',
      'Replays vidéo HD & supports confidentiels'
    ]
  },
  {
    id: 'lifetime',
    name: 'Accès à vie • Cercle d’Or',
    priceFcfa: 50000,
    period: 'Paiement unique • Accès illimité et perpétuel',
    badge: 'Économisez 60%',
    recommended: true,
    features: [
      'Tous les privilèges du Pass Mensuel à vie',
      'Canal audio Wameet VIP ultra-privé',
      'Mise en relation prioritaire avec Business Angels',
      'Certificat Wameet d’Excellence Dirigeant',
      'Invitations gratuites aux dîners d’affaires annuels'
    ]
  }
];

/**
 * Hook React useVipSubscription
 * Gère la souscription S-Pay, l'appel à l'API /api/vip/subscribe,
 * la vérification du Webhook S-Pay et le déverrouillage fluide de l'écran VIP.
 */
export function useVipSubscription(onSuccessCallback?: (data: any) => void): UseVipSubscriptionReturn {
  const [status, setStatus] = useState<VipSubscriptionStatus>('IDLE');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<any | null>(null);

  /**
   * Déclenche une pluie de confettis dorés et sonores
   */
  const triggerUnlockAnimation = useCallback(() => {
    playChaChingSound();
    playValidationBeep();

    try {
      // Confettis dorés & célébration
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#FBBF24', '#38BDF8', '#10B981', '#FFFFFF']
      });

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#F59E0B', '#FBBF24', '#FFFFFF']
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#38BDF8', '#60A5FA', '#FFFFFF']
        });
      }, 250);
    } catch {
      // Fallback si canvas non supporté
    }
  }, []);

  /**
   * Souscription à un Salon / Salle VIP
   */
  const subscribe = useCallback(
    async (params: SubscribeParams): Promise<boolean> => {
      setStatus('LOADING');
      setError(null);

      try {
        // Étape 1 : Appel API S-Pay
        setStatus('PENDING_S_PAY');

        const response = await fetch('/api/vip/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            loungeId: params.loungeId,
            loungeTitle: params.loungeTitle,
            planId: params.planId,
            amount: params.amount,
            customerPhone: params.customerPhone,
            customerName: params.customerName || 'Membre VIP Wameet',
            userId: params.userId,
            paymentMethod: params.paymentMethod || 'S_MOBILE_MONEY',
            transactionId: params.transactionId,
            autoValidateWebhook: Boolean(params.transactionId)
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.accessGranted) {
          throw new Error(data.message || 'Échec de vérification du paiement Mobile Money sécurisé.');
        }

        // Étape 2 : Simulation de validation Webhook instantanée
        setStatus('VERIFYING_WEBHOOK');

        // Léger délai réaliste (600ms) pour laisser l'utilisateur voir la validation
        await new Promise((resolve) => setTimeout(resolve, 600));

        // Étape 3 : Déverrouillage réussi
        setSubscriptionData(data.subscription || data);
        setIsUnlocked(true);
        setStatus('UNLOCKED');

        triggerUnlockAnimation();
        onSuccessCallback?.(data.subscription || data);

        return true;
      } catch (err: any) {
        console.error('[useVipSubscription] Erreur :', err);
        setError(err.message || "Impossible de compléter l'abonnement VIP.");
        setStatus('ERROR');
        return false;
      }
    },
    [triggerUnlockAnimation, onSuccessCallback]
  );

  /**
   * Vérifie si l'utilisateur possède déjà un accès actif
   */
  const checkAccess = useCallback(
    async (loungeId: string, userPhoneOrId: string): Promise<boolean> => {
      if (!loungeId || !userPhoneOrId) return false;

      try {
        const res = await fetch(
          `/api/vip/status/${encodeURIComponent(loungeId)}?userId=${encodeURIComponent(userPhoneOrId)}`
        );
        const json = await res.json();
        if (json.success && json.hasAccess) {
          setIsUnlocked(true);
          setStatus('UNLOCKED');
          setSubscriptionData(json.subscription);
          return true;
        }
      } catch (e) {
        console.warn('[useVipSubscription] Erreur de vérification accès :', e);
      }
      return false;
    },
    []
  );

  /**
   * Réinitialise l'état du hook
   */
  const reset = useCallback(() => {
    setStatus('IDLE');
    setIsUnlocked(false);
    setError(null);
    setSubscriptionData(null);
  }, []);

  return {
    status,
    isUnlocked,
    isProcessing: status === 'LOADING' || status === 'PENDING_S_PAY' || status === 'VERIFYING_WEBHOOK',
    error,
    subscriptionData,
    subscribe,
    checkAccess,
    reset,
    triggerUnlockAnimation
  };
}

export default useVipSubscription;
