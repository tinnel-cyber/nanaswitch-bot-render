/**
 * ============================================================================
 * COQUILLE OUTILS : PASSERELLE SOUVERAINE & CONNECTEURS D'API DIRECTS
 * ============================================================================
 */

import React from 'react';

// Connecteur passerelle souveraine Nanasore
export const LazySovereignGateway = React.lazy(() =>
  import('../../components/SettingsExtensionsView').then((m) => ({ default: m.SettingsExtensionsView }))
);
