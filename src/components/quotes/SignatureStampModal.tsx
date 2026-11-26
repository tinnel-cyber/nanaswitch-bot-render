import React, { useEffect, useRef, useState } from 'react';
import { PenTool, Stamp, Trash2, CheckCircle2, X, ShieldCheck } from 'lucide-react';

export interface SignatureStampResult {
  signatureDataUrl: string;
  stampDataUrl?: string;
}

interface SignatureStampModalProps {
  isOpen: boolean;
  mode: 'PROVIDER' | 'CLIENT';
  title?: string;
  defaultCompanyName?: string;
  defaultCity?: string;
  onClose: () => void;
  onConfirm: (result: SignatureStampResult) => void;
}

function buildOfficialStampDataUrl(params: {
  companyName: string;
  mention: string;
  city: string;
  shape: 'RECTANGULAR' | 'CIRCULAR';
  color: string;
}): string {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const color = params.color || '#dc2626';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const company = (params.companyName || 'NANASORE').toUpperCase().slice(0, 26);
  const mention = (params.mention || 'BON POUR ACCORD').toUpperCase().slice(0, 22);
  const city = (params.city || 'VÉRIFIÉ').toUpperCase().slice(0, 26);
  const dateStr = new Date().toLocaleDateString('fr-FR');

  if (params.shape === 'CIRCULAR') {
    const cx = 210;
    const cy = 120;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 102, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 92, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(company, cx, cy - 42);
    ctx.font = '900 18px sans-serif';
    ctx.fillText(mention, cx, cy);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(city, cx, cy + 32);
    ctx.font = '12px monospace';
    ctx.fillText(dateStr, cx, cy + 56);
  } else {
    ctx.lineWidth = 5;
    ctx.strokeRect(18, 22, 384, 196);
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 30, 368, 180);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(company, 210, 62);
    ctx.fillRect(46, 80, 328, 2);
    ctx.font = '900 22px sans-serif';
    ctx.fillText(mention, 210, 118);
    ctx.fillRect(46, 152, 328, 2);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${city} • ${dateStr}`, 210, 182);
  }

  return canvas.toDataURL('image/png');
}

export const SignatureStampModal: React.FC<SignatureStampModalProps> = ({
  isOpen,
  mode,
  title,
  defaultCompanyName = 'Mon Entreprise',
  defaultCity = 'Abidjan',
  onClose,
  onConfirm,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(mode === 'PROVIDER');

  // Config Tampon (Prestataire uniquement)
  const [includeStamp, setIncludeStamp] = useState(true);
  const [companyName, setCompanyName] = useState(defaultCompanyName);
  const [mention, setMention] = useState('BON POUR ACCORD');
  const [city, setCity] = useState(defaultCity);
  const [shape, setShape] = useState<'RECTANGULAR' | 'CIRCULAR'>('RECTANGULAR');
  const [stampColor, setStampColor] = useState('#dc2626');
  const [stampPreview, setStampPreview] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setHasDrawn(false);
    setAcceptedTerms(mode === 'PROVIDER');
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (isOpen && mode === 'PROVIDER' && includeStamp) {
      setStampPreview(
        buildOfficialStampDataUrl({ companyName, mention, city, shape, color: stampColor })
      );
    }
  }, [isOpen, mode, includeStamp, companyName, mention, city, shape, stampColor]);

  if (!isOpen) return null;

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getPoint(e);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    setHasDrawn(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSubmit = () => {
    if (!hasDrawn || !canvasRef.current) return;
    if (mode === 'CLIENT' && !acceptedTerms) return;
    const signatureDataUrl = canvasRef.current.toDataURL('image/png');
    const stampDataUrl =
      mode === 'PROVIDER' && includeStamp
        ? buildOfficialStampDataUrl({ companyName, mention, city, shape, color: stampColor })
        : undefined;
    onConfirm({ signatureDataUrl, stampDataUrl });
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
              {mode === 'PROVIDER' ? <Stamp className="w-5 h-5" /> : <PenTool className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-black">
                {title || (mode === 'PROVIDER' ? 'Tamponner & Signer le Devis' : 'Signature en ligne requise')}
              </h3>
              <p className="text-[11px] text-slate-300">
                {mode === 'PROVIDER'
                  ? 'Apposez votre cachet officiel et votre signature avant envoi au commandeur'
                  : 'Signez pour valider le contrat et télécharger votre exemplaire PDF'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Zone de signature manuscrite */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-blue-600" />
                <span>Signature manuscrite (souris ou doigt)</span>
              </label>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Effacer</span>
              </button>
            </div>
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                width={460}
                height={150}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="w-full h-36 cursor-crosshair block"
              />
            </div>
          </div>

          {/* Options Tampon Commercial (Prestataire) */}
          {mode === 'PROVIDER' && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Stamp className="w-4 h-4 text-rose-600" />
                  Apposer mon tampon officiel
                </span>
                <input
                  type="checkbox"
                  checked={includeStamp}
                  onChange={(e) => setIncludeStamp(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 cursor-pointer"
                />
              </div>

              {includeStamp && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Nom de l'entreprise"
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white outline-none"
                    />
                    <input
                      type="text"
                      value={mention}
                      onChange={(e) => setMention(e.target.value)}
                      placeholder="Mention (ex: BON POUR ACCORD)"
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white outline-none"
                    />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ville / Contact"
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white outline-none"
                    />
                    <div className="flex items-center gap-1.5">
                      <select
                        value={shape}
                        onChange={(e) => setShape(e.target.value as any)}
                        className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white outline-none"
                      >
                        <option value="RECTANGULAR">Rectangulaire</option>
                        <option value="CIRCULAR">Circulaire</option>
                      </select>
                      <input
                        type="color"
                        value={stampColor}
                        onChange={(e) => setStampColor(e.target.value)}
                        className="w-8 h-7 rounded border border-slate-300 cursor-pointer"
                      />
                    </div>
                  </div>
                  {stampPreview && (
                    <div className="flex justify-center bg-white rounded-xl border border-slate-200 p-2">
                      <img src={stampPreview} alt="Aperçu tampon" className="h-20 object-contain" />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Acceptation Commandeur */}
          {mode === 'CLIENT' && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-600"
              />
              <span className="text-xs font-semibold text-emerald-950">
                Lu et approuvé — Je valide ce devis/contrat. Une copie signée sera archivée automatiquement comme preuve officielle.
              </span>
            </label>
          )}
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!hasDrawn || (mode === 'CLIENT' && !acceptedTerms)}
            onClick={handleSubmit}
            className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{mode === 'PROVIDER' ? 'Tamponner, Signer & Générer PDF' : 'Signer & Télécharger PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignatureStampModal;
