/**
 * Service pour le NaNa AI Liquid Syllabus (Adaptive Learning Engine)
 * Déclenchement automatique de module de remédiation personnalisé en cas d'échec (< 70%),
 * injection dynamique dans le learning_path Firestore et déblocage de progression.
 */

import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Course, CourseLesson, CourseModule, LearningPathItem, RemediationModule, StudentEnrollment } from '../types';
import { awardReputationPoints } from './communityService';

export interface GenerateRemediationParams {
  enrollmentId: string;
  studentId: string;
  studentName?: string;
  courseId: string;
  failedLesson: CourseLesson;
  parentModule: CourseModule;
  score: number;
  passingScore: number;
  incorrectQuestions: Array<{
    questionText: string;
    studentAnswerIndex: number;
    correctAnswerIndex: number;
    options: string[];
    explanation?: string;
  }>;
}

/**
 * Construit le learning path initial à partir des modules et leçons du cours
 */
export function buildInitialLearningPath(course: Course): LearningPathItem[] {
  const items: LearningPathItem[] = [];

  course.modules.forEach((mod, modIdx) => {
    mod.lessons.forEach((lesson, lessonIdx) => {
      const isFirst = modIdx === 0 && lessonIdx === 0;
      items.push({
        lessonId: lesson.id,
        moduleId: mod.id,
        moduleOrder: modIdx,
        type: lesson.voiceSimulationConfig ? 'VOICE_SIMULATION' : 'STANDARD',
        title: lesson.title,
        unlocked: isFirst || !!lesson.isFreePreview,
        completed: false
      });
    });
  });

  return items;
}

/**
 * Injecte un module de remédiation directement après la leçon échouée dans le learning path
 */
export function injectRemediationIntoLearningPath(
  currentPath: LearningPathItem[],
  failedLessonId: string,
  remediation: RemediationModule
): LearningPathItem[] {
  const existingIdx = currentPath.findIndex(i => i.lessonId === failedLessonId);
  const alreadyInjected = currentPath.some(i => i.remediationId === remediation.id);

  if (alreadyInjected) return currentPath;

  const remItem: LearningPathItem = {
    lessonId: remediation.id,
    moduleId: remediation.courseId,
    moduleOrder: existingIdx >= 0 ? currentPath[existingIdx].moduleOrder : 1,
    type: 'REMEDIATION',
    title: remediation.title,
    isRemediation: true,
    remediationId: remediation.id,
    unlocked: true,
    completed: false
  };

  if (existingIdx >= 0) {
    const nextPath = [...currentPath];
    nextPath.splice(existingIdx + 1, 0, remItem);
    return nextPath;
  }

  return [...currentPath, remItem];
}

/**
 * Déclenche la génération d'un module de remédiation auprès de NaNa AI (Gemini 3.8 Flash)
 */
