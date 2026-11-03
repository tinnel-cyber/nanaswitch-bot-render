/**
 * @file imgbbService.ts
 * @description Service d'upload d'images universel vers l'API officielle d'ImgBB (imgbb.com)
 * Permet l'hébergement instantané d'images en ligne avec génération automatique de liens directs CDN.
 */

// Clé API et stockage local
export const IMGBB_STORAGE_KEY = 'nanasore_imgbb_api_key';

/**
 * Récupère la clé API ImgBB active :
 * 1. Définie dans localStorage (par l'utilisateur dans l'interface)
 * 2. Définie dans les variables d'environnement (VITE_IMGBB_API_KEY)
 * Aucune clé en dur n'est stockée dans le code source.
 */
export function getImgbbApiKey(): string {
  // 1. Priorité absolue : Clé définie dans le fichier .env (VITE_IMGBB_API_KEY)
  const metaEnvKey = (import.meta as any).env?.VITE_IMGBB_API_KEY || (import.meta as any).env?.IMGBB_API_KEY;
  if (metaEnvKey && typeof metaEnvKey === 'string' && metaEnvKey.trim().length > 0) {
    return metaEnvKey.trim().replace(/^["']|["']$/g, '');
  }

  // 2. Détection via process.env pour environnements SSR/Node
  if (typeof process !== 'undefined' && process.env) {
    const procKey = process.env.VITE_IMGBB_API_KEY || process.env.IMGBB_API_KEY;
    if (procKey && typeof procKey === 'string' && procKey.trim().length > 0) {
      return procKey.trim().replace(/^["']|["']$/g, '');
    }
  }

  // 3. Clé enregistrée dans le stockage local (si configurée)
  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem(IMGBB_STORAGE_KEY);
    if (customKey && customKey.trim().length > 0) {
      return customKey.trim().replace(/^["']|["']$/g, '');
    }
  }

  return '';
}

/**
 * Enregistre une clé API ImgBB personnalisée dans le navigateur
 */
export function setImgbbApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (!key || key.trim() === '') {
      localStorage.removeItem(IMGBB_STORAGE_KEY);
    } else {
      localStorage.setItem(IMGBB_STORAGE_KEY, key.trim());
    }
  }
}

export interface ImgbbUploadResult {
  url: string;           // URL directe du fichier image (ex: https://i.ibb.co/.../image.png)
  displayUrl: string;    // URL d'affichage optimisée
  thumbUrl?: string;     // Miniature
  deleteUrl?: string;    // URL de suppression ImgBB
  title?: string;
  width?: number;
  height?: number;
  size?: number;
}

/**
 * Téléverse une image (File, Blob ou Base64) vers l'API officielle d'ImgBB
 * @param imageSource Fichier File, Blob ou chaîne Base64
 * @param customApiKey Clé API optionnelle spécifique
 */
export async function uploadImageToImgbb(
  imageSource: File | Blob | string,
  customApiKey?: string
): Promise<ImgbbUploadResult> {
  const apiKey = (customApiKey && customApiKey.trim().length > 0) ? customApiKey.trim().replace(/^["']|["']$/g, '') : getImgbbApiKey();

  if (!apiKey) {
    throw new Error("Service de téléversement d'image temporairement indisponible.");
  }

  const formData = new FormData();

  if (typeof imageSource === 'string') {
    // Si c'est du base64 (avec ou sans préfixe data:image/...)
    const cleanBase64 = imageSource.replace(/^data:image\/[a-z]+;base64,/, '');
    formData.append('image', cleanBase64);
  } else {
    // Fichier binaire direct
    formData.append('image', imageSource);
  }

  const endpoint = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data || !data.success) {
    const errorMsg = data?.error?.message || `Erreur ImgBB (Code ${response.status}): ${response.statusText}`;
    console.error('[ImgBB Service] Erreur lors du téléversement :', errorMsg, data);
    throw new Error(errorMsg);
  }

  const result: ImgbbUploadResult = {
    url: data.data.url || data.data.display_url,
    displayUrl: data.data.display_url || data.data.url,
    thumbUrl: data.data.thumb?.url,
    deleteUrl: data.data.delete_url,
    title: data.data.title,
    width: data.data.width,
    height: data.data.height,
    size: data.data.size,
  };

  return result;
}
