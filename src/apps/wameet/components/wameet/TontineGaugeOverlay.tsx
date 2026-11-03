import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  Megaphone,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Flame,
  ArrowRight
} from 'lucide-react';
import { playValidationBeep, playTapBeep, playCashChime } from '../../../../utils/audio';

export interface TontineGaugeOverlayProps {
  /** Nombre actuel de commandes engagées */
  initialOrders?: number;
  /** Seuil d'achat groupé à atteindre */
  targetOrders?: number;
  /** Durée initiale du compte à rebours en secondes (ex: 600 pour 10:00) */
  initialTimeSeconds?: number;
  /** Montant engagé / bloqué en FCFA (ex: 20000) */
  blockedAmount?: number;
  /** Montant remboursé une fois le palier franchi en FCFA (ex: 5000) */
  refundAmount?: number;
  /** Titre ou nom du produit de la Tontine */
  productName?: string;
  /** Devise d'affichage (ex: FCFA) */
  currency?: string;
  /** URL de partage direct vers le Live */
  shareUrl?: string;
  /** Visibilité du composant */
  isOpen?: boolean;
  /** Callback lors du clic sur fermer/minimiser */
  onClose?: () => void;
  /** Callback lors de la participation (paiement/séquestre) */
  onParticipate?: (amount: number, newOrdersCount: number) => void;
  /** Callback lors du partage */
  onShare?: () => void;
  /** Callback lorsque l'objectif de 100% est atteint */
  onGoalReached?: () => void;
  className?: string;
}

/**
 * Déclenche une pluie de confettis sur tout l'écran (Full-Screen Confetti Shower)
 */
function triggerScreenWideConfetti(): void {
  try {
    if (typeof window !== 'undefined') {
      import('canvas-confetti')
        .then((module) => {
          const confetti = module.default || module;
          const duration = 4500;
          const animationEnd = Date.now() + duration;

          const interval: any = setInterval(() => {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) {
              return clearInterval(interval);
            }

            const particleCount = 45 * (timeLeft / duration);

            // Canon de gauche
            confetti({
              particleCount,
              angle: 60,
              spread: 65,
              origin: { x: 0, y: 0.65 },
              colors: ['#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#8B5CF6']
            });

            // Canon de droite
            confetti({
              particleCount,
              angle: 120,
              spread: 65,
              origin: { x: 1, y: 0.65 },
              colors: ['#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#8B5CF6']
            });
          }, 220);
        })
        .catch(() => {});
    }
  } catch {}
}

/**
 * COMPOSANT TontineGaugeOverlay (Achat Groupé Viral Wameet Live)
 * 
 * Directives UI/UX au millimètre :
 * - Carte Glassmorphism avec bordure dorée scintillante animée.
 * - Jauge de progression épaisse : h-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500.
 * - Texte d'objectif : "Objectif : 50 commandes pour débloquer le prix de gros !".
 * - Timer digital rouge vif : font-mono text-red-500 font-bold (ex: 09:58).
 * - Bouton Primaire (Paiement) : "Participer (Bloquer 20 000 FCFA)" avec icône cadenas (Shield).
 * - Bouton Secondaire (Viralité) : "Inviter des amis 📢" via Web Share API native (Wameet/SMS).
 * - Animation de succès 100% : Pluie de confettis écran entier + transformation en gros badge vert
 *   "Prix réduit débloqué ! 5000F remboursés".
 */
