import React, { useState } from 'react';
import {
  X,
  Banknote,
  Users,
  Gift,
  PieChart,
  ShoppingBag,
  MapPin,
  Crown,
  Mic,
  ChevronRight,
  ShieldCheck,
  Check,
  Flame,
  Sparkles,
  ArrowLeft,
  Clock,
  Coins,
  Store,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../../utils/audio';
import { NANASORE_GIFT_CATALOG } from '../../../../types/cagnotte';

export interface SampleGiftItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  imageUrl: string;
  merchantName: string;
  category: string;
  deliveryEta: string;
  description: string;
}

export const SAMPLE_GIFT_PRODUCTS: SampleGiftItem[] = [
  {
    id: 'birthday-cake-royal',
    title: "Gâteau d'anniversaire Signature (Chocolat & Fraises)",
    price: 15000,
    currency: 'FCFA',
    imageUrl:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=800&auto=format&fit=crop',
    merchantName: 'Pâtisserie Douceur Divine • Nanasore',
    category: 'Pâtisserie',
    deliveryEta: '15 - 20 min',
    description: 'Confection artisanale sur-mesure pour célébrer une occasion spéciale.'
  },
  {
    id: 'macarons-prestige',
    title: 'Coffret 24 Macarons Prestige',
    price: 12000,
    currency: 'FCFA',
    imageUrl:
      'https://images.unsplash.com/photo-1569864358642-9d1684040f43?q=80&w=800&auto=format&fit=crop',
    merchantName: 'Maison du Macaron • Nanasore',
    category: 'Confiserie',
    deliveryEta: '25 - 30 min',
    description: 'Sélection raffinée vanille Bourbon, pistache, caramel beurre salé.'
  },
  {
    id: 'parfum-luxe',
    title: 'Coffret Cadeau Élixir Parfumé',
    price: 25000,
    currency: 'FCFA',
    imageUrl:
      'https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=800&auto=format&fit=crop',
    merchantName: 'Parfumerie Royale • Nanasore',
    category: 'Luxe & Beauté',
    deliveryEta: '30 - 45 min',
    description: 'Fragrance précieuse emballée dans son écrin velours.'
  }
];

// =============================================================================
// TYPES & CONTRATS D'ATTACHEMENT MINI-APPS
// =============================================================================

export type MiniAppType =
  | 'farotage'
  | 'tontine'
  | 'gift'
  | 'cagnotte'
  | 'nana_product'
  | 'delivery'
  | 'vip'
  | 'voice_farotage';

export interface MiniAppActionPayload {
  type: MiniAppType;
  title: string;
  subtitle?: string;
  amountFcfa?: number;
  recipient?: string;
  badge?: string;
  imageUrl?: string;
  meta?: Record<string, any>;
}

export interface MiniAppsGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (payload: MiniAppActionPayload) => void;
  chatRecipientName?: string;
  chatRecipientHandle?: string;
  walletBalanceFcfa?: number;
}

// Données d'inventaire Nanasore pour le partage de produit direct
export const SAMPLE_NANASORE_INVENTORY = [
  {
    id: 'prod-wax-deluxe',
    name: 'Robe Wax Royale Soirée',
    category: 'Mode & Couture',
    priceFcfa: 28500,
    stock: 5,
    imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&auto=format&fit=crop&q=80',
    sku: 'WAX-ROBE-2024',
    merchantName: 'Boutique Royale Ouaga'
  },
  {
    id: 'prod-sac-cuir',
    name: 'Sac à Main Cuir Touareg Artisanal',
    category: 'Maroquinerie',
    priceFcfa: 35000,
    stock: 3,
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&auto=format&fit=crop&q=80',
    sku: 'CUIR-TOUAREG-01',
    merchantName: 'Atelier Cuir Sahélien'
  },
  {
    id: 'prod-karite-bio',
    name: 'Beurre de Karité Bio Grand Format 500g',
    category: 'Cosmétique Naturelle',
    priceFcfa: 4500,
    stock: 24,
    imageUrl: 'https://images.unsplash.com/photo-1608248597359-00f72590212f?w=400&auto=format&fit=crop&q=80',
    sku: 'KARITE-500G-BIO',
    merchantName: 'Coopérative NaNa Bio'
  },
  {
    id: 'prod-sneakers-urban',
    name: 'Sneakers Streetwear Édition NaNa',
    category: 'Chaussures',
    priceFcfa: 42000,
    stock: 7,
    imageUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=400&auto=format&fit=crop&q=80',
    sku: 'SNK-URBAN-42',
    merchantName: 'NaNa Street Kicks'
  }
];

