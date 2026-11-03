import React from 'react';
import { MobileAppBottomTabBar, MobileAppBottomTabBarProps } from './MobileAppBottomTabBar';

export type MobileAppBottomBarProps = MobileAppBottomTabBarProps;

export const MobileAppBottomBar: React.FC<MobileAppBottomBarProps> = (props) => {
  return <MobileAppBottomTabBar {...props} />;
};

export default MobileAppBottomBar;
