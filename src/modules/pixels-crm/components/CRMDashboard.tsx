import React from 'react';
import { SuperAdminDashboard } from '../../../components/SuperAdminDashboard.tsx';

import { StoreUser } from '../../../types';

export interface CRMDashboardProps {
  onBackToPOS?: () => void;
  onClose?: () => void;
  currentUser?: StoreUser | null;
}

export const CRMDashboard: React.FC<CRMDashboardProps> = ({
  onBackToPOS,
  onClose,
  currentUser,
}) => {
  return (
    <SuperAdminDashboard
      initialUnlocked={true}
      initialLevel={2}
      onNavigateToPos={onBackToPOS}
      onClose={onClose || onBackToPOS}
      currentUser={currentUser}
    />
  );
};

export default CRMDashboard;
