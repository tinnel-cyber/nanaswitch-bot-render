/**
 * ============================================================================
 * COQUILLE SERVICES : STUDIO DE THÈME ET PERSONNALISATION
 * ============================================================================
 */

import React from 'react';

export { ThemeSwitcher } from '../../components/ThemeSwitcher';
export * from '../../utils/themeRoutePrefix';

export const LazyThemeSwitcher = React.lazy(() =>
  import('../../components/ThemeSwitcher').then((m) => ({ default: m.ThemeSwitcher }))
);
