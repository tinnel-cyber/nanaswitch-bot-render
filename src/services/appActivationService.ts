/**
 * SERVICE DE GESTION DES ACTIVATIONS & PERSISTANCE FIREBASE REALTIME DATABASE (RTDB)
 * Gère le nœud : /tenants/{tenantId}/installedApps/{appId}
 */

import { supabase } from '../lib/supabase';
import { APPS_REGISTRY, AppRegistryItem } from '../data/appsRegistry';

export interface InstalledAppData {
  status: 'active' | 'trial';
  activatedAt: number;
  expiresAt?: number | null;
  pinnedToSidebar: boolean;
}

const STORAGE_PREFIX = 'nana_tenant_apps_';
const ACTIVATION_EVENT = 'nanasore_app_activated';
const PIN_CHANGED_EVENT = 'nanasore_app_pinned';

// Applications activées par défaut pour tout nouveau marchand
export const DEFAULT_PINNED_APPS: Record<string, InstalledAppData> = {
  'nanagenerator': {
    status: 'active',
    activatedAt: Date.now() - 86400000,
    expiresAt: null,
    pinnedToSidebar: true
  },
  'caisse-pos': {
    status: 'active',
    activatedAt: Date.now() - 86400000,
    expiresAt: null,
    pinnedToSidebar: true
  },
  'vitrine-eshop': {
    status: 'active',
    activatedAt: Date.now() - 86400000,
    expiresAt: null,
    pinnedToSidebar: true
  },
  'funnel-builder': {
    status: 'trial',
    activatedAt: Date.now(),
    expiresAt: Date.now() + 7 * 86400000,
    pinnedToSidebar: true
  },
  'ai-gemini': {
    status: 'active',
    activatedAt: Date.now() - 86400000,
    expiresAt: null,
    pinnedToSidebar: true
  },
  'reports-analytics': {
    status: 'active',
    activatedAt: Date.now() - 86400000,
    expiresAt: null,
    pinnedToSidebar: true
  }
};

/**
 * Résout l'identifiant strict du tenant actuel
 */
export function resolveCurrentTenantId(currentUser?: any): string {
  if (currentUser?.storeId && currentUser.storeId !== 'store-nana-1') {
    return currentUser.storeId;
  }
  if (currentUser?.uid) return currentUser.uid;
  if (currentUser?.id) return currentUser.id;
  if (typeof window !== 'undefined') {
    try {
      const savedUser = localStorage.getItem('nana_store_auth_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.storeId) return u.storeId;
        if (u.uid) return u.uid;
        if (u.id) return u.id;
      }
    } catch (e) {}
  }
  return 'store-konkobo-telecom';
}

/**
 * Récupère le cache local des applications installées pour un tenant
 */
export function getLocalTenantApps(tenantId: string): Record<string, InstalledAppData> {
  if (typeof window === 'undefined') return DEFAULT_PINNED_APPS;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tenantId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PINNED_APPS, ...parsed };
    }
  } catch (e) {
    console.error('Erreur lecture apps locales :', e);
  }
  return DEFAULT_PINNED_APPS;
}

/**
 * Sauvegarde le cache local des applications installées pour un tenant
 */
