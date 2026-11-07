import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !body.storeId) {
      return NextResponse.json(
        { error: 'Paramètre storeId requis.' },
        { status: 400 }
      );
    }

    const {
      storeId,
      userId = storeId,
      action = 'approve', // 'approve' | 'reject' | 'pending'
      rejectionReason = '',
      adminEmail = 'Direction de la Conformité Nanasore',
      pricingModel,
      monetizationModel
    } = body;

    const supabase = getSupabaseClient(true);
    const now = new Date().toISOString();
    const isApproved = action === 'approve';
    const isRejected = action === 'reject';

    // 1. Mettre à jour Supabase table account_activations
    const { error: actErr } = await supabase
      .from('account_activations')
      .update({
        status: isApproved ? 'approved' : isRejected ? 'rejected' : 'pending',
        kyc_status: isApproved ? 'full' : isRejected ? 'none' : 'light',
        admin_notes: isRejected ? rejectionReason : null,
        reviewed_by: adminEmail,
        reviewed_at: now,
        updated_at: now
      })
      .or(`user_id.eq.${userId},organization_id.eq.${storeId}`);

    if (actErr) {
      console.warn('[API ADMIN KYC VALIDATE] Notice account_activations:', actErr.message);
    }

    // 2. Mettre à jour Supabase table profiles (Chaque tenant merchant profile)
    const profileUpdates: Record<string, any> = {
      kyc_status: isApproved ? 'full' : isRejected ? 'none' : 'light',
      role: isApproved ? 'vendor' : 'merchant',
      updated_at: now
    };
    if (pricingModel || monetizationModel) {
      profileUpdates.pricing_model = pricingModel || monetizationModel;
    }

    const { error: profErr } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .or(`id.eq.${userId},organization_id.eq.${storeId}`);

    if (profErr) {
      console.warn('[API ADMIN KYC VALIDATE] Notice profiles:', profErr.message);
    }

    // 3. Mettre à jour Supabase table organizations
    const { error: orgErr } = await supabase
      .from('organizations')
      .update({
        status: isApproved ? 'APPROVED' : isRejected ? 'SUSPENDED' : 'PENDING',
        updated_at: now
      })
      .eq('id', storeId);

    if (orgErr) {
      console.warn('[API ADMIN KYC VALIDATE] Notice organizations:', orgErr.message);
    }

    // 4. Mettre à jour les métadonnées Supabase Auth de l'utilisateur si possible
    let authUpdated = false;
    try {
      if (supabase.auth && (supabase.auth as any).admin && userId && !userId.startsWith('store-')) {
        const { error: authErr } = await (supabase.auth as any).admin.updateUserById(userId, {
          user_metadata: {
            kyc_status: isApproved ? 'verified' : isRejected ? 'rejected' : 'pending',
            is_verified: isApproved,
            store_approval_status: isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : 'PENDING',
            rejection_reason: isRejected ? rejectionReason : null,
            validated_at: isApproved ? now : null
          }
        });
        if (!authErr) {
          authUpdated = true;
        } else {
          console.info('[API ADMIN KYC VALIDATE] Supabase Auth update notice:', authErr.message);
        }
      }
    } catch (e) {
      console.info('[API ADMIN KYC VALIDATE] Supabase Auth Admin non applicable:', e);
    }

    return NextResponse.json({
      success: true,
      action,
      storeId,
      userId,
      authUpdated,
      reviewedAt: now,
      message: isApproved 
        ? 'Dossier KYC validé avec succès. Profil et compte marchand débloqués.'
        : isRejected
          ? 'Dossier KYC rejeté. Motif notifié au marchand.'
          : 'Dossier KYC remis en attente.'
    });

  } catch (error: any) {
    console.error('[API ADMIN KYC VALIDATE] Exception:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur interne lors de la validation KYC.' },
      { status: 500 }
    );
  }
}
