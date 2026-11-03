/**
 * ============================================================================
 * COQUILLE SERVICES : PROGRAMME PARTENAIRE & AFFILIATION
 * ============================================================================
 */

import React from 'react';

export { PartnerProgramLandingView } from '../../components/partner/PartnerProgramLandingView';
export { AffiliateDashboardModal } from '../../components/AffiliateDashboardModal';

export const LazyPartnerProgramLandingView = React.lazy(() =>
  import('../../components/partner/PartnerProgramLandingView').then((m) => ({
    default: m.PartnerProgramLandingView
  }))
);

export const LazyAffiliateDashboardModal = React.lazy(() =>
  import('../../components/AffiliateDashboardModal').then((m) => ({
    default: m.AffiliateDashboardModal
  }))
);
