/**
 * ============================================================================
 * COQUILLE APPS : PUBLIC DEAL PAGE BUILDER
 * ============================================================================
 */

import React from 'react';

export { PhysicalFunnelBuilder } from '../../components/storeBuilder/PhysicalFunnelBuilder';
export { PublicDealPageView } from '../../components/funnel/PublicDealPageView';
export { PublicPhysicalFunnelView } from '../../components/funnel/PublicPhysicalFunnelView';

export const LazyPhysicalFunnelBuilder = React.lazy(() =>
  import('../../components/storeBuilder/PhysicalFunnelBuilder').then((m) => ({
    default: m.PhysicalFunnelBuilder || m.default
  }))
);

export const LazyPublicDealPageView = React.lazy(() =>
  import('../../components/funnel/PublicDealPageView').then((m) => ({
    default: m.PublicDealPageView
  }))
);
