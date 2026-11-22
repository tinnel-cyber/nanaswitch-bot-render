/**
 * @file affiliateTrackingService.ts
 * @description Service client unifié du Studio d'Affiliation (SaaS + Produits + Tunnels + Formations).
 * - Capture automatique de ?ref=CODE / ?aff=CODE / ?parrain=CODE sur toutes les pages (TTL 30 jours)
 * - Rattachement des nouvelles boutiques/comptes lors de l'inscription SaaS
 * - Chargement temps réel du Hub Unifié (/api/affiliate/hub/:code)
 * - Retraits Mobile Money & Transfert instantané vers NaNa Wallet Marchand
 * - Synchronisation Super-Admin (taux + validation des retraits)
 */

export type AffiliateChannel = 'SAAS' | 'PRODUCT' | 'FUNNEL' | 'COURSE';

export interface UnifiedAffiliateCommission {
  id: string;
  affiliateHandle: string;
  referrerCode: string;
  channel: AffiliateChannel;
  productName: string;
  orderRef: string;
  tenantId?: string;
  customerName?: string;
  operator?: string;
  orderTotal: number;
  commissionRate: number;
  commissionAmount: number;
  currency: string;
  status: 'CREDITED' | 'PAID';
  createdAt: string;
}

export interface UnifiedAffiliateReferral {
  storeId: string;
  storeName: string;
  ownerName: string;
  ownerEmail?: string;
  referrerCode: string;
  registeredAt: number;
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED';
  commissionGenerated: number;
}

export interface UnifiedAffiliateWithdrawal {
  id: string;
  affiliateId: string;
  affiliateCode?: string;
  affiliateName: string;
  phone: string;
  amount: number;
  provider: 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'NANA_WALLET';
  status: 'PENDING' | 'PAID' | 'REJECTED';
  createdAt: number;
  processedAt?: number;
  adminNotes?: string;
}

export interface AffiliateStudioSettings {
  starterRate: number;
  proRate: number;
  proThreshold: number;
  eliteRate: number;
  eliteThreshold: number;
  defaultProductRate: number;
  defaultFunnelRate: number;
  defaultCourseRate: number;
  minWithdrawalXof: number;
  minWalletTransferXof: number;
  updatedAt?: string;
}

export interface UnifiedAffiliateHubResponse {
  success: boolean;
  affiliateCode: string;
  tier: {
    name: string;
    rate: number;
    nextTier: string | null;
    neededForNext: number;
    progress: number;
  };
  settings: AffiliateStudioSettings;
  totalEarned: number;
  withdrawnPaid: number;
  pendingWithdrawals: number;
  availableBalance: number;
  byChannel: Record<AffiliateChannel, { count: number; sales: number; commission: number }>;
  referredStores: UnifiedAffiliateReferral[];
  commissions: UnifiedAffiliateCommission[];
  withdrawals: UnifiedAffiliateWithdrawal[];
}

const SAAS_REF_STORAGE_KEY = 'nana_saas_referral_attribution_v1';
const REF_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

interface StoredReferral {
  code: string;
  capturedAt: number;
  landingPath?: string;
}

export function normalizeReferralCode(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^@/, '')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');
}

/**
 * Capture automatiquement ?ref=CODE, ?aff=CODE ou ?parrain=CODE depuis l'URL courante.
 * À appeler au montage de l'application (App.tsx) et des pages publiques.
 */
export function captureSaasReferralFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('ref') || params.get('aff') || params.get('parrain') || '';
    const clean = normalizeReferralCode(raw);
    if (clean && clean.length >= 2) {
      const payload: StoredReferral = {
        code: clean,
        capturedAt: Date.now(),
        landingPath: window.location.pathname,
      };
      localStorage.setItem(SAAS_REF_STORAGE_KEY, JSON.stringify(payload));
      sessionStorage.setItem(SAAS_REF_STORAGE_KEY, JSON.stringify(payload));
      return clean;
    }
  } catch {}
  return getCapturedSaasReferral();
}

/**
 * Retourne le code parrain actif (valide 30 jours) s'il existe.
 */
export function getCapturedSaasReferral(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      sessionStorage.getItem(SAAS_REF_STORAGE_KEY) ||
      localStorage.getItem(SAAS_REF_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReferral;
    if (!parsed?.code) return null;
    if (Date.now() - (parsed.capturedAt || 0) > REF_TTL_MS) {
      localStorage.removeItem(SAAS_REF_STORAGE_KEY);
      sessionStorage.removeItem(SAAS_REF_STORAGE_KEY);
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
}

export function saveManualSaasReferral(code: string): string | null {
  const clean = normalizeReferralCode(code);
  if (!clean || typeof window === 'undefined') return null;
  try {
    const payload: StoredReferral = { code: clean, capturedAt: Date.now() };
    localStorage.setItem(SAAS_REF_STORAGE_KEY, JSON.stringify(payload));
    sessionStorage.setItem(SAAS_REF_STORAGE_KEY, JSON.stringify(payload));
    return clean;
  } catch {
    return null;
  }
}

export function clearCapturedSaasReferral(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SAAS_REF_STORAGE_KEY);
    sessionStorage.removeItem(SAAS_REF_STORAGE_KEY);
  } catch {}
}

