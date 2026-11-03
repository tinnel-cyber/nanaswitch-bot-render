import React from 'react';
import { SocialFeedScreen, SocialFeedScreenProps } from './SocialFeedScreen';

export type WameetSocialFeedViewProps = SocialFeedScreenProps;

/**
 * WameetSocialFeedView
 * Délégué vers SocialFeedScreen (Prompt 44 : Le Flux Wameet Edge-to-Edge, Zéro Bordure Bleue)
 */
export const WameetSocialFeedView: React.FC<WameetSocialFeedViewProps> = (props) => {
  return <SocialFeedScreen {...props} />;
};

export default WameetSocialFeedView;
export { SocialFeedScreen };
