'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  ShoppingBag,
  Check,
  Plus,
  Minus,
  X,
  PackageCheck,
  Share2,
  Sparkles,
  Tag,
  Copy,
  UserCheck,
  Hash,
  Users,
  RefreshCw,
  MessageCircle,
  Zap,
  ExternalLink,
  Video
} from 'lucide-react'

export interface Product {
  id: string
  name: string
  price: number
  category: string
  image: string
  stock: number
  lotCode?: string
}

export interface CartItem extends Product {
  quantity: number
}

export interface MiniMarketCheckoutMeta {
  affiliateRef?: string
  promoCode?: string
  discountPercent?: number
  discountedTotal?: number
  groupBuyId?: string
}

export interface MiniMarketDrawerProps {
  products: Product[]
  isOpen: boolean
  onClose: () => void
  onCheckout: (cart: CartItem[], meta?: MiniMarketCheckoutMeta) => void
  storeTitle?: string
}

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'v_server'
  try {
    const existing = localStorage.getItem('nana_visitor_id')
    if (existing) return existing
    const fresh = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem('nana_visitor_id', fresh)
    return fresh
  } catch {
    return `v_${Date.now().toString(36)}`
  }
}

function parseDiscountFromPromo(promoCode: string, explicitDiscount?: string | null): number {
  const exp = Number(explicitDiscount)
  if (Number.isFinite(exp) && exp > 0 && exp <= 80) return Math.round(exp)
  const match = promoCode.match(/(\d{1,2})\s*%?$/)
  if (match) {
    const n = parseInt(match[1], 10)
    if (n > 0 && n <= 80) return n
  }
  return promoCode ? 10 : 0
}

function detectSocialShopContext(): { label: string; isInAppBrowser: boolean } {
  if (typeof window === 'undefined') {
    return { label: 'Bio-Shop Mobile Money', isInAppBrowser: false }
  }
  const ua = navigator.userAgent || ''
  const params = new URLSearchParams(window.location.search)
  const src = (params.get('source') || params.get('shop') || '').toLowerCase()

  const isTikTok = /TikTok|BytedanceWebview|musical_ly/i.test(ua) || src.includes('tiktok')
  const isInsta = /Instagram/i.test(ua) || src.includes('insta')
  const isFb = /FBAN|FBAV/i.test(ua) || src.includes('facebook')
  const isCommentDm = src.includes('comment') || src.includes('dm')
  const isInAppBrowser = /TikTok|BytedanceWebview|musical_ly|Instagram|FBAN|FBAV|Snapchat/i.test(ua)

  if (isCommentDm) return { label: 'Accès Privé DM • Offre Vidéo', isInAppBrowser }
  if (isTikTok) return { label: 'TikTok Shop Express • Mobile Money', isInAppBrowser }
  if (isInsta) return { label: 'Instagram Shop Express • Mobile Money', isInAppBrowser }
  if (isFb) return { label: 'Facebook Shop Express • Mobile Money', isInAppBrowser }
  return { label: 'Bio-Shop Express • Mobile Money', isInAppBrowser }
}

