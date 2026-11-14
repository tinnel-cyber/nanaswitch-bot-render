/**
 * @file appRegistrySyncService.ts
 * @description Sync des 27 modules canoniques (App Registry) vers Supabase et Firebase.
 * Source unique : ALL_OFFICIAL_CATALOG dans appRegistry.ts (11 apps + 7 services + 6 modules + 3 outils).
 */

import { supabase } from '../lib/supabase';
import { ALL_OFFICIAL_CATALOG, type TaxonomyType } from '../appRegistry';

export interface AppRegistryModule {
  id?: string;
  num: number;
  key: string;
  name: string;
  defaultName: string;
  description: string;
  category: string;
  section: 1 | 2 | 3 | 4;
  sectionName: string;
  edgeFile: string;
  routes: string[];
  is_active: boolean;
  is_public: boolean;
  updated_at?: string;
}

const SECTION_BY_TAXONOMY: Record<TaxonomyType, { section: 1 | 2 | 3 | 4; sectionName: string }> = {
  APPLICATION: { section: 1, sectionName: 'Applications' },
  SERVICE: { section: 2, sectionName: 'Services' },
  MODULE: { section: 3, sectionName: 'Modules' },
  OUTIL: { section: 4, sectionName: 'Outils' },
};

/** Fichier Worker réel quand il existe — jamais de stub fictif. */
const EDGE_FILE_BY_ID: Record<string, string> = {
  'app-pos': 'app-pos.js',
  'app-studio': 'app-studio.js',
  'app-wameet': 'app-wameet.js',
  'app-nanagenerator': 'app-nanagenerator.js',
  'app-ultimate-funnel': 'app-funnels.js',
  'app-modular-funnel': 'app-funnels.js',
  'app-deal-builder': 'app-funnels.js',
  'app-cours-forge': 'app-lms.js',
  'app-nanamarket': 'srv-search-engine.js',
  'app-webinar': 'app-webinar.js',
  'app-docusign': 'app-docusign.js',
  'srv-crm-automation': 'srv-crm-automation.js',
  'srv-theme-builder': 'srv-theme-builder.js',
  'srv-partner': 'srv-partner.js',
  'srv-course-create': 'srv-course-create.js',
  'srv-academy-support': 'app-lms.js',
  'srv-nana-switch': 'srv-nana-switch.js',
  'mod-inventory': 'mod-inventory.js',
  'mod-debts': 'mod-debts.js',
  'mod-analytics': 'srv-analytics.js',
  'tool-scanner': 'app-scanner.js',
  'tool-gateway': 'srv-webhooks.js',
};

export const DEFAULT_27_MODULES: AppRegistryModule[] = ALL_OFFICIAL_CATALOG.map((item, index) => {
  const meta = SECTION_BY_TAXONOMY[item.taxonomy];
  return {
    num: index + 1,
    key: item.id,
    name: item.name,
    defaultName: item.name,
    description: item.description,
    category: item.category,
    section: meta.section,
    sectionName: meta.sectionName,
    edgeFile: EDGE_FILE_BY_ID[item.id] || '',
    routes: item.route ? [item.route] : [],
    is_active: item.defaultActive,
    is_public: true,
  };
});

/** Alias de transition — ne plus utiliser le chiffre 38. */
export const DEFAULT_38_MODULES: AppRegistryModule[] = DEFAULT_27_MODULES;

const LOCAL_STORAGE_KEY = 'nanasore_app_registry_custom_modules';

const FICTIONAL_MODULE_KEYS = new Set([
  'app-tinnela',
  'app_tinnela',
  'app-invoices-orders',
  'app_invoices_orders',
  'srv-sms',
  'srv_sms',
  'srv-delivery',
  'srv_delivery',
  'srv-payment',
  'srv_payment',
  'srv-vip-support',
  'srv_vip_support',
  'mod-invoices',
  'mod_invoices',
  'mod-cash-closing',
  'mod_cash_closing',
  'tool-printer',
  'tool_printer',
  'tool-pdf',
  'tool_pdf',
  'tool-security',
  'tool_security',
]);

function lookupCustom(
  map: Map<string, Partial<AppRegistryModule>>,
  key: string
): Partial<AppRegistryModule> | undefined {
  return map.get(key) || map.get(key.replace(/-/g, '_')) || map.get(key.replace(/_/g, '-'));
}

function pruneFictionalFromCache(list: AppRegistryModule[]): AppRegistryModule[] {
  return list.filter((m) => m?.key && !FICTIONAL_MODULE_KEYS.has(m.key));
}

/**
 * Charge les 27 modules avec fusion des personnalisations depuis :
 * 1. Supabase (/api/modules)
 * 2. Firebase Firestore (collection 'app_registry')
 * 3. LocalStorage (cache hors-ligne)
 */
