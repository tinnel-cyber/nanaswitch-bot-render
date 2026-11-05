import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as _archiver from "archiver";
import { PassThrough } from "stream";

const archiver = (_archiver as any).default || _archiver;

// 1. Client S3 connecté au coffre Cloudflare R2
export const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export const BUCKET_NAME = process.env.R2_BUCKET_NAME || "nanasore-digital-vault";

/**
 * Compresse un buffer ou fichier binaire en mémoire vive au format ZIP (Niveau 9)
 * 100% Stream & Buffer en RAM (zéro écriture disque serveur)
 */
export async function compressToZipBuffer(fileBuffer: Buffer, fileName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } }); // Compression maximale niveau 9
    const buffers: Buffer[] = [];
    const customStream = new PassThrough();

    customStream.on("data", (data) => buffers.push(data));
    customStream.on("end", () => resolve(Buffer.concat(buffers)));
    archive.on("error", (err) => reject(err));

    archive.pipe(customStream);
    archive.append(fileBuffer, { name: fileName });
    archive.finalize();
  });
}

/**
 * Upload un fichier binaire (Buffer) vers R2
 */
export async function uploadToR2(fileBuffer: Buffer, key: string, contentType: string = "application/zip") {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key, // ex: "products/vendor_123/ebook.zip" ou "academic/courses/..."
    Body: fileBuffer,
    ContentType: contentType,
  });

  await r2Client.send(command);
  return key;
}

/**
 * Alias compatible acceptant soit (fileKey, body, contentType) soit ({ fileKey, body, contentType })
 */
export async function uploadFileToR2(
  arg1: string | { fileKey: string; body: Buffer | Uint8Array; contentType?: string },
  arg2?: Buffer | Uint8Array,
  arg3?: string
) {
  if (typeof arg1 === "string") {
    return await uploadToR2(Buffer.from(arg2!), arg1, arg3 || "application/octet-stream");
  }
  return await uploadToR2(Buffer.from(arg1.body), arg1.fileKey, arg1.contentType || "application/octet-stream");
}

/**
 * Génère une Signed URL temporaire pour qu'un client télécharge le fichier
 * (Expiration par défaut : 1 heure = 3600 sec)
 */
export async function getSecureDownloadUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Technique secrète 4 : Direct-to-R2 Presigned Upload URL
 * Génère une URL pré-signée PUT directe vers Cloudflare R2.
 * Permet au navigateur de téléverser directement vers Cloudflare Edge sans saturer la RAM du serveur Next.js.
 */
export async function getDirectUploadPresignedUrl(
  key: string,
  contentType: string = "application/zip",
  expiresInSeconds: number = 600
): Promise<{ uploadUrl: string; fileKey: string; bucket: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
  return {
    uploadUrl,
    fileKey: key,
    bucket: BUCKET_NAME,
  };
}
