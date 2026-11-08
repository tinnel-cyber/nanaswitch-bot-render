import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Unlock,
  Play,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { auth } from '../../../../../firebase';
import { playCashChime, playValidationBeep } from '../../../../../utils/audio';

export interface AccessControllerProps {
  courseId: string;
  courseTitle?: string;
  onNavigateToClassroom: (courseId: string) => void;
  children: (props: {
    isEnrolled: boolean;
    isUnlockingAnimationActive: boolean;
    renderLessonActionButton: (lessonId: string, isFreePreview: boolean, onPlay: () => void) => React.ReactNode;
  }) => React.ReactNode;
}

export const AccessController: React.FC<AccessControllerProps> = ({
  courseId,
  courseTitle = 'Masterclass',
  onNavigateToClassroom,
  children
}) => {
  const [isEnrolled, setIsEnrolled] = useState<boolean>(() => {
    // Vérifier l'état sauvegardé en local
    return localStorage.getItem(`nana_course_enrolled_${courseId}`) === 'true';
  });

  const [showCelebrationBanner, setShowCelebrationBanner] = useState(false);
  const [isUnlockingAnimationActive, setIsUnlockingAnimationActive] = useState(false);
  const previousEnrolledState = useRef(isEnrolled);

  // Écouteur temps réel de l'enrollment dans Supabase (Zero-Trust Server-Authoritative Unlock)
  useEffect(() => {
    const currentUid = auth.currentUser?.uid || localStorage.getItem('nana_store_auth_user_id') || 'student-demo';

    // 1. Écouteur Supabase Realtime sur la table enrollments
    const channelName = `enrollment_${currentUid}_${courseId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrollments',
          filter: `course_id=eq.${courseId}`,
        },
        (payload) => {
          if (payload.new) {
            const row = payload.new as any;
            if (row.user_id === currentUid && (row.status === 'ACTIVE' || row.status === 'completed')) {
              triggerUnlockAnimation();
            }
          }
        }
      )
      .subscribe();

    // 2. Écouteur d'événement local pour la synchronisation multi-onglets / fallback
    const handleStorageChange = () => {
      if (localStorage.getItem(`nana_course_enrolled_${courseId}`) === 'true') {
        triggerUnlockAnimation();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [courseId]);

  // Fonction déclenchant l'animation de déverrouillage spectaculaire Framer Motion
  const triggerUnlockAnimation = () => {
    if (!previousEnrolledState.current) {
      previousEnrolledState.current = true;
      setIsEnrolled(true);
      setIsUnlockingAnimationActive(true);
      setShowCelebrationBanner(true);
      localStorage.setItem(`nana_course_enrolled_${courseId}`, 'true');

      // Effet sonore haptique et carillon financier de réussite
      playCashChime();
      setTimeout(() => playValidationBeep(), 400);

      // Fin de l'animation de transition après 2.5 secondes
      setTimeout(() => {
        setIsUnlockingAnimationActive(false);
      }, 2500);
    } else {
      setIsEnrolled(true);
    }
  };

  // Rendu personnalisé des boutons d'action de chaque leçon du syllabus
  const renderLessonActionButton = (
    lessonId: string,
    isFreePreview: boolean,
    onPlay: () => void
  ) => {
    // Si l'étudiant est inscrit OU si c'est un aperçu gratuit -> Bouton Play Débloqué
    if (isEnrolled || isFreePreview) {
      return (
        <motion.button
          key={`play-${lessonId}`}
          type="button"
          onClick={onPlay}
          initial={isUnlockingAnimationActive ? { scale: 0, rotate: -45 } : { scale: 1 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 450, damping: 20 }}
          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] border border-emerald-500/40 transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer"
        >
          <Play className="w-3 h-3 fill-current text-emerald-400" />
          <span>{isEnrolled ? 'Visionner' : 'Aperçu Gratuit'}</span>
        </motion.button>
      );
    }

    // Si non inscrit : Animation de dissolution du cadenas lors du déblocage en direct
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`locked-${lessonId}`}
          exit={{
            scale: [1, 1.4, 0],
            rotate: [0, -15, 30],
            opacity: [1, 1, 0],
            filter: 'blur(4px)',
            transition: { duration: 0.6 }
          }}
          className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-500 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800"
        >
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Verrouillé</span>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="relative w-full space-y-4">
      {/* Bannière Célébration Déblocage Serveur en Direct */}
      <AnimatePresence>
        {showCelebrationBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/90 border-2 border-emerald-500/60 shadow-2xl shadow-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/30">
                  <Unlock className="w-6 h-6 animate-pulse" />
                </div>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-teal-400 rounded-full flex items-center justify-center text-[9px] font-black text-slate-950">
                  ✓
                </span>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    Autorisation Bancaire Validée
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9.5px] font-bold border border-emerald-500/30">
                    Webhook HMAC Vérifié
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-black text-white">
                  Félicitations ! Toutes les leçons sont débloquées.
                </h4>
                <p className="text-xs text-slate-300">
                  Votre droit d&apos;accès officiel a été certifié par le serveur d&apos;autorité.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToClassroom(courseId)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 transition flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
            >
              <span>Accéder au Campus Virtuel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rendu des enfants avec injection des méthodes de contrôle d'accès */}
      {children({
        isEnrolled,
        isUnlockingAnimationActive,
        renderLessonActionButton
      })}
    </div>
  );
};

export default AccessController;
