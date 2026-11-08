import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { StoreSubscription } from '../types';

export interface SubscriptionTimeLimitOptions {
  merchantId?: string;
  storeId?: string;
  isHost?: boolean;
  overrideMaxMinutes?: number;
  onGracefulCutoff?: () => void;
  onWarning5Min?: () => void;
  onWarning1Min?: () => void;
}

export interface SubscriptionTimeLimitState {
  isUnlimited: boolean;
  planName: string;
  elapsedSeconds: number;
  totalLimitSeconds: number;
  remainingSeconds: number;
  isWarning5Min: boolean;
  isWarning1Min: boolean;
  isCutoff: boolean;
  showUpgradePaywall: boolean;
  dismissWarning: () => void;
  setShowUpgradePaywall: (show: boolean) => void;
  formattedRemaining: string;
}

export function useSubscriptionTimeLimit({
  merchantId,
  storeId,
  isHost = false,
  overrideMaxMinutes,
  onGracefulCutoff,
  onWarning5Min,
  onWarning1Min,
}: SubscriptionTimeLimitOptions): SubscriptionTimeLimitState {
  // Par défaut, la limite gratuite de démonstration est de 20 minutes
  const DEFAULT_LIMIT_MINUTES = overrideMaxMinutes || 20;
  const [totalLimitSeconds, setTotalLimitSeconds] = useState(DEFAULT_LIMIT_MINUTES * 60);
  const [isUnlimited, setIsUnlimited] = useState<boolean>(false);
  const [planName, setPlanName] = useState<string>('Démonstration Gratuite (20 min)');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isCutoff, setIsCutoff] = useState<boolean>(false);
  const [isWarning5Min, setIsWarning5Min] = useState<boolean>(false);
  const [isWarning1Min, setIsWarning1Min] = useState<boolean>(false);
  const [warningDismissed, setWarningDismissed] = useState<boolean>(false);
  const [showUpgradePaywall, setShowUpgradePaywall] = useState<boolean>(false);

  // 1. Vérification du statut d'abonnement via Supabase Realtime
  useEffect(() => {
    const resolvedStoreId = storeId || (merchantId ? `store-${merchantId}` : null);
    if (!resolvedStoreId) return;

    // Lecture locale d'abord
    try {
      const cachedSub = localStorage.getItem(`nana_tenant_${resolvedStoreId}_subscription`);
      if (cachedSub) {
        const sub: StoreSubscription = JSON.parse(cachedSub);
        evaluatePlan(sub);
      }
    } catch {}

    // Écoute temps réel Supabase Realtime
    const channelName = `time_limit_${resolvedStoreId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `tenant_id=eq.${resolvedStoreId}`,
        },
        (payload) => {
          if (payload.new) {
            const row = payload.new as any;
            const sub: StoreSubscription = {
              status: row.status || 'TRIAL',
              plan: row.plan || 'TRIAL_5_DAYS',
              expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : Date.now() + 86400000,
              startedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            };
            evaluatePlan(sub);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

    const evaluatePlan = (sub: StoreSubscription) => {
      const plan = (sub.plan || '').toLowerCase();
      const isActive = sub.status === 'ACTIVE';
      const isPremiumPlan = 
        plan.includes('pro') || 
        plan.includes('elite') || 
        plan.includes('annual') || 
        plan.includes('semester') || 
        plan.includes('quarterly');

      if (isActive && isPremiumPlan) {
        setIsUnlimited(true);
        setPlanName('Forfait Pro / Illimité');
      } else {
        setIsUnlimited(false);
        setPlanName('Période d’Essai (20 minutes max)');
        setTotalLimitSeconds(DEFAULT_LIMIT_MINUTES * 60);
      }
    };

    checkSubscription();
  }, [storeId, merchantId, DEFAULT_LIMIT_MINUTES]);

  // 2. Chronomètre actif du direct
  useEffect(() => {
    if (isCutoff) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;

        if (!isUnlimited) {
          const remaining = totalLimitSeconds - next;

          // Alerte 5 minutes (300 secondes)
          if (remaining <= 300 && remaining > 60 && !isWarning5Min) {
            setIsWarning5Min(true);
            if (onWarning5Min) onWarning5Min();
          }

          // Alerte critique 1 minute (60 secondes)
          if (remaining <= 60 && remaining > 0 && !isWarning1Min) {
            setIsWarning1Min(true);
            if (onWarning1Min) onWarning1Min();
          }

          // Coupure gracieuse atteinte (0 seconde)
          if (remaining <= 0) {
            setIsCutoff(true);
            setShowUpgradePaywall(true);
            if (onGracefulCutoff) onGracefulCutoff();
            clearInterval(timer);
            return totalLimitSeconds;
          }
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isUnlimited, totalLimitSeconds, isCutoff, isWarning5Min, isWarning1Min, onGracefulCutoff, onWarning5Min, onWarning1Min]);

  const remainingSeconds = isUnlimited ? 99999 : Math.max(0, totalLimitSeconds - elapsedSeconds);

  // Formatage mm:ss ou hh:mm:ss
  const formattedRemaining = isUnlimited
    ? 'Illimité (Pro)'
    : `${Math.floor(remainingSeconds / 60).toString().padStart(2, '0')}:${(remainingSeconds % 60).toString().padStart(2, '0')}`;

  const dismissWarning = useCallback(() => {
    setWarningDismissed(true);
    setIsWarning5Min(false);
  }, []);

  return {
    isUnlimited,
    planName,
    elapsedSeconds,
    totalLimitSeconds,
    remainingSeconds,
    isWarning5Min: isWarning5Min && !warningDismissed,
    isWarning1Min,
    isCutoff,
    showUpgradePaywall,
    dismissWarning,
    setShowUpgradePaywall,
    formattedRemaining,
  };
}
