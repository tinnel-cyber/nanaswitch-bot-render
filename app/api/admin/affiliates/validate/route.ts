import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !body.affiliate_id || !body.decision) {
      return NextResponse.json(
        { error: 'Paramètres manquants : affiliate_id et decision (approved | rejected).' },
        { status: 400 }
      );
    }

    const { affiliate_id, decision } = body;
    if (decision !== 'approved' && decision !== 'rejected') {
      return NextResponse.json({ error: 'Décision invalide.' }, { status: 400 });
    }

    const supabase = getSupabaseClient(true);

    const { data, error } = await supabase
      .from('tenant_affiliates')
      .update({
        status: decision,
        updated_at: new Date().toISOString(),
      })
      .eq('id', affiliate_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Affilié ${decision === 'approved' ? 'validé avec succès' : 'rejeté'}.`,
      affiliate: data,
    });
  } catch (err: any) {
    console.error('[API Admin Affiliate Validation] Erreur:', err);
    return NextResponse.json({ error: err?.message || 'Erreur interne' }, { status: 500 });
  }
}
