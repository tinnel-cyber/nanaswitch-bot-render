import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Loader2, AlertCircle, QrCode } from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../utils/audio';

export interface QuickQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetectedUrlOrSlug: (decodedText: string) => void;
}

export const QuickQrScannerModal: React.FC<QuickQrScannerModalProps> = ({
  isOpen,
  onClose,
  onDetectedUrlOrSlug
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const containerId = 'nana-quick-qr-scanner-view';

  useEffect(() => {
    if (!isOpen) return;
    handledRef.current = false;
    setStatus('starting');
    setErrorMsg('');

    let cancelled = false;

    const startCamera = async () => {
      try {
        await new Promise((r) => setTimeout(r, 120));
        if (cancelled) return;
        const el = document.getElementById(containerId);
        if (!el) return;

        const qr = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false
        });
        scannerRef.current = qr;

        await qr.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 230, height: 230 }, aspectRatio: 1.0 },
          (decodedText) => {
            if (handledRef.current) return;
            handledRef.current = true;
            playValidationBeep();
            qr.stop().catch(() => {});
            onDetectedUrlOrSlug(decodedText);
          },
          () => {}
        );
        if (!cancelled) {
          setStatus('scanning');
        }
      } catch (err: any) {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(
            err?.message?.includes('Permission')
              ? "Autorisez l'accès à la caméra dans votre navigateur pour scanner un autre article."
              : 'Impossible d’ouvrir la caméra sur cet appareil.'
          );
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen, onDetectedUrlOrSlug]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => {
        playTapBeep();
        onClose();
      }}
    >
      <div
        className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white">Scanner un autre article</h3>
              <p className="text-[10px] text-slate-400">Ouverture instantanée sans quitter la page</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-square border border-slate-800 flex items-center justify-center">
            <div id={containerId} className="w-full h-full" />
            {status === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 text-xs text-slate-300">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                <span>Activation de la caméra...</span>
              </div>
            )}
            {status === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 text-center bg-slate-950/95">
                <AlertCircle className="w-7 h-7 text-rose-400" />
                <p className="text-xs text-slate-300 leading-relaxed">{errorMsg}</p>
              </div>
            )}
          </div>

          <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pointez simplement un QR code en rayon : le produit s&apos;ouvrira tout seul.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickQrScannerModal;
