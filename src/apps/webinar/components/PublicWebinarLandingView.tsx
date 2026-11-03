import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LiveRoomHub } from '../../../components/live/LiveRoomHub';
import { StoreUser, InventoryProduct, StoreSubscription } from '../../../types';

export interface PublicWebinarLandingViewProps {
  webinarId: string;
  onBackToStore?: () => void;
  onOpenNanaGenerator?: () => void;
  currentUser?: StoreUser | null;
  inventory?: InventoryProduct[];
  subscription?: StoreSubscription | null;
}

export const PublicWebinarLandingView: React.FC<PublicWebinarLandingViewProps> = ({
  webinarId,
  onBackToStore,
  onOpenNanaGenerator,
  currentUser,
  inventory,
  subscription
}) => {
  return (
    <LiveRoomHub
      webinarId={webinarId}
      onBackToStore={onBackToStore}
      onOpenNanaGenerator={onOpenNanaGenerator}
      currentUser={currentUser}
      inventory={inventory}
      subscription={subscription}
    />
  );
};

export default PublicWebinarLandingView;
