/**
 * Service d'Affiliation & Partenaires Nanasore
 * 
 * 1. Double Affiliation Plateforme Nanasore :
 *    - Plan Partenaire : 15% à vie récurrent, évolutif (jusqu'à 30% selon le volume de partenaires apportés).
 *    - Plan Affilié : 40% One-shot en paiement unique sur le premier abonnement/produit.
 * 
 * 2. Programme "Affilié du Tenant" (Marchands & Formateurs) :
 *    - Inscription par formulaire dédié pour devenir ambassadeur du tenant.
 *    - Rémunération personnalisée sur les cours, produits, webinaires et live shopping du tenant.
 */

import { getSupabaseClient } from './supabase';

export type PlatformAffiliateType = 'PARTNER_LIFETIME' | 'AFFILIATE_ONESHOT';

export interface TenantAffiliate {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  whatsapp_number: string;
  affiliate_code: string;
  custom_commission_rate?: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  payout_channel: string;
  payout_account_details: string;
  total_sales_count: number;
  total_sales_amount: number;
  total_commissions_earned: number;
  total_commissions_paid: number;
  created_at: string;
  updated_at?: string;
}

export interface TenantAffiliateSale {
  id: string;
  tenant_id: string;
  affiliate_id: string;
  item_type: 'course' | 'product' | 'webinar' | 'live_shopping' | 'funnel';
  item_id?: string | null;
  item_title: string;
  buyer_email?: string | null;
  sale_amount: number;
  commission_rate: number;
  commission_amount: number;
  payout_status: 'pending' | 'approved' | 'paid' | 'refunded';
  created_at: string;
}

// ---------------------------------------------------------------------------
// 1. AFFILIATION PLATEFORME NANASORE (PARTENAIRE 15% À VIE VS AFFILIÉ 40% ONESHOT)
// ---------------------------------------------------------------------------

/**
 * Construit l'URL d'affiliation officielle liée au tenant parrain.
 * Ce lien est injecté sur le badge "Propulsé par Nanasore".
 */
export function getAffiliateUrl(tenantSlug: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://nanasore.com').replace(/\/$/, '');
  const cleanSlug = encodeURIComponent(tenantSlug.trim().toLowerCase());
  return `${baseUrl}/ref/${cleanSlug}`;
}

/**
 * Calcule le taux de commission du Plan Partenaire en fonction du nombre de filleuls actifs.
 * - 0 à 4 partenaires  : 15% (taux de base)
 * - 5 à 14 partenaires : 20%
 * - 15 à 29 partenaires: 25%
 * - 30+ partenaires    : 30%
 */
export function calculatePartnerTierRate(activeReferralsCount: number): number {
  if (activeReferralsCount >= 30) return 30.0;
  if (activeReferralsCount >= 15) return 25.0;
  if (activeReferralsCount >= 5) return 20.0;
  return 15.0;
}

/**
 * Enregistre l'attribution d'un nouveau compte/tenant à son parrain.
 */
