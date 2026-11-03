import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  InventoryProduct,
  StockMovement,
  LossRecord,
  StoreSubscription,
  StoreUser
} from '../../../types';
import { checkAndBlockDemoAction } from '../../../utils/demoSecurityGuard';
import { formatCFA, playValidationBeep, playTapBeep, playCancelSound } from '../../../utils/audio';
import { compressImageToBase64 } from '../../../utils/imageCompressor';
import { isLimitReached, triggerLimitReachedUpsell } from '../../../utils/planFeatures';
import { BarcodeSelfieScanner } from '../../../apps/pos/components/BarcodeSelfieScanner';
import {
  Package,
  PlusCircle,
  AlertTriangle,
  ArrowLeft,
  Search,
  Truck,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Boxes,
  Plus,
  X,
  History,
  ClipboardCheck,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Barcode,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Edit3,
  Loader2,
  Upload,
  UploadCloud,
  ZoomIn,
  Lock,
  Eye,
  Video,
  WifiOff
} from 'lucide-react';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { ImageLightboxModal } from '../../../components/ImageLightboxModal';
import { ExcelImporterModal, DuplicateHandlingMode } from '../../../components/inventory/ExcelImporterModal';

interface InventoryViewProps {
  inventory: InventoryProduct[];
  movements: StockMovement[];
  onBackToRegister: () => void;
  onRestockProduct: (productId: string, quantityToAdd: number, updatedCostPrice?: number) => void;
  onReconcileStock: (productId: string, actualStock: number, note?: string, recordAsLoss?: boolean) => void;
  onAddNewProduct: (newProduct: Omit<InventoryProduct, 'id' | 'storeId'> & { id?: string; storeId?: string; barcode?: string; photoUrl?: string }) => void;
  onUpdateProduct?: (updatedProduct: InventoryProduct) => void;
  onRecordLoss?: (lossData: Omit<LossRecord, 'id' | 'timestamp'>) => void;
  isCashierMode?: boolean;
  onRequireManagerAuth?: (action: () => void, title: string, badge?: string, description?: string) => void;
  storeId?: string;
  onBatchImportProducts?: (importedProducts: InventoryProduct[]) => void;
  subscription?: StoreSubscription | null;
  currentUser?: StoreUser | null;
  onOpenMarketingAi?: (product?: { name?: string; features?: string; price?: number; initialMode?: 'text' | 'image' | 'video' }) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  movements,
  onBackToRegister,
  onRestockProduct,
  onReconcileStock,
  onAddNewProduct,
  onUpdateProduct,
  onRecordLoss,
  isCashierMode = false,
  onRequireManagerAuth,
  storeId,
  onBatchImportProducts,
  subscription,
  currentUser,
  onOpenMarketingAi,
}) => {
  const { isOnline } = useNetworkStatus();
  // Navigation tabs within Inventory view: 'TABLE' or 'MOVEMENTS'
  const [activeTab, setActiveTab] = useState<'TABLE' | 'MOVEMENTS'>('TABLE');

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'CRITICAL' | 'NORMAL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals state
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isExcelImporterOpen, setIsExcelImporterOpen] = useState(false);

  // Selected product for quick actions
  const [targetProductId, setTargetProductId] = useState<string>(
    inventory.length > 0 ? inventory[0].id : ''
  );

  // Restock modal state
  const [restockQty, setRestockQty] = useState<number>(24);
  const [customRestockQty, setCustomRestockQty] = useState<string>('24');
  const [restockCostPrice, setRestockCostPrice] = useState<number | undefined>(undefined);

  // Reconciliation modal state
  const [reconcileActualStock, setReconcileActualStock] = useState<number>(0);
  const [reconcileNote, setReconcileNote] = useState<string>('Comptage physique');
  const [recordNegativeDifferenceAsLoss, setRecordNegativeDifferenceAsLoss] = useState<boolean>(true);

  // New product modal state
  const [newProdName, setNewProdName] = useState('');
  const [newProdId, setNewProdId] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdPhotoUrl, setNewProdPhotoUrl] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Épicerie');
  const [newProdCostPrice, setNewProdCostPrice] = useState<number>(500);
  const [newProdSellingPrice, setNewProdSellingPrice] = useState<number>(700);
  const [newProdStock, setNewProdStock] = useState<number>(20);
  const [newProdUnit, setNewProdUnit] = useState('unité');
  const [newProdKeywords, setNewProdKeywords] = useState('');
  const [newProdDescription, setNewProdDescription] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt?: string; title?: string } | null>(null);

  // Edit product modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);

  // Scanner modal state within Inventory
  const [isInventoryScannerOpen, setIsInventoryScannerOpen] = useState(false);
  const [scanTargetField, setScanTargetField] = useState<'NEW' | 'EDIT'>('NEW');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [inventory]);

  // Key KPI calculations
  const totalItemsCount = inventory.length;
  const criticalStockItems = useMemo(
    () => inventory.filter((p) => p.stock < 5),
    [inventory]
  );
  const criticalCount = criticalStockItems.length;

  const totalStockValuationCost = useMemo(
    () => inventory.reduce((sum, p) => sum + p.stock * p.costPrice, 0),
    [inventory]
  );

  const totalStockValuationSale = useMemo(
    () => inventory.reduce((sum, p) => sum + p.stock * p.sellingPrice, 0),
    [inventory]
  );

  const totalPotentialMargin = totalStockValuationSale - totalStockValuationCost;

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return inventory.filter((prod) => {
      // Filter by stock level
      if (filterMode === 'CRITICAL' && prod.stock >= 5) return false;
      if (filterMode === 'NORMAL' && prod.stock < 5) return false;

      // Filter by category
      if (selectedCategory !== 'ALL' && prod.category !== selectedCategory) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = prod.name.toLowerCase().includes(q);
        const matchesCat = prod.category?.toLowerCase().includes(q);
        const matchesKw = prod.keywords?.some((k) => k.toLowerCase().includes(q));
        if (!matchesName && !matchesCat && !matchesKw) return false;
      }

      return true;
    });
  }, [inventory, filterMode, selectedCategory, searchQuery]);

  // Selected product object for modals
  const selectedProduct = useMemo(
    () => inventory.find((p) => p.id === targetProductId) || inventory[0],
    [inventory, targetProductId]
  );

  // Démasquage temporaire des marges pour le caissier autorisé
  const [isMarginRevealed, setIsMarginRevealed] = useState(false);

  const handleGuardedAction = (
    action: () => void,
    title: string = 'Autorisation Gérant Requise',
    badge?: string,
    description?: string
  ) => {
    if (isCashierMode && onRequireManagerAuth) {
      onRequireManagerAuth(action, title, badge, description);
    } else {
      action();
    }
  };

  // Open Restock Modal pre-targeted
  const openRestockFor = (prodId?: string) => {
    handleGuardedAction(() => {
      playTapBeep();
      const id = prodId || (inventory.length > 0 ? inventory[0].id : '');
      setTargetProductId(id);
      setRestockQty(24);
      setCustomRestockQty('24');
      const prod = inventory.find((p) => p.id === id);
      setRestockCostPrice(prod ? prod.costPrice : undefined);
      setIsRestockModalOpen(true);
    }, 'Arrivage de Stock', 'Arrivage', 'Le code secret Master PIN du gérant est requis pour enregistrer un nouvel arrivage de stock.');
  };

  // Open Reconcile Modal pre-targeted
  const openReconcileFor = (prodId?: string) => {
    handleGuardedAction(() => {
      playTapBeep();
      const id = prodId || (inventory.length > 0 ? inventory[0].id : '');
      setTargetProductId(id);
      const prod = inventory.find((p) => p.id === id);
      const currentStock = prod ? prod.stock : 0;
      setReconcileActualStock(currentStock);
      setReconcileNote('Comptage physique');
      setRecordNegativeDifferenceAsLoss(true);
      setIsReconcileModalOpen(true);
    }, 'Rapprochement de Stock', 'Rapprochement', 'Le code secret Master PIN du gérant est requis pour ajuster manuellement le niveau de stock.');
  };

  // Submit Restock
  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const qty = Number(customRestockQty) || restockQty;
    if (qty <= 0) return;

    onRestockProduct(selectedProduct.id, qty, restockCostPrice);
    playValidationBeep();
    setIsRestockModalOpen(false);
    showToast(`Arrivage enregistré : +${qty} ${selectedProduct.unit} de ${selectedProduct.name} !`);
  };

  // Submit Reconciliation
  const handleConfirmReconcile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const actual = Math.max(0, Number(reconcileActualStock));
    const previous = selectedProduct.stock;
    const diff = actual - previous;

    onReconcileStock(selectedProduct.id, actual, reconcileNote, recordNegativeDifferenceAsLoss);
    playValidationBeep();
    setIsReconcileModalOpen(false);

    if (diff < 0) {
      showToast(
        `Rapprochement : ${selectedProduct.name} ajusté à ${actual} (${diff} unités manquantes enregistrées)`
      );
    } else if (diff > 0) {
      showToast(
        `Rapprochement : ${selectedProduct.name} ajusté à ${actual} (+${diff} unités surplus)`
      );
    } else {
      showToast(`Rapprochement : ${selectedProduct.name} conforme (${actual} unités)`);
    }
  };

  // Open New Product modal
  const openNewProductModal = () => {
    if (isLimitReached(subscription, 'PRODUCTS', inventory.length)) {
      triggerLimitReachedUpsell('PRODUCTS', inventory.length, 3, 'produits');
      return;
    }
    handleGuardedAction(() => {
      playTapBeep();
      setNewProdName('');
      setNewProdId(`REF-${Math.floor(1000 + Math.random() * 9000)}`);
      setNewProdBarcode('');
      setNewProdPhotoUrl('');
      setNewProdCategory('Épicerie');
      setNewProdCostPrice(500);
      setNewProdSellingPrice(700);
      setNewProdStock(20);
      setNewProdUnit('unité');
      setNewProdKeywords('');
      setIsNewProductModalOpen(true);
    }, 'Créer un Nouvel Article', 'Catalogue', 'Le code secret Master PIN du gérant est requis pour créer un nouvel article dans le catalogue.');
  };

  // Open Edit Product modal
  const openEditProductModal = (prod: InventoryProduct) => {
    handleGuardedAction(() => {
      playTapBeep();
      setEditingProduct({ ...prod });
      setIsEditModalOpen(true);
    }, `Modifier : ${prod.name}`, 'Catalogue', 'Le code secret Master PIN du gérant est requis pour modifier les prix ou informations de cet article.');
  };

  // Open Excel / CSV Importer modal
  const openExcelImporter = () => {
    handleGuardedAction(
      () => {
        playTapBeep();
        setIsExcelImporterOpen(true);
      },
      'Importer Excel / CSV',
      'Catalogue',
      'Le code secret Master PIN du gérant est requis pour importer un catalogue d\'articles.'
    );
  };

  // Handle batch import confirmation
  const handleBatchImportConfirm = (
    productsToImport: InventoryProduct[],
    duplicateMode: DuplicateHandlingMode,
    summary: { total: number; added: number; updated: number; skipped: number }
  ) => {
    if (onBatchImportProducts) {
      onBatchImportProducts(productsToImport);
    } else {
      productsToImport.forEach((prod) => {
        const existing = inventory.find((p) => p.id === prod.id);
        if (existing && onUpdateProduct) {
          onUpdateProduct(prod);
        } else {
          onAddNewProduct(prod);
        }
      });
    }
    showToast(`🎉 ${summary.added + summary.updated} produits ajoutés à votre boutique avec succès !`);
  };

  // Upload file helper
  const handleFileUpload = async (file: File, isEdit: boolean = false) => {
    setIsUploadingPhoto(true);
    try {
      const base64 = await compressImageToBase64(file, 400, 400, 0.7);
      if (isEdit) {
        setEditingProduct((prev) => (prev ? { ...prev, photoUrl: base64, imageUrl: base64 } : null));
      } else {
        setNewProdPhotoUrl(base64);
      }
      showToast('Photo optimisée et compressée !');
    } catch (err) {
      console.error(err);
      showToast('Erreur compression photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Barcode generator
  const generateRandomBarcode = (isEdit: boolean = false) => {
    playTapBeep();
    const generated = `618${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    if (isEdit) {
      setEditingProduct((prev) => (prev ? { ...prev, barcode: generated } : null));
    } else {
      setNewProdBarcode(generated);
    }
  };

  // Submit New Product
  const handleConfirmNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkAndBlockDemoAction(currentUser)) {
      setIsNewProductModalOpen(false);
      return;
    }
    if (!newProdName.trim()) return;

    const keywords = newProdKeywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const productId = newProdId.trim() || (typeof crypto !== 'undefined' && crypto.randomUUID ? `prod-${crypto.randomUUID()}` : `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

    onAddNewProduct({
      id: productId,
      barcode: newProdBarcode.trim() || '',
      photoUrl: newProdPhotoUrl.trim() || '',
      name: newProdName.trim(),
      category: newProdCategory.trim() || 'Divers',
      costPrice: Math.max(0, Number(newProdCostPrice) || 0),
      sellingPrice: Math.max(0, Number(newProdSellingPrice) || 0),
      stock: Math.max(0, Number(newProdStock) || 0),
      unit: newProdUnit.trim() || 'unité',
      keywords: keywords.length > 0 ? keywords : [newProdName.toLowerCase()],
      description: newProdDescription.trim(),
      richDescription: newProdDescription.trim(),
    });

    playValidationBeep();
    setIsNewProductModalOpen(false);
    setNewProdName('');
    setNewProdDescription('');
    showToast(`Produit "${newProdName}" ajouté avec succès (ID: ${newProdId || 'auto'}) !`);
  };

  // Submit Edit Product
  const handleConfirmEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkAndBlockDemoAction(currentUser)) {
      setIsEditModalOpen(false);
      return;
    }
    if (!editingProduct || !editingProduct.name.trim()) return;

    if (onUpdateProduct) {
      onUpdateProduct(editingProduct);
      playValidationBeep();
      setIsEditModalOpen(false);
      showToast(`Produit "${editingProduct.name}" mis à jour avec succès !`);
    } else {
      setIsEditModalOpen(false);
    }
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-slate-950 text-slate-100 select-none overflow-y-auto md:overflow-hidden pb-16 md:pb-0" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
      {/* Top Header Bar */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-3 py-2.5 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            id="btn-inventory-back"
            type="button"
            onClick={onBackToRegister}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Retour à la caisse"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-blue-400" />
              <h1 className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                Inventaire & Produits
              </h1>
            </div>
            <p className="text-[11px] text-slate-400">
              Gestion de stock, arrivages rapides & rapprochement
            </p>
          </div>
        </div>

        {/* Action Buttons Top */}
        <div className="flex items-center gap-1.5">
          {/* Saisie Rapide Arrivage (2 clics) */}
          <button
            id="btn-open-restock-top"
            type="button"
            onClick={() => openRestockFor()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-900/30 active:scale-95 transition-all cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Arrivage de Stock</span>
            {isCashierMode && <Lock className="w-3 h-3 text-amber-300 shrink-0" />}
          </button>

          {/* Rapprochement de stock */}
          <button
            id="btn-open-reconcile-top"
            type="button"
            onClick={() => openReconcileFor()}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-indigo-100 font-semibold text-xs border border-indigo-500/40 active:scale-95 transition-all cursor-pointer"
            title="Rapprochement / Inventaire physique"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-indigo-300" />
            <span>Rapprochement</span>
            {isCashierMode && <Lock className="w-3 h-3 text-amber-300 shrink-0" />}
          </button>

          {/* Importer Excel / CSV */}
          <button
            id="btn-open-excel-importer"
            type="button"
            onClick={openExcelImporter}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white font-bold text-xs border border-blue-500/40 shadow-sm active:scale-95 transition-all cursor-pointer"
            title="Importer des articles depuis un classeur Excel (.xlsx, .xls) ou CSV"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="hidden sm:inline">Importer Excel / CSV</span>
            <span className="sm:hidden">Import</span>
            {isCashierMode && <Lock className="w-3 h-3 text-amber-300 shrink-0" />}
          </button>

          {/* Nouveau Produit */}
          <button
            id="btn-add-product"
            type="button"
            onClick={openNewProductModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-900/30 active:scale-95 transition-all cursor-pointer"
            title="Ajouter un nouvel article (Photo, Code-barres, ID)"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nouvel Article</span>
            {isCashierMode && <Lock className="w-3 h-3 text-amber-300 shrink-0" />}
          </button>
        </div>
      </div>

      {/* Alerte Visuelle Mode Hors-ligne Stock */}
      {!isOnline && (
        <div className="shrink-0 mx-3 sm:mx-4 mt-2 mb-1 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2 shadow-sm">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Mode Hors-ligne : Les consultations et ajustements de stock locaux fonctionnent normalement via le cache IndexedDB. La génération de vidéos pub IA nécessite une connexion internet.</span>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="shrink-0 bg-slate-900/60 border-b border-slate-800/80 px-3 py-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Total Articles */}
          <div className="bg-slate-800/60 rounded-xl p-2 border border-slate-700/50">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Articles</span>
              <Package className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-base sm:text-lg font-black text-white mt-0.5">
              {totalItemsCount}{' '}
              <span className="text-[10px] font-normal text-slate-400">références</span>
            </div>
          </div>

          {/* Alertes Stock Critique (< 5) */}
          <button
            id="card-critical-stock"
            type="button"
            onClick={() => {
              playTapBeep();
              setFilterMode(filterMode === 'CRITICAL' ? 'ALL' : 'CRITICAL');
            }}
            className={`rounded-xl p-2 border text-left transition-all cursor-pointer ${
              criticalCount > 0
                ? 'bg-red-950/40 border-red-500/50 hover:bg-red-950/60'
                : 'bg-slate-800/60 border-slate-700/50'
            }`}
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className={criticalCount > 0 ? 'text-red-300 font-bold' : 'text-slate-400'}>
                Stock Critique (&lt; 5)
              </span>
              <AlertTriangle
                className={`w-3.5 h-3.5 ${
                  criticalCount > 0 ? 'text-red-400 animate-pulse' : 'text-slate-500'
                }`}
              />
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className={`text-base sm:text-lg font-black ${
                  criticalCount > 0 ? 'text-red-400' : 'text-slate-300'
                }`}
              >
                {criticalCount}
              </span>
              <span className="text-[10px] text-red-300/80 font-medium">
                {criticalCount > 0 ? 'À réapprovisionner' : 'Tous suffisants'}
              </span>
            </div>
          </button>

          {/* Valeur du Stock (Coût d'Achat) */}
          <div className="bg-slate-800/60 rounded-xl p-2 border border-slate-700/50">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Valeur Stock (Achat)</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-300 mt-0.5 flex items-center justify-between gap-1">
              {isCashierMode && !isMarginRevealed ? (
                <>
                  <span className="tracking-widest text-slate-400 font-mono text-sm">•••••• F CFA</span>
                  <button
                    type="button"
                    onClick={() => handleGuardedAction(() => setIsMarginRevealed(true), 'Déverrouillage Marges & Coûts', 'Marges', 'Le code secret Master PIN du gérant est requis pour consulter la valeur d\'achat et les marges.')}
                    className="text-[10px] text-amber-300 hover:text-amber-200 flex items-center gap-1 bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-500/40 active:scale-95 transition-all cursor-pointer shrink-0"
                    title="Déverrouiller avec le Master PIN"
                  >
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    <span>Afficher</span>
                  </button>
                </>
              ) : (
                <span>{formatCFA(totalStockValuationCost)}</span>
              )}
            </div>
          </div>

          {/* Marge Potentielle */}
          <div className="bg-slate-800/60 rounded-xl p-2 border border-slate-700/50">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Marge Potentielle</span>
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-base sm:text-lg font-black text-blue-300 mt-0.5 flex items-center justify-between gap-1">
              {isCashierMode && !isMarginRevealed ? (
                <>
                  <span className="tracking-widest text-slate-400 font-mono text-sm">•••••• F CFA</span>
                  <button
                    type="button"
                    onClick={() => handleGuardedAction(() => setIsMarginRevealed(true), 'Déverrouillage Marges & Coûts', 'Marges', 'Le code secret Master PIN du gérant est requis pour consulter la valeur d\'achat et les marges.')}
                    className="text-[10px] text-amber-300 hover:text-amber-200 flex items-center gap-1 bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-500/40 active:scale-95 transition-all cursor-pointer shrink-0"
                    title="Déverrouiller avec le Master PIN"
                  >
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    <span>Afficher</span>
                  </button>
                </>
              ) : (
                <span>+{formatCFA(totalPotentialMargin)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subnav & Search Controls */}
      <div className="shrink-0 bg-slate-900/40 border-b border-slate-800 px-3 py-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* Switch between Products Table & Movements History */}
        <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 shrink-0">
          <button
            id="tab-inventory-table"
            type="button"
            onClick={() => setActiveTab('TABLE')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'TABLE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tableau des Produits ({inventory.length})
          </button>
          <button
            id="tab-inventory-movements"
            type="button"
            onClick={() => setActiveTab('MOVEMENTS')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'MOVEMENTS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Suivi Mouvements ({movements.length})</span>
          </button>
        </div>

        {activeTab === 'TABLE' && (
          <div className="flex items-center gap-2 flex-1 sm:justify-end">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="input-inventory-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un article..."
                className="w-full pl-8 pr-7 py-1 text-xs bg-slate-800/90 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Filter Badges */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                id="filter-stock-all"
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`px-2 py-1 text-[11px] rounded-lg font-medium transition-colors cursor-pointer ${
                  filterMode === 'ALL'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                Tous
              </button>
              <button
                id="filter-stock-critical"
                type="button"
                onClick={() => setFilterMode('CRITICAL')}
                className={`px-2 py-1 text-[11px] rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  filterMode === 'CRITICAL'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-red-950/40 text-red-400 border border-red-800/40 hover:bg-red-900/40'
                }`}
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>&lt; 5 ({criticalCount})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2 pb-28 md:pb-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
        {toastMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* VIEW 1: TABLEAU DES PRODUITS */}
        {activeTab === 'TABLE' && (
          <div className="space-y-2">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
                <Boxes className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">Aucun produit trouvé</p>
                <p className="text-xs text-slate-500 mt-1">
                  Essayez de modifier votre recherche ou le filtre de stock.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
                {/* Desktop & Tablet Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                        <th className="py-2.5 px-3">Article</th>
                        <th className="py-2.5 px-2 text-right">Prix d'Achat</th>
                        <th className="py-2.5 px-2 text-right">Prix de Vente</th>
                        <th className="py-2.5 px-2 text-right hidden sm:table-cell">Marge</th>
                        <th className="py-2.5 px-3 text-center">Stock Restant</th>
                        <th className="py-2.5 px-3 text-right">Actions Rapides</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {filteredProducts.map((prod) => {
                        const isCritical = prod.stock < 5;
                        const margin = prod.sellingPrice - prod.costPrice;
                        const marginPercent =
                          prod.costPrice > 0 ? Math.round((margin / prod.costPrice) * 100) : 0;

                        return (
                          <tr
                            key={prod.id}
                            className={`hover:bg-slate-800/40 transition-colors ${
                              isCritical ? 'bg-red-950/15' : ''
                            }`}
                          >
                            {/* Image, Nom, ID, Barcode & Catégorie */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                {/* Vignette Photo Produit */}
                                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 shrink-0 overflow-hidden flex items-center justify-center relative group/img">
                                  {prod.photoUrl ? (
                                    <>
                                      <img
                                        src={prod.photoUrl}
                                        alt={prod.name}
                                        className="w-full h-full object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          playTapBeep();
                                          setLightboxImage({
                                            url: prod.photoUrl!,
                                            alt: prod.name,
                                            title: `${prod.name} • ${formatCFA(prod.sellingPrice)}`,
                                          });
                                        }}
                                        className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-blue-300 hover:text-white transition cursor-pointer"
                                        title="Agrandir et inspecter l'image"
                                      >
                                        <ZoomIn className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <div className="text-xs font-black text-blue-400 bg-blue-950/40 w-full h-full flex items-center justify-center">
                                      {prod.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="font-bold text-white text-sm flex items-center gap-1.5 flex-wrap">
                                    <span>{prod.name}</span>
                                    {isCritical && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-extrabold text-[10px] border border-red-500/40 animate-pulse">
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        <span>CRITIQUE</span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
                                      {prod.category}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded bg-slate-800/80 text-blue-300 font-mono text-[10px] border border-slate-700">
                                      ID: {prod.id}
                                    </span>
                                    {prod.barcode && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-950/40 text-amber-300 font-mono text-[10px] border border-amber-500/30">
                                        <Barcode className="w-2.5 h-2.5" />
                                        <span>{prod.barcode}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Prix d'Achat */}
                            <td className="py-2.5 px-2 text-right font-medium text-slate-300">
                              {formatCFA(prod.costPrice)}
                            </td>

                            {/* Prix de Vente */}
                            <td className="py-2.5 px-2 text-right font-bold text-white">
                              {formatCFA(prod.sellingPrice)}
                            </td>

                            {/* Marge Unitaire */}
                            <td className="py-2.5 px-2 text-right hidden sm:table-cell">
                              <div className="font-bold text-blue-300">+{formatCFA(margin)}</div>
                              <div className="text-[10px] text-slate-400">+{marginPercent}%</div>
                            </td>

                            {/* Stock Restant avec Badge d'alerte rouge si < 5 */}
                            <td className="py-2.5 px-3 text-center">
                              {isCritical ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/25 text-red-300 font-black text-xs border border-red-500/50 shadow-sm shadow-red-950/50">
                                    <AlertTriangle className="w-3 h-3 text-red-400" />
                                    <span>{prod.stock} {prod.unit}s</span>
                                  </span>
                                  <span className="text-[9px] font-bold text-red-400 mt-0.5">
                                    Rupture imminente (&lt; 5)
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>{prod.stock} {prod.unit}s</span>
                                </span>
                              )}
                            </td>

                            {/* Actions Rapides */}
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Bouton Arrivage Rapide (2 clics) */}
                                <button
                                  id={`btn-row-restock-${prod.id}`}
                                  type="button"
                                  onClick={() => openRestockFor(prod.id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white font-semibold text-[11px] active:scale-95 transition-all cursor-pointer shadow-sm"
                                  title="Réapprovisionner en 2 clics"
                                >
                                  <PlusCircle className="w-3 h-3" />
                                  <span>+ Arrivage</span>
                                  {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-300 shrink-0" />}
                                </button>

                                {/* Bouton Rapprochement / Comptage Physique */}
                                <button
                                  id={`btn-row-reconcile-${prod.id}`}
                                  type="button"
                                  onClick={() => openReconcileFor(prod.id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-[11px] border border-slate-700 active:scale-95 transition-all cursor-pointer"
                                  title="Rapprochement / Ajustement réel"
                                >
                                  <ClipboardCheck className="w-3 h-3 text-indigo-400" />
                                  <span className="hidden sm:inline">Ajuster</span>
                                  {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-300 shrink-0" />}
                                </button>

                                {/* Bouton Modifier (Photo, Barcode, Nom, Prix) */}
                                <button
                                  id={`btn-row-edit-${prod.id}`}
                                  type="button"
                                  onClick={() => openEditProductModal(prod)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-blue-900/60 text-slate-300 hover:text-blue-200 font-medium text-[11px] border border-slate-700 hover:border-blue-500/50 active:scale-95 transition-all cursor-pointer"
                                  title="Modifier les informations de l'article"
                                >
                                  <Edit3 className="w-3 h-3 text-blue-400" />
                                  <span className="hidden md:inline">Modifier</span>
                                  {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-300 shrink-0" />}
                                </button>

                                {/* Bouton Créer Image / Vidéo Pub (Studio IA Interne) */}
                                <button
                                  id={`btn-row-videopub-${prod.id}`}
                                  type="button"
                                  onClick={() => {
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
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-[11px] border active:scale-95 transition-all shadow-xs bg-violet-950/60 hover:bg-violet-900/80 text-violet-200 hover:text-white border-violet-700/60 hover:border-violet-500/80 cursor-pointer"
                                  title={`Créer une Image ou Vidéo Pub IA pour ${prod.name} dans le Studio IA interne`}
                                  aria-label="Image/Video Pub Studio IA"
                                >
                                  <div className="flex items-center gap-1 shrink-0">
                                    <ImageIcon className="w-3 h-3 text-fuchsia-400" />
                                    <Video className="w-3 h-3 text-violet-400" />
                                  </div>
                                  <span className="hidden sm:inline font-semibold">Image/Video Pub</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: SUIVI DES MOUVEMENTS DE STOCK */}
        {activeTab === 'MOVEMENTS' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Journal des Entrées / Sorties et Rapprochements
              </h2>
              <span className="text-[11px] text-slate-500">
                {movements.length} mouvement{movements.length > 1 ? 's' : ''}
              </span>
            </div>

            {movements.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
                <History className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">Aucun mouvement enregistré</p>
                <p className="text-xs text-slate-500 mt-1">
                  Les arrivages et ajustements apparaîtront ici automatiquement.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/60">
                {movements.map((mov) => {
                  const isPositive = mov.quantityDelta > 0;
                  return (
                    <div
                      key={mov.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                            mov.type === 'ARRIVAGE'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : mov.type === 'RAPPROCHEMENT'
                              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span>{mov.productName}</span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                mov.type === 'ARRIVAGE'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                                  : mov.type === 'RAPPROCHEMENT'
                                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/50'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {mov.type === 'ARRIVAGE'
                                ? 'Arrivage'
                                : mov.type === 'RAPPROCHEMENT'
                                ? 'Rapprochement'
                                : mov.type}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {mov.date} • Stock : {mov.previousStock} →{' '}
                            <span className="font-semibold text-slate-200">{mov.newStock}</span>
                            {mov.note && (
                              <span className="italic text-slate-400 ml-1">({mov.note})</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quantité Delta */}
                      <div className="text-right">
                        <div
                          className={`text-sm font-black ${
                            isPositive ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {isPositive ? `+${mov.quantityDelta}` : mov.quantityDelta}
                        </div>
                        <div className="text-[10px] text-slate-500">unités</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1 : SAISIE RAPIDE DE RÉAPPROVISIONNEMENT (2 CLICS)                   */}
      {/* ========================================================================= */}
      {isRestockModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-emerald-950/60 border-b border-emerald-800/40 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Arrivage de Stock Rapide</h3>
                  <p className="text-[11px] text-emerald-300/80">
                    Réapprovisionnement en 2 clics
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRestockModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRestock} className="p-4 space-y-4">
              {/* Étape 1 : Choisir / Confirmer l'article */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  1. Article à réapprovisionner :
                </label>
                <select
                  id="select-restock-product"
                  value={selectedProduct.id}
                  onChange={(e) => {
                    setTargetProductId(e.target.value);
                    const p = inventory.find((it) => it.id === e.target.value);
                    if (p) setRestockCostPrice(p.costPrice);
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500"
                >
                  {inventory.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock actuel : {p.stock} {p.unit}s)
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-slate-400 flex justify-between">
                  <span>Stock actuel : <strong className="text-white">{selectedProduct.stock} {selectedProduct.unit}s</strong></span>
                  <span>Prix vente : <strong className="text-white">{formatCFA(selectedProduct.sellingPrice)}</strong></span>
                </div>
              </div>

              {/* Étape 2 : Boutons d'ajout de quantité en 1 clic (2 clics au total) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  2. Quantité d'arrivage (choix rapide en 1 clic) :
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[6, 12, 24, 48, 100].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setRestockQty(qty);
                        setCustomRestockQty(String(qty));
                      }}
                      className={`py-2 px-1 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                        Number(customRestockQty) === qty
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                      }`}
                    >
                      +{qty}
                    </button>
                  ))}
                </div>

                {/* Saisie libre de la quantité */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-400 shrink-0">Ou quantité exacte :</span>
                  <input
                    id="input-custom-restock-qty"
                    type="number"
                    min="1"
                    value={customRestockQty}
                    onChange={(e) => {
                      setCustomRestockQty(e.target.value);
                      setRestockQty(Number(e.target.value) || 0);
                    }}
                    className="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-emerald-500"
                    placeholder="Ex: 24"
                  />
                  <span className="text-xs text-slate-400">{selectedProduct.unit}s</span>
                </div>
              </div>

              {/* Prix d'achat grossiste (optionnel, modifiable si tarif changé) */}
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Prix d'achat fournisseur unitaire :</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="input-restock-cost-price"
                      type="number"
                      value={restockCostPrice ?? selectedProduct.costPrice}
                      onChange={(e) => setRestockCostPrice(Number(e.target.value))}
                      className="w-24 px-2 py-1 text-xs text-right bg-slate-900 border border-slate-600 rounded-lg text-emerald-300 font-bold focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-400">F CFA</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Coût total de l'arrivage :{' '}
                  <strong className="text-white">
                    {formatCFA((Number(customRestockQty) || 0) * (restockCostPrice ?? selectedProduct.costPrice))}
                  </strong>
                </p>
              </div>

              {/* Résumé Prévisionnel */}
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-medium">Nouveau stock après arrivage :</span>
                <span className="font-black text-sm text-emerald-400">
                  {selectedProduct.stock} + {Number(customRestockQty) || 0} ={' '}
                  <span className="underline">
                    {selectedProduct.stock + (Number(customRestockQty) || 0)} {selectedProduct.unit}s
                  </span>
                </span>
              </div>

              {/* Bouton de Validation */}
              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  id="btn-confirm-restock"
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Valider l'Arrivage (+{Number(customRestockQty) || 0})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2 : RAPPROCHEMENT DE STOCK (COMPTAGE PHYSIQUE)                      */}
      {/* ========================================================================= */}
      {isReconcileModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-indigo-950/60 border-b border-indigo-800/40 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Rapprochement de Stock</h3>
                  <p className="text-[11px] text-indigo-300/80">
                    Ajustement réel après comptage physique
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReconcileModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReconcile} className="p-4 space-y-4">
              {/* Choix du produit */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Article compté :
                </label>
                <select
                  id="select-reconcile-product"
                  value={selectedProduct.id}
                  onChange={(e) => {
                    setTargetProductId(e.target.value);
                    const p = inventory.find((it) => it.id === e.target.value);
                    if (p) setReconcileActualStock(p.stock);
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-indigo-500"
                >
                  {inventory.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Système : {p.stock} {p.unit}s)
                    </option>
                  ))}
                </select>
              </div>

              {/* Comparaison Stock Théorique vs Réel */}
              <div className="grid grid-cols-2 gap-3">
                {/* Stock Système */}
                <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700 text-center">
                  <span className="text-[11px] text-slate-400 font-medium">Stock Théorique (Système)</span>
                  <div className="text-xl font-black text-white mt-1">
                    {selectedProduct.stock}{' '}
                    <span className="text-xs font-normal text-slate-400">{selectedProduct.unit}s</span>
                  </div>
                </div>

                {/* Stock Réel Compté */}
                <div className="p-3 rounded-xl bg-indigo-950/50 border border-indigo-500/40 text-center">
                  <span className="text-[11px] text-indigo-300 font-medium">Stock Réel Compté</span>
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <input
                      id="input-reconcile-actual"
                      type="number"
                      min="0"
                      value={reconcileActualStock}
                      onChange={(e) => setReconcileActualStock(Number(e.target.value))}
                      className="w-20 px-2 py-1 text-center text-xl font-black bg-slate-900 border border-indigo-400 rounded-lg text-white focus:outline-none"
                    />
                    <span className="text-xs text-indigo-300 font-medium">{selectedProduct.unit}s</span>
                  </div>
                </div>
              </div>

              {/* Écart de Stock Calculé */}
              {(() => {
                const diff = Number(reconcileActualStock) - selectedProduct.stock;
                const costImpact = Math.abs(diff) * selectedProduct.costPrice;

                return (
                  <div
                    className={`p-3 rounded-xl border ${
                      diff === 0
                        ? 'bg-slate-800/40 border-slate-700 text-slate-300'
                        : diff < 0
                        ? 'bg-red-950/40 border-red-500/40 text-red-300'
                        : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">Écart détecté :</span>
                      <span className="font-black text-sm">
                        {diff === 0
                          ? 'Aucun écart (Stock conforme)'
                          : diff < 0
                          ? `${diff} ${selectedProduct.unit}s (Manquant)`
                          : `+${diff} ${selectedProduct.unit}s (Surplus)`}
                      </span>
                    </div>

                    {diff !== 0 && (
                      <div className="text-[11px] mt-1 text-slate-400 flex justify-between">
                        <span>Impact financier (prix d'achat) :</span>
                        <strong className={diff < 0 ? 'text-red-400' : 'text-emerald-400'}>
                          {diff < 0 ? '-' : '+'}
                          {formatCFA(costImpact)}
                        </strong>
                      </div>
                    )}

                    {/* Option d'enregistrement dans les pertes si manquant */}
                    {diff < 0 && (
                      <label className="mt-2.5 pt-2 border-t border-red-800/30 flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recordNegativeDifferenceAsLoss}
                          onChange={(e) => setRecordNegativeDifferenceAsLoss(e.target.checked)}
                          className="mt-0.5 rounded border-red-400 text-red-600 focus:ring-0"
                        />
                        <span className="text-[11px] text-red-200 leading-tight">
                          Enregistrer automatiquement ce manquant ({Math.abs(diff)} unités ={' '}
                          {formatCFA(costImpact)}) dans le journal des pertes pour recalculer le
                          bénéfice net.
                        </span>
                      </label>
                    )}
                  </div>
                );
              })()}

              {/* Note / Motif de l'ajustement */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motif ou note du rapprochement :
                </label>
                <input
                  id="input-reconcile-note"
                  type="text"
                  value={reconcileNote}
                  onChange={(e) => setReconcileNote(e.target.value)}
                  placeholder="Ex: Inventaire physique hebdomadaire, Casse non déclarée..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Bouton de Validation */}
              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsReconcileModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  id="btn-confirm-reconcile"
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ajuster au Réel ({reconcileActualStock})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3 : NOUVEAU PRODUIT                                                 */}
      {/* ========================================================================= */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-blue-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-blue-950/60 border-b border-blue-800/40 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Ajouter un Nouvel Article</h3>
                  <p className="text-[11px] text-blue-300/80">Création directe dans le catalogue</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewProductModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmNewProduct} className="p-4 space-y-3 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Photo du Produit (Upload Firebase Storage ou Local) */}
              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Photo / Image de l'article :</span>
                  </span>
                  {isUploadingPhoto && (
                    <span className="text-[10px] text-blue-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Téléversement...
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden relative group">
                    {newProdPhotoUrl ? (
                      <>
                        <img
                          src={newProdPhotoUrl}
                          alt="Aperçu"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setNewProdPhotoUrl('')}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                          title="Supprimer la photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, false);
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-900/40 hover:bg-blue-800/50 text-blue-300 border border-blue-600/40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{newProdPhotoUrl ? 'Changer' : 'Importer photo'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Formats PNG, JPG ou capture directe par caméra.
                    </p>
                  </div>
                </div>
              </div>

              {/* ID Produit / Référence & Code-Barres */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* ID Produit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>ID / Réf unique :</span>
                    <button
                      type="button"
                      onClick={() => setNewProdId(`REF-${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer"
                      title="Générer un nouvel ID"
                    >
                      🎲 Auto
                    </button>
                  </label>
                  <input
                    id="input-new-prod-id"
                    type="text"
                    value={newProdId}
                    onChange={(e) => setNewProdId(e.target.value)}
                    placeholder="Ex: REF-4091"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Code-barres / QR Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Code-barres / QR :</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => generateRandomBarcode(false)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 cursor-pointer"
                        title="Générer un code aléatoire"
                      >
                        🎲 Auto
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScanTargetField('NEW');
                          setIsInventoryScannerOpen(true);
                        }}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer font-bold"
                        title="Scanner avec la caméra"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Scan</span>
                      </button>
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      id="input-new-prod-barcode"
                      type="text"
                      value={newProdBarcode}
                      onChange={(e) => setNewProdBarcode(e.target.value)}
                      placeholder="Ex: 6181100029381"
                      className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    <Barcode className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom du produit * :
                </label>
                <input
                  id="input-new-prod-name"
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Ex: Savon liquide, Biscuits, Mayonnaise..."
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Catégorie :
                  </label>
                  <input
                    type="text"
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    placeholder="Épicerie, Boissons..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Unité :
                  </label>
                  <input
                    type="text"
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    placeholder="boîte, sachet, pièce..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prix d'achat (F CFA) :
                  </label>
                  <input
                    id="input-new-prod-cost"
                    type="number"
                    min="0"
                    value={newProdCostPrice}
                    onChange={(e) => setNewProdCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prix de vente (F CFA) * :
                  </label>
                  <input
                    id="input-new-prod-selling"
                    type="number"
                    min="0"
                    required
                    value={newProdSellingPrice}
                    onChange={(e) => setNewProdSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Stock initial :
                </label>
                <input
                  id="input-new-prod-stock"
                  type="number"
                  min="0"
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mots-clés pour reconnaissance vocale (séparés par virgules) :
                </label>
                <input
                  type="text"
                  value={newProdKeywords}
                  onChange={(e) => setNewProdKeywords(e.target.value)}
                  placeholder="Ex: mayo, pot de mayonnaise, calvé"
                  className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description détaillée (Texte ou HTML) :
                </label>
                <textarea
                  rows={3}
                  value={newProdDescription}
                  onChange={(e) => setNewProdDescription(e.target.value)}
                  placeholder="Points forts, caractéristiques ou description HTML du produit..."
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-sans"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  id="btn-confirm-add-product"
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-950 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter au Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4 : MODIFICATION D'UN PRODUIT EXISTANT                              */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-blue-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-blue-950/60 border-b border-blue-800/40 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Modifier l'Article</h3>
                  <p className="text-[11px] text-blue-300/80">Photo, code-barres, ID et tarifs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmEditProduct} className="p-4 space-y-3 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Photo du Produit */}
              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Photo de l'article :</span>
                  </span>
                  {isUploadingPhoto && (
                    <span className="text-[10px] text-blue-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Téléversement...
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden relative group">
                    {editingProduct.photoUrl ? (
                      <>
                        <img
                          src={editingProduct.photoUrl}
                          alt={editingProduct.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingProduct({ ...editingProduct, photoUrl: undefined })}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                          title="Supprimer la photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      ref={editFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, true);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-blue-900/40 hover:bg-blue-800/50 text-blue-300 border border-blue-600/40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{editingProduct.photoUrl ? 'Changer l\'image' : 'Importer image'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ID & Code-barres */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ID / Référence :
                  </label>
                  <input
                    type="text"
                    value={editingProduct.id}
                    disabled
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-800/60 border border-slate-700 rounded-xl text-slate-400 font-mono cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Code-barres / QR :</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => generateRandomBarcode(true)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 cursor-pointer"
                      >
                        🎲 Auto
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScanTargetField('EDIT');
                          setIsInventoryScannerOpen(true);
                        }}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer font-bold"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Scan</span>
                      </button>
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editingProduct.barcode || ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, barcode: e.target.value })
                      }
                      placeholder="Ex: 6181100029381"
                      className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    <Barcode className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom de l'article * :
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Catégorie :
                  </label>
                  <input
                    type="text"
                    value={editingProduct.category}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, category: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Unité :
                  </label>
                  <input
                    type="text"
                    value={editingProduct.unit}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, unit: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prix d'achat (F CFA) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.costPrice}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        costPrice: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prix de vente (F CFA) * :
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.sellingPrice}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        sellingPrice: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Stock disponible :
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingProduct.stock}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      stock: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description détaillée (Texte ou HTML) :
                </label>
                <textarea
                  rows={3}
                  value={editingProduct.richDescription || editingProduct.description || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      description: e.target.value,
                      richDescription: e.target.value,
                    })
                  }
                  placeholder="Points forts, caractéristiques ou description HTML du produit..."
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-sans"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  id="btn-confirm-edit-product"
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-950 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer Modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5 : SCANNER CAMÉRA DE CODES-BARRES POUR INVENTAIRE                  */}
      {/* ========================================================================= */}
      {isInventoryScannerOpen && (
        <BarcodeSelfieScanner
          isOpen={isInventoryScannerOpen}
          onClose={() => setIsInventoryScannerOpen(false)}
          onDetected={(code) => {
            playValidationBeep();
            if (scanTargetField === 'NEW') {
              setNewProdBarcode(code);
              showToast(`Code-barres scanné : ${code}`);
            } else if (scanTargetField === 'EDIT' && editingProduct) {
              setEditingProduct({ ...editingProduct, barcode: code });
              showToast(`Code-barres associé : ${code}`);
            }
            setIsInventoryScannerOpen(false);
          }}
        />
      )}

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

      {/* ========================================================================= */}
      {/* MODAL 6 : IMPORTATEUR INTELLIGENT EXCEL & CSV (SheetJS + Auto-Mapping)    */}
      {/* ========================================================================= */}
      {isExcelImporterOpen && (
        <ExcelImporterModal
          isOpen={isExcelImporterOpen}
          onClose={() => setIsExcelImporterOpen(false)}
          existingInventory={inventory}
          storeId={storeId || (inventory.length > 0 ? inventory[0].storeId : 'store-default')}
          onConfirmImport={handleBatchImportConfirm}
        />
      )}
    </div>
  );
};

export default InventoryView;
