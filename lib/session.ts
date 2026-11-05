import { cookies } from "next/headers";

export interface SessionUser {
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
  studentNumber?: string;
  kycStatus?: string;
  isVerified?: boolean;
}

export async function getServerSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__nanasore_session")?.value;
    if (!sessionCookie) return null;

    // Décoder si JSON simple ou payload encodé
    try {
      const decoded = decodeURIComponent(sessionCookie);
      const parsed = JSON.parse(decoded);
      return parsed.user || parsed;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}
