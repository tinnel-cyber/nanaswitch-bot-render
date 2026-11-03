/**
 * ============================================================================
 * COQUILLE APPS : CAISSE TACTILE MAGASIN (POS)
 * ============================================================================
 */

import React from 'react';

export { DesktopPosRegister } from '../../components/DesktopPosRegister';
export { FastSaleGrid } from '../../components/FastSaleGrid';
export { CashPaymentModal } from '../../components/CashPaymentModal';
export { CreditModal } from '../../components/CreditModal';
export { SellerSwitchModal } from '../../components/SellerSwitchModal';
export { PosSearchBar } from '../../components/PosSearchBar';
export { ThermalReceiptModal } from '../../components/ThermalReceiptModal';

export const LazyDesktopPosRegister = React.lazy(() =>
  import('../../components/DesktopPosRegister').then((m) => ({ default: m.DesktopPosRegister }))
);
