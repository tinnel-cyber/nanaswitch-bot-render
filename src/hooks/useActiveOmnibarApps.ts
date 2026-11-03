/**
 * HOOK DE SYNCHRONISATION TEMPS RÉEL FIREBASE RTDB
 * Écoute le nœud /tenants/{tenantId}/modules/ et fusionne dynamiquement
 * les 27 modules officiels du catalogue statique avec l'état d'activation Firebase.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase';
import { OFFICIAL_MODULES, AppModule, getOfficialModuleById } from '../appRegistry';
import { resolveCurrentTenantId } from '../services/appActivationService';
import { 
  toggleModuleStatus, 
  getLocalTenantModules, 
  setLocalTenantModules,
  MODULE_TOGGLED_EVENT, 
  TenantModulesMap 
} from '../services/moduleActivationService';

export interface ActiveOmnibarModule extends AppModule {
  enabled: boolean;
  updatedAt?: number;
  isCustomConfigured: boolean;
}

export interface UseActiveOmnibarAppsResult {
  modules: ActiveOmnibarModule[];
  activeModules: ActiveOmnibarModule[];
  inactiveModules: ActiveOmnibarModule[];
  isModuleActive: (moduleIdOrAlias: string) => boolean;
  toggleModule: (moduleIdOrAlias: string, targetStatus?: boolean) => Promise<boolean>;
  tenantId: string;
  loading: boolean;
  error: Error | null;
}

/**
 * Fusionne le catalogue officiel des 27 applications, services, modules et outils avec le dictionnaire Firebase RTDB
 */
function mergeModulesWithRemoteData(
  remoteData: Record<string, any> | null | undefined
): ActiveOmnibarModule[] {
  const safeData = remoteData || {};

  return OFFICIAL_MODULES.map((official) => {
    let rawVal = safeData[official.id];
    if (rawVal === undefined && official.aliases) {
      for (const alias of official.aliases) {
        if (safeData[alias] !== undefined) {
          rawVal = safeData[alias];
          break;
        }
      }
    }

    let isEnabled = official.defaultActive;
    let isCustom = false;
    let updatedAt: number | undefined = undefined;

    if (rawVal !== undefined && rawVal !== null) {
      if (typeof rawVal === 'boolean') {
        isEnabled = rawVal;
        isCustom = true;
      } else if (typeof rawVal === 'object' && typeof rawVal.enabled === 'boolean') {
        isEnabled = rawVal.enabled;
        updatedAt = typeof rawVal.updatedAt === 'number' ? rawVal.updatedAt : undefined;
        isCustom = true;
      }
    }

    return {
      ...official,
      enabled: isEnabled,
      updatedAt,
      isCustomConfigured: isCustom
    };
  });
}

/**
 * Hook principal de synchronisation dynamique pour l'Omnibar et les modules NGM/Nanasore
 */
