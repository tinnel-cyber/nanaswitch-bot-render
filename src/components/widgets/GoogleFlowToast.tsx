import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Video, Check, Copy, X, ExternalLink, Sparkles } from 'lucide-react';
import { GoogleFlowToastDetail, FLOW_STUDIO_URL, openFlowInApp } from '../../utils/launchGoogleFlow';

export const GoogleFlowToast: React.FC = () => {
  const [toast, setToast] = useState<GoogleFlowToastDetail | null>(null);
  const [hasCopiedAgain, setHasCopiedAgain] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleShowToast = (event: Event) => {
      const customEvent = event as CustomEvent<GoogleFlowToastDetail>;
      if (!customEvent.detail) return;

      setToast(customEvent.detail);
      setHasCopiedAgain(false);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const duration = customEvent.detail.duration || 5000;
      timerRef.current = setTimeout(() => {
        setToast(null);
      }, duration);
    };

    window.addEventListener('nana_show_flow_toast', handleShowToast);
    return () => {
      window.removeEventListener('nana_show_flow_toast', handleShowToast);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!toast) return null;

  const handleCopyAgain = async () => {
    if (!toast.promptCopied) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(toast.promptCopied);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = toast.promptCopied;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setHasCopiedAgain(true);
      setTimeout(() => setHasCopiedAgain(false), 2000);
    } catch (err) {
      console.warn('Copy again failed', err);
    }
  };

  return (
    <div
      id="google-flow-toast"
      role="status"
      aria-live="polite"
      className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-[10000] w-[94%] max-w-md bg-[#0d1527]/98 backdrop-blur-md border border-violet-500/50 shadow-2xl shadow-violet-950/70 rounded-2xl p-3 sm:p-3.5 animate-in fade-in slide-in-from-top-3 duration-200 select-none text-white"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 border border-violet-400/40 flex items-center justify-center shrink-0 shadow-md shadow-violet-900/40">
            <Video className="w-4 h-4 text-violet-100" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs font-bold text-white tracking-wide">
                Studio Pub IA • Flow
              </h4>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[9.5px] font-extrabold flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5" />
                <span>Prompt copié !</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
              {toast.message}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setToast(null)}
          className="w-6 h-6 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center shrink-0 cursor-pointer active:scale-90 transition-all border border-slate-700/60"
          title="Fermer la notification"
          aria-label="Fermer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {toast.promptCopied && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 flex items-center gap-1.5 text-[10px] text-violet-300/90 font-mono truncate bg-slate-950/70 px-2 py-1 rounded-lg border border-violet-900/40">
            <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />
            <span className="truncate">{toast.promptCopied}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCopyAgain}
              className="px-2 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-sm"
              title="Copier à nouveau le prompt"
            >
              {hasCopiedAgain ? (
                <>
                  <Check className="w-3 h-3 text-emerald-300" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Re-copier</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => openFlowInApp(FLOW_STUDIO_URL)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer border border-slate-700 active:scale-95 transition-all"
              title="Réouvrir Flow Studio In-App"
            >
              <span>Flow</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleFlowToast;