export const TontineGaugeOverlay: React.FC<TontineGaugeOverlayProps> = ({
  initialOrders = 42,
  targetOrders = 50,
  initialTimeSeconds = 598, // 09:58 par défaut
  blockedAmount = 20000,
  refundAmount = 5000,
  productName = 'Coffret Prestige Karité Royal',
  currency = 'FCFA',
  shareUrl,
  isOpen = true,
  onClose,
  onParticipate,
  onShare,
  onGoalReached,
  className = ''
}) => {
  // États locaux de la jauge et de la progression
  const [currentOrders, setCurrentOrders] = useState<number>(initialOrders);
  const [timeRemaining, setTimeRemaining] = useState<number>(initialTimeSeconds);
  const [hasParticipated, setHasParticipated] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(initialOrders >= targetOrders);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const goalReachedNotifiedRef = useRef<boolean>(initialOrders >= targetOrders);

  // Pourcentage de progression (0 à 100%)
  const progressPercent = Math.min(100, Math.round((currentOrders / targetOrders) * 100));
  const missingOrders = Math.max(0, targetOrders - currentOrders);

  // Formatage du prix avec séparateurs
  const formatPrice = (val: number) => val.toLocaleString('fr-FR');

  // Compte à rebours défilant (ex: 09:58)
  useEffect(() => {
    if (timeRemaining <= 0 || isUnlocked) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isUnlocked]);

  // Formatage digital mm:ss (rouge vif font-mono)
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTimer = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Gestion du déblocage 100%
  useEffect(() => {
    if (currentOrders >= targetOrders && !goalReachedNotifiedRef.current) {
      goalReachedNotifiedRef.current = true;
      setIsUnlocked(true);

      try {
        playCashChime();
      } catch {}

      // Pluie de confettis sur tout l'écran
      triggerScreenWideConfetti();

      if (onGoalReached) {
        onGoalReached();
      }
    }
  }, [currentOrders, targetOrders, onGoalReached]);

  // ACTION 1 : Participation à l'achat groupé (Bouton Primaire Cadenas)
  const handleParticipate = () => {
    if (hasParticipated) return;

    try {
      playValidationBeep();
    } catch {}

    const updatedOrders = currentOrders + 1;
    setCurrentOrders(updatedOrders);
    setHasParticipated(true);

    if (onParticipate) {
      onParticipate(blockedAmount, updatedOrders);
    }
  };

  // ACTION 2 : Partage viral natif Web Share API (Bouton Secondaire Mégaphone)
  const handleInviteFriends = async () => {
    try {
      playTapBeep();
    } catch {}

    const resolvedUrl =
      shareUrl ||
      (typeof window !== 'undefined' ? window.location.href : 'https://wameet.africa/live');

    const shareTitle = 'Tontine Flash Wameet Live 🔥';
    const shareText = `Objectif prix de gros sur ${productName} ! Il ne manque que ${missingOrders} commandes pour débloquer ${formatPrice(refundAmount)} FCFA de remboursement immédiat ! Rejoins le Live maintenant :`;

    if (onShare) {
      onShare();
    }

    // Déclenchement de l'API de partage native du téléphone (Web Share API)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: resolvedUrl
        });
        setShareFeedback('Invitation envoyée !');
        setTimeout(() => setShareFeedback(null), 3000);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // Annulation utilisateur
      }
    }

    // Fallback direct W / Presse-papier pour desktop ou navigateurs restreints
    try {
      const wUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        `${shareText} ${resolvedUrl}`
      )}`;
      window.open(wUrl, '_blank', 'noopener,noreferrer');
      setShareFeedback('Ouverture du partage...');
      setTimeout(() => setShareFeedback(null), 3000);
    } catch {
      // Fallback copie presse-papier
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(`${shareText} ${resolvedUrl}`);
        setShareFeedback('Lien copié dans le presse-papier !');
        setTimeout(() => setShareFeedback(null), 3000);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="region"
      aria-label="Tontine Flash achat groupé"
      className={`relative z-25 w-full max-w-md mx-auto transition-all duration-300 select-none ${className}`}
    >
      {/* =====================================================================
          CONTENEUR MAÎTRE EN GLASSMORPHISM AVEC BORDURE DORÉE SCINTILLANTE
          Bordure dorée animée avec effet néon et lueur d'ambiance
         ===================================================================== */}
      <div
        className={`relative rounded-2xl p-3 sm:p-3.5 bg-slate-950/85 backdrop-blur-xl border border-amber-400/60 shadow-[0_8px_32px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/30 overflow-hidden text-white transition-all duration-300 ${
          isUnlocked ? 'border-emerald-400/80 ring-emerald-400/40 shadow-emerald-500/20' : ''
        }`}
      >
        {/* Lueur dorée scintillante animée en arrière-plan */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400/25 via-yellow-300/40 to-amber-500/25 rounded-2xl blur-xs -z-10 animate-pulse pointer-events-none" />

        {/* Ligne d'en-tête : Badge Tontine + Timer Digital Rouge Vif */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/10">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1 truncate">
              <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
              <span>Tontine Flash • Achat Groupé</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Compte à rebours numérique rouge vif défilant (ex: 09:58) */}
            <div
              className="flex items-center gap-1 font-mono text-red-500 font-bold text-xs sm:text-sm bg-red-950/70 border border-red-500/40 px-2 py-0.5 rounded-lg shadow-inner"
              title="Temps restant pour débloquer le prix de gros"
            >
              <Clock className="w-3.5 h-3.5 animate-pulse text-red-400" />
              <span>{formattedTimer}</span>
            </div>

            {/* Bouton minimiser / réduire */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition cursor-pointer"
              aria-label={isCollapsed ? 'Développer la jauge' : 'Réduire la jauge'}
            >
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* =====================================================================
            CAS DE SUCCÈS : 100% ATTEINT — LE GROS BADGE VERT VIBRANT
            "Prix réduit débloqué ! 5000F remboursés"
           ===================================================================== */}
        {isUnlocked ? (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 border-2 border-emerald-300 text-white shadow-xl shadow-emerald-500/30 text-center animate-in zoom-in-95 duration-300 space-y-1.5">
            <div className="inline-flex p-1.5 bg-white/20 rounded-full">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>

            <div className="text-sm sm:text-base font-black tracking-tight">
              🎉 Prix réduit débloqué ! {formatPrice(refundAmount)}F remboursés
            </div>

            <p className="text-[11px] sm:text-xs text-emerald-100 font-medium leading-tight">
              L'objectif des {targetOrders} commandes est atteint ! Chaque participant bénéficie du prix de gros
              avec remboursement automatique de {formatPrice(refundAmount)} {currency} sur son Smart Escrow.
            </p>

            {hasParticipated && (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-white text-emerald-800 text-[11px] font-black px-3 py-1 rounded-full shadow-md">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Votre remboursement de {formatPrice(refundAmount)}F est validé !</span>
              </div>
            )}
          </div>
        ) : (
          !isCollapsed && (
            <div className="space-y-2.5">
              {/* ===============================================================
                  LA JAUGE DE PROGRESSION
                  - Texte d'objectif au-dessus
                  - Barre épaisse : h-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500
                 =============================================================== */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-amber-200 leading-tight">
                    Objectif : {targetOrders} commandes pour débloquer le prix de gros !
                  </span>
                  <span className="text-[11px] font-black text-amber-300 shrink-0 font-mono">
                    {currentOrders}/{targetOrders} ({progressPercent}%)
                  </span>
                </div>

                {/* Barre de progression épaisse Tailwind h-3 */}
                <div className="w-full bg-slate-800/90 h-3 rounded-full overflow-hidden p-0.5 border border-amber-400/30 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(245,158,11,0.7)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Statut viral d'urgence */}
                <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium pt-0.5">
                  <span className="flex items-center gap-1 text-amber-300 font-bold">
                    <Flame className="w-3 h-3 text-orange-400 animate-bounce" />
                    <span>Plus que {missingOrders} commandes nécessaires !</span>
                  </span>
                  <span className="text-emerald-400 font-bold">
                    -{formatPrice(refundAmount)} {currency} par article
                  </span>
                </div>
              </div>

              {/* Message de confirmation de partage */}
              {shareFeedback && (
                <div className="text-center text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-400/40 rounded-lg py-1 px-2 animate-in fade-in">
                  📢 {shareFeedback}
                </div>
              )}

              {/* ===============================================================
                  LES DEUX BOUTONS D'ACTION (DOUBLE CTA)
                  1. Bouton Primaire (Paiement) : "Participer (Bloquer 20 000 FCFA)" avec Shield
                  2. Bouton Secondaire (Viralité) : "Inviter des amis 📢" via Web Share API
                 =============================================================== */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                {/* 1. Bouton Primaire (Paiement / Séquestre) */}
                <button
                  type="button"
                  onClick={handleParticipate}
                  disabled={hasParticipated}
                  className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg truncate active:scale-95 ${
                    hasParticipated
                      ? 'bg-emerald-600/90 text-white border border-emerald-400/60 shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 border border-amber-300 shadow-amber-400/25'
                  }`}
                  title={
                    hasParticipated
                      ? 'Vous participez déjà à cet achat groupé'
                      : `Participer (Bloquer ${formatPrice(blockedAmount)} ${currency})`
                  }
                >
                  <Shield className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                  <span className="truncate">
                    {hasParticipated
                      ? 'Inscrit ! (20 000F bloqués)'
                      : `Participer (Bloquer ${formatPrice(blockedAmount)} ${currency})`}
                  </span>
                </button>

                {/* 2. Bouton Secondaire (Viralité & Partage Web Share API) */}
                <button
                  type="button"
                  onClick={handleInviteFriends}
                  className="py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold border border-slate-700/80 hover:border-amber-400/50 flex items-center justify-center gap-1.5 transition-all cursor-pointer truncate active:scale-95 shadow-md"
                  title="Inviter des amis sur Wameet ou SMS"
                >
                  <Megaphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Inviter des amis 📢</span>
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default TontineGaugeOverlay;