export function useActiveOmnibarApps(tenantIdProp?: string): UseActiveOmnibarAppsResult {
  const [currentTenantId, setCurrentTenantId] = useState<string>(() => {
    return tenantIdProp || resolveCurrentTenantId();
  });

  useEffect(() => {
    if (tenantIdProp && tenantIdProp !== currentTenantId) {
      setCurrentTenantId(tenantIdProp);
    }
  }, [tenantIdProp, currentTenantId]);

  // Initialisation immédiate avec le cache local pour zéro latence au premier rendu
  const [modulesMap, setModulesMap] = useState<TenantModulesMap>(() => {
    return getLocalTenantModules(currentTenantId);
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Synchronisation temps réel via Firebase Realtime Database
  useEffect(() => {
    if (!currentTenantId) return;

    const modulesRef = ref(rtdb, `tenants/${currentTenantId}/modules`);

    // 1. Écoute continue onValue du nœud /tenants/{tenantId}/modules/
    const unsubscribeRtdb = onValue(
      modulesRef,
      (snapshot) => {
        setLoading(false);
        setError(null);
        if (snapshot.exists()) {
          const val = snapshot.val() as Record<string, any>;
          // Normaliser les données lues
          const normalized: TenantModulesMap = {};
          Object.entries(val || {}).forEach(([k, v]) => {
            if (typeof v === 'boolean') {
              normalized[k] = { enabled: v, updatedAt: Date.now() };
            } else if (v && typeof v === 'object' && typeof v.enabled === 'boolean') {
              normalized[k] = {
                enabled: v.enabled,
                updatedAt: typeof v.updatedAt === 'number' ? v.updatedAt : Date.now()
              };
            }
          });
          setModulesMap(normalized);
          setLocalTenantModules(currentTenantId, normalized);
        } else {
          // Aucun enregistrement Firebase : conservation du dictionnaire vide (on utilisera defaultActive)
          setModulesMap({});
          setLocalTenantModules(currentTenantId, {});
        }
      },
      (err) => {
        console.warn(`[RTDB MODULES] Écoute interrompue pour le tenant ${currentTenantId}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    // 2. Écoute des événements d'activation émis localement (mise à jour optimiste synchrone)
    const handleLocalToggled = (event: Event) => {
      const customEvent = event as CustomEvent<{
        tenantId: string;
        moduleId: string;
        payload: { enabled: boolean; updatedAt: number };
      }>;
      if (customEvent.detail && customEvent.detail.tenantId === currentTenantId) {
        setModulesMap((prev) => ({
          ...prev,
          [customEvent.detail.moduleId]: customEvent.detail.payload
        }));
      }
    };

    window.addEventListener(MODULE_TOGGLED_EVENT, handleLocalToggled);

    // 3. Synchronisation initiale avec Supabase PostgreSQL (public.organization_blocks)
    if (typeof window !== 'undefined') {
      fetch(`/api/modules?organizationId=${encodeURIComponent(currentTenantId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.activeBlocks && Array.isArray(data.activeBlocks) && data.activeBlocks.length > 0) {
            setModulesMap((prev) => {
              const updated = { ...prev };
              data.activeBlocks.forEach((b: any) => {
                const key = b.block_key;
                if (key) {
                  updated[key] = {
                    enabled: Boolean(b.is_active),
                    updatedAt: b.updated_at ? new Date(b.updated_at).getTime() : Date.now(),
                  };
                }
              });
              setLocalTenantModules(currentTenantId, updated);
              return updated;
            });
          }
        })
        .catch((e) => console.warn('[SUPABASE OMNIBAR SYNC] Lecture blocs différée :', e));
    }

    return () => {
      unsubscribeRtdb();
      window.removeEventListener(MODULE_TOGGLED_EVENT, handleLocalToggled);
    };
  }, [currentTenantId]);

  // Liste complète fusionnée des 14 modules officiels
  const modules = useMemo(() => {
    return mergeModulesWithRemoteData(modulesMap);
  }, [modulesMap]);

  // Filtrage des modules actifs
  const activeModules = useMemo(() => {
    return modules.filter((m) => m.enabled);
  }, [modules]);

  // Filtrage des modules inactifs
  const inactiveModules = useMemo(() => {
    return modules.filter((m) => !m.enabled);
  }, [modules]);

  // Vérificateur dynamique d'activation par ID ou alias
  const isModuleActive = useCallback(
    (moduleIdOrAlias: string): boolean => {
      if (!moduleIdOrAlias) return false;
      const official = getOfficialModuleById(moduleIdOrAlias);
      const cleanId = official ? official.id : moduleIdOrAlias.toLowerCase();
      
      const found = modules.find((m) => m.id === cleanId);
      if (found) return found.enabled;

      // Repli sur le statut par défaut si non trouvé
      return official ? official.defaultActive : false;
    },
    [modules]
  );

  // Bascule rapide d'un statut de module
  const toggleModule = useCallback(
    async (moduleIdOrAlias: string, targetStatus?: boolean): Promise<boolean> => {
      const result = await toggleModuleStatus(moduleIdOrAlias, targetStatus, currentTenantId);
      return result.enabled;
    },
    [currentTenantId]
  );

  return {
    modules,
    activeModules,
    inactiveModules,
    isModuleActive,
    toggleModule,
    tenantId: currentTenantId,
    loading,
    error
  };
}

export default useActiveOmnibarApps;
