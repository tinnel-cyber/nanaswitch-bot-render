import React, { useState, useCallback } from 'react';
import { 
  X, ShoppingBag, PhoneCall, Check, Tag, ShieldCheck, 
  Truck, AlertCircle, Plus, Minus, Share2, Edit3,
  Trash2, Copy, CreditCard, Clock, Zap, MessageCircle, Eye,
  Layers, Rocket
} from 'lucide-react';
import { StoreProductItem } from './types';
import { StoreSubscription, StoreUser } from '../../types';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import { trackPixelConversion } from '../../utils/pixelTracking';
import { isLimitReached, triggerLimitReachedUpsell, getStoredFunnelsCount, isFreePlan } from '../../utils/planFeatures';
import { ProductRichDescription } from './RichTextEditor';
import { BuyerLiveCallButton } from '../live/BuyerLiveCallButton';
import { FunnelBuilder } from './FunnelBuilder';
import { UltimateFunnelBuilder } from './UltimateFunnelBuilder';
import { Interactive3dLoupeImage } from './Interactive3dLoupeImage';
import {
  saveFunnelConfig,
  registerSubdomainInFirebase,
  saveProductModularFunnelRTDB,
  saveProductUltimateFunnelRTDB
} from '../../services/omniFunnelService';
import { triggerOpenFunnel } from '../../themes/themeUtils';
import { buildPublicShopUrl } from '../../config/domains';

