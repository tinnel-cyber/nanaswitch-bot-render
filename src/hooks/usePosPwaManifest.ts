import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const POS_MANIFEST_HREF = '/manifest-pos.json?v=pos_v1';
const POS_ICON_HREF = '/pos-icon-192.png?v=pos_v1';

export function usePosPwaManifest(enabled: boolean = true) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIosHint, setShowIosHint] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isPersistentStorage, setIsPersistentStorage] = useState<boolean>(false);

  // 1. Injection dynamique du Manifest POS (/manifest-pos.json?v=pos_v1) + méta iOS/Android
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const prevManifestHref = manifestLink?.getAttribute('href') || '/manifest.json?v=nanasore_v6';
    let createdManifestLink: HTMLLinkElement | null = null;

    if (manifestLink) {
      manifestLink.setAttribute('href', POS_MANIFEST_HREF);
    } else {
      createdManifestLink = document.createElement('link');
      createdManifestLink.rel = 'manifest';
      createdManifestLink.href = POS_MANIFEST_HREF;
      document.head.appendChild(createdManifestLink);
    }

    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    const prevAppleIconHref = appleIcon?.getAttribute('href') || '';
    if (appleIcon) {
      appleIcon.setAttribute('href', POS_ICON_HREF);
    }

    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
    const prevAppleTitle = appleTitle?.getAttribute('content') || '';
    if (appleTitle) {
      appleTitle.setAttribute('content', 'Caisse POS');
    }

    const themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    const prevThemeColor = themeColorMeta?.getAttribute('content') || '';
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#1D4ED8');
    }

    // Détection mode standalone & iOS
    const standalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      (window.navigator as any)?.standalone === true;
    setIsInstalled(Boolean(standalone));

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    // Récupération d'un prompt différé déjà capturé par index.html
    const globalPrompt = (window as any).__nanaDeferredInstallPrompt as BeforeInstallPromptEvent | undefined;
    if (globalPrompt) {
      setDeferredPrompt(globalPrompt);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).__nanaDeferredInstallPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).__nanaDeferredInstallPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (manifestLink) {
        manifestLink.setAttribute('href', prevManifestHref);
      } else if (createdManifestLink && createdManifestLink.parentNode) {
        createdManifestLink.parentNode.removeChild(createdManifestLink);
      }
      if (appleIcon && prevAppleIconHref) {
        appleIcon.setAttribute('href', prevAppleIconHref);
      }
      if (appleTitle && prevAppleTitle) {
        appleTitle.setAttribute('content', prevAppleTitle);
      }
      if (themeColorMeta && prevThemeColor) {
        themeColorMeta.setAttribute('content', prevThemeColor);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [enabled]);

  // 2. Persistance garantie du stockage navigateur (évite l'éviction du panier / file hors-ligne / session caissier)
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined') return;
    const storageAny = navigator.storage as any;
    if (storageAny && typeof storageAny.persist === 'function') {
      storageAny.persisted?.().then((already: boolean) => {
        if (already) {
          setIsPersistentStorage(true);
        } else {
          storageAny.persist().then((granted: boolean) => {
            setIsPersistentStorage(Boolean(granted));
          }).catch(() => {});
        }
      }).catch(() => {});
    }
  }, [enabled]);

  // 3. Surveillance réseau temps réel + vérification proactive des mises à jour Service Worker
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          reg?.update().catch(() => {});
        }).catch(() => {});
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let intervalId: number | undefined;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setUpdateAvailable(true);
        }
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setUpdateAvailable(true);
            }
          });
        });
        reg.update().catch(() => {});
      }).catch(() => {});

      intervalId = window.setInterval(() => {
        navigator.serviceWorker.getRegistration().then((reg) => {
          reg?.update().catch(() => {});
        }).catch(() => {});
      }, 5 * 60 * 1000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [enabled]);

  const installPosPwa = useCallback(async (): Promise<'accepted' | 'dismissed' | 'manual'> => {
    const promptEvent =
      deferredPrompt || ((window as any).__nanaDeferredInstallPrompt as BeforeInstallPromptEvent | undefined);
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice.catch(() => null);
        setDeferredPrompt(null);
        (window as any).__nanaDeferredInstallPrompt = null;
        if (choice?.outcome === 'accepted') {
          setIsInstalled(true);
          return 'accepted';
        }
        return 'dismissed';
      } catch {
        setShowIosHint(true);
        return 'manual';
      }
    }
    setShowIosHint(true);
    return 'manual';
  }, [deferredPrompt]);

  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }, [waitingWorker]);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    showIosHint,
    setShowIosHint,
    isOnline,
    updateAvailable,
    applyUpdate,
    installPosPwa,
    isPersistentStorage,
  };
}
