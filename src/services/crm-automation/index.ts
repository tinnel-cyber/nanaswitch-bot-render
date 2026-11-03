/**
 * ============================================================================
 * COQUILLE SERVICES : CRM ET AUTOMATION (CONNECTEURS, BREVO, SMS/OTP)
 * ============================================================================
 */

import React from 'react';

export { SettingsExtensionsView } from '../../components/SettingsExtensionsView';
// @ts-ignore
export { default as CRMDashboard } from '../../components/CRMDashboard';
export * from '../brevoEmailService';
export * from '../smsPaymentService';
export * from '../smsSenderService';
export * from '../externalIntegrationsService';

export const LazySettingsExtensionsView = React.lazy(() =>
  import('../../components/SettingsExtensionsView').then((m) => ({ default: m.SettingsExtensionsView }))
);

export const LazyCRMDashboard = React.lazy(() =>
  // @ts-ignore
  import('../../components/CRMDashboard').then((m) => ({ default: m.CRMDashboard || m.default }))
);
