const fs = require('fs');

// 1. Patch app/routes/api/modules.ts
let apiModules = fs.readFileSync('app/routes/api/modules.ts', 'utf8');
if (!apiModules.includes('modulesMemoryCache')) {
  apiModules = `// Cache serveur en mémoire pour protéger les quotas Supabase (5 minutes de TTL)
const modulesMemoryCache = new Map<string, { data: any; expiry: number }>();
const MODULES_CACHE_TTL_MS = 5 * 60 * 1000;

` + apiModules;

  // Add cache invalidation in action
  apiModules = apiModules.replace(
    'return json({\n      success: true,\n      message: "Bloc mis à jour avec succès dans le registre Supabase",',
    'modulesMemoryCache.clear();\n    return json({\n      success: true,\n      message: "Bloc mis à jour avec succès dans le registre Supabase",'
  );

  // Update loader
  const oldLoader = `export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get("organizationId");

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

    return json({ success: true, registry: registry || [], activeBlocks });
  } catch (err: any) {
    return json({ success: false, error: err.message, registry: [], activeBlocks: [] }, { status: 500 });
  }
}`;

  const newLoader = `export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get("organizationId");
    const cacheKey = \`modules_\${orgId || "all"}\`;

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
}`;

  apiModules = apiModules.replace(oldLoader, newLoader);
  fs.writeFileSync('app/routes/api/modules.ts', apiModules, 'utf8');
  console.log('app/routes/api/modules.ts patched!');
}

// 2. Patch app/routes/dashboard._index.jsx
let dashboardIndex = fs.readFileSync('app/routes/dashboard._index.jsx', 'utf8');
if (!dashboardIndex.includes('dashboardOrgMemoryCache')) {
  dashboardIndex = dashboardIndex.replace(
    'export async function loader() {',
    `// Cache mémoire serveur pour les requêtes de statut Supabase (3 minutes TTL)
let dashboardOrgMemoryCache = { data: null, expiry: 0 };
const DASHBOARD_CACHE_TTL_MS = 3 * 60 * 1000;

export async function loader() {
  if (dashboardOrgMemoryCache.data && dashboardOrgMemoryCache.expiry > Date.now()) {
    return json(
      { supabaseStatus: dashboardOrgMemoryCache.data },
      {
        headers: {
          "Cache-Control": "private, max-age=30, s-maxage=120, stale-while-revalidate=300",
          "X-Nanasore-Cache": "HIT-SERVER-MEMORY",
        },
      }
    );
  }`
  );

  dashboardIndex = dashboardIndex.replace(
    'return json({ supabaseStatus });',
    `dashboardOrgMemoryCache = {
    data: supabaseStatus,
    expiry: Date.now() + DASHBOARD_CACHE_TTL_MS,
  };

  return json(
    { supabaseStatus },
    {
      headers: {
        "Cache-Control": "private, max-age=30, s-maxage=120, stale-while-revalidate=300",
        "X-Nanasore-Cache": "MISS-POPULATED",
      },
    }
  );`
  );

  fs.writeFileSync('app/routes/dashboard._index.jsx', dashboardIndex, 'utf8');
  console.log('app/routes/dashboard._index.jsx patched!');
}

// 3. Patch server.ts /api/modules
let serverTs = fs.readFileSync('server.ts', 'utf8');
if (!serverTs.includes('serverModulesCache')) {
  serverTs = serverTs.replace(
    `  app.get('/api/modules', async (req, res) => {`,
    `  // Cache mémoire serveur pour /api/modules (5 minutes TTL)
  const serverModulesCache = new Map<string, { data: any; expiry: number }>();
  const SERVER_MODULES_TTL_MS = 5 * 60 * 1000;

  app.get('/api/modules', async (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    const orgId = req.query.organizationId as string;
    const cacheKey = \`modules_\${orgId || 'all'}\`;

    const cached = serverModulesCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return res.json(cached.data);
    }`
  );

  serverTs = serverTs.replace(
    `      return res.json({ success: true, registry: registry || [], activeBlocks });`,
    `      const payload = { success: true, registry: registry || [], activeBlocks };
      serverModulesCache.set(cacheKey, { data: payload, expiry: Date.now() + SERVER_MODULES_TTL_MS });
      return res.json(payload);`
  );

  fs.writeFileSync('server.ts', serverTs, 'utf8');
  console.log('server.ts patched!');
}

console.log('Remix and Server Caches successfully applied!');
