import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeWrapper } from '../../../themes/ThemeWrapper';
import { triggerOpenFunnel } from '../../../themes/themeUtils';
import { StoreConfig, StoreProductItem } from '../../../components/storeBuilder/types';
import { ProductDetailModal } from '../../../components/storeBuilder/ProductDetailModal';
import { UltimateCheckout, CheckoutProductSummary } from '../../../components/payment/UltimateCheckout';
import { ShoppingBag, CreditCard } from 'lucide-react';
import { formatCFA, playTapBeep } from '../../../utils/audio';
import { db } from '../../../firebase';
import { collection, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { ensureMandatoryProductSlug } from '../../../utils/slugEngine';
import { StoreLegalAndTrackingModals } from '../../../components/storeBuilder/StoreLegalAndTrackingModals';
import { OrderConfirmationVaultModal } from '../../../components/storeBuilder/OrderConfirmationVaultModal';
import { initPixels } from '../../../utils/pixelTrackingEngine';
import { resolveThemeFromPrefix, THEME_PREFIX_REGEX } from '../../../utils/themeRoutePrefix';
import { fetchPublicStoreBySlugOrId } from '../../../utils/slugService';
import { FALLBACK_STUDIO_PRODUCTS } from '../../../components/storeBuilder/themeStudioConstants';

interface PublicStorefrontPageProps {
  storeId?: string | null;
  initialProductId?: string | null;
  whiteLabelConfig?: any;
  onBack?: () => void;
}

// Helpers Cache Rapide 0ms (Stale-While-Revalidate)
const readFastStoreCache = (storeSlug: string): { storeConfig?: Partial<StoreConfig>; products?: StoreProductItem[] } | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`nana_fast_cache_${storeSlug}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeFastStoreCache = (storeSlug: string, patch: { storeConfig?: Partial<StoreConfig>; products?: StoreProductItem[] }) => {
  if (typeof window === 'undefined') return;
  try {
    const cacheKey = `nana_fast_cache_${storeSlug}`;
    const raw = sessionStorage.getItem(cacheKey);
    const existing = raw ? JSON.parse(raw) : {};
    const merged = { ...existing, ...patch };
    sessionStorage.setItem(cacheKey, JSON.stringify(merged));
  } catch {
    // Quota ou mode navigation privée silencieusement géré
  }
};

export const PublicStorefrontPage: React.FC<PublicStorefrontPageProps> = ({
  storeId: propStoreId,
  initialProductId,
  whiteLabelConfig,
  onBack
}) => {
  // 1. Extraction et résolution des paramètres d'URL et thèmes (useMemo déclarés AVANT les états et effets)
  const resolvedStoreSlug = useMemo(() => {
    if (propStoreId && propStoreId.trim()) {
      return propStoreId.trim().replace(/^store-/, '');
    }
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;

      // Détection avec préfixe de thème officiel : /se/:store, /dp/:store, /i/:store, /v/:store...
      const themeMatch = pathname.match(/^\/([a-z0-9]+)\/([^/?#]+)/i);
      if (themeMatch && THEME_PREFIX_REGEX.test(themeMatch[1].toLowerCase())) {
        return decodeURIComponent(themeMatch[2]).replace(/^store-/, '');
      }

      const match = pathname.match(/^\/(?:s|shop|boutique|store|vitrine)\/([^/?#]+)/i);
      if (match) return decodeURIComponent(match[1]).replace(/^store-/, '');
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length === 1) return decodeURIComponent(segments[0]).replace(/^store-/, '');
      const params = new URLSearchParams(window.location.search);
      const qStore = params.get('store') || params.get('shop') || params.get('boutique') || params.get('storeId');
      if (qStore) return qStore.replace(/^store-/, '');
    }
    return 'ma-boutique';
  }, [propStoreId]);

  const targetStoreId = useMemo(() => {
    if (propStoreId && propStoreId.startsWith('store-')) return propStoreId;
    return `store-${resolvedStoreSlug}`;
  }, [propStoreId, resolvedStoreSlug]);

  // Détection du thème depuis le préfixe de route d'URL (/se/:store, /dp/:store, /v/:store...)
  const urlThemeFromPath = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const pathname = window.location.pathname;
    const match = pathname.match(/^\/([a-z0-9]+)\/([^/?#]+)/i);
    if (match) {
      const prefix = match[1].toLowerCase();
      if (THEME_PREFIX_REGEX.test(prefix)) {
        const resolved = resolveThemeFromPrefix(prefix);
        if (resolved) return resolved.themeId;
      }
    }
    return undefined;
  }, []);

  const urlPreviewTheme = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('previewTheme') || p.get('preview_theme') || p.get('theme') || undefined;
    } catch {
      return undefined;
    }
  }, []);

  const activeInitialTheme = useMemo(() => {
    return urlPreviewTheme || urlThemeFromPath || 'theme-blank-custom';
  }, [urlPreviewTheme, urlThemeFromPath]);

  // 1.1 Détection du mode Sandbox Admin (ex: /et/sandbox, /se/sandbox, ou ?sandbox=true)
  const isSandboxMode = useMemo(() => {
    if (resolvedStoreSlug === 'sandbox' || resolvedStoreSlug === 'sandbox-admin' || resolvedStoreSlug === 'demo-admin') return true;
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('sandbox') === 'true' || p.get('isAdminPreview') === 'true' || p.get('adminPreview') === 'true' || p.get('draft') === 'true';
    }
    return false;
  }, [resolvedStoreSlug]);

  // Récupération instantanée du brouillon actuel (draft) de l'administrateur
  const sandboxDraftConfig = useMemo(() => {
    if (!isSandboxMode || typeof window === 'undefined') return null;
    try {
      const candidates = [
        localStorage.getItem('nanasore_studio_draft_sandbox'),
        localStorage.getItem('nanasore_studio_draft_latest'),
        localStorage.getItem('nanasore_auto_draft_sandbox')
      ];
      for (const raw of candidates) {
        if (raw) {
          const parsed = JSON.parse(raw);
          const conf = parsed.config || parsed;
          if (conf && typeof conf === 'object') return conf;
        }
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('nanasore_auto_draft_') || key.startsWith('nanasore_studio_draft_'))) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              const conf = parsed.config || parsed;
              if (conf && typeof conf === 'object' && (conf.heroTitle || conf.storeName || conf.customSections)) {
                return conf;
              }
            } catch {}
          }
        }
      }
    } catch {}
    return null;
  }, [isSandboxMode]);

  // 2. Déclaration ordonnée de tous les états React (useState)
  const [actualStoreId, setActualStoreId] = useState<string>(targetStoreId);

  const [storeConfig, setStoreConfig] = useState<StoreConfig>(() => {
    const base: StoreConfig = {
      storeName: isSandboxMode ? (sandboxDraftConfig?.storeName || 'Sandbox Tech & Commerce') : 'Boutique Officielle',
      whatsappPhone: isSandboxMode ? (sandboxDraftConfig?.whatsappNumber || '+225 07 00 00 00') : '+225 07 00 00 00',
      welcomeText: isSandboxMode ? (sandboxDraftConfig?.heroSubtitle || 'Mode Sandbox Super-Admin') : 'Bienvenue sur notre boutique en ligne',
      logoUrl: isSandboxMode ? (sandboxDraftConfig?.logoUrl || '') : '',
      bannerImage: isSandboxMode ? (sandboxDraftConfig?.heroBannerImageUrl || '') : '',
      currency: 'CFA',
      slug: resolvedStoreSlug,
      active_theme_id: activeInitialTheme,
      activeThemeId: activeInitialTheme,
      theme: 'dark',
      themeCustomization: isSandboxMode ? (sandboxDraftConfig || undefined) : undefined
    };
    if (isSandboxMode) return base;
    const cached = readFastStoreCache(resolvedStoreSlug);
    if (cached?.storeConfig) {
      return {
        ...base,
        ...cached.storeConfig,
        active_theme_id: activeInitialTheme || cached.storeConfig.active_theme_id || cached.storeConfig.activeThemeId || base.active_theme_id,
        activeThemeId: activeInitialTheme || cached.storeConfig.activeThemeId || cached.storeConfig.active_theme_id || base.activeThemeId
      };
    }
    return base;
  });

  const [products, setProducts] = useState<StoreProductItem[]>(() => {
    if (isSandboxMode && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('nanasore_studio_products_sandbox');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
      return FALLBACK_STUDIO_PRODUCTS;
    }
    const cached = readFastStoreCache(resolvedStoreSlug);
    if (cached?.products && Array.isArray(cached.products) && cached.products.length > 0) {
      return cached.products;
    }
    return [];
  });

  const [cart, setCart] = useState<{ product: StoreProductItem; quantity: number }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<StoreProductItem | null>(null);
  const [showCheckoutDrawer, setShowCheckoutDrawer] = useState(false);
  const [checkoutDirectItem, setCheckoutDirectItem] = useState<{ product: StoreProductItem; quantity: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous les produits');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. Déclaration ordonnée des effets (useEffect)
  useEffect(() => {
    if (typeof window !== 'undefined' && resolvedStoreSlug) {
      (window as any).storeSlug = resolvedStoreSlug;
    }
  }, [resolvedStoreSlug]);

  useEffect(() => {
    if (isSandboxMode) return; // Mode Sandbox : pas de requête tenant distante
    let isMounted = true;
    fetchPublicStoreBySlugOrId(resolvedStoreSlug).then((found) => {
      if (isMounted && found && found.id) {
        setActualStoreId(found.id);
        setStoreConfig((prev) => ({
          ...prev,
          ...found,
          storeName: found.storeName || prev.storeName,
          slug: found.storeSlug || found.slug || prev.slug,
          activeThemeId: urlPreviewTheme || found.activeThemeId || found.active_theme_id || prev.activeThemeId,
          active_theme_id: urlPreviewTheme || found.activeThemeId || found.active_theme_id || prev.active_theme_id
        }));
      }
    }).catch(console.warn);
    return () => { isMounted = false; };
  }, [resolvedStoreSlug, urlPreviewTheme]);

  // Initialisation des Pixels Publicitaires (Meta, TikTok, Google)
  useEffect(() => {
    initPixels({
      metaPixelId: (storeConfig as any).themeCustomization?.metaPixelId || storeConfig.fbPixelId,
      tiktokPixelId: (storeConfig as any).themeCustomization?.tiktokPixelId || storeConfig.tiktokPixelId,
      googleTagId: (storeConfig as any).themeCustomization?.googleTagId
    });
  }, [storeConfig.fbPixelId, storeConfig.tiktokPixelId, (storeConfig as any).themeCustomization]);

  // Chargement des données de la boutique et de son catalogue depuis Firestore avec synchronisation du cache
  useEffect(() => {
    if (isSandboxMode) return; // Mode Sandbox : les données proviennent du brouillon admin local
    const storeIdToUse = actualStoreId || targetStoreId;
    if (!storeIdToUse) return;
    const storeRef = doc(db, 'stores', storeIdToUse);
    
    // Écoute des données storeConfig
    const unsubStore = onSnapshot(storeRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStoreConfig(prev => {
          const nextConfig = {
            ...prev,
            ...data,
            storeName: data.storeName || prev.storeName,
            slug: data.storeSlug || data.slug || prev.slug,
            active_theme_id: urlPreviewTheme || data.activeThemeId || data.active_theme_id || prev.active_theme_id,
            activeThemeId: urlPreviewTheme || data.activeThemeId || data.active_theme_id || prev.activeThemeId,
            themeCustomization: data.themeCustomization || (prev as any).themeCustomization
          };
          writeFastStoreCache(resolvedStoreSlug, { storeConfig: nextConfig });
          return nextConfig;
        });
      }
    });

    // Chargement unifié des produits de la boutique (stores/$storeId/products, tenants/$tenantId/products, inventory, et cache local)
    const productMap = new Map<string, StoreProductItem>();

    const mergeProductsFromData = (dataList: any[]) => {
      dataList.forEach((item) => {
        const id = item.id;
        if (!id) return;
        const prodSlug = ensureMandatoryProductSlug({
          id,
          name: item.name,
          slug: item.slug || item.productSlug
        });
        const productItem: StoreProductItem = {
          id,
          name: item.name || 'Produit',
          slug: prodSlug,
          productSlug: prodSlug,
          price: item.salePrice || item.sellingPrice || item.price || 0,
          originalPrice: item.originalPrice || 0,
          category: item.category || 'Tous les produits',
          image: item.photoUrl || item.imageUrl || item.image || '',
          stock: item.currentStock !== undefined ? item.currentStock : (item.stock !== undefined ? item.stock : 10),
          description: item.richDescription || item.description || '',
          richDescription: item.richDescription || item.description || '',
          shortDescription: item.shortDescription || '',
          badge: item.badge,
          linkedFunnelId: item.linkedFunnelId,
          hasModularFunnel: item.hasModularFunnel !== false,
          useUltimateFunnel: item.hasModularFunnel === false && Boolean(item.useUltimateFunnel),
          modular_funnel: item.modular_funnel,
          ultimate_funnel: item.ultimate_funnel,
          funnelDisplayMode: item.funnelDisplayMode,
          colorSwatches: item.colorSwatches,
          sizeOptions: item.sizeOptions,
          keyFeatures: item.keyFeatures,
          routineVideoUrls: item.routineVideoUrls,
          bundleProductIds: item.bundleProductIds,
          bundleDiscountPercent: item.bundleDiscountPercent,
          liveLotBadge: item.liveLotBadge
        };
        productMap.set(id, productItem);
      });
    };

    // 1. Initialiser avec le cache local immédiat du tenant s'il existe
    try {
      const customKey = `nana_tenant_${storeIdToUse}_custom_store_products`;
      const invKey = `nana_tenant_${storeIdToUse}_inventory`;
      const rawCustom = typeof window !== 'undefined' ? localStorage.getItem(customKey) : null;
      const rawInv = typeof window !== 'undefined' ? localStorage.getItem(invKey) : null;
      if (rawCustom) mergeProductsFromData(JSON.parse(rawCustom));
      if (rawInv) mergeProductsFromData(JSON.parse(rawInv));
      if (productMap.size > 0) {
        setProducts(Array.from(productMap.values()));
      }
    } catch {}

    // 2. Requêtes parallèles vers les sources Firestore : stores/.../products, tenants/.../products, stores/.../inventory
    Promise.allSettled([
      getDocs(collection(db, 'stores', storeIdToUse, 'products')),
      getDocs(collection(db, 'tenants', storeIdToUse, 'products')),
      getDocs(collection(db, 'stores', storeIdToUse, 'inventory'))
    ]).then((results) => {
      results.forEach((res) => {
        if (res.status === 'fulfilled' && !res.value.empty) {
          const docsData = res.value.docs.map(d => ({ ...d.data(), id: d.id }));
          mergeProductsFromData(docsData);
        }
      });
      if (productMap.size > 0) {
        const loaded = Array.from(productMap.values());
        setProducts(loaded);
        writeFastStoreCache(resolvedStoreSlug, { products: loaded });
      }
    }).catch(err => {
      console.warn('[PublicStorefrontPage] Erreur lecture catalogue unifié:', err);
    });

    return () => unsubStore();
  }, [actualStoreId, targetStoreId, resolvedStoreSlug, urlPreviewTheme]);

  // Résolution 0ms immédiate du produit cible (via prop ou Deep-Link URL ?product= / ?produit= / #product-)
  useEffect(() => {
    if (products.length === 0) return;
    let foundTarget: StoreProductItem | undefined = undefined;
    if (initialProductId) {
      foundTarget = products.find(p => p.id === initialProductId || p.slug === initialProductId);
    }
    if (!foundTarget && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const slugParam = params.get('product') || params.get('produit') || params.get('p');
      const hashParam = window.location.hash ? window.location.hash.replace(/^#product-/, '') : null;
      const target = slugParam || hashParam;
      if (target) {
        foundTarget = products.find(p => 
          (p.slug && p.slug.toLowerCase() === target.toLowerCase()) ||
          (p.productSlug && p.productSlug.toLowerCase() === target.toLowerCase()) ||
          p.id === target
        );
      }
    }
    if (foundTarget) {
      setSelectedProduct(prev => prev?.id === foundTarget?.id ? prev : foundTarget);
    }
  }, [products, initialProductId]);

  const categories = useMemo(() => {
    const set = new Set<string>(['Tous les produits']);
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'Tous les produits' || p.category === selectedCategory;
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Synchronisation popstate (Bouton retour physique/mobile pour la modale produit)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = (e: PopStateEvent) => {
      if (selectedProduct && !e.state?.modalOpen) {
        setSelectedProduct(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedProduct]);

  // Sélection de produit avec mise à jour URL propre
  const handleSelectProduct = useCallback((prod: StoreProductItem | null) => {
    setSelectedProduct(prod);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (prod) {
          const slug = prod.slug || prod.productSlug || prod.id;
          url.searchParams.set('product', slug);
          window.history.pushState({ modalOpen: true, productSlug: slug }, '', url.toString());
        } else {
          url.searchParams.delete('product');
          url.searchParams.delete('produit');
          url.searchParams.delete('p');
          window.history.pushState({}, '', url.toString());
        }
      } catch (err) {
        console.warn('Erreur mise à jour URL produit :', err);
      }
    }
  }, []);

  const handleAddToCart = useCallback((product: StoreProductItem, quantity: number = 1) => {
    playTapBeep();
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + (quantity || 1) }
            : item
        );
      }
      return [...prev, { product, quantity: quantity || 1 }];
    });
  }, []);

  const handleBuyNow = useCallback((product: StoreProductItem, quantity: number = 1) => {
    playTapBeep();
    // Quand un client clique sur Acheter : Caisse Checkout principale Sebpay obligatoire
    setCheckoutDirectItem({ product, quantity: quantity || 1 });
    setShowCheckoutDrawer(true);
  }, []);

  // Écouteur global pour ouverture immédiate de la caisse avec pré-remplissage depuis un tunnel de vente
  useEffect(() => {
    const handleGlobalOpenCheckout = (e: any) => {
      const detail = e.detail;
      if (detail?.product) {
        handleBuyNow(detail.product, detail.quantity || 1);
      }
    };
    window.addEventListener('nana:open_checkout', handleGlobalOpenCheckout);
    return () => window.removeEventListener('nana:open_checkout', handleGlobalOpenCheckout);
  }, [handleBuyNow]);

  const handleOpenTunnel = useCallback((product: StoreProductItem) => {
    playTapBeep();
    const funnelTarget = product.linkedFunnelId || product.slug || product.id;
    triggerOpenFunnel(funnelTarget, product.name, product);
  }, []);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  }, [cart]);

  // Préparation des données pour la Caisse Checkout Principale Sebpay
  const checkoutPayload = useMemo<CheckoutProductSummary | undefined>(() => {
    if (checkoutDirectItem) {
      const p = checkoutDirectItem.product;
      const q = checkoutDirectItem.quantity || 1;
      const total = (p.price || 0) * q;
      return {
        id: p.id,
        name: p.name,
        price: total,
        originalPrice: p.originalPrice ? p.originalPrice * q : Math.round(total * 1.25),
        imageUrl: p.image || '',
        description: p.shortDescription || p.description || '',
        quantity: q,
        items: [{ id: p.id, name: p.name, price: p.price, quantity: q, imageUrl: p.image }]
      };
    }
    if (cart.length > 0) {
      const total = cart.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
      return {
        id: 'cart-total',
        name: `Commande ${storeConfig.storeName || 'Boutique'}`,
        price: total,
        originalPrice: Math.round(total * 1.25),
        description: `${cart.length} article(s) dans le panier`,
        imageUrl: cart[0]?.product?.image || '',
        quantity: cart.reduce((sum, i) => sum + i.quantity, 0),
        items: cart.map(i => ({ id: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity, imageUrl: i.product.image }))
      };
    }
    return undefined;
  }, [checkoutDirectItem, cart, storeConfig.storeName]);

  const checkoutAmount = useMemo(() => {
    if (checkoutDirectItem) {
      return (checkoutDirectItem.product.price || 0) * (checkoutDirectItem.quantity || 1);
    }
    return cartTotal;
  }, [checkoutDirectItem, cartTotal]);

  const getProductWhatsAppUrl = useCallback((product: StoreProductItem) => {
    const phone = (storeConfig.whatsappPhone || '').replace(/[^0-9+]/g, '');
    const text = encodeURIComponent(`Bonjour, je souhaite commander : ${product.name} (${formatCFA(product.price)}) sur votre boutique.`);
    return `https://wa.me/${phone}?text=${text}`;
  }, [storeConfig.whatsappPhone]);

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 font-sans select-none flex flex-col relative overflow-x-hidden">
      {/* 0. Ruban d'Avertissement Sandbox Super-Admin */}
      {isSandboxMode && (
        <aside
          aria-label="Mode Sandbox Admin"
          className="sticky top-0 z-[9999] w-full bg-slate-950/95 backdrop-blur-md border-b border-amber-500/50 px-4 py-2.5 flex items-center justify-between text-white shadow-xl"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-amber-300 font-black flex items-center gap-1.5">
                🧪 MODE SANDBOX SUPER-ADMIN :
              </span>
              <span className="text-slate-300 text-xs">
                Aperçu temps réel du brouillon ({resolvedStoreSlug}) sans blocage de tenant marchand
              </span>
            </div>
          </div>
          <a
            href="/dashboard/vitrine/nsore"
            className="text-[11px] font-black uppercase px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-sm shrink-0"
            title="Revenir au Studio pour continuer à éditer ou publier"
          >
            🛠️ Revenir au Studio
          </a>
        </aside>
      )}

      {/* 1. Rendu Authoritaire du Thème Client Résolu (Isolation 100% sans aucun composant Dashboard) */}
      <ThemeWrapper
        storeConfig={storeConfig}
        forcedThemeId={urlPreviewTheme || activeInitialTheme || storeConfig.active_theme_id || storeConfig.activeThemeId}
        customConfig={isSandboxMode && sandboxDraftConfig ? sandboxDraftConfig : (storeConfig as any).themeCustomization}
        storeTheme="light"
        whiteLabelConfig={whiteLabelConfig}
        allProducts={products.length > 0 ? products : (isSandboxMode ? FALLBACK_STUDIO_PRODUCTS : [])}
        filteredProducts={filteredProducts.length > 0 ? filteredProducts : (isSandboxMode ? FALLBACK_STUDIO_PRODUCTS : [])}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
        selectedProduct={selectedProduct}
        onSelectProduct={handleSelectProduct}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onOpenTunnel={handleOpenTunnel}
        getProductWhatsAppUrl={getProductWhatsAppUrl}
        isPublicView={!isSandboxMode}
        isAdminPreview={isSandboxMode}
        isStoreAdmin={isSandboxMode}
        isProductEditor={isSandboxMode}
        canDelete={isSandboxMode}
        displayBanners={[
          {
            image: (isSandboxMode && sandboxDraftConfig?.heroBannerImageUrl) || storeConfig.bannerImage || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80",
            badge: (isSandboxMode && sandboxDraftConfig?.heroSubtitle) || "OFFRE SPÉCIALE",
            title: (isSandboxMode && sandboxDraftConfig?.heroTitle) || storeConfig.storeName,
            subtitle: (isSandboxMode && sandboxDraftConfig?.heroDescription) || storeConfig.welcomeText
          }
        ]}
        bannerIndex={0}
        bannerScrollRef={{ current: null }}
        onScrollBanner={() => {}}
      />

      {/* 2. Barre Flottante Panier pour le Client */}
      {cartCount > 0 && (
        <aside 
          aria-label="Panier et Commande" 
          className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-50 bg-emerald-600 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-3 duration-200 border border-emerald-400"
        >
          <div>
            <div className="text-xs font-bold text-emerald-100 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{cartCount} article{cartCount > 1 ? 's' : ''} au panier</span>
            </div>
            <div className="text-base font-black text-white">
              {formatCFA(cartTotal)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-emerald-200 hover:text-white p-2 text-xs font-bold cursor-pointer"
            >
              Vider
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setCheckoutDirectItem(null);
                setShowCheckoutDrawer(true);
              }}
              className="bg-slate-950 hover:bg-slate-900 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition"
            >
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Commander</span>
            </button>
          </div>
        </aside>
      )}

      {/* 3. Fiche Produit au Clic */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          storeName={storeConfig.storeName}
          whatsappPhone={storeConfig.whatsappPhone}
          merchantId={targetStoreId}
          onClose={() => handleSelectProduct(null)}
          onAddToCart={handleAddToCart}
          onDirectCheckout={(prod, qty) => {
            handleSelectProduct(null);
            handleBuyNow(prod, qty);
          }}
          onOpenTunnel={handleOpenTunnel}
          isPublicView={true}
        />
      )}

      {/* 4. Caisse Checkout Principale Sebpay Pop-in */}
      {showCheckoutDrawer && (
        <UltimateCheckout
          isModal={true}
          isOpen={showCheckoutDrawer}
          product={checkoutPayload}
          amount={checkoutAmount}
          currency="FCFA"
          orderDescription={checkoutPayload ? `Commande : ${checkoutPayload.name}` : `Commande ${storeConfig.storeName}`}
          storeName={storeConfig.storeName}
          wPhone={storeConfig.whatsappPhone}
          whatsappPhone={storeConfig.whatsappPhone}
          onClose={() => {
            setShowCheckoutDrawer(false);
            setCheckoutDirectItem(null);
          }}
          onCancel={() => {
            setShowCheckoutDrawer(false);
            setCheckoutDirectItem(null);
          }}
          onBackToStore={() => {
            setShowCheckoutDrawer(false);
            setCheckoutDirectItem(null);
          }}
          onSuccess={() => {
            setShowCheckoutDrawer(false);
            setCheckoutDirectItem(null);
            setCart([]);
          }}
          items={checkoutDirectItem ? [checkoutDirectItem] : cart}
          storeConfig={storeConfig}
          merchantId={targetStoreId}
          onClearCart={() => setCart([])}
        />
      )}

      {/* 5. Modales Légales & Suivi de Commande Client */}
      <StoreLegalAndTrackingModals
        storeName={storeConfig.storeName}
        whatsappNumber={storeConfig.whatsappPhone}
        footerAddress={(storeConfig as any).footerAddress}
        storeSlug={resolvedStoreSlug}
        merchantId={targetStoreId}
        customConfig={(storeConfig as any).themeCustomization || storeConfig}
      />

      {/* 6. Coffre de Confirmation VIP & Facture Instantanée (0ms Post-Achat) */}
      <OrderConfirmationVaultModal
        storeName={storeConfig.storeName}
        whatsappNumber={storeConfig.whatsappPhone}
        storeSlug={resolvedStoreSlug}
      />
    </div>
  );
};

export default PublicStorefrontPage;