interface ProductDetailModalProps {
  product: StoreProductItem | null;
  storeName: string;
  wPhone: string;
  onClose: () => void;
  onAddToCart?: (product: StoreProductItem, quantity: number) => void;
  onDirectCheckout?: (product: StoreProductItem, quantity: number) => void;
  onEditProduct?: (product: StoreProductItem) => void;
  onRemoveProduct?: (productId: string, productName: string) => void;
  onShareProduct?: (product: StoreProductItem) => void;
  onCreateFunnel?: (product: StoreProductItem) => void;
  onOpenTunnel?: (product: StoreProductItem) => void;
  isPublicView?: boolean;
  merchantId?: string;
  subscription?: StoreSubscription | null;
  currentUser?: StoreUser | null;
  theme?: 'light' | 'dark' | 'blue';
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  storeName,
  wPhone,
  onClose,
  onAddToCart,
  onDirectCheckout,
  onEditProduct,
  onRemoveProduct,
  onShareProduct,
  onCreateFunnel,
  onOpenTunnel,
  isPublicView = false,
  merchantId = 'store-konkobo-telecom',
  subscription,
  currentUser,
  theme = 'dark'
}) => {
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [showFunnelBuilder, setShowFunnelBuilder] = useState(false);
  const [showUltimateFunnelBuilder, setShowUltimateFunnelBuilder] = useState(false);
  const [copyFunnelToast, setCopyFunnelToast] = useState(false);

  const handleCopyFunnelLink = async () => {
    if (!product?.linkedFunnelId) return;
    playTapBeep();
    const storeSlug = (merchantId || currentUser?.storeId || 'boutique').replace(/^store-/, '');
    const urlToCopy = buildPublicShopUrl(storeSlug, { funnelSlugOrId: product.linkedFunnelId });


    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(urlToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = urlToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      playValidationBeep();
      setCopyFunnelToast(true);
      setTimeout(() => setCopyFunnelToast(false), 2500);
    } catch (err) {
      console.warn("Erreur copie lien tunnel :", err);
    }
  };

  const handleOpenLinkedTunnel = () => {
    if (!product) return;
    const targetId = product.linkedFunnelId || product.id;
    playTapBeep();
    onClose();
    if (onOpenTunnel) {
      onOpenTunnel(product);
    } else {
      triggerOpenFunnel(targetId, product.name, product);
    }
  };

  if (!product) return null;

  const cleanPhone = (wPhone || '').replace(/[^0-9]/g, '');
  const totalAmount = product.price * quantity;

  // Lien direct Wameet Direct avec message commercial complet
  const wMsg = encodeURIComponent(
    `Bonjour *${storeName}* ! 🛍️\n\n` +
    `Je souhaite commander l'article suivant :\n` +
    `• *Produit :* ${product.name}\n` +
    `• *Quantité :* ${quantity}\n` +
    `• *Prix unitaire :* ${formatCFA(product.price)}\n` +
    `• *Total à payer :* *${formatCFA(totalAmount)}*\n\n` +
    `Pouvez-vous confirmer la disponibilité et le délai de livraison ? Merci !`
  );
  const wUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${wMsg}`;

  const handleAdd = () => {
    playValidationBeep();
    if (onAddToCart) {
      onAddToCart(product, quantity);
    }
    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-card border border-theme text-body rounded-3xl overflow-hidden shadow-2xl relative max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Actions Rapides en haut à droite : Partager, Retirer, Fermer (Min 44x44 Touch Target) */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5">
          {onShareProduct && (
            <button
              type="button"
              onClick={() => { playTapBeep(); onShareProduct(product); }}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center bg-secondary hover:bg-card-hover text-body border border-theme rounded-full transition cursor-pointer backdrop-blur-sm shadow-md active:scale-95 touch-manipulation"
              title="Partager / Copier le lien du produit"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {!isPublicView && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (onCreateFunnel) onCreateFunnel(product);
                else setShowFunnelBuilder(true);
              }}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center bg-secondary hover:bg-card-hover text-amber-500 rounded-full transition cursor-pointer backdrop-blur-sm shadow-md border border-theme active:scale-95 touch-manipulation"
              title="Créer un Funnel de vente ⚡"
            >
              <Zap className="w-4 h-4 fill-amber-500/40 text-amber-500" />
            </button>
          )}

          {!isPublicView && onEditProduct && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onEditProduct(product);
              }}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center bg-secondary hover:bg-card-hover text-amber-500 rounded-full transition cursor-pointer backdrop-blur-sm shadow-md border border-theme active:scale-95 touch-manipulation"
              title="Modifier ce produit"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}

          {!isPublicView && onRemoveProduct && (
            <button
              type="button"
              onClick={() => {
                onRemoveProduct(product.id, product.name);
                onClose();
              }}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center bg-secondary hover:bg-rose-500/20 text-rose-500 rounded-full transition cursor-pointer backdrop-blur-sm shadow-md border border-rose-500/30 active:scale-95 touch-manipulation"
              title="Retirer ce produit de la boutique"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => { playTapBeep(); onClose(); }}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center bg-secondary hover:bg-card-hover text-muted hover:text-body border border-theme rounded-full transition cursor-pointer backdrop-blur-sm shadow-md active:scale-95 touch-manipulation"
            title="Fermer"
            aria-label="Fermer la fiche produit"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Zone Scrollable Complète Produit (Image + Détails + Caractéristiques) */}
        <div 
          className="flex-1 overflow-y-auto overscroll-y-contain scrollbar-none"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {/* Zone Image Produit avec Badge Promo & Loupe 3D Interactive Invisible */}
          {product.image ? (
            <Interactive3dLoupeImage
              src={product.image}
              alt={product.name}
              containerClassName="w-full h-44 sm:h-52 bg-secondary border-b border-theme flex items-center justify-center shrink-0"
              className="w-full h-full object-cover"
              borderRadius="0"
              maxScale={1.42}
              maxRotate={15}
            >
              {/* Badge Promo / Nouveauté */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
                {product.badge && (
                  <span className="bg-amber-500 text-slate-950 text-[10.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
                    {product.badge}
                  </span>
                )}
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="bg-rose-600 text-white text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
                    -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                  </span>
                )}
              </div>

              {/* Badge Stock en direct */}
              <div className="absolute bottom-2.5 right-2.5 bg-card/95 border border-theme text-emerald-600 dark:text-emerald-400 backdrop-blur-sm text-[9.5px] font-bold px-2 py-0.5 rounded-xl flex items-center gap-1.5 shadow-md z-10 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{product.stock > 0 ? `En stock (${product.stock} dispo)` : 'Sur commande'}</span>
              </div>
            </Interactive3dLoupeImage>
          ) : (
            <div className="relative h-44 sm:h-52 bg-secondary border-b border-theme flex items-center justify-center overflow-hidden shrink-0">
              <div className="flex flex-col items-center justify-center p-6 text-center text-muted">
                <ShoppingBag className="w-16 h-16 text-indigo-500/40 mb-2" />
                <span className="text-xs font-bold text-muted uppercase tracking-wider">{product.category}</span>
              </div>
            </div>
          )}

          {/* Corps de la Fiche Produit */}
          <div className="p-3.5 sm:p-4 space-y-3">
            {/* Bannière Vente Flash Exclusive (Hauteur agrandie, padding respirant, jamais tronquée) */}
            {(product.isFlashSale || (product.originalPrice && product.originalPrice > product.price)) && (
              <div className="p-3 sm:p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between shadow-sm min-h-[60px]">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-rose-500 uppercase tracking-wider flex items-center gap-1.5 leading-normal">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      <span>Vente Flash Exclusive</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="bg-rose-600 text-white text-[9.5px] px-1.5 py-0.2 rounded-md font-black shadow-xs">
                          -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted font-medium leading-relaxed m-0">
                      Stock physique limité • Expédié en priorité
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-black/60 text-amber-400 px-2.5 py-1.5 rounded-xl border border-rose-500/30 font-mono font-black text-xs shrink-0 shadow-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>02:45:18</span>
                </div>
              </div>
            )}

            {/* Titre, Preuve Sociale & Prix */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs text-indigo-500 font-bold uppercase tracking-wider">
                  {product.category}
                </span>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  ★ Choix Recommandé
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-body leading-snug">
                {product.name}
              </h2>

              {/* Preuve sociale & avis clients */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
                <div className="flex items-center text-amber-400 font-black gap-0.5">
                  <span>★★★★★</span>
                  <span className="ml-1 font-bold text-body">
                    {product.rating || 4.8}
                  </span>
                </div>
                <span className="text-muted">•</span>
                <span className="font-medium text-muted">
                  ({product.reviewCount || 142} avis vérifiés)
                </span>
                <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black text-[10.5px] px-2 py-0.5 rounded-full border border-emerald-500/20">
                  +{product.salesCount || 120} vendus
                </span>
              </div>

              {/* Prix Principal + Ancien Prix Barré + Badge Économie */}
              <div className="flex items-baseline gap-2.5 mt-2.5 flex-wrap">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatCFA(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <>
                    <span className="text-sm font-semibold text-muted line-through">
                      {formatCFA(product.originalPrice)}
                    </span>
                    <span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-black px-2 py-0.5 rounded-md border border-rose-500/20">
                      Économisez {formatCFA(product.originalPrice - product.price)}
                    </span>
                  </>
                )}
              </div>

              {/* Points Clés Techniques (keyFeatures) */}
              {product.keyFeatures && product.keyFeatures.length > 0 && (
                <div className="mt-2.5 p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl space-y-1">
                  {product.keyFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] shrink-0 font-bold">✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Nuancier de Couleurs */}
              {product.colorSwatches && product.colorSwatches.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  <span className="text-[11px] font-bold text-muted block">Variantes de couleur :</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {product.colorSwatches.map((swatch, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary border border-theme text-xs font-semibold text-body">
                        <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: swatch.hex }} />
                        <span>{swatch.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tailles / Contenances */}
              {product.sizeOptions && product.sizeOptions.length > 0 && (
                <div className="mt-2 space-y-1">
                  <span className="text-[11px] font-bold text-muted block">Tailles / Formats :</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {product.sizeOptions.map((sz, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-secondary border border-theme text-xs font-bold text-body">
                        {sz}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Zone Réassurance E-Commerce */}
            <div className="p-3.5 rounded-2xl bg-secondary border border-theme grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="leading-tight">
                  <div className="font-bold text-[11px] text-body">Livraison express</div>
                  <div className="text-[10px] text-muted">Expédié en 30 min</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="leading-tight">
                  <div className="font-bold text-[11px] text-body">Paiement sécurisé</div>
                  <div className="text-[10px] text-muted">Nanasore Pay / COD</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div className="leading-tight">
                  <div className="font-bold text-[11px] text-body">100% Satisfait</div>
                  <div className="text-[10px] text-muted">Garantie échange</div>
                </div>
              </div>
            </div>

            {/* Description Riche & Structurée WYSIWYG */}
            <div className="bg-secondary border border-theme rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-body flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Description &amp; Caractéristiques</span>
                </h4>
                <div className="flex items-center gap-1.5">
                  {!isPublicView && (
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        const funnelsCount = getStoredFunnelsCount(merchantId);
                        if (isLimitReached(subscription, 'FUNNELS', funnelsCount)) {
                          triggerLimitReachedUpsell('FUNNELS', funnelsCount, 1, 'tunnel de vente');
                          return;
                        }
                        if (onCreateFunnel) onCreateFunnel(product);
                        else setShowFunnelBuilder(true);
                      }}
                      className="text-[10.5px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 transition cursor-pointer shadow-sm active:scale-95 border bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border-amber-500/30"
                      title="Créer un Funnel de conversion ⚡"
                    >
                      <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>Funnel Builder</span>
                    </button>
                  )}
                  {!isPublicView && (
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        const funnelsCount = getStoredFunnelsCount(merchantId);
                        if (isLimitReached(subscription, 'FUNNELS', funnelsCount)) {
                          triggerLimitReachedUpsell('FUNNELS', funnelsCount, 1, 'tunnel de vente');
                          return;
                        }
                        setShowUltimateFunnelBuilder(true);
                      }}
                      className="text-[10.5px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 transition cursor-pointer shadow-sm active:scale-95 border bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300 border-indigo-500/30"
                      title="Ultimate Funnel Builder Drag & Drop 🚀"
                    >
                      <Layers className="w-3 h-3 text-indigo-500" />
                      <span>Ultimate Builder</span>
                    </button>
                  )}
                  {!isPublicView && onEditProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        onEditProduct(product);
                      }}
                      className="text-[10.5px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 transition cursor-pointer border bg-card hover:bg-card-hover text-body border-theme"
                      title="Modifier l'article et sa description enrichie"
                    >
                      <Edit3 className="w-3 h-3 text-indigo-400" />
                      <span>Modifier</span>
                    </button>
                  )}
                  {Boolean(product.linkedFunnelId || product.hasModularFunnel !== false) && (
                    <button
                      type="button"
                      onClick={handleOpenLinkedTunnel}
                      className="text-[10.5px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 transition cursor-pointer border bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-600 dark:text-indigo-300 border-indigo-500/40 active:scale-95 shadow-xs"
                      title="Ouvrir le tunnel de vente 12 blocs dans le tiroir dépliable"
                    >
                      <Eye className="w-3 h-3 text-indigo-400" />
                      <span>👁️ Voir le tunnel (12 blocs)</span>
                    </button>
                  )}
                  {Boolean(product.linkedFunnelId) && (
                    <button
                      type="button"
                      onClick={handleCopyFunnelLink}
                      className="text-[10.5px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 transition cursor-pointer border bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300 border-indigo-500/30 active:scale-95 shadow-xs"
                      title="Copier le lien direct du Tunnel (?f=...) pour vos campagnes F et Wameet"
                    >
                      <Copy className="w-3 h-3 text-indigo-400" />
                      <span>{copyFunnelToast ? '✓ Copié !' : '📋 Copier lien'}</span>
                    </button>
                  )}
                </div>
              </div>

              <ProductRichDescription 
                content={product.richDescription || product.description} 
                storeName={storeName}
                theme={theme}
              />
            </div>

            {/* Sélecteur de Quantité */}
            <div className="flex items-center justify-between bg-secondary border border-theme rounded-2xl p-3">
              <div>
                <span className="text-xs font-bold text-body">Quantité sélectionnée :</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold ml-2">
                  {product.stock > 0 ? `En stock (${product.stock} dispo)` : 'Sur commande'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setQuantity(q => Math.max(1, q - 1)); }}
                  className="w-8 h-8 rounded-xl bg-card hover:bg-card-hover text-body border border-theme flex items-center justify-center font-bold transition cursor-pointer shadow-xs active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-black w-6 text-center text-body">{quantity}</span>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setQuantity(q => q + 1); }}
                  className="w-8 h-8 rounded-xl bg-card hover:bg-card-hover text-body border border-theme flex items-center justify-center font-bold transition cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de Page d'Action Fixe en bas */}
        <div className="p-4 bg-card border-t border-theme space-y-2.5 shrink-0">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-muted">Total commande :</span>
            <div className="text-right">
              {quantity > 1 && (
                <span className="text-[11px] text-muted font-semibold mr-1.5">
                  {quantity} × {formatCFA(product.price)} =
                </span>
              )}
              <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">{formatCFA(totalAmount)}</span>
            </div>
          </div>

          {/* Bouton Live Shopping / Voir en Direct (WebRTC Daily.co) */}
          <div className="w-full my-1">
            <BuyerLiveCallButton
              productId={product.id}
              productName={product.name}
              sellerId={merchantId}
              subscription={subscription}
              buttonText="📹 Voir en Direct • Live Shopping"
              className="w-full text-xs font-black py-2.5 rounded-xl shadow-md bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white flex items-center justify-center gap-2"
            />
          </div>

          {/* Bouton Prominent : Voir le tunnel de vente interactif (Tiroir Dépliable - Priorité 1 : 12 Blocs Modulaire) */}
          {Boolean(product.linkedFunnelId || product.hasModularFunnel !== false || product.useUltimateFunnel) && (
            <button
              type="button"
              onClick={handleOpenLinkedTunnel}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer transition transform"
              title="Ouvrir le tunnel de vente interactif (12 Blocs par défaut) dans le tiroir dépliable"
            >
              <Rocket className="w-4 h-4 text-white" />
              <span>Ouvrir le tunnel de vente (12 Blocs)</span>
            </button>
          )}

          {/* Bouton Copier le lien direct du Tunnel (Campagnes F / Wameet pour commerçant) */}
          {Boolean(product.linkedFunnelId) && !isPublicView && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={handleCopyFunnelLink}
                className="w-full py-2 px-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 active:scale-95 text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                title="Copier le lien direct avec ?f=... pour les campagnes F Ads et Wameet"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                <span>📋 Copier le lien direct du Tunnel (Campagnes F / Wameet)</span>
              </button>

              {copyFunnelToast && (
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-1.5 animate-in fade-in">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Lien du tunnel copié !</span>
                </div>
              )}
            </div>
          )}

          {/* 1. Bouton Principal Prominent : Acheter maintenant */}
          <button
            type="button"
            onClick={() => {
              playValidationBeep();
              if (onDirectCheckout) {
                onDirectCheckout(product, quantity);
              }
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 active:scale-[0.99] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 cursor-pointer transition transform"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>Acheter maintenant • {formatCFA(totalAmount)}</span>
          </button>

          {/* 2. Ligne Secondaire : Ajouter au panier + Wameet Direct sur une seule ligne */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="py-2.5 px-3 rounded-xl bg-secondary hover:bg-card-hover text-body border border-theme active:scale-95 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              {addedSuccess ? <Check className="w-4 h-4 text-emerald-500" /> : <ShoppingBag className="w-4 h-4 text-amber-500" />}
              <span>{addedSuccess ? 'Ajouté !' : 'Ajouter au panier'}</span>
            </button>

            <a
              href={wUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                playTapBeep();
                trackPixelConversion('ContactW', {
                  storeName,
                  productName: product.name,
                  value: totalAmount
                });
              }}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-xs font-black text-white flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Wameet Direct</span>
            </a>
          </div>
        </div>
      </div>

      {/* Constructeur de Tunnel de Vente FunnelBuilder (Priorité 1 : 12 Blocs Modulaire) */}
      {showFunnelBuilder && (
        <FunnelBuilder
          product={product}
          isOpen={showFunnelBuilder}
          onClose={() => setShowFunnelBuilder(false)}
          onSave={async (data: any) => {
            try {
              const payload = {
                ...data,
                productId: product.id,
                funnelType: 'modular',
                funnelStudio: 'nana_studio_3',
                linkPrefix: 't'
              };
              if (payload.subdomain) {
                await registerSubdomainInFirebase(payload.subdomain, payload.title, payload);
              }
              await saveFunnelConfig(payload);
              await saveProductModularFunnelRTDB(product.id, payload, merchantId);
            } catch (e) {
              console.warn('Erreur saveFunnelConfig:', e);
            }
          }}
        />
      )}

      {/* Constructeur de Tunnel de Vente Drag & Drop UltimateFunnelBuilder (Priorité 2 : Stockage séparé /ultimate_funnel sans écraser /modular_funnel) */}
      {showUltimateFunnelBuilder && (
        <UltimateFunnelBuilder
          initialData={product}
          isOpen={showUltimateFunnelBuilder}
          onClose={() => setShowUltimateFunnelBuilder(false)}
          onSave={async (data: any) => {
            try {
              const payload = {
                ...data,
                productId: product.id,
                funnelType: 'ultimate',
                funnelStudio: 'ultimate',
                linkPrefix: 'f'
              };
              if (payload.subdomain) {
                await registerSubdomainInFirebase(payload.subdomain, payload.title, payload);
              }
              await saveFunnelConfig(payload);
              await saveProductUltimateFunnelRTDB(product.id, payload, merchantId);
            } catch (e) {
              console.warn('Erreur saveFunnelConfig ultimate:', e);
            }
          }}
        />
      )}
    </div>
  );
};
