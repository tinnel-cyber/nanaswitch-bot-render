import React, { useMemo } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export interface CagnotteHeaderTrackerProps {
  /** Montant cible total pour financer le cadeau (ex: 200000) */
  targetAmount: number;
  /** Montant actuellement collecté (ex: 150000) */
  currentAmount: number;
  /** Image du produit réel issu du stock NaNa POS */
  productImage: string;
  /** Nom du produit réel (ex: "iPhone 15") */
  productName: string;
  /** Prénom ou nom du bénéficiaire (ex: "Sarah") */
  beneficiaryName?: string;
  /** Devise d'affichage (défaut: "FCFA") */
  currency?: string;
  /** Callback déclenché au clic sur "Contribuer" (ouvre le SmartActionMenu) */
  onOpenActionMenu?: () => void;
  /** Alias pour onOpenActionMenu */
  onOpenContribute?: () => void;
}

/**
 * @component CagnotteHeaderTracker
 * @description Tracker de progression épinglé en haut du chat de groupe (Prompt 20)
 * 
 * Directives UI/UX respectées au millimètre :
 * 1. Sticky Header : top-0 z-40 avec fond Glassmorphism (bg-white/80 backdrop-blur-md border-b border-gray-100).
 * 2. Design Jauge : h-3 rounded-full bg-slate-100 overflow-hidden.
 *    Remplissage avec gradient dynamique from-violet-500 to-fuchsia-500 et transition douce duration-700.
 * 3. Thumbnail ronde du cadeau réel à gauche.
 * 4. Texte informatif : "Cadeau pour l'anniversaire de Sarah : 150 000 / 200 000 FCFA atteints".
 * 5. Bouton Contribuer : px-4 py-1.5 bg-slate-900 text-white rounded-full text-xs font-semibold hover:bg-slate-800.
 * 6. État 100% Triomphe : La barre devient verte, le bouton disparaît,
 *    et le texte clignotant "✅ Objectif atteint ! Commande transmise au magasin." s'affiche.
 */
export const CagnotteHeaderTracker: React.FC<CagnotteHeaderTrackerProps> = ({
  targetAmount,
  currentAmount,
  productImage,
  productName,
  beneficiaryName = 'Sarah',
  currency = 'FCFA',
  onOpenActionMenu,
  onOpenContribute
}) => {
  // Calcul du pourcentage entre 0 et 100%
  const percentage = useMemo(() => {
    if (!targetAmount || targetAmount <= 0) return 0;
    const ratio = (currentAmount / targetAmount) * 100;
    return Math.min(100, Math.max(0, Math.round(ratio)));
  }, [currentAmount, targetAmount]);

  const isCompleted = percentage >= 100;

  // Formatage des montants FCFA (séparateur d'espace insécable français)
  const formatMoney = (val: number) => {
    return Math.round(val).toLocaleString('fr-FR');
  };

  const handleActionClick = () => {
    if (onOpenActionMenu) {
      onOpenActionMenu();
    } else if (onOpenContribute) {
      onOpenContribute();
    }
  };

  return (
    <div className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/85 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-4">
        {/* 1. Miniature (Thumbnail) ronde du produit réel NaNa POS */}
        <div className="relative shrink-0">
          <img
            src={productImage}
            alt={productName}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-violet-500/30 dark:ring-violet-400/40 shadow-xs"
            loading="lazy"
          />
          {isCompleted && (
            <span
              className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white p-0.5 rounded-full ring-2 ring-white dark:ring-slate-900"
              title="Cadeau validé et payé"
            >
              <CheckCircle2 className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* 2. Centre : Titre informatif + Jauge de Progression */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Texte informatif au-dessus de la jauge */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="text-xs sm:text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate">
              {isCompleted ? (
                /* Texte clignotant triomphal à 100% */
                <span className="font-bold text-emerald-600 dark:text-emerald-400 animate-pulse flex items-center gap-1.5">
                  ✅ Objectif atteint ! Commande transmise au magasin.
                </span>
              ) : (
                /* Texte standard : Cadeau pour l'anniversaire de Sarah */
                <span>
                  Cadeau pour l'anniversaire de{' '}
                  <strong className="font-semibold text-slate-900 dark:text-white">
                    {beneficiaryName}
                  </strong>{' '}
                  :{' '}
                  <span className="font-semibold text-violet-600 dark:text-violet-400">
                    {formatMoney(currentAmount)}
                  </span>{' '}
                  / {formatMoney(targetAmount)} {currency} atteints
                </span>
              )}
            </div>

            {/* Pourcentage badge */}
            <span
              className={`text-[11px] font-bold shrink-0 tabular-nums ${
                isCompleted
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-violet-600 dark:text-violet-400'
              }`}
            >
              {percentage}%
            </span>
          </div>

          {/* Barre de Progression Épaisse et Élégante */}
          <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out relative ${
                isCompleted
                  ? 'bg-emerald-500 shadow-md shadow-emerald-500/40'
                  : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
              }`}
              style={{ width: `${percentage}%` }}
            >
              {/* Reflet shimmer discret pour effet premium */}
              {!isCompleted && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
              )}
            </div>
          </div>
        </div>

        {/* 3. Bouton "Contribuer" à droite (Disparaît instantanément à 100%) */}
        {!isCompleted && (
          <div className="shrink-0 pl-1">
            <button
              type="button"
              onClick={handleActionClick}
              className="px-4 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 rounded-full text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white transition cursor-pointer active:scale-95 shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-amber-300 dark:text-amber-500 shrink-0" />
              <span>Contribuer</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CagnotteHeaderTracker;
