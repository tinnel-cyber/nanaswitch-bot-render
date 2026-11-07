import { Express, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wsxnznobeefrsoicjqte.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_bUKrC8_WEvMbKwE5lUAZ2w_LGg2F5Ro';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function normalizeDomain(domain: string): string {
  return (domain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .trim();
}

/**
 * Attache les routes /api/domains/register et /api/domains/verify au serveur Express (Render)
 */
export function attachCustomDomainsRoutes(app: Express): void {
  /**
   * POST /api/domains/register
   */
  app.post('/api/domains/register', async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.body?.tenantId || req.body?.tenant_id;
      const rawDomain = req.body?.domain || req.body?.custom_domain;

      if (!tenantId || !rawDomain) {
        res.status(400).json({ error: 'Les champs tenantId (ou tenant_id) et domain (ou custom_domain) sont obligatoires.' });
        return;
      }

      const cleanDomain = normalizeDomain(rawDomain);
      const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
      if (!domainRegex.test(cleanDomain) || cleanDomain.includes('localhost')) {
        res.status(400).json({ error: `Le nom de domaine '${cleanDomain}' n'est pas un domaine valide.` });
        return;
      }

      const supabase = getSupabase();

      // 1. Vérification d'unicité
      const { data: existingDomainTenant } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('custom_domain', cleanDomain)
        .neq('id', tenantId)
        .maybeSingle();

      if (existingDomainTenant) {
        res.status(409).json({ error: `Le domaine '${cleanDomain}' est déjà associé à un autre tenant (${existingDomainTenant.name}).` });
        return;
      }

      // 2. Appel Cloudflare Custom Hostnames
      const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
      const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
      const cfFallbackOrigin = process.env.CLOUDFLARE_FALLBACK_ORIGIN || 'cname.nanasore.com';

      let cfHostnameId: string | null = null;
      let cfStatus = 'pending';
      let ownershipVerification: any = null;
      let sslVerificationData: any = null;

      if (cfApiToken && cfZoneId) {
        const cfUrl = `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/custom_hostnames`;
        const cfPayload = {
          hostname: cleanDomain,
          ssl: {
            method: 'txt',
            type: 'dv',
            settings: {
              min_tls_version: '1.2',
              http2: 'on',
              tls_1_3: 'on',
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
          const errorMsg = cfData?.errors?.[0]?.message || 'Erreur Cloudflare';
          res.status(cfResponse.status || 502).json({
            error: `Échec Cloudflare Custom Hostname : ${errorMsg}`,
            cloudflare_errors: cfData?.errors,
          });
          return;
        }

        cfHostnameId = cfData.result?.id || null;
        cfStatus = cfData.result?.status || 'pending';
        ownershipVerification = cfData.result?.ownership_verification || null;
        sslVerificationData = cfData.result?.ssl || null;

        // Temporisation 1.5s + GET
        if (cfHostnameId) {
          try {
            await new Promise((r) => setTimeout(r, 1500));
            const cfGetRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/custom_hostnames/${cfHostnameId}`, {
              headers: { Authorization: `Bearer ${cfApiToken}` },
            });
            if (cfGetRes.ok) {
              const cfGetData = await cfGetRes.json().catch(() => ({}));
              if (cfGetData.result) {
                cfStatus = cfGetData.result.status || cfStatus;
                ownershipVerification = cfGetData.result.ownership_verification || ownershipVerification;
                sslVerificationData = cfGetData.result.ssl || sslVerificationData;
              }
            }
          } catch (e) {
            console.warn('[CF GET Warning]', e);
          }
        }
      } else {
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

      const dnsRecordsPayload = {
        cname: {
          type: 'CNAME',
          name: cleanDomain.includes('.') && cleanDomain.split('.').length > 2 ? cleanDomain.split('.')[0] : '@',
          value: cfFallbackOrigin,
        },
        ownership: {
          type: 'TXT',
          name: ownershipVerification?.name || `_cf-custom-hostname.${cleanDomain}`,
          value: ownershipVerification?.value || '',
        },
        ssl_dcv: {
          type: 'TXT',
          name: sslVerificationData?.validation_records?.[0]?.txt_name || sslVerificationData?.validation_records?.[0]?.name || '',
          value: sslVerificationData?.validation_records?.[0]?.txt_value || sslVerificationData?.validation_records?.[0]?.value || '',
        },
      };

      // 3. Mise à jour Supabase
      await supabase
        .from('tenants')
        .update({
          custom_domain: cleanDomain,
          routing_type: 'custom',
          domain_status: 'pending',
          cloudflare_hostname_id: cfHostnameId,
          dns_records: dnsRecordsPayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenantId);

      res.status(200).json({
        success: true,
        message: `Domaine '${cleanDomain}' enregistré avec succès en attente de validation DNS.`,
        tenant_id: tenantId,
        custom_domain: cleanDomain,
        routing_type: 'custom',
        domain_status: cfStatus,
        cloudflare_hostname_id: cfHostnameId,
        dns_records: dnsRecordsPayload,
        dns_instructions: {
          cname: {
            record_type: 'CNAME',
            host: cleanDomain,
            target: cfFallbackOrigin,
            description: `Créez un enregistrement CNAME pointant '${cleanDomain}' vers '${cfFallbackOrigin}'.`,
          },
          ownership_verification: ownershipVerification,
          ssl_dcv: sslVerificationData?.validation_records || sslVerificationData,
        },
      });
    } catch (err: any) {
      console.error('[API Express domains/register] Exception:', err);
      res.status(500).json({ error: 'Erreur serveur interne', message: err?.message });
    }
  });

  /**
   * Helper unifié de vérification de domaine
   */
  async function handleVerify(tenantId: string, res: Response) {
    try {
      if (!tenantId) {
        res.status(400).json({ error: 'tenantId (ou tenant_id) est requis.' });
        return;
      }

      const supabase = getSupabase();
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, custom_domain, domain_status, cloudflare_hostname_id, dns_records')
        .eq('id', tenantId)
        .maybeSingle();

      if (!tenant || !tenant.custom_domain) {
        res.status(404).json({ error: 'Tenant ou domaine introuvable.' });
        return;
      }

      const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
      const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
      const hostnameId = tenant.cloudflare_hostname_id;

      let isDomainActive = false;
      let cfStatus = tenant.domain_status || 'pending';
      let cfHostnameData: any = null;

      if (cfApiToken && cfZoneId && hostnameId && !hostnameId.startsWith('mock_')) {
        const cfGetRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/custom_hostnames/${hostnameId}`, {
          headers: { Authorization: `Bearer ${cfApiToken}` },
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
          .update({ domain_status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', tenantId);
      }

      res.status(200).json({
        success: true,
        tenant_id: tenantId,
        custom_domain: tenant.custom_domain,
        domain_status: newStatus,
        is_active: isDomainActive,
        dns_records: tenant.dns_records || {},
        cloudflare_details: cfHostnameData || {
          hostname: tenant.custom_domain,
          status: cfStatus,
        },
      });
    } catch (err: any) {
      console.error('[API Express domains/verify] Exception:', err);
      res.status(500).json({ error: 'Erreur vérification DNS', message: err?.message });
    }
  }

  /**
   * POST /api/domains/verify
   */
  app.post('/api/domains/verify', async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.body?.tenantId || req.body?.tenant_id;
    await handleVerify(tenantId, res);
  });

  /**
   * GET /api/domains/verify
   */
  app.get('/api/domains/verify', async (req: Request, res: Response): Promise<void> => {
    const tenantId = (req.query?.tenantId || req.query?.tenant_id) as string;
    await handleVerify(tenantId, res);
  });
}
