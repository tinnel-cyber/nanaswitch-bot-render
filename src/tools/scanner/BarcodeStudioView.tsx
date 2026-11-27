import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import bwipjs from 'bwip-js';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import {
  ArrowLeft,
  QrCode,
  Barcode,
  Download,
  Printer,
  ImagePlus,
  Trash2,
  Package,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  FileText,
  Grid3X3,
  Sliders,
  Wifi,
  User,
  Link2,
  Type,
  Scissors,
  RefreshCw,
} from 'lucide-react';
import { InventoryProduct } from '../../types';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';

export interface BarcodeStudioViewProps {
  onBack?: () => void;
  inventory?: InventoryProduct[];
  storeName?: string;
}

type CodeDimension = '1D' | '2D';
type SymbologyId =
  | 'code128'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'upce'
  | 'code39'
  | 'code93'
  | 'itf14'
  | 'rationalizedCodabar'
  | 'msi'
  | 'qrcode'
  | 'datamatrix'
  | 'pdf417'
  | 'azteccode';

type QrTemplateType = 'text' | 'url' | 'wifi' | 'vcard';
type SheetFormatId = 'single' | 'thermal_50x30' | 'thermal_80' | 'a4_24' | 'a4_40' | 'a4_65';

interface SymbologyOption {
  id: SymbologyId;
  label: string;
  dimension: CodeDimension;
  hint: string;
  defaultSample: string;
}

const SYMBOLOGIES: SymbologyOption[] = [
  // 1D
  { id: 'code128', label: 'Code 128', dimension: '1D', hint: 'Universel alphanumérique (SKU, stock, logistique)', defaultSample: 'NANA-2026-001' },
  { id: 'ean13', label: 'EAN-13', dimension: '1D', hint: 'Standard commerce 12 ou 13 chiffres', defaultSample: '618000123456' },
  { id: 'ean8', label: 'EAN-8', dimension: '1D', hint: 'Petits emballages (7 ou 8 chiffres)', defaultSample: '6181234' },
  { id: 'upca', label: 'UPC-A', dimension: '1D', hint: 'Retail international 11 ou 12 chiffres', defaultSample: '01234567890' },
  { id: 'upce', label: 'UPC-E', dimension: '1D', hint: 'Format compact 6 à 8 chiffres', defaultSample: '0123456' },
  { id: 'code39', label: 'Code 39', dimension: '1D', hint: 'Industriel (A-Z, 0-9, - . $ / + %)', defaultSample: 'SKU-PRO-88' },
  { id: 'code93', label: 'Code 93', dimension: '1D', hint: 'Haute densité alphanumérique', defaultSample: 'NANA93POS' },
  { id: 'itf14', label: 'ITF-14', dimension: '1D', hint: 'Cartons & palettes (13 ou 14 chiffres)', defaultSample: '1061800012345' },
  { id: 'rationalizedCodabar', label: 'Codabar', dimension: '1D', hint: 'Bibliothèques, santé, expéditions (chiffres)', defaultSample: 'A1234567B' },
  { id: 'msi', label: 'MSI Plessey', dimension: '1D', hint: 'Rayonnages & inventaires (chiffres)', defaultSample: '90012345' },
  // 2D
  { id: 'qrcode', label: 'QR Code', dimension: '2D', hint: 'URL, paiement, Wi-Fi, vCard, texte + logo central', defaultSample: 'https://nanasore.com' },
  { id: 'datamatrix', label: 'Data Matrix', dimension: '2D', hint: 'Micro-étiquettes, pharmacie, électronique', defaultSample: 'DM-NANA-2026-X1' },
  { id: 'pdf417', label: 'PDF417', dimension: '2D', hint: 'Documents officiels, reçus, transport', defaultSample: 'NANASORE-POS-DOC-2026' },
  { id: 'azteccode', label: 'Aztec Code', dimension: '2D', hint: 'Billets, événements, cartes d\'accès', defaultSample: 'TICKET-NANA-VIP-001' },
];

