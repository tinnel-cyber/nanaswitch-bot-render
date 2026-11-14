/**
 * Service Universel de Génération et Distribution Directe des Reçus de Paiement
 * Avec Récapitulatif des Achats, Coordonnées de la Boutique et Liens Pré-signés Sécurisés (R2 / Supabase)
 */

import { downloadReceiptPdf, ReceiptData, ReceiptItem } from '../utils/receiptGenerator';

export interface DigitalReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total?: number;
  isDigital?: boolean;
  downloadUrl?: string;
  fileKey?: string;
  category?: string;
}

export interface DigitalReceiptPayload {
  orderId: string;
  transactionId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  // Informations complètes de la boutique
  storeName: string;
  storePhone?: string;
  storeEmail?: string;
  storeAddress?: string;
  storeCity?: string;
  // Produits et montants
  items: DigitalReceiptItem[];
  totalAmount: number;
  currency?: string;
  paymentMethod: string;
  paymentDate?: string;
  // Accès sécurisés
  downloadUrl?: string; // /download/:orderId
  clientDashboardUrl?: string; // /client/dashboard
  expiresInSeconds?: number; // 3600s
}

/**
 * Nettoyage d'un numéro pour lien WhatsApp
 */
export const cleanPhoneForWhatsApp = (rawPhone?: string, defaultCountryCode: string = '225'): string => {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.length === 10 && (cleaned.startsWith('01') || cleaned.startsWith('05') || cleaned.startsWith('07'))) {
    cleaned = `${defaultCountryCode}${cleaned}`;
  } else if (cleaned.length === 9 && (cleaned.startsWith('70') || cleaned.startsWith('76') || cleaned.startsWith('77') || cleaned.startsWith('78'))) {
    cleaned = `221${cleaned}`;
  }
  return cleaned;
};

/**
 * Construit l'URL absolue en fonction de l'environnement (navigateur ou SSR)
 */
export const getAbsoluteAppUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${cleanPath}`;
  }
  return `https://nanasore.com${cleanPath}`;
};

/**
 * Détermine si le panier / commande comporte au moins un produit numérique
 */
