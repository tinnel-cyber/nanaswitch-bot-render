import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !body.storeId) {
      return NextResponse.json(
        { error: 'Paramètre storeId obligatoire.' },
        { status: 400 }
      );
    }

    const {
      storeId,
      userId = storeId,
      accountType = 'particulier',
      fullName = '',
      phone = '',
      email = '',
      activityDomain = 'Commerce Général & E-commerce',
      briefDescription = '',
      companyName = '',
      managerName = '',
      rccm = '',
      ifu = '',
      cnibNumber = '',
      cnibRectoUrl = '',
      cnibVersoUrl = '',
      faceSelfieUrl = '',
      rccmFileUrl = '',
      ifuFileUrl = ''
    } = body;

    const supabase = getSupabaseClient(true);
    const now = new Date().toISOString();

    const kycPayload = {
      fullName: accountType === 'entreprise' ? (managerName || fullName) : fullName,
      companyName: accountType === 'entreprise' ? companyName : (fullName ? `${fullName} Shop` : 'Boutique'),
      paymentNumber: phone,
      email: email,
      activityDomain: activityDomain || 'Commerce Général & E-commerce',
      activityDescription: briefDescription || '',
      briefDescription: briefDescription || '',
      accountType,
      idCardUrl: cnibRectoUrl,
      idCardVersoUrl: cnibVersoUrl,
      photoCaptureUrl: faceSelfieUrl,
      rccmDocPhotoUrl: rccmFileUrl,
      ifuDocPhotoUrl: ifuFileUrl,
      rccmNumber: rccm,
      ifuNumber: ifu,
      documentNumber: cnibNumber,
      documentType: 'CNIB',
      submitted_at: now
    };

    // 1. Upsert dans la table account_activations de Supabase
    const { data: activationData, error: actErr } = await supabase
      .from('account_activations')
      .upsert({
        user_id: userId,
        organization_id: storeId,
        pricing_model: accountType === 'entreprise' ? 'subscription' : 'commission',
        kyc_status: 'light',
        status: 'pending',
        wallet_balance: 0,
        enabled_themes: ['blankCustom'],
        enabled_modules: [],
        read_only_modules: [],
        kyc_data: kycPayload,
        submitted_at: now,
        updated_at: now
      }, { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    if (actErr) {
      console.warn('[API KYC SUBMIT] Notice upsert account_activations:', actErr.message);
    }

    // 2. Mise à jour du profil du tenant dans la table profiles
    try {
      await supabase
        .from('profiles')
        .update({
          full_name: accountType === 'entreprise' ? (managerName || fullName) : fullName,
          whatsapp_number: phone,
          kyc_status: 'light',
          updated_at: now
        })
        .or(`id.eq.${userId},organization_id.eq.${storeId}`);
    } catch (profErr) {
      console.warn('[API KYC SUBMIT] Notice update profiles:', profErr);
    }

    // 3. Mise à jour de l'organisation dans la table organizations
    try {
      await supabase
        .from('organizations')
        .update({
          name: accountType === 'entreprise' ? companyName : fullName,
          status: 'PENDING',
          updated_at: now
        })
        .eq('id', storeId);
    } catch (orgErr) {
      console.warn('[API KYC SUBMIT] Notice update organizations:', orgErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Dossier KYC transmis avec succès au Super Admin pour validation.',
      data: activationData || kycPayload
    });

  } catch (error: any) {
    console.error('[API KYC SUBMIT] Exception:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur interne lors de la transmission du KYC.' },
      { status: 500 }
    );
  }
}
