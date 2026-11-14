import { supabase } from '../lib/supabase';
import { StoreSubscription } from '../types';

export type MarketingChannel = 'DESCRIPTION' | 'WAMEET_REELS' | 'SOCIAL_FEED' | 'WAMEET_CLOSING';

export interface GenerateMarketingRequest {
  productName: string;
  keyFeatures?: string;
  channel: MarketingChannel;
  storeName?: string;
  price?: number;
  userId?: string;
}

export interface MarketingQuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
}

export const FREE_MARKETING_QUOTA_LIMIT = 5;

/**
 * Vérifie si le commerçant dispose d'un forfait Pro actif
 */
export function checkIsMerchantPro(
  subscription?: StoreSubscription | null
): boolean {
  if (!subscription) {
    try {
      const saved = localStorage.getItem('nana_store_sub');
      if (saved) {
        subscription = JSON.parse(saved);
      }
    } catch {
      // Ignorer
    }
  }

  if (!subscription) return false;

  const status = (subscription.status || '').toLowerCase();
  const plan = (subscription.plan || '').toLowerCase();

  const isProPlan =
    status === 'active' ||
    plan === 'pro' ||
    plan.includes('pro') ||
    plan === 'monthly_1' ||
    plan === 'quarterly_3' ||
    plan === 'semester_6' ||
    plan === 'annual_12';

  const isNotExpired = !subscription.expiresAt || subscription.expiresAt > Date.now();

  return Boolean(isProPlan && isNotExpired);
}

/**
 * Récupère le statut de quota marketing du commerçant
 */
export async function getMarketingQuota(
  userId?: string,
  subscription?: StoreSubscription | null
): Promise<MarketingQuotaInfo> {
  const isPro = checkIsMerchantPro(subscription);
  if (isPro) {
    return {
      used: 0,
      limit: Infinity,
      remaining: Infinity,
      isUnlimited: true,
    };
  }

  let effectiveUid = userId;
  if (!effectiveUid) {
    try {
      const { data } = await supabase.auth.getUser();
      effectiveUid = data.user?.id || 'guest-merchant';
    } catch {
      effectiveUid = 'guest-merchant';
    }
  }
  const localKey = `nana_ai_marketing_quota_${effectiveUid}`;

  let used = 0;

  // 1. Lire depuis le stockage local (instantané)
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      used = parseInt(cached, 10) || 0;
    }
  } catch {
    // Ignorer
  }

  // 2. Synchroniser avec Supabase app_registry
  if (effectiveUid && effectiveUid !== 'guest-merchant') {
    try {
      const { data: row } = await supabase
        .from('app_registry')
        .select('config_json')
        .eq('key', `ai_quota_${effectiveUid}`)
        .maybeSingle();

      if (row?.config_json && typeof (row.config_json as any).usedCount === 'number') {
        used = Math.max(used, (row.config_json as any).usedCount);
        localStorage.setItem(localKey, String(used));
      }
    } catch {
      // Tolérance hors-ligne
    }
  }

  const remaining = Math.max(0, FREE_MARKETING_QUOTA_LIMIT - used);

  return {
    used,
    limit: FREE_MARKETING_QUOTA_LIMIT,
    remaining,
    isUnlimited: false,
  };
}

/**
 * Consomme 1 crédit de quota pour les comptes gratuits
 */
export async function consumeMarketingQuota(
  userId?: string,
  subscription?: StoreSubscription | null
): Promise<MarketingQuotaInfo> {
  const isPro = checkIsMerchantPro(subscription);
  if (isPro) {
    return {
      used: 0,
      limit: Infinity,
      remaining: Infinity,
      isUnlimited: true,
    };
  }

  let effectiveUid = userId;
  if (!effectiveUid) {
    try {
      const { data } = await supabase.auth.getUser();
      effectiveUid = data.user?.id || 'guest-merchant';
    } catch {
      effectiveUid = 'guest-merchant';
    }
  }
  const localKey = `nana_ai_marketing_quota_${effectiveUid}`;

  let currentUsed = 0;
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) currentUsed = parseInt(cached, 10) || 0;
  } catch {
    // Ignorer
  }

  const newUsed = currentUsed + 1;

  try {
    localStorage.setItem(localKey, String(newUsed));
  } catch {
    // Ignorer
  }

  if (effectiveUid && effectiveUid !== 'guest-merchant') {
    try {
      await supabase.from('app_registry').upsert({
        key: `ai_quota_${effectiveUid}`,
        name: `ai_quota_${effectiveUid}`,
        module_key: 'ai_marketing',
        config_json: {
          usedCount: newUsed,
          lastGeneratedAt: Date.now(),
          limit: FREE_MARKETING_QUOTA_LIMIT,
        },
        updated_at: new Date().toISOString()
      });
    } catch {
      // Tolérance hors-ligne
    }
  }

  return {
    used: newUsed,
    limit: FREE_MARKETING_QUOTA_LIMIT,
    remaining: Math.max(0, FREE_MARKETING_QUOTA_LIMIT - newUsed),
    isUnlimited: false,
  };
}

/**
 * Génère le contenu marketing optimisé via Gemini API (avec fallback local instantané)
 */
