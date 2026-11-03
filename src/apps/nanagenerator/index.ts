/**
 * ============================================================================
 * COQUILLE APPS : NANAGÉNÉRATEUR AI & STUDIO CRÉATIF
 * ============================================================================
 */

import React from 'react';

export { NanaGeneratorModal } from '../../components/NanaGeneratorModal';
export { AiStudioView } from '../../components/ai/AiStudioView';
export { MarketingAIAssistantModal } from '../../components/MarketingAIAssistantModal';
export { ComposantUploadVideo } from '../../components/ComposantUploadVideo';

export const LazyNanaGeneratorModal = React.lazy(() =>
  import('../../components/NanaGeneratorModal').then((m) => ({ default: m.NanaGeneratorModal }))
);
export const LazyAiStudioView = React.lazy(() =>
  import('../../components/ai/AiStudioView').then((m) => ({ default: m.AiStudioView }))
);
