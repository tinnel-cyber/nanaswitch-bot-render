import { jsPDF } from 'jspdf';
import { CustomerOrder, StoreUser } from '../types';

/**
 * Format currency in West African CFA Franc
 */
export const formatOrderCFA = (amount: number): string => {
  return `${Math.round(amount).toLocaleString('fr-FR')} F CFA`;
 };

/**
 * Get human-friendly label for document type
 */
export const getDocumentTypeLabel = (type: CustomerOrder['type']): string => {
  switch (type) {
    case 'BON_COMMANDE':
      return 'Bon de Commande';
    case 'BON_LIVRAISON':
      return 'Bon de Livraison';
    case 'DEVIS_PROFORMA':
      return 'Devis / Proforma';
    default:
      return 'Bon de Commande';
  }
};

/**
 * Format phone number for WhatsApp wa.me link
 * Handles local numbers (e.g. 07XXXXXXXX, 77XXXXXXX) by adding default country code if missing
 */
export const cleanPhoneForWhatsApp = (rawPhone?: string, defaultCountryCode: string = '225'): string => {
  if (!rawPhone) return '';
  // Remove all non-digit characters except '+'
  let cleaned = rawPhone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.length === 10 && (cleaned.startsWith('01') || cleaned.startsWith('05') || cleaned.startsWith('07'))) {
    // Ivory Coast 10-digit mobile number starting with 01, 05, 07
    cleaned = `${defaultCountryCode}${cleaned}`;
  } else if (cleaned.length === 9 && (cleaned.startsWith('70') || cleaned.startsWith('76') || cleaned.startsWith('77') || cleaned.startsWith('78'))) {
    // Senegal 9-digit mobile number
    cleaned = `221${cleaned}`;
  }
  return cleaned;
};

/**
 * Generate a clean, highly structured WhatsApp message for the customer
 */
export const generateOrderWhatsAppMessage = (
  order: CustomerOrder,
  storeUser?: StoreUser | null
): string => {
  const storeName = storeUser?.storeName || 'Boutique Nanasore';
  const storePhone = storeUser?.phone || '';
  const docTitle = getDocumentTypeLabel(order.type).toUpperCase();

  let msg = `🛒 *${storeName.toUpperCase()}*\n`;
  msg += `📋 *${docTitle}* : _${order.orderNumber}_\n`;
  msg += `📅 *Date* : ${order.date}\n`;
  if (order.deliveryDate) {
    msg += `🚚 *Livraison prévue* : ${order.deliveryDate}\n`;
  }
  msg += `👤 *Client* : ${order.customerName}\n`;
  if (order.customerAddress) {
    msg += `📍 *Adresse* : ${order.customerAddress}\n`;
  }
  msg += `--------------------------------\n`;
  msg += `*DÉTAIL DES ARTICLES :*\n`;

  order.items.forEach((item, index) => {
    msg += `${index + 1}. *${item.name}*\n`;
    msg += `   └ ${item.quantity} x ${formatOrderCFA(item.unitPrice)} = *${formatOrderCFA(item.total)}*\n`;
  });

  msg += `--------------------------------\n`;
  msg += `💰 *Sous-total* : ${formatOrderCFA(order.subtotal)}\n`;
  if (order.discount > 0) {
    msg += `🏷️ *Remise accordée* : -${formatOrderCFA(order.discount)}\n`;
  }
  msg += `💵 *TOTAL NET* : *${formatOrderCFA(order.total)}*\n`;

  if (order.depositAmount > 0) {
    msg += `✅ *Acompte déjà versé* : ${formatOrderCFA(order.depositAmount)}\n`;
    msg += `⏳ *RESTE À PAYER* : *${formatOrderCFA(order.remainingBalance)}*\n`;
  } else {
    msg += `⏳ *À régler* : *${formatOrderCFA(order.remainingBalance)}*\n`;
  }

  if (order.paymentTerms) {
    msg += `💳 *Modalités* : ${order.paymentTerms}\n`;
  }
  if (order.notes) {
    msg += `📝 *Notes* : ${order.notes}\n`;
  }

  msg += `--------------------------------\n`;
  msg += `Merci pour votre confiance ! 🙏\n`;
  if (storePhone) {
    msg += `📞 Contact : ${storePhone}\n`;
  }

  return msg;
};

/**
 * Generate full WhatsApp web / mobile click link
 */
export const getWhatsAppShareUrl = (
  rawPhone: string | undefined,
  messageText: string
): string => {
  const cleanPhone = cleanPhoneForWhatsApp(rawPhone);
  const encoded = encodeURIComponent(messageText);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
};

