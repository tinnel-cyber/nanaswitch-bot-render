import { NextResponse } from 'next/server';
import { registerTenantAffiliateApplicant } from '@/lib/affiliate';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !body.tenant_id || !body.full_name || !body.email || !body.affiliate_code) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants (tenant_id, full_name, email, affiliate_code).' },
        { status: 400 }
      );
    }

    const result = await registerTenantAffiliateApplicant({
      tenantId: body.tenant_id,
      fullName: body.full_name,
      email: body.email,
      whatsappNumber: body.whatsapp_number || '',
      affiliateCode: body.affiliate_code,
      payoutChannel: body.payout_channel || 'Wave',
      payoutAccountDetails: body.payout_account_details || '',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Compte affilié créé avec succès.',
      affiliate: result.affiliate,
    });
  } catch (err: any) {
    console.error('[API Register Tenant Affiliate] Erreur:', err);
    return NextResponse.json({ error: err?.message || 'Erreur interne du serveur' }, { status: 500 });
  }
}