/**
 * PROMPT 49 : LE HUB D'ATTACHEMENTS (MINI-APPS GRID MODAL)
 * Directives UI/UX au millimètre :
 * - Panneau (Bottom Sheet ou Overlay) : fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] p-6
 * - Grille d'icônes très propre : grid grid-cols-4 gap-y-6 gap-x-2
 * - Chaque icône : w-12 h-12 rounded-full flex items-center justify-center text-white text-xl
 * - Petit texte en dessous : text-[10px] text-center font-medium
 * 
 * Organisation des Icônes :
 * 1. 💸 Farotage (Fond Or/Jaune) -> Ouvre le Sas de paiement Wameet
 * 2. 🎯 Tontine Flash (Fond Vert Émeraude)
 * 3. 🎁 Cadeau Mystère (Fond Rose/Violet)
 * 4. 💰 Cagnotte (Fond Bleu)
 * 5. 🛒 Produit Nanasore (Fond Bleu Marine) -> Partager un article de son inventaire direct
 * 6. 📍 Swarm Delivery (Fond Menthe/Cyan)
 * 7. 👑 Salon VIP (Fond Bronze/Or)
 * 8. 🎙️ Farotage Vocal (Fond Rouge/Corail)
 */
export const MiniAppsGridModal: React.FC<MiniAppsGridModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
  chatRecipientName = 'Awa Ouédraogo',
  chatRecipientHandle = '@awa.empire.bf',
  walletBalanceFcfa = 145000
}) => {
  // Sous-vues spécialisées des Mini-Apps
  const [activeSubView, setActiveSubView] = useState<MiniAppType | null>(null);

  // 1. État Farotage Wameet
  const [farotageAmount, setFarotageAmount] = useState<number>(2500);
  const [farotageNote, setFarotageNote] = useState<string>('Bravo pour vos créations ! 🌟');
  const [farotageOperator, setFarotageOperator] = useState<'orange' | 'moov' | 'wave' | 'wallet'>('wallet');

  // 2. État Tontine Flash
  const [tontineProduct, setTontineProduct] = useState<string>('Coffret Soins Bio Karité');
  const [tontineTargetOrders, setTontineTargetOrders] = useState<number>(10);
  const [tontineDiscount, setTontineDiscount] = useState<number>(25);
  const [tontinePrice, setTontinePrice] = useState<number>(15000);

  // 3. État Cadeau Mystère
  const [selectedGiftIndex, setSelectedGiftIndex] = useState<number>(0);
  const [giftGeofenceCity, setGiftGeofenceCity] = useState<string>('Ouagadougou (Ouaga 2000)');

  // 4. État Cagnotte
  const [cagnotteTitle, setCagnotteTitle] = useState<string>(`Cagnotte Anniversaire • ${chatRecipientName}`);
  const [selectedCagnotteGiftId, setSelectedCagnotteGiftId] = useState<string>('gift_iphone_15_pro_max');
  const [cagnotteEventDate, setCagnotteEventDate] = useState<string>('Samedi 24 Octobre à 19h30');

  // 5. État Produit Nanasore
  const [selectedPosProductId, setSelectedPosProductId] = useState<string>(SAMPLE_NANASORE_INVENTORY[0].id);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // Définition de la Grille des 8 Mini-Apps
  // ---------------------------------------------------------------------------
  const miniAppsList = [
    {
      id: 'farotage' as MiniAppType,
      label: 'Farotage',
      badgeText: '💸 Farotage',
      colorBg: 'bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 shadow-md shadow-amber-500/25',
      icon: Banknote,
      description: 'Pourboire direct Wameet'
    },
    {
      id: 'tontine' as MiniAppType,
      label: 'Tontine Flash',
      badgeText: '🎯 Tontine Flash',
      colorBg: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 shadow-md shadow-emerald-500/25',
      icon: Users,
      description: 'Achat groupé chronométré'
    },
    {
      id: 'gift' as MiniAppType,
      label: 'Cadeau Mystère',
      badgeText: '🎁 Cadeau Mystère',
      colorBg: 'bg-gradient-to-br from-rose-500 via-pink-600 to-purple-600 shadow-md shadow-pink-500/25',
      icon: Gift,
      description: 'Cadeau débloqué par GPS'
    },
    {
      id: 'cagnotte' as MiniAppType,
      label: 'Cagnotte',
      badgeText: '💰 Cagnotte',
      colorBg: 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 shadow-md shadow-blue-500/25',
      icon: PieChart,
      description: 'Collecte cadeau marchande'
    },
    {
      id: 'nana_product' as MiniAppType,
      label: 'Produit NaNa',
      badgeText: '🛒 Produit Nanasore',
      colorBg: 'bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 shadow-md shadow-slate-900/40',
      icon: ShoppingBag,
      description: 'Article du stock en direct'
    },
    {
      id: 'delivery' as MiniAppType,
      label: 'Swarm Delivery',
      badgeText: '📍 Swarm Delivery',
      colorBg: 'bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-700 shadow-md shadow-teal-500/25',
      icon: MapPin,
      description: 'Course & tracking livreur'
    },
    {
      id: 'vip' as MiniAppType,
      label: 'Salon VIP',
      badgeText: '👑 Salon VIP',
      colorBg: 'bg-gradient-to-br from-amber-600 via-yellow-700 to-amber-900 shadow-md shadow-amber-700/25',
      icon: Crown,
      description: 'Invitation cercle privé'
    },
    {
      id: 'voice_farotage' as MiniAppType,
      label: 'Farotage Vocal',
      badgeText: '🎙️ Farotage Vocal',
      colorBg: 'bg-gradient-to-br from-rose-600 via-red-600 to-rose-700 shadow-md shadow-rose-600/25',
      icon: Mic,
      description: 'Dédicace audio sponsorisée'
    }
  ];

  // ---------------------------------------------------------------------------
  // Handlers de soumission pour chaque Mini-App
  // ---------------------------------------------------------------------------

  const handleConfirmFarotage = (e: React.FormEvent) => {
    e.preventDefault();
    playCashChime();
    onSelectAction({
      type: 'farotage',
      title: `Farotage de ${farotageAmount.toLocaleString('fr-FR')} FCFA`,
      subtitle: farotageNote || `Envoyé à ${chatRecipientName}`,
      amountFcfa: farotageAmount,
      recipient: chatRecipientName,
      badge: '💸 Farotage Reçu (Wameet Escrow)',
      meta: {
        operator: farotageOperator,
        note: farotageNote
      }
    });
    setActiveSubView(null);
    onClose();
  };

  const handleConfirmTontine = (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    onSelectAction({
      type: 'tontine',
      title: `Tontine Flash : ${tontineProduct}`,
      subtitle: `Objectif : ${tontineTargetOrders} commandes pour débloquer -${tontineDiscount}% !`,
      amountFcfa: Math.round(tontinePrice * (1 - tontineDiscount / 100)),
      badge: `🎯 Tontine Flash (-${tontineDiscount}%)`,
      meta: {
        originalPrice: tontinePrice,
        discountPercent: tontineDiscount,
        targetOrders: tontineTargetOrders,
        timeLimitMin: 15
      }
    });
    setActiveSubView(null);
    onClose();
  };

  const handleConfirmGift = (e: React.FormEvent) => {
    e.preventDefault();
    playCashChime();
    const gift = SAMPLE_GIFT_PRODUCTS[selectedGiftIndex] || SAMPLE_GIFT_PRODUCTS[0];
    onSelectAction({
      type: 'gift',
      title: `Cadeau Mystère : ${gift.title}`,
      subtitle: `Verrouillé jusqu'à détection GPS à ${giftGeofenceCity}`,
      amountFcfa: gift.price,
      imageUrl: gift.imageUrl,
      badge: '🎁 Cadeau Mystère Géolocalisé',
      meta: {
        merchantName: gift.merchantName,
        deliveryEta: gift.deliveryEta,
        geofenceCity: giftGeofenceCity,
        isLocked: true
      }
    });
    setActiveSubView(null);
    onClose();
  };

  const handleConfirmCagnotte = (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    const gift = NANASORE_GIFT_CATALOG.find((g) => g.id === selectedCagnotteGiftId) || NANASORE_GIFT_CATALOG[0];
    onSelectAction({
      type: 'cagnotte',
      title: cagnotteTitle,
      subtitle: `Cadeau visé : ${gift.name} (${gift.price.toLocaleString('fr-FR')} FCFA)`,
      amountFcfa: gift.price,
      imageUrl: gift.imageUrl,
      badge: '💰 Cagnotte Phygitale Nanasore',
      meta: {
        giftName: gift.name,
        merchantName: gift.merchantName,
        eventDate: cagnotteEventDate,
        collectedFcfa: 0
      }
    });
    setActiveSubView(null);
    onClose();
  };

  const handleConfirmNanaProduct = (product: typeof SAMPLE_NANASORE_INVENTORY[0]) => {
    playValidationBeep();
    onSelectAction({
      type: 'nana_product',
      title: product.name,
      subtitle: `${product.priceFcfa.toLocaleString('fr-FR')} FCFA • En stock chez ${product.merchantName}`,
      amountFcfa: product.priceFcfa,
      imageUrl: product.imageUrl,
      badge: '🛒 Produit Certifié Nanasore',
      meta: {
        sku: product.sku,
        category: product.category,
        stock: product.stock
      }
    });
    setActiveSubView(null);
    onClose();
  };

  const handleConfirmVip = () => {
    playValidationBeep();
    onSelectAction({
      type: 'vip',
      title: 'Pass Salon VIP & Masterclass',
      subtitle: 'Accès exclusif au Cercle Privé Affaires & Tontine de Luxe',
      amountFcfa: 15000,
      badge: '👑 Invitation Privée Salon VIP',
      meta: {
        period: 'Mensuel via Wameet'
      }
    });
    setActiveSubView(null);
    onClose();
  };

  const handleConfirmDelivery = () => {
    playValidationBeep();
    onSelectAction({
      type: 'delivery',
      title: 'Course Swarm Delivery Express',
      subtitle: 'Livraison moto géolocalisée (arrivée estimée 20-25 min)',
      amountFcfa: 1500,
      badge: '📍 Enchère Logistique Swarm',
      meta: {
        eta: '20 min',
        vehicle: 'Moto'
      }
    });
    setActiveSubView(null);
    onClose();
  };

  const handleConfirmVoiceFarotage = () => {
    playCashChime();
    onSelectAction({
      type: 'voice_farotage',
      title: 'Dédicace Vocale Sponsorisée',
      subtitle: 'Message audio HD avec pourboire de 2 000 FCFA attaché',
      amountFcfa: 2000,
      badge: '🎙️ Farotage Vocal Certifié',
      meta: {
        durationSec: 14
      }
    });
    setActiveSubView(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-200">
      {/* 1. Backdrop sombre flouté */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          playTapBeep();
          setActiveSubView(null);
          onClose();
        }}
        aria-label="Fermer le menu d'attachements"
      />

      {/* 2. Le Panneau qui glisse du bas (Bottom Sheet) */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] p-5 sm:p-6 max-w-lg mx-auto max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-250 flex flex-col justify-between"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poignée de glissement tactile (Drag Handle) */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mb-3.5 shrink-0" />

        {/* ===================================================================
            VUE 1 : LA GRILLE DES 8 MINI-APPS (grid grid-cols-4 gap-y-6 gap-x-2)
           =================================================================== */}
        {!activeSubView && (
          <div>
            {/* Header épuré */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Hub d'Attachements</span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#2563EB] px-2 py-0.5 rounded-full border border-blue-200">
                    Mini-Apps
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Partagez des outils financiers et produits certifiés dans le chat
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onClose();
                }}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shrink-0"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* La Grille exacte demandée : grid grid-cols-4 gap-y-6 gap-x-2 */}
            <div className="grid grid-cols-4 gap-y-6 gap-x-2 py-2">
              {miniAppsList.map((app) => {
                const Icon = app.icon;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      if (app.id === 'vip') handleConfirmVip();
                      else if (app.id === 'delivery') handleConfirmDelivery();
                      else if (app.id === 'voice_farotage') handleConfirmVoiceFarotage();
                      else setActiveSubView(app.id);
                    }}
                    className="flex flex-col items-center text-center group cursor-pointer active:scale-95 transition-transform"
                  >
                    {/* Cercle coloré w-12 h-12 rounded-full flex items-center justify-center text-white text-xl */}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl ${app.colorBg} transition-transform group-hover:scale-105 active:scale-90`}
                    >
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>

                    {/* Petit texte en dessous : text-[10px] text-center font-medium */}
                    <span className="text-[10px] text-center font-semibold text-slate-700 mt-2 leading-tight group-hover:text-slate-900 line-clamp-2">
                      {app.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Barre de rassurance Wameet en bas de la grille */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Paiements garantis par Wameet Escrow</span>
              </span>
              <span className="font-bold text-slate-800">
                Solde : {walletBalanceFcfa.toLocaleString('fr-FR')} F
              </span>
            </div>
          </div>
        )}

        {/* ===================================================================
            SOUS-VUE 1 : 💸 FAROTAGE WAMEET (Fond Or/Jaune)
           =================================================================== */}
        {activeSubView === 'farotage' && (
          <form onSubmit={handleConfirmFarotage} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveSubView(null);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour aux Mini-Apps</span>
              </button>
              <span className="text-xs font-black text-amber-600">💸 Farotage Express</span>
            </div>

            <div className="text-center py-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-white flex items-center justify-center mx-auto mb-2 shadow-md shadow-amber-500/30">
                <Banknote className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900">
                Faroter {chatRecipientName}
              </h4>
              <p className="text-xs text-slate-500">
                Le montant sera instantanément crédité sur son wallet Wameet
              </p>
            </div>

            {/* Presets de Montant */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Sélectionnez le montant du Farotage :
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1000, 2500, 5000, 10000, 25000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setFarotageAmount(amt);
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      farotageAmount === amt
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {amt.toLocaleString('fr-FR')} F
                  </button>
                ))}
              </div>
            </div>

            {/* Dédicace */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Dédicace d'accompagnement :
              </label>
              <input
                type="text"
                value={farotageNote}
                onChange={(e) => setFarotageNote(e.target.value)}
                placeholder="Ex: Merci pour ce superbe produit !"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Mode de débit */}
            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-900">
                Débité depuis votre Solde Wameet
              </span>
              <span className="font-black text-amber-700">
                {walletBalanceFcfa.toLocaleString('fr-FR')} FCFA dispo
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black shadow-lg shadow-amber-500/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Flame className="w-4 h-4 text-white" />
              <span>Envoyer {farotageAmount.toLocaleString('fr-FR')} FCFA maintenant</span>
            </button>
          </form>
        )}

        {/* ===================================================================
            SOUS-VUE 2 : 🎯 TONTINE FLASH (Fond Vert Émeraude)
           =================================================================== */}
        {activeSubView === 'tontine' && (
          <form onSubmit={handleConfirmTontine} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveSubView(null);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour</span>
              </button>
              <span className="text-xs font-black text-emerald-600">🎯 Tontine Flash</span>
            </div>

            <div className="text-center py-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center mx-auto mb-2 shadow-md shadow-emerald-500/30">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900">
                Lancer un Achat Groupé Flash
              </h4>
              <p className="text-xs text-slate-500">
                Rassemblez des acheteurs dans le chat pour faire chuter le prix unitaire
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Article de la Tontine Flash :
              </label>
              <input
                type="text"
                required
                value={tontineProduct}
                onChange={(e) => setTontineProduct(e.target.value)}
                placeholder="Ex: Coffret Karité Bio..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Objectif acheteurs :
                </label>
                <select
                  value={tontineTargetOrders}
                  onChange={(e) => setTontineTargetOrders(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                >
                  <option value={5}>5 commandes (-15%)</option>
                  <option value={10}>10 commandes (-25%)</option>
                  <option value={20}>20 commandes (-35%)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Prix public unitaire :
                </label>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={tontinePrice}
                  onChange={(e) => setTontinePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
              <span className="font-semibold">Prix réduit une fois l'objectif atteint :</span>
              <span className="font-black text-emerald-700 text-sm">
                {Math.round(tontinePrice * (1 - tontineDiscount / 100)).toLocaleString('fr-FR')} FCFA
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black shadow-lg shadow-emerald-500/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4 text-white" />
              <span>Publier la Tontine Flash dans la discussion</span>
            </button>
          </form>
        )}

        {/* ===================================================================
            SOUS-VUE 3 : 🎁 CADEAU MYSTÈRE (Fond Rose/Violet)
           =================================================================== */}
        {activeSubView === 'gift' && (
          <form onSubmit={handleConfirmGift} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveSubView(null);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour</span>
              </button>
              <span className="text-xs font-black text-purple-600">🎁 Cadeau Mystère</span>
            </div>

            <div className="text-center py-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-purple-600 text-white flex items-center justify-center mx-auto mb-2 shadow-md shadow-pink-500/30">
                <Gift className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900">
                Offrir un Cadeau Géolocalisé
              </h4>
              <p className="text-xs text-slate-500">
                Le destinataire découvre le cadeau uniquement lorsqu'il est sur place
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Choisissez le cadeau chez un commerçant Nanasore :
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {SAMPLE_GIFT_PRODUCTS.map((prod, idx) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setSelectedGiftIndex(idx);
                    }}
                    className={`w-full p-2.5 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer ${
                      selectedGiftIndex === idx
                        ? 'bg-purple-50 border-purple-300 text-purple-950 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <img
                      src={prod.imageUrl}
                      alt={prod.title}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{prod.title}</div>
                      <div className="text-[10px] text-slate-500">{prod.merchantName}</div>
                      <div className="text-xs font-black text-purple-700 mt-0.5">
                        {prod.price.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                    {selectedGiftIndex === idx && (
                      <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Lieu de déblocage par géolocalisation GPS :
              </label>
              <input
                type="text"
                value={giftGeofenceCity}
                onChange={(e) => setGiftGeofenceCity(e.target.value)}
                placeholder="Ex: Ouaga 2000, Bobo Dioulasso..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:border-purple-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white text-xs font-black shadow-lg shadow-purple-500/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Gift className="w-4 h-4 text-white" />
              <span>Envoyer le Cadeau Mystère Verrouillé</span>
            </button>
          </form>
        )}

        {/* ===================================================================
            SOUS-VUE 4 : 💰 CAGNOTTE PHYGITALE (Fond Bleu)
           =================================================================== */}
        {activeSubView === 'cagnotte' && (
          <form onSubmit={handleConfirmCagnotte} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveSubView(null);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour</span>
              </button>
              <span className="text-xs font-black text-[#2563EB]">💰 Cagnotte Phygitale</span>
            </div>

            <div className="text-center py-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center mx-auto mb-2 shadow-md shadow-blue-500/30">
                <PieChart className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900">
                Créer une Cagnotte pour {chatRecipientName}
              </h4>
              <p className="text-xs text-slate-500">
                Tous les participants cotisent pour commander le cadeau chez un marchand Nanasore
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Titre de la Cagnotte :
              </label>
              <input
                type="text"
                required
                value={cagnotteTitle}
                onChange={(e) => setCagnotteTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Cadeau cible (Nanasore) :
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {NANASORE_GIFT_CATALOG.slice(0, 4).map((gift) => (
                  <button
                    key={gift.id}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setSelectedCagnotteGiftId(gift.id);
                    }}
                    className={`w-full p-2.5 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer ${
                      selectedCagnotteGiftId === gift.id
                        ? 'bg-blue-50 border-blue-300 text-blue-950 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <img
                      src={gift.imageUrl}
                      alt={gift.name}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{gift.name}</div>
                      <div className="text-[10px] text-slate-500">{gift.merchantName}</div>
                      <div className="text-xs font-black text-[#2563EB] mt-0.5">
                        {gift.price.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                    {selectedCagnotteGiftId === gift.id && (
                      <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Date & Heure de la remise du cadeau :
              </label>
              <input
                type="text"
                value={cagnotteEventDate}
                onChange={(e) => setCagnotteEventDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-600/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <PieChart className="w-4 h-4 text-white" />
              <span>Créer & Épingler la Cagnotte</span>
            </button>
          </form>
        )}

        {/* ===================================================================
            SOUS-VUE 5 : 🛒 PRODUIT NANASORE (Fond Bleu Marine)
           =================================================================== */}
        {activeSubView === 'nana_product' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveSubView(null);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour</span>
              </button>
              <span className="text-xs font-black text-slate-900">🛒 Catalogue Nanasore</span>
            </div>

            <div className="text-center py-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-center mx-auto mb-2 shadow-md shadow-slate-900/40">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900">
                Partager un Article de votre Inventaire
              </h4>
              <p className="text-xs text-slate-500">
                Vos correspondants pourront commander l'article directement avec le paiement Wameet
              </p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {SAMPLE_NANASORE_INVENTORY.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleConfirmNanaProduct(item)}
                  className="p-3 rounded-2xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 flex items-center justify-between gap-3 transition cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-13 h-13 rounded-xl object-cover shrink-0 border border-slate-200"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 group-hover:text-[#2563EB] transition-colors truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.category} • <span className="text-emerald-700 font-bold">{item.stock} en stock</span>
                      </div>
                      <div className="text-xs font-black text-slate-900 mt-0.5">
                        {item.priceFcfa.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold group-hover:bg-[#2563EB] transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Partager</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniAppsGridModal;
