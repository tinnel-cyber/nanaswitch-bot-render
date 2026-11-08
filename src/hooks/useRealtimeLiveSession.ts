'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface LiveSessionData {
  id: string;
  tenant_id?: string;
  host_id: string;
  title: string;
  description?: string;
  is_live: boolean;
  viewer_count: number;
  pinned_product_id?: string;
  pinned_product_data?: Record<string, any>;
  flash_sale_end_at?: string;
  stream_url?: string;
  status: 'scheduled' | 'live' | 'ended';
  created_at: string;
  updated_at: string;
}

export function useRealtimeLiveSession(sessionId?: string | null) {
  const [session, setSession] = useState<LiveSessionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Initial Fetch
    const fetchSession = async () => {
      try {
        setLoading(true);
        const { data, error: fetchErr } = await supabase
          .from('live_sessions')
          .select('*')
          .eq('id', sessionId)
          .maybeSingle();

        if (!isMounted) return;
        if (fetchErr) {
          console.warn('[LiveSession] Erreur lecture session:', fetchErr);
          setError(fetchErr.message);
        } else if (data) {
          setSession(data as LiveSessionData);
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Erreur fetch live session');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSession();

    // 2. Écouteur Supabase Realtime
    const channelName = `live_${sessionId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (!isMounted) return;
          if (payload.new) {
            setSession(payload.new as LiveSessionData);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Actions de contrôle de scène (Animateur)
  const pinProduct = useCallback(async (productId: string, productData: any, flashDurationSeconds?: number) => {
    if (!sessionId) return { success: false };
    try {
      const flashSaleEnd = flashDurationSeconds 
        ? new Date(Date.now() + flashDurationSeconds * 1000).toISOString()
        : null;

      const { data, error: pinErr } = await supabase
        .from('live_sessions')
        .update({
          pinned_product_id: productId,
          pinned_product_data: productData,
          flash_sale_end_at: flashSaleEnd,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (pinErr) throw pinErr;
      return { success: true, data };
    } catch (err: any) {
      console.error('[LiveSession] Erreur épinglage produit:', err);
      return { success: false, error: err?.message };
    }
  }, [sessionId]);

  return { session, loading, error, pinProduct };
}

export default useRealtimeLiveSession;
