'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryMovement } from '../types/coreModules';

export function useRealtimeInventory(tenantId: string) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Initial Fetch
    const fetchMovements = async () => {
      try {
        setLoading(true);
        const { data, error: fetchErr } = await supabase
          .from('inventory_movements')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!isMounted) return;
        if (fetchErr) {
          console.warn('[RealtimeInventory] Erreur lecture mouvements:', fetchErr);
          setError(fetchErr.message);
        } else if (data) {
          setMovements(data as InventoryMovement[]);
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Erreur fetch inventory');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMovements();

    // 2. Écouteur Supabase Realtime (INSERT / UPDATE)
    const channelName = `inventory_${tenantId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_movements',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT' && payload.new) {
            setMovements(prev => [payload.new as InventoryMovement, ...prev.slice(0, 49)]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setMovements(prev => prev.map(m => m.id === (payload.new as any).id ? (payload.new as InventoryMovement) : m));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setMovements(prev => prev.filter(m => m.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  // Fonction utilitaire pour enregistrer un mouvement
  const logMovement = useCallback(async (movement: Omit<InventoryMovement, 'id' | 'created_at'>) => {
    try {
      const { data, error: insertErr } = await supabase
        .from('inventory_movements')
        .insert([{
          ...movement,
          tenant_id: tenantId,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertErr) throw insertErr;
      return { success: true, data };
    } catch (err: any) {
      console.error('[RealtimeInventory] Erreur enregistrement stock:', err);
      return { success: false, error: err?.message };
    }
  }, [tenantId]);

  return { movements, loading, error, logMovement };
}

export default useRealtimeInventory;
