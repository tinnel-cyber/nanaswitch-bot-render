/**
 * ============================================================================
 * COQUILLE MODULES : CVPRO & CRÉATION DOCUMENTAIRE
 * ============================================================================
 */

import React from 'react';

export { default as ResumeBuilderView } from '../../components/resume/ResumeBuilderView';

export const LazyResumeBuilderView = React.lazy(() => import('../../components/resume/ResumeBuilderView'));
