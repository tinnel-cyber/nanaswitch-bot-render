/**
 * ============================================================================
 * COQUILLE OUTILS : SCANNER CODE-BARRES & DOUCHETTE USB / CAMÉRA
 * ============================================================================
 */

import React from 'react';

export { default as BarcodeSelfieScanner } from '../../components/BarcodeSelfieScanner';
export { default as BarcodeStudioView } from './BarcodeStudioView';

export const LazyBarcodeSelfieScanner = React.lazy(() => import('../../components/BarcodeSelfieScanner'));
export const LazyBarcodeStudioView = React.lazy(() => import('./BarcodeStudioView'));
