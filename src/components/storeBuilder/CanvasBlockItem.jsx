import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  EyeOff,
  ArrowUp,
  ArrowDown,
  Copy as DuplicateIcon,
  Trash2
} from 'lucide-react';

/**
 * Comparateur chirurgical anti-rerender pour React.memo
 * Règle d'or : Si l'utilisateur modifie le Bloc A, les Blocs B et C ne subissent AUCUN re-render.
 * Le timer liveSeconds n'invalide QUE les blocs à décompte ('urgency', 'countdown_timer').
 */
function areBlockPropsEqual(prevProps, nextProps) {
  // 1. Référence stricte de l'objet bloc (si data ou conditions ont changé, la ref est nouvelle)
  if (prevProps.block !== nextProps.block) return false;

  // 2. Statut de sélection
  if (prevProps.isSelected !== nextProps.isSelected) return false;

  // 3. Position dans la liste (affecte les boutons Monter/Descendre activés/désactivés)
  if (prevProps.index !== nextProps.index) return false;
  if (prevProps.totalBlocks !== nextProps.totalBlocks) return false;

  // 4. Mode de vue (Éditeur vs Aperçu Visiteur)
  if (prevProps.viewMode !== nextProps.viewMode) return false;

  // 5. Conditions d'affichage dynamique (visibilité et raison)
  if (prevProps.condEval?.isVisible !== nextProps.condEval?.isVisible) return false;
  if (prevProps.condEval?.reason !== nextProps.condEval?.reason) return false;

  // 6. Produit actif associé (prix, titre, image)
  if (prevProps.activeProduct !== nextProps.activeProduct) return false;

  // 7. Timer liveSeconds : invalide UNIQUEMENT les blocs de type compte à rebours
  if (nextProps.block.type === 'urgency' || nextProps.block.type === 'countdown_timer') {
    if (prevProps.liveSeconds !== nextProps.liveSeconds) return false;
  }

  // Si tous les tests sont passés, le rendu précédent est 100% réutilisable !
  return true;
}

/**
 * CanvasBlockItem - Conteneur individuel d'un bloc de vente sur le Canvas
 * Mémoïsé pour garantir 60 fps même avec 50+ blocs sur appareils modestes.
 */
export const CanvasBlockItem = memo(function CanvasBlockItem({
  block,
  index,
  totalBlocks = 1,
  isSelected = false,
  viewMode = 'builder',
  condEval = { isVisible: true, reason: null },
  onSelect = () => {},
  onMoveUp = () => {},
  onMoveDown = () => {},
  onDuplicate = () => {},
  onDelete = () => {},
  renderBlock = () => null,
  activeProduct = null,
  liveSeconds = 18
}) {
  // En Mode Visiteur (Preview) : Le bloc disparaît totalement s'il ne respecte pas les conditions
  if (viewMode === 'preview' && !condEval.isVisible) {
    return null;
  }

  return (
    <motion.div
      layout
      data-block-id={block.id}
      onClick={() => {
        if (viewMode === 'builder') {
          onSelect(block.id);
        }
      }}
      whileHover={viewMode === 'builder' ? { scale: 1.001 } : undefined}
      transition={{ duration: 0.15 }}
      className={`relative group transition-all duration-200 ${
        viewMode === 'builder' ? 'cursor-pointer' : ''
      } ${
        isSelected
          ? 'ring-2 ring-indigo-500 bg-indigo-600/[0.04] shadow-2xl'
          : viewMode === 'builder' ? 'hover:bg-slate-900/40 hover:ring-1 hover:ring-slate-700' : ''
      } ${
        viewMode === 'builder' && !condEval.isVisible
          ? 'opacity-40 border-2 border-dashed border-indigo-500/70'
          : ''
      }`}
      style={{ backgroundColor: block.data?.bgColor || undefined }}
    >
      {/* Badge de Condition Non Remplie (Mode Builder uniquement) */}
      {viewMode === 'builder' && !condEval.isVisible && (
        <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-indigo-950/95 border border-indigo-500/80 text-indigo-300 px-2.5 py-1 rounded-full text-[10.5px] font-bold shadow-xl backdrop-blur-md">
          <EyeOff className="w-3.5 h-3.5 text-indigo-400" />
          <span>Caché sous condition ({condEval.reason})</span>
        </div>
      )}

      {/* Barre d'Actions Contextuelle au Survol / Sélection (Mode Builder uniquement) */}
      {viewMode === 'builder' && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(block.id);
          }}
          className={`absolute top-3 right-3 z-30 flex items-center gap-1 bg-slate-900/95 border px-2.5 py-1 rounded-xl shadow-xl backdrop-blur-md transition-all duration-200 cursor-pointer ${
            isSelected
              ? 'opacity-100 border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-950/90'
              : 'opacity-0 group-hover:opacity-100 border-slate-700 hover:border-indigo-400'
          }`}
          title="Cliquez pour sélectionner et modifier ce module dans l'inspecteur"
        >
          <span className="text-[10px] font-black uppercase text-indigo-400 mr-1.5 truncate max-w-[140px]">
            {block.name}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(block.id);
            }}
            className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black flex items-center gap-1 shadow-sm transition active:scale-95 cursor-pointer mr-1"
            title="Personnaliser ce module dans le panneau latéral"
          >
            <span>✏️ Personnaliser</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp(index);
            }}
            disabled={index === 0}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
            title="Monter la section"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown(index);
            }}
            disabled={index === totalBlocks - 1}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
            title="Descendre la section"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(index);
            }}
            className="p-1 rounded hover:bg-slate-800 text-indigo-300 cursor-pointer"
            title="Dupliquer ce module"
          >
            <DuplicateIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(index);
            }}
            className="p-1 rounded hover:bg-rose-950/60 text-rose-400 cursor-pointer"
            title="Supprimer ce module"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Rendu Haute Fidélité du Module */}
      {renderBlock(block)}

    </motion.div>
  );
}, areBlockPropsEqual);

export default CanvasBlockItem;
