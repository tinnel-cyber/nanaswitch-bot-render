import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Download,
  CheckCircle2,
  FileText,
  Archive,
  Video,
  FileCode,
  Music,
  ShoppingBag,
  Clock,
  Sparkles,
  ExternalLink,
  Search,
  PackageCheck,
  UploadCloud
} from "lucide-react";
import { useState } from "react";
import { getSession } from "~/sessions.server";

export interface PurchasedProduct {
  orderId: string;
  productName: string;
  purchaseDate: string;
  fileType: "PDF" | "ZIP" | "MP4" | "EPUB" | "MP3" | string;
  fileSize?: string;
  category?: string;
  downloadUrl: string; // /download/:orderId
}

export interface ClientProfile {
  name: string;
  email: string;
  isVerified: boolean;
  avatarUrl?: string;
  memberSince: string;
}

interface LoaderData {
  client: ClientProfile;
  orders: PurchasedProduct[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const showEmpty = url.searchParams.get("empty") === "true" || url.searchParams.get("empty") === "1";

  // 1. Récupération de la session utilisateur si existante
  const cookie = request.headers.get("Cookie");
  const session = await getSession(cookie);
  const sessionUser = session.get("user");

  // 2. Profil client par défaut ou connecté
  const client: ClientProfile = {
    name: sessionUser?.name || sessionUser?.fullName || "Koffi Amédée",
    email: sessionUser?.email || "koffi.amedee@nanasore.com",
    isVerified: true,
    memberSince: "Novembre 2026",
  };

  // 3. Commandes payées avec URL de téléchargement interne /download/:orderId
  const allOrders: PurchasedProduct[] = [
    {
      orderId: "CMD-9841",
      productName: "E-book Masterclass Remix & Cloudflare R2",
      purchaseDate: "04 Nov 2026",
      fileType: "PDF",
      fileSize: "18.4 Mo",
      category: "Développement & Cloud",
      downloadUrl: "/download/CMD-9841",
    },
    {
      orderId: "CMD-7712",
      productName: "Kit Templates UI E-Commerce Pro (Figma & Code)",
      purchaseDate: "02 Nov 2026",
      fileType: "ZIP",
      fileSize: "142 Mo",
      category: "Design & UX/UI",
      downloadUrl: "/download/CMD-7712",
    },
    {
      orderId: "CMD-5540",
      productName: "Formation Vidéo : Vendre sur WhatsApp & Mobile Money",
      purchaseDate: "28 Oct 2026",
      fileType: "MP4",
      fileSize: "680 Mo",
      category: "Marketing & Vente",
      downloadUrl: "/download/CMD-5540",
    },
  ];

  const orders = showEmpty ? [] : allOrders;

  return json<LoaderData>({
    client,
    orders,
  });
}

/**
 * Composant Helper pour les badges et icônes de type de fichier
 */
function FileTypeBadge({ type }: { type: string }) {
  const upper = (type || "").toUpperCase();

  switch (upper) {
    case "PDF":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <FileText className="w-3.5 h-3.5 text-blue-700" />
          PDF
        </span>
      );
    case "ZIP":
    case "RAR":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <Archive className="w-3.5 h-3.5 text-emerald-700" />
          {upper}
        </span>
      );
    case "MP4":
    case "VIDEO":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
          <Video className="w-3.5 h-3.5 text-purple-700" />
          MP4
        </span>
      );
    case "MP3":
    case "AUDIO":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <Music className="w-3.5 h-3.5 text-amber-700" />
          AUDIO
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <FileCode className="w-3.5 h-3.5 text-slate-600" />
          {upper || "FICHIER"}
        </span>
      );
  }
}

