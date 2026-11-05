"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  UploadCloud,
  GraduationCap,
  BookOpen,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Store,
  Lock,
  ArrowRight
} from "lucide-react";
import { handleUnifiedUpload, UploadActionState } from "@/app/actions/upload";
import DynamicCelebration from "@/app/components/DynamicCelebration";

export type UploadRole = "professeur" | "etudiant" | "vendor";

interface VendorUploadClientProps {
  user: {
    id: string;
    name: string;
    studentNumber?: string;
  };
  defaultRole: UploadRole;
  availableCourses: Array<{ id: string; title: string; prof: string }>;
  isReadOnly: boolean;
  kycStatus: string;
}

function SubmitButton({ activeRole }: { activeRole: UploadRole }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-blue-700/25 transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] cursor-pointer"
    >
      {pending ? (
        <>
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-40" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Compression ZIP RAM (Niveau 9) & Envoi vers le Coffre R2...
        </>
      ) : (
        <>
          <UploadCloud className="w-5 h-5" />
          {activeRole === "professeur"
            ? "Compresser et Publier la Ressource Académique"
            : activeRole === "vendor"
            ? "Compresser et Mettre en Ligne le Produit Marchand"
            : "Compresser et Déposer mon Devoir"}
        </>
      )}
    </button>
  );
}

export default function VendorUploadClient({
  user,
  defaultRole,
  availableCourses,
  isReadOnly,
  kycStatus,
}: VendorUploadClientProps) {
  const [activeRole, setActiveRole] = useState<UploadRole>(defaultRole);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);

  const initialState: UploadActionState = { success: false };
  const [state, formAction] = useActionState(handleUnifiedUpload, initialState);

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
                <h1 className="text-2xl font-black tracking-tight">Upload Académique & Marchand</h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-100 border border-blue-400/30">
                  R2 Vault
                </span>
              </div>
              <p className="text-blue-100 text-xs sm:text-sm mt-0.5">
                Module unifié : Compression ZIP level 9 à la volée & synchronisation Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/client/dashboard"
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
        {/* Avertissement Mode Read-Only si compte non ouvert */}
        {isReadOnly && (
          <div className="mb-6 p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-amber-950">Mode Consultation & Démo (Read Only)</h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Votre compte marchand n'est pas encore validé (KYC : {kycStatus}). Vous pouvez tester la compression en direct, mais pour activer la vente publique, veuillez ouvrir votre compte.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition"
            >
              <span>Ouvrir mon compte</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Sélecteur de rôle interactif (Professeur / Étudiant / Marchand) */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap sm:flex-nowrap items-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setActiveRole("professeur")}
            className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeRole === "professeur"
                ? "bg-blue-700 text-white shadow-md shadow-blue-700/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Professeur</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveRole("etudiant")}
            className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeRole === "etudiant"
                ? "bg-blue-700 text-white shadow-md shadow-blue-700/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Étudiant</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveRole("vendor")}
            className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeRole === "vendor"
                ? "bg-blue-700 text-white shadow-md shadow-blue-700/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Marchand</span>
          </button>
        </div>

        {/* Formulaire Principal relié à la Server Action */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          {/* Titre dynamique */}
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                {activeRole === "professeur" ? (
                  <>
                    <GraduationCap className="w-5 h-5 text-blue-700" />
                    Déposer un support de cours ou devoir
                  </>
                ) : activeRole === "vendor" ? (
                  <>
                    <Store className="w-5 h-5 text-blue-700" />
                    Mettre en ligne un produit numérique marchand
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
                  : activeRole === "vendor"
                  ? "Votre produit numérique sera archivé et sécurisé pour délivrance automatique post-paiement."
                  : "Votre rendu sera compressé, horodaté et déposé directement dans le casier numérique du professeur."}
              </p>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
              <UserCheck className="w-3.5 h-3.5 text-blue-700" />
              {activeRole === "professeur" ? "Enseignant" : activeRole === "vendor" ? "Marchand" : "Étudiant"}
            </span>
          </div>

          {/* Retour de succès */}
          {state.success && (
            <div className="mb-6 p-4 sm:p-5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-sm flex items-start gap-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-bold text-emerald-950">{state.message}</p>
                  <DynamicCelebration trigger={state.success} />
                </div>
                {state.fileKey && (
                  <p className="text-xs text-emerald-700 font-mono break-all bg-emerald-100/60 p-2 rounded-lg">
                    Emplacement R2 : {state.fileKey}
                  </p>
                )}
                {state.compressedSize && (
                  <p className="text-xs text-emerald-600 font-medium">
                    Taille compressée : {state.compressedSize} (depuis {state.originalSize})
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Retour d'erreur ou read_only */}
          {state.error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-semibold">{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-6">
            <input type="hidden" name="role" value={activeRole} />
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="checkAccountStatus" value={isReadOnly ? "false" : "true"} />

            {/* CHAMPS PROFESSEUR */}
            {activeRole === "professeur" && (
              <>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                    Titre du cours / Ressource pédagogique *
                  </label>
                  <input
                    type="text"
                    name="courseTitle"
                    required
                    placeholder="Ex: Masterclass Next.js App Router & Cloudflare R2"
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

            {/* CHAMPS MARCHAND */}
            {activeRole === "vendor" && (
              <>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                    Nom du Produit Numérique *
                  </label>
                  <input
                    type="text"
                    name="productName"
                    required
                    placeholder="Ex: E-book Masterclass Architecture Micro-Relais"
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                      Catégorie *
                    </label>
                    <input
                      type="text"
                      name="category"
                      required
                      placeholder="Ex: E-book, Templates, Formation Vidéo..."
                      className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                      Prix (FCFA) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      required
                      min="0"
                      step="100"
                      placeholder="Ex: 5000"
                      className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            {/* CHAMPS ÉTUDIANT */}
            {activeRole === "etudiant" && (
              <>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                    Intitulé du devoir ou du projet remis *
                  </label>
                  <input
                    type="text"
                    name="assignmentName"
                    required
                    placeholder="Ex: Rendu TP Final - Création d'un E-Shop avec Next.js & Mobile Money"
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
                      defaultValue={user.studentNumber || "ETU-2026-9041"}
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

            {/* Zone Dropzone universelle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">
                  {activeRole === "professeur"
                    ? "Fichiers de cours (PDF, DOCX, ZIP, Code)"
                    : activeRole === "vendor"
                    ? "Fichier du produit (PDF, ZIP, Vidéo, MP3)"
                    : "Fichier de devoir (ZIP, PDF, Code)"}
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

            <SubmitButton activeRole={activeRole} />
          </form>
        </div>

        {/* Note de sécurité */}
        <div className="mt-8 bg-white border border-slate-200/90 rounded-2xl p-5 flex items-center gap-3.5 shadow-xs">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-800">Cloisonnement sécurisé : </span>
            Les fichiers professeurs sont archivés sous <code className="font-mono text-blue-700 bg-blue-50 px-1 py-0.5 rounded">academic/courses/</code>, les produits marchands sous <code className="font-mono text-blue-700 bg-blue-50 px-1 py-0.5 rounded">products/vendors/</code> et les devoirs étudiants sous <code className="font-mono text-blue-700 bg-blue-50 px-1 py-0.5 rounded">academic/submissions/</code>.
          </div>
        </div>
      </main>
    </div>
  );
}
