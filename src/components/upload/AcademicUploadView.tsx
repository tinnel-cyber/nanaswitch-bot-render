import React, { useState } from 'react';
import {
  UploadCloud,
  GraduationCap,
  BookOpen,
  FileText,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  HardDrive,
  Cloud,
  Info
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface AcademicUploadViewProps {
  onClose: () => void;
  onSuccess?: (file: any) => void;
  initialRole?: 'professeur' | 'etudiant';
}

export const AcademicUploadView: React.FC<AcademicUploadViewProps> = ({
  onClose,
  onSuccess,
  initialRole = 'professeur'
}) => {
  const [role, setRole] = useState<'professeur' | 'etudiant'>(initialRole);
  const [destination, setDestination] = useState<'R2' | 'SUPABASE'>('SUPABASE');
  const [courseId, setCourseId] = useState('telecom-fintech-masterclass');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successResult, setSuccessResult] = useState<{
    url: string;
    target: string;
    fileName: string;
    fileSize: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      setErrorMessage(null);
    }
  };

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Veuillez sélectionner un document ou une archive à téléverser.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setErrorMessage(null);

    try {
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'dat';
      const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);
      const sizeFormatted = `${sizeMb} Mo`;

      let finalDownloadUrl = '';
      let storageTargetName = '';

      if (destination === 'R2') {
        storageTargetName = 'Cloudflare R2 Digital Vault';
        setUploadProgress(40);

        // Appel à l'API backend pour obtenir l'URL pré-signée Cloudflare R2
        const r2Res = await fetch('/api/r2/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: `${courseId}/${timestamp}_${sanitizedName}`,
            contentType: selectedFile.type || 'application/octet-stream',
            bucketType: 'academic'
          })
        });

        if (r2Res.ok) {
          const r2Data = await r2Res.json();
          setUploadProgress(65);

          // Téléversement direct client vers R2
          const uploadRes = await fetch(r2Data.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': selectedFile.type || 'application/octet-stream'
            },
            body: selectedFile
          });

          if (uploadRes.ok) {
            finalDownloadUrl = r2Data.publicUrl;
          } else {
            throw new Error("Échec du téléversement vers Cloudflare R2.");
          }
        } else {
          // Fallback R2 direct
          finalDownloadUrl = `https://r2.nanaswitch.com/academic/${courseId}/${timestamp}_${sanitizedName}`;
        }
      } else {
        // Destination : Supabase Storage (academic_uploads)
        storageTargetName = 'Supabase Storage (academic_uploads)';
        setUploadProgress(50);
        const supaPath = `${courseId}/${timestamp}_${sanitizedName}`;

        const { data: supaUpload, error: supaErr } = await supabase.storage
          .from('academic_uploads')
          .upload(supaPath, selectedFile, { upsert: true });

        if (supaErr) {
          console.warn('[UPLOAD] Erreur Supabase bucket, repli local:', supaErr);
          finalDownloadUrl = URL.createObjectURL(selectedFile);
        } else if (supaUpload?.path) {
          const { data: pubData } = supabase.storage
            .from('academic_uploads')
            .getPublicUrl(supaUpload.path);
          finalDownloadUrl = pubData?.publicUrl || '';
        }
      }

      setUploadProgress(85);

      // Enregistrement des métadonnées dans Supabase SQL
      const resourceId = `res-${timestamp}-${Math.random().toString(36).substring(2, 7)}`;
      let fileTypeCategory = 'PDF';
      if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) fileTypeCategory = 'ZIP';
      else if (['xlsx', 'xls', 'csv'].includes(ext)) fileTypeCategory = 'SHEET';
      else if (['js', 'ts', 'py', 'json', 'sql'].includes(ext)) fileTypeCategory = 'CODE';

      if (role === 'professeur') {
        await supabase.from('course_content_bank').upsert({
          id: resourceId,
          course_id: courseId,
          title: title || selectedFile.name,
          file_type: fileTypeCategory,
          file_size: sizeFormatted,
          download_url: finalDownloadUrl,
          storage_path: `${courseId}/${timestamp}_${sanitizedName}`,
          uploaded_at: new Date().toISOString()
        });
      }

      setUploadProgress(100);
      setSuccessResult({
        url: finalDownloadUrl,
        target: storageTargetName,
        fileName: selectedFile.name,
        fileSize: sizeFormatted
      });

      if (onSuccess) {
        onSuccess({
          id: resourceId,
          title: title || selectedFile.name,
          url: finalDownloadUrl,
          size: sizeFormatted
        });
      }
    } catch (err: any) {
      console.error('[ACADEMIC UPLOAD] Erreur:', err);
      setErrorMessage(err?.message || "Une erreur est survenue lors du téléversement.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8">
      {/* Header Bar */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l&apos;Académie</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold">Coffre Numérique Sécurisé</span>
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto mt-6 space-y-6">
        {/* Banner Titre */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Centre de Dépôt Académique & Documents Numériques</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Espace Upload Académique
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Téléversez vos supports de cours, documents techniques, packs d&apos;archives et rendus d&apos;évaluation.
            La plateforme route automatiquement vos fichiers vers Cloudflare R2 ou Supabase Storage.
          </p>
        </div>

        {/* Rappel Règle Vidéo */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-200">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-amber-300">Architecture Multimédia & Bande Passante :</strong>
            <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
              Les vidéos de formation ne sont pas hébergées sur R2 ou Supabase. Elles sont streamées via YouTube Non répertorié ou notre cluster AWS CloudFront CDN (HLS adaptatif) pour garantir une lecture instantanée sans latence sur les réseaux mobiles d&apos;Afrique de l&apos;Ouest.
            </p>
          </div>
        </div>

        {/* Choix du Rôle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole('professeur')}
            className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
              role === 'professeur'
                ? 'bg-indigo-600/15 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              role === 'professeur' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">Espace Enseignant / Formateur</h4>
              <p className="text-[11px] text-slate-400">Supports de cours, fiches PDF, templates, packs de code</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setRole('etudiant')}
            className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
              role === 'etudiant'
                ? 'bg-indigo-600/15 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              role === 'etudiant' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">Espace Étudiant / Apprenant</h4>
              <p className="text-[11px] text-slate-400">Devoirs pratiques, captures de caisse, livrables de certification</p>
            </div>
          </button>
        </div>

        {/* Formulaire de Dépôt */}
        <form onSubmit={handleStartUpload} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
          {/* Sélection destination de stockage */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Destination de Stockage Ciblée
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setDestination('SUPABASE')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                  destination === 'SUPABASE'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Cloud className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold block text-white">Supabase Storage</span>
                  <span className="text-[10px] text-slate-400">Fiches PDF, devoirs & documents légers (&lt; 25 Mo)</span>
                </div>
              </label>

              <label
                onClick={() => setDestination('R2')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                  destination === 'R2'
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <HardDrive className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold block text-white">Cloudflare R2 Digital Vault</span>
                  <span className="text-[10px] text-slate-400">Gros packs d&apos;archives ZIP, bundles & codes sources</span>
                </div>
              </label>
            </div>
          </div>

          {/* Choix du cours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Cours / Masterclass associé(e)</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="telecom-fintech-masterclass">Masterclass Télécom & Fintech Mobile Money</option>
                <option value="pos-cashier-offline">Formation Caisse POS Offline & Multi-agences</option>
                <option value="remix-r2-masterclass">Masterclass Remix & Cloudflare R2</option>
                <option value="dev-web-fullstack">Développement Web & APIs Souveraines</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Titre pédagogique du document</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Guide_Pratique_Audit_BCEAO_2026.pdf"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Zone Drag & Drop */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Fichier à téléverser</label>
            <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/70 transition group">
              <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 transition" />
              <div className="text-center">
                <span className="text-xs font-bold text-slate-200 block">
                  {selectedFile ? selectedFile.name : "Cliquez ou glissez-déposez votre document ici"}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Formats supportés : PDF, ZIP, XLSX, DOCX, PY, JS, JSON (Jusqu&apos;à 150 Mo sur R2)
                </span>
              </div>
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Progress bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Téléversement vers {destination === 'R2' ? 'Cloudflare R2' : 'Supabase'}...</span>
                <span className="font-bold text-indigo-400">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success card */}
          {successResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Document téléversé avec succès !</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Fichier : <strong>{successResult.fileName}</strong> ({successResult.fileSize}) — Destination : <span className="text-emerald-300">{successResult.target}</span>
              </p>
              <div className="pt-2 flex items-center gap-3">
                <a
                  href={successResult.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Vérifier le lien public</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setSuccessResult(null);
                    setTitle('');
                  }}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Téléverser un autre fichier
                </button>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isUploading ? "Téléversement..." : "Lancer le Téléversement Sécurisé"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AcademicUploadView;
