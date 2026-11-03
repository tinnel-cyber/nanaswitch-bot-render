/**
 * ============================================================================
 * COQUILLE MODULES : PIXELS DE TRACKING & CRM AVANCÉ
 * ============================================================================
 */

import React from 'react';

// Exportation des composants de configuration des pixels et tracking marketing
export const LazyTrackingPixelsView = React.lazy(() =>
  import('../../components/SettingsExtensionsView').then((m) => ({ default: m.SettingsExtensionsView }))
);
