/**
 * ============================================================================
 * PONT DE RÉTRO-COMPATIBILITÉ
 * ============================================================================
 * La source unique de vérité officielle de l'architecture Nanasore réside
 * désormais exclusivement dans :
 *   👉 src/config/appRegistry.ts (27 modules canoniques répartis en 4 blocs)
 * 
 * Ce fichier re-exporte l'ensemble des définitions, types et helpers afin de
 * garantir la compatibilité sans duplication de code.
 */

export * from './config/appRegistry';
export { default } from './config/appRegistry';
