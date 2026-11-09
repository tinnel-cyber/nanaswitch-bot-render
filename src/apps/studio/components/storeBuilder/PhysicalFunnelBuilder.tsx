import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Eye,
  Trash2,
  Plus,
  Star,
  Zap,
  Smartphone,
  Monitor,
  Save,
  Palette,
  Layers,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Share2,
  Lock,
  X,
  Settings,
  Copy,
  Check,
  Globe,
  Phone,
  Tag,
  Truck,
  CreditCard,
  Sliders,
  DollarSign,
  ShieldCheck,
  Clock,
  Flame,
  MessageSquare,
  Video,
  Crown,
  Play,
  ShoppingBag,
  Tv,
  Package,
  Gift,
  HelpCircle,
  Radio,
  Edit3
} from 'lucide-react';
import {
  PhysicalFunnelBlock,
  PhysicalFunnelBlockType,
  PhysicalFunnelConfig,
  DEFAULT_PHYSICAL_FUNNEL_BLOCKS
} from '../../../../types/physicalFunnel';
import { ImageUploadInput } from '../../../../components/common/ImageUploadInput';
import MiniMarketDrawer from '../../../../components/funnel/MiniMarketDrawer';
import CheckoutModal from '@/components/public-deal/CheckoutModal';
import {
  DEFAULT_DELIVERY_OPTIONS,
  DEFAULT_ORDER_BUMP,
  DeliveryOption,
  OrderBumpConfig
} from '../../../../types/omniFunnel';
import { AutoFunnelAiModal } from '../../../../components/funnel/AutoFunnelAiModal';
import { ScarcityUrgencyBlock } from '../../../../components/cro/ScarcityUrgencyBlock';
import { TrustBadgesBlock } from '../../../../components/cro/TrustBadgesBlock';
import { FlashLiveCtaButton } from '../../../../components/cro/FlashLiveCtaButton';
import { InlineGeoCheckoutBlock } from '../../../../components/cro/InlineGeoCheckoutBlock';
import { LiveSaleToast } from '../../../../components/cro/LiveSaleToast';
import { AutoplayVideoBlock } from '../../../../components/cro/AutoplayVideoBlock';
import { useLiveSalePulse } from '../../../../hooks/useLiveSalePulse';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { registerSubdomainInFirebase, saveFunnelConfig } from '../../../../services/omniFunnelService';

// Item draggable dans la liste des blocs
interface SortableBlockRowProps {
  block: PhysicalFunnelBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleVisible: () => void;
}

