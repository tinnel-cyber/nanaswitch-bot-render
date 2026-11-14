import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  X, Plus, Camera, Sparkles, Check, AlertCircle, 
  Upload, Tag, ShoppingBag, Package, RefreshCw, Trash2, Edit3,
  Crown, Radio, Copy, ChevronDown, ChevronUp, Layers, CheckCircle2,
  Tv, Video, Palette, Percent, ExternalLink, Zap
} from 'lucide-react';
import { InventoryProduct, StoreUser, StoreSubscription } from '../../../../types';
import { StoreProductItem } from './types';
import { supabase } from '../../../../lib/supabase';
import { formatCFA, playTapBeep, playValidationBeep, playCancelSound } from '../../../../utils/audio';
import { RichTextEditor } from './RichTextEditor';
import { stripHtmlToPlainText } from './AdaptiveProductRichText';
import { isLimitReached, triggerLimitReachedUpsell, triggerProFeatureUpsell, isFreePlan } from '../../../../utils/planFeatures';
import { useFeatureGate } from '../../../../hooks/useFeatureGate';
import { generateAIMedia } from '../../../../services/aiStudioService';
import { checkAndBlockDemoAction } from '../../../../utils/demoSecurityGuard';
import {
  fetchVendorFunnels,
  VendorFunnelSummary,
  saveProductModularFunnelRTDB,
  saveProductUltimateFunnelRTDB
} from '../../../../services/omniFunnelService';
import { buildPublicShopUrl } from '../../../../config/domains';
import { ensureMandatoryProductSlug } from '../../../../utils/slugEngine';

const MarketingAIAssistantModal = React.lazy(() => import('../../../../components/MarketingAIAssistantModal').then(m => ({ default: m.MarketingAIAssistantModal })));

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: (product: InventoryProduct) => void;
  productToEdit?: InventoryProduct | null;
  onProductUpdated?: (product: InventoryProduct) => void;
  storeId: string;
  storeSlug?: string;
  existingCategories?: string[];
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  onOpenUpgrade?: () => void;
  currentProductCount?: number;
  availableProducts?: (InventoryProduct | StoreProductItem)[];
  initialCard?: number;
}

const COMMON_CATEGORIES = [
  'Alimentation',
  'Boissons',
  'Entretien',
  'Hygiène & Soins',
  'Épicerie',
  'Cosmétiques',
  'High-Tech',
  'Mode & Vêtements',
  'Snacks',
  'Divers'
];

