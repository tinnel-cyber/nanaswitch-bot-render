import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Zap } from 'lucide-react';

/**
 * FunnelCodeEditor - Éditeur de code Lean (CSS Scoped & Injection HTML)
 * Isolé via React.lazy pour alléger le bundle initial du Funnel Builder.
 */
export const FunnelCodeEditor = ({
  customCSS = '',
  setCustomCSS = () => {},
  customHTML = '',
  setCustomHTML = () => {}
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Champ 1 : CSS Personnalisé (S'applique en direct) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>CSS Personnalisé (S'applique en direct)</span>
          </label>
          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            {customCSS ? `${customCSS.length} cars` : 'En direct'}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Modifie instantanément les styles, couleurs et animations de la page à la frappe.
        </p>
        <textarea
          rows={9}
          value={customCSS}
          onChange={(e) => setCustomCSS(e.target.value)}
          placeholder={`/* Tapez votre CSS ici (injecté en direct) */\n.hero-headline {\n  text-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);\n}\n.badge-promo {\n  animation: bounce 2s infinite;\n}`}
          className="w-full bg-gray-900 border border-slate-800 rounded-xl p-3 font-mono text-sm text-amber-300 placeholder:text-slate-600 resize-y focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 leading-relaxed shadow-inner select-text"
          spellCheck={false}
        />
      </div>

      {/* Champ 2 : HTML / Shortcodes / Scripts */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>HTML / Shortcodes / Scripts</span>
          </label>
          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
            {customHTML ? `${customHTML.length} cars` : 'Live DOM'}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Formulaires externes, iframes vidéo, bannières HTML ou widgets interactifs.
        </p>
        <textarea
          rows={9}
          value={customHTML}
          onChange={(e) => setCustomHTML(e.target.value)}
          placeholder={`<!-- Collez votre code HTML, iframe ou embed externe -->\n<div class="p-6 bg-slate-900 border border-indigo-500/40 rounded-2xl text-center">\n  <h3 class="text-indigo-400 font-bold text-base">🎁 Offre Partenaire Débloquée</h3>\n  <p class="text-xs text-slate-300 mt-1">Valable pendant les 15 prochaines minutes.</p>\n</div>`}
          className="w-full bg-gray-900 border border-slate-800 rounded-xl p-3 font-mono text-sm text-emerald-300 placeholder:text-slate-600 resize-y focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed shadow-inner select-text"
          spellCheck={false}
        />
      </div>

      {/* Notification Info */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Moteur Lean Sans Dépendance</span>
        </div>
        <p>
          Aucune lourdeur ni latence : le CSS est injecté directement dans une balise <code className="text-amber-400">&lt;style&gt;</code> et le HTML via <code className="text-indigo-400">dangerouslySetInnerHTML</code>.
        </p>
      </div>
    </div>
  );
};

export default FunnelCodeEditor;
