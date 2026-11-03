/**
 * @file ReelVideoPlayer.tsx
 * @description Lecteur de Reel Immersif Robuste pour le Feed Wameet.
 * Version optimisée gérant proprement le nettoyage et la reprise du flux vidéo lors du scroll/recyclage.
 */

import React from 'react';
import { ReelErrorBoundary } from '../../../../components/ReelErrorBoundary';
import ImmersiveReelItem, { ImmersiveReelItemProps } from './ImmersiveReelItem';

export { ImmersiveReelItem };
export type { ImmersiveReelItemProps };
export type ReelPlayerProps = ImmersiveReelItemProps;

export const SingleReelPlayer: React.FC<ImmersiveReelItemProps> = (props) => (
  <ReelErrorBoundary>
    <ImmersiveReelItem {...props} />
  </ReelErrorBoundary>
);

export const ReelVideoPlayer = SingleReelPlayer;

export { ResonanceButton } from './ResonanceButton';
export type { ResonanceButtonProps } from './ResonanceButton';
export { VaultOfferButton } from './VaultOfferButton';
export type { VaultButtonProps, ProductOffer } from './VaultOfferButton';
export { CentralLockButton } from './CentralLockButton';
export type { CentralLockButtonProps, VipAccessOffer } from './CentralLockButton';
export { WameetActionButton } from './WameetActionButton';
export type { WameetActionButtonProps } from './WameetActionButton';
export { SocialInteractions } from './SocialInteractions';
export type { SocialInteractionsProps, Comment } from './SocialInteractions';

export default ReelVideoPlayer;
