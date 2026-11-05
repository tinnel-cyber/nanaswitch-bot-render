import { getServerSessionUser } from "@/lib/session";
import ClientDashboardView, { ClientProfile, PurchasedProduct } from "./ClientDashboardView";

export const metadata = {
  title: "Tableau de Bord Client | Nanasore",
  description: "Accédez à vos commandes et produits numériques sécurisés.",
};

// Server Component asynchrone (Next.js App Router)
export default async function ClientDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ empty?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const showEmpty = resolvedSearchParams.empty === "true" || resolvedSearchParams.empty === "1";

  // 1. Récupération de la session utilisateur
  const sessionUser = await getServerSessionUser();

  // 2. Profil client
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

  return <ClientDashboardView client={client} orders={orders} />;
}
