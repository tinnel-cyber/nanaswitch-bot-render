/**
 * ============================================================================
 * COQUILLE APPS : DOCUSIGN HUB & CONTRATS ÉLECTRONIQUES SÉCURISÉS
 * ============================================================================
 */

import React from 'react';

export { default as DocuSignHub } from '../../components/DocuSignHub';
export { LegalDocModal } from '../../components/LegalDocModal';

export const LazyDocuSignHub = React.lazy(() => import('../../components/DocuSignHub'));
