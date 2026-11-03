import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, CheckCircle, Zap, ShieldCheck } from 'lucide-react';
import { playValidationBeep, playTapBeep } from '../../../utils/audio';

interface BarcodeSelfieScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

export const BarcodeSelfieScanner: React.FC<BarcodeSelfieScannerProps> = ({
  isOpen,
  onClose,
  onDetected,
}) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user'); // Default to Selfie camera as requested
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [flashActive, setFlashActive] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimestampRef = useRef<number>(0);
  const lastCodeRef = useRef<string>('');

  const containerId = 'nana-selfie-scanner-feed';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    startScanner(facingMode);

    return () => {
      stopScanner();
    };
  }, [isOpen, facingMode]);

  
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

    onDetected(decodedText);
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
      id="selfie-scanner-floating-overlay"
      className="fixed inset-x-3 top-16 z-50 sm:right-6 sm:left-auto sm:top-20 sm:w-96 bg-slate-900/95 border-2 border-amber-400/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-amber-500/20 via-slate-900 to-indigo-950/80 border-b border-slate-700/80">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Camera className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                {facingMode === 'user' ? 'Caméra Selfie Continue' : 'Caméra Arrière Continue'}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-bold text-[9px] border border-emerald-400/40">
                DIRECT
              </span>
            </div>
            <p className="text-[10px] text-slate-300">
              Scan rapide sans interruption • Présentez l'article
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
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
              onClose();
            }}
            className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-400/40 active:scale-95 transition-all cursor-pointer"
            title="Arrêter la caméra"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video Stream Container */}
      <div className="relative bg-black w-full min-h-[190px] flex items-center justify-center overflow-hidden">
        <div id={containerId} className="w-full h-full" />

        {/* Reticle / Framing Overlay */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-3">
          <div
            className={`w-64 h-32 rounded-xl border-2 transition-all duration-200 relative flex items-center justify-center ${
              flashActive
                ? 'border-emerald-400 bg-emerald-500/30 scale-105 ring-4 ring-emerald-400/60'
                : 'border-amber-400/80 bg-black/10'
            }`}
          >
            {/* Corner Markers */}
            <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-amber-300" />
            <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-amber-300" />
            <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-amber-300" />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-amber-300" />

            {/* Scanning Laser Line */}
            <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-[pulse_1s_ease-in-out_infinite]" />

            <span className="text-[10px] font-bold text-amber-200 bg-black/70 px-2 py-0.5 rounded-full border border-amber-400/40">
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
              className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>

      {/* Footer Status Bar: Continuous feedback */}
      <div className="px-3 py-2 bg-slate-950 flex items-center justify-between border-t border-slate-800 text-[11px]">
        <div className="flex items-center gap-1.5 truncate">
          {lastScannedCode ? (
            <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold truncate">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Scanné: {lastScannedCode}</span>
            </div>
          ) : (
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
              En attente d'un article...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-600/40 font-bold font-mono text-[10px]">
            {scanCount} article{scanCount > 1 ? 's' : ''} scanné{scanCount > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="px-2 py-0.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-600/50 font-bold text-[10px] cursor-pointer"
          >
            Arrêter
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeSelfieScanner;
