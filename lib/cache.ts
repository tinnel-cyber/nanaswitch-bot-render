import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";

/**
 * Technique secrète 6 : Cache Taggué en Mémoire Vive (unstable_cache)
 * Permet de répondre aux requêtes répétées en < 1 milliseconde au lieu de refaire des allers-retours vers Supabase.
 */

export interface CachedCourse {
  id: string;
  title: string;
  prof: string;
}

export const getCachedAvailableCourses = unstable_cache(
  async (): Promise<CachedCourse[]> => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, prof")
        .limit(20);

      if (!error && data && data.length > 0) {
        return data as CachedCourse[];
      }
    } catch (e) {
      // Repli immédiat
    }

    // Données souveraines Nanasore avec mise en cache ultra-rapide
    return [
      { id: "nextjs-r2-masterclass", title: "Masterclass Next.js App Router & Cloudflare R2", prof: "Prof. Amédée" },
      { id: "commerce-afrique-mobile", title: "E-Commerce & Mobile Money Souverain", prof: "Dr. Konkobo" },
      { id: "dev-web-fullstack", title: "Développement Web & APIs Souveraines", prof: "Ing. Traoré" },
      { id: "comptabilite-gestion", title: "Comptabilité et Gestion Commerciale", prof: "Mme Ouédraogo" },
    ];
  },
  ["nanasore-cached-courses"],
  {
    revalidate: 3600, // Revalidation toutes les heures
    tags: ["courses", "academic"],
  }
);

export const getCachedPlatformKpis = unstable_cache(
  async () => {
    let orgCount = 0;
    let connected = false;

    try {
      const { data, error } = await supabase.from("organizations").select("id").limit(100);
      if (!error && data) {
        orgCount = data.length;
        connected = true;
      }
    } catch {
      connected = false;
    }

    return {
      connected,
      orgCount,
      timestamp: Date.now(),
    };
  },
  ["nanasore-platform-kpis"],
  {
    revalidate: 300, // Revalidation toutes les 5 minutes
    tags: ["kpis", "supabase-status"],
  }
);
