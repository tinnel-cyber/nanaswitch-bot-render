// Génération PDF à la demande (chargement différé jsPDF pour ne pas surcharger le démarrage mobile)
let jsPDFClass: any = null;
async function getJsPDF() {
  if (!jsPDFClass) {
    const mod = await import('jspdf');
    jsPDFClass = mod.jsPDF || mod.default;
  }
  return jsPDFClass;
}

import { CartItem, CompletedSale, StoreUser, SellerUser } from '../types';

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  isDigital?: boolean;
  downloadUrl?: string;
  fileKey?: string;
  category?: string;
}

export interface ReceiptData {
  storeName: string;
  storePhone?: string;
  storeEmail?: string;
  storeAddress?: string;
  cashierName?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  saleId: string;
  date: string;
  items: ReceiptItem[];
  total: number;
  paymentMethod: 'CASH' | 'CREDIT' | 'WAVE' | 'ORANGE_MONEY' | 'SEBPAY' | 'MOBILE_MONEY' | string;
  amountGiven?: number;
  changeReturned?: number;
  paperWidth?: '80mm' | '58mm';
  notes?: string;
  // Digital products access & client space
  hasDigitalProducts?: boolean;
  digitalAccessUrl?: string;
  clientDashboardUrl?: string;
  expiresInSeconds?: number;
  // Multi-seller traceability and signature
  sellerId?: string;
  sellerName?: string;
  sellerRole?: 'GERANT' | 'CAISSIER';
  sellerSignatureCode?: string;
  isVerified?: boolean;
  kycStatus?: string;
}

/**
 * Format currency in West African CFA Franc
 */
export const formatReceiptCFA = (amount: number): string => {
  return `${amount.toLocaleString('fr-FR')} F CFA`;
};

/**
 * Helper to build ReceiptData from current active cart
 */