export default function MiniMarketDrawer({
  products,
  isOpen,
  onClose,
  onCheckout,
  storeTitle,
}: MiniMarketDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous')
  const [cart, setCart] = useState<Record<string, CartItem>>({})

  // Paramètres Social Commerce (Bio-Shop TikTok/Insta + Comment-to-DM + Affilié + Promo + Groupe)
  const [socialCtx] = useState(() => detectSocialShopContext())
  const [featuredProductId, setFeaturedProductId] = useState<string | null>(null)
  const [affiliateRef, setAffiliateRef] = useState<string>('')
  const [promoCode, setPromoCode] = useState<string>('')
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [copiedShare, setCopiedShare] = useState(false)
  const [showAffiliateBox, setShowAffiliateBox] = useState(false)
  const [affiliateInput, setAffiliateInput] = useState('')
  const [copiedAffLink, setCopiedAffLink] = useState(false)
  const [affiliateEarnings, setAffiliateEarnings] = useState<{
    totalOrders: number
    availableCommission: number
  } | null>(null)
  const [hydratedFromUrl, setHydratedFromUrl] = useState(false)

  // Achat Groupé Viral (Modèle Pinduoduo : -20% en invitant 2 amis sur WhatsApp)
  const [groupBuy, setGroupBuy] = useState<{
    id: string
    joinedCount: number
    requiredTotal: number
    remaining: number
    discountPercent: number
    unlocked: boolean
  } | null>(null)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [isCheckingGroup, setIsCheckingGroup] = useState(false)

  // Attribution automatique des numéros de lot Live (#01, #02, #03...)
  const indexedProducts = useMemo(() => {
    return products.map((p, idx) => ({
      ...p,
      lotCode: p.lotCode || String(idx + 1).padStart(2, '0'),
    }))
  }, [products])

  // Hydratation automatique depuis l'URL (?ref=..., ?cart=id:qty, ?item=..., ?lot=02, ?promo=FLASH10, ?group=grp_...)
  useEffect(() => {
    if (typeof window === 'undefined' || indexedProducts.length === 0 || hydratedFromUrl) return
    const params = new URLSearchParams(window.location.search)

    const refParam = (params.get('ref') || params.get('aff') || params.get('creator') || '').trim()
    if (refParam) {
      setAffiliateRef(refParam)
      try {
        localStorage.setItem('nana_active_affiliate_ref', refParam)
      } catch {}
    }

    const promoParam = (params.get('promo') || params.get('coupon') || '').trim().toUpperCase()
    const discountParam = params.get('discount')
    if (promoParam || discountParam) {
      setPromoCode(promoParam || `VIP${discountParam}`)
      setDiscountPercent(parseDiscountFromPromo(promoParam, discountParam))
    }

    const initialCart: Record<string, CartItem> = {}
    const findProduct = (token: string) => {
      const clean = token.trim().replace(/^#/, '').toLowerCase()
      return indexedProducts.find(
        (p) =>
          p.id.toLowerCase() === clean ||
          p.lotCode.toLowerCase() === clean ||
          String(Number(p.lotCode)) === clean
      )
    }

    // 1. Panier pré-rempli (?cart=id1:2,id2:1 ou ?cart=01:2,02:1)
    const cartParam = params.get('cart')
    if (cartParam) {
      cartParam.split(',').forEach((entry) => {
        const [rawKey, rawQty] = entry.split(':')
        if (!rawKey) return
        const found = findProduct(rawKey)
        if (found) {
          const qty = Math.max(1, Math.min(99, parseInt(rawQty || '1', 10) || 1))
          initialCart[found.id] = { ...found, quantity: qty }
        }
      })
    }

    // 2. Article ou Lot unique (?item=... ou ?lot=02 — Comment-to-MiniMarket / Vidéo)
    const itemParam = params.get('item') || params.get('lot')
    if (itemParam) {
      const found = findProduct(itemParam)
      if (found) {
        setFeaturedProductId(found.id)
        if (!initialCart[found.id]) {
          initialCart[found.id] = { ...found, quantity: 1 }
        }
      }
    }

    if (Object.keys(initialCart).length > 0) {
      setCart(initialCart)
    }

    // 3. Rejoindre automatiquement un Achat Groupé Viral (?group=grp_...)
    const groupParam = (params.get('group') || '').trim()
    if (groupParam) {
      const visitorId = getOrCreateVisitorId()
      fetch(`/api/minimarket/group-buy/${encodeURIComponent(groupParam)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId })
      })
        .then((r) => r.json())
        .then((json) => {
          if (json?.success && json.group) {
            setGroupBuy(json.group)
            if (json.group.unlocked) {
              setPromoCode(`GROUPE${json.group.discountPercent}`)
              setDiscountPercent(json.group.discountPercent)
            }
          }
        })
        .catch(() => {})
    }

    setHydratedFromUrl(true)
  }, [indexedProducts, hydratedFromUrl])

  // Extrait la liste unique des catégories
  const categories = useMemo(() => {
    const set = new Set(indexedProducts.map((p) => p.category || 'Général'))
    return ['Tous', ...Array.from(set)]
  }, [indexedProducts])

  // Filtrage combiné (Nom OU Numéro de Lot Live #01 / 01 + catégorie)
  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    const cleanLotQuery = q.replace(/^#/, '')
    return indexedProducts.filter((product) => {
      const matchesName = product.name.toLowerCase().includes(q)
      const matchesLot =
        cleanLotQuery.length > 0 &&
        (product.lotCode.toLowerCase() === cleanLotQuery ||
          product.lotCode.toLowerCase().includes(cleanLotQuery) ||
          String(Number(product.lotCode)) === cleanLotQuery)
      const matchesSearch = !q || matchesName || matchesLot
      const matchesCategory =
        selectedCategory === 'Tous' || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [indexedProducts, searchTerm, selectedCategory])

  // Gestion des ajouts/retraits au panier
  const toggleSelectProduct = (product: Product) => {
    setCart((prev) => {
      const next = { ...prev }
      if (next[product.id]) {
        delete next[product.id]
      } else {
        next[product.id] = { ...product, quantity: 1 }
      }
      return next
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const item = prev[productId]
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty <= 0) {
        const next = { ...prev }
        delete next[productId]
        return next
      }
      return { ...prev, [productId]: { ...item, quantity: newQty } }
    })
  }

  const cartList = Object.values(cart)
  const rawTotalAmount = cartList.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const discountAmount =
    discountPercent > 0 ? Math.round((rawTotalAmount * discountPercent) / 100) : 0
  const totalAmount = Math.max(0, rawTotalAmount - discountAmount)
  const totalItemsCount = cartList.reduce((sum, item) => sum + item.quantity, 0)

  // Génère un lien partageable avec le panier pré-rempli (+ affilié + promo)
  const buildShareableCartUrl = (overrideRef?: string) => {
    if (typeof window === 'undefined') return ''
    const url = new URL(window.location.href)
    url.searchParams.set('drawer', 'true')
    url.searchParams.set('minimarket', 'true')
    if (cartList.length > 0) {
      const encoded = cartList
        .map((c) => `${c.lotCode || c.id}:${c.quantity}`)
        .join(',')
      url.searchParams.set('cart', encoded)
    } else {
      url.searchParams.delete('cart')
    }
    const effectiveRef = (overrideRef ?? affiliateRef).trim()
    if (effectiveRef) {
      url.searchParams.set('ref', effectiveRef)
    }
    if (promoCode) {
      url.searchParams.set('promo', promoCode)
    }
    return url.toString()
  }

  const handleCopyShareableCart = () => {
    const shareUrl = buildShareableCartUrl()
    if (!shareUrl) return
    navigator.clipboard?.writeText(shareUrl).catch(() => {})
    setCopiedShare(true)
    setTimeout(() => setCopiedShare(false), 2200)
  }

  const handleCopyAffiliateLink = () => {
    const cleanRef = affiliateInput.trim().replace(/^@/, '').replace(/\s+/g, '_')
    if (!cleanRef) return
    const affUrl = buildShareableCartUrl(cleanRef)
    navigator.clipboard?.writeText(affUrl).catch(() => {})
    setAffiliateRef(cleanRef)
    try {
      localStorage.setItem('nana_active_affiliate_ref', cleanRef)
    } catch {}
    setCopiedAffLink(true)
    setTimeout(() => setCopiedAffLink(false), 2200)
  }

  // --- POINT 7 : ACHAT GROUPÉ VIRAL (-20% en invitant 2 amis sur WhatsApp) ---
  const buildGroupShareUrl = (groupId: string) => {
    if (typeof window === 'undefined') return ''
    const url = new URL(window.location.href)
    url.searchParams.set('drawer', 'true')
    url.searchParams.set('minimarket', 'true')
    url.searchParams.set('group', groupId)
    if (cartList.length > 0) {
      const encoded = cartList
        .map((c) => `${c.lotCode || c.id}:${c.quantity}`)
        .join(',')
      url.searchParams.set('cart', encoded)
    }
    if (affiliateRef) {
      url.searchParams.set('ref', affiliateRef)
    }
    return url.toString()
  }

  const handleStartGroupBuy = async () => {
    if (cartList.length === 0 || isCreatingGroup) return
    setIsCreatingGroup(true)
    try {
      const visitorId = getOrCreateVisitorId()
      const res = await fetch('/api/minimarket/group-buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorVisitorId: visitorId,
          slug: typeof window !== 'undefined' ? window.location.pathname : '',
          storeTitle: storeTitle || 'Mini-Market',
          discountPercent: 20,
          requiredFriends: 2,
          cartSummary: cartList.map((c) => ({
            id: c.id,
            name: c.name,
            qty: c.quantity,
            price: c.price,
          })),
        }),
      })
      const json = await res.json()
      if (json?.success && json.group) {
        setGroupBuy(json.group)
        if (typeof window !== 'undefined') {
          const shareUrl = buildGroupShareUrl(json.group.id)
          window.history.replaceState({}, '', shareUrl)
        }
      }
    } catch {
      // ignore network error
    } finally {
      setIsCreatingGroup(false)
    }
  }

  const handleRefreshGroupBuy = async () => {
    if (!groupBuy?.id || isCheckingGroup) return
    setIsCheckingGroup(true)
    try {
      const res = await fetch(
        `/api/minimarket/group-buy/${encodeURIComponent(groupBuy.id)}`
      )
      const json = await res.json()
      if (json?.success && json.group) {
        setGroupBuy(json.group)
        if (json.group.unlocked) {
          setPromoCode(`GROUPE${json.group.discountPercent}`)
          setDiscountPercent(json.group.discountPercent)
        }
      }
    } catch {
      // ignore
    } finally {
      setIsCheckingGroup(false)
    }
  }

  // Point 1 : Achat Express 2-Taps (TikTok/Instagram Shop → Paiement Mobile Money direct)
  const featuredProduct = useMemo(
    () => (featuredProductId ? indexedProducts.find((p) => p.id === featuredProductId) || null : null),
    [featuredProductId, indexedProducts]
  )

  const handleQuickBuyProduct = (product: Product) => {
    const qty = cart[product.id]?.quantity || 1
    const raw = product.price * qty
    const disc = discountPercent > 0 ? Math.round((raw * discountPercent) / 100) : 0
    onCheckout([{ ...product, quantity: qty }], {
      affiliateRef: affiliateRef || undefined,
      promoCode: promoCode || undefined,
      discountPercent: discountPercent || undefined,
      discountedTotal: Math.max(0, raw - disc),
      groupBuyId: groupBuy?.id,
    })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 transition-all"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[86vh] transform transition-all duration-300 animate-in zoom-in-95 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Point 1 : Barre TikTok / Instagram Shop Express • Compatible Wave, Orange Money, MTN, Moov */}
        <div className="bg-slate-950 px-3.5 py-2 text-white flex items-center justify-between gap-2 text-[10.5px] font-bold shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{socialCtx.label}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[9px] font-black">Wave</span>
            <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[9px] font-black">OM</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black">MTN</span>
            {socialCtx.isInAppBrowser && typeof window !== 'undefined' && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white text-[9px] font-extrabold flex items-center gap-0.5"
                title="Ouvrir dans Chrome/Safari pour les paiements app-to-app"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                <span>Chrome</span>
              </a>
            )}
          </div>
        </div>

        {/* Bannière Co-Brandée Influenceur / Affilié (?ref=...) */}
        {affiliateRef && (
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 px-4 py-2 text-white flex items-center justify-between gap-2 text-[11px] font-bold shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">
                Sélection recommandée par <strong>@{affiliateRef}</strong>
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[9.5px] font-black uppercase tracking-wider shrink-0">
              Partenaire
            </span>
          </div>
        )}

        {/* En-tête du Super Popup */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-gray-50/90 shrink-0 gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-gray-900 leading-tight truncate">
                {storeTitle ? `Mini-Market • ${storeTitle}` : 'Mini-Market Express'}
              </h2>
              <p className="text-[10.5px] text-gray-500">
                Tapez un n° de lot Live (#01, #02…) ou cochez vos articles
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowAffiliateBox((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 border transition cursor-pointer ${
                showAffiliateBox
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
              }`}
              title="Créer votre lien Mini-Market Affilié / Influenceur"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Affilié</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition cursor-pointer"
              aria-label="Fermer le popup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Panneau rapide : Créer son lien Affilié / Influenceur Co-Brandé */}
        {showAffiliateBox && (
          <div className="px-4 py-3 bg-indigo-50/80 border-b border-indigo-100 space-y-2 shrink-0">
            <p className="text-[11px] font-extrabold text-indigo-900">
              Générez votre lien Mini-Market co-brandé (TikTok / Insta / WhatsApp) :
            </p>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Votre pseudo (ex: amina_shop)"
                value={affiliateInput}
                onChange={(e) => setAffiliateInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-semibold text-gray-900 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleCopyAffiliateLink}
                disabled={!affiliateInput.trim()}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {copiedAffLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAffLink ? 'Copié !' : 'Copier lien'}</span>
              </button>
            </div>
            {(affiliateInput.trim() || affiliateRef) && (
              <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-indigo-900">
                <span>
                  {affiliateEarnings ? (
                    <>
                      Gains crédités <strong>@{affiliateInput.trim() || affiliateRef}</strong> :{' '}
                      <strong className="text-emerald-700">
                        {affiliateEarnings.availableCommission.toLocaleString()} FCFA
                      </strong>{' '}
                      ({affiliateEarnings.totalOrders} vente{affiliateEarnings.totalOrders > 1 ? 's' : ''})
                    </>
                  ) : (
                    <span>Commission auto 10% créditée sur chaque vente payée</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const h = (affiliateInput.trim() || affiliateRef).replace(/^@/, '')
                    if (!h) return
                    fetch(`/api/affiliate/earnings/${encodeURIComponent(h)}`)
                      .then((r) => r.json())
                      .then((j) => {
                        if (j?.success) {
                          setAffiliateEarnings({
                            totalOrders: Number(j.totalOrders) || 0,
                            availableCommission: Number(j.availableCommission) || 0,
                          })
                        }
                      })
                      .catch(() => {})
                  }}
                  className="px-2 py-0.5 rounded-lg bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-[10.5px] cursor-pointer shrink-0"
                >
                  Voir mes gains
                </button>
              </div>
            )}
          </div>
        )}

        {/* Barre de Recherche (Nom + N° Lot Live) & Catégories */}
        <div className="p-3.5 border-b space-y-2.5 bg-white shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un article ou un N° de Lot Live (ex: 01, #02)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2 text-xs sm:text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Accès rapide Lots Live (#01, #02, #03...) */}
          {indexedProducts.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <Hash className="w-2.5 h-2.5" />
                Live Lots
              </span>
              {indexedProducts.slice(0, 12).map((p) => {
                const isPicked = !!cart[p.id]
                return (
                  <button
                    key={`lot-${p.id}`}
                    type="button"
                    onClick={() => toggleSelectProduct(p)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-extrabold border transition shrink-0 cursor-pointer ${
                      isPicked
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-emerald-400'
                    }`}
                    title={`${p.name} — ${p.price.toLocaleString()} FCFA`}
                  >
                    #{p.lotCode}
                  </button>
                )
              })}
            </div>
          )}

          {/* Badges filtres catégories */}
          <div className="flex space-x-2 overflow-x-auto pb-0.5 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs rounded-full font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grille des Micro-Cartes Produits */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
          {/* Point 2 : Carte Vedette épinglée (Comment-to-MiniMarket ?item=... / Vu dans la vidéo) */}
          {featuredProduct && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-400/50 text-white shadow-lg space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                  <Video className="w-3 h-3" />
                  Vu dans la vidéo • Lot #{featuredProduct.lotCode}
                </span>
                <span className="text-[10px] text-emerald-300 font-bold">Prêt à payer</span>
              </div>
              <div className="flex items-center gap-3">
                <img
                  src={featuredProduct.image || '/placeholder-product.png'}
                  alt={featuredProduct.name}
                  className="h-14 w-14 rounded-xl object-cover border border-white/20 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                    {featuredProduct.name}
                  </p>
                  <p className="text-sm font-black text-emerald-400">
                    {featuredProduct.price.toLocaleString()} FCFA
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickBuyProduct(featuredProduct)}
                  className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md transition active:scale-95 cursor-pointer shrink-0"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Payer</span>
                </button>
              </div>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Aucun produit trouvé pour votre recherche.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isSelected = !!cart[product.id]
              const item = cart[product.id]

              return (
                <div
                  key={product.id}
                  onClick={() => toggleSelectProduct(product)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    {/* Checkbox rapide */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSelectProduct(product)
                      }}
                      className={`h-5 w-5 rounded flex items-center justify-center border transition shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-gray-300 bg-white hover:border-emerald-400'
                      }`}
                      title={isSelected ? 'Retirer du panier' : 'Ajouter au panier'}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>

                    {/* Image Miniature + Badge Lot Live */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={product.image || '/placeholder-product.png'}
                        alt={product.name}
                        className="h-11 w-11 rounded-lg object-cover bg-gray-100"
                      />
                      <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.2 rounded-md bg-slate-900 text-white font-mono text-[9.5px] font-black shadow">
                        #{product.lotCode}
                      </span>
                    </div>

                    {/* Infos Produit */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {product.name}
                      </p>
                      <div className="flex items-center space-x-2 text-[11px]">
                        <span className="font-bold text-emerald-700">
                          {product.price.toLocaleString()} FCFA
                        </span>
                        <span
                          className={`text-[10px] ${
                            product.stock > 0
                              ? 'text-gray-400'
                              : 'text-red-500 font-medium'
                          }`}
                        >
                          {product.stock > 0
                            ? `Stock: ${product.stock}`
                            : 'Rupture'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contrôle des Quantités si Sélectionné OU Achat 2-Taps Mobile Money */}
                  {isSelected ? (
                    <div
                      className="flex items-center space-x-1 bg-white border border-emerald-200 rounded-lg p-0.5 ml-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, -1)}
                        className="p-1 text-gray-600 hover:text-emerald-600 cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold text-gray-800 px-1">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, 1)}
                        className="p-1 text-gray-600 hover:text-emerald-600 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleQuickBuyProduct(product)
                      }}
                      className="ml-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 font-extrabold text-[11px] flex items-center gap-1 transition shrink-0 cursor-pointer"
                      title="Paiement Mobile Money direct en 1 tap"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Payer</span>
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer de Validation, Achat Groupé (-20%), Promo & Partage Panier Pré-Rempli */}
        <div className="border-t p-3.5 bg-white space-y-2.5 shrink-0">
          {/* Point 7 : Achat Groupé Viral (Modèle Pinduoduo -20% en invitant 2 amis WhatsApp) */}
          {cartList.length > 0 && (
            <div
              className={`rounded-2xl border p-2.5 transition ${
                groupBuy?.unlocked
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-gradient-to-r from-violet-50 via-fuchsia-50 to-amber-50 border-violet-200 text-violet-950'
              }`}
            >
              {!groupBuy ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-xl bg-violet-600 text-white shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black leading-tight">
                        Achat Groupé : -20% immédiat
                      </p>
                      <p className="text-[10px] text-violet-700 truncate">
                        Invitez 2 amis WhatsApp à ouvrir votre lien
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartGroupBuy}
                    disabled={isCreatingGroup}
                    className="px-2.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-extrabold shrink-0 transition cursor-pointer disabled:opacity-60"
                  >
                    {isCreatingGroup ? 'Création…' : 'Activer -20%'}
                  </button>
                </div>
              ) : groupBuy.unlocked ? (
                <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
                  <span className="flex items-center gap-1.5 text-emerald-800">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Groupe complet ({groupBuy.joinedCount}/{groupBuy.requiredTotal}) • -{groupBuy.discountPercent}% débloqué !
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                    ACTIF
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-violet-950">
                      <Users className="w-3.5 h-3.5 text-violet-600" />
                      <span>
                        Groupe : {groupBuy.joinedCount}/{groupBuy.requiredTotal} (plus que{' '}
                        {groupBuy.remaining} ami{groupBuy.remaining > 1 ? 's' : ''})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRefreshGroupBuy}
                      disabled={isCheckingGroup}
                      className="p-1 rounded-lg bg-white/80 hover:bg-white text-violet-700 border border-violet-200 transition cursor-pointer"
                      title="Actualiser le statut du groupe"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isCheckingGroup ? 'animate-spin' : ''}`}
                      />
                    </button>
                  </div>

                  {/* Barre de progression */}
                  <div className="w-full h-1.5 rounded-full bg-violet-200/80 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((groupBuy.joinedCount / groupBuy.requiredTotal) * 100)
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `🔥 Clique vite sur mon lien pour qu'on débloque -${groupBuy.discountPercent}% ensemble sur ${
                          storeTitle || 'le Mini-Market'
                        } ! Il manque ${groupBuy.remaining} ami(s) : ${buildGroupShareUrl(
                          groupBuy.id
                        )}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Inviter 2 amis sur WhatsApp</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard
                          ?.writeText(buildGroupShareUrl(groupBuy.id))
                          .catch(() => {})
                        setCopiedShare(true)
                        setTimeout(() => setCopiedShare(false), 2000)
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-violet-200 hover:bg-violet-100 text-violet-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Lien</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {discountPercent > 0 && (
            <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                Code {promoCode} (-{discountPercent}%)
              </span>
              <span>-{discountAmount.toLocaleString()} FCFA</span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 font-medium">Total auto-composé :</span>
            <div className="text-right">
              {discountAmount > 0 && (
                <span className="text-xs text-gray-400 line-through mr-2">
                  {rawTotalAmount.toLocaleString()} FCFA
                </span>
              )}
              <span className="text-base font-extrabold text-gray-900">
                {totalAmount.toLocaleString()} FCFA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cartList.length > 0 && (
              <button
                type="button"
                onClick={handleCopyShareableCart}
                className="px-3 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Copier un lien direct avec ce panier déjà pré-rempli (WhatsApp / Réseaux)"
              >
                {copiedShare ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Share2 className="w-4 h-4 text-gray-700" />
                )}
                <span className="hidden sm:inline">{copiedShare ? 'Lien copié !' : 'Partager panier'}</span>
              </button>
            )}

            <button
              disabled={cartList.length === 0}
              onClick={() =>
                onCheckout(cartList, {
                  affiliateRef: affiliateRef || undefined,
                  promoCode: promoCode || undefined,
                  discountPercent: discountPercent || undefined,
                  discountedTotal: totalAmount,
                  groupBuyId: groupBuy?.id,
                })
              }
              className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer text-xs sm:text-sm"
            >
              <PackageCheck className="h-5 w-5" />
              <span>
                Valider ({totalItemsCount} article{totalItemsCount > 1 ? 's' : ''})
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
