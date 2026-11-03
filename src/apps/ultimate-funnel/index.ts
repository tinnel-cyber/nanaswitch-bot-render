/**
 * ============================================================================
 * COQUILLE APPS : ULTIMATE FUNNEL BUILDER
 * ============================================================================
 */

import React from 'react';

// @ts-ignore
export { default as UltimateFunnelBuilder } from '../../components/storeBuilder/UltimateFunnelBuilder';

export const LazyUltimateFunnelBuilder = React.lazy(() =>
  // @ts-ignore
  import('../../components/storeBuilder/UltimateFunnelBuilder').then((m) => ({
    default: m.UltimateFunnelBuilder || m.default
  }))
);
