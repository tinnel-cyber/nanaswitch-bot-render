import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Video, 
  HelpCircle, 
  FileText, 
  Radio, 
  Clock, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit3, 
  Paperclip, 
  Settings, 
  ShieldCheck, 
  Sparkles,
  Lock,
  Layers,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { CourseModule, CourseLesson } from '../../../../../types';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

// ============================================================================
// COMPOSANT ITEM LEÇON SORTABLE
// ============================================================================
interface SortableLessonItemProps {
  lesson: CourseLesson;
  module: CourseModule;
  onEditLesson?: (lesson: CourseLesson, module: CourseModule) => void;
  onDeleteLesson?: (lessonId: string, moduleId: string) => void;
  onOpenAttachments?: (lesson: CourseLesson) => void;
}

const SortableLessonItem: React.FC<SortableLessonItemProps> = ({
  lesson,
  module,
  onEditLesson,
  onDeleteLesson,
  onOpenAttachments,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  const isQuiz = !!lesson.quiz;
  const isLive = !!lesson.liveSessionConfig || lesson.id.includes('live');
  const hasAttachments = lesson.attachments && lesson.attachments.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-2xl bg-slate-900/90 border transition-all flex items-center justify-between gap-3 group ${
        isDragging 
          ? 'border-indigo-500 shadow-2xl ring-2 ring-indigo-500/50 bg-slate-800' 
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Poignée de Drag & Drop */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 cursor-grab active:cursor-grabbing shrink-0"
          title="Glisser pour réordonner"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Icône du type */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          isQuiz 
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
            : isLive
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
        }`}>
          {isQuiz ? <HelpCircle className="w-4 h-4" /> : isLive ? <Radio className="w-4 h-4 animate-pulse" /> : <Video className="w-4 h-4" />}
        </div>

        {/* Titre & métadonnées */}
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <h5 className="text-xs font-bold text-white truncate max-w-sm">
              {lesson.title}
            </h5>
            {isLive && (
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${
                lesson.liveSessionConfig?.provider === 'ZOOM' 
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  : lesson.liveSessionConfig?.provider === 'JITSI'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : lesson.liveSessionConfig?.provider === 'GOOGLE_MEET'
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {lesson.liveSessionConfig?.provider || 'Live'}
              </span>
            )}
            {lesson.isFreePreview && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Aperçu
              </span>
            )}
            {lesson.hideBranding && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Stealth
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{lesson.durationMinutes || 15} min</span>
            </span>

            {hasAttachments && (
              <>
                <span>•</span>
                <span className="text-indigo-400 flex items-center gap-1 font-bold">
                  <Paperclip className="w-3 h-3" />
                  <span>{lesson.attachments!.length} pièce(s)</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onOpenAttachments && (
          <button
            type="button"
            onClick={() => onOpenAttachments(lesson)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-indigo-300 text-xs transition cursor-pointer"
            title="Gérer les pièces jointes (Banque de contenu)"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>
        )}

        {onEditLesson && (
          <button
            type="button"
            onClick={() => onEditLesson(lesson, module)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition cursor-pointer"
            title="Modifier la leçon"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}

        {onDeleteLesson && (
          <button
            type="button"
            onClick={() => onDeleteLesson(lesson.id, module.id)}
            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition cursor-pointer"
            title="Supprimer la leçon"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPOSANT ITEM MODULE SORTABLE
// ============================================================================
interface SortableModuleItemProps {
  module: CourseModule;
  index: number;
  onEditModuleDelivery: (module: CourseModule) => void;
  onAddLessonToModule: (moduleId: string) => void;
  onEditLesson?: (lesson: CourseLesson, module: CourseModule) => void;
  onDeleteLesson?: (lessonId: string, moduleId: string) => void;
  onDeleteModule?: (moduleId: string) => void;
  onOpenAttachments?: (lesson: CourseLesson) => void;
  onReorderLessons: (moduleId: string, newLessons: CourseLesson[]) => void;
}

const SortableModuleItem: React.FC<SortableModuleItemProps> = ({
  module,
  index,
  onEditModuleDelivery,
  onAddLessonToModule,
  onEditLesson,
  onDeleteLesson,
  onDeleteModule,
  onOpenAttachments,
  onReorderLessons,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    opacity: isDragging ? 0.7 : 1,
  };

  const handleLessonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    playTapBeep();
    const oldIndex = module.lessons.findIndex(l => l.id === active.id);
    const newIndex = module.lessons.findIndex(l => l.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(module.lessons, oldIndex, newIndex);
      onReorderLessons(module.id, reordered);
    }
  };

  const hasDrip = module.dripSettings?.enabled;
  const isStrict = module.strictLinearProgression;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-3xl border transition-all overflow-hidden bg-slate-950/70 ${
        isDragging 
          ? 'border-indigo-500 shadow-2xl ring-2 ring-indigo-500/40 bg-slate-900' 
          : 'border-slate-800 hover:border-slate-700/80'
      }`}
    >
      {/* En-tête du Module */}
      <div className="p-4 bg-slate-900/90 flex items-center justify-between gap-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Poignée de glisser du Module */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 cursor-grab active:cursor-grabbing shrink-0"
            title="Glisser pour réordonner le module"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Déplier / Replier */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                Module {index + 1}
              </span>
              <h4 className="text-xs sm:text-sm font-black text-white truncate max-w-sm">
                {module.title}
              </h4>
            </div>

            {/* Badges de Règles */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10.5px] text-slate-400">
                {module.lessons?.length || 0} leçon(s)
              </span>

              {hasDrip && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>
                    Drip : {module.dripSettings?.type === 'DAYS_AFTER_ENROLLMENT' 
                      ? `+${module.dripSettings.unlockDays}j` 
                      : module.dripSettings?.unlockDate}
                  </span>
                </span>
              )}

              {isStrict && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  <Lock className="w-3 h-3 text-indigo-400" />
                  <span>Linéaire Stricte</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions du Module */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onEditModuleDelivery(module)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 text-xs font-bold transition flex items-center gap-1 border border-slate-700 cursor-pointer"
            title="Configurer les règles de diffusion (Drip & Progression)"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Diffusion</span>
          </button>

          <button
            type="button"
            onClick={() => onAddLessonToModule(module.id)}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition flex items-center gap-1 shadow-md shadow-indigo-600/20 cursor-pointer"
            title="Ajouter une leçon à ce module"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leçon</span>
          </button>

          {onDeleteModule && (
            <button
              type="button"
              onClick={() => onDeleteModule(module.id)}
              className="p-1.5 rounded-xl hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition cursor-pointer"
              title="Supprimer le module"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Liste des Leçons internes (Sortable Dnd) */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-2 bg-slate-950/40">
          {(!module.lessons || module.lessons.length === 0) ? (
            <div className="text-center py-6 text-slate-500 text-xs font-semibold">
              Ce module ne contient encore aucune leçon. Cliquez sur &quot;+ Leçon&quot; pour en créer une.
            </div>
          ) : (
            <SortableContext
              items={module.lessons.map(l => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {module.lessons.map((lesson) => (
                  <SortableLessonItem
                    key={lesson.id}
                    lesson={lesson}
                    module={module}
                    onEditLesson={onEditLesson}
                    onDeleteLesson={onDeleteLesson}
                    onOpenAttachments={onOpenAttachments}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPOSANT PRINCIPAL DU BUILDER DRAG-AND-DROP
// ============================================================================
export interface CurriculumDndBuilderProps {
  modules: CourseModule[];
  onReorderModules: (newModules: CourseModule[]) => void;
  onEditModuleDelivery: (module: CourseModule) => void;
  onAddModule: () => void;
  onAddLessonToModule: (moduleId: string) => void;
  onEditLesson?: (lesson: CourseLesson, module: CourseModule) => void;
  onDeleteLesson?: (lessonId: string, moduleId: string) => void;
  onDeleteModule?: (moduleId: string) => void;
  onOpenAttachments?: (lesson: CourseLesson) => void;
}

export const CurriculumDndBuilder: React.FC<CurriculumDndBuilderProps> = ({
  modules,
  onReorderModules,
  onEditModuleDelivery,
  onAddModule,
  onAddLessonToModule,
  onEditLesson,
  onDeleteLesson,
  onDeleteModule,
  onOpenAttachments,
}) => {
  // Capteurs DndKit pour support souris, clavier et tactile fluide
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px de mouvement avant d'initier le drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    playTapBeep();
    const oldIndex = modules.findIndex(m => m.id === active.id);
    const newIndex = modules.findIndex(m => m.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(modules, oldIndex, newIndex).map((m, idx) => ({
        ...m,
        order: idx,
      }));
      onReorderModules(reordered);
    }
  };

  const handleReorderLessonsInModule = (moduleId: string, newLessons: CourseLesson[]) => {
    const updated = modules.map(m => {
      if (m.id === moduleId) {
        return {
          ...m,
          lessons: newLessons,
        };
      }
      return m;
    });
    onReorderModules(updated);
  };

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-6 space-y-4 max-w-5xl mx-auto select-none">
      {/* Barre d'informations */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Créateur Hiérarchique par Glisser-Déposer
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              @dnd-kit 60fps
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Glissez les modules ou les leçons à l&apos;aide de la poignée pour réordonner la progression. L&apos;ordre est sauvegardé instantanément dans Firestore.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddModule}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-black text-xs transition shadow-lg shadow-indigo-500/30 flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-end sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Module</span>
        </button>
      </div>

      {/* Arborescence DndKit des Modules */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleModuleDragEnd}
      >
        <SortableContext
          items={modules.map(m => m.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {modules.map((module, idx) => (
              <SortableModuleItem
                key={module.id}
                module={module}
                index={idx}
                onEditModuleDelivery={onEditModuleDelivery}
                onAddLessonToModule={onAddLessonToModule}
                onEditLesson={onEditLesson}
                onDeleteLesson={onDeleteLesson}
                onDeleteModule={onDeleteModule}
                onOpenAttachments={onOpenAttachments}
                onReorderLessons={handleReorderLessonsInModule}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default CurriculumDndBuilder;
