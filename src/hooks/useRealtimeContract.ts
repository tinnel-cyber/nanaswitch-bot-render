'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface DocusignContract {
  id: string;
  tenant_id?: string;
  creator_id: string;
  signer_name: string;
  signer_email: string;
  signer_phone?: string;
  title: string;
  document_url: string;
  signed_document_url?: string;
  status: 'pending' | 'viewed' | 'signed' | 'rejected';
  signature_data?: string;
  signed_at?: string;
  created_at: string;
  updated_at: string;
}

export function useRealtimeContract(contractId?: string | null) {
  const [contract, setContract] = useState<DocusignContract | null>(null);
  const [isSigned, setIsSigned] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Initial Fetch
    const fetchContract = async () => {
      try {
        setLoading(true);
        const { data, error: fetchErr } = await supabase
          .from('docusign_contracts')
          .select('*')
          .eq('id', contractId)
          .maybeSingle();

        if (!isMounted) return;
        if (fetchErr) {
          console.warn('[RealtimeContract] Erreur lecture contrat:', fetchErr);
          setError(fetchErr.message);
        } else if (data) {
          setContract(data as DocusignContract);
          setIsSigned(data.status === 'signed');
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Erreur fetch contrat');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchContract();

    // 2. Écouteur Supabase Realtime
    const channelName = `contract_${contractId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'docusign_contracts',
          filter: `id=eq.${contractId}`,
        },
        (payload) => {
          if (!isMounted) return;
          if (payload.new) {
            const updated = payload.new as DocusignContract;
            setContract(updated);
            if (updated.status === 'signed') {
              setIsSigned(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [contractId]);

  return { contract, isSigned, loading, error };
}

export default useRealtimeContract;
