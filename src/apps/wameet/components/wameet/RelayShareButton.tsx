import React, { useState, useCallback } from 'react';
import { Megaphone, Link2, Share2, Check, Sparkles, Copy, MessageCircle } from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface RelayShareButtonProps {
  /** Identifiant unique de la session Live (ex: '123' ou 'live-123') */
  liveId?: string;
  /** Identifiant unique de l'utilisateur / spectateur affilié (ex: 'USER_ID' ou 'usr_awa_77') */
  userId?: string;
  /** Titre de la session Live pour le message de partage */
  title?: string;
  /** Pourcentage de commission reversé à l'affilié (défaut: 5%) */
  commissionPercentage?: number;
  /** Icône au choix : haut-parleur ('megaphone') ou maillons de chaîne ('chain') */
  icon?: 'megaphone' | 'chain';
  /** Variante d'affichage : barre d'outils, bouton d'action flottant, pill ou compact */
  variant?: 'toolbar' | 'floating' | 'pill' | 'compact';
  /** Texte personnalisé du bouton (défaut: "Relayer & Gagner 5%") */
  customLabel?: string;
  /** URL de base personnalisée (défaut: wameet.app ou origin actuel) */
  customDomain?: string;
  /** Callback optionnel lors du succès du partage */
  onShareSuccess?: (sharedUrl: string) => void;
  /** Classe CSS additionnelle */
  className?: string;
}

/**
 * COMPOSANT RelayShareButton (Le Bouton Viral Micro-Relais - Prompt 14)
 * 
 * Directives de design UI/UX au millimètre :
 * - Emplacement : Dans l'interface du Live (LiveRoomScreen), flottant ou intégré à la barre d'outils
 * - Design :
 *   - Icône de haut-parleur ou de maillons de chaîne (Lucide-react)
 *   - Fond gradient doré/vert : bg-gradient-to-r from-emerald-400 to-green-500
 *   - Texte blanc : "Relayer & Gagner 5%"
 * - Comportement :
 *   - Au clic, déclenche l'API Web Share native (navigator.share) pour envoyer un lien unique
 *     (ex: wameet.app/live/123?ref=USER_ID) sur Wameet, statuts, ou dans d'autres groupes Wameet.
 *   - Fallback interactif complet si Web Share non supporté (copie presse-papier + envoi direct Wameet).
 */
