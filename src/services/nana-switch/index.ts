/**
 * ============================================================================
 * COQUILLE SERVICES : NANA SWITCH CLOUD (MULTI-COMPTES & CONNECTEURS BYOK)
 * ============================================================================
 */

import React from 'react';

export { default as NaNaSwitchAppPage } from '../../pages/nanaSwitch/NaNaSwitchAppPage';
export { default as NaNaSwitchLandingPage } from '../../pages/nanaSwitch/NaNaSwitchLandingPage';
export { default as NaNaSwitchDocsPage } from '../../pages/nanaSwitch/NaNaSwitchDocsPage';
export { default as NanaSwitchApp } from '../../components/nanaSwitch/NanaSwitchApp';

export const LazyNaNaSwitchAppPage = React.lazy(() => import('../../pages/nanaSwitch/NaNaSwitchAppPage'));
export const LazyNaNaSwitchLandingPage = React.lazy(() => import('../../pages/nanaSwitch/NaNaSwitchLandingPage'));
export const LazyNanaSwitchApp = React.lazy(() => import('../../components/nanaSwitch/NanaSwitchApp'));
