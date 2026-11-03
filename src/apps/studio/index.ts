/**
 * ============================================================================
 * COQUILLE APPS : VITRINE EN LIGNE (E-SHOP / STUDIO)
 * ============================================================================
 */

import React from 'react';

export { default as StoreStudioPage } from '../../pages/StoreStudioPage';
export { default as PublicStorefrontPage } from '../../pages/PublicStorefrontPage';
export { BoutiqueAdminModal } from '../../components/BoutiqueAdminModal';

export const LazyStoreStudioPage = React.lazy(() => import('../../pages/StoreStudioPage'));
export const LazyPublicStorefrontPage = React.lazy(() => import('../../pages/PublicStorefrontPage'));
export const LazyBoutiqueAdminModal = React.lazy(() =>
  import('../../components/BoutiqueAdminModal').then((m) => ({ default: m.BoutiqueAdminModal }))
);
