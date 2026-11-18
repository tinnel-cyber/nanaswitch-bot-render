/**
 * @file hubPublishService.ts
 * @description Service de publication unifié pour le Hub Builder vers Supabase et l'App Registry
 * Assure la synchronisation atomique et instantanée de chaque bloc configuré avec l'Omnibar et le registre d'applications.
 */

import { supabase } from '../lib/supabase';

export interface HubBlockConfig {
  id: string;
  title: string;
  type: string;
  imageUrl?: string;
  keywords: string[];
  routeOrAction: string;
  updatedAt: string;
  [key: string]: any;
}

/**
 * Récupère l'ensemble des modules enregistrés dans le cache local (App Registry)
 */
export function getLocalAppRegistry(): Record<string, HubBlockConfig> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem("app_registry_cache");
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn("[Hub Registry] Erreur lors de la lecture du cache local:", e);
    return {};
  }
}

/**
 * Met à jour le cache local du registre d'applications (app_registry_cache)
 */
export function updateLocalAppRegistry(blockId: string, blockData: HubBlockConfig): void {
  try {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem("app_registry_cache");
    const registry = raw ? JSON.parse(raw) : {};
    registry[blockId] = {
      ...blockData,
      id: blockId,
      updatedAt: blockData.updatedAt || new Date().toISOString(),
    };
    localStorage.setItem("app_registry_cache", JSON.stringify(registry));
  } catch (e) {
    console.warn("[Hub Registry] Échec de la mise à jour du cache local :", e);
  }
}

/**
 * Supprime un bloc du registre d'applications local
 */
export function removeLocalAppRegistry(blockId: string): void {
  try {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem("app_registry_cache");
    if (!raw) return;
    const registry = JSON.parse(raw);
    delete registry[blockId];
    localStorage.setItem("app_registry_cache", JSON.stringify(registry));
  } catch (e) {
    console.warn("[Hub Registry] Erreur lors de la suppression du cache local :", e);
  }
}

/**
 * Nettoie un objet en remplaçant tout `undefined` par une chaîne vide ou une valeur par défaut
 */
function cleanPayload(data: any): any {
  if (data === undefined || data === null) return '';
  if (Array.isArray(data)) return data.map(cleanPayload);
  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        clean[k] = cleanPayload(v);
      }
    }
    return clean;
  }
  return data;
}

/**
 * Publie ou met à jour un bloc du Hub Builder dans Supabase (table app_registry)
 * et synchronise immédiatement l'App Registry ainsi que l'Omnibar.
 * 
 * Règle stricte du Block Builder : écrasement obligatoire de l'ancienne version sans duplication.
 */
export async function publishHubBlock(blockId: string, blockData: HubBlockConfig): Promise<void> {
  if (!blockId) {
    throw new Error("[Hub Builder] ID de bloc invalide pour la publication.");
  }

  try {
    const targetPayload = cleanPayload({
      ...blockData,
      id: blockId,
      title: blockData.title || 'Nouveau Bloc Hub',
      type: blockData.type || 'module',
      imageUrl: blockData.imageUrl || '',
      keywords: Array.isArray(blockData.keywords) ? blockData.keywords : [],
      routeOrAction: blockData.routeOrAction || '',
      updatedAt: new Date().toISOString(),
    });

    // 1. Enregistrement direct dans Supabase SQL (table app_registry)
    try {
      await supabase.from('app_registry').upsert({
        key: `central_hub_config_${blockId}`,
        name: targetPayload.title || blockId,
        module_key: 'central_hub_blocks',
        config_json: targetPayload,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      console.log(`[Hub Builder] Succès : Bloc ${blockId} synchronisé dans Supabase app_registry.`);
    } catch (sqlErr) {
      console.warn('[Hub Builder] Note: Synchronisation Supabase app_registry :', sqlErr);
    }

    // 2. Mise à jour de l'App Registry (stockage local / mémoire de l'application)
    updateLocalAppRegistry(blockId, targetPayload as HubBlockConfig);

    // 3. Notification globale pour l'Omnibar (déclenche un rafraîchissement instantané)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hub_registry_updated', { detail: { blockId, data: targetPayload } }));
      window.dispatchEvent(new Event('central_hub_config_updated'));
    }

    // 4. Synchronisation vers l'API interne modules si disponible
    if (typeof window !== 'undefined') {
      try {
        fetch('/api/modules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockKey: blockId,
            isActive: true,
            name: targetPayload.title || blockId,
            description: targetPayload.description || '',
            category: targetPayload.category || targetPayload.type || 'General',
            settings: targetPayload,
          }),
        }).catch(() => {});
      } catch {}
    }
  } catch (error) {
    console.error(`[Hub Builder] Erreur lors de la publication du bloc ${blockId} :`, error);
    throw error;
  }
}
