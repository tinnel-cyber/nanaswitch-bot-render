import React from 'react';
import { NanaDocPortalApp } from '../components/NanaDocPortalApp';

/**
 * NaNaSwitchDocsPage - Standalone Public Documentation Portal
 * 100% PUBLIC - ZERO AUTH REQUIRED - NO FIREBASE GUARDS
 * Accessible freely by all visitors, developers, and partners.
 */
export function NaNaSwitchDocsPage() {
  const handleCopyToClipboard = (text?: string, label?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
  };

  const handleGoToAuth = () => {
    try {
      window.history.pushState({}, '', '/nana-switch');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      window.location.href = '/nana-switch';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <NanaDocPortalApp 
        onClose={handleGoToAuth}
        copyToClipboard={handleCopyToClipboard}
        initialPrompt="hub"
        isPublicPortal={true}
      />
    </div>
  );
}

export default NaNaSwitchDocsPage;
