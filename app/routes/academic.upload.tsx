import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, Link, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import archiver from "archiver";
import { PassThrough } from "stream";
import { uploadFileToR2 } from "~/utils/r2.server";
import { getSession } from "~/sessions.server";
import {
  UploadCloud,
  GraduationCap,
  BookOpen,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

export type AcademicRole = "professeur" | "etudiant";
export type AcademicUploadType = "cours" | "rendu";

export interface AcademicUploadMetadata {
  subject?: string;
  courseTitle?: string;
  courseId?: string;
  accessLevel?: string;
  assignmentName?: string;
  assignmentId?: string;
  studentNumber?: string;
  studentName?: string;
  comments?: string;
}

export interface ActionData {
  success: boolean;
  message?: string;
  fileKey?: string;
  uploadId?: string | null;
  role?: AcademicRole;
  uploadType?: AcademicUploadType;
  originalSize?: string;
  compressedSize?: string;
  error?: string;
}

/**
 * Fonction utilitaire : Compresse un buffer en mémoire vive au format ZIP (Niveau 9)
 * 100% Stream & Buffer en RAM (zéro écriture disque serveur)
 */
async function compressToZipBuffer(fileBuffer: Buffer, fileName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } }); // Compression maximale
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

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const cookie = request.headers.get("Cookie");
  const session = await getSession(cookie);
  const sessionUser = session.get("user");

  // Détection du rôle : paramètre d'URL prioritaire ou rôle en session
  const roleParam = url.searchParams.get("role")?.toLowerCase();
  let defaultRole: AcademicRole = "professeur";

  if (roleParam === "etudiant" || roleParam === "student") {
    defaultRole = "etudiant";
  } else if (roleParam === "professeur" || roleParam === "teacher" || roleParam === "instructor") {
    defaultRole = "professeur";
  } else if (sessionUser?.role === "etudiant" || sessionUser?.role === "student") {
    defaultRole = "etudiant";
  }

  // Identifiants pré-remplis
  const userId = sessionUser?.id || (defaultRole === "professeur" ? "prof_01" : "etu_8842");
  const userName = sessionUser?.name || (defaultRole === "professeur" ? "Prof. Amédée" : "Étudiant Moussa");
  const studentNumber = sessionUser?.studentNumber || "ETU-2026-9041";

  // Liste des cours disponibles pour la remise de devoirs
  const availableCourses = [
    { id: "remix-r2-masterclass", title: "Masterclass Remix & Cloudflare R2", prof: "Prof. Amédée" },
    { id: "commerce-afrique-mobile", title: "E-Commerce & Mobile Money", prof: "Dr. Konkobo" },
    { id: "dev-web-fullstack", title: "Développement Web & APIs Souveraines", prof: "Ing. Traoré" },
    { id: "comptabilite-gestion", title: "Comptabilité et Gestion Commerciale", prof: "Mme Ouédraogo" },
  ];

  return json({
    user: { id: userId, name: userName, studentNumber },
    defaultRole,
    availableCourses,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const role = (formData.get("role") as AcademicRole) || "professeur";
    const file = formData.get("academicFile") as File;

    if (!file || typeof file === "string" || file.size === 0) {
      return json<ActionData>({ success: false, error: "Veuillez sélectionner un fichier valide à téléverser." }, { status: 400 });
    }

    // Récupération de la session
    const cookie = request.headers.get("Cookie");
    const session = await getSession(cookie);
    const sessionUser = session.get("user");

    const timestamp = Date.now();
    const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    const sanitizedBase = baseName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const zipFileName = `${sanitizedBase}.zip`;

    // 1. Compression automatique en ZIP (Niveau 9)
    const rawArrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(rawArrayBuffer);
    const originalSizeMb = (file.size / (1024 * 1024)).toFixed(2);

    const compressedZipBuffer = await compressToZipBuffer(rawBuffer, file.name);
    const compressedSizeMb = (compressedZipBuffer.length / (1024 * 1024)).toFixed(2);

    let fileKey = "";
    let uploadType: AcademicUploadType = "cours";
    let metadata: AcademicUploadMetadata = {};
    let userId = "";

    if (role === "professeur") {
      uploadType = "cours";
      userId = (formData.get("profId") as string) || sessionUser?.id || "prof_01";
      const courseTitle = (formData.get("courseTitle") as string)?.trim() || "Cours Numérique";
      const courseId = (formData.get("courseId") as string)?.trim() || courseTitle.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const subject = (formData.get("subject") as string)?.trim() || "Général";
      const accessLevel = (formData.get("accessLevel") as string) || "public_campus";

      // Clé R2 Professeur : academic/courses/[prof_id]/[course_id]/[timestamp]-[filename].zip
      fileKey = `academic/courses/${userId}/${courseId}/${timestamp}-${zipFileName}`;

      metadata = {
        courseTitle,
        courseId,
        subject,
        accessLevel,
      };
    } else {
      uploadType = "rendu";
      userId = (formData.get("studentId") as string) || sessionUser?.id || "etu_8842";
      const assignmentName = (formData.get("assignmentName") as string)?.trim() || "Devoir Remis";
      const assignmentId = assignmentName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const courseId = (formData.get("courseId") as string) || "cours_general";
      const studentNumber = (formData.get("studentNumber") as string)?.trim() || "ETU-NON-DEFINI";
      const comments = (formData.get("comments") as string)?.trim() || "";

      // Clé R2 Étudiant : academic/submissions/[student_id]/[assignment_id]/[timestamp]-[filename].zip
      fileKey = `academic/submissions/${userId}/${assignmentId}/${timestamp}-${zipFileName}`;

      metadata = {
        assignmentName,
        assignmentId,
        courseId,
        studentNumber,
        comments,
      };
    }

    // 2. Transfert vers le Vault Cloudflare R2
    try {
      if (process.env.R2_ENDPOINT_URL && process.env.R2_ACCESS_KEY_ID) {
        await uploadFileToR2(fileKey, compressedZipBuffer, "application/zip");
        console.log(`[R2 ACADÉMIQUE SUCCÈS] Fichier stocké à la clé : ${fileKey}`);
      } else {
        console.warn(`[R2 ACADÉMIQUE SIMULATION] Clés R2 non définies. Simulation pour la clé : ${fileKey}`);
      }
    } catch (r2Err) {
      console.error("Erreur Cloudflare R2 :", r2Err);
      return json<ActionData>({ success: false, error: "Échec du transfert sécurisé vers le vault Cloudflare R2." }, { status: 502 });
    }

    // 3. Synchronisation Supabase (Table `academic_uploads`)
    let insertedUploadId: string | null = null;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      try {
        const { supabase } = await import("~/utils/supabase.server");
        const { data: uploadRecord, error: dbErr } = await supabase
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
          .single();

        if (dbErr) {
          console.error("❌ Erreur table academic_uploads Supabase :", dbErr);
        } else if (uploadRecord) {
          insertedUploadId = uploadRecord.id;
          console.log(`[SUPABASE ACADÉMIQUE] Enregistré sous l'ID : ${insertedUploadId}`);
        }
      } catch (dbErr) {
        console.warn("Notice Supabase academic_uploads :", dbErr);
      }
    }

    const successMessage = role === "professeur"
      ? `Le cours "${metadata.courseTitle}" a été compressé (${compressedSizeMb} Mo) et publié avec succès dans le coffre académique !`
      : `Votre devoir "${metadata.assignmentName}" a été compressé (${compressedSizeMb} Mo) et remis avec succès au professeur !`;

    return json<ActionData>({
      success: true,
      message: successMessage,
      fileKey,
      uploadId: insertedUploadId,
      role,
      uploadType,
      originalSize: `${originalSizeMb} Mo`,
      compressedSize: `${compressedSizeMb} Mo`,
    });
  } catch (error) {
    console.error("Erreur serveur lors de l'upload académique:", error);
    return json<ActionData>({ success: false, error: "Erreur technique lors de la compression ou de l'upload." }, { status: 500 });
  }
}

