'use client';

import React from 'react';
import { useRealtimeTheme } from '@/hooks/useRealtimeTheme';

export function StorefrontTheme({ tenantId }: { tenantId: string }) {
  const { themeConfig, loading } = useRealtimeTheme(tenantId);

  if (loading) return null;

  const primaryColor = themeConfig?.config_json?.colors?.primary || '#2563EB';
  const backgroundColor = themeConfig?.config_json?.colors?.background || '#FBF9F5';

  return (
    <div 
      className="min-h-screen p-8 transition-colors duration-500"
      style={{ backgroundColor: backgroundColor }}
    >
      <header className="max-w-4xl mx-auto flex justify-between items-center pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900">Boutique Marchand</h1>
        <button 
          type="button"
          className="px-5 py-2.5 text-white font-bold text-xs rounded-2xl shadow transition-all"
          style={{ backgroundColor: primaryColor }}
        >
          Voir le Panier
        </button>
      </header>
    </div>
  );
}

export default StorefrontTheme;
