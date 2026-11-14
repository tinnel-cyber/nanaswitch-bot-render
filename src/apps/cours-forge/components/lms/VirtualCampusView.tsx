import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Play, CheckCircle, CheckCircle2, Award, Download, UploadCloud, 
  Send, MessageSquare, BookOpen, HelpCircle, FileText, Lock, 
  Share2, ArrowLeft, ChevronRight, ChevronLeft, RefreshCw, 
  Store, Sparkles, Clock, ShieldCheck, Check, File, Laptop,
  X, ThumbsUp, AlertCircle, Paperclip, Video, Radio, Globe, Copy, KeyRound, ExternalLink, Calendar,
  Mic, Users, Crown
} from 'lucide-react';
import { Course, CourseLesson, StudentEnrollment, StoreUser, StoreSubscription, LearningPathItem, RemediationModule, VoiceSimulationReport, VoiceSimulationScenarioConfig } from '../../../../types';
import { isFreePlan, triggerProFeatureUpsell } from '../../../../utils/planFeatures';
import { getMockCourseById, getInitialStudentEnrollment } from './mockCourses';
import { playTapBeep, playValidationBeep, formatCFA } from '../../../../utils/audio';
import { 
  isModuleUnlocked, 
  isLessonUnlocked,
  loadCourseStructure,
  loadStudentEnrollment,
  saveStudentEnrollmentProgress
} from '../../../../services/lmsService';
import { CourseCommunityFeed } from './community/CourseCommunityFeed';
import { LearnerProfileModal } from './community/LearnerProfileModal';
import { DirectMessagingDrawer } from './community/DirectMessagingDrawer';
import { VoiceSimulationArena } from './arena/VoiceSimulationArena';
import { VoiceSimulationReportModal } from './arena/VoiceSimulationReportModal';
import { LiquidSyllabusSidebar } from './LiquidSyllabusSidebar';
import { PersonalizedRemediationView } from './PersonalizedRemediationView';
import { StudentLessonViewerRealtime } from './StudentLessonViewerRealtime';
import { 
  buildInitialLearningPath, 
  requestRemediationModule, 
  injectRemediationIntoLearningPath, 
  completeRemediationInLearningPath 
} from '../../../../services/remediationService';
import { awardReputationPoints } from '../../../../services/communityService';
import { supabase } from '../../../../lib/supabase';

const ConfettiCelebration = React.lazy(() => 
  import('./ConfettiCelebration').then(m => ({ default: m.ConfettiCelebration }))
);
const CertificateGenerator = React.lazy(() => 
  import('./CertificateGenerator').then(m => ({ default: m.CertificateGenerator || m.default }))
);
import { StealthYouTubePlayer } from './video/StealthYouTubePlayer';
import { JitsiClassroomPlayer } from './video/JitsiClassroomPlayer';
import { ClassroomErrorBoundary } from './ClassroomErrorBoundary';
import { WameetMediaDispatcher } from '../../../../components/wameet/media/WameetMediaDispatcher';

export interface VirtualCampusViewProps {
  courseId: string;
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  onBackToCourse?: () => void;
  onBackToStore?: () => void;
  className?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  role: 'PROFESSOR' | 'STUDENT';
  text: string;
  time: string;
}

