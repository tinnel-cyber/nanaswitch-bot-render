/**
 * @file FabRosace.tsx
 * @description Bouton d'action flottant central à déploiement radial en Rosace Mobile-First.
 * 
 * Charte Graphique Stricte :
 * - Fond Blanc Pur (#FFFFFF)
 * - Accentuation Bleu Royal (#4169E1, hover #3154B3)
 * - Ombres Volumétriques Royales : shadow-[0_10px_25px_rgba(65,105,225,0.45)]
 * - Marque exclusive : Wameet (Zéro marque tierce)
 */

import React, { useState } from 'react';
import { Plus, Image, Lightbulb, Video, DoorOpen } from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export type FabRosaceOptionId = 'post_creator' | 'image' | 'business_idea' | 'reel' | 'guichet';

export interface FabRosaceProps {
  /** Masquer conditionnellement le bouton flottant (ex: sur Reels ou Chats) */
  hidden?: boolean;
  /** État ouvert contrôlé (optionnel) */
  isOpen?: boolean;
  /** Callback de bascule (optionnel) */
  onToggle?: (open: boolean) => void;
  /** Callback générique appelé lors du clic sur une option */
  onSelectOption?: (optionId: FabRosaceOptionId) => void;
  /** Callback pour le sélecteur Affiche & Idée (CreatePostModal) */
  onSelectPostCreator?: () => void;
  /** Callbacks spécifiques pour chaque sous-bouton */
  onSelectImage?: () => void;
  onSelectBusinessIdea?: () => void;
  onSelectReel?: () => void;
  onSelectGuichet?: () => void;
  /** Classes CSS supplémentaires pour le conteneur */
  className?: string;
}