export default function ClientDashboard() {
  const { client, orders } = useLoaderData<typeof loader>();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = orders.filter((order) =>
    order.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.orderId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900 pb-16">
      {/* Barre de navigation supérieure discrète */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center text-white font-extrabold shadow-sm group-hover:bg-blue-800 transition">
                N
              </div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                Nanasore<span className="text-blue-700">.</span>
              </span>
            </Link>
            <span className="hidden sm:inline-block text-xs font-medium px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              Espace Client
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/academic/upload"
              className="text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4 text-blue-700" />
              <span>Upload Académique</span>
            </Link>

            <Link
              to="/"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-blue-700 transition flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Boutique</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteneur principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* En-tête du Dashboard avec le nom du client et Compte Vérifié */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm shadow-blue-900/5 mb-8 relative overflow-hidden">
          {/* Accent Bleu Royal discret dans le coin */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/60 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center text-2xl sm:text-3xl font-extrabold shadow-md shadow-blue-700/20">
                {client.name.charAt(0)}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {client.name}
                  </h1>
                  {client.isVerified && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                      Compte Vérifié
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-500 mt-1">
                  {client.email} • Membre depuis {client.memberSince}
                </p>
              </div>
            </div>

            {/* Statistiques rapides */}
            <div className="flex items-center gap-4 sm:border-l sm:border-slate-100 sm:pl-6">
              <div className="bg-[#fcfcfd] border border-slate-200/80 rounded-2xl px-5 py-3 text-center sm:text-left">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400 block">
                  Produits Débloqués
                </span>
                <span className="text-2xl font-extrabold text-blue-700">
                  {orders.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Barre d'outils et titre de la section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-blue-700" />
              Mes Produits Numériques
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Accédez à vos e-books, packs de formation et ressources numériques téléchargeables.
            </p>
          </div>

          {orders.length > 0 && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher un produit ou #CMD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition placeholder:text-slate-400 text-slate-800 shadow-xs"
              />
            </div>
          )}
        </div>

        {/* État Vide (Empty State) si aucun achat */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
            <div className="w-20 h-20 rounded-full bg-blue-50 border border-blue-100 text-blue-700 mx-auto flex items-center justify-center mb-5">
              <ShoppingBag className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mb-2">
              Vous n'avez pas encore de produit numérique
            </h3>

            <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
              Explorez le catalogue Nanasore pour débloquer des e-books d'experts, des formations professionnelles et des templates exclusifs.
            </p>

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm shadow-md shadow-blue-700/25 transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              Découvrir la boutique Nanasore
            </Link>
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Aucun résultat de recherche */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-slate-600 text-sm">
              Aucun produit ne correspond à votre recherche "{searchQuery}".
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-3 text-xs font-semibold text-blue-700 hover:underline"
            >
              Réinitialiser la recherche
            </button>
          </div>
        ) : (
          /* Grille de cartes des produits achetés */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((order) => (
              <div
                key={order.orderId}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group hover:border-blue-200"
              >
                <div className="p-6">
                  {/* Badge de type de fichier et identifiant de commande */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <FileTypeBadge type={order.fileType} />
                    <span className="font-mono text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                      {order.orderId}
                    </span>
                  </div>

                  {/* Titre du produit */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition line-clamp-2 leading-snug mb-2">
                    {order.productName}
                  </h3>

                  {order.category && (
                    <p className="text-xs text-slate-400 font-medium mb-4">
                      {order.category}
                    </p>
                  )}

                  {/* Informations de date & taille */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {order.purchaseDate}
                    </span>
                    {order.fileSize && (
                      <span>• {order.fileSize}</span>
                    )}
                  </div>
                </div>

                {/* Bouton d'action principal « Télécharger le produit » */}
                <div className="p-4 sm:px-6 bg-[#fcfcfd] border-t border-slate-100">
                  <a
                    href={order.downloadUrl}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-blue-700/20 hover:shadow-blue-700/30 transition-all active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger le produit
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Section d'aide et sécurité en bas de page */}
        <div className="mt-12 bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Téléchargements sécurisés & garantis
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Vos liens de téléchargement sont signés et hébergés de façon sécurisée via Cloudflare R2.
              </p>
            </div>
          </div>

          <a
            href="mailto:support@nanasore.com"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline shrink-0"
          >
            Contacter le support <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </main>
    </div>
  );
}
