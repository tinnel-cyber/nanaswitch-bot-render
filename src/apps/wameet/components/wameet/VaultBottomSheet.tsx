import React from 'react';
import { FeatureErrorBoundary } from '../../../../components/FeatureErrorBoundary';

export interface ProductOffer {
  id: string;
  title: string;
  priceXOF: number;
  imageUrl?: string;
  description?: string;
  shopUrl?: string;
  inStock?: boolean;
}

export interface VaultBottomSheetProps {
  isOpen: boolean;
  onClose: (e?: React.MouseEvent) => void;
  offer: ProductOffer | null;
  isLoading?: boolean;
  onDirectBuy: () => void;
  onMobileMoneyPay: () => void;
}

const BaseVaultBottomSheet: React.FC<VaultBottomSheetProps> = ({
  isOpen,
  onClose,
  offer,
  isLoading = false,
  onDirectBuy,
  onMobileMoneyPay
}) => {
  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-in fade-in select-none"
    >
      {/* Zone d'en-dehors pour fermer */}
      <div className="absolute inset-0" />

      {/* Contenu du Tiroir */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-gray-900 border-t-2 border-amber-500/40 rounded-t-3xl p-5 text-white shadow-2xl z-10 animate-in slide-in-from-bottom duration-300"
      >
        {/* Poignée de glissement */}
        <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-4" />

        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
          <h3 className="text-base sm:text-lg font-black flex items-center gap-2 text-amber-400 uppercase tracking-wide">
            <span>📑</span> Coffre d'Offre Nanasore POS
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-full bg-gray-800 hover:bg-gray-700 transition cursor-pointer"
            title="Fermer"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            <span className="text-xs">Chargement de l'article Nanasore POS...</span>
          </div>
        ) : offer ? (
          <div className="space-y-4">
            <div className="flex gap-4 items-center bg-gray-800/90 p-3.5 rounded-2xl border border-gray-700/80 shadow-md">
              <img
                src={offer.imageUrl || '/placeholder-product.png'}
                alt={offer.title}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300';
                }}
                className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-amber-500/30 shrink-0 bg-slate-950"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white text-sm sm:text-base line-clamp-1">{offer.title}</h4>
                <p className="text-xs text-gray-300 line-clamp-2 mt-1 leading-relaxed">
                  {offer.description || 'Article officiel vérifié disponible au tarif spécial Wameet.'}
                </p>
                <div className="mt-2 text-base sm:text-lg font-black text-amber-400">
                  {offer.priceXOF.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            </div>

            {/* Boutons d'Action Commerciale */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onDirectBuy}
                className="w-full py-3.5 px-4 bg-[#4169E1] hover:bg-blue-600 text-white font-extrabold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>💳 Acheter Direct</span>
              </button>
              <button
                type="button"
                onClick={onMobileMoneyPay}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>📱 Mobile Money</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400 text-xs">
            Aucun produit Nanasore rattaché à ce Reel pour le moment.
          </div>
        )}
      </div>
    </div>
  );
};

export const VaultBottomSheet: React.FC<VaultBottomSheetProps> = (props) => (
  <FeatureErrorBoundary featureName="Coffre-Fort">
    <BaseVaultBottomSheet {...props} />
  </FeatureErrorBoundary>
);

export default VaultBottomSheet;
