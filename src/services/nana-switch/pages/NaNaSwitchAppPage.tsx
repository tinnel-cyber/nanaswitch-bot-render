import React, { useState, useEffect, useCallback } from 'react';
import { NaNaSwitchLayout, NaNaSwitchPageKey } from '../components/NaNaSwitchLayout';
import { NaNaSwitchOverviewPage } from './NaNaSwitchOverviewPage';
import { NaNaSwitchConnectorsPage } from './NaNaSwitchConnectorsPage';
import { NaNaSwitchRoutingPage } from './NaNaSwitchRoutingPage';
import { NaNaSwitchExtensionPage } from './NaNaSwitchExtensionPage';
import { NaNaSwitchSecurityPage } from './NaNaSwitchSecurityPage';
import { NaNaSwitchLogsPage } from './NaNaSwitchLogsPage';
import { NaNaSwitchBillingPage } from './NaNaSwitchBillingPage';
import { NaNaSwitchLandingPage } from './NaNaSwitchLandingPage';
import { NaNaSwitchPocketMobileApp } from './NaNaSwitchPocketMobileApp';
import { NaNaSwitchAuthPage } from './NaNaSwitchAuthPage';
import { NaNaSwitchAuthGuard } from '../components/NaNaSwitchAuthGuard';
import { 
  Key, 
  Globe, 
  Puzzle, 
  ShieldCheck, 
  Terminal, 
  CreditCard, 
  ArrowRight, 
  Sparkles, 
  Lock, 
  Zap, 
  Server, 
  Smartphone 
} from 'lucide-react';
import { playTapBeep } from '../../../utils/audio';

export interface NaNaSwitchAppPageProps {
  initialPage?: NaNaSwitchPageKey;
  onNavigateHome?: () => void;
}

