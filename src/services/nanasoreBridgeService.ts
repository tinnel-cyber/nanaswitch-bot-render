import { supabase } from '../lib/supabase';

export interface WameetBridgeUpgradeParams {
  uid?: string;
  name?: string;
  handle?: string;
  avatarUrl?: string;
  phone?: string;
}

export interface NanasoreShopDocument {
  id: string;
  ownerId: string;
  storeName: string;
  slug: string;
  ownerHandle: string;
  ownerName: string;
  ownerAvatar: string;
  ownerPhone?: string;
  status: 'active' | 'pending' | 'suspended';
  currency: string;
  createdAt: any;
  updatedAt: any;
  productsCount: number;
  categories: string[];
  description: string;
  isVerified: boolean;
  hasPhysicalProducts: boolean;
  hasDigitalCourses: boolean;
  paymentGateways: string[];
  source: 'wameet_bridge';
}

export interface BridgeUpgradeResult {
  success: boolean;
  shopId: string;
  storeName: string;
  isNewStore: boolean;
  shopData: NanasoreShopDocument;
}

const LOCAL_STORAGE_KEY_HAS_STORE = 'wameet_has_nanasore_store';
const LOCAL_STORAGE_KEY_STORE_ID = 'wameet_nanasore_store_id';

/**
 * Vérifie si l'utilisateur possède déjà une boutique / espace Nanasore actif
 */
export async function checkUserHasNanasoreStore(explicitUid?: string): Promise<{
  hasStore: boolean;
  shopId?: string;
  shopData?: NanasoreShopDocument;
}> {
  const uid = explicitUid || (typeof window !== 'undefined' ? localStorage.getItem('wameet_phone_auth_uid') : null);
  if (!uid) {
    const cachedHasStore = typeof window !== 'undefined' && localStorage.getItem(LOCAL_STORAGE_KEY_HAS_STORE) === 'true';
    const cachedStoreId = typeof window !== 'undefined' ? (localStorage.getItem(LOCAL_STORAGE_KEY_STORE_ID) || undefined) : undefined;
    return { hasStore: cachedHasStore, shopId: cachedStoreId };
  }

  try {
    const { data: rows } = await supabase
      .from('app_registry')
      .select('*')
      .in('key', [`user_${uid}`, `store_${uid}`]);

    if (rows && rows.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY_HAS_STORE, 'true');
        localStorage.setItem(LOCAL_STORAGE_KEY_STORE_ID, uid);
      }
      return { hasStore: true, shopId: uid };
    }
  } catch (err) {
    console.warn('[WAMEET BRIDGE] Erreur vérification boutique Supabase :', err);
  }

  const cachedHasStore = typeof window !== 'undefined' && localStorage.getItem(LOCAL_STORAGE_KEY_HAS_STORE) === 'true';
  const cachedStoreId = typeof window !== 'undefined' ? (localStorage.getItem(LOCAL_STORAGE_KEY_STORE_ID) || undefined) : undefined;
  return { hasStore: cachedHasStore, shopId: cachedStoreId };
}

/**
 * Passerelle de Monétisation Zéro-Friction (Bridge 1-Clic Wameet -> Nanasore)
 * Débloque le statut Vendeur/Formateur sans re-login.
 */
export async function upgradeWameetUserToNanasore(
  params: WameetBridgeUpgradeParams
): Promise<BridgeUpgradeResult> {
  const effectiveUid =
    params.uid ||
    (typeof window !== 'undefined' ? localStorage.getItem('wameet_phone_auth_uid') : null) ||
    `wuser_${Date.now()}`;

  const cleanHandle = (params.handle || '@createur').trim();
  const rawDisplayName = params.name || cleanHandle.replace(/^@/, '');
  const storeName = `Boutique & Académie ${rawDisplayName}`;
  const slug = cleanHandle
    .replace(/^@/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `shop-${effectiveUid.substring(0, 6)}`;

  const nowIso = new Date().toISOString();

  // 1. Initialisation de la boutique
  const shopData: NanasoreShopDocument = {
    id: effectiveUid,
    ownerId: effectiveUid,
    storeName,
    slug,
    ownerHandle: cleanHandle,
    ownerName: rawDisplayName,
    ownerAvatar:
      params.avatarUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    ownerPhone: params.phone || '',
    status: 'active',
    currency: 'XOF',
    createdAt: nowIso,
    updatedAt: nowIso,
    productsCount: 0,
    categories: ['E-Commerce', 'Formations Vidéo', 'Produits Physiques', 'Téléchargements'],
    description: `Espace Vendeur & Formateur officiel créé en 1-Clic depuis Wameet pour ${rawDisplayName}.`,
    isVerified: true,
    hasPhysicalProducts: true,
    hasDigitalCourses: true,
    paymentGateways: ['Orange Money', 'Wave', 'Moov Money', 'MTN Money'],
    source: 'wameet_bridge'
  };

  try {
    await supabase.from('app_registry').upsert({
      key: `store_${effectiveUid}`,
      tenant_id: effectiveUid,
      module_key: 'store_profile',
      config_json: shopData
    }, { onConflict: 'key' });

    await supabase.from('app_registry').upsert({
      key: `store_theme_${effectiveUid}`,
      tenant_id: effectiveUid,
      module_key: 'theme_config',
      config_json: {
        id: effectiveUid,
        storeName,
        slug,
        activeThemeId: 'theme-neo-afro-noir',
        currency: 'XOF'
      }
    }, { onConflict: 'key' });
  } catch (err) {
    console.warn('[WAMEET BRIDGE] Erreur synchronisation Supabase :', err);
  }

  // 2. Persistance locale rapide pour réactivité instantanée de l'UI
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY_HAS_STORE, 'true');
    localStorage.setItem(LOCAL_STORAGE_KEY_STORE_ID, effectiveUid);
  }

  return {
    success: true,
    shopId: effectiveUid,
    storeName,
    isNewStore: true,
    shopData
  };
}
