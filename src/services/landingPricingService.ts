import { LandingPricingSection } from '../types';

export const LANDING_PRICING_UPDATED_EVENT = 'nana_landing_pricing_updated';

/**
 * Publie la configuration des modules et tarifs de la landing page dans Supabase
 */
export async function publishLandingPricingToSupabase(
  pricingSection: LandingPricingSection,
  authorName?: string
): Promise<{ success: boolean; error?: string; pricingSection?: LandingPricingSection }> {
  try {
    const res = await fetch('/api/landing-pricing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pricingSection,
        author: authorName || 'Super-Admin'
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Erreur lors de la publication vers Supabase');
    }

    // Sauvegarde miroir dans le localStorage pour affichage instantané
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nana_landing_pricing_supabase', JSON.stringify(data.pricingSection));
        window.dispatchEvent(
          new CustomEvent(LANDING_PRICING_UPDATED_EVENT, {
            detail: { pricingSection: data.pricingSection }
          })
        );
      } catch (e) {
        console.warn('[STORAGE] Erreur cache local pricing:', e);
      }
    }

    return { success: true, pricingSection: data.pricingSection };
  } catch (err: any) {
    console.error('[PUBLISH LANDING PRICING ERROR]', err);
    return { success: false, error: err?.message || 'Erreur réseau vers Supabase' };
  }
}

/**
 * Récupère la configuration des tarifs publiée dans Supabase
 */
export async function fetchLandingPricingFromSupabase(): Promise<LandingPricingSection | null> {
  // 1. Essai de lecture depuis le cache rapide
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('nana_landing_pricing_supabase');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.plans && Array.isArray(parsed.plans)) {
          return parsed;
        }
      }
    } catch {}
  }

  // 2. Requête API vers la route Supabase
  try {
    const res = await fetch('/api/landing-pricing');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.pricingSection) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('nana_landing_pricing_supabase', JSON.stringify(json.pricingSection));
          } catch {}
        }
        return json.pricingSection;
      }
    }
  } catch (err) {
    console.warn('[FETCH LANDING PRICING NOTICE]', err);
  }

  return null;
}

/**
 * Écouteur en direct sur les mises à jour des tarifs publiées vers Supabase
 */
export function subscribeToLandingPricing(
  callback: (pricingSection: LandingPricingSection) => void
): () => void {
  // 1. Récupération initiale
  fetchLandingPricingFromSupabase().then((data) => {
    if (data) callback(data);
  });

  // 2. Écoute de l'événement global
  const handleEvent = (e: any) => {
    const section = e?.detail?.pricingSection;
    if (section) callback(section);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(LANDING_PRICING_UPDATED_EVENT, handleEvent);
    return () => window.removeEventListener(LANDING_PRICING_UPDATED_EVENT, handleEvent);
  }

  return () => {};
}
