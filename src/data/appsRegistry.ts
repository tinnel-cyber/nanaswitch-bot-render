/**
 * REGISTRE CENTRAL DES MINI-APPLICATIONS NANASORE (Dérivé à 100 % du Registre Canonique)
 * Source unique de vérité : src/config/appRegistry.ts (CANONICAL_APP_REGISTRY).
 * Aucun doublon, aucune fiche statique parallèle du Central Hub.
 */

import { CANONICAL_APP_REGISTRY, CanonicalModule } from '../config/appRegistry';

export type AppTrialType = 'credits' | 'time_trial' | 'freemium';
export type AppInstallationType = 'pwa_ready' | 'instant' | 'system' | 'installed';

export interface AppRegistryItem {
  id: string;
  appName: string;
  appLogo: string;
  shortDescription: string;
  category: string;
  keywords: string[];
  route: string;
  installationType: AppInstallationType | string;
  trialType: AppTrialType;
  priceMonthly: number;
  palmares: string;
  badgePalmares?: string;
  trialLabel?: string;
  isPopular?: boolean;
  isNew?: boolean;
  badge?: string;
  taxonomyType?: 'Service' | 'Application' | 'Module' | 'Outil';
  taxonomy?: 'APPLICATION' | 'SERVICE' | 'MODULE' | 'OUTIL';
  isPro?: boolean;
  proKey?: string;
  targetView?: string;
  rating?: number;
  iconName?: string;
  isUnderConstruction?: boolean;
}

function mapCanonicalToRegistryItem(mod: CanonicalModule): AppRegistryItem {
  const taxonomyLabel: 'Service' | 'Application' | 'Module' | 'Outil' =
    mod.taxonomy === 'APPLICATION'
      ? 'Application'
      : mod.taxonomy === 'SERVICE'
      ? 'Service'
      : mod.taxonomy === 'MODULE'
      ? 'Module'
      : 'Outil';

  return {
    id: mod.id,
    appName: mod.name,
    appLogo: `/assets/icons/apps/${mod.slug || mod.id}.svg`,
    shortDescription: mod.description,
    category: mod.category,
    keywords: Array.isArray(mod.keywords) ? mod.keywords : [],
    route: mod.route,
    installationType: 'instant',
    trialType: 'freemium',
    priceMonthly: 0,
    palmares: mod.isUnderConstruction
      ? '🚧 En construction'
      : mod.defaultActive
      ? '✅ Inclus'
      : '⭐ Disponible',
    badgePalmares: mod.isUnderConstruction ? '🚧 En construction' : taxonomyLabel,
    trialLabel: mod.isUnderConstruction
      ? 'En construction'
      : mod.defaultActive
      ? 'Actif'
      : 'Disponible',
    isPopular: mod.defaultActive && !mod.isUnderConstruction,
    isNew: false,
    badge: mod.isUnderConstruction ? '🚧 En construction' : taxonomyLabel,
    taxonomyType: taxonomyLabel,
    taxonomy: mod.taxonomy,
    targetView: mod.view || mod.actionId,
    rating: 4.9,
    iconName: mod.icon,
    isUnderConstruction: Boolean(mod.isUnderConstruction),
  };
}

export const APPS_REGISTRY: AppRegistryItem[] = CANONICAL_APP_REGISTRY.map(mapCanonicalToRegistryItem);

export const APP_CATEGORIES = [
  'Tous',
  ...Array.from(new Set(APPS_REGISTRY.map((app) => app.category).filter(Boolean))),
] as const;

export function getAppTrialLabel(app: AppRegistryItem): string {
  if (app.trialLabel) return app.trialLabel;
  if (app.trialType === 'credits') return '3 crédits offerts';
  if (app.trialType === 'time_trial') return '7 jours offerts';
  return 'Gratuit à vie';
}

export function getAppPalmaresBadge(app: AppRegistryItem): string {
  return app.badgePalmares || app.palmares || '⭐ Disponible';
}

export function getPopularApps(): AppRegistryItem[] {
  return APPS_REGISTRY.filter((app) => app.isPopular);
}

export function getNewApps(): AppRegistryItem[] {
  return APPS_REGISTRY.filter((app) => app.isNew);
}

export function searchAppsRegistry(query: string, categoryFilter: string = 'Tous'): AppRegistryItem[] {
  const cleanQ = query.trim().toLowerCase();

  return APPS_REGISTRY.filter((app) => {
    if (categoryFilter !== 'Tous' && app.category !== categoryFilter) {
      return false;
    }
    if (!cleanQ) return true;
    if (app.appName.toLowerCase().includes(cleanQ)) return true;
    if (app.keywords.some((kw) => kw.toLowerCase().includes(cleanQ))) return true;
    if (app.shortDescription.toLowerCase().includes(cleanQ)) return true;
    if (app.category.toLowerCase().includes(cleanQ)) return true;
    return false;
  });
}
