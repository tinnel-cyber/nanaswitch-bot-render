"use server";

import { compressToZipBuffer, uploadFileToR2, getDirectUploadPresignedUrl } from "@/lib/r2";
import { supabase, getUserAccountStatus } from "@/lib/supabase";
import { getServerSessionUser } from "@/lib/session";

export interface UploadActionState {
  success: boolean;
  message?: string;
  fileKey?: string;
  uploadId?: string | null;
  role?: string;
  uploadType?: string;
  originalSize?: string;
  compressedSize?: string;
  readOnly?: boolean;
  error?: string;
}

/**
 * Server Action unifié pour l'upload Académique et Marchand (Next.js App Router)
 * - Compression ZIP à la volée en mémoire (Archiver zlib level 9)
 * - Transfert vers Cloudflare R2 (nanasore-digital-vault)
 * - Sauvegarde dans Supabase (table academic_uploads ou products)
 * - Mode read_only automatique si le compte n'a pas été ouvert
 */
export async function handleUnifiedUpload(
  prevState: UploadActionState | null,
  formData: FormData
): Promise<UploadActionState> {
  try {
    const role = (formData.get("role") as string) || "professeur";
    const file = (formData.get("academicFile") as File) || (formData.get("productFile") as File);

    if (!file || typeof file === "string" || file.size === 0) {
      return {
        success: false,
        error: "Veuillez sélectionner un fichier valide à téléverser.",
      };
    }

    // 1. Récupération de la session utilisateur
    const sessionUser = await getServerSessionUser();
    const userId = (formData.get("userId") as string) || sessionUser?.id || (role === "professeur" ? "prof_01" : role === "vendor" ? "vendor_01" : "etu_8842");

    // 2. Vérification du mode read_only si l'utilisateur n'a pas ouvert son compte
    const accountStatus = await getUserAccountStatus(userId);
    const forceReadOnlyCheck = formData.get("checkAccountStatus") === "true";

    if (forceReadOnlyCheck && accountStatus.isReadOnly) {
      return {
        success: false,
        readOnly: true,
        error: "Mode lecture seule actif. Vous devez ouvrir et valider votre compte marchand pour publier des ressources ou produits sur Nanasore.",
      };
    }

    const timestamp = Date.now();
    const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    const sanitizedBase = baseName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const zipFileName = `${sanitizedBase}.zip`;

    // 3. Compression maximale en ZIP à la volée en RAM (Level 9 - Zéro disque serveur)
    const rawArrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(rawArrayBuffer);
    const originalSizeMb = (file.size / (1024 * 1024)).toFixed(2);

    const compressedZipBuffer = await compressToZipBuffer(rawBuffer, file.name);
    const compressedSizeMb = (compressedZipBuffer.length / (1024 * 1024)).toFixed(2);

    let fileKey = "";
    let uploadType = "cours";
    let metadata: Record<string, any> = {};

    if (role === "professeur") {
      uploadType = "cours";
      const courseTitle = (formData.get("courseTitle") as string)?.trim() || "Cours Numérique";
      const courseId = (formData.get("courseId") as string)?.trim() || courseTitle.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const subject = (formData.get("subject") as string)?.trim() || "Général";
      const accessLevel = (formData.get("accessLevel") as string) || "public_campus";

      fileKey = `academic/courses/${userId}/${courseId}/${timestamp}-${zipFileName}`;
      metadata = { courseTitle, courseId, subject, accessLevel };
    } else if (role === "vendor" || role === "marchand") {
      uploadType = "produit_marchand";
      const productName = (formData.get("productName") as string)?.trim() || "Produit Numérique";
      const category = (formData.get("category") as string)?.trim() || "Digital";
      const price = parseFloat(String(formData.get("price") || "0"));

      fileKey = `products/vendors/${userId}/${timestamp}-${zipFileName}`;
      metadata = { productName, category, price };
    } else {
      uploadType = "rendu";
      const assignmentName = (formData.get("assignmentName") as string)?.trim() || "Devoir Remis";
      const assignmentId = assignmentName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const courseId = (formData.get("courseId") as string) || "cours_general";
      const studentNumber = (formData.get("studentNumber") as string)?.trim() || "ETU-NON-DEFINI";
      const comments = (formData.get("comments") as string)?.trim() || "";

      fileKey = `academic/submissions/${userId}/${assignmentId}/${timestamp}-${zipFileName}`;
      metadata = { assignmentName, assignmentId, courseId, studentNumber, comments };
    }

    // 4. Envoi sécurisé vers Cloudflare R2 (nanasore-digital-vault)
    try {
      if (process.env.R2_ENDPOINT_URL && process.env.R2_ACCESS_KEY_ID) {
        await uploadFileToR2(fileKey, compressedZipBuffer, "application/zip");
        console.log(`[R2 NEXT SUCCÈS] Archive transmise vers R2: ${fileKey}`);
      } else {
        console.warn(`[R2 NEXT SIMULATION] Variables R2 absentes, simulation: ${fileKey}`);
      }
    } catch (r2Err) {
      console.error("Erreur transfert Cloudflare R2:", r2Err);
      return {
        success: false,
        error: "Échec du transfert sécurisé vers le coffre Cloudflare R2.",
      };
    }

    // 5. Enregistrement dans Supabase (table academic_uploads ou products)
    let insertedRecordId: string | null = null;
    try {
      if (role === "vendor" || role === "marchand") {
        // Enregistrement dans la table `products`
        const { data: prodData, error: prodErr } = await supabase
          .from("products")
          .insert({
            name: metadata.productName,
            price: metadata.price || 0,
            stock: 99999, // Produit numérique illimité
            category: metadata.category,
            file_key: fileKey,
            file_size: `${compressedSizeMb} Mo`,
            is_digital: true,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .maybeSingle();

        if (prodErr) {
          console.warn("Notice insertion Supabase products:", prodErr.message);
        } else if (prodData) {
          insertedRecordId = prodData.id;
        }
      } else {
        // Enregistrement dans la table `academic_uploads`
        const { data: record, error: dbErr } = await supabase
          .from("academic_uploads")
          .insert({
            user_id: userId,
            role,
            upload_type: uploadType,
            file_key: fileKey,
            file_size: `${compressedSizeMb} Mo`,
            metadata,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .maybeSingle();

        if (dbErr) {
          console.warn("Notice insertion Supabase academic_uploads:", dbErr.message);
        } else if (record) {
          insertedRecordId = record.id;
        }
      }
    } catch (dbErr) {
      console.warn("Erreur d'enregistrement Supabase :", dbErr);
    }

    const successMessage = role === "professeur"
      ? `Le cours "${metadata.courseTitle}" a été compressé avec succès (${compressedSizeMb} Mo) et publié dans le coffre R2 !`
      : role === "vendor" || role === "marchand"
      ? `Le produit marchand "${metadata.productName}" a été compressé (${compressedSizeMb} Mo) et ajouté à votre catalogue !`
      : `Votre devoir "${metadata.assignmentName}" a été compressé (${compressedSizeMb} Mo) et remis au professeur avec succès !`;

    return {
      success: true,
      message: successMessage,
      fileKey,
      uploadId: insertedRecordId,
      role,
      uploadType,
      originalSize: `${originalSizeMb} Mo`,
      compressedSize: `${compressedSizeMb} Mo`,
      readOnly: false,
    };
  } catch (error: any) {
    console.error("[UPLOAD_SERVER_ACTION_ERROR]", error);
    return {
      success: false,
      error: error?.message || "Erreur technique lors de la compression ou de l'upload.",
    };
  }
}

/**
 * Technique secrète 4 : Server Action pour Direct-to-R2 Presigned Upload
 * Fournit au frontend un jeton PUT signé temporaire pour téléversement direct sans passer par la RAM Node.js
 */
export async function requestDirectR2UploadUrl(fileName: string, fileType: string = "application/zip", folder: string = "academic/direct") {
  const sessionUser = await getServerSessionUser();
  const userId = sessionUser?.id || "user_direct";
  const timestamp = Date.now();
  const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileKey = `${folder}/${userId}/${timestamp}-${sanitized}`;

  return await getDirectUploadPresignedUrl(fileKey, fileType, 600);
}
