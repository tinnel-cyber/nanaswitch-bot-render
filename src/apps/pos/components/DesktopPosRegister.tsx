import React, { useState, useMemo, useCallback } from 'react';
import {
  CartItem,
  InventoryProduct,
  DebtCustomer,
  StoreUser,
  SellerUser,
  CasierSession
} from '../../../types';
import { formatCFA, playTapBeep, playValidationBeep, playCancelSound } from '../../../utils/audio';
import { PosSearchBar } from './PosSearchBar';
import { FastSaleGrid } from './FastSaleGrid';
import { QuickCustomerDebtRow } from '../../../modules/debts/components/QuickCustomerDebtRow';
import { FAST_SALE_PRODUCTS } from '../../../data/initialData';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Banknote,
  UserCheck,
  Printer,
  Bot,
  Package,
  Zap,
  ArrowRight,
  Receipt,
  FileDown,
  ZoomIn,
  Lock,
  Video,
  Image as ImageIcon
} from 'lucide-react';
import { ImageLightboxModal } from '../../../components/ImageLightboxModal';

interface DesktopPosRegisterProps {
  cart: CartItem[];
  total: number;
  itemCount: number;
  inventory: InventoryProduct[];
  customers: DebtCustomer[];
  activeSeller?: SellerUser | null;
  currentUser?: StoreUser | null;
  isCashierMode?: boolean;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCancelCart: () => void;
  onSelectProduct: (product: InventoryProduct) => void;
  onSelectPresetAmount: (amount: number) => void;
  onQuickAssignDebt: (customer: DebtCustomer) => void;
  onOpenCashPayment: () => void;
  onQuickCashCheckout: () => void;
  onOpenCreditModal: () => void;
  onOpenDebtBook: () => void;
  onOpenSelfieScanner: () => void;
  isSelfieScannerOpen: boolean;
  onOpenAiAdvisor: () => void;
  onOpenPrintReceipt?: () => void;
  onDownloadPdfReceipt?: () => void;
  onOpenSellerSwitch?: () => void;
  onAddVoiceItems?: () => void;
  onAddRecognizedItems?: (items: CartItem[]) => void;
  casierSession?: CasierSession;
  onOpenMarketingAi?: (product?: any) => void;
}

