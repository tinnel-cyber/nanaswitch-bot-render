/**
 * @file resonanceService.ts
 * @description Moteur de Résonance et Détection de Match Synergique (Prompt 4).
 * 
 * Spécifications :
 * - Table / Collection 'resonances' : id, senderId, receiverId, postId, createdAt
 * - Vérification de la résonance réciproque (Match Synergique)
 * - Création d'une entrée 'SYNERGY_MATCH' avec jitsiRoomId unique dans la table 'wameets'
 * - Support offline-first résilient avec persistance locale
 * - Zéro marque tierce
 */

import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  setDoc,
  doc
} from 'firebase/firestore';

export interface Resonance {
  id: string;
  senderId: string;
  receiverId: string;
  postId: string;
  createdAt: string;
}

export interface SynergyMatchResult {
  id: string;
  jitsiRoomId: string;
  wameetUrl: string;
  participantIds: [string, string];
  status: 'SYNERGY_MATCH';
  createdAt: string;
}

export interface ResonateResponse {
  success: boolean;
  resonanceId: string;
  isMatch: boolean;
  match?: SynergyMatchResult;
}

const STORAGE_KEY = 'wameet_resonated_posts';
const LOCAL_RESONANCES_KEY = 'wameet_local_resonances_table';

class ResonanceService {
  private resonatedPosts: Set<string>;
  private matchListeners: ((match: SynergyMatchResult) => void)[] = [];

  constructor() {
    this.resonatedPosts = new Set<string>();
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          this.resonatedPosts = new Set(JSON.parse(saved));
        }
      } catch (e) {}
    }
  }

  public isPostResonated(postId: string): boolean {
    return this.resonatedPosts.has(postId);
  }

  public onSynergyMatch(listener: (match: SynergyMatchResult) => void) {
    this.matchListeners.push(listener);
    return () => {
      this.matchListeners = this.matchListeners.filter((l) => l !== listener);
    };
  }

  private notifyMatch(match: SynergyMatchResult) {
    this.matchListeners.forEach((fn) => {
      try {
        fn(match);
      } catch (err) {
        console.error('Erreur notification match synergique', err);
      }
    });
  }

  /**
   * Enregistre une résonance et vérifie s'il existe une résonance réciproque (Match)
   */
  public async triggerResonance(
    senderId: string,
    receiverId: string,
    postId: string
  ): Promise<ResonateResponse> {
    const isCurrentlyResonated = this.resonatedPosts.has(postId);

    if (isCurrentlyResonated) {
      // Annulation de la résonance
      this.resonatedPosts.delete(postId);
      this.persistLocal();
      this.removeLocalResonance(senderId, receiverId, postId);
      return {
        success: true,
        resonanceId: '',
        isMatch: false
      };
    }

    // Ajout de la résonance
    this.resonatedPosts.add(postId);
    this.persistLocal();

    const nowIso = new Date().toISOString();
    const resonanceId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 1. Enregistrement local résilient
    const newResonance: Resonance = {
      id: resonanceId,
      senderId,
      receiverId,
      postId,
      createdAt: nowIso
    };
    this.saveLocalResonance(newResonance);

    // 2. Vérification locale immédiate du match réciproque
    const localHasMatch = this.checkLocalReciprocalMatch(senderId, receiverId);

    // 3. Persistance dans Cloud Firestore (si connecté)
    let firestoreHasMatch = false;
    try {
      if (db) {
        const col = collection(db, 'resonances');
        await addDoc(col, {
          senderId,
          receiverId,
          postId,
          createdAt: nowIso
        });

        // Détection de résonance inverse : senderId === receiverIdActuel ET receiverId === senderIdActuel
        const q = query(
          col,
          where('senderId', '==', receiverId),
          where('receiverId', '==', senderId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          firestoreHasMatch = true;
        }
      }
    } catch (firestoreErr) {
      console.info('[RESONANCE storage FALLBACK] Utilisation du moteur local résilient :', storageErr);
    }

    // 4. Si Match Synergique détecté (local ou Firestore)
    const isMatch = localHasMatch || firestoreHasMatch;

    if (isMatch) {
      const jitsiRoomId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `wameet-room-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const matchId = `match_${Date.now()}`;
      const wameetUrl = `https://meet.jit.si/wameet-synergy-${jitsiRoomId}`;

      const matchRecord: SynergyMatchResult = {
        id: matchId,
        jitsiRoomId,
        wameetUrl,
        participantIds: [senderId, receiverId],
        status: 'SYNERGY_MATCH',
        createdAt: nowIso
      };

      // Enregistrement dans wameets (Firestore si disponible)
      try {
        if (db) {
          const wameetsCol = collection(db, 'wameets');
          await setDoc(doc(wameetsCol, matchId), matchRecord);
        }
      } catch (e) {}

      this.notifyMatch(matchRecord);

      return {
        success: true,
        resonanceId,
        isMatch: true,
        match: matchRecord
      };
    }

    return {
      success: true,
      resonanceId,
      isMatch: false
    };
  }

  private persistLocal() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.resonatedPosts)));
      } catch (e) {}
    }
  }

  private getLocalResonances(): Resonance[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(LOCAL_RESONANCES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalResonance(r: Resonance) {
    if (typeof window === 'undefined') return;
    try {
      const list = this.getLocalResonances();
      list.push(r);
      localStorage.setItem(LOCAL_RESONANCES_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  private removeLocalResonance(senderId: string, receiverId: string, postId: string) {
    if (typeof window === 'undefined') return;
    try {
      const list = this.getLocalResonances().filter(
        (r) => !(r.senderId === senderId && r.receiverId === receiverId && r.postId === postId)
      );
      localStorage.setItem(LOCAL_RESONANCES_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  private checkLocalReciprocalMatch(senderId: string, receiverId: string): boolean {
    const list = this.getLocalResonances();
    // Recherche si receiverId a déjà émis une résonance vers senderId
    // OU si l'utilisateur teste sur une publication populaire pour la démonstration
    return list.some((r) => r.senderId === receiverId && r.receiverId === senderId);
  }
}

export const resonanceService = new ResonanceService();
export default resonanceService;
