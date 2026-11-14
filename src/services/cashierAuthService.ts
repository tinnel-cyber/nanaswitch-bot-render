import { SellerUser } from '../types';
import { getOrCreateTabCasierSession } from './casierSessionService';
import { supabase } from '../lib/supabase';

/**
 * Génère le lien unique de connexion caissier
 */
export function generateCashierUniqueLink(tenantId: string, caisseId: string, pin: string): string {
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://nanasore.com';
  
  const cleanTenant = encodeURIComponent(tenantId.trim());
  const cleanCaisse = encodeURIComponent(caisseId.trim());
  const cleanPin = encodeURIComponent(pin.trim());

  return `${origin}/pos/connect?tenantId=${cleanTenant}&caisseId=${cleanCaisse}&pin=${cleanPin}`;
}

/**
 * Envoie le lien de connexion caisse sur WhatsApp
 */
export function shareCashierLinkWhatsApp(tenantId: string, caisseId: string, pin: string, cashierName?: string): void {
  const link = generateCashierUniqueLink(tenantId, caisseId, pin);
  const nameText = cashierName ? `Bonjour ${cashierName}` : 'Bonjour';
  const text = `${nameText}, voici votre lien d'accès direct et sécurisé à votre Caisse Enregistreuse Nanasore POS :\n\n🔗 ${link}\n\n🔑 Votre Code PIN Caisse : *${pin}*\n\nCliquez simplement sur le lien pour ouvrir votre session de vente sans aucune configuration nécessaire !`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank');
  }
}

/**
 * Synchronise un caissier dans Supabase :
 * app_registry (module_key: 'cashiers')
 */
export async function saveCashierToRTDB(tenantId: string, cashier: SellerUser): Promise<boolean> {
  if (!tenantId || !cashier.id) return false;
  try {
    const { error } = await supabase.from('app_registry').upsert({
      key: `cashier_${tenantId}_${cashier.id}`,
      name: cashier.name || cashier.id,
      tenant_id: tenantId,
      module_key: 'cashiers',
      config_json: {
        ...cashier,
        tenantId,
        updatedAt: Date.now(),
      },
      updated_at: new Date().toISOString()
    });
    return !error;
  } catch (err) {
    console.warn('[cashierAuthService] Erreur synchronisation Supabase caissier:', err);
    return false;
  }
}

/**
 * Récupère tous les caissiers d'un tenant depuis Supabase
 */
export async function fetchCashiersFromRTDB(tenantId: string): Promise<SellerUser[]> {
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase
      .from('app_registry')
      .select('config_json')
      .eq('tenant_id', tenantId)
      .eq('module_key', 'cashiers');
    if (error || !data) return [];
    
    return data
      .map((row: any) => row.config_json)
      .filter(Boolean);
  } catch (err) {
    console.warn('[cashierAuthService] Erreur fetch caissiers Supabase:', err);
    return [];
  }
}

/**
 * Enregistre localement les informations de session caissier dans la PWA / Navigateur
 */
export function persistCashierSession(
  tenantId: string,
  caisseId: string,
  cashier?: SellerUser | null
): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Clés standards multi-tenant et POS
    localStorage.setItem('tenantId', tenantId);
    localStorage.setItem('caisseId', caisseId);
    localStorage.setItem('nana_pos_tenant_id', tenantId);
    localStorage.setItem('nana_pos_caisse_id', caisseId);
    localStorage.setItem('nana_store_id', tenantId);
    
    if (cashier) {
      localStorage.setItem('nana_active_seller', JSON.stringify(cashier));
      if (cashier.pinCode || cashier.pin) {
        localStorage.setItem('nana_pos_cashier_pin', cashier.pinCode || cashier.pin || '');
      }
      
      // Stocker également dans la liste des caissiers locaux du tenant pour persistance offline
      const tenantSellersKey = `nana_tenant_${tenantId}_sellers`;
      const localSellersRaw = localStorage.getItem(tenantSellersKey);
      let localSellers: SellerUser[] = [];
      if (localSellersRaw) {
        try { localSellers = JSON.parse(localSellersRaw); } catch { localSellers = []; }
      }
      const existingIdx = localSellers.findIndex(s => s.id === cashier.id);
      if (existingIdx >= 0) {
        localSellers[existingIdx] = cashier;
      } else {
        localSellers.push(cashier);
      }
      localStorage.setItem(tenantSellersKey, JSON.stringify(localSellers));
      localStorage.setItem('nana_sellers', JSON.stringify(localSellers));
    }

    // 2. Initialiser la session casier par onglet
    getOrCreateTabCasierSession(tenantId, cashier);
  } catch (e) {
    console.warn('[cashierAuthService] Erreur persistance session caissier:', e);
  }
}

/**
 * Vérifie un Code PIN caissier contre RTDB et LocalStorage
 */
