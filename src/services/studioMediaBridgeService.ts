/**
 * @file studioMediaBridgeService.ts
 * @description Pont temps réel (100% local navigateur, 0 stockage Cloud) permettant d'envoyer directement
 * une vidéo montée depuis SocialVideoMontageStudio vers :
 *   1. Le Cours en cours de création (`COURSE` -> CourseForgeCanvas)
 *   2. Les Paramètres du Produit en cours de création (`PRODUCT` -> AddProductModal)
 *   3. Le Thème en cours de création / personnalisation (`THEME` -> StoreStudioPage)
 */

export type StudioTransferTarget = 'COURSE' | 'PRODUCT' | 'THEME';

export interface StudioMediaTransferPayload {
  id: string;
  target: StudioTransferTarget;
  file?: File | null;
  url: string;
  title: string;
  durationSec?: number;
  width?: number;
  height?: number;
  createdAt: number;
}

export const STUDIO_MEDIA_TRANSFER_EVENT = 'nana:studio-media-transfer';

const pendingByTarget: Partial<Record<StudioTransferTarget, StudioMediaTransferPayload>> = {};

/**
 * Envoie une vidéo montée vers une destination (Cours, Produit ou Thème).
 * - Émet un événement temps réel si la vue cible est déjà ouverte.
 * - Met en file d'attente locale si la vue cible est ouverte juste après.
 */
export function sendMountedVideoToTarget(
  target: StudioTransferTarget,
  payload: Omit<StudioMediaTransferPayload, 'id' | 'target' | 'createdAt'>
): StudioMediaTransferPayload {
  const fullPayload: StudioMediaTransferPayload = {
    id: `transfer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    target,
    createdAt: Date.now(),
    ...payload
  };

  pendingByTarget[target] = fullPayload;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<StudioMediaTransferPayload>(STUDIO_MEDIA_TRANSFER_EVENT, {
        detail: fullPayload
      })
    );
  }

  return fullPayload;
}

/**
 * Récupère et consomme une vidéo montée en attente pour une destination donnée.
 */
export function consumePendingStudioMedia(
  target: StudioTransferTarget
): StudioMediaTransferPayload | null {
  const item = pendingByTarget[target] || null;
  if (item) {
    delete pendingByTarget[target];
  }
  return item;
}

/**
 * S'abonne en temps réel aux vidéos montées envoyées vers une destination donnée.
 */
export function subscribeStudioMediaTransfer(
  target: StudioTransferTarget,
  onReceive: (payload: StudioMediaTransferPayload) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  // Consommer immédiatement si une vidéo a été envoyée juste avant le montage du composant
  const pending = consumePendingStudioMedia(target);
  if (pending) {
    onReceive(pending);
  }

  const handler = (ev: Event) => {
    const custom = ev as CustomEvent<StudioMediaTransferPayload>;
    if (custom.detail && custom.detail.target === target) {
      delete pendingByTarget[target];
      onReceive(custom.detail);
    }
  };

  window.addEventListener(STUDIO_MEDIA_TRANSFER_EVENT, handler);
  return () => window.removeEventListener(STUDIO_MEDIA_TRANSFER_EVENT, handler);
}
