'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ThemeConfig {
  id?: string;
  tenant_id: string;
  theme_key?: string;
  module_key?: string;
  config_json?: Record<string, any>;
  settings?: Record<string, any>;
  active_theme_id?: string;
  updated_at?: string;
}

/**
 * Hook réactif unifié Supabase Realtime pour les thèmes Nanasore
 * Remplace définitivement Firestore onSnapshot pour le Studio de thèmes et les vitrines
 */
export function useRealtimeTheme(tenantId: string) {
  const [themeConfig, setThemeConfig] = useState<ThemeConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Récupération de la configuration initiale depuis app_registry (avec fallback organization_blocks)
    const fetchInitialTheme = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('app_registry')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('module_key', 'theme_config')
          .maybeSingle();

        if (!isMounted) return;

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.warn('[Supabase Realtime] Information lecture app_registry:', fetchError.message);
        }

        if (data) {
          setThemeConfig(data as ThemeConfig);
        } else {
          // Tentative de repli sur organization_blocks
          const { data: orgData } = await supabase
            .from('organization_blocks')
            .select('*')
            .eq('block_key', 'theme_config')
            .maybeSingle();

          if (isMounted && orgData) {
            setThemeConfig({
              id: orgData.id,
              tenant_id: tenantId,
              theme_key: orgData.block_key,
              config_json: orgData.settings || {},
              updated_at: orgData.updated_at
            });
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Erreur inconnue de chargement thème');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInitialTheme();

    // 2. Écouteur SUPABASE REALTIME (Remplace Firestore onSnapshot)
    const channelName = `theme_realtime_${tenantId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Écoute INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'app_registry',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (!isMounted) return;
          if (payload.new && (payload.new as any).module_key === 'theme_config') {
            setThemeConfig(payload.new as ThemeConfig);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_blocks',
        },
        (payload) => {
          if (!isMounted) return;
          const item = payload.new as any;
          if (item && (item.organization_id === tenantId || item.tenant_id === tenantId) && item.block_key === 'theme_config') {
            setThemeConfig({
              id: item.id,
              tenant_id: tenantId,
              theme_key: item.block_key,
              config_json: item.settings || {},
              updated_at: item.updated_at
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Supabase Realtime] Connecté aux thèmes du tenant : ${tenantId}`);
        }
      });

    // 3. Nettoyage lors du démontage (Désabonnement socket)
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  return { themeConfig, loading, error };
}
