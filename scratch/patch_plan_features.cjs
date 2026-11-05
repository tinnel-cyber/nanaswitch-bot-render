const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('src/utils/planFeatures.ts');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Remplacer DEFAULT_PLAN_LIMITS
const oldLimits = `export const DEFAULT_PLAN_LIMITS: Record<string, PlanLimitsDefinition> = {
  free: {
    maxProducts: 3,
    maxFunnels: 1,
    maxCourses: 1,
    maxLiveCallsMonthly: 3,
    maxDocuments: 1,
    maxCashiers: 1
  },
  starter: {
    maxProducts: 100,
    maxFunnels: 5,
    maxCourses: 5,
    maxLiveCallsMonthly: 20,
    maxDocuments: 50,
    maxCashiers: 2
  },
  pro: {
    maxProducts: -1,
    maxFunnels: -1,
    maxCourses: -1,
    maxLiveCallsMonthly: -1,
    maxDocuments: -1,
    maxCashiers: 10
  },
  elite: {
    maxProducts: -1,
    maxFunnels: -1,
    maxCourses: -1,
    maxLiveCallsMonthly: -1,
    maxDocuments: -1,
    maxCashiers: -1
  }
};`;

const newLimits = `export const DEFAULT_PLAN_LIMITS: Record<string, PlanLimitsDefinition> = {
  free: {
    maxProducts: 3,
    maxFunnels: 1,
    maxCourses: 1,
    maxLiveCallsMonthly: 3,
    maxDocuments: 0, // RÈGLE CRITIQUE : CV Pro strictement exclu du Plan Zéro / Gratuit
    maxCashiers: 1
  },
  'plan-zero': {
    maxProducts: 3,
    maxFunnels: 1,
    maxCourses: 1,
    maxLiveCallsMonthly: 3,
    maxDocuments: 0, // RÈGLE CRITIQUE : CV Pro strictement exclu du Plan Zéro
    maxCashiers: 1
  },
  'plan-creator-commission': {
    maxProducts: 50,
    maxFunnels: 3,
    maxCourses: 3,
    maxLiveCallsMonthly: 10,
    maxDocuments: 0, // Facturé à l'usage sur portefeuille
    maxCashiers: 1
  },
  'plan-pay-as-you-go': {
    maxProducts: 10,
    maxFunnels: 2,
    maxCourses: 2,
    maxLiveCallsMonthly: 5,
    maxDocuments: 0, // Soumis au solde de crédits wallets
    maxCashiers: 2
  },
  starter: {
    maxProducts: 100,
    maxFunnels: 5,
    maxCourses: 5,
    maxLiveCallsMonthly: 20,
    maxDocuments: 50,
    maxCashiers: 2
  },
  'plan-business': {
    maxProducts: 500,
    maxFunnels: 20,
    maxCourses: 20,
    maxLiveCallsMonthly: 50,
    maxDocuments: 100,
    maxCashiers: 20
  },
  pro: {
    maxProducts: -1,
    maxFunnels: -1,
    maxCourses: -1,
    maxLiveCallsMonthly: -1,
    maxDocuments: -1,
    maxCashiers: 10
  },
  'plan-pro': {
    maxProducts: -1,
    maxFunnels: -1,
    maxCourses: -1,
    maxLiveCallsMonthly: -1,
    maxDocuments: -1,
    maxCashiers: 10
  },
  elite: {
    maxProducts: -1,
    maxFunnels: -1,
    maxCourses: -1,
    maxLiveCallsMonthly: -1,
    maxDocuments: -1,
    maxCashiers: -1
  },
  'plan-enterprise': {
    maxProducts: -1,
    maxFunnels: -1,
    maxCourses: -1,
    maxLiveCallsMonthly: -1,
    maxDocuments: -1,
    maxCashiers: -1
  }
};`;

content = content.replace(oldLimits, newLimits);

