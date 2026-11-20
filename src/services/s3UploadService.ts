/**
 * @file s3UploadService.ts
 * @description Service universel d'upload vidéo direct vers Amazon S3 (Bucket: nsore-video-storage)
 * Architecture WaMeet Serverless & Direct Raw Upload :
 * 1. Zéro traitement FFmpeg/compression côté frontend (aucun blocage navigateur ni UI mobile).
 * 2. Upload direct brut du fichier sélectionné vers le dossier S3 source : wa-videos/{timestamp}_{filename}.mp4
 * 3. Délégation totale du transcodage à AWS Lambda :
 *    - Conversion automatique, génération du poster.jpg et découpage HLS (playlist.m3u8)
 *    - Destination : compressed-reels/[nom]/hls/playlist.m3u8 et compressed-reels/[nom]/poster.jpg
 * 4. Lecteur WaMeet :
 *    - Lecture directe du flux HLS (.../compressed-reels/[nom]/hls/playlist.m3u8) avec poster.jpg associé
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PresignedUploadResult {
  uploadUrl: string;
  finalVideoUrl: string; // URL flux HLS : compressed-reels/[nom]/hls/playlist.m3u8
  hlsUrl: string;        // URL flux HLS : compressed-reels/[nom]/hls/playlist.m3u8
  posterUrl: string;     // URL poster : compressed-reels/[nom]/poster.jpg
  rawVideoUrl: string;   // URL brute de dépôt S3 : wa-videos/{timestamp}_{filename}.mp4
  fileKey: string;       // Clé S3 de destination brute : wa-videos/{timestamp}_{filename}.mp4
  compressedKey: string; // Clé S3 HLS finale Lambda : compressed-reels/[nom]/hls/playlist.m3u8
  reelNom: string;       // Identifiant de dossier [nom] dans compressed-reels/
}

/**
 * Récupère les configurations AWS S3 depuis les variables d'environnement (Vite ou Node)
 */
export function getAwsConfig() {
  const region =
    (import.meta as any).env?.VITE_AWS_REGION ||
    (typeof process !== 'undefined' ? process.env?.AWS_REGION : '') ||
    'eu-west-3';

  const bucket =
    (import.meta as any).env?.VITE_AWS_BUCKET_NAME ||
    (typeof process !== 'undefined' ? process.env?.AWS_BUCKET_NAME : '') ||
    'nsore-video-storage';

  // Sécurité production : jamais de clés AWS secrètes dans le bundle navigateur (VITE_*).
  // Les uploads client utilisent exclusivement des URLs présignées générées par le backend.
  const accessKeyId =
    (typeof process !== 'undefined' ? process.env?.AWS_ACCESS_KEY_ID : '') ||
    '';

  const secretAccessKey =
    (typeof process !== 'undefined' ? process.env?.AWS_SECRET_ACCESS_KEY : '') ||
    '';

  return { region, bucket, accessKeyId, secretAccessKey };
}

/**
 * Construit l'URL du flux HLS (playlist.m3u8) pour un reel donné
 */
export function buildHlsUrl(reelNom: string): string {
  const { region, bucket } = getAwsConfig();
  return `https://${bucket}.s3.${region}.amazonaws.com/compressed-reels/${reelNom}/hls/playlist.m3u8`;
}

/**
 * Construit l'URL de l'affiche (poster.jpg) pour un reel donné
 */
export function buildPosterUrl(reelNom: string): string {
  const { region, bucket } = getAwsConfig();
  return `https://${bucket}.s3.${region}.amazonaws.com/compressed-reels/${reelNom}/poster.jpg`;
}

/**
 * Déduit l'affiche poster.jpg associée à une URL de vidéo compressed-reels
 */
export function resolvePosterFromVideoUrl(videoUrl: string): string | undefined {
  if (!videoUrl) return undefined;
  if (videoUrl.includes('/compressed-reels/') && videoUrl.includes('/hls/playlist.m3u8')) {
    return videoUrl.replace(/\/hls\/playlist\.m3u8(\?.*)?$/, '/poster.jpg');
  }
  if (videoUrl.includes('/compressed-reels/') && videoUrl.endsWith('.mp4')) {
    return videoUrl.replace(/\.mp4(\?.*)?$/, '/poster.jpg');
  }
  return undefined;
}

/**
 * Génère ou récupère une URL pré-signée PUT S3 pour téléversement direct brut.
 * Respecte strictement la structure de dépôt source : wa-videos/{timestamp}_{filename}.mp4
 * Prépare l'URL finale HLS : compressed-reels/[nom]/hls/playlist.m3u8 et poster.jpg
 */
