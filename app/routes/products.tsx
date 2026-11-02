import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, Form, useNavigation } from "@remix-run/react";
import React, { useState } from "react";
import { supabase } from "../utils/supabase.server";
import type { Product } from "../types/supabase";

interface LoaderData {
  products: Product[];
  totalStock: number;
  totalValue: number;
  error: string | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const totalStock = products?.reduce((acc, p) => acc + (p.stock || 0), 0) || 0;
    const totalValue = products?.reduce((acc, p) => acc + (p.price || 0) * (p.stock || 0), 0) || 0;

    return json<LoaderData>({
      products: (products as Product[]) || [],
      totalStock,
      totalValue,
      error: null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur lors du chargement";
    return json<LoaderData>({ products: [], totalStock: 0, totalValue: 0, error: msg });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const name = String(formData.get("name") || "").trim();
    const price = parseFloat(String(formData.get("price") || "0"));
    const stock = parseInt(String(formData.get("stock") || "0"), 10);
    const category = String(formData.get("category") || "Général").trim();

    if (!name || isNaN(price) || isNaN(stock)) {
      return json({ error: "Veuillez remplir correctement tous les champs." }, { status: 400 });
    }

    const { data: org } = await supabase.from("organizations").select("id").limit(1).single();

    const { error } = await supabase.from("products").insert([
      {
        name,
        price,
        stock,
        category,
        organization_id: org?.id || null,
      },
    ]);

    if (error) return json({ error: error.message }, { status: 500 });
    return json({ success: true, error: null });
  }

  if (intent === "update-stock") {
    const id = String(formData.get("id"));
    const newStock = parseInt(String(formData.get("stock") || "0"), 10);

    const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", id);
    if (error) return json({ error: error.message }, { status: 500 });
    return json({ success: true, error: null });
  }

  return json({ error: "Action non reconnue" }, { status: 400 });
}

export default function ProductsRoute() {
  const { products, totalStock, totalValue, error: loaderError } = useLoaderData<typeof loader>() || {
    products: [],
    totalStock: 0,
    totalValue: 0,
    error: null,
  };
  const actionData = useActionData<{ error?: string; success?: boolean }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b1329] text-[#f4f4f6] font-sans antialiased selection:bg-blue-600/30 selection:text-white">
      {/* Top Navbar Bleu Royal & Blanc Cassé */}
      <header className="border-b border-blue-900/40 bg-[#0b1329]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-600/30">
              N
            </div>
            <span className="font-semibold text-lg tracking-tight text-[#f4f4f6]">Nanasore</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950 border border-blue-800/60 text-blue-300 font-medium">POS Engine</span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
          >
            <span>+</span> Nouveau Produit
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* En-tête de page */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#f4f4f6]">Catalogue & Stocks</h1>
            <p className="text-sm text-blue-300/70 mt-1">Gérez le catalogue d'articles et suivez la disponibilité en temps réel.</p>
          </div>
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

        {/* Message d'erreur */}
        {(loaderError || actionData?.error) && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
            {loaderError || actionData?.error}
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
                    Aucun produit enregistré. Cliquez sur "+ Nouveau Produit" pour commencer.
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
                      <Form method="post" className="inline-flex items-center gap-2">
                        <input type="hidden" name="intent" value="update-stock" />
                        <input type="hidden" name="id" value={product.id} />
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
                      </Form>
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

            <Form method="post" onSubmit={() => setIsModalOpen(false)} className="space-y-4">
              <input type="hidden" name="intent" value="create" />
              <div>
                <label className="block text-xs font-medium text-blue-300/70 mb-1">Nom du produit</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="ex: Lecteur Code-Barres Pro"
                  className="w-full px-3 py-2 bg-[#0b1329] border border-blue-900/60 rounded-lg text-sm text-[#f4f4f6] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-blue-300/70 mb-1">Prix (FCFA)</label>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    required
                    placeholder="25000"
                    className="w-full px-3 py-2 bg-[#0b1329] border border-blue-900/60 rounded-lg text-sm text-[#f4f4f6] focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-300/70 mb-1">Stock initial</label>
                  <input
                    type="number"
                    name="stock"
                    required
                    placeholder="10"
                    className="w-full px-3 py-2 bg-[#0b1329] border border-blue-900/60 rounded-lg text-sm text-[#f4f4f6] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-blue-300/70 mb-1">Catégorie</label>
                <input
                  type="text"
                  name="category"
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
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
