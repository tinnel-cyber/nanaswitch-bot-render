/**
 * ============================================================================
 * COQUILLE MODULES : GESTION DES DETTES (ARDOISES CLIENTS)
 * ============================================================================
 */

import React from 'react';

export { default as DebtBookView } from '../../components/DebtBookView';
export { QuickCustomerDebtRow } from '../../components/QuickCustomerDebtRow';

export const LazyDebtBookView = React.lazy(() => import('../../components/DebtBookView'));
