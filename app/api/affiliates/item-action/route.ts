import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

interface ItemAffiliationRequest {
  tenant_id: string;
  item_type: 'course' | 'product' | 'webinar' | 'live_shopping';
  item_id: string;
  item_title: string;
  affiliate_code: string;
  is_new_applicant: boolean;
  applicant_data?: {
    full_name?: string;
    email?: string;
    whatsapp_number?: string;
    payout_channel?: string;
    payout_account_details?: string;
  };
}

export async function POST(request: Request) {
  try {
    const body: ItemAffiliationRequest = await request.json().catch(() => null);

    if (!body || !body.tenant_id || !body.item_id || !body.affiliate_code) {
      return NextResponse.json(
        { error: 'Paramètres manquants : tenant_id, item_id et affiliate_code sont obligatoires.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(true);

    // Appel de la procédure stockée RPC PostgreSQL
    const { data, error } = await supabase.rpc('request_item_affiliation', {
      p_tenant_id: body.tenant_id,
      p_item_type: body.item_type,
      p_item_id: body.item_id,
      p_item_title: body.item_title,
      p_affiliate_code: body.affiliate_code.trim().toUpperCase(),
      p_is_new_applicant: body.is_new_applicant ?? false,
      p_applicant_data: body.applicant_data || {},
    });

    if (error) {
      console.error('[API Item Affiliation] Erreur RPC:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data?.success) {
      return NextResponse.json({ error: data?.error || 'Action impossible' }, { status: 400 });
    }

    // Réponse avec le ciblage exact demandé par le client :
    // - Si validation_target === 'super_admin' -> envoyé au dashboard Super Admin
    // - Si validation_target === 'tenant' -> envoyé au tenant custom whitelabel
    return NextResponse.json({
      success: true,
      affiliate_code: data.affiliate_code,
      validation_target: data.validation_target,
      tenant_routing_type: data.tenant_routing_type,
      tenant_name: data.tenant_name,
      status: data.status,
      commission_rate: data.commission_rate,
      message:
        data.validation_target === 'super_admin'
          ? 'Demande transmise au Dashboard Super Admin Nanasore pour validation officielle.'
          : 'Compte affilié associé directement au Tenant Marque Blanche.',
    });
  } catch (err: any) {
    console.error('[API Item Affiliation] Exception:', err);
    return NextResponse.json({ error: err?.message || 'Erreur interne du serveur' }, { status: 500 });
  }
}
