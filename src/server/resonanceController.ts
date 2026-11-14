/**
 * @file resonanceController.ts
 * @description Moteur de Résonance et Détection de Match Synergique (Prompt 4)
 * 
 * Architecture :
 * 1. Collection Firestore 'resonances' :
 *    Structure : { id, senderId, receiverId, postId, createdAt }
 * 
 * 2. Logique de Match Synergique :
 *    Lorsqu'une Résonance est insérée en BDD, vérifie s'il existe déjà une entrée inverse :
 *    hasMatch = db.collection('resonances')
 *                 .where('senderId', '==', receiverId)
 *                 .where('receiverId', '==', senderId)
 *                 .get();
 * 
 * 3. Si hasMatch est vrai :
 *    - Génération d'un jitsiRoomId unique (UUID v4)
 *    - Insertion d'un document dans la collection 'wameets' avec status: 'SYNERGY_MATCH'
 *    - Déclenchement d'une notification silencieuse aux deux utilisateurs avec le lien du Wameet.
 */

import crypto from 'crypto';
import type { Request, Response, Express } from 'express';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  setDoc
} from 'firebase/firestore';

export interface ResonanceRecord {
  id?: string;
  senderId: string;
  receiverId: string;
  postId: string;
  createdAt: string;
}

export interface SynergyMatchRecord {
  id: string;
  jitsiRoomId: string;
  participantIds: [string, string];
  user1Id: string;
  user2Id: string;
  postId: string;
  status: 'SYNERGY_MATCH';
  wameetUrl: string;
  createdAt: string;
  notified: boolean;
}

// Mémoire cache locale pour persistance rapide et résilience réseau
const localResonances: ResonanceRecord[] = [];
const localMatches: SynergyMatchRecord[] = [];

// Callbacks pour notifications en temps réel
type SynergyNotificationListener = (match: SynergyMatchRecord) => void;
const notificationListeners: SynergyNotificationListener[] = [];

export function subscribeToSynergyNotifications(listener: SynergyNotificationListener) {
  notificationListeners.push(listener);
  return () => {
    const idx = notificationListeners.indexOf(listener);
    if (idx > -1) notificationListeners.splice(idx, 1);
  };
}

/**
 * Traite l'insertion d'une résonance et vérifie l'existence d'un match inverse
 */
