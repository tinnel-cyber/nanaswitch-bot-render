/**
 * ============================================================================
 * COQUILLE MODULES : GESTION DES EMPLOYÉS & CAISSIERS (RH / SÉCURITÉ)
 * ============================================================================
 */

import React from 'react';

export { isCashierSession } from '../../utils/managerSecurityService';
export { default as CashierConnectPage } from '../../pages/CashierConnectPage';

export const LazyCashierConnectPage = React.lazy(() => import('../../pages/CashierConnectPage'));
