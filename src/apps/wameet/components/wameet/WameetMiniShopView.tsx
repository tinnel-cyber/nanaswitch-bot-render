import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Package,
  Zap,
  Store,
  Globe,
  Play,
  MessageCircle,
  ShoppingCart,
  ExternalLink,
  X,
  Sparkles,
  CheckCircle2,
  Search,
  Video,
  Image as ImageIcon,
  Link2,
  User
} from 'lucide-react';
import { StealthYouTubePlayer, extractYouTubeVideoId } from '../../../../components/lms/video/StealthYouTubePlayer';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export type WameetShopTabFilter = 'ALL' | 'PHYSICAL' | 'VIRTUAL' | 'MY_SHOP';

export interface WameetShopProduct {
  id: string;
  category: 'PHYSICAL' | 'VIRTUAL';
  title: string;
  priceFcfa: number;
  compareAtPriceFcfa?: number;
  description: string;
  imageUrl: string;
  videoDemoUrl?: string;
  directCheckoutUrl?: string;
  sellerName: string;
  sellerHandle: string;
  sellerAvatar: string;
  sellerBadge: string;
  isMine?: boolean;
  createdAt: string;
}

export interface WameetMiniShopViewProps {
  currentUserProfile: {
    name: string;
    handle: string;
    avatarUrl: string;
    statusBadge: string;
  };
  highlightedProductFromReelOrChat?: {
    id: string;
    name: string;
    priceFcfa: number;
    imageUrl: string;
  } | null;
  onClearHighlightedProduct?: () => void;
  onNegotiateInW?: (seller: {
    name: string;
    handle: string;
    avatarUrl: string;
    productTitle: string;
    productPriceFcfa: number;
  }) => void;
  onProductPublished?: (product: WameetShopProduct) => void;
}

const STORAGE_KEY_WAMEET_SHOP = 'wameet_mini_shop_products_v2';

const INITIAL_SHOP_PRODUCTS: WameetShopProduct[] = [
  {
    id: 'wshop-prod-1',
    category: 'PHYSICAL',
    title: 'Coffret Beauté Karité Royal Or (Édition Prestige)',
    priceFcfa: 18500,
    compareAtPriceFcfa: 25000,
    description:
      'Beurre de karité pur fouetté à froid aux huiles précieuses + sérum éclat visage. Livraison express en 24h à Ouagadougou, Abidjan & Dakar.',
    imageUrl:
      'https://images.unsplash.com/photo-1608248597359-0e6d526a6c58?w=1080&auto=format&fit=crop&q=80',
    videoDemoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    sellerName: 'Awa Ouédraogo',
    sellerHandle: '@awa.empire.bf',
    sellerAvatar:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&auto=format&fit=crop&q=80',
    sellerBadge: '🛍️ Commerçante & E-Shop',
    isMine: false,
    createdAt: 'Il y a 25 min'
  },
  {
    id: 'wshop-prod-2',
    category: 'VIRTUAL',
    title: 'Masterclass Tunnels & IA UEMOA (12 Blocs Haute Conversion)',
    priceFcfa: 25000,
    compareAtPriceFcfa: 45000,
    description:
      'Formation digitale complète (1080×1080) avec modèles de tunnels prêts à cloner, scripts Wameet Direct et accès immédiat au Campus.',
    imageUrl:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1080&auto=format&fit=crop&q=80',
    videoDemoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    sellerName: 'Dr. Idriss Kaboré',
    sellerHandle: '@idriss.academie',
    sellerAvatar:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    sellerBadge: '🎓 Formateur & Mentor',
    isMine: false,
    createdAt: 'Il y a 1 h'
  },
  {
    id: 'wshop-prod-3',
    category: 'PHYSICAL',
    title: 'Kit Studio Ring Light Pro Live 18" + Trépied 2m10',
    priceFcfa: 22000,
    compareAtPriceFcfa: 30000,
    description:
      'Éclairage LED bicolore haute intensité avec 3 supports téléphone et télécommande Bluetooth pour tourner vos Reels et Lives Wameet.',
    imageUrl:
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1080&auto=format&fit=crop&q=80',
    videoDemoUrl: '/videos/reel-business.mp4',
    sellerName: 'Salif Tech & Gadgets',
    sellerHandle: '@salif.tech.ci',
    sellerAvatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    sellerBadge: '🚀 Entrepreneur Hybride',
    isMine: false,
    createdAt: 'Il y a 2 h'
  },
  {
    id: 'wshop-prod-4',
    category: 'VIRTUAL',
    title: 'Ebook + Audio : 30 Idées Business Rentables après 18h',
    priceFcfa: 7500,
    compareAtPriceFcfa: 15000,
    description:
      'Guide pratique PDF + résumés audio pour lancer une activité secondaire rentable après le travail sans quitter son emploi.',
    imageUrl:
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1080&auto=format&fit=crop&q=80',
    videoDemoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    sellerName: 'Clarisse Zongo',
    sellerHandle: '@clarisse.coach',
    sellerAvatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    sellerBadge: '🌙 Détente & Idées après le boulot',
    isMine: false,
    createdAt: 'Il y a 3 h'
  }
];

