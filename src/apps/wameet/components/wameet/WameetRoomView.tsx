/**
 * @file WameetRoomView.tsx
 * @description Vue Salon Visioconférence Wameet (Prompt 5).
 * Encapsule WameetRoom avec rétro-compatibilité totale.
 */

import React from 'react';
import { WameetRoom, WameetRoomProps } from './WameetRoom';

export type WameetRoomViewProps = WameetRoomProps;

export const WameetRoomView: React.FC<WameetRoomViewProps> = (props) => {
  return <WameetRoom {...props} />;
};

export { WameetRoom };
export default WameetRoomView;