export async function loadAppRegistryModules(): Promise<{
  modules: AppRegistryModule[];
  source: 'SUPABASE' | 'FIREBASE' | 'LOCAL';
  supabaseOnline: boolean;
  firebaseOnline: boolean;
}> {
  let supabaseOnline = false;
  let firebaseOnline = false;
  const mergedMap = new Map<string, Partial<AppRegistryModule>>();

  try {
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) {
        pruneFictionalFromCache(parsed).forEach((m: any) => {
          if (m?.key) mergedMap.set(m.key, m);
        });
      }
    }
  } catch (e) {
    console.warn('[AppRegistry] Erreur lecture cache local :', e);
  }

  try {
    const resp = await fetch('/api/modules');
    if (resp.ok) {
      const json = await resp.json();
      if (json.success && Array.isArray(json.registry)) {
        json.registry.forEach((item: any) => {
          if (item?.key && !FICTIONAL_MODULE_KEYS.has(item.key)) {
            mergedMap.set(item.key, {
              ...mergedMap.get(item.key),
              name: item.name,
              description: item.description,
              category: item.category,
              is_public: item.is_public ?? true,
              updated_at: item.updated_at,
            });
          }
        });
        supabaseOnline = true;
      }
    }
  } catch (err) {
    console.warn('[AppRegistry] Supabase API injoignable :', err);
  }

  try {
    const { data: regRows } = await supabase.from('app_registry').select('*');
    if (regRows && regRows.length > 0) {
      regRows.forEach((row: any) => {
        const key = row.key;
        const data = (row.config_json || row) as any;
        if (key && !FICTIONAL_MODULE_KEYS.has(key)) {
          mergedMap.set(key, {
            ...mergedMap.get(key),
            name: data.name || key,
            description: data.description,
            category: data.category,
            is_active: data.is_active ?? true,
            is_public: data.is_public ?? true,
            updated_at: row.updated_at || data.updatedAt,
          });
        }
      });
      supabaseOnline = true;
    }
  } catch (err) {
    console.warn('[AppRegistry] Supabase app_registry note :', err);
  }

  const finalModules = DEFAULT_27_MODULES.map((base) => {
    const custom = lookupCustom(mergedMap, base.key);
    return {
      ...base,
      name: custom?.name || base.name,
      description: custom?.description || base.description,
      category: custom?.category || base.category,
      is_active: custom?.is_active ?? base.is_active,
      is_public: custom?.is_public ?? base.is_public,
      updated_at: custom?.updated_at,
    };
  });

  return {
    modules: finalModules,
    source: supabaseOnline ? 'SUPABASE' : 'LOCAL',
    supabaseOnline,
    firebaseOnline: false,
  };
}

export async function syncAppRegistryModule(mod: AppRegistryModule): Promise<{
  success: boolean;
  supabaseSynced: boolean;
  firebaseSynced: boolean;
  error?: string;
}> {
  let supabaseSynced = false;
  const firebaseSynced = false;
  const nowIso = new Date().toISOString();

  try {
    const { error: sbErr } = await supabase.from('app_registry').upsert(
      {
        key: mod.key,
        tenant_id: 'default',
        module_key: mod.category || 'official_module',
        config_json: {
          key: mod.key,
          name: mod.name,
          description: mod.description,
          category: mod.category,
          num: mod.num,
          section: mod.section,
          edgeFile: mod.edgeFile,
          routes: mod.routes,
          is_active: mod.is_active,
          is_public: mod.is_public,
          updatedAt: nowIso,
        },
      },
      { onConflict: 'key' }
    );

    if (!sbErr) {
      supabaseSynced = true;
    }
  } catch (sbErr: any) {
    console.error('[AppRegistry Supabase Error]', sbErr);
  }

  try {
    const resp = await fetch('/api/modules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blockKey: mod.key,
        name: mod.name,
        description: mod.description,
        category: mod.category,
        isActive: mod.is_active,
        is_public: mod.is_public,
        settings: {
          num: mod.num,
          section: mod.section,
          edgeFile: mod.edgeFile,
          routes: mod.routes,
        },
      }),
    });

    if (resp.ok) {
      const json = await resp.json();
      if (json.success) {
        supabaseSynced = true;
      }
    }
  } catch (sbErr: any) {
    console.error('[AppRegistry Supabase Error]', sbErr);
  }

  try {
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: AppRegistryModule[] = rawLocal ? JSON.parse(rawLocal) : [];
    list = pruneFictionalFromCache(list);
    const index = list.findIndex((m) => m.key === mod.key);
    const updatedMod = { ...mod, updated_at: nowIso };
    if (index >= 0) {
      list[index] = updatedMod;
    } else {
      list.push(updatedMod);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (locErr) {
    console.warn('[AppRegistry Local Cache Error]', locErr);
  }

  return {
    success: supabaseSynced || firebaseSynced,
    supabaseSynced,
    firebaseSynced,
  };
}

export async function syncAllAppRegistryModules(modules: AppRegistryModule[]): Promise<{
  success: boolean;
  total: number;
  syncedCount: number;
  supabaseSynced: boolean;
  firebaseSynced: boolean;
}> {
  let count = 0;
  let allSb = true;
  let allFb = true;

  for (const mod of modules) {
    const res = await syncAppRegistryModule(mod);
    if (res.success) count++;
    if (!res.supabaseSynced) allSb = false;
    if (!res.firebaseSynced) allFb = false;
  }

  return {
    success: count > 0,
    total: modules.length,
    syncedCount: count,
    supabaseSynced: allSb,
    firebaseSynced: allFb,
  };
}
