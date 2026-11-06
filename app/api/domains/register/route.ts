import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

interface RegisterDomainBody {
  tenant_id: string;
  custom_domain: string;
}

/**
 * Nettoie et valide la structure du nom de domaine
 */
function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .trim();
}

/**
 * Route Handler Next.js (App Router) : Enregistrement d'un Domaine Personnalisé
 * via l'API Cloudflare Custom Hostnames (Cloudflare for SaaS).
 *
 * Endpoint : POST /api/domains/register
 */
export async function POST(request: Request) {
  try {
    const body: RegisterDomainBody = await request.json().catch(() => null);

    if (!body || !body.tenant_id || !body.custom_domain) {
      return NextResponse.json(
        { error: 'Les champs tenant_id et custom_domain sont obligatoires.' },
        { status: 400 }
      );
    }

    const tenantId = body.tenant_id;
    const cleanDomain = normalizeDomain(body.custom_domain);

    // Validation syntaxique élémentaire du domaine
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
    if (!domainRegex.test(cleanDomain) || cleanDomain.includes('localhost')) {
      return NextResponse.json(
        { error: `Le nom de domaine '${cleanDomain}' n'est pas un domaine valide.` },
        { status: 400 }
      );
    }

    // 1. Vérification de l'existence du tenant dans Supabase
    const supabase = getSupabaseClient(true);
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug, custom_domain, domain_status')
      .eq('id', tenantId)
      .maybeSingle();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: `Tenant introuvable avec l'ID '${tenantId}'.`, details: tenantError?.message },
        { status: 404 }
      );
    }

    // 2. Vérification d'unicité du domaine dans la base
    const { data: existingDomainTenant } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('custom_domain', cleanDomain)
      .neq('id', tenantId)
      .maybeSingle();

    if (existingDomainTenant) {
      return NextResponse.json(
        { error: `Le domaine '${cleanDomain}' est déjà associé à un autre tenant (${existingDomainTenant.name}).` },
        { status: 409 }
      );
    }

    // 3. Appel de l'API Cloudflare Custom Hostnames (Cloudflare for SaaS)
    const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
    const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
    const cfFallbackOrigin = process.env.CLOUDFLARE_FALLBACK_ORIGIN || 'cname.nanasore.com';

    let cfHostnameId: string | null = null;
    let cfStatus = 'pending';
    let sslVerificationData: any = null;

    if (cfApiToken && cfZoneId) {
      const cfUrl = `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/custom_hostnames`;

      const cfPayload = {
        hostname: cleanDomain,
        ssl: {
          method: 'http',
          type: 'dv',
          settings: {
            min_tls_version: '1.2',
          },
        },
      };

      const cfResponse = await fetch(cfUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfApiToken}`,
        },
        body: JSON.stringify(cfPayload),
      });

      const cfData = await cfResponse.json().catch(() => ({}));

      if (!cfResponse.ok || !cfData.success) {
        const errorMsg = cfData?.errors?.[0]?.message || 'Erreur inconnue lors de l\'enregistrement Cloudflare';
        return NextResponse.json(
          {
            error: `Échec de l'enregistrement Cloudflare Custom Hostname : ${errorMsg}`,
            cloudflare_errors: cfData?.errors,
          },
          { status: cfResponse.status || 502 }
        );
      }

      cfHostnameId = cfData.result?.id || null;
      cfStatus = cfData.result?.status || 'pending';
      sslVerificationData = cfData.result?.ssl || null;
    } else {
      // Mode simulation sécurisé si les clés Cloudflare ne sont pas encore définies dans l'environnement de dev
      console.warn('⚠️ Variables CLOUDFLARE_API_TOKEN ou CLOUDFLARE_ZONE_ID manquantes. Mode simulation activé pour le dev.');
      cfHostnameId = `mock_cf_${Date.now()}`;
      cfStatus = 'pending';
    }

    // 4. Mise à jour du tenant dans Supabase avec le nouveau domaine et statut
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        custom_domain: cleanDomain,
        routing_type: 'custom',
        domain_status: 'pending',
        cloudflare_hostname_id: cfHostnameId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Domaine enregistré sur Cloudflare mais échec de la mise à jour Supabase.', details: updateError.message },
        { status: 500 }
      );
    }

    // 5. Retourne les instructions DNS à afficher au marchand
    return NextResponse.json({
      success: true,
      message: `Domaine '${cleanDomain}' enregistré avec succès en attente de validation DNS.`,
      tenant_id: tenantId,
      custom_domain: cleanDomain,
      routing_type: 'custom',
      domain_status: cfStatus,
      cloudflare_hostname_id: cfHostnameId,
      dns_instructions: {
        record_type: 'CNAME',
        host: cleanDomain,
        target: cfFallbackOrigin,
        description: `Créez un enregistrement DNS de type CNAME pointant vers '${cfFallbackOrigin}'.`,
        ssl_verification: sslVerificationData,
      },
    });
  } catch (err: any) {
    console.error('[API Register Domain] Exception:', err);
    return NextResponse.json(
      { error: 'Erreur serveur interne lors du traitement.', message: err?.message },
      { status: 500 }
    );
  }
}
