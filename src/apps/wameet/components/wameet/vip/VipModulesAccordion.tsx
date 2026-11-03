import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  PlayCircle,
  FileText,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  X,
  Eye,
  Clock,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { VipChapterItem, VipLessonItem } from './types';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface VipModulesAccordionProps {
  chapters: VipChapterItem[];
  activeLessonId?: string;
  onSelectLesson: (lesson: VipLessonItem) => void;
  className?: string;
}

/**
 * Onglet Modules : Liste accordéon des chapitres.
 * Au clic : lance la vidéo correspondante dans le lecteur principal ou ouvre un document PDF interactif.
 */
export const VipModulesAccordion: React.FC<VipModulesAccordionProps> = ({
  chapters,
  activeLessonId,
  onSelectLesson,
  className = ''
}) => {
  // Par défaut le premier chapitre est ouvert
  const [openChapterIds, setOpenChapterIds] = useState<Record<string, boolean>>({
    [chapters[0]?.id || 'chap-1']: true
  });

  const [activePdfLesson, setActivePdfLesson] = useState<VipLessonItem | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Record<string, boolean>>({
    'less-1-1': true,
    'less-1-2': true
  });

  const toggleChapter = (chapterId: string) => {
    playTapBeep();
    setOpenChapterIds((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  const handleLessonClick = (lesson: VipLessonItem) => {
    playTapBeep();
    if (lesson.type === 'pdf') {
      setActivePdfLesson(lesson);
    } else {
      onSelectLesson(lesson);
    }
  };

  const toggleLessonCompleted = (e: React.MouseEvent, lessonId: string) => {
    e.stopPropagation();
    playValidationBeep();
    setCompletedLessonIds((prev) => ({
      ...prev,
      [lessonId]: !prev[lessonId]
    }));
  };

  // Calcul du taux d'avancement
  const totalLessons = chapters.reduce((acc, chap) => acc + chap.lessons.length, 0);
  const completedCount = Object.values(completedLessonIds).filter(Boolean).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Barre de progression globale du cours */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-black text-slate-900">
              Programme d'Apprentissage & Syllabus
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            {completedCount} sur {totalLessons} leçons validées • {chapters.length} chapitres complets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-36 h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-black text-blue-600 shrink-0">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Liste Accordéon des Chapitres */}
      <div className="space-y-3">
        {chapters.map((chapter, chapIdx) => {
          const isOpen = !!openChapterIds[chapter.id];
          const chapterCompletedCount = chapter.lessons.filter(
            (l) => completedLessonIds[l.id]
          ).length;

          return (
            <div
              key={chapter.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all"
            >
              {/* Entête du Chapitre Accordéon */}
              <button
                type="button"
                onClick={() => toggleChapter(chapter.id)}
                className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition cursor-pointer"
                aria-expanded={isOpen}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                    {chapIdx + 1}
                  </span>

                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-900 leading-snug">
                      {chapter.title}
                    </h4>
                    {chapter.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {chapter.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
                    {chapterCompletedCount}/{chapter.lessons.length}
                  </span>
                  {isOpen ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Contenu Dépliable : Leçons Vidéos & PDF */}
              {isOpen && (
                <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/60">
                  {chapter.lessons.map((lesson) => {
                    const isActive = activeLessonId === lesson.id;
                    const isDone = !!completedLessonIds[lesson.id];

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => handleLessonClick(lesson)}
                        className={`p-3.5 sm:px-5 flex items-center justify-between gap-3 transition cursor-pointer select-none ${
                          isActive
                            ? 'bg-blue-50/90 border-l-4 border-l-blue-600'
                            : 'hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Case à cocher de complétion */}
                          <button
                            type="button"
                            onClick={(e) => toggleLessonCompleted(e, lesson.id)}
                            className="text-slate-400 hover:text-emerald-600 transition shrink-0"
                            title={isDone ? 'Marquer comme non terminé' : 'Marquer comme terminé'}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300" />
                            )}
                          </button>

                          {/* Icône Type : Vidéo ou PDF */}
                          {lesson.type === 'video' ? (
                            <PlayCircle
                              className={`w-4 h-4 shrink-0 ${
                                isActive ? 'text-blue-600' : 'text-slate-500'
                              }`}
                            />
                          ) : (
                            <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                          )}

                          {/* Titre & Info */}
                          <div className="min-w-0">
                            <span
                              className={`text-xs sm:text-sm font-bold block truncate ${
                                isActive
                                  ? 'text-blue-700'
                                  : isDone
                                  ? 'text-slate-600 line-through decoration-slate-300'
                                  : 'text-slate-800'
                              }`}
                            >
                              {lesson.title}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              {lesson.type === 'video' ? (
                                <>
                                  <Clock className="w-3 h-3" />
                                  <span>Vidéo • {lesson.duration || '20 min'}</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                    PDF
                                  </span>
                                  <span>{lesson.pdfSize || '3.5 MB'} • Document de travail</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Action CTA sur la ligne */}
                        <div className="shrink-0">
                          {lesson.type === 'video' ? (
                            <span
                              className={`text-[11px] font-black px-2.5 py-1 rounded-xl transition ${
                                isActive
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-600'
                              }`}
                            >
                              {isActive ? 'En cours' : 'Lancer ▶'}
                            </span>
                          ) : (
                            <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span>Ouvrir PDF</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          VISIONNEUSE DE SUPPORT PDF INTÉGRÉE (AU CLIC SUR UN DOCUMENT PDF)
         ===================================================================== */}
      {activePdfLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-4xl h-[88vh] rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            {/* Header de la Visionneuse PDF */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-slate-900 truncate">
                    {activePdfLesson.title}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Support de cours officiel Wameet • {activePdfLesson.pdfSize || 'Document PDF'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={activePdfLesson.pdfUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Télécharger</span>
                </a>

                <button
                  type="button"
                  onClick={() => setActivePdfLesson(null)}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Corps Document PDF (Embed / Iframe ou Prévisualisation Didactique) */}
            <div className="flex-1 bg-slate-100 p-4 sm:p-8 flex items-center justify-center overflow-auto">
              <div className="w-full max-w-2xl bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-10 text-slate-800 space-y-4">
                <div className="border-b border-slate-200 pb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                    WAMEET VIP ACADEMY • SUPPORT PÉDAGOGIQUE
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-1">
                    {activePdfLesson.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {activePdfLesson.description ||
                      'Document confidentiel réservé aux membres inscrits de la classe VIP.'}
                  </p>
                </div>

                <div className="space-y-3 text-xs leading-relaxed text-slate-600">
                  <p>
                    <strong>1. Synthèse des Concepts Clés :</strong> Ce document récapitule
                    l'ensemble des architectures abordées durant la session en direct,
                    notamment les patterns de résilience microservices et de haute disponibilité.
                  </p>
                  <p>
                    <strong>2. Guide de Déploiement :</strong> Retrouvez dans les annexes les
                    fichiers de configuration annotés (YAML, Dockerfile et manifests de sécurité
                    pour environnements de production).
                  </p>
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Ressource certifiée conforme au programme officiel d'évaluation NaNa POS.
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Document Page 1 / 18</span>
                  <span>Usage exclusif étudiant Wameet</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VipModulesAccordion;
