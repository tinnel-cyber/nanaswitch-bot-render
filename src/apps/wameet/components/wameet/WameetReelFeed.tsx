import React from 'react';
import {
  WameetReelsView,
  WameetReelsViewProps,
  WameetReelItem,
  WameetReelProductTag,
  WameetReelComment,
  WameetReelCategory
} from './WameetReelsView';

export type {
  WameetReelsViewProps as WameetReelFeedProps,
  WameetReelItem,
  WameetReelProductTag,
  WameetReelComment,
  WameetReelCategory
};

/**
 * WAMEET SMART REELS (FEED VERTICAL IMMERSIF SOCIAL COMMERCE)
 * -------------------------------------------------------------
 * Moteur vidéo vertical ultra-performant fusionnant :
 * 1. Vidéo Wameet plein écran avec défilement fluide (CSS snap-y mandatory & IntersectionObserver)
 * 2. Le Pont Social (DM instantané avec le créateur + pont W direct)
 * 3. Le Pont E-commerce (ReelProductCard flottante liée à la boutique Nanasore)
 * 4. Le Tiroir de Paiement Zero-Friction (Bottom Drawer sans interruption vidéo)
 */
export const WameetReelFeed: React.FC<WameetReelsViewProps> = (props) => {
  return <WameetReelsView {...props} />;
};

export default WameetReelFeed;
