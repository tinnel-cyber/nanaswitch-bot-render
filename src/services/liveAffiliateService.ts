/**
 * @file liveAffiliateService.ts
 * @description Reconnaissance des affiliés via lien partagé (?ref=CODE / invitation d'amis),
 * calcul automatique des commissions sur les produits avec affiliation activée,
 * et suivi / paiement des affiliés dans Supabase (`affiliate_commissions`).
 */

import { supabase } from '../lib/supabase';

export interface AffiliateAttribution {
  referrerCode: string;
  referrerPhone?: string;
  capturedAt: number;
  sessionSlug?: string;
}

export interface AffiliateCommissionRecord {
  id: string;
  merchantId: string;
  sessionId?: string;
  productId?: string;
  productName: string;
  referrerCode: string;
  referrerPhone?: string;
  buyerName?: string;
  buyerContact?: string;
  orderAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  currency: string;
  transactionId?: string;
  status: 'pending' | 'paid';
  paidAt?: string;
  createdAt: string;
}

const REF_STORAGE_KEY = 'nana_active_affiliate_ref_v1';
const MY_AFFILIATE_PROFILE_KEY = 'nana_my_affiliate_profile_v1';
const LOCAL_COMMISSIONS_KEY = 'nana_affiliate_commissions_local_v1';
const REF_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

/**
 * Capture automatiquement ?ref=CODE (et optionnellement ?affPhone=...) depuis l'URL.
 */
export function captureAffiliateReferralFromUrl(sessionSlug?: string): AffiliateAttribution | null {
  if (typeof window === 'undefined') return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const refParam = (params.get('ref') || params.get('aff') || '').trim();
    const phoneParam = (params.get('affPhone') || '').trim();

    if (refParam) {
      const attr: AffiliateAttribution = {
        referrerCode: refParam.toUpperCase(),
        referrerPhone: phoneParam || undefined,
        capturedAt: Date.now(),
        sessionSlug,
      };
      localStorage.setItem(REF_STORAGE_KEY, JSON.stringify(attr));
      sessionStorage.setItem(REF_STORAGE_KEY, JSON.stringify(attr));
      return attr;
    }
  } catch {}

  return getActiveAffiliateAttribution();
}

/**
 * Retourne l'affilié actif si un lien de parrainage valide (< 30 jours) a été capturé.
 */