export const FabRosace: React.FC<FabRosaceProps> = ({
  hidden = false,
  isOpen: controlledIsOpen,
  onToggle,
  onSelectOption,
  onSelectPostCreator,
  onSelectImage,
  onSelectBusinessIdea,
  onSelectReel,
  onSelectGuichet,
  className = ''
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  if (hidden) return null;

  const toggleRosace = () => {
    playTapBeep();
    const next = !isOpen;
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(next);
    }
    if (onToggle) {
      onToggle(next);
    }
  };

  const closeRosace = () => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(false);
    }
    if (onToggle) {
      onToggle(false);
    }
  };

  const handleAction = (optionId: FabRosaceOptionId, callback?: () => void) => {
    playValidationBeep();
    closeRosace();
    if (onSelectOption) {
      onSelectOption(optionId);
    }
    if (callback) {
      callback();
    }
  };

  return (
    <>
      {/* ============================================================== */}
      {/* OVERLAY FLOU DYNAMIQUE (BACKDROP BLUR)                         */}
      {/* ============================================================== */}
      {isOpen && (
        <div
          onClick={closeRosace}
          className="fixed inset-0 backdrop-blur-md bg-slate-900/40 z-40 transition-opacity duration-300 animate-in fade-in cursor-pointer"
          aria-label="Fermer le menu rosace"
        />
      )}

      {/* ============================================================== */}
      {/* CONTENEUR ROSACE CENTRÉ PRÈS DE LA BARRE DE NAVIGATION BASSE   */}
      {/* ============================================================== */}
      <div
        className={`fixed bottom-[62px] left-1/2 -translate-x-1/2 z-40 flex items-center justify-center select-none ${className}`}
        role="region"
        aria-label="Menu d'action rapide Wameet"
      >
        {/* ------------------------------------------------------------ */}
        {/* OPTION 1 : AFFICHE & IDÉE (-translate-x-20 -translate-y-14)  */}
        {/* ------------------------------------------------------------ */}
        <div
          className={`absolute transition-all duration-300 ease-out flex flex-col items-center ${
            isOpen
              ? '-translate-x-20 -translate-y-14 scale-100 opacity-100 pointer-events-auto'
              : 'translate-x-0 translate-y-0 scale-0 opacity-0 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={() => handleAction('post_creator', onSelectPostCreator || onSelectImage)}
            className="w-11 h-11 bg-white text-[#4169E1] rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center border border-slate-100 hover:scale-110 active:scale-95 transition-all cursor-pointer group"
            title="Affiche & Idée"
            aria-label="Affiche & Idée"
          >
            <span className="text-sm select-none group-hover:scale-110 transition-transform flex items-center justify-center">
              🖼️💡
            </span>
          </button>
          <span className="text-[10px] font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded-full mt-1 shadow-sm whitespace-nowrap">
            Affiche & Idée
          </span>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* OPTION 2 : IDÉE BUSINESS (-translate-y-20, delay-75)         */}
        {/* ------------------------------------------------------------ */}
        <div
          className={`absolute transition-all duration-300 ease-out delay-75 flex flex-col items-center ${
            isOpen
              ? '-translate-y-20 scale-100 opacity-100 pointer-events-auto'
              : 'translate-x-0 translate-y-0 scale-0 opacity-0 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={() => handleAction('business_idea', onSelectBusinessIdea)}
            className="w-11 h-11 bg-white text-[#4169E1] rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center border border-slate-100 hover:scale-110 active:scale-95 transition-all cursor-pointer group"
            title="Idée Business"
            aria-label="Idée Business"
          >
            <Lightbulb className="w-4 h-4 group-hover:scale-110 transition-transform text-[#4169E1]" />
          </button>
          <span className="text-[10px] font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded-full mt-1 shadow-sm whitespace-nowrap">
            Idée
          </span>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* OPTION 3 : REEL (translate-x-20 -translate-y-14, delay-100)  */}
        {/* ------------------------------------------------------------ */}
        <div
          className={`absolute transition-all duration-300 ease-out delay-100 flex flex-col items-center ${
            isOpen
              ? 'translate-x-20 -translate-y-14 scale-100 opacity-100 pointer-events-auto'
              : 'translate-x-0 translate-y-0 scale-0 opacity-0 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={() => handleAction('reel', onSelectReel)}
            className="w-11 h-11 bg-white text-[#4169E1] rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center border border-slate-100 hover:scale-110 active:scale-95 transition-all cursor-pointer group"
            title="Reel Vidéo"
            aria-label="Reel Vidéo"
          >
            <Video className="w-4 h-4 group-hover:scale-110 transition-transform text-[#4169E1]" />
          </button>
          <span className="text-[10px] font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded-full mt-1 shadow-sm whitespace-nowrap">
            Reel
          </span>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* OPTION 4 : OUVRIR GUICHET (translate-x-24 -translate-y-2, delay-150) */}
        {/* ------------------------------------------------------------ */}
        <div
          className={`absolute transition-all duration-300 ease-out delay-150 flex flex-col items-center ${
            isOpen
              ? 'translate-x-24 -translate-y-2 scale-100 opacity-100 pointer-events-auto'
              : 'translate-x-0 translate-y-0 scale-0 opacity-0 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={() => handleAction('guichet', onSelectGuichet)}
            className="w-11 h-11 bg-white text-[#4169E1] rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center border border-slate-100 hover:scale-110 active:scale-95 transition-all cursor-pointer group"
            title="Ouvrir mon Guichet"
            aria-label="Ouvrir mon Guichet"
          >
            <DoorOpen className="w-4 h-4 group-hover:scale-110 transition-transform text-[#4169E1]" />
          </button>
          <span className="text-[10px] font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded-full mt-1 shadow-sm whitespace-nowrap">
            Guichet
          </span>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* BOUTON PRINCIPAL FAB COMPACT : BLEU ROYAL (#4169E1) w-12 h-12 */}
        {/* ------------------------------------------------------------ */}
        <button
          type="button"
          onClick={toggleRosace}
          className="w-12 h-12 rounded-full bg-[#4169E1] hover:bg-[#3154B3] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(65,105,225,0.45)] active:scale-95 transition-all duration-300 z-50 cursor-pointer focus:outline-none ring-2 ring-white/80"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Fermer le menu de création' : 'Créer sur Wameet'}
          title={isOpen ? 'Fermer' : 'Créer'}
        >
          <Plus
            className={`w-6 h-6 text-white transition-transform duration-300 stroke-[2.5] ${
              isOpen ? 'rotate-45' : 'rotate-0'
            }`}
          />
        </button>
      </div>
    </>
  );
};

export default FabRosace;
