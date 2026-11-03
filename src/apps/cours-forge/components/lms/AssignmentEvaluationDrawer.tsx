import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Check, CheckCircle2, AlertTriangle, Download, Mic, MicOff, 
  Play, Pause, Trash2, FileText, Table, Sparkles, Send, Award, 
  ExternalLink, Clock, ShieldCheck, User, RefreshCw, ChevronRight,
  FileSpreadsheet, MessageSquare
} from 'lucide-react';
import { AssignmentSubmission } from '../../../../types';
import { approveAssignmentAndUnlockNext, requestAssignmentRevision } from '../../../../services/lmsService';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../../utils/audio';

export interface AssignmentEvaluationDrawerProps {
  submission: AssignmentSubmission | null;
  isOpen: boolean;
  onClose: () => void;
  onGradedSuccess?: (updatedSubmission: AssignmentSubmission) => void;
  isSplitScreenMode?: boolean;
  instructorName?: string;
}

export const AssignmentEvaluationDrawer: React.FC<AssignmentEvaluationDrawerProps> = ({
  submission,
  isOpen,
  onClose,
  onGradedSuccess,
  isSplitScreenMode = false,
  instructorName = 'Ibrahim Pousbila Konkobo'
}) => {
  if (!isOpen || !submission) return null;

  const [grade, setGrade] = useState<number>(submission.grade || 18);
  const [maxScore, setMaxScore] = useState<number>(submission.maxScore || 20);
  const [feedback, setFeedback] = useState<string>(submission.feedback || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // État de l'enregistrement de note vocale (Voice Feedback)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasVoiceNote, setHasVoiceNote] = useState(!!submission.voiceFeedbackUrl);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  // Tags d'évaluation rapides pour un gain de temps maximal
  const QUICK_TAGS = [
    'Structure de caisse exemplaire ✓',
    'Zéro écart de centime constaté ✓',
    'Revoir la temporisation USSD ✗',
    'Excellente argumentation commerciale',
    'Recommandé pour la certification académique 🎓'
  ];

  // Gestion du chronomètre de l'enregistrement vocal
  useEffect(() => {
    let timer: any;
    if (isRecordingVoice) {
      timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isRecordingVoice]);

  // Synchronisation lors du changement de soumission
  useEffect(() => {
    if (submission) {
      setGrade(submission.grade !== undefined ? submission.grade : 18);
      setMaxScore(submission.maxScore || 20);
      setFeedback(submission.feedback || '');
      setHasVoiceNote(!!submission.voiceFeedbackUrl);
      setIsRecordingVoice(false);
      setRecordingTime(submission.voiceDurationSeconds || 0);
    }
  }, [submission]);

  const isPassed = grade >= (maxScore * 0.5);

  const handleAddQuickTag = (tag: string) => {
    playTapBeep();
    if (feedback.includes(tag)) return;
    setFeedback(prev => prev ? `${prev} • ${tag}` : tag);
  };

  const handleToggleRecordVoice = () => {
    playTapBeep();
    if (isRecordingVoice) {
      // Arrêt de l'enregistrement
      setIsRecordingVoice(false);
      setHasVoiceNote(true);
      playValidationBeep();
    } else {
      // Début de l'enregistrement
      setRecordingTime(0);
      setIsRecordingVoice(true);
      setHasVoiceNote(false);
    }
  };

  const handleDeleteVoiceNote = () => {
    playTapBeep();
    setHasVoiceNote(false);
    setIsRecordingVoice(false);
    setRecordingTime(0);
  };

  const handleApprove = async () => {
    playValidationBeep();
    setIsSubmitting(true);

    try {
      await approveAssignmentAndUnlockNext({
        assignmentId: submission.id,
        studentId: submission.studentId,
        courseId: submission.courseId,
        lessonId: submission.lessonId,
        grade,
        maxScore,
        feedback,
        voiceFeedbackUrl: hasVoiceNote ? `voice_${submission.id}.mp3` : undefined,
        voiceDurationSeconds: hasVoiceNote ? (recordingTime || 24) : undefined,
        instructorName
      });

      playCashChime();

      const updated: AssignmentSubmission = {
        ...submission,
        status: 'GRADED',
        grade,
        maxScore,
        passed: true,
        feedback,
        voiceFeedbackUrl: hasVoiceNote ? `voice_${submission.id}.mp3` : undefined,
        voiceDurationSeconds: hasVoiceNote ? (recordingTime || 24) : undefined,
        gradedAt: Date.now(),
        gradedByName: instructorName
      };

      if (onGradedSuccess) {
        onGradedSuccess(updated);
      }
      if (!isSplitScreenMode) {
        onClose();
      }
    } catch (err) {
      console.error("Erreur validation devoir:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!feedback.trim()) {
      alert("Veuillez renseigner un commentaire explicatif pour guider l'étudiant dans sa révision.");
      return;
    }

    playTapBeep();
    setIsSubmitting(true);

    try {
      await requestAssignmentRevision({
        assignmentId: submission.id,
        studentId: submission.studentId,
        feedback,
        voiceFeedbackUrl: hasVoiceNote ? `voice_${submission.id}.mp3` : undefined,
        voiceDurationSeconds: hasVoiceNote ? (recordingTime || 24) : undefined,
        instructorName
      });

      const updated: AssignmentSubmission = {
        ...submission,
        status: 'NEEDS_REVISION',
        feedback,
        voiceFeedbackUrl: hasVoiceNote ? `voice_${submission.id}.mp3` : undefined,
        voiceDurationSeconds: hasVoiceNote ? (recordingTime || 24) : undefined,
        gradedAt: Date.now(),
        gradedByName: instructorName
      };

      if (onGradedSuccess) {
        onGradedSuccess(updated);
      }
      if (!isSplitScreenMode) {
        onClose();
      }
    } catch (err) {
      console.error("Erreur demande révision:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Décodage du contenu de prévisualisation sécurisé
  const previewData = (() => {
    if (!submission.filePreviewContent) return null;
    try {
      return JSON.parse(submission.filePreviewContent);
    } catch {
      return { raw: submission.filePreviewContent };
    }
  })();

  const contentMarkup = (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900 text-slate-100 select-none">
      {/* 1. Header du Panneau d'Évaluation */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={submission.studentAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
            alt={submission.studentName}
            className="w-11 h-11 rounded-2xl object-cover border border-indigo-500/30 shrink-0"
          />
          <div className="min-w-0">
            <h3 className="text-sm font-black text-white truncate flex items-center gap-1.5">
              <span>{submission.studentName}</span>
              <span className="text-[10px] font-bold text-slate-400">({submission.studentEmail})</span>
            </h3>
            <p className="text-xs text-indigo-300 font-bold truncate">
              {submission.assignmentTitle || 'Devoir Pratique'}
            </p>
            <p className="text-[10.5px] text-slate-400 truncate">
              {submission.lessonTitle} • Soumis il y a {Math.round((Date.now() - submission.submittedAt) / (1000 * 60))} min
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 ml-2"
          title="Fermer le panneau"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Corps Défilable : Visualiseur de Contenu + Formulaire de Notation */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6 space-y-6">
        {/* Visualiseur de Contenu (Content Viewer Safe Area) */}
        <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl space-y-3 p-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              {submission.fileType === 'EXCEL' ? (
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              ) : (
                <FileText className="w-4 h-4 text-rose-400" />
              )}
              <span className="text-xs font-black text-white truncate max-w-[240px]">
                {submission.fileName}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {Math.round(submission.fileSize / 1024)} Ko
              </span>
            </div>

            <button
              type="button"
              onClick={playValidationBeep}
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-bold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger</span>
            </button>
          </div>

          {/* Rendu spécifique selon le type de fichier */}
          {submission.fileType === 'EXCEL' && previewData?.tableRows ? (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-[11px] font-black uppercase text-indigo-300">
                      {previewData.tableHeaders?.map((header: string, i: number) => (
                        <th key={i} className="p-2.5 font-black">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11.5px]">
                    {previewData.tableRows?.map((row: string[], rIdx: number) => (
                      <tr key={rIdx} className={rIdx === previewData.tableRows.length - 1 ? 'bg-emerald-500/10 font-black text-emerald-300' : 'hover:bg-slate-900/40'}>
                        {row.map((cell: string, cIdx: number) => (
                          <td key={cIdx} className="p-2.5">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewData.studentNotes && (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <span className="font-bold text-indigo-300 block mb-1">Note de clôture de l'étudiant :</span>
                  "{previewData.studentNotes}"
                </div>
              )}
            </div>
          ) : submission.fileType === 'PDF' && previewData?.title ? (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <h4 className="font-black text-white text-sm">{previewData.title}</h4>
              <p className="text-[11px] text-indigo-400 font-bold">{previewData.author}</p>
              <p className="text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono">
                {previewData.summary}
              </p>
              {previewData.conclusion && (
                <p className="text-emerald-400 font-bold italic pt-1">
                  Conclusion : {previewData.conclusion}
                </p>
              )}
            </div>
          ) : previewData?.hook ? (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 font-bold">
                {previewData.hook}
              </div>
              <p><strong>Démonstration :</strong> {previewData.body}</p>
              <p><strong>Appel à l'action WhatsApp :</strong> {previewData.cta}</p>
              <p className="text-amber-400"><strong>Urgence :</strong> {previewData.urgencyTactic}</p>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              Document chargé avec succès ({submission.fileName}).
            </div>
          )}
        </div>

        {/* Formulaire de Notation & Feedback (Grading Controls) */}
        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Attribution de la Note & Décision Académique</span>
            </h4>

            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
              isPassed 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}>
              {isPassed ? '✓ Validé' : '✗ Non Validé'}
            </span>
          </div>

          {/* Saisie de la Note Chiffrée */}
          <div className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-300">Note Attribuée</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={maxScore}
                step={0.5}
                value={grade}
                onChange={(e) => setGrade(Math.min(maxScore, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-center text-base font-black text-white focus:border-indigo-500 focus:outline-none min-h-[40px]"
              />
              <span className="text-sm font-bold text-slate-400">/ {maxScore}</span>
            </div>
          </div>

          {/* Feedback Écrit avec Quick-Tags */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Commentaire Pédagogique (Transmis à l'étudiant)</span>
              <span className="text-[10.5px] text-slate-500">Obligatoire en cas de révision</span>
            </label>

            {/* Quick-Tags */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddQuickTag(tag)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10.5px] font-bold text-slate-300 transition cursor-pointer"
                >
                  + {tag}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Écrivez vos remarques, points d'amélioration et encouragements..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none transition leading-relaxed resize-none"
            />
          </div>

          {/* Note Vocale (Voice Feedback UI) */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-indigo-400" />
                <span>Note Vocale de l'Enseignant (Optionnelle)</span>
              </span>

              {hasVoiceNote && (
                <button
                  type="button"
                  onClick={handleDeleteVoiceNote}
                  className="text-[11px] text-rose-400 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Supprimer</span>
                </button>
              )}
            </div>

            {isRecordingVoice ? (
              <div className="flex items-center justify-between p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-bold text-rose-300">Enregistrement en cours...</span>
                </div>
                <span className="font-mono text-xs font-bold text-rose-300">
                  00:{recordingTime < 10 ? `0${recordingTime}` : recordingTime}
                </span>
                <button
                  type="button"
                  onClick={handleToggleRecordVoice}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition"
                >
                  Terminer
                </button>
              </div>
            ) : hasVoiceNote ? (
              <div className="flex items-center justify-between p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { playTapBeep(); setIsPlayingVoice(!isPlayingVoice); }}
                    className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition"
                  >
                    {isPlayingVoice ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                  </button>
                  <span className="text-xs font-bold text-indigo-200">
                    {isPlayingVoice ? "Lecture de la note vocale..." : "Note vocale prête (00:24)"}
                  </span>
                </div>
                <span className="text-[10.5px] text-slate-400 font-mono">Audio HD</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleToggleRecordVoice}
                className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition cursor-pointer min-h-[40px]"
              >
                <Mic className="w-4 h-4 text-indigo-400" />
                <span>Enregistrer une note vocale pour l'étudiant</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Barre d'Actions Inférieure Fixe */}
      <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 shrink-0 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleRequestRevision}
          disabled={isSubmitting}
          className="py-3.5 px-5 bg-slate-800 hover:bg-amber-600/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/50 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer min-h-[46px] disabled:opacity-50"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Demander une Révision</span>
        </button>

        <button
          type="button"
          onClick={handleApprove}
          disabled={isSubmitting}
          className="flex-1 py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 transition cursor-pointer min-h-[46px] disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Mise à jour Firestore...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Approuver & Débloquer le Module Suivant</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Si on est en mode Split-Screen sur desktop, on affiche directement le conteneur inline
  if (isSplitScreenMode) {
    return (
      <div className="h-full rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        {contentMarkup}
      </div>
    );
  }

  // Sinon, sur mobile / tablette ou en overlay modal, affichage Slide-over Drawer
  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop sombre */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div 
          className="w-screen max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {contentMarkup}
        </div>
      </div>
    </div>
  );
};

export default AssignmentEvaluationDrawer;
