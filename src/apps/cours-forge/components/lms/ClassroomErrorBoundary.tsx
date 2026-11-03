import React, { Component, ErrorInfo, ReactNode, useCallback } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  GraduationCap, 
  ArrowLeft,
  ShieldCheck 
} from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onBackToStore?: () => void;
  onBackToCourse?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ClassroomErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CLASSROOM SHIELD] Incident d’exécution dans l’Espace Étudiant intercepté :', error, errorInfo);
    this.setState({ errorInfo });

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('nana_last_classroom_error', JSON.stringify({
          time: new Date().toISOString(),
          message: error?.message || 'Unknown Classroom Error',
          stack: error?.stack || '',
        }));
      }
    } catch {}
  }

  private handleReload = () => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem('nana_last_classroom_error');
      }
    } catch {}
    window.location.reload();
  };

  private handleBackToDashboard = () => {
    if (this.props.onBackToStore) {
      this.props.onBackToStore();
    } else {
      window.location.href = '/';
    }
  };

  private handleBackToCourse = () => {
    if (this.props.onBackToCourse) {
      this.props.onBackToCourse();
    } else {
      this.handleBackToDashboard();
    }
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Erreur inattendue dans la salle de classe';

      return (
        <div className="min-h-[100dvh] w-full bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans">
          <div className="w-full max-w-lg bg-[#0d1527] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 flex flex-col items-center text-center">
            
            {/* Icône d'alerte thématique Campus / Académie */}
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Titre & Sous-titre adaptés */}
            <h1 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">
              {this.props.fallbackTitle || "Impossible de charger l'espace de cours"}
            </h1>
            
            <p className="text-sm text-slate-400 mb-6 leading-relaxed max-w-md">
              Un incident d'affichage est survenu dans la salle de classe virtuelle. Vos modules, devoirs et progression restent <span className="text-indigo-400 font-semibold">sauvegardés et sécurisés</span>.
            </p>

            {/* Diagnostic rapide */}
            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 mb-6 text-left">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                <span>Diagnostic technique :</span>
                <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                  <ShieldCheck className="w-3 h-3" />
                  Protection active
                </span>
              </div>
              <p className="text-xs text-amber-300 font-mono truncate" title={errorMessage}>
                {errorMessage}
              </p>
            </div>

            {/* Boutons d'action adaptés au LMS */}
            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full min-h-[48px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer touch-manipulation"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Rafraîchir la page</span>
              </button>

              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="flex-1 min-h-[44px] bg-slate-800/90 hover:bg-slate-700/90 active:scale-[0.98] text-slate-200 font-semibold rounded-2xl flex items-center justify-center gap-2 border border-slate-700/60 transition-all cursor-pointer touch-manipulation text-xs sm:text-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réessayer</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleBackToDashboard}
                  className="flex-1 min-h-[44px] bg-slate-800/90 hover:bg-slate-700/90 active:scale-[0.98] text-slate-200 font-semibold rounded-2xl flex items-center justify-center gap-2 border border-slate-700/60 transition-all cursor-pointer touch-manipulation text-xs sm:text-sm"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Retour au tableau de bord</span>
                </button>
              </div>

              {this.props.onBackToCourse && (
                <button
                  type="button"
                  onClick={this.handleBackToCourse}
                  className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-1.5 font-medium transition cursor-pointer"
                >
                  Revenir à la présentation du cours
                </button>
              )}
            </div>

            {/* Accordéon technique dépliable */}
            <div className="w-full mt-6 pt-4 border-t border-slate-800/60 text-left">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-400 transition-colors py-1 cursor-pointer"
              >
                <span>Détails techniques pour le support</span>
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {this.state.showDetails && (
                <div className="mt-2.5 p-3.5 rounded-xl bg-black/70 border border-slate-800 text-[11px] font-mono text-slate-400 overflow-x-auto max-h-44 select-text custom-scrollbar">
                  <p className="text-rose-400 font-bold mb-1.5">{this.state.error?.toString()}</p>
                  <p className="whitespace-pre-wrap text-slate-500">{this.state.errorInfo?.componentStack || this.state.error?.stack}</p>
                </div>
              )}
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ClassroomErrorBoundary;
