/**
 * Données réseau SaaS Nanasore — Initialisation propre sans données factices
 * Remplacées à l'exécution par les tables SQL et Realtime Supabase (organizations, sales, profiles).
 */
import { SaasStore, SaasActionTask } from '../types';

export const INITIAL_SAAS_STORES: SaasStore[] = [];

export const INITIAL_SAAS_TASKS: SaasActionTask[] = [];

export const SAAS_GLOBAL_KPI = {
  activeStoresCount: 0,
  totalStoresCount: 0,
  newStoresThisMonth: 0,
  totalNetworkGMV: 0,
  growthRateGMV: '0%',
  totalTransactionsCount: 0,
  monthlyRecurringRevenueMRR: 0,
  averageBasketSizeNetwork: 0,
  countriesCovered: ['Burkina Faso', 'Côte d\'Ivoire', 'Sénégal', 'Mali', 'Bénin', 'Togo'],
  healthyStoresRate: 100,
  atRiskStoresCount: 0,
};
