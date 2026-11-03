/**
 * ============================================================================
 * COQUILLE APPS : FUNNEL BUILDER MODULAIRE
 * ============================================================================
 */

import React from 'react';

// @ts-ignore
export { default as FunnelBuilder } from '../../components/storeBuilder/FunnelBuilder';
export { PublicModularTunnelView } from '../../components/funnel/PublicModularTunnelView';
export { SmartCheckoutPage } from '../../components/funnel/SmartCheckoutPage';

export const LazyFunnelBuilder = React.lazy(() =>
  // @ts-ignore
  import('../../components/storeBuilder/FunnelBuilder').then((m) => ({
    default: m.FunnelBuilder || m.default
  }))
);

export const LazyPublicModularTunnelView = React.lazy(() =>
  import('../../components/funnel/PublicModularTunnelView').then((m) => ({
    default: m.PublicModularTunnelView || m.default
  }))
);
