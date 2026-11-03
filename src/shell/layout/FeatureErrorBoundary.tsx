import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props { children: ReactNode; featureName: string; }
interface State { hasError: boolean; }

export class FeatureErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Erreur isolée dans la fonctionnalité ${this.props.featureName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-slate-800/90 rounded-2xl border border-red-500/30 text-center">
          <p className="text-red-400 text-sm mb-2">Le service {this.props.featureName} est momentanément indisponible.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-3 py-1.5 bg-slate-700 text-white text-xs rounded-lg"
          >
            Fermer et réactiver
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default FeatureErrorBoundary;
