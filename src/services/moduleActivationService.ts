/**
 * SERVICE DYNAMIQUE D'ACTIVATION DES MODULES FIREBASE RTDB
 * Gère le cycle de vie et l'activation en temps réel des modules sur le nœud :
 * /tenants/{tenantId}/modules/{moduleId}
 */

import { rtdb } from '../firebase';
import { ref, set, get } from 'firebase/database';
import { getOfficialModuleById, isModuleDefaultActive, AppModule } from '../appRegistry';
import { resolveCurrentTenantId } from './appActivationService';

export interface ModuleStatusPayload {
  enabled: boolean;
  updatedAt: number;
}

export type TenantModulesMap = Record<string, ModuleStatusPayload>;

const MODULES_STORAGE_PREFIX = 'nana_tenant_modules_';
export const MODULE_TOGGLED_EVENT = 'nanasore_module_toggled';

/**
 * Récupère le cache local des modules pour un tenant donné
 */
export function getLocalTenantModules(tenantId: string): TenantModulesMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${MODULES_STORAGE_PREFIX}${tenantId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[MODULES SERVICE] Erreur lecture cache local :', err);
  }
  return {};
}

/**
 * Met à jour le cache local des modules pour un tenant donné
 */
export function setLocalTenantModules(tenantId: string, map: TenantModulesMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${MODULES_STORAGE_PREFIX}${tenantId}`, JSON.stringify(map));
  } catch (err) {
    console.warn('[MODULES SERVICE] Erreur écriture cache local :', err);
  }
}

/**
 * Vérifie si un module est actif pour un tenant (localement ou selon valeur par défaut)
 */
export function isModuleActiveLocally(moduleId: string, tenantId?: string): boolean {
  const tId = tenantId || resolveCurrentTenantId();
  const cleanId = getOfficialModuleById(moduleId)?.id || moduleId;
  const localMap = getLocalTenantModules(tId);

  if (localMap[cleanId] && typeof localMap[cleanId].enabled === 'boolean') {
    return localMap[cleanId].enabled;
  }
  return isModuleDefaultActive(cleanId);
}

/**
 * Active ou désactive un module et persiste le changement dans Firebase Realtime Database
 * Nœud RTDB : /tenants/{tenantId}/modules/{moduleId}
 * Format : { enabled: true/false, updatedAt: timestamp }
 *
 * @param moduleId Identifiant ou alias du module
 * @param targetStatus État d'activation souhaité (optionnel, alterne si non précisé)
 * @param tenantId Identifiant du marchand/tenant (optionnel, résolu automatiquement)
 */
export async function toggleModuleStatus(
  moduleId: string,
  targetStatus?: boolean,
  tenantId?: string
): Promise<ModuleStatusPayload> {
  const tId = tenantId || resolveCurrentTenantId();
  const official = getOfficialModuleById(moduleId);
  const cleanId = official ? official.id : moduleId;

  // Calcul du nouvel état
  let newEnabled: boolean;
  const currentMap = getLocalTenantModules(tId);
  const currentEntry = currentMap[cleanId];

  if (targetStatus !== undefined) {
    newEnabled = Boolean(targetStatus);
  } else if (currentEntry && typeof currentEntry.enabled === 'boolean') {
    newEnabled = !currentEntry.enabled;
  } else {
    // Si pas encore configuré en base, on inverse la valeur statique par défaut
    const defaultActive = official ? official.defaultActive : false;
    newEnabled = !defaultActive;
  }

  const payload: ModuleStatusPayload = {
    enabled: newEnabled,
    updatedAt: Date.now()
  };

  // 1. Mise à jour instantanée du cache local (zéro latence UI)
  currentMap[cleanId] = payload;
  setLocalTenantModules(tId, currentMap);

  // 2. Émission d'un événement global pour mise à jour immédiate des composants montés
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(MODULE_TOGGLED_EVENT, {
        detail: {
          tenantId: tId,
          moduleId: cleanId,
          payload
        }
      })
    );
  }

  // 3. Persistance temps réel dans Firebase Realtime Database
  try {
    const moduleRef = ref(rtdb, `tenants/${tId}/modules/${cleanId}`);
    await set(moduleRef, payload);
    console.log(`[RTDB] Module '${cleanId}' mis à jour sur /tenants/${tId}/modules/${cleanId} -> enabled: ${newEnabled}`);
  } catch (error) {
    console.warn(`[RTDB ERROR] Échec écriture module ${cleanId} sur ${tId} (mode hors-ligne actif) :`, error);
  }

  // 4. Synchronisation transactionnelle Supabase (RPC publish_organization_block)
  if (typeof window !== 'undefined') {
    fetch('/api/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockKey: cleanId,
        isActive: newEnabled,
        organizationId: tId,
      }),
    }).catch((e) => {
      console.warn('[SUPABASE SYNC] Envoi bloc omnibar Supabase différé :', e);
    });
  }

  return payload;
}
