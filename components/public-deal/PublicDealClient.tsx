'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Clock,
  Star,
  Plus,
  Minus,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Flame,
  Store,
  ChevronDown,
  Trash2
} from 'lucide-react'
import MiniMarketDrawer, { Product, CartItem } from './MiniMarketDrawer'
import CheckoutModal from './CheckoutModal'
import { supabase } from '../../lib/supabase'

export interface DealData {
  id: string
  title: string
  description?: string
  headline?: string
  subheadline?: string
  price: number
  originalPrice?: number
  discountBadge?: string
  imageUrl?: string
  tenantId: string
  tenantName?: string
  brandColor?: string
  merchantWhatsapp?: string
  stock?: number
}

interface PublicDealClientProps {
  deal: DealData
  slug: string
}

export default function PublicDealClient({ deal, slug }: PublicDealClientProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)

  // État du panier auto-composé (Mini-Market)
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  // Quantité sélectionnée pour l'offre deal principale
  const [dealQuantity, setDealQuantity] = useState(1)

  // Modale de Checkout (Mobile Money / Token caisse)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)

  // Compte à rebours FOMO Scarcity
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 47, seconds: 15 })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        return { hours: 0, minutes: 0, seconds: 0 }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Restauration du panier sauvegardé localement
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('nana_checkout_cart')
      const savedSlug = localStorage.getItem('nana_checkout_deal_slug')
      if (savedCart && savedSlug === slug) {
        setCartItems(JSON.parse(savedCart))
      }
    } catch (e) {
      console.warn('Erreur lecture panier local:', e)
    }
  }, [slug])

  // Chargement des produits réels depuis Supabase filtrés par tenant_id
  const fetchTenantProducts = useCallback(async () => {
    setIsLoadingProducts(true)
    setProductsError(null)

    try {
      const tenantId = deal.tenantId

      let query = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(40)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query

      if (error) {
        console.error('[MiniMarket] Erreur Supabase products:', error.message)
        throw new Error(error.message)
      }

      if (data && data.length > 0) {
        const mappedProducts: Product[] = data.map((p: any) => ({
          id: String(p.id),
          name: p.title || p.name || 'Produit sans titre',
          price: Number(p.price) || 0,
          category: p.category || 'Général',
          image: p.thumbnail_url || p.image_url || p.image || '/placeholder-product.png',
          stock: typeof p.stock === 'number' ? p.stock : 50,
        }))
        setProducts(mappedProducts)
      } else {
        // Fallback échantillons si le tenant n'a pas encore configuré de catalogue
        const fallbackSampleProducts: Product[] = [
          {
            id: 'sample-1',
            name: 'Batterie Externe PowerBank 10000mAh',
            price: 7500,
            category: 'Accessoires High-Tech',
            image: 'https://images.unsplash.com/photo-1609592424364-5858066fba94?w=400&q=80',
            stock: 25,
          },
          {
            id: 'sample-2',
            name: 'Câble Charge Rapide 3-en-1 Tressé',
            price: 2500,
            category: 'Accessoires High-Tech',
            image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&q=80',
            stock: 40,
          },
          {
            id: 'sample-3',
            name: 'Lingettes Microfibres Premium (Pack de 3)',
            price: 1500,
            category: 'Entretien',
            image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80',
            stock: 60,
          },
          {
            id: 'sample-4',
            name: 'Support Téléphone Magnétique pour Voiture',
            price: 4000,
            category: 'Automobile',
            image: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400&q=80',
            stock: 18,
          },
          {
            id: 'sample-5',
            name: 'Étui de Protection antichoc renforcé',
            price: 3500,
            category: 'Protection',
            image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&q=80',
            stock: 30,
          },
        ]
        setProducts(fallbackSampleProducts)
      }
    } catch (err: any) {
      console.warn('[MiniMarket] Utilisation du fallback catalogue:', err?.message)
      setProductsError('Impossible de charger certains articles du catalogue. Mode hors-ligne actif.')
      // Présentation d'articles par défaut pour préserver l'expérience utilisateur
      setProducts([
        {
          id: 'fb-1',
          name: 'Pack Écouteurs Intra-auriculaires',
          price: 5000,
          category: 'Audio',
          image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80',
          stock: 15,
        },
        {
          id: 'fb-2',
          name: 'Chargeur Rapide 25W Type-C',
          price: 4500,
          category: 'Accessoires High-Tech',
          image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&q=80',
          stock: 35,
        },
      ])
    } finally {
      setIsLoadingProducts(false)
    }
  }, [deal.tenantId])

  useEffect(() => {
    fetchTenantProducts()
  }, [fetchTenantProducts])

  // Nombre total d'articles auto-composés
  const totalComposedCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0)
  }, [cartItems])

  // Montant total auto-composé
  const totalComposedAmount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0)
  }, [cartItems])

  // Montant global Deal + Mini-market
  const grandTotal = useMemo(() => {
    return deal.price * dealQuantity + totalComposedAmount
  }, [deal.price, dealQuantity, totalComposedAmount])

  // Action lors de la validation du tiroir
  const handleDrawerCheckout = (selectedCart: CartItem[]) => {
    setCartItems(selectedCart)
    setIsDrawerOpen(false)

    // Injection dans le stockage global du checkout
    try {
      localStorage.setItem('nana_checkout_cart', JSON.stringify(selectedCart))
      localStorage.setItem('nana_checkout_deal_slug', slug)
      window.dispatchEvent(
        new CustomEvent('nana_cart_updated', {
          detail: { cart: selectedCart, dealQuantity, grandTotal },
        })
      )
    } catch (err) {
      console.warn('LocalStorage error:', err)
    }

    // Ouverture fluide du tunnel de paiement
    setIsCheckoutModalOpen(true)
  }

  const removeCartItem = (itemId: string) => {
    setCartItems((prev) => {
      const updated = prev.filter((item) => item.id !== itemId)
      try {
        localStorage.setItem('nana_checkout_cart', JSON.stringify(updated))
      } catch (e) {}
      return updated
    })
  }

  const brandColor = deal.brandColor || '#10b981'

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans select-none relative">
      
      {/* 1. Bandeau FOMO / Scarcity Countdown */}
      <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-emerald-600 px-4 py-2 text-center text-xs font-black tracking-wide text-white shadow-md flex items-center justify-center gap-3">
        <div className="flex items-center gap-1.5 animate-pulse">
          <Flame className="w-4 h-4 fill-white" />
          <span>OFFRE SPÉCIALE LIMITÉE :</span>
        </div>
        <div className="flex items-center gap-1 font-mono bg-black/30 px-2 py-0.5 rounded-md">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m :{' '}
            {String(timeLeft.seconds).padStart(2, '0')}s
          </span>
        </div>
        <span className="hidden sm:inline">• Stock restant : plus que {deal.stock || 8} pièces</span>
      </div>

      {/* 2. Header de la Public Deal Page */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-md"
            style={{ backgroundColor: brandColor }}
          >
            {deal.tenantName ? deal.tenantName.charAt(0).toUpperCase() : 'N'}
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-white leading-tight">
              {deal.tenantName || 'Boutique Partenaire Nanasore'}
            </h1>
            <p className="text-[11px] text-slate-400">Tunnel de Vente Physique Caisse Express</p>
          </div>
        </div>

        {/* Bouton Panier / Mini-Market dans la barre de navigation */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Mini-Market</span>
          {totalComposedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-black font-mono">
              {totalComposedCount}
            </span>
          )}
        </button>
      </header>

      {/* 3. Conteneur Central du Funnel Physical Builder */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-8 pb-32">
        
        {/* Alerte Erreur Supabase éventuelle avec bouton Retry */}
        {productsError && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{productsError}</span>
            </div>
            <button
              onClick={() => fetchTenantProducts()}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Réessayer</span>
            </button>
          </div>
        )}

        {/* SECTION HERO DEAL DU PRODUIT */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              style={{ backgroundColor: `${brandColor}20`, borderColor: `${brandColor}40`, color: brandColor }}
              className="px-3 py-1 rounded-full text-xs font-black border"
            >
              OFFRE DEAL DU JOUR
            </span>
            {deal.discountBadge && (
              <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
                {deal.discountBadge}
              </span>
            )}
            <div className="flex items-center gap-1 text-amber-400 text-xs ml-auto">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <span className="font-bold text-white ml-1">4.9/5</span>
              <span className="text-slate-400">(142 avis)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Image Produit avec Effet Zoom */}
            <div className="relative rounded-2xl overflow-hidden aspect-square bg-slate-950 border border-slate-800 flex items-center justify-center group shadow-inner">
              <img
                src={deal.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'}
                alt={deal.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl text-[11px] font-bold text-slate-200 border border-white/10">
                Qualité Garantie 100%
              </div>
            </div>

            {/* Fiche Technique & Prix */}
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {deal.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {deal.description ||
                  'Profitez immédiatement de notre tarif préférentiel exclusif. Compatible avec notre système de caisse physique et de livraison express.'}
              </p>

              {/* Bloc Prix */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex items-baseline gap-3">
                  <span style={{ color: brandColor }} className="text-3xl sm:text-4xl font-black font-mono">
                    {(deal.price * dealQuantity).toLocaleString()} FCFA
                  </span>
                  {deal.originalPrice && (
                    <span className="text-base text-slate-500 line-through font-mono">
                      {(deal.originalPrice * dealQuantity).toLocaleString()} FCFA
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Économie immédiate réalisée sur cette commande</span>
                </p>
              </div>

              {/* Sélecteur de Quantité du Deal */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-300">Quantité :</span>
                <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-1">
                  <button
                    onClick={() => setDealQuantity((q) => Math.max(1, q - 1))}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono font-bold text-sm text-white px-2">
                    {dealQuantity}
                  </span>
                  <button
                    onClick={() => setDealQuantity((q) => q + 1)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bouton d'Action Rapide Caisse */}
              <button
                onClick={() => setIsCheckoutModalOpen(true)}
                style={{
                  backgroundColor: brandColor,
                  boxShadow: `0 10px 30px -5px ${brandColor}50`,
                }}
                className="w-full py-4 px-6 text-white font-extrabold text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2.5 transition hover:brightness-110 active:scale-98 cursor-pointer"
              >
                <span>Commander l'Offre ({grandTotal.toLocaleString()} FCFA)</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* 4. ENCADRÉ D'AUTO-COMPOSITION (ARTICLES DU MINI-MARKET AJOUTÉS) */}
        {cartItems.length > 0 ? (
          <section className="p-6 rounded-3xl bg-emerald-950/30 border border-emerald-500/40 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Pack Auto-composé avec le Mini-Market ({cartItems.length} article{cartItems.length > 1 ? 's' : ''})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ces suppléments seront livrés et facturés simultanément avec votre deal.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
              >
                + Ajouter d'autres articles
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.image || '/placeholder-product.png'}
                      alt={item.name}
                      className="w-10 h-10 rounded-xl object-cover bg-slate-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.name}</p>
                      <p className="text-[11px] text-emerald-400 font-mono">
                        {item.price.toLocaleString()} FCFA x {item.quantity}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeCartItem(item.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition cursor-pointer"
                    title="Retirer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-300">Total suppléments Mini-Market :</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                +{totalComposedAmount.toLocaleString()} FCFA
              </span>
            </div>
          </section>
        ) : (
          /* Bannière Incitative Mini-Market si rien n'a été ajouté */
          <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  Personnalisez votre commande avec le Mini-Market
                </p>
                <p className="text-[11px] text-slate-400">
                  Ajoutez des accessoires, câbles ou articles complémentaires sans frais de livraison supplémentaires.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ouvrir le Mini-Market</span>
            </button>
          </div>
        )}

        {/* 5. BLOC RÉASSURANCE & BADGES DE CONFIANCE */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Livraison Express</p>
              <p className="text-[11px] text-slate-400">Expédié sous 4h à 24h chrono</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Paiement Mobile Money</p>
              <p className="text-[11px] text-slate-400">Wave, Orange Money, MTN & Moov</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Retrait en Caisse</p>
              <p className="text-[11px] text-slate-400">Token direct pour boutique physique</p>
            </div>
          </div>
        </section>

        {/* 6. FAQ RAPIDE */}
        <section className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>Foire aux questions (FAQ)</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
              <p className="font-bold text-slate-200">Comment fonctionne l'auto-composition Mini-Market ?</p>
              <p className="text-slate-400">
                Vous pouvez ajouter des articles secondaires en un clic depuis le tiroir latéral. Ils sont regroupés avec l'offre deal dans une facture unique.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
              <p className="font-bold text-slate-200">Puis-je payer en espèces au retrait ?</p>
              <p className="text-slate-400">
                Oui, choisissez l'option "Token Caisse" lors de la validation. Un code unique vous sera délivré pour paiement au comptoir du magasin.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* 7. BOUTON LATÉRAL FLOTTANT ÉLÉGANT ("Explorer le Mini-Market") SUR LE CÔTÉ DROIT */}
      <aside aria-label="Accès rapide Mini-Market">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="fixed right-3 bottom-6 sm:bottom-10 sm:right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-[0_12px_30px_-5px_rgba(16,185,129,0.55)] border border-emerald-400/40 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer"
          title="Explorer le Mini-Market"
        >
          <div className="relative flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white group-hover:rotate-6 transition-transform" />
            {totalComposedCount > 0 && (
              <span className="absolute -top-2.5 -right-2.5 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10.5px] font-black text-white shadow-md animate-pulse">
                {totalComposedCount}
              </span>
            )}
          </div>
          <span className="text-xs sm:text-sm tracking-wide hidden sm:inline">
            Explorer le Mini-Market
          </span>
          <span className="text-xs sm:text-sm tracking-wide sm:hidden">
            Mini-Market
          </span>
        </button>
      </aside>

      {/* 8. COMPOSANT TIROIR LATÉRAL MINI-MARKET (BRIQUE 1) */}
      <MiniMarketDrawer
        products={products}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCheckout={handleDrawerCheckout}
      />

      {/* 9. MODALE DE CHECKOUT (MOBILE MONEY & TOKEN CAISSE) */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        dealProduct={{
          id: deal.id,
          title: deal.title,
          price: deal.price,
          imageUrl: deal.imageUrl,
        }}
        dealQuantity={dealQuantity}
        cartItems={cartItems}
        tenantId={deal.tenantId}
        tenantName={deal.tenantName}
      />

    </div>
  )
}
