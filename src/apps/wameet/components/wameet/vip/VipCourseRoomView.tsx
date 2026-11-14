import React, { useState } from 'react';
import {
  ChevronLeft,
  GraduationCap,
  BookOpen,
  Award,
  MessageSquare,
  ShieldCheck,
  Radio,
  Lock,
  Sparkles,
  Share2,
  Users,
  CheckCircle2
} from 'lucide-react';
import {
  VipCourseRoomViewProps,
  VipCourseRoom,
  VipChapterItem,
  VipLessonItem
} from './types';
import {
  MOCK_VIP_COURSE_ROOMS,
  DEFAULT_VIP_CHAPTERS,
  DEFAULT_VIP_QUIZ_QUESTIONS,
  DEFAULT_VIP_QNA_MESSAGES
} from './mockVipData';
import { VipWebinarPlayer } from './VipWebinarPlayer';
import { VipModulesAccordion } from './VipModulesAccordion';
import { VipQuizEngine } from './VipQuizEngine';
import { VipClassroomQnA } from './VipClassroomQnA';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

type CourseRoomTab = 'MODULES' | 'QUIZ' | 'QNA';

/**
 * PROMPT 28 : L'Intérieur de la "Salle VIP" (Éducation & Cours)
 * Mission : UI/UX Premium - Intérieur de la "Salle VIP" (LMS & Cours Wameet)
 * Espace fermé dédié à l'apprentissage (LMS), créé depuis Nanasore.
 * 
 * Directives UI/UX au millimètre :
 * - Layout Principal : Épuré, favorisant la concentration (bg-slate-50 text-slate-900).
 * - Zone Supérieure (Le Webinaire) : Lecteur vidéo large avec statut "LIVE" clignotant si direct.
 * - Zone Inférieure (Onglets de contenu) :
 *   - Onglet Modules : Liste accordéon des chapitres. Au clic, lance la vidéo ou ouvre un PDF.
 *   - Onglet Quiz : Interface QCM intégrée.
 *   - Onglet Q&A (Chat de classe) : Chat réservé aux étudiants abonnés, le professeur peut épingler les meilleures réponses.
 */
