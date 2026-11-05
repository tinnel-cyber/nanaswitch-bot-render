import Link from "next/link";
import { redirect } from "next/navigation";
import { getSecureDownloadUrl } from "@/lib/r2";

interface DownloadPageProps {
  params: Promise<{ orderId: string }>;
}

export const metadata = {
  title: "Téléchargement Sécurisé | Nanasore",
  description: "Lien signé temporaire pour votre produit numérique Nanasore.",
};

// Server Component asynchrone (Next.js App Router)
export default async function DownloadPage({ params }: DownloadPageProps) {
  const { orderId } = await params;

  // 1. Simulation ou vérification en base de données de la commande
  const mockDbOrders: Record<string, { id: string; isPaid: boolean; fileKey: string }> = {
    "CMD-9841": {
      id: "CMD-9841",
      isPaid: true,
      fileKey: "products/vendors/masterclass-nextjs-r2.pdf",
    },
    "CMD-7712": {
      id: "CMD-7712",
      isPaid: true,
      fileKey: "products/vendors/templates-ui-ecommerce.zip",
    },
    "CMD-5540": {
      id: "CMD-5540",
      isPaid: true,
      fileKey: "products/vendors/formation-video-whatsapp.mp4",
    },
    "CMD-UNPAID": {
      id: "CMD-UNPAID",
      isPaid: false,
      fileKey: "products/vendors/unpaid.pdf",
    },
  };

  const order = mockDbOrders[orderId];

  // 2. Gestion de la commande introuvable (404)
  if (!order) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full shadow-lg text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-100">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <span className="text-xs font-bold tracking-wider text-red-600 uppercase bg-red-50 px-2.5 py-1 rounded-md">
            Erreur 404
          </span>

          <h1 className="text-xl font-bold text-gray-900 mt-3 mb-2">Commande introuvable (404)</h1>
          <p className="text-sm text-gray-600 mb-8 leading-relaxed">
            La référence de cette commande ({orderId}) n'existe pas ou a été supprimée de notre système.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/client/dashboard"
              className="w-full bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-medium py-3 px-4 rounded-xl shadow-sm transition text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retourner au tableau de bord
            </Link>

            <a
              href="mailto:support@nanasore.com"
              className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-xl border border-gray-200 transition text-sm flex items-center justify-center gap-2"
            >
              Contacter le support Nanasore
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 3. Gestion de la commande non payée (403)
  if (!order.isPaid) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full shadow-lg text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-100">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <span className="text-xs font-bold tracking-wider text-red-600 uppercase bg-red-50 px-2.5 py-1 rounded-md">
            Erreur 403
          </span>

          <h1 className="text-xl font-bold text-gray-900 mt-3 mb-2">Accès non autorisé (403)</h1>
          <p className="text-sm text-gray-600 mb-8 leading-relaxed">
            Cette commande n'a pas encore été validée ou le paiement Mobile Money / Carte est en attente.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/client/dashboard"
              className="w-full bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-medium py-3 px-4 rounded-xl shadow-sm transition text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retourner au tableau de bord
            </Link>

            <a
              href="mailto:support@nanasore.com"
              className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-xl border border-gray-200 transition text-sm flex items-center justify-center gap-2"
            >
              Contacter le support Nanasore
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 4. Génération de la Signed URL Cloudflare R2 (1 heure = 3600s) et redirection
  try {
    const signedUrl = await getSecureDownloadUrl(order.fileKey, 3600);
    redirect(signedUrl);
  } catch (err: any) {
    // Si redirect lève NEXT_REDIRECT, laisser Next.js effectuer la redirection
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) {
      throw err;
    }

    console.error("Erreur génération URL R2:", err);
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full shadow-lg text-center">
          <span className="text-xs font-bold tracking-wider text-red-600 uppercase bg-red-50 px-2.5 py-1 rounded-md">
            Erreur 500
          </span>
          <h1 className="text-xl font-bold text-gray-900 mt-3 mb-2">Erreur technique serveur</h1>
          <p className="text-sm text-gray-600 mb-8 leading-relaxed">
            Impossible d'accéder au fichier sur le vault Cloudflare R2 pour le moment. Veuillez réessayer dans quelques instants.
          </p>
          <Link
            href="/client/dashboard"
            className="w-full bg-[#1d4ed8] text-white font-medium py-3 px-4 rounded-xl text-sm inline-block"
          >
            Retourner au tableau de bord
          </Link>
        </div>
      </div>
    );
  }
}
