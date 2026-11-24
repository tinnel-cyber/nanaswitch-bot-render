import { MacroDroidSmsPayload, SmsPaymentMatchResult } from '../types';

/**
 * Normalise un numéro de téléphone pour comparaison :
 * Nettoie tous les espaces, tirets, parenthèses et indicatifs (+226, 00226, 226, +225, 00225, etc.)
 * pour extraire rigoureusement les 8 derniers chiffres (ex: +226 70 12 34 56 -> 70123456).
 */
export function normalizePhoneNumberForMatching(phone?: string | null): string {
  if (!phone) return '';
  const digits = String(phone).replace(/[^0-9]/g, '');
  return digits.length >= 8 ? digits.slice(-8) : digits;
}

/**
 * Vérifie si le SMS (message + expéditeur) contient les 8 derniers chiffres du numéro client
 */
export function isPhoneNumberInSms(rawText: string, customerPhone?: string | null): boolean {
  if (!rawText || !customerPhone) return false;
  const client8 = normalizePhoneNumberForMatching(customerPhone);
  if (!client8 || client8.length < 8) return false;

  const smsDigits = String(rawText).replace(/[^0-9]/g, '');
  return smsDigits.includes(client8);
}

/**
 * Tente d'extraire la référence de transaction depuis le corps complet du SMS opérateur
 * Compatible Orange Money, Moov Money / Moov Africa, Wave, MTN Mobile Money et textes collés
 */
export function extractTransactionReferenceFromSms(message: string, fallbackKey: string = ''): string {
  if (!message || typeof message !== 'string') return fallbackKey;

  const cleanMsg = message.replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ').trim();

  // Si le message est déjà un ID de transaction seul sans texte autour
  if (/^[A-Za-z0-9._-]{5,35}$/.test(cleanMsg) && !/\s/.test(cleanMsg)) {
    return cleanMsg;
  }

  const patterns = [
    // 1. Mots-clés explicites avec séparateurs : "Trans ID: ...", "Réf: ...", "ID de transaction: ...", "Transaction ID: ...", "ID : ..."
    /(?:trans(?:action)?\s*id|id\s*(?:de\s*(?:la\s*)?)?trans(?:action)?|txn?\s*id|code\s*(?:de\s*)?trans(?:action)?|num(?:[eé]ro)?\s*(?:de\s*)?trans(?:action)?|identifiant)\s*[:.]?\s*([A-Za-z0-9._-]+)/i,
    /(?:r[eé]f(?:[eé]rence)?|r[eé]f\s*paiement|r[eé]f\s*tx)\s*[:.]?\s*([A-Za-z0-9._-]+)/i,
    /\b(?:id)\s*[:]\s*([A-Za-z0-9._-]{5,35})/i,

    // 2. Formats Orange Money : CI240916.1234..., MP24..., PP24..., OM...
    /\b((?:CI|MP|PP|OM|BF|SN|ML|BJ|CG)\d{6,}\.[A-Za-z0-9._-]+)\b/i,
    /\b((?:CI|MP|PP|OM|BF|SN|ML|BJ|CG)[0-9]{8,}[A-Za-z0-9._-]*)\b/i,

    // 3. Formats Wave : WAV-..., ULID Wave (26 caractères alphanumériques commençant par 01), IDs Wave T...
    /\b(WAV(?:E)?-[A-Za-z0-9_-]+)\b/i,
    /\b(01[0-9A-HJ-KM-NP-TV-Z]{24})\b/i,
    /\b(T[A-Z0-9]{8,24})\b/,

    // 4. Formats Moov & MTN : Références numériques ou alphanumériques longues
    /(?:trans(?:action)?|r[eé]f[eé]rence|r[eé]f)\s*[:.]?\s*([0-9]{8,20})\b/i,

    // 5. Blocs avec points multiples typiques (ex: PP260926.1234.B56789)
    /\b([A-Z0-9]{2,8}\.[0-9]{4,}\.[A-Z0-9]{3,})\b/i,

    // 6. Chaînes alphanumériques mixtes de 8 à 25 caractères (exclut les simples numéros de 8 chiffres purs)
    /\b(?=[A-Za-z0-9_-]{8,25}\b)(?=[A-Za-z0-9_-]*[A-Za-z])(?=[A-Za-z0-9_-]*[0-9])[A-Za-z0-9._-]+\b/
  ];

  for (const pattern of patterns) {
    const match = cleanMsg.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim().replace(/[.,;:]$/, '');
      if (candidate.length >= 4) {
        return candidate;
      }
    }
  }

  return fallbackKey;
}

/**
 * Vérifie si le message SMS contient le montant spécifié
 * Gère tous les formats : "5 000", "5.000", "5000,00", "5000.00", "5000.0", "5000 FCFA", "5000F", etc.
 */
