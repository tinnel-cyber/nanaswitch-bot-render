import { KycStatusTier, PricingModelTier } from '../types';

export interface ContextualAuthProfile {
  id?: string;
  firebase_uid: string;
  email: string;
  full_name?: string;
  whatsapp_number?: string;
  kyc_status: KycStatusTier;
  pricing_model: PricingModelTier;
  wallet_balance: number;
  enabled_themes: string[];
}

/**
 * Synchronise un compte Firebase Auth avec Supabase en mode NEUTRE sans KYC à l'entrée
 */
export async function syncAuthProfileWithSupabase(params: {
  firebaseUid: string;
  email: string;
  fullName?: string;
  whatsapp?: string;
}): Promise<ContextualAuthProfile> {
  const { firebaseUid, email, fullName, whatsapp } = params;

  try {
    const res = await fetch('/api/auth-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firebaseUid,
        email,
        fullName: fullName || '',
        whatsapp: whatsapp || ''
      })
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.profile) {
        const p = json.profile;
        const profile: ContextualAuthProfile = {
          id: p.profile_id || p.id,
          firebase_uid: firebaseUid,
          email: p.email || email,
          full_name: p.full_name || fullName,
          whatsapp_number: p.whatsapp_number || whatsapp,
          kyc_status: (p.kyc_status as KycStatusTier) || 'none',
          pricing_model: (p.pricing_model as PricingModelTier) || 'none',
          wallet_balance: typeof p.wallet_balance === 'number' ? p.wallet_balance : 0,
          enabled_themes: Array.isArray(p.enabled_themes) ? p.enabled_themes : []
        };

        // Cache local immédiat
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`nana_contextual_profile_${firebaseUid}`, JSON.stringify(profile));
            localStorage.setItem('nana_user_kyc_status', profile.kyc_status);
            localStorage.setItem('nana_user_pricing_model', profile.pricing_model);
            localStorage.setItem('nana_user_wallet_balance', String(profile.wallet_balance));
            window.dispatchEvent(new CustomEvent('nana_profile_synced', { detail: { profile } }));
          } catch {}
        }

        return profile;
      }
    }
  } catch (err) {
    console.warn('[AUTH_SYNC_SUPABASE_WARNING]', err);
  }

  // Profil neutre par défaut en cas de latence réseau
  const fallbackProfile: ContextualAuthProfile = {
    firebase_uid: firebaseUid,
    email,
    full_name: fullName,
    whatsapp_number: whatsapp,
    kyc_status: 'none',
    pricing_model: 'none',
    wallet_balance: 0,
    enabled_themes: []
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`nana_contextual_profile_${firebaseUid}`, JSON.stringify(fallbackProfile));
      localStorage.setItem('nana_user_kyc_status', 'none');
      localStorage.setItem('nana_user_pricing_model', 'none');
      localStorage.setItem('nana_user_wallet_balance', '0');
    } catch {}
  }

  return fallbackProfile;
}
