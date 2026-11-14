/**
 * @file dailyController.ts
 * @description Contrôleur Backend Sécurisé Daily.co (Node.js / Express).
 * 
 * Gestion centralisée de la DAILY_API_KEY côté serveur :
 * 1. Création dynamique de salons avec expiration configurable (15 min pour Résonance).
 * 2. Génération de meeting tokens éphémères :
 *    - Hôte (Marchand / Créateur) : is_owner = true
 *    - Spectateur (Acheteur / Visiteur) : is_owner = false
 * 3. Jamais d'exposition de la clé maître DAILY_API_KEY au frontend.
 */

import type { Request, Response, Express } from 'express';

const DAILY_API_ENDPOINT = 'https://api.daily.co/v1';

function getDailyApiKey(): string {
  const key = process.env.DAILY_API_KEY || '';
  if (!key) {
    console.warn('[dailyController] DAILY_API_KEY non configurée dans process.env (Render / .env local)');
  }
  return key;
}

function getDailyDomain(): string {
  return process.env.DAILY_DOMAIN || 'nanasore';
}

function sanitizeRoomName(rawName: string): string {
  const clean = (rawName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);

  return clean || `wameet-${Date.now().toString(36)}`;
}

/**
 * Assure qu'une salle existe sur Daily.co avec la durée requise
 */
export async function ensureDailyRoom(
  roomName: string,
  durationSeconds = 900 // 15 minutes par défaut (Résonance)
): Promise<{ url: string; name: string; exp: number }> {
  const apiKey = getDailyApiKey();
  const domain = getDailyDomain();
  const cleanName = sanitizeRoomName(roomName);
  const exp = Math.floor(Date.now() / 1000) + durationSeconds;
  const baseUrl = `https://${domain}.daily.co`;

  try {
    const res = await fetch(`${DAILY_API_ENDPOINT}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: cleanName,
        privacy: 'public',
        properties: {
          exp,
          enable_screenshare: true,
          enable_chat: true,
          enable_knocking: false,
          eject_at_room_exp: true,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        url: data.url || `${baseUrl}/${cleanName}`,
        name: data.name || cleanName,
        exp,
      };
    }

    // Si déjà existante (400 / 409)
    if (res.status === 400 || res.status === 409) {
      return {
        url: `${baseUrl}/${cleanName}`,
        name: cleanName,
        exp,
      };
    }

    const err = await res.json().catch(() => ({}));
    console.warn('[dailyController] ensureDailyRoom warning:', err);
  } catch (e) {
    console.warn('[dailyController] ensureDailyRoom fetch error:', e);
  }

  return {
    url: `${baseUrl}/${cleanName}`,
    name: cleanName,
    exp,
  };
}

/**
 * Génère un meeting token sécurisé côté serveur
 */
export async function generateDailyMeetingToken(options: {
  roomName: string;
  isOwner?: boolean;
  userName?: string;
  durationSeconds?: number;
}): Promise<{ token: string; exp: number }> {
  const apiKey = getDailyApiKey();
  const cleanName = sanitizeRoomName(options.roomName);
  const duration = options.durationSeconds || 900; // 15 min par défaut
  const exp = Math.floor(Date.now() / 1000) + duration;
  const isOwner = Boolean(options.isOwner);
  const userName = options.userName || (isOwner ? 'Hôte Wameet' : 'Participant Wameet');

  const res = await fetch(`${DAILY_API_ENDPOINT}/meeting-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: cleanName,
        is_owner: isOwner,
        user_name: userName,
        exp,
        enable_screenshare: true,
      },
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur création meeting token Daily.co (${res.status})`);
  }

  const data = await res.json();
  return {
    token: data.token,
    exp,
  };
}

/**
 * Monte les routes API Daily.co sur l'application Express
 */
export function attachDailyRoutes(app: Express) {
  /**
   * POST /api/daily/token
   * Point d'entrée officiel pour obtenir un meeting token éphémère
   * Corps : { roomName, isOwner, userName, durationSeconds }
   */
  app.post('/api/daily/token', async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        roomName,
        isOwner = false,
        userName,
        durationSeconds = 900 // 15 minutes (Résonance)
      } = req.body || {};

      if (!roomName) {
        res.status(400).json({ error: 'Le champ roomName est obligatoire' });
        return;
      }

      // 1. S'assurer que la salle existe côté Daily avec la bonne expiration
      const room = await ensureDailyRoom(roomName, Number(durationSeconds) || 900);

      // 2. Générer le meeting token sécurisé (Hôte vs Spectateur)
      const { token, exp } = await generateDailyMeetingToken({
        roomName: room.name,
        isOwner: Boolean(isOwner),
        userName,
        durationSeconds: Number(durationSeconds) || 900,
      });

      res.status(200).json({
        success: true,
        token,
        roomUrl: room.url,
        roomName: room.name,
        exp,
        durationSeconds: Number(durationSeconds) || 900,
        isOwner: Boolean(isOwner),
      });
    } catch (error: any) {
      console.error('[API DAILY TOKEN ERROR]', error);
      res.status(500).json({
        error: error?.message || 'Erreur lors de la génération du token Daily.co',
      });
    }
  });

  /**
   * POST /api/daily/room
   * Crée ou vérifie une salle avec expiration
   */
  app.post('/api/daily/room', async (req: Request, res: Response): Promise<void> => {
    try {
      const { roomName, durationSeconds = 900 } = req.body || {};
      if (!roomName) {
        res.status(400).json({ error: 'Le champ roomName est obligatoire' });
        return;
      }

      const room = await ensureDailyRoom(roomName, Number(durationSeconds) || 900);
      res.status(200).json({ success: true, ...room });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Erreur création de salle' });
    }
  });

  /**
   * DELETE /api/daily/room/:roomName
   * Clôture / suppression propre d'une salle
   */
  app.delete('/api/daily/room/:roomName', async (req: Request, res: Response): Promise<void> => {
    try {
      const apiKey = getDailyApiKey();
      const cleanName = sanitizeRoomName(req.params.roomName);
      const delRes = await fetch(`${DAILY_API_ENDPOINT}/rooms/${cleanName}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      res.status(200).json({ success: delRes.ok });
    } catch (error: any) {
      res.status(500).json({ error: error?.message });
    }
  });
}
