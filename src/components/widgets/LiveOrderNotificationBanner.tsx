import React, { useEffect, useState } from 'react';
import { Bell, Package, X, ArrowRight, ExternalLink } from 'lucide-react';
import { StoreCustomerOrder } from '../../services/orderSyncService';
import { formatCFA, playTapBeep } from '../../utils/audio';

interface LiveOrderNotificationBannerProps {
  order: StoreCustomerOrder | null;
  onDismiss: () => void;
  onViewOrder: (order: StoreCustomerOrder) => void;
}

export const LiveOrderNotificationBanner: React.FC<LiveOrderNotificationBannerProps> = ({
  order,
  onDismiss,
  onViewOrder
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (order) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300);
      }, 15000); // Reste visible 15 secondes
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [order, onDismiss]);

  if (!order || !isVisible) return null;

  const quartierOrAddress = order.deliveryAddress || 'Adresse en attente';
  const customerName = order.customerName || 'Client Vitrine';
  const amount = order.totalAmount || order.total || 0;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[94%] max-w-xl animate-in fade-in slide-in-from-top-6 duration-300">
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border-2 border-rose-500/80 rounded-2xl p-3.5 shadow-2xl shadow-rose-950/80 backdrop-blur-md flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0 animate-bounce">
            <Bell className="w-5 h-5 text-rose-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-rose-500 text-white">
                Nouveau
              </span>
              <span className="text-xs font-black text-rose-200 truncate">
                🔔 Nouvelle commande de {customerName}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 truncate mt-0.5">
              <span className="font-bold text-amber-300">{formatCFA(amount)}</span>
              {' — '}
              <span className="text-slate-200">📍 {quartierOrAddress}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onViewOrder(order);
              setIsVisible(false);
              setTimeout(onDismiss, 200);
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-black text-xs flex items-center gap-1 shadow-md transition cursor-pointer"
          >
            <Package className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Voir</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsVisible(false);
              setTimeout(onDismiss, 200);
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Fermer la notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveOrderNotificationBanner;