export const RelayShareButton: React.FC<RelayShareButtonProps> = ({
  liveId = '123',
  userId = 'USER_ID',
  title = 'Live Shopping Exclusif Wameet',
  commissionPercentage = 5,
  icon = 'megaphone',
  variant = 'toolbar',
  customLabel,
  customDomain,
  onShareSuccess,
  className = ''
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // Construction du lien unique de micro-relais (ex: wameet.app/live/123?ref=USER_ID)
  const getShareUrl = useCallback(() => {
    if (customDomain) {
      const cleanDomain = customDomain.replace(/\/+$/, '');
      return `${cleanDomain}/live/${liveId}?ref=${userId}`;
    }
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      return `${origin}/live/${liveId}?ref=${userId}`;
    }
    return `https://wameet.app/live/${liveId}?ref=${userId}`;
  }, [liveId, userId, customDomain]);

  const buttonLabel = customLabel || `Relayer & Gagner ${commissionPercentage}%`;
  const shareText = `🔥 Rejoins mon Live Wameet en direct ! Produits exclusifs en vente flash, commande en 1 clic :`;

  // Rendu de l'icône choisie (Haut-parleur ou Maillons de chaîne)
  const renderIcon = (iconClassName: string = 'w-3.5 h-3.5') => {
    if (icon === 'chain') {
      return <Link2 className={iconClassName} />;
    }
    return <Megaphone className={iconClassName} />;
  };

  // Gestion du clic de partage monétisé
  const handleShareClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    try {
      playTapBeep();
    } catch {}

    const shareUrl = getShareUrl();

    // 1. Déclenchement prioritaire de l'API Web Share native (Mobile, Android, iOS Safari, macOS)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${title} - Wameet Live`,
          text: `${shareText} ${shareUrl}`,
          url: shareUrl
        });

        playValidationBeep();
        if (onShareSuccess) onShareSuccess(shareUrl);
        return;
      } catch (err: any) {
        // L'utilisateur a cliqué sur "Annuler" dans la feuille de partage native
        if (err.name === 'AbortError') {
          return;
        }
        console.info('[RelayShareButton] Web Share a échoué, passage au fallback presse-papier :', err);
      }
    }

    // 2. Fallback Presse-papier & Modal (Desktop ou navigateurs sans Web Share API)
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        playValidationBeep();
        setShowShareModal(true);

        setTimeout(() => {
          setCopied(false);
        }, 3500);

        if (onShareSuccess) onShareSuccess(shareUrl);
      } else {
        setShowShareModal(true);
      }
    } catch (clipErr) {
      console.warn('[RelayShareButton] Échec copie presse-papier :', clipErr);
      setShowShareModal(true);
    }
  };

  const shareUrl = getShareUrl();
  const wUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${shareText}\n${shareUrl}`
  )}`;

  return (
    <>
      {/* =====================================================================
          1. BOUTON D'ACTION "RELAYER & GAGNER" (VARIATION SELON USAGE)
         ===================================================================== */}
      {variant === 'toolbar' ? (
        /* Variante intégrée à la barre d'outils du Live */
        <button
          type="button"
          onClick={handleShareClick}
          className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 active:scale-95 text-white font-black text-xs shadow-md shadow-emerald-500/20 border border-yellow-300/40 transition-all cursor-pointer select-none ${className}`}
          title={`Partager ce Live et toucher ${commissionPercentage}% sur chaque vente`}
        >
          {renderIcon('w-3.5 h-3.5 text-white group-hover:scale-110 transition-transform')}
          <span className="drop-shadow-xs">{buttonLabel}</span>
        </button>
      ) : variant === 'floating' ? (
        /* Variante Bouton d'Action Flottant (FAB) au-dessus de la vidéo / chat */
        <button
          type="button"
          onClick={handleShareClick}
          className={`fixed bottom-24 right-4 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-500 hover:from-emerald-300 hover:to-green-400 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-600/40 border-2 border-yellow-300 hover:scale-105 active:scale-95 transition-all cursor-pointer select-none animate-bounce-subtle ${className}`}
          title={`Gagner ${commissionPercentage}% de commission sur les ventes générées par votre lien`}
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            {renderIcon('w-3.5 h-3.5 text-white')}
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="font-black tracking-wide text-white drop-shadow-sm">
              {buttonLabel}
            </span>
            <span className="text-[10px] text-yellow-100 font-bold">
              Partager sur Wameet & Statuts
            </span>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-yellow-200 animate-spin-slow shrink-0" />
        </button>
      ) : variant === 'compact' ? (
        /* Variante ultra-compacte pour espaces réduits */
        <button
          type="button"
          onClick={handleShareClick}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 text-white font-extrabold text-[11px] shadow border border-yellow-300/40 hover:brightness-110 active:scale-95 transition cursor-pointer select-none ${className}`}
          title={`Relayer et toucher ${commissionPercentage}%`}
        >
          {renderIcon('w-3 h-3 text-white')}
          <span>+{commissionPercentage}% Cash</span>
        </button>
      ) : (
        /* Variante par défaut "pill" */
        <button
          type="button"
          onClick={handleShareClick}
          className={`group relative inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 active:scale-95 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/30 border border-yellow-300/50 transition-all duration-200 cursor-pointer select-none ${className}`}
          title={`Partager ce Live et toucher ${commissionPercentage}% de commission`}
        >
          <span className="w-5 h-5 rounded-full bg-emerald-950/20 flex items-center justify-center shrink-0">
            {renderIcon('w-3.5 h-3.5 text-white group-hover:scale-110 transition-transform')}
          </span>
          <span className="tracking-wide drop-shadow-xs font-black">
            {buttonLabel}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-yellow-400 text-slate-950 text-[9px] font-black uppercase tracking-tight">
            5%
          </span>
        </button>
      )}

      {/* =====================================================================
          2. MODALE FALLBACK : COPIE PRESSE-PAPIER + REDIRECTION WAMEET DIRECTE
         ===================================================================== */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-emerald-500/40 p-5 text-white shadow-2xl">
            {/* En-tête */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  {renderIcon('w-4 h-4')}
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">{buttonLabel}</h4>
                  <p className="text-[11px] text-emerald-400 font-bold">Votre lien d'affiliation monétisé</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center cursor-pointer text-xs"
                aria-label="Fermer la modale"
              >
                ✕
              </button>
            </div>

            {/* Description des gains */}
            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              Partagez ce Live à vos proches ou sur vos statuts. Chaque spectateur qui commande via votre lien vous rapporte{' '}
              <span className="text-yellow-400 font-black">{commissionPercentage}% de commission immédiate</span> sur votre Wallet Wameet !
            </p>

            {/* Zone de lien monétisé unique avec bouton Copier */}
            <div className="mt-3 p-2.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent text-xs text-emerald-300 font-mono outline-hidden select-all"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    playValidationBeep();
                    setTimeout(() => setCopied(false), 2500);
                  } catch {}
                }}
                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>

            {/* Actions rapides de partage */}
            <div className="mt-4 space-y-2">
              <a
                href={wUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  playValidationBeep();
                  setShowShareModal(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-slate-950" />
                <span>Envoyer sur Wameet & Statuts</span>
              </a>

              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-full py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RelayShareButton;
