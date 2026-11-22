import React, { useState, useEffect } from 'react';
import { Sparkles, X, ArrowRight, Loader2, Hash, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MiniMarketDrawer from './MiniMarketDrawer';
import UltimateCheckout, { PaymentSuccessDetails } from '../payment/UltimateCheckout';
import { playTapBeep, playValidationBeep, playCashChime } from '../../utils/audio';

const PublicPhysicalFunnelView = React.lazy(() =>
  import('./PublicPhysicalFunnelView').then((m) => ({
    default: m.PublicPhysicalFunnelView || m.default,
  }))
);

export interface LiveCodeMagicWidgetProps {
  /** Si true, n'affiche pas le bouton flottant (utile quand le modal est piloté de l'extérieur) */
  hideFloatingButton?: boolean;
}

export const LiveCodeMagicWidget: React.FC<LiveCodeMagicWidgetProps> = ({
  hideFloatingButton = false,
}) => {
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Résultat du Code Magique résolu → Mini-Market popup direct OU tunnel dépliable
  const [activeLiveStore, setActiveLiveStore] = useState<{
    code: string;
    slug: string;
    storeId?: string;
    title: string;
  } | null>(null);
  const [isMiniMarketOpen, setIsMiniMarketOpen] = useState(false);
  const [isTunnelExpanded, setIsTunnelExpanded] = useState(false);

  // Produits chargés pour ce vendeur + Checkout Mobile Money direct
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [checkoutCart, setCheckoutCart] = useState<any[]>([]);
  const [checkoutMeta, setCheckoutMeta] = useState<any | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Permet à n'importe quel bouton de l'app d'ouvrir le prompt Code Magique via CustomEvent
  useEffect(() => {
    const handler = () => setIsPromptOpen(true);
    window.addEventListener('nana_open_live_code_prompt', handler);
    return () => window.removeEventListener('nana_open_live_code_prompt', handler);
  }, []);

  // Chargement instantané des produits du vendeur dès que le code magique est résolu
  useEffect(() => {
    if (!activeLiveStore) return;
    let cancelled = false;

    async function fetchVendorProducts() {
      try {
        let query = supabase.from('products').select('*').limit(30);
        if (activeLiveStore?.storeId) {
          query = query.eq('tenant_id', activeLiveStore.storeId);
        }
        const { data, error } = await query;
        if (!cancelled && !error && data && data.length > 0) {
          setStoreProducts(
            data.map((p: any) => ({
              id: String(p.id),
              name: p.title || p.name || 'Article',
              price: Number(p.price) || 0,
              category: p.category || 'Général',
              image: p.thumbnail_url || p.image_url || p.image || '/placeholder-product.png',
              stock: p.stock ?? 50,
            }))
          );
          return;
        }
      } catch {}

      if (!cancelled) {
        setStoreProducts([
          {
            id: 'live-1',
            name: `${activeLiveStore?.title || 'Offre Live'} — Lot #01`,
            price: 15000,
            category: 'Offre Live',
            image: 'https://images.unsplash.com/photo-1609592424364-5858066fba94?w=400&q=80',
            stock: 25,
          },
          {
            id: 'live-2',
            name: 'Pack Duo Spécial Live — Lot #02',
            price: 25000,
            category: 'Offre Live',
            image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&q=80',
            stock: 40,
          },
        ]);
      }
    }

    fetchVendorProducts();
    return () => {
      cancelled = true;
    };
  }, [activeLiveStore]);

  const handleResolveCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = codeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean || isLookingUp) return;

    setIsLookingUp(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/live-codes/${encodeURIComponent(clean)}`);
      const json = await res.json();
      if (!res.ok || !json?.success || !json.liveCode) {
        setErrorMsg(json?.error || `Code "${clean}" introuvable. Vérifiez le code dicté par le vendeur.`);
        return;
      }

      playValidationBeep();
      setActiveLiveStore({
        code: json.liveCode.code,
        slug: json.liveCode.slug,
        storeId: json.liveCode.storeId,
        title: json.liveCode.title || `Boutique Live #${json.liveCode.code}`,
      });
      setIsPromptOpen(false);
      setIsMiniMarketOpen(true);
      setCodeInput('');
    } catch {
      setErrorMsg('Impossible de vérifier le code. Vérifiez votre connexion.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleCloseAll = () => {
    playTapBeep();
    setIsMiniMarketOpen(false);
    setIsTunnelExpanded(false);
    setIsCheckoutOpen(false);
    setActiveLiveStore(null);
  };

  return (
    <>
      {/* Bouton flottant discret « ✨ Code Live » (en bas à gauche) */}
      {!hideFloatingButton && !isMiniMarketOpen && !isTunnelExpanded && !isCheckoutOpen && (
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            setErrorMsg('');
            setIsPromptOpen(true);
          }}
          className="fixed left-3 bottom-5 sm:left-5 sm:bottom-6 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-950/90 hover:bg-slate-900 text-white border border-emerald-400/50 shadow-[0_10px_28px_-6px_rgba(16,185,129,0.5)] backdrop-blur-md transition-all active:scale-95 cursor-pointer text-xs font-black"
          title="Taper un Code Magique Live pour ouvrir un Mini-Market instantanément"
        >
          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Code Live</span>
        </button>
      )}

      {/* Modale de saisie du Code Magique Live (avec petite croix ×) */}
      {isPromptOpen && (
        <div
          className="fixed inset-0 z-[10050] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsPromptOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-slate-950 border border-emerald-500/40 rounded-3xl overflow-hidden shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white">Code Magique Live</h3>
                  <p className="text-[10px] text-slate-400">Ouvrez le Mini-Market du vendeur en 1 seconde</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPromptOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveCode} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tapez le code dicté en Live (ex: 4829 ou AMINA24)</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value.toUpperCase());
                    setErrorMsg('');
                  }}
                  placeholder="Ex: 4829"
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-900 border-2 border-slate-700 focus:border-emerald-400 text-center text-2xl font-mono font-black tracking-[0.25em] text-white placeholder-slate-600 focus:outline-none uppercase"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/30 px-3 py-2 rounded-xl text-center">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={!codeInput.trim() || isLookingUp}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isLookingUp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Ouverture du Mini-Market…</span>
                  </>
                ) : (
                  <>
                    <span>Ouvrir le Mini-Market</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Popup Mini-Market Dépliable direct (avec petite croix × pour décrocher à tout moment) */}
      {activeLiveStore && isMiniMarketOpen && (
        <div className="relative z-[10060]">
          <MiniMarketDrawer
            products={storeProducts}
            isOpen={isMiniMarketOpen}
            storeTitle={`${activeLiveStore.title} (Code #${activeLiveStore.code})`}
            onClose={handleCloseAll}
            onCheckout={(cart, meta) => {
              setCheckoutCart(cart);
              setCheckoutMeta(meta || null);
              setIsMiniMarketOpen(false);
              setIsCheckoutOpen(true);
            }}
          />
          {/* Pill discrète en bas du popup pour déplier le tunnel complet si souhaité */}
          <button
            type="button"
            onClick={() => {
              setIsMiniMarketOpen(false);
              setIsTunnelExpanded(true);
            }}
            className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[10070] px-3.5 py-1.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-xl cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Déplier le tunnel complet du vendeur</span>
          </button>
        </div>
      )}

      {/* Tunnel Dépliable en Overlay Popup (avec petite croix × en haut à droite pour décrocher) */}
      {activeLiveStore && isTunnelExpanded && (
        <div
          className="fixed inset-0 z-[10060] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
          onClick={handleCloseAll}
        >
          <div
            className="relative w-full max-w-[680px] h-[96dvh] sm:h-[92dvh] bg-[#070b14] rounded-t-3xl sm:rounded-3xl border border-emerald-500/30 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barre supérieure avec petite croix × bien visible pour décrocher */}
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-black">
                  CODE #{activeLiveStore.code}
                </span>
                <span className="text-xs font-extrabold text-white truncate">
                  {activeLiveStore.title}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCloseAll}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                title="Fermer et décrocher le tunnel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <React.Suspense
                fallback={
                  <div className="h-full flex items-center justify-center text-xs text-slate-300 gap-2">
                    <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                    <span>Chargement du tunnel vendeur...</span>
                  </div>
                }
              >
                <PublicPhysicalFunnelView
                  slug={activeLiveStore.slug}
                  onBackToStore={handleCloseAll}
                />
              </React.Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Caisse Fintech Réelle UltimateCheckout (Routeur NanaSwitch + Ticket Caisse Physique Mini-Market) */}
      {activeLiveStore && isCheckoutOpen && (() => {
        const rawTotal = checkoutCart.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);
        const computedAmount = checkoutMeta?.discountedTotal ?? rawTotal;
        const summaryName =
          checkoutCart.length === 1
            ? checkoutCart[0].name
            : `Panier Live #${activeLiveStore.code} (${checkoutCart.reduce((s, i) => s + (i.quantity || 1), 0)} articles)`;

        return (
          <UltimateCheckout
            isModal={true}
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            enablePhysicalPosToken={true}
            amount={computedAmount}
            currency="FCFA"
            storeName={activeLiveStore.title}
            merchantId={activeLiveStore.storeId}
            product={{
              id: activeLiveStore.slug,
              name: summaryName,
              price: computedAmount,
              originalPrice: rawTotal > computedAmount ? rawTotal : undefined,
              imageUrl: checkoutCart[0]?.image || '',
              items: checkoutCart.map((i) => ({
                id: i.id,
                name: i.name,
                price: Number(i.price) || 0,
                quantity: Number(i.quantity) || 1,
                imageUrl: i.image,
              })),
            }}
            onSuccess={(details: PaymentSuccessDetails) => {
              const activeAff = checkoutMeta?.affiliateRef || '';
              if (activeAff && details?.amount > 0 && details?.paymentMethod !== 'PHYSICAL_POS_TOKEN') {
                fetch('/api/affiliate/credit-commission', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  keepalive: true,
                  body: JSON.stringify({
                    affiliateRef: activeAff,
                    orderRef: details.transactionId || details.orderId || `LIVE-${Date.now()}`,
                    orderTotal: details.amount,
                    commissionRate: 10,
                    tenantId: activeLiveStore.storeId || '',
                    slug: activeLiveStore.slug,
                    customerName: details.customerName || 'Client Live',
                    operator: details.operator?.name || details.paymentMethod || 'MOBILE_MONEY',
                  }),
                }).catch(() => {});
              }
              playCashChime();
            }}
          />
        );
      })()}
    </>
  );
};

export default LiveCodeMagicWidget;
