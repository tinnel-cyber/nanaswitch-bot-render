/**
 * ============================================================================
 * COQUILLE MODULES : STOCK & INVENTAIRE INTELLIGENT
 * ============================================================================
 */

import React from 'react';

export { default as InventoryView } from '../../components/InventoryView';
export { default as ProductsScreen } from '../../components/ProductsScreen';
export { ProductCard } from '../../components/ProductCard';
export { default as CustomerOrdersView } from '../../components/CustomerOrdersView';
export { MerchantOrdersModal } from '../../components/MerchantOrdersModal';

export const LazyInventoryView = React.lazy(() => import('../../components/InventoryView'));
export const LazyProductsScreen = React.lazy(() => import('../../components/ProductsScreen'));
export const LazyCustomerOrdersView = React.lazy(() => import('../../components/CustomerOrdersView'));
