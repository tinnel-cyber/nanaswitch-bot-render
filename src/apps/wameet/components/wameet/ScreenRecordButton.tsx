import React, { useState } from 'react';
import { Circle, Square, Video, AlertCircle, Check, Download } from 'lucide-react';
import { useLocalScreenRecorder } from '../../../../hooks/useLocalScreenRecorder';
import { playTapBeep } from '../../../../utils/audio';

export interface ScreenRecordButtonProps {
  /** Titre ou contexte pour nommer le fichier (ex: "Masterclass_VIP_Business") */
  sessionTitle?: string;
  /** Variante visuelle du bouton */
  variant?: 'pill' | 'compact' | 'circle';
  /** Callback optionnel pour déclencher un toast dans l'app parente */
  onToast?: (message: string) => void;
  className?: string;
}

/**
 * COMPOSANT ScreenRecordButton (Prompt 52 : Bouton d'Enregistrement d'Écran Local)
 * 
 * Directives UI/UX :
 * - Discret dans les paramètres flottants du Live
 * - État inactif : Icône de cercle rouge élégant
 * - État actif : Clignote (animate-pulse) avec indicateur rouge et chronomètre dynamique (00:00)
 * - Téléchargement silencieux et automatique sur l'appareil au clic sur Stop (zéro coût serveur)
 * - Toast d'explication convivial sur navigateurs mobiles non compatibles
 */
export const ScreenRecordButton: React.FC<ScreenRecordButtonProps> = ({
  sessionTitle = 'Wameet_Live',
  variant = 'pill',
  onToast,
  className = ''
}) => {
  const [localToastMessage, setLocalToastMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    if (onToast) {
      onToast(msg);
    } else {
      setLocalToastMessage(msg);
      window.setTimeout(() => setLocalToastMessage(null), 4500);
    }
  };

  const cleanFilenamePrefix = sessionTitle
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 30);

  const {
    isRecording,
    formattedDuration,
    startRecording,
    stopRecording
  } = useLocalScreenRecorder({
    filenamePrefix: `Wameet_${cleanFilenamePrefix}`,
    onStart: () => {
      showNotification('🔴 Enregistrement d’écran démarré (sauvegarde locale directe)');
    },
    onStop: (_blob, downloadUrl) => {
      showNotification('✅ Vidéo enregistrée et téléchargée sur votre appareil !');
    },
    onError: (msg) => {
      showNotification(msg);
    },
    onFallbackRecommended: (msg) => {
      showNotification(msg);
    }
  });

  const handleClick = async () => {
    playTapBeep();
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  return (
    <div className="relative inline-flex items-center">
      {/* ─── 1. VARIANTE PILL (Par défaut : Idéal pour les barres de contrôle supérieures) ─ */}
      {variant === 'pill' && (
        <button
          type="button"
          onClick={handleClick}
          title={isRecording ? 'Arrêter et télécharger la vidéo' : 'Enregistrer le Live sur cet appareil'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all cursor-pointer select-none active:scale-95 border backdrop-blur-xl ${
            isRecording
              ? 'bg-rose-950/90 text-rose-100 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse'
              : 'bg-black/60 text-white border-white/20 hover:bg-white/15'
          } ${className}`}
        >
          {/* Cercle rouge clignotant ou fixe */}
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            {isRecording && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isRecording ? 'bg-rose-500' : 'bg-rose-500/90'
              }`}
            />
          </span>

          {/* Chronomètre ou Label */}
          {isRecording ? (
            <div className="flex items-center gap-1 text-[11px] font-black tracking-wider text-rose-300">
              <span>{formattedDuration}</span>
              <Square className="w-2.5 h-2.5 fill-rose-300 text-rose-300 ml-0.5" />
            </div>
          ) : (
            <span className="text-[10px] font-bold tracking-tight text-white/90">
              REC
            </span>
          )}
        </button>
      )}

      {/* ─── 2. VARIANTE CIRCLE (Icône compacte ronde) ────────────────────── */}
      {variant === 'circle' && (
        <button
          type="button"
          onClick={handleClick}
          title={isRecording ? `Arrêter l'enregistrement (${formattedDuration})` : 'Enregistrer le Live'}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 border backdrop-blur-xl ${
            isRecording
              ? 'bg-rose-950/90 text-rose-400 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse'
              : 'bg-black/60 text-white border-white/20 hover:bg-white/15'
          } ${className}`}
        >
          {isRecording ? (
            <div className="flex flex-col items-center">
              <Square className="w-3 h-3 fill-rose-500 text-rose-500" />
            </div>
          ) : (
            <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" />
          )}
        </button>
      )}

      {/* ─── 3. VARIANTE COMPACTE (Avec chrono intégré sur un badge) ───────── */}
      {variant === 'compact' && (
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer select-none active:scale-95 border backdrop-blur-xl ${
            isRecording
              ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
              : 'bg-black/50 text-white/90 border-white/15 hover:bg-black/70'
          } ${className}`}
        >
          <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white' : 'bg-rose-500'}`} />
          {isRecording ? <span>{formattedDuration}</span> : <span>REC</span>}
        </button>
      )}

      {/* Toast d'alerte / guidance local si pas de toast parent configuré */}
      {localToastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[90%] bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-white/20 animate-in fade-in slide-in-from-top-4 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="flex-1 leading-snug">{localToastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ScreenRecordButton;
