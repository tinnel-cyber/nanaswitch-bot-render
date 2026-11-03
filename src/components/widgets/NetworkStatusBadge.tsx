import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Wifi, WifiOff, CloudCheck, CloudOff, Info, RefreshCw } from 'lucide-react';
import { getPendingSyncQueue } from '../../services/offlineSyncService';

export const NetworkStatusBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  const checkPending = useCallback(() => {
    getPendingSyncQueue()
      .then((items) => setPendingCount(items.length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    checkPending();

    const handleOnline = () => {
      setIsOnline(true);
      checkPending();
    };
    const handleOffline = () => {
      setIsOnline(false);
      checkPending();
    };

    const handleQueueChange = () => {
      checkPending();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offlineQueueUpdated', handleQueueChange);
    window.addEventListener('nana_offline_sync_completed', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offlineQueueUpdated', handleQueueChange);
      window.removeEventListener('nana_offline_sync_completed', handleQueueChange);
    };
  }, [checkPending]);

  React.useEffect(() => {
    if (!showTooltip) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showTooltip]);

  return (
    <div ref={badgeRef} className="relative inline-flex items-center shrink-0">
      <button
        type="button"
        onClick={() => setShowTooltip((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold transition-all select-none border ${
          !isOnline
            ? 'bg-amber-950/90 text-amber-300 border-amber-500/50 hover:bg-amber-900/90 animate-pulse'
            : pendingCount > 0
            ? 'bg-blue-950/90 text-blue-300 border-blue-500/50 hover:bg-blue-900/90'
            : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/90'
        }`}
        title="État de la connexion et synchronisation Firestore / IndexedDB"
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            !isOnline
              ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
              : pendingCount > 0
              ? 'bg-blue-400 animate-spin shadow-[0_0_6px_rgba(96,165,250,0.8)]'
              : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
          }`}
        />
        {isOnline ? (
          pendingCount > 0 ? (
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
              <span>Synchro en cours ({pendingCount})</span>
            </span>
          ) : (
            <span className="hidden sm:flex items-center gap-1">
              <span>En ligne - Synchronisé</span>
            </span>
          )
        ) : (
          <span className="flex items-center gap-1">
            <span className="hidden sm:inline">
              Mode Hors-ligne {pendingCount > 0 ? `(${pendingCount} en attente)` : '- Ventes en local'}
            </span>
            <span className="sm:hidden text-[10px]">Hors-ligne {pendingCount > 0 ? `(${pendingCount})` : ''}</span>
          </span>
        )}
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-full mt-1.5 w-64 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 text-[11px] text-slate-200">
          <div className="flex items-center gap-1.5 font-bold mb-1 text-white">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Connexion Cloud Active</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300">Mode Caisse Hors-ligne</span>
              </>
            )}
          </div>
          <p className="text-slate-300 leading-relaxed">
            {isOnline
              ? 'Toutes les opérations (ventes, crédits, stocks) sont synchronisées en direct avec Cloud Firestore et votre sauvegarde sécurisée.'
              : 'La caisse fonctionne à 100% sans internet ! Vos ventes et opérations sont stockées dans le cache IndexedDB de l’appareil et seront envoyées au serveur dès le retour de la connexion.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default NetworkStatusBadge;
