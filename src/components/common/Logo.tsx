import React from 'react';
import { NanasoreLogo } from './NanasoreLogo';

export interface LogoProps {
  darkBackground?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  accentColor?: string;
  showDot?: boolean;
  dotColor?: string;
  className?: string;
  onClick?: () => void;
  allColor?: string;
  textColor?: string;
  showTagline?: boolean;
  variant?: 'iconOnly' | 'compact' | 'horizontal' | 'full';
}

/**
 * Composant Logo Officiel Nanasore — La Passerelle de la Fluidité (La Voie Facile)
 * Délègue automatiquement à <NanasoreLogo /> pour garantir zéro trace de l'ancien logo.
 */
export const Logo: React.FC<LogoProps> = ({
  darkBackground = true,
  size = 'md',
  className = '',
  onClick,
  showTagline = false,
  variant = 'horizontal',
}) => {
  const mappedSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' =
    size === 'sm'
      ? 'xs'
      : size === 'md'
      ? 'sm'
      : size === 'lg'
      ? 'md'
      : size === 'xl'
      ? 'lg'
      : 'xl';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center ${onClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''} ${className}`}
    >
      <NanasoreLogo
        variant={variant}
        size={mappedSize}
        theme={darkBackground === false ? 'light' : 'dark'}
        showTagline={showTagline}
      />
    </span>
  );
};

export default Logo;
