/**
 * @file EcosystemDocsPage.tsx
 * @description Page Publique Autonome du Centre Documentaire Écosystème Nanasore.
 * 100% PUBLIC - ZERO AUTH REQUIRED - ACCÈS LIBRE.
 */

import React from 'react';
import { EcosystemDocPortalApp } from '../../components/docs/EcosystemDocPortalApp';

export function EcosystemDocsPage() {
  const handleCopyToClipboard = (text?: string, label?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
  };

  const handleGoToDashboard = () => {
    try {
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <EcosystemDocPortalApp 
        onClose={handleGoToDashboard}
        copyToClipboard={handleCopyToClipboard}
        initialSection="hub"
        isPublicPortal={true}
      />
    </div>
  );
}

export default EcosystemDocsPage;
