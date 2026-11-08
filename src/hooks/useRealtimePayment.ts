'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface PaymentStatusData {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  total_amount?: number;
  customer_phone?: string;
  payment_method?: string;
  reference?: string;
  updated_at?: string;
}

export function useRealtimePayment(orderIdOrReference?: string | null) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusData | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderIdOrReference) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Initial Fetch
    const fetchStatus = async () => {
      try {
        setLoading(true);
        // Tente dans la table sales
        const { data: saleData } = await supabase
          .from('sales')
          .select('*')
          .or(`id.eq.${orderIdOrReference},payment_reference.eq.${orderIdOrReference}`)
          .maybeSingle();

        if (saleData && isMounted) {
          const status = saleData.status || (saleData.is_paid ? 'completed' : 'pending');
          setPaymentStatus(saleData as PaymentStatusData);
          if (status === 'completed' || saleData.is_paid) {
            setIsCompleted(true);
          }
          setLoading(false);
          return;
        }

        // Tente dans la table orders
        const { data: orderData } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderIdOrReference)
          .maybeSingle();

        if (orderData && isMounted) {
          setPaymentStatus(orderData as PaymentStatusData);
          if (orderData.status === 'completed') {
            setIsCompleted(true);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Erreur fetch payment');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStatus();

    // 2. Écouteur Supabase Realtime (WebSockets)
    const channelName = `payment_${orderIdOrReference}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sales',
        },
        (payload) => {
          if (!isMounted) return;
          const rec = payload.new as any;
          if (rec && (rec.id === orderIdOrReference || rec.payment_reference === orderIdOrReference)) {
            setPaymentStatus(rec as PaymentStatusData);
            if (rec.status === 'completed' || rec.is_paid) {
              setIsCompleted(true);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (!isMounted) return;
          const rec = payload.new as any;
          if (rec && rec.id === orderIdOrReference) {
            setPaymentStatus(rec as PaymentStatusData);
            if (rec.status === 'completed') {
              setIsCompleted(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [orderIdOrReference]);

  return { paymentStatus, isCompleted, loading, error };
}

export default useRealtimePayment;
