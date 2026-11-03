import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle, 
  Lock, 
  PlayCircle, 
  Sparkles, 
  AlertCircle, 
  Mic, 
  HelpCircle, 
  FileText, 
  Video, 
  Layers,
  Award
} from 'lucide-react';
import { Course, CourseModule, CourseLesson, LearningPathItem, RemediationModule } from '../../../../types';

interface LiquidSyllabusSidebarProps {
  course: Course;
  learningPath?: LearningPathItem[];
  activeLessonId: string;
  onSelectLesson: (lessonId: string, isRemediation?: boolean, remediationId?: string) => void;
  remediationsMap?: Record<string, RemediationModule>;
  isAdaptiveActive?: boolean;
}

export const LiquidSyllabusSidebar: React.FC<LiquidSyllabusSidebarProps> = ({
  course,
  learningPath = [],
  activeLessonId,
  onSelectLesson,
  remediationsMap = {},
  isAdaptiveActive = true
}) => {
  // Track open/collapsed module states
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    course?.modules?.forEach((mod) => {
      if (mod?.id) initial[mod.id] = true;
    });
    return initial;
  });

  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  // Helper to find learning path state for a lesson
  const getPathStatus = (lessonId: string) => {
    const item = learningPath.find((p) => p.lessonId === lessonId);
    if (!item) return { unlocked: true, completed: false };
    return { unlocked: item.unlocked, completed: item.completed };
  };

  // Filter remedial items in learning path
  const remedialItems = learningPath.filter((p) => p.isRemediation);

  return (
    <div className="w-full h-full flex flex-col bg-slate-950/80 border-r border-slate-800/80 text-slate-100 overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-300">
              Syllabus Liquide IA
            </span>
          </div>

          {remedialItems.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 animate-pulse">
              <Sparkles className="w-2.5 h-2.5" />
              Adaptatif Actif
            </span>
          )}
        </div>

        <h3 className="text-xs font-bold text-white line-clamp-1">
          {course.title}
        </h3>
      </div>

      {/* Main Scrollable Modules Container */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-3 touch-pan-y custom-scrollbar">
        {course?.modules?.map((module, modIdx) => {
          const isOpen = openModules[module.id] ?? true;

          // Check if any remediation is attached to this module
          const moduleRemediations = remedialItems.filter((r) => r.moduleId === module.id);

          return (
            <div
              key={module.id}
              className="rounded-2xl bg-slate-900/50 border border-slate-800/80 overflow-hidden shadow-sm"
            >
              {/* Module Header Accordion */}
              <button
                type="button"
                onClick={() => toggleModule(module.id)}
                className="w-full p-3 bg-slate-900/80 hover:bg-slate-855 flex items-center justify-between text-left transition border-b border-slate-800/60"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-400 flex items-center justify-center flex-shrink-0">
                    {modIdx + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">
                      {module.title}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {module?.lessons?.length || 0} leçon{(module?.lessons?.length || 0) > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {moduleRemediations.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                  )}
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Lessons List inside Module */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-2 space-y-1.5"
                  >
                    {module?.lessons?.map((lesson, lessonIdx) => {
                      const { unlocked, completed } = getPathStatus(lesson.id);
                      const isActive = activeLessonId === lesson.id;

                      // Check if there is an active remedial module right after this lesson
                      const attachedRemediation = moduleRemediations.find(
                        (r) => r.lessonId === `${lesson.id}-remediation` || r.remediationId
                      );

                      return (
                        <React.Fragment key={lesson.id}>
                          {/* Standard Lesson Row */}
                          <button
                            type="button"
                            onClick={() => {
                              if (unlocked) onSelectLesson(lesson.id, false);
                            }}
                            disabled={!unlocked}
                            className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all ${
                              isActive
                                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/50 text-white shadow-sm'
                                : unlocked
                                ? 'hover:bg-slate-800/70 text-slate-300 border border-transparent'
                                : 'opacity-40 text-slate-500 cursor-not-allowed border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              {/* Lesson Type Icon */}
                              <div className="flex-shrink-0">
                                {lesson.voiceSimulationConfig ? (
                                  <Mic className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                                ) : lesson.quiz ? (
                                  <HelpCircle className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                                ) : (
                                  <PlayCircle className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                                )}
                              </div>

                              <span className="text-xs font-medium truncate">
                                {modIdx + 1}.{lessonIdx + 1} {lesson.title}
                              </span>
                            </div>

                            {/* Status Icon */}
                            <div className="flex-shrink-0">
                              {completed ? (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              ) : !unlocked ? (
                                <Lock className="w-3.5 h-3.5 text-slate-600" />
                              ) : isActive ? (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              ) : null}
                            </div>
                          </button>

                          {/* INJECTED REMEDIATION LESSON (Module 2.5) */}
                          {attachedRemediation && (
                            <motion.div
                              initial={{ scale: 0.95, opacity: 0, y: -5 }}
                              animate={{ scale: 1, opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className="pl-3"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  if (attachedRemediation.unlocked) {
                                    onSelectLesson(
                                      attachedRemediation.lessonId,
                                      true,
                                      attachedRemediation.remediationId
                                    );
                                  }
                                }}
                                className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                                  activeLessonId === attachedRemediation.lessonId
                                    ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] text-purple-200'
                                    : 'bg-purple-950/20 border-purple-500/40 hover:bg-purple-900/30 text-purple-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <div className="p-1 rounded-md bg-purple-500/20 text-purple-300 flex-shrink-0 animate-pulse">
                                    <Sparkles className="w-3 h-3" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[10px] uppercase font-black tracking-wider text-purple-400 block">
                                      Module {modIdx + 1}.5 Sur-Mesure
                                    </span>
                                    <span className="text-xs font-bold text-white truncate block">
                                      {attachedRemediation.title}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex-shrink-0">
                                  {attachedRemediation.completed ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/30 text-purple-200">
                                      Requis
                                    </span>
                                  )}
                                </div>
                              </button>
                            </motion.div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiquidSyllabusSidebar;
