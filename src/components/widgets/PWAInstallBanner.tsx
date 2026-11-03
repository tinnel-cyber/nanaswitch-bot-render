import React, { useState, useCallback } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share, X, Smartphone, Check } from 'lucide-react';
import { NanasorePasserelleIcon } from '../common/NanasoreLogo';

interface PWAInstallBannerProps {
  variant?: 'banner' | 'button';
  onDismiss?: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ variant = 'banner' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Si l'app est déjà installée ou que l'utilisateur a fermé la bannière
  if (isInstalled || isDismissed) {
    return null;
  }

  // Si ce n'est ni installable (sur desktop/android sans prompt) ni iOS
  if (!isInstallable && !isIOS) {
    return null;
  }

  if (variant === 'button') {
    return (
      <>
        {isInstallable && (
          <button
            type="button"
            onClick={install}
            className="flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm active:scale-95 transition-all shrink-0"
            title="Installer Nanasore sur l'écran d'accueil"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Installer l'App</span>
          </button>
        )}

        {isIOS && (
          <button
            type="button"
            onClick={() => setShowIOSModal(true)}
            className="flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-bold text-blue-300 bg-blue-950/80 border border-blue-500/40 hover:bg-blue-900 rounded-lg shadow-sm active:scale-95 transition-all shrink-0"
            title="Installer sur iPhone / iPad"
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Installer (iOS)</span>
          </button>
        )}

        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Installer sur iPhone / iPad</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSModal(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5 bg-slate-800/80 p-2.5 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                  <span>Touchez l'icône <strong>Partager</strong> <Share className="inline w-3.5 h-3.5 text-blue-400 mx-0.5" /> dans la barre de Safari.</span>
                </div>
                <div className="flex items-start gap-2.5 bg-slate-800/80 p-2.5 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                  <span>Faites défiler le menu et sélectionnez <strong>Sur l'écran d'accueil</strong> <span className="text-amber-300 font-semibold">(+)</span>.</span>
                </div>
                <div className="flex items-start gap-2.5 bg-slate-800/80 p-2.5 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                  <span>Appuyez sur <strong>Ajouter</strong> en haut à droite. L'icône Nanasore apparaîtra instantanément !</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="mt-5 w-full py-2 bg-blue-600 hover:bg-blue-500 font-bold text-xs rounded-xl text-white shadow-md transition"
              >
                Compris !
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Variant 'banner'
  return (
    <>
      <div className="bg-gradient-to-r from-blue-900/95 via-indigo-900/95 to-blue-900/95 border-b border-blue-400/30 px-3 py-1.5 flex items-center justify-between text-xs text-white shadow-md z-30 select-none">
        <div className="flex items-center gap-2 truncate">
          <NanasorePasserelleIcon pixelSize={24} className="shrink-0" />
          <div className="truncate">
            <span className="font-bold text-amber-300">Nanasore Mobile Installable :</span>{' '}
            <span className="text-blue-100 hidden sm:inline">Plein écran & accès hors-ligne direct</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isInstallable && (
            <button
              type="button"
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-[11px] rounded-lg shadow-sm active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Installer l'app</span>
            </button>
          )}

          {isIOS && (
            <button
              type="button"
              onClick={() => setShowIOSModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded-lg shadow-sm transition-all"
            >
              <Share className="w-3 h-3" />
              <span>Installer sur iPhone</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-blue-300 hover:text-white rounded-md hover:bg-blue-800/50"
            title="Masquer la bannière"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Installer sur iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 bg-slate-800/80 p-2.5 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                <span>Touchez le bouton <strong>Partager</strong> <Share className="inline w-3.5 h-3.5 text-blue-400 mx-0.5" /> en bas de votre écran Safari.</span>
              </div>
              <div className="flex items-start gap-2.5 bg-slate-800/80 p-2.5 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                <span>Faites glisser et appuyez sur <strong>Sur l'écran d'accueil</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5 bg-slate-800/80 p-2.5 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                <span>Validez en cliquant sur <strong>Ajouter</strong>. Votre caisse est prête !</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2 bg-blue-600 hover:bg-blue-500 font-bold text-xs rounded-xl text-white shadow-md transition"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallBanner;
