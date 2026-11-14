import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  X,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Download,
  Layers,
  Check,
  RotateCcw,
  Boxes,
  HelpCircle,
  Eye,
  AlertCircle
} from 'lucide-react';
import { InventoryProduct } from '../../types';
import { formatCFA, playValidationBeep, playTapBeep, playCancelSound } from '../../utils/audio';

export interface ParsedImportItem {
  rawRowIndex: number;
  name: string;
  category: string;
  sellingPrice: number;
  costPrice: number;
  stock: number;
  barcode: string;
  unit: string;
  isValid: boolean;
  validationError?: string;
  isDuplicate?: boolean;
}

export type DuplicateHandlingMode = 'UPDATE_STOCK' | 'SKIP_DUPLICATES';

interface ExcelImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingInventory: InventoryProduct[];
  storeId: string;
  onConfirmImport: (
    productsToImport: InventoryProduct[],
    duplicateMode: DuplicateHandlingMode,
    summary: { total: number; added: number; updated: number; skipped: number }
  ) => void;
}

// Normalise une chaîne pour matching accent-agnostique et insensible à la casse
function normalizeHeader(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Nettoie et extrait un prix numérique valide à partir de divers formats texte (ex: "5 000 FCFA", "12,50", "300 F")
function parsePrice(val: any): number {
  if (val === null || val === undefined || val === '') return NaN;
  if (typeof val === 'number') return isNaN(val) ? NaN : val;

  let str = String(val).trim();
  // Retirer les unités monétaires et devises courantes
  str = str.replace(/fcfa|cfa|f\b|f\.cfa|[\$€]/gi, '').trim();
  // Remplacer les espaces insécables ou espaces de milliers
  str = str.replace(/\s+/g, '');

  if (str.includes(',') && str.includes('.')) {
    // Ex: 1.500,50 ou 1,500.50
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? NaN : num;
}

// Nettoie et extrait un stock entier positif ou nul
function parseStock(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.max(0, Math.round(val));

  const cleaned = String(val).replace(/[^\d.-]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : Math.max(0, num);
}

// Détection intelligente de la colonne pour chaque champ requis
interface ColumnMapping {
  nameIdx: number;
  sellingPriceIdx: number;
  costPriceIdx: number;
  stockIdx: number;
  categoryIdx: number;
  barcodeIdx: number;
}

function detectColumnMapping(headers: string[]): ColumnMapping {
  const normHeaders = headers.map((h) => normalizeHeader(h));

  const mapping: ColumnMapping = {
    nameIdx: -1,
    sellingPriceIdx: -1,
    costPriceIdx: -1,
    stockIdx: -1,
    categoryIdx: -1,
    barcodeIdx: -1,
  };

  normHeaders.forEach((nh, idx) => {
    if (!nh) return;

    // 1. Prix d'achat / Coût (vérifié en premier pour éviter confusion avec 'prix')
    if (
      nh.includes('prixdachat') ||
      nh.includes('prixachat') ||
      nh.includes('cout') ||
      nh.includes('cost') ||
      nh === 'pa' ||
      nh.includes('prixrevient') ||
      nh.includes('revient')
    ) {
      if (mapping.costPriceIdx === -1) mapping.costPriceIdx = idx;
      return;
    }

    // 2. Prix de vente
    if (
      nh.includes('prixdevente') ||
      nh.includes('prixvente') ||
      nh.includes('pv') ||
      nh.includes('sellingprice') ||
      nh.includes('tarif') ||
      nh.includes('montant') ||
      nh.includes('prixunitaire') ||
      nh === 'pu' ||
      nh === 'prix' ||
      nh === 'price'
    ) {
      if (mapping.sellingPriceIdx === -1) mapping.sellingPriceIdx = idx;
      return;
    }

    // 3. Stock / Quantité
    if (
      nh.includes('stock') ||
      nh.includes('quantite') ||
      nh.includes('qte') ||
      nh.includes('qty') ||
      nh.includes('inventaire') ||
      nh.includes('nombre')
    ) {
      if (mapping.stockIdx === -1) mapping.stockIdx = idx;
      return;
    }

    // 4. Catégorie / Famille / Rayon
    if (
      nh.includes('categorie') ||
      nh.includes('category') ||
      nh.includes('famille') ||
      nh.includes('rayon') ||
      nh.includes('type') ||
      nh.includes('classe')
    ) {
      if (mapping.categoryIdx === -1) mapping.categoryIdx = idx;
      return;
    }

    // 5. Code-barres / SKU / Référence
    if (
      nh.includes('codebarre') ||
      nh.includes('barcode') ||
      nh.includes('sku') ||
      nh.includes('ean') ||
      nh.includes('reference') ||
      nh.includes('ref') ||
      nh === 'code'
    ) {
      if (mapping.barcodeIdx === -1) mapping.barcodeIdx = idx;
      return;
    }

    // 6. Titre / Nom / Désignation
    if (
      nh.includes('nom') ||
      nh.includes('designation') ||
      nh.includes('produit') ||
      nh.includes('product') ||
      nh.includes('article') ||
      nh.includes('libelle') ||
      nh.includes('titre') ||
      nh.includes('description') ||
      nh === 'name'
    ) {
      if (mapping.nameIdx === -1) mapping.nameIdx = idx;
      return;
    }
  });

  // Fallback si non trouvé : si la colonne 0 n'a pas été affectée, la désigner comme Nom
  if (mapping.nameIdx === -1 && headers.length > 0) {
    mapping.nameIdx = 0;
  }
  // Si le prix n'a pas été trouvé mais qu'il y a une colonne 1
  if (mapping.sellingPriceIdx === -1 && headers.length > 1 && mapping.nameIdx !== 1) {
    mapping.sellingPriceIdx = 1;
  }

  return mapping;
}

export const ExcelImporterModal: React.FC<ExcelImporterModalProps> = ({
  isOpen,
  onClose,
  existingInventory,
  storeId,
  onConfirmImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedImportItem[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<DuplicateHandlingMode>('UPDATE_STOCK');
  const [headersFound, setHeadersFound] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Réinitialisation lors de la fermeture
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setIsDragOver(false);
      setIsParsing(false);
      setParseError(null);
      setParsedRows([]);
      setHeadersFound([]);
    }
  }, [isOpen]);

  // Fermeture par touche Echap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        playCancelSound();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Map des produits existants pour détection des doublons rapide (O(1))
  const existingMap = useMemo(() => {
    const byBarcode = new Map<string, InventoryProduct>();
    const byName = new Map<string, InventoryProduct>();
    existingInventory.forEach((p) => {
      if (p.barcode && p.barcode.trim()) {
        byBarcode.set(p.barcode.trim().toLowerCase(), p);
      }
      if (p.name && p.name.trim()) {
        byName.set(p.name.trim().toLowerCase(), p);
      }
    });
    return { byBarcode, byName };
  }, [existingInventory]);

  // Analyse du fichier Excel ou CSV en mémoire
  const processFile = async (selectedFile: File) => {
    const fileName = selectedFile.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv');

    if (!isExcel && !isCsv) {
      setParseError('Format non pris en charge. Veuillez fournir un fichier .xlsx, .xls ou .csv.');
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setFile(selectedFile);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: true,
        raw: false,
      });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Le classeur ne contient aucune feuille de calcul.');
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Conversion en matrice de lignes
      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      if (!rawData || rawData.length === 0) {
        throw new Error('La feuille de calcul est vide.');
      }

      // Recherche de la première ligne d'en-tête non vide
      let headerRowIndex = 0;
      while (
        headerRowIndex < rawData.length &&
        rawData[headerRowIndex].every((c) => !String(c).trim())
      ) {
        headerRowIndex++;
      }

      if (headerRowIndex >= rawData.length) {
        throw new Error('Aucun en-tête trouvé dans le fichier.');
      }

      const rawHeaders: string[] = rawData[headerRowIndex].map((c) => String(c || '').trim());
      setHeadersFound(rawHeaders);

      const mapping = detectColumnMapping(rawHeaders);

      // Traitement des lignes de données
      const items: ParsedImportItem[] = [];

      for (let r = headerRowIndex + 1; r < rawData.length; r++) {
        const row = rawData[r];
        // Ignorer les lignes totalement vides
        if (row.every((cell) => cell === '' || cell === null || cell === undefined)) {
          continue;
        }

        const rawName = mapping.nameIdx >= 0 ? String(row[mapping.nameIdx] || '').trim() : '';
        const rawSellingPrice =
          mapping.sellingPriceIdx >= 0 ? parsePrice(row[mapping.sellingPriceIdx]) : NaN;
        const rawCostPrice =
          mapping.costPriceIdx >= 0 ? parsePrice(row[mapping.costPriceIdx]) : NaN;
        const rawStock = mapping.stockIdx >= 0 ? parseStock(row[mapping.stockIdx]) : 0;
        const rawCategory =
          mapping.categoryIdx >= 0 ? String(row[mapping.categoryIdx] || '').trim() : '';
        const rawBarcode =
          mapping.barcodeIdx >= 0 ? String(row[mapping.barcodeIdx] || '').trim() : '';

        // Validation de la ligne
        let isValid = true;
        let validationError: string | undefined;

        if (!rawName) {
          isValid = false;
          validationError = "Nom de l'article manquant";
        } else if (isNaN(rawSellingPrice) || rawSellingPrice < 0) {
          isValid = false;
          validationError = 'Prix de vente manquant ou invalide';
        }

        // Vérification doublon
        const barcodeLower = rawBarcode.toLowerCase();
        const nameLower = rawName.toLowerCase();
        const isDuplicate =
          (barcodeLower && existingMap.byBarcode.has(barcodeLower)) ||
          existingMap.byName.has(nameLower);

        items.push({
          rawRowIndex: r + 1,
          name: rawName || `Article ligne #${r + 1}`,
          category: rawCategory || 'Général',
          sellingPrice: isNaN(rawSellingPrice) ? 0 : Math.round(rawSellingPrice),
          costPrice: isNaN(rawCostPrice)
            ? Math.round((isNaN(rawSellingPrice) ? 0 : rawSellingPrice) * 0.75)
            : Math.round(rawCostPrice),
          stock: rawStock,
          barcode: rawBarcode,
          unit: 'pièce',
          isValid,
          validationError,
          isDuplicate: !!isDuplicate,
        });
      }

      if (items.length === 0) {
        throw new Error('Aucune ligne de produit exploitable trouvée après la ligne d’en-tête.');
      }

      setParsedRows(items);
      playTapBeep();
    } catch (err: any) {
      console.error('[EXCEL IMPORT ERROR]', err);
      setParseError(err.message || 'Impossible de lire le fichier. Veuillez vérifier sa structure.');
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  // Gestionnaires Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Statistiques dérivées
  const totalCount = parsedRows.length;
  const validRows = useMemo(() => parsedRows.filter((r) => r.isValid), [parsedRows]);
  const flaggedRows = useMemo(() => parsedRows.filter((r) => !r.isValid), [parsedRows]);
  const duplicatesCount = useMemo(
    () => parsedRows.filter((r) => r.isValid && r.isDuplicate).length,
    [parsedRows]
  );

  // Téléchargement du modèle type Excel (.xlsx)
  const handleDownloadTemplate = () => {
    playTapBeep();
    const sampleData = [
      {
        Nom: 'Riz Parfumé Royal 5kg',
        'Prix de vente': 4500,
        "Prix d'achat": 3800,
        Stock: 25,
        Catégorie: 'Alimentation',
        'Code-barres': '6181100123456',
      },
      {
        Nom: 'Huile Végétale Dinor 1L',
        'Prix de vente': 1200,
        "Prix d'achat": 950,
        Stock: 40,
        Catégorie: 'Épicerie',
        'Code-barres': '6181100654321',
      },
      {
        Nom: 'Savon Marseille Citron 200g',
        'Prix de vente': 350,
        "Prix d'achat": 250,
        Stock: 60,
        Catégorie: 'Entretien',
        'Code-barres': '6181100789012',
      },
      {
        Nom: 'Lait Concentré Sucré 397g',
        'Prix de vente': 600,
        "Prix d'achat": 480,
        Stock: 30,
        Catégorie: 'Alimentation',
        'Code-barres': '6181100998877',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 30 }, // Nom
      { wch: 15 }, // Prix de vente
      { wch: 15 }, // Prix d'achat
      { wch: 10 }, // Stock
      { wch: 18 }, // Catégorie
      { wch: 20 }, // Code-barres
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Articles');
    XLSX.writeFile(wb, 'modele_import_nanasore.xlsx');
  };

  // Export JSON immédiat
  const handleExportJson = () => {
    playTapBeep();
    const exportData = validRows.map((item) => ({
      name: item.name,
      category: item.category,
      sellingPrice: item.sellingPrice,
      costPrice: item.costPrice,
      stock: item.stock,
      unit: item.unit,
      barcode: item.barcode || undefined,
      storeId: storeId,
      exportedAt: new Date().toISOString(),
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'produits_boutique.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Confirmation de l'intégration dans l'inventaire
  const handleConfirm = () => {
    if (validRows.length === 0) return;

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const productsToPersist: InventoryProduct[] = [];

    validRows.forEach((item, index) => {
      // Vérifier si existant
      const barcodeLower = item.barcode.trim().toLowerCase();
      const nameLower = item.name.trim().toLowerCase();

      const existing =
        (barcodeLower ? existingMap.byBarcode.get(barcodeLower) : null) ||
        existingMap.byName.get(nameLower);

      if (existing) {
        if (duplicateMode === 'SKIP_DUPLICATES') {
          skippedCount++;
          return;
        }

        // Mode UPDATE_STOCK : incrémente le stock ou actualise
        const updated: InventoryProduct = {
          ...existing,
          stock: existing.stock + item.stock,
          sellingPrice: item.sellingPrice > 0 ? item.sellingPrice : existing.sellingPrice,
          costPrice: item.costPrice > 0 ? item.costPrice : existing.costPrice,
          category: item.category || existing.category,
          barcode: item.barcode || existing.barcode,
        };
        productsToPersist.push(updated);
        updatedCount++;
      } else {
        // Nouveau produit
        const newProduct: InventoryProduct = {
          id: `prod-imp-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
          storeId: storeId,
          name: item.name,
          category: item.category || 'Général',
          sellingPrice: item.sellingPrice,
          costPrice: item.costPrice,
          stock: item.stock,
          unit: item.unit || 'pièce',
          keywords: [item.name.toLowerCase(), item.category.toLowerCase()],
          barcode: item.barcode || '',
          photoUrl: '',
        };
        productsToPersist.push(newProduct);
        addedCount++;
      }
    });

    playValidationBeep();
    onConfirmImport(productsToPersist, duplicateMode, {
      total: validRows.length,
      added: addedCount,
      updated: updatedCount,
      skipped: skippedCount,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="excel-importer-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-4xl bg-[#0d1527] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative max-h-[92vh] flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#070b14] px-4 sm:px-6 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="excel-importer-dialog-title"
                className="text-sm sm:text-base font-black text-white flex items-center gap-2"
              >
                <span>Importateur Intelligent Excel & CSV</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Client-side 0-latence
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Détection automatique des colonnes, assainissement des devises et prévisualisation instantanée
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playCancelSound();
              onClose();
            }}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
            aria-label="Fermer l'importateur"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
            touchAction: 'pan-y',
          }}
        >
          {/* Écran 1 : Zone de glisser-déposer si aucun fichier ou erreur */}
          {parsedRows.length === 0 && (
            <div className="space-y-4">
              {/* Animated Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group min-h-[240px] ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-600/15 scale-[0.99] shadow-lg shadow-blue-900/20'
                    : 'border-slate-700/80 bg-[#070b14]/60 hover:border-blue-500/60 hover:bg-[#070b14]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="excel-file-input"
                />

                <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform shadow-inner">
                  {isParsing ? (
                    <RotateCcw className="w-8 h-8 animate-spin text-blue-400" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                </div>

                <div className="space-y-1.5 max-w-md">
                  <p className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                    {isParsing
                      ? 'Analyse instantanée du fichier...'
                      : 'Glissez-déposez votre fichier ici ou appuyez pour parcourir'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Formats supportés : <strong className="text-slate-300">.xlsx</strong>,{' '}
                    <strong className="text-slate-300">.xls</strong>, et{' '}
                    <strong className="text-slate-300">.csv</strong>
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/50">
                    ⚡ 100% Hors-Ligne & Sécurisé
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/50">
                    🎯 Auto-Mapping Francs CFA
                  </span>
                </div>
              </div>

              {/* Message d'erreur éventuel */}
              {parseError && (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start gap-2.5 text-red-200 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">Erreur de lecture du fichier</strong>
                    <span>{parseError}</span>
                  </div>
                </div>
              )}

              {/* Télécharger le modèle Excel type */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#070b14]/50 border border-slate-800/60">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Besoin d'un exemple prêt à l'emploi ?</h4>
                    <p className="text-[11px] text-slate-400">
                      Colonnes pré-configurées : <em>Nom, Prix de vente, Prix d'achat, Stock, Catégorie, Code-barres</em>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger le modèle Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          )}

          {/* Écran 2 : Prévisualisation Interactive Live après lecture */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              {/* Summary Header & Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Total Détecté */}
                <div className="bg-[#070b14] rounded-2xl p-3 border border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-base shrink-0">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Total Détecté</span>
                    <span className="text-sm sm:text-base font-black text-white">
                      🎉 {totalCount} <span className="text-xs font-normal text-slate-400">articles</span>
                    </span>
                  </div>
                </div>

                {/* Prêts à intégrer */}
                <div className="bg-[#070b14] rounded-2xl p-3 border border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-base shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Valides</span>
                    <span className="text-sm sm:text-base font-black text-emerald-300">
                      {validRows.length} <span className="text-xs font-normal text-slate-400">prêts</span>
                    </span>
                  </div>
                </div>

                {/* Lignes Ignorées / Erreurs */}
                <div className="bg-[#070b14] rounded-2xl p-3 border border-slate-800 flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                      flaggedRows.length > 0
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Incomplets</span>
                    <span
                      className={`text-sm sm:text-base font-black ${
                        flaggedRows.length > 0 ? 'text-amber-300' : 'text-slate-300'
                      }`}
                    >
                      {flaggedRows.length > 0 ? `⚠️ ${flaggedRows.length}` : '0'}{' '}
                      <span className="text-xs font-normal text-slate-400">ignorés</span>
                    </span>
                  </div>
                </div>

                {/* Doublons Potentiels */}
                <div className="bg-[#070b14] rounded-2xl p-3 border border-slate-800 flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                      duplicatesCount > 0 ? 'bg-indigo-600/20 text-indigo-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Doublons</span>
                    <span className="text-sm sm:text-base font-black text-indigo-300">
                      {duplicatesCount} <span className="text-xs font-normal text-slate-400">existants</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Fichier analysé & Bouton changer de fichier */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#070b14]/70 border border-slate-800 text-xs">
                <div className="flex items-center gap-2 overflow-hidden text-slate-300">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate font-semibold text-white">{file?.name}</span>
                  <span className="text-slate-500">({Math.round((file?.size || 0) / 1024)} Ko)</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setParsedRows([]);
                    setFile(null);
                  }}
                  className="min-h-[36px] px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Changer de fichier</span>
                </button>
              </div>

              {/* Duplicate Handling Toggle */}
              <div className="p-3.5 rounded-2xl bg-[#070b14] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-white block">Gestion des articles déjà existants</span>
                  <span className="text-[11px] text-slate-400">
                    Détection par code-barres identique ou nom identique
                  </span>
                </div>

                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setDuplicateMode('UPDATE_STOCK');
                    }}
                    className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      duplicateMode === 'UPDATE_STOCK'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mettre à jour le stock</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setDuplicateMode('SKIP_DUPLICATES');
                    }}
                    className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      duplicateMode === 'SKIP_DUPLICATES'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Ignorer les doublons</span>
                  </button>
                </div>
              </div>

              {/* Interactive Data Table Container */}
              <div className="rounded-2xl border border-slate-800 bg-[#070b14] overflow-hidden">
                <div
                  className="max-h-[360px] overflow-y-auto custom-scrollbar"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehaviorY: 'contain',
                    touchAction: 'pan-y',
                  }}
                >
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-900/95 sticky top-0 z-10 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-bold backdrop-blur-xs">
                      <tr>
                        <th className="py-2.5 px-3 w-16">Statut</th>
                        <th className="py-2.5 px-3">Nom de l'article</th>
                        <th className="py-2.5 px-3">Catégorie</th>
                        <th className="py-2.5 px-3 text-right">Prix Vente</th>
                        <th className="py-2.5 px-3 text-right hidden sm:table-cell">Prix Achat</th>
                        <th className="py-2.5 px-3 text-center">Stock</th>
                        <th className="py-2.5 px-3 hidden md:table-cell">Code-barres</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                      {parsedRows.slice(0, 30).map((row, idx) => {
                        return (
                          <tr
                            key={`row-${idx}-${row.rawRowIndex}`}
                            className={`hover:bg-slate-800/40 transition-colors ${
                              !row.isValid ? 'bg-amber-950/15' : ''
                            }`}
                          >
                            {/* Statut */}
                            <td className="py-2.5 px-3">
                              {row.isValid ? (
                                <div className="flex items-center gap-1 text-emerald-400" title="Prêt à importer">
                                  <CheckCircle2 className="w-4 h-4" />
                                  {row.isDuplicate && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/30">
                                      Existant
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div
                                  className="flex items-center gap-1 text-amber-400 cursor-help"
                                  title={row.validationError || 'Ligne ignorée'}
                                >
                                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-500/30 truncate max-w-[60px]">
                                    Ignoré
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Nom */}
                            <td className="py-2.5 px-3">
                              <span
                                className={`font-semibold ${
                                  row.isValid ? 'text-white' : 'text-amber-300 italic'
                                }`}
                              >
                                {row.name}
                              </span>
                              {!row.isValid && row.validationError && (
                                <span className="block text-[10px] text-red-400">
                                  {row.validationError}
                                </span>
                              )}
                            </td>

                            {/* Catégorie */}
                            <td className="py-2.5 px-3">
                              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] bg-slate-800/80 text-slate-300 border border-slate-700/50">
                                {row.category}
                              </span>
                            </td>

                            {/* Prix de vente */}
                            <td className="py-2.5 px-3 text-right">
                              <span
                                className={`font-mono font-bold ${
                                  row.sellingPrice > 0 ? 'text-emerald-400' : 'text-amber-400'
                                }`}
                              >
                                {row.sellingPrice > 0 ? formatCFA(row.sellingPrice) : 'Invalide'}
                              </span>
                            </td>

                            {/* Prix d'achat */}
                            <td className="py-2.5 px-3 text-right hidden sm:table-cell text-slate-400 font-mono">
                              {row.costPrice > 0 ? formatCFA(row.costPrice) : '—'}
                            </td>

                            {/* Stock */}
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-950/60 text-blue-300 border border-blue-500/30">
                                {row.stock}
                              </span>
                            </td>

                            {/* Code-barres */}
                            <td className="py-2.5 px-3 hidden md:table-cell text-slate-400 font-mono text-[11px]">
                              {row.barcode || <span className="text-slate-600">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer preview note */}
                <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>
                    Affichage des {Math.min(30, parsedRows.length)} premières lignes sur {parsedRows.length} au total
                  </span>
                  {flaggedRows.length > 0 && (
                    <span className="text-amber-400">
                      * Les {flaggedRows.length} lignes incomplètes seront automatiquement ignorées
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Dual Output Action Buttons */}
        <div className="bg-[#070b14] px-4 sm:px-6 py-3.5 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {parsedRows.length > 0 ? (
              <button
                type="button"
                onClick={handleExportJson}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                title="Exporter les produits valides sous format JSON de sauvegarde"
              >
                <FileJson className="w-4 h-4 text-blue-400" />
                <span>Exporter en JSON</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full sm:w-auto min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-800 bg-[#0d1527] hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Modèle Excel (.xlsx)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                playCancelSound();
                onClose();
              }}
              className="w-1/3 sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              Annuler
            </button>

            {parsedRows.length > 0 && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={validRows.length === 0}
                className={`w-2/3 sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ${
                  validRows.length > 0
                    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4 text-blue-200" />
                <span>Confirmer et Intégrer ({validRows.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
