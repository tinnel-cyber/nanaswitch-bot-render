import { redirect, json, type LoaderFunctionArgs } from "@remix-run/node";
import { useRouteError, isRouteErrorResponse, Link } from "@remix-run/react";
import { getSecureDownloadUrl } from "~/utils/r2.server";

export async function loader({ params }: LoaderFunctionArgs) {
  const { orderId } = params;

  // 1. Simulation ou requête de vérification en base de données
  // (Remplacez cette constante par votre appel Prisma/Firebase/BD)
  const mockDbOrder = {
    id: orderId,
    isPaid: true, // Passez à false pour tester l'erreur 403
    fileKey: `products/vendors/masterclass-remix.pdf`,
  };

  // 2. Gestion de la commande introuvable
  if (!mockDbOrder || mockDbOrder.id !== orderId) {
    throw new Response("Commande introuvable", { status: 404 });
  }

  // 3. Gestion de la commande non payée
  if (!mockDbOrder.isPaid) {
    throw new Response("Accès refusé : Commande non payée", { status: 403 });
  }

  try {
    // 4. Génération de l'URL signée Cloudflare R2 (valable 1 heure = 3600 secondes)
    const signedUrl = await getSecureDownloadUrl(mockDbOrder.fileKey, 3600);

    // 5. Redirection HTTP 302 vers le lien sécurisé R2
    return redirect(signedUrl);
  } catch (error) {
    console.error("Erreur lors de la génération de l'URL R2 :", error);
    throw new Response("Erreur technique lors de la génération du lien de téléchargement.", {
      status: 500,
    });
  }
}

/**
 * ErrorBoundary pour intercepter et afficher proprement les erreurs (403, 404, 500)
 */
export function ErrorBoundary() {
  const error = useRouteError();

  let title = "Une erreur est survenue";
  let message = "Impossible d'accéder au fichier demandé pour le moment.";
  let statusCode = 500;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    if (error.status === 404) {
      title = "Commande introuvable (404)";
      message = "La référence de cette commande n'existe pas ou a été supprimée de notre système.";
    } else if (error.status === 403) {
      title = "Accès non autorisé (403)";
      message = "Cette commande n'a pas encore été validée ou le paiement est en attente.";
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full shadow-lg text-center">
        {/* Icône d'alerte */}
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
          Erreur {statusCode}
        </span>

        <h1 className="text-xl font-bold text-gray-900 mt-3 mb-2">{title}</h1>
        <p className="text-sm text-gray-600 mb-8 leading-relaxed">{message}</p>

        {/* Boutons d'action */}
        <div className="flex flex-col gap-3">
          <Link
            to="/client/dashboard"
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
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Contacter le support Nanasore
          </a>
        </div>
      </div>
    </div>
  );
}

export default function DownloadRoute() {
  return null;
}
