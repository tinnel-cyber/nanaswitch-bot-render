import React from 'react';
import { NanasoreLogo } from '../../components/common/NanasoreLogo';

export interface LoadingScreenProps {
  message?: string;
  label?: string;
}

/**
 * LoadingScreen ultra-léger et Cyber-Premium pour transition fluide en Code Splitting / Lazy Loading
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message, label }) => {
  const displayLabel = message || label || 'Chargement de Nanasore — La Voie Facile...';
  return (
    <div className="min-h-screen w-full bg-[#020B1E] flex flex-col items-center justify-center p-4 text-slate-100 font-sans select-none">
      <div className="relative flex flex-col items-center justify-center mb-5">
        <NanasoreLogo variant="full" size="lg" theme="dark" />
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span className="text-xs font-black text-slate-200 tracking-wide">{displayLabel}</span>
      </div>
    </div>
  );
};

export default LoadingScreen;
