/**
 * ============================================================================
 * COQUILLE APPS : WEBINAIRE & LIVE SHOPPING EN DIRECT
 * ============================================================================
 */

import React from 'react';

export { PublicWebinarLandingView } from '../../components/PublicWebinarLandingView';
export { CreateWebinarModal } from '../../components/CreateWebinarModal';
export { default as PublicLiveSessionPage } from '../../pages/PublicLiveSessionPage';
export { MerchantFlashAlert } from '../../components/flashLive/MerchantFlashAlert';
export { LiveIncomingCallAlert } from '../../components/live/LiveIncomingCallAlert';

export const LazyPublicWebinarLandingView = React.lazy(() =>
  import('../../components/PublicWebinarLandingView').then((m) => ({
    default: m.PublicWebinarLandingView
  }))
);

export const LazyPublicLiveSessionPage = React.lazy(() =>
  import('../../pages/PublicLiveSessionPage').then((m) => ({
    default: m.PublicLiveSessionPage
  }))
);
