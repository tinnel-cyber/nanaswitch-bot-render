import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { VendorCommandBar } from '../../../components/storeBuilder/VendorCommandBar';
import { ThemeCustomizerSidebar } from '../../../components/storeBuilder/ThemeCustomizerSidebar';
import { CustomThemeArchitectSidebar } from '../../../components/storeBuilder/CustomThemeArchitectSidebar';
import { SlidersHorizontal } from 'lucide-react';
import { ConstructorErrorBoundary } from '../../../components/storeBuilder/ConstructorErrorBoundary';
import { ThemePresetsAndDraftManager } from '../../../components/storeBuilder/ThemePresetsAndDraftManager';
import { ThemeWrapper } from '../../../themes/ThemeWrapper';
import { triggerOpenFunnel } from '../../../themes/themeUtils';
import { ThemeSelectorModal } from '../../../components/theme/ThemeSelectorModal';
import { AddProductModal } from '../../../components/storeBuilder/AddProductModal';
import { QuickCatalogDrawer } from '../../../components/storeBuilder/QuickCatalogDrawer';
import { KycVerificationModal } from '../../../components/storeBuilder/KycVerificationModal';
import { StoreLegalAndTrackingModals } from '../../../components/storeBuilder/StoreLegalAndTrackingModals';
import { StoreConfig, StoreProductItem } from '../../../components/storeBuilder/types';
import { FALLBACK_STUDIO_PRODUCTS, getDefaultCustomConfig } from '../../../components/storeBuilder/themeStudioConstants';
import { InventoryProduct, StoreUser, StoreSubscription, KycStatus, ThemeCustomizationConfig } from '../../../types';
import { supabase } from '@/lib/supabase';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';
import { ensureMandatoryStoreSlug, ensureMandatoryProductSlug, getSafeStoreSlug } from '../../../utils/slugEngine';
import { getThemeRoutePrefix } from '../../../utils/themeRoutePrefix';
import { ensureAndPersistTenantSlug } from '../../../utils/slugService';
import { buildPublicShopUrl } from '../../../config/domains';
import { isSuperAdminLocally } from '../../../services/superAdminService';

interface StoreStudioPageProps {
  storeId?: string;
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  inventory?: InventoryProduct[];
  onBackToDashboard?: () => void;
  onNavigate?: (path: string) => void;
  initialOpenThemes?: boolean;
  onAddInventoryProduct?: (product: InventoryProduct) => void;
}

