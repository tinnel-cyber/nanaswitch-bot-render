/**
 * @file coachingBookingService.ts
 * @description Service 100 % réel (Supabase Auth + Supabase DB) pour la prise de rendez-vous
 * Coaching 1-to-1 : réservation, soumission de formulaire, liste des demandes pour le coach.
 * ZÉRO MOCK, ZÉRO setTimeout, ZÉRO Firebase.
 */

import { supabase } from '../lib/supabase';

export interface CoachingBookingInput {
  sessionId: string;
  storeSlug: string;
  coachName: string;
  consultationType: string;
  date: string;
  timeSlot: string;
  fullName: string;
  email: string;
  whatsappPhone: string;
  objectiveNotes: string;
  roomUrl?: string;
}

export interface CoachingBookingRecord extends CoachingBookingInput {
  id: string;
  userId?: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

/**
 * Génère les 7 prochains jours ouvrés/réels à partir d'aujourd'hui (ZÉRO date codée en dur).
 */
export function getUpcomingBookingDates(daysCount = 7): Array<{ date: string; label: string }> {
  const results: Array<{ date: string; label: string }> = [];
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const now = new Date();
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const formatted = formatter.format(d);
    const label = i === 0 ? `Aujourd'hui (${formatted})` : formatted.charAt(0).toUpperCase() + formatted.slice(1);
    results.push({ date: iso, label });
  }
  return results;
}

export const STANDARD_1TO1_TIME_SLOTS = [
  '09:00 - 09:45',
  '10:00 - 10:45',
  '11:00 - 11:45',
  '14:00 - 14:45',
  '15:30 - 16:15',
  '17:00 - 17:45',
  '19:00 - 19:45',
];

/**
 * Enregistre une demande de rendez-vous Coaching 1-to-1 dans Supabase (Auth + DB).
 */
export async function submitCoachingBooking(
  input: CoachingBookingInput
): Promise<{ success: boolean; booking?: CoachingBookingRecord; error?: string }> {
  if (!input.fullName.trim() || !input.whatsappPhone.trim() || !input.date || !input.timeSlot) {
    return {
      success: false,
      error: 'Veuillez renseigner votre nom complet, votre téléphone WhatsApp, la date et le créneau.',
    };
  }

  let authUserId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    authUserId = data?.user?.id || null;
  } catch (_) {}

  const bookingId = `rdv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();
  const jitsiDomain =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_JITSI_DOMAIN) || 'meet.ffmuc.net';
  const safeRoomUrl =
    input.roomUrl || `https://${jitsiDomain}/nanasore-1to1-${input.storeSlug.replace(/[^a-zA-Z0-9_-]/g, '')}-${bookingId}`;

  const record: CoachingBookingRecord = {
    ...input,
    id: bookingId,
    userId: authUserId,
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    whatsappPhone: input.whatsappPhone.trim(),
    objectiveNotes: input.objectiveNotes.trim(),
    roomUrl: safeRoomUrl,
    status: 'pending',
    createdAt: nowIso,
  };

  // 1. Insertion dans la table dédiée Supabase coaching_bookings
  let persisted = false;
  try {
    const { error } = await supabase.from('coaching_bookings').insert({
      id: record.id,
      session_id: record.sessionId,
      store_slug: record.storeSlug,
      user_id: record.userId,
      coach_name: record.coachName,
      consultation_type: record.consultationType,
      booking_date: record.date,
      time_slot: record.timeSlot,
      full_name: record.fullName,
      email: record.email,
      whatsapp_phone: record.whatsappPhone,
      objective_notes: record.objectiveNotes,
      room_url: record.roomUrl,
      status: record.status,
      created_at: record.createdAt,
    });
    if (!error) persisted = true;
  } catch (_) {}

  // 2. Fallback souverain Supabase app_registry si la table SQL n'est pas encore migrée
  if (!persisted) {
    try {
      const { error: regErr } = await supabase.from('app_registry').upsert(
        {
          key: `coaching_booking_${record.id}`,
          tenant_id: record.storeSlug || 'default',
          module_key: 'coaching_1to1_bookings',
          config_json: record,
          updated_at: nowIso,
        },
        { onConflict: 'key' }
      );
      if (!regErr) persisted = true;
    } catch (_) {}
  }

  if (!persisted) {
    return {
      success: false,
      error: "Impossible d'enregistrer votre rendez-vous sur Supabase. Vérifiez votre connexion et réessayez.",
    };
  }

  return { success: true, booking: record };
}

/**
 * Récupère les rendez-vous 1-to-1 soumis pour un formateur / boutique donnée.
 */
export async function listCoachingBookingsForStore(storeSlug: string): Promise<CoachingBookingRecord[]> {
  const results: CoachingBookingRecord[] = [];
  const seen = new Set<string>();

  try {
    const { data, error } = await supabase
      .from('coaching_bookings')
      .select('*')
      .eq('store_slug', storeSlug)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && Array.isArray(data)) {
      data.forEach((row: any) => {
        seen.add(row.id);
        results.push({
          id: row.id,
          sessionId: row.session_id,
          storeSlug: row.store_slug,
          userId: row.user_id,
          coachName: row.coach_name,
          consultationType: row.consultation_type,
          date: row.booking_date,
          timeSlot: row.time_slot,
          fullName: row.full_name,
          email: row.email || '',
          whatsappPhone: row.whatsapp_phone,
          objectiveNotes: row.objective_notes || '',
          roomUrl: row.room_url,
          status: row.status || 'pending',
          createdAt: row.created_at,
        });
      });
    }
  } catch (_) {}

  try {
    const { data: regRows } = await supabase
      .from('app_registry')
      .select('*')
      .eq('module_key', 'coaching_1to1_bookings')
      .eq('tenant_id', storeSlug)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (Array.isArray(regRows)) {
      regRows.forEach((row: any) => {
        const cfg = row.config_json as CoachingBookingRecord | undefined;
        if (cfg?.id && !seen.has(cfg.id)) {
          seen.add(cfg.id);
          results.push(cfg);
        }
      });
    }
  } catch (_) {}

  return results;
}
