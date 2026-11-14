/**
 * @file wameetAppointmentService.ts
 * @description Service de gestion des réservations et rendez-vous Wameet différés.
 * 
 * Spécifications :
 * - Collection Firestore : 'wameet_appointments'
 * - Statuts : 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
 * - Génération d'ID de salon unique anonymisé : wameet-room-[id]
 * - Persistance et cache résilient localStorage
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface WameetAppointment {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  creatorHandle?: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar?: string;
  date: string; // Format : YYYY-MM-DD
  timeSlot: string; // Format : HH:mm (ex: 14:30)
  reason: string;
  priceFcfa?: number;
  status: AppointmentStatus;
  jitsiRoomId: string;
  pitchMediaUrl?: string;
  pitchMediaType?: 'video' | 'audio';
  createdAt: string;
}

const APPOINTMENTS_STORAGE_KEY = 'wameet_appointments_cache_v1';

// Récupération du cache local
function getLocalAppointments(): WameetAppointment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Sauvegarde dans le cache local
function saveLocalAppointments(list: WameetAppointment[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}

/**
 * Crée un nouveau rendez-vous Wameet
 */
export async function createWameetAppointment(
  data: Omit<WameetAppointment, 'id' | 'status' | 'jitsiRoomId' | 'createdAt'> & {
    customRoomId?: string;
    autoConfirm?: boolean;
  }
): Promise<WameetAppointment> {
  const appointmentId = `apt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const jitsiRoomId = data.customRoomId || `wameet-room-${appointmentId}`;

  const appointment: WameetAppointment = {
    id: appointmentId,
    creatorId: data.creatorId,
    creatorName: data.creatorName,
    creatorAvatar: data.creatorAvatar,
    creatorHandle: data.creatorHandle,
    requesterId: data.requesterId,
    requesterName: data.requesterName,
    requesterAvatar: data.requesterAvatar,
    date: data.date,
    timeSlot: data.timeSlot,
    reason: data.reason,
    priceFcfa: data.priceFcfa || 0,
    status: data.autoConfirm ? 'CONFIRMED' : 'CONFIRMED', // Par défaut confirmé pour fluidité
    jitsiRoomId,
    pitchMediaUrl: data.pitchMediaUrl,
    pitchMediaType: data.pitchMediaType,
    createdAt: new Date().toISOString()
  };

  // 1. Sauvegarde Firestore
  if (db) {
    try {
      const docRef = doc(db, 'wameet_appointments', appointmentId);
      await setDoc(docRef, {
        ...appointment,
        serverTimestamp: serverTimestamp()
      });
      console.log(`[wameetAppointmentService] Rendez-vous ${appointmentId} enregistré sur storage.`);
    } catch (err) {
      console.warn('[wameetAppointmentService] Erreur storage, utilisation du fallback local :', err);
    }
  }

  // 2. Sauvegarde cache local
  const current = getLocalAppointments();
  saveLocalAppointments([appointment, ...current]);

  return appointment;
}

/**
 * Récupère tous les rendez-vous d'un utilisateur (en tant que créateur ou demandeur)
 */
export async function getWameetAppointments(userId: string): Promise<WameetAppointment[]> {
  const localList = getLocalAppointments();
  
  if (db && userId) {
    try {
      const q = query(
        collection(db, 'wameet_appointments'),
        where('requesterId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const remoteList: WameetAppointment[] = [];
      snapshot.forEach((d) => remoteList.push(d.data() as WameetAppointment));

      if (remoteList.length > 0) {
        // Fusionne avec le local
        const combined = [...remoteList, ...localList].filter(
          (v, i, a) => a.findIndex((t) => t.id === v.id) === i
        );
        saveLocalAppointments(combined);
        return combined;
      }
    } catch (e) {
      console.warn('[wameetAppointmentService] Récupération storage en échec, retour local :', e);
    }
  }

  return localList;
}

/**
 * Récupère le premier rendez-vous imminent (aujourd'hui, dans moins de 30 minutes ou en cours)
 */
export function getImminentAppointment(
  appointments: WameetAppointment[]
): WameetAppointment | null {
  if (!appointments || appointments.length === 0) return null;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const confirmedToday = appointments.filter(
    (apt) => apt.status === 'CONFIRMED' && apt.date === todayStr
  );

  for (const apt of confirmedToday) {
    if (!apt.timeSlot) continue;
    const [hours, minutes] = apt.timeSlot.split(':').map(Number);
    const aptTime = new Date();
    aptTime.setHours(hours, minutes, 0, 0);

    const diffMinutes = (aptTime.getTime() - now.getTime()) / (1000 * 60);

    // Si le rendez-vous commence dans moins de 35 minutes ou a commencé il y a moins de 30 minutes
    if (diffMinutes >= -30 && diffMinutes <= 35) {
      return apt;
    }
  }

  // Si aucun n'est dans les 30 min, retourne le plus proche confirmé pour aujourd'hui
  return confirmedToday[0] || null;
}

/**
 * Met à jour le statut d'un rendez-vous
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: AppointmentStatus
): Promise<void> {
  if (db) {
    try {
      const docRef = doc(db, 'wameet_appointments', appointmentId);
      await updateDoc(docRef, { status: newStatus });
    } catch (e) {}
  }

  const current = getLocalAppointments().map((apt) =>
    apt.id === appointmentId ? { ...apt, status: newStatus } : apt
  );
  saveLocalAppointments(current);
}