export async function generateMarketingCopy(
  request: GenerateMarketingRequest,
  subscription?: StoreSubscription | null
): Promise<{ text: string; source: string; success: boolean }> {
  const isPro = checkIsMerchantPro(subscription);

  // Si compte gratuit, vérifier le quota
  if (!isPro) {
    const quota = await getMarketingQuota(request.userId, subscription);
    if (quota.remaining <= 0) {
      throw new Error(
        "Vous avez épuisé vos 5 générations gratuites. Passez au forfait Pro pour débloquer l'accès illimité !"
      );
    }
  }

  // 1. Appel API au backend Gemini
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 secondes max

    const res = await fetch('/api/ai/marketing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: request.productName,
        keyFeatures: request.keyFeatures || '',
        channel: request.channel,
        storeName: request.storeName || 'Votre Boutique',
        price: request.price || 0,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      if (data && typeof data.copyText === 'string' && data.copyText.trim()) {
        // Déduire le quota si gratuit
        if (!isPro) {
          await consumeMarketingQuota(request.userId, subscription);
        }
        return {
          text: data.copyText.trim(),
          source: data.source || 'gemini-3.8-flash',
          success: true,
        };
      }
    }
  } catch (err: any) {
    console.warn("Échec de l'appel serveur /api/ai/marketing, bascule sur le moteur local :", err?.message);
  }

  // 2. Moteur de secours local instantané
  const formattedPrice =
    request.price && request.price > 0
      ? `${Number(request.price).toLocaleString('fr-FR')} F CFA`
      : 'Prix attractif en boutique';
  const safeFeatures = request.keyFeatures
    ? request.keyFeatures.trim()
    : 'Qualité supérieure garantie, satisfaction assurée';
  const storeName = request.storeName || 'Notre Boutique';

  let localText = '';

  switch (request.channel) {
    case 'WAMEET_REELS':
      localText = `🎬 [SCRIPT REELS WAMEET : ${request.productName.toUpperCase()}]

[0-3s | Visuel : Plan serré sur le produit avec un geste dynamique]
🗣️ Voix Off : "Attendez ! Si vous cherchez le meilleur pour votre quotidien, regardez ceci..."

[3-15s | Visuel : Démonstration de l'utilisation en situation réelle]
🗣️ Voix Off : "Fini les produits décevants ! Découvrez ${request.productName}. C'est exactement ce qu'il vous faut."

[15-30s | Visuel : Gros plan sur les détails et fonctionnalités]
🗣️ Voix Off : "Pourquoi tout le monde en parle ?
✨ ${safeFeatures.replace(/\n/g, ' ')}
C'est testé et approuvé par nos clients !"

[30-45s | Visuel : Le commerçant tenant le produit avec le sourire]
🗣️ Voix Off : "Disponible dès maintenant à seulement ${formattedPrice} chez ${storeName} ! Cliquez sur le lien Wameet dans notre bio pour commander avant la rupture !" 🔥📦`;
      break;

    case 'SOCIAL_FEED':
      localText = `🔥 ARRIVAGE EXCLUSIF CHEZ ${storeName.toUpperCase()} ! 🔥

Vous nous l'avez demandé, il est enfin disponible ! Découvrez dès aujourd'hui :
👉 *${request.productName}*

💡 Ce qui fait toute la différence :
✅ ${safeFeatures.replace(/\n/g, '\n✅ ')}
✅ Garantie authenticité et satisfaction 100%
✅ Disponible immédiatement en magasin ou en livraison express

💰 Tarif promo exceptionnel : *${formattedPrice}*
⚠️ Stock limité selon les arrivages de la semaine !

📲 Comment commander ?
1️⃣ Écrivez-nous directement sur Wameet Direct en cliquant sur notre lien
2️⃣ Ou commentez "JE VEUX" sous ce post et nous vous répondons dans la minute !

🚚 Livraison rapide et sécurisée. Paiement cash à la livraison ou par Mobile Money.
#${request.productName.replace(/[^a-zA-Z0-9]/g, '')} #BoutiqueNana #CommerceLocal #PromoDuJour`;
      break;

    case 'WAMEET_CLOSING':
      localText = `Bonjour et merci pour votre message ! 😊

C'est un excellent choix. Nous avons bien en stock l'article *${request.productName}*.

Voici ce que nos clients apprécient particulièrement :
💎 ${safeFeatures.replace(/\n/g, ' - ')}

🏷️ *Prix : ${formattedPrice}*
📦 Disponibilité : En stock immédiat chez *${storeName}*

Nous pouvons vous l'expédier dès aujourd'hui avec notre livreur ou vous le réserver en boutique.

👉 *Souhaitez-vous être livré directement chez vous ou préférez-vous passer récupérer votre colis ?* (Indiquez-moi simplement votre quartier ou contact) 👍`;
      break;

    case 'DESCRIPTION':
    default:
      localText = `⭐ ${request.productName.toUpperCase()} - L'EXCELLENCE POUR VOTRE QUOTIDIEN

Offrez-vous ce qu'il y a de meilleur avec *${request.productName}*. Conçu pour répondre aux exigences les plus strictes de durabilité et d'efficacité, ce produit est le choix idéal pour un usage quotidien optimal.

✨ CARACTÉRISTIQUES PRINCIPALES :
• ${safeFeatures.replace(/\n/g, '\n• ')}
• Qualité premium rigoureusement sélectionnée par ${storeName}
• Excellent rapport qualité-prix

🏷️ PRIX : ${formattedPrice}

🛡️ ENGAGEMENT QUALITÉ :
Produit 100% authentique. Commandez dès maintenant en toute confiance avec livraison rapide et service client dédié.`;
      break;
  }

  // Déduire le quota si gratuit
  if (!isPro) {
    await consumeMarketingQuota(request.userId, subscription);
  }

  return {
    text: localText,
    source: 'nana-heuristic-engine',
    success: true,
  };
}
