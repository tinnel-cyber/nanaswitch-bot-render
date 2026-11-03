import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Edit2, 
  Zap, 
  Share2, 
  Trash2, 
  Package, 
  Check, 
  Link as LinkIcon, 
  Sparkles 
} from 'lucide-react';
import { StoreProductItem } from './types';
import { buildPublicShopUrl } from '../../../../config/domains';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface QuickCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  products: StoreProductItem[];
  storeSlug?: string;
  storeId?: string;
  onEditProduct: (product: StoreProductItem, options?: { initialCard?: number }) => void;
  onPreviewFunnel?: (product: StoreProductItem) => void;
  onDeleteProduct?: (productId: string, productName: string) => void;
  onOpenAddProduct: () => void;
  onToast?: (message: string) => void;
}

export const QuickCatalogDrawer: React.FC<QuickCatalogDrawerProps> = ({
  isOpen,
  onClose,
  products = [],
  storeSlug = 'boutique',
  onEditProduct,
  onPreviewFunnel,
  onDeleteProduct,
  onOpenAddProduct,
  onToast
}) => {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, search]);

  if (!isOpen) return null;

  const handleCopyProductLink = async (p: StoreProductItem) => {
    playTapBeep();
    const cleanSlug = storeSlug.trim().replace(/^store-/, '');
    const funnelId = p.linkedFunnelId || (p as any).funnelConfig?.slug;
    const url = buildPublicShopUrl(cleanSlug, {
      productSlug: p.id,
      funnelSlug: funnelId || undefined
    });

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedId(p.id);
      playValidationBeep();
      if (onToast) {
        onToast('🎯 Lien Publicitaire copié avec succès !');
      }
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      console.warn('[QuickCatalogDrawer] Copy link failed:', err);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[1100] flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md h-full bg-white text-slate-900 shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête : Bleu Royal & Blanc */}
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between bg-blue-600 text-white shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white border border-white/20">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight leading-tight">
                Mes Produits ({products.length})
              </h2>
              <p className="text-[11px] text-blue-100">
                Gestion express du catalogue Studio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="Fermer le tiroir"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barre de Recherche Instantanée */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou catégorie..."
              className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
            />
          </div>
        </div>

        {/* Liste des produits */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Package className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-xs font-medium">Aucun produit ne correspond à votre recherche.</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const hasActiveFunnel = Boolean(product.linkedFunnelId || (product as any).funnelConfig?.enabled);
              const isCopied = copiedId === product.id;

              return (
                <div 
                  key={product.id}
                  className="p-2.5 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-between gap-3 group"
                >
                  {/* Miniature Produit */}
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative">
                    <img
                      src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    {hasActiveFunnel && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" title="Tunnel actif" />
                    )}
                  </div>

                  {/* Infos Produit */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-slate-900 truncate">
                        {product.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-black text-blue-600">
                        {formatCFA(product.price)}
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-[10px] text-slate-400 line-through">
                          {formatCFA(product.originalPrice)}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium truncate max-w-[90px]">
                        {product.category || 'Général'}
                      </span>
                    </div>

                    {/* Badge Tunnel */}
                    <div className="mt-1 flex items-center gap-1.5">
                      {hasActiveFunnel ? (
                        <button
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            if (onPreviewFunnel) {
                              onPreviewFunnel(product);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md hover:bg-emerald-100 transition cursor-pointer"
                        >
                          <Zap className="w-2.5 h-2.5 fill-emerald-600" />
                          <span>Tunnel Actif</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            onEditProduct(product, { initialCard: 2 });
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 px-1.5 py-0.5 rounded-md transition cursor-pointer"
                        >
                          <LinkIcon className="w-2.5 h-2.5" />
                          <span>+ Lier Tunnel</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Boutons d'Action Rapide */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Modifier */}
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        onEditProduct(product);
                      }}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition cursor-pointer"
                      title="Modifier ce produit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Copier Lien Pub */}
                    <button
                      type="button"
                      onClick={() => handleCopyProductLink(product)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50 border-slate-200'
                      }`}
                      title="Copier le lien publicitaire TikTok/Facebook"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Share2 className="w-3.5 h-3.5" />}
                    </button>

                    {/* Supprimer */}
                    {onDeleteProduct && (
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          onDeleteProduct(product.id, product.name);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
                        title="Supprimer ce produit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pied de Page Sticky : Bouton Nouveau Produit */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onOpenAddProduct();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un nouveau produit</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickCatalogDrawer;
