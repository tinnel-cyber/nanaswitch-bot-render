import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { InventoryProduct } from '../types';
import { formatCFA, playValidationBeep, playTapBeep } from '../utils/audio';
import { 
  Search, 
  Camera, 
  Barcode, 
  X, 
  Plus, 
  Package, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Zap
} from 'lucide-react';

interface PosSearchBarProps {
  inventory: InventoryProduct[];
  onSelectProduct: (product: InventoryProduct) => void;
  onOpenSelfieScanner: () => void;
  isSelfieScannerOpen: boolean;
  isPhysicalScannerListening?: boolean;
}

export const PosSearchBar: React.FC<PosSearchBarProps> = ({
  inventory,
  onSelectProduct,
  onOpenSelfieScanner,
  isSelfieScannerOpen,
  isPhysicalScannerListening = true,
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 300ms debounce to keep search silky-smooth on low-end mobile devices
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtered matching items in stock using debounced query
  const matches = useMemo(() => {
    const q = (debouncedQuery || query).trim().toLowerCase();
    if (!q) return [];

    return inventory.filter((prod) => {
      const matchName = prod.name.toLowerCase().includes(q);
      const matchBarcode = prod.barcode ? prod.barcode.toLowerCase().includes(q) : false;
      const matchId = prod.id.toLowerCase().includes(q);
      const matchCat = prod.category?.toLowerCase().includes(q);
      const matchKeywords = prod.keywords?.some((k) => k.toLowerCase().includes(q));

      return matchName || matchBarcode || matchId || matchCat || matchKeywords;
    }).slice(0, 8); // top 8 results
  }, [inventory, debouncedQuery, query]);

  const handleItemClick = (product: InventoryProduct) => {
    playValidationBeep();
    onSelectProduct(product);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    playTapBeep();
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full z-30 px-3 py-1.5 bg-[#0d1527] border-b border-slate-800">
      <div className="flex items-center gap-2">
        {/* Input Bar */}
        <div className="relative flex-1 flex items-center">
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
            <Search className="w-4 h-4 text-amber-400" />
          </div>

          <input
            ref={inputRef}
            id="input-pos-product-search"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (query.trim()) setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const q = query.trim().toLowerCase();
                if (!q) return;
                const exactMatch = inventory.find(
                  (p) =>
                    (p.barcode && p.barcode.toLowerCase() === q) ||
                    p.id.toLowerCase() === q ||
                    p.name.toLowerCase() === q
                );
                const target = exactMatch || matches[0];
                if (target) {
                  handleItemClick(target);
                }
              }
            }}
            placeholder="🔍 Rechercher un article (Nom, Code-barres, ID)..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 focus:bg-slate-850 text-white placeholder-slate-400 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm font-medium outline-none transition-all"
          />

          {query && (
            <button
              id="btn-clear-pos-search"
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bouton Caméra Selfie Continue (Scan direct/puissant) */}
        <button
          id="btn-pos-selfie-cam"
          type="button"
          onClick={() => {
            playTapBeep();
            onOpenSelfieScanner();
          }}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl font-bold text-xs border shadow-xs transition-all cursor-pointer active:scale-95 shrink-0 ${
            isSelfieScannerOpen
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20 animate-pulse ring-2 ring-amber-400/40'
              : 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-800 hover:from-amber-900/90 hover:to-slate-700 text-amber-300 border-amber-500/40'
          }`}
          title="Ouvrir la caméra selfie continue pour scanner les articles à la volée"
        >
          <Camera className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="hidden xs:inline">Scan Selfie</span>
        </button>

        {/* Badge Douchette USB / Bluetooth Listening */}
        <div
          className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/70 text-[10px] text-slate-300 shrink-0"
          title="Lecteur de code-barres USB ou Bluetooth actif : scannez directement avec la douchette"
        >
          <Barcode className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-emerald-400 font-bold">Douchette OK</span>
        </div>
      </div>

      {/* Dynamic Dropdown for Real-time Search */}
      {isOpen && query.trim().length > 0 && (
        <div
          id="dropdown-pos-search-results"
          className="absolute left-3 right-3 top-full mt-1.5 bg-[#0d1527] border border-slate-700/90 text-slate-100 rounded-2xl shadow-2xl backdrop-blur-xl max-h-72 overflow-y-auto divide-y divide-slate-800 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {matches.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-400">Aucun article trouvé pour « {query} »</p>
              <p className="text-[11px] text-amber-400 mt-1">
                Scannez son code-barres ou créez-le dans la section Stock
              </p>
            </div>
          ) : (
            matches.map((item) => (
              <button
                key={item.id}
                id={`btn-search-item-${item.id}`}
                type="button"
                onClick={() => handleItemClick(item)}
                className="w-full p-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/90 active:bg-blue-900/30 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Photo or Initials */}
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 shrink-0 overflow-hidden flex items-center justify-center">
                    {(() => {
                      const itemImg = item.photoUrl || (item as any).imageUrl || (item as any).image;
                      return itemImg ? (
                        <img
                          src={itemImg}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-blue-400" />
                      );
                    })()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-white text-xs sm:text-sm truncate group-hover:text-amber-300 transition-colors">
                        {item.name}
                      </span>
                      {item.category && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-medium shrink-0">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      <span>ID: {item.id}</span>
                      {item.barcode && (
                        <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-300/80">
                          <Barcode className="w-2.5 h-2.5" />
                          {item.barcode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price, Stock and Quick Add Button */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <div className="font-black text-xs sm:text-sm text-blue-600 dark:text-blue-300 font-mono">
                      {formatCFA(item.sellingPrice)}
                    </div>
                    <div
                      className={`text-[10px] font-bold ${
                        item.stock < 5 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {item.stock} en stock
                    </div>
                  </div>

                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 group-hover:bg-blue-600 text-blue-600 group-hover:text-white border border-blue-500/40 dark:bg-blue-600/30 dark:text-blue-300 flex items-center justify-center transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