export const hasDigitalContent = (items: DigitalReceiptItem[]): boolean => {
  if (!items || items.length === 0) return false;
  return items.some((item) => {
    if (item.isDigital) return true;
    const cat = (item.category || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return (
      cat.includes('digital') ||
      cat.includes('numérique') ||
      cat.includes('e-book') ||
      cat.includes('pdf') ||
      cat.includes('formation') ||
      cat.includes('video') ||
      cat.includes('template') ||
      name.includes('.pdf') ||
      name.includes('.zip') ||
      name.includes('.mp4') ||
      Boolean(item.downloadUrl) ||
      Boolean(item.fileKey)
    );
  });
};

/**
 * Génère le message WhatsApp officiel formaté avec le récapitulatif,
 * les coordonnées de la boutique et les liens d'accès de téléchargement.
 */
export const formatDigitalReceiptWhatsAppText = (receipt: DigitalReceiptPayload): string => {
  const storeTitle = (receipt.storeName || 'BOUTIQUE NANASORE').toUpperCase();
  const dateStr = receipt.paymentDate || new Date().toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const containsDigital = hasDigitalContent(receipt.items);
  const directDownloadUrl = receipt.downloadUrl 
    ? (receipt.downloadUrl.startsWith('http') ? receipt.downloadUrl : getAbsoluteAppUrl(receipt.downloadUrl))
    : getAbsoluteAppUrl(`/download/${receipt.orderId}`);

  const dashboardUrl = receipt.clientDashboardUrl
    ? (receipt.clientDashboardUrl.startsWith('http') ? receipt.clientDashboardUrl : getAbsoluteAppUrl(receipt.clientDashboardUrl))
    : getAbsoluteAppUrl('/client/dashboard');

  let msg = `🛒 *${storeTitle}*\n`;
  msg += `🧾 *REÇU OFFICIEL DE PAIEMENT VALIDÉ*\n`;
  if (receipt.storeAddress || receipt.storeCity) {
    msg += `📍 ${receipt.storeAddress || receipt.storeCity}\n`;
  }
  if (receipt.storePhone) {
    msg += `📞 Support Boutique : ${receipt.storePhone}\n`;
  }
  if (receipt.storeEmail) {
    msg += `✉️ Contact : ${receipt.storeEmail}\n`;
  }
  msg += `────────────────────────────\n`;
  msg += `📋 *Réf. Commande :* _#${receipt.orderId}_\n`;
  if (receipt.transactionId) {
    msg += `💳 *Transaction ID :* _${receipt.transactionId}_\n`;
  }
  msg += `📅 *Date :* ${dateStr}\n`;
  msg += `👤 *Client :* ${receipt.customerName || 'Client'}\n`;
  if (receipt.customerPhone) {
    msg += `📱 *Téléphone :* ${receipt.customerPhone}\n`;
  }
  if (receipt.deliveryAddress) {
    msg += `📍 *Livraison :* ${receipt.deliveryAddress}\n`;
  }
  msg += `────────────────────────────\n`;
  msg += `📦 *RÉCAPITULATIF DES ACHATS :*\n`;

  receipt.items.forEach((item, idx) => {
    const total = item.total || item.price * (item.quantity || 1);
    const tag = item.isDigital ? ' ⚡[NUMÉRIQUE]' : '';
    msg += `${idx + 1}. *${item.name}*${tag}\n`;
    msg += `   └ ${item.quantity || 1} x ${item.price.toLocaleString('fr-FR')} = *${total.toLocaleString('fr-FR')} F CFA*\n`;
  });

  msg += `────────────────────────────\n`;
  msg += `💰 *TOTAL PAYÉ :* *${receipt.totalAmount.toLocaleString('fr-FR')} F CFA*\n`;
  msg += `💳 *Mode de règlement :* ${receipt.paymentMethod || 'Mobile Money'}\n`;
  msg += `✅ *Statut :* VALIDÉ & SÉCURISÉ\n`;

  // SECTION SPÉCIALE PRODUITS NUMÉRIQUES & ACCÈS TÉLÉCHARGEMENT
  if (containsDigital) {
    msg += `────────────────────────────\n`;
    msg += `🔐 *VOS ACCÈS PRODUITS NUMÉRIQUES :*\n\n`;
    msg += `📥 *Téléchargement Direct (Lien Pré-signé) :*\n`;
    msg += `👉 ${directDownloadUrl}\n\n`;
    msg += `👤 *Votre Espace Client & Bibliothèque :*\n`;
    msg += `👉 ${dashboardUrl}\n\n`;
    msg += `⏳ _Sécurité : Le lien direct est chiffré HMAC avec une validité de 3 600s (1 heure). Vous pouvez régénérer vos accès à volonté depuis votre Espace Client._\n`;
  }

  msg += `────────────────────────────\n`;
  msg += `🙏 *Merci pour votre commande et votre confiance !*\n`;
  if (receipt.storePhone) {
    msg += `Besoin d'assistance ? Contactez-nous au ${receipt.storePhone}.\n`;
  }

  return msg;
};

/**
 * Génère le lien URL de partage WhatsApp direct (wa.me)
 */
export const getDigitalReceiptWhatsAppUrl = (
  receipt: DigitalReceiptPayload,
  recipientPhone?: string
): string => {
  const targetPhone = cleanPhoneForWhatsApp(recipientPhone || receipt.customerPhone || receipt.storePhone);
  const text = formatDigitalReceiptWhatsAppText(receipt);
  const encoded = encodeURIComponent(text);

  if (targetPhone) {
    return `https://wa.me/${targetPhone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
};

/**
 * Déclenche le téléchargement du reçu PDF officiel (A4 ou Ticket thermique)
 */
export const downloadDigitalReceiptPdf = async (
  receipt: DigitalReceiptPayload,
  format: 'a4' | 'thermal_80' = 'a4'
): Promise<void> => {
  const containsDigital = hasDigitalContent(receipt.items);
  const directDownloadUrl = receipt.downloadUrl 
    ? (receipt.downloadUrl.startsWith('http') ? receipt.downloadUrl : getAbsoluteAppUrl(receipt.downloadUrl))
    : getAbsoluteAppUrl(`/download/${receipt.orderId}`);

  const dashboardUrl = receipt.clientDashboardUrl
    ? (receipt.clientDashboardUrl.startsWith('http') ? receipt.clientDashboardUrl : getAbsoluteAppUrl(receipt.clientDashboardUrl))
    : getAbsoluteAppUrl('/client/dashboard');

  const receiptData: ReceiptData = {
    storeName: receipt.storeName || 'Boutique Nanasore',
    storePhone: receipt.storePhone,
    storeEmail: receipt.storeEmail,
    storeAddress: receipt.storeAddress || receipt.storeCity,
    customerName: receipt.customerName,
    customerPhone: receipt.customerPhone,
    customerEmail: receipt.customerEmail,
    saleId: receipt.orderId,
    date: receipt.paymentDate || new Date().toLocaleString('fr-FR'),
    items: receipt.items.map((it) => ({
      name: it.name,
      quantity: it.quantity || 1,
      price: it.price,
      total: it.total || it.price * (it.quantity || 1),
      isDigital: it.isDigital || hasDigitalContent([it]),
      downloadUrl: it.downloadUrl || directDownloadUrl,
      category: it.category
    })),
    total: receipt.totalAmount,
    paymentMethod: receipt.paymentMethod || 'MOBILE_MONEY',
    hasDigitalProducts: containsDigital,
    digitalAccessUrl: directDownloadUrl,
    clientDashboardUrl: dashboardUrl,
    expiresInSeconds: receipt.expiresInSeconds || 3600
  };

  await downloadReceiptPdf(receiptData, format);
};

/**
 * Envoie le reçu au client via l'API Next.js /api/payments/receipt
 */
export const sendDigitalReceiptViaApi = async (
  receipt: DigitalReceiptPayload
): Promise<{ success: boolean; message: string; receiptId?: string }> => {
  try {
    const res = await fetch('/api/payments/receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receipt)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Erreur serveur HTTP ${res.status}`);
    }

    return {
      success: true,
      message: data?.message || 'Reçu de paiement transmis avec succès.',
      receiptId: data?.receiptId
    };
  } catch (err: any) {
    console.warn('[DIGITAL_RECEIPT_API] Note envoi API :', err.message);
    return {
      success: false,
      message: err.message || 'Impossible de joindre le serveur d\'envoi automatique.'
    };
  }
};
