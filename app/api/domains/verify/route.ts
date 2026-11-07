import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

interface VerifyDomainBody {
  tenant_id: string;
}

/**
 * Endpoint : POST /api/domains/verify
 * Vérifie l'état d'activation DNS & SSL d'un Custom Hostname sur Cloudflare
 * et synchronise le statut 'active' dans la base de données Supabase.
 */
export async function POST(request: Request) {
  try {
    const body: VerifyDomainBody = await request.json().catch(() => null);

    if (!body || !body.tenant_id) {
      return NextResponse.json(
        { error: 'Le champ tenant_id est obligatoire.' },
        { status: 400 }
      );
    }

    const tenantId = body.tenant_id;
    const supabase = getSupabaseClient(true);

    // 1. Récupération du tenant et de son cloudflare_hostname_id
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug, custom_domain, domain_status, cloudflare_hostname_id')
      .eq('id', tenantId)
      .maybeSingle();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: `Tenant introuvable avec l'ID '${tenantId}'.` },
        { status: 404 }
      );
    }

    if (!tenant.custom_domain) {
      return NextResponse.json(
        { error: 'Aucun domaine personnalisé n\'est associé à ce tenant.' },
        { status: 400 }
      );
    }

    const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
    const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
    const hostnameId = tenant.cloudflare_hostname_id;

    let isDomainActive = false;
    let cfStatus = tenant.domain_status || 'pending';
    let cfHostnameData: any = null;

    if (cfApiToken && cfZoneId && hostnameId && !hostnameId.startsWith('mock_')) {
      const cfGetUrl = `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/custom_hostnames/${hostnameId}`;
      const cfGetRes = await fetch(cfGetUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfApiToken}`,
        },
      });

      if (cfGetRes.ok) {
        const json = await cfGetRes.json().catch(() => ({}));
        cfHostnameData = json.result;
        cfStatus = cfHostnameData?.status || 'pending';
        const sslStatus = cfHostnameData?.ssl?.status;

        // Le domaine est considéré actif si le hostname Cloudflare et le SSL sont validés
        if (cfStatus === 'active' && (sslStatus === 'active' || sslStatus === 'pending_deployment')) {
          isDomainActive = true;
        }
      }
    } else {
      // Mode simulation dev
      cfStatus = 'pending';
    }

    const newStatus = isDomainActive ? 'active' : cfStatus === 'active' ? 'pending' : (cfStatus || 'pending');

    // 2. Mise à jour de la table tenants si le statut a évolué
    if (newStatus !== tenant.domain_status) {
      await supabase
        .from('tenants')
        .update({
          domain_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenantId);
    }

    return NextResponse.json({
      success: true,
      tenant_id: tenantId,
      custom_domain: tenant.custom_domain,
      domain_status: newStatus,
      is_active: isDomainActive,
      cloudflare_details: cfHostnameData || {
        hostname: tenant.custom_domain,
        status: cfStatus,
        notice: 'En attente de propagation des DNS',
      },
    });
  } catch (err: any) {
    console.error('[API Verify Domain] Exception:', err);
    return NextResponse.json(
      { error: 'Erreur serveur interne lors de la vérification DNS.', message: err?.message },
      { status: 500 }
    );
  }
}

/**
 * Endpoint : GET /api/domains/verify?tenantId=xxx
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || searchParams.get('tenant_id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Le paramètre tenantId est obligatoire.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(true);

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug, custom_domain, domain_status, cloudflare_hostname_id, dns_records')
      .eq('id', tenantId)
      .maybeSingle();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: `Tenant introuvable avec l'ID '${tenantId}'.` },
        { status: 404 }
      );
    }

    if (!tenant.custom_domain) {
      return NextResponse.json(
        { error: 'Aucun domaine personnalisé n\'est associé à ce tenant.' },
        { status: 400 }
      );
    }

    const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
    const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
    const hostnameId = tenant.cloudflare_hostname_id;

    let isDomainActive = false;
    let cfStatus = tenant.domain_status || 'pending';
    let cfHostnameData: any = null;

    if (cfApiToken && cfZoneId && hostnameId && !hostnameId.startsWith('mock_')) {
      const cfGetUrl = `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/custom_hostnames/${hostnameId}`;
      const cfGetRes = await fetch(cfGetUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfApiToken}`,
        },
      });

      if (cfGetRes.ok) {
        const json = await cfGetRes.json().catch(() => ({}));
        cfHostnameData = json.result;
        cfStatus = cfHostnameData?.status || 'pending';
        const sslStatus = cfHostnameData?.ssl?.status;

        if (cfStatus === 'active' && (sslStatus === 'active' || sslStatus === 'pending_deployment')) {
          isDomainActive = true;
        }
      }
    }

    const newStatus = isDomainActive ? 'active' : (cfStatus || 'pending');

    if (newStatus !== tenant.domain_status) {
      await supabase
        .from('tenants')
        .update({
          domain_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenantId);
    }

    return NextResponse.json({
      success: true,
      tenant_id: tenantId,
      custom_domain: tenant.custom_domain,
      domain_status: newStatus,
      is_active: isDomainActive,
      dns_records: tenant.dns_records || {},
      cloudflare_details: cfHostnameData || {
        hostname: tenant.custom_domain,
        status: cfStatus,
        notice: isDomainActive ? 'Domaine actif et sécurisé' : 'En attente de propagation DNS',
      },
    });
  } catch (err: any) {
    console.error('[API GET Verify Domain] Exception:', err);
    return NextResponse.json(
      { error: 'Erreur serveur interne lors de la vérification DNS.', message: err?.message },
      { status: 500 }
    );
  }
}
