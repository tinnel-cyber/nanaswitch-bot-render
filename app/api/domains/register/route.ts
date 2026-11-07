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
    let ownershipVerification: any = null;
    let sslVerificationData: any = null;

    if (cfApiToken && cfZoneId) {
      const cfUrl = `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/custom_hostnames`;

      // Payload Cloudflare Custom Hostname conforme Cloudflare for SaaS
      // avec gestion de la règle > 64 caractères (cloudflare_branding: true)
      const cfPayload = {
        hostname: cleanDomain,
        ssl: {
          method: 'txt',
          type: 'dv',
          settings: {
            min_tls_version: '1.2',
            http2: 'on',
          },
          cloudflare_branding: true,
        },
        custom_metadata: {
          tenant_id: tenantId,
          app: 'nanasore',
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
      ownershipVerification = cfData.result?.ownership_verification || null;
      sslVerificationData = cfData.result?.ssl || null;

      // Temporisation de 1500ms puis requête GET pour extraction des jetons DCV et records SSL
      if (cfHostnameId) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1500));

          const cfGetUrl = `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/custom_hostnames/${cfHostnameId}`;
          const cfGetRes = await fetch(cfGetUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${cfApiToken}`,
            },
          });

          if (cfGetRes.ok) {
            const cfGetData = await cfGetRes.json().catch(() => ({}));
            if (cfGetData.result) {
              cfStatus = cfGetData.result.status || cfStatus;
              ownershipVerification = cfGetData.result.ownership_verification || ownershipVerification;
              sslVerificationData = cfGetData.result.ssl || sslVerificationData;
            }
          }
        } catch (getErr) {
          console.warn('[Cloudflare DCV GET Warning]', getErr);
        }
      }
    } else {
      // Mode simulation sécurisé si les clés Cloudflare ne sont pas encore définies
      console.warn('⚠️ Variables CLOUDFLARE_API_TOKEN ou CLOUDFLARE_ZONE_ID manquantes. Mode simulation activé pour le dev.');
      cfHostnameId = `mock_cf_${Date.now()}`;
      cfStatus = 'pending';
      ownershipVerification = {
        type: 'txt',
        name: `_cf-custom-hostname.${cleanDomain}`,
        value: `mock_verification_token_${Date.now()}`,
      };
      sslVerificationData = {
        status: 'pending_validation',
        method: 'txt',
        type: 'dv',
        validation_records: [
          {
            txt_name: `_ca3-${cleanDomain.slice(0, 10)}.${cleanDomain}`,
            txt_value: `dcv_mock_token_${Date.now()}`,
          },
        ],
      };
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
      console.warn('[Supabase update error]', updateError.message);
      // Si la table tenants n'est pas encore appliquée sur le serveur Supabase distant
      if (updateError.message.includes('tenants')) {
        return NextResponse.json({
          success: true,
          notice: 'Domaine enregistré sur Cloudflare. Veuillez exécuter le schéma database/schema_multitenant.sql sur Supabase pour finaliser la persistance.',
          tenant_id: tenantId,
          custom_domain: cleanDomain,
          routing_type: 'custom',
          domain_status: cfStatus,
          cloudflare_hostname_id: cfHostnameId,
          dns_instructions: {
            cname: {
              record_type: 'CNAME',
              host: cleanDomain,
              target: cfFallbackOrigin,
              description: `Pointez le domaine ou sous-domaine vers '${cfFallbackOrigin}'`,
            },
            ownership_verification: ownershipVerification,
            ssl_dcv: sslVerificationData?.validation_records || sslVerificationData,
          },
        });
      }

      return NextResponse.json(
        { error: 'Domaine enregistré sur Cloudflare mais échec de la mise à jour Supabase.', details: updateError.message },
        { status: 500 }
      );
    }

    // 5. Retourne les instructions DNS structurées à afficher au marchand
    return NextResponse.json({
      success: true,
      message: `Domaine '${cleanDomain}' enregistré avec succès en attente de validation DNS.`,
      tenant_id: tenantId,
      custom_domain: cleanDomain,
      routing_type: 'custom',
      domain_status: cfStatus,
      cloudflare_hostname_id: cfHostnameId,
      dns_instructions: {
        cname: {
          record_type: 'CNAME',
          host: cleanDomain,
          target: cfFallbackOrigin,
          description: `Créez un enregistrement DNS de type CNAME pointant '${cleanDomain}' vers '${cfFallbackOrigin}'.`,
        },
        ownership_verification: ownershipVerification,
        ssl_dcv: sslVerificationData?.validation_records || sslVerificationData,
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