export function isAmountInSmsMessage(message: string, targetAmount: number): boolean {
  if (!message || targetAmount <= 0) return false;

  const targetRounded = Math.round(targetAmount);
  const targetStr = String(targetRounded);

  // Normaliser tous les types d'espaces Unicode (espaces insécables, tabulations, etc.)
  const normalizedMsg = message.replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ');

  // 1. Recherche directe de la chaîne de chiffres
  if (normalizedMsg.includes(targetStr)) {
    return true;
  }

  // 2. Nettoyage intelligent du texte SMS :
  // a) Élimine les centimes nuls : "5000.00" -> "5000", "5000,00" -> "5000", "200.0" -> "200"
  let cleaned = normalizedMsg.replace(/(\d+)[\.,]0{1,2}(?!\d)/g, '$1');

  // b) Élimine les séparateurs de milliers : "5 000" -> "5000", "5.000" -> "5000", "5,000" -> "5000"
  cleaned = cleaned.replace(/(\d)[\s\.,](\d{3})\b/g, '$1$2');

  if (cleaned.includes(targetStr)) {
    return true;
  }

  // c) Extraction de tous les nombres entiers et comparaison exacte
  const numbersFound = cleaned.match(/\b\d+\b/g);
  if (numbersFound) {
    for (const numStr of numbersFound) {
      const parsed = parseInt(numStr, 10);
      if (parsed === targetRounded) {
        return true;
      }
    }
  }

  // d) Variations formatées usuelles
  if (targetStr.length > 3) {
    const formattedWithSpace = targetStr.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    if (normalizedMsg.includes(formattedWithSpace)) return true;

    const formattedWithDot = targetStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (normalizedMsg.includes(formattedWithDot)) return true;

    const formattedWithComma = targetStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (normalizedMsg.includes(formattedWithComma)) return true;
  }

  return false;
}

/**
 * Extrait le texte brut intégral du SMS et ses métadonnées sans aucune altération
 * Supporte : message, body, text, sms_body, content, msg, sms
 */
export function extractSmsFields(item: any): { message: string; expediteur: string; combined: string } {
  if (!item) {
    return { message: '', expediteur: '', combined: '' };
  }
  if (typeof item === 'string') {
    return { message: item.trim(), expediteur: '', combined: item.trim() };
  }
  const message = String(
    item.message ||
    item.body ||
    item.text ||
    item.sms_body ||
    item.content ||
    item.msg ||
    item.sms ||
    ''
  ).trim();
  const expediteur = String(
    item.expediteur ||
    item.sender ||
    item.from ||
    item.address ||
    item.phone ||
    ''
  ).trim();
  const combined = `${message} ${expediteur}`.trim();
  return { message, expediteur, combined };
}

/**
 * Moteur de réconciliation strict par ID de transaction et Montant :
 * 1. Parcourt chaque SMS en lisant son texte intégral brut (message || body || text).
 * 2. Vérifie dans ce texte brut intégral :
 *    a) Contient la référence / ID de transaction saisie par le client (insensible à la casse, espaces et séparateurs)
 *    b) Contient le montant attendu (ex: 5000, 5 000, 5.000, 5,000)
 * 3. Ne valide JAMAIS sur le seul numéro de téléphone ou le seul montant.
 */
export function matchSmsWithPendingPayment(
  smsKey: string,
  sms: MacroDroidSmsPayload | any,
  expectedAmount: number,
  customerPhone?: string,
  targetTransactionId?: string
): SmsPaymentMatchResult {
  const { message, expediteur, combined } = extractSmsFields(sms);
  const rawFullText = message || combined;

  if (!rawFullText) {
    return {
      matched: false,
      smsId: smsKey,
      rawSms: sms,
      matchedSms: sms,
      extractedAmount: 0,
      transactionReference: smsKey,
      transactionRef: smsKey
    };
  }

  const cleanTxId = (targetTransactionId || '').trim().toLowerCase().replace(/\s+/g, '');

  // Règle 1 : L'ID de transaction de l'opérateur est obligatoire (anti-validation prématurée)
  if (!cleanTxId || cleanTxId.length < 3) {
    return {
      matched: false,
      smsId: smsKey,
      rawSms: sms,
      matchedSms: sms,
      extractedAmount: 0,
      transactionReference: smsKey,
      transactionRef: smsKey
    };
  }

  // Normalisation unicode et suppression des espaces pour la comparaison de l'ID
  const normalizedFullText = rawFullText.replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ');
  const cleanFullText = normalizedFullText.toLowerCase().replace(/\s+/g, '');
  const cleanSmsKey = smsKey.toLowerCase().replace(/\s+/g, '');

  // a) Est-ce que le texte intégral du SMS contient la référence / ID de transaction saisie par le client ?
  // Tolère aussi les différences de séparateurs usuels (ex: tirets vs points)
  const cleanTxAlphanum = cleanTxId.replace(/[^a-z0-9]/g, '');
  const cleanFullTextAlphanum = cleanFullText.replace(/[^a-z0-9]/g, '');

  const idMatched = 
    cleanFullText.includes(cleanTxId) || 
    cleanSmsKey === cleanTxId ||
    (cleanTxAlphanum.length >= 4 && cleanFullTextAlphanum.includes(cleanTxAlphanum)) ||
    (cleanTxAlphanum.length >= 4 && cleanSmsKey.replace(/[^a-z0-9]/g, '') === cleanTxAlphanum);

  if (!idMatched) {
    return {
      matched: false,
      smsId: smsKey,
      rawSms: sms,
      matchedSms: sms,
      extractedAmount: 0,
      transactionReference: smsKey,
      transactionRef: smsKey
    };
  }

  // b) Est-ce que le texte intégral du SMS contient le montant attendu (ex: 5000, 5 000 ou 5.000) ?
  const amountMatched = expectedAmount > 0 ? isAmountInSmsMessage(normalizedFullText, expectedAmount) : true;
  if (!amountMatched) {
    return {
      matched: false,
      smsId: smsKey,
      rawSms: sms,
      matchedSms: sms,
      extractedAmount: 0,
      transactionReference: smsKey,
      transactionRef: smsKey
    };
  }

  const transactionRef = extractTransactionReferenceFromSms(normalizedFullText, targetTransactionId || smsKey);

  return {
    matched: true,
    smsId: smsKey,
    rawSms: sms,
    matchedSms: sms,
    extractedAmount: expectedAmount > 0 ? expectedAmount : 0,
    transactionReference: transactionRef,
    transactionRef: transactionRef,
    matchedPhone: customerPhone
  };
}