export const buildReceiptFromCart = (
  cart: CartItem[],
  total: number,
  currentUser?: StoreUser | null,
  options?: {
    paymentMethod?: 'CASH' | 'CREDIT' | 'WAVE' | 'ORANGE_MONEY';
    amountGiven?: number;
    changeReturned?: number;
    customerName?: string;
    activeSeller?: SellerUser | null;
    seller?: SellerUser | null;
  }
): ReceiptData => {
  const dateNow = new Date();
  const dateFormatted = `${dateNow.toLocaleDateString('fr-FR')} ${dateNow.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}`;
  const saleId = `TK-${dateNow.getFullYear().toString().slice(-2)}${(dateNow.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const currentSeller = options?.seller || options?.activeSeller;

  return {
    storeName: currentUser?.storeName || 'Boutique Nanasore',
    storePhone: currentUser?.phone || '+221 77 000 00 00',
    storeAddress: currentUser?.city ? `${currentUser.city}, Sénégal` : 'Marché Sandaga, Dakar',
    cashierName: currentSeller?.name || currentUser?.name || 'Gérant Caisse',
    customerName: options?.customerName,
    saleId,
    date: dateFormatted,
    items: cart.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      total: i.price * i.quantity,
    })),
    total,
    paymentMethod: options?.paymentMethod || 'CASH',
    amountGiven: options?.amountGiven ?? total,
    changeReturned: options?.changeReturned ?? 0,
    paperWidth: '80mm',
    sellerId: currentSeller?.id || currentUser?.id,
    sellerName: currentSeller?.name || currentUser?.name || 'Vendeur Caisse',
    sellerRole: currentSeller?.role || (currentUser?.role === 'GERANT' ? 'GERANT' : 'CAISSIER'),
    sellerSignatureCode: currentSeller?.signatureCode || currentUser?.signatureCode || 'VND-AUTO',
  };
};

/**
 * Helper to build ReceiptData from a past CompletedSale
 */
export const buildReceiptFromSale = (
  sale: CompletedSale,
  currentUser?: StoreUser | null,
  activeSeller?: SellerUser | null
): ReceiptData => {
  return {
    storeName: currentUser?.storeName || 'Boutique Nanasore',
    storePhone: currentUser?.phone || '+221 77 000 00 00',
    storeAddress: currentUser?.city ? `${currentUser.city}, Sénégal` : 'Marché Sandaga, Dakar',
    cashierName: sale.sellerName || activeSeller?.name || currentUser?.name || 'Gérant Caisse',
    customerName: sale.customerName,
    saleId: sale.id.startsWith('sale-') ? `TK-${sale.id.slice(-6)}` : sale.id,
    date: sale.date || new Date(sale.timestamp || Date.now()).toLocaleString('fr-FR'),
    items: sale.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      total: i.price * i.quantity,
    })),
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    amountGiven: sale.amountGiven,
    changeReturned: sale.changeReturned,
    paperWidth: '80mm',
    sellerId: sale.sellerId || activeSeller?.id,
    sellerName: sale.sellerName || activeSeller?.name || currentUser?.name || 'Vendeur Caisse',
    sellerRole: sale.sellerRole || activeSeller?.role || (currentUser?.role === 'GERANT' ? 'GERANT' : 'CAISSIER'),
    sellerSignatureCode: sale.sellerSignatureCode || activeSeller?.signatureCode || currentUser?.signatureCode || 'VND-AUTO',
  };
};

/**
 * Trigger Native Browser Thermal Print (window.print())
 */
export const printThermalReceipt = (): boolean => {
  try {
    window.print();
    return true;
  } catch (err) {
    console.error('Erreur lors de l\'appel à window.print():', err);
    return false;
  }
};

/**
 * Client-side PDF Generation with jsPDF (Thermal 80mm/58mm or A4 invoice)
 */
export const downloadReceiptPdf = async (
  receipt: ReceiptData,
  formatType: 'thermal_80' | 'thermal_58' | 'a4' = 'thermal_80'
): Promise<void> => {
  try {
    const jsPDF = await getJsPDF();
    if (formatType === 'a4') {
      generateA4InvoicePdf(receipt, jsPDF);
    } else {
      generateThermalReceiptPdf(receipt, formatType === 'thermal_58' ? 58 : 80, jsPDF);
    }
  } catch (error) {
    console.error('Erreur de génération PDF avec jsPDF, déclenchement impression système :', error);
    try {
      if (typeof window !== 'undefined') {
        window.focus();
        window.print();
      }
    } catch (_) {}
  }
};

/**
 * Generate Thermal Roll PDF (formatted for 80mm or 58mm thermal printers)
 */
function generateThermalReceiptPdf(receipt: ReceiptData, widthMm: number, jsPDF: any) {
  // Estimate height according to item count (including signature block)
  const estimatedHeight = Math.max(140, 95 + receipt.items.length * 10 + 45);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [widthMm, estimatedHeight],
    compress: true,
  });

  const margin = 4;
  const printableWidth = widthMm - margin * 2;
  const centerX = widthMm / 2;
  let y = 8;

  // Title / Store Name
  doc.setFont('courier', 'bold');
  doc.setFontSize(widthMm === 58 ? 11 : 13);
  doc.text(receipt.storeName.toUpperCase(), centerX, y, { align: 'center' });
  y += 5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(widthMm === 58 ? 7.5 : 8.5);
  if (receipt.storeAddress) {
    doc.text(receipt.storeAddress, centerX, y, { align: 'center' });
    y += 4;
  }
  if (receipt.storePhone) {
    doc.text(`Tél : ${receipt.storePhone}`, centerX, y, { align: 'center' });
    y += 4;
  }

  // Dashed line divider
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, widthMm - margin, y);
  y += 4;

  // Meta details: Ticket # and Date
  doc.setFontSize(widthMm === 58 ? 7.5 : 8);
  doc.text(`TICKET : ${receipt.saleId}`, margin, y);
  y += 3.5;
  doc.text(`DATE   : ${receipt.date}`, margin, y);
  y += 3.5;
  if (receipt.cashierName) {
    doc.text(`CAISSE : ${receipt.cashierName}`, margin, y);
    y += 3.5;
  }
  if (receipt.customerName) {
    doc.text(`CLIENT : ${receipt.customerName}`, margin, y);
    y += 3.5;
  }

  // Divider
  doc.line(margin, y, widthMm - margin, y);
  y += 4;

  // Table header
  doc.setFont('courier', 'bold');
  doc.text('ARTICLE', margin, y);
  doc.text('QTÉ', margin + (widthMm === 58 ? 26 : 38), y, { align: 'right' });
  doc.text('TOTAL', widthMm - margin, y, { align: 'right' });
  y += 3.5;

  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.line(margin, y, widthMm - margin, y);
  y += 3.5;

  // Items rows
  doc.setFont('courier', 'normal');
  receipt.items.forEach((item) => {
    // Truncate name if too long for thermal line
    const maxChars = widthMm === 58 ? 14 : 22;
    const shortName = item.name.length > maxChars ? `${item.name.substring(0, maxChars)}.` : item.name;

    doc.text(shortName, margin, y);
    doc.text(`${item.quantity}x`, margin + (widthMm === 58 ? 26 : 38), y, { align: 'right' });
    doc.text(`${item.total.toLocaleString('fr-FR')}`, widthMm - margin, y, { align: 'right' });
    y += 3;

    // Unit price subtext
    doc.setFontSize(widthMm === 58 ? 6.5 : 7);
    doc.setTextColor(90, 90, 90);
    doc.text(`@ ${item.price.toLocaleString('fr-FR')} F`, margin + 2, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(widthMm === 58 ? 7.5 : 8);
    y += 3.5;
  });

  // Solid line
  doc.setLineDashPattern([], 0);
  doc.setLineWidth(0.3);
  doc.line(margin, y, widthMm - margin, y);
  y += 5;

  // TOTAL
  doc.setFont('courier', 'bold');
  doc.setFontSize(widthMm === 58 ? 10 : 12);
  doc.text('TOTAL :', margin, y);
  doc.text(`${receipt.total.toLocaleString('fr-FR')} F CFA`, widthMm - margin, y, { align: 'right' });
  y += 5;

  // Payment method & Change
  doc.setFont('courier', 'normal');
  doc.setFontSize(widthMm === 58 ? 7.5 : 8);
  const paymentLabel =
    receipt.paymentMethod === 'CASH'
      ? 'Espèces'
      : receipt.paymentMethod === 'CREDIT'
      ? 'Crédit / Cahier'
      : receipt.paymentMethod === 'WAVE'
      ? 'Wave Mobile'
      : 'Orange Money';

  doc.text(`RÈGLEMENT : ${paymentLabel}`, margin, y);
  y += 3.5;

  if (receipt.paymentMethod === 'CASH' && receipt.amountGiven !== undefined) {
    doc.text(`REÇU     : ${receipt.amountGiven.toLocaleString('fr-FR')} F CFA`, margin, y);
    y += 3.5;
    if (receipt.changeReturned && receipt.changeReturned > 0) {
      doc.text(`MONNAIE  : ${receipt.changeReturned.toLocaleString('fr-FR')} F CFA`, margin, y);
      y += 3.5;
    }
  }

  // Section Traçabilité & Signature Électronique Vendeur (exigences réglementaires)
  y += 2;
  doc.setLineDashPattern([1, 1], 0);
  doc.setLineWidth(0.2);
  doc.line(margin, y, widthMm - margin, y);
  y += 3.5;

  doc.setFont('courier', 'bold');
  doc.setFontSize(widthMm === 58 ? 7 : 7.5);
  doc.text(`Servi par : ${receipt.sellerName || receipt.cashierName || 'Vendeur Caisse'}`, margin, y);
  y += 3;
  doc.setFont('courier', 'normal');
  doc.setFontSize(widthMm === 58 ? 6.5 : 7);
  doc.text(`Rôle : ${receipt.sellerRole || 'CAISSIER'}`, margin, y);
  y += 3;
  const sigStamp = `${receipt.sellerSignatureCode || 'VND-AUTO'} - ${receipt.date}`;
  doc.text(`Signature / Réf Caisse :`, margin, y);
  y += 3;
  doc.setFont('courier', 'bold');
  doc.text(sigStamp, margin, y);
  y += 3.5;

  // Section Accès Produits Numériques si applicable
  if (receipt.hasDigitalProducts || receipt.digitalAccessUrl || receipt.items.some((i) => i.isDigital)) {
    y += 2;
    doc.setLineDashPattern([1, 1], 0);
    doc.setLineWidth(0.2);
    doc.line(margin, y, widthMm - margin, y);
    y += 3.5;

    doc.setFont('courier', 'bold');
    doc.setFontSize(widthMm === 58 ? 6.5 : 7.5);
    doc.text('* ACCES PRODUITS NUMERIQUES *', centerX, y, { align: 'center' });
    y += 3.5;

    doc.setFont('courier', 'normal');
    doc.setFontSize(widthMm === 58 ? 5.5 : 6.5);
    const dUrl = receipt.digitalAccessUrl || `/download/${receipt.saleId}`;
    const cUrl = receipt.clientDashboardUrl || '/client/dashboard';
    doc.text(`Telechargement : ${dUrl}`, margin, y);
    y += 3;
    doc.text(`Espace Client   : ${cUrl}`, margin, y);
    y += 3;
    doc.text(`Lien pre-signe securise (validite 3600s)`, margin, y);
    y += 3.5;
  }

  // Footer notes & barcode imitation
  y += 1;
  doc.setLineDashPattern([1, 1], 0);
  doc.setLineWidth(0.2);
  doc.line(margin, y, widthMm - margin, y);
  y += 4;

  doc.setFontSize(widthMm === 58 ? 6.5 : 7.5);
  doc.text('Merci de votre visite !', centerX, y, { align: 'center' });
  y += 3.5;
  doc.text('Les marchandises vendues ne sont', centerX, y, { align: 'center' });
  y += 3;
  doc.text('ni reprises ni échangées.', centerX, y, { align: 'center' });
  y += 4;

  // Visual pseudo-barcode block
  doc.setFont('courier', 'bold');
  doc.setFontSize(widthMm === 58 ? 7 : 8);
  doc.text(`* ${receipt.saleId} *`, centerX, y, { align: 'center' });

  // Save the PDF file with mobile-safe fallback
  const filename = `Ticket_${receipt.saleId}_${widthMm}mm.pdf`;
  try {
    doc.save(filename);
  } catch (saveErr) {
    console.warn('Blocage doc.save ticket, repli sur impression :', saveErr);
    if (typeof window !== 'undefined') {
      window.focus();
      window.print();
    }
  }
}

/**
 * Generate standard formal A4 commercial invoice PDF
 */
function generateA4InvoicePdf(receipt: ReceiptData, jsPDF: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const margin = 15;
  let y = 20;

  // Header band
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(receipt.storeName.toUpperCase(), margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('FACTURE DE VENTE / REÇU DE CAISSE', margin, 25);

  doc.setFontSize(9);
  doc.text(`Facture N° : ${receipt.saleId}`, 195, 18, { align: 'right' });
  doc.text(`Date : ${receipt.date}`, 195, 25, { align: 'right' });

  // Reset text color
  doc.setTextColor(30, 41, 59);
  y = 42;

  // Sender & Client Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ÉMETTEUR :', margin, y);
  doc.text('CLIENT / BÉNÉFICIAIRE :', 110, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(receipt.storeName, margin, y);
  doc.text(receipt.customerName ? receipt.customerName : 'Client Comptoir (Passage)', 110, y);
  y += 4.5;

  if (receipt.storeAddress) {
    doc.text(receipt.storeAddress, margin, y);
  }
  doc.text(`Mode de paiement : ${receipt.paymentMethod}`, 110, y);
  y += 4.5;

  if (receipt.storePhone) {
    doc.text(`Tél : ${receipt.storePhone}`, margin, y);
  }
  doc.text(`Caissier(ère) : ${receipt.cashierName || 'Caisse Principale'}`, 110, y);
  y += 10;

  // Table header
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('DÉSIGNATION ARTICLE', margin + 3, y + 5.5);
  doc.text('QTÉ', 115, y + 5.5, { align: 'center' });
  doc.text('PRIX UNITAIRE', 145, y + 5.5, { align: 'right' });
  doc.text('TOTAL (F CFA)', 190, y + 5.5, { align: 'right' });
  y += 8;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  receipt.items.forEach((item, index) => {
    // alternate zebra background
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, 180, 7, 'F');
    }
    const displayName = item.isDigital ? `[Numérique] ${item.name}` : item.name;
    doc.text(displayName, margin + 3, y + 5);
    doc.text(item.quantity.toString(), 115, y + 5, { align: 'center' });
    doc.text(`${item.price.toLocaleString('fr-FR')} F`, 145, y + 5, { align: 'right' });
    doc.text(`${item.total.toLocaleString('fr-FR')} F`, 190, y + 5, { align: 'right' });
    y += 7;
  });

  y += 5;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, y, 195, y);
  y += 8;

  // Total summary box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(120, y, 75, 28, 2, 2, 'F');

  // Official Seller Signature Box (Traçabilité & Vérification)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, 95, 28, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('VALIDATION CAISSE & SIGNATURE', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Servi par : ${receipt.sellerName || receipt.cashierName || 'Caisse'}`, margin + 4, y + 12);
  doc.text(`Rôle : ${receipt.sellerRole || 'CAISSIER'}`, margin + 4, y + 17);
  doc.text(`Signature / Réf : ${receipt.sellerSignatureCode || 'VND-AUTO'} - ${receipt.date}`, margin + 4, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Sous-total : ', 125, y + 7);
  doc.text(`${receipt.total.toLocaleString('fr-FR')} F CFA`, 190, y + 7, { align: 'right' });

  doc.text('TVA (Régime Simplifié 0%) : ', 125, y + 13);
  doc.text('0 F CFA', 190, y + 13, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('NET À PAYER : ', 125, y + 21);
  doc.text(`${receipt.total.toLocaleString('fr-FR')} F CFA`, 190, y + 21, { align: 'right' });

  y += 36;

  // Section Accès Produits Numériques & Liens de téléchargement pré-signés
  if (receipt.hasDigitalProducts || receipt.digitalAccessUrl || receipt.items.some((i) => i.isDigital)) {
    doc.setFillColor(238, 242, 255); // indigo-50
    doc.setDrawColor(199, 210, 254); // indigo-200
    doc.roundedRect(margin, y, 180, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138); // blue-900
    doc.text('ACCÈS SÉCURISÉ AUX PRODUITS NUMÉRIQUES / TÉLÉCHARGEMENT', margin + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    const dUrl = receipt.digitalAccessUrl || `/download/${receipt.saleId}`;
    const cUrl = receipt.clientDashboardUrl || '/client/dashboard';
    doc.text(`Lien de téléchargement direct : ${dUrl}`, margin + 4, y + 11);
    doc.text(`Espace Client & Bibliothèque de Contenus : ${cUrl}`, margin + 4, y + 16);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Lien pré-signé sécurisé (validité 3 600s). Accès permanent renouvelable depuis votre Espace Client.`, margin + 4, y + 21);

    y += 28;
  }

  // Footer notes
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Arrêtée la présente facture à la somme totale en Francs CFA ci-dessus indiquée.', margin, y);
  y += 5;
  doc.text('Merci pour votre fidélité. Conservez ce reçu pour tout échange ou réclamation.', margin, y);

  try {
    doc.save(`Facture_${receipt.saleId}.pdf`);
  } catch (saveErr) {
    console.warn('Blocage doc.save facture A4, repli sur impression :', saveErr);
    if (typeof window !== 'undefined') {
      window.focus();
      window.print();
    }
  }
}
