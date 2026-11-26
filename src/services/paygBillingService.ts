/**
 * @file paygBillingService.ts
 * @description Consommation réelle et sécurisée des modules Pay-As-You-Go côté serveur :
 *  1. Utilise d'abord un crédit Pay-As-You-Go pré-acheté dans NaNa Wallet (-1 crédit)
 *  2. Sinon débite directement le solde réel du NaNa Wallet
 *  3. Sinon bloque l'usage et demande une recharge Pay-As-You-Go
 */

export type PaygModuleId =
  | 'cv-pro-ia'
  | 'studio-video-ia'
  | 'escrow-devis-pro'
  | 'salles-vip-live'
  | 'sales-funnel-pro';

export interface PaygConsumeParams {
  ownerKey?: string;
  moduleId: PaygModuleId;
  actionLabel?: string;
  hasActivePaidSubscription?: boolean;
  isSuperAdmin?: boolean;
}

export interface PaygConsumeResult {
  allowed: boolean;
  mode?: 'INCLUDED_IN_PLAN' | 'CREDIT_CONSUMED' | 'WALLET_DEBITED';
  chargedXof?: number;
  remainingCredits?: number;
  newBalance?: number;
  requiredXof?: number;
  currentBalance?: number;
  message?: string;
}

export async function consumePaygModuleUsage(
  params: PaygConsumeParams
): Promise<PaygConsumeResult> {
  if (params.isSuperAdmin || params.hasActivePaidSubscription) {
    return { allowed: true, mode: 'INCLUDED_IN_PLAN', chargedXof: 0 };
  }

  const ownerKey = (params.ownerKey || '').trim();
  if (!ownerKey) {
    return {
      allowed: false,
      message: 'Veuillez vous connecter à votre compte Nanasore pour utiliser ce module Pay-As-You-Go.'
    };
  }

  try {
    const { supabase } = await import('../lib/supabase');
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const res = await fetch('/api/merchant/wallet/payg/consume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({
        ownerKey,
        moduleId: params.moduleId,
        actionLabel: params.actionLabel || ''
      })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      return {
        allowed: true,
        mode: data.mode,
        chargedXof: data.chargedXof ?? 0,
        remainingCredits: data.remainingCredits,
        newBalance: data.newBalance,
        message: data.message
      };
    }

    return {
      allowed: false,
      requiredXof: data.requiredXof,
      currentBalance: data.currentBalance ?? 0,
      message:
        data.error ||
        `Solde Pay-As-You-Go insuffisant (${data.requiredXof || 0} F CFA requis). Rechargez votre NaNa Wallet pour continuer.`
    };
  } catch {
    return {
      allowed: false,
      message: 'Impossible de vérifier votre solde Pay-As-You-Go. Vérifiez votre connexion internet et réessayez.'
    };
  }
}
