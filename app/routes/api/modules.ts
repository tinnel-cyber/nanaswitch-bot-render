// Cache serveur en mémoire pour protéger les quotas Supabase (5 minutes de TTL)
const modulesMemoryCache = new Map<string, { data: any; expiry: number }>();
const MODULES_CACHE_TTL_MS = 5 * 60 * 1000;

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { supabase } from "../../utils/supabase.server";

/**
 * Route API Remix : app/routes/api/modules.ts
 * Pont entre l'Omnibar central Nanasore et Supabase PostgreSQL (RPC publish_organization_block).
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    let blockKey = "";
    let isActive = true;
    let organizationId = "";
    let settings: Record<string, unknown> = {};

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      blockKey = String(body.blockKey || body.block_key || body.id || "").trim();
      isActive = Boolean(body.isActive ?? body.is_active ?? true);
      organizationId = String(body.organizationId || body.organization_id || "").trim();
      settings = body.settings || {};
    } else {
      const formData = await request.formData();
      blockKey = String(formData.get("blockKey") || formData.get("block_key") || formData.get("id") || "").trim();
      isActive = formData.get("isActive") === "true" || formData.get("is_active") === "true";
      organizationId = String(formData.get("organizationId") || formData.get("organization_id") || "").trim();
      const rawSettings = formData.get("settings");
      if (typeof rawSettings === "string") {
        try {
          settings = JSON.parse(rawSettings);
        } catch {
          settings = {};
        }
      }
    }

    if (!blockKey) {
      return json({ success: false, error: "Le paramètre blockKey est obligatoire" }, { status: 400 });
    }

    // Si organizationId n'est pas fourni, récupérer l'organisation par défaut dans Supabase
    if (!organizationId) {
      const { data: defaultOrg } = await supabase.from("organizations").select("id").limit(1).single();
      if (defaultOrg?.id) {
        organizationId = defaultOrg.id;
      }
    }

    if (!organizationId) {
      return json(
        {
          success: false,
          error: "Aucune organisation trouvée. Veuillez spécifier un organizationId valide ou créer une organisation dans Supabase.",
        },
        { status: 400 }
      );
    }

    // Exécution de la fonction stockée PostgreSQL (RPC)
    const { data, error } = await supabase.rpc("publish_organization_block", {
      p_org_id: organizationId,
      p_block_key: blockKey,
      p_is_active: isActive,
      p_settings: settings,
    });

    if (error) {
      return json({ success: false, error: error.message }, { status: 500 });
    }

    modulesMemoryCache.clear();
    return json({
      success: true,
      message: "Bloc mis à jour avec succès dans le registre Supabase",
      result: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne du serveur";
    return json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * Loader pour interroger le registre des blocs et les blocs actifs d'une organisation
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get("organizationId");
    const cacheKey = `modules_${orgId || "all"}`;

    const cached = modulesMemoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return json(cached.data, {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
          "X-Nanasore-Cache": "HIT-SERVER-MEMORY",
        },
      });
    }

    const { data: registry, error: regError } = await supabase
      .from("app_registry")
      .select("*")
      .eq("is_public", true)
      .order("name", { ascending: true });

    if (regError) throw regError;

    let activeBlocks: any[] = [];
    if (orgId) {
      const { data: blocks } = await supabase
        .from("organization_blocks")
        .select("*")
        .eq("organization_id", orgId);
      activeBlocks = blocks || [];
    }

    const responseData = { success: true, registry: registry || [], activeBlocks };
    modulesMemoryCache.set(cacheKey, {
      data: responseData,
      expiry: Date.now() + MODULES_CACHE_TTL_MS,
    });

    return json(responseData, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
        "X-Nanasore-Cache": "MISS-POPULATED",
      },
    });
  } catch (err: any) {
    return json({ success: false, error: err.message, registry: [], activeBlocks: [] }, { status: 500 });
  }
}
