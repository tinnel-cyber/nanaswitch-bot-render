/**
 * ============================================================================
 * COQUILLE APPS : WAMEET (RÉSEAU SOCIAL MARCHAND & APPELS)
 * ============================================================================
 */

import React from 'react';

export { default as WameetSupraApp } from '../../pages/wameet/WameetSupraApp';
export { default as WameetRoomView } from '../../components/wameet/WameetRoomView';
export { WameetModal } from '../../components/WameetModal';
export { WameetRoom } from '../../components/WameetRoom';

export const LazyWameetSupraApp = React.lazy(() => import('../../pages/wameet/WameetSupraApp'));
export const LazyWameetRoomView = React.lazy(() => import('../../components/wameet/WameetRoomView'));