export const NaNaSwitchAppPage: React.FC<NaNaSwitchAppPageProps> = ({
  initialPage = 'overview',
  onNavigateHome
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  const [activePage, setActivePage] = useState<NaNaSwitchPageKey>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/nana-switch/connectors' || path === '/nana-switch/byok' || path === '/nana-switch/keys') return 'connectors';
      if (path === '/nana-switch/routing') return 'routing';
      if (path === '/nana-switch/extension') return 'extension';
      if (path === '/nana-switch/app' || path === '/nana-switch/pocket') return 'pocket';
      if (path === '/nana-switch/security') return 'security';
      if (path === '/nana-switch/logs') return 'logs';
      if (path === '/nana-switch/billing') return 'billing';
      if (path === '/nana-switch/overview' || path === '/nana-switch-app' || path === '/nana-switch/console') return 'overview';
      if (path === '/nana-switch/auth') return 'auth';
      if (path === '/nana-switch' || path === '/nana-switch/') return 'landing';
    }
    return initialPage;
  });

  // Synchronisation avec l'URL navigateur + Favicon exclusif "Le Cœur de Routage" (variant="mark")
  useEffect(() => {
    const applyNaNaSwitchFavicon = () => {
      if (typeof document === 'undefined') return;
      document.title = 'NaNaSwitch Cloud — Smart API Router (Le Cœur de Routage)';
      const faviconHref = '/nanaswitch-favicon-mark.svg?v=coeur_routage_v2';
      ['icon', 'shortcut icon', 'apple-touch-icon'].forEach((rel) => {
        const links = document.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`);
        if (links.length > 0) {
          links.forEach((l) => l.setAttribute('href', faviconHref));
        } else {
          const link = document.createElement('link');
          link.rel = rel;
          link.type = 'image/svg+xml';
          link.href = faviconHref;
          document.head.appendChild(link);
        }
      });
    };

    applyNaNaSwitchFavicon();

    const handlePop = () => {
      applyNaNaSwitchFavicon();
      const path = window.location.pathname;
      if (path === '/nana-switch/connectors' || path === '/nana-switch/byok' || path === '/nana-switch/keys') setActivePage('connectors');
      else if (path === '/nana-switch/routing') setActivePage('routing');
      else if (path === '/nana-switch/extension') setActivePage('extension');
      else if (path === '/nana-switch/app' || path === '/nana-switch/pocket') setActivePage('pocket');
      else if (path === '/nana-switch/security') setActivePage('security');
      else if (path === '/nana-switch/logs') setActivePage('logs');
      else if (path === '/nana-switch/billing') setActivePage('billing');
      else if (path === '/nana-switch/overview') setActivePage('overview');
      else if (path === '/nana-switch/auth') setActivePage('auth');
      else if (path === '/nana-switch') setActivePage('landing');
    };

    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [activePage]);

  const handleNavigate = useCallback((path: string) => {
    playTapBeep();
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
    if (path === '/nana-switch/connectors' || path === '/nana-switch/byok' || path === '/nana-switch/keys') setActivePage('connectors');
    else if (path === '/nana-switch/routing') setActivePage('routing');
    else if (path === '/nana-switch/extension') setActivePage('extension');
    else if (path === '/nana-switch/app' || path === '/nana-switch/pocket') setActivePage('pocket');
    else if (path === '/nana-switch/security') setActivePage('security');
    else if (path === '/nana-switch/logs') setActivePage('logs');
    else if (path === '/nana-switch/billing') setActivePage('billing');
    else if (path === '/nana-switch/overview') setActivePage('overview');
    else if (path === '/nana-switch/auth') setActivePage('auth');
    else if (path === '/nana-switch') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      setActivePage('landing');
    } else if (path === '/nana-switch-app' || path === '/app/nanaswitch') {
      setActivePage('connectors');
    } else if (path === '/dashboard' || path.startsWith('/dashboard')) {
      if (typeof window !== 'undefined') {
        window.location.href = path;
      }
    }
  }, []);

  // 1. Landing Page publique pure (/nana-switch)
  if (activePage === 'landing') {
    return (
      <NaNaSwitchLandingPage
        onNavigateToConsole={() => handleNavigate('/nana-switch/connectors')}
        onNavigateToExtension={() => handleNavigate('/nana-switch/extension')}
        onNavigate={handleNavigate}
      />
    );
  }

  // 2. Portail d'Authentification Cloud Dédié (/nana-switch/auth)
  if (activePage === 'auth') {
    return (
      <NaNaSwitchAuthPage
        onNavigate={handleNavigate}
      />
    );
  }

  // 3. Application Mobile Plein Écran (/nana-switch/app ou /pocket) — Protégée par le Gardien
  if (activePage === 'pocket') {
    return (
      <NaNaSwitchAuthGuard onNavigate={handleNavigate}>
        <NaNaSwitchPocketMobileApp
          onNavigate={handleNavigate}
        />
      </NaNaSwitchAuthGuard>
    );
  }

  // 4. Console Cloud Principale (8 Pages) — Protégée par le Gardien
  return (
    <NaNaSwitchAuthGuard onNavigate={handleNavigate}>
      <NaNaSwitchLayout activePage={activePage} onNavigate={handleNavigate}>
        {activePage === 'overview' && (
          <NaNaSwitchOverviewPage onNavigate={handleNavigate} />
        )}

        {activePage === 'connectors' && (
          <NaNaSwitchConnectorsPage onNavigate={handleNavigate} />
        )}

        {activePage === 'routing' && (
          <NaNaSwitchRoutingPage onNavigate={handleNavigate} />
        )}

        {activePage === 'extension' && (
          <NaNaSwitchExtensionPage onNavigate={handleNavigate} />
        )}

        {activePage === 'security' && (
          <NaNaSwitchSecurityPage onNavigate={handleNavigate} />
        )}

        {activePage === 'logs' && (
          <NaNaSwitchLogsPage onNavigate={handleNavigate} />
        )}

        {activePage === 'billing' && (
          <NaNaSwitchBillingPage onNavigate={handleNavigate} />
        )}
      </NaNaSwitchLayout>
    </NaNaSwitchAuthGuard>
  );
};

export default NaNaSwitchAppPage;
