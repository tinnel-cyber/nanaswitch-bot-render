import React from 'react';
import { NaNaLandingPage, NaNaLandingPageProps } from './NaNaLandingPage';

export type WelcomeShowcaseScreenProps = NaNaLandingPageProps;

export const WelcomeShowcaseScreen: React.FC<WelcomeShowcaseScreenProps> = (props) => {
  return <NaNaLandingPage {...props} />;
};

export default WelcomeShowcaseScreen;