export async function linkTenantToReferrer(
  referredTenantId: string,
  referrerSlugOrId: string
): Promise<{ success: boolean; referrerId?: string; error?: string }> {
  const supabase = getSupabaseClient(true);

  try {
    const { data, error } = await supabase.rpc('register_tenant_referral', {
      p_referred_tenant_id: referredTenantId,
      p_referrer_identifier: referrerSlugOrId,
    });

    if (error) {
      console.error('[Affiliate] Erreur attribution parrainage:', error.message);
      return { success: false, error: error.message };
    }

    return {
      success: data?.success ?? false,
      referrerId: data?.referrer_id,
      error: data?.error,
    };
  } catch (err: any) {
    console.error('[Affiliate] Exception attribution:', err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Rémunère automatiquement le tenant parrain selon son type de plan :
 * - Plan Partenaire : 15% à vie évolutif sur chaque récurrence
 * - Plan Affilié : 40% One-shot en paiement unique sur le premier versement
 */
export async function creditAffiliateCommission({
  referredTenantId,
  amount,
  eventType,
  description = 'Commission d\'affiliation Nanasore',
}: {
  referredTenantId: string;
  amount: number;
  eventType: 'SUBSCRIPTION_PAYMENT' | 'MODULE_PURCHASE' | 'PLAN_RENEWAL';
  description?: string;
}): Promise<{
  success: boolean;
  commissionAmount?: number;
  commissionRate?: number;
  programType?: PlatformAffiliateType;
  referrerId?: string;
  error?: string;
}> {
  if (amount <= 0) return { success: false, error: 'Montant invalide' };

  const supabase = getSupabaseClient(true);

  try {
    const { data, error } = await supabase.rpc('process_affiliate_commission', {
      p_referred_tenant_id: referredTenantId,
      p_gross_amount: amount,
      p_event_type: eventType,
      p_description: description,
    });

    if (error) {
      console.error('[Affiliate] Erreur versement commission:', error.message);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.message || data?.error };
    }

    return {
      success: true,
      commissionAmount: data.commission_amount,
      commissionRate: data.commission_rate,
      programType: data.program_type,
      referrerId: data.referrer_id,
    };
  } catch (err: any) {
    console.error('[Affiliate] Exception versement commission:', err?.message);
    return { success: false, error: err?.message };
  }
}

// ---------------------------------------------------------------------------
// 2. PROGRAMME "AFFILIÉ DU TENANT" (MARCHANDS & FORMATEURS)
// ---------------------------------------------------------------------------

/**
 * Génère le lien affilié personnalisé pour un produit ou cours d'un tenant spécifique.
 * Ex: https://academie-client.com/courses/formation-ia?taf=ALEX10
 */
export function getTenantAffiliatePromotionUrl(
  baseTenantDomain: string,
  affiliateCode: string,
  targetPath: string = ''
): string {
  const protocol = baseTenantDomain.includes('localhost') ? 'http' : 'https';
  const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  const separator = cleanPath.includes('?') ? '&' : '?';
  return `${protocol}://${baseTenantDomain}${cleanPath}${separator}taf=${encodeURIComponent(affiliateCode.toUpperCase())}`;
}

/**
 * Enregistre la candidature d'un ambassadeur/affilié auprès d'un tenant donné.
 * Déclenché par le formulaire de souscription du tenant (/affiliates/join).
 */
export async function registerTenantAffiliateApplicant({
  tenantId,
  fullName,
  email,
  whatsappNumber,
  affiliateCode,
  payoutChannel = 'Wave / Orange Money',
  payoutAccountDetails = '',
}: {
  tenantId: string;
  fullName: string;
  email: string;
  whatsappNumber: string;
  affiliateCode: string;
  payoutChannel?: string;
  payoutAccountDetails?: string;
}): Promise<{ success: boolean; affiliate?: TenantAffiliate; error?: string }> {
  const supabase = getSupabaseClient(true);
  const cleanCode = affiliateCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');

  if (!cleanCode || cleanCode.length < 3) {
    return { success: false, error: 'Le code d\'affiliation doit comporter au moins 3 caractères alphanumériques.' };
  }

  try {
    // 1. Récupération des préférences du tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, tenant_affiliate_default_rate, tenant_affiliate_auto_approve')
      .eq('id', tenantId)
      .single();

    const defaultRate = tenant?.tenant_affiliate_default_rate ?? 15.0;
    const initialStatus = tenant?.tenant_affiliate_auto_approve ? 'approved' : 'pending';

    // 2. Insertion de l'affilié
    const { data, error } = await supabase
      .from('tenant_affiliates')
      .insert({
        tenant_id: tenantId,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        whatsapp_number: whatsappNumber.trim(),
        affiliate_code: cleanCode,
        custom_commission_rate: defaultRate,
        status: initialStatus,
        payout_channel: payoutChannel,
        payout_account_details: payoutAccountDetails.trim(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Ce code ou cette adresse e-mail est déjà utilisé(e) dans le programme d\'affiliation de cette boutique.',
        };
      }
      return { success: false, error: error.message };
    }

    return {
      success: true,
      affiliate: data as TenantAffiliate,
    };
  } catch (err: any) {
    console.error('[Tenant Affiliate] Erreur inscription:', err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Récupère le profil d'un affilié du tenant via son code et son tenant_id.
 */
export async function getTenantAffiliateByCode(
  tenantId: string,
  affiliateCode: string
): Promise<TenantAffiliate | null> {
  const supabase = getSupabaseClient(true);

  try {
    const { data, error } = await supabase
      .from('tenant_affiliates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('affiliate_code', affiliateCode.toUpperCase())
      .maybeSingle();

    if (error || !data) return null;
    return data as TenantAffiliate;
  } catch {
    return null;
  }
}

/**
 * Rémunère l'affilié du tenant lors d'une vente de cours, produit, webinaire ou live shopping.
 */
export async function recordTenantAffiliateSale({
  tenantId,
  affiliateCode,
  itemType,
  itemTitle,
  saleAmount,
  buyerEmail,
  itemId,
}: {
  tenantId: string;
  affiliateCode: string;
  itemType: 'course' | 'product' | 'webinar' | 'live_shopping' | 'funnel';
  itemTitle: string;
  saleAmount: number;
  buyerEmail?: string;
  itemId?: string;
}): Promise<{ success: boolean; commissionAmount?: number; affiliateName?: string; error?: string }> {
  if (!affiliateCode || saleAmount <= 0) return { success: false, error: 'Paramètres invalides' };

  const supabase = getSupabaseClient(true);

  try {
    const { data, error } = await supabase.rpc('record_tenant_affiliate_sale', {
      p_tenant_id: tenantId,
      p_affiliate_code: affiliateCode,
      p_item_type: itemType,
      p_item_title: itemTitle,
      p_sale_amount: saleAmount,
      p_buyer_email: buyerEmail || null,
      p_item_id: itemId || null,
    });

    if (error) {
      console.error('[Tenant Affiliate Sale] Erreur enregistrement:', error.message);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error };
    }

    return {
      success: true,
      commissionAmount: data.commission_amount,
      affiliateName: data.affiliate_name,
    };
  } catch (err: any) {
    console.error('[Tenant Affiliate Sale] Exception:', err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Récupère l'ensemble des affiliés d'un tenant pour son tableau de bord de gestion.
 */
export async function getTenantAffiliatesList(tenantId: string): Promise<TenantAffiliate[]> {
  const supabase = getSupabaseClient(true);

  try {
    const { data, error } = await supabase
      .from('tenant_affiliates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('total_sales_amount', { ascending: false });

    if (error) return [];
    return (data || []) as TenantAffiliate[];
  } catch {
    return [];
  }
}
