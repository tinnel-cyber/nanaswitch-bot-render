/**
 * @file wameetSyncService.ts
 * @description Client SDK et Service de Synchronisation Nanasore vers Wameet VIP (Prompt 30)
 * 
 * Permet au studio d'administration Nanasore de publier et mettre à jour des Espaces VIP dans Wameet,
 * et permet au frontend Wameet de s'abonner aux diffusions en temps réel via WebSockets.
 */

import type {
  PublishRoomRequestPayload,
  UpdateContentRequestPayload,
  SyncedVipRoomRecord
} from '../server/wameetSyncController';

const API_BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
const M2M_SYNC_TOKEN = 'nana_pos_studio_m2m_key_prod_v1';

/**
 * Publie une nouvelle Salle ou Salon VIP depuis le Back-Office Nanasore.
 */
export async function publishRoomFromNanaPos(
  payload: PublishRoomRequestPayload,
  customToken?: string
): Promise<{ success: boolean; data?: SyncedVipRoomRecord; error?: string; message?: string }> {
  try {
    const token = customToken || M2M_SYNC_TOKEN;
    const timestamp = Date.now().toString();

    const response = await fetch(`${API_BASE_URL}/api/wameet-sync/publish-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nana-m2m-token': token,
        'x-nana-timestamp': timestamp
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'PUBLISH_FAILED',
        message: result.message || 'Échec de la publication de la salle VIP.'
      };
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (err: any) {
    console.error('[WAMEET SYNC SERVICE] Erreur lors de la publication :', err);
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: err.message || 'Erreur réseau de communication avec le serveur Wameet.'
    };
  }
}

/**
 * Met à jour le contenu d'un Espace VIP (nouveau quiz, nouvelle vidéo, analyse) en temps réel.
 */
export async function updateRoomContentFromNanaPos(
  payload: UpdateContentRequestPayload,
  customToken?: string
): Promise<{ success: boolean; data?: any; error?: string; message?: string }> {
  try {
    const token = customToken || M2M_SYNC_TOKEN;
    const timestamp = Date.now().toString();

    const response = await fetch(`${API_BASE_URL}/api/wameet-sync/update-content`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-nana-m2m-token': token,
        'x-nana-timestamp': timestamp
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'UPDATE_FAILED',
        message: result.message || 'Échec de la mise à jour en temps réel.'
      };
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (err: any) {
    console.error('[WAMEET SYNC SERVICE] Erreur lors de la mise à jour :', err);
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: err.message || 'Erreur réseau de communication avec le serveur Wameet.'
    };
  }
}

/**
 * Récupère la liste des salles et salons synchronisés depuis Nanasore.
 */
export async function fetchSyncedVipRooms(): Promise<SyncedVipRoomRecord[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/wameet-sync/rooms`);
    if (!response.ok) return [];
    const result = await response.json();
    return result.rooms || [];
  } catch (err) {
    console.error('[WAMEET SYNC SERVICE] Impossible de récupérer les rooms synchronisées :', err);
    return [];
  }
}

export default {
  publishRoomFromNanaPos,
  updateRoomContentFromNanaPos,
  fetchSyncedVipRooms
};
