/**
 * ============================================================================
 * COQUILLE APPS : NANAMARKET (ANNUAIRE B2B2C & PLACE DE MARCHÉ)
 * ============================================================================
 */

import React from 'react';

export { default as MarketDirectory } from '../../components/directory/MarketDirectory';
export { MarketplaceDiscoveryHub } from '../../components/lms/marketplace/MarketplaceDiscoveryHub';

export const LazyMarketDirectory = React.lazy(() => import('../../components/directory/MarketDirectory'));

export const LazyMarketplaceDiscoveryHub = React.lazy(() =>
  import('../../components/lms/marketplace/MarketplaceDiscoveryHub').then((m) => ({
    default: m.MarketplaceDiscoveryHub
  }))
);