export const StoreStudioPage: React.FC<StoreStudioPageProps> = ({
  storeId: propStoreId,
  currentUser,
  subscription,
  inventory = [],
  onBackToDashboard,
  onNavigate,
  initialOpenThemes,
  onAddInventoryProduct
}) => {
  // 1. Détermination de l'ID effectif de boutique (priorité absolue à l'UID authentifié)
  const targetStoreId = useMemo(() => {
    if (currentUser?.uid) return currentUser.uid;
    if (propStoreId) return propStoreId;
    if (currentUser?.storeId) return currentUser.storeId;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qStore = params.get('store') || params.get('storeId') || params.get('shop');
      if (qStore) return qStore;
    }
    return 'store-konkobo-telecom';
  }, [currentUser?.uid, propStoreId, currentUser?.storeId]);

  // Produits personnalisés locaux du Studio (chargés depuis le cache du tenant)
  const [studioCustomProducts, setStudioCustomProducts] = useState<InventoryProduct[]>(() => {
    try {
      const customKey = `nana_tenant_${targetStoreId}_custom_store_products`;
      const invKey = `nana_tenant_${targetStoreId}_inventory`;
      const rawCustom = typeof window !== 'undefined' ? localStorage.getItem(customKey) : null;
      const rawInv = typeof window !== 'undefined' ? localStorage.getItem(invKey) : null;
      const parsedCustom: InventoryProduct[] = rawCustom ? JSON.parse(rawCustom) : [];
      const parsedInv: InventoryProduct[] = rawInv ? JSON.parse(rawInv) : [];
      const mergedMap = new Map<string, InventoryProduct>();
      [...parsedCustom, ...parsedInv].forEach(p => {
        if (p && p.id && !mergedMap.has(p.id)) mergedMap.set(p.id, p);
      });
      return Array.from(mergedMap.values());
    } catch {
      return [];
    }
  });

  // 2. Feedback utilisateur & Toasts (Déclaré en premier pour garantir l'absence de TDZ)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // 3. Mode Viewport & États d'interface
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [mobileActiveSlide, setMobileActiveSlide] = useState<'editor' | 'preview'>('preview');
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(true);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // Gestion du geste tactile (Swipe gauche/droite) pour faire défiler Modules <-> Vitrine sur Mobile
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    
    // Seulement si le mouvement horizontal est prédominant et suffisant (> 50px)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        // Swipe vers la gauche -> Aller vers Vitrine en Direct
        setMobileActiveSlide('preview');
        playTapBeep();
      } else {
        // Swipe vers la droite -> Aller vers Modules & Personnalisation
        setMobileActiveSlide('editor');
        setIsCustomizerOpen(true);
        playTapBeep();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  }, []);

  // 4. Modales d'administration & Tiroirs d'action
  const optimisticThemeRef = useRef<{ themeId: string; timestamp: number } | null>(null);
  const [showThemeSelectorModal, setShowThemeSelectorModal] = useState<boolean>(() => {
    if (initialOpenThemes !== undefined) return initialOpenThemes;
    return true;
  });
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [showKycModal, setShowKycModal] = useState<boolean>(false);
  const [isQuickCatalogOpen, setIsQuickCatalogOpen] = useState<boolean>(false);
  const [showPresetsModal, setShowPresetsModal] = useState<boolean>(false);
  const [blueprintSafetyToast, setBlueprintSafetyToast] = useState<{ message: string; previousConfig: ThemeCustomizationConfig } | null>(null);
  const [productToEdit, setProductToEdit] = useState<any | null>(null);
  const [addProductInitialCard, setAddProductInitialCard] = useState<number | undefined>(undefined);
  const [activeCustomizerAccordion, setActiveCustomizerAccordion] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous les produits');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<StoreProductItem | null>(null);

  // 5. Statut KYC (Exemption totale Super Admin)
  const isSuperAdmin = isSuperAdminLocally(currentUser);
  const [kycStatus, setKycStatus] = useState<KycStatus>(() => {
    if (isSuperAdminLocally(currentUser)) return 'verified';
    if (currentUser?.kycStatus) return currentUser.kycStatus;
    try {
      const local = localStorage.getItem(`nana_tenant_${targetStoreId}_kyc_status`) as KycStatus;
      if (local) return local;
    } catch {}
    return 'verified';
  });

  // 6. Configuration de la boutique chargée depuis Firestore ou cache local
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(() => {
    const localActiveTheme = (typeof window !== 'undefined' ? (
      localStorage.getItem('nana_active_theme_id') ||
      (currentUser?.uid ? localStorage.getItem(`nana_boutique_theme_id_${currentUser.uid}`) : null) ||
      localStorage.getItem(`nana_boutique_theme_id_${targetStoreId}`) ||
      localStorage.getItem('nana_boutique_theme_id')
    ) : null);

    try {
      const cached = localStorage.getItem(`nana_tenant_${targetStoreId}_store_config`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (localActiveTheme) {
          parsed.active_theme_id = localActiveTheme;
          parsed.activeThemeId = localActiveTheme;
        }
        return parsed;
      }
    } catch {}
    return {
      storeName: currentUser?.storeName || 'Ma Boutique Studio',
      whatsappPhone: currentUser?.phone || '',
      welcomeText: 'Bienvenue sur notre boutique officielle',
      logoUrl: '',
      bannerImage: '',
      currency: 'CFA',
      slug: targetStoreId.replace(/^store-/, ''),
      active_theme_id: localActiveTheme || 'theme-beauty-emerald',
      activeThemeId: localActiveTheme || 'theme-beauty-emerald',
      theme: 'dark'
    };
  });

  // 7. Thème actif & Slug effectif
  const activeThemeId = useMemo(() => {
    return storeConfig.active_theme_id || storeConfig.activeThemeId || 'theme-beauty-emerald';
  }, [storeConfig.active_theme_id, storeConfig.activeThemeId]);

  const effectiveStoreSlug = useMemo(() => {
    return (storeConfig.slug || storeConfig.storeName || targetStoreId).replace(/^store-/, '');
  }, [storeConfig.slug, storeConfig.storeName, targetStoreId]);

  const storeSlug = getSafeStoreSlug(storeConfig, currentUser as any) || storeConfig?.slug || currentUser?.storeId || currentUser?.uid || 'ma-boutique';

  // 8. Personnalisation Thème : Saved & Draft
  const [savedThemeConfig, setSavedThemeConfig] = useState<ThemeCustomizationConfig>(() => {
    try {
      const cached = localStorage.getItem(`nana_studio_${targetStoreId}_theme_customization`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
    return getDefaultCustomConfig(currentUser?.storeName, currentUser?.phone);
  });

  // Clé d'auto-sauvegarde sécurisée (multi-tenant & compte commerçant)
  const autoDraftKey = currentUser?.uid ? `nanasore_auto_draft_${currentUser.uid}` : `nanasore_auto_draft_${targetStoreId}`;

  // Récupération Anti-Coupure au démarrage
  const [draftThemeConfig, setDraftThemeConfig] = useState<ThemeCustomizationConfig>(() => {
    try {
      const localDraftRaw = localStorage.getItem(autoDraftKey) || localStorage.getItem('nanasore_studio_draft_' + targetStoreId);
      if (localDraftRaw) {
        const parsed = JSON.parse(localDraftRaw);
        if (parsed?.config && typeof parsed.config === 'object') {
          return parsed.config;
        }
        if (parsed?.customSections || parsed?.customMood) {
          return parsed;
        }
      }
    } catch {}
    return savedThemeConfig;
  });

  // Indicateur d'Auto-Save en continu
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string>(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);

  // Pile d'Historique pour Undo / Redo (Jusqu'à 20 états)
  const [historyStack, setHistoryStack] = useState<ThemeCustomizationConfig[]>([]);
  const [redoStack, setRedoStack] = useState<ThemeCustomizationConfig[]>([]);
  const isUndoRedoActive = useRef<boolean>(false);

  // Détection des modifications non publiées
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(draftThemeConfig) !== JSON.stringify(savedThemeConfig);
  }, [draftThemeConfig, savedThemeConfig]);

  // 9. Produits & Catégories (Unification Inventaire POS + Produits ajoutés dans Studio)
  const allProducts: StoreProductItem[] = useMemo(() => {
    // Fusionner l'inventaire en prop avec les produits personnalisés du studio
    const combinedMap = new Map<string, any>();
    
    // 1. D'abord les produits locaux du studio
    studioCustomProducts.forEach(p => {
      if (p && p.id) combinedMap.set(p.id, p);
    });

    // 2. Ensuite les produits passés par inventory prop
    (inventory || []).forEach(p => {
      if (p && p.id) combinedMap.set(p.id, p);
    });

    const combinedList = Array.from(combinedMap.values());

    if (combinedList.length > 0) {
      return combinedList.map((inv: any, idx) => {
        const prodSlug = ensureMandatoryProductSlug({
          id: inv.id || `p-${idx}`,
          name: inv.name,
          slug: inv.slug || inv.productSlug
        });
        return {
          id: inv.id || `p-${idx}`,
          name: inv.name,
          slug: prodSlug,
          productSlug: prodSlug,
          price: inv.sellingPrice || inv.salePrice || inv.price || 0,
          originalPrice: inv.originalPrice || (inv.price ? inv.price * 1.2 : 0),
          category: inv.category || 'Tous les produits',
          image: inv.photoUrl || inv.imageUrl || inv.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
          stock: inv.stock !== undefined ? inv.stock : (inv.currentStock || 10),
          description: inv.richDescription || inv.description || '',
          richDescription: inv.richDescription || inv.description || '',
          shortDescription: inv.shortDescription || '',
          badge: inv.badge || (idx === 0 ? 'Top Vente' : undefined),
          linkedFunnelId: inv.linkedFunnelId,
          funnelDisplayMode: inv.funnelDisplayMode,
          colorSwatches: inv.colorSwatches,
          sizeOptions: inv.sizeOptions,
          keyFeatures: inv.keyFeatures,
          routineVideoUrls: inv.routineVideoUrls,
          bundleProductIds: inv.bundleProductIds,
          bundleDiscountPercent: inv.bundleDiscountPercent,
          liveLotBadge: inv.liveLotBadge
        };
      });
    }
    return FALLBACK_STUDIO_PRODUCTS.map(p => ({
      ...p,
      slug: ensureMandatoryProductSlug(p),
      productSlug: ensureMandatoryProductSlug(p)
    }));
  }, [inventory, studioCustomProducts]);

  const categories = useMemo(() => {
    const set = new Set<string>(['Tous les produits']);
    allProducts.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter(p => {
      const matchCat = selectedCategory === 'Tous les produits' || p.category === selectedCategory;
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [allProducts, selectedCategory, searchQuery]);

  // 10. Méthodes et Callbacks d'actions (Undo, Redo, Publish, Reset, etc.)
  const handleConfigChange = useCallback((newConfig: ThemeCustomizationConfig) => {
    if (!isUndoRedoActive.current) {
      setDraftThemeConfig(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(newConfig)) {
          setHistoryStack(h => [...h.slice(-19), prev]);
          setRedoStack([]);
        }
        return newConfig;
      });
    } else {
      setDraftThemeConfig(newConfig);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (historyStack.length === 0) return;
    playTapBeep();
    const previous = historyStack[historyStack.length - 1];
    isUndoRedoActive.current = true;
    setRedoStack(r => [...r, draftThemeConfig]);
    setHistoryStack(h => h.slice(0, h.length - 1));
    setDraftThemeConfig(previous);
    setTimeout(() => {
      isUndoRedoActive.current = false;
    }, 50);
    showToast('↩️ Modification annulée');
  }, [historyStack, draftThemeConfig, showToast]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    playTapBeep();
    const next = redoStack[redoStack.length - 1];
    isUndoRedoActive.current = true;
    setHistoryStack(h => [...h, draftThemeConfig]);
    setRedoStack(r => r.slice(0, r.length - 1));
    setDraftThemeConfig(next);
    setTimeout(() => {
      isUndoRedoActive.current = false;
    }, 50);
    showToast('↪️ Modification rétablie');
  }, [redoStack, draftThemeConfig, showToast]);

  const handlePublishTheme = useCallback(async () => {
    if (!targetStoreId) return;
    setIsPublishing(true);
    try {
      const blankIndex = draftThemeConfig.blankIndex || storeConfig.blankThemeIndex || 1;
      const prefix = getThemeRoutePrefix(activeThemeId, blankIndex);
      const publicShopUrl = buildPublicShopUrl(effectiveStoreSlug, { themeId: activeThemeId, blankIndex });

      const storePayload = {
        themeCustomization: draftThemeConfig,
        activeThemeId: activeThemeId,
        active_theme_id: activeThemeId,
        activeThemePrefix: prefix,
        blankThemeIndex: blankIndex,
        publicShopUrl: publicShopUrl,
        slug: effectiveStoreSlug,
        storeSlug: effectiveStoreSlug,
        tenantSlug: effectiveStoreSlug,
        themeRoutePattern: 'https://nsore.shop/{themePrefix}/{storeSlug}',
        productRoutePattern: 'https://nsore.shop/{themePrefix}/{storeSlug}/p/{productSlug}',
        funnelRoutePattern: 'https://nsore.shop/{themePrefix}/{storeSlug}/f/{funnelSlug}',
        storeName: draftThemeConfig.storeName || storeConfig.storeName,
        whatsappPhone: draftThemeConfig.whatsappNumber || storeConfig.whatsappPhone,
        logoUrl: draftThemeConfig.logoUrl || storeConfig.logoUrl,
        bannerImage: draftThemeConfig.heroBannerImageUrl || storeConfig.bannerImage,
        updatedAt: new Date().toISOString()
      };

      // 1. Publication prioritaire Supabase SQL (table public.app_registry & public.tenants)
      try {
        await supabase
          .from('app_registry')
          .upsert({
            key: `theme_config_${targetStoreId}`,
            name: 'theme_config',
            tenant_id: targetStoreId,
            module_key: 'theme_config',
            theme_key: activeThemeId,
            config_json: {
              activeThemeId,
              active_theme_id: activeThemeId,
              themePrefix: prefix,
              publicShopUrl,
              storeSlug: effectiveStoreSlug,
              customConfig: draftThemeConfig,
              colors: {
                primary: draftThemeConfig.primaryAccentColor || '#2563EB',
                background: draftThemeConfig.backgroundColor || '#FBF9F5',
              },
              updated_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });

        const isStoreUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetStoreId);
        if (isStoreUUID) {
          await supabase
            .from('tenants')
            .upsert({
              id: targetStoreId,
              name: draftThemeConfig.storeName || storeConfig.storeName,
              slug: effectiveStoreSlug,
              logo_url: draftThemeConfig.logoUrl || storeConfig.logoUrl,
              primary_color: draftThemeConfig.primaryAccentColor || '#2563EB',
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' }).catch(() => {});
        }
      } catch (sbErr) {
        console.warn('[Studio] Notice publication Supabase SQL:', sbErr);
      }

      // 3. Synchronisation du slug centralisé
      try {
        await ensureAndPersistTenantSlug(
          targetStoreId,
          {
            ...storePayload,
            storeName: draftThemeConfig.storeName || storeConfig.storeName
          },
          currentUser?.uid || targetStoreId,
          { themeId: activeThemeId, blankIndex }
        );
      } catch (slugErr) {
        console.warn('[Studio] Notice persistance slug :', slugErr);
      }

      setSavedThemeConfig(draftThemeConfig);
      try {
        localStorage.setItem(`nana_studio_${targetStoreId}_theme_customization`, JSON.stringify(draftThemeConfig));
        localStorage.setItem('nana_active_theme_prefix', prefix);
        localStorage.setItem('nana_public_shop_url', publicShopUrl);
      } catch {}
      showToast(`✅ Vitrine publiée sur nsore.shop/${prefix}/${effectiveStoreSlug} !`);
      playValidationBeep();
    } catch (err) {
      console.error('[Studio] Erreur publication vitrine:', err);
      showToast('❌ Erreur lors de la publication de la vitrine');
    } finally {
      setIsPublishing(false);
    }
  }, [targetStoreId, draftThemeConfig, activeThemeId, effectiveStoreSlug, storeConfig, currentUser, showToast]);

  const handleResetTheme = useCallback(() => {
    playTapBeep();
    setDraftThemeConfig(savedThemeConfig);
    showToast('🔄 Personnalisation réinitialisée aux valeurs sauvegardées');
  }, [savedThemeConfig, showToast]);

  const handleDeleteProduct = useCallback(async (productId: string, productName: string) => {
    try {
      playTapBeep();
      const updated = studioCustomProducts.filter(p => p.id !== productId);
      setStudioCustomProducts(updated);

      const customKey = `nana_tenant_${targetStoreId}_custom_store_products`;
      localStorage.setItem(customKey, JSON.stringify(updated));

      const invKey = `nana_tenant_${targetStoreId}_inventory`;
      const existingInvRaw = localStorage.getItem(invKey);
      if (existingInvRaw) {
        try {
          const inv: any[] = JSON.parse(existingInvRaw);
          localStorage.setItem(invKey, JSON.stringify(inv.filter(p => p.id !== productId)));
        } catch {}
      }

      await supabase
        .from('app_registry')
        .upsert({
          key: `products_${targetStoreId}`,
          name: 'store_products',
          tenant_id: targetStoreId,
          module_key: 'products',
          config_json: {
            products: updated,
            updated_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      const cleanSlug = effectiveStoreSlug;
      if (cleanSlug && cleanSlug !== targetStoreId) {
        await supabase
          .from('app_registry')
          .upsert({
            key: `products_${cleanSlug}`,
            name: 'store_products',
            tenant_id: cleanSlug,
            module_key: 'products',
            config_json: {
              products: updated,
              updated_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
      }

      const isStoreUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
      if (isStoreUUID) {
        await supabase.from('products').delete().eq('id', productId).catch(() => {});
      }

      showToast(`🗑️ "${productName}" supprimé avec succès !`);
    } catch (err) {
      console.warn('Erreur suppression produit:', err);
      showToast(`🗑️ "${productName}" retiré`);
    }
  }, [studioCustomProducts, targetStoreId, effectiveStoreSlug, showToast]);

  const handleBackToDashboard = useCallback(() => {
    playTapBeep();
    if (onBackToDashboard) {
      onBackToDashboard();
    } else if (onNavigate) {
      onNavigate('/dashboard');
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [onBackToDashboard, onNavigate]);

  // 11. Effets secondaires

  // Synchronisation globale du slug dans l'objet window
  useEffect(() => {
    if (typeof window !== 'undefined' && storeSlug) {
      (window as any).storeSlug = storeSlug;
    }
  }, [storeSlug]);

  // Sauvegarde automatique instantanée (localStorage + debounce)
  useEffect(() => {
    if (!targetStoreId) return;
    try {
      setIsAutoSaving(true);
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const payload = {
        updatedAt: Date.now(),
        timeStr,
        config: draftThemeConfig
      };
      if (currentUser?.uid) {
        localStorage.setItem(`nanasore_auto_draft_${currentUser.uid}`, JSON.stringify(payload));
      }
      localStorage.setItem(`nanasore_auto_draft_${targetStoreId}`, JSON.stringify(payload));
      localStorage.setItem('nanasore_studio_draft_' + targetStoreId, JSON.stringify(draftThemeConfig));

      // Persistance du brouillon Sandbox Admin pour prévisualisation 0ms sans tenant
      localStorage.setItem('nanasore_studio_draft_sandbox', JSON.stringify({
        updatedAt: Date.now(),
        themeId: activeThemeId,
        config: draftThemeConfig
      }));
      localStorage.setItem('nanasore_studio_draft_latest', JSON.stringify(draftThemeConfig));
      if (allProducts && allProducts.length > 0) {
        localStorage.setItem('nanasore_studio_products_sandbox', JSON.stringify(allProducts));
      }

      setLastAutoSaveTime(timeStr);
      const timer = setTimeout(() => setIsAutoSaving(false), 400);
      return () => clearTimeout(timer);
    } catch (err) {
      console.warn('Erreur auto-save brouillon studio:', err);
    }
  }, [draftThemeConfig, targetStoreId, currentUser?.uid]);

  // Alerte de récupération anti-coupure au montage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(autoDraftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.updatedAt && parsed?.config) {
          const time = parsed.timeStr || new Date(parsed.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          showToast(`☁️ Brouillon de travail restauré (${time})`);
        }
      }
    } catch {}
  }, [autoDraftKey, showToast]);

  // Écoute de l'événement de sécurité Blueprint
  useEffect(() => {
    const handleSafetyEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ message: string; previousConfig: ThemeCustomizationConfig }>;
      if (customEvt.detail) {
        setBlueprintSafetyToast(customEvt.detail);
      }
    };
    window.addEventListener('nana:blueprint_safety_toast', handleSafetyEvent as EventListener);
    return () => window.removeEventListener('nana:blueprint_safety_toast', handleSafetyEvent as EventListener);
  }, []);

  // Raccourcis Clavier Globaux (Ctrl+Z / Cmd+Z & Ctrl+Y / Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Synchronisation réactive immédiate du style d'en-tête et pied de page
  useEffect(() => {
    const handleHeaderChange = (e: Event) => {
      const customEvt = e as CustomEvent<any>;
      if (customEvt.detail) {
        setDraftThemeConfig(prev => ({
          ...prev,
          headerStyle: customEvt.detail
        }));
      }
    };
    const handleFooterChange = (e: Event) => {
      const customEvt = e as CustomEvent<any>;
      const style = customEvt.detail?.style || customEvt.detail;
      if (style) {
        setDraftThemeConfig(prev => ({
          ...prev,
          footerStyle: style
        }));
      }
    };
    const handleUpdateThemeField = (e: Event) => {
      const customEvt = e as CustomEvent<{ field: string; value: any }>;
      if (!customEvt.detail) return;
      const { field, value } = customEvt.detail;
      setDraftThemeConfig(prev => {
        if (!field) return prev;
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          const flatKey = `${parent}${child.charAt(0).toUpperCase() + child.slice(1)}`;
          return {
            ...prev,
            [parent]: {
              ...((prev as any)[parent] || {}),
              [child]: value
            },
            [flatKey]: value
          };
        }

        // Si champ plat subBanner1Title / subBanner2Title, alimenter aussi l'objet imbriqué
        const subBannerMatch = field.match(/^(subBanner[12])([A-Z].*)$/);
        if (subBannerMatch) {
          const parent = subBannerMatch[1];
          const rawProp = subBannerMatch[2];
          const child = rawProp.charAt(0).toLowerCase() + rawProp.slice(1);
          return {
            ...prev,
            [field]: value,
            [parent]: {
              ...((prev as any)[parent] || {}),
              [child]: value
            }
          };
        }

        return {
          ...prev,
          [field]: value
        };
      });
    };

    const handleUpdateSectionContent = (e: Event) => {
      const customEvt = e as CustomEvent<{ sectionId: string; field: string; value: any }>;
      if (!customEvt.detail) return;
      const { sectionId, field, value } = customEvt.detail;
      setDraftThemeConfig(prev => {
        const sections = (prev.customSections || []).map(sec => {
          if (sec.id !== sectionId) return sec;
          const isStandardProp = ['title', 'subtitle', 'description', 'visible'].includes(field);
          return {
            ...sec,
            ...(isStandardProp ? { [field]: value } : {}),
            settings: {
              ...(sec.settings || {}),
              [field]: value
            }
          };
        });
        return {
          ...prev,
          customSections: sections
        };
      });
    };

    const handleOpenAccordion = (e: Event) => {
      const customEvt = e as CustomEvent<{ accordionIndex: number }>;
      if (customEvt.detail?.accordionIndex !== undefined) {
        setIsCustomizerOpen(true);
        setActiveCustomizerAccordion(customEvt.detail.accordionIndex);
      }
    };

    const handleConfigureSection = (e: Event) => {
      const customEvt = e as CustomEvent<{ sectionId: string }>;
      if (customEvt.detail?.sectionId) {
        setIsCustomizerOpen(true);
        setSelectedSectionId(customEvt.detail.sectionId);
      }
    };

    window.addEventListener('nana_change_header_style', handleHeaderChange);
    window.addEventListener('nana_change_footer_style', handleFooterChange);
    window.addEventListener('nana_update_theme_field', handleUpdateThemeField);
    window.addEventListener('nana_update_section_content', handleUpdateSectionContent);
    window.addEventListener('nana_open_customizer_accordion', handleOpenAccordion);
    window.addEventListener('nana_configure_custom_section', handleConfigureSection);
    return () => {
      window.removeEventListener('nana_change_header_style', handleHeaderChange);
      window.removeEventListener('nana_change_footer_style', handleFooterChange);
      window.removeEventListener('nana_update_theme_field', handleUpdateThemeField);
      window.removeEventListener('nana_update_section_content', handleUpdateSectionContent);
      window.removeEventListener('nana_open_customizer_accordion', handleOpenAccordion);
      window.removeEventListener('nana_configure_custom_section', handleConfigureSection);
    };
  }, []);

  // Écoute temps réel Supabase Realtime (avec fetch initial) pour synchroniser storeConfig, activeThemeId et themeCustomization
  useEffect(() => {
    if (!targetStoreId) return;

    let isSubscribed = true;

    // 1. Initial Fetch (Supabase app_registry + tenants)
    const initThemeAndStore = async () => {
      try {
        if (!isSubscribed) return;

        // Compléter avec la configuration Supabase app_registry
        const { data: registryData } = await supabase
          .from('app_registry')
          .select('*')
          .eq('tenant_id', targetStoreId)
          .eq('module_key', 'theme_config')
          .maybeSingle();

        if (isSubscribed && registryData?.config_json) {
          const cfg = registryData.config_json;
          const themeId = cfg.activeThemeId || cfg.active_theme_id;
          if (themeId) {
            setStoreConfig(prev => ({
              ...prev,
              active_theme_id: themeId,
              activeThemeId: themeId
            }));
          }
          if (cfg.customConfig) {
            setSavedThemeConfig(cfg.customConfig);
          }
        }

        // Charger les produits synchronisés depuis Supabase app_registry
        const { data: prodData } = await supabase
          .from('app_registry')
          .select('config_json')
          .eq('tenant_id', targetStoreId)
          .eq('module_key', 'products')
          .maybeSingle();

        if (isSubscribed && prodData?.config_json?.products && Array.isArray(prodData.config_json.products) && prodData.config_json.products.length > 0) {
          setStudioCustomProducts(prev => {
            const map = new Map<string, InventoryProduct>();
            prodData.config_json.products.forEach((p: InventoryProduct) => { if (p?.id) map.set(p.id, p); });
            prev.forEach(p => { if (p?.id && !map.has(p.id)) map.set(p.id, p); });
            return Array.from(map.values());
          });
        }
      } catch (initErr) {
        console.warn('[Studio Supabase] Erreur initialisation store/thème:', initErr);
      }
    };

    initThemeAndStore();

    // 2. Écouteur Supabase Realtime (remplace Firestore onSnapshot pour les thèmes)
    const channelName = `studio_theme_sync_${targetStoreId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_registry',
          filter: `tenant_id=eq.${targetStoreId}`,
        },
        (payload) => {
          if (!isSubscribed) return;
          const newRecord = payload.new as any;
          if (newRecord && newRecord.module_key === 'theme_config') {
            const cfg = newRecord.config_json;
            const newTheme = cfg?.activeThemeId || cfg?.active_theme_id;
            if (newTheme) {
              setStoreConfig(prev => ({
                ...prev,
                active_theme_id: newTheme,
                activeThemeId: newTheme
              }));
            }
            if (cfg?.customConfig) {
              setSavedThemeConfig(cfg.customConfig);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Studio Supabase Realtime] Écouteur actif pour tenant: ${targetStoreId}`);
        }
      });

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [targetStoreId, currentUser, savedThemeConfig]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white font-sans select-none overflow-hidden">
      {/* Toast Flottant Studio */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[2000] bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-in fade-in slide-in-from-top-4 duration-200">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Toast Flottant de Sécurité Blueprint (Anti-Perte de Travail) */}
      {blueprintSafetyToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[2500] bg-blue-600 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400 animate-in fade-in slide-in-from-top-4 duration-300">
          <span>{blueprintSafetyToast.message}</span>
          <button
            type="button"
            onClick={() => {
              handleConfigChange(blueprintSafetyToast.previousConfig);
              setBlueprintSafetyToast(null);
              showToast('↩️ Ancien design restauré avec succès !');
            }}
            className="bg-white text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-xl text-xs font-black shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            ↩️ Revenir à mon design précédent
          </button>
          <button
            type="button"
            onClick={() => setBlueprintSafetyToast(null)}
            className="text-white/80 hover:text-white p-1 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Top Command Bar (Fixe en haut avec retour Dashboard) */}
      <VendorCommandBar
        storeSlug={effectiveStoreSlug}
        storeName={draftThemeConfig.storeName || storeConfig.storeName}
        activeThemeId={activeThemeId}
        viewportMode={viewportMode}
        onViewportChange={setViewportMode}
        isCustomizerOpen={isCustomizerOpen}
        onToggleCustomizer={() => {
          setIsCustomizerOpen(prev => {
            const next = !prev;
            if (next) setMobileActiveSlide('editor');
            return next;
          });
        }}
        onOpenThemes={() => setShowThemeSelectorModal(true)}
        onOpenAddProduct={() => {
          setProductToEdit(null);
          setAddProductInitialCard(undefined);
          setShowAddProductModal(true);
        }}
        onOpenQuickCatalog={() => setIsQuickCatalogOpen(true)}
        productCount={allProducts.length}
        onOpenKyc={() => {
          if (!isSuperAdmin) setShowKycModal(true);
        }}
        kycStatus={isSuperAdmin ? 'verified' : kycStatus}
        onBack={handleBackToDashboard}
        onToast={showToast}
        hasUnsavedChanges={hasUnsavedChanges}
        autoSaveStatus={{
          lastSavedTime: lastAutoSaveTime,
          isSaving: isAutoSaving
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyStack.length > 0}
        canRedo={redoStack.length > 0}
        onOpenPresets={() => setShowPresetsModal(true)}
        savedPresetsCount={draftThemeConfig.savedPresets?.length || 3}
      />

      {/* 2.1 Ruban de Bascule / Slide Mobile (Modules & Personnalisation <--> Aperçu Vitrine en Direct) */}
      <div className="md:hidden flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800 z-30 shrink-0">
        <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 w-full shadow-inner">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setMobileActiveSlide('editor');
              setIsCustomizerOpen(true);
            }}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileActiveSlide === 'editor'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Modules & Personnalisation</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setMobileActiveSlide('preview');
            }}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileActiveSlide === 'preview'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>👁️ Vitrine en Direct</span>
          </button>
        </div>
      </div>

      {/* 2. Zone Workspace Studio : Slider Glissant Gauche / Droite (Modules & Personnalisation <--> Vitrine en Direct) */}
      <div 
        className="flex-1 flex relative overflow-hidden bg-slate-900"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Vue 1 (Mobile & Desktop) : Panneau Latéral (Éditeur / Modules & Personnalisation) */}
        <div 
          className={`h-full z-20 transition-all duration-300 md:block md:w-auto md:flex-initial ${
            mobileActiveSlide === 'editor' 
              ? 'w-full flex-1 block' 
              : 'hidden md:block'
          }`}
        >
          <ConstructorErrorBoundary
            constructorName={activeThemeId === 'theme-blank-custom' ? "Architect (Thème Sur-Mesure)" : "Personnalisateur de Thème"}
            onResetDraft={handleResetTheme}
          >
            {activeThemeId === 'theme-blank-custom' ? (
              <CustomThemeArchitectSidebar
                isOpen={isCustomizerOpen}
                onClose={() => {
                  setIsCustomizerOpen(false);
                  setMobileActiveSlide('preview');
                }}
                config={draftThemeConfig}
                onChange={handleConfigChange}
                products={allProducts}
                categories={categories}
                savedConfig={savedThemeConfig}
                hasUnsavedChanges={hasUnsavedChanges}
                onReset={handleResetTheme}
                onPublish={handlePublishTheme}
                isPublishing={isPublishing}
                selectedSectionId={selectedSectionId}
                onSelectSection={setSelectedSectionId}
                storeSlug={storeConfig.slug || targetStoreId || 'boutique'}
              />
            ) : (
              <ThemeCustomizerSidebar
                isOpen={isCustomizerOpen}
                onClose={() => {
                  setIsCustomizerOpen(false);
                  setMobileActiveSlide('preview');
                }}
                config={draftThemeConfig}
                onChange={handleConfigChange}
                savedConfig={savedThemeConfig}
                hasUnsavedChanges={hasUnsavedChanges}
                products={allProducts}
                onReset={handleResetTheme}
                onPublish={handlePublishTheme}
                isPublishing={isPublishing}
                activeThemeId={activeThemeId}
                initialOpenAccordion={activeCustomizerAccordion}
              />
            )}
          </ConstructorErrorBoundary>
        </div>

        {/* Vue 2 (Mobile & Desktop) : Aperçu Thème en direct (Conteneur neutre 100% isolé) avec scroll étendu et slide mobile */}
        <main 
          className={`flex-1 overflow-y-auto transition-all duration-300 pb-36 ${
            mobileActiveSlide === 'preview' 
              ? 'w-full flex' 
              : 'hidden md:flex'
          } ${
            viewportMode === 'mobile' 
              ? 'py-4 md:py-8 px-2 md:px-4 justify-center items-start bg-slate-900' 
              : 'w-full bg-white justify-center items-start'
          }`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div 
            className={
              viewportMode === 'mobile'
                ? 'w-full max-w-[420px] min-h-[700px] md:h-[840px] rounded-2xl md:rounded-[40px] border-2 md:border-[10px] border-slate-800 bg-white shadow-2xl overflow-y-auto relative shrink-0'
                : 'w-full min-h-full bg-white'
            }
          >
            <ThemeWrapper
              forcedThemeId={activeThemeId}
              storeConfig={{
                ...storeConfig,
                storeName: draftThemeConfig.storeName || storeConfig.storeName,
                whatsappPhone: draftThemeConfig.whatsappNumber || storeConfig.whatsappPhone,
                logoUrl: draftThemeConfig.logoUrl || storeConfig.logoUrl,
                bannerImage: draftThemeConfig.heroBannerImageUrl || storeConfig.bannerImage,
                paymentTickerText: draftThemeConfig.announcementBarText || storeConfig.paymentTickerText,
                showPaymentTicker: draftThemeConfig.announcementBarEnabled !== undefined ? draftThemeConfig.announcementBarEnabled : storeConfig.showPaymentTicker,
                primaryColor: draftThemeConfig.primaryAccentColor || storeConfig.primaryColor,
                active_theme_id: activeThemeId
              }}
              customConfig={draftThemeConfig}
              storeTheme="dark"
              allProducts={allProducts}
              filteredProducts={filteredProducts}
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onClearSearch={() => setSearchQuery('')}
              selectedProduct={selectedProduct}
              onAddToCart={() => showToast('🛒 Article ajouté au panier !')}
              onBuyNow={() => showToast('⚡ Commande directe déclenchée')}
              getProductWhatsAppUrl={() => `https://wa.me/?text=Bonjour`}
              isPublicView={false}
              isStoreAdmin={true}
              isProductEditor={true}
              canDelete={true}
              onDeleteProduct={handleDeleteProduct}
              isAdminPreview={true}
              isSimulatedMobile={viewportMode === 'mobile'}
              onOpenEditProduct={(product) => {
                setProductToEdit(product);
                setShowAddProductModal(true);
              }}
              onEditProduct={(product, options) => {
                setProductToEdit(product);
                setAddProductInitialCard(options?.initialCard);
                setShowAddProductModal(true);
              }}
              onSelectProduct={(product) => {
                setProductToEdit(product);
                setShowAddProductModal(true);
              }}
              onOpenTunnel={(product) => {
                triggerOpenFunnel(product.linkedFunnelId || product.id, product.name, product);
              }}
              onOpenFunnel={(product, e) => {
                if (e && typeof e.stopPropagation === 'function') {
                  e.stopPropagation();
                }
                triggerOpenFunnel(product.linkedFunnelId || product.id, product.name, product);
              }}
              onPreviewFunnel={(product) => {
                triggerOpenFunnel(product.linkedFunnelId || product.id, product.name, product);
              }}
              onSelectCustomizerSection={(sectionIndex) => {
                setIsCustomizerOpen(true);
                setActiveCustomizerAccordion(sectionIndex);
                if (draftThemeConfig.customSections && draftThemeConfig.customSections[sectionIndex]) {
                  setSelectedSectionId(draftThemeConfig.customSections[sectionIndex].id);
                }
              }}
              onConfigureCustomSection={(sectionId) => {
                setIsCustomizerOpen(true);
                setSelectedSectionId(sectionId);
              }}
              onDeployBlueprint={(blueprint) => {
                setDraftThemeConfig(prev => ({
                  ...prev,
                  customMood: blueprint.moodPreset,
                  customSections: blueprint.sections
                }));
                showToast(`⚡ Modèle "${blueprint.name}" déployé avec succès !`);
              }}
              onOpenQuickCatalog={() => setIsQuickCatalogOpen(true)}
              onUpdateCustomSections={(sections) => {
                setDraftThemeConfig(prev => ({
                  ...prev,
                  customSections: sections
                }));
              }}
              onAddCustomSection={(type) => {
                const next = [
                  ...(draftThemeConfig.customSections || []),
                  {
                    id: `sec-${type}-${Date.now()}`,
                    type,
                    title: "Nouvelle Section",
                    enabled: true,
                    visible: true,
                    config: {}
                  }
                ];
                setDraftThemeConfig(prev => ({
                  ...prev,
                  customSections: next
                }));
                showToast("➕ Nouvelle section ajoutée !");
              }}
              displayBanners={[
                {
                  image: draftThemeConfig.heroBannerImageUrl || storeConfig.bannerImage || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80",
                  badge: draftThemeConfig.heroSubtitle || "PROMO EXCLUSIVE",
                  title: draftThemeConfig.heroTitle || draftThemeConfig.storeName || storeConfig.storeName || "Vitrine Studio",
                  subtitle: draftThemeConfig.heroDescription || storeConfig.welcomeText || "Découvrez notre collection"
                }
              ]}
              bannerIndex={0}
              bannerScrollRef={{ current: null }}
              onScrollBanner={() => {}}
              onOpenAddProduct={() => {
                setProductToEdit(null);
                setAddProductInitialCard(undefined);
                setShowAddProductModal(true);
              }}
              onOpenThemeSelector={() => setShowThemeSelectorModal(true)}
            />
          </div>

          {/* Bouton Flottant Mobile pour rebasculer d'un clic vers l'Éditeur */}
          <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setMobileActiveSlide('editor');
                setIsCustomizerOpen(true);
              }}
              className="px-5 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-2xl shadow-blue-600/50 flex items-center gap-2 border border-blue-400 active:scale-95 transition-all cursor-pointer select-none"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Modifier les Modules</span>
            </button>
          </div>
        </main>
      </div>

      {/* 3. Modales du Studio */}
      {showThemeSelectorModal && (
        <ThemeSelectorModal
          isOpen={showThemeSelectorModal}
          onClose={() => setShowThemeSelectorModal(false)}
          currentThemeId={activeThemeId}
          targetStoreId={targetStoreId}
          onThemeActivated={async (newThemeId) => {
            optimisticThemeRef.current = { themeId: newThemeId, timestamp: Date.now() };
            const prefix = getThemeRoutePrefix(newThemeId);
            setStoreConfig(prev => ({ 
              ...prev, 
              active_theme_id: newThemeId, 
              activeThemeId: newThemeId,
              activeThemePrefix: prefix
            }));
            try {
              if (typeof window !== 'undefined') {
                (window as any).activeThemeId = newThemeId;
                (window as any).activeThemePrefix = prefix;
                localStorage.setItem('nana_active_theme_id', newThemeId);
                localStorage.setItem('nana_boutique_theme_id', newThemeId);
                if (targetStoreId) {
                  localStorage.setItem(`nana_boutique_theme_id_${targetStoreId}`, newThemeId);
                }
                if (currentUser?.uid) {
                  localStorage.setItem(`nana_boutique_theme_id_${currentUser.uid}`, newThemeId);
                }
                localStorage.setItem('nana_active_theme_prefix', prefix);
              }

              if (targetStoreId) {
                const currentSlug = storeConfig.slug || storeConfig.storeName || targetStoreId;
                const finalSlug = ensureMandatoryStoreSlug(
                  currentSlug,
                  storeConfig.storeName,
                  currentUser?.email || currentUser?.displayName,
                  currentUser?.uid || targetStoreId
                );
                const publicShopUrl = buildPublicShopUrl(finalSlug, { themeId: newThemeId });
                if (typeof window !== 'undefined') {
                  localStorage.setItem('nana_public_shop_url', publicShopUrl);
                }

                await ensureAndPersistTenantSlug(
                  targetStoreId,
                  {
                    ...storeConfig,
                    slug: finalSlug,
                    storeSlug: finalSlug,
                    activeThemeId: newThemeId,
                    active_theme_id: newThemeId,
                    themeId: newThemeId,
                    activeThemePrefix: prefix,
                    publicShopUrl: publicShopUrl
                  },
                  currentUser?.uid || targetStoreId,
                  { themeId: newThemeId }
                );
                showToast(`🎨 Thème activé ! Lien public : nsore.shop/${prefix}/${finalSlug}`);
              }
            } catch (err) {
              console.warn('[Studio] Auto-persist theme error:', err);
              showToast("🎨 Thème mis à jour avec succès dans le Studio !");
            }
          }}
        />
      )}

      {showAddProductModal && (
        <AddProductModal
          isOpen={showAddProductModal}
          onClose={() => {
            setShowAddProductModal(false);
            setProductToEdit(null);
            setAddProductInitialCard(undefined);
          }}
          storeId={targetStoreId}
          storeSlug={effectiveStoreSlug}
          currentUser={currentUser}
          subscription={subscription}
          availableProducts={allProducts}
          productToEdit={productToEdit}
          initialCard={addProductInitialCard}
          onProductAdded={(newProduct: InventoryProduct) => {
            setShowAddProductModal(false);
            const wasEditing = Boolean(productToEdit);
            setProductToEdit(null);
            setAddProductInitialCard(undefined);
            // Mettre à jour l'état local du Studio sans écraser les autres produits
            setStudioCustomProducts(prev => [newProduct, ...prev.filter(p => p.id !== newProduct.id)]);
            // Synchronisation avec App.tsx et la Caisse POS
            if (onAddInventoryProduct) {
              onAddInventoryProduct(newProduct);
            }
            showToast(wasEditing ? "✅ Produit mis à jour avec succès !" : "✅ Produit ajouté avec succès !");
          }}
          onProductUpdated={(updatedProduct: InventoryProduct) => {
            setShowAddProductModal(false);
            setProductToEdit(null);
            setAddProductInitialCard(undefined);
            setStudioCustomProducts(prev => [updatedProduct, ...prev.filter(p => p.id !== updatedProduct.id)]);
            if (onAddInventoryProduct) {
              onAddInventoryProduct(updatedProduct);
            }
            showToast("✅ Produit mis à jour avec succès !");
          }}
        />
      )}

      {/* 4. Tiroir Rapide Catalogue Produits */}
      <QuickCatalogDrawer
        isOpen={isQuickCatalogOpen}
        onClose={() => setIsQuickCatalogOpen(false)}
        products={allProducts}
        storeSlug={effectiveStoreSlug}
        onEditProduct={(product, initialCard) => {
          setProductToEdit(product);
          setAddProductInitialCard(initialCard);
          setIsQuickCatalogOpen(false);
          setShowAddProductModal(true);
        }}
        onAddNew={() => {
          setProductToEdit(null);
          setAddProductInitialCard(undefined);
          setIsQuickCatalogOpen(false);
          setShowAddProductModal(true);
        }}
        onDeleteProduct={handleDeleteProduct}
        onPreviewFunnel={(product) => {
          triggerOpenFunnel(product.linkedFunnelId || product.id, product.name, product);
        }}
        onToast={showToast}
        storeId={targetStoreId}
      />

      {showKycModal && !isSuperAdmin && (
        <KycVerificationModal
          isOpen={showKycModal}
          onClose={() => setShowKycModal(false)}
          storeId={targetStoreId}
          storeName={storeConfig.storeName}
          currentUser={currentUser}
          onSubmitted={() => {
            setShowKycModal(false);
            setKycStatus('pending_approval');
            showToast("🛡️ Dossier KYC transmis !");
          }}
        />
      )}

      {/* 5. Modale Mes Thèmes & Variantes Sauvegardées (Theme Vault) */}
      {showPresetsModal && (
        <ThemePresetsAndDraftManager
          isOpen={showPresetsModal}
          onClose={() => setShowPresetsModal(false)}
          currentConfig={draftThemeConfig}
          storeSlug={effectiveStoreSlug}
          storeId={targetStoreId}
          onApplyPreset={(preset) => {
            const nextConf = preset.configSnapshot || preset.config || draftThemeConfig;
            handleConfigChange(nextConf);
            setShowPresetsModal(false);
          }}
          onSavePresetsList={(updatedPresets) => {
            handleConfigChange({
              ...draftThemeConfig,
              savedPresets: updatedPresets
            });
          }}
          onToast={showToast}
        />
      )}

      {/* 6. Modales Légales, Garanties & Suivi de Commande Client */}
      <StoreLegalAndTrackingModals
        storeName={draftThemeConfig.storeName || storeConfig.storeName}
        whatsappNumber={draftThemeConfig.whatsappNumber || storeConfig.whatsappPhone}
        footerAddress={draftThemeConfig.footerAddress}
        storeSlug={effectiveStoreSlug}
        merchantId={targetStoreId}
        customConfig={draftThemeConfig}
      />
    </div>
  );
};

export default StoreStudioPage;
