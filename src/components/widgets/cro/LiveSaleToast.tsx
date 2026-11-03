import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, X } from 'lucide-react';
import { LiveSaleNotification } from '../../../hooks/useLiveSalePulse';

interface LiveSaleToastProps {
  notification: LiveSaleNotification | null;
  isVisible: boolean;
  onDismiss: () => void;
}

export const LiveSaleToast: React.FC<LiveSaleToastProps> = ({
  notification,
  isVisible,
  onDismiss
}) => {
  if (!notification) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 z-50 max-w-[340px] bg-[#030712]/95 backdrop-blur-md border border-emerald-500/30 p-3 rounded-2xl shadow-2xl shadow-emerald-950/40 text-slate-100 flex items-center gap-3 select-none transform-gpu"
        >
          <img
            src={notification.avatarUrl}
            alt={notification.customerName}
            className="w-10 h-10 rounded-xl object-cover border border-emerald-500/40 shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-black text-white truncate">
              <span>{notification.customerName}</span>
              <span className="text-slate-400 font-normal">({notification.city})</span>
              <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
            </div>

            <p className="text-[11px] text-slate-300 truncate">
              Vient d'acheter <span className="text-emerald-400 font-bold">{notification.productName}</span>
            </p>

            <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
              <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-300 rounded font-semibold border border-emerald-500/20">
                {notification.paymentMethod}
              </span>
              <span>•</span>
              <span>{notification.timeAgo}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 cursor-pointer shrink-0"
            title="Masquer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
