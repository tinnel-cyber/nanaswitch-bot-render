import React, { useState, useEffect } from 'react';
import { FunnelBuilder } from '../storeBuilder/FunnelBuilder';
import { getFunnelBySlug } from '../../services/omniFunnelService';
import { injectFunnelSeoMeta } from '../../utils/seoMetaService';
import { ArrowLeft, Loader2, ShoppingBag } from 'lucide-react';

interface PublicModularTunnelViewProps {
  slug: string;
  product?: any;
  onBackToStore?: () => void;
  onDirectCheckout?: (product: any, quantity?: number) => void;
  className?: string;
}

export const PublicModularTunnelView: React.FC<PublicModularTunnelViewProps> = ({
  slug,
  product = null,
  onBackToStore = () => {
    if (typeof window !== 'undefined') window.location.href = '/';
  },
  onDirectCheckout,
  className = ''
}) => {
  const [funnelData, setFunnelData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    const baseProductFields = product
      ? {
          id: product.id || `tunnel-${slug}`,
          slug,
          subdomain: slug,
          name: product.name || product.title || `Offre Spéciale • ${slug}`,
          title: product.title || product.name || `Offre Spéciale • ${slug}`,
          description: product.description || 'Découvrez notre offre exclusive.',
          price: Number(product.price) || 25000,
          originalPrice: Number(product.originalPrice) || (Number(product.price) ? Math.round(Number(product.price) * 1.6) : 45000),
          image: product.image || (Array.isArray(product.images) ? product.images[0] : '') || '',
          images: product.images || (product.image ? [product.image] : []),
          category: product.category || 'Offre Spéciale',
          ...(product.modular_funnel && typeof product.modular_funnel === 'object' ? product.modular_funnel : {})
        }
      : null;

    getFunnelBySlug(slug, 't')
      .then((data) => {
        if (isCancelled) return;
        if (data && (data.blocks?.length || data.pages?.length || data.title)) {
          setFunnelData({
            ...(baseProductFields || {}),
            ...data,
            name: data.product?.name || data.title || baseProductFields?.name || `Offre Spéciale • ${slug}`,
            price: Number(data.salePrice || data.price || baseProductFields?.price) || 25000,
            originalPrice: Number(data.originalPrice || baseProductFields?.originalPrice) || 45000,
            image: data.ogImageUrl || data.image || data.product?.image || baseProductFields?.image || ''
          });
        } else if (baseProductFields) {
          setFunnelData({
            blocks: [],
            ...baseProductFields
          });
        } else {
          // Fallback avec structure de base si pas encore initialisé (FunnelBuilder génère alors automatiquement les 12 blocs)
          const formattedName = slug
            .replace(/^(funnel-|tunnel-|t-|f-)/i, '')
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          setFunnelData({
            id: `tunnel-${slug}`,
            slug,
            subdomain: slug,
            name: formattedName ? `Offre Spéciale • ${formattedName}` : `Offre Spéciale • ${slug}`,
            title: formattedName ? `Offre Spéciale • ${formattedName}` : `Offre Spéciale • ${slug}`,
            description: 'Découvrez notre offre exclusive.',
            price: 25000,
            originalPrice: 45000,
            blocks: []
          });
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn('[PublicModularTunnelView] Erreur chargement, fallback 12 blocs:', err);
          if (baseProductFields) {
            setFunnelData({ blocks: [], ...baseProductFields });
          } else {
            setFunnelData({
              id: `tunnel-${slug}`,
              slug,
              subdomain: slug,
              name: `Offre Spéciale • ${slug}`,
              title: `Offre Spéciale • ${slug}`,
              description: 'Découvrez notre offre exclusive.',
              price: 25000,
              originalPrice: 45000,
              blocks: []
            });
          }
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [slug, product]);

  // Injection SEO meta OpenGraph
  useEffect(() => {
    if (!funnelData) return;
    const cleanup = injectFunnelSeoMeta({
      title: funnelData.title || funnelData.funnelTitle || 'Tunnel de Vente Exclusif',
      description: funnelData.subtitle || funnelData.description || 'Commandez en direct au meilleur prix.',
      imageUrl: funnelData.ogImageUrl || funnelData.image || '',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      type: 'product',
      price: funnelData.salePrice || funnelData.price || 25000,
      currency: funnelData.currency || 'FCFA'
    });
    return cleanup;
  }, [funnelData]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#020617] flex flex-col items-center justify-center p-4 text-slate-100 font-sans select-none">
        <div className="relative flex items-center justify-center mb-4">
          <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl blur-lg opacity-40 animate-pulse" />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-xl border border-indigo-400/40">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>
          <div className="absolute -inset-2.5 rounded-2xl border-2 border-transparent border-t-amber-400 border-r-indigo-400 animate-spin" />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span className="text-xs font-black text-slate-200 tracking-wide">
            Ouverture du Tunnel de Vente NaNa 3.0...
          </span>
        </div>
      </div>
    );
  }

  if (error || !funnelData) {
    return (
      <div className="min-h-screen w-full bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center mb-4 text-indigo-400 shadow-xl">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Tunnel de vente introuvable</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Ce tunnel de vente ({slug}) n'est pas encore publié ou a été déplacé.
        </p>
        <button
          type="button"
          onClick={onBackToStore}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retourner à la boutique</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full bg-[#030610] ${className}`}>
      <FunnelBuilder
        product={funnelData}
        isOpen={true}
        isPublicView={true}
        onClose={onBackToStore}
        onDirectCheckout={onDirectCheckout}
      />
    </div>
  );
};

export default PublicModularTunnelView;
