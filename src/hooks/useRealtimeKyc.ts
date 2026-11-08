'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { VerificationRequest, VerificationStatus } from '../types/coreModules';

export function useRealtimeKyc(tenantIdOrUserId?: string | null) {
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [status, setStatus] = useState<VerificationStatus | 'none'>('none');
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantIdOrUserId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Initial Fetch
    const fetchKyc = async () => {
      try {
        setLoading(true);
        const { data, error: fetchErr } = await supabase
          .from('verification_requests')
          .select('*')
          .or(`tenant_id.eq.${tenantIdOrUserId},user_id.eq.${tenantIdOrUserId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!isMounted) return;
        if (data) {
          setRequest(data as VerificationRequest);
          setStatus(data.status as VerificationStatus);
          setIsApproved(data.status === 'approved');
        } else {
          // Fallback sur table profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('kyc_status')
            .or(`id.eq.${tenantIdOrUserId},firebase_uid.eq.${tenantIdOrUserId}`)
            .maybeSingle();

          if (profile && isMounted) {
            const st = (profile.kyc_status as VerificationStatus) || 'none';
            setStatus(st);
            setIsApproved(st === 'approved' || (st as any) === 'verified');
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Erreur fetch KYC');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchKyc();

    // 2. Écouteur Supabase Realtime
    const channelName = `kyc_${tenantIdOrUserId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'verification_requests',
        },
        (payload) => {
          if (!isMounted) return;
          const rec = payload.new as any;
          if (rec && (rec.tenant_id === tenantIdOrUserId || rec.user_id === tenantIdOrUserId)) {
            setRequest(rec as VerificationRequest);
            setStatus(rec.status as VerificationStatus);
            setIsApproved(rec.status === 'approved');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          if (!isMounted) return;
          const rec = payload.new as any;
          if (rec && (rec.id === tenantIdOrUserId || rec.firebase_uid === tenantIdOrUserId)) {
            const st = rec.kyc_status;
            setStatus(st);
            setIsApproved(st === 'approved' || st === 'verified');
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [tenantIdOrUserId]);

  return { request, status, isApproved, loading, error };
}

export default useRealtimeKyc;
