/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Loader Neutre Storefront (Verrou de Rendu Anti-FOUC & Anti-Thème par Défaut)
 * Garantit qu'aucun thème (notamment ThemeDefault) ne monte prématurément dans le DOM
 * tant que Firestore n'a pas formellement renvoyé le champ `activeThemeId`.
 */

import React from 'react';
import { NanasorePasserelleIcon } from './NanasoreLogo';

export interface StorefrontNeutralLoaderProps {
  label?: string;
  storeName?: string;
}

export const StorefrontNeutralLoader: React.FC<StorefrontNeutralLoaderProps> = ({
  label = 'Connexion à la vitrine officielle...',
  storeName
}) => {
  return (
    <div 
      className="storefront-neutral-loader fixed inset-0 z-[99999] bg-[#020B1E] text-white flex flex-col items-center justify-center p-6 select-none font-sans"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Halo lumineux d'arrière-plan */}
      <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-blue-600/20 via-cyan-500/15 to-transparent blur-3xl pointer-events-none animate-pulse" />

      {/* Emblème & Anneau de chargement */}
      <div className="relative flex items-center justify-center mb-6">
        {storeName ? (
          <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-700/60 shadow-2xl flex items-center justify-center relative z-10">
            <span className="text-2xl font-black bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              {storeName.charAt(0).toUpperCase()}
            </span>
          </div>
        ) : (
          <div className="relative z-10">
            <NanasorePasserelleIcon pixelSize={68} />
          </div>
        )}
        <div className="absolute -inset-2.5 rounded-[28px] border-2 border-transparent border-t-cyan-400 border-r-blue-500 animate-spin" />
      </div>

      {/* Libellé d'état */}
      <div className="flex flex-col items-center space-y-2 text-center relative z-10 max-w-sm">
        {storeName ? (
          <h2 className="text-base font-black text-white tracking-tight truncate max-w-xs">
            {storeName}
          </h2>
        ) : (
          <div className="flex items-baseline text-lg font-black tracking-tight">
            <span className="text-white">Nana</span>
            <span className="text-[#22D3EE]">sore</span>
            <span className="text-xs font-semibold text-slate-300 ml-2">• Plateforme Unifiée</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-semibold text-slate-300 tracking-wide">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
};
