import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { X, Loader2, ChevronUp, ChevronDown, ArrowUp, Zap } from 'lucide-react';
import { getFunnelBySlug, resolveProductFunnelEngine, hasActiveModularFunnelSync } from '../../services/omniFunnelService';

const PublicDealPageView = React.lazy(() =>
  import('./PublicDealPageView').then((m) => ({ default: m.PublicDealPageView }))
);

const PublicModularTunnelView = React.lazy(() =>
  import('./PublicModularTunnelView').then((m) => ({ default: m.PublicModularTunnelView || m.default }))
);

const PublicPhysicalFunnelView = React.lazy(() =>
  import('./PublicPhysicalFunnelView').then((m) => ({ default: m.PublicPhysicalFunnelView || m.default }))
);

export interface SlideOutFunnelDrawerProps {
  funnelId: string | null;
  /**
   * Produit optionnel lié au tunnel pour appliquer la Règle d'Or de Priorité
   * (12 Blocs Modulaire 't' par défaut > Ultimate Funnel 'f' uniquement sur opt-in explicite sans 12 blocs).
   */
  product?: any;
  /**
   * Type facultatif du tunnel :
   * - 't' | 'modular' : Tunnel Modulaire 12 Blocs (Nana Funnel Studio 3.0 / Divi) — PRIORITÉ 1 PAR DÉFAUT
   * - 'c' | 'checkout' : Caisse Express 1-Clic CRO
   * - 'f' | 'ultimate' : Ultimate Funnel Studio (PRIORITÉ 2 CONDITIONNELLE)
   */
  funnelType?: 't' | 'f' | 'c' | 'modular' | 'checkout' | 'ultimate' | string;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Mode de rendu du tunnel :
   * - 'component' (Option A - par défaut) : Appel direct du composant existant (0ms, unmount automatique de la vidéo).
   * - 'iframe' (Option B) : Isolation CSS totale et exécution sandboxée via URL publique /t/:id ou /f/:id?embed=true.
   */
  renderMode?: 'component' | 'iframe';
}

/**
 * SlideOutFunnelDrawer - Tiroir Dépliable Universel pour Tunnels de Vente (12 Blocs Modulaires, Ultimate & Caisse Express)
 * Slide-out latéral sur Desktop (droite, largeur max-w-[650px]), Bottom-sheet sur Mobile.
 * Monte/démonte dynamiquement le tunnel pour stopper immédiatement la vidéo dès la fermeture.
 * Applique strictement la Hiérarchie de Sélection : Funnel Modulaire 12 Blocs ('t') Prioritaire par défaut.
 */