export async function registerResonance(
  senderId: string,
  receiverId: string,
  postId: string
): Promise<{
  success: boolean;
  resonanceId: string;
  isMatch: boolean;
  match?: SynergyMatchRecord;
}> {
  const normalizedSender = senderId.trim();
  const normalizedReceiver = receiverId.trim();
  const nowIso = new Date().toISOString();

  let resonanceId = `res_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  // 1. Insertion en BDD (Firestore + cache local)
  try {
    if (db) {
      const colRef = collection(db, 'resonances');
      const docRef = await addDoc(colRef, {
        senderId: normalizedSender,
        receiverId: normalizedReceiver,
        postId,
        createdAt: nowIso
      });
      resonanceId = docRef.id;
    }
  } catch (err) {
    console.warn('[RESONANCE BDD] Écriture storage en fallback local :', err);
  }

  // Enregistrement dans le store local
  localResonances.push({
    id: resonanceId,
    senderId: normalizedSender,
    receiverId: normalizedReceiver,
    postId,
    createdAt: nowIso
  });

  // 2. Vérification s'il existe une entrée inverse
  // Code pseudo-logique exigé :
  // const hasMatch = await db.collection('resonances').where('senderId', '==', receiverId).where('receiverId', '==', senderId).get();
  let hasMatch = false;

  try {
    if (db) {
      const q = query(
        collection(db, 'resonances'),
        where('senderId', '==', normalizedReceiver),
        where('receiverId', '==', normalizedSender)
      );
      const querySnap = await getDocs(q);
      hasMatch = !querySnap.empty;
    }
  } catch (err) {
    console.warn('[RESONANCE MATCH] Requête storage inverse en fallback local :', err);
  }

  // Vérification également dans le store local
  if (!hasMatch) {
    hasMatch = localResonances.some(
      (r) => r.senderId === normalizedReceiver && r.receiverId === normalizedSender
    );
  }

  // 3. Si hasMatch est vrai -> Génération du Match Synergique
  if (hasMatch) {
    // Génère un jitsiRoomId (UUID v4)
    const jitsiRoomId = crypto.randomUUID();
    const matchId = `wameet_match_${Date.now()}_${jitsiRoomId.slice(0, 8)}`;
    const wameetUrl = `https://meet.jit.si/wameet-synergy-${jitsiRoomId}`;

    const matchDoc: SynergyMatchRecord = {
      id: matchId,
      jitsiRoomId,
      participantIds: [normalizedSender, normalizedReceiver],
      user1Id: normalizedSender,
      user2Id: normalizedReceiver,
      postId,
      status: 'SYNERGY_MATCH',
      wameetUrl,
      createdAt: nowIso,
      notified: true
    };

    // Insertion du document dans la table 'wameets' avec status 'SYNERGY_MATCH'
    try {
      if (db) {
        const wameetsCol = collection(db, 'wameets');
        await setDoc(doc(wameetsCol, matchId), matchDoc);
        console.log(`[SYNERGY MATCH] Document inséré dans 'wameets' : ${matchId}`);
      }
    } catch (err) {
      console.warn('[WAMEET BDD] Écriture match wameets en fallback local :', err);
    }

    localMatches.push(matchDoc);

    // Déclenche une notification silencieuse aux deux utilisateurs avec le lien du Wameet
    console.log(`[NOTIFICATION SILENCIEUSE] Match Synergique entre ${normalizedSender} et ${normalizedReceiver} !`);
    console.log(`[NOTIFICATION SILENCIEUSE] Lien Jitsi généré : ${wameetUrl}`);

    notificationListeners.forEach((fn) => {
      try {
        fn(matchDoc);
      } catch (e) {
        console.error('Erreur listener notification résonance', e);
      }
    });

    return {
      success: true,
      resonanceId,
      isMatch: true,
      match: matchDoc
    };
  }

  return {
    success: true,
    resonanceId,
    isMatch: false
  };
}

/**
 * Monte les routes API Express pour le Moteur de Résonance
 */
export function attachResonanceRoutes(app: Express) {
  /**
   * POST /api/resonances
   * Corps : { senderId, receiverId, postId }
   */
  app.post('/api/resonances', async (req: Request, res: Response): Promise<void> => {
    try {
      const { senderId, receiverId, postId } = req.body;

      if (!senderId || !receiverId || !postId) {
        res.status(400).json({
          error: 'Les paramètres senderId, receiverId et postId sont obligatoires.'
        });
        return;
      }

      const result = await registerResonance(senderId, receiverId, postId);
      res.json(result);
    } catch (error: any) {
      console.error('[API RESONANCE ERROR]', error);
      res.status(500).json({ error: error?.message || 'Erreur interne du serveur' });
    }
  });

  /**
   * GET /api/resonances/user/:userId
   * Récupère toutes les résonances émises ou reçues
   */
  app.get('/api/resonances/user/:userId', (req: Request, res: Response) => {
    const userId = req.params.userId;
    const sent = localResonances.filter((r) => r.senderId === userId);
    const received = localResonances.filter((r) => r.receiverId === userId);
    res.json({ sent, received });
  });

  /**
   * POST /api/notifications/send
   * Envoi de notification push FCM / interne
   */
  app.post('/api/notifications/send', async (req: Request, res: Response): Promise<void> => {
    try {
      const { targetUserId, title, body, data } = req.body;
      console.log(`[PUSH NOTIFICATION] Résonance envoyée à ${targetUserId} : "${title}" - "${body}"`);

      // Persistance de la notification dans Firestore si configuré
      if (targetUserId) {
        try {
          await addDoc(collection(db, 'users', targetUserId, 'notifications'), {
            title,
            body,
            data: data || {},
            read: false,
            timestamp: serverTimestamp()
          });
        } catch (_) {}
      }

      res.status(200).json({ success: true, message: 'Notification transmise' });
    } catch (error: any) {
      console.warn('[PUSH NOTIFICATION] Fallback simulé :', error?.message);
      res.status(200).json({ success: true, simulated: true });
    }
  });
}
