/**
 * ============================================================================
 * MODULE CANONIQUE : COURS FORGE & ACADÉMIE LMS
 * Point d'entrée consolidé de tous les composants de création et d'apprentissage
 * ============================================================================
 */

import React from 'react';

// Composants Fondamentaux Formateur & Édition
export { CourseForgeCanvas } from './components/lms/forge/CourseForgeCanvas';
export { InstructorDashboardView } from './components/lms/InstructorDashboardView';
export { TeacherDashboard } from './components/TeacherDashboard';
export { InstructorHubView } from './components/lms/InstructorHubView';

// Composants Apprenant & Campus Virtuel
export { default as VirtualCampusView } from './components/lms/VirtualCampusView';
export { StudentDashboardView } from './components/lms/student/StudentDashboardView';
export { StudentDashboardPage } from './pages/StudentDashboardPage';
export { CertificatePage } from './pages/CertificatePage';
export { CertificateGenerator } from './components/lms/CertificateGenerator';
export { CertificatePreviewModal } from './components/lms/CertificatePreviewModal';
export { NanaAcademyDrawer } from './components/NanaAcademyDrawer';

// Composants Vitrine & Marketplace
export { CourseLandingPageView } from './components/lms/CourseLandingPageView';
export { CourseDetailPage } from './components/lms/marketplace/CourseDetailPage';

// Simulation Vocale & Temps Réel
export { VoiceSimulationArena } from './components/lms/arena/VoiceSimulationArena';
export { InstructorCohortRealtimeMonitor } from './components/lms/InstructorCohortRealtimeMonitor';
export { StudentLessonViewerRealtime } from './components/lms/StudentLessonViewerRealtime';

// Exportations Lazy pour chargement dynamique optimisé
export const LazyCourseLandingPageView = React.lazy(() =>
  import('./components/lms/CourseLandingPageView').then((m) => ({
    default: m.CourseLandingPageView
  }))
);

export const LazyCourseDetailPage = React.lazy(() =>
  import('./components/lms/marketplace/CourseDetailPage').then((m) => ({
    default: m.CourseDetailPage
  }))
);

export const LazyInstructorDashboardView = React.lazy(() =>
  import('./components/lms/InstructorDashboardView').then((m) => ({
    default: m.InstructorDashboardView
  }))
);

export const LazyVirtualCampusView = React.lazy(() =>
  import('./components/lms/VirtualCampusView')
);

export const LazyNanaAcademyDrawer = React.lazy(() =>
  import('./components/NanaAcademyDrawer').then((m) => ({
    default: m.NanaAcademyDrawer
  }))
);

export const LazyStudentDashboardPage = React.lazy(() =>
  import('./pages/StudentDashboardPage').then((m) => ({
    default: m.StudentDashboardPage
  }))
);

export const LazyCertificatePage = React.lazy(() =>
  import('./pages/CertificatePage').then((m) => ({
    default: m.CertificatePage
  }))
);
