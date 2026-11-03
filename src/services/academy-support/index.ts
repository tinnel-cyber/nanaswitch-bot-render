/**
 * ============================================================================
 * COQUILLE SERVICES : CENTRE DE FORMATION & ACCOMPAGNEMENT (ACADÉMIE)
 * ============================================================================
 */

import React from 'react';

export { default as VirtualCampusView } from '../../components/lms/VirtualCampusView';
export { NanaAcademyDrawer } from '../../components/NanaAcademyDrawer';
export { default as StudentDashboardPage } from '../../pages/StudentDashboardPage';
export { default as CertificatePage } from '../../pages/CertificatePage';

export const LazyVirtualCampusView = React.lazy(() => import('../../components/lms/VirtualCampusView'));
export const LazyNanaAcademyDrawer = React.lazy(() =>
  import('../../components/NanaAcademyDrawer').then((m) => ({ default: m.NanaAcademyDrawer }))
);
