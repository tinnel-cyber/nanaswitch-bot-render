import React, { useState } from 'react';
import { Edit2, Zap, Link as LinkIcon, Share2, Check, ExternalLink } from 'lucide-react';
import { StoreProductItem } from './types';
import { buildPublicShopUrl } from '../../../../config/domains';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface AdminProductQuickBarProps {
  product: StoreProductItem;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
  storeSlug?: string;
  storeId?: string;
  onEditProduct?: (product: StoreProductItem, options?: { initialCard?: number }) => void;
  onPreviewFunnel?: (product: StoreProductItem) => void;
  onToast?: (message: string) => void;
  className?: string;
}

export const AdminProductQuickBar: React.FC<AdminProductQuickBarProps> = ({
  product,
  isPublicView = false,
  isAdminPreview = false,
  storeSlug = 'boutique',
  onEditProduct,
  onPreviewFunnel,
  onToast,
  className = ''
}) => {
  const [copied, setCopied] = useState(false);

  // Règle de sécurité stricte : Actif uniquement en mode administrateur / preview
  if (!isAdminPreview) {
    return null;
  }

  const hasActiveFunnel = Boolean(product.linkedFunnelId || (product as any).funnelConfig?.enabled);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    playTapBeep();
    if (onEditProduct) {
      onEditProduct(product);
    }
  };

  const handleTunnelAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    playTapBeep();
    if (hasActiveFunnel) {
      // Déclencher le tiroir de test en 0ms dans le Studio
      if (onPreviewFunnel) {
        onPreviewFunnel(product);
      } else if (typeof window !== 'undefined') {
        const funnelId = product.linkedFunnelId || (product as any).funnelConfig?.slug || product.id;
        window.dispatchEvent(new CustomEvent('nana:open_funnel', { 
          detail: { funnelId, title: product.name } 
        }));
      }
    } else {
      // Ouvrir AddProductModal directement sur la Carte 2 (Tunnel)
      if (onEditProduct) {
        onEditProduct(product, { initialCard: 2 });
      }
    }
  };

  const handleCopyAdLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    playTapBeep();

    const cleanSlug = storeSlug.trim().replace(/^store-/, '');
    const funnelId = product.linkedFunnelId || (product as any).funnelConfig?.slug;
    
    // Construction de l'URL publicitaire ciblée
    const targetUrl = buildPublicShopUrl(cleanSlug, {
      productSlug: product.id,
      funnelSlug: funnelId || undefined
    });

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(targetUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = targetUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      setCopied(true);
      playValidationBeep();
      if (onToast) {
        onToast('🎯 Lien Publicitaire nsore.shop copié ! Prêt pour TikTok / Facebook Ads');
      }
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('[AdminProductQuickBar] Échec copie presse-papiers:', err);
    }
  };

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      className={`absolute top-2 left-2 right-2 z-30 flex items-center justify-between gap-1 p-1 sm:p-1.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-blue-500/30 shadow-xl text-white select-none transition-all ${className}`}
      aria-label="Barre d'action rapide d'administration produit"
    >
      {/* 1. Bouton ✏️ Modifier */}
      <button
        type="button"
        onClick={handleEdit}
        className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-[10.5px] font-semibold flex items-center gap-1 transition-all cursor-pointer border border-slate-700/60 shrink-0"
        title="Modifier la fiche produit, les prix et les metafields"
      >
        <Edit2 className="w-3 h-3 text-blue-400" />
        <span className="hidden sm:inline">Modifier</span>
      </button>

      {/* 2. Bouton 🔗 Tunnel (⚡ Actif vs + Lier) */}
      <button
        type="button"
        onClick={handleTunnelAction}
        className={`px-2 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
          hasActiveFunnel
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            : 'bg-blue-600/15 text-blue-300 border border-blue-500/30 hover:bg-blue-600/25'
        }`}
        title={
          hasActiveFunnel 
            ? 'Tester ce tunnel de vente en direct (0ms) dans le Studio' 
            : 'Lier un tunnel de vente 1-clic à ce produit'
        }
      >
        {hasActiveFunnel ? (
          <>
            <Zap className="w-3 h-3 text-emerald-400 animate-pulse fill-emerald-400" />
            <span>⚡ Tunnel Actif</span>
          </>
        ) : (
          <>
            <LinkIcon className="w-3 h-3 text-blue-400" />
            <span>+ 🔗 Tunnel</span>
          </>
        )}
      </button>

      {/* 3. Bouton 📋 Pub (Lien Publicitaire) */}
      <button
        type="button"
        onClick={handleCopyAdLink}
        className={`px-2 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-xs ${
          copied
            ? 'bg-emerald-600 text-white'
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30'
        }`}
        title="Copier le lien d'annonce publicitaire pour TikTok / Facebook Ads"
      >
        {copied ? (
          <>
            <Check className="w-3 h-3 stroke-[3]" />
            <span className="hidden sm:inline">Copié !</span>
          </>
        ) : (
          <>
            <Share2 className="w-3 h-3" />
            <span>Pub</span>
          </>
        )}
      </button>
    </div>
  );
};

export default AdminProductQuickBar;
