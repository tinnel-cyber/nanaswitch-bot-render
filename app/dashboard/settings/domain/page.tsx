'use client';

import React from 'react';
import { CustomDomainSettingsWidget } from '@/src/components/domains/CustomDomainSettingsWidget';

export default function DomainSettingsPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Paramètres du Nom de Domaine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configurez votre nom de domaine personnalisé pour accueillir vos clients sous votre propre marque.
          </p>
        </div>

        <CustomDomainSettingsWidget 
          tenantId="current"
          fallbackOrigin={process.env.NEXT_PUBLIC_CLOUDFLARE_FALLBACK_ORIGIN || 'cname.nanasore.com'}
        />
      </div>
    </div>
  );
}