// 2. Mettre à jour normalizePlanId
const oldNormalize = `  const plan = String(raw || '').toLowerCase().trim();
  if (plan.includes('pro')) return 'pro';
  if (plan.includes('elite')) return 'elite';
  if (plan.includes('starter')) return 'starter';
  if (plan === 'free' || plan === 'free_trial' || plan === 'trial' || !plan) {
    return 'free';
  }
  return 'free';`;

const newNormalize = `  const plan = String(raw || '').toLowerCase().trim();
  if (plan.includes('enterprise') || plan.includes('elite')) return 'elite';
  if (plan.includes('business')) return 'starter';
  if (plan.includes('starter')) return 'starter';
  if (plan.includes('creator') || plan.includes('commission')) return 'plan-creator-commission';
  if (plan.includes('pay-as-you-go') || plan.includes('pay_as_you_go') || plan.includes('usage')) return 'plan-pay-as-you-go';
  if (plan.includes('pro')) return 'pro';
  if (plan.includes('zero') || plan === 'free' || plan === 'free_trial' || plan === 'trial' || !plan) {
    return 'free';
  }
  return 'free';`;

content = content.replace(oldNormalize, newNormalize);

// 3. Ajouter la fonction spécifique canAccessCvPro
const cvProFunction = `
/**
 * RÈGLE CRITIQUE D'AUTORISATION CV PRO :
 * Le module CV Pro (mod-cvpro / usage-cvpro) est STRICTEMENT EXCLU du Plan Zéro.
 * - Inclus sur les abonnements payants (Pro, Business, Enterprise, Starter).
 * - Autorisé via débit de crédits pour le Plan Usage (Pay-As-You-Go).
 * - Bloqué formellement sur le Plan Zéro gratuit.
 */
export interface CvProAccessResult {
  allowed: boolean;
  reason: 'SUBSCRIPTION_INCLUDED' | 'WALLET_CREDITS' | 'BLOCKED_PLAN_ZERO' | 'INSUFFICIENT_CREDITS';
  message: string;
}

export function canAccessCvPro(
  subscription?: StoreSubscription | StoreUser | string | null | undefined,
  walletCreditBalance: number = 0
): CvProAccessResult {
  // Super Admin toujours exempté
  if (isSuperAdminLocally(typeof subscription === 'object' ? subscription as any : null)) {
    return {
      allowed: true,
      reason: 'SUBSCRIPTION_INCLUDED',
      message: 'Accès illimité Super-Administrateur.'
    };
  }

  const planId = normalizePlanId(subscription);

  // 1. Abonnements payants récurrents : Débloqué sans surcoût
  if (planId === 'pro' || planId === 'elite' || planId === 'starter') {
    return {
      allowed: true,
      reason: 'SUBSCRIPTION_INCLUDED',
      message: 'Module CV Pro inclus dans votre formule d\\'abonnement.'
    };
  }

  // 2. Mode Pay-As-You-Go ou solde de crédits disponible (>= 5 crédits ou >= 500 XOF)
  if (planId === 'plan-pay-as-you-go' || walletCreditBalance >= 5) {
    if (walletCreditBalance >= 5) {
      return {
        allowed: true,
        reason: 'WALLET_CREDITS',
        message: 'Accès autorisé via débit de 5 crédits sur votre portefeuille (Wallet).'
      };
    }
    return {
      allowed: false,
      reason: 'INSUFFICIENT_CREDITS',
      message: 'Solde insuffisant sur votre portefeuille. Recharger 5 crédits (500 F CFA) pour exporter votre CV Pro.'
    };
  }

  // 3. Plan Zéro / Gratuit : Bloqué formellement
  return {
    allowed: false,
    reason: 'BLOCKED_PLAN_ZERO',
    message: 'Le module CV Pro n\\'est pas inclus dans le Plan Zéro gratuit. Passez au Plan Pro ou activez la formule Pay-As-You-Go (500 F CFA / CV).'
  };
}
`;

if (!content.includes('canAccessCvPro')) {
  content += '\n' + cvProFunction;
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('✓ planFeatures.ts mis à jour avec le blocage CV Pro sur le Plan Zéro');
