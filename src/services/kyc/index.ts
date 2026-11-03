/**
 * ============================================================================
 * COQUILLE SERVICES : CHAÎNE D'IDENTIFICATION KYC & CONFORMITÉ
 * ============================================================================
 */

import React from 'react';

export { KycVerificationModal } from '../../components/storeBuilder/KycVerificationModal';

export const LazyKycVerificationModal = React.lazy(() =>
  import('../../components/storeBuilder/KycVerificationModal').then((m) => ({
    default: m.KycVerificationModal
  }))
);
