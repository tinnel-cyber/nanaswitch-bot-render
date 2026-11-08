'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRealtimeTheme } from '@/hooks/useRealtimeTheme';

interface ThemeStudioProps {
  tenantId: string;
}

export function ThemeStudio({ tenantId }: ThemeStudioProps) {
  const { themeConfig, loading } = useRealtimeTheme(tenantId);
  const [isSaving, setIsSaving] = useState(false);

  // Fonction pour mettre à jour la configuration du thème
  const handleUpdateTheme = async (newColors: { primary: string; background: string }) => {
    setIsSaving(true);
    
    const updatedPayload = {
      tenant_id: tenantId,
      module_key: 'theme_config',
      config_json: {
        ...(themeConfig?.config_json || {}),
        colors: newColors,
      },
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('app_registry')
      .upsert(updatedPayload, { onConflict: 'tenant_id,module_key' });

    setIsSaving(false);

    if (error) {
      alert(`Erreur de sauvegarde Supabase : ${error.message}`);
    }
  };

  if (loading) return <div className="p-4 text-xs font-bold text-slate-500">Connexion au Studio Supabase...</div>;

  const currentColors = themeConfig?.config_json?.colors || { primary: '#2563EB', background: '#FBF9F5' };

  return (
    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <h2 className="text-lg font-bold text-slate-900">Studio de Thème Nanasore</h2>
      <p className="text-xs text-slate-500">Les modifications sont synchronisées en temps réel via Supabase Realtime.</p>

      <div className="flex gap-4 items-center">
        <button
          type="button"
          onClick={() => handleUpdateTheme({ primary: '#2563EB', background: '#FBF9F5' })}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow cursor-pointer hover:bg-blue-700 transition"
        >
          Thème Royal (Bleu & Blanc Cassé)
        </button>

        <button
          type="button"
          onClick={() => handleUpdateTheme({ primary: '#059669', background: '#F0FDF4' })}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow cursor-pointer hover:bg-emerald-700 transition"
        >
          Thème Émeraude
        </button>
      </div>

      {isSaving && <p className="text-xs text-blue-600 font-semibold animate-pulse">Publication en temps réel...</p>}
    </div>
  );
}

export default ThemeStudio;
