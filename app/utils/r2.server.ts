import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 1. Client S3 connecté à votre vault Cloudflare R2
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
 * Upload un fichier binaire (Buffer) vers R2
 */
export async function uploadToR2(fileBuffer: Buffer, key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key, // ex: "products/vendor_123/ebook.pdf"
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
export async function getSecureDownloadUrl(key: string, expiresInSeconds = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}
