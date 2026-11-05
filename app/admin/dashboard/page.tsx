import { getServerSessionUser } from "@/lib/session";
import { checkIsSuperAdmin } from "@/lib/supabase";
import AdminDashboardClient from "./AdminDashboardClient";

export const metadata = {
  title: "Tableau de Bord Super Admin | Control Plane Nanasore",
  description: "Supervision unifiée de la plateforme et des règles de sécurité.",
};

// Server Component asynchrone (Next.js App Router)
export default async function AdminDashboardPage() {
  const sessionUser = await getServerSessionUser();
  const userId = sessionUser?.id || "admin_master";
  const userEmail = sessionUser?.email || "contact@nanasore.com";

  // Vérification stricte Super Admin via Supabase & liste blanche
  const isAuthorized = await checkIsSuperAdmin(userId, userEmail);

  return (
    <AdminDashboardClient
      isSuperAdmin={isAuthorized}
      userEmail={userEmail}
      totalStores={342}
      activeUsers={1280}
      monthlyRevenueCFA={1850000}
    />
  );
}
