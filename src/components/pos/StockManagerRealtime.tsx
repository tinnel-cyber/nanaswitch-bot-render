'use client';

import React, { useState } from 'react';
import { useRealtimeInventory } from '@/hooks/useRealtimeInventory';

interface StockManagerProps {
  tenantId: string;
  productId: string;
  productName: string;
  currentStock: number;
}

export function StockManagerRealtime({ tenantId, productId, productName, currentStock }: StockManagerProps) {
  const { movements, loading, logMovement } = useRealtimeInventory(tenantId);
  const [stock, setStock] = useState<number>(currentStock);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleAdjustStock = async (delta: number, type: 'STOCK_IN' | 'STOCK_OUT' | 'SALE_POS') => {
    setIsSubmitting(true);
    const before = stock;
    const after = Math.max(0, before + delta);

    const res = await logMovement({
      tenant_id: tenantId,
      product_id: productId,
      product_name: productName,
      movement_type: type,
      quantity_change: delta,
      quantity_before: before,
      quantity_after: after,
      notes: `Ajustement caisse manuel (${delta > 0 ? '+' : ''}${delta})`
    });

    if (res.success) {
      setStock(after);
    } else {
      alert(`Erreur de mise à jour du stock : ${res.error}`);
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="p-3 text-xs text-slate-500">Chargement des flux de stock...</div>;

  return (
    <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-black text-slate-900">{productName}</h3>
          <p className="text-xs text-slate-500">Synchronisé en temps réel avec la boutique et la caisse POS</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-emerald-600">{stock}</span>
          <span className="block text-[10px] text-slate-400 font-bold uppercase">En rayon</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleAdjustStock(10, 'STOCK_IN')}
          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
        >
          + 10 Entrée
        </button>
        <button
          type="button"
          disabled={isSubmitting || stock <= 0}
          onClick={() => handleAdjustStock(-1, 'SALE_POS')}
          className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
        >
          - 1 Vente Caisse
        </button>
        <button
          type="button"
          disabled={isSubmitting || stock <= 0}
          onClick={() => handleAdjustStock(-5, 'STOCK_OUT')}
          className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
        >
          - 5 Sortie / Perte
        </button>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Derniers Mouvements Temps Réel</p>
        <div className="space-y-1.5 max-h-32 overflow-y-auto">
          {movements.slice(0, 5).map((m) => (
            <div key={m.id} className="flex justify-between text-xs py-1 border-b border-slate-50">
              <span className="text-slate-600">{m.movement_type}</span>
              <span className={`font-mono font-bold ${m.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StockManagerRealtime;
