import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Download,
  Printer,
  Copy,
  Check,
  Share2,
  Sparkles,
  QrCode as QrCodeIcon,
  Store,
  ExternalLink,
  ShieldCheck,
  Zap,
  Smartphone,
  Tag,
  ShoppingBag,
  CreditCard
} from 'lucide-react';
import { PhysicalFunnelConfig } from '../../../../types/physicalFunnel';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface MagicQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  funnel: PhysicalFunnelConfig;
}

export const MagicQrCodeModal: React.FC<MagicQrCodeModalProps> = ({
  isOpen,
  onClose,
  funnel
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'poster' | 'badge' | 'stickers'>('poster');
  const [posterTitle, setPosterTitle] = useState(funnel.title || 'Offre Spéciale En Boutique');
  const [includePricing, setIncludePricing] = useState(true);
  const [customCallToAction, setCustomCallToAction] = useState('Scannez pour commander en 1-Clic');
  const printAreaRef = useRef<HTMLDivElement>(null);

  const heroBlock = funnel.blocks.find(b =>
    b.type === 'HERO_PRODUCT' ||
    b.type === 'HERO_SPLIT_LUXURY' ||
    b.type === 'HERO_VSL_VIDEO' ||
    b.type === 'HERO_FLASH_CARD'
  );
  const heroProps = heroBlock?.props || {};
  const price = heroProps.price || funnel.ogMetadata?.priceAmount || 25000;
  const originalPrice = heroProps.originalPrice || Math.round(price * 1.35);
  const brandColor = funnel.brandColor || '#10b981';

  // URL souveraine dédiée au scan client qui déclenche directement le funnel avec tiroir dépliable
  const magicScanUrl = `https://nsore.shop/c/${funnel.slug || 'offre-exclusive'}?drawer=true&source=physical_pos_qr`;

  // Génération du QR Code HD 1024x1024
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    QRCode.toDataURL(magicScanUrl, {
      width: 1024,
      margin: 2,
      color: {
        dark: '#020617', // Encre foncée pour contraste d'impression parfait
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H' // High error correction pour autoriser un logo ou un pli sans perte
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.warn('[MagicQRCode] Erreur génération QR Code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, magicScanUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    playTapBeep();
    navigator.clipboard.writeText(magicScanUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadPNG = () => {
    playValidationBeep();
    const link = document.createElement('a');
    link.download = `QR-Magique-${funnel.slug || 'funnel'}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    playValidationBeep();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* 1. Header du Modal */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: `${brandColor}20`, borderColor: `${brandColor}40`, color: brandColor }}
              className="p-2.5 rounded-2xl border flex items-center justify-center shadow-sm"
            >
              <QrCodeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  QR Code Magique & Affiche Boutique Physique
                </h3>
                <span
                  style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
                  className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider hidden sm:inline"
                >
                  Caisse Connectée
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Chaque scan fait surgir directement le tunnel dépliable avec commande 1-clic connectée à votre caisse.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { playTapBeep(); onClose(); }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Onglets de sélection du format d'affichage */}
        <div className="px-5 py-2.5 bg-slate-900/50 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('poster')}
              style={{
                backgroundColor: activeTab === 'poster' ? brandColor : undefined,
                color: activeTab === 'poster' ? '#ffffff' : undefined
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'poster' ? 'shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Affiche A4 / A5 Vitrine</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('badge')}
              style={{
                backgroundColor: activeTab === 'badge' ? brandColor : undefined,
                color: activeTab === 'badge' ? '#ffffff' : undefined
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'badge' ? 'shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Chevalet Comptoir Caisse</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stickers')}
              style={{
                backgroundColor: activeTab === 'stickers' ? brandColor : undefined,
                color: activeTab === 'stickers' ? '#ffffff' : undefined
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'stickers' ? 'shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Étiquette / Autocollant</span>
            </button>
          </div>

          {/* Boutons d'export rapide */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Lien copié !' : 'Copier le lien'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPNG}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG HD</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{ backgroundColor: brandColor }}
              className="px-4 py-1.5 rounded-xl text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-110 active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer l'Affiche</span>
            </button>
          </div>
        </div>

        {/* 3. Corps & Prévisualisation de l'Affiche */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Panneau de Personnalisation (Gauche) */}
          <div className="lg:col-span-4 space-y-4 text-xs font-medium">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles style={{ color: brandColor }} className="w-3.5 h-3.5" />
                <span>Paramètres d'Affichage Magique</span>
              </h4>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px] font-bold">Titre de l'Affiche</label>
                <input
                  type="text"
                  value={posterTitle}
                  onChange={(e) => setPosterTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px] font-bold">Message d'Appel au Scan</label>
                <input
                  type="text"
                  value={customCallToAction}
                  onChange={(e) => setCustomCallToAction(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={includePricing}
                  onChange={(e) => setIncludePricing(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                />
                <span className="text-slate-300 font-bold">Afficher le tarif promo sur l'affiche</span>
              </label>
            </div>

            {/* Infos techniques d'assurance */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
              <div className="flex items-center gap-1.5 font-black text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Interconnexion Caisse Physique</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Toutes les commandes passées via ce QR code sont automatiquement injectées dans votre tableau de bord caisse physique, décrémentent le stock en direct et alertent le caissier en temps réel.
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <span>URL cible :</span>
                <span className="text-emerald-400 truncate max-w-[190px]">{magicScanUrl}</span>
              </div>
            </div>
          </div>

          {/* Rendu Visuel Print-Ready (Droite) */}
          <div className="lg:col-span-8 flex justify-center">
            <div
              ref={printAreaRef}
              id="magic-qr-print-area"
              className={`w-full max-w-md bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border-4 transition-all ${
                activeTab === 'badge' ? 'border-amber-500' : 'border-slate-900'
              }`}
              style={{
                borderColor: brandColor
              }}
            >
              {/* En-tête Affiche */}
              <div className="text-center space-y-2 pb-4 border-b border-slate-200">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-[11px] font-black uppercase tracking-wider">
                  <Store className="w-3.5 h-3.5 text-slate-700" />
                  <span>BOUTIQUE CONNECTÉE • SCAN & GO</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
                  {posterTitle}
                </h2>

                <p className="text-xs text-slate-600 font-medium">
                  {customCallToAction}
                </p>
              </div>

              {/* Cadre Central du QR Code HD */}
              <div className="py-6 flex flex-col items-center justify-center">
                <div
                  style={{ borderColor: brandColor }}
                  className="p-3 bg-white rounded-3xl border-2 shadow-xl relative group flex flex-col items-center"
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code Magique pour ${funnel.title}`}
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-2xl"
                    />
                  ) : (
                    <div className="w-56 h-56 bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 text-xs">
                      Génération du QR Code...
                    </div>
                  )}

                  {/* Logo / Badge central au cœur du QR Code */}
                  <div
                    style={{ backgroundColor: brandColor }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-2xl text-white shadow-lg border-2 border-white flex items-center justify-center pointer-events-none"
                  >
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                </div>

                {/* Indication visuelle Smartphone */}
                <div className="flex items-center gap-2 mt-4 text-xs font-black text-slate-800">
                  <Smartphone className="w-4 h-4 text-slate-900" />
                  <span>Pointez votre appareil photo ou WhatsApp</span>
                </div>
              </div>

              {/* Prix & Moyens de Paiement Caisse */}
              {includePricing && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Tarif Exclusif Scan</span>
                    <span className="text-lg sm:text-xl font-black text-slate-950">
                      {formatCFA(price)}
                    </span>
                  </div>
                  {originalPrice > price && (
                    <div className="text-right">
                      <span className="text-xs text-slate-400 line-through block font-bold">
                        {formatCFA(originalPrice)}
                      </span>
                      <span
                        style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
                        className="text-[10px] font-black px-2 py-0.5 rounded-full"
                      >
                        Économie Immédiate
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Pied d'Affiche avec Badges Paiement */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-700" />
                  <span>Wave • Orange • Moov • MTN • Caisse</span>
                </div>
                <div className="text-right font-mono text-[10px] text-slate-400">
                  nsore.shop/c/{funnel.slug}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Footer */}
        <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Format vectoriel 100% prêt à l'impression haute définition</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default MagicQrCodeModal;
