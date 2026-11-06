import { NextResponse } from 'next/server';
import { getTenantByIdentifier } from '@/lib/tenants';

interface RouteProps {
  params: Promise<{ slug: string }>;
}

/**
 * Route de Parrainage & Affiliation Nanasore : GET /ref/[slug]
 * 
 * Intercepte le clic sur "Propulsé par Nanasore", enregistre l'empreinte d'affiliation
 * dans un cookie sécurisé (30 jours) et redirige vers la page d'inscription.
 */
export async function GET(request: Request, { params }: RouteProps) {
  const { slug } = await params;
  const cleanSlug = decodeURIComponent(slug).trim().toLowerCase();

  const url = new URL(request.url);
  const destination = url.searchParams.get('to') || '/auth/register';

  // Résolution du tenant parrain
  const referrerTenant = await getTenantByIdentifier(cleanSlug, false);

  const redirectUrl = new URL(destination, request.url);
  redirectUrl.searchParams.set('ref', cleanSlug);

  if (referrerTenant) {
    redirectUrl.searchParams.set('partner', referrerTenant.name);
  }

  const response = NextResponse.redirect(redirectUrl);

  // Positionnement du cookie d'affiliation (Valable 30 jours = 2 592 000 secondes)
  const affiliateData = JSON.stringify({
    slug: cleanSlug,
    tenant_id: referrerTenant?.id || null,
    timestamp: Date.now(),
  });

  response.cookies.set('nanasore_affiliate_ref', cleanSlug, {
    path: '/',
    maxAge: 2592000,
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  if (referrerTenant?.id) {
    response.cookies.set('nanasore_referrer_tenant_id', referrerTenant.id, {
      path: '/',
      maxAge: 2592000,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  return response;
}
