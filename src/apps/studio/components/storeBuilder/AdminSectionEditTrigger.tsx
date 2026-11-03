import React from 'react';
import { Sparkles, Edit3 } from 'lucide-react';
import { playTapBeep } from '../../../../utils/audio';

export interface AdminSectionEditTriggerProps {
  label: string;
  targetAccordion: number; // 1: Identité, 2: Hero Banner, 3: Offre Spéciale, 4: Live & Footer
  onSelectSection?: (accordionIndex: number) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'inline';
  className?: string;
}

export const AdminSectionEditTrigger: React.FC<AdminSectionEditTriggerProps> = ({
  label,
  targetAccordion,
  onSelectSection,
  isPublicView = false,
  isAdminPreview = false,
  position = 'top-right',
  className = ''
}) => {
  // Règle de sécurité stricte : Actif uniquement en mode administrateur / preview
  if (!isAdminPreview) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    playTapBeep();
    if (onSelectSection) {
      onSelectSection(targetAccordion);
    }
  };

  const positionStyles = {
    'top-right': 'absolute top-3 right-3',
    'top-left': 'absolute top-3 left-3',
    'bottom-right': 'absolute bottom-3 right-3',
    'bottom-left': 'absolute bottom-3 left-3',
    'center': 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'inline': 'relative inline-flex'
  }[position] || 'absolute top-3 right-3';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${positionStyles} z-30 bg-blue-600/90 hover:bg-blue-600 text-white shadow-xl shadow-blue-950/40 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all border border-blue-400/50 hover:scale-105 active:scale-95 cursor-pointer select-none group ${className}`}
      title={`Ouvrir l'accordéon #${targetAccordion} dans le Studio pour modifier cette section`}
    >
      <Edit3 className="w-3.5 h-3.5 text-blue-200 group-hover:text-white transition-colors" />
      <span>{label}</span>
      <Sparkles className="w-3 h-3 text-amber-300 animate-pulse ml-0.5" />
    </button>
  );
};

export default AdminSectionEditTrigger;
