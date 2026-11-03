/**
 * ============================================================================
 * CONTROL PLANE — ESPACE SUPER ADMIN & FONDATEUR
 * ============================================================================
 * 
 * Totalement isolé des 27 modules marchands.
 * Ne figure pas dans le registre client appRegistry.ts.
 * Sécurisé par SuperAdminGuard.
 */

export * from './guards/SuperAdminGuard';
export * from './dashboard';
export * from './tenants';
export * from './pricing';
export * from './system-health';
export * from './ControlPlaneRouter';
export { default } from './ControlPlaneRouter';
