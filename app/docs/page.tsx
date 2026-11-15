"use client";

import React from 'react';
import dynamicImport from 'next/dynamic';

export const dynamic = 'force-dynamic';

const EcosystemDocPortalApp = dynamicImport(
  () => import('../../src/components/docs/EcosystemDocPortalApp').then((mod) => mod.EcosystemDocPortalApp || mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100 font-sans">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-semibold">Ouverture du Centre Documentaire Nanasore...</p>
      </div>
    ),
  }
);

export default function DocsPage() {
  const handleGoToDashboard = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <EcosystemDocPortalApp 
        onClose={handleGoToDashboard}
        initialSection="hub"
        isPublicPortal={true}
      />
    </div>
  );
}
