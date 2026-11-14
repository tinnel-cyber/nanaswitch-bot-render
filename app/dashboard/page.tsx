"use client";

import React from 'react';
import dynamicImport from 'next/dynamic';

export const dynamic = 'force-dynamic';

const NewDashboardApp = dynamicImport(
  () => import('../../src/components/dashboard/NewDashboardApp').then((mod) => mod.NewDashboardApp || mod.default),
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

export { NewDashboardApp, NewDashboardApp as NanaSwitchApp };

export default function DashboardPage(props: { onBack?: () => void }) {
  return <NewDashboardApp {...props} />;
}