const SortableBlockRow: React.FC<SortableBlockRowProps> = ({
  block,
  isSelected,
  onSelect,
  onDelete,
  onToggleVisible
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : 1,
    opacity: isDragging ? 0.6 : 1
  };

  const getBlockIcon = (type: PhysicalFunnelBlockType) => {
    switch (type) {
      case 'HERO_PRODUCT': return <Layers className="w-3.5 h-3.5 text-emerald-400" />;
      case 'HERO_SPLIT_LUXURY': return <Crown className="w-3.5 h-3.5 text-amber-400" />;
      case 'HERO_VSL_VIDEO': return <Video className="w-3.5 h-3.5 text-rose-400" />;
      case 'HERO_FLASH_CARD': return <Zap className="w-3.5 h-3.5 text-yellow-400" />;
      case 'SCARCITY_URGENCY': return <Flame className="w-3.5 h-3.5 text-orange-400" />;
      case 'INLINE_CHECKOUT': return <CreditCard className="w-3.5 h-3.5 text-indigo-400" />;
      case 'TRUST_BADGES': return <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />;
      case 'BENEFITS_LIST': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'CUSTOMER_REVIEWS': return <Star className="w-3.5 h-3.5 text-amber-300" />;
      case 'FLASH_LIVE_CTA': return <Radio className="w-3.5 h-3.5 text-pink-400" />;
      case 'AUTOPLAY_VIDEO': return <Video className="w-3.5 h-3.5 text-violet-400" />;
      case 'MINI_MARKET_DRAWER': return <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <Layers className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`p-2.5 rounded-2xl border transition flex items-center justify-between gap-2.5 cursor-pointer ${
        isSelected
          ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/50 text-white'
          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 rounded-lg text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing shrink-0"
          title="Glisser pour réordonner"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="shrink-0">{getBlockIcon(block.type)}</div>
        <span className="text-xs font-bold truncate">{block.title}</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
          className={`p-1.5 rounded-lg transition active:scale-95 ${block.visible ? 'text-slate-400 hover:text-white' : 'text-slate-600'}`}
          title={block.visible ? 'Masquer' : 'Afficher'}
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete();
          }}
          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 active:scale-95 transition cursor-pointer"
          title="Supprimer le bloc"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const PhysicalFunnelBuilder: React.FC<{
  initialConfig?: PhysicalFunnelConfig;
  onSave?: (config: PhysicalFunnelConfig) => void;
  onViewLive?: (slug: string) => void;
  onClose?: () => void;
  className?: string;
}> = ({
  initialConfig,
  onSave,
  onViewLive,
  onClose,
  className = ''
}) => {
  const [funnelConfig, setFunnelConfig] = useState<PhysicalFunnelConfig>(() => {
    if (initialConfig) {
      return {
        ...initialConfig,
        brandColor: initialConfig.brandColor || '#10b981',
        defaultCity: initialConfig.defaultCity || 'Abidjan',
        shippingFee: initialConfig.shippingFee !== undefined ? initialConfig.shippingFee : 1500,
        deliveryTime: initialConfig.deliveryTime || '24h chrono partout en ville',
        deliveryOptions: (initialConfig.deliveryOptions && initialConfig.deliveryOptions.length > 0)
          ? initialConfig.deliveryOptions
          : DEFAULT_DELIVERY_OPTIONS.slice(0, 3),
        orderBump: initialConfig.orderBump || DEFAULT_ORDER_BUMP,
        orderBumpEnabled: initialConfig.orderBumpEnabled !== undefined ? initialConfig.orderBumpEnabled : true,
        blocks: initialConfig.blocks && initialConfig.blocks.length > 0 ? initialConfig.blocks : DEFAULT_PHYSICAL_FUNNEL_BLOCKS
      };
    }
    return {
      id: 'funnel_demo_1',
      slug: 'offre-exclusive',
      productId: 'prod_exclusive_1',
      title: 'Offre Exclusive & Livraison Express',
      brandColor: '#10b981',
      defaultCity: 'Abidjan',
      shippingFee: 1500,
      deliveryTime: '24h chrono partout en ville',
      deliveryOptions: DEFAULT_DELIVERY_OPTIONS.slice(0, 3),
      orderBump: DEFAULT_ORDER_BUMP,
      orderBumpEnabled: true,
      paymentMethods: {
        wave: true,
        orangeMoney: true,
        mtn: true,
        moov: true,
        cashOnDelivery: true
      },
      blocks: DEFAULT_PHYSICAL_FUNNEL_BLOCKS,
      ogMetadata: {
        title: 'Offre Exclusive & Livraison Express',
        description: 'Vente Flash exclusive en Afrique de l\'Ouest.',
        imageUrl: '',
        priceAmount: 35000,
        currency: 'FCFA'
      },
      isPublished: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  });

  const [activeTab, setActiveTab] = useState<'blocks' | 'settings'>('blocks');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string>(funnelConfig.blocks[0]?.id || 'block-hero');
  const [devicePreview, setDevicePreview] = useState<'DESKTOP' | 'MOBILE'>('DESKTOP');
  const [mobileView, setMobileView] = useState<'preview' | 'editor'>('preview');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isMiniMarketPreviewOpen, setIsMiniMarketPreviewOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [composedCart, setComposedCart] = useState<any[]>([]);
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  const brandColor = funnelConfig.brandColor || '#10b981';

  const handleCopyLink = useCallback(() => {
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/c/${funnelConfig.slug || 'offre-exclusive'}`
      : `https://nanasore.com/c/${funnelConfig.slug || 'offre-exclusive'}`;
    navigator.clipboard.writeText(shareUrl);
    setCopyFeedback(true);
    playValidationBeep();
    setSavedNotification(`Lien direct copié : ${shareUrl}`);
    setTimeout(() => {
      setCopyFeedback(false);
      setSavedNotification(null);
    }, 3000);
  }, [funnelConfig.slug]);

  // FOMO live sale pulse hook
  const { currentNotification, isVisible: isFomoVisible, dismiss: dismissFomo } = useLiveSalePulse(funnelConfig.title);

  // dnd-kit capteurs
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFunnelConfig(prev => {
        const oldIndex = prev.blocks.findIndex(b => b.id === active.id);
        const newIndex = prev.blocks.findIndex(b => b.id === over.id);
        const reordered = arrayMove(prev.blocks, oldIndex, newIndex);
        return { ...prev, blocks: reordered, updatedAt: Date.now() };
      });
      playTapBeep();
    }
  };

  const selectedBlock = funnelConfig.blocks.find(b => b.id === selectedBlockId) || funnelConfig.blocks[0];

  const updateBlockProps = (blockId: string, updatedProps: Record<string, any>) => {
    setFunnelConfig(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === blockId ? { ...b, props: { ...b.props, ...updatedProps } } : b),
      updatedAt: Date.now()
    }));
  };

  // Helper pour savoir si un bloc est un bloc Hero
  const isHeroBlock = (type: PhysicalFunnelBlockType) =>
    type === 'HERO_PRODUCT' || type === 'HERO_SPLIT_LUXURY' || type === 'HERO_VSL_VIDEO' || type === 'HERO_FLASH_CARD';

  // Échange instantané de style Hero en conservant les données
  const handleSwitchHeroStyle = (blockId: string, newType: PhysicalFunnelBlockType) => {
    playTapBeep();
    const titles: Record<string, string> = {
      HERO_PRODUCT: 'Hero Vitrine Standard CRO',
      HERO_SPLIT_LUXURY: 'Hero Split 2-Colonnes Luxury',
      HERO_VSL_VIDEO: 'Hero Vidéo VSL Haute Conversion',
      HERO_FLASH_CARD: 'Hero Flash Deals Card 3D'
    };

    setFunnelConfig(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => {
        if (b.id !== blockId) return b;
        return {
          ...b,
          type: newType,
          title: titles[newType] || b.title,
          props: {
            ...b.props,
            bulletPoints: b.props.bulletPoints || [
              'Finition Haute Précision & Matériaux Nobles',
              'Garantie Privilège 24 Mois Échange à Neuf',
              'Livraison Express Sous Scellé Sécurisé'
            ],
            luxuryRating: b.props.luxuryRating || '4.9/5 • 1 200+ Clients Privilège',
            videoUrl: b.props.videoUrl || '',
            viewersCount: b.props.viewersCount || '284',
            liveNotice: b.props.liveNotice || '🔴 VIDÉO EXCLUSIVE • Démonstration en direct',
            countdownMinutes: b.props.countdownMinutes || 45,
            stockLeft: b.props.stockLeft || 5
          }
        };
      }),
      updatedAt: Date.now()
    }));
  };

  const handleAddBlock = (type: PhysicalFunnelBlockType) => {
    playTapBeep();
    const newId = `block_${type.toLowerCase()}_${Date.now()}`;
    const titles: Record<PhysicalFunnelBlockType, string> = {
      HERO_PRODUCT: 'Hero Vitrine Standard CRO',
      HERO_SPLIT_LUXURY: 'Hero Split 2-Colonnes Luxury',
      HERO_VSL_VIDEO: 'Hero Vidéo VSL Haute Conversion',
      HERO_FLASH_CARD: 'Hero Flash Deals Card 3D',
      LIVE_SALE_TOAST: 'Preuve Sociale FOMO',
      FLASH_LIVE_CTA: 'Bouton Concierge WebRTC',
      SCARCITY_URGENCY: 'Jauge Rareté & Compte à Rebours',
      TRUST_BADGES: 'Badges de Confiance',
      INLINE_CHECKOUT: 'Caisse Geo-Routée Intégrée',
      BENEFITS_LIST: 'Liste d\'Avantages AIDA',
      CUSTOMER_REVIEWS: 'Avis Clients Vérifiés',
      AUTOPLAY_VIDEO: 'Vidéo Autoplay Silencieuse (Boucle CDN)',
      MINI_MARKET_DRAWER: 'Mini-Market Express (Auto-composition)'
    };

    const defaultPropsByType: Record<PhysicalFunnelBlockType, Record<string, any>> = {
      HERO_PRODUCT: {
        headline: funnelConfig.title || 'Offre Spéciale Exclusive',
        subheadline: 'Commandez en direct et recevez votre livraison express garantie.',
        badgeText: 'VENTE FLASH EXCLUSIVE • STOCK LIMITÉ',
        price: 25000,
        originalPrice: 45000,
        discountBadge: '-45% AUJOURD\'HUI',
        ctaText: 'Commander Maintenant',
        imageUrl: ''
      },
      HERO_SPLIT_LUXURY: {
        headline: funnelConfig.title || 'Collection Signature Prestige',
        subheadline: 'Un savoir-faire incomparable conçu pour durer toute une vie.',
        badgeText: 'COLLECTION ÉLITE • ÉDITION LIMITÉE',
        price: 35000,
        originalPrice: 60000,
        discountBadge: '-40% ÉLITE',
        ctaText: 'Réserver Mon Coffret Luxe',
        imageUrl: '',
        bulletPoints: [
          'Finition Haute Précision & Matériaux Nobles',
          'Garantie Privilège 24 Mois Échange à Neuf',
          'Livraison Express Sous Scellé Sécurisé'
        ],
        luxuryRating: '4.9/5 • 1 200+ Clients Privilège'
      },
      HERO_VSL_VIDEO: {
        headline: 'Découvrez la Démonstration Complète en Vidéo',
        subheadline: 'Regardez comment ce produit révolutionne votre quotidien avant de commander.',
        badgeText: 'DÉMONSTRATION EN DIRECT',
        price: 25000,
        originalPrice: 40000,
        discountBadge: '-35% OFFRE VIDÉO',
        ctaText: 'Commander Après Démonstration',
        videoUrl: '',
        viewersCount: '284',
        liveNotice: '🔴 VIDÉO EXCLUSIVE • Démonstration en direct'
      },
      HERO_FLASH_CARD: {
        headline: 'Deal Éclair 3D • Édition Chrono',
        subheadline: 'Profitez de la remise maximale avant la fin du compte à rebours.',
        badgeText: '⚡ VENTE ÉCLAIR 3D',
        price: 22000,
        originalPrice: 45000,
        discountBadge: '-50% FLASH',
        ctaText: 'Saisir le Deal Immédiatement',
        imageUrl: '',
        countdownMinutes: 45,
        stockLeft: 4
      },
      SCARCITY_URGENCY: {
        totalStock: 30,
        remainingStock: 7,
        hoursLeft: 3,
        urgencyText: 'Plus que 7 exemplaires disponibles à ce tarif promotionnel !'
      },
      FLASH_LIVE_CTA: {
        buttonText: '👁️ Voir le produit en direct (Visio 5 min)',
        badgeText: 'VENDEUR CONNECTÉ EN BOUTIQUE',
        merchantPhone: funnelConfig.merchantWhatsapp || '+225 07 00 00 00 00'
      },
      TRUST_BADGES: {
        badges: [
          'Paiement Sécurisé Wave & Orange Money',
          'Livraison Express & Sécurisée',
          'Garantie Satisfait ou Remboursé'
        ]
      },
      INLINE_CHECKOUT: {
        heading: 'Finalisez votre commande en 1 minute',
        subheading: 'Paiement sans contact ou règlement à la livraison',
        defaultProvider: 'WAVE'
      },
      BENEFITS_LIST: {
        headline: 'Pourquoi nos clients adorent ce produit :',
        bullets: [
          { title: 'Qualité Supérieure Certifiée', desc: 'Conçu avec des matériaux durables et résistants.' },
          { title: 'Garantie Totale 12 Mois', desc: 'Échange immédiat en cas de défaut.' },
          { title: 'Livraison Express Sécurisée', desc: 'Vérifiez votre colis avant de régler.' }
        ]
      },
      CUSTOMER_REVIEWS: {
        headline: 'Avis Clients Vérifiés (4.9 / 5)',
        rating: '4.9/5',
        reviews: [
          { name: 'Kouamé Y.', city: 'Abidjan', comment: 'Livraison reçue en 4h chrono, produit conforme à 100% !' },
          { name: 'Fatou D.', city: 'Dakar', comment: 'Très bonne qualité, j\'ai pu payer par Wave à la livraison.' }
        ]
      },
      LIVE_SALE_TOAST: {
        intervalSeconds: 12,
        enabled: true
      },
      AUTOPLAY_VIDEO: {
        videoUrl: '',
        title: 'Vidéo Démonstration Produit',
        aspectRatio: '16/9',
        borderRadius: 'rounded-2xl',
        maxWidth: 'max-w-4xl'
      },
      MINI_MARKET_DRAWER: {
        buttonText: 'Explorer le Mini-Market',
        badgeText: 'Auto-composition',
        headline: 'Complétez votre commande avec le Mini-Market',
        subheadline: 'Ajoutez des articles et accessoires complémentaires directement.',
        floatingButtonEnabled: true
      }
    };

    const newBlock: PhysicalFunnelBlock = {
      id: newId,
      type,
      title: titles[type] || 'Bloc Personnalisé',
      visible: true,
      props: defaultPropsByType[type] || {}
    };

    setFunnelConfig(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
      updatedAt: Date.now()
    }));
    setSelectedBlockId(newId);
    setSavedNotification(`Bloc "${titles[type]}" ajouté !`);
    setTimeout(() => setSavedNotification(null), 2500);
  };

  const handleDeleteBlock = (blockId: string) => {
    playTapBeep();
    setFunnelConfig(prev => {
      const remaining = prev.blocks.filter(b => b.id !== blockId);
      if (selectedBlockId === blockId) {
        setSelectedBlockId(remaining[0]?.id || '');
      }
      return {
        ...prev,
        blocks: remaining,
        updatedAt: Date.now()
      };
    });
    setSavedNotification('Bloc supprimé.');
    setTimeout(() => setSavedNotification(null), 2000);
  };

  const handleToggleVisible = (blockId: string) => {
    playTapBeep();
    setFunnelConfig(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === blockId ? { ...b, visible: !b.visible } : b)
    }));
  };

  // Gestion des modes de livraison personnalisés
  const handleAddDeliveryOption = () => {
    playTapBeep();
    const newOpt: DeliveryOption = {
      id: `deliv_${Date.now()}`,
      name: 'Livraison Express Zone Spécifique',
      price: 1500,
      estimatedTime: '24h chrono',
      description: 'Livraison sécurisée avec suivi par SMS'
    };
    setFunnelConfig(prev => ({
      ...prev,
      deliveryOptions: [...(prev.deliveryOptions || []), newOpt],
      updatedAt: Date.now()
    }));
  };

  const handleUpdateDeliveryOption = (id: string, updates: Partial<DeliveryOption>) => {
    setFunnelConfig(prev => ({
      ...prev,
      deliveryOptions: (prev.deliveryOptions || []).map(opt =>
        opt.id === id ? { ...opt, ...updates } : opt
      ),
      updatedAt: Date.now()
    }));
  };

  const handleDeleteDeliveryOption = (id: string) => {
    playTapBeep();
    setFunnelConfig(prev => ({
      ...prev,
      deliveryOptions: (prev.deliveryOptions || []).filter(opt => opt.id !== id),
      updatedAt: Date.now()
    }));
  };

  // Auto-synchronisation continue dans le stockage local pour le direct
  useEffect(() => {
    if (funnelConfig && funnelConfig.slug) {
      try {
        const payload = {
          ...funnelConfig,
          funnelType: 'checkout',
          funnelStudio: 'cro_express',
          linkPrefix: 'c',
          isPublished: true,
          updatedAt: Date.now()
        };
        localStorage.setItem(`nana_funnel_c-${funnelConfig.slug}`, JSON.stringify(payload));
        localStorage.setItem(`nana_funnel_${funnelConfig.slug}`, JSON.stringify(payload));
      } catch (e) {}
    }
  }, [funnelConfig]);

  const handleSaveAndPublish = async () => {
    playValidationBeep();
    const updated: PhysicalFunnelConfig = {
      ...funnelConfig,
      brandColor: funnelConfig.brandColor || '#10b981',
      funnelType: 'checkout',
      funnelStudio: 'cro_express',
      linkPrefix: 'c',
      isPublished: true,
      updatedAt: Date.now()
    };
    setFunnelConfig(updated);
    try {
      localStorage.setItem(`nana_funnel_c-${updated.slug}`, JSON.stringify(updated));
      localStorage.setItem(`nana_funnel_${updated.slug}`, JSON.stringify(updated));
    } catch (e) {}

    try {
      await registerSubdomainInFirebase(updated.slug, updated.title, updated);
      await saveFunnelConfig(updated);
    } catch (e) {
      console.warn('[PhysicalFunnelBuilder] Erreur Firestore:', e);
    }

    if (onSave) onSave(updated);

    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/c/${updated.slug}`
      : `https://nanasore.com/c/${updated.slug}`;

    setSavedNotification(`Tunnel publié avec succès ! Lien direct : ${shareUrl}`);
    setTimeout(() => setSavedNotification(null), 4000);
  };

  const heroBlock = funnelConfig.blocks.find(b => isHeroBlock(b.type));
  const heroProps = heroBlock?.props || {};

  return (
    <div className={`flex flex-col h-[calc(100vh-80px)] w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl ${className}`}>
      {/* 1. Header Toolbar du Builder */}
      <header className="px-4 sm:px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onClose && (
            <button
              type="button"
              onClick={() => { playTapBeep(); onClose(); }}
              className="p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0 shadow-sm"
              title="Retour au Dashboard"
            >
              <ArrowLeft style={{ color: brandColor }} className="w-4 h-4" />
              <span className="hidden sm:inline">Retour</span>
            </button>
          )}

          <span
            style={{ backgroundColor: `${brandColor}20`, borderColor: `${brandColor}40`, color: brandColor }}
            className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black border shrink-0"
          >
            CAISSE EXPRESS CRO
          </span>
          <h2 className="text-sm font-black text-white truncate max-w-[160px] sm:max-w-[280px]">
            {funnelConfig.title}
          </h2>
        </div>

        {/* Actions centrales : Mode Device & Générateur IA */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { playTapBeep(); setIsAiModalOpen(true); }}
            style={{
              background: `linear-gradient(135deg, ${brandColor}, #6366f1)`
            }}
            className="px-3 py-1.5 rounded-xl text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition cursor-pointer hover:brightness-110 active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Générer avec NaNa Studio</span>
          </button>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setDevicePreview('DESKTOP')}
              style={{ color: devicePreview === 'DESKTOP' ? brandColor : undefined }}
              className={`p-1.5 rounded-lg transition cursor-pointer ${devicePreview === 'DESKTOP' ? 'bg-slate-800 font-bold' : 'text-slate-500'}`}
              title="Aperçu Ordinateur"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDevicePreview('MOBILE')}
              style={{ color: devicePreview === 'MOBILE' ? brandColor : undefined }}
              className={`p-1.5 rounded-lg transition cursor-pointer ${devicePreview === 'MOBILE' ? 'bg-slate-800 font-bold' : 'text-slate-500'}`}
              title="Aperçu Mobile 60 FPS"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Boutons d'Action & Paramètres */}
        <div className="flex items-center gap-2">
          {/* Bouton Toggle Onglet Paramètres */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab(prev => prev === 'settings' ? 'blocks' : 'settings');
            }}
            style={{
              borderColor: activeTab === 'settings' ? brandColor : undefined,
              backgroundColor: activeTab === 'settings' ? `${brandColor}20` : undefined,
              color: activeTab === 'settings' ? brandColor : undefined
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm ${
              activeTab === 'settings'
                ? 'ring-1'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Paramètres généraux et personnalisation du tunnel"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Paramètres</span>
          </button>

          {onViewLive && (
            <button
              type="button"
              onClick={() => {
                const payload = {
                  ...funnelConfig,
                  brandColor: funnelConfig.brandColor || '#10b981',
                  funnelType: 'checkout',
                  funnelStudio: 'cro_express',
                  linkPrefix: 'c',
                  isPublished: true,
                  updatedAt: Date.now()
                };
                try {
                  localStorage.setItem(`nana_funnel_c-${funnelConfig.slug}`, JSON.stringify(payload));
                  localStorage.setItem(`nana_funnel_${funnelConfig.slug}`, JSON.stringify(payload));
                  saveFunnelConfig(payload);
                } catch (e) {}
                onViewLive(funnelConfig.slug);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-xs font-bold"
              title="Voir en direct"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveAndPublish}
            style={{
              backgroundColor: brandColor,
              boxShadow: `0 10px 25px -5px ${brandColor}60`
            }}
            className="px-4 py-2 rounded-xl active:scale-95 text-white font-black text-xs flex items-center gap-1.5 transition cursor-pointer hover:brightness-110"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Publier la Page</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer text-xs font-bold"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Notification toast */}
      {savedNotification && (
        <div
          style={{ borderColor: `${brandColor}40`, backgroundColor: `${brandColor}15` }}
          className="border-b px-4 py-2 text-xs font-bold text-white flex items-center gap-2"
        >
          <CheckCircle2 style={{ color: brandColor }} className="w-4 h-4" />
          <span>{savedNotification}</span>
        </div>
      )}

      {/* Sélecteur Mobile Slider / Segmenté (Canvas Live vs Éditeur) */}
      <div className="lg:hidden px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-center shrink-0">
        <div className="w-full max-w-md grid grid-cols-2 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold shadow-inner">
          <button
            type="button"
            onClick={() => { playTapBeep(); setMobileView('preview'); }}
            style={{
              backgroundColor: mobileView === 'preview' ? brandColor : undefined,
              boxShadow: mobileView === 'preview' ? `0 4px 15px -3px ${brandColor}60` : undefined,
              color: mobileView === 'preview' ? '#ffffff' : undefined
            }}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              mobileView === 'preview' ? 'font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>👁️ Aperçu Live (Canvas)</span>
          </button>

          <button
            type="button"
            onClick={() => { playTapBeep(); setMobileView('editor'); }}
            style={{
              backgroundColor: mobileView === 'editor' ? brandColor : undefined,
              boxShadow: mobileView === 'editor' ? `0 4px 15px -3px ${brandColor}60` : undefined,
              color: mobileView === 'editor' ? '#ffffff' : undefined
            }}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              mobileView === 'editor' ? 'font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>⚙️ Blocs & Édition</span>
          </button>
        </div>
      </div>

      {/* 2. Workspace Principal Divisé (Split-Screen) */}
      <div className="flex-1 w-full flex overflow-hidden relative">
        {/* Colonne Gauche : Structure & Blocs OU Paramètres Généraux */}
        <div className={`${mobileView === 'editor' ? 'flex w-full' : 'hidden'} lg:flex lg:w-[440px] bg-slate-900/95 border-r border-slate-800 flex-col shrink-0 overflow-hidden`}>
          {/* Onglets Principaux : Structure/Blocs vs Paramètres Généraux */}
          <div className="p-2.5 bg-slate-950/80 border-b border-slate-800 grid grid-cols-2 gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveTab('blocks'); }}
              style={{
                backgroundColor: activeTab === 'blocks' ? brandColor : undefined,
                boxShadow: activeTab === 'blocks' ? `0 4px 15px -3px ${brandColor}50` : undefined
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'blocks'
                  ? 'text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Structure & Blocs</span>
            </button>
            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveTab('settings'); }}
              style={{
                backgroundColor: activeTab === 'settings' ? brandColor : undefined,
                boxShadow: activeTab === 'settings' ? `0 4px 15px -3px ${brandColor}50` : undefined
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'settings'
                  ? 'text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Paramètres Généraux</span>
            </button>
          </div>

          {/* ================================================================ */}
          {/* VUE 1 : PARAMÈTRES GÉNÉRAUX DU TUNNEL (IMAGE 127)                 */}
          {/* ================================================================ */}
          {activeTab === 'settings' ? (
            <div className="flex-1 p-3.5 overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar space-y-3.5">
              {/* 1. Titre & Identité */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders style={{ color: brandColor }} className="w-3.5 h-3.5" />
                  <span>Identité du Tunnel & Offre</span>
                </span>
                <div>
                  <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Nom de l'offre / Titre du Produit :</label>
                  <input
                    type="text"
                    value={funnelConfig.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setFunnelConfig(prev => ({
                        ...prev,
                        title: newTitle,
                        ogMetadata: { ...prev.ogMetadata, title: newTitle }
                      }));
                      if (heroBlock) {
                        updateBlockProps(heroBlock.id, { headline: newTitle });
                      }
                    }}
                    placeholder="Ex: Montre Connectée Élite Pro"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. Lien Public & Slug /c/ avec Copie */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Globe style={{ color: brandColor }} className="w-3.5 h-3.5" />
                    <span>Lien Public Caisse Express</span>
                  </span>
                  <span
                    style={{ backgroundColor: `${brandColor}20`, borderColor: `${brandColor}40`, color: brandColor }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                  >
                    Préfixe /c/
                  </span>
                </div>
                <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
                  <span
                    style={{ color: brandColor }}
                    className="bg-slate-950 px-2.5 py-2 text-xs font-mono font-bold border-r border-slate-800 shrink-0 select-none"
                  >
                    nanasore.com/c/
                  </span>
                  <input
                    type="text"
                    value={funnelConfig.slug}
                    onChange={(e) => setFunnelConfig(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    placeholder="mon-offre"
                    className="flex-1 bg-transparent px-2.5 py-2 text-xs text-white font-mono font-bold focus:outline-none min-w-0"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    style={{ backgroundColor: brandColor }}
                    className="px-3 py-2 active:scale-95 text-white text-xs font-bold font-mono flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-sm hover:brightness-110"
                    title="Copier le lien public du tunnel"
                  >
                    {copyFeedback ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copyFeedback ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
                <p className="text-[10.5px] text-slate-400">
                  Partagez ce lien directement sur vos publicités TikTok, Facebook, Instagram et WhatsApp.
                </p>
              </div>

              {/* 3. Colorimétrie Dynamique & Couleur de Marque */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Palette style={{ color: brandColor }} className="w-3.5 h-3.5" />
                    <span>Colorimétrie Dynamique du Tunnel</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    {brandColor}
                  </span>
                </div>

                {/* Nuancier Presets */}
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { hex: '#10b981', label: 'Émeraude' },
                    { hex: '#6366f1', label: 'Indigo' },
                    { hex: '#f43f5e', label: 'Rose' },
                    { hex: '#f59e0b', label: 'Ambre' },
                    { hex: '#06b6d4', label: 'Cyan' },
                    { hex: '#8b5cf6', label: 'Pourpre' },
                    { hex: '#ef4444', label: 'Rouge' },
                    { hex: '#ec4899', label: 'Fuchsia' },
                    { hex: '#0ea5e9', label: 'Bleu' },
                    { hex: '#1e293b', label: 'Sombre' }
                  ].map((item) => (
                    <button
                      key={item.hex}
                      type="button"
                      onClick={() => setFunnelConfig(prev => ({ ...prev, brandColor: item.hex }))}
                      style={{ backgroundColor: item.hex }}
                      className={`w-7 h-7 rounded-xl transition cursor-pointer flex items-center justify-center ${
                        brandColor === item.hex ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={item.label}
                    >
                      {brandColor === item.hex && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>

                {/* Sélecteur de couleur personnalisée Hex */}
                <div className="pt-2 border-t border-slate-900 flex items-center gap-2.5">
                  <label className="text-[10.5px] font-bold text-slate-400 shrink-0">Couleur Sur-Mesure :</label>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setFunnelConfig(prev => ({ ...prev, brandColor: e.target.value }))}
                      className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer p-0.5 shrink-0"
                    />
                    <input
                      type="text"
                      value={brandColor}
                      onChange={(e) => setFunnelConfig(prev => ({ ...prev, brandColor: e.target.value }))}
                      placeholder="#10b981"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  ✓ Cette couleur pilote instantanément les boutons CTA, halos 3D, bordures de caisse, jauges de rareté et badges de réassurance.
                </p>
              </div>

              {/* 4. MODES DE LIVRAISON & EXPÉDITION ULTRA-PERSONNALISÉS */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Truck style={{ color: brandColor }} className="w-3.5 h-3.5" />
                    <span>Modes de Livraison & Logistique</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {(funnelConfig.deliveryOptions || []).length} Modes Actifs
                  </span>
                </div>

                {/* Paramètres Généraux Expédition */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Ville par Défaut :</label>
                    <input
                      type="text"
                      value={funnelConfig.defaultCity || 'Abidjan'}
                      onChange={(e) => setFunnelConfig(prev => ({ ...prev, defaultCity: e.target.value }))}
                      placeholder="Abidjan / Dakar"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Délai Promis Global :</label>
                    <input
                      type="text"
                      value={funnelConfig.deliveryTime || '24h chrono'}
                      onChange={(e) => setFunnelConfig(prev => ({ ...prev, deliveryTime: e.target.value }))}
                      placeholder="24h chrono"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Liste des Options de Livraison Modifiables */}
                <div className="space-y-2 pt-1">
                  <label className="text-[10.5px] font-bold text-slate-300 block">
                    Options de Livraison Proposées au Client :
                  </label>

                  {(funnelConfig.deliveryOptions || []).map((opt, idx) => (
                    <div
                      key={opt.id}
                      className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500">Option {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteDeliveryOption(opt.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                          title="Supprimer cette option de livraison"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9.5px] font-bold text-slate-400 block mb-0.5">Nom de l'option :</label>
                          <input
                            type="text"
                            value={opt.name}
                            onChange={(e) => handleUpdateDeliveryOption(opt.id, { name: e.target.value })}
                            placeholder="Ex: Livraison Express Moto"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-bold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[9.5px] font-bold text-slate-400 block mb-0.5">Tarif (FCFA, 0 = Gratuit) :</label>
                          <input
                            type="number"
                            value={opt.price}
                            onChange={(e) => handleUpdateDeliveryOption(opt.id, { price: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-emerald-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9.5px] font-bold text-slate-400 block mb-0.5">Délai estimé :</label>
                          <input
                            type="text"
                            value={opt.estimatedTime}
                            onChange={(e) => handleUpdateDeliveryOption(opt.id, { estimatedTime: e.target.value })}
                            placeholder="Ex: 2 à 4 heures"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[9.5px] font-bold text-slate-400 block mb-0.5">Description / Précision :</label>
                          <input
                            type="text"
                            value={opt.description || ''}
                            onChange={(e) => handleUpdateDeliveryOption(opt.id, { description: e.target.value })}
                            placeholder="Ex: Coursier dédié en main propre"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddDeliveryOption}
                    style={{ borderColor: `${brandColor}40`, color: brandColor }}
                    className="w-full py-2.5 rounded-xl border border-dashed hover:bg-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter un Mode de Livraison</span>
                  </button>
                </div>

                {/* Section Order Bump / Emballage ou Assurance Livraison */}
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer">
                      <Gift className="w-3.5 h-3.5 text-amber-400" />
                      <span>Order Bump (Upsell Livraison / Emballage VIP)</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={funnelConfig.orderBumpEnabled !== false}
                      onChange={(e) => setFunnelConfig(prev => ({ ...prev, orderBumpEnabled: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {funnelConfig.orderBumpEnabled !== false && (
                    <div className="space-y-2 pt-1 border-t border-slate-800/80">
                      <div>
                        <label className="text-[9.5px] font-bold text-slate-400 block mb-0.5">Titre de l'Upsell :</label>
                        <input
                          type="text"
                          value={funnelConfig.orderBump?.title || DEFAULT_ORDER_BUMP.title}
                          onChange={(e) => setFunnelConfig(prev => ({
                            ...prev,
                            orderBump: {
                              ...(prev.orderBump || DEFAULT_ORDER_BUMP),
                              title: e.target.value
                            }
                          }))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-bold focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9.5px] font-bold text-slate-400 block mb-0.5">Tarif Additionnel (FCFA) :</label>
                          <input
                            type="number"
                            value={funnelConfig.orderBump?.price || 1000}
                            onChange={(e) => setFunnelConfig(prev => ({
                              ...prev,
                              orderBump: {
                                ...(prev.orderBump || DEFAULT_ORDER_BUMP),
                                price: Number(e.target.value)
                              }
                            }))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-amber-300 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9.5px] font-bold text-slate-400 block mb-0.5">Badge Promo :</label>
                          <input
                            type="text"
                            value={funnelConfig.orderBump?.badge || 'OFFRE POPULAIRE'}
                            onChange={(e) => setFunnelConfig(prev => ({
                              ...prev,
                              orderBump: {
                                ...(prev.orderBump || DEFAULT_ORDER_BUMP),
                                badge: e.target.value
                              }
                            }))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9.5px] font-bold text-slate-400 block mb-0.5">Description de l'offre :</label>
                        <textarea
                          rows={2}
                          value={funnelConfig.orderBump?.description || DEFAULT_ORDER_BUMP.description}
                          onChange={(e) => setFunnelConfig(prev => ({
                            ...prev,
                            orderBump: {
                              ...(prev.orderBump || DEFAULT_ORDER_BUMP),
                              description: e.target.value
                            }
                          }))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. WhatsApp Marchand & Support Direct */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Phone style={{ color: brandColor }} className="w-3.5 h-3.5" />
                  <span>WhatsApp Marchand</span>
                </span>
                <div>
                  <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Numéro WhatsApp avec indicatif :</label>
                  <input
                    type="text"
                    value={funnelConfig.merchantWhatsapp || ''}
                    onChange={(e) => setFunnelConfig(prev => ({ ...prev, merchantWhatsapp: e.target.value }))}
                    placeholder="+225 07 00 00 00 00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Les clients pourront vous joindre en 1 clic pour finaliser leur commande ou poser des questions.
                  </p>
                </div>
              </div>

              {/* 6. Tarification Globale */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Tag style={{ color: brandColor }} className="w-3.5 h-3.5" />
                  <span>Tarification & Devises</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Prix Promo (FCFA) :</label>
                    <input
                      type="number"
                      value={heroProps.price || funnelConfig.ogMetadata?.priceAmount || 25000}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (heroBlock) updateBlockProps(heroBlock.id, { price: val });
                        setFunnelConfig(prev => ({ ...prev, ogMetadata: { ...prev.ogMetadata, priceAmount: val } }));
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Prix Barré (FCFA) :</label>
                    <input
                      type="number"
                      value={heroProps.originalPrice || 45000}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (heroBlock) updateBlockProps(heroBlock.id, { originalPrice: val });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 7. Moyens de Paiement Acceptés */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard style={{ color: brandColor }} className="w-3.5 h-3.5" />
                  <span>Moyens de Paiement Acceptés</span>
                </span>
                <div className="space-y-1.5">
                  {[
                    { key: 'wave', label: 'Wave Mobile Money (QR & Push)', color: 'text-sky-400' },
                    { key: 'orangeMoney', label: 'Orange Money (OTP / Direct)', color: 'text-orange-400' },
                    { key: 'mtn', label: 'MTN Mobile Money', color: 'text-amber-400' },
                    { key: 'moov', label: 'Moov Money', color: 'text-blue-400' },
                    { key: 'cashOnDelivery', label: 'Paiement Cash à la Livraison', color: 'text-emerald-400' }
                  ].map((method) => {
                    const currentMethods = funnelConfig.paymentMethods || {
                      wave: true,
                      orangeMoney: true,
                      mtn: true,
                      moov: true,
                      cashOnDelivery: true
                    };
                    const isChecked = currentMethods[method.key as keyof typeof currentMethods] !== false;
                    return (
                      <label key={method.key} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                        <span className={`text-xs font-bold ${method.color}`}>{method.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => setFunnelConfig(prev => ({
                            ...prev,
                            paymentMethods: {
                              ...(prev.paymentMethods || {}),
                              [method.key]: e.target.checked
                            }
                          }))}
                          className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-800 border-slate-700 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 8. Référencement & OpenGraph */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Partage WhatsApp & Réseaux Sociaux</span>
                </span>
                <div>
                  <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Description d'accroche (Aperçu) :</label>
                  <textarea
                    rows={2}
                    value={funnelConfig.ogMetadata?.description || ''}
                    onChange={(e) => setFunnelConfig(prev => ({
                      ...prev,
                      ogMetadata: { ...prev.ogMetadata, description: e.target.value }
                    }))}
                    placeholder="Vente flash exclusive avec livraison express et paiement sécurisé..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ================================================================ */
            /* VUE 2 : BLOCS & ESPACE DE PERSONNALISATION DIRECT (IMAGE 127)     */
            /* ================================================================ */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Sélecteur Couleur Marque Rapide */}
              <div className="px-3 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers style={{ color: brandColor }} className="w-3.5 h-3.5" />
                  <span>Structure ({funnelConfig.blocks.length} Blocs)</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {['#10b981', '#6366f1', '#f43f5e', '#f59e0b', '#06b6d4', '#8b5cf6'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFunnelConfig(prev => ({ ...prev, brandColor: color }))}
                      style={{ backgroundColor: color }}
                      className={`w-3.5 h-3.5 rounded-full transition cursor-pointer ${brandColor === color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Contenu Déroulant : Liste des Blocs + Personnalisation Directe */}
              <div className="flex-1 p-3 overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar space-y-3">
                {/* Liste Sortable des Blocs */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={funnelConfig.blocks.map(b => b.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5">
                      {funnelConfig.blocks.map((block) => (
                        <SortableBlockRow
                          key={block.id}
                          block={block}
                          isSelected={selectedBlock?.id === block.id}
                          onSelect={() => { playTapBeep(); setSelectedBlockId(block.id); }}
                          onDelete={() => handleDeleteBlock(block.id)}
                          onToggleVisible={() => handleToggleVisible(block.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Ajouter un Bloc de Conversion CRO */}
                <div className="pt-2 border-t border-slate-800/60">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                    Ajouter un Bloc CRO
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {/* Blocs Hero alternatifs */}
                    <button
                      type="button"
                      onClick={() => handleAddBlock('HERO_PRODUCT')}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-slate-300 text-left font-bold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Hero Vitrine</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('HERO_SPLIT_LUXURY')}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 text-left font-bold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Hero Split Luxe</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('HERO_VSL_VIDEO')}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-slate-300 text-left font-bold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-rose-400" />
                      <span>Hero Vidéo VSL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('HERO_FLASH_CARD')}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-yellow-500/50 text-slate-300 text-left font-bold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Hero Flash 3D</span>
                    </button>

                    {/* Autres Blocs CRO */}
                    <button
                      type="button"
                      onClick={() => handleAddBlock('SCARCITY_URGENCY')}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-orange-500/50 text-slate-300 text-left font-bold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-orange-400" />
                      <span>Jauge Stock</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('FLASH_LIVE_CTA')}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-pink-500/50 text-slate-300 text-left font-bold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-pink-400" />
                      <span>Bouton Visio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('TRUST_BADGES')}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 text-slate-300 text-left font-bold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-teal-400" />
                      <span>Badges Confiance</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('INLINE_CHECKOUT')}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-slate-300 text-left font-bold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Caisse 1-Clic</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('BENEFITS_LIST')}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-slate-300 text-left font-bold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Avantages AIDA</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('CUSTOMER_REVIEWS')}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 text-left font-bold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Avis Clients</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('AUTOPLAY_VIDEO')}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-violet-500/50 text-slate-300 text-left font-bold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-violet-400" />
                      <span>Vidéo Autoplay</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('MINI_MARKET_DRAWER')}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-slate-300 text-left font-bold flex items-center gap-1.5 transition col-span-2 sm:col-span-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Mini-Market Express</span>
                    </button>
                  </div>
                </div>

                {/* ========================================================== */}
                {/* ESPACE DE PERSONNALISATION DIRECT DU BLOC SÉLECTIONNÉ     */}
                {/* ========================================================== */}
                {selectedBlock && (
                  <div
                    style={{ borderColor: `${brandColor}50` }}
                    className="mt-3 p-3.5 rounded-2xl bg-slate-950 border-2 space-y-3 shadow-xl"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span style={{ backgroundColor: brandColor }} className="w-2 h-2 rounded-full animate-pulse" />
                        <span className="text-xs font-black text-white truncate">{selectedBlock.title}</span>
                      </div>
                      <span
                        style={{ color: brandColor, backgroundColor: `${brandColor}15`, borderColor: `${brandColor}30` }}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md border shrink-0"
                      >
                        Personnalisation directe
                      </span>
                    </div>

                    {/* SWITCHER DE STYLES HERO (Si un bloc Hero est sélectionné) */}
                    {isHeroBlock(selectedBlock.type) && (
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <label className="text-[10.5px] font-black text-slate-300 flex items-center gap-1.5">
                          <Crown style={{ color: brandColor }} className="w-3.5 h-3.5" />
                          <span>Changer le Style & Design du Hero :</span>
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSwitchHeroStyle(selectedBlock.id, 'HERO_PRODUCT')}
                            style={{
                              borderColor: selectedBlock.type === 'HERO_PRODUCT' ? brandColor : undefined,
                              backgroundColor: selectedBlock.type === 'HERO_PRODUCT' ? `${brandColor}20` : undefined,
                              color: selectedBlock.type === 'HERO_PRODUCT' ? brandColor : undefined
                            }}
                            className={`p-2 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                              selectedBlock.type === 'HERO_PRODUCT' ? 'ring-1' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>1. Vitrine Standard</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSwitchHeroStyle(selectedBlock.id, 'HERO_SPLIT_LUXURY')}
                            style={{
                              borderColor: selectedBlock.type === 'HERO_SPLIT_LUXURY' ? brandColor : undefined,
                              backgroundColor: selectedBlock.type === 'HERO_SPLIT_LUXURY' ? `${brandColor}20` : undefined,
                              color: selectedBlock.type === 'HERO_SPLIT_LUXURY' ? brandColor : undefined
                            }}
                            className={`p-2 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                              selectedBlock.type === 'HERO_SPLIT_LUXURY' ? 'ring-1' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Crown className="w-3.5 h-3.5" />
                            <span>2. Split Luxury</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSwitchHeroStyle(selectedBlock.id, 'HERO_VSL_VIDEO')}
                            style={{
                              borderColor: selectedBlock.type === 'HERO_VSL_VIDEO' ? brandColor : undefined,
                              backgroundColor: selectedBlock.type === 'HERO_VSL_VIDEO' ? `${brandColor}20` : undefined,
                              color: selectedBlock.type === 'HERO_VSL_VIDEO' ? brandColor : undefined
                            }}
                            className={`p-2 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                              selectedBlock.type === 'HERO_VSL_VIDEO' ? 'ring-1' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>3. Vidéo VSL</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSwitchHeroStyle(selectedBlock.id, 'HERO_FLASH_CARD')}
                            style={{
                              borderColor: selectedBlock.type === 'HERO_FLASH_CARD' ? brandColor : undefined,
                              backgroundColor: selectedBlock.type === 'HERO_FLASH_CARD' ? `${brandColor}20` : undefined,
                              color: selectedBlock.type === 'HERO_FLASH_CARD' ? brandColor : undefined
                            }}
                            className={`p-2 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                              selectedBlock.type === 'HERO_FLASH_CARD' ? 'ring-1' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>4. Flash Card 3D</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CHAMPS COMMUNS HERO (HERO_PRODUCT, HERO_SPLIT_LUXURY, HERO_VSL_VIDEO, HERO_FLASH_CARD) */}
                    {isHeroBlock(selectedBlock.type) && (
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Titre d'Accroche :</label>
                          <input
                            type="text"
                            value={selectedBlock.props.headline || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { headline: e.target.value })}
                            placeholder="Offre Spéciale Exclusive"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Sous-titre Persuasif :</label>
                          <textarea
                            rows={2}
                            value={selectedBlock.props.subheadline || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { subheadline: e.target.value })}
                            placeholder="Commandez en direct et recevez votre livraison express..."
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Badge Promotionnel :</label>
                          <input
                            type="text"
                            value={selectedBlock.props.badgeText || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { badgeText: e.target.value })}
                            placeholder="VENTE FLASH EXCLUSIVE • STOCK LIMITÉ"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 font-bold focus:outline-none"
                          />
                        </div>

                        {/* Champs spécifiques Vidéo VSL */}
                        {selectedBlock.type === 'HERO_VSL_VIDEO' && (
                          <div className="space-y-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <div>
                              <label className="text-[10.5px] font-bold text-rose-300 block mb-1">URL Vidéo (YouTube / Vimeo / MP4) :</label>
                              <input
                                type="text"
                                value={selectedBlock.props.videoUrl || ''}
                                onChange={(e) => updateBlockProps(selectedBlock.id, { videoUrl: e.target.value })}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-[11px] focus:outline-none"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Spectateurs Live :</label>
                                <input
                                  type="text"
                                  value={selectedBlock.props.viewersCount || '284'}
                                  onChange={(e) => updateBlockProps(selectedBlock.id, { viewersCount: e.target.value })}
                                  placeholder="284"
                                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Bannière Ticker :</label>
                                <input
                                  type="text"
                                  value={selectedBlock.props.liveNotice || '🔴 EN DIRECT'}
                                  onChange={(e) => updateBlockProps(selectedBlock.id, { liveNotice: e.target.value })}
                                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-rose-400 font-bold focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Image produit pour Vitrine, Split Luxury et Flash Card avec Upload Direct ImgBB */}
                        {selectedBlock.type !== 'HERO_VSL_VIDEO' && (
                          <div className="pt-1">
                            <ImageUploadInput
                              label="Image du Produit :"
                              value={selectedBlock.props.imageUrl || ''}
                              onChange={(url) => updateBlockProps(selectedBlock.id, { imageUrl: url })}
                              placeholder="https://i.ibb.co/... ou parcourir"
                              badge="ImgBB Direct"
                              previewHeight="h-28"
                            />
                          </div>
                        )}

                        {/* Champs spécifiques Split Luxury */}
                        {selectedBlock.type === 'HERO_SPLIT_LUXURY' && (
                          <div className="space-y-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <label className="text-[10.5px] font-bold text-amber-300 block">3 Garanties Prestige (Puces) :</label>
                            {[0, 1, 2].map((idx) => {
                              const bullets = selectedBlock.props.bulletPoints || [
                                'Finition Haute Précision & Matériaux Nobles',
                                'Garantie Privilège 24 Mois Échange à Neuf',
                                'Livraison Express Sous Scellé Sécurisé'
                              ];
                              return (
                                <input
                                  key={idx}
                                  type="text"
                                  value={bullets[idx] || ''}
                                  onChange={(e) => {
                                    const next = [...bullets];
                                    next[idx] = e.target.value;
                                    updateBlockProps(selectedBlock.id, { bulletPoints: next });
                                  }}
                                  placeholder={`Garantie Prestige ${idx + 1}`}
                                  className="w-full px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white text-[11px] focus:outline-none"
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Champs spécifiques Flash Card 3D */}
                        {selectedBlock.type === 'HERO_FLASH_CARD' && (
                          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <div>
                              <label className="text-[10.5px] font-bold text-yellow-300 block mb-1">Chrono (minutes) :</label>
                              <input
                                type="number"
                                value={selectedBlock.props.countdownMinutes || 45}
                                onChange={(e) => updateBlockProps(selectedBlock.id, { countdownMinutes: Number(e.target.value) })}
                                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10.5px] font-bold text-yellow-300 block mb-1">Stock Critique Restant :</label>
                              <input
                                type="number"
                                value={selectedBlock.props.stockLeft || 5}
                                onChange={(e) => updateBlockProps(selectedBlock.id, { stockLeft: Number(e.target.value) })}
                                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-rose-400 font-mono font-bold focus:outline-none"
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Prix Vente Promo (FCFA) :</label>
                            <input
                              type="number"
                              value={selectedBlock.props.price || 0}
                              onChange={(e) => updateBlockProps(selectedBlock.id, { price: Number(e.target.value) })}
                              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono font-bold focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Prix Barré (FCFA) :</label>
                            <input
                              type="number"
                              value={selectedBlock.props.originalPrice || 0}
                              onChange={(e) => updateBlockProps(selectedBlock.id, { originalPrice: Number(e.target.value) })}
                              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-mono focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Badge Remise :</label>
                            <input
                              type="text"
                              value={selectedBlock.props.discountBadge || ''}
                              onChange={(e) => updateBlockProps(selectedBlock.id, { discountBadge: e.target.value })}
                              placeholder="-45% AUJOURD'HUI"
                              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-rose-400 font-bold focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Texte Bouton CTA :</label>
                            <input
                              type="text"
                              value={selectedBlock.props.ctaText || ''}
                              onChange={(e) => updateBlockProps(selectedBlock.id, { ctaText: e.target.value })}
                              placeholder="Commander Maintenant"
                              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-bold focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SCARCITY_URGENCY */}
                    {selectedBlock.type === 'SCARCITY_URGENCY' && (
                      <div className="space-y-2.5 text-xs">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Stock Restant :</label>
                            <input
                              type="number"
                              value={selectedBlock.props.remainingStock || 7}
                              onChange={(e) => updateBlockProps(selectedBlock.id, { remainingStock: Number(e.target.value) })}
                              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 font-mono font-bold focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Stock Total :</label>
                            <input
                              type="number"
                              value={selectedBlock.props.totalStock || 30}
                              onChange={(e) => updateBlockProps(selectedBlock.id, { totalStock: Number(e.target.value) })}
                              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Heures :</label>
                            <input
                              type="number"
                              value={selectedBlock.props.hoursLeft || 3}
                              onChange={(e) => updateBlockProps(selectedBlock.id, { hoursLeft: Number(e.target.value) })}
                              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Message d'Urgence :</label>
                          <input
                            type="text"
                            value={selectedBlock.props.urgencyText || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { urgencyText: e.target.value })}
                            placeholder="Plus que 7 exemplaires disponibles à ce tarif promotionnel !"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* FLASH_LIVE_CTA */}
                    {selectedBlock.type === 'FLASH_LIVE_CTA' && (
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Texte du Bouton Visio :</label>
                          <input
                            type="text"
                            value={selectedBlock.props.buttonText || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { buttonText: e.target.value })}
                            placeholder="👁️ Voir le produit en direct (Visio 5 min)"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Statut Vendeur :</label>
                          <input
                            type="text"
                            value={selectedBlock.props.badgeText || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { badgeText: e.target.value })}
                            placeholder="VENDEUR CONNECTÉ EN BOUTIQUE"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-bold focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Numéro WhatsApp / Appel :</label>
                          <input
                            type="text"
                            value={selectedBlock.props.merchantPhone || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { merchantPhone: e.target.value })}
                            placeholder="+22507000000"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* TRUST_BADGES */}
                    {selectedBlock.type === 'TRUST_BADGES' && (
                      <div className="space-y-2.5 text-xs">
                        <label className="text-[10.5px] font-bold text-slate-400 block">Les 3 Badges de Réassurance :</label>
                        {[0, 1, 2].map((idx) => {
                          const currentBadges = selectedBlock.props.badges || [
                            'Paiement 100% Sécurisé Wave & Orange Money',
                            'Livraison Express Bobo & Abidjan',
                            'Garantie Authenticité Caisse NaNa'
                          ];
                          return (
                            <input
                              key={idx}
                              type="text"
                              value={currentBadges[idx] || ''}
                              onChange={(e) => {
                                const newBadges = [...currentBadges];
                                newBadges[idx] = e.target.value;
                                updateBlockProps(selectedBlock.id, { badges: newBadges });
                              }}
                              placeholder={`Badge ${idx + 1}`}
                              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-[11px] focus:outline-none"
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* INLINE_CHECKOUT */}
                    {selectedBlock.type === 'INLINE_CHECKOUT' && (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Titre de la Caisse :</label>
                          <input
                            type="text"
                            value={selectedBlock.props.heading || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { heading: e.target.value })}
                            placeholder="Finalisez votre commande en 1 minute"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Sous-titre :</label>
                          <input
                            type="text"
                            value={selectedBlock.props.subheading || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { subheading: e.target.value })}
                            placeholder="Paiement sans contact ou règlement à la livraison"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Mode de Paiement par Défaut :</label>
                          <select
                            value={selectedBlock.props.defaultProvider || 'WAVE'}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { defaultProvider: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:outline-none cursor-pointer"
                          >
                            <option value="WAVE">Wave Mobile Money</option>
                            <option value="ORANGE_MONEY">Orange Money</option>
                            <option value="MOOV_MONEY">Moov Money</option>
                            <option value="MTN_MOMO">MTN MoMo</option>
                            <option value="CASH_ON_DELIVERY">Règlement à la Livraison</option>
                          </select>
                        </div>

                        {/* Raccourci vers Paramètres Livraison */}
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10.5px] font-bold text-slate-300 flex items-center gap-1.5">
                              <Truck style={{ color: brandColor }} className="w-3.5 h-3.5" />
                              <span>{(funnelConfig.deliveryOptions || []).length} Modes de Livraison</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => { playTapBeep(); setActiveTab('settings'); }}
                              style={{ color: brandColor }}
                              className="text-[10.5px] font-bold underline cursor-pointer hover:opacity-80"
                            >
                              Gérer les tarifs & zones
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Configurez les délais, zones et frais de port dans l'onglet Paramètres Généraux.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* BENEFITS_LIST */}
                    {selectedBlock.type === 'BENEFITS_LIST' && (
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Titre de la Section :</label>
                          <input
                            type="text"
                            value={selectedBlock.props.headline || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { headline: e.target.value })}
                            placeholder="Pourquoi nos clients adorent ce produit :"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          {[0, 1, 2].map((idx) => {
                            const bullets = selectedBlock.props.bullets || [
                              { title: 'Qualité Supérieure Certifiée', desc: 'Conçu avec des matériaux durables et résistants.' },
                              { title: 'Garantie Totale 12 Mois', desc: 'Échange immédiat en cas de défaut.' },
                              { title: 'Livraison Express Sécurisée', desc: 'Vérifiez votre colis avant de régler.' }
                            ];
                            const cur = bullets[idx] || { title: '', desc: '' };
                            return (
                              <div key={idx} className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                                <input
                                  type="text"
                                  value={cur.title}
                                  onChange={(e) => {
                                    const next = [...bullets];
                                    next[idx] = { ...cur, title: e.target.value };
                                    updateBlockProps(selectedBlock.id, { bullets: next });
                                  }}
                                  placeholder={`Titre Avantage ${idx + 1}`}
                                  className="w-full bg-transparent text-white font-bold text-xs focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={cur.desc}
                                  onChange={(e) => {
                                    const next = [...bullets];
                                    next[idx] = { ...cur, desc: e.target.value };
                                    updateBlockProps(selectedBlock.id, { bullets: next });
                                  }}
                                  placeholder="Description courte..."
                                  className="w-full bg-transparent text-slate-400 text-[11px] focus:outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* CUSTOMER_REVIEWS */}
                    {selectedBlock.type === 'CUSTOMER_REVIEWS' && (
                      <div className="space-y-2.5 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Titre Avis :</label>
                            <input
                              type="text"
                              value={selectedBlock.props.headline || ''}
                              onChange={(e) => updateBlockProps(selectedBlock.id, { headline: e.target.value })}
                              placeholder="Avis Clients Vérifiés"
                              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Note Moyenne :</label>
                            <input
                              type="text"
                              value={selectedBlock.props.rating || ''}
                              onChange={(e) => updateBlockProps(selectedBlock.id, { rating: e.target.value })}
                              placeholder="4.9/5"
                              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 font-bold focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* LIVE_SALE_TOAST */}
                    {selectedBlock.type === 'LIVE_SALE_TOAST' && (
                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Intervalle de Notification (secondes) :</label>
                          <input
                            type="number"
                            value={selectedBlock.props.intervalSeconds || 12}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { intervalSeconds: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* AUTOPLAY_VIDEO */}
                    {selectedBlock.type === 'AUTOPLAY_VIDEO' && (
                      <div className="space-y-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-violet-950/30 border border-violet-500/30 text-[11px] text-violet-300 space-y-1">
                          <span className="font-bold flex items-center gap-1.5 text-violet-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                            <span>Économie Bande Passante Firebase</span>
                          </span>
                          <p className="text-slate-400 text-[10.5px]">
                            Collez l'URL de votre vidéo hébergée sur Cloudinary, CDN ou MP4 direct. Aucun upload lourd n'est effectué.
                          </p>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">
                            URL de la Vidéo (MP4, Cloudinary, CDN) :
                          </label>
                          <input
                            type="url"
                            value={selectedBlock.props.videoUrl || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { videoUrl: e.target.value })}
                            placeholder="https://res.cloudinary.com/.../video.mp4"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-[11px] focus:outline-none focus:border-violet-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Titre de la Vidéo (Optionnel) :</label>
                          <input
                            type="text"
                            value={selectedBlock.props.title || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { title: e.target.value })}
                            placeholder="Démonstration Produit"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Format :</label>
                            <select
                              value={selectedBlock.props.aspectRatio || '16/9'}
                              onChange={(e) => updateBlockProps(selectedBlock.id, { aspectRatio: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:outline-none cursor-pointer"
                            >
                              <option value="16/9">16:9 Paysage</option>
                              <option value="9/16">9:16 Vertical</option>
                              <option value="1/1">1:1 Carré</option>
                              <option value="auto">Auto</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Coins :</label>
                            <select
                              value={selectedBlock.props.borderRadius || 'rounded-2xl'}
                              onChange={(e) => updateBlockProps(selectedBlock.id, { borderRadius: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:outline-none cursor-pointer"
                            >
                              <option value="rounded-none">Carré (0px)</option>
                              <option value="rounded-xl">Arrondi (12px)</option>
                              <option value="rounded-2xl">Grand arrondi (16px)</option>
                              <option value="rounded-3xl">Prestige (24px)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedBlock.type === 'MINI_MARKET_DRAWER' && (
                      <div className="space-y-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-[11px] text-emerald-300 space-y-1">
                          <span className="font-bold flex items-center gap-1.5 text-emerald-200">
                            <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Tiroir d'Auto-composition Latérale</span>
                          </span>
                          <p className="text-slate-400 text-[10.5px]">
                            Permet à vos acheteurs d'ajouter en 1 clic des articles complémentaires depuis le stock réel Supabase du magasin avant de valider leur commande en caisse ou Mobile Money.
                          </p>
                        </div>

                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">
                            Texte du Bouton Flottant :
                          </label>
                          <input
                            type="text"
                            value={selectedBlock.props.buttonText || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { buttonText: e.target.value })}
                            placeholder="Explorer le Mini-Market"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">
                            Badge Promotionnel :
                          </label>
                          <input
                            type="text"
                            value={selectedBlock.props.badgeText || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { badgeText: e.target.value })}
                            placeholder="Auto-composition"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">
                            Titre de la Section Incitative :
                          </label>
                          <input
                            type="text"
                            value={selectedBlock.props.headline || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { headline: e.target.value })}
                            placeholder="Complétez votre commande avec le Mini-Market"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block mb-1">
                            Sous-titre / Explication :
                          </label>
                          <input
                            type="text"
                            value={selectedBlock.props.subheadline || ''}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { subheadline: e.target.value })}
                            placeholder="Ajoutez des articles complémentaires sans frais de port supplémentaires."
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[11px] font-bold text-slate-300">Bouton Flottant Latéral Actif</span>
                          <input
                            type="checkbox"
                            checked={selectedBlock.props.floatingButtonEnabled !== false}
                            onChange={(e) => updateBlockProps(selectedBlock.id, { floatingButtonEnabled: e.target.checked })}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsMiniMarketPreviewOpen(true)}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Tester l'ouverture du tiroir Mini-Market</span>
                        </button>
                      </div>
                    )}
                    {/* Bouton de Suppression Rapide du Bloc Sélectionné */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(selectedBlock.id)}
                        className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer ce bloc ({selectedBlock.title})</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pied de page du panneau : Sauvegarder & Publier */}
              <div className="p-3 bg-slate-900/95 border-t border-slate-800/80 sticky bottom-0 z-10 backdrop-blur-md flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAndPublish}
                  style={{
                    backgroundColor: brandColor,
                    boxShadow: `0 8px 20px -4px ${brandColor}50`
                  }}
                  className="w-full py-2.5 px-4 rounded-xl active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer hover:brightness-110 shadow-lg"
                  title="Enregistrer toutes les modifications du tunnel physique"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Sauvegarder & Publier la Page</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Colonne Droite : Canvas Live Preview 60 FPS (Scrollable et Fluide) */}
        <div className={`${mobileView === 'preview' ? 'flex w-full' : 'hidden'} lg:flex flex-1 bg-[#020617] overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar justify-center p-3 sm:p-6 lg:p-8`}>
          <div
            className={`transition-all duration-300 ${
              devicePreview === 'MOBILE'
                ? 'w-[380px] h-[720px] max-h-[90vh] border-4 border-slate-800 rounded-[36px] shadow-2xl overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar bg-[#070b14] my-auto p-4'
                : 'w-full max-w-4xl'
            }`}
          >
            {/* Contenu de la Landing Page Rendu en Direct */}
            <div className="space-y-6 pb-12">
              {funnelConfig.blocks.filter(b => b.visible).map((block) => {
                // 1. HERO PRODUCT : VITRINE STANDARD CRO
                if (block.type === 'HERO_PRODUCT') {
                  const headline = block.props.headline || funnelConfig.title;
                  const subheadline = block.props.subheadline || 'Commandez en direct et recevez votre livraison express.';
                  const badge = block.props.badgeText || 'VENTE FLASH EXCLUSIVE • STOCK LIMITÉ';
                  const price = Number(block.props.price) || 24500;
                  const originalPrice = Number(block.props.originalPrice) || 45000;
                  const discount = block.props.discountBadge || '-25% AUJOURD\'HUI';
                  const ctaText = block.props.ctaText || 'Commander Maintenant';
                  const img = block.props.imageUrl;

                  return (
                    <section key={block.id} className="p-4 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
                      {badge && (
                        <span
                          style={{ backgroundColor: `${brandColor}20`, borderColor: `${brandColor}40`, color: brandColor }}
                          className="px-3 py-1 rounded-full text-xs font-black border inline-block"
                        >
                          {badge}
                        </span>
                      )}
                      <h1 className="text-xl sm:text-3xl font-black text-white leading-tight">
                        {headline}
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                        {subheadline}
                      </p>

                      {img && (
                        <div className="rounded-2xl overflow-hidden aspect-video bg-slate-950 border border-slate-800">
                          <img src={img} alt="Produit" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className="flex items-baseline gap-3 pt-2">
                        <span style={{ color: brandColor }} className="text-2xl sm:text-3xl font-black font-mono">
                          {formatCFA(price)}
                        </span>
                        {originalPrice > 0 && (
                          <span className="text-sm text-slate-500 line-through font-mono">
                            {formatCFA(originalPrice)}
                          </span>
                        )}
                        {discount && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-xs font-extrabold border border-rose-500/30">
                            {discount}
                          </span>
                        )}
                      </div>

                      <a
                        href="#inline-checkout"
                        style={{
                          backgroundColor: brandColor,
                          boxShadow: `0 10px 25px -5px ${brandColor}60`
                        }}
                        className="w-full py-3.5 px-6 active:scale-98 text-white font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition hover:brightness-110"
                      >
                        <span>{ctaText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </section>
                  );
                }

                // 2. HERO SPLIT LUXURY 2-COLONNES
                if (block.type === 'HERO_SPLIT_LUXURY') {
                  const headline = block.props.headline || funnelConfig.title || 'Collection Signature Prestige';
                  const subheadline = block.props.subheadline || 'Un savoir-faire incomparable conçu pour durer toute une vie.';
                  const badge = block.props.badgeText || 'COLLECTION ÉLITE • ÉDITION LIMITÉE';
                  const price = Number(block.props.price) || 35000;
                  const originalPrice = Number(block.props.originalPrice) || 60000;
                  const discount = block.props.discountBadge || '-40% ÉLITE';
                  const ctaText = block.props.ctaText || 'Réserver Mon Coffret Luxe';
                  const img = block.props.imageUrl;
                  const bullets = block.props.bulletPoints || [
                    'Finition Haute Précision & Matériaux Nobles',
                    'Garantie Privilège 24 Mois Échange à Neuf',
                    'Livraison Express Sous Scellé Sécurisé'
                  ];
                  const rating = block.props.luxuryRating || '4.9/5 • 1 200+ Clients Privilège';

                  return (
                    <section
                      key={block.id}
                      style={{ borderColor: `${brandColor}40` }}
                      className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border shadow-2xl relative overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        {/* Colonne Gauche : Copywriting & Call to Action */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span
                              style={{ backgroundColor: `${brandColor}20`, borderColor: `${brandColor}40`, color: brandColor }}
                              className="px-3 py-1 rounded-full text-[10.5px] font-black border flex items-center gap-1.5"
                            >
                              <Crown className="w-3.5 h-3.5" />
                              <span>{badge}</span>
                            </span>
                          </div>

                          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                            {headline}
                          </h1>

                          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                            {subheadline}
                          </p>

                          {/* Puces de réassurance Prestige */}
                          <div className="space-y-2 pt-1">
                            {bullets.map((b: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                                <CheckCircle2 style={{ color: brandColor }} className="w-4 h-4 shrink-0" />
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>

                          {/* Tarification Double */}
                          <div className="flex items-baseline gap-3 pt-2">
                            <span style={{ color: brandColor }} className="text-3xl font-black font-mono">
                              {formatCFA(price)}
                            </span>
                            {originalPrice > 0 && (
                              <span className="text-sm text-slate-500 line-through font-mono">
                                {formatCFA(originalPrice)}
                              </span>
                            )}
                            {discount && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/30">
                                {discount}
                              </span>
                            )}
                          </div>

                          <a
                            href="#inline-checkout"
                            style={{
                              backgroundColor: brandColor,
                              boxShadow: `0 10px 25px -5px ${brandColor}60`
                            }}
                            className="w-full py-4 px-6 active:scale-98 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition hover:brightness-110"
                          >
                            <Crown className="w-4 h-4" />
                            <span>{ctaText}</span>
                            <ArrowRight className="w-4 h-4" />
                          </a>
                        </div>

                        {/* Colonne Droite : Vitrine Prestige & Badge */}
                        <div className="relative">
                          <div
                            style={{ boxShadow: `0 20px 50px -15px ${brandColor}40` }}
                            className="rounded-3xl overflow-hidden aspect-square bg-slate-950 border border-slate-800 relative flex items-center justify-center group"
                          >
                            {img ? (
                              <img src={img} alt={headline} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-600 gap-2 p-6 text-center">
                                <Crown style={{ color: brandColor }} className="w-12 h-12 stroke-[1.5]" />
                                <span className="text-xs font-bold">Vitrine Prestige Luxury</span>
                              </div>
                            )}

                            {/* Badge Flottant Clients Privilège */}
                            <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 flex items-center justify-between text-xs">
                              <span className="text-amber-400 font-black">★ {rating}</span>
                              <span style={{ color: brandColor }} className="font-bold text-[10.5px]">Édition Numérotée</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                }

                // 3. HERO VIDÉO VSL HAUTE CONVERSION
                if (block.type === 'HERO_VSL_VIDEO') {
                  const headline = block.props.headline || 'Découvrez la Démonstration Complète en Vidéo';
                  const subheadline = block.props.subheadline || 'Regardez la démonstration complète avant de commander.';
                  const price = Number(block.props.price) || 25000;
                  const originalPrice = Number(block.props.originalPrice) || 40000;
                  const discount = block.props.discountBadge || '-35% OFFRE VIDÉO';
                  const ctaText = block.props.ctaText || 'Commander Après Démonstration';
                  const videoUrl = block.props.videoUrl;
                  const viewers = block.props.viewersCount || '284';
                  const liveNotice = block.props.liveNotice || '🔴 VIDÉO EXCLUSIVE • Démonstration en direct';

                  return (
                    <section key={block.id} className="p-5 sm:p-7 rounded-3xl bg-slate-900/95 border border-slate-800 space-y-4 shadow-2xl text-center">
                      {/* Ticker Live Supérieur */}
                      <div className="flex items-center justify-center gap-2">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-wider text-rose-400">
                          {liveNotice} • <strong className="text-white">{viewers} personnes</strong> regardent
                        </span>
                      </div>

                      <h1 className="text-xl sm:text-3xl font-black text-white leading-tight max-w-2xl mx-auto">
                        {headline}
                      </h1>

                      <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
                        {subheadline}
                      </p>

                      {/* Cadre Vidéo Player */}
                      <div className="rounded-2xl overflow-hidden aspect-video bg-black border border-slate-800 relative shadow-2xl flex items-center justify-center">
                        {videoUrl && (videoUrl.includes('youtube') || videoUrl.includes('youtu.be')) ? (
                          <iframe
                            src={videoUrl.replace('watch?v=', 'embed/')}
                            title="VSL Product Video"
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : videoUrl && videoUrl.endsWith('.mp4') ? (
                          <video src={videoUrl} controls className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 cursor-pointer group">
                            <div
                              style={{ backgroundColor: brandColor, boxShadow: `0 0 35px ${brandColor}` }}
                              className="w-16 h-16 rounded-full flex items-center justify-center text-white transition transform group-hover:scale-110 active:scale-95"
                            >
                              <Play className="w-7 h-7 fill-white ml-1" />
                            </div>
                            <span className="text-xs font-bold text-slate-200">
                              Cliquez pour lancer la vidéo de présentation (3 min 45 s)
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Son & Haute Définition activés
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Tarification & Bouton Sous la Vidéo */}
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <span style={{ color: brandColor }} className="text-3xl font-black font-mono">
                          {formatCFA(price)}
                        </span>
                        {originalPrice > 0 && (
                          <span className="text-sm text-slate-500 line-through font-mono">
                            {formatCFA(originalPrice)}
                          </span>
                        )}
                        {discount && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-xs font-black border border-rose-500/30">
                            {discount}
                          </span>
                        )}
                      </div>

                      <a
                        href="#inline-checkout"
                        style={{
                          backgroundColor: brandColor,
                          boxShadow: `0 12px 30px -6px ${brandColor}60`
                        }}
                        className="w-full py-4 px-6 active:scale-98 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition hover:brightness-110"
                      >
                        <span>{ctaText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </section>
                  );
                }

                // 4. HERO FLASH DEALS CARD 3D
                if (block.type === 'HERO_FLASH_CARD') {
                  const headline = block.props.headline || 'Deal Éclair 3D • Édition Chrono';
                  const subheadline = block.props.subheadline || 'Profitez de la remise maximale avant la fin du compte à rebours.';
                  const badge = block.props.badgeText || '⚡ DEAL ÉCLAIR DU JOUR';
                  const price = Number(block.props.price) || 22000;
                  const originalPrice = Number(block.props.originalPrice) || 45000;
                  const discount = block.props.discountBadge || '-50% FLASH';
                  const ctaText = block.props.ctaText || 'Saisir le Deal Immédiatement';
                  const img = block.props.imageUrl;
                  const stockLeft = block.props.stockLeft || 4;

                  return (
                    <section
                      key={block.id}
                      style={{
                        borderColor: brandColor,
                        boxShadow: `0 15px 40px -10px ${brandColor}30`
                      }}
                      className="p-5 sm:p-7 rounded-3xl bg-slate-900 border-2 space-y-4 relative overflow-hidden"
                    >
                      {/* Bandeau Supérieur Éclair */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span
                          style={{ backgroundColor: `${brandColor}20`, color: brandColor, borderColor: `${brandColor}40` }}
                          className="px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>{badge}</span>
                        </span>

                        <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-black border border-rose-500/30">
                          {discount}
                        </span>
                      </div>

                      <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                        {headline}
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-300">
                        {subheadline}
                      </p>

                      {img && (
                        <div className="rounded-2xl overflow-hidden aspect-video bg-slate-950 border border-slate-800">
                          <img src={img} alt={headline} className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Jauge Stock Flash */}
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-amber-400">Stock Flash Disponible :</span>
                          <span className="text-rose-400 font-mono">Plus que {stockLeft} unités</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            style={{ width: `${Math.max(10, (stockLeft / 20) * 100)}%`, backgroundColor: brandColor }}
                            className="h-full rounded-full transition-all"
                          />
                        </div>
                      </div>

                      <div className="flex items-baseline gap-3 pt-1">
                        <span style={{ color: brandColor }} className="text-3xl font-black font-mono">
                          {formatCFA(price)}
                        </span>
                        {originalPrice > 0 && (
                          <span className="text-sm text-slate-500 line-through font-mono">
                            {formatCFA(originalPrice)}
                          </span>
                        )}
                      </div>

                      <a
                        href="#inline-checkout"
                        style={{
                          backgroundColor: brandColor,
                          boxShadow: `0 10px 25px -5px ${brandColor}60`
                        }}
                        className="w-full py-4 px-6 active:scale-98 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition hover:brightness-110"
                      >
                        <Zap className="w-4 h-4" />
                        <span>{ctaText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </section>
                  );
                }

                if (block.type === 'SCARCITY_URGENCY') {
                  return (
                    <ScarcityUrgencyBlock
                      key={block.id}
                      totalStock={block.props.totalStock}
                      remainingStock={block.props.remainingStock}
                      hoursLeft={block.props.hoursLeft}
                      urgencyText={block.props.urgencyText}
                    />
                  );
                }

                if (block.type === 'FLASH_LIVE_CTA') {
                  return (
                    <FlashLiveCtaButton
                      key={block.id}
                      buttonText={block.props.buttonText}
                      badgeText={block.props.badgeText}
                      merchantPhone={block.props.merchantPhone || funnelConfig.merchantWhatsapp}
                    />
                  );
                }

                if (block.type === 'TRUST_BADGES') {
                  return (
                    <TrustBadgesBlock
                      key={block.id}
                      badges={block.props.badges}
                      brandColor={brandColor}
                    />
                  );
                }

                if (block.type === 'INLINE_CHECKOUT') {
                  return (
                    <InlineGeoCheckoutBlock
                      key={block.id}
                      productName={funnelConfig.title}
                      price={heroProps.price || 24500}
                      originalPrice={heroProps.originalPrice}
                      brandColor={brandColor}
                      heading={block.props.heading}
                      subheading={block.props.subheading}
                      deliveryOptions={funnelConfig.deliveryOptions}
                      orderBump={funnelConfig.orderBump}
                      orderBumpEnabled={funnelConfig.orderBumpEnabled}
                      acceptedProviders={funnelConfig.paymentMethods}
                    />
                  );
                }

                if (block.type === 'BENEFITS_LIST') {
                  const bullets = block.props.bullets || [
                    { title: 'Qualité Supérieure Certifiée', desc: 'Conçu avec des matériaux durables et résistants.' },
                    { title: 'Garantie Totale 12 Mois', desc: 'Échange immédiat en cas de défaut.' },
                    { title: 'Livraison Express Sécurisée', desc: 'Vérifiez votre colis avant de régler.' }
                  ];
                  return (
                    <section key={block.id} className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <h3 className="text-base font-black text-white">{block.props.headline || 'Pourquoi nos clients adorent ce produit :'}</h3>
                      <div className="space-y-2">
                        {bullets.map((b: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                            <CheckCircle2 style={{ color: brandColor }} className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-white">{b.title}</p>
                              <p className="text-[11px] text-slate-400">{b.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }

                if (block.type === 'CUSTOMER_REVIEWS') {
                  return (
                    <section key={block.id} className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-black text-white">{block.props.headline || 'Avis Clients Vérifiés'}</h3>
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1">★ {block.props.rating || '4.9/5'}</span>
                      </div>
                      <div className="space-y-2">
                        {(block.props.reviews || [
                          { name: 'Kouamé Y.', city: 'Abidjan', comment: 'Livraison reçue en 4h chrono, produit conforme à 100% !' },
                          { name: 'Fatou D.', city: 'Dakar', comment: 'Très bonne qualité, j\'ai pu payer par Wave à la livraison.' }
                        ]).map((rev: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
                            <div className="flex items-center justify-between font-bold text-slate-200 mb-1">
                              <span>{rev.name} ({rev.city})</span>
                              <span style={{ color: brandColor }} className="text-[10px] font-bold">Achat Vérifié ✓</span>
                            </div>
                            <p className="text-slate-400 text-[11px]">{rev.comment}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }

                if (block.type === 'AUTOPLAY_VIDEO') {
                  return (
                    <div key={block.id} className="w-full">
                      <AutoplayVideoBlock
                        block={{ id: block.id, data: block.props }}
                        data={block.props}
                        isBuilderMode={true}
                        onUpdateUrl={(url) => updateBlockProps(block.id, { videoUrl: url })}
                      />
                    </div>
                  );
                }

                if (block.type === 'MINI_MARKET_DRAWER') {
                  const headline = block.props.headline || 'Complétez votre commande avec le Mini-Market';
                  const subheadline = block.props.subheadline || 'Ajoutez des articles et accessoires complémentaires directement.';
                  const buttonText = block.props.buttonText || 'Explorer le Mini-Market';
                  const badgeText = block.props.badgeText || 'Auto-composition';

                  return (
                    <section key={block.id} className="p-5 rounded-3xl bg-slate-900/90 border border-emerald-500/30 space-y-3 shadow-xl">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-white">
                                {headline}
                              </h4>
                              {badgeText && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                                  {badgeText}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {subheadline}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsMiniMarketPreviewOpen(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{buttonText}</span>
                        </button>
                      </div>
                    </section>
                  );
                }

                return null;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating FOMO Toast */}
      <LiveSaleToast
        notification={currentNotification}
        isVisible={isFomoVisible}
        onDismiss={dismissFomo}
      />

      {/* Modale Magic Form NaNa Auto-Funnel AI */}
      <AutoFunnelAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onFunnelGenerated={(newConfig) => {
          setFunnelConfig(newConfig);
          setSelectedBlockId(newConfig.blocks[0]?.id || '');
          playValidationBeep();
        }}
      />

      {/* Bouton Flottant Latéral Mini-Market (Si activé dans les blocs) */}
      {funnelConfig.blocks.some(b => b.type === 'MINI_MARKET_DRAWER' && b.visible !== false && b.props?.floatingButtonEnabled !== false) && (
        <button
          type="button"
          onClick={() => setIsMiniMarketPreviewOpen(true)}
          className="fixed right-4 bottom-8 z-30 flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-xl border border-emerald-400/40 transition active:scale-95 cursor-pointer text-xs"
          title="Explorer le Mini-Market"
        >
          <ShoppingBag className="w-4 h-4 text-white" />
          <span className="hidden sm:inline">Explorer le Mini-Market</span>
        </button>
      )}

      {/* Drawer Mini-Market en mode prévisualisation Studio */}
      <MiniMarketDrawer
        products={[
          {
            id: 'prev-1',
            name: 'Batterie Externe PowerBank 10000mAh',
            price: 7500,
            category: 'Accessoires High-Tech',
            image: 'https://images.unsplash.com/photo-1609592424364-5858066fba94?w=400&q=80',
            stock: 25,
          },
          {
            id: 'prev-2',
            name: 'Câble Charge Rapide 3-en-1 Tressé',
            price: 2500,
            category: 'Accessoires High-Tech',
            image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&q=80',
            stock: 40,
          },
          {
            id: 'prev-3',
            name: 'Lingettes Microfibres Premium (Pack de 3)',
            price: 1500,
            category: 'Entretien',
            image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80',
            stock: 60,
          }
        ]}
        isOpen={isMiniMarketPreviewOpen}
        onClose={() => setIsMiniMarketPreviewOpen(false)}
        onCheckout={(cart) => {
          setComposedCart(cart);
          setIsMiniMarketPreviewOpen(false);
          setIsCheckoutModalOpen(true);
        }}
      />

      {/* Switcher Flottant Rapide sur Téléphone */}
      <div className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 backdrop-blur-md p-1.5 rounded-full border border-slate-700 shadow-2xl flex items-center gap-1">
        <button
          type="button"
          onClick={() => { playTapBeep(); setMobileView('preview'); }}
          style={{
            backgroundColor: mobileView === 'preview' ? brandColor : undefined,
            color: mobileView === 'preview' ? '#ffffff' : undefined
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            mobileView === 'preview' ? 'shadow-md' : 'text-slate-400'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Canvas</span>
        </button>
        <button
          type="button"
          onClick={() => { playTapBeep(); setMobileView('editor'); }}
          style={{
            backgroundColor: mobileView === 'editor' ? brandColor : undefined,
            color: mobileView === 'editor' ? '#ffffff' : undefined
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            mobileView === 'editor' ? 'shadow-md' : 'text-slate-400'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Éditeur</span>
        </button>
      </div>

      {/* Modale de Paiement Mobile Money & Token Caisse Réelle */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        dealProduct={{
          id: funnelConfig.productId || funnelConfig.id,
          title: funnelConfig.title,
          price: (funnelConfig.blocks.find(b => isHeroBlock(b.type))?.props?.price) || 25000,
          imageUrl: (funnelConfig.blocks.find(b => isHeroBlock(b.type))?.props?.imageUrl) || ''
        }}
        dealQuantity={1}
        cartItems={composedCart}
        tenantId={funnelConfig.storeId}
        tenantName={funnelConfig.title}
      />
    </div>
  );
};

export default PhysicalFunnelBuilder;