export const VipCourseRoomView: React.FC<VipCourseRoomViewProps> = ({
  course = MOCK_VIP_COURSE_ROOMS[0],
  chapters = DEFAULT_VIP_CHAPTERS,
  quizQuestions = DEFAULT_VIP_QUIZ_QUESTIONS,
  initialQnaMessages = DEFAULT_VIP_QNA_MESSAGES,
  currentUser = {
    name: 'Moi (Étudiant VIP)',
    isSubscribed: true,
    isInstructor: false
  },
  onBackToHub,
  className = ''
}) => {
  const currentCourse: VipCourseRoom = course || MOCK_VIP_COURSE_ROOMS[0];

  const [activeTab, setActiveTab] = useState<CourseRoomTab>('MODULES');
  const [activeLesson, setActiveLesson] = useState<VipLessonItem>(
    chapters[0]?.lessons[0] || {
      id: 'default-lesson',
      title: 'Introduction & Principes Directeurs',
      type: 'video',
      duration: '25 min',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    }
  );

  const [completedLessonsCount, setCompletedLessonsCount] = useState<number>(2);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLessonSelected = (lesson: VipLessonItem) => {
    setActiveLesson(lesson);
    showToast(`▶ Lecture en cours : ${lesson.title}`);
  };

  const handleLessonCompleted = () => {
    setCompletedLessonsCount((prev) => prev + 1);
    showToast('✅ Progression enregistrée avec succès !');
  };

  return (
    <div
      className={`min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600/20 selection:text-blue-900 ${className}`}
    >
      {/* Toast de Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-bounce-subtle pointer-events-none">
          <div className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 border border-slate-700">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* =====================================================================
          1. NAVIGATION HAUTE ÉPURÉE (FAVORISANT LA CONCENTRATION)
         ===================================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Bouton Retour & Titre de la Salle */}
          <div className="flex items-center gap-3 min-w-0">
            {onBackToHub && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onBackToHub();
                }}
                className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs active:scale-95"
                title="Retourner au Hub VIP"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Salle VIP • Nanasore LMS</span>
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">• Espace Sécurisé</span>
              </div>

              <h1 className="text-sm sm:text-base font-black text-slate-900 truncate">
                {currentCourse.title}
              </h1>
            </div>
          </div>

          {/* Formateur & Statut Étudiant */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 pr-3 border-r border-slate-200">
              <img
                src={currentCourse.instructorAvatar}
                alt={currentCourse.instructorName}
                className="w-7 h-7 rounded-full object-cover border border-blue-600"
              />
              <div className="text-left text-xs">
                <div className="font-black text-slate-900 leading-tight">
                  {currentCourse.instructorName}
                </div>
                <div className="text-[10px] text-slate-500">Formateur Certifié</div>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="hidden sm:inline">Abonné</span> VIP
            </span>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. CORPS PRINCIPAL : ZONE SUPÉRIEURE (WEBINAIRE) & ZONE INFÉRIEURE
         ===================================================================== */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-5 sm:py-6 space-y-6 flex-1">
        {/* ===================================================================
            ZONE SUPÉRIEURE (LE WEBINAIRE)
            Lecteur vidéo large pour cours en direct ou préenregistrés,
            avec statut "LIVE" rouge clignotant si le professeur est en direct.
           =================================================================== */}
        <VipWebinarPlayer
          title={activeLesson.title}
          instructorName={currentCourse.instructorName}
          instructorRole={currentCourse.instructorRole}
          instructorAvatar={currentCourse.instructorAvatar}
          isLive={currentCourse.isLiveNow}
          activeVideoUrl={activeLesson.videoUrl}
          lessonDuration={activeLesson.duration}
          onLessonCompleted={handleLessonCompleted}
        />

        {/* ===================================================================
            ZONE INFÉRIEURE : ONGLETS DE CONTENU
            - Onglet Modules (Accordéon chapitres, vidéo / PDF)
            - Onglet Quiz (Interface QCM intégrée)
            - Onglet Q&A (Chat de classe avec questions épinglées)
           =================================================================== */}
        <div className="space-y-4">
          {/* Navigation par Onglets */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
            {/* Onglet 1 : Modules */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('MODULES');
              }}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeTab === 'MODULES'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>1. Modules & Chapitres</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'MODULES' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {chapters.length}
              </span>
            </button>

            {/* Onglet 2 : Quiz */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('QUIZ');
              }}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeTab === 'QUIZ'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>2. Quiz & Évaluation QCM</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'QUIZ' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {quizQuestions.length} Q
              </span>
            </button>

            {/* Onglet 3 : Q&A (Chat de classe) */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('QNA');
              }}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeTab === 'QNA'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>3. Q&A (Chat de classe)</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'QNA' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {initialQnaMessages.length}
              </span>
            </button>
          </div>

          {/* Affichage Conditionnel du Contenu de l'Onglet */}
          <div>
            {activeTab === 'MODULES' && (
              <VipModulesAccordion
                chapters={chapters}
                activeLessonId={activeLesson.id}
                onSelectLesson={handleLessonSelected}
              />
            )}

            {activeTab === 'QUIZ' && (
              <VipQuizEngine
                questions={quizQuestions}
                onQuizCompleted={(score, total) => {
                  showToast(`🏆 Quiz terminé avec ${score}/${total} bonnes réponses !`);
                }}
              />
            )}

            {activeTab === 'QNA' && (
              <VipClassroomQnA
                initialMessages={initialQnaMessages}
                isSubscribed={currentUser.isSubscribed !== false}
                isInstructor={currentUser.isInstructor === true}
                currentUser={currentUser}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default VipCourseRoomView;
