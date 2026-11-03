/**
 * @file WameetLayout.tsx
 * @description Conteneur d'application Mobile-First immersif de standard mondial pour Wameet.
 * 
 * Charte Graphique Stricte :
 * - Fond de l'application : Blanc Pur (#FFFFFF)
 * - Accentuation Primaire : Bleu Royal (#4169E1)
 * - Fond d'ambiance grand écran : Gris Ultra-Doux (#F8FAFC)
 * - Encadrement Mobile-First : max-w-[430px] mx-auto min-h-screen relative overflow-hidden border-x border-slate-100 shadow-[0_20px_50px_rgba(65,105,225,0.15)]
 */

import React from 'react';

export interface WameetLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  bottomNavigation?: React.ReactNode;
  floatingAction?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  mainClassName?: string;
}

export const WameetLayout: React.FC<WameetLayoutProps> = ({
  children,
  header,
  bottomNavigation,
  floatingAction,
  className = '',
  containerClassName = '',
  mainClassName = ''
}) => {
  return (
    // Canevas extérieur élégant pour PC / grands écrans avec fond ultra-doux et centrage géométrique
    <div
      className={`h-[100dvh] w-full bg-[#F8FAFC] flex items-center justify-center relative select-none antialiased overflow-hidden ${className}`}
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(65, 105, 225, 0.04) 0%, transparent 70%)'
      }}
    >
      {/* Conteneur Mobile-First & Adaptatif (Plein écran sur mobile, centré max-w-md/lg sur grand écran) */}
      <div
        className={`w-full md:max-w-md lg:max-w-lg h-[100dvh] max-h-[100dvh] bg-white shadow-[0_20px_50px_rgba(65,105,225,0.15)] relative overflow-hidden border-x border-slate-100 flex flex-col ${containerClassName}`}
      >
        {/* En-tête optionnel */}
        {header && <header className="shrink-0 z-30">{header}</header>}

        {/* Zone centrale de contenu immersif */}
        <main className={`flex-1 flex flex-col relative overflow-hidden ${mainClassName || 'pb-14'}`}>
          {children}
        </main>

        {/* Navigation basse optionnelle */}
        {bottomNavigation && <footer className="shrink-0 z-30">{bottomNavigation}</footer>}

        {/* Bouton d'action flottant immersif (FabRosace) */}
        {floatingAction}
      </div>
    </div>
  );
};

export default WameetLayout;