const PRESET_SIZES = ['50ml', '100ml', 'S', 'M', 'L', 'XL', '128 Go', '256 Go'];

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onProductAdded,
  productToEdit = null,
  onProductUpdated,
  storeId,
  storeSlug,
  existingCategories = [],
  currentUser,
  subscription,
  onOpenUpgrade,
  currentProductCount = 0,
  availableProducts = [],
  initialCard
}) => {
  const { handlePremiumAction } = useFeatureGate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);

  // CARTE 1 : Informations Essentielles
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Alimentation');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCat, setIsCustomCat] = useState(false);
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [originalPrice, setOriginalPrice] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [stock, setStock] = useState<number>(10);
  const [unit, setUnit] = useState('pièce');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [richDescription, setRichDescription] = useState('');
  const [badge, setBadge] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [hasLiveDemo, setHasLiveDemo] = useState(false);

  // CARTE 2 : Tunnel Dépliable (Hiérarchie : 12 Blocs Modulaire Priorité 1 par défaut vs Ultimate Funnel Priorité 2 conditionnelle)
  const [linkedFunnelId, setLinkedFunnelId] = useState<string | null>(null);
  const [hasModularFunnel, setHasModularFunnel] = useState<boolean>(true);
  const [useUltimateFunnel, setUseUltimateFunnel] = useState<boolean>(false);
  const [funnelDisplayMode, setFunnelDisplayMode] = useState<'drawer' | 'page'>('drawer');
  const [vendorFunnels, setVendorFunnels] = useState<VendorFunnelSummary[]>([]);
  const [loadingFunnels, setLoadingFunnels] = useState(false);
  const [copyFunnelToast, setCopyFunnelToast] = useState(false);

  // CARTE 3 : Boosters Thèmes Premium (Metafields Nanasore)
  const [isBoostersOpen, setIsBoostersOpen] = useState(false);
  const [colorSwatches, setColorSwatches] = useState<Array<{ name: string; hex: string }>>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#0F4C3A');
  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [keyFeatures, setKeyFeatures] = useState<string[]>(['', '', '']);
  const [routineVideoUrls, setRoutineVideoUrls] = useState<string[]>(['']);
  const [liveLotBadge, setLiveLotBadge] = useState<string>('');
  const [bundleProductIds, setBundleProductIds] = useState<string[]>([]);
  const [bundleDiscountPercent, setBundleDiscountPercent] = useState<number>(10);

  // UI State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMarketingAIOpen, setIsMarketingAIOpen] = useState(false);
  const [isGeneratingFullAi, setIsGeneratingFullAi] = useState(false);

  // État de génération d'image produit IA
  const [isAiImageModalOpen, setIsAiImageModalOpen] = useState(false);
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [aiImageError, setAiImageError] = useState<string | null>(null);

  // Chargement des tunnels du vendeur
  useEffect(() => {
    if (isOpen) {
      setLoadingFunnels(true);
      const effectiveStoreId = storeId || currentUser?.storeId || 'store-nana-1';
      fetchVendorFunnels(effectiveStoreId)
        .then((funnels) => {
          setVendorFunnels(funnels);
        })
        .catch((err) => {
          console.warn('Erreur chargement tunnels du vendeur:', err);
        })
        .finally(() => {
          setLoadingFunnels(false);
        });
    }
  }, [isOpen, storeId, currentUser]);

  // Support du ciblage in-context Studio (Carte 2 : Tunnel ou Carte 3 : Boosters)
  useEffect(() => {
    if (isOpen) {
      if (initialCard === 2) {
        setTimeout(() => {
          card2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      } else if (initialCard === 3) {
        setIsBoostersOpen(true);
        setTimeout(() => {
          card3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }
    }
  }, [isOpen, initialCard]);

  // Synchronisation avec productToEdit si mode modification
  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        setName(productToEdit.name || '');
        setCategory(productToEdit.category || 'Alimentation');
        setSellingPrice(productToEdit.sellingPrice ? String(productToEdit.sellingPrice) : '');
        setOriginalPrice(productToEdit.originalPrice ? String(productToEdit.originalPrice) : '');
        setCostPrice(productToEdit.costPrice ? String(productToEdit.costPrice) : '');
        setStock(productToEdit.stock !== undefined ? productToEdit.stock : 10);
        setUnit(productToEdit.unit || 'pièce');
        setDescription(productToEdit.richDescription || productToEdit.description || '');
        setRichDescription(productToEdit.richDescription || productToEdit.description || '');
        setShortDescription(productToEdit.shortDescription || '');
        setBadge(productToEdit.badge || '');
        setPhotoUrl(productToEdit.photoUrl || '');
        setHasLiveDemo(Boolean(productToEdit.hasLiveDemo));
        setLinkedFunnelId(productToEdit.linkedFunnelId || null);
        setHasModularFunnel(productToEdit.hasModularFunnel !== false);
        setUseUltimateFunnel(productToEdit.hasModularFunnel === false && Boolean(productToEdit.useUltimateFunnel));
        setFunnelDisplayMode(productToEdit.funnelDisplayMode || 'drawer');
        setIsCustomCat(false);
        setCustomCategory('');

        // Boosters
        setColorSwatches(productToEdit.colorSwatches || []);
        setSizeOptions(productToEdit.sizeOptions || []);
        setKeyFeatures(
          productToEdit.keyFeatures && productToEdit.keyFeatures.length > 0 
            ? [...productToEdit.keyFeatures, '', '', ''].slice(0, 3) 
            : ['', '', '']
        );
        setRoutineVideoUrls(
          productToEdit.routineVideoUrls && productToEdit.routineVideoUrls.length > 0 
            ? productToEdit.routineVideoUrls 
            : ['']
        );
        setLiveLotBadge(productToEdit.liveLotBadge || '');
        setBundleProductIds(productToEdit.bundleProductIds || []);
        setBundleDiscountPercent(productToEdit.bundleDiscountPercent || 10);

        if (
          (productToEdit.colorSwatches && productToEdit.colorSwatches.length > 0) ||
          (productToEdit.sizeOptions && productToEdit.sizeOptions.length > 0) ||
          (productToEdit.keyFeatures && productToEdit.keyFeatures.length > 0) ||
          (productToEdit.routineVideoUrls && productToEdit.routineVideoUrls.length > 0) ||
          (productToEdit.bundleProductIds && productToEdit.bundleProductIds.length > 0) ||
          productToEdit.liveLotBadge
        ) {
          setIsBoostersOpen(true);
        } else {
          setIsBoostersOpen(false);
        }
      } else {
        setName('');
        setCategory('Alimentation');
        setSellingPrice('');
        setOriginalPrice('');
        setCostPrice('');
        setStock(10);
        setUnit('pièce');
        setDescription('');
        setRichDescription('');
        setShortDescription('');
        setBadge('');
        setPhotoUrl('');
        setHasLiveDemo(false);
        setLinkedFunnelId(null);
        setHasModularFunnel(true);
        setUseUltimateFunnel(false);
        setFunnelDisplayMode('drawer');
        setIsCustomCat(false);
        setCustomCategory('');

        // Reset boosters
        setColorSwatches([]);
        setSizeOptions([]);
        setKeyFeatures(['', '', '']);
        setRoutineVideoUrls(['']);
        setLiveLotBadge('');
        setBundleProductIds([]);
        setBundleDiscountPercent(10);
        setIsBoostersOpen(false);
      }
      setErrorMsg(null);
    }
  }, [isOpen, productToEdit]);

  // Liste des produits disponibles pour le bundle (Cross-sell)
  const candidateBundleProducts = useMemo(() => {
    let prods: any[] = [];
    if (availableProducts && availableProducts.length > 0) {
      prods = availableProducts;
    } else {
      try {
        const resolvedStoreId = storeId || currentUser?.storeId || 'store-nana-1';
        const cachedRaw = localStorage.getItem(`nana_tenant_${resolvedStoreId}_custom_store_products`);
        if (cachedRaw) prods = JSON.parse(cachedRaw);
      } catch {}
    }
    // Exclure le produit en cours d'édition
    const currentId = productToEdit?.id;
    return prods.filter((p: any) => p && p.id !== currentId).slice(0, 10);
  }, [availableProducts, storeId, currentUser, productToEdit]);

  // Génération complète en 1 clic grâce à l'IA
  const handleGenerateAllWithAi = async () => {
    playTapBeep();
    setIsGeneratingFullAi(true);
    try {
      const prodName = name.trim() || `Produit d'Exception ${category}`;
      if (!name) setName(prodName);
      if (!badge) setBadge('Top Vente');

      const aiRichText = `<h2>✨ Points Forts de ${prodName}</h2>
<p><span style="display:inline-block; padding:2px 9px; border-radius:9999px; font-size:10.5px; font-weight:800; color:#10b981; background-color:rgba(16, 185, 129, 0.18); border:1px solid rgba(16, 185, 129, 0.4); margin-right:4px;">🌿 Qualité Supérieure 100%</span> <span style="display:inline-block; padding:2px 9px; border-radius:9999px; font-size:10.5px; font-weight:800; color:#f97316; background-color:rgba(249, 115, 22, 0.18); border:1px solid rgba(249, 115, 22, 0.4); margin-right:4px;">⚡ Stock Limité</span></p>
<p>Découvrez l'excellence avec <strong>${prodName}</strong>. Sélectionné avec rigueur pour apporter entière satisfaction, fraîcheur et confort d'utilisation au quotidien.</p>
<h3>📦 Caractéristiques & Avantages</h3>
<ul>
  <li><strong>Authenticité garantie :</strong> Produit 100% conforme et rigoureusement inspecté</li>
  <li><strong>Disponibilité immédiate :</strong> <span style="color:#10b981; font-weight:bold;">En stock en magasin</span></li>
  <li><strong>Conditionnement optimal :</strong> Emballage protecteur soigné</li>
</ul>
<p><mark style="background-color:rgba(234, 179, 8, 0.35); color:#fef08a; padding:3px 8px; border-radius:6px; font-weight:bold;">🚚 Livraison express en 30 minutes • Paiement sécurisé à la réception !</mark></p>`;

      setDescription(aiRichText);

      // Suggestions de keyFeatures automatiques
      setKeyFeatures([
        'Qualité supérieure 100% authentique',
        'Livraison express sécurisée en 30 min',
        'Garantie satisfaction ou remboursement'
      ]);

      if (!photoUrl) {
        try {
          const prompt = `Photo studio professionnelle 4K de ${prodName}, packshot commercial e-commerce sur fond blanc épuré, éclairage publicitaire doux`;
          const result = await generateAIMedia({
            type: 'image',
            prompt,
            options: { storeId: currentUser?.storeId || storeId }
          });
          if (result && result.mediaUrl) {
            setPhotoUrl(result.mediaUrl);
          }
        } catch (imgErr) {
          console.warn("Génération photo IA directe indisponible :", imgErr);
        }
      }
      playValidationBeep();
    } catch (err: any) {
      console.error("Erreur génération IA :", err);
    } finally {
      setIsGeneratingFullAi(false);
    }
  };

  // Compression Canvas automatique de la photo vers WebP côté client
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playTapBeep();
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1200;
        const scale = Math.min(MAX_SIZE / Math.max(img.width, img.height), 1);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Conversion stricte en WebP léger côté client
          const compressedWebp = canvas.toDataURL('image/webp', 0.85);
          setPhotoUrl(compressedWebp);
          playValidationBeep();
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyFunnelLink = async () => {
    if (!linkedFunnelId) return;
    playTapBeep();
    const storeSlug = (currentUser?.storeId || storeId || 'boutique').replace(/^store-/, '');
    const urlToCopy = buildPublicShopUrl(storeSlug, { funnelSlugOrId: linkedFunnelId });

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

  // Gestion des couleurs
  const handleAddColor = () => {
    if (!newColorName.trim()) return;
    playTapBeep();
    setColorSwatches(prev => [...prev, { name: newColorName.trim(), hex: newColorHex }]);
    setNewColorName('');
  };

  const handleRemoveColor = (idx: number) => {
    playTapBeep();
    setColorSwatches(prev => prev.filter((_, i) => i !== idx));
  };

  // Gestion des tailles
  const handleToggleSize = (size: string) => {
    playTapBeep();
    setSizeOptions(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const handleAddCustomSize = () => {
    const trimmed = customSizeInput.trim();
    if (!trimmed) return;
    playTapBeep();
    if (!sizeOptions.includes(trimmed)) {
      setSizeOptions(prev => [...prev, trimmed]);
    }
    setCustomSizeInput('');
  };

  // Gestion du bundle sélectionné
  const handleToggleBundleProduct = (prodId: string) => {
    playTapBeep();
    setBundleProductIds(prev => {
      if (prev.includes(prodId)) {
        return prev.filter(id => id !== prodId);
      }
      if (prev.length >= 2) {
        // Remplacer le 2ème élément si déjà 2
        return [prev[0], prodId];
      }
      return [...prev, prodId];
    });
  };

  // Calcul du prix total du pack bundle
  const bundleCalculation = useMemo(() => {
    const mainPrice = Number(sellingPrice) || 0;
    const selectedProds = candidateBundleProducts.filter((p: any) => bundleProductIds.includes(p.id));
    const extraTotal = selectedProds.reduce((sum: number, p: any) => sum + (Number(p.sellingPrice || p.price) || 0), 0);
    const regularTotal = mainPrice + extraTotal;
    const discountFactor = (100 - (bundleDiscountPercent || 0)) / 100;
    const discountedTotal = Math.round(regularTotal * discountFactor);
    const savings = regularTotal - discountedTotal;
    return {
      selectedProds,
      regularTotal,
      discountedTotal,
      savings
    };
  }, [sellingPrice, candidateBundleProducts, bundleProductIds, bundleDiscountPercent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkAndBlockDemoAction(currentUser)) {
      onClose();
      return;
    }
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("Veuillez saisir le nom de l'article.");
      return;
    }

    if (!productToEdit && isLimitReached(subscription, 'PRODUCTS', currentProductCount || 0)) {
      triggerLimitReachedUpsell('PRODUCTS', currentProductCount || 0, 3, 'produits');
      return;
    }

    const priceNum = Number(sellingPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg("Veuillez renseigner un prix de vente valide supérieur à 0 F CFA.");
      return;
    }

    const resolvedCategory = isCustomCat && customCategory.trim() 
      ? customCategory.trim() 
      : category;

    setLoading(true);
    playTapBeep();

    try {
      const productId = productToEdit?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? `prod-${crypto.randomUUID()}` : `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
      const originalPriceNum = originalPrice ? Number(originalPrice) : undefined;
      const costPriceNum = costPrice ? Number(costPrice) : Math.round(priceNum * 0.75);

      const resolvedStoreId = storeId || currentUser?.storeId || 'store-nana-1';

      // Filtrer les keyFeatures et routineVideoUrls non vides
      const cleanKeyFeatures = keyFeatures.map(f => f.trim()).filter(Boolean);
      const cleanRoutineUrls = routineVideoUrls.map(u => u.trim()).filter(Boolean);

      const finalSlug = ensureMandatoryProductSlug({
        id: productId,
        name: trimmedName,
        slug: productToEdit?.slug || productToEdit?.productSlug
      });

      const cleanPlainDescription = stripHtmlToPlainText(richDescription || description).trim();

      const resolvedProduct: InventoryProduct = {
        id: productId,
        storeId: resolvedStoreId,
        slug: finalSlug,
        productSlug: finalSlug,
        name: trimmedName,
        category: resolvedCategory,
        sellingPrice: priceNum,
        originalPrice: originalPriceNum && originalPriceNum > priceNum ? originalPriceNum : undefined,
        costPrice: costPriceNum,
        stock: Number(stock) || 0,
        unit: unit.trim() || 'pièce',
        keywords: [
          trimmedName.toLowerCase(),
          resolvedCategory.toLowerCase(),
          ...trimmedName.toLowerCase().split(/\s+/)
        ].filter(Boolean),
        photoUrl: photoUrl || '',
        description: cleanPlainDescription || (richDescription || description).trim() || '',
        richDescription: (richDescription || description).trim() || '',
        shortDescription: (stripHtmlToPlainText(shortDescription) || cleanPlainDescription).slice(0, 160) || '',
        badge: badge.trim() || '',
        hasLiveDemo: Boolean(hasLiveDemo),
        linkedFunnelId: linkedFunnelId || (hasModularFunnel ? finalSlug : null),
        hasModularFunnel: Boolean(hasModularFunnel),
        useUltimateFunnel: !hasModularFunnel && Boolean(useUltimateFunnel),
        modular_funnel: productToEdit?.modular_funnel || (hasModularFunnel ? {
          id: linkedFunnelId || finalSlug,
          slug: linkedFunnelId || finalSlug,
          funnelType: 'modular',
          funnelStudio: 'nana_studio_3',
          linkPrefix: 't',
          title: trimmedName,
          description: cleanPlainDescription,
          salePrice: priceNum,
          originalPrice: originalPriceNum || Math.round(priceNum * 1.5),
          active: true
        } : undefined),
        ultimate_funnel: productToEdit?.ultimate_funnel || (!hasModularFunnel && useUltimateFunnel ? {
          id: linkedFunnelId || finalSlug,
          slug: linkedFunnelId || finalSlug,
          funnelType: 'ultimate',
          linkPrefix: 'f',
          title: trimmedName,
          salePrice: priceNum,
          originalPrice: originalPriceNum || Math.round(priceNum * 1.5),
          active: true
        } : undefined),
        funnelDisplayMode: funnelDisplayMode || 'drawer',
        // Boosters Multi-Thèmes (Metafields Nanasore)
        colorSwatches: colorSwatches.length > 0 ? colorSwatches : undefined,
        sizeOptions: sizeOptions.length > 0 ? sizeOptions : undefined,
        keyFeatures: cleanKeyFeatures.length > 0 ? cleanKeyFeatures : undefined,
        routineVideoUrls: cleanRoutineUrls.length > 0 ? cleanRoutineUrls : undefined,
        bundleProductIds: bundleProductIds.length > 0 ? bundleProductIds : undefined,
        bundleDiscountPercent: bundleProductIds.length > 0 && bundleDiscountPercent > 0 ? bundleDiscountPercent : undefined,
        liveLotBadge: liveLotBadge.trim() ? liveLotBadge.trim() : undefined
      };

      // 1. Sauvegarde locale immédiate dans le cache boutique
      try {
        const customKey = `nana_tenant_${resolvedStoreId}_custom_store_products`;
        const existingRaw = localStorage.getItem(customKey);
        const existing: InventoryProduct[] = existingRaw ? JSON.parse(existingRaw) : [];
        const updatedCustom = [resolvedProduct, ...existing.filter((p) => p.id !== productId)];
        localStorage.setItem(customKey, JSON.stringify(updatedCustom));

        const invKey = `nana_tenant_${resolvedStoreId}_inventory`;
        const existingInvRaw = localStorage.getItem(invKey);
        const existingInv: InventoryProduct[] = existingInvRaw ? JSON.parse(existingInvRaw) : [];
        const updatedInv = [resolvedProduct, ...existingInv.filter((p) => p.id !== productId)];
        localStorage.setItem(invKey, JSON.stringify(updatedInv));

        // 1-bis. Persistance Supabase SQL instantanée (accessible de tous les navigateurs & nsore.shop)
        try {
          await supabase
            .from('app_registry')
            .upsert({
              key: `products_${resolvedStoreId}`,
              name: 'store_products',
              tenant_id: resolvedStoreId,
              module_key: 'products',
              config_json: {
                products: updatedCustom,
                updated_at: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

          const cleanSlug = (storeSlug || resolvedStoreId).replace(/^store-/, '');
          if (cleanSlug && cleanSlug !== resolvedStoreId) {
            await supabase
              .from('app_registry')
              .upsert({
                key: `products_${cleanSlug}`,
                name: 'store_products',
                tenant_id: cleanSlug,
                module_key: 'products',
                config_json: {
                  products: updatedCustom,
                  updated_at: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
              }, { onConflict: 'key' });
          }

          const isStoreUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedStoreId);
          const isProdUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
          const prodUuidToUse = isProdUUID ? productId : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);

          if (prodUuidToUse) {
            await supabase.from('products').upsert({
              id: prodUuidToUse,
              name: trimmedName,
              price: priceNum,
              stock: Number(stock) || 0,
              image_url: photoUrl || '',
              vendor_id: resolvedStoreId,
              slug: finalSlug,
              ...(isStoreUUID ? { tenant_id: resolvedStoreId } : {})
            }, { onConflict: 'id' }).catch(() => {});
          }
        } catch (sbErr) {
          console.warn("[Studio Supabase] Erreur persistance produit :", sbErr);
        }
      } catch {}

      playValidationBeep();
      if (productToEdit && onProductUpdated) {
        onProductUpdated(resolvedProduct);
      } else {
        onProductAdded(resolvedProduct);
      }
      onClose();
    } catch (err: any) {
      console.error("Erreur enregistrement produit :", err);
      setErrorMsg(err?.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Catégories fusionnées
  const allCategories = Array.from(
    new Set([...COMMON_CATEGORIES, ...existingCategories.filter(c => c && c !== 'TOUS')])
  );

  // Calcul du rabais promo en direct
  const calculatedDiscount = originalPrice && sellingPrice && Number(originalPrice) > Number(sellingPrice)
    ? Math.round(((Number(originalPrice) - Number(sellingPrice)) / Number(originalPrice)) * 100)
    : null;

  const promoSavingAmount = originalPrice && sellingPrice && Number(originalPrice) > Number(sellingPrice)
    ? Number(originalPrice) - Number(sellingPrice)
    : 0;

  const effectiveStoreSlug = (storeSlug || currentUser?.storeId || storeId || 'boutique').replace(/^store-/, '');
  const publicProductAdUrl = linkedFunnelId 
    ? buildPublicShopUrl(effectiveStoreSlug, { funnelSlugOrId: linkedFunnelId })
    : buildPublicShopUrl(effectiveStoreSlug);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-product-dialog-title"
        className="w-full max-w-2xl bg-card border border-theme rounded-3xl overflow-hidden shadow-2xl relative max-h-[94vh] flex flex-col text-body"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête de la Modale */}
        <div className="bg-secondary px-5 py-3.5 border-b border-theme flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              productToEdit ? 'bg-blue-600/20 text-blue-500' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {productToEdit ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h2 id="add-product-dialog-title" className="text-sm sm:text-base font-black text-body">
                {productToEdit ? "Modifier l'article & Metafields Thèmes" : "Catalogue Universel : Ajouter un article"}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10.5px] text-muted">
                  Création express 30s • Multi-thèmes & Tunnels de vente
                </p>
                {isFreePlan(subscription) && !productToEdit && (
                  <span className="text-[9.5px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    {Math.min(currentProductCount, 3)}/3 produits
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { playCancelSound(); onClose(); }}
            className="p-2 rounded-full bg-secondary hover:bg-card-hover text-muted hover:text-body border border-theme transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps du Formulaire Scrollable */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {errorMsg && (
            <div className="bg-red-950/70 border border-red-800/80 rounded-2xl p-3 flex items-center gap-2 text-red-200 text-xs animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Bouton Magique IA 1-Clic */}
          <button
            type="button"
            onClick={handleGenerateAllWithAi}
            disabled={isGeneratingFullAi}
            className="w-full py-3 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md group disabled:opacity-50"
          >
            {isGeneratingFullAi ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                <span>Génération automatique en cours (Image & Metafields)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-500 group-hover:rotate-12 transition-transform" />
                <span>✨ Générer avec l'IA (Image + Titre + Arguments + Description Rich Text)</span>
              </>
            )}
          </button>

          {/* =========================================================================
              CARTE 1 : Informations Essentielles (Création Express 30s)
             ========================================================================= */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-theme/60">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black text-[11px] px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                  CARTE 1
                </span>
                <h3 className="font-extrabold text-sm text-body">
                  Informations Essentielles (Création Express 30s)
                </h3>
              </div>
              <span className="text-[10px] text-muted">Indispensable pour les 6 thèmes</span>
            </div>

            {/* Photo du Produit */}
            <div>
              <label className="text-body font-bold block mb-1.5 flex items-center justify-between">
                <span>Photos de l'article</span>
                <span className="text-[10px] text-muted font-normal">Compression Canvas automatique</span>
              </label>

              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handlePhotoUpload} 
              />

              {photoUrl ? (
                <div className="relative w-full h-40 bg-secondary rounded-2xl overflow-hidden border border-theme flex items-center justify-center group">
                  <img 
                    src={photoUrl} 
                    alt="Aperçu article" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-card hover:bg-card-hover text-body border border-theme px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Changer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        if (isFreePlan(subscription)) {
                          if (onOpenUpgrade) onOpenUpgrade();
                          else triggerProFeatureUpsell('AI_STUDIO');
                          return;
                        }
                        setAiImagePrompt(name ? `Photo studio 4K professionnelle de ${name}, fond blanc épuré, éclairage publicitaire commercial` : 'Photo studio 4K professionnelle d\'article e-commerce, fond épuré');
                        setIsAiImageModalOpen(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                      title="Générer avec l'IA"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>IA Image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-xl cursor-pointer shadow-md"
                      title="Supprimer la photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div 
                    onClick={() => { playTapBeep(); fileInputRef.current?.click(); }}
                    className="w-full h-28 bg-secondary hover:bg-card border-2 border-dashed border-theme hover:border-emerald-500/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition text-muted hover:text-body"
                  >
                    <div className="w-9 h-9 rounded-full bg-card border border-theme flex items-center justify-center text-emerald-500">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs">📷 Cliquez pour ajouter la photo principale</span>
                    <span className="text-[10px] text-muted">JPG, PNG, WebP • Optimisé pour mobile</span>
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={() => {
                        const url = window.prompt("Entrez l'URL directe de l'image (ex: https://...) :");
                        if (url && url.trim()) setPhotoUrl(url.trim());
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-500 underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>🔗 Ou coller une URL d'image web</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        handlePremiumAction('pro', () => {
                          setAiImagePrompt(name ? `Photo studio 4K professionnelle de ${name}, fond blanc épuré` : 'Photo studio 4K d\'article e-commerce');
                          setIsAiImageModalOpen(true);
                        }, {
                          featureType: 'IMAGE',
                          featureName: 'Génération d\'Images Produits IA',
                          featureKey: 'AI_IMAGE_GENERATION',
                          customTitle: 'Créez vos Images Produits avec l\'IA 👑',
                          customMessage: 'Générez des photos de packshots studio époustouflantes.'
                        });
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Créer avec l'IA</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Titre & Catégorie */}
            <div className="space-y-3">
              <div>
                <label className="text-body font-bold block mb-1">
                  Titre du produit <span className="text-emerald-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Sérum Botanique Éclat C+ ou Casque Audio Sans Fil Pro"
                  required
                  className="w-full bg-input border border-theme rounded-xl px-3.5 py-2.5 text-body font-bold text-xs focus:border-emerald-500 focus:outline-none placeholder:text-muted"
                />
              </div>

              <div>
                <label className="text-body font-bold block mb-1.5">
                  Rayon / Catégorie (alimente filtres et menus)
                </label>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {allCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setCategory(cat);
                        setIsCustomCat(false);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        !isCustomCat && category === cat
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-secondary text-muted hover:text-body border border-theme'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setIsCustomCat(!isCustomCat);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      isCustomCat
                        ? 'bg-blue-600 text-white'
                        : 'bg-secondary text-blue-600 hover:text-blue-500 border border-theme'
                    }`}
                  >
                    + Autre...
                  </button>
                </div>

                {isCustomCat && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Saisissez une nouvelle catégorie personnalisée..."
                    className="w-full bg-input border border-blue-500/50 rounded-xl px-3.5 py-2 text-body text-xs focus:border-blue-400 focus:outline-none animate-in fade-in duration-150"
                    autoFocus
                  />
                )}
              </div>
            </div>

            {/* Tarification & Calculateur de Promo en Direct */}
            <div className="bg-secondary/70 p-3.5 rounded-2xl border border-theme space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-body font-bold block mb-1">
                    Prix de vente (FCFA) <span className="text-emerald-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="Ex: 15000"
                      required
                      min="1"
                      className="w-full bg-input border border-theme rounded-xl px-3.5 py-2 text-emerald-600 dark:text-emerald-400 font-black text-sm focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-[10px] font-bold">
                      FCFA
                    </span>
                  </div>
                  {sellingPrice && !isNaN(Number(sellingPrice)) && Number(sellingPrice) > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                      = {formatCFA(Number(sellingPrice))}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-body font-bold block mb-1 flex items-center justify-between">
                    <span>Prix barré avant promo (FCFA)</span>
                    <span className="text-[10px] text-muted font-normal">Optionnel</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                      placeholder="Ex: 25000"
                      min="1"
                      className="w-full bg-input border border-theme rounded-xl px-3.5 py-2 text-body text-xs focus:border-amber-500 focus:outline-none placeholder:text-muted"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-[10px] font-bold">
                      FCFA
                    </span>
                  </div>
                </div>
              </div>

              {/* Badge vert Promo Détectée en direct */}
              {Boolean(calculatedDiscount && calculatedDiscount > 0) && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs animate-in fade-in">
                  <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    ✨ Promo détectée : Économie de <strong>{formatCFA(promoSavingAmount)}</strong> (-{calculatedDiscount}%) affichée automatiquement sur la boutique !
                  </span>
                </div>
              )}
            </div>

            {/* Stock, Unité & Accroche */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-body font-bold block mb-1">
                  Quantité en stock
                </label>
                <div className="flex items-center bg-input border border-theme rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => { playTapBeep(); setStock(s => Math.max(0, s - 1)); }}
                    className="w-7 h-7 rounded-lg bg-secondary hover:bg-card-hover text-body font-bold flex items-center justify-center cursor-pointer border border-theme"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full text-center bg-transparent font-black text-body text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => { playTapBeep(); setStock(s => s + 1); }}
                    className="w-7 h-7 rounded-lg bg-secondary hover:bg-card-hover text-body font-bold flex items-center justify-center cursor-pointer border border-theme"
                  >
                    +
                  </button>
                </div>
                <span className="text-[9.5px] text-muted block mt-1">
                  Alimente l'urgence "Plus que {stock} en stock"
                </span>
              </div>

              <div>
                <label className="text-body font-bold block mb-1">
                  Unité de vente
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="pièce, flacon, kg..."
                  className="w-full bg-input border border-theme rounded-xl px-3 py-2 text-body text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-body font-bold block mb-1">
                  Badge d'accroche (optionnel)
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="Ex: Top Vente, Bestseller, -30%"
                  className="w-full bg-input border border-theme rounded-xl px-3 py-2 text-body text-xs focus:border-amber-500 focus:outline-none placeholder:text-muted"
                />
              </div>
            </div>

            {/* Toggle Live Voir en direct */}
            <div className="p-3 bg-secondary/60 border border-theme rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  hasLiveDemo ? 'bg-rose-500/20 text-rose-500' : 'bg-input text-muted'
                }`}>
                  <Radio className={`w-3.5 h-3.5 ${hasLiveDemo ? 'text-rose-500 animate-pulse' : 'text-muted'}`} />
                </div>
                <div>
                  <div className="font-bold text-body text-xs">🔴 Afficher Voir en Direct (Live)</div>
                  <p className="text-[10px] text-muted">Affiche le bouton live shopping sur la fiche produit</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={hasLiveDemo}
                  onChange={(e) => setHasLiveDemo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-input border border-theme peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {/* 1. Courte Description (Pitch d'accroche pour cartes Grid et haut de fiche) */}
            <div className="space-y-1.5 pt-2 border-t border-theme/40">
              <div className="flex items-center justify-between">
                <label className="text-body font-bold text-xs flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20" />
                  <span>⚡ Courte Description (Pitch d&apos;accroche sous le prix &amp; cartes Grid)</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    const extracted = stripHtmlToPlainText(richDescription || description).slice(0, 140);
                    if (extracted) {
                      setShortDescription(extracted);
                    }
                  }}
                  className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded-lg text-[10.5px] flex items-center gap-1 transition cursor-pointer"
                  title="Extraire les 140 premiers caractères de la description longue en texte pur"
                >
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span>✨ Extraire depuis la description longue</span>
                </button>
              </div>
              <textarea
                rows={2}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                maxLength={200}
                placeholder="Une phrase percutante pour donner envie de cliquer (affichée sur la carte produit et le haut de la vue Shopify)..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-theme bg-input text-body outline-none focus:ring-2 focus:ring-blue-500/20 transition resize-none"
              />
              <div className="flex justify-between text-[10px] text-muted px-1">
                <span>Accroche en 1 à 2 phrases pour les cartes catalogue et mobiles.</span>
                <span>{shortDescription.length}/200 car.</span>
              </div>
            </div>

            {/* 2. Longue Description Détaillée (Rich Text - Fiche Produit complète) */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-body font-bold block flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>📖 Longue Description Détaillée (Rich Text - Fiche Produit complète)</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    handlePremiumAction('pro', () => {
                      setIsMarketingAIOpen(true);
                    }, {
                      featureType: 'DESCRIPTION',
                      featureName: 'Générateur de Fiche Produit IA',
                      featureKey: 'AI_PRODUCT_DESCRIPTION',
                      customTitle: 'Rédigez vos Fiches Produits avec l\'IA 👑',
                      customMessage: 'Générez des argumentaires de vente ultra-persuasifs.'
                    });
                  }}
                  className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-bold px-2.5 py-1 rounded-xl text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>✨ IA Description</span>
                  <Crown className="w-3 h-3 text-amber-500 fill-amber-500/20" />
                </button>
              </div>

              <RichTextEditor
                value={richDescription || description}
                onChange={(val) => {
                  setRichDescription(val);
                  setDescription(val);
                }}
                placeholder="Rédigez la description produit avec titres, puces, badges et mise en gras..."
                minHeight="140px"
              />
            </div>
          </div>

          {/* =========================================================================
              CARTE 2 : Connexion au Tunnel Dépliable à 12 Blocs (Mise en valeur Premium)
             ========================================================================= */}
          <div ref={card2Ref} className="bg-gradient-to-br from-blue-50/90 via-white to-blue-50/40 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-blue-950/40 border-2 border-blue-200 dark:border-blue-800/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-blue-200/60 dark:border-blue-800/60">
              <div className="flex items-center gap-2">
                <span className="bg-blue-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm">
                  ⚡ CONVERSION MAXIMALE
                </span>
                <h3 className="font-extrabold text-sm text-blue-950 dark:text-blue-200">
                  🔗 Tunnel de Vente Dépliable (12 Blocs & Vidéo)
                </h3>
              </div>
              <span className="text-[10.5px] text-blue-600 dark:text-blue-400 font-bold">
                Boost x3 du panier moyen
              </span>
            </div>

            {/* Hiérarchie de Sélection du Moteur de Tunnel (Règle d'Or : 12 Blocs Priorité 1 par défaut) */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-800/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-extrabold text-xs text-body flex items-center gap-1.5">
                    <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                      PRIORITÉ 1 • DÉFAUT
                    </span>
                    <span>🧱 Funnel Builder Modulaire à 12 Blocs</span>
                  </div>
                  <p className="text-[10.5px] text-muted mt-0.5">
                    Structure haute conversion à 12 blocs chargée en priorité sur la fiche produit et au clic sur Acheter.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={hasModularFunnel}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setHasModularFunnel(checked);
                      if (checked) {
                        setUseUltimateFunnel(false);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-input border border-theme peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {!hasModularFunnel && (
                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 animate-in fade-in">
                  <div>
                    <div className="font-bold text-xs text-body flex items-center gap-1.5">
                      <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9.5px] font-black px-2 py-0.5 rounded-full border border-amber-500/30">
                        PRIORITÉ 2 • FALLBACK
                      </span>
                      <span>Utiliser Ultimate Funnel pour ce produit</span>
                    </div>
                    <p className="text-[10px] text-muted mt-0.5">
                      Activé uniquement si ce produit n&apos;utilise pas le Funnel Modulaire 12 blocs. Stocké séparément dans /ultimate_funnel.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={useUltimateFunnel}
                    onChange={(e) => setUseUltimateFunnel(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Tunnel personnalisé spécifique (optionnel) :</span>
                {loadingFunnels && (
                  <span className="text-[10px] text-muted animate-pulse">Chargement des tunnels...</span>
                )}
              </label>
              <select
                value={linkedFunnelId || ''}
                onChange={(e) => setLinkedFunnelId(e.target.value || null)}
                className="w-full bg-white dark:bg-slate-950 border border-blue-300 dark:border-blue-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-body focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
              >
                <option value="">{hasModularFunnel ? 'Auto : Funnel Modulaire 12 Blocs du produit (Recommandé)' : 'Aucun tunnel lié'}</option>
                {vendorFunnels.map((funnel) => (
                  <option key={funnel.id} value={funnel.slug || funnel.id}>
                    {funnel.title || funnel.slug || funnel.id}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted">
                {hasModularFunnel
                  ? "Le Funnel Modulaire à 12 blocs est actif en Priorité 1 pour ce produit."
                  : useUltimateFunnel
                  ? "Ultimate Funnel (Priorité 2) est assigné à ce produit."
                  : "Le produit s'affiche avec son bouton d'achat direct et panier classique."}
              </p>
            </div>

            {/* Sélecteur Visuel Mode d'Affichage (2 Cartes Radio) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Mode d'affichage du tunnel :
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => { playTapBeep(); setFunnelDisplayMode('drawer'); }}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                    funnelDisplayMode === 'drawer'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    funnelDisplayMode === 'drawer' ? 'border-blue-600' : 'border-slate-400'
                  }`}>
                    {funnelDisplayMode === 'drawer' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-xs text-body flex items-center gap-1.5">
                      <span>⚡ Tiroir Dépliable Instantané (0ms)</span>
                    </div>
                    <p className="text-[10.5px] text-muted leading-tight">
                      Recommandé : s'ouvre par-dessus la boutique sans rechargement.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => { playTapBeep(); setFunnelDisplayMode('page'); }}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                    funnelDisplayMode === 'page'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    funnelDisplayMode === 'page' ? 'border-blue-600' : 'border-slate-400'
                  }`}>
                    {funnelDisplayMode === 'page' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-xs text-body flex items-center gap-1.5">
                      <span>🌐 Page de Vente Plein Écran</span>
                    </div>
                    <p className="text-[10.5px] text-muted leading-tight">
                      Redirige directement vers l'URL dédiée du tunnel.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Générateur de Lien Pub (nsore.shop) intégré */}
            {Boolean(linkedFunnelId) && (
              <div className="pt-2 space-y-2 border-t border-blue-200/80 dark:border-blue-800/80">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Lien Publicitaire Prêt à l'Emploi :</span>
                  <span className="text-[10px] text-blue-600 font-mono">nsore.shop/s/...</span>
                </div>

                <div className="text-[11px] font-mono bg-white dark:bg-black/50 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2 truncate select-all text-body">
                  {publicProductAdUrl}
                </div>

                <button
                  type="button"
                  onClick={handleCopyFunnelLink}
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>📋 Copier le lien direct du Tunnel (Pub Facebook / WhatsApp / TikTok)</span>
                </button>

                {copyFunnelToast && (
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-1.5 animate-in fade-in">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>✅ Lien nsore.shop copié dans le presse-papier !</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* =========================================================================
              CARTE 3 : Accordéon Dépliable "✨ Boosters Thèmes Premium (Metafields)"
             ========================================================================= */}
          <div ref={card3Ref} className="border border-blue-200/80 dark:border-blue-900/50 bg-blue-500/5 rounded-2xl overflow-hidden transition-all">
            {/* Header Accordéon */}
            <button
              type="button"
              onClick={() => { playTapBeep(); setIsBoostersOpen(!isBoostersOpen); }}
              className="w-full p-4 flex items-center justify-between bg-card hover:bg-card-hover transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs sm:text-sm text-body flex items-center gap-2">
                    <span>✨ Boosters Thèmes Premium</span>
                    <span className="text-[10px] bg-blue-600/15 text-blue-600 dark:text-blue-300 px-2 py-0.2 rounded-full font-bold">
                      Variantes, Vidéos, Cross-sell
                    </span>
                  </div>
                  <p className="text-[10.5px] text-muted">
                    {isBoostersOpen ? "Cliquez pour replier l'accordéon" : "➕ Activer les options avancées (Couleurs, Tailles, Points clés, Packs...)"}
                  </p>
                </div>
              </div>

              <div className="p-1 rounded-lg bg-secondary text-muted">
                {isBoostersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {/* Contenu de l'Accordéon Dépliable */}
            {isBoostersOpen && (
              <div className="p-4 sm:p-5 space-y-5 border-t border-theme/60 bg-card/60 animate-in fade-in duration-150">

                {/* Sous-Bloc A : Pastilles de Couleurs & Tailles/Contenances */}
                <div className="space-y-3 p-3.5 rounded-xl bg-secondary/50 border border-theme">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-xs text-body flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pastilles de Couleurs & Tailles / Contenances</span>
                    </label>
                    <span className="text-[10px] text-muted">Beauté, Mode & High-Tech</span>
                  </div>

                  {/* Ajout de Couleurs */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-muted block">Nuancier de couleurs :</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-theme cursor-pointer p-0.5 bg-card"
                      />
                      <input 
                        type="text" 
                        value={newColorName}
                        onChange={(e) => setNewColorName(e.target.value)}
                        placeholder="Nom de la couleur (ex: Or Rose, Vert Émeraude)"
                        className="flex-1 bg-input border border-theme rounded-xl px-3 py-1.5 text-xs text-body"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddColor();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddColor}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer"
                      >
                        + Ajouter
                      </button>
                    </div>

                    {/* Liste des Pastilles Ajoutées */}
                    {colorSwatches.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {colorSwatches.map((swatch, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center gap-1.5 bg-card border border-theme px-2.5 py-1 rounded-full text-xs"
                          >
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-black/20" 
                              style={{ backgroundColor: swatch.hex }} 
                            />
                            <span className="font-semibold text-body">{swatch.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveColor(idx)}
                              className="text-muted hover:text-red-500 ml-0.5"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ajout de Tailles / Contenances */}
                  <div className="space-y-2 pt-2 border-t border-theme/60">
                    <span className="text-[11px] font-semibold text-muted block">
                      Tailles & Contenances (cliquez pour ajouter en 1 clic) :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_SIZES.map((sz) => {
                        const isSelected = sizeOptions.includes(sz);
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => handleToggleSize(sz)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-card text-muted hover:text-body border border-theme'
                            }`}
                          >
                            {isSelected ? `✓ ${sz}` : `+ ${sz}`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input 
                        type="text" 
                        value={customSizeInput}
                        onChange={(e) => setCustomSizeInput(e.target.value)}
                        placeholder="Autre contenance sur-mesure (ex: 200ml, XXL, 512 Go)..."
                        className="flex-1 bg-input border border-theme rounded-xl px-3 py-1.5 text-xs text-body"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomSize();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomSize}
                        className="bg-secondary hover:bg-card-hover border border-theme font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer text-body"
                      >
                        Ajouter
                      </button>
                    </div>

                    {sizeOptions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {sizeOptions.map((sz, idx) => (
                          <span 
                            key={idx}
                            className="bg-card text-body border border-theme px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1"
                          >
                            <span>{sz}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleSize(sz)}
                              className="text-muted hover:text-red-500"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sous-Bloc B : Points Clés Techniques (keyFeatures) */}
                <div className="space-y-2 p-3.5 rounded-xl bg-secondary/50 border border-theme">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-xs text-body flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>3 Points Clés Techniques & Arguments (keyFeatures)</span>
                    </label>
                    <span className="text-[10px] text-muted">Electro, MegaStore & Digital Pro</span>
                  </div>

                  <p className="text-[10.5px] text-muted">
                    Affichés en liste à puces sous le titre produit pour déclencher l'achat immédiat.
                  </p>

                  <div className="space-y-2 pt-1">
                    {[0, 1, 2].map((idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold text-xs shrink-0">
                          ✓
                        </span>
                        <input 
                          type="text" 
                          value={keyFeatures[idx] || ''}
                          onChange={(e) => {
                            const updated = [...keyFeatures];
                            updated[idx] = e.target.value;
                            setKeyFeatures(updated);
                          }}
                          placeholder={
                            idx === 0 
                              ? "Ex: Garantie 12 mois constructeur avec échange immédiat" 
                              : idx === 1 
                              ? "Ex: Livraison express en 30 minutes à Abidjan" 
                              : "Ex: Formule 100% Bio & Naturelle certifiée"
                          }
                          className="w-full bg-input border border-theme rounded-xl px-3 py-1.5 text-xs text-body placeholder:text-muted"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sous-Bloc C : Vidéos de Routine & Numéro de Lot Live */}
                <div className="space-y-3 p-3.5 rounded-xl bg-secondary/50 border border-theme">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-xs text-body flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-rose-500" />
                      <span>Vidéos Démo Routine & Lot Live Shopping</span>
                    </label>
                    <span className="text-[10px] text-muted">Thèmes Beauté & LiveStream</span>
                  </div>

                  {/* Vidéos routine */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted block">
                      URL de courte vidéo (Démo / Rituel Beauté) :
                    </span>
                    <input 
                      type="url" 
                      value={routineVideoUrls[0] || ''}
                      onChange={(e) => setRoutineVideoUrls([e.target.value])}
                      placeholder="https://... (Lien vidéo MP4 ou YouTube Short)"
                      className="w-full bg-input border border-theme rounded-xl px-3 py-1.5 text-xs text-body placeholder:text-muted"
                    />
                  </div>

                  {/* Numéro de Lot Live */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-muted block">
                      Numéro de Lot Live Stream :
                    </span>
                    <input 
                      type="text" 
                      value={liveLotBadge}
                      onChange={(e) => setLiveLotBadge(e.target.value)}
                      placeholder="Ex: #LOT 01 ou #LOT EXCLUSIF"
                      className="w-full sm:w-48 bg-input border border-theme rounded-xl px-3 py-1.5 text-xs text-body font-mono uppercase"
                    />
                  </div>
                </div>

                {/* Sous-Bloc D : Pack "Fréquemment Achetés Ensemble" (Cross-Sell) */}
                <div className="space-y-3 p-3.5 rounded-xl bg-secondary/50 border border-theme">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-xs text-body flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pack "Fréquemment Achetés Ensemble" (Cross-Sell 1-clic)</span>
                    </label>
                    <span className="text-[10px] text-muted">Jusqu'à 2 produits</span>
                  </div>

                  <p className="text-[10.5px] text-muted">
                    Cochez jusqu'à 2 articles complémentaires du catalogue pour former un pack automatique.
                  </p>

                  {/* Liste des produits candidats */}
                  {candidateBundleProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {candidateBundleProducts.map((cand: any) => {
                        const isChecked = bundleProductIds.includes(cand.id);
                        return (
                          <div
                            key={cand.id}
                            onClick={() => handleToggleBundleProduct(cand.id)}
                            className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                              isChecked
                                ? 'bg-blue-500/15 border-blue-500 text-body shadow-xs'
                                : 'bg-card border-theme text-muted hover:text-body'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-400'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            <img 
                              src={cand.photoUrl || cand.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'} 
                              alt={cand.name}
                              className="w-8 h-8 rounded-lg object-cover shrink-0" 
                            />

                            <div className="truncate flex-1">
                              <div className="font-bold text-[11px] truncate">{cand.name}</div>
                              <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                {formatCFA(cand.sellingPrice || cand.price || 0)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-card border border-theme rounded-xl text-center text-muted text-xs">
                      Aucun autre produit dans le catalogue pour l'instant.
                    </div>
                  )}

                  {/* Remise du Pack */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-theme/60">
                    <div className="flex items-center gap-2">
                      <Percent className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-bold text-body">Remise appliquée au pack :</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {[5, 10, 15, 20].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => { playTapBeep(); setBundleDiscountPercent(pct); }}
                          className={`px-2 py-0.5 rounded-lg text-xs font-black cursor-pointer transition ${
                            bundleDiscountPercent === pct
                              ? 'bg-amber-500 text-slate-950 shadow-xs'
                              : 'bg-card border border-theme text-muted hover:text-body'
                          }`}
                        >
                          -{pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculateur Dynamique en Direct */}
                  {bundleProductIds.length > 0 && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl space-y-1 text-xs text-body animate-in fade-in">
                      <div className="flex items-center justify-between text-muted text-[11px]">
                        <span>Prix normal ({1 + bundleCalculation.selectedProds.length} articles) :</span>
                        <span className="line-through">{formatCFA(bundleCalculation.regularTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                        <span>Prix du Pack ({bundleDiscountPercent}% de remise) :</span>
                        <span>{formatCFA(bundleCalculation.discountedTotal)}</span>
                      </div>
                      <div className="text-[10.5px] font-bold text-emerald-500 text-right">
                        Économie client : {formatCFA(bundleCalculation.savings)} !
                      </div>
                    </div>
                  )}

                </div>

              </div>
            )}
          </div>

          {/* Boutons de Soumission */}
          <div className="pt-2 border-t border-theme flex gap-2">
            <button
              type="button"
              onClick={() => { playCancelSound(); onClose(); }}
              className="flex-1 bg-secondary hover:bg-card-hover border border-theme py-3 rounded-xl font-bold text-xs text-body transition cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white py-3 rounded-xl font-black text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{productToEdit ? "Mettre à jour l'article" : "Enregistrer l'article"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Assistant Marketing IA */}
      {isMarketingAIOpen && (
        <React.Suspense fallback={null}>
          <MarketingAIAssistantModal
            isOpen={isMarketingAIOpen}
            onClose={() => setIsMarketingAIOpen(false)}
            initialProductName={name}
            initialFeatures={category ? `Rayon / Catégorie : ${category}` : ''}
            initialPrice={Number(sellingPrice) || 0}
            storeName={storeId}
            currentUser={currentUser}
            subscription={subscription}
            onInsertIntoDescription={(text) => {
              setDescription(text);
              setIsMarketingAIOpen(false);
            }}
            onOpenUpgrade={onOpenUpgrade}
          />
        </React.Suspense>
      )}

      {/* Mini-Modal Génération Image Produit IA */}
      {isAiImageModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in duration-150 select-none">
          <div 
            className="w-full max-w-lg bg-card border border-theme rounded-3xl overflow-hidden shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-theme">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-500">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-body">Créer l'image du produit avec l'IA</h3>
                  <p className="text-[11px] text-muted">Générez un visuel packshot 4K et enregistrez-le directement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiImageModalOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-body hover:bg-card-hover transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-body block">
                Prompt descriptif de l'image souhaitée :
              </label>
              <textarea
                rows={3}
                value={aiImagePrompt}
                onChange={(e) => setAiImagePrompt(e.target.value)}
                placeholder="Ex: Sac de riz 25kg posé sur table en bois, fond blanc studio 4K net, packshot professionnel..."
                className="w-full p-3 rounded-2xl bg-input border border-theme focus:border-blue-500 text-xs text-body placeholder:text-muted outline-none leading-relaxed"
              />

              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  "Fond blanc studio 4K",
                  "Packshot e-commerce",
                  "Éclairage publicitaire chic",
                  "Mise en situation naturelle"
                ].map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setAiImagePrompt(prev => prev ? `${prev}, ${tag.toLowerCase()}` : tag);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-card-hover border border-theme text-[10.5px] font-semibold text-muted hover:text-body transition cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {aiImageError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{aiImageError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-theme">
              <button
                type="button"
                onClick={() => setIsAiImageModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-secondary hover:bg-card-hover text-body border border-theme font-bold text-xs transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isGeneratingImage || !aiImagePrompt.trim()}
                onClick={async () => {
                  playTapBeep();
                  setIsGeneratingImage(true);
                  setAiImageError(null);
                  try {
                    const res = await generateAIMedia({
                      prompt: aiImagePrompt.trim(),
                      type: 'image',
                      options: {
                        productName: name,
                        category
                      }
                    });
                    if (res && res.mediaUrl) {
                      playValidationBeep();
                      setPhotoUrl(res.mediaUrl);
                      setIsAiImageModalOpen(false);
                    } else {
                      throw new Error("Aucune URL d'image reçue du générateur.");
                    }
                  } catch (err: any) {
                    setAiImageError(err?.message || "Échec de la génération de l'image.");
                    playCancelSound();
                  } finally {
                    setIsGeneratingImage(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-40"
              >
                {isGeneratingImage ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Création en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Générer & Appliquer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddProductModal;
