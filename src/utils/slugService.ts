/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Service de Résolution Multi-Domaine & Gestion Intelligente des Slugs (Supabase SQL Native)
 * Gère l'accès direct aux boutiques par slug, la persistance Cloud Supabase SQL (tables app_registry, tenants, products),
 * et la création automatique (Auto-Heal) des slugs pour les boutiques, produits et tunnels sans dépendance à Firebase.
 */

import { supabase } from '../lib/supabase';
import { getSafeStoreSlug } from './slugEngine';
import { getThemeRoutePrefix } from './themeRoutePrefix';
import { buildPublicShopUrl } from '../config/domains';

export { getSafeStoreSlug };

/**
 * Convertit un texte en slug propre, URL-safe et sans accents
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Auto-Heal Store Slug avec Protection Anti-Collision Stricte :
 * Si le slug existe déjà dans Supabase avec un autre ownerId,
 * ne l'écrase jamais : ajoute un suffixe unique pour préserver
 * l'intégrité du premier compte.
 */
export async function autoHealStoreSlug(storeId: string, storeData: any): Promise<string> {
  const existingSlug = storeData?.storeSlug || storeData?.slug;
  const ownerId = storeData?.ownerId || storeData?.userId || storeData?.uid || storeId;

  if (existingSlug && typeof existingSlug === 'string' && existingSlug.trim() && existingSlug !== 'boutique-officielle' && existingSlug !== 'undefined') {
    const cleanExisting = slugify(existingSlug.trim().replace(/^store-/, '')) || 'ma-boutique';
    if (typeof window !== 'undefined') {
      (window as any).storeSlug = cleanExisting;
    }
    return cleanExisting;
  }

  const cleanUid = String(ownerId || storeId || 'boutique').replace(/^store-/, '').replace(/^usr-/, '');
  const baseName =
    (storeData?.storeName && storeData.storeName !== 'Boutique Officielle' ? storeData.storeName : '') ||
    storeData?.displayName ||
    storeData?.name ||
    (storeData?.email ? String(storeData.email).split('@')[0] : '') ||
    `boutique-${cleanUid.slice(0, 6)}`;
  const baseSlug = slugify(baseName) || getSafeStoreSlug(storeData, { storeId, uid: ownerId }) || 'ma-boutique';
  let resolvedSlug = baseSlug;

  try {
    // Vérification anti-collision dans Supabase public.tenants
    const { data: collisionData } = await supabase
      .from('tenants')
      .select('id, slug')
      .eq('slug', baseSlug)
      .limit(1)
      .maybeSingle();

    if (collisionData && collisionData.id !== storeId && collisionData.id !== ownerId) {
      const uidSuffix = ownerId ? ownerId.slice(0, 4).toLowerCase() : '2';
      resolvedSlug = `${baseSlug}-${uidSuffix}`;
    }
  } catch (collisionErr) {
    console.warn('[SLUG ANTI-COLLISION] Notice Supabase :', collisionErr);
  }

  return resolvedSlug;
}

/**
 * Auto-Heal Product Slug : Génère un slug à partir du nom
 */
export async function autoHealProductSlug(storeId: string, productId: string, productData: any): Promise<string> {
  const existingSlug = productData?.productSlug || productData?.slug;
  if (existingSlug && typeof existingSlug === 'string' && existingSlug.trim()) {
    return existingSlug.trim();
  }

  const baseName = productData?.name || productData?.title || productId.replace(/^prod-/, '');
  return slugify(baseName) || productId;
}

/**
 * Auto-Heal Funnel Slug : Génère un slug à partir du titre
 */
export async function autoHealFunnelSlug(funnelId: string, funnelData: any): Promise<string> {
  const existingSlug = funnelData?.funnelSlug || funnelData?.slug;
  if (existingSlug && typeof existingSlug === 'string' && existingSlug.trim()) {
    return existingSlug.trim();
  }

  const baseName = funnelData?.name || funnelData?.title || funnelId.replace(/^funnel-/, '');
  return slugify(baseName) || funnelId;
}

