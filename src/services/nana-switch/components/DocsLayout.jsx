import React from 'react';
import { NanaDocPortalApp } from '../../../components/nanaSwitch/NanaDocPortalApp';

/**
 * DocsLayout - Layout UX Multipage & Portail de Documentation NanaSwitch Cloud
 * Rôle : Lead Frontend & UX Engineer (PROMPT 8)
 * 
 * Fonctionnalités intégrées :
 * - Sidebar dynamique gauche avec 6 rubriques hiérarchiques
 * - Sélecteur de langages (Node.js, Python, PHP natif, cURL/Mobile)
 * - Bouton "Copier le Code" sur chaque bloc de snippet
 * - Multi-popups interactifs : "Tester une API" & "Simulateur de Webhook HMAC"
 * - Composant Chatbot Assistant IA (system:nanaswitch_integration_skill)
 * - 100% Public, sans authentification requise
 */
export function DocsLayout({ 
  initialPrompt = 'hub',
  onClose,
  copyToClipboard,
  isPublicPortal = true 
}) {
  const handleCopy = (text, label) => {
    if (!text) return;
    if (copyToClipboard) {
      copyToClipboard(text, label);
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      <NanaDocPortalApp 
        initialPrompt={initialPrompt}
        onClose={onClose}
        copyToClipboard={handleCopy}
        isPublicPortal={isPublicPortal}
      />
    </div>
  );
}

export default DocsLayout;