export const DesktopPosRegister: React.FC<DesktopPosRegisterProps> = ({
  cart,
  total,
  itemCount,
  inventory,
  customers,
  activeSeller,
  currentUser,
  isCashierMode,
  casierSession,
  onOpenMarketingAi,
  onUpdateQuantity,
  onRemoveItem,
  onCancelCart,
  onSelectProduct,
  onSelectPresetAmount,
  onQuickAssignDebt,
  onOpenCashPayment,
  onQuickCashCheckout,
  onOpenCreditModal,
  onOpenSelfieScanner,
  isSelfieScannerOpen,
  onOpenAiAdvisor,
  onOpenPrintReceipt,
  onDownloadPdfReceipt,
  onOpenSellerSwitch,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUS');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt?: string; title?: string } | null>(null);

  // Liste des produits disponibles (inventaire ou fallback vente rapide)
  const productCatalog: InventoryProduct[] = useMemo(() => {
    if (inventory && inventory.length > 0) {
      return inventory;
    }
    return (FAST_SALE_PRODUCTS || []).map((f: any) => ({
      id: f.id,
      storeId: '',
      name: f.name,
      category: f.category || 'Général',
      sellingPrice: f.price,
      costPrice: Math.round(f.price * 0.75),
      stock: 999,
      unit: f.unit || 'pièce',
      photoUrl: f.photoUrl || f.imageUrl || '',
      imageUrl: f.photoUrl || f.imageUrl || '',
      keywords: [f.name.toLowerCase()],
    }));
  }, [inventory]);

  // Liste des catégories uniques
  const categories = useMemo(() => {
    const cats = new Set<string>();
    productCatalog.forEach((p) => {
      if (p.category && p.category.trim()) {
        cats.add(p.category.trim());
      }
    });
    return Array.from(cats);
  }, [productCatalog]);

  // Filtrage du catalogue par catégorie
  const filteredProducts = useMemo(() => {
    return productCatalog.filter((prod) => {
      const matchCat =
        selectedCategory === 'TOUS' ||
        (prod.category && prod.category.toLowerCase() === selectedCategory.toLowerCase());
      return matchCat;
    });
  }, [productCatalog, selectedCategory]);

  const handleCardProductAdd = (prod: InventoryProduct) => {
    playValidationBeep();
    onSelectProduct(prod);
  };

  return (
    <div className="w-full h-full flex flex-row overflow-hidden select-none bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* ========================================================= */}
      {/* VOLET GAUCHE : CATALOGUE & RECHERCHE (65% DE LA SURFACE) */}
      {/* ========================================================= */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-slate-100/60 dark:bg-slate-900/40 border-r border-slate-200 dark:border-slate-800/80 transition-colors">
        {/* 1. Barre supérieure de recherche & scanner USB */}
        <div className="shrink-0 bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/90 p-2 sm:p-3 space-y-2">
          <PosSearchBar
            inventory={inventory}
            onSelectProduct={onSelectProduct}
            onOpenSelfieScanner={onOpenSelfieScanner}
            isSelfieScannerOpen={isSelfieScannerOpen}
          />

          {/* Raccourcis clients réguliers (Crédit express) */}
          <div className="pt-1 border-t border-slate-100 dark:border-slate-800/60">
            <QuickCustomerDebtRow
              customers={customers}
              cartTotal={total}
              cartItemCount={itemCount}
              onQuickAssignDebt={onQuickAssignDebt}
            />
          </div>

          {/* Raccourcis montants directs / coupures */}
          <div>
            <FastSaleGrid onSelectPresetAmount={onSelectPresetAmount} />
          </div>

          {/* Filtres de catégories horizontaux défilants */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('TOUS')}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'TOUS'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700/60'
              }`}
            >
              Tous ({productCatalog.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700/60'
                }`}
              >
                {cat}
              </button>
            ))}

            {casierSession && (
              <span 
                className="ml-auto px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-500/40 dark:text-emerald-300 text-[10px] font-mono font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
                title={`Session active : ${casierSession.sessionId} • ${casierSession.deviceName || 'Terminal'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                <span>{casierSession.casierNumber}</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. Grille de produits scrollable indépendamment (65%) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar" style={{ overscrollBehaviorY: 'contain' }}>
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
              <Package className="w-10 h-10 text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300 text-sm">Aucun produit ne correspond à ce filtre</p>
              <button
                type="button"
                onClick={() => setSelectedCategory('TOUS')}
                className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-semibold border border-slate-700 cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((prod) => {
                const isOutOfStock = typeof prod.stock === 'number' && prod.stock <= 0;
                const isLowStock = typeof prod.stock === 'number' && prod.stock > 0 && prod.stock <= 5;

                return (
                  <div
                    key={prod.id}
                    id={`pos-card-${prod.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCardProductAdd(prod)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleCardProductAdd(prod);
                      }
                    }}
                    className={`bg-white hover:bg-slate-50 border rounded-2xl p-2.5 flex flex-col justify-between transition-all active:scale-[0.97] cursor-pointer shadow-xs group select-none relative dark:bg-slate-800/80 dark:hover:bg-slate-800 ${
                      isOutOfStock
                        ? 'border-rose-300 dark:border-rose-500/30 opacity-75'
                        : isLowStock
                        ? 'border-amber-300 dark:border-amber-500/40 hover:border-amber-500 dark:hover:border-amber-400'
                        : 'border-slate-200 dark:border-slate-700/70 hover:border-blue-500/50 hover:shadow-blue-500/10'
                    }`}
                    style={{ touchAction: 'manipulation' }}
                    title={`Ajouter 1 ${prod.name} (${formatCFA(prod.sellingPrice)})`}
                  >
                    {/* Vignette ou Photo */}
                    <div className="w-full h-24 sm:h-28 rounded-xl bg-slate-100 dark:bg-slate-900 object-cover flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700/60 relative mb-2 group-hover:border-blue-400/40 transition-colors">
                      {(() => {
                        const productImg = prod.photoUrl || (prod as any).imageUrl || (prod as any).image;
                        return productImg ? (
                          <>
                            <img
                              src={productImg}
                              alt={prod.name}
                              loading="lazy"
                              crossOrigin="anonymous"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                                const fallbackEl = e.currentTarget.parentElement?.querySelector('.pos-img-fallback');
                                if (fallbackEl) (fallbackEl as HTMLElement).style.display = 'flex';
                              }}
                            />
                            <div className="pos-img-fallback hidden text-2xl font-black text-blue-600/80 dark:text-blue-400/80">
                              {prod.name.charAt(0).toUpperCase()}
                            </div>
                            {/* Bouton Loupe / Agrandisseur interactif */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                playTapBeep();
                                setLightboxImage({
                                  url: productImg,
                                  alt: prod.name,
                                  title: `${prod.name} • ${formatCFA(prod.sellingPrice)}`,
                                });
                              }}
                              className="absolute bottom-1.5 left-1.5 p-1 rounded-lg bg-white/90 hover:bg-blue-600 text-slate-700 hover:text-white border border-slate-200 backdrop-blur-xs transition-all shadow-xs z-10 cursor-pointer active:scale-90 dark:bg-slate-900/85 dark:text-slate-300 dark:hover:text-white dark:border-slate-700/80"
                              title="Agrandir et inspecter l'image"
                              aria-label="Inspecter l'image"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <div className="text-2xl font-black text-blue-600/80 dark:text-blue-400/80">
                            {prod.name.charAt(0).toUpperCase()}
                          </div>
                        );
                      })()}

                      {/* Bouton Créer Image/Vidéo Pub Studio IA Interne */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          playTapBeep();
                          const productPayload = {
                            name: prod.name,
                            features: `Prix: ${formatCFA(prod.sellingPrice || 0)}${prod.category ? ` • Catégorie: ${prod.category}` : ''} • Publicité commerciale qualité studio 4K`,
                            price: prod.sellingPrice,
                            initialMode: 'image' as const
                          };
                          if (onOpenMarketingAi) {
                            onOpenMarketingAi(productPayload);
                          } else if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('nana_open_marketing_ai', { detail: productPayload }));
                          }
                        }}
                        className={`absolute bottom-1.5 ${prod.photoUrl ? 'left-8' : 'left-1.5'} p-1 rounded-lg bg-white/90 hover:bg-violet-600 text-violet-700 hover:text-white border border-violet-200 backdrop-blur-xs transition-all shadow-xs z-10 cursor-pointer active:scale-90 dark:bg-slate-900/85 dark:text-violet-300 dark:hover:text-white dark:border-slate-700/80 flex items-center gap-0.5`}
                        title={`Créer une Image ou Vidéo Pub IA pour ${prod.name} dans le Studio IA interne`}
                        aria-label="Créer Image/Vidéo Pub Studio IA"
                      >
                        <ImageIcon className="w-3 h-3 text-fuchsia-500 dark:text-fuchsia-400" />
                        <Video className="w-3 h-3" />
                      </button>

                      {/* Badge de Stock */}
                      <span
                        className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold border ${
                          isOutOfStock
                            ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/90 dark:text-rose-300 dark:border-rose-500/50'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/90 dark:text-amber-300 dark:border-amber-500/50'
                            : 'bg-white text-emerald-700 border-emerald-300 dark:bg-slate-900/90 dark:text-emerald-300 dark:border-emerald-500/40 shadow-xs'
                        }`}
                      >
                        {isOutOfStock ? 'Épuisé' : isLowStock ? `Bas (${prod.stock})` : `${prod.stock} dispo`}
                      </span>
                    </div>

                    {/* Titre & Prix */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-200 transition-colors">
                          {prod.name}
                        </h4>
                        {prod.category && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                            {prod.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                        <span className="text-sm sm:text-base font-black text-amber-700 dark:text-amber-300 font-mono tracking-tight">
                          {formatCFA(prod.sellingPrice)}
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-blue-600/15 group-hover:bg-blue-600 text-blue-600 group-hover:text-white dark:bg-blue-600/30 dark:text-blue-300 flex items-center justify-center transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Bandeau Conseils & Alertes proactif en pied du catalogue */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            playTapBeep();
            onOpenAiAdvisor();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              playTapBeep();
              onOpenAiAdvisor();
            }
          }}
          className="shrink-0 bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 hover:from-indigo-900 hover:to-indigo-900/90 border-t border-indigo-500/30 px-3 py-1.5 flex items-center justify-between text-xs text-indigo-200 cursor-pointer"
          title="Ouvrir les conseils et alertes de stock"
        >
          <div className="flex items-center gap-2 truncate">
            <Bot className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="font-extrabold text-amber-300 shrink-0">Conseils & Alertes :</span>
            <span className="truncate text-slate-300 text-[11px]">
              Conseils proactifs, gestion des ruptures et prédictions de vente en temps réel.
            </span>
          </div>
          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-400/30 flex items-center gap-1 shrink-0">
            Conseils &gt;
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VOLET DROIT : TICKET DE CAISSE STICKY & ENCAISSEMENT (35%) */}
      {/* ========================================================= */}
      <div className="w-[360px] lg:w-[420px] xl:w-[460px] shrink-0 flex flex-col h-full bg-white dark:bg-slate-950/95 border-l border-slate-200 dark:border-slate-800/80 shadow-2xl transition-colors">
        {/* 1. Header du Ticket */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between gap-2">
          <div
            onClick={() => {
              if (onOpenSellerSwitch) {
                playTapBeep();
                onOpenSellerSwitch();
              }
            }}
            className={`flex items-center gap-2 min-w-0 ${
              onOpenSellerSwitch ? 'cursor-pointer hover:opacity-85 transition-opacity' : ''
            }`}
            title="Cliquer pour changer de caissier ou déverrouiller par code PIN"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                <span>Ticket de Caisse</span>
                {itemCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-400/30 text-[10px] font-mono">
                    {itemCount}
                  </span>
                )}
              </h3>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                <span>{activeSeller ? `Caissier : ${activeSeller.name}` : currentUser?.storeName || 'Caisse Principale'}</span>
                {onOpenSellerSwitch && <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold underline">PIN</span>}
              </div>
            </div>
          </div>

          {/* Bouton Vider Panier */}
          {cart.length > 0 && (
            <button
              id="btn-desktop-clear-cart"
              type="button"
              onClick={() => {
                playCancelSound();
                onCancelCart();
              }}
              className="px-2 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-950/80 border border-rose-300 dark:border-rose-500/30 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
              title="Vider tous les articles du ticket"
            >
              <Trash2 className="w-3 h-3" />
              <span>Vider</span>
              {(isCashierMode || activeSeller?.role === 'CAISSIER') && (
                <Lock className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400 shrink-0" />
              )}
            </button>
          )}
        </div>

        {/* 2. Liste Déroulante des Articles du Ticket */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar" style={{ overscrollBehaviorY: 'contain' }}>
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 mb-3">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Ticket en attente</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[240px] mt-1">
                Scannez un code-barres avec la douchette ou cliquez sur un article dans le catalogue à gauche.
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const lineTotal = item.price * item.quantity;
              return (
                <div
                  key={item.id}
                  className="relative z-10 overflow-visible flex items-center justify-between bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/90 dark:hover:bg-slate-850 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800/80 shadow-xs dark:shadow-sm transition-all gap-2"
                >
                  {/* Photo & Nom */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                      {(() => {
                        const itemImg = item.photoUrl || (item as any).imageUrl || (item as any).image;
                        return itemImg ? (
                          <img src={itemImg} alt={item.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                        ) : (
                          <span className="text-xs font-black text-blue-600 dark:text-blue-300">
                            {item.name.charAt(0).toUpperCase()}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 dark:text-white text-xs truncate">{item.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {formatCFA(item.price)}
                        <span className="text-slate-400 dark:text-slate-500">/u</span>
                      </div>
                    </div>
                  </div>

                  {/* Boutons Tactiles Quantité (44x44px conformité tactile foregrounded) */}
                  <div className="flex items-center gap-2 shrink-0 relative z-20 overflow-visible">
                    <div className="flex items-center bg-white dark:bg-slate-950 rounded-xl border-2 border-slate-300 dark:border-slate-700 p-0.5 shadow-xs dark:shadow-md relative z-20 overflow-visible">
                      {/* Bouton [-] */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playTapBeep();
                          if (item.quantity <= 1) {
                            onRemoveItem(item.id);
                          } else {
                            onUpdateQuantity(item.id, -1);
                          }
                        }}
                        className={`min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center rounded-lg active:scale-90 transition-all cursor-pointer select-none relative z-30 ${
                          item.quantity <= 1
                            ? 'bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 dark:bg-rose-950/90 dark:hover:bg-rose-900 dark:text-rose-300 dark:border-rose-500/60 shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-600'
                        }`}
                        style={{ touchAction: 'manipulation' }}
                        title={item.quantity <= 1 ? 'Supprimer cet article' : 'Diminuer (-1)'}
                      >
                        {item.quantity <= 1 ? (
                          <Trash2 className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                        ) : (
                          <Minus className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </button>

                      {/* Quantité centrale */}
                      <span className="min-w-[32px] text-center font-black text-sm text-amber-700 dark:text-amber-300 font-mono select-none px-1 relative z-20">
                        {item.quantity}
                      </span>

                      {/* Bouton [+] */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playTapBeep();
                          onUpdateQuantity(item.id, 1);
                        }}
                        className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black active:scale-90 transition-all cursor-pointer border border-blue-400/50 shadow-md shadow-blue-500/30 select-none relative z-30"
                        style={{ touchAction: 'manipulation' }}
                        title="Augmenter (+1)"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Total Ligne */}
                    <div className="min-w-[70px] text-right font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-300 font-mono">
                      {formatCFA(lineTotal)}
                    </div>

                    {/* Bouton Suppression Directe */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playTapBeep();
                        onRemoveItem(item.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 active:scale-90 transition-all cursor-pointer relative z-20"
                      title="Retirer l'article"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 3. Footer d'Encaissement Sticky (Fixé en bas de l'écran) */}
        <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-200 dark:bg-slate-900/95 dark:border-slate-800/90 space-y-3 transition-colors">
          {/* Ligne Récapitulative */}
          <div className="flex items-baseline justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <span>Total à Payer</span>
              {itemCount > 0 && <span className="text-blue-600 dark:text-blue-400 font-bold">({itemCount} art.)</span>}
            </div>
            <div
              id="desktop-ticket-grand-total"
              className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight drop-shadow-xs dark:drop-shadow-[0_2px_10px_rgba(37,99,235,0.3)]"
            >
              {formatCFA(total)}
            </div>
          </div>

          {/* GROS BOUTON ENCAISSEMENT CASH (Vert Fluo) */}
          <button
            id="btn-desktop-cash-checkout"
            type="button"
            disabled={cart.length === 0}
            onClick={onOpenCashPayment}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all shadow-xl cursor-pointer ${
              cart.length > 0
                ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-600 hover:from-emerald-500 hover:to-green-500 active:scale-[0.98] text-white shadow-emerald-950/60 border border-emerald-400/40'
                : 'bg-slate-200 text-slate-400 border border-slate-300 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700/50 cursor-not-allowed opacity-50'
            }`}
            style={{ touchAction: 'manipulation' }}
            title="Encaisser en espèces / Calculer la monnaie"
          >
            <Banknote className="w-6 h-6" />
            <span>ENCAISSER ESPÈCES ({formatCFA(total)})</span>
            <ArrowRight className="w-5 h-5 ml-auto" />
          </button>

          {/* Actions Secondaires d'Encaissement */}
          <div className="grid grid-cols-4 gap-1.5">
            {/* Vente Rapide (1-Clic) */}
            <button
              id="btn-desktop-quick-cash"
              type="button"
              disabled={cart.length === 0}
              onClick={onQuickCashCheckout}
              className={`py-2 px-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                cart.length > 0
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 active:scale-95 dark:bg-blue-950/80 dark:hover:bg-blue-900 dark:text-blue-300 dark:border-blue-500/40'
                  : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-850 dark:text-slate-600 dark:border-slate-800 cursor-not-allowed opacity-50'
              }`}
              title="Valider la vente directe sans calcul de monnaie"
            >
              <Zap className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span className="truncate">1-Clic</span>
            </button>

            {/* Crédit Client (Cahier de Dettes) */}
            <button
              id="btn-desktop-credit-client"
              type="button"
              onClick={onOpenCreditModal}
              className="py-2 px-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 dark:text-rose-300 dark:border-rose-500/40 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
              title="Noter au Cahier de Dettes"
            >
              <UserCheck className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span className="truncate">Dette</span>
            </button>

            {/* Imprimer Reçu Thermique */}
            {onOpenPrintReceipt && (
              <button
                id="btn-desktop-print-receipt"
                type="button"
                disabled={cart.length === 0}
                onClick={onOpenPrintReceipt}
                className={`py-2 px-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                  cart.length > 0
                    ? 'bg-slate-100 hover:bg-slate-200 text-emerald-700 border-emerald-500/40 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-emerald-300 dark:border-emerald-500/40 active:scale-95'
                    : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-850 dark:text-slate-600 dark:border-slate-800 cursor-not-allowed opacity-50'
                }`}
                title="Imprimer le ticket sur imprimante thermique 58/80mm"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span className="truncate">Ticket</span>
              </button>
            )}

            {/* Télécharger Facture PDF */}
            {onDownloadPdfReceipt && (
              <button
                id="btn-desktop-download-pdf"
                type="button"
                disabled={cart.length === 0}
                onClick={onDownloadPdfReceipt}
                className={`py-2 px-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                  cart.length > 0
                    ? 'bg-slate-100 hover:bg-slate-200 text-indigo-700 border-indigo-500/40 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-indigo-300 dark:border-indigo-500/40 active:scale-95'
                    : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-850 dark:text-slate-600 dark:border-slate-800 cursor-not-allowed opacity-50'
                }`}
                title="Télécharger la facture PDF"
              >
                <FileDown className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span className="truncate">PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Visualiseur Lightbox / Loupe interactif */}
      {lightboxImage && (
        <ImageLightboxModal
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
          imageUrl={lightboxImage.url}
          imageAlt={lightboxImage.alt}
          title={lightboxImage.title}
        />
      )}
    </div>
  );
};

export default DesktopPosRegister;
