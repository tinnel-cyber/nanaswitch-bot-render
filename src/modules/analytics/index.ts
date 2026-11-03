/**
 * ============================================================================
 * COQUILLE MODULES : ANALYTIQUE & COURBE DES GAINS
 * ============================================================================
 */

import React from 'react';

export { default as ReportsView } from '../../components/ReportsView';

export const LazyReportsView = React.lazy(() => import('../../components/ReportsView'));