/**
 * Résout une boutique publique depuis Supabase SQL sans dépendance Firestore.
 * Supporte :
 * 1. La table public.tenants (par slug, id ou custom_domain)
 * 2. La table public.app_registry (par tenant_id ou config_json->>storeSlug)
 */
export async function fetchPublicStoreBySlugOrId(storeSlugOrId: string): Promise<any | null> {
  if (!storeSlugOrId) return null;
  const cleanParam = decodeURIComponent(storeSlugOrId).trim();
  const cleanSlugOnly = cleanParam.replace(/^store-/, '');

  try {
    const isStoreUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanParam);
    
    // A. Recherche dans public.tenants
    let tenantQuery = supabase.from('tenants').select('*');
    if (isStoreUUID) {
      tenantQuery = tenantQuery.or(`id.eq.${cleanParam},slug.eq.${cleanSlugOnly},custom_domain.eq.${cleanParam}`);
    } else {
      tenantQuery = tenantQuery.or(`slug.eq.${cleanSlugOnly},custom_domain.eq.${cleanParam}`);
    }

    const { data: tenantData } = await tenantQuery.limit(1).maybeSingle();

    if (tenantData) {
      const tenantId = tenantData.id;
      const { data: appReg } = await supabase
        .from('app_registry')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('module_key', 'theme_config')
        .maybeSingle();

      const themeCfg = (appReg?.config_json as any) || {};
      const themeId = themeCfg.activeThemeId || themeCfg.active_theme_id || appReg?.theme_key || tenantData.settings?.themeId || 'theme-default';
      const resolvedSlug = tenantData.slug || cleanSlugOnly;
      const prefix = themeCfg.themePrefix || getThemeRoutePrefix(themeId, themeCfg.blankIndex || 1);
      const publicShopUrl = themeCfg.publicShopUrl || buildPublicShopUrl(resolvedSlug, { themeId, blankIndex: themeCfg.blankIndex });

      return {
        id: tenantId,
        storeName: tenantData.name,
        name: tenantData.name,
        storeSlug: resolvedSlug,
        slug: resolvedSlug,
        tenantSlug: resolvedSlug,
        logoUrl: tenantData.logo_url,
        primaryColor: tenantData.primary_color,
        activeThemeId: themeId,
        active_theme_id: themeId,
        activeThemePrefix: prefix,
        publicShopUrl,
        themeCustomization: themeCfg.customConfig || tenantData.settings?.customConfig,
        customization: themeCfg.customConfig?.customization || tenantData.settings?.customConfig?.customization,
        ...tenantData.settings
      };
    }

    // B. Recherche dans app_registry par tenant_id ou storeSlug
    const searchKeys = Array.from(new Set([cleanParam, cleanSlugOnly, `store-${cleanSlugOnly}`]));
    const { data: regList } = await supabase
      .from('app_registry')
      .select('*')
      .eq('module_key', 'theme_config')
      .in('tenant_id', searchKeys)
      .limit(1);

    if (regList && regList.length > 0) {
      const reg = regList[0];
      const cfg = (reg.config_json as any) || {};
      const themeId = cfg.activeThemeId || cfg.active_theme_id || reg.theme_key || 'theme-default';
      const resolvedSlug = cfg.storeSlug || cleanSlugOnly;
      const prefix = cfg.themePrefix || getThemeRoutePrefix(themeId, cfg.blankIndex || 1);
      const publicShopUrl = cfg.publicShopUrl || buildPublicShopUrl(resolvedSlug, { themeId, blankIndex: cfg.blankIndex });

      return {
        id: reg.tenant_id || cleanParam,
        storeName: cfg.customConfig?.storeName || resolvedSlug,
        name: cfg.customConfig?.storeName || resolvedSlug,
        storeSlug: resolvedSlug,
        slug: resolvedSlug,
        tenantSlug: resolvedSlug,
        logoUrl: cfg.customConfig?.logoUrl,
        primaryColor: cfg.colors?.primary || cfg.customConfig?.primaryAccentColor,
        activeThemeId: themeId,
        active_theme_id: themeId,
        activeThemePrefix: prefix,
        publicShopUrl,
        themeCustomization: cfg.customConfig,
        customization: cfg.customConfig?.customization
      };
    }
  } catch (supaErr) {
    console.warn('[SUPABASE STORE RESOLUTION] Notice :', supaErr);
  }

  return null;
}