/**
 * Generate and download professional A4 PDF for Order / Delivery Note / Proforma
 */
export const downloadOrderDocumentPdf = (
  order: CustomerOrder,
  storeUser?: StoreUser | null
): void => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4', // 210mm x 297mm
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const printableWidth = pageWidth - margin * 2;
    let y = 14;

    const storeName = (storeUser?.storeName || 'BOUTIQUE NANASORE').toUpperCase();
    const storeCity = storeUser?.city || 'Abidjan / Dakar';
    const storePhone = storeUser?.phone || '';
    const storeEmail = storeUser?.email || '';
    const docTypeLabel = getDocumentTypeLabel(order.type).toUpperCase();

    // Primary Header Background Banner
    const isDelivery = order.type === 'BON_LIVRAISON';
    const isProforma = order.type === 'DEVIS_PROFORMA';

    // Banner color based on type
    if (isDelivery) {
      doc.setFillColor(16, 185, 129); // Emerald
    } else if (isProforma) {
      doc.setFillColor(217, 119, 6); // Amber
    } else {
      doc.setFillColor(37, 99, 235); // Royal Blue
    }
    doc.rect(margin, y, printableWidth, 24, 'F');

    // Header Content
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(storeName, margin + 6, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Commerce Général • ${storeCity} • Tél : ${storePhone}`, margin + 6, y + 15);
    if (storeEmail) {
      doc.text(`Email : ${storeEmail}`, margin + 6, y + 20);
    }

    // Document Type Label on top-right of banner
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(docTypeLabel, pageWidth - margin - 6, y + 10, { align: 'right' });
    doc.setFontSize(9);
    doc.text(`N° ${order.orderNumber}`, pageWidth - margin - 6, y + 17, { align: 'right' });

    y += 30;

    // Two Columns Cards: Store / Meta (Left) & Customer Details (Right)
    const cardWidth = (printableWidth - 6) / 2;

    // LEFT CARD: Order Metadata
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, cardWidth, 38, 2, 2, 'FD');

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('DÉTAILS DU DOCUMENT', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date d'émission :`, margin + 4, y + 13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(order.date, margin + 35, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Livraison prévue :`, margin + 4, y + 19);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(order.deliveryDate || 'Immédiate / À convenir', margin + 35, y + 19);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Statut :`, margin + 4, y + 25);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(order.status === 'PAYE' ? 16 : 220, order.status === 'PAYE' ? 185 : 38, order.status === 'PAYE' ? 129 : 38);
    doc.text(order.status, margin + 35, y + 25);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Établi par :`, margin + 4, y + 31);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(order.createdByName || storeUser?.name || 'Gérant', margin + 35, y + 31);

    // RIGHT CARD: Customer Information
    const rightX = margin + cardWidth + 6;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(rightX, y, cardWidth, 38, 2, 2, 'FD');

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('INFORMATIONS CLIENT', rightX + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Nom :`, rightX + 4, y + 13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(order.customerName.toUpperCase(), rightX + 25, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Téléphone :`, rightX + 4, y + 19);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(order.customerPhone || 'Non renseigné', rightX + 25, y + 19);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Adresse :`, rightX + 4, y + 25);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const addr = order.customerAddress || 'Retrait en magasin';
    doc.text(addr.length > 30 ? `${addr.substring(0, 30)}...` : addr, rightX + 25, y + 25);

    y += 44;

    // Items Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, printableWidth, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, printableWidth, 7, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text('N°', margin + 3, y + 4.8);
    doc.text('DÉSIGNATION ARTICLE', margin + 14, y + 4.8);
    doc.text('QTÉ', margin + 115, y + 4.8, { align: 'right' });
    doc.text('PRIX UNITAIRE', margin + 145, y + 4.8, { align: 'right' });
    doc.text('TOTAL CFA', pageWidth - margin - 3, y + 4.8, { align: 'right' });

    y += 7;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    order.items.forEach((item, index) => {
      // Row alternating bg
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, printableWidth, 6.5, 'F');
      }

      // Border bottom
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);

      doc.setTextColor(71, 85, 105);
      doc.text(`${index + 1}`, margin + 3, y + 4.5);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      const itemName = item.name.length > 48 ? `${item.name.substring(0, 48)}...` : item.name;
      doc.text(itemName, margin + 14, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(`${item.quantity}`, margin + 115, y + 4.5, { align: 'right' });
      doc.text(`${item.unitPrice.toLocaleString('fr-FR')} F`, margin + 145, y + 4.5, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.text(`${item.total.toLocaleString('fr-FR')} F`, pageWidth - margin - 3, y + 4.5, { align: 'right' });

      y += 6.5;
    });

    y += 4;

    // Totals Block on Right Side
    const totalsWidth = 85;
    const totalsX = pageWidth - margin - totalsWidth;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(totalsX, y, totalsWidth, 42, 2, 2, 'FD');

    let totY = y + 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Sous-total brut :', totalsX + 4, totY);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${order.subtotal.toLocaleString('fr-FR')} F CFA`, pageWidth - margin - 4, totY, { align: 'right' });

    if (order.discount > 0) {
      totY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(220, 38, 38);
      doc.text('Remise déduite :', totalsX + 4, totY);
      doc.setFont('helvetica', 'bold');
      doc.text(`- ${order.discount.toLocaleString('fr-FR')} F CFA`, pageWidth - margin - 4, totY, { align: 'right' });
    }

    totY += 7;
    // Highlight Total Box
    doc.setFillColor(224, 231, 255);
    doc.rect(totalsX + 2, totY - 4.5, totalsWidth - 4, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138);
    doc.text('TOTAL NET :', totalsX + 4, totY);
    doc.text(`${order.total.toLocaleString('fr-FR')} F CFA`, pageWidth - margin - 4, totY, { align: 'right' });

    totY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(16, 185, 129);
    doc.text('Acompte versé :', totalsX + 4, totY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${order.depositAmount.toLocaleString('fr-FR')} F CFA`, pageWidth - margin - 4, totY, { align: 'right' });

    totY += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(185, 28, 28);
    doc.text('SOLDE RESTANT :', totalsX + 4, totY);
    doc.text(`${order.remainingBalance.toLocaleString('fr-FR')} F CFA`, pageWidth - margin - 4, totY, { align: 'right' });

    // LEFT OF TOTALS: Notes & Payment Terms
    const leftNotesWidth = totalsX - margin - 6;
    if (order.notes || order.paymentTerms) {
      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(254, 240, 138);
      doc.roundedRect(margin, y, leftNotesWidth, 42, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(113, 63, 18);
      doc.text('CONDITIONS & REMARQUES :', margin + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(133, 77, 14);

      let noteLineY = y + 12;
      if (order.paymentTerms) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Modalités : `, margin + 4, noteLineY);
        doc.setFont('helvetica', 'normal');
        doc.text(order.paymentTerms, margin + 22, noteLineY);
        noteLineY += 5;
      }
      if (order.notes) {
        doc.text(order.notes, margin + 4, noteLineY, { maxWidth: leftNotesWidth - 8 });
      }
    }

    y += 50;

    // Signatures Block
    const sigBoxWidth = (printableWidth - 10) / 2;
    doc.setDrawColor(203, 213, 225);
    doc.setLineDashPattern([1, 1], 0);

    // Left Signature: Client
    doc.rect(margin, y, sigBoxWidth, 25, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('BON POUR ACCORD / RÉCEPTION CLIENT', margin + 4, y + 5);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.text('Date & Signature :', margin + 4, y + 22);

    // Right Signature: Boutique Nana
    const rightSigX = margin + sigBoxWidth + 10;
    doc.rect(rightSigX, y, sigBoxWidth, 25, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`CACHET & SIGNATURE ${storeName}`, rightSigX + 4, y + 5);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.text('Pour la boutique :', rightSigX + 4, y + 22);

    // Footer
    doc.setLineDashPattern([], 0);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Document généré le ${new Date().toLocaleDateString('fr-FR')} avec Nanasore • Validité : 30 jours sauf mention contraire`,
      pageWidth / 2,
      pageHeight - 9,
      { align: 'center' }
    );

    // File name: Ex: Bon_Commande_BC-2026-09-001_Client.pdf
    const cleanDocLabel = order.type.toLowerCase().replace(/_/g, '-');
    const cleanCustomerName = order.customerName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${cleanDocLabel}_${order.orderNumber}_${cleanCustomerName}.pdf`;

    try {
      doc.save(fileName);
    } catch (saveErr) {
      console.warn('Blocage doc.save sur navigateur mobile, repli sur impression directe :', saveErr);
      if (typeof window !== 'undefined') {
        window.focus();
        window.print();
      }
    }
  } catch (error) {
    console.error('Erreur lors de la génération PDF du bon de commande:', error);
    try {
      if (typeof window !== 'undefined') {
        window.focus();
        window.print();
      }
    } catch (_) {}
  }
};