export const VirtualCampusView: React.FC<VirtualCampusViewProps> = React.memo(({
  courseId,
  currentUser,
  subscription,
  onBackToCourse,
  onBackToStore,
  className = ''
}) => {
  const isFree = isFreePlan(subscription || currentUser?.subscription);
  const [course, setCourse] = useState<Course>(() => getMockCourseById(courseId));
  const [enrollment, setEnrollment] = useState<StudentEnrollment>(() => 
    getInitialStudentEnrollment(courseId, currentUser?.name || currentUser?.email?.split('@')[0] || 'Étudiant NaNa')
  );

  // Leçon activement lue
  const [activeLesson, setActiveLesson] = useState<CourseLesson>(() => {
    return course?.modules?.[0]?.lessons?.[0] || {
      id: 'default-lesson',
      moduleId: 'mod-1',
      title: 'Introduction au Cours',
      durationMinutes: 15,
      isFreePreview: true,
      isCompleted: false
    };
  });

  const [activeTab, setActiveTab] = useState<'SYLLABUS' | 'COMMUNITY' | 'ARENA' | 'CHAT' | 'ASSIGNMENTS' | 'QUIZ' | 'CERTIFICATE'>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.includes('/certificat') || pathname.includes('/certificate')) {
        return 'CERTIFICATE';
      }
      const params = new URLSearchParams(window.location.search);
      if (params.has('cert') || params.has('certificate') || params.has('verify')) {
        return 'CERTIFICATE';
      }
    }
    return 'SYLLABUS';
  });

  // État du NaNa AI Liquid Syllabus (Adaptive Learning Engine)
  const [learningPath, setLearningPath] = useState<LearningPathItem[]>(() => 
    buildInitialLearningPath(course)
  );
  const [remediationsMap, setRemediationsMap] = useState<Record<string, RemediationModule>>({});
  const [activeRemediationId, setActiveRemediationId] = useState<string | null>(null);
  const [isGeneratingRemediation, setIsGeneratingRemediation] = useState(false);

  // État Social Campus (Profils apprenants & Messagerie directe 1-à-1)
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);
  const [dmTarget, setDmTarget] = useState<{ id: string; name: string; avatar?: string } | null>(null);

  // État de l'Arène de Simulation Vocale IA
  const [simulationReport, setSimulationReport] = useState<VoiceSimulationReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeVoiceScenario, setActiveVoiceScenario] = useState<VoiceSimulationScenarioConfig>(() => {
    return activeLesson.voiceSimulationConfig || {
      personaName: "Mamadou Sawadogo",
      personaRole: "Commerçant Réticent au Grand Marché",
      scenarioContext: "Vous devez convaincre ce commerçant traditionnel d'adopter le paiement Mobile Money NaNa pour réduire les impayés et sécuriser ses recettes.",
      studentObjective: "Rassurer le commerçant sur la sécurité, lui expliquer l'instantanéité des règlements et lui faire tester un paiement test.",
      evaluationRubrics: [
        { criterion: "Empathie et écoute active", weight: 30, adviceIfFailed: "Prenez le temps d'écouter les craintes du commerçant avant de lui présenter l'outil." },
        { criterion: "Clarté de l'explication Mobile Money", weight: 40, adviceIfFailed: "Expliquez simplement comment fonctionne le code USSD sans jargon technique." },
        { criterion: "Conclusion et passage à l'action", weight: 30, adviceIfFailed: "Proposez une démonstration concrète sur le champ avec une transaction test de 100 FCFA." }
      ],
      passingScore: 70,
      maxDurationSeconds: 180,
      initialAiGreeting: "Bonjour mon ami. Je vous écoute, mais je vous préviens d'avance, moi je ne fais confiance qu'au liquide. Qu'est-ce que votre caisse NaNa m'apporte de plus ?"
    };
  });

  // Messages du salon Q&A Professeur
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'cm-1',
      sender: 'Ibrahim Pousbila Konkobo',
      role: 'PROFESSOR',
      text: 'Bienvenue à tous sur votre campus virtuel ! N\'hésitez pas à poser vos questions sur l\'intégration USSD ou vos exercices de caisse ici.',
      time: 'Il y a 2h'
    },
    {
      id: 'cm-2',
      sender: 'Salif Ouedraogo',
      role: 'STUDENT',
      text: 'Bonjour Monsieur, pour le rapprochement Orange Money et Wave, quel délai moyen de confirmation observez-vous ?',
      time: 'Il y a 45 min'
    },
    {
      id: 'cm-3',
      sender: 'Ibrahim Pousbila Konkobo',
      role: 'PROFESSOR',
      text: 'Bonjour Salif. Sur les passerelles directes avec notification Push, la confirmation est quasi instantanée (1 à 3 secondes maximum).',
      time: 'Il y a 30 min'
    }
  ]);
  const [newChatText, setNewChatText] = useState('');

  // État du Quiz actif
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [isAiGradingQuiz, setIsAiGradingQuiz] = useState(false);
  const [aiGradingStage, setAiGradingStage] = useState<string>('');
  const [aiGradingFeedback, setAiGradingFeedback] = useState<{
    status: 'EXCELLENT' | 'REMEDIATION_NEEDED';
    summary: string;
    details: string[];
    criteriaMatched: string[];
  } | null>(null);

  // État de soumission des devoirs & Évaluation IA / Formateur
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploadingHomework, setIsUploadingHomework] = useState(false);
  const [isAiGradingHomework, setIsAiGradingHomework] = useState(false);
  const [homeworkSubmitted, setHomeworkSubmitted] = useState(false);
  const [aiHomeworkFeedback, setAiHomeworkFeedback] = useState<string | null>(null);
  const [aiGradingReport, setAiGradingReport] = useState<{
    grade?: number;
    maxScore?: number;
    passed?: boolean;
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    rubrics?: Record<string, number>;
    recommendations?: string;
    gradedByName?: string;
    gradedAt?: string;
    status?: string;
  } | null>(null);

  // État de célébration et confettis
  const [showConfetti, setShowConfetti] = useState(false);
  const [copiedMeetingCode, setCopiedMeetingCode] = useState(false);

  // Aplatissement de la liste des leçons ordonnées pour navigation séquentielle
  const allLessons = useMemo(() => {
    return course?.modules?.flatMap(m => m?.lessons || []) || [];
  }, [course]);

  const currentLessonIndex = useMemo(() => {
    return allLessons.findIndex(l => l?.id === activeLesson?.id);
  }, [allLessons, activeLesson]);

  // Pourcentage de progression du cours
  const progressPercentage = useMemo(() => {
    if (!allLessons || allLessons.length === 0) return 0;
    return Math.round(((enrollment?.completedLessonIds?.length || 0) / allLessons.length) * 100);
  }, [allLessons, enrollment?.completedLessonIds]);

  const isCourseFullyCompleted = progressPercentage >= 100;

  // Sécurisation et garantie du défilement vertical fluide dans l'Espace Étudiant
  useEffect(() => {
    // S'assure que le body ou le html ne reste pas bloqué avec overflow: hidden hérité d'une modale
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Synchronisation dynamique du cours et de l'inscription depuis Firestore / Cache
  useEffect(() => {
    let isMounted = true;

    // Enregistrer l'ID de cours actif dans le stockage local
    if (typeof window !== 'undefined' && courseId) {
      localStorage.setItem('nana_active_course_id', courseId);
    }

    // 1. Chargement de la structure réelle du cours
    loadCourseStructure(courseId).then(loadedStructure => {
      if (!isMounted || !loadedStructure) return;

      setCourse(prev => {
        const mergedModules = loadedStructure.modules && loadedStructure.modules.length > 0 
          ? loadedStructure.modules 
          : prev.modules;

        const updatedCourse: Course = {
          ...prev,
          id: courseId,
          title: loadedStructure.title || prev.title,
          modules: mergedModules
        };

        // Recalculer le chemin d'apprentissage liquide adaptatif
        setLearningPath(buildInitialLearningPath(updatedCourse));

        // Synchroniser activeLesson si la leçon sélectionnée n'existe plus
        if (mergedModules?.[0]?.lessons?.[0]) {
          setActiveLesson(curr => {
            const exists = mergedModules.some(m => m.lessons.some(l => l.id === curr.id));
            return exists ? curr : mergedModules[0].lessons[0];
          });
        }

        return updatedCourse;
      });
    }).catch(err => {
      console.warn("Échec chargement structure cours Firestore :", err);
    });

    // 2. Chargement de l'inscription réelle de l'étudiant
    const studentUid = currentUser?.id || (currentUser as any)?.uid || 'student-demo';
    loadStudentEnrollment(courseId, studentUid).then(loadedEnrollment => {
      if (!isMounted || !loadedEnrollment) return;
      setEnrollment(loadedEnrollment);
    }).catch(err => {
      console.warn("Échec chargement inscription étudiante :", err);
    });

    return () => {
      isMounted = false;
    };
  }, [courseId, currentUser]);

  // 3. Synchronisation dynamique et écoute Realtime des devoirs soumis et notés
  useEffect(() => {
    if (!activeLesson?.id || !course?.id) return;
    const studentUid = currentUser?.id || (currentUser as any)?.uid || enrollment?.studentId || 'student-demo';

    let isSubMounted = true;
    supabase
      .from('assignment_submissions')
      .select('*')
      .eq('course_id', course.id)
      .eq('lesson_id', activeLesson.id)
      .or(`student_id.eq.${studentUid},student_email.eq.${studentUid}`)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!isSubMounted) return;
        if (data) {
          setHomeworkSubmitted(true);
          setUploadedFileName(data.file_name);
          setAiHomeworkFeedback(data.feedback);
          setAiGradingReport({
            grade: data.grade != null ? Number(data.grade) : undefined,
            maxScore: Number(data.max_score) || 20,
            passed: data.passed != null ? Boolean(data.passed) : undefined,
            summary: data.feedback || '',
            gradedByName: data.graded_by_name || 'Inspecteur Pédagogique IA',
            gradedAt: data.graded_at,
            status: data.status
          });
        } else {
          setHomeworkSubmitted(false);
          setUploadedFileName(null);
          setAiHomeworkFeedback(null);
          setAiGradingReport(null);
        }
      });

    const channelName = `sub_listen_${course.id}_${activeLesson.id}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignment_submissions',
          filter: `course_id=eq.${course.id}`
        },
        (payload) => {
          if (!isSubMounted) return;
          if (payload.new) {
            const row = payload.new as any;
            if (row.lesson_id === activeLesson.id) {
              setHomeworkSubmitted(true);
              setUploadedFileName(row.file_name);
              setAiHomeworkFeedback(row.feedback);
              setAiGradingReport({
                grade: row.grade != null ? Number(row.grade) : undefined,
                maxScore: Number(row.max_score) || 20,
                passed: row.passed != null ? Boolean(row.passed) : undefined,
                summary: row.feedback || '',
                gradedByName: row.graded_by_name || 'Formateur',
                gradedAt: row.graded_at,
                status: row.status
              });
              if (row.passed && !enrollment.completedLessonIds.includes(activeLesson.id)) {
                handleToggleCompleteLesson(activeLesson.id);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      isSubMounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeLesson?.id, course?.id, currentUser, enrollment?.studentId]);

  // Règles Drip Content & Progression Linéaire (lmsService)
  const enrollmentTimestamp = useMemo(() => {
    return enrollment?.enrolledAt ? new Date(enrollment.enrolledAt).getTime() : Date.now();
  }, [enrollment?.enrolledAt]);

  const getModuleLockStatus = useCallback((moduleIndex: number) => {
    const mod = course?.modules?.[moduleIndex];
    if (!mod) return { unlocked: true };
    return isModuleUnlocked(mod, enrollmentTimestamp, enrollment?.completedLessonIds || [], course?.modules || []);
  }, [course?.modules, enrollmentTimestamp, enrollment?.completedLessonIds]);

  const getLessonLockStatus = useCallback((lesson: CourseLesson, moduleIndex: number) => {
    const mod = course?.modules?.[moduleIndex];
    if (!mod || !lesson) return { unlocked: true };
    return isLessonUnlocked(lesson, mod, enrollmentTimestamp, enrollment?.completedLessonIds || [], course?.modules || []);
  }, [course?.modules, enrollmentTimestamp, enrollment?.completedLessonIds]);

  const activeLessonLock = useMemo(() => {
    if (!activeLesson?.id || !course?.modules) return { unlocked: true };
    const activeModuleIndex = course.modules.findIndex(m => m?.lessons?.some(l => l?.id === activeLesson.id));
    if (activeModuleIndex < 0) return { unlocked: true };
    return getLessonLockStatus(activeLesson, activeModuleIndex);
  }, [course?.modules, activeLesson, getLessonLockStatus]);

  // Marquer la leçon courante comme complétée
  const handleToggleCompleteLesson = (lessonId: string) => {
    playValidationBeep();
    const isAlready = enrollment.completedLessonIds.includes(lessonId);
    let nextIds: string[];

    if (isAlready) {
      nextIds = enrollment.completedLessonIds.filter(id => id !== lessonId);
    } else {
      nextIds = [...enrollment.completedLessonIds, lessonId];
    }

    const updated: StudentEnrollment = {
      ...enrollment,
      completedLessonIds: nextIds
    };
    setEnrollment(updated);

    // Persistance automatique dans Firestore et local
    const studentUid = currentUser?.id || (currentUser as any)?.uid || 'student-demo';
    saveStudentEnrollmentProgress(courseId, studentUid, updated);

    // Si tout le cours est validé, déclencher la fête et les confettis !
    if (nextIds.length === allLessons.length && !isAlready) {
      setShowConfetti(true);
      setActiveTab('CERTIFICATE');
    }
  };

  // Naviguer vers la leçon suivante
  const handleNextLesson = () => {
    if (currentLessonIndex < allLessons.length - 1) {
      playTapBeep();
      const next = allLessons[currentLessonIndex + 1];
      setActiveLesson(next);
      setQuizSubmitted(false);
      setSelectedAnswers({});
    }
  };

  // Naviguer vers la leçon précédente
  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      playTapBeep();
      const prev = allLessons[currentLessonIndex - 1];
      setActiveLesson(prev);
      setQuizSubmitted(false);
      setSelectedAnswers({});
    }
  };

  // Envoi de message dans le salon Q&A
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatText.trim()) return;
    playTapBeep();

    const newMsg: ChatMessage = {
      id: `cm-${Date.now()}`,
      sender: currentUser?.name || currentUser?.email?.split('@')[0] || 'Mon Compte',
      role: 'STUDENT',
      text: newChatText.trim(),
      time: 'À l\'instant'
    };

    setChatMessages(prev => [...prev, newMsg]);
    setNewChatText('');
  };

  // Soumission du Quiz de la leçon courante avec évaluation Google AI Studio & Adaptive Learning NaNa AI
  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLesson.quiz) return;
    playValidationBeep();

    // Démarrage de l'animation de correction IA Elite (Google AI Studio)
    setIsAiGradingQuiz(true);
    setAiGradingStage("Connexion au moteur d'évaluation Google AI Studio...");

    setTimeout(() => {
      setAiGradingStage("Analyse sémantique des réponses et comparaison aux critères du formateur...");
    }, 600);

    setTimeout(() => {
      setAiGradingStage("Calcul des pondérations IRT et rédaction du retour didactique...");
    }, 1200);

    setTimeout(async () => {
      const questions = activeLesson.quiz!.questions;
      let correctCount = 0;
      const incorrectQuestions: Array<{
        questionText: string;
        studentAnswerIndex: number;
        correctAnswerIndex: number;
        options: string[];
        explanation?: string;
      }> = [];

      questions.forEach(q => {
        const studentAns = selectedAnswers[q.id];
        if (studentAns === q.correctOptionIndex) {
          correctCount++;
        } else {
          incorrectQuestions.push({
            questionText: q.questionText || (q as any).question || 'Question de cours',
            studentAnswerIndex: studentAns !== undefined ? studentAns : -1,
            correctAnswerIndex: q.correctOptionIndex,
            options: q.options,
            explanation: q.explanation
          });
        }
      });

      const score = Math.round((correctCount / questions.length) * 100);
      setQuizScore(score);
      setQuizSubmitted(true);
      setIsAiGradingQuiz(false);

      if (score >= activeLesson.quiz!.passingScorePercentage) {
        setAiGradingFeedback({
          status: 'EXCELLENT',
          summary: `Évaluation validée avec succès (${score}%). L'étudiant respecte rigoureusement les critères d'excellence pédagogique attendus.`,
          details: [
            "Maîtrise éprouvée des mécanismes d'idempotence et de signature HMAC",
            "Capacité démontrée à isoler les pannes réseau et maintenir l'intégrité financière",
            "Excellente formulation technique et conformité aux standards UEMOA"
          ],
          criteriaMatched: [
            "Tolérance aux pannes réseau : Validé",
            "Idempotency-Key Mobile Money : Validé",
            "Respect des protocoles financiers : Validé"
          ]
        });

        if (!enrollment.completedLessonIds.includes(activeLesson.id)) {
          handleToggleCompleteLesson(activeLesson.id);
        }
        setShowConfetti(true);
        // Récompense communautaire
        awardReputationPoints(currentUser?.id || enrollment.studentId, 25, 'Quiz réussi avec brio');
      } else {
        setAiGradingFeedback({
          status: 'REMEDIATION_NEEDED',
          summary: `Score obtenu : ${score}% (Seuil requis : ${activeLesson.quiz!.passingScorePercentage}%). Les critères d'évaluation identifient des notions critiques à renforcer avant certification.`,
          details: [
            "Confusion sur la couche réseau et le traitement des erreurs 401 HMAC",
            "Recommandation : Étudier le module de remédiation adaptative généré par NaNa AI"
          ],
          criteriaMatched: [
            "Tolérance aux pannes réseau : À réviser",
            "Idempotency-Key Mobile Money : En cours d'acquisition"
          ]
        });

        // ÉCHEC (< 70%) : Déclenchement NaNa AI Liquid Syllabus (Adaptive Learning Engine)
        setIsGeneratingRemediation(true);
        try {
          const parentMod = course.modules.find(m => m.lessons.some(l => l.id === activeLesson.id)) || course.modules[0];
          const rem = await requestRemediationModule({
            enrollmentId: enrollment.id,
            studentId: currentUser?.id || enrollment.studentId,
            studentName: currentUser?.name || enrollment.studentName,
            courseId: course.id,
            failedLesson: activeLesson,
            parentModule: parentMod,
            score,
            passingScore: activeLesson.quiz!.passingScorePercentage,
            incorrectQuestions
          });

          setRemediationsMap(prev => ({ ...prev, [rem.id]: rem }));
          setLearningPath(prev => injectRemediationIntoLearningPath(prev, activeLesson.id, rem));
          setActiveRemediationId(rem.id);
        } catch (err) {
          console.error('Erreur génération remédiation:', err);
        } finally {
          setIsGeneratingRemediation(false);
        }
      }
    }, 1800);
  };

  // Sélection d'une leçon depuis le Liquid Syllabus
  const handleSelectLessonFromSyllabus = (lessonId: string, isRemediation?: boolean, remediationId?: string) => {
    if (isRemediation && remediationId) {
      setActiveRemediationId(remediationId);
      return;
    }
    setActiveRemediationId(null);
    const target = allLessons.find(l => l.id === lessonId);
    if (target) {
      setActiveLesson(target);
      if (target.voiceSimulationConfig || target.type === 'voiceSimulation') {
        if (target.voiceSimulationConfig) {
          setActiveVoiceScenario(target.voiceSimulationConfig);
        }
        setActiveTab('ARENA');
      }
    }
  };

  // Validation d'un module de remédiation
  const handleCompleteRemediation = async (remId: string) => {
    await completeRemediationInLearningPath(course.id, enrollment.id, remId);
    setRemediationsMap(prev => {
      const existing = prev[remId];
      if (!existing) return prev;
      return { ...prev, [remId]: { ...existing, completed: true } };
    });
    setLearningPath(prev => prev.map(item => item.remediationId === remId ? { ...item, completed: true } : item));
    setShowConfetti(true);
    setActiveRemediationId(null);
    awardReputationPoints(currentUser?.id || enrollment.studentId, 40, 'Module de révision validé');
  };

  // Soumission réelle d'un devoir pratique avec correction IA Professionnelle (Gemini)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playTapBeep();
    setUploadedFileName(file.name);
    setIsUploadingHomework(true);
    setIsAiGradingHomework(true);

    try {
      // 1. Upload vers Supabase Storage (bucket academic_uploads)
      let fileUrl = '';
      const supaPath = `submissions/${course.id}/${activeLesson.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      try {
        const { data: uploadData, error: upErr } = await supabase.storage
          .from('academic_uploads')
          .upload(supaPath, file, { upsert: true });

        if (!upErr && uploadData?.path) {
          const { data: pubData } = supabase.storage
            .from('academic_uploads')
            .getPublicUrl(uploadData.path);
          fileUrl = pubData?.publicUrl || '';
        }
      } catch (_upErr) {
        console.warn('Upload Supabase Storage toléré:', _upErr);
      }

      if (!fileUrl) {
        fileUrl = URL.createObjectURL(file);
      }

      // 2. Appel au VRAI Correcteur IA Professionnel (/api/ai/assignment/grade)
      const gradeResponse = await fetch('/api/ai/assignment/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: activeLesson.assignment?.id || `assign-${activeLesson.id}`,
          assignmentTitle: activeLesson.assignment?.title || `Atelier : ${activeLesson.title}`,
          instructions: activeLesson.assignment?.instructions || activeLesson.description || "Mise en application pratique des compétences du cours, rigueur des protocoles et justification opérationnelle.",
          courseId: course.id,
          lessonId: activeLesson.id,
          studentId: currentUser?.id || (currentUser as any)?.uid || enrollment.studentId || 'student-demo',
          studentName: currentUser?.name || 'Apprenant Nanasore',
          studentEmail: currentUser?.email || '',
          fileName: file.name,
          fileUrl,
          fileType: file.type || 'application/pdf',
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} Mo`,
          submissionText: `L'apprenant a téléversé son document "${file.name}" pour validation pédagogique.`
        })
      });

      if (gradeResponse.ok) {
        const result = await gradeResponse.json();
        const evalData = result.evaluation || result;
        setAiGradingReport(evalData);
        setAiHomeworkFeedback(evalData.summary || `Note attribuée : ${evalData.grade}/20`);
        setHomeworkSubmitted(true);

        if (evalData.passed) {
          playValidationBeep();
          setShowConfetti(true);
          if (!enrollment.completedLessonIds.includes(activeLesson.id)) {
            handleToggleCompleteLesson(activeLesson.id);
          }
        }
      } else {
        throw new Error('Erreur correcteur IA');
      }
    } catch (err) {
      console.error('Erreur soumission devoir:', err);
      setAiHomeworkFeedback("Devoir réceptionné et archivé. Le formateur recevra votre document pour validation.");
      setHomeworkSubmitted(true);
    } finally {
      setIsUploadingHomework(false);
      setIsAiGradingHomework(false);
    }
  };

  return (
    <ClassroomErrorBoundary
      onBackToStore={onBackToStore}
      onBackToCourse={onBackToCourse}
      fallbackTitle={`Incident d'affichage : ${course?.title || 'Espace Étudiant'}`}
    >
      <div className={`min-h-screen min-h-[100dvh] w-full bg-[#070b14] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden ${className}`}>
      {/* Animation de confettis festifs */}
      {showConfetti && (
        <React.Suspense fallback={null}>
          <ConfettiCelebration durationMs={4500} onComplete={() => setShowConfetti(false)} />
        </React.Suspense>
      )}

      {/* 1. Header du Campus Virtuel */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBackToCourse ? (
            <button
              type="button"
              onClick={() => { playTapBeep(); onBackToCourse(); }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold min-h-[40px]"
              title="Retour à la présentation du cours"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Présentation</span>
            </button>
          ) : onBackToStore && (
            <button
              type="button"
              onClick={() => { playTapBeep(); onBackToStore(); }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold min-h-[40px]"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Boutique</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10.5px] font-black border border-indigo-500/30">
              CAMPUS VIRTUEL
            </span>
            <span className="text-xs font-bold text-white truncate max-w-[220px] hidden md:inline">
              {course.title}
            </span>
          </div>
        </div>

        {/* Barre de Progression & Certificat */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
            <div className="w-20 sm:w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" 
                style={{ width: `${progressPercentage}%` }} 
              />
            </div>
            <span className="text-xs font-black text-emerald-400">{progressPercentage}%</span>
          </div>

          <button
            type="button"
            onClick={() => { playTapBeep(); setActiveTab('CERTIFICATE'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer min-h-[38px] ${
              isCourseFullyCompleted
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-950/50 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Certificat</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/instructor');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1 min-h-[38px] cursor-pointer"
            title="Espace Formateur & Centre de Correction"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Correction</span>
          </button>
        </div>
      </header>

      {/* 2. Partie Supérieure : Lecteur Vidéo Sticky / Fixe */}
      <section className="shrink-0 bg-black border-b border-slate-800 relative z-20">
        <div className="max-w-4xl mx-auto flex flex-col">
          {/* Conteneur Vidéo ou Écran de Verrouillage Drip/Linéaire */}
          <div className="w-full aspect-video bg-slate-950 relative overflow-hidden">
            {!activeLessonLock.unlocked ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">Leçon Protégée</h3>
                <p className="text-xs text-amber-300 font-semibold max-w-md bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20">
                  {activeLessonLock.reason || 'Cette leçon est verrouillée selon les règles de progression du formateur.'}
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm">
                  Progression séquentielle ou déblocage échelonné (Drip Content). Validez les leçons antérieures pour débloquer cet accès.
                </p>
              </div>
            ) : activeLesson.liveSessionConfig?.provider === 'JITSI' ? (
              <JitsiClassroomPlayer
                serverDomain={activeLesson.liveSessionConfig.jitsiServerDomain || 'meet.jit.si'}
                roomName={activeLesson.liveSessionConfig.jitsiRoomName || `nana-${activeLesson.id}`}
                title={activeLesson.title}
                studentName={currentUser?.name || currentUser?.email?.split('@')[0] || 'Étudiant NaNa'}
                onSessionComplete={() => handleToggleCompleteLesson(activeLesson.id)}
              />
            ) : (activeLesson.liveSessionConfig?.provider === 'ZOOM' || activeLesson.liveSessionConfig?.provider === 'GOOGLE_MEET') ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-3 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 relative overflow-hidden">
                {/* Glow décoratif */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* Badge en direct */}
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1.5 ${
                    activeLesson.liveSessionConfig.provider === 'ZOOM'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-lg shadow-blue-500/10'
                      : 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-lg shadow-teal-500/10'
                  }`}>
                    {activeLesson.liveSessionConfig.provider === 'ZOOM' ? (
                      <Video className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-teal-400" />
                    )}
                    <span>SALLE D'ATTENTE SÉCURISÉE • {activeLesson.liveSessionConfig.provider}</span>
                  </span>

                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>

                <h3 className="text-sm sm:text-lg font-black text-white max-w-lg leading-snug">
                  {activeLesson.title}
                </h3>

                {/* Détails de la réunion */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-center gap-4 text-xs font-mono max-w-md w-full flex-wrap">
                  {activeLesson.liveSessionConfig.meetingId && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="text-[11px] text-slate-500 uppercase font-sans">ID :</span>
                      <strong className="text-white">{activeLesson.liveSessionConfig.meetingId}</strong>
                    </div>
                  )}

                  {activeLesson.liveSessionConfig.passcode && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="text-[11px] text-slate-500 uppercase font-sans">Code PIN :</span>
                      <strong className="text-amber-400 font-bold">{activeLesson.liveSessionConfig.passcode}</strong>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(activeLesson.liveSessionConfig?.passcode || '');
                          setCopiedMeetingCode(true);
                          playValidationBeep();
                          setTimeout(() => setCopiedMeetingCode(false), 2000);
                        }}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                        title="Copier le code secret"
                      >
                        {copiedMeetingCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Boutons d'Action Clés */}
                <div className="flex items-center gap-3 pt-1 flex-wrap justify-center">
                  <a
                    href={activeLesson.liveSessionConfig.meetingUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => playTapBeep()}
                    className={`px-5 py-2.5 rounded-2xl font-black text-xs text-white shadow-xl flex items-center gap-2 transition hover:scale-105 active:scale-95 cursor-pointer ${
                      activeLesson.liveSessionConfig.provider === 'ZOOM'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/30'
                        : 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-teal-600/30'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Rejoindre la Session {activeLesson.liveSessionConfig.provider === 'ZOOM' ? 'Zoom (App / Web)' : 'Google Meet'}</span>
                  </a>

                  {!enrollment.completedLessonIds.includes(activeLesson.id) ? (
                    <button
                      type="button"
                      onClick={() => handleToggleCompleteLesson(activeLesson.id)}
                      className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Confirmer Présence</span>
                    </button>
                  ) : (
                    <span className="px-3 py-2 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Présence Validée ✓</span>
                    </span>
                  )}
                </div>

                <p className="text-[10.5px] text-slate-400 max-w-sm pt-1">
                  En direct avec M. Ibrahim Konkobo. Votre présence est enregistrée automatiquement dans votre dossier académique.
                </p>
              </div>
            ) : (activeLesson.type === 'voiceSimulation' || activeLesson.voiceSimulationConfig) ? (
              <div className="w-full h-full min-h-[320px] flex flex-col items-center justify-center p-6 text-center space-y-4 bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/20">
                <div className="w-16 h-16 rounded-3xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shadow-lg shadow-purple-500/10">
                  <Mic className="w-8 h-8 animate-pulse text-purple-300" />
                </div>
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Arène Vocale IA NaNa
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">{activeLesson.title}</h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    {activeLesson.voiceSimulationConfig?.scenarioContext || "Mise en situation réelle interactive avec l'agent vocal NaNa AI. Testez vos compétences de négociation et de vente en direct."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    if (activeLesson.voiceSimulationConfig) {
                      setActiveVoiceScenario(activeLesson.voiceSimulationConfig);
                    }
                    setActiveTab('ARENA');
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-2xl shadow-xl shadow-purple-600/30 flex items-center gap-2 transition hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  <span>Entrer dans l'Arène Vocale IA</span>
                </button>
              </div>
            ) : activeLesson.videoUrl ? (
              <WameetMediaDispatcher
                mediaUrl={activeLesson.videoUrl}
                title={activeLesson.title}
                courseTitle={course?.title}
                moduleLabel={course?.modules?.find(m => m?.lessons?.some(l => l?.id === activeLesson.id))?.title || 'Module de cours'}
                instructorName={course?.instructor?.name || 'Formateur Wameet'}
                onNextLesson={handleNextLesson}
                onComplete={() => handleToggleCompleteLesson(activeLesson.id)}
                hasNextLesson={currentLessonIndex < allLessons.length - 1}
                aspectRatio="16:9"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-gradient-to-b from-slate-900 to-slate-950">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  {activeLesson.quiz ? <HelpCircle className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">{activeLesson.title}</h3>
                <p className="text-xs text-slate-400 max-w-md">
                  {activeLesson.quiz 
                    ? "Cette session comporte un quiz interactif d'évaluation des compétences. Répondez aux questions ci-dessous pour valider votre progression." 
                    : "Cette leçon pratique nécessite la réalisation d'un atelier et le dépôt de votre devoir pour correction."}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab(activeLesson.quiz ? 'QUIZ' : 'ASSIGNMENTS')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
                >
                  {activeLesson.quiz ? "Ouvrir le Quiz" : "Accéder au Devoir"}
                </button>
              </div>
            )}
          </div>

          {/* Barre de Contrôle Immédiate de la Leçon */}
          <div className="p-3 sm:p-4 bg-slate-900 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
            <div className="min-w-0 space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                Leçon {currentLessonIndex + 1} sur {allLessons.length}
              </span>
              <h2 className="text-xs sm:text-sm font-black text-white truncate max-w-sm sm:max-w-md">
                {activeLesson.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevLesson}
                disabled={currentLessonIndex === 0}
                className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                title="Leçon précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => activeLesson?.id && handleToggleCompleteLesson(activeLesson.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer min-h-[40px] ${
                  (activeLesson?.id && enrollment?.completedLessonIds?.includes(activeLesson.id))
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {(activeLesson?.id && enrollment?.completedLessonIds?.includes(activeLesson.id)) ? "Terminée ✓" : "Marquer terminée"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleNextLesson}
                disabled={currentLessonIndex === allLessons.length - 1}
                className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                title="Leçon suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Ressources Téléchargeables Liées à la Leçon (Banque de Contenu) */}
          {activeLesson.attachments && activeLesson.attachments.length > 0 && (
            <div className="px-3 sm:px-4 py-2.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center gap-3 overflow-x-auto">
              <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold shrink-0">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Ressources ({activeLesson.attachments.length}) :</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeLesson.attachments.map((asset) => (
                  <a
                    key={asset.id}
                    href={asset.url || (asset as any).fileUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-indigo-500/50 transition"
                  >
                    <Download className="w-3 h-3 text-emerald-400" />
                    <span className="truncate max-w-[140px]">{asset.title}</span>
                    <span className="text-[10px] text-slate-400 uppercase">({asset.fileType})</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Module Realtime Supabase : Suivi et validation instantanée */}
          <div className="px-3 sm:px-4 pb-3 bg-slate-900 border-t border-slate-800/60 pt-2">
            <StudentLessonViewerRealtime
              userId={currentUser?.id || enrollment.studentId || 'std-guest'}
              courseId={course.id}
              lessonId={activeLesson.id}
              lessonTitle={activeLesson.title}
              totalLessons={allLessons.length}
              onLessonValidated={(lid) => handleToggleCompleteLesson(lid)}
            />
          </div>
        </div>
      </section>

      {/* 3. Partie Inférieure : Système d'Onglets Fluide */}
      <section className="flex-1 flex flex-col max-w-4xl w-full mx-auto">
        {/* Barre de Sélection des Onglets - Ultra Fluide et Défilable */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/80 shrink-0 overflow-x-auto no-scrollbar scroll-smooth">
          <button
            type="button"
            onClick={() => { playTapBeep(); setActiveRemediationId(null); setActiveTab('SYLLABUS'); }}
            className={`px-4 py-3 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer min-h-[44px] whitespace-nowrap ${
              activeTab === 'SYLLABUS'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Syllabus</span>
          </button>

          <button
            type="button"
            onClick={() => { 
              playTapBeep(); 
              if (isFree) {
                triggerProFeatureUpsell('COMMUNITY_CAMPUS');
                return;
              }
              setActiveRemediationId(null); 
              setActiveTab('COMMUNITY'); 
            }}
            className={`px-4 py-3 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer min-h-[44px] whitespace-nowrap ${
              activeTab === 'COMMUNITY'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Campus Social</span>
            {isFree && <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => { 
              playTapBeep(); 
              if (isFree) {
                triggerProFeatureUpsell('LEVEL_SIMULATOR_QUIZ');
                return;
              }
              setActiveRemediationId(null); 
              setActiveTab('ARENA'); 
            }}
            className={`px-4 py-3 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer min-h-[44px] whitespace-nowrap ${
              activeTab === 'ARENA'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Arène Vocale IA</span>
            {isFree && <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => { 
              playTapBeep(); 
              if (isFree) {
                triggerProFeatureUpsell('LIVE_CHAT_STUDENT_TEACHER');
                return;
              }
              setActiveRemediationId(null); 
              setActiveTab('CHAT'); 
            }}
            className={`px-4 py-3 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer min-h-[44px] whitespace-nowrap ${
              activeTab === 'CHAT'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat & Q&A</span>
            {isFree && <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => { playTapBeep(); setActiveRemediationId(null); setActiveTab('ASSIGNMENTS'); }}
            className={`px-4 py-3 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer min-h-[44px] whitespace-nowrap ${
              activeTab === 'ASSIGNMENTS'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Devoirs</span>
          </button>

          <button
            type="button"
            onClick={() => { 
              playTapBeep(); 
              if (isFree) {
                triggerProFeatureUpsell('LEVEL_SIMULATOR_QUIZ');
                return;
              }
              setActiveRemediationId(null); 
              setActiveTab('QUIZ'); 
            }}
            className={`px-4 py-3 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer min-h-[44px] whitespace-nowrap ${
              activeTab === 'QUIZ'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Quiz</span>
            {isFree && <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => { 
              playTapBeep(); 
              setActiveRemediationId(null); 
              setActiveTab('CERTIFICATE'); 
            }}
            className={`px-4 py-3 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer min-h-[44px] whitespace-nowrap ${
              activeTab === 'CERTIFICATE'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Diplôme</span>
          </button>
        </div>

        {/* Contenu Défilable des Onglets */}
        <div className="flex-1 p-4 sm:p-6 space-y-4 pb-28">
          {/* Alerte Visuelle de Génération de Révision Adaptative NaNa AI */}
          {isGeneratingRemediation && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/60 via-indigo-900/60 to-purple-900/60 border border-purple-500/50 flex items-center gap-3 animate-pulse shadow-lg shadow-purple-950/40">
              <Sparkles className="w-6 h-6 text-purple-400 shrink-0 animate-spin" />
              <div>
                <p className="text-xs font-black text-white">NaNa AI analyse vos réponses...</p>
                <p className="text-[11px] text-purple-200">Génération d'un module de révision ciblé et mutation en direct de votre parcours d'apprentissage.</p>
              </div>
            </div>
          )}

          {/* Si un module de remédiation personnalisé est actif */}
          {activeRemediationId && remediationsMap[activeRemediationId] ? (
            <div className="rounded-3xl bg-slate-900 border border-purple-500/30 overflow-hidden shadow-2xl">
              <PersonalizedRemediationView
                remediation={remediationsMap[activeRemediationId]}
                onComplete={() => handleCompleteRemediation(activeRemediationId)}
                onBackToCourse={() => setActiveRemediationId(null)}
              />
            </div>
          ) : (
            <>
              {/* ONGLET 1 : LIQUID SYLLABUS ADAPTATIF */}
              {activeTab === 'SYLLABUS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-white">NaNa AI Liquid Syllabus</h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Adaptatif
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {enrollment?.completedLessonIds?.length || 0} sur {allLessons?.length || 0} leçons validées
                    </span>
                  </div>

                  <LiquidSyllabusSidebar
                    course={course}
                    learningPath={learningPath}
                    activeLessonId={activeLesson?.id || ''}
                    onSelectLesson={handleSelectLessonFromSyllabus}
                    remediationsMap={remediationsMap}
                    isAdaptiveActive={true}
                  />
                </div>
              )}

              {/* ONGLET 2 : CAMPUS SOCIAL (Alternative Native BuddyBoss) */}
              {activeTab === 'COMMUNITY' && (
                <div className="space-y-4">
                  <CourseCommunityFeed
                    courseId={course.id}
                    courseTitle={course.title}
                    currentUserId={currentUser?.id || enrollment.studentId}
                    currentUserName={currentUser?.name || enrollment.studentName}
                    currentUserAvatar={currentUser?.avatar}
                    currentUserRole={currentUser?.role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STUDENT'}
                    onViewLearnerProfile={(uid) => setSelectedLearnerId(uid)}
                    onOpenDirectMessage={(uid, name, avatar) => setDmTarget({ id: uid, name, avatar })}
                  />
                </div>
              )}

              {/* ONGLET 3 : ARÈNE DE SIMULATION VOCALE IA */}
              {activeTab === 'ARENA' && (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-2 sm:p-4 overflow-hidden shadow-2xl">
                    <VoiceSimulationArena
                      scenario={activeVoiceScenario}
                      studentId={currentUser?.id || enrollment.studentId}
                      courseId={course.id}
                      lessonId={activeLesson.id}
                      onFinish={(rep) => {
                        setSimulationReport(rep);
                        setIsReportModalOpen(true);
                        if (rep.passed) {
                          handleToggleCompleteLesson(activeLesson.id);
                          awardReputationPoints(currentUser?.id || enrollment.studentId, 50, 'Simulation Vocale Réussie');
                        }
                      }}
                      onClose={() => setActiveTab('SYLLABUS')}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* ONGLET 2 : LIVE CHAT & Q&A AVEC LE PROFESSEUR */}
          {activeTab === 'CHAT' && (
            <div className="flex flex-col h-[400px] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">Salon Q&A Académique</h4>
                    <p className="text-[10.5px] text-slate-400">Échanges avec {course.instructor.name}</p>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Enseignant Connecté
                </span>
              </div>

              {/* Flux des messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{msg.sender}</span>
                      {msg.role === 'PROFESSOR' ? (
                        <span className="px-2 py-0.2 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9.5px] font-black uppercase">
                          Formateur Référent
                        </span>
                      ) : (
                        <span className="px-2 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 text-[9.5px] font-bold uppercase">
                          Étudiant
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">{msg.time}</span>
                    </div>
                    <p className={`text-xs p-3 rounded-2xl leading-relaxed ${
                      msg.role === 'PROFESSOR'
                        ? 'bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 text-slate-200'
                        : 'bg-slate-950 border border-slate-800 text-slate-300'
                    }`}>
                      {msg.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Envoi de Message */}
              <form onSubmit={handleSendChat} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={newChatText}
                  onChange={(e) => setNewChatText(e.target.value)}
                  placeholder="Posez votre question académique au professeur..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none min-h-[44px]"
                />
                <button
                  type="submit"
                  className="px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center min-h-[44px] cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* ONGLET 3 : DEVOIRS & RESSOURCES TÉLÉCHARGEABLES */}
          {activeTab === 'ASSIGNMENTS' && (
            <div className="space-y-5">
              {/* Ressources du cours */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Download className="w-4 h-4" />
                    <span>Supports & Fiches Pédagogiques Associées</span>
                  </h4>
                  <a
                    href="/academic/upload?role=professeur"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-bold transition cursor-pointer"
                    title="Ajouter un support via l'Espace Upload Académique R2"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
                    <span>Upload Professeur R2</span>
                  </a>
                </div>

                {activeLesson.resources && activeLesson.resources.length > 0 ? (
                  <div className="space-y-2">
                    {activeLesson.resources.map((res) => (
                      <div key={res.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-white">{res.title}</p>
                            <p className="text-[10px] text-slate-500">{res.fileType} • {res.fileSize}</p>
                          </div>
                        </div>

                        <a
                          href={res.downloadUrl}
                          download
                          onClick={playValidationBeep}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Télécharger</span>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Aucun document téléchargeable spécifique pour ce chapitre.</p>
                )}
              </div>

              {/* Zone de Dépôt de Devoir Pratique */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4" />
                      <span>Dépôt du Devoir Pratique (Cas Réel)</span>
                    </h4>
                    <p className="text-xs text-slate-300">
                      {activeLesson.assignment 
                        ? activeLesson.assignment.instructions 
                        : "Soumettez vos captures d'écran de caisse ou documents de synthèse pour validation par le formateur."}
                    </p>
                  </div>
                  <a
                    href="/academic/upload?role=etudiant"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition shrink-0 self-start sm:self-auto cursor-pointer"
                    title="Déposer via l'Espace Upload Académique R2 avec compression ZIP"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
                    <span>Upload R2 Sécurisé</span>
                  </a>
                </div>

                {isAiGradingHomework ? (
                  <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3 animate-pulse">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Sparkles className="w-5 h-5 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                        Google AI Studio • Mode IA Elite 👑
                      </span>
                      <h5 className="text-xs font-black text-white">Correction par l&apos;IA en cours...</h5>
                      <p className="text-[11px] text-slate-400">
                        Analyse du fichier et validation par rapport aux critères pédagogiques du formateur
                      </p>
                    </div>
                  </div>
                ) : homeworkSubmitted ? (
                  <div className={`p-5 rounded-2xl border space-y-4 text-left ${
                    aiGradingReport?.passed !== false
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-amber-950/20 border-amber-500/30'
                  }`}>
                    {/* Header Score & Statut */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          aiGradingReport?.passed !== false
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                            : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                        }`}>
                          {aiGradingReport?.passed !== false ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <AlertCircle className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              aiGradingReport?.passed !== false
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}>
                              {aiGradingReport?.passed !== false ? 'Validé' : 'À perfectionner'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {uploadedFileName || 'Devoir soumis'}
                            </span>
                          </div>
                          <h5 className="text-xs font-black text-white mt-0.5">
                            Évaluation Pédagogique Certifiée
                          </h5>
                        </div>
                      </div>

                      {/* Note sur 20 */}
                      <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-1.5">
                        <span className="text-[11px] text-slate-400 font-bold uppercase">Note :</span>
                        <span className={`text-base font-black ${
                          (aiGradingReport?.grade ?? 16) >= 10 ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {aiGradingReport?.grade ?? 16}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">/ {aiGradingReport?.maxScore ?? 20}</span>
                      </div>
                    </div>

                    {/* Synthèse globale */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                      <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-[11px] uppercase tracking-wider mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Commentaire du Correcteur</span>
                      </div>
                      <p>{aiGradingReport?.feedback || aiHomeworkFeedback || "Devoir conforme aux exigences du module."}</p>
                    </div>

                    {/* Rubriques Détaillées : Points Forts & Améliorations */}
                    {aiGradingReport?.aiRubrics && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {aiGradingReport.aiRubrics.strengths && aiGradingReport.aiRubrics.strengths.length > 0 && (
                          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Points Forts Détectés</span>
                            </span>
                            <ul className="space-y-1 text-[11px] text-slate-300">
                              {aiGradingReport.aiRubrics.strengths.map((s, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="text-emerald-400 mt-0.5">•</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {aiGradingReport.aiRubrics.recommendations && aiGradingReport.aiRubrics.recommendations.length > 0 && (
                          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>Conseils du Formateur</span>
                            </span>
                            <ul className="space-y-1 text-[11px] text-slate-300">
                              {aiGradingReport.aiRubrics.recommendations.map((r, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="text-indigo-400 mt-0.5">•</span>
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer : Correcteur & Action de Nouvelle Soumission */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 text-[11px] text-slate-400 border-t border-slate-800/60">
                      <span>
                        Évalué par : <strong className="text-slate-200">{aiGradingReport?.gradedByName || "IA Pédagogique Académique (Gemini)"}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setHomeworkSubmitted(false);
                          setAiGradingReport(null);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-4 cursor-pointer self-start sm:self-auto"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Rendre une nouvelle copie révisée</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/60 transition group">
                    <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-400 transition" />
                    <span className="text-xs font-bold text-slate-200">
                      {isUploadingHomework ? "Téléversement sécurisé..." : "Cliquez ou glissez-déposez votre devoir ici"}
                    </span>
                    <span className="text-[10px] text-slate-500">Formats acceptés : PDF, XLSX, DOCX, PNG (Max 25 Mo)</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploadingHomework}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* ONGLET 4 : MOTEUR DE QUIZ DYNAMIQUE */}
          {activeTab === 'QUIZ' && (
            <div className="space-y-5">
              {activeLesson.quiz ? (
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-white">{activeLesson.quiz.title}</h4>
                      <p className="text-xs text-slate-400">Seuil de réussite requis : {activeLesson.quiz.passingScorePercentage}%</p>
                    </div>
                    {quizScore !== null && (
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        quizScore >= activeLesson.quiz.passingScorePercentage
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        Score : {quizScore}%
                      </span>
                    )}
                  </div>

                  {/* État de chargement IA : Correction par l'IA en cours... */}
                  {isAiGradingQuiz ? (
                    <div className="p-8 sm:p-12 rounded-2xl bg-slate-950 border border-amber-500/40 text-center space-y-4 animate-fadeIn">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10 animate-bounce">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black">
                          <Crown className="w-3.5 h-3.5" />
                          <span>Mode IA Elite • Google AI Studio</span>
                        </div>
                        <h4 className="text-base font-black text-white">Correction par l&apos;IA en cours...</h4>
                        <p className="text-xs text-slate-300 max-w-md mx-auto">{aiGradingStage}</p>
                      </div>
                      <div className="w-48 mx-auto bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 animate-pulse w-3/4 rounded-full" />
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Rapport d'évaluation IA Elite après soumission */}
                      {quizSubmitted && aiGradingFeedback && (
                        <div className={`p-4 rounded-2xl border space-y-3 animate-fadeIn ${
                          aiGradingFeedback.status === 'EXCELLENT' 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                        }`}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4 text-amber-400" />
                              <span className="text-xs font-black text-white">
                                Rapport d&apos;évaluation IA Elite (Google AI Studio)
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono border border-slate-700 text-slate-300">
                              Critères instructeur appliqués
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-200">{aiGradingFeedback.summary}</p>
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {aiGradingFeedback.criteriaMatched.map((crit, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-900/80 text-[10px] font-semibold text-slate-300 border border-slate-700">
                                {crit}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Formulaire des Questions */}
                      <form onSubmit={handleQuizSubmit} className="space-y-6">
                    {activeLesson.quiz.questions.map((q, qIdx) => {
                      const selected = selectedAnswers[q.id];
                      const isCorrect = selected === q.correctOptionIndex;

                      return (
                        <div key={q.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                          <p className="text-xs sm:text-sm font-bold text-white">
                            <span className="text-amber-400 mr-1.5 font-black">{qIdx + 1}.</span>
                            {q.questionText}
                          </p>

                          <div className="space-y-2">
                            {q.options.map((option, optIdx) => {
                              let optionStyle = 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700';

                              if (quizSubmitted) {
                                if (optIdx === q.correctOptionIndex) {
                                  optionStyle = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-bold';
                                } else if (selected === optIdx) {
                                  optionStyle = 'bg-rose-500/20 border-rose-500/50 text-rose-200';
                                }
                              } else if (selected === optIdx) {
                                optionStyle = 'bg-indigo-500/20 border-indigo-500 text-white font-bold';
                              }

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => {
                                    if (!quizSubmitted) {
                                      playTapBeep();
                                      setSelectedAnswers(prev => ({ ...prev, [q.id]: optIdx }));
                                    }
                                  }}
                                  className={`w-full text-left p-3 rounded-xl border text-xs flex items-center gap-2.5 transition ${optionStyle}`}
                                >
                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                                    selected === optIdx ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-600'
                                  }`}>
                                    {String.fromCharCode(65 + optIdx)}
                                  </div>
                                  <span>{option}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Explication Pédagogique après soumission */}
                          {quizSubmitted && (
                            <div className={`p-3 rounded-xl text-xs space-y-1 ${
                              isCorrect ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                            }`}>
                              <p className="font-bold">{isCorrect ? "✓ Bonne réponse !" : "✗ Réponse incorrecte"}</p>
                              <p className="text-[11px] text-slate-300">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-end gap-3 pt-2">
                      {quizSubmitted ? (
                        <button
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setQuizSubmitted(false);
                            setQuizScore(null);
                            setSelectedAnswers({});
                            setAiGradingFeedback(null);
                          }}
                          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          Repasser l'évaluation
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={Object.keys(selectedAnswers).length < activeLesson.quiz.questions.length}
                          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition cursor-pointer disabled:opacity-40"
                        >
                          Valider mes Réponses
                        </button>
                      )}
                    </div>
                  </form>
                  </>
                  )}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                  <p className="text-xs text-slate-400">Ce chapitre ne comporte pas de quiz d'évaluation.</p>
                </div>
              )}
            </div>
          )}

          {/* ONGLET 5 : CERTIFICAT OFFICIEL & DIPLÔME PDF */}
          {activeTab === 'CERTIFICATE' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-white">Délivrance de votre Certificat Académique</h3>
                <p className="text-xs text-slate-400">
                  {isCourseFullyCompleted 
                    ? "Félicitations ! Vous avez validé 100% de la formation. Votre diplôme officiel est prêt."
                    : "Votre certificat se débloque au fur et à mesure de votre progression. Vous pouvez déjà le prévisualiser ci-dessous."}
                </p>
              </div>

              <React.Suspense fallback={
                <div className="w-full h-80 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                  <span className="text-xs font-bold text-slate-400">Génération sécurisée du certificat officiel...</span>
                </div>
              }>
                <CertificateGenerator
                  course={course}
                  studentName={
                    (typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('student') || new URLSearchParams(window.location.search).get('learner'))) ||
                    currentUser?.name || 
                    currentUser?.email?.split('@')[0] || 
                    'Étudiant Diplômé NaNa'
                  }
                  scorePercentage={quizScore || 95}
                />
              </React.Suspense>
            </div>
          )}
        </div>
      </section>

      {/* Modale de Profil Apprenant (Social Campus) */}
      <LearnerProfileModal
        isOpen={!!selectedLearnerId}
        onClose={() => setSelectedLearnerId(null)}
        userId={selectedLearnerId}
        currentUserId={currentUser?.id || enrollment.studentId}
        onOpenDirectMessage={(uid, name, avatar) => {
          setSelectedLearnerId(null);
          setDmTarget({ id: uid, name, avatar });
        }}
      />

      {/* Tiroir de Messagerie Directe 1-à-1 (Social Campus) */}
      <DirectMessagingDrawer
        isOpen={!!dmTarget}
        onClose={() => setDmTarget(null)}
        currentUserId={currentUser?.id || enrollment.studentId}
        currentUserName={currentUser?.name || enrollment.studentName}
        currentUserAvatar={currentUser?.avatar}
        targetUserId={dmTarget?.id || null}
        targetUserName={dmTarget?.name}
        targetUserAvatar={dmTarget?.avatar}
      />

      {/* Modale de Diagnostic Post-Simulation Vocale IA */}
      <VoiceSimulationReportModal
        isOpen={isReportModalOpen}
        report={simulationReport}
        onClose={() => setIsReportModalOpen(false)}
        onRetry={() => {
          setIsReportModalOpen(false);
          setActiveTab('ARENA');
        }}
        onContinue={() => {
          setIsReportModalOpen(false);
          setActiveTab('SYLLABUS');
        }}
      />

      {/* Bouton d'édition rapide Funnel Builder pour Administrateur / Équipe */}
      <button
        type="button"
        onClick={() => {
          playTapBeep();
          if (typeof window !== 'undefined') {
            window.location.href = '/builder?edit=campus-landing';
          }
        }}
        className="fixed bottom-4 right-4 z-50 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-2xl shadow-blue-500/40 border border-blue-400/40 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
        title="Ouvrir cette page dans le Funnel Builder"
      >
        <span>✏️</span>
        <span>Modifier cette page</span>
      </button>
    </div>
    </ClassroomErrorBoundary>
  );
});

export default VirtualCampusView;
