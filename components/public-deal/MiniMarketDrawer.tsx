'use client'

import React, { useState, useMemo } from 'react'
import { Search, ShoppingBag, Check, Plus, Minus, X, PackageCheck } from 'lucide-react'

export interface Product {
  id: string
  name: string
  price: number
  category: string
  image: string
  stock: number
}

export interface CartItem extends Product {
  quantity: number
}

export interface MiniMarketDrawerProps {
  products: Product[]
  isOpen: boolean
  onClose: () => void
  onCheckout: (cart: CartItem[]) => void
}

export default function MiniMarketDrawer({
  products,
  isOpen,
  onClose,
  onCheckout,
}: MiniMarketDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous')
  const [cart, setCart] = useState<Record<string, CartItem>>({})

  // Extrait la liste unique des catégories
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category || 'Général'))
    return ['Tous', ...Array.from(set)]
  }, [products])

  // Filtrage combiné (recherche + catégorie)
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      const matchesCategory =
        selectedCategory === 'Tous' || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchTerm, selectedCategory])

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
  const totalAmount = cartList.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const totalItemsCount = cartList.reduce((sum, item) => sum + item.quantity, 0)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 transition-all"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[85vh] transform transition-all duration-300 animate-in zoom-in-95 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* En-tête du Super Popup */}
        <div className="flex items-center justify-between border-b px-4 py-3.5 bg-gray-50/90 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-600">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-gray-900 leading-tight">
                Mini-Market Express
              </h2>
              <p className="text-[10.5px] text-gray-500">Auto-composition d'articles en direct</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition cursor-pointer"
            aria-label="Fermer le popup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

          {/* Barre de Recherche & Catégories */}
          <div className="p-4 border-b space-y-3 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un article (ex: Lait, Eau...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-200 pl-9 pr-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Badges filtres déroulants */}
            <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs rounded-full font-medium whitespace-nowrap transition ${
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
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Checkbox rapide */}
                      <button
                        onClick={() => toggleSelectProduct(product)}
                        className={`h-5 w-5 rounded flex items-center justify-center border transition ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-gray-300 bg-white hover:border-emerald-400'
                        }`}
                        title={isSelected ? 'Retirer du panier' : 'Ajouter au panier'}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </button>

                      {/* Image Miniature */}
                      <img
                        src={product.image || '/placeholder-product.png'}
                        alt={product.name}
                        className="h-10 w-10 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                      />

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

                    {/* Contrôle des Quantités si Sélectionné */}
                    {isSelected && (
                      <div className="flex items-center space-x-1 bg-white border border-emerald-200 rounded-lg p-0.5 ml-2">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="p-1 text-gray-600 hover:text-emerald-600"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-bold text-gray-800 px-1">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="p-1 text-gray-600 hover:text-emerald-600"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer de Validation et Résumé Panier */}
          <div className="border-t p-4 bg-white space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Total auto-composé :</span>
              <span className="text-base font-extrabold text-gray-900">
                {totalAmount.toLocaleString()} FCFA
              </span>
            </div>

            <button
              disabled={cartList.length === 0}
              onClick={() => onCheckout(cartList)}
              className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
            >
              <PackageCheck className="h-5 w-5" />
              <span>
                Valider ({totalItemsCount} article{totalItemsCount > 1 ? 's' : ''})
              </span>
            </button>
          </div>

        </div>
      </div>
  )
}
