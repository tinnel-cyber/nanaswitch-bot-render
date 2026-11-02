/**
 * @file hubPublishService.ts
 * @description Service de publication unifi pour le Hub Builder vers Firebase RTDB et l'App Registry
 * Assure la synchronisation atomique et instantane de chaque bloc configur avec l'Omnibar et le registre d'applications.
 */

import { ref, set, get } from "firebase/database";
import { database } from "../firebaseConfig";

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
 * Rcupre l'ensemble des modules enregistrs dans le cache local (App Registry)
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
 * Met  jour le cache local du registre d'applications (app_registry_cache)
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
    console.warn("[Hub Registry] chec de la mise  jour du cache local :", e);
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
 * Nettoie un objet en remplaant tout `undefined` par une chane vide ou une valeur par dfaut
 */
function cleanPayloadForRtdb(data: any): any {
  if (data === undefined || data === null) return '';
  if (Array.isArray(data)) return data.map(cleanPayloadForRtdb);
  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        clean[k] = cleanPayloadForRtdb(v);
      }
    }
    return clean;
  }
  return data;
}

/**
 * Publie ou met  jour un bloc du Hub Builder dans Firebase RTDB (/central_hub_config/{blockId})
 * et synchronise immdiatement l'App Registry ainsi que l'Omnibar.
 * 
 * Rgle stricte du Block Builder : crasement obligatoire de l'ancienne version sans duplication.
 */
export async function publishHubBlock(blockId: string, blockData: HubBlockConfig): Promise<void> {
  if (!blockId) {
    throw new Error("[Hub Builder] ID de bloc invalide pour la publication.");
  }

  try {
    const targetPayload = cleanPayloadForRtdb({
      ...blockData,
      id: blockId,
      title: blockData.title || 'Nouveau Bloc Hub',
      type: blockData.type || 'module',
      imageUrl: blockData.imageUrl || '',
      keywords: Array.isArray(blockData.keywords) ? blockData.keywords : [],
      routeOrAction: blockData.routeOrAction || '',
      updatedAt: new Date().toISOString(),
    });

    // 1. Dfinition du chemin de destination dans Firebase RTDB
    if (database) {
      const rtdbRef = ref(database, `central_hub_config/${blockId}`);

      // 2. criture atomique dans Firebase RTDB (crasement de l'ancienne version)
      await set(rtdbRef, targetPayload);
      console.log(`[Hub Builder] Succs : Bloc ${blockId} enregistr dans Firebase RTDB sous /central_hub_config/${blockId}.`);
    }

    // 3. Mise  jour de l'App Registry (stockage local / mmoire de l'application)
    updateLocalAppRegistry(blockId, targetPayload as HubBlockConfig);

    // 4. Notification globale pour l'Omnibar (dclenche un rafrachissement instantan)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hub_registry_updated', { detail: { blockId, data: targetPayload } }));
      window.dispatchEvent(new Event('central_hub_config_updated'));
    }

    // 5. Synchronisation automatique vers Supabase (App Registry & Organization Blocks)
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
        }).catch((err) => {
          console.warn('[Hub Builder] Synchronisation Supabase différée :', err);
        });
      } catch {
        // Non-bloquant
      }
    }
  } catch (error) {
    console.error(`[Hub Builder] Erreur lors de la publication du bloc ${blockId} :`, error);
    throw error;
  }
}