export function getActiveAffiliateAttribution(): AffiliateAttribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(REF_STORAGE_KEY) || localStorage.getItem(REF_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AffiliateAttribution;
    if (!parsed?.referrerCode) return null;
    if (Date.now() - (parsed.capturedAt || 0) > REF_TTL_MS) {
      localStorage.removeItem(REF_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Mémorise le profil affilié de l'utilisateur courant (son code + son téléphone Mobile Money).
 */
export function getSavedAffiliateProfile(): { code: string; phone: string } {
  if (typeof window === 'undefined') return { code: '', phone: '' };
  try {
    const raw = localStorage.getItem(MY_AFFILIATE_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { code: '', phone: '' };
}

export function saveAffiliateProfile(code: string, phone: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      MY_AFFILIATE_PROFILE_KEY,
      JSON.stringify({ code: code.trim().toUpperCase(), phone: phone.trim() })
    );
  } catch {}
}

/**
 * Construit le lien de partage affilié sur `https://nsore.shop/live/{slug}?ref=CODE`
 */
export function buildAffiliateLiveLink(
  sessionSlug: string,
  affiliateCode: string,
  affiliatePhone?: string
): string {
  const cleanSlug = (sessionSlug || 'direct').trim();
  const cleanCode = affiliateCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const base = `https://nsore.shop/live/${encodeURIComponent(cleanSlug)}`;
  if (!cleanCode) return base;
  const qs = new URLSearchParams({ ref: cleanCode });
  if (affiliatePhone && affiliatePhone.trim()) {
    qs.set('affPhone', affiliatePhone.trim());
  }
  return `${base}?${qs.toString()}`;
}

function saveLocalCommission(rec: AffiliateCommissionRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_COMMISSIONS_KEY);
    const list: AffiliateCommissionRecord[] = raw ? JSON.parse(raw) : [];
    const updated = [rec, ...list.filter((c) => c.id !== rec.id)].slice(0, 200);
    localStorage.setItem(LOCAL_COMMISSIONS_KEY, JSON.stringify(updated));
  } catch {}
}

/**
 * Enregistre une commission affiliée réelle suite à une commande validée,
 * uniquement si un affilié est attribué et que l'affiliation est activée sur le produit.
 */
export async function recordAffiliateSaleCommission(params: {
  merchantId: string;
  sessionId?: string;
  productId?: string;
  productName: string;
  orderAmount: number;
  commissionPercent: number;
  buyerName?: string;
  buyerContact?: string;
  transactionId?: string;
}): Promise<AffiliateCommissionRecord | null> {
  const attribution = getActiveAffiliateAttribution();
  if (!attribution || !attribution.referrerCode) return null;
  if (params.orderAmount <= 0 || params.commissionPercent <= 0) return null;

  const commissionAmount = Math.round((params.orderAmount * params.commissionPercent) / 100);
  if (commissionAmount <= 0) return null;

  const localRecord: AffiliateCommissionRecord = {
    id: `aff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    merchantId: params.merchantId || 'boutique',
    sessionId: params.sessionId,
    productId: params.productId,
    productName: params.productName,
    referrerCode: attribution.referrerCode,
    referrerPhone: attribution.referrerPhone,
    buyerName: params.buyerName,
    buyerContact: params.buyerContact,
    orderAmount: params.orderAmount,
    commissionPercent: params.commissionPercent,
    commissionAmount,
    currency: 'XOF',
    transactionId: params.transactionId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  saveLocalCommission(localRecord);

  try {
    const { data, error } = await supabase
      .from('affiliate_commissions')
      .insert({
        merchant_id: localRecord.merchantId,
        session_id: localRecord.sessionId || null,
        product_id: localRecord.productId || null,
        product_name: localRecord.productName,
        referrer_code: localRecord.referrerCode,
        referrer_phone: localRecord.referrerPhone || null,
        buyer_name: localRecord.buyerName || null,
        buyer_contact: localRecord.buyerContact || null,
        order_amount: localRecord.orderAmount,
        commission_percent: localRecord.commissionPercent,
        commission_amount: localRecord.commissionAmount,
        currency: 'XOF',
        transaction_id: localRecord.transactionId || null,
        status: 'pending',
      })
      .select()
      .maybeSingle();

    if (!error && data?.id) {
      localRecord.id = data.id;
      saveLocalCommission(localRecord);
    }
  } catch (err) {
    console.warn('[liveAffiliateService] Supabase insert warning:', err);
  }

  return localRecord;
}

/**
 * Charge la liste des commissions d'affiliation pour le vendeur (tableau de paiement).
 */
export async function listMerchantAffiliateCommissions(
  merchantId: string
): Promise<AffiliateCommissionRecord[]> {
  try {
    const { data, error } = await supabase
      .from('affiliate_commissions')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && Array.isArray(data)) {
      return data.map((r: any) => ({
        id: r.id,
        merchantId: r.merchant_id,
        sessionId: r.session_id || undefined,
        productId: r.product_id || undefined,
        productName: r.product_name,
        referrerCode: r.referrer_code,
        referrerPhone: r.referrer_phone || undefined,
        buyerName: r.buyer_name || undefined,
        buyerContact: r.buyer_contact || undefined,
        orderAmount: Number(r.order_amount) || 0,
        commissionPercent: Number(r.commission_percent) || 10,
        commissionAmount: Number(r.commission_amount) || 0,
        currency: r.currency || 'XOF',
        transactionId: r.transaction_id || undefined,
        status: r.status === 'paid' ? 'paid' : 'pending',
        paidAt: r.paid_at || undefined,
        createdAt: r.created_at,
      }));
    }
  } catch {}

  // Fallback local
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_COMMISSIONS_KEY);
      if (raw) {
        const list: AffiliateCommissionRecord[] = JSON.parse(raw);
        return list.filter((c) => !merchantId || c.merchantId === merchantId);
      }
    } catch {}
  }
  return [];
}

/**
 * Marque une commission affiliée comme payée (après virement Mobile Money au partenaire).
 */
export async function markAffiliateCommissionPaid(commissionId: string): Promise<void> {
  const paidAt = new Date().toISOString();

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_COMMISSIONS_KEY);
      if (raw) {
        const list: AffiliateCommissionRecord[] = JSON.parse(raw);
        const updated = list.map((c) =>
          c.id === commissionId ? { ...c, status: 'paid' as const, paidAt } : c
        );
        localStorage.setItem(LOCAL_COMMISSIONS_KEY, JSON.stringify(updated));
      }
    } catch {}
  }

  try {
    await supabase
      .from('affiliate_commissions')
      .update({ status: 'paid', paid_at: paidAt })
      .eq('id', commissionId);
  } catch (err) {
    console.warn('[liveAffiliateService] markAffiliateCommissionPaid warning:', err);
  }
}

/**
 * Charge les commissions d'affiliation en temps réel pour un affilié (acheteur / étudiant) par son code.
 */
export async function listAffiliateCommissionsByCode(
  referrerCode: string
): Promise<AffiliateCommissionRecord[]> {
  const cleanCode = (referrerCode || '').trim().toUpperCase();
  if (!cleanCode) return [];

  try {
    const { data, error } = await supabase
      .from('affiliate_commissions')
      .select('*')
      .eq('referrer_code', cleanCode)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && Array.isArray(data)) {
      return data.map((r: any) => ({
        id: r.id,
        merchantId: r.merchant_id,
        sessionId: r.session_id || undefined,
        productId: r.product_id || undefined,
        productName: r.product_name,
        referrerCode: r.referrer_code,
        referrerPhone: r.referrer_phone || undefined,
        buyerName: r.buyer_name || undefined,
        buyerContact: r.buyer_contact || undefined,
        orderAmount: Number(r.order_amount) || 0,
        commissionPercent: Number(r.commission_percent) || 10,
        commissionAmount: Number(r.commission_amount) || 0,
        currency: r.currency || 'XOF',
        transactionId: r.transaction_id || undefined,
        status: r.status === 'paid' ? 'paid' : 'pending',
        paidAt: r.paid_at || undefined,
        createdAt: r.created_at,
      }));
    }
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_COMMISSIONS_KEY);
      if (raw) {
        const list: AffiliateCommissionRecord[] = JSON.parse(raw);
        return list.filter((c) => c.referrerCode?.toUpperCase() === cleanCode);
      }
    } catch {}
  }
  return [];
}

/**
 * Abonnement Supabase Realtime aux gains de l'affilié (Mini-Wallet acheteur/étudiant en direct).
 */
export function subscribeAffiliateCommissionsByCode(
  referrerCode: string,
  onUpdate: (records: AffiliateCommissionRecord[]) => void
): () => void {
  const cleanCode = (referrerCode || '').trim().toUpperCase();
  if (!cleanCode) {
    onUpdate([]);
    return () => {};
  }

  let active = true;
  const refresh = () => {
    listAffiliateCommissionsByCode(cleanCode).then((rows) => {
      if (active) onUpdate(rows);
    });
  };

  refresh();

  const channel = supabase
    .channel(`affiliate_wallet_${cleanCode}_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'affiliate_commissions',
        filter: `referrer_code=eq.${cleanCode}`,
      },
      () => {
        refresh();
      }
    )
    .subscribe();

  const pollTimer = setInterval(refresh, 15000);

  return () => {
    active = false;
    clearInterval(pollTimer);
    supabase.removeChannel(channel);
  };
}

