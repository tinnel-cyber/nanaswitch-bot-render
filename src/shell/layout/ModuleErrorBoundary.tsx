import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  moduleName: string; // Ex: "POS - Caisse", "Stock - Inventaire", "Twilio SMS", "CinetPay"
  fallbackComponent?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[CRASH MODULE ISOLÉ] - ${this.props.moduleName}:`, error, errorInfo);
    // Optionnel : Envoyer l'alerte ciblée à Sentry avec le tag du module
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: { module: this.props.moduleName },
      });
    }
  }

  private handleHardReload = async () => {
    if (typeof window !== "undefined") {
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (_) {}
      window.location.reload();
    }
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      const errorMsg = String(this.state.error?.message || this.state.error || '');
      const isDynamicImportError =
        errorMsg.includes('Failed to fetch dynamically imported module') ||
        errorMsg.includes('dynamically imported') ||
        errorMsg.includes('Loading chunk') ||
        errorMsg.includes('Importing a module script failed');

      if (isDynamicImportError) {
        return (
          <div className="p-5 my-3 bg-slate-900/95 border border-blue-500/40 rounded-2xl text-left backdrop-blur-md shadow-2xl max-w-lg mx-auto">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-blue-400 text-xl">🚀</span>
              <h4 className="text-sm font-bold text-white">
                Mise à jour disponible : <span className="text-blue-400">{this.props.moduleName}</span>
              </h4>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Une nouvelle version de ce module a été déployée sur la plateforme. Une actualisation rapide est nécessaire pour charger les nouveaux composants.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={this.handleHardReload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <span>🔄</span>
                <span>Mettre à jour & Recharger</span>
              </button>
              <button
                onClick={this.handleRetry}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-all active:scale-95 cursor-pointer"
              >
                Réessayer
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="p-4 my-2 bg-slate-900/90 border border-amber-500/30 rounded-xl text-left backdrop-blur-md shadow-lg">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-amber-400 text-lg">⚠️</span>
            <h4 className="text-sm font-semibold text-slate-200">
              Module indisponible : <span className="text-amber-400">{this.props.moduleName}</span>
            </h4>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Une erreur est survenue dans ce sous-module. Les autres fonctionnalités de Nanasore restent opérationnelles.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={this.handleRetry}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-all active:scale-95 cursor-pointer"
            >
              🔄 Relancer ce module
            </button>
            <button
              onClick={this.handleHardReload}
              className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700 text-slate-400 text-xs font-medium rounded-lg border border-slate-700/60 transition-all active:scale-95 cursor-pointer"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ModuleErrorBoundary;
