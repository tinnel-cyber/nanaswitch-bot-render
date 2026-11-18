/**
 * @file LiveSubscribeButton.tsx
 * @description Bouton Acheteur "M'alerter quand cette boutique lance un Live"
 * Gère l'abonnement Web Push ciblé par store_slug avec info-bulle PWA iOS Safari
 */

import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Check, Info, Share, PlusSquare, X, Loader2 } from 'lucide-react';
import { registerWebPushSubscription } from '../../../../services/supabaseNotificationService';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface LiveSubscribeButtonProps {
  storeSlug: string;
  storeName?: string;
  className?: string;
  variant?: 'solid' | 'outline' | 'compact';
}

export const LiveSubscribeButton: React.FC<LiveSubscribeButtonProps> = ({
  storeSlug,
  storeName = 'cette boutique',
  className = '',
  variant = 'solid'
}) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Détection iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const standaloneMode = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    setIsIos(isIosDevice);
    setIsStandalone(standaloneMode);

    // Vérifier si déjà abonné en localStorage
    const saved = localStorage.getItem(`nana_live_sub_${storeSlug}`);
    if (saved === 'true') {
      setIsSubscribed(true);
    }
  }, [storeSlug]);

  const handleSubscribe = async () => {
    playTapBeep();

    // Sur iOS, si pas en mode Standalone (PWA installée), Web Push n'est accessible qu'après "Sur l'écran d'accueil"
    if (isIos && !isStandalone) {
      setShowIosPrompt(true);
      return;
    }

    setIsLoading(true);

    try {
      const sub = await registerWebPushSubscription('buyer', storeSlug);
      if (sub) {
        setIsSubscribed(true);
        localStorage.setItem(`nana_live_sub_${storeSlug}`, 'true');
        playValidationBeep();
      } else {
        if (isIos) {
          setShowIosPrompt(true);
        }
      }
    } catch (err) {
      console.warn('[LiveSubscribeButton] Erreur inscription alerte live :', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      {/* Bouton Principal */}
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={isLoading || isSubscribed}
        className={`group relative flex items-center gap-2 rounded-2xl font-bold text-xs transition-all duration-200 cursor-pointer active:scale-95 shadow-md ${
          isSubscribed
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default px-3.5 py-2'
            : variant === 'outline'
              ? 'bg-slate-900/80 hover:bg-slate-800 text-blue-300 hover:text-white border border-blue-500/30 px-3.5 py-2'
              : variant === 'compact'
                ? 'bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-[11px] shadow-blue-600/30'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 shadow-blue-600/30'
        } ${className}`}
        title={isSubscribed ? "Vous êtes abonné aux alertes Live" : "Recevoir une notification dès que le Live commence"}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Activation...</span>
          </>
        ) : isSubscribed ? (
          <>
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Alertes Live activées</span>
          </>
        ) : (
          <>
            <BellRing className="w-4 h-4 text-amber-300 animate-bounce shrink-0" />
            <span className="truncate">M'alerter quand cette boutique lance un Live</span>
          </>
        )}
      </button>

      {/* Info-Bulle / Modal d'installation iOS Safari (Indispensable pour Web Push Apple) */}
      {showIosPrompt && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-blue-500/30 rounded-3xl p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Alertes Live sur iPhone</h4>
                  <p className="text-[11px] text-slate-400">{storeName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosPrompt(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/20 space-y-3 text-xs leading-relaxed text-slate-300">
              <p className="font-medium text-slate-200">
                Sur Safari iOS, Apple demande d'ajouter l'application à votre écran d'accueil pour recevoir les alertes de Direct même écran verrouillé :
              </p>
              <div className="space-y-2 text-[11px] text-slate-300">
                <div className="flex items-center gap-2.5 bg-slate-850 p-2 rounded-xl border border-slate-750">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                  <span>Appuyez sur le bouton <strong>Partager</strong> <Share className="inline w-3.5 h-3.5 mx-1 text-blue-400" /> en bas de Safari.</span>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-850 p-2 rounded-xl border border-slate-750">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                  <span>Faites défiler et choisissez <strong>Sur l'écran d'accueil</strong> <PlusSquare className="inline w-3.5 h-3.5 mx-1 text-blue-400" />.</span>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-850 p-2 rounded-xl border border-slate-750">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                  <span>Ouvrez l'app depuis l'écran d'accueil et confirmez les alertes !</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosPrompt(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              Compris, merci !
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveSubscribeButton;
