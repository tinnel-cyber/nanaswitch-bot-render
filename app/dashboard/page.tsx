"use client";

import React from 'react';
import dynamicImport from 'next/dynamic';

export const dynamic = 'force-dynamic';

const NanaSwitchApp = dynamicImport(
  () => import('../../src/services/nana-switch/components/NanaSwitchApp').then((mod) => mod.NanaSwitchApp),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-slate-100 font-sans">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-semibold">Connexion au Tableau de Bord Nanasore OS...</p>
      </div>
    ),
  }
);

export { NanaSwitchApp };

export default function DashboardPage(props: { onBack?: () => void }) {
  return <NanaSwitchApp {...props} />;
}
