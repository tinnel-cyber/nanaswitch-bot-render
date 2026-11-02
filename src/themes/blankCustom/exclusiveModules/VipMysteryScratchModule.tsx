import React, { useState, useEffect } from 'react';
import { Gift, Sparkles, Clock, ShoppingBag, ArrowRight, CheckCircle2, Award, Zap, Flame } from 'lucide-react';
import { CustomSectionInstance } from '../../../types';
import { StoreProductItem } from '../../../components/storeBuilder/types';
import { MoodStyleConfig } from '../moodStyles';
import { AdminProductQuickBar } from '../../../components/storeBuilder/AdminProductQuickBar';
import { triggerOpenFunnel } from '../../themeUtils';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../utils/audio';

export interface VipMysteryScratchModuleProps {
  section: CustomSectionInstance;
  moodStyle: MoodStyleConfig;
  buttonRadiusClass: string;
  products: StoreProductItem[];
  storeSlug?: string;
  onOpenTunnel?: (product: StoreProductItem) => void;
  onPreviewFunnel?: (product: StoreProductItem) => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  onEditProduct?: (product: StoreProductItem, options?: { initialCard?: number }) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
}

export const VipMysteryScratchModule: React.FC<VipMysteryScratchModuleProps> = ({
  section,
  moodStyle,
  buttonRadiusClass,
  products = [],
  storeSlug = 'boutique',
  onOpenTunnel,
  onPreviewFunnel,
  onSelectProduct,
  onEditProduct,
  isPublicView = false,
  isAdminPreview = false
}) => {
  const cfg = section.settings || section.config || {};
  const targetProduct = products.find(p => p.id === cfg.productId) || products[0];

  const title = section.title || cfg.title || "🎰 Choisissez Votre Coffre Mystère VIP";
  const subtitle = section.subtitle || cfg.subtitle || "TIRAGE PRIVILÈGE DU JOUR • 100% GAGNANT";

  const discountPercent = Number(cfg.discountPercent) || 15;
  const privilegeCode = cfg.privilegeCode || "VIP-CHANCE15";
  const normalPrice = targetProduct?.price || 25000;
  const discountedPrice = Math.round(normalPrice * (1 - discountPercent / 100));

  const [openedChestIndex, setOpenedChestIndex] = useState<number | null>(null);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(900); // 15 minutes

  useEffect(() => {
    let timer: any = null;
    if (openedChestIndex !== null && timeLeftSec > 0) {
      timer = setInterval(() => {
        setTimeLeftSec(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [openedChestIndex, timeLeftSec]);

  const handleOpenChest = (index: number) => {
    if (openedChestIndex !== null) return;
    playCashChime();
    setOpenedChestIndex(index);
    setTimeLeftSec(900);
  };

  const handleOrder = () => {
    if (!targetProduct) return;
    playValidationBeep();

    const privilegedProduct: StoreProductItem = {
      ...targetProduct,
      price: discountedPrice,
      originalPrice: normalPrice,
      badge: `CODE ${privilegeCode} (-${discountPercent}%)`
    };

    if (onOpenTunnel) {
      onOpenTunnel(privilegedProduct);
    } else if (onPreviewFunnel) {
      onPreviewFunnel(privilegedProduct);
    } else {
      triggerOpenFunnel(targetProduct.linkedFunnelId || targetProduct.id, targetProduct.name);
    }

    if (onSelectProduct) {
      onSelectProduct(privilegedProduct);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <section className={`relative py-14 sm:py-20 ${moodStyle.sectionAltBg} border-b border-black/5 overflow-hidden`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${moodStyle.accentBadge}`}>
            <Gift className="w-3.5 h-3.5 text-amber-400" />
            <span>{subtitle}</span>
          </span>
          <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${moodStyle.textPrimary}`}>
            {title}
          </h2>
          <p className={`text-xs sm:text-sm ${moodStyle.textSecondary}`}>
            Cliquez sur l'un des 3 coffres pour révéler votre privilège secret garanti pour aujourd'hui !
          </p>
        </div>

        {/* CONTENEUR PRINCIPAL */}
        <div className={`p-6 sm:p-10 rounded-3xl ${moodStyle.cardBg} border-2 border-amber-500/40 shadow-2xl backdrop-blur-md space-y-8 relative overflow-hidden`}>
          {/* Aura dorée */}
          <div className="absolute -top-24 -left-24 w-60 h-60 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-60 h-60 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

          {/* LES 3 COFFRES MYSTÈRES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[0, 1, 2].map((idx) => {
              const isThisOpened = openedChestIndex === idx;
              const isOtherOpened = openedChestIndex !== null && openedChestIndex !== idx;

              return (
                <div
                  key={idx}
                  onClick={() => handleOpenChest(idx)}
                  className={`p-6 sm:p-8 rounded-3xl border-2 transition-all duration-300 text-center flex flex-col items-center justify-between min-h-[220px] relative select-none ${
                    isThisOpened
                      ? 'border-amber-400 bg-gradient-to-b from-amber-500/20 to-amber-600/30 ring-4 ring-amber-400/50 shadow-2xl scale-105'
                      : isOtherOpened
                      ? 'border-slate-300 dark:border-slate-800 opacity-40 cursor-not-allowed'
                      : 'border-amber-400/50 bg-gradient-to-b from-amber-500/10 to-transparent hover:border-amber-400 hover:scale-103 cursor-pointer shadow-lg active:scale-95'
                  }`}
                >
                  <div className="space-y-2">
                    <span className="text-[11px] font-black uppercase text-amber-500 tracking-wider">
                      Coffre Privilège #{idx + 1}
                    </span>
                    <div className="text-5xl sm:text-6xl py-2 transform transition-transform animate-bounce">
                      {isThisOpened ? '🎉' : '🎁'}
                    </div>
                  </div>

                  <div>
                    {isThisOpened ? (
                      <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase shadow-md">
                        Ouvert & Gagné !
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-300">
                        {openedChestIndex !== null ? 'Verrouillé' : 'Toucher pour ouvrir'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RÉVÉLATION DU PRIVILÈGE & OFFRE EXCLUSIVE DÉBLOQUÉE */}
          {openedChestIndex !== null && targetProduct && (
            <div className="pt-8 border-t border-amber-500/30 space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <AdminProductQuickBar
                product={targetProduct}
                storeSlug={storeSlug}
                onEditProduct={onEditProduct}
                onPreviewFunnel={onPreviewFunnel}
                isPublicView={isPublicView}
                isAdminPreview={isAdminPreview}
              />

              {/* Bandeau d'alerte VIP avec minuteur */}
              <div className="p-4 rounded-2xl bg-amber-500 text-slate-950 font-black flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2.5 text-sm sm:text-base">
                  <Flame className="w-5 h-5 text-red-600" />
                  <span>CADEAU DÉBLOQUÉ : REMISE VIP DE -{discountPercent}% SUR VOTRE COMMANDE !</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 text-amber-300 font-mono text-xs font-bold shadow-inner">
                  <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>{formatTimer(timeLeftSec)} restants</span>
                </div>
              </div>

              {/* Fiche Produit avec Tarif Réduit Débloqué */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center text-left">
                <div className="sm:col-span-4">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 shadow-xl relative">
                    <img
                      src={targetProduct.image}
                      alt={targetProduct.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-black uppercase shadow-md">
                      Code {privilegeCode} Appliqué
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-8 space-y-4">
                  <div>
                    <span className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                      ✓ Avantage Client Réservé
                    </span>
                    <h3 className={`text-xl sm:text-2xl font-black ${moodStyle.textPrimary} mt-0.5`}>
                      {targetProduct.name}
                    </h3>
                    <p className={`text-xs ${moodStyle.textSecondary} mt-1 leading-relaxed`}>
                      {targetProduct.description || "Votre avantage mystère débloque une réduction directe sur cet article avec livraison express et paiement sécurisé à la réception."}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-xs text-slate-400 line-through block">
                        {normalPrice.toLocaleString('fr-FR')} FCFA
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-amber-500">
                        {discountedPrice.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black">
                      Économie Immédiate : {(normalPrice - discountedPrice).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleOrder}
                    className={`w-full py-4.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 ${buttonRadiusClass} font-black text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-pointer shadow-xl shadow-amber-500/30 active:scale-95 transition-transform`}
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span>Réclamer Mon Cadeau & Commander ({discountedPrice.toLocaleString('fr-FR')} F)</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <p className="text-[10px] text-center text-slate-400">
                    🔒 Tarif exclusif réservé pendant 15 minutes • Contrôle du paquet avant paiement
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
