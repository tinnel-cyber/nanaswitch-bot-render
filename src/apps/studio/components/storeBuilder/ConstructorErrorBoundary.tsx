import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw, Wrench } from "lucide-react";

interface Props {
  children: ReactNode;
  constructorName?: string;
  onResetDraft?: () => void;
  fallbackComponent?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ConstructorErrorBoundary - Isolation Totale du Panneau Constructeur / Customizer
 * Protège l'éditeur de personnalisation de vitrine (ThemeCustomizerSidebar & CustomThemeArchitectSidebar).
 * Si une manipulation de paramètre cause une erreur, l'aperçu du thème reste intact.
 */
export class ConstructorErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[CRASH CONSTRUCTEUR ISOLÉ] - ${this.props.constructorName || 'Constructeur Studio'}:`, error, errorInfo);
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: { 
          boundary: 'ConstructorErrorBoundary',
          constructor: this.props.constructorName || 'unknown'
        },
      });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onResetDraft) {
      this.props.onResetDraft();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      return (
        <aside className="w-80 md:w-96 h-full max-h-full bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between text-white select-none overflow-y-auto shrink-0 shadow-2xl">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wrench className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>Constructeur de Thème</span>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Isolé
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Le panneau d'outils a intercepté une anomalie de configuration. L'aperçu de la vitrine à droite continue de fonctionner sans interruption.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 overflow-x-auto">
                <span className="text-rose-400 font-bold block mb-1">Erreur interceptée :</span>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={this.handleRetry}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition active:scale-95 cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Relancer le panneau d'outils</span>
            </button>

            {this.props.onResetDraft && (
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2 px-3 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 border border-rose-500/20 transition active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Restaurer la dernière version saine</span>
              </button>
            )}
          </div>
        </aside>
      );
    }

    return this.props.children;
  }
}

export default ConstructorErrorBoundary;