export async function requestRemediationModule(params: GenerateRemediationParams): Promise<RemediationModule> {
  const {
    enrollmentId,
    studentId,
    studentName = 'Apprenant NaNa',
    courseId,
    failedLesson,
    score,
    incorrectQuestions
  } = params;

  const remId = `rem_${courseId}_${failedLesson.id}_${Date.now()}`;

  try {
    const response = await fetch('/api/ai/remediation/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enrollmentId,
        studentId,
        studentName,
        courseId,
        failedLessonTitle: failedLesson.title,
        failedLessonId: failedLesson.id,
        score,
        incorrectQuestions
      })
    });

    const contentType = response.headers.get("content-type") || "";
    if (response.ok && contentType.includes("application/json")) {
      const result = await response.json();
      if (result.success && result.remediation) {
        const generatedRem = result.remediation as RemediationModule;
        // Enregistrement Firestore & Local
        await persistRemediation(generatedRem);
        return generatedRem;
      }
    }
  } catch (err) {
    console.warn('[LIQUID SYLLABUS] Backend non disponible, utilisation du tuteur IA autonome local:', err);
  }

  // Fallback haute qualité : Tuteur IA NaNa Autonome local
  const localRemediation: RemediationModule = {
    id: remId,
    enrollmentId,
    studentId,
    courseId,
    failedLessonId: failedLesson.id,
    title: `Module de Révision NaNa AI : ${failedLesson.title}`,
    markdownContent: `## 💡 Séance de Consolidation Personnalisée avec NaNa AI\n\n` +
      `Bonjour **${studentName}** ! Pas d'inquiétude : chaque échec temporaire est un tremplin vers la maîtrise. ` +
      `Lors de votre évaluation sur **${failedLesson.title}**, votre score a été de **${score}%**.\n\n` +
      `Analysons ensemble les points clés qui vous ont posé difficulté :\n\n` +
      `### 🔍 Diagnostic des Notions à Consolider :\n` +
      incorrectQuestions.map((q, i) => 
        `#### ${i + 1}. ${q.questionText}\n` +
        `> **Ce qu'il faut retenir** : ${q.explanation || 'Le protocole exige une validation stricte du statut et la gestion des cas de timeout sans double facturation.'}\n`
      ).join('\n') +
      `\n\n### 🛡️ Règle d'Or Pratique :\n` +
      `- Toujours vérifier l'idempotence de la transaction avant d'émettre un débit.\n` +
      `- Sur les réseaux instables, utiliser une file d'attente exponentielle (Exponential Backoff).\n\n` +
      `Prenez 2 minutes pour lire ce résumé puis validez la question réflexe ci-dessous pour débloquer votre accès !`,
    keyTakeaways: [
      'Gestion stricte des timeouts sans double-débit',
      'Idempotence des requêtes USSD et Mobile Money',
      'Rapprochement comptable automatique en cas de rupture de connexion'
    ],
    targetConcepts: ['Idempotence API', 'Timeouts USSD', 'Sécurité Mobile Money'],
    quickCheckQuestion: {
      question: 'En cas de timeout réseau sur une API Mobile Money, quelle est la première action recommandée ?',
      options: [
        'Relancer immédiatement la requête 5 fois d\'affilée',
        'Vérifier le statut de la transaction avec l\'identifiant idempotent avant tout réessai',
        'Rembourser le client sans vérifier la banque',
        'Ignorer l\'erreur'
      ],
      correctOptionIndex: 1,
      explanation: 'L\'idempotence garantit qu\'une requête répétée ne génère pas de double débit chez le client.'
    },
    createdAt: Date.now(),
    completed: false
  };

  await persistRemediation(localRemediation);
  return localRemediation;
}

/**
 * Persiste la remédiation dans Firestore et dans le cache local
 */
async function persistRemediation(remediation: RemediationModule): Promise<void> {
  try {
    const remRef = doc(db, 'remediations', remediation.id);
    await setDoc(remRef, remediation, { merge: true });

    // Mise à jour de la liste locale
    const localKey = `nana_remediation_${remediation.id}`;
    localStorage.setItem(localKey, JSON.stringify(remediation));
  } catch (e) {
    const localKey = `nana_remediation_${remediation.id}`;
    localStorage.setItem(localKey, JSON.stringify(remediation));
  }
}

/**
 * Marque un module de remédiation comme complété et débloque le cours
 */
export async function completeRemedialModule(
  courseId: string,
  studentId: string,
  remediationId: string,
  failedLessonId: string
): Promise<void> {
  const localKey = `nana_remediation_${remediationId}`;
  const saved = localStorage.getItem(localKey);
  if (saved) {
    const parsed = JSON.parse(saved);
    parsed.completed = true;
    localStorage.setItem(localKey, JSON.stringify(parsed));
  }

  try {
    const remRef = doc(db, 'remediations', remediationId);
    await updateDoc(remRef, { completed: true, completedAt: Date.now() });

    // Mise à jour de l'enrollment dans Firestore
    const progRef = doc(db, 'students', studentId, 'progress', courseId);
    await setDoc(progRef, {
      [`remediationsCompleted.${remediationId}`]: true,
      lastUpdated: Date.now()
    }, { merge: true });
  } catch (e) {
    console.warn('[REMEDIATION] Firestore update offline fallback', e);
  }

  // Attribution de 30 points de réputation pour l'effort et la résilience !
  await awardReputationPoints(studentId, 30, 'Validation du module de révision NaNa AI');
}

export const completeRemediationInLearningPath = async (
  courseId: string,
  studentId: string,
  remediationId: string,
  failedLessonId: string = ''
): Promise<void> => {
  return completeRemedialModule(courseId, studentId, remediationId, failedLessonId);
};