const SHEET_FORMATS: { id: SheetFormatId; label: string; cols: number; defaultCount: number; desc: string }[] = [
  { id: 'single', label: 'Étiquette Unique', cols: 1, defaultCount: 1, desc: 'Aperçu & export grand format' },
  { id: 'thermal_50x30', label: 'Rouleau 50×30 mm', cols: 2, defaultCount: 6, desc: 'Étiqueteuse thermique code-barres' },
  { id: 'thermal_80', label: 'Thermique 80 mm', cols: 1, defaultCount: 4, desc: 'Imprimante ticket caisse 80 mm' },
  { id: 'a4_24', label: 'Planche A4 (24 étiq.)', cols: 3, defaultCount: 24, desc: 'Grille 3 × 8 autocollants A4' },
  { id: 'a4_40', label: 'Planche A4 (40 étiq.)', cols: 4, defaultCount: 40, desc: 'Grille 4 × 10 autocollants A4' },
  { id: 'a4_65', label: 'Planche A4 (65 étiq.)', cols: 5, defaultCount: 65, desc: 'Grille 5 × 13 mini-étiquettes A4' },
];

export const BarcodeStudioView: React.FC<BarcodeStudioViewProps> = ({
  onBack,
  inventory = [],
  storeName = 'Nanasore',
}) => {
  // Format & Données
  const [dimensionFilter, setDimensionFilter] = useState<'ALL' | '1D' | '2D'>('ALL');
  const [symbology, setSymbology] = useState<SymbologyId>('code128');
  const [rawValue, setRawValue] = useState<string>('NANA-2026-001');
  const [qrTemplate, setQrTemplate] = useState<QrTemplateType>('text');
  const [qrEcc, setQrEcc] = useState<'L' | 'M' | 'Q' | 'H'>('H');

  // Champs structurés QR
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [wifiSec, setWifiSec] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [vcardName, setVcardName] = useState('');
  const [vcardPhone, setVcardPhone] = useState('');
  const [vcardEmail, setVcardEmail] = useState('');
  const [vcardOrg, setVcardOrg] = useState(storeName);

  // Personnalisation Étiquette & Image utilisateur
  const [labelTitle, setLabelTitle] = useState<string>('');
  const [labelPrice, setLabelPrice] = useState<string>('');
  const [showHumanText, setShowHumanText] = useState<boolean>(true);
  const [fgColor, setFgColor] = useState<string>('#0F172A');
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');
  const [transparentBg, setTransparentBg] = useState<boolean>(false);
  const [scaleFactor, setScaleFactor] = useState<number>(3);
  const [barHeightMm, setBarHeightMm] = useState<number>(14);

  // Logo / Image importée par l'utilisateur
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [embedLogoInQr, setEmbedLogoInQr] = useState<boolean>(true);
  const [showImageOnSticker, setShowImageOnSticker] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Impression & Planche Autocollants
  const [rightMode, setRightMode] = useState<'PREVIEW' | 'STICKERS'>('PREVIEW');
  const [sheetFormat, setSheetFormat] = useState<SheetFormatId>('a4_24');
  const [stickerCopies, setStickerCopies] = useState<number>(24);
  const [showCutLines, setShowCutLines] = useState<boolean>(true);

  // État rendu
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const currentSymInfo = useMemo(
    () => SYMBOLOGIES.find((s) => s.id === symbology) || SYMBOLOGIES[0],
    [symbology]
  );

  // Calcul de la valeur encodée finale
  const effectivePayload = useMemo(() => {
    if (symbology === 'qrcode') {
      if (qrTemplate === 'wifi') {
        const ssid = wifiSsid.trim() || 'MonWiFi';
        return `WIFI:T:${wifiSec};S:${ssid};P:${wifiPass};;`;
      }
      if (qrTemplate === 'vcard') {
        const name = vcardName.trim() || storeName;
        return [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${name}`,
          vcardOrg.trim() ? `ORG:${vcardOrg.trim()}` : '',
          vcardPhone.trim() ? `TEL:${vcardPhone.trim()}` : '',
          vcardEmail.trim() ? `EMAIL:${vcardEmail.trim()}` : '',
          'END:VCARD',
        ]
          .filter(Boolean)
          .join('\n');
      }
    }
    return rawValue.trim() || currentSymInfo.defaultSample;
  }, [symbology, qrTemplate, wifiSsid, wifiPass, wifiSec, vcardName, vcardOrg, vcardPhone, vcardEmail, rawValue, currentSymInfo.defaultSample, storeName]);

  // Pré-remplissage depuis un produit de l'inventaire
  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = inventory.find((p) => p.id === prodId);
    if (!prod) return;
    playTapBeep();
    const codeVal = (prod.barcode || prod.sku || prod.id || '').trim();
    if (codeVal) setRawValue(codeVal);
    setLabelTitle(prod.name || '');
    if (typeof prod.sellingPrice === 'number' && prod.sellingPrice > 0) {
      setLabelPrice(formatCFA(prod.sellingPrice));
    }
    if (prod.photoUrl || prod.imageUrl) {
      setUploadedImageUrl(prod.photoUrl || prod.imageUrl || null);
    }
  };

  // Upload image utilisateur
  const handleImageUpload = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setRenderError('Veuillez sélectionner un fichier image valide (PNG, JPG, SVG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedImageUrl(reader.result);
        playValidationBeep();
      }
    };
    reader.readAsDataURL(file);
  };

  // Génération temps réel Canvas (PNG/JPEG) + SVG vectoriel
  const generateCodeAssets = useCallback(async () => {
    setRenderError(null);
    const cleanFg = fgColor.replace('#', '');
    const cleanBg = bgColor.replace('#', '');

    try {
      if (symbology === 'qrcode') {
        const ecc = uploadedImageUrl && embedLogoInQr ? 'H' : qrEcc;
        const sizePx = 320 * Math.max(1, Math.min(2, scaleFactor / 2));

        // 1. Canvas QR haute résolution
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, effectivePayload, {
          width: sizePx,
          margin: 2,
          errorCorrectionLevel: ecc,
          color: {
            dark: fgColor,
            light: transparentBg ? '#00000000' : bgColor,
          },
        });

        // Incrustation logo au centre du QR Code si demandé
        if (uploadedImageUrl && embedLogoInQr) {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                const logoSize = Math.round(canvas.width * 0.24);
                const x = Math.round((canvas.width - logoSize) / 2);
                const y = Math.round((canvas.height - logoSize) / 2);
                const pad = Math.round(logoSize * 0.14);

                ctx.save();
                ctx.fillStyle = transparentBg ? '#FFFFFF' : bgColor;
                ctx.beginPath();
                ctx.roundRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2, 12);
                ctx.fill();
                ctx.drawImage(img, x, y, logoSize, logoSize);
                ctx.restore();
              }
              resolve();
            };
            img.onerror = () => resolve();
            img.src = uploadedImageUrl;
          });
        }

        setPreviewDataUrl(canvas.toDataURL('image/png'));

        // 2. SVG vectoriel pur
        let svgStr = await QRCode.toString(effectivePayload, {
          type: 'svg',
          margin: 2,
          errorCorrectionLevel: ecc,
          color: {
            dark: fgColor,
            light: transparentBg ? '#00000000' : bgColor,
          },
        });
        if (uploadedImageUrl && embedLogoInQr && svgStr.includes('</svg>')) {
          const vbMatch = svgStr.match(/viewBox="0 0 (\d+) (\d+)"/);
          const vbW = vbMatch ? Number(vbMatch[1]) : 41;
          const logoVb = vbW * 0.24;
          const posVb = (vbW - logoVb) / 2;
          const padVb = logoVb * 0.12;
          const overlay = `<rect x="${posVb - padVb}" y="${posVb - padVb}" width="${logoVb + padVb * 2}" height="${logoVb + padVb * 2}" rx="2" fill="${transparentBg ? '#FFFFFF' : bgColor}" /><image href="${uploadedImageUrl}" x="${posVb}" y="${posVb}" width="${logoVb}" height="${logoVb}" preserveAspectRatio="xMidYMid meet" />`;
          svgStr = svgStr.replace('</svg>', `${overlay}</svg>`);
        }
        setSvgMarkup(svgStr);
      } else {
        // 1D & autres 2D via bwip-js
        const canvas = document.createElement('canvas');
        const opts: any = {
          bcid: symbology,
          text: effectivePayload,
          scale: Math.max(2, scaleFactor),
          includetext: showHumanText,
          textxalign: 'center',
          barcolor: cleanFg,
          textcolor: cleanFg,
          paddingwidth: 8,
          paddingheight: 6,
        };
        if (!transparentBg) {
          opts.backgroundcolor = cleanBg;
        }
        if (currentSymInfo.dimension === '1D') {
          opts.height = Math.max(8, barHeightMm);
        }

        bwipjs.toCanvas(canvas, opts);
        setPreviewDataUrl(canvas.toDataURL('image/png'));

        const svgOut = bwipjs.toSVG(opts);
        setSvgMarkup(svgOut);
      }
    } catch (err: any) {
      setRenderError(
        err?.message ||
          `Données incompatibles avec le format ${currentSymInfo.label}. Vérifiez la longueur ou les caractères autorisés.`
      );
    }
  }, [
    symbology,
    effectivePayload,
    fgColor,
    bgColor,
    transparentBg,
    scaleFactor,
    barHeightMm,
    showHumanText,
    qrEcc,
    uploadedImageUrl,
    embedLogoInQr,
    currentSymInfo.dimension,
    currentSymInfo.label,
  ]);

  useEffect(() => {
    const t = setTimeout(() => {
      generateCodeAssets();
    }, 80);
    return () => clearTimeout(t);
  }, [generateCodeAssets]);

  // Création d'un Canvas étiquette complet (Titre + Logo + Code + Prix) pour export PNG / JPEG haute qualité
  const buildStickerCanvas = async (forceSolidBg: boolean): Promise<HTMLCanvasElement | null> => {
    if (!previewDataUrl) return null;
    const codeImg = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = previewDataUrl;
    });
    if (!codeImg) return null;

    const hasHeader = Boolean(labelTitle.trim() || (uploadedImageUrl && showImageOnSticker && (!embedLogoInQr || symbology !== 'qrcode')));
    const hasFooter = Boolean(labelPrice.trim());

    const padding = 36;
    const headerH = hasHeader ? 68 : 0;
    const footerH = hasFooter ? 52 : 0;
    const targetCodeW = Math.max(codeImg.width, 360);
    const targetCodeH = Math.round((codeImg.height / codeImg.width) * targetCodeW);

    const canvas = document.createElement('canvas');
    canvas.width = targetCodeW + padding * 2;
    canvas.height = targetCodeH + padding * 2 + headerH + footerH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (forceSolidBg || !transparentBg) {
      ctx.fillStyle = transparentBg ? '#FFFFFF' : bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    let curY = padding;
    if (hasHeader) {
      let textX = padding;
      if (uploadedImageUrl && showImageOnSticker && (!embedLogoInQr || symbology !== 'qrcode')) {
        const logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
          const im = new Image();
          im.crossOrigin = 'anonymous';
          im.onload = () => resolve(im);
          im.onerror = () => resolve(null);
          im.src = uploadedImageUrl;
        });
        if (logoImg) {
          ctx.drawImage(logoImg, padding, curY, 48, 48);
          textX += 60;
        }
      }
      if (labelTitle.trim()) {
        ctx.fillStyle = fgColor;
        ctx.font = 'bold 22px Inter, system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelTitle.trim().slice(0, 34), textX, curY + 24);
      }
      curY += headerH;
    }

    ctx.drawImage(codeImg, padding, curY, targetCodeW, targetCodeH);
    curY += targetCodeH;

    if (hasFooter) {
      ctx.fillStyle = '#1E3A8A';
      ctx.font = '900 26px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labelPrice.trim(), canvas.width / 2, curY + 34);
    }

    return canvas;
  };

  const handleDownload = async (format: 'png' | 'jpeg' | 'svg') => {
    playTapBeep();
    const safeName = (labelTitle || effectivePayload || 'code')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .slice(0, 32);

    if (format === 'svg') {
      if (!svgMarkup) return;
      const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}-${symbology}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      playValidationBeep();
      return;
    }

    const canvas = await buildStickerCanvas(format === 'jpeg');
    if (!canvas) return;
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mime, 0.96);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${safeName}-${symbology}.${format === 'jpeg' ? 'jpg' : 'png'}`;
    a.click();
    playValidationBeep();
  };

  const handleExportPdfStickers = async () => {
    if (!previewDataUrl) return;
    playTapBeep();
    const isThermal = sheetFormat === 'thermal_50x30' || sheetFormat === 'thermal_80';
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: isThermal ? [80, 140] : 'a4',
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const formatMeta = SHEET_FORMATS.find((f) => f.id === sheetFormat) || SHEET_FORMATS[3];
    const cols = formatMeta.cols;
    const margin = isThermal ? 4 : 10;
    const gap = isThermal ? 2 : 3;
    const cellW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
    const cellH = currentSymInfo.dimension === '2D' ? cellW * 1.05 : Math.max(26, cellW * 0.56);

    const stickerCanvas = await buildStickerCanvas(true);
    const imgData = stickerCanvas ? stickerCanvas.toDataURL('image/png') : previewDataUrl;

    let col = 0;
    let rowY = margin;
    for (let i = 0; i < stickerCopies; i++) {
      if (rowY + cellH > pageH - margin) {
        doc.addPage();
        rowY = margin;
        col = 0;
      }
      const x = margin + col * (cellW + gap);
      if (showCutLines) {
        doc.setDrawColor(203, 213, 225);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.rect(x, rowY, cellW, cellH);
        doc.setLineDashPattern([], 0);
      }
      doc.addImage(imgData, 'PNG', x + 2, rowY + 2, cellW - 4, cellH - 4, undefined, 'FAST');

      col++;
      if (col >= cols) {
        col = 0;
        rowY += cellH + gap;
      }
    }

    doc.save(`autocollants-${symbology}-${sheetFormat}.pdf`);
    playValidationBeep();
  };

  const handlePrintStickers = () => {
    playTapBeep();
    setRightMode('STICKERS');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const filteredSymbologies = useMemo(() => {
    if (dimensionFilter === 'ALL') return SYMBOLOGIES;
    return SYMBOLOGIES.filter((s) => s.dimension === dimensionFilter);
  }, [dimensionFilter]);

  const activeSheetMeta = useMemo(
    () => SHEET_FORMATS.find((f) => f.id === sheetFormat) || SHEET_FORMATS[3],
    [sheetFormat]
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans antialiased">
      {/* CSS dédié à l'impression propre des autocollants */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #nana-barcode-print-sheet, #nana-barcode-print-sheet * { visibility: visible !important; }
          #nana-barcode-print-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #FFFFFF !important;
            padding: 8mm !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* En-tête Bleu Royal & Blanc Cassé Professionnel */}
      <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onBack();
                }}
                className="p-2 rounded-xl bg-[#F8FAFC] hover:bg-blue-50 border border-[#E2E8F0] text-slate-700 hover:text-[#1E3A8A] transition cursor-pointer shrink-0"
                title="Retour"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] flex items-center justify-center text-white shadow-md shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-[#0F172A] truncate">
                  Studio Codes-Barres &amp; QR Pro
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#1E3A8A] border border-blue-200 text-[10px] font-black uppercase">
                  <Sparkles className="w-3 h-3" />
                  1D &amp; 2D
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Génération multi-formats, incrustation logo, export PNG/JPEG/SVG &amp; planches autocollantes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrintStickers}
              className="px-3 py-2 rounded-xl bg-[#1E3A8A] hover:bg-[#2563EB] text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimer Autocollants</span>
              <span className="sm:hidden">Imprimer</span>
            </button>
          </div>
        </div>
      </header>

      {/* Corps 2 Colonnes */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* COLONNE GAUCHE (5/12) : Configuration, Modèles 1D/2D, Données & Image utilisateur */}
        <section className="lg:col-span-5 space-y-4">
          {/* 1. Choix du Modèle (1D / 2D) */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#1E3A8A] flex items-center gap-1.5">
                <Barcode className="w-4 h-4" />
                <span>1. Modèle de Code (1D / 2D)</span>
              </h2>
              <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-[10px] font-bold">
                {(['ALL', '1D', '2D'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setDimensionFilter(f)}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      dimensionFilter === f
                        ? 'bg-[#1E3A8A] text-white'
                        : 'text-slate-600 hover:text-[#0F172A]'
                    }`}
                  >
                    {f === 'ALL' ? 'Tous' : f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {filteredSymbologies.map((sym) => {
                const active = symbology === sym.id;
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setSymbology(sym.id);
                      if (!rawValue.trim() || SYMBOLOGIES.some((s) => s.defaultSample === rawValue)) {
                        setRawValue(sym.defaultSample);
                      }
                    }}
                    className={`text-left p-2.5 rounded-xl border transition cursor-pointer ${
                      active
                        ? 'bg-blue-50 border-[#2563EB] ring-1 ring-[#2563EB]/30'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-black ${active ? 'text-[#1E3A8A]' : 'text-[#0F172A]'}`}>
                        {sym.label}
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        sym.dimension === '2D'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {sym.dimension}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{sym.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Données & Produits Inventaire */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#1E3A8A] flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>2. Données à Encoder</span>
            </h2>

            {/* Import rapide depuis inventaire */}
            {inventory.length > 0 && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Pré-remplir depuis votre catalogue produit</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleSelectProduct(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="">-- Choisir un article de l'inventaire --</option>
                  {inventory.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.barcode || p.sku || p.id}) — {formatCFA(p.sellingPrice)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Modèles QR Code */}
            {symbology === 'qrcode' && (
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'text' as QrTemplateType, label: 'Texte', icon: Type },
                  { id: 'url' as QrTemplateType, label: 'URL', icon: Link2 },
                  { id: 'wifi' as QrTemplateType, label: 'Wi-Fi', icon: Wifi },
                  { id: 'vcard' as QrTemplateType, label: 'vCard', icon: User },
                ].map((tpl) => {
                  const Icon = tpl.icon;
                  const active = qrTemplate === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setQrTemplate(tpl.id)}
                      className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                        active
                          ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                          : 'bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:border-blue-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tpl.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {symbology === 'qrcode' && qrTemplate === 'wifi' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="Nom du réseau Wi-Fi (SSID)"
                  className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold focus:outline-none focus:border-[#2563EB]"
                />
                <input
                  type="text"
                  value={wifiPass}
                  onChange={(e) => setWifiPass(e.target.value)}
                  placeholder="Mot de passe Wi-Fi"
                  className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold focus:outline-none focus:border-[#2563EB]"
                />
                <select
                  value={wifiSec}
                  onChange={(e) => setWifiSec(e.target.value as any)}
                  className="sm:col-span-2 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="WPA">Sécurité WPA / WPA2 / WPA3</option>
                  <option value="WEP">Sécurité WEP</option>
                  <option value="nopass">Réseau ouvert (sans mot de passe)</option>
                </select>
              </div>
            ) : symbology === 'qrcode' && qrTemplate === 'vcard' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={vcardName}
                  onChange={(e) => setVcardName(e.target.value)}
                  placeholder="Nom complet"
                  className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold focus:outline-none focus:border-[#2563EB]"
                />
                <input
                  type="tel"
                  value={vcardPhone}
                  onChange={(e) => setVcardPhone(e.target.value)}
                  placeholder="Téléphone (+226...)"
                  className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold focus:outline-none focus:border-[#2563EB]"
                />
                <input
                  type="email"
                  value={vcardEmail}
                  onChange={(e) => setVcardEmail(e.target.value)}
                  placeholder="Email professionnel"
                  className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold focus:outline-none focus:border-[#2563EB]"
                />
                <input
                  type="text"
                  value={vcardOrg}
                  onChange={(e) => setVcardOrg(e.target.value)}
                  placeholder="Entreprise / Boutique"
                  className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600">
                    Valeur / Code ({currentSymInfo.label})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      const rand = String(Math.floor(100000000000 + Math.random() * 899999999999));
                      setRawValue(currentSymInfo.dimension === '1D' && symbology !== 'code128' && symbology !== 'code39' && symbology !== 'code93' ? rand.slice(0, 12) : `NANA-${rand.slice(0, 8)}`);
                    }}
                    className="text-[10px] font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Générer aléatoire</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={rawValue}
                  onChange={(e) => setRawValue(e.target.value)}
                  placeholder={currentSymInfo.defaultSample}
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            )}

            {/* Infos d'étiquette (Titre & Prix) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <input
                type="text"
                value={labelTitle}
                onChange={(e) => setLabelTitle(e.target.value)}
                placeholder="Titre sur l'autocollant (optionnel)"
                className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold focus:outline-none focus:border-[#2563EB]"
              />
              <input
                type="text"
                value={labelPrice}
                onChange={(e) => setLabelPrice(e.target.value)}
                placeholder="Prix affiché (ex: 15 000 FCFA)"
                className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* 3. Import Image / Logo Utilisateur & Style */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#1E3A8A] flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              <span>3. Image / Logo &amp; Personnalisation</span>
            </h2>

            {/* Upload Image */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-dashed border-blue-300">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
              />
              {uploadedImageUrl ? (
                <img
                  src={uploadedImageUrl}
                  alt="Logo"
                  className="w-12 h-12 rounded-xl object-contain bg-white border border-[#E2E8F0] p-1 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
                  <ImagePlus className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#0F172A]">
                  {uploadedImageUrl ? 'Image / Logo importé' : 'Importer votre logo ou image'}
                </p>
                <p className="text-[10px] text-slate-500">
                  PNG, JPG ou SVG — pour QR Code central ou en-tête autocollant
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1E3A8A] hover:bg-[#2563EB] text-white text-[11px] font-bold cursor-pointer"
                >
                  {uploadedImageUrl ? 'Changer' : 'Importer'}
                </button>
                {uploadedImageUrl && (
                  <button
                    type="button"
                    onClick={() => setUploadedImageUrl(null)}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                    title="Supprimer l'image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {uploadedImageUrl && (
              <div className="flex flex-wrap gap-3 text-xs">
                {symbology === 'qrcode' && (
                  <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={embedLogoInQr}
                      onChange={(e) => setEmbedLogoInQr(e.target.checked)}
                      className="rounded text-[#1E3A8A]"
                    />
                    <span>Incruster au centre du QR</span>
                  </label>
                )}
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showImageOnSticker}
                    onChange={(e) => setShowImageOnSticker(e.target.checked)}
                    className="rounded text-[#1E3A8A]"
                  />
                  <span>Afficher sur l'autocollant</span>
                </label>
              </div>
            )}

            {/* Couleurs & Dimensions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 block">Couleur Barres</span>
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-[10px] font-mono font-bold">{fgColor}</span>
                </div>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 block">Couleur Fond</span>
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    disabled={transparentBg}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent disabled:opacity-40"
                  />
                  <span className="text-[10px] font-mono font-bold">{transparentBg ? 'Transp.' : bgColor}</span>
                </div>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 block">Résolution ({scaleFactor}x)</span>
                <input
                  type="range"
                  min={2}
                  max={6}
                  value={scaleFactor}
                  onChange={(e) => setScaleFactor(Number(e.target.value))}
                  className="w-full accent-[#1E3A8A]"
                />
              </label>

              {currentSymInfo.dimension === '1D' ? (
                <label className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 block">Hauteur ({barHeightMm}mm)</span>
                  <input
                    type="range"
                    min={8}
                    max={30}
                    value={barHeightMm}
                    onChange={(e) => setBarHeightMm(Number(e.target.value))}
                    className="w-full accent-[#1E3A8A]"
                  />
                </label>
              ) : (
                <label className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 block">Correction QR</span>
                  <select
                    value={qrEcc}
                    onChange={(e) => setQrEcc(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold"
                  >
                    <option value="L">L (7%)</option>
                    <option value="M">M (15%)</option>
                    <option value="Q">Q (25%)</option>
                    <option value="H">H (30%)</option>
                  </select>
                </label>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHumanText}
                  onChange={(e) => setShowHumanText(e.target.checked)}
                />
                <span>Texte lisible sous les barres</span>
              </label>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={transparentBg}
                  onChange={(e) => setTransparentBg(e.target.checked)}
                />
                <span>Fond transparent (PNG / SVG)</span>
              </label>
            </div>
          </div>
        </section>

        {/* COLONNE DROITE (7/12) : Aperçu Temps Réel, Exports PNG/JPEG/SVG & Planche Autocollants */}
        <section className="lg:col-span-7 space-y-4">
          {/* Barre d'onglets Aperçu / Planche Autocollants */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-2 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRightMode('PREVIEW')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                  rightMode === 'PREVIEW'
                    ? 'bg-[#1E3A8A] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-[#F8FAFC]'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Aperçu &amp; Exports</span>
              </button>
              <button
                type="button"
                onClick={() => setRightMode('STICKERS')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                  rightMode === 'STICKERS'
                    ? 'bg-[#1E3A8A] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-[#F8FAFC]'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                <span>Planche Autocollants</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(effectivePayload);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 1800);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-blue-50 border border-[#E2E8F0] text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedCode ? 'Copié !' : 'Copier valeur'}</span>
            </button>
          </div>

          {renderError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{renderError}</span>
            </div>
          )}

          {rightMode === 'PREVIEW' ? (
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
              {/* Zone d'aperçu avec damier subtil si fond transparent */}
              <div
                className="min-h-[280px] rounded-2xl border border-[#E2E8F0] flex flex-col items-center justify-center p-6"
                style={{
                  backgroundImage: transparentBg
                    ? 'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)'
                    : undefined,
                  backgroundSize: transparentBg ? '20px 20px' : undefined,
                  backgroundPosition: transparentBg ? '0 0, 0 10px, 10px -10px, -10px 0px' : undefined,
                  backgroundColor: transparentBg ? '#ffffff' : '#F8FAFC',
                }}
              >
                <div
                  className="rounded-2xl border border-slate-200 shadow-lg p-5 flex flex-col items-center gap-2.5 max-w-full"
                  style={{ backgroundColor: transparentBg ? 'transparent' : bgColor }}
                >
                  {(labelTitle.trim() || (uploadedImageUrl && showImageOnSticker && (!embedLogoInQr || symbology !== 'qrcode'))) && (
                    <div className="flex items-center gap-2.5">
                      {uploadedImageUrl && showImageOnSticker && (!embedLogoInQr || symbology !== 'qrcode') && (
                        <img src={uploadedImageUrl} alt="Logo" className="w-8 h-8 object-contain rounded" />
                      )}
                      {labelTitle.trim() && (
                        <span className="text-sm font-black tracking-tight" style={{ color: fgColor }}>
                          {labelTitle}
                        </span>
                      )}
                    </div>
                  )}

                  {previewDataUrl ? (
                    <img
                      src={previewDataUrl}
                      alt={`${currentSymInfo.label} preview`}
                      className="max-w-full max-h-60 object-contain"
                    />
                  ) : (
                    <div className="py-10 text-xs text-slate-400">Génération de l'aperçu...</div>
                  )}

                  {labelPrice.trim() && (
                    <span className="text-base font-black text-[#1E3A8A] font-mono">
                      {labelPrice}
                    </span>
                  )}
                </div>
              </div>

              {/* Boutons d'export PNG / JPEG / SVG / PDF */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Téléchargement Direct Haute Résolution
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleDownload('png')}
                    disabled={!previewDataUrl}
                    className="py-2.5 px-3 rounded-xl bg-[#1E3A8A] hover:bg-[#2563EB] disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload('jpeg')}
                    disabled={!previewDataUrl}
                    className="py-2.5 px-3 rounded-xl bg-[#2563EB] hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>JPEG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload('svg')}
                    disabled={!svgMarkup}
                    className="py-2.5 px-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>SVG Vectoriel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdfStickers}
                    disabled={!previewDataUrl}
                    className="py-2.5 px-3 rounded-xl bg-[#F8FAFC] hover:bg-blue-50 border border-[#E2E8F0] text-[#1E3A8A] text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <FileText className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* MODE PLANCHE AUTOCOLLANTS */
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Format de support</label>
                  <select
                    value={sheetFormat}
                    onChange={(e) => {
                      const nextId = e.target.value as SheetFormatId;
                      setSheetFormat(nextId);
                      const meta = SHEET_FORMATS.find((f) => f.id === nextId);
                      if (meta) setStickerCopies(meta.defaultCount);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold"
                  >
                    {SHEET_FORMATS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Nombre d'autocollants</label>
                  <input
                    type="number"
                    min={1}
                    max={130}
                    value={stickerCopies}
                    onChange={(e) => setStickerCopies(Math.max(1, Math.min(130, Number(e.target.value) || 1)))}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono font-bold"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCutLines((v) => !v)}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      showCutLines
                        ? 'bg-blue-50 border-[#2563EB] text-[#1E3A8A]'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-slate-600'
                    }`}
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Traits coupe</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdfStickers}
                    className="py-2 px-3 rounded-xl bg-[#1E3A8A] hover:bg-[#2563EB] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                {activeSheetMeta.desc} — Cliquez sur <strong>Imprimer Autocollants</strong> en haut ou exportez en <strong>PDF</strong>.
              </p>

              {/* Feuille d'impression autocollants */}
              <div
                id="nana-barcode-print-sheet"
                className="p-4 rounded-xl bg-white border border-[#E2E8F0] max-h-[520px] overflow-y-auto"
              >
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `repeat(${activeSheetMeta.cols}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: stickerCopies }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg flex flex-col items-center justify-center text-center gap-1 bg-white ${
                        showCutLines ? 'border border-dashed border-slate-300' : ''
                      }`}
                    >
                      {(labelTitle.trim() || (uploadedImageUrl && showImageOnSticker && (!embedLogoInQr || symbology !== 'qrcode'))) && (
                        <div className="flex items-center gap-1 max-w-full">
                          {uploadedImageUrl && showImageOnSticker && (!embedLogoInQr || symbology !== 'qrcode') && (
                            <img src={uploadedImageUrl} alt="" className="w-4 h-4 object-contain shrink-0" />
                          )}
                          {labelTitle.trim() && (
                            <span className="text-[9px] font-black text-[#0F172A] truncate">
                              {labelTitle}
                            </span>
                          )}
                        </div>
                      )}
                      {previewDataUrl && (
                        <img src={previewDataUrl} alt="" className="max-w-full max-h-20 object-contain" />
                      )}
                      {labelPrice.trim() && (
                        <span className="text-[10px] font-black text-[#1E3A8A] font-mono">
                          {labelPrice}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default BarcodeStudioView;
