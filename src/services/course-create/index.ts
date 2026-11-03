/**
 * ============================================================================
 * COQUILLE SERVICES : CENTRE FORMATEURS & CRÉATION PÉDAGOGIQUE
 * ============================================================================
 */

import React from 'react';

export { InstructorHubView } from '../../components/lms/InstructorHubView';
export { InstructorDashboardView } from '../../components/lms/InstructorDashboardView';
export { TeacherDashboard } from '../../components/TeacherDashboard';

export const LazyInstructorHubView = React.lazy(() =>
  import('../../components/lms/InstructorHubView').then((m) => ({
    default: m.InstructorHubView
  }))
);

export const LazyInstructorDashboardView = React.lazy(() =>
  import('../../components/lms/InstructorDashboardView').then((m) => ({
    default: m.InstructorDashboardView
  }))
);
