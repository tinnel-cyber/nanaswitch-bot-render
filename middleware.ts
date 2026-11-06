import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Liste des domaines systèmes réservés à la plateforme principale NaNa POS & Académie.
 * Ces domaines ne subissent pas de réécriture vers `/_tenants/[domain]`.
 */
const SYSTEM_DOMAINS = new Set([
  'nanasore.com',
  'www.nanasore.com',
  'nsore.shop',
  'www.nsore.shop',
  'localhost',
  '127.0.0.1',
]);

/**
 * Suffixes de domaines d'infrastructure ou de prévisualisation système
 */
const SYSTEM_DOMAIN_SUFFIXES = [
  '.nanasore.com',
  '.nsore.shop',
  '.vercel.app',
  '.onrender.com',
  '.pages.dev',
];

/**
 * Préfixes de chemins système ne devant jamais être réécrits
 */
const SYSTEM_PATH_PREFIXES = [
  '/api',
  '/auth',
  '/admin',
  '/download',
  '/upload',
  '/vendor',
  '/client',
  '/_next',
  '/static',
];

/**
 * Nettoie le hostname reçu (supprime le port et les préfixes superflus)
 */
function cleanHostname(host: string | null): string {
  if (!host) return 'localhost';
  // Retire le port (ex: "academie-client.com:3000" -> "academie-client.com")
  const hostWithoutPort = host.split(':')[0].toLowerCase().trim();
  return hostWithoutPort;
}

/**
 * Détermine si le hostname correspond à un domaine système central
 */
function isSystemDomain(hostname: string): boolean {
  if (SYSTEM_DOMAINS.has(hostname)) {
    return true;
  }
  return SYSTEM_DOMAIN_SUFFIXES.some(suffix => hostname.endsWith(suffix));
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const rawHost = request.headers.get('host');
  const hostname = cleanHostname(rawHost);

  // Initialisation des en-têtes de contexte transmis aux Server Components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-url-pathname', pathname);

  // 1. Détection des domaines systèmes (nanasore.com, nsore.shop, localhost)
  if (isSystemDomain(hostname)) {
    requestHeaders.set('x-routing-type', 'standard');
    requestHeaders.set('x-tenant-domain', hostname);

    // Les routes d'administration, API, authentification, et les boutiques/académies standard
    // passent directement sans aucune réécriture interne
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 2. Gestion des Domaines Personnalisés Tiers (Marque Blanche / `routing_type = 'custom'`)
  // Exemple: "academie-client.com", "formation-pro.fr"
  requestHeaders.set('x-routing-type', 'custom');
  requestHeaders.set('x-tenant-domain', hostname);

  // Détection du paramètre d'affiliation propre au tenant (?taf=CODE)
  const tenantAffiliateCode = request.nextUrl.searchParams.get('taf');
  if (tenantAffiliateCode) {
    requestHeaders.set('x-tenant-affiliate-code', tenantAffiliateCode.trim().toUpperCase());
  }

  // Empêche la réécriture en boucle si l'URL pointe déjà vers /_tenants/
  if (pathname.startsWith('/_tenants')) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Si la requête concerne une route API générale ou un asset, laisser passer avec les headers
  const isSystemPath = SYSTEM_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));
  if (isSystemPath) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Réécriture interne dynamique vers l'arborescence multi-tenant :
  // /_tenants/[domain]${pathname}
  // Ex: "academie-client.com/courses" -> "/_tenants/academie-client.com/courses"
  // Ex: "academie-client.com/" -> "/_tenants/academie-client.com"
  const tenantPath = `/_tenants/${hostname}${pathname === '/' ? '' : pathname}${search}`;
  const rewriteUrl = new URL(tenantPath, request.url);

  const response = NextResponse.rewrite(rewriteUrl, {
    request: {
      headers: requestHeaders,
    },
  });

  // Mémorisation du code affilié du tenant dans un cookie 30 jours pour attribution lors de l'achat
  if (tenantAffiliateCode) {
    response.cookies.set('nanasore_taf_code', tenantAffiliateCode.trim().toUpperCase(), {
      path: '/',
      maxAge: 2592000,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  return response;
}

/**
 * Matcher Next.js optimisé : filtre tous les assets statiques, images et fichiers média
 */
export const config = {
  matcher: [
    /*
     * Intercepte toutes les requêtes sauf :
     * - _next/static (fichiers statiques générés par le build)
     * - _next/image (optimisation d'images Next.js)
     * - favicon.ico (icône de site)
     * - Fichiers statiques avec extension (svg, png, jpg, webp, css, js, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|css|js)$).*)',
  ],
};
