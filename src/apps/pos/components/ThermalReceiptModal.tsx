import React, { useState, useCallback } from 'react';
import {
  Printer,
  FileDown,
  X,
  CheckCircle,
  Copy,
  Receipt,
  FileText,
  Share2,
  ChevronDown
} from 'lucide-react';
import {
  ReceiptData,
  printThermalReceipt,
  downloadReceiptPdf,
  formatReceiptCFA
} from '../../../utils/receiptGenerator';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';
import { NanasorePasserelleIcon } from '../../../components/common/NanasoreLogo';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
  onFinishAndClear?: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
  onFinishAndClear,
}) => {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [pdfFormat, setPdfFormat] = useState<'thermal_80' | 'thermal_58' | 'a4'>('thermal_80');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    playValidationBeep();
    printThermalReceipt();
  };

  const handleDownloadPdf = (format: 'thermal_80' | 'thermal_58' | 'a4') => {
    setIsDownloadingPdf(true);
    playValidationBeep();
    try {
      downloadReceiptPdf(receipt, format);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsDownloadingPdf(false), 800);
    }
  };

  const handleCopyTextReceipt = () => {
    playTapBeep();
    const itemsLines = receipt.items
      .map(
        (it) =>
          `• ${it.quantity}x ${it.name} - ${it.total.toLocaleString('fr-FR')} F (${it.price} F/u)`
      )
      .join('\n');

    const text = `🧾 *TICKET DE CAISSE - ${receipt.storeName.toUpperCase()}*
N° ${receipt.saleId} | ${receipt.date}
${receipt.storePhone ? `Tél : ${receipt.storePhone}` : ''}
${receipt.storeAddress ? `Adresse : ${receipt.storeAddress}` : ''}
---------------------------
${itemsLines}
---------------------------
*TOTAL : ${formatReceiptCFA(receipt.total)}*
Mode : ${receipt.paymentMethod === 'CASH' ? 'Espèces' : receipt.paymentMethod}
${receipt.amountGiven ? `Reçu : ${formatReceiptCFA(receipt.amountGiven)}` : ''}
${receipt.changeReturned ? `Monnaie rendue : ${formatReceiptCFA(receipt.changeReturned)}` : ''}
---------------------------
Servi par : ${receipt.sellerName || receipt.cashierName || 'Caisse'}
Rôle : ${receipt.sellerRole || 'CAISSIER'}
Signature / Réf Caisse : ${receipt.sellerSignatureCode || 'VND-AUTO'} - ${receipt.date}
---------------------------
Merci de votre visite !`;

    navigator.clipboard?.writeText(text);
    setCopyFeedback('Copié pour WhatsApp / SMS !');
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  return (
    <>
      {/* 1. Modal interactif pour l'écran utilisateur */}
      <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 select-none overflow-y-auto">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[94vh]">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <NanasorePasserelleIcon pixelSize={36} />
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <span>Reçu & Facturation Nanasore</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {receipt.saleId}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Impression thermique directe & téléchargement PDF • Nanasore
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls Bar: Largeur papier thermique & Format PDF */}
          <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Format papier thermique */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400">Largeur rouleau :</span>
              <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setPaperWidth('80mm');
                  }}
                  className={`px-2 py-1 rounded-md text-xs font-bold font-mono transition-all cursor-pointer ${
                    paperWidth === '80mm'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  80 mm (Caisse)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setPaperWidth('58mm');
                  }}
                  className={`px-2 py-1 rounded-md text-xs font-bold font-mono transition-all cursor-pointer ${
                    paperWidth === '58mm'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  58 mm (Mini POS)
                </button>
              </div>
            </div>

            {/* Quick copy text */}
            <button
              type="button"
              onClick={handleCopyTextReceipt}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 cursor-pointer"
              title="Copier le texte du ticket"
            >
              {copyFeedback ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">{copyFeedback}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copier texte</span>
                </>
              )}
            </button>
          </div>

          {/* Ticket Preview Canvas (Monochrome Thermal Look) */}
          <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-950/50">
            <div
              className={`bg-[#fffef8] text-slate-900 p-4 rounded-xl shadow-xl font-mono border-t-4 border-slate-300 transition-all ${
                paperWidth === '80mm' ? 'w-[310px] text-xs' : 'w-[230px] text-[10px]'
              }`}
            >
              {/* Header */}
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <div className="flex justify-center mb-1.5">
                  <NanasorePasserelleIcon pixelSize={34} />
                </div>
                <div className="font-black text-sm uppercase tracking-wider text-slate-950">
                  {receipt.storeName}
                </div>
                {receipt.storeAddress && (
                  <div className="text-[10px] text-slate-700 leading-tight mt-0.5">
                    {receipt.storeAddress}
                  </div>
                )}
                {receipt.storePhone && (
                  <div className="text-[10px] text-slate-700">Tél : {receipt.storePhone}</div>
                )}
              </div>

              {/* Meta */}
              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] text-slate-700 space-y-0.5">
                <div className="flex justify-between">
                  <span>Ticket :</span>
                  <span className="font-bold">{receipt.saleId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date :</span>
                  <span>{receipt.date}</span>
                </div>
                {receipt.cashierName && (
                  <div className="flex justify-between">
                    <span>Caissier :</span>
                    <span>{receipt.cashierName}</span>
                  </div>
                )}
                {receipt.customerName && (
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Client :</span>
                    <span>{receipt.customerName}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="py-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between font-bold text-[10px] text-slate-800 pb-1 border-b border-dotted border-slate-300">
                  <span>Désignation</span>
                  <span>Total</span>
                </div>
                <div className="pt-1.5 space-y-1.5">
                  {receipt.items.map((item, idx) => (
                    <div key={idx} className="leading-tight">
                      <div className="flex justify-between font-medium">
                        <span className="truncate pr-1">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="font-bold shrink-0">
                          {item.total.toLocaleString('fr-FR')} F
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {item.price.toLocaleString('fr-FR')} F / unité
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Payment */}
              <div className="py-2.5 border-b-2 border-slate-800 space-y-1">
                <div className="flex justify-between items-baseline text-sm font-black text-slate-950">
                  <span>TOTAL :</span>
                  <span>{receipt.total.toLocaleString('fr-FR')} F CFA</span>
                </div>

                <div className="text-[10px] text-slate-700 pt-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Règlement :</span>
                    <span className="font-bold">
                      {receipt.paymentMethod === 'CASH'
                        ? 'Espèces'
                        : receipt.paymentMethod === 'CREDIT'
                        ? 'Crédit / Cahier'
                        : receipt.paymentMethod === 'WAVE'
                        ? 'Wave Mobile'
                        : 'Orange Money'}
                    </span>
                  </div>
                  {receipt.paymentMethod === 'CASH' && receipt.amountGiven !== undefined && (
                    <>
                      <div className="flex justify-between">
                        <span>Montant reçu :</span>
                        <span>{receipt.amountGiven.toLocaleString('fr-FR')} F CFA</span>
                      </div>
                      {receipt.changeReturned !== undefined && receipt.changeReturned > 0 && (
                        <div className="flex justify-between font-bold text-emerald-800">
                          <span>Monnaie rendue :</span>
                          <span>{receipt.changeReturned.toLocaleString('fr-FR')} F CFA</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Section Signature Automatique Vendeur (Traçabilité & Vérification) */}
              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] text-slate-800 space-y-0.5">
                <div className="flex justify-between">
                  <span>Servi par :</span>
                  <span className="font-bold text-slate-900">
                    {receipt.sellerName || receipt.cashierName || 'Vendeur Caisse'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Rôle :</span>
                  <span className="font-semibold text-slate-700">{receipt.sellerRole || 'CAISSIER'}</span>
                </div>
                <div className="pt-0.5">
                  <div className="text-[9px] text-slate-500">Signature / Réf Caisse :</div>
                  <div className="font-mono font-bold text-[9.5px] text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 mt-0.5 flex justify-between items-center">
                    <span>{receipt.sellerSignatureCode || 'VND-AUTO'}</span>
                    <span className="text-[8px] text-slate-500 font-normal">{receipt.date}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 pb-1 text-center space-y-1 text-[9px] text-slate-600">
                <p className="font-bold text-slate-800">Merci de votre visite !</p>
                <p className="leading-tight">
                  Les marchandises vendues ne sont ni reprises ni échangées.
                </p>
                {/* Visual barcode imitation */}
                <div className="pt-2 font-mono tracking-widest text-slate-400 text-center font-bold">
                  ||||||| | ||||| ||| |||||||
                </div>
                <div className="text-[8px] text-slate-400 font-mono">*{receipt.saleId}*</div>
              </div>
            </div>
          </div>

          {/* Action Footer: Imprimer & Générer PDF */}
          <div className="p-3.5 bg-slate-900 border-t border-slate-800 shrink-0 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Bouton 1 : Impression Thermique Directe */}
              <button
                id="btn-print-thermal-direct"
                type="button"
                onClick={handlePrint}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
                title={`Imprimer sur imprimante thermique format ${paperWidth}`}
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer ({paperWidth})</span>
              </button>

              {/* Bouton 2 : Télécharger Facture PDF avec jsPDF */}
              <button
                id="btn-download-pdf-receipt"
                type="button"
                onClick={() =>
                  handleDownloadPdf(paperWidth === '80mm' ? 'thermal_80' : 'thermal_58')
                }
                disabled={isDownloadingPdf}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
                title="Générer et télécharger la facture PDF"
              >
                <FileDown className="w-4 h-4" />
                <span>{isDownloadingPdf ? 'Génération du PDF en cours...' : `Télécharger PDF`}</span>
              </button>
            </div>

            
            {/* Boutons WhatsApp & SMS */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  const text = encodeURIComponent(`*Ticket de Caisse - ${receipt.storeName}*
Total: ${receipt.total.toLocaleString('fr-FR')} F CFA
Date: ${receipt.date}
Merci de votre confiance!`);
                  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                }}
                className="py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = encodeURIComponent(`Ticket de Caisse - ${receipt.storeName}\nTotal: ${receipt.total.toLocaleString('fr-FR')} F CFA\nDate: ${receipt.date}\nMerci de votre confiance!`);
                  window.open(`sms:?body=${text}`, '_self');
                }}
                className="py-2.5 px-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <span>SMS</span>
              </button>
            </div>
            {/* Options additionnelles : Facture format A4 commercial & Terminer */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleDownloadPdf('a4')}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-800 cursor-pointer text-[11px]"
                title="Télécharger une facture A4 formelle commerciale avec en-tête et tableau"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Format Facture A4 (Bureau)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onFinishAndClear) {
                    onFinishAndClear();
                  }
                  onClose();
                }}
                className="text-slate-300 hover:text-white font-bold py-1 px-3 rounded-lg hover:bg-slate-800 cursor-pointer text-[11px]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Zone d'impression thermique dédiée dans le DOM (utilisée par @media print) */}
      <div
        id="thermal-receipt-print-area"
        className={`hidden print:block ${paperWidth === '58mm' ? 'width-58mm' : 'width-80mm'}`}
      >
        {/* Entête Boutique */}
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <div style={{ fontWeight: 'bold', fontSize: paperWidth === '58mm' ? '12px' : '14px' }}>
            {receipt.storeName.toUpperCase()}
          </div>
          {receipt.storeAddress && (
            <div style={{ fontSize: '9px' }}>{receipt.storeAddress}</div>
          )}
          {receipt.storePhone && (
            <div style={{ fontSize: '9px' }}>Tél : {receipt.storePhone}</div>
          )}
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

        {/* Détails ticket */}
        <div style={{ fontSize: '9px', lineHeight: '1.3' }}>
          <div>TICKET : {receipt.saleId}</div>
          <div>DATE   : {receipt.date}</div>
          {receipt.cashierName && <div>CAISSE : {receipt.cashierName}</div>}
          {receipt.customerName && <div>CLIENT : {receipt.customerName}</div>}
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

        {/* Tableau articles */}
        <div style={{ width: '100%', fontSize: '9.5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>ARTICLE</span>
            <span>TOTAL</span>
          </div>
          <div style={{ borderTop: '1px dotted #000', margin: '2px 0' }} />

          {receipt.items.map((it, i) => (
            <div key={i} style={{ marginBottom: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {it.quantity}x {it.name}
                </span>
                <span style={{ fontWeight: 'bold' }}>
                  {it.total.toLocaleString('fr-FR')} F
                </span>
              </div>
              <div style={{ fontSize: '8px', color: '#555' }}>
                @ {it.price.toLocaleString('fr-FR')} F
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #000', margin: '4px 0' }} />

        {/* Total & Paiement */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: paperWidth === '58mm' ? '12px' : '13px' }}>
          <span>TOTAL :</span>
          <span>{receipt.total.toLocaleString('fr-FR')} F CFA</span>
        </div>

        <div style={{ fontSize: '9px', marginTop: '3px', lineHeight: '1.3' }}>
          <div>
            RÈGLEMENT :{' '}
            {receipt.paymentMethod === 'CASH'
              ? 'Espèces'
              : receipt.paymentMethod === 'CREDIT'
              ? 'Crédit / Cahier'
              : receipt.paymentMethod === 'WAVE'
              ? 'Wave Mobile'
              : 'Orange Money'}
          </div>
          {receipt.paymentMethod === 'CASH' && receipt.amountGiven !== undefined && (
            <div>REÇU     : {receipt.amountGiven.toLocaleString('fr-FR')} F CFA</div>
          )}
          {receipt.changeReturned !== undefined && receipt.changeReturned > 0 && (
            <div style={{ fontWeight: 'bold' }}>
              MONNAIE  : {receipt.changeReturned.toLocaleString('fr-FR')} F CFA
            </div>
          )}
        </div>

        {/* Section Signature Automatique Vendeur (Traçabilité) */}
        <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
        <div style={{ fontSize: '9px', lineHeight: '1.3' }}>
          <div>Servi par : <b>{receipt.sellerName || receipt.cashierName || 'Vendeur Caisse'}</b></div>
          <div>Rôle : {receipt.sellerRole || 'CAISSIER'}</div>
          <div>Signature / Réf Caisse : <b>{receipt.sellerSignatureCode || 'VND-AUTO'}</b> - {receipt.date}</div>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

        {/* Message de fin */}
        <div style={{ textAlign: 'center', fontSize: '8.5px', marginTop: '4px' }}>
          <div style={{ fontWeight: 'bold' }}>Merci de votre visite !</div>
          <div>Les marchandises vendues ne sont ni reprises ni échangées.</div>
          <div style={{ marginTop: '4px', letterSpacing: '2px', fontWeight: 'bold' }}>
            * {receipt.saleId} *
          </div>
        </div>
      </div>
    </>
  );
};

export default ThermalReceiptModal;
