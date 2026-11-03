import React, { Component, ErrorInfo, ReactNode } from 'react';
import { WifiOff, RefreshCw, Home, AlertCircle, Sparkles, X, ArrowRight } from 'lucide-react';

/**
 * Numéro de version stable de l'application Nanasore
 * Évite les comparaisons avec des hash dynamiques qui changent à chaque requête en dev
 */
export const APP_VERSION = '0.3.2';

const VERSION_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 heures
const CHUNK_RELOAD_COOLDOWN_MS = 60 * 60 * 1000; // 1 heure minimum entre deux tentatives auto

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  isChunkOrPwaError: boolean;
  isOffline: boolean;
  errorMessage: string;
  showUpdateToast: boolean;
  availableVersion?: string;
}

/**
 * GlobalErrorBoundary Anti-Boucle Infinie
 * Rôles :
 * 1. Intercepter les crashs globaux d'application sans provoquer de boucle de rechargement.
 * 2. Contrôler la détection de version (1 seule fois par session ou toutes les 6 heures).
 * 3. Afficher une notification / toast non-bloquant ("Une nouvelle version est disponible : [Actualiser]").
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    isChunkOrPwaError: false,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    errorMessage: '',
    showUpdateToast: false,
    availableVersion: APP_VERSION,
  };

  public componentDidMount() {
    this.checkApplicationVersion();
    this.setupNetworkListeners();
  }

  public componentWillUnmount() {
    this.cleanupNetworkListeners();
  }

  private handleOnline = () => this.setState({ isOffline: false });
  private handleOffline = () => this.setState({ isOffline: true });

  private setupNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private cleanupNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }

  /**
   * Vérification de version ultra-sécurisée :
   * - Ne s'exécute QU'UNE SEULE FOIS par session ou toutes les 6 heures.
   * - Ne recharge JAMAIS la page automatiquement.
   * - Compare deux versions stables (ex: "0.3.2").
   */
  private checkApplicationVersion = () => {
    if (typeof window === 'undefined') return;

    try {
      // 1. Drapeaux de contrôle dans sessionStorage et localStorage
      const sessionChecked = sessionStorage.getItem('nana_version_checked_session');
      if (sessionChecked === 'true') {
        return; // Déjà vérifié dans cette session
      }

      const lastCheckTime = parseInt(localStorage.getItem('nana_last_version_check') || '0', 10);
      const now = Date.now();
      if (now - lastCheckTime < VERSION_CHECK_INTERVAL_MS) {
        return; // Moins de 6 heures depuis la dernière vérification
      }

      // Marquer la vérification comme effectuée pour cette session et horodater
      sessionStorage.setItem('nana_version_checked_session', 'true');
      localStorage.setItem('nana_last_version_check', now.toString());

      const installedVersion = localStorage.getItem('nana_app_version');
      if (!installedVersion) {
        // Premier lancement : enregistrer la version stable
        localStorage.setItem('nana_app_version', APP_VERSION);
      } else if (installedVersion !== APP_VERSION) {
        // Une nouvelle version stable est disponible : afficher un toast non-bloquant
        this.setState({
          showUpdateToast: true,
          availableVersion: APP_VERSION,
        });
      }
    } catch (e) {
      console.warn('[GlobalBoundary] Erreur lors du contrôle de version :', e);
    }
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const message = error?.message || '';
    const isChunkOrPwaError =
      error?.name === 'ChunkLoadError' ||
      message.includes('Loading chunk') ||
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('Importing a module script failed') ||
      message.includes('error loading dynamically imported module') ||
      message.includes('Failed to load module script');

    const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

    return {
      hasError: true,
      isChunkOrPwaError,
      isOffline,
      errorMessage: message,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CRASH SHIELD RACINE] Crash global intercepté :', error, errorInfo);

    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('error loading dynamically imported module') ||
      error?.message?.includes('Failed to load module script');

    if (isChunkError) {
      this.handleChunkLoadSafely();
    }
  }

  /**
   * Gestion sécurisée des erreurs de chargement de chunk (mise à jour du serveur)
   * STOPPE le rechargement forcé continu :
   * - Limite strictement à 1 tentative automatique par heure.
   * - Si déjà tenté ou échec : affiche le toast non-bloquant sans boucle infinie.
   */
  private handleChunkLoadSafely = () => {
    try {
      const now = Date.now();
      const lastAttempt = parseInt(localStorage.getItem('nana_chunk_reload_last_ts') || '0', 10);

      // Si un rechargement a déjà eu lieu dans l'heure écoulée, NE PLUS RECHARGER EN BOUCLE
      if (now - lastAttempt < CHUNK_RELOAD_COOLDOWN_MS) {
        console.warn('[GlobalBoundary] Cooldown actif : rechargement automatique bloqué pour éviter la boucle infinie.');
        this.setState({ showUpdateToast: true });
        return;
      }

      // Enregistrer la tentative dans le localStorage
      localStorage.setItem('nana_chunk_reload_last_ts', now.toString());

      // Purge douce des caches en arrière-plan
      if (typeof window !== 'undefined' && 'caches' in window) {
        window.caches.keys().then((keys) => {
          return Promise.all(keys.map((k) => window.caches.delete(k)));
        }).catch(() => {});
      }

      // Proposer le toast plutôt que de forcer un reload brutal
      this.setState({ showUpdateToast: true });
    } catch (e) {
      console.warn('[GlobalBoundary] Erreur gestion chunk :', e);
      this.setState({ showUpdateToast: true });
    }
  };

  /** Rechargement manuel explicite (déclenché par l'utilisateur via le bouton) */
  private handleManualUpdate = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('nana_app_version', APP_VERSION);
        if ('caches' in window) {
          const keys = await window.caches.keys();
          await Promise.all(keys.map((k) => window.caches.delete(k)));
        }
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
      }
    } catch {}
    window.location.reload();
  };

  /** Masquer le toast de mise à jour */
  private handleDismissToast = () => {
    this.setState({ showUpdateToast: false });
    try {
      // Marque comme acceptée / ignorée pour la session
      localStorage.setItem('nana_app_version', APP_VERSION);
    } catch {}
  };

  /** Réessayer le rendu sans rechargement de page */
  private handleRetryRender = () => {
    if (typeof window !== 'undefined' && 'caches' in window) {
      window.caches.keys().then((keys) => Promise.all(keys.map((k) => window.caches.delete(k)))).catch(() => {});
    }
    this.setState({ hasError: false, errorMessage: '', isChunkOrPwaError: false });
  };

  /** Retour à la racine */
  private handleBackToHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  public render() {
    const { hasError, isOffline, showUpdateToast, availableVersion } = this.state;

    return (
      <>
        {/* 1. Toast / Notification Non-Bloquante de Nouvelle Version */}
        {showUpdateToast && (
          <div className="fixed top-4 right-4 z-[999999] max-w-sm w-full mx-auto p-3.5 bg-slate-900/95 border border-blue-500/40 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Mise à jour disponible</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">
                      v{availableVersion || APP_VERSION}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Une nouvelle version de Nanasore est prête.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={this.handleDismissToast}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="Ignorer pour l'instant"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-800">
              <button
                type="button"
                onClick={this.handleManualUpdate}
                className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Actualiser</span>
              </button>
              <button
                type="button"
                onClick={this.handleDismissToast}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition cursor-pointer"
              >
                Plus tard
              </button>
            </div>
          </div>
        )}

        {/* 2. Rendu Normal ou Écran de Repli Sécurisé (Si crash système bloquant) */}
        {hasError ? (
          <div className="min-h-[100dvh] w-full bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans">
            <div className="w-full max-w-md bg-[#0d1527] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
              
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5">
                {isOffline ? (
                  <WifiOff className="w-8 h-8 text-amber-400 animate-pulse" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-blue-400" />
                )}
              </div>

              <h1 className="text-lg sm:text-xl font-bold text-white mb-2">
                {isOffline
                  ? 'Connexion réseau interrompue'
                  : (this.props.fallbackTitle || 'Service momentanément indisponible')}
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
                {isOffline
                  ? 'Vérifiez votre connexion Internet mobile ou Wi-Fi pour continuer.'
                  : (this.props.fallbackMessage || "Une interruption système a été détectée. Vos données sont en sécurité.")}
              </p>

              {/* Message d'erreur technique pour le diagnostic immédiat */}
              {this.state.errorMessage && (
                <div className="w-full mb-5 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-left">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Détail de l'interruption :</div>
                  <div className="text-xs text-rose-300 font-mono break-all line-clamp-3 select-all">
                    {this.state.errorMessage}
                  </div>
                </div>
              )}

              <div className="w-full space-y-2.5">
                {/* Réessayer d'abord le rendu local React sans recharger la page */}
                <button
                  type="button"
                  onClick={this.handleRetryRender}
                  className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition cursor-pointer text-xs sm:text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Réessayer l'affichage</span>
                </button>

                {/* Actualiser manuellement si besoin */}
                <button
                  type="button"
                  onClick={this.handleManualUpdate}
                  className="w-full min-h-[42px] bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 font-medium rounded-2xl flex items-center justify-center gap-2 border border-slate-700/60 transition cursor-pointer text-xs"
                >
                  <span>Actualiser la page</span>
                </button>

                {/* Retour à l'accueil */}
                <button
                  type="button"
                  onClick={this.handleBackToHome}
                  className="w-full min-h-[42px] bg-transparent hover:bg-slate-800/40 text-slate-400 hover:text-white font-medium rounded-2xl flex items-center justify-center gap-1.5 transition cursor-pointer text-xs"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Retour à l'accueil</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          this.props.children
        )}
      </>
    );
  }
}

export default GlobalErrorBoundary;