/**
 * Récupère tous les produits publics associés à une boutique depuis Supabase SQL.
 */
export async function fetchPublicStoreProducts(storeId: string): Promise<any[]> {
  if (!storeId) return [];
  const cleanId = storeId.trim();
  const cleanSlug = cleanId.replace(/^store-/, '');
  const searchIds = Array.from(new Set([cleanId, cleanSlug, `store-${cleanSlug}`]));

  // 1. Chargement prioritaire depuis app_registry (module_key: products)
  try {
    const { data: regList } = await supabase
      .from('app_registry')
      .select('config_json')
      .in('tenant_id', searchIds)
      .eq('module_key', 'products');

    if (regList && regList.length > 0) {
      for (const reg of regList) {
        if (reg?.config_json?.products && Array.isArray(reg.config_json.products) && reg.config_json.products.length > 0) {
          return reg.config_json.products;
        }
      }
    }
  } catch (err) {
    console.warn('[SUPABASE] Erreur lecture catalogue app_registry :', err);
  }

  // 2. Chargement depuis public.products
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    let prodQuery = supabase.from('products').select('*');
    if (isUUID) {
      prodQuery = prodQuery.or(`tenant_id.eq.${cleanId},organization_id.eq.${cleanId},vendor_id.eq.${cleanId}`);
    } else {
      prodQuery = prodQuery.in('vendor_id', searchIds);
    }

    const { data: supaProducts, error: supaErr } = await prodQuery.limit(60);

    if (!supaErr && supaProducts && supaProducts.length > 0) {
      return supaProducts.map((p: any) => ({
        id: String(p.id),
        name: p.title || p.name || 'Produit',
        slug: p.slug || slugify(p.name || p.title || p.id),
        productSlug: p.slug || slugify(p.name || p.title || p.id),
        price: Number(p.price) || 0,
        originalPrice: Number(p.originalPrice || p.original_price) || 0,
        category: p.category || 'Tous les produits',
        image: p.thumbnail_url || p.image_url || p.image || '',
        stock: p.stock ?? 10,
        description: p.richDescription || p.description || '',
        storeId
      }));
    }
  } catch (err) {
    console.warn('[SUPABASE] Erreur lecture catalogue produits vitrine :', err);
  }

  return [];
}

/**
 * Récupère un produit public précis par son slug ou son ID depuis Supabase SQL
 */
export async function fetchPublicProductBySlugOrId(storeId: string, productSlugOrId: string): Promise<any | null> {
  if (!storeId || !productSlugOrId) return null;
  const cleanParam = decodeURIComponent(productSlugOrId).trim().toLowerCase();

  const prods = await fetchPublicStoreProducts(storeId);
  return prods.find((p: any) => 
    p.id === cleanParam ||
    (p.slug && p.slug.toLowerCase() === cleanParam) ||
    (p.productSlug && p.productSlug.toLowerCase() === cleanParam)
  ) || null;
}

export interface PersistTenantSlugResult {
  slug: string;
  publicShopUrl: string;
  themePrefix: string;
}

/**
 * Persiste la configuration de slug et de thème pour un tenant dans Supabase SQL
 */
