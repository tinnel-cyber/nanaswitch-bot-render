import React, { useState, useEffect } from "react";
import type { Product } from "../../app/types/supabase";

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalStock, setTotalStock] = useState<number>(0);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saleNotification, setSaleNotification] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form states for product creation
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newCategory, setNewCategory] = useState("Général");

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const json = await res.json();
      if (json.success) {
        setProducts(json.products || []);
        setTotalStock(json.totalStock || 0);
        setTotalValue(json.totalValue || 0);
        setError(null);
      } else {
        setError(json.error || "Erreur de chargement");
      }
    } catch (err: any) {
      setError(err?.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    // Abonnement Supabase Realtime pour synchronisation instantanée caisse & boutique
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    let channel: any = null;

    if (supabaseUrl && supabaseKey) {
      import("@supabase/supabase-js").then(({ createClient }) => {
        const client = createClient(supabaseUrl, supabaseKey);
        channel = client
          .channel("realtime-products-sync")
          .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
            fetchProducts();
          })
          .subscribe();
      }).catch(() => {});
    }

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "create",
          name: newName,
          price: parseFloat(newPrice),
          stock: parseInt(newStock, 10),
          category: newCategory,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setNewName("");
        setNewPrice("");
        setNewStock("");
        fetchProducts();
      } else {
        setError(json.error || "Erreur création produit");
      }
    } catch (err: any) {
      setError(err?.message || "Erreur réseau");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStock = async (id: string, newStockVal: number) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "update-stock",
          id,
          stock: newStockVal,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchProducts();
      } else {
        setError(json.error || "Erreur mise à jour stock");
      }
    } catch (err: any) {
      setError(err?.message || "Erreur réseau");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSale = async (productId: string, quantity: number = 1) => {
    setIsSubmitting(true);
    setError(null);
    setSaleNotification(null);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity,
          source: "pos",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaleNotification(`✓ Vente enregistrée avec succès : 1 unité déduite (Nouveau stock: ${data.transaction?.remaining_stock ?? "mis à jour"})`);
        setTimeout(() => setSaleNotification(null), 4000);
        fetchProducts();
      } else {
        setError(data.error || "Erreur lors du traitement de la vente");
      }
    } catch (err: any) {
      setError(err?.message || "Erreur réseau lors de la transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1329] text-[#f4f4f6] font-sans antialiased selection:bg-blue-600/30 selection:text-white">
      {/* Top Navbar Bleu Royal & Blanc Cassé */}
      <header className="border-b border-blue-900/40 bg-[#0b1329]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <a href="/" className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-600/30">
                N
              </div>
              <span className="font-semibold text-lg tracking-tight text-[#f4f4f6]">Nanasore</span>
            </a>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950 border border-blue-800/60 text-blue-300 font-medium">
              POS Engine & Supabase
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800/50 transition font-medium"
            >
              ← Tableau de Bord
            </a>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
            >
              <span>+</span> Nouveau Produit
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* En-tête de page */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#f4f4f6]">Catalogue & Stocks</h1>
            <p className="text-sm text-blue-300/70 mt-1">
              Gérez le catalogue d'articles et suivez la disponibilité en temps réel sur Supabase.
            </p>
          </div>
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-900/40 hover:bg-blue-900/70 text-blue-300 border border-blue-800/40 transition cursor-pointer self-start md:self-auto"
          >
            {loading ? "Actualisation..." : "Rafraîchir ↻"}
          </button>
        </div>

        {/* Cartes Métriques (Design Bleu Royal & Blanc Cassé) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl bg-[#101b3b]/60 border border-blue-900/40 backdrop-blur-sm shadow-sm">
            <span className="text-xs font-medium text-blue-300/70 uppercase tracking-wider">Articles Référencés</span>
            <p className="text-2xl font-bold text-[#f4f4f6] mt-2">{products.length}</p>
          </div>
          <div className="p-5 rounded-xl bg-[#101b3b]/60 border border-blue-900/40 backdrop-blur-sm shadow-sm">
            <span className="text-xs font-medium text-blue-300/70 uppercase tracking-wider">Unités en Stock</span>
            <p className="text-2xl font-bold text-blue-400 mt-2">{totalStock.toLocaleString("fr-FR")} units</p>
          </div>
          <div className="p-5 rounded-xl bg-[#101b3b]/60 border border-blue-900/40 backdrop-blur-sm shadow-sm">
            <span className="text-xs font-medium text-blue-300/70 uppercase tracking-wider">Valeur Totale Stock</span>
            <p className="text-2xl font-bold text-emerald-400 mt-2">{totalValue.toLocaleString("fr-FR")} FCFA</p>
          </div>
        </div>

        {/* Message de succès de vente */}
        {saleNotification && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-sm flex items-center justify-between">
            <span>{saleNotification}</span>
            <button onClick={() => setSaleNotification(null)} className="text-xs text-emerald-400 hover:underline">
              Fermer
            </button>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Tableau de produits */}
        <div className="border border-blue-900/40 rounded-xl bg-[#101b3b]/40 overflow-hidden backdrop-blur-sm shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#101b3b]/90 text-xs font-semibold uppercase text-blue-300/80 border-b border-blue-900/40">
              <tr>
                <th className="px-6 py-4">Article</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Prix Unitaire</th>
                <th className="px-6 py-4">Niveau de Stock</th>
                <th className="px-6 py-4 text-right">Ajustement Rapide</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/30">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-blue-300/50">
                    {loading ? "Chargement des produits depuis Supabase..." : "Aucun produit enregistré. Cliquez sur '+ Nouveau Produit' pour commencer."}
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-blue-900/15 transition-colors">
                    <td className="px-6 py-4 font-medium text-[#f4f4f6]">{product.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-950 border border-blue-800/50 text-blue-200">
                        {product.category || "Général"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-blue-100">
                      {Number(product.price).toLocaleString("fr-FR")} FCFA
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          product.stock > 10
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : product.stock > 0
                            ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            product.stock > 10 ? "bg-emerald-400" : product.stock > 0 ? "bg-blue-400" : "bg-red-400"
                          }`}
                        />
                        {product.stock} en stock
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const input = (e.currentTarget.elements.namedItem("stock") as HTMLInputElement);
                          if (input) {
                            handleUpdateStock(product.id, parseInt(input.value, 10));
                          }
                        }}
                        className="inline-flex items-center gap-2"
                      >
                        <input
                          type="number"
                          name="stock"
                          defaultValue={product.stock}
                          className="w-20 px-2 py-1 bg-[#0b1329] border border-blue-900/60 rounded text-center text-xs text-[#f4f4f6] focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-3 py-1 bg-blue-900/60 hover:bg-blue-800 text-xs font-medium text-blue-200 rounded transition-colors border border-blue-700/30 cursor-pointer"
                        >
                          Mettre à jour
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting || product.stock <= 0}
                          onClick={() => handleSale(product.id, 1)}
                          title="Simuler une transaction de caisse POS atomique (-1)"
                          className={`px-3 py-1 text-xs font-semibold rounded transition-colors cursor-pointer border ${
                            product.stock > 0
                              ? "bg-emerald-600/80 hover:bg-emerald-500 text-white border-emerald-500/50 shadow-sm"
                              : "bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed"
                          }`}
                        >
                          ⚡ Vendre (-1)
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal de Création */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0b1329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101b3b] border border-blue-900/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#f4f4f6]">Ajouter un produit Nanasore</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-blue-300/70 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-blue-300/70 mb-1">Nom du produit</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ex: Lecteur Code-Barres Pro"
                  className="w-full px-3 py-2 bg-[#0b1329] border border-blue-900/60 rounded-lg text-sm text-[#f4f4f6] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-blue-300/70 mb-1">Prix (FCFA)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="25000"
                    className="w-full px-3 py-2 bg-[#0b1329] border border-blue-900/60 rounded-lg text-sm text-[#f4f4f6] focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-300/70 mb-1">Stock initial</label>
                  <input
                    type="number"
                    required
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-[#0b1329] border border-blue-900/60 rounded-lg text-sm text-[#f4f4f6] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-blue-300/70 mb-1">Catégorie</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="ex: Matériel"
                  className="w-full px-3 py-2 bg-[#0b1329] border border-blue-900/60 rounded-lg text-sm text-[#f4f4f6] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-sm font-medium text-blue-200 border border-blue-800/40 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {isSubmitting ? "Enregistrement..." : "Créer le produit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
