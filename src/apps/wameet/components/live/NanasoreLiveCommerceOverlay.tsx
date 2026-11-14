import React, { useState, useEffect } from 'react';
import {
  LiveEventProduct,
  LiveEventDocument,
  subscribeToLiveEvent,
  pushLiveActiveProduct,
  PRESET_LIVE_PRODUCTS
} from '../../../../services/nanasoreLiveSyncService';
import { NanasoreLiveProductPopUp } from './NanasoreLiveProductPopUp';
import { NanasoreLiveCheckoutBottomSheet } from './NanasoreLiveCheckoutBottomSheet';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { Sparkles, Zap, Radio, SlidersHorizontal, Check } from 'lucide-react';

export interface NanasoreLiveCommerceOverlayProps {
  liveId: string;
  isHost?: boolean;
  availableProducts?: LiveEventProduct[];
  onOrderSuccess?: (orderId: string) => void;
  className?: string;
  positionMode?: 'absolute' | 'fixed';
  bottomOffset?: string;
}

export const NanasoreLiveCommerceOverlay: React.FC<NanasoreLiveCommerceOverlayProps> = ({
  liveId,
  isHost = false,
  availableProducts,
  onOrderSuccess,
  className = '',
  positionMode = 'absolute',
  bottomOffset
}) => {
  const [eventData, setEventData] = useState<LiveEventDocument | null>(null);
  const [rawIncomingProduct, setRawIncomingProduct] = useState<LiveEventProduct | null>(null);
  const [activeProduct, setActiveProduct] = useState<LiveEventProduct | null>(null);
  const [isPopUpDismissed, setIsPopUpDismissed] = useState<boolean>(false);
  const [isCheckoutDrawerOpen, setIsCheckoutDrawerOpen] = useState<boolean>(false);
  const [showHostPanel, setShowHostPanel] = useState<boolean>(false);

  // 1. Écouteur de synchronisation temps réel de session (Produit épinglé)
  useEffect(() => {
    if (!liveId) return;

    const unsubscribe = subscribeToLiveEvent(
      liveId,
      (event, product) => {
        setEventData(event);
        setRawIncomingProduct(product);
      },
      err => {
        console.warn('[NANASORE LIVE COMMERCE OVERLAY] Erreur sync live :', err);
      }
    );

    return () => unsubscribe();
  }, [liveId]);

  // 2. Écouteur WebSocket Phygital (Caisse Physique -> Live Shopping)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Écouteur sur les événements de synchronisation physique émis par le contrôleur POS
    const handlePhygitalSale = (e: any) => {
      const data = e.detail || e;
      if (!data) return;

      setActiveProduct(current => {
        if (!current || (data.productId && current.id !== data.productId)) return current;
        const newStock = typeof data.newStock === 'number' ? data.newStock : Math.max(0, (current.stockLeft ?? 1) - (data.quantitySold || 1));
        return {
          ...current,
          stockLeft: newStock
        };
      });
    };

    const handleLockSales = (e: any) => {
      const data = e.detail || e;
      if (!data) return;

      setActiveProduct(current => {
        if (!current || (data.productId && current.id !== data.productId)) return current;
        return {
          ...current,
          stockLeft: 0
        };
      });
    };

    window.addEventListener('physical_store_sale' as any, handlePhygitalSale);
    window.addEventListener('lock_product_sales' as any, handleLockSales);

    // Écouteur également sur le canal Supabase Realtime de la boutique
    return () => {
      window.removeEventListener('physical_store_sale' as any, handlePhygitalSale);
      window.removeEventListener('lock_product_sales' as any, handleLockSales);
    };
  }, [liveId]);

  // =========================================================================
  // 2. LE "TIME-SYNC HACK" (LATENCE YOUTUBE LIVE ~3s VS FIRESTORE INSTANTANÉ)
  // Quand le vendeur pousse un produit, Firestore met à jour activeProductId.
  // Côté Spectateur : Ne pas afficher immédiatement ! On applique un setTimeout
  // de 3000ms (3 secondes). Après 3s, la carte produit Nanasore glisse vers le haut
  // pile au moment où le vendeur montre et parle de l'article dans le flux YouTube !
  // =========================================================================
  useEffect(() => {
    // Mode Hôte / Vendeur : affichage instantané sans délai pour son cockpit
    if (isHost) {
      setActiveProduct(rawIncomingProduct);
      if (rawIncomingProduct) {
        setIsPopUpDismissed(false);
      }
      return;
    }

    // Côté Spectateur : Si aucun produit n'est actif, masquer immédiatement
    if (!rawIncomingProduct) {
      setActiveProduct(null);
      return;
    }

    // Si un produit actif est détecté : appliquer le Time-Sync Hack de 3000ms
    const timer = setTimeout(() => {
      setActiveProduct(rawIncomingProduct);
      setIsPopUpDismissed(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [rawIncomingProduct?.id, isHost]);

  const handleOpenBuyDrawer = () => {
    setIsCheckoutDrawerOpen(true);
  };

  const handleCloseBuyDrawer = () => {
    setIsCheckoutDrawerOpen(false);
  };

  const handlePushProductFromHost = async (productId: string | null) => {
    playTapBeep();
    const targetProd = productId ? (availableProducts?.find(p => p.id === productId) || PRESET_LIVE_PRODUCTS[productId]) : undefined;
    await pushLiveActiveProduct(liveId, productId, targetProd);
  };

  const catalog = availableProducts && availableProducts.length > 0
    ? availableProducts
    : Object.values(PRESET_LIVE_PRODUCTS);

  return (
    <div className={`pointer-events-none ${className}`}>
      {/* ============================================================== */}
      {/* 1. CARTE PRODUIT POP-UP GLASSMORPHISM (EN BAS À GAUCHE DU LIVE)*/}
      {/* ============================================================== */}
      {activeProduct && !isPopUpDismissed && !isCheckoutDrawerOpen && (
        <div
          className={`${
            positionMode === 'fixed'
              ? 'fixed bottom-20 left-3 sm:left-6'
              : 'absolute bottom-16 sm:bottom-20 left-3 sm:left-4'
          } z-30 pointer-events-auto`}
          style={bottomOffset ? { bottom: bottomOffset } : undefined}
        >
          <NanasoreLiveProductPopUp
            product={activeProduct}
            onBuyClick={handleOpenBuyDrawer}
            onDismiss={() => setIsPopUpDismissed(true)}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. LE BOTTOM SHEET DE PAIEMENT ZÉRO-FRICTION (50% HAUTEUR)     */}
      {/* ============================================================== */}
      {activeProduct && (
        <div className="pointer-events-auto">
          <NanasoreLiveCheckoutBottomSheet
            product={activeProduct}
            liveId={liveId}
            isOpen={isCheckoutDrawerOpen}
            onClose={handleCloseBuyDrawer}
            onSuccess={onOrderSuccess}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. CONSOLE HOST VENDEUR : PUSH PRODUIT EN DIRECT (TEST / PROD) */}
      {/* ============================================================== */}
      {isHost && (
        <div className="absolute top-14 right-3 z-30 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setShowHostPanel(prev => !prev);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border-2 border-[#4169E1] text-[#4169E1] text-[11px] font-black flex items-center gap-1.5 shadow-lg shadow-[#4169E1]/20 cursor-pointer"
            title="Pousser un produit aux spectateurs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#4169E1]" />
            <span>Push Produit Direct</span>
          </button>

          {showHostPanel && (
            <div className="mt-2 w-64 p-3 rounded-2xl bg-white border-2 border-[#4169E1]/30 shadow-2xl text-slate-900 space-y-2 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between text-[11px] font-bold border-b border-slate-100 pb-1">
                <span className="text-[#4169E1] font-black">Pousser aux spectateurs</span>
                <span className="text-slate-400">En direct</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {catalog.map(item => {
                  const isActive = activeProduct?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handlePushProductFromHost(isActive ? null : item.id)}
                      className={`w-full p-2 rounded-xl border text-left text-xs transition cursor-pointer flex items-center justify-between gap-2 ${
                        isActive
                          ? 'bg-[#4169E1]/10 border-[#4169E1] text-[#4169E1] font-black'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <span className="truncate">{item.shortTitle || item.title}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-[#4169E1] shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {activeProduct && (
                <button
                  type="button"
                  onClick={() => handlePushProductFromHost(null)}
                  className="w-full py-1 text-[10px] text-rose-500 hover:text-rose-600 font-bold transition cursor-pointer text-center"
                >
                  Désépingler le produit du live
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NanasoreLiveCommerceOverlay;