export const SlideOutFunnelDrawer: React.FC<SlideOutFunnelDrawerProps> = ({
  funnelId,
  product = null,
  funnelType,
  isOpen,
  onClose,
  renderMode = 'component'
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // 1. Analyse et normalisation synchrone du slug et du type selon la Règle d'Or de Priorité (0ms)
  const { cleanSlug, syncType } = useMemo(() => {
    if (!funnelId) return { cleanSlug: '', syncType: 't' as 't' | 'f' | 'c' };
    let raw = funnelId.trim();
    let explicitPrefix: 't' | 'f' | 'c' | null = null;

    // Nettoyage des préfixes d'identifiants
    if (/^(t[\/-]|tunnel-)/i.test(raw)) {
      explicitPrefix = 't';
      raw = raw.replace(/^(t[\/-]|tunnel-)/i, '');
    } else if (/^(c[\/-]|deal-|checkout-)/i.test(raw)) {
      explicitPrefix = 'c';
      raw = raw.replace(/^(c[\/-]|deal-|checkout-)/i, '');
    } else if (/^f[\/-]/i.test(raw)) {
      explicitPrefix = 'f';
      raw = raw.replace(/^f[\/-]/i, '');
    } else if (/^funnel-/i.test(raw)) {
      // Les IDs génériques "funnel-..." pointent par défaut vers le Funnel Modulaire 12 Blocs ('t')
      raw = raw.replace(/^funnel-/i, '');
    }

    const clean = raw.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

    // ÉTAPE 1 & 2 : Hiérarchie de priorité si un produit est fourni
    if (product) {
      const engineFromProduct = resolveProductFunnelEngine(product, explicitPrefix || funnelType || null);
      return { cleanSlug: clean, syncType: engineFromProduct };
    }

    // Si aucun objet produit n'est fourni, vérifier d'abord si un Funnel 12 blocs existe pour ce slug
    if (hasActiveModularFunnelSync({ id: clean, slug: clean, linkedFunnelId: clean })) {
      return { cleanSlug: clean, syncType: 't' as const };
    }

    if (funnelType === 'c' || funnelType === 'checkout' || funnelType === 'cro_express' || explicitPrefix === 'c') {
      return { cleanSlug: clean, syncType: 'c' as const };
    }

    // ÉTAPE 2 (Conditionnelle) : Ne charger Ultimate Funnel ('f') QUE SI demandé explicitement ET qu'aucun 12 blocs n'est actif
    if (funnelType === 'f' || funnelType === 'ultimate' || explicitPrefix === 'f') {
      return { cleanSlug: clean, syncType: 'f' as const };
    }

    // Par défaut sur toute la plateforme : Funnel Modulaire 12 Blocs ('t')
    return { cleanSlug: clean, syncType: 't' as const };
  }, [funnelId, funnelType, product]);

  // 2. État du type actif résolu (priorité obligatoire aux 12 blocs 't' par défaut)
  const [resolvedType, setResolvedType] = useState<'t' | 'f' | 'c'>(syncType || 't');

  useEffect(() => {
    setResolvedType(syncType || 't');
  }, [syncType]);

  // Vérification asynchrone Firestore en arrière-plan : si un Funnel 12 blocs existe dans Firestore/RTDB, il prend TOUJOURS la priorité
  useEffect(() => {
    if (!isOpen || !cleanSlug) return;

    // Si le produit a déjà le Funnel 12 blocs actif par défaut, maintenir 't' exclusivement
    if (product && resolveProductFunnelEngine(product, funnelType || null) === 't') {
      setResolvedType('t');
      return;
    }

    let isCancelled = false;
    getFunnelBySlug(cleanSlug, 't')
      .then((data) => {
        if (isCancelled) return;
        if (
          data &&
          (data.funnelType === 'modular' ||
            data.funnelStudio === 'nana_studio_3' ||
            data.linkPrefix === 't' ||
            (Array.isArray(data.pages) && data.pages.length > 0) ||
            (Array.isArray(data.blocks) && data.blocks.length > 0))
        ) {
          // ÉTAPE 1 : Un Funnel Modulaire 12 blocs existe -> priorité absolue
          setResolvedType('t');
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [isOpen, cleanSlug, product, funnelType]);

  // Remise en haut systématique à l'ouverture du tiroir
  useEffect(() => {
    if (isOpen) {
      setScrollProgress(0);
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, funnelId]);

  // Fermeture automatique du tiroir lors du déclenchement du checkout principal
  useEffect(() => {
    if (!isOpen) return;
    const handleCheckoutTriggered = () => {
      if (onClose) onClose();
    };
    window.addEventListener('nana:open_checkout', handleCheckoutTriggered);
    return () => window.removeEventListener('nana:open_checkout', handleCheckoutTriggered);
  }, [isOpen, onClose]);

  // Calcul dynamique de la jauge de progression
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }
    const progress = Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100)));
    setScrollProgress(progress);
  }, []);

  // Ascenseur intelligent : Défilement fluide vers le bloc de commande/paiement
  const scrollToCheckout = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const checkoutEl =
      scrollContainerRef.current.querySelector('#inline-checkout') ||
      scrollContainerRef.current.querySelector('#checkout') ||
      scrollContainerRef.current.querySelector('[data-block-type="checkout"]') ||
      scrollContainerRef.current.querySelector('[data-block="checkout"]') ||
      scrollContainerRef.current.querySelector('form');

    if (checkoutEl) {
      checkoutEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  // Ascenseur intelligent : Remonter instantanément au Bloc #1
  const scrollToTop = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, []);

  // Défilement pas-à-pas fluide (monte ou descend d'environ 65% de la hauteur visible)
  const scrollByStep = useCallback((direction: 'up' | 'down') => {
    if (!scrollContainerRef.current) return;
    const step = Math.max(280, Math.round(scrollContainerRef.current.clientHeight * 0.65));
    scrollContainerRef.current.scrollBy({
      top: direction === 'up' ? -step : step,
      behavior: 'smooth'
    });
  }, []);

  // Piste tactile interactive pour glissement/scrubbing ultra fluide au pouce sur mobile
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingTrack = useRef<boolean>(false);

  const handleTrackScrub = useCallback((clientY: number) => {
    if (!trackRef.current || !scrollContainerRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const offsetY = clientY - rect.top;
    const percentage = Math.max(0, Math.min(100, (offsetY / rect.height) * 100));
    const { scrollHeight, clientHeight } = scrollContainerRef.current;
    scrollContainerRef.current.scrollTop = ((scrollHeight - clientHeight) * percentage) / 100;
  }, []);

  const handleTouchStartTrack = (e: React.TouchEvent) => {
    e.stopPropagation();
    isDraggingTrack.current = true;
    handleTrackScrub(e.touches[0].clientY);
  };

  const handleTouchMoveTrack = (e: React.TouchEvent) => {
    if (!isDraggingTrack.current) return;
    e.stopPropagation();
    handleTrackScrub(e.touches[0].clientY);
  };

  const handleTouchEndTrack = (e: React.TouchEvent) => {
    e.stopPropagation();
    isDraggingTrack.current = false;
  };

  const handleMouseDownTrack = (e: React.MouseEvent) => {
    e.stopPropagation();
    isDraggingTrack.current = true;
    handleTrackScrub(e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingTrack.current) {
        handleTrackScrub(moveEvent.clientY);
      }
    };
    const onMouseUp = () => {
      isDraggingTrack.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // 1. LAZY LOADING STRICT : Si le tiroir est fermé, on ne monte RIEN dans le DOM (aucun flux vidéo en tâche de fond)
  if (!isOpen || !funnelId) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex justify-end bg-black/70 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      {/* Le Tiroir (Slide-Out sur Desktop max-w-[650px], Bottom-Sheet sur Mobile) */}
      <div
        className="relative w-full max-w-[650px] bg-[#020617] text-white h-[94dvh] md:h-full mt-auto md:mt-0 rounded-t-2xl md:rounded-none shadow-2xl flex flex-col animate-slide-in overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Empêche la fermeture quand on interagit dans le tunnel
      >
        {/* 1. Fine jauge de progression 3px tout en haut (0% à 100%) */}
        <div className="w-full h-[3px] bg-slate-800/80 overflow-hidden shrink-0 z-50">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-amber-400 transition-[width] duration-100 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* 2. Boutons d'action en haut à droite : Haut de page & Fermer */}
        <div className="absolute top-2 right-2 z-50 flex items-center gap-2 p-2 pointer-events-none">
          {scrollProgress > 10 && (
            <button
              type="button"
              onClick={scrollToTop}
              className="pointer-events-auto px-3 py-1.5 rounded-full bg-black/85 hover:bg-black text-white text-xs font-bold border border-white/20 shadow-xl backdrop-blur-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer animate-in fade-in"
              title="Revenir tout en haut des 12 blocs"
            >
              <span>⬆️ Haut de page</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le tunnel"
            className="pointer-events-auto w-10 h-10 rounded-full bg-black/85 hover:bg-black text-white flex items-center justify-center font-bold shadow-xl border border-white/20 transition cursor-pointer active:scale-95 shrink-0 backdrop-blur-md"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 2b. L'ASCENSEUR LATÉRAL TACTILE ULTRA-EFFICACE (Spécial Desktop & Tablette - masqué sur petit mobile pour ne pas masquer les champs) */}
        <div 
          className="hidden sm:flex absolute right-2 sm:right-3.5 top-1/2 -translate-y-1/2 z-50 flex-col items-center bg-slate-950/90 backdrop-blur-md border border-white/20 rounded-full shadow-2xl p-1 sm:p-1.5 gap-1.5 select-none"
          aria-label="Scrolleur rapide du tunnel de vente"
        >
          {/* Bouton Haut de Page */}
          <button
            type="button"
            onClick={scrollToTop}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center transition cursor-pointer"
            title="Revenir tout en haut"
            aria-label="Revenir tout en haut"
          >
            <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
          </button>

          {/* Bouton Pas-à-Pas Vers le Haut */}
          <button
            type="button"
            onClick={() => scrollByStep('up')}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/5 hover:bg-white/15 active:scale-90 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Monter"
            aria-label="Monter d'une section"
          >
            <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Piste Tactile Interactive (Scrubbing au doigt fluide) */}
          <div
            ref={trackRef}
            onTouchStart={handleTouchStartTrack}
            onTouchMove={handleTouchMoveTrack}
            onTouchEnd={handleTouchEndTrack}
            onMouseDown={handleMouseDownTrack}
            className="relative w-2.5 sm:w-3 h-24 sm:h-32 bg-slate-800/90 rounded-full cursor-pointer overflow-hidden flex flex-col justify-end p-0.5 touch-none"
            title={`Position: ${scrollProgress}% (Glisser ou taper pour défiler)`}
          >
            <div
              className="w-full bg-gradient-to-t from-emerald-500 via-indigo-500 to-amber-400 rounded-full transition-all duration-75"
              style={{ height: `${scrollProgress}%` }}
            />
          </div>

          {/* Badge Pourcentage */}
          <span className="text-[9px] font-mono font-bold text-slate-300 tabular-nums">
            {scrollProgress}%
          </span>

          {/* Bouton Pas-à-Pas Vers le Bas */}
          <button
            type="button"
            onClick={() => scrollByStep('down')}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/5 hover:bg-white/15 active:scale-90 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Descendre"
            aria-label="Descendre d'une section"
          >
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Bouton Aller à la Caisse / Commande */}
          <button
            type="button"
            onClick={scrollToCheckout}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 active:scale-90 text-slate-950 flex items-center justify-center transition shadow-md cursor-pointer"
            title="Aller directement au formulaire de commande"
            aria-label="Aller à la caisse"
          >
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-slate-950 stroke-slate-950" />
          </button>
        </div>

        {/* 3. Conteneur scrollable avec le rendu du tunnel (12 Blocs) */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 w-full overflow-y-auto custom-scrollbar relative touch-pan-y"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
            touchAction: 'pan-y',
            scrollBehavior: 'smooth'
          }}
        >
          <div className="w-full min-h-full pb-28">
            {renderMode === 'iframe' ? (
              /* OPTION B (Zéro conflit CSS) : Iframe de l'URL publique */
              <iframe
                src={`/${resolvedType}/${encodeURIComponent(cleanSlug)}?embed=true`}
                className="w-full h-full min-h-[85vh] border-0"
                allow="autoplay; fullscreen; payment"
                title="Funnel Checkout"
              />
            ) : (
              /* OPTION A (Ultra-rapide 0ms) : Rendu direct du composant existant */
              <React.Suspense
                fallback={
                  <div className="min-h-screen w-full bg-[#020617] flex flex-col items-center justify-center p-6 text-slate-300">
                    <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-3">
                      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">Ouverture du tunnel 12 blocs...</span>
                  </div>
                }
              >
                {resolvedType === 't' ? (
                  <PublicModularTunnelView
                    slug={cleanSlug}
                    product={product}
                    onBackToStore={onClose}
                    onDirectCheckout={(prod, qty) => {
                      onClose();
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('nana:open_checkout', { detail: { product: prod, quantity: qty || 1 } }));
                      }
                    }}
                    className="pt-2"
                  />
                ) : resolvedType === 'c' ? (
                  <PublicPhysicalFunnelView
                    slug={cleanSlug}
                    onBackToStore={onClose}
                    className="pt-2"
                  />
                ) : (
                  <PublicDealPageView
                    slug={cleanSlug}
                    funnelType="f"
                    onBackToStore={onClose}
                    className="pt-2"
                  />
                )}
              </React.Suspense>
            )}
          </div>
        </div>

        {/* 4. L'Ascenseur Intelligent "Commander maintenant" ⇅ "Revoir les détails" */}
        <div className="sticky bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-[#020617] via-[#020617]/95 to-transparent pt-6 shrink-0 border-t border-slate-800/60 backdrop-blur-sm">
          {scrollProgress < 75 ? (
            <button
              type="button"
              onClick={scrollToCheckout}
              className="w-full py-3.5 px-4 rounded-xl font-black text-sm uppercase tracking-wide bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition transform active:scale-98 cursor-pointer"
            >
              <span>⚡ Commander maintenant (Aller à la caisse) ↓</span>
            </button>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={scrollToTop}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider bg-slate-800/95 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600/70 shadow-2xl backdrop-blur-md flex items-center justify-center gap-2 transition transform active:scale-98 cursor-pointer"
              >
                <span>⬆️ Revoir les détails & la vidéo du haut</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlideOutFunnelDrawer;