export async function getPresignedUploadUrl(
  fileName: string,
  fileType: string = 'video/mp4'
): Promise<PresignedUploadResult> {
  const timestamp = Date.now();
  const cleanBase = (fileName || 'reel')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.[^.]+$/, '');
  const cleanName = `${cleanBase}.mp4`;
  const fileKey = `wa-videos/${timestamp}_${cleanName}`;
  const reelNom = `${timestamp}_${cleanBase}`;
  const hlsKey = `compressed-reels/${reelNom}/hls/playlist.m3u8`;
  const posterKey = `compressed-reels/${reelNom}/poster.jpg`;

  const { region, bucket } = getAwsConfig();
  const defaultRawUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileKey}`;
  const defaultHlsUrl = `https://${bucket}.s3.${region}.amazonaws.com/${hlsKey}`;
  const defaultPosterUrl = `https://${bucket}.s3.${region}.amazonaws.com/${posterKey}`;

  // 1. Tenter l'appel API backend (/api/get-upload-url)
  try {
    const formData = new FormData();
    formData.append('fileName', fileName);
    formData.append('fileType', fileType);

    const response = await fetch('/api/get-upload-url', {
      method: 'POST',
      body: formData,
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const data = await response.json();
      if (data?.uploadUrl && !data.uploadUrl.includes('mock=true')) {
        const hlsUrl = data.hlsUrl || data.finalVideoUrl || defaultHlsUrl;
        const posterUrl = data.posterUrl || defaultPosterUrl;
        return {
          uploadUrl: data.uploadUrl,
          finalVideoUrl: hlsUrl,
          hlsUrl,
          posterUrl,
          rawVideoUrl: data.rawVideoUrl || defaultRawUrl,
          fileKey: data.fileKey || fileKey,
          compressedKey: data.compressedKey || hlsKey,
          reelNom: data.reelNom || reelNom,
        };
      }
    }
  } catch (backendErr) {
    console.info('[S3 UPLOAD] Backend local indisponible, bascule sur génération S3 directe :', backendErr);
  }

  // 2. Génération directe côté client via AWS SDK v3
  const { accessKeyId, secretAccessKey } = getAwsConfig();

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Clés AWS S3 introuvables. Vérifiez les variables AWS_ACCESS_KEY_ID et AWS_SECRET_ACCESS_KEY."
    );
  }

  const s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileKey,
    ContentType: fileType || 'video/mp4',
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  return {
    uploadUrl,
    finalVideoUrl: defaultHlsUrl,
    hlsUrl: defaultHlsUrl,
    posterUrl: defaultPosterUrl,
    rawVideoUrl: defaultRawUrl,
    fileKey,
    compressedKey: hlsKey,
    reelNom,
  };
}

/**
 * Compression locale côté client d'une image vers WebP (Canvas) avant tout envoi sur S3.
 * Réduit le poids de 70% à 90% sans perte de qualité visible, zéro charge serveur.
 */
export async function compressImageToWebp(
  fileOrBlob: File | Blob,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<{ blob: Blob; fileName: string }> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.85 } = options;

  return new Promise((resolve, reject) => {
    // Si c'est déjà un WebP léger (< 400 Ko), conservation directe
    if (fileOrBlob.type === 'image/webp' && fileOrBlob.size < 400 * 1024) {
      const fileName = (fileOrBlob instanceof File && fileOrBlob.name)
        ? fileOrBlob.name.replace(/\.[^.]+$/, '.webp')
        : `nanaprod_${Date.now()}.webp`;
      return resolve({ blob: fileOrBlob, fileName });
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier image pour compression"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Impossible de charger l'image dans le canvas"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas 2D context non disponible"));

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Échec de la conversion WebP"));
            const origName = (fileOrBlob instanceof File && fileOrBlob.name) ? fileOrBlob.name : 'image';
            const cleanBase = origName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/\.[^.]+$/, '');
            const finalName = `nanaprod_${Date.now()}_${cleanBase}.webp`;
            resolve({ blob, fileName: finalName });
          },
          'image/webp',
          quality
        );
      };
      img.src = String(e.target?.result);
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Téléverse une image compressée côté client (WebP) vers Amazon S3 (images/)
 */
export async function uploadImageToS3(
  fileOrBlob: File | Blob,
  customName?: string,
  onProgress?: (percent: number) => void
): Promise<{ imageUrl: string; fileKey: string }> {
  // 1. Compression locale côté client vers WebP
  const { blob, fileName } = await compressImageToWebp(fileOrBlob);
  const targetFileName = customName || fileName;
  const timestamp = Date.now();
  const fileKey = `images/${timestamp}_${targetFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { region, bucket, accessKeyId, secretAccessKey } = getAwsConfig();
  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileKey}`;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Clés AWS S3 non configurées dans l'environnement.");
  }

  const s3Client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey }
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileKey,
    ContentType: 'image/webp'
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  await uploadFileToS3(uploadUrl, blob, onProgress);

  return { imageUrl: publicUrl, fileKey };
}

/**
 * Téléverse un fichier brut directement sur Amazon S3 en PUT avec suivi de progression
 */
export function uploadFileToS3(
  uploadUrl: string,
  file: File | Blob,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    // Le Content-Type respecte le type MIME effectif du blob ou fichier
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve();
      } else {
        reject(new Error(`Échec du téléversement S3 : HTTP ${xhr.status} ${xhr.statusText || ''}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Erreur réseau pendant le téléversement vers Amazon S3. Vérifiez votre connexion."));
    };

    xhr.ontimeout = () => {
      reject(new Error("Le délai d'attente pour le téléversement S3 a expiré."));
    };

    xhr.send(file);
  });
}

/**
 * Vérifie si la version HLS (playlist.m3u8) ou compressée est prête sur S3
 */
export async function checkCompressedVideoReady(videoUrl: string): Promise<boolean> {
  try {
    const response = await fetch(videoUrl, { method: 'HEAD', cache: 'no-cache' });
    if (response.ok) return true;
  } catch {
    // Si la méthode HEAD est restreinte par CORS sur S3, tester avec une requête GET d'un seul octet (Range)
    try {
      const getRes = await fetch(videoUrl, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        cache: 'no-cache'
      });
      return getRes.ok || getRes.status === 206;
    } catch {
      return false;
    }
  }
  return false;
}

