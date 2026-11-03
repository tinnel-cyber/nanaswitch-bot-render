/**
 * ============================================================================
 * COQUILLE OUTILS : SCANNER CODE-BARRES & DOUCHETTE USB / CAMÉRA
 * ============================================================================
 */

import React from 'react';

export { default as BarcodeSelfieScanner } from '../../components/BarcodeSelfieScanner';

export const LazyBarcodeSelfieScanner = React.lazy(() => import('../../components/BarcodeSelfieScanner'));
