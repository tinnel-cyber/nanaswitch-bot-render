import './initGlobalReact';

// Bouclier console absolu : interdiction stricte de tout log ou trace Firebase/Firestore dans la console du navigateur
if (typeof window !== 'undefined') {
  const shouldFilter = (args: any[]) => {
    return args.some(arg => {
      if (typeof arg === 'string') {
        const lower = arg.toLowerCase();
        return lower.includes('firebase') || lower.includes('firestore') || lower.includes('multiple gotrueclient');
      }
      if (arg && typeof arg === 'object') {
        const text = String(arg.message || arg.name || arg.code || '').toLowerCase();
        return text.includes('firebase') || text.includes('firestore') || text.includes('multiple gotrueclient');
      }
      return false;
    });
  };

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;
  const origInfo = console.info;

  console.log = (...args: any[]) => { if (!shouldFilter(args)) origLog.apply(console, args); };
  console.warn = (...args: any[]) => { if (!shouldFilter(args)) origWarn.apply(console, args); };
  console.error = (...args: any[]) => { if (!shouldFilter(args)) origError.apply(console, args); };
  console.info = (...args: any[]) => { if (!shouldFilter(args)) origInfo.apply(console, args); };
}

import React, { StrictMode, useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';
import { purgeLegacyMockStorage } from './services/superAdminService';

// Purge immédiate de tout cache localStorage pollué par des données démo/mock
if (typeof window !== 'undefined') {
  purgeLegacyMockStorage();
}

// Bouclier Anti-Crash & Anti-ReferenceError Global : Exposition immédiate des hooks
if (typeof window !== 'undefined') {
  Object.assign(window, { React, useState, useEffect, useCallback, useMemo, useRef, useContext });
}
if (typeof globalThis !== 'undefined') {
  Object.assign(globalThis, { React, useState, useEffect, useCallback, useMemo, useRef, useContext });
}

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { TenantProvider } from './context/TenantContext';
import { runAutomatedStorageGC } from './utils/storageManager';
import { initOfflineSyncListeners } from './services/offlineSyncService';
import { initOfflineSyncWorker } from './workers/offlineSyncWorkerClient';

// Initialisation globale de la synchronisation hors-ligne IndexedDB & Worker de Batching
if (typeof window !== 'undefined') {
  initOfflineSyncListeners();
  initOfflineSyncWorker();
}

// 1. Bouclier Anti-Crash Global : Interception des erreurs d'imports dynamiques Vite et rejets asynchrones
if (typeof window !== 'undefined') {
  // Détection officielle Vite des erreurs de préchargement de modules (Vite Dynamic Import Preload Error)
  window.addEventListener('vite:preloadError', (event: any) => {
    console.warn('[CRASH SHIELD] Détection d\'une mise à jour de bundle Vite (preloadError). Actualisation automatique...', event);
    const reloadKey = 'nana_vite_preload_reload';
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, 'true');
      window.location.reload();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reasonMsg = String(event?.reason?.message || event?.reason || '');
    if (reasonMsg.toLowerCase().includes('firebase') || reasonMsg.toLowerCase().includes('firestore')) {
      event.preventDefault();
      return;
    }
    console.warn('[CRASH SHIELD] Rejet asynchrone non intercepté capturé gracieusement :', reasonMsg);

    // Si une promesse d'import dynamique a échoué suite à un déploiement récent
    if (
      reasonMsg.includes('Failed to fetch dynamically imported module') ||
      reasonMsg.includes('Importing a module script failed') ||
      reasonMsg.includes('dynamically imported')
    ) {
      const dynKey = 'nana_dynamic_import_recovery';
      if (!sessionStorage.getItem(dynKey)) {
        sessionStorage.setItem(dynKey, 'true');
        console.info('[CRASH SHIELD] Rechargement proactif suite à échec de fetch d\'un module dynamique...');
        window.location.reload();
      }
    }

    // Empêche le plantage brutal de l'UI sur navigateur mobile
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    const errorMsg = String(event?.error?.message || event?.message || '');
    console.warn('[CRASH SHIELD] Erreur d’exécution capturée gracieusement :', errorMsg);
    if (
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Importing a module script failed')
    ) {
      const errKey = 'nana_dyn_error_recovery';
      if (!sessionStorage.getItem(errKey)) {
        sessionStorage.setItem(errKey, 'true');
        window.location.reload();
      }
    }
  });

  // Nettoyage automatique des caches obsolètes en arrière-plan sans bloquer l'affichage initial
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => runAutomatedStorageGC());
  } else {
    setTimeout(() => runAutomatedStorageGC(), 2000);
  }
}

// 2. Enregistrement du Service Worker PWA (Hors-ligne & Installation avec mise à jour immédiate)
const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !isTestEnv) {
  // Purge proactive des caches obsolètes et des anciens workers Firebase dans le navigateur client
  if (typeof window !== 'undefined') {
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key.includes('v3') || key.includes('v4') || key.includes('v5') || key.includes('v6') || key.includes('v7') || key.includes('v8')) {
            caches.delete(key).catch(() => {});
          }
        });
      }).catch(() => {});
    }

    // Désactivation et désenregistrement des workers Firebase
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => {
          if (reg.active?.scriptURL?.includes('sw.js')) {
            reg.unregister().then(() => {
              console.log('[Worker Purge] Ancien worker Firebase désactivé avec succès.');
            }).catch(() => {});
          }
        });
      }).catch(() => {});
    }
  }

  const registerSW = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        registration.update().catch(() => {});
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        console.log('[PWA] Service Worker actif v9, scope :', registration.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Échec enregistrement Service Worker :', err);
      });
  };

  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <ThemeProvider>
        <TenantProvider>
          <App />
        </TenantProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
);


