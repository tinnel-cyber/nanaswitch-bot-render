/**
 * ============================================================================
 * COQUILLE APPS : COURS FORGE (CONCEPTION & GÉNÉRATION DE COURS LMS)
 * ============================================================================
 */

import React from 'react';

export { CourseLandingPageView } from '../../components/lms/CourseLandingPageView';
export { CourseDetailPage } from '../../components/lms/marketplace/CourseDetailPage';

export const LazyCourseLandingPageView = React.lazy(() =>
  import('../../components/lms/CourseLandingPageView').then((m) => ({
    default: m.CourseLandingPageView
  }))
);

export const LazyCourseDetailPage = React.lazy(() =>
  import('../../components/lms/marketplace/CourseDetailPage').then((m) => ({
    default: m.CourseDetailPage
  }))
);