export async function ensureAndPersistTenantSlug(
  storeId: string,
  storeData?: any,
  ownerId?: string,
  options?: { themeId?: string; blankIndex?: number }
): Promise<string> {
  if (!storeId && !ownerId && !storeData) return 'ma-boutique';
  const effectiveStoreId = storeId || ownerId || 'boutique';
  const storeName = storeData?.storeName || storeData?.displayName || storeData?.name || '';

  const resolvedSlug = await autoHealStoreSlug(effectiveStoreId, {
    ...storeData,
    storeId: effectiveStoreId,
    ownerId: ownerId || effectiveStoreId,
  });

  let activeThemeId = options?.themeId || 
    storeData?.activeThemeId || 
    storeData?.active_theme_id || 
    storeData?.themeId;

  if (!activeThemeId && typeof window !== 'undefined') {
    try {
      activeThemeId = localStorage.getItem('nana_active_theme_id') || 
        localStorage.getItem(`nana_boutique_theme_id_${effectiveStoreId}`) || 
        localStorage.getItem('nana_boutique_theme_id');
    } catch {}
  }

  activeThemeId = activeThemeId || 'theme-default';

  const blankThemeIndex = options?.blankIndex || 
    storeData?.blankThemeIndex || 
    (typeof window !== 'undefined' ? Number(localStorage.getItem('nana_blank_theme_index')) : null) || 
    1;

  const activeThemePrefix = getThemeRoutePrefix(activeThemeId, blankThemeIndex);
  const publicShopUrl = buildPublicShopUrl(resolvedSlug, { 
    themeId: activeThemeId, 
    blankIndex: blankThemeIndex 
  });

  if (typeof window !== 'undefined') {
    (window as any).storeSlug = resolvedSlug;
    (window as any).activeThemeId = activeThemeId;
    (window as any).activeThemePrefix = activeThemePrefix;
    (window as any).publicShopUrl = publicShopUrl;
    try {
      localStorage.setItem('nana_tenant_slug', resolvedSlug);
      localStorage.setItem('nana_active_theme_id', activeThemeId);
      localStorage.setItem('nana_boutique_theme_id', activeThemeId);
      localStorage.setItem('nana_active_theme_prefix', activeThemePrefix);
      localStorage.setItem('nana_public_shop_url', publicShopUrl);
    } catch {}
  }

  // Persistance Supabase SQL dans public.app_registry
  try {
    const primaryTenantKey = effectiveStoreId;
    await supabase
      .from('app_registry')
      .upsert({
        key: `theme_config_${primaryTenantKey}`,
        name: 'theme_config',
        tenant_id: primaryTenantKey,
        module_key: 'theme_config',
        theme_key: activeThemeId,
        config_json: {
          activeThemeId,
          active_theme_id: activeThemeId,
          themePrefix: activeThemePrefix,
          publicShopUrl,
          storeSlug: resolvedSlug,
          customConfig: storeData?.themeCustomization || storeData?.customConfig,
          updated_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    // Enregistrement miroir sur le slug épuré si différent
    const cleanSlug = resolvedSlug.replace(/^store-/, '');
    if (cleanSlug && cleanSlug !== primaryTenantKey) {
      await supabase
        .from('app_registry')
        .upsert({
          key: `theme_config_${cleanSlug}`,
          name: 'theme_config',
          tenant_id: cleanSlug,
          module_key: 'theme_config',
          theme_key: activeThemeId,
          config_json: {
            activeThemeId,
            active_theme_id: activeThemeId,
            themePrefix: activeThemePrefix,
            publicShopUrl,
            storeSlug: resolvedSlug,
            customConfig: storeData?.themeCustomization || storeData?.customConfig,
            updated_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
    }

    const isTenantUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(primaryTenantKey);
    if (isTenantUUID) {
      await supabase
        .from('tenants')
        .upsert({
          id: primaryTenantKey,
          name: storeName || resolvedSlug,
          slug: resolvedSlug,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' }).catch(() => {});
    }
  } catch (supaErr) {
    console.warn('[THEMES SUPABASE ERROR] Notice sauvegarde Supabase :', supaErr);
  }

  return resolvedSlug;
}
