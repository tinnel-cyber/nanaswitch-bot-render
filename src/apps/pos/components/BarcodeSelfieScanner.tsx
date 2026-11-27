import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, CheckCircle, Zap, QrCode, ExternalLink, GripHorizontal, RotateCcw } from 'lucide-react';
import { playValidationBeep, playTapBeep } from '../../../utils/audio';

interface BarcodeSelfieScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
  onOpenBarcodeStudio?: () => void;
}

const SCANNER_CHANNEL = 'nana-barcode-scanner-channel';

export const BarcodeSelfieScanner: React.FC<BarcodeSelfieScannerProps> = ({
  isOpen,
  onClose,
  onDetected,
  onOpenBarcodeStudio,
}) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user'); // Default to Selfie camera as requested
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [flashActive, setFlashActive] = useState(false);

  // État décrochage / déplacement libre (Drag & Drop)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPoppedOut, setIsPoppedOut] = useState(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoutWindowRef = useRef<Window | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimestampRef = useRef<number>(0);
  const lastCodeRef = useRef<string>('');

  const containerId = 'nana-selfie-scanner-feed';

  const isPopoutMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('popout') === '1';

  useEffect(() => {
    if (!isOpen || isPoppedOut) {
      stopScanner();
      return;
    }

    startScanner(facingMode);

    return () => {
      stopScanner();
    };
  }, [isOpen, facingMode, isPoppedOut]);

  // Réception des codes scannés depuis une fenêtre décrochée (BroadcastChannel + postMessage)
  useEffect(() => {
    if (!isOpen || isPopoutMode || typeof window === 'undefined') return;

    let channel: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel(SCANNER_CHANNEL);
        channel.onmessage = (evt) => {
          if (evt.data?.type === 'NANA_BARCODE_SCANNED' && evt.data?.code) {
            playValidationBeep();
            setLastScannedCode(String(evt.data.code));
            setScanCount((prev) => prev + 1);
            onDetected(String(evt.data.code));
          }
        };
      }
    } catch {}

    const handleMsg = (evt: MessageEvent) => {
      if (evt.origin !== window.location.origin) return;
      if (evt.data?.type === 'NANA_BARCODE_SCANNED' && evt.data?.code) {
        playValidationBeep();
        setLastScannedCode(String(evt.data.code));
        setScanCount((prev) => prev + 1);
        onDetected(String(evt.data.code));
      }
    };
    window.addEventListener('message', handleMsg);

    return () => {
      try { channel?.close(); } catch {}
      window.removeEventListener('message', handleMsg);
    };
  }, [isOpen, isPopoutMode, onDetected]);

  // Gestion Drag & Drop fluide
  useEffect(() => {
    if (!isDragging) return;
    const handlePointerMove = (e: PointerEvent) => {
      const el = containerRef.current;
      const width = el?.offsetWidth || 384;
      const height = el?.offsetHeight || 340;
      const maxX = Math.max(8, window.innerWidth - width - 8);
      const maxY = Math.max(8, window.innerHeight - height - 8);
      const nextX = Math.min(maxX, Math.max(8, e.clientX - dragOffsetRef.current.dx));
      const nextY = Math.min(maxY, Math.max(8, e.clientY - dragOffsetRef.current.dy));
      setPosition({ x: nextX, y: nextY });
    };
    const handlePointerUp = () => setIsDragging(false);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  
  const handleSuccessfulScan = (decodedText: string) => {
    const now = Date.now();
    if (decodedText === lastCodeRef.current && now - lastScanTimestampRef.current < 2500) {
      return; // Prevent duplicate scans within 2.5s
    }

    lastScanTimestampRef.current = now;
    lastCodeRef.current = decodedText;

    playValidationBeep();
    setLastScannedCode(decodedText);
    setScanCount((prev) => prev + 1);
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 300);

    if (isPopoutMode && typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          const ch = new BroadcastChannel(SCANNER_CHANNEL);
          ch.postMessage({ type: 'NANA_BARCODE_SCANNED', code: decodedText });
          ch.close();
        }
      } catch {}
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'NANA_BARCODE_SCANNED', code: decodedText }, window.location.origin);
        }
      } catch {}
    }

    onDetected(decodedText);
  };

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (isPopoutMode) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffsetRef.current = {
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
    };
    if (!position) {
      setPosition({ x: rect.left, y: rect.top });
    }
    setIsDragging(true);
  };

  const handleDetachPopout = async () => {
    playTapBeep();
    if (isPoppedOut && popoutWindowRef.current && !popoutWindowRef.current.closed) {
      popoutWindowRef.current.close();
      popoutWindowRef.current = null;
      setIsPoppedOut(false);
      return;
    }

    await stopScanner();
    const popUrl = `${window.location.origin}/dashboard/scanner?popout=1`;
    const popup = window.open(
      popUrl,
      'nana_barcode_scanner_popout',
      'width=440,height=430,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
    );
    if (popup) {
      popoutWindowRef.current = popup;
      setIsPoppedOut(true);
      const timer = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(timer);
          popoutWindowRef.current = null;
          setIsPoppedOut(false);
        }
      }, 600);
    } else {
      // Repli si bloqueur de popup : détachement libre flottant au centre
      setPosition({
        x: Math.max(16, Math.round((window.innerWidth - 384) / 2)),
        y: Math.max(64, Math.round((window.innerHeight - 360) / 2)),
      });
      startScanner(facingMode);
    }
  };

  const handleOpenStudioClick = () => {
    playTapBeep();
    if (onOpenBarcodeStudio) {
      onOpenBarcodeStudio();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nana:open-barcode-studio'));
    }
  };

  const toggleCamera = () => {
    playTapBeep();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const startScanner = async (mode: 'user' | 'environment') => {
    try {
      setErrorMessage(null);
      setIsScanning(true);

      // Stop any existing instance
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {
          // ignore
        }
        html5QrCodeRef.current = null;
      }

      const formatsToSupport: Html5QrcodeSupportedFormats[] = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];

      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport,
        verbose: false,
      });
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 160 },
        aspectRatio: 1.333334,
      };

      await html5QrCode.start(
        { facingMode: mode },
        config,
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Frame without code: ignore
        }
      );
    } catch (err: any) {
      console.warn('[SELFIE SCANNER ERROR]', err);
      setErrorMessage(
        err?.message ||
          'Accès caméra refusé ou indisponible. Vérifiez les autorisations de votre navigateur.'
      );
      setIsScanning(false);
    }
  };

  
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner', err);
      }
      html5QrCodeRef.current = null;
    }
    // Force stop all tracks
    if (navigator.mediaDevices) {
       navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(stream => {
          stream.getTracks().forEach(t => t.stop());
       }).catch(() => {});
    }
    setIsScanning(false);
  };


  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      id="selfie-scanner-floating-overlay"
      style={
        isPopoutMode
          ? undefined
          : position
            ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto' }
            : undefined
      }
      className={
        isPopoutMode
          ? 'fixed inset-0 z-50 bg-slate-900 flex flex-col overflow-hidden'
          : `fixed z-50 w-[calc(100vw-24px)] sm:w-96 bg-slate-900/95 border-2 border-blue-500/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden ${
              position ? '' : 'inset-x-3 top-16 sm:right-6 sm:left-auto sm:top-20'
            } ${isDragging ? 'ring-4 ring-blue-400/50 select-none' : ''}`
      }
    >
      {/* Header Bar (Poignée de déplacement + Décrochage) */}
      <div
        onPointerDown={handleHeaderPointerDown}
        className={`flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-900/60 via-slate-900 to-indigo-950/90 border-b border-slate-700/80 ${
          isPopoutMode ? '' : 'cursor-grab active:cursor-grabbing select-none'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {!isPopoutMode && (
            <GripHorizontal className="w-4 h-4 text-slate-400 shrink-0" title="Glisser pour déplacer le lecteur" />
          )}
          <div className="relative shrink-0">
            <Camera className="w-4 h-4 text-blue-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white uppercase tracking-wider truncate">
                {facingMode === 'user' ? 'Caméra Selfie' : 'Caméra Arrière'}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-bold text-[9px] border border-emerald-400/40 shrink-0">
                DIRECT
              </span>
            </div>
            <p className="text-[10px] text-slate-300 truncate">
              {isPopoutMode ? 'Fenêtre indépendante synchronisée' : 'Glissez l\'en-tête ou décrochez'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Réinitialiser position si déplacé */}
          {!isPopoutMode && position && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setPosition(null);
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-all cursor-pointer"
              title="Recentrer le lecteur"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Décrocher / Rattacher en fenêtre indépendante */}
          {!isPopoutMode && (
            <button
              id="btn-detach-barcode-scanner"
              type="button"
              onClick={handleDetachPopout}
              className={`p-1.5 rounded-lg border active:scale-95 transition-all cursor-pointer ${
                isPoppedOut
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-slate-800 hover:bg-blue-600/80 text-blue-300 hover:text-white border-slate-700'
              }`}
              title={isPoppedOut ? 'Rattacher le lecteur ici' : 'Décrocher le lecteur en fenêtre indépendante'}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Toggle Selfie / Back camera */}
          <button
            id="btn-toggle-camera-facing"
            type="button"
            onClick={toggleCamera}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-all cursor-pointer"
            title="Basculer Caméra Selfie / Arrière"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Stop / Close Camera */}
          <button
            id="btn-close-selfie-scanner"
            type="button"
            onClick={() => {
              playTapBeep();
              if (popoutWindowRef.current && !popoutWindowRef.current.closed) {
                popoutWindowRef.current.close();
              }
              if (isPopoutMode) {
                window.close();
              } else {
                onClose();
              }
            }}
            className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-400/40 active:scale-95 transition-all cursor-pointer"
            title="Arrêter la caméra"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video Stream Container (ou état décroché) */}
      {isPoppedOut ? (
        <div className="p-6 bg-slate-950 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 flex items-center justify-center mx-auto">
            <ExternalLink className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-white">Lecteur décroché en fenêtre indépendante</p>
          <p className="text-[11px] text-slate-400">
            Tous les codes scannés dans la fenêtre détachée s'ajoutent automatiquement ici.
          </p>
          <button
            type="button"
            onClick={handleDetachPopout}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
          >
            Rattacher le lecteur ici
          </button>
        </div>
      ) : (
        <div className={`relative bg-black w-full ${isPopoutMode ? 'flex-1' : 'min-h-[190px]'} flex items-center justify-center overflow-hidden`}>
          <div id={containerId} className="w-full h-full" />

          {/* Reticle / Framing Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-3">
            <div
              className={`w-64 h-32 rounded-xl border-2 transition-all duration-200 relative flex items-center justify-center ${
                flashActive
                  ? 'border-emerald-400 bg-emerald-500/30 scale-105 ring-4 ring-emerald-400/60'
                  : 'border-blue-400/80 bg-black/10'
              }`}
            >
              {/* Corner Markers */}
              <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-blue-300" />
              <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-blue-300" />
              <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-blue-300" />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-blue-300" />

              {/* Scanning Laser Line */}
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-[pulse_1s_ease-in-out_infinite]" />

              <span className="text-[10px] font-bold text-blue-100 bg-black/70 px-2 py-0.5 rounded-full border border-blue-400/40">
                Alignez le Code-barres ou QR
              </span>
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="absolute inset-4 bg-slate-900/95 border border-rose-500/60 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2">
              <span className="text-xs font-bold text-rose-300">{errorMessage}</span>
              <button
                type="button"
                onClick={() => startScanner(facingMode)}
                className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs cursor-pointer"
              >
                Réessayer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer Status Bar + Bouton vers le Studio Création Code-Barres & QR */}
      <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 space-y-2 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            {lastScannedCode ? (
              <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold truncate">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Scanné: {lastScannedCode}</span>
              </div>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-blue-400 animate-pulse" />
                En attente d'un article...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-600/40 font-bold font-mono text-[10px]">
              {scanCount} scanné{scanCount > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (isPopoutMode) {
                  window.close();
                } else {
                  onClose();
                }
              }}
              className="px-2 py-0.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-600/50 font-bold text-[10px] cursor-pointer"
            >
              Arrêter
            </button>
          </div>
        </div>

        {/* Bouton d'ouverture du Studio de Création Code-Barres & QR */}
        {!isPopoutMode && (
          <button
            id="btn-open-barcode-studio"
            type="button"
            onClick={handleOpenStudioClick}
            className="w-full py-2 px-3 rounded-xl bg-[#1E3A8A] hover:bg-[#2563EB] text-white font-black text-xs flex items-center justify-center gap-2 border border-blue-400/40 shadow-md transition active:scale-[0.99] cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-blue-200" />
            <span>Studio Création Code-Barres & QR (1D / 2D)</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default BarcodeSelfieScanner;
