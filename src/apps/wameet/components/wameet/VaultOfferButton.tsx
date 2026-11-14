import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { ShoppingBag } from 'lucide-react';
import { db } from '../../../../firebase';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { VaultBottomSheet } from './VaultBottomSheet';

export interface ProductOffer {
  id: string;
  title: string;
  priceXOF: number;
  imageUrl: string;
  description: string;
  shopUrl?: string;
  inStock?: boolean;
}

export interface VaultButtonProps {
  reelId: string;
  productId?: string;
  creatorShopDomain?: string; // ex: boutique.nsore.shop
  initialOffer?: Partial<ProductOffer> | null;
  onBuyDirect?: (offer: ProductOffer) => void;
  className?: string;
}

/**
 * Bouton 2 - Le Petit Coffre Noir / Catalogue Nanasore POS
 * 1. Présent sur le volet droit des Reels avec son style coffre noir & liseré doré.
 * 2. Récupère dynamiquement l'article depuis la collection Firestore 'nanasore_products' ou 'products'.
 * 3. Ouvre un tiroir coulissant (Bottom Sheet) pour présenter l'offre commerciale.
 * 4. Propose l'Achat Direct et le paiement Mobile Money sans friction.
 */
export const VaultOfferButton: React.FC<VaultButtonProps> = ({
  reelId,
  productId,
  creatorShopDomain,
  initialOffer,
  onBuyDirect,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [offer, setOffer] = useState<ProductOffer | null>(() => {
    if (initialOffer && initialOffer.title) {
      return {
        id: initialOffer.id || productId || 'prod_vault',
        title: initialOffer.title,
        priceXOF: initialOffer.priceXOF || 0,
        imageUrl: initialOffer.imageUrl || '/placeholder-product.png',
        description: initialOffer.description || '',
        shopUrl: initialOffer.shopUrl,
        inStock: initialOffer.inStock ?? true
      };
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Si l'offre initiale change avec le Reel
    if (initialOffer && initialOffer.title) {
      setOffer({
        id: initialOffer.id || productId || 'prod_vault',
        title: initialOffer.title,
        priceXOF: initialOffer.priceXOF || 0,
        imageUrl: initialOffer.imageUrl || '/placeholder-product.png',
        description: initialOffer.description || '',
        shopUrl: initialOffer.shopUrl,
        inStock: initialOffer.inStock ?? true
      });
    }
  }, [initialOffer, productId]);

  useEffect(() => {
    // Charger l'offre Nanasore associée dès que le tiroir s'ouvre
    if (isOpen && productId) {
      const fetchOffer = async () => {
        setIsLoading(true);
        try {
          // 1. Recherche prioritaire dans 'nanasore_products'
          const docRef = doc(db, 'nanasore_products', productId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setOffer({
              id: snap.id,
              title: data.title || data.name || 'Produit Nanasore',
              priceXOF: data.priceXOF || data.priceFcfa || data.price || 0,
              imageUrl: data.imageUrl || data.image || '/placeholder-product.png',
              description: data.description || '',
              shopUrl: data.shopUrl,
              inStock: data.inStock ?? true
            });
            return;
          }

          // 2. Recherche de secours dans 'products'
          const fallbackRef = doc(db, 'products', productId);
          const fallbackSnap = await getDoc(fallbackRef);
          if (fallbackSnap.exists()) {
            const data = fallbackSnap.data();
            setOffer({
              id: fallbackSnap.id,
              title: data.name || data.title || 'Produit Nanasore',
              priceXOF: data.priceFcfa || data.priceXOF || data.price || 0,
              imageUrl: data.imageUrl || data.image || '/placeholder-product.png',
              description: data.description || '',
              shopUrl: data.shopUrl,
              inStock: data.inStock ?? true
            });
          }
        } catch (err) {
          console.warn('[COFFRE NANASORE] Récupération offre storage :', err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchOffer();
    }
  }, [isOpen, productId]);

  const handleOpenVault = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    setIsOpen(true);
  };

  const handleCloseVault = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playTapBeep();
    setIsOpen(false);
  };

  const handleDirectBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    playValidationBeep();
    if (!offer) return;

    if (onBuyDirect) {
      onBuyDirect(offer);
      setIsOpen(false);
      return;
    }

    // Redirection vers le checkout Nanasore POS
    const checkoutUrl = creatorShopDomain 
      ? `https://${creatorShopDomain}/checkout?product=${offer.id}`
      : `https://nanasore.com/checkout?product=${offer.id}`;
    window.location.href = checkoutUrl;
  };

  const handleMobileMoneyPay = (e: React.MouseEvent) => {
    e.stopPropagation();
    playValidationBeep();
    if (!offer) return;

    if (onBuyDirect) {
      onBuyDirect(offer);
      setIsOpen(false);
      return;
    }

    // Ouverture du module de paiement Mobile Money
    window.open(`/pay/mobile-money?product=${offer.id}`, '_blank');
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playValidationBeep();
    if (offer && onBuyDirect) {
      onBuyDirect(offer);
    } else {
      setIsOpen(true);
    }
  };

  return (
    <>
      {/* 1. Bouton Acheter Direct / Panier Rapide (Produit physique/numérique, affiche ou Reel) */}
      <div className={`flex flex-col items-center gap-1 select-none ${className}`}>
        <button
          type="button"
          onClick={handleButtonClick}
          className="p-3.5 rounded-full backdrop-blur-md bg-white/10 hover:bg-emerald-500/20 border border-white/20 hover:border-emerald-400/40 text-white hover:text-emerald-300 shadow-lg transition-all duration-300 transform active:scale-90 cursor-pointer flex items-center justify-center group"
          title="Acheter ce produit / Passer commande directe"
          aria-label="Acheter"
        >
          {/* Icône Panier / Sac d'achat transparent */}
          <ShoppingBag className="w-5 h-5 drop-shadow-md text-white group-hover:text-emerald-300 transition-colors stroke-[2.2]" />
        </button>
        <span className="text-[10px] font-extrabold text-white drop-shadow-md">
          Acheter
        </span>
      </div>

      {/* 2. Modale / Tiroir Bottom Sheet de secours si onBuyDirect n'est pas passé */}
      <VaultBottomSheet
        isOpen={isOpen}
        onClose={handleCloseVault}
        offer={offer}
        isLoading={isLoading}
        onDirectBuy={handleDirectBuy}
        onMobileMoneyPay={handleMobileMoneyPay}
      />
    </>
  );
};

export { VaultBottomSheet };
export default VaultOfferButton;