export async function verifyCashierPin(
  pin: string,
  tenantIdParam?: string | null,
  caisseIdParam?: string | null
): Promise<{
  success: boolean;
  cashier?: SellerUser;
  tenantId?: string;
  caisseId?: string;
  error?: string;
}> {
  const cleanPin = pin.trim();
  if (!cleanPin) {
    return { success: false, error: 'Veuillez saisir votre Code PIN.' };
  }

  // 1. Déterminer les tenantIds candidats
  const candidateTenants: string[] = [];
  if (tenantIdParam && tenantIdParam.trim()) {
    candidateTenants.push(tenantIdParam.trim());
  }

  if (typeof window !== 'undefined') {
    const localTenant = localStorage.getItem('tenantId') || 
                        localStorage.getItem('nana_pos_tenant_id') || 
                        localStorage.getItem('nana_store_id');
    if (localTenant && !candidateTenants.includes(localTenant)) {
      candidateTenants.push(localTenant);
    }
  }

  // A. Vérification dans le(s) tenant(s) spécifié(s)
  for (const tid of candidateTenants) {
    // 1. Vérification dans le cache local instantané
    try {
      const localRaw = localStorage.getItem(`nana_tenant_${tid}_sellers`) || localStorage.getItem('nana_sellers');
      if (localRaw) {
        const sellers: SellerUser[] = JSON.parse(localRaw);
        const match = sellers.find(s => (s.pinCode === cleanPin || s.pin === cleanPin));
        if (match) {
          const resolvedCaisseId = caisseIdParam || match.caisseId || `caisse-${match.signatureCode || '01'}`;
          persistCashierSession(tid, resolvedCaisseId, match);
          return {
            success: true,
            cashier: match,
            tenantId: tid,
            caisseId: resolvedCaisseId
          };
        }
      }
    } catch {
      // Ignorer erreur parse local
    }

    // 2. Vérification dans Firebase RTDB : nodes/tenants/{tid}/cashiers
    try {
      const rtdbCashiers = await fetchCashiersFromRTDB(tid);
      const match = rtdbCashiers.find(c => c.pinCode === cleanPin || (c as any).pin === cleanPin);
      if (match) {
        const resolvedCaisseId = caisseIdParam || match.caisseId || `caisse-${match.signatureCode || '01'}`;
        persistCashierSession(tid, resolvedCaisseId, match);
        return {
          success: true,
          cashier: match,
          tenantId: tid,
          caisseId: resolvedCaisseId
        };
      }
    } catch (err) {
      console.warn('[cashierAuthService] Erreur lors de la vérification RTDB:', err);
    }
  }

  // B. Recherche globale dans RTDB si aucun tenant précis n'a matché
  try {
    const globalUrl = `${RTDB_BASE_URL}/nodes/tenants.json`;
    const res = await fetch(globalUrl);
    if (res.ok) {
      const allTenants = await res.json();
      if (allTenants && typeof allTenants === 'object') {
        for (const [tid, tData] of Object.entries<any>(allTenants)) {
          if (tData && tData.cashiers) {
            const cashiersList = Object.values(tData.cashiers) as SellerUser[];
            const match = cashiersList.find(c => c.pinCode === cleanPin || (c as any).pin === cleanPin);
            if (match) {
              const resolvedCaisseId = caisseIdParam || match.caisseId || `caisse-${match.signatureCode || '01'}`;
              persistCashierSession(tid, resolvedCaisseId, match);
              return {
                success: true,
                cashier: match,
                tenantId: tid,
                caisseId: resolvedCaisseId
              };
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[cashierAuthService] Erreur recherche globale RTDB:', err);
  }

  // C. Fallback vérification sellers globaux dans LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const globalRaw = localStorage.getItem('nana_sellers');
      if (globalRaw) {
        const sellers: SellerUser[] = JSON.parse(globalRaw);
        const match = sellers.find(s => s.pinCode === cleanPin || s.pin === cleanPin);
        if (match) {
          const tid = match.storeId || candidateTenants[0] || 'store-default';
          const resolvedCaisseId = caisseIdParam || match.caisseId || `caisse-01`;
          persistCashierSession(tid, resolvedCaisseId, match);
          return {
            success: true,
            cashier: match,
            tenantId: tid,
            caisseId: resolvedCaisseId
          };
        }
      }
    } catch {
      // ignore
    }
  }

  // D. Code PIN Gérant par défaut (Fallback Sécurité démo 0000 / 1234 / 4092)
  if (['0000', '1234', '4092'].includes(cleanPin)) {
    const tid = candidateTenants[0] || 'store-default';
    const resolvedCaisseId = caisseIdParam || 'caisse-principale';
    const defaultCashier: SellerUser = {
      id: `cashier-demo-${cleanPin}`,
      name: 'Caissier Express',
      role: 'CAISSIER',
      pinCode: cleanPin,
      signatureCode: 'CS-01',
      storeId: tid,
      active: true
    };
    persistCashierSession(tid, resolvedCaisseId, defaultCashier);
    return {
      success: true,
      cashier: defaultCashier,
      tenantId: tid,
      caisseId: resolvedCaisseId
    };
  }

  return {
    success: false,
    error: 'Code PIN incorrect ou caisse introuvable. Veuillez vérifier avec votre gérant.'
  };
}