/**
 * Rattache une nouvelle boutique / un nouvel inscrit à son parrain SaaS côté serveur & Cloud.
 */
export async function registerSaasReferralOnSignup(params: {
  storeId: string;
  storeName: string;
  ownerName: string;
  ownerEmail?: string;
  explicitCode?: string;
}): Promise<boolean> {
  const refCode = normalizeReferralCode(params.explicitCode || getCapturedSaasReferral() || '');
  if (!refCode || !params.storeId) return false;
  try {
    const res = await fetch('/api/affiliate/register-referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrerCode: refCode,
        storeId: params.storeId,
        storeName: params.storeName,
        ownerName: params.ownerName,
        ownerEmail: params.ownerEmail || '',
      }),
    });
    const data = await res.json();
    return Boolean(data?.success);
  } catch {
    return false;
  }
}

/**
 * Charge l'ensemble du Hub Unifié d'Affiliation (4 canaux + filleuls + retraits + solde réel).
 */
export async function fetchUnifiedAffiliateHub(
  affiliateCode: string
): Promise<UnifiedAffiliateHubResponse | null> {
  const clean = normalizeReferralCode(affiliateCode);
  if (!clean) return null;
  try {
    const res = await fetch(`/api/affiliate/hub/${encodeURIComponent(clean)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.success ? (data as UnifiedAffiliateHubResponse) : null;
  } catch {
    return null;
  }
}

/**
 * Soumet une demande de retrait Mobile Money sécurisée côté serveur.
 */
export async function submitAffiliateWithdrawalRequest(params: {
  affiliateCode: string;
  affiliateId?: string;
  affiliateName: string;
  phone: string;
  amount: number;
  provider: 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY';
  accountName?: string;
}): Promise<{ success: boolean; withdrawal?: UnifiedAffiliateWithdrawal; availableBalance?: number; error?: string }> {
  try {
    const res = await fetch('/api/affiliate/withdrawals/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur réseau lors de la demande de retrait.' };
  }
}

/**
 * Transfère instantanément tout ou partie des commissions affiliées vers NaNa Wallet Marchand.
 */
export async function transferAffiliateToNanaWallet(params: {
  affiliateCode: string;
  universeId: string;
  affiliateName: string;
  amount: number;
}): Promise<{
  success: boolean;
  transfer?: UnifiedAffiliateWithdrawal;
  availableBalance?: number;
  newWalletBalanceXof?: number | null;
  error?: string;
}> {
  try {
    const res = await fetch('/api/affiliate/transfer-to-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur réseau lors du transfert vers NaNa Wallet.' };
  }
}

export async function fetchAffiliateStudioSettings(): Promise<AffiliateStudioSettings | null> {
  try {
    const res = await fetch('/api/affiliate/settings');
    if (!res.ok) return null;
    const data = await res.json();
    return data?.success ? (data.settings as AffiliateStudioSettings) : null;
  } catch {
    return null;
  }
}

export async function updateAffiliateStudioSettings(
  patch: Partial<AffiliateStudioSettings>
): Promise<AffiliateStudioSettings | null> {
  try {
    const res = await fetch('/api/affiliate/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.success ? (data.settings as AffiliateStudioSettings) : null;
  } catch {
    return null;
  }
}

export async function fetchAdminAffiliateWithdrawals(): Promise<{
  withdrawals: UnifiedAffiliateWithdrawal[];
  settings: AffiliateStudioSettings | null;
}> {
  try {
    const res = await fetch('/api/admin/affiliate/withdrawals');
    if (!res.ok) return { withdrawals: [], settings: null };
    const data = await res.json();
    return {
      withdrawals: Array.isArray(data?.withdrawals) ? data.withdrawals : [],
      settings: data?.settings || null,
    };
  } catch {
    return { withdrawals: [], settings: null };
  }
}

export async function updateAdminAffiliateWithdrawalStatus(
  withdrawalId: string,
  status: 'PAID' | 'REJECTED',
  adminNotes?: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/affiliate/withdrawals/${encodeURIComponent(withdrawalId)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes }),
    });
    const data = await res.json();
    return Boolean(data?.success);
  } catch {
    return false;
  }
}