function setLocalTenantApps(tenantId: string, data: Record<string, InstalledAppData>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tenantId}`, JSON.stringify(data));
  } catch (e) {}
}

/**
 * Vérifie si une application est activée pour le tenant
 */
export function isAppActivated(appId: string, tenantId?: string): boolean {
  const tId = tenantId || resolveCurrentTenantId();
  const apps = getLocalTenantApps(tId);
  return Boolean(apps[appId] && (apps[appId].status === 'active' || apps[appId].status === 'trial'));
}

/**
 * Vérifie si une application est épinglée à la barre latérale
 */
export function isAppPinnedToSidebar(appId: string, tenantId?: string): boolean {
  const tId = tenantId || resolveCurrentTenantId();
  const apps = getLocalTenantApps(tId);
  return Boolean(apps[appId]?.pinnedToSidebar);
}

export const isAppPinned = isAppPinnedToSidebar;

/**
 * Active une application et persiste dans Firebase Realtime Database
 * Nœud RTDB : /tenants/{tenantId}/installedApps/{appId}
 */
export async function activateApp(
  appId: string, 
  trialType?: string, 
  tenantId?: string
): Promise<InstalledAppData> {
  const tId = tenantId || resolveCurrentTenantId();
  const now = Date.now();
  
  // Calcul de la date d'expiration pour les essais temporels
  let expiresAt: number | null = null;
  const status: 'active' | 'trial' = (trialType === 'time_trial' || trialType === 'credits') ? 'trial' : 'active';
  
  if (trialType === 'time_trial') {
    expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 jours d'essai
  } else if (trialType === 'credits') {
    expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 jours pour consommer les crédits
  }

  const appData: InstalledAppData = {
    status,
    activatedAt: now,
    expiresAt,
    pinnedToSidebar: true // Épinglée automatiquement à l'activation
  };

  // 1. Mise à jour instantanée du cache local
  const current = getLocalTenantApps(tId);
  current[appId] = appData;
  setLocalTenantApps(tId, current);

  // Émission d'événement pour réactivité UI immédiate
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ACTIVATION_EVENT, { detail: { appId, tenantId: tId, data: appData } }));
  }

  // 2. Persistance dans Supabase app_registry
  try {
    await supabase.from('app_registry').upsert({
      key: `installed_app_${tId}_${appId}`,
      name: appId,
      tenant_id: tId,
      module_key: 'installed_apps',
      config_json: appData,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn(`[SUPABASE] Sauvegarde app ${appId} sur tenant ${tId}:`, err);
  }

  return appData;
}

/**
 * Épingler / Désépingler une application de la Sidebar avec synchronisation Supabase
 */
export async function togglePinApp(
  appId: string, 
  pinned?: boolean, 
  tenantId?: string
): Promise<boolean> {
  const tId = tenantId || resolveCurrentTenantId();
  const current = getLocalTenantApps(tId);
  const appData = current[appId] || {
    status: 'active',
    activatedAt: Date.now(),
    expiresAt: null,
    pinnedToSidebar: false
  };

  const newPinnedStatus = pinned !== undefined ? pinned : !appData.pinnedToSidebar;
  appData.pinnedToSidebar = newPinnedStatus;
  current[appId] = appData;
  setLocalTenantApps(tId, current);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PIN_CHANGED_EVENT, { detail: { appId, pinned: newPinnedStatus, tenantId: tId } }));
  }

  // Synchronisation Supabase app_registry
  try {
    await supabase.from('app_registry').upsert({
      key: `installed_app_${tId}_${appId}`,
      name: appId,
      tenant_id: tId,
      module_key: 'installed_apps',
      config_json: appData,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn(`[SUPABASE] Mise à jour pin pour ${appId}:`, err);
  }

  return newPinnedStatus;
}

/**
 * Désactiver une application
 */
export async function deactivateApp(appId: string, tenantId?: string): Promise<void> {
  const tId = tenantId || resolveCurrentTenantId();
  const current = getLocalTenantApps(tId);
  delete current[appId];
  setLocalTenantApps(tId, current);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ACTIVATION_EVENT, { detail: { appId, tenantId: tId, deactivated: true } }));
  }

  try {
    await supabase.from('app_registry').delete().eq('key', `installed_app_${tId}_${appId}`);
  } catch (err) {
    console.warn(`[SUPABASE] Suppression app pour ${appId}:`, err);
  }
}

/**
 * Écoute en temps réel des applications installées pour le tenant via Supabase Realtime & Cache Local
 */
export function listenToTenantApps(
  tenantId: string, 
  onUpdate: (apps: Record<string, InstalledAppData>) => void
): () => void {
  const tId = tenantId || resolveCurrentTenantId();

  // Émission immédiate du cache local (0ms de latence)
  onUpdate(getLocalTenantApps(tId));

  // Écoute des événements locaux dans la fenêtre courante
  const handleLocalEvent = () => {
    onUpdate(getLocalTenantApps(tId));
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(ACTIVATION_EVENT, handleLocalEvent);
    window.addEventListener(PIN_CHANGED_EVENT, handleLocalEvent);
    window.addEventListener('storage', handleLocalEvent);
  }

  // Écouteur Supabase Realtime (remplace toute socket Firebase persistante)
  const channelName = `tenant_apps_${tId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_registry',
        filter: `tenant_id=eq.${tId}`,
      },
      (payload) => {
        if (payload.new) {
          const rec = payload.new as any;
          if (rec.module_key) {
            const current = getLocalTenantApps(tId);
            current[rec.module_key] = {
              status: rec.is_active ? 'active' : 'trial',
              activatedAt: rec.created_at ? new Date(rec.created_at).getTime() : Date.now(),
              expiresAt: null,
              pinnedToSidebar: true,
            };
            setLocalTenantApps(tId, current);
            onUpdate(current);
          }
        }
      }
    )
    .subscribe();

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(ACTIVATION_EVENT, handleLocalEvent);
      window.removeEventListener(PIN_CHANGED_EVENT, handleLocalEvent);
      window.removeEventListener('storage', handleLocalEvent);
    }
    supabase.removeChannel(channel);
  };
}

/**
 * Récupère les objets AppRegistryItem complets des applications épinglées à la barre latérale
 */
export function getPinnedApps(tenantId?: string): { app: AppRegistryItem; data: InstalledAppData }[] {
  const tId = tenantId || resolveCurrentTenantId();
  const installedMap = getLocalTenantApps(tId);

  const pinnedList: { app: AppRegistryItem; data: InstalledAppData }[] = [];

  Object.entries(installedMap).forEach(([appId, data]) => {
    if (data.pinnedToSidebar) {
      const appItem = APPS_REGISTRY.find((a) => a.id === appId);
      if (appItem) {
        pinnedList.push({ app: appItem, data });
      }
    }
  });

  return pinnedList;
}

/**
 * Écouteur générique de changements d'activation
 */
export function onAppActivationChanged(callback: (appId?: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ appId?: string }>;
    callback(custom.detail?.appId);
  };
  window.addEventListener(ACTIVATION_EVENT, handler);
  window.addEventListener(PIN_CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(ACTIVATION_EVENT, handler);
    window.removeEventListener(PIN_CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

// Re-export des nouveaux services modulaires dynamiques
export * from './moduleActivationService';