export const WameetMiniShopView: React.FC<WameetMiniShopViewProps> = ({
  currentUserProfile,
  highlightedProductFromReelOrChat,
  onClearHighlightedProduct,
  onNegotiateInW,
  onProductPublished
}) => {
  const [products, setProducts] = useState<WameetShopProduct[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WAMEET_SHOP);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p) => {
            if (p.videoDemoUrl && (p.videoDemoUrl.includes('commondatastorage.googleapis.com') || p.videoDemoUrl.includes('mixkit.co'))) {
              return { ...p, videoDemoUrl: '/videos/reel-business.mp4' };
            }
            return p;
          });
        }
      }
    } catch (e) {}
    return INITIAL_SHOP_PRODUCTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_WAMEET_SHOP, JSON.stringify(products));
    } catch (e) {}
  }, [products]);

  const [activeNavTab, setActiveNavTab] = useState<WameetShopTabFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterBySellerHandle, setFilterBySellerHandle] = useState<string | null>(null);

  // Modale Démo Vidéo (Lecteur YouTube Furtif ou MP4)
  const [activeDemoProduct, setActiveDemoProduct] = useState<WameetShopProduct | null>(null);

  // Modale Achat Direct / Commande Express
  const [checkoutProduct, setCheckoutProduct] = useState<WameetShopProduct | null>(null);
  const [buyerName, setBuyerName] = useState<string>(currentUserProfile.name);
  const [buyerPhone, setBuyerPhone] = useState<string>('+226 70 00 00 00');
  const [buyerCity, setBuyerCity] = useState<string>('Ouagadougou');

  // Modale ➕ Publier un Produit Physique ou Virtuel (100 % par Liens)
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [newProdCategory, setNewProdCategory] = useState<'PHYSICAL' | 'VIRTUAL'>('PHYSICAL');
  const [newProdTitle, setNewProdTitle] = useState<string>('');
  const [newProdPrice, setNewProdPrice] = useState<string>('15000');
  const [newProdComparePrice, setNewProdComparePrice] = useState<string>('22000');
  const [newProdDescription, setNewProdDescription] = useState<string>('');
  const [newProdImageUrl, setNewProdImageUrl] = useState<string>('');
  const [newProdVideoUrl, setNewProdVideoUrl] = useState<string>('');
  const [newProdDirectCheckoutUrl, setNewProdDirectCheckoutUrl] = useState<string>('');

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (filterBySellerHandle && p.sellerHandle !== filterBySellerHandle) {
        return false;
      }
      if (activeNavTab === 'PHYSICAL' && p.category !== 'PHYSICAL') return false;
      if (activeNavTab === 'VIRTUAL' && p.category !== 'VIRTUAL') return false;
      if (
        activeNavTab === 'MY_SHOP' &&
        !p.isMine &&
        p.sellerHandle.toLowerCase() !== currentUserProfile.handle.toLowerCase()
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.sellerName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, activeNavTab, searchQuery, filterBySellerHandle, currentUserProfile.handle]);

  const handlePublishProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdTitle.trim() || !newProdImageUrl.trim()) return;
    playValidationBeep();

    const created: WameetShopProduct = {
      id: `wshop-prod-${Date.now()}`,
      category: newProdCategory,
      title: newProdTitle.trim(),
      priceFcfa: Number(newProdPrice) || 10000,
      compareAtPriceFcfa: newProdComparePrice ? Number(newProdComparePrice) : undefined,
      description:
        newProdDescription.trim() ||
        'Disponible immédiatement dans mon Mini-Site Wameet Shop. Contactez-moi par SMS/Audio ou commandez en 1 clic !',
      imageUrl: newProdImageUrl.trim(),
      videoDemoUrl: newProdVideoUrl.trim() || undefined,
      directCheckoutUrl: newProdDirectCheckoutUrl.trim() || undefined,
      sellerName: currentUserProfile.name,
      sellerHandle: currentUserProfile.handle,
      sellerAvatar: currentUserProfile.avatarUrl,
      sellerBadge: currentUserProfile.statusBadge,
      isMine: true,
      createdAt: "À l'instant"
    };

    setProducts(prev => [created, ...prev]);
    setIsPublishModalOpen(false);
    setNewProdTitle('');
    setNewProdDescription('');
    setNewProdImageUrl('');
    setNewProdVideoUrl('');
    setNewProdDirectCheckoutUrl('');
    setActiveNavTab('ALL');
    if (onProductPublished) onProductPublished(created);
    showToast('🛍️ Votre produit a été publié dans le Mini-Site Wameet Shop !');
  };

  const handleConfirmExpressOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutProduct) return;
    playValidationBeep();

    if (checkoutProduct.directCheckoutUrl) {
      window.open(checkoutProduct.directCheckoutUrl, '_blank', 'noopener,noreferrer');
      setCheckoutProduct(null);
      return;
    }

    const savedProd = checkoutProduct;
    setCheckoutProduct(null);
    showToast(`✅ Commande de "${savedProd.title}" transmise à ${savedProd.sellerName} !`);
  };

  return (
    <div className="space-y-5 relative">
      {/* Toast Flottant */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#2563EB] text-white text-xs font-black shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* =====================================================================
          EN-TÊTE DU MINI-SITE WAMEET SHOP + BOUTON BLEU ROYAL ➕ PUBLIER UN PRODUIT
         ===================================================================== */}
      <section className="rounded-[28px] border-2 border-blue-600/80 ring-4 ring-blue-500/10 bg-white p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2563EB] to-blue-700 text-white flex items-center justify-center shadow-md border-2 border-white ring-2 ring-[#2563EB]/30 shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#2563EB] text-white text-[10px] font-black uppercase">
                  🛍️ 4. Wameet Shop
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 text-[10px] font-black">
                  Format Carré 1080×1080 • 100 % par Liens
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                Mini-Site de Produits Physiques & Virtuels
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Exposez vos articles, formations, ebooks et services avec démo vidéo furtive et négociation SMS/Audio directe.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsPublishModalOpen(true);
            }}
            className="px-4 py-3 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black shadow-[0_10px_25px_-5px_rgba(37,99,235,0.5)] border-2 border-white ring-2 ring-[#2563EB] flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>➕ Publier un Produit Physique ou Virtuel</span>
          </button>
        </div>

        {/* BARRE DE NAVIGATION DU MINI-SITE (4 Onglets Officiels) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setFilterBySellerHandle(null);
              setActiveNavTab('ALL');
            }}
            className={`px-3 py-2.5 rounded-2xl text-xs font-black border-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeNavTab === 'ALL' && !filterBySellerHandle
                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md'
                : 'bg-blue-50/60 hover:bg-blue-50 text-slate-800 border-blue-200'
            }`}
          >
            <span>🌐 Tout le Marché Wameet</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setFilterBySellerHandle(null);
              setActiveNavTab('PHYSICAL');
            }}
            className={`px-3 py-2.5 rounded-2xl text-xs font-black border-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeNavTab === 'PHYSICAL'
                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md'
                : 'bg-blue-50/60 hover:bg-blue-50 text-slate-800 border-blue-200'
            }`}
          >
            <span>📦 Produits Physiques</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setFilterBySellerHandle(null);
              setActiveNavTab('VIRTUAL');
            }}
            className={`px-3 py-2.5 rounded-2xl text-xs font-black border-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeNavTab === 'VIRTUAL'
                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md'
                : 'bg-blue-50/60 hover:bg-blue-50 text-slate-800 border-blue-200'
            }`}
          >
            <span>⚡ Produits Virtuels & Digitaux</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setFilterBySellerHandle(null);
              setActiveNavTab('MY_SHOP');
            }}
            className={`px-3 py-2.5 rounded-2xl text-xs font-black border-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeNavTab === 'MY_SHOP'
                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md'
                : 'bg-blue-50/60 hover:bg-blue-50 text-slate-800 border-blue-200'
            }`}
          >
            <span>🏪 Mon Mini-Site Personnel</span>
          </button>
        </div>

        {/* Barre de recherche rapide + Filtre vendeur actif */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher un produit physique, une formation 1080×1080, un ebook ou un vendeur..."
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold text-slate-900 focus:outline-none"
            />
          </div>

          {filterBySellerHandle && (
            <button
              type="button"
              onClick={() => setFilterBySellerHandle(null)}
              className="px-3 py-2 rounded-2xl bg-blue-100 text-[#2563EB] text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <span>Boutique de {filterBySellerHandle}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </section>

      {/* Mise en avant d'un produit sélectionné depuis un Reel ou le Chat Wameet */}
      {highlightedProductFromReelOrChat && (
        <div className="rounded-[28px] border-2 border-[#2563EB] bg-blue-50/90 p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={highlightedProductFromReelOrChat.imageUrl}
              alt={highlightedProductFromReelOrChat.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#2563EB] shrink-0"
            />
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#2563EB] text-white text-[10px] font-black uppercase">
                ⚡ Sélectionné depuis Wameet Reels / Chat
              </span>
              <h3 className="text-sm font-black text-slate-900 mt-1">
                {highlightedProductFromReelOrChat.name}
              </h3>
              <div className="text-sm font-black text-[#2563EB]">
                {highlightedProductFromReelOrChat.priceFcfa.toLocaleString('fr-FR')} FCFA
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const match =
                  products.find(
                    p =>
                      p.title
                        .toLowerCase()
                        .includes(highlightedProductFromReelOrChat.name.toLowerCase()) ||
                      p.id === highlightedProductFromReelOrChat.id
                  ) || products[0];
                setCheckoutProduct(match);
              }}
              className="px-4 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black shadow-md cursor-pointer"
            >
              🛒 Acheter maintenant !
            </button>
            {onClearHighlightedProduct && (
              <button
                type="button"
                onClick={onClearHighlightedProduct}
                className="p-2 rounded-xl bg-white text-slate-500 hover:text-slate-800 border border-blue-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          GRILLE DES CARTES PRODUITS SUPRA-APP À BORDURES STYLISÉES (1080×1080)
         ===================================================================== */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-[28px] border-2 border-blue-600/80 bg-white p-10 text-center space-y-3 shadow-lg">
          <ShoppingBag className="w-10 h-10 text-[#2563EB] mx-auto" />
          <h3 className="text-base font-black text-slate-900">
            Aucun produit dans cette vue pour le moment
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Cliquez sur le bouton Bleu Royal ci-dessous pour exposer votre premier produit physique ou digital (1080×1080) par simple lien !
          </p>
          <button
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black shadow-md cursor-pointer"
          >
            ➕ Publier mon premier Produit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filteredProducts.map(product => {
            const isPhysical = product.category === 'PHYSICAL';
            return (
              <article
                key={product.id}
                className="rounded-[28px] border-2 border-blue-600/80 ring-4 ring-blue-500/10 bg-white p-4 shadow-lg flex flex-col justify-between gap-3.5 hover:shadow-xl transition"
              >
                <div className="space-y-3">
                  {/* En-tête Vendeur Cliquable */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setFilterBySellerHandle(
                          filterBySellerHandle === product.sellerHandle
                            ? null
                            : product.sellerHandle
                        );
                      }}
                      className="flex items-center gap-2.5 text-left group cursor-pointer min-w-0"
                      title={`Voir le Mini-Site de ${product.sellerName}`}
                    >
                      <img
                        src={product.sellerAvatar}
                        alt={product.sellerName}
                        className="w-9 h-9 rounded-full object-cover border-2 border-[#2563EB] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 group-hover:text-[#2563EB] truncate">
                          {product.sellerName}
                        </div>
                        <div className="text-[10px] font-bold text-[#2563EB] truncate">
                          {product.sellerHandle} • {product.sellerBadge}
                        </div>
                      </div>
                    </button>

                    {/* Badge 📦 Physique ou ⚡ Virtuel */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black border shrink-0 ${
                        isPhysical
                          ? 'bg-blue-50 text-[#2563EB] border-blue-300'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-300'
                      }`}
                    >
                      {isPhysical ? '📦 Physique' : '⚡ Virtuel (1080×1080)'}
                    </span>
                  </div>

                  {/* Image Carrée 1080×1080 (aspect-square rounded-2xl) */}
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-blue-100 bg-slate-100 group">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      onError={e => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1080&auto=format&fit=crop&q=80';
                      }}
                    />

                    {/* Bouton Flottant ▶️ Démo Vidéo (Lecteur Furtif) */}
                    {product.videoDemoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setActiveDemoProduct(product);
                        }}
                        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-950/85 hover:bg-[#2563EB] text-white text-[11px] font-black backdrop-blur-md border border-white/40 shadow-lg flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>▶️ Démo Vidéo (Lecteur Furtif)</span>
                      </button>
                    )}

                    {/* Prix en surimpression haut-gauche */}
                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border-2 border-[#2563EB] shadow-md">
                      <span className="text-xs sm:text-sm font-black text-[#2563EB]">
                        {product.priceFcfa.toLocaleString('fr-FR')} FCFA
                      </span>
                      {product.compareAtPriceFcfa && (
                        <span className="ml-1.5 text-[10px] font-bold text-slate-400 line-through">
                          {product.compareAtPriceFcfa.toLocaleString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Titre & Description */}
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-snug">
                      {product.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                </div>

                {/* Boutons d'Action de la Carte Produit */}
                <div className="pt-2 border-t border-blue-100 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Bouton 💬 Négocier / Commander par SMS & Audio */}
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        if (onNegotiateInW) {
                          onNegotiateInW({
                            name: product.sellerName,
                            handle: product.sellerHandle,
                            avatarUrl: product.sellerAvatar,
                            productTitle: product.title,
                            productPriceFcfa: product.priceFcfa
                          });
                        } else {
                          showToast(`💬 Ouverture du chat avec ${product.sellerName}`);
                        }
                      }}
                      className="px-3 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] border-2 border-blue-200 text-[11px] font-black flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">💬 SMS & Audio</span>
                    </button>

                    {/* Bouton 🛒 Acheter maintenant ! */}
                    <button
                      type="button"
                      onClick={() => {
                        playValidationBeep();
                        setCheckoutProduct(product);
                      }}
                      className="px-3 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-[11px] font-black shadow-md flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">🛒 Acheter maintenant !</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          MODALE ▶️ DÉMO VIDÉO DU PRODUIT (AVEC STEALTH YOUTUBE PLAYER INTACT)
         ===================================================================== */}
      {activeDemoProduct && activeDemoProduct.videoDemoUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-[32px] border-2 border-[#2563EB] ring-4 ring-blue-500/20 bg-white overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#2563EB] to-blue-700 text-white flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase text-blue-100">
                  ▶️ Démo Vidéo Furtive • Wameet Shop
                </div>
                <h4 className="text-sm font-black truncate">{activeDemoProduct.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveDemoProduct(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-black">
              {extractYouTubeVideoId(activeDemoProduct.videoDemoUrl) ? (
                <StealthYouTubePlayer
                  videoUrl={activeDemoProduct.videoDemoUrl}
                  title={activeDemoProduct.title}
                  hideBranding={true}
                  autoPlay={true}
                />
              ) : (
                <video
                  src={activeDemoProduct.videoDemoUrl}
                  preload="none"
                  controls
                  autoPlay
                  className="w-full max-h-[420px] object-contain bg-black"
                />
              )}
            </div>

            <div className="p-4 bg-white flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-500">
                  Vendu par {activeDemoProduct.sellerName}
                </div>
                <div className="text-base font-black text-[#2563EB]">
                  {activeDemoProduct.priceFcfa.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const p = activeDemoProduct;
                    setActiveDemoProduct(null);
                    setCheckoutProduct(p);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  🛒 Acheter maintenant !
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALE 🛒 ACHAT EXPRESS / REDIRECTION TUNNEL OU COMMANDE WAMEET DIRECT
         ===================================================================== */}
      {checkoutProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[32px] border-2 border-[#2563EB] ring-4 ring-blue-500/20 bg-white overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-gradient-to-r from-[#2563EB] to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <h3 className="text-sm font-black">🛒 Commande Express Wameet Shop</h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutProduct(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmExpressOrder} className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 border border-blue-200">
                <img
                  src={checkoutProduct.imageUrl}
                  alt={checkoutProduct.title}
                  className="w-14 h-14 rounded-xl object-cover border border-[#2563EB] shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 truncate">
                    {checkoutProduct.title}
                  </div>
                  <div className="text-sm font-black text-[#2563EB]">
                    {checkoutProduct.priceFcfa.toLocaleString('fr-FR')} FCFA
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    Vendeur : {checkoutProduct.sellerName}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                  Votre Nom Complet
                </label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                    Téléphone Mobile Money / Wameet
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerPhone}
                    onChange={e => setBuyerPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                    Ville / Quartier
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerCity}
                    onChange={e => setBuyerCity(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black shadow-lg cursor-pointer"
                >
                  ⚡ Valider ma Commande ({checkoutProduct.priceFcfa.toLocaleString('fr-FR')} FCFA)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = checkoutProduct;
                    setCheckoutProduct(null);
                    if (onNegotiateInW) {
                      onNegotiateInW({
                        name: p.sellerName,
                        handle: p.sellerHandle,
                        avatarUrl: p.sellerAvatar,
                        productTitle: p.title,
                        productPriceFcfa: p.priceFcfa
                      });
                    }
                  }}
                  className="w-full py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 text-xs font-black cursor-pointer"
                >
                  💬 Finaliser par SMS / Audio dans Wameet Direct
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALE ➕ PUBLIER UN PRODUIT PHYSIQUE OU VIRTUEL (100 % PAR LIENS)
         ===================================================================== */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl my-auto rounded-[32px] border-2 border-[#2563EB] ring-4 ring-blue-500/20 bg-white shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-[#2563EB] to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Store className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    ➕ Publier un Produit Physique ou Virtuel
                  </h3>
                  <p className="text-[11px] text-blue-100 font-medium">
                    Mini-Site Wameet Shop • Format Carré 1080×1080 • 100 % par Liens
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handlePublishProduct}
              className="p-6 space-y-4 max-h-[82vh] overflow-y-auto"
            >
              {/* 1. Catégorie : 📦 Produit Physique vs 💻 Produit Virtuel */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  Catégorie du Produit *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewProdCategory('PHYSICAL')}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                      newProdCategory === 'PHYSICAL'
                        ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md'
                        : 'bg-blue-50/50 text-slate-800 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <div className="text-xs font-black">📦 Produit Physique (Livraison)</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        newProdCategory === 'PHYSICAL' ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      Mode, Cosmétique, Tech, Alimentation...
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewProdCategory('VIRTUAL')}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                      newProdCategory === 'VIRTUAL'
                        ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md'
                        : 'bg-blue-50/50 text-slate-800 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <div className="text-xs font-black">
                      💻 Produit Virtuel / Ebook / Formation
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        newProdCategory === 'VIRTUAL' ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      Cours en ligne, PDF, Coaching, Service...
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Nom du Produit & Prix FCFA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                    Nom du Produit / Formation *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProdTitle}
                    onChange={e => setNewProdTitle(e.target.value)}
                    placeholder="Ex: Coffret Karité Royal ou Formation E-Commerce 1080×1080"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                    Prix de vente (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newProdPrice}
                    onChange={e => setNewProdPrice(e.target.value)}
                    placeholder="15000"
                    className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-black text-[#2563EB] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                    Prix barré optionnel (FCFA)
                  </label>
                  <input
                    type="number"
                    value={newProdComparePrice}
                    onChange={e => setNewProdComparePrice(e.target.value)}
                    placeholder="25000 (Optionnel)"
                    className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold text-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. Description */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                  Description & Bénéfices
                </label>
                <textarea
                  rows={2}
                  value={newProdDescription}
                  onChange={e => setNewProdDescription(e.target.value)}
                  placeholder="Décrivez votre produit, les modalités de livraison ou d'accès immédiat..."
                  className="w-full px-4 py-2 rounded-2xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-medium text-slate-900 focus:outline-none"
                />
              </div>

              {/* 4. Photo du Produit (Carte de prévisualisation visuelle) */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                  🖼️ Photo du Produit (Format 1080×1080 recommandé) *
                </label>
                <input
                  id="shop-prod-image-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setNewProdImageUrl(ev.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
                {!newProdImageUrl ? (
                  <button
                    type="button"
                    onClick={() => document.getElementById('shop-prod-image-file')?.click()}
                    className="w-full py-4 px-4 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ImageIcon className="w-6 h-6 text-[#2563EB]" />
                    <span className="text-xs font-black text-[#2563EB]">Choisir la photo du produit</span>
                    <span className="text-[10px] text-slate-500 font-medium">JPEG, PNG ou WebP</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <img
                      src={newProdImageUrl}
                      alt="Aperçu produit"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Photo produit prête 🚀
                      </span>
                      <button
                        type="button"
                        onClick={() => document.getElementById('shop-prod-image-file')?.click()}
                        className="text-[11px] font-bold text-[#2563EB] hover:underline block mt-1 cursor-pointer"
                      >
                        Changer de photo
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewProdImageUrl('')}
                      className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 5. Lien Vidéo de Présentation (Optionnel — Lecteur YouTube Furtif) */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                  🎬 Lien Vidéo de Présentation (Optionnel — YouTube Furtif ou MP4)
                </label>
                <input
                  type="url"
                  value={newProdVideoUrl}
                  onChange={e => setNewProdVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... (Optionnel)"
                  className="w-full px-4 py-2 rounded-2xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              {/* 6. Lien d'Achat Direct / Tunnel (Optionnel) */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                  🔗 Lien d'Achat Direct / Tunnel Nanasore (Optionnel — sinon commande via Wameet Direct)
                </label>
                <input
                  type="url"
                  value={newProdDirectCheckoutUrl}
                  onChange={e => setNewProdDirectCheckoutUrl(e.target.value)}
                  placeholder="https://.../t/mon-tunnel (Optionnel)"
                  className="w-full px-4 py-2 rounded-2xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Publier dans mon Mini-Site</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WameetMiniShopView;
