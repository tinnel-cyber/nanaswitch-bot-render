'use client';

import React, { useMemo } from 'react';
import { useRealtimeInventory } from '@/hooks/useRealtimeInventory';

interface StorefrontLiveStockProps {
  tenantId: string;
  productId: string;
  initialStock: number;
}

export function StorefrontLiveStock({ tenantId, productId, initialStock }: StorefrontLiveStockProps) {
  const { movements } = useRealtimeInventory(tenantId);

  // Recalcul du stock en direct à chaque événement reçu par Supabase Realtime
  const liveStock = useMemo(() => {
    const latestMovement = movements.find(m => m.product_id === productId);
    if (latestMovement && latestMovement.quantity_after !== undefined) {
      return Number(latestMovement.quantity_after);
    }
    return initialStock;
  }, [movements, productId, initialStock]);

  const isOutOfStock = liveStock <= 0;
  const isLowStock = liveStock > 0 && liveStock <= 5;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all duration-300">
      <span className={`w-2 h-2 rounded-full animate-pulse ${
        isOutOfStock 
          ? 'bg-rose-500' 
          : isLowStock 
            ? 'bg-amber-500' 
            : 'bg-emerald-500'
      }`} />
      
      {isOutOfStock ? (
        <span className="text-rose-600 bg-rose-50 border-rose-200">Rupture de Stock</span>
      ) : isLowStock ? (
        <span className="text-amber-600 bg-amber-50 border-amber-200">Plus que {liveStock} en stock !</span>
      ) : (
        <span className="text-emerald-700 bg-emerald-50 border-emerald-200">En stock ({liveStock} dispo)</span>
      )}
    </div>
  );
}

export default StorefrontLiveStock;