export default function AcademicUploadPage() {
  const { user, defaultRole, availableCourses } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const fetcher = useFetcher<ActionData>();

  // Rôle actif modifiable par les onglets
  const initialRole = (searchParams.get("role") as AcademicRole) || defaultRole;
  const [activeRole, setActiveRole] = useState<AcademicRole>(initialRole);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);
  const isSubmitting = fetcher.state === "submitting";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFileName(f.name);
      setSelectedFileSize((f.size / (1024 * 1024)).toFixed(2) + " Mo");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-16">
      {/* En-tête Bleu Royal Nanasore */}
      <header className="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 text-white py-8 px-4 sm:px-6 shadow-md border-b border-blue-900/40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
              <UploadCloud className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight">Espace Upload Académique</h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-100 border border-blue-400/30">
                  R2 Vault
                </span>
              </div>
              <p className="text-blue-100 text-xs sm:text-sm mt-0.5">
                Module unifié pour la publication de cours et la remise de devoirs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/client/dashboard"
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/20 transition flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4 text-blue-200" />
              Mes Téléchargements
            </Link>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 mt-8">
        {/* Sélecteur de rôle interactif (Professeur / Étudiant) */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setActiveRole("professeur")}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeRole === "professeur"
                ? "bg-blue-700 text-white shadow-md shadow-blue-700/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Mode Professeur (Publication de cours & ressources)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveRole("etudiant")}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeRole === "etudiant"
                ? "bg-blue-700 text-white shadow-md shadow-blue-700/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Mode Étudiant (Remise de devoirs & projets)</span>
          </button>
        </div>

        {/* Formulaire Principal */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          {/* Titre dynamique de la section */}
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                {activeRole === "professeur" ? (
                  <>
                    <GraduationCap className="w-5 h-5 text-blue-700" />
                    Déposer un support de cours ou un devoir
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 text-blue-700" />
                    Soumettre un devoir ou un travail dirigé
                  </>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {activeRole === "professeur"
                  ? "Vos fichiers seront automatiquement compressés en ZIP et stockés dans le dossier académique de votre matière."
                  : "Votre rendu sera compressé, horodaté et déposé directement dans le casier numérique du professeur."}
              </p>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
              <UserCheck className="w-3.5 h-3.5 text-blue-700" />
              {activeRole === "professeur" ? "Enseignant" : "Étudiant"}
            </span>
          </div>

          {/* Retour de succès */}
          {fetcher.data?.success && (
            <div className="mb-6 p-4 sm:p-5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-sm flex items-start gap-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-emerald-950">{fetcher.data.message}</p>
                {fetcher.data.fileKey && (
                  <p className="text-xs text-emerald-700 font-mono break-all bg-emerald-100/60 p-2 rounded-lg">
                    Emplacement R2 : {fetcher.data.fileKey}
                  </p>
                )}
                {fetcher.data.compressedSize && (
                  <p className="text-xs text-emerald-600 font-medium">
                    Taille compressée : {fetcher.data.compressedSize} (depuis {fetcher.data.originalSize})
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Retour d'erreur */}
          {fetcher.data?.error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-semibold">{fetcher.data.error}</span>
            </div>
          )}

          <fetcher.Form method="post" encType="multipart/form-data" className="space-y-6">
            <input type="hidden" name="role" value={activeRole} />

            {/* CHAMPS SPÉCIFIQUES PROFESSEUR */}
            {activeRole === "professeur" && (
              <>
                <input type="hidden" name="profId" value={user.id} />

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                    Titre du cours / Ressource pédagogique *
                  </label>
                  <input
                    type="text"
                    name="courseTitle"
                    required
                    placeholder="Ex: Masterclass Remix - Module 4 : Cloudflare R2 & Presigned URLs"
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                      Matière ou Filière *
                    </label>
                    <input
                      type="text"
                      name="subject"
                      required
                      placeholder="Ex: Informatique, Gestion, Marketing..."
                      className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                      Niveau d'accès / Visibilité
                    </label>
                    <select
                      name="accessLevel"
                      className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    >
                      <option value="public_campus">Tous les étudiants du Campus</option>
                      <option value="promo_2026">Promotion 2026 uniquement</option>
                      <option value="groupe_vip">Groupe de Travail VIP</option>
                      <option value="devoir_a_rendre">Devoir avec date limite</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* CHAMPS SPÉCIFIQUES ÉTUDIANT */}
            {activeRole === "etudiant" && (
              <>
                <input type="hidden" name="studentId" value={user.id} />

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                    Intitulé du devoir ou du projet remis *
                  </label>
                  <input
                    type="text"
                    name="assignmentName"
                    required
                    placeholder="Ex: Rendu TP Final - Création d'un E-Shop Remix avec Mobile Money"
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                      Sélectionner le cours destinataire *
                    </label>
                    <select
                      name="courseId"
                      required
                      className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    >
                      {availableCourses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.prof})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                      Numéro d'étudiant / Matricule *
                    </label>
                    <input
                      type="text"
                      name="studentNumber"
                      required
                      defaultValue={user.studentNumber}
                      placeholder="Ex: ETU-2026-9041"
                      className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                    Commentaires ou notes pour l'enseignant (optionnel)
                  </label>
                  <textarea
                    name="comments"
                    rows={2}
                    placeholder="Précisez ici les particularités de votre travail, lien Git ou remarques..."
                    className="w-full px-4 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm resize-none"
                  />
                </div>
              </>
            )}

            {/* Zone Dropzone universelle avec compression ZIP automatique */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">
                  {activeRole === "professeur"
                    ? "Fichiers de cours & supports (PDF, DOCX, ZIP, Code, Diapositives)"
                    : "Fichier de rendu de votre devoir (Archive ZIP, PDF, Code source)"}
                </label>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Compression Max (zlib 9)
                </span>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-blue-600 transition bg-[#f8fafc] relative group cursor-pointer">
                <input
                  type="file"
                  name="academicFile"
                  required
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-14 h-14 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-blue-100 shadow-xs">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {selectedFileName ? (
                      <span className="text-blue-700 font-extrabold">
                        {selectedFileName} {selectedFileSize && `(${selectedFileSize})`}
                      </span>
                    ) : (
                      <>
                        Glissez votre fichier ici, ou{" "}
                        <span className="text-blue-700 underline font-extrabold">parcourez votre ordinateur</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Compression ZIP automatique en mémoire avant envoi vers le vault Cloudflare R2
                  </p>
                </div>
              </div>
            </div>

            {/* Bouton de Soumission */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-blue-700/25 transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-40" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Compression ZIP (Niveau 9) & Envoi vers le Coffre R2...
                </>
              ) : (
                <>
                  <UploadCloud className="w-5 h-5" />
                  {activeRole === "professeur"
                    ? "Compresser et Publier la Ressource Académique"
                    : "Compresser et Déposer mon Devoir"}
                </>
              )}
            </button>
          </fetcher.Form>
        </div>

        {/* Note de sécurité & cloisonnement */}
        <div className="mt-8 bg-white border border-slate-200/90 rounded-2xl p-5 flex items-center gap-3.5 shadow-xs">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-800">Cloisonnement sécurisé : </span>
            Les fichiers professeurs sont archivés sous <code className="font-mono text-blue-700 bg-blue-50 px-1 py-0.5 rounded">academic/courses/</code> et les devoirs étudiants sous <code className="font-mono text-blue-700 bg-blue-50 px-1 py-0.5 rounded">academic/submissions/</code>.
          </div>
        </div>
      </main>
    </div>
  );
}
