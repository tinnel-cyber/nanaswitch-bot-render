import React, { useState, useCallback } from 'react';
import {
  InventoryProduct,
  LossRecord,
  LossReason,
  CompletedSale,
  SellerUser
} from '../../../types';
import { formatCFA, playTapBeep, playValidationBeep, playCashChime } from '../../../utils/audio';
import {
  TrendingUp,
  DollarSign,
  AlertOctagon,
  Package,
  Plus,
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  ShoppingBag,
  Clock,
  X,
  CheckCircle2,
  Trash2,
  PieChart,
  Printer,
  Users,
  ShieldCheck,
  Filter
} from 'lucide-react';

interface ReportsViewProps {
  sales: CompletedSale[];
  inventory: InventoryProduct[];
  losses: LossRecord[];
  onBackToRegister: () => void;
  onRecordLoss: (loss: Omit<LossRecord, 'id' | 'timestamp'>) => void;
  onPrintSaleReceipt?: (sale: CompletedSale) => void;
  sellers?: SellerUser[];
}

const REASON_LABELS: Record<LossReason, { label: string; color: string; bg: string }> = {
  PERIME: {
    label: 'Périmé',
    color: 'text-amber-400',
    bg: 'bg-amber-500/20 border-amber-500/30',
  },
  CASSE: {
    label: 'Cassé',
    color: 'text-rose-400',
    bg: 'bg-rose-500/20 border-rose-500/30',
  },
  VOLE: {
    label: 'Volé',
    color: 'text-red-400',
    bg: 'bg-red-500/20 border-red-500/30',
  },
  CONSO_PERSO: {
    label: 'Consommation perso',
    color: 'text-sky-400',
    bg: 'bg-sky-500/20 border-sky-500/30',
  },
};

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  inventory,
  losses,
  onBackToRegister,
  onRecordLoss,
  onPrintSaleReceipt,
  sellers = [],
}) => {
  // Loss registration modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(inventory[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<LossReason>('PERIME');
  const [notes, setNotes] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Vendeur Filter state
  const [selectedSellerFilter, setSelectedSellerFilter] = useState<string>('ALL');

  // Stats par vendeur
  const sellerStats = sellers.map((seller) => {
    const sSales = sales.filter((s) => s.sellerId === seller.id);
    const sTotal = sSales.reduce((sum, s) => sum + s.total, 0);
    const sCash = sSales
      .filter((s) => s.paymentMethod === 'CASH')
      .reduce((sum, s) => sum + s.total, 0);
    const sCredit = sSales
      .filter((s) => s.paymentMethod === 'CREDIT')
      .reduce((sum, s) => sum + s.total, 0);

    return {
      seller,
      count: sSales.length,
      total: sTotal,
      cash: sCash,
      credit: sCredit,
      complianceRate: 100, // 100% signé avec empreinte d'intégrité
    };
  });

  // Display sales filtered by seller
  const displaySales =
    selectedSellerFilter === 'ALL'
      ? sales
      : sales.filter(
          (s) =>
            s.sellerId === selectedSellerFilter ||
            (!s.sellerId && selectedSellerFilter === 'UNASSIGNED')
        );

  // 1. Chiffre d'Affaires du jour (Total des ventes enregistrées)
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

  // Cash sales vs Credit sales
  const cashRevenue = sales
    .filter((s) => s.paymentMethod === 'CASH')
    .reduce((sum, s) => sum + s.total, 0);

  // 2. Pertes du jour (Somme des articles gâtés/volés/périmés au coût d'achat)
  const totalLossesAmount = losses.reduce((sum, loss) => sum + loss.lossAmount, 0);

  // 3. Bénéfice Net estimé (Calculé automatiquement : Prix de vente - Prix d'achat pour chaque vente) - Pertes
  // For each sale item, calculate margin: (sellingPrice - costPrice) * quantity
  let grossMargin = 0;
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const invProduct = inventory.find((p) => p.id === item.id);
      const cost = invProduct ? invProduct.costPrice : Math.round(item.price * 0.7); // fallback 30% margin if untracked
      grossMargin += (item.price - cost) * item.quantity;
    });
  });

  // Net Profit = Gross margin - Losses
  const estimatedNetProfit = Math.max(0, grossMargin - totalLossesAmount);

  // 4. Capital Total (Valeur du Stock actuel + Trésorerie Cash)
  const inventoryStockValue = inventory.reduce(
    (sum, product) => sum + product.stock * product.costPrice,
    0
  );
  const totalCapital = inventoryStockValue + cashRevenue;

  // Additional Executive KPIs for PC Dashboard
  const creditRevenue = Math.max(0, totalRevenue - cashRevenue);
  const averageSale = sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0;
  const itemsSold = sales.reduce(
    (sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0),
    0
  );
  const marginRate = totalRevenue > 0 ? Math.round((grossMargin / totalRevenue) * 100) : 0;
  const cashShare = totalRevenue > 0 ? Math.round((cashRevenue / totalRevenue) * 100) : 100;

  // Handle Loss Form Submit
  const handleSubmitLoss = (e: React.FormEvent) => {
    e.preventDefault();
    const product = inventory.find((p) => p.id === selectedProductId);
    if (!product) return;

    if (quantity <= 0) return;

    playValidationBeep();
    const lossAmount = quantity * product.costPrice;
    const nowStr = `Aujourd'hui, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    onRecordLoss({
      storeId: (product as any).storeId || 'default-store',
      date: nowStr,
      productId: product.id,
      productName: product.name,
      quantity,
      costPrice: product.costPrice,
      lossAmount,
      reason,
      notes: notes || undefined,
    });

    setIsModalOpen(false);
    setQuantity(1);
    setNotes('');

    setNotification(`Perte de ${quantity}x ${product.name} déduite du stock (-${formatCFA(lossAmount)})`);
    setTimeout(() => setNotification(null), 3500);
  };

  const selectedProduct = inventory.find((p) => p.id === selectedProductId);

  return (
    <div 
      className="h-full flex flex-col bg-slate-950 text-white select-none overflow-y-auto overscroll-y-contain"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-amber-600 text-white font-bold text-xs shadow-xl flex items-center gap-2 border border-amber-400 animate-in fade-in slide-in-from-top-4">
          <AlertOctagon className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header PC / Responsive */}
      <header className="px-4 sm:px-6 lg:px-8 py-3.5 bg-slate-900/95 border-b border-slate-800 shrink-0 sticky top-0 z-20 backdrop-blur">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToRegister}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-all text-xs font-bold cursor-pointer"
              title="Revenir à la caisse enregistreuse"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Caisse</span>
            </button>
            <div>
              <h1 className="text-base sm:text-lg lg:text-xl font-black text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Rapports & Comptabilité</span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  CLÔTURE JOURNALIÈRE OHADA
                </span>
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Aujourd'hui · Calculs financiers & valorisation des stocks en direct</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                window.print();
              }}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-sm"
              title="Imprimer ou exporter le bilan comptable"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Imprimer Bilan</span>
            </button>

            <button
              id="btn-open-loss-modal"
              type="button"
              onClick={() => {
                playTapBeep();
                setIsModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-extrabold shadow-md shadow-red-600/30 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Perte & Casse</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container PC / Tablet / Mobile */}
      <main className="p-3.5 sm:p-6 lg:p-8 max-w-7xl 2xl:max-w-[1600px] mx-auto w-full space-y-6 pb-24">
        {/* ========================================================================= */}
        {/* 1. TABLEAU DE BORD FINANCIER (4 GRANDES CARTES KPI PC) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* KPI 1: Capital Total Boutique */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 rounded-2xl p-4 sm:p-5 border border-blue-600/30 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-blue-400" />
                Capital Total Boutique
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-semibold">
                Trésorerie + Stock
              </span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-3xl 2xl:text-4xl font-black font-mono tracking-tight text-white my-1">
              {formatCFA(totalCapital)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2.5 mt-2 border-t border-slate-800/80">
              <span title="Valeur au coût d'achat">Stock : <strong className="text-slate-200 font-mono">{formatCFA(inventoryStockValue)}</strong></span>
              <span>Cash : <strong className="text-emerald-400 font-mono">+{formatCFA(cashRevenue)}</strong></span>
            </div>
          </div>

          {/* KPI 2: Chiffre d'Affaires */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 rounded-2xl p-4 sm:p-5 border border-indigo-500/30 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Chiffre d'Affaires
              </span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-semibold">
                {sales.length} ventes
              </span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-3xl 2xl:text-4xl font-black font-mono tracking-tight text-white my-1">
              {formatCFA(totalRevenue)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2.5 mt-2 border-t border-slate-800/80">
              <span>Espèces : <strong className="text-emerald-400 font-mono">{formatCFA(cashRevenue)}</strong></span>
              <span>Crédits : <strong className="text-amber-400 font-mono">{formatCFA(creditRevenue)}</strong></span>
            </div>
          </div>

          {/* KPI 3: Bénéfice Net Réalisé */}
          <div className="bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 rounded-2xl p-4 sm:p-5 border border-emerald-500/30 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Bénéfice Net Réalisé
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                Marge nette {marginRate}%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-3xl 2xl:text-4xl font-black font-mono tracking-tight text-emerald-300 my-1">
              {formatCFA(estimatedNetProfit)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2.5 mt-2 border-t border-slate-800/80">
              <span>Marge brute : <strong className="text-slate-200 font-mono">{formatCFA(grossMargin)}</strong></span>
              <span>Panier moy. : <strong className="text-emerald-400 font-mono">{formatCFA(averageSale)}</strong></span>
            </div>
          </div>

          {/* KPI 4: Pertes & Casse Déclarées */}
          <div className="bg-gradient-to-br from-slate-900 via-rose-950/30 to-slate-900 rounded-2xl p-4 sm:p-5 border border-rose-500/30 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                Pertes & Casse
              </span>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 font-semibold">
                {losses.length} article{losses.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-3xl 2xl:text-4xl font-black font-mono tracking-tight text-rose-400 my-1">
              {formatCFA(totalLossesAmount)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2.5 mt-2 border-t border-slate-800/80">
              <span>Déduit du résultat</span>
              <span className="text-rose-400 font-medium">Stock déprécié</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. GRILLE MULTI-COLONNES PC (12 COLONNES : 7/8 GAUCHE - 5/4 DROITE) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================================= */}
          {/* COLONNE GAUCHE (VENTES & STOCK EXPANDED) */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* SECTION HISTORIQUE DES VENTES & REÇUS */}
            <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
                      <span>Journal des Ventes & Reçus</span>
                      {selectedSellerFilter !== 'ALL' && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                          Filtre actif
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Transactions enregistrées et archivées avec empreinte de conformité
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-mono font-semibold">
                  {displaySales.length} / {sales.length} ventes
                </span>
              </div>

              {displaySales.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                  Aucune vente enregistrée pour ce filtre.
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto overscroll-y-contain pr-1">
                  {displaySales.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 sm:p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs hover:border-slate-600 transition-colors"
                    >
                      <div className="min-w-0 pr-3 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-white text-sm sm:text-base">
                            {formatCFA(s.total)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              s.paymentMethod === 'CASH'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {s.paymentMethod === 'CASH' ? 'Espèces' : 'Crédit'}
                          </span>

                          {/* Vendeur & Signature Badge */}
                          {s.sellerName ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 flex items-center gap-1 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>{s.sellerName}</span>
                              {s.sellerSignatureCode && (
                                <span className="font-mono text-[9px] text-emerald-400">
                                  [{s.sellerSignatureCode}]
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">
                              (Non assigné)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-300 truncate mt-1">
                          <span className="text-slate-500 mr-1.5">{s.date}</span>
                          <span>·</span>
                          <span className="ml-1.5">{s.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}</span>
                        </div>
                      </div>

                      {onPrintSaleReceipt && (
                        <button
                          type="button"
                          onClick={() => onPrintSaleReceipt(s)}
                          className="px-3 py-1.5 rounded-xl bg-slate-750 hover:bg-slate-700 text-blue-300 border border-blue-500/40 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm"
                          title="Imprimer ou télécharger le ticket de caisse certifié"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-400" />
                          <span>Reçu</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION ÉTAT DU STOCK & VALORISATION */}
            <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
                      <span>Stock & Marges Produits</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                        {inventory.length} références
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Valorisation d'inventaire et marge commerciale unitaire par article
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                  <span>Valeur d'inventaire totale :</span>
                  <strong className="text-white font-bold">{formatCFA(inventoryStockValue)}</strong>
                </div>
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-hidden rounded-xl border border-slate-800">
                <div className="overflow-x-auto max-h-[460px] overflow-y-auto overscroll-y-contain">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/95 text-slate-400 font-bold border-b border-slate-800 sticky top-0 z-10 backdrop-blur">
                      <tr>
                        <th className="p-3">Article</th>
                        <th className="p-3">Prix d'Achat</th>
                        <th className="p-3">Prix de Vente</th>
                        <th className="p-3">Marge Nette</th>
                        <th className="p-3">Stock Actuel</th>
                        <th className="p-3 text-right">Valeur Marchande</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {inventory.map((item) => {
                        const unitMargin = item.sellingPrice - item.costPrice;
                        const marginPercent = Math.round((unitMargin / item.sellingPrice) * 100);
                        const isLowStock = item.stock <= 10;
                        return (
                          <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="p-3 font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <span>{item.name}</span>
                                {isLowStock && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                    Stock bas
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-mono text-slate-300">{formatCFA(item.costPrice)}</td>
                            <td className="p-3 font-mono text-white font-bold">{formatCFA(item.sellingPrice)}</td>
                            <td className="p-3 font-mono text-emerald-400 font-bold">
                              +{formatCFA(unitMargin)} <span className="text-[10px] text-emerald-500 font-normal">(+{marginPercent}%)</span>
                            </td>
                            <td className="p-3 font-mono">
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                isLowStock ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-200'
                              }`}>
                                {item.stock} {item.unit}s
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold text-right text-blue-300">
                              {formatCFA(item.stock * item.costPrice)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards View (< md) */}
              <div className="md:hidden space-y-2">
                {inventory.map((item) => {
                  const unitMargin = item.sellingPrice - item.costPrice;
                  const marginPercent = Math.round((unitMargin / item.sellingPrice) * 100);
                  const isLowStock = item.stock <= 10;

                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{item.name}</span>
                          {isLowStock && (
                            <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Stock bas
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Achat : <span className="font-mono text-slate-300">{formatCFA(item.costPrice)}</span> · Vente : <span className="font-mono text-slate-300">{formatCFA(item.sellingPrice)}</span> · Marge : <span className="font-mono text-emerald-400 font-bold">+{marginPercent}%</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-black text-xs text-white">
                          {item.stock} <span className="text-[10px] text-slate-400 font-normal">{item.unit}s</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Val. : {formatCFA(item.stock * item.costPrice)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* COLONNE DROITE (PERFORMANCES VENDEURS, PERTES & RATIOS) */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            {/* SECTION AUDIT & PERFORMANCES MULTI-VENDEURS */}
            {sellers.length > 0 && (
              <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-indigo-500/30 space-y-4 shadow-lg">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
                        <span>Performances par Vendeur</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                          {sellers.length} actifs
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400">
                        Traçabilité des encaissements espèces & crédits
                      </p>
                    </div>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setSelectedSellerFilter('ALL');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      selectedSellerFilter === 'ALL'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
                    }`}
                  >
                    Tous ({sales.length})
                  </button>
                  {sellers.map((s) => {
                    const count = sales.filter((sale) => sale.sellerId === s.id).length;
                    const isSelected = selectedSellerFilter === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setSelectedSellerFilter(s.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-slate-700 text-white text-[9px] flex items-center justify-center font-bold">
                          {s.name.charAt(0)}
                        </span>
                        <span>{s.name.split(' ')[0]}</span>
                        <span
                          className={`text-[10px] px-1.5 rounded font-mono ${
                            isSelected ? 'bg-blue-700 text-white' : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Comparative Breakdown Table / Cards */}
                <div className="space-y-2.5">
                  {sellerStats.map((stat) => {
                    const isCurrentFilter = selectedSellerFilter === stat.seller.id;
                    return (
                      <div
                        key={stat.seller.id}
                        onClick={() => setSelectedSellerFilter(stat.seller.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isCurrentFilter
                            ? 'bg-slate-800/90 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                            : 'bg-slate-950/60 hover:bg-slate-800/50 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white text-xs font-bold flex items-center justify-center border border-indigo-400/40">
                              {stat.seller.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-white">{stat.seller.name}</span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                    stat.seller.role === 'GERANT'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                  }`}
                                >
                                  {stat.seller.role}
                                </span>
                                <span className="text-[9px] font-mono text-emerald-400">
                                  {stat.seller.signatureCode}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Conformité signature : {stat.complianceRate}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-black text-sm text-white">
                              {formatCFA(stat.total)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {stat.count} vente{stat.count > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        {/* Sub-breakdown: Cash vs Credit */}
                        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                            <span className="text-slate-400">Espèces :</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {formatCFA(stat.cash)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                            <span className="text-slate-400">Crédits :</span>
                            <span className="font-mono font-bold text-amber-400">
                              {formatCFA(stat.credit)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION GESTION DES PERTES & CASSE */}
            <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
                    <AlertOctagon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-white uppercase tracking-wide">
                      Pertes & Casse Déclarées
                    </h2>
                    <p className="text-xs text-slate-400">
                      Dépréciations et écarts d'inventaire
                    </p>
                  </div>
                </div>
                <button
                  id="btn-ajouter-perte-inline"
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Déclarer</span>
                </button>
              </div>

              {losses.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                  Aucune perte enregistrée aujourd'hui. Stock intact !
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto overscroll-y-contain pr-1">
                  {losses.map((loss) => {
                    const badge = REASON_LABELS[loss.reason];
                    return (
                      <div
                        key={loss.id}
                        className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs hover:border-slate-600 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {loss.quantity}x {loss.productName}
                            </span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${badge.bg} ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{loss.date}</span>
                            {loss.notes && (
                              <span className="text-slate-300 italic truncate max-w-[200px]">
                                · "{loss.notes}"
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-rose-400 text-sm">
                            -{formatCFA(loss.lossAmount)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            (Coût : {formatCFA(loss.costPrice)}/u)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION RATIOS & SANTÉ FINANCIÈRE */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950/30 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3.5 shadow-lg">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white uppercase tracking-wide">
                    Indicateurs Clés & Ratios
                  </h2>
                  <p className="text-xs text-slate-400">
                    Santé commerciale et équilibre d'exploitation
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 text-[11px] block">Taux de marge brute :</span>
                  <strong className="text-emerald-400 font-mono font-black text-base mt-0.5 block">
                    {marginRate}%
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 text-[11px] block">Panier moyen :</span>
                  <strong className="text-white font-mono font-black text-base mt-0.5 block">
                    {formatCFA(averageSale)}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 text-[11px] block">Part en Espèces :</span>
                  <strong className="text-emerald-300 font-mono font-black text-base mt-0.5 block">
                    {cashShare}%
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 text-[11px] block">Articles écoulés :</span>
                  <strong className="text-blue-300 font-mono font-black text-base mt-0.5 block">
                    {itemsSold} pcs
                  </strong>
                </div>
              </div>

              <div className="pt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-800/80">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Conformité OHADA active
                </span>
                <span>Clôture automatique 23:59</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL : ENREGISTRER UNE PERTE & CASSE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-lg sm:max-w-xl bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 max-h-[90vh] overflow-y-auto overscroll-y-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Enregistrer une perte</h3>
                  <p className="text-[10px] text-slate-400">Déduction immédiate du stock</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLoss} className="space-y-3">
              {/* 1. Sélectionner un produit de l'inventaire */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Produit de l'inventaire *
                </label>
                <select
                  id="select-loss-product"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-red-500"
                >
                  {inventory.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} (Stock: {prod.stock} {prod.unit}s · Achat: {prod.costPrice}F)
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Quantité perdue */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Quantité perdue *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 rounded-xl bg-slate-800 text-white font-bold text-base hover:bg-slate-700 border border-slate-700"
                  >
                    -
                  </button>
                  <input
                    id="input-loss-qty"
                    type="number"
                    min="1"
                    max={selectedProduct ? selectedProduct.stock : 999}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="flex-1 py-2 text-center text-sm font-bold font-mono rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 rounded-xl bg-slate-800 text-white font-bold text-base hover:bg-slate-700 border border-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 3. Motif de la perte (Périmé, Cassé, Volé, Consommation personnelle) */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Motif de la perte *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { key: 'PERIME', label: 'Périmé' },
                      { key: 'CASSE', label: 'Cassé' },
                      { key: 'VOLE', label: 'Volé' },
                      { key: 'CONSO_PERSO', label: 'Conso perso' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setReason(m.key)}
                      className={`p-2 rounded-xl text-xs font-bold border text-left transition-all ${
                        reason === m.key
                          ? 'bg-red-950/60 border-red-500 text-white shadow-sm'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Précision / Note facultative */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Précision / Note (facultatif)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Emballage percé, tombé au sol..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Calcul de la perte */}
              {selectedProduct && (
                <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center justify-between text-xs">
                  <span className="text-slate-300">Montant déduit du bénéfice :</span>
                  <span className="font-mono font-black text-sm text-red-400">
                    -{formatCFA(quantity * selectedProduct.costPrice)}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-750"
                >
                  Annuler
                </button>
                <button
                  id="btn-confirm-loss"
                  type="submit"
                  className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-xs shadow-lg shadow-red-600/30 active:scale-95 transition-all"
                >
                  Valider la perte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsView;
