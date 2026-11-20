/**
 * @file liveResourceUploadService.ts
 * @description Upload réel de ressources pédagogiques & devoirs (PDF, DOCX, Images, ZIP)
 * vers Supabase Storage (bucket `live-resources`) avec repli sécurisé si bucket non provisionné.
 */

import { supabase } from '../lib/supabase';

export interface UploadedLiveResource {
  url: string;
  name: string;
  type: string;
  size: number;
  storage: 'supabase' | 'inline';
}

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 Mo
const MAX_INLINE_FALLBACK_BYTES = 4 * 1024 * 1024; // 4 Mo

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Impossible de lire le fichier sélectionné.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Téléverse un fichier (support formateur ou devoir étudiant) vers Supabase Storage.
 */
export async function uploadLiveResourceFile(
  file: File,
  folder: 'assignments' | 'submissions' | 'resources',
  sessionId: string
): Promise<UploadedLiveResource> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Le fichier dépasse la taille maximale autorisée (15 Mo).');
  }

  const safeSession = (sessionId || 'live').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectPath = `${folder}/${safeSession}/${Date.now()}_${safeName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('live-resources')
      .upload(objectPath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      });

    if (!uploadError) {
      const { data: pub } = supabase.storage
        .from('live-resources')
        .getPublicUrl(objectPath);

      if (pub?.publicUrl) {
        return {
          url: pub.publicUrl,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          storage: 'supabase',
        };
      }
    }
  } catch (err) {
    console.warn('[liveResourceUploadService] Repli inline:', err);
  }

  // Repli sécurisé si le bucket Supabase Storage `live-resources` n'est pas encore créé
  if (file.size > MAX_INLINE_FALLBACK_BYTES) {
    throw new Error(
      'Fichier > 4 Mo : créez le bucket public "live-resources" dans Supabase Storage pour les fichiers volumineux.'
    );
  }

  const dataUrl = await readAsDataUrl(file);
  return {
    url: dataUrl,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    storage: 'inline',
  };
}
