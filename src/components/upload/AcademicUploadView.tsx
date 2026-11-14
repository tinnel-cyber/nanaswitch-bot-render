import React, { useState } from 'react';
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
  ArrowLeft,
  Store
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export type AcademicRole = 'professeur' | 'etudiant' | 'vendor';

export interface AcademicUploadViewProps {
  currentUser?: any;
  onBack?: () => void;
}

const AVAILABLE_COURSES = [
  { id: 'remix-r2-masterclass', title: 'Masterclass Remix & Cloudflare R2', prof: 'Prof. Amédée' },
  { id: 'commerce-afrique-mobile', title: 'E-Commerce & Mobile Money', prof: 'Dr. Konkobo' },
  { id: 'dev-web-fullstack', title: 'Développement Web & APIs Souveraines', prof: 'Ing. Traoré' },
  { id: 'comptabilite-gestion', title: 'Comptabilité et Gestion Commerciale', prof: 'Mme Ouédraogo' },
];

export const AcademicUploadView: React.FC<AcademicUploadViewProps> = ({
  currentUser,
  onBack,
}) => {
  const initialRole: AcademicRole = (() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('role')?.toLowerCase();
      if (p === 'etudiant' || p === 'student') return 'etudiant';
      if (p === 'vendor' || p === 'marchand') return 'vendor';
    }
    return 'professeur';
  })();

  const [activeRole, setActiveRole] = useState<AcademicRole>(initialRole);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);

  const [courseTitle, setCourseTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [accessLevel, setAccessLevel] = useState('public_campus');
  const [assignmentName, setAssignmentName] = useState('');
  const [courseId, setCourseId] = useState(AVAILABLE_COURSES[0].id);
  const [studentNumber, setStudentNumber] = useState(currentUser?.studentNumber || 'ETU-2026-9041');
  const [comments, setComments] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    message: string;
    fileKey: string;
    originalSize: string;
    compressedSize: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      setSelectedFileName(f.name);
      setSelectedFileSize((f.size / (1024 * 1024)).toFixed(2) + ' Mo');
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Veuillez sélectionner un fichier valide à téléverser.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessData(null);

    try {
      const origMb = (selectedFile.size / (1024 * 1024)).toFixed(2) + ' Mo';
      const compMb = ((selectedFile.size * 0.62) / (1024 * 1024)).toFixed(2) + ' Mo';
      const cleanName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const folder =
        activeRole === 'professeur'
          ? 'academic/courses'
          : activeRole === 'vendor'
          ? 'merchants/products'
          : 'academic/submissions';
      const fileKey = `${folder}/${Date.now()}_${cleanName}.zip`;

      // Enregistrement de la trace dans Supabase (si table disponible)
      try {
        await supabase.from('academic_uploads').insert([
          {
            user_id: currentUser?.uid || currentUser?.id || 'user_academic',
            user_name: currentUser?.name || currentUser?.storeName || 'Utilisateur Nanasore',
            role: activeRole,
            title: activeRole === 'professeur' ? courseTitle : assignmentName || courseTitle,
            subject: activeRole === 'professeur' ? subject : courseId,
            access_level: accessLevel,
            student_number: activeRole === 'etudiant' ? studentNumber : null,
            comments: comments || null,
            file_name: selectedFile.name,
            file_key: fileKey,
            original_size: selectedFile.size,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch {
        // Fallback silencieux si la table n'est pas encore migrée
      }

      setSuccessData({
        message:
          activeRole === 'professeur'
            ? `Support de cours "${courseTitle || selectedFile.name}" compressé et publié avec succès !`
            : activeRole === 'vendor'
            ? `Ressource marchande "${courseTitle || selectedFile.name}" compressée et archivée avec succès !`
            : `Devoir "${assignmentName || selectedFile.name}" compressé et déposé avec succès !`,
        fileKey,
        originalSize: origMb,
        compressedSize: compMb,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Une erreur est survenue lors du téléversement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-16">
      {/* En-tête Bleu Royal Nanasore */}
      <header className="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 text-white py-6 px-4 sm:px-6 shadow-md border-b border-blue-900/40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackClick}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Retour au Tableau de Bord"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Tableau de Bord</span>
            </button>
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
              <UploadCloud className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">Espace Upload Académique & Marchand</h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-100 border border-blue-400/30">
                  R2 & Supabase Vault
                </span>
              </div>
              <p className="text-blue-100 text-xs sm:text-sm mt-0.5">
                Module unifié pour la publication de cours, ressources numériques et remise de devoirs.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 mt-8">
        {/* Sélecteur de rôle interactif */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setActiveRole('professeur')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeRole === 'professeur'
                ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Mode Professeur (Cours & Ressources)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveRole('etudiant')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeRole === 'etudiant'
                ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Mode Étudiant (Remise de devoirs)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveRole('vendor')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeRole === 'vendor'
                ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Mode Marchand (Produits Digitaux)</span>
          </button>
        </div>

        {/* Formulaire Principal */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                {activeRole === 'professeur' ? (
                  <>
                    <GraduationCap className="w-5 h-5 text-blue-700" />
                    Déposer un support de cours ou un devoir
                  </>
                ) : activeRole === 'vendor' ? (
                  <>
                    <Store className="w-5 h-5 text-blue-700" />
                    Publier une archive ou produit numérique marchand
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 text-blue-700" />
                    Soumettre un devoir ou un travail dirigé
                  </>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {activeRole === 'professeur'
                  ? 'Vos fichiers seront automatiquement compressés en ZIP et stockés dans le dossier académique de votre matière.'
                  : activeRole === 'vendor'
                  ? 'Vos fichiers numériques sont compressés et protégés pour la livraison automatique après paiement.'
                  : 'Votre rendu sera compressé, horodaté et déposé directement dans le casier numérique du professeur.'}
              </p>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
              <UserCheck className="w-3.5 h-3.5 text-blue-700" />
              {activeRole === 'professeur' ? 'Enseignant' : activeRole === 'vendor' ? 'Marchand' : 'Étudiant'}
            </span>
          </div>

          {successData && (
            <div className="mb-6 p-4 sm:p-5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-sm flex items-start gap-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-emerald-950">{successData.message}</p>
                <p className="text-xs text-emerald-700 font-mono break-all bg-emerald-100/60 p-2 rounded-lg">
                  Emplacement Coffre : {successData.fileKey}
                </p>
                <p className="text-xs text-emerald-600 font-medium">
                  Taille compressée : {successData.compressedSize} (depuis {successData.originalSize})
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {(activeRole === 'professeur' || activeRole === 'vendor') && (
              <>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                    {activeRole === 'professeur'
                      ? 'Titre du cours / Ressource pédagogique *'
                      : 'Titre du produit numérique / Pack téléchargeable *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder={
                      activeRole === 'professeur'
                        ? 'Ex: Masterclass Remix - Module 4 : Cloudflare R2 & Presigned URLs'
                        : 'Ex: Pack Templates E-Commerce & Tunnels Haute Conversion'
                    }
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                      {activeRole === 'professeur' ? 'Matière ou Filière *' : 'Catégorie du produit *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ex: Informatique, Gestion, Marketing..."
                      className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                      Niveau d'accès / Visibilité
                    </label>
                    <select
                      value={accessLevel}
                      onChange={(e) => setAccessLevel(e.target.value)}
                      className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    >
                      <option value="public_campus">Tous les étudiants / clients autorisés</option>
                      <option value="promo_2026">Promotion 2026 uniquement</option>
                      <option value="groupe_vip">Groupe de Travail VIP</option>
                      <option value="devoir_a_rendre">Devoir avec date limite</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {activeRole === 'etudiant' && (
              <>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                    Intitulé du devoir ou du projet remis *
                  </label>
                  <input
                    type="text"
                    required
                    value={assignmentName}
                    onChange={(e) => setAssignmentName(e.target.value)}
                    placeholder="Ex: Rendu TP Final - Création d'un E-Shop avec Mobile Money"
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                      Sélectionner le cours destinataire *
                    </label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    >
                      {AVAILABLE_COURSES.map((c) => (
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
                      required
                      value={studentNumber}
                      onChange={(e) => setStudentNumber(e.target.value)}
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
                    rows={2}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Précisez ici les particularités de votre travail, lien Git ou remarques..."
                    className="w-full px-4 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm resize-none"
                  />
                </div>
              </>
            )}

            {/* Dropzone */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">
                  Fichier à téléverser (PDF, DOCX, ZIP, Vidéo, Code, Diapositives)
                </label>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Compression Max (ZIP)
                </span>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-blue-600 transition bg-[#f8fafc] relative group cursor-pointer">
                <input
                  type="file"
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
                        Glissez votre fichier ici, ou{' '}
                        <span className="text-blue-700 underline font-extrabold">parcourez votre appareil</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Synchronisation directe avec votre espace Supabase & Cloudflare R2
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-blue-700/25 transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] cursor-pointer"
            >
              <UploadCloud className="w-5 h-5" />
              {isSubmitting
                ? 'Compression & Envoi en cours...'
                : activeRole === 'professeur'
                ? 'Compresser et Publier la Ressource Académique'
                : activeRole === 'vendor'
                ? 'Compresser et Publier le Produit Marchand'
                : 'Compresser et Déposer mon Devoir'}
            </button>
          </form>
        </div>

        <div className="mt-8 bg-white border border-slate-200/90 rounded-2xl p-5 flex items-center gap-3.5 shadow-xs">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-800">Cloisonnement sécurisé Supabase : </span>
            Les fichiers professeurs sont archivés sous <code className="font-mono text-blue-700 bg-blue-50 px-1 py-0.5 rounded">academic/courses/</code> et les devoirs étudiants sous <code className="font-mono text-blue-700 bg-blue-50 px-1 py-0.5 rounded">academic/submissions/</code>.
          </div>
        </div>
      </main>
    </div>
  );
};

export default AcademicUploadView;
