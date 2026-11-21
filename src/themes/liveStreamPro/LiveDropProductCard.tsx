import React from 'react';
import { Flame, Zap, Lock, ExternalLink, Sparkles, Clock, ShoppingBag } from 'lucide-react';
import { LiveProductItem } from './liveStreamAssets';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import { AdminProductQuickBar } from '../../components/storeBuilder/AdminProductQuickBar';
import { StoreProductItem } from '../../components/storeBuilder/types';
import { hasExplicitProductFunnel } from '../themeUtils';

interface LiveDropProductCardProps {
  product: LiveProductItem;
  lotIndex: number;
  onOpenTunnel: (product: LiveProductItem) => void;
  onAddToCart?: (product: LiveProductItem) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
  storeSlug?: string;
  onEditProduct?: (product: StoreProductItem, options?: { initialCard?: number }) => void;
  onPreviewFunnel?: (product: StoreProductItem) => void;
}

export const LiveDropProductCard: React.FC<LiveDropProductCardProps> = ({
  product,
  lotIndex,
  onOpenTunnel,
  onAddToCart,
  isPublicView,
  isAdminPreview,
  storeSlug,
  onEditProduct,
  onPreviewFunnel
}) => {
  const lotLabel = product.liveLotBadge || product.lotNumber || `#LOT 0${lotIndex + 1}`;
  const claimed = product.claimedPercent || (product.stock ? Math.min(95, Math.max(40, 100 - product.stock * 5)) : 82);
  const unitsLeft = product.stockLeft || (product.stock ? Math.max(1, product.stock) : 3);

  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 40;

  const isLocked = Boolean(product.isLocked);

  const handleOpenTunnel = (e: React.MouseEvent) => {
    e.stopPropagation();
    playValidationBeep();
    onOpenTunnel(product);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    if (onAddToCart) {
      onAddToCart(product);
    } else {
      onOpenTunnel(product);
    }
  };

  return (
    <div 
      className="live-drop-card flex flex-col justify-between group cursor-pointer relative"
      onClick={handleOpenTunnel}
    >
      <AdminProductQuickBar
        product={product}
        isPublicView={isPublicView}
        isAdminPreview={isAdminPreview}
        storeSlug={storeSlug}
        onEditProduct={onEditProduct}
        onPreviewFunnel={onPreviewFunnel}
      />
      {/* ================= CONTENEUR IMAGE (FORMAT CARRÉ 1:1 FACEBOOK ADS) ================= */}
      <div className="relative w-full aspect-square bg-[#0B0D14] overflow-hidden flex items-center justify-center p-3 select-none">
        
        {/* Image du Produit */}
        <img 
          src={product.image} 
          alt={product.name} 
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            isLocked ? 'filter grayscale-[30%] opacity-80' : ''
          }`}
          loading="lazy"
        />

        {/* Dégradé léger pour lisibilité des badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12141D] via-transparent to-black/40 pointer-events-none" />

        {/* Badge Haut Gauche : Rouge Néon #FF2A54 */}
        <div className="absolute top-3 left-3 z-10">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FF2A54] text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-[#FF2A54]/40 border border-white/20">
            <Flame className="w-3 h-3 fill-white animate-pulse" />
            OFFRE LIVE -{discountPercent}%
          </span>
        </div>

        {/* Badge Haut Droite : Numéro de passage #LOT 01 */}
        <div className="absolute top-3 right-3 z-10">
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#F8FAFC] border border-white/20 text-[10px] font-black uppercase tracking-widest shadow-md">
            {lotLabel}
          </span>
        </div>

        {/* Overlay si le produit est verrouillé / bientôt dévoilé */}
        {isLocked && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shadow-lg">
              <Lock className="w-5 h-5 text-amber-300 animate-bounce-subtle" />
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40 font-black text-xs uppercase tracking-wide">
              🔒 Dévoilé dans {product.unlockInMinutes || 10} min
            </span>
            <p className="text-[11px] text-slate-300">
              Restez connectés sur le Live pour débloquer ce tarif
            </p>
          </div>
        )}
      </div>

      {/* ================= CORPS DE LA CARTE ================= */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        
        {/* Titre & Catégorie */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
            {product.category || 'Vente Flash Direct'}
          </span>
          <h4 className="text-sm sm:text-base font-extrabold text-white line-clamp-2 leading-snug group-hover:text-indigo-200 transition-colors">
            {product.name}
          </h4>
        </div>

        {/* La Jauge de Rareté en Temps Réel */}
        <div className="space-y-1.5 bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#FF2A54] flex items-center gap-1 text-[11px]">
              <Flame className="w-3.5 h-3.5 fill-[#FF2A54]" />
              {claimed}% réclamés
            </span>
            <span className="text-slate-300 text-[11px] font-semibold">
              Il ne reste que <strong className="text-amber-400">{unitsLeft} unités</strong> !
            </span>
          </div>

          {/* Barre incandescente Or vers Rouge */}
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden p-0.5">
            <div 
              className="h-full rounded-full live-gauge-incandescent transition-all duration-500"
              style={{ width: `${claimed}%` }}
            />
          </div>
        </div>

        {/* Bloc Prix Spécial Live vs Normal */}
        <div className="pt-1">
          {isLocked ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-slate-400 blur-sm select-none">
                  45 000 FCFA
                </span>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Prix Secret
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Tarif révélé en direct par le présentateur
              </span>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-2.5">
                {/* Prix Spécial Live en 24px Or #F59E0B */}
                <span className="text-2xl font-black text-[#F59E0B] tracking-tight tabular-nums">
                  {formatCFA(product.price)}
                </span>
              </div>
              {product.originalPrice && product.originalPrice > product.price && (
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span>Prix après le live :</span>
                  <span className="line-through text-slate-400 tabular-nums">
                    {formatCFA(product.originalPrice)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================= BOUTONS D'ACTION (Tunnel optionnel + Panier) ================= */}
        <div className={`pt-2 grid gap-2 ${hasExplicitProductFunnel(product) ? 'grid-cols-2' : 'grid-cols-1'}`}>
          
          {hasExplicitProductFunnel(product) && (
            <button
              type="button"
              onClick={handleOpenTunnel}
              className="py-2.5 px-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white live-btn-glass flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Ouvrir le tunnel de vente dépliable"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span className="truncate">Voir Tunnel</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isLocked}
            className={`py-2.5 px-2 rounded-xl text-xs font-extrabold text-white flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md ${
              isLocked 
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed opacity-60'
                : 'live-btn-accent shadow-indigo-600/30'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="truncate">{hasExplicitProductFunnel(product) ? 'Panier' : 'Ajouter au panier'}</span>
          </button>

        </div>

      </div>
    </div>
  );
};
