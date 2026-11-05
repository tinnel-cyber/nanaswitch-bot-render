import { getServerSessionUser } from "@/lib/session";
import { getUserAccountStatus } from "@/lib/supabase";
import { getCachedAvailableCourses } from "@/lib/cache";
import VendorUploadClient, { UploadRole } from "./VendorUploadClient";

export const metadata = {
  title: "Upload Académique & Marchand | Nanasore Vault R2",
  description: "Compression ZIP level 9 à la volée et sauvegarde dans le coffre Cloudflare R2.",
};

// Server Component asynchrone (Next.js App Router)
export default async function VendorUploadPage({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const sessionUser = await getServerSessionUser();

  const roleParam = resolvedSearchParams.role?.toLowerCase();
  let defaultRole: UploadRole = "professeur";

  if (roleParam === "etudiant" || roleParam === "student") {
    defaultRole = "etudiant";
  } else if (roleParam === "vendor" || roleParam === "marchand") {
    defaultRole = "vendor";
  } else if (roleParam === "professeur" || roleParam === "teacher") {
    defaultRole = "professeur";
  } else if (sessionUser?.role === "etudiant") {
    defaultRole = "etudiant";
  } else if (sessionUser?.role === "vendor") {
    defaultRole = "vendor";
  }

  const userId = sessionUser?.id || (defaultRole === "professeur" ? "prof_01" : defaultRole === "vendor" ? "vendor_01" : "etu_8842");
  const userName = sessionUser?.name || (defaultRole === "professeur" ? "Prof. Amédée" : defaultRole === "vendor" ? "Marchand Nanasore" : "Étudiant Moussa");
  const studentNumber = sessionUser?.studentNumber || "ETU-2026-9041";

  // Vérification de statut du compte (Mode read_only si non ouvert)
  const accountStatus = await getUserAccountStatus(userId);

  // Technique secrète 6 : Données servies depuis le cache mémoire taggué
  const availableCourses = await getCachedAvailableCourses();

  return (
    <VendorUploadClient
      user={{ id: userId, name: userName, studentNumber }}
      defaultRole={defaultRole}
      availableCourses={availableCourses}
      isReadOnly={accountStatus.isReadOnly}
      kycStatus={accountStatus.kycStatus}
    />
  );
}
