import { supabase } from '../lib/supabase';
import { db, storage } from '../firebaseConfig';
import { 
  doc, updateDoc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  AssignmentSubmission, 
  StudentRosterItem, 
  CourseModule, 
  CourseLesson, 
  LessonResource, 
  DripSettings, 
  Course 
} from '../types';

export interface ApproveAssignmentParams {
  assignmentId: string;
  studentId: string;
  courseId?: string;
  lessonId?: string;
  grade: number;
  maxScore?: number;
  feedback?: string;
  voiceFeedbackUrl?: string;
  voiceDurationSeconds?: number;
  instructorName?: string;
}

export interface RequestRevisionParams {
  assignmentId: string;
  studentId: string;
  feedback: string;
  voiceFeedbackUrl?: string;
  voiceDurationSeconds?: number;
  instructorName?: string;
}

/**
 * Approuve un devoir d'étudiant, enregistre la note et débloque le module suivant dans Firestore
 */
export async function approveAssignmentAndUnlockNext(params: ApproveAssignmentParams): Promise<boolean> {
  const {
    assignmentId,
    studentId,
    courseId = 'telecom-fintech-masterclass',
    lessonId,
    grade,
    maxScore = 20,
    feedback = '',
    voiceFeedbackUrl,
    voiceDurationSeconds,
    instructorName = 'Ibrahim Pousbila Konkobo'
  } = params;

  const passed = grade >= (maxScore * 0.5);
  const now = Date.now();

  try {
    // 1. Mise à jour du document Devoir dans Firestore
    const assignmentRef = doc(db, 'assignments', assignmentId);
    await updateDoc(assignmentRef, {
      status: 'GRADED',
      grade,
      maxScore,
      passed,
      feedback,
      voiceFeedbackUrl: voiceFeedbackUrl || null,
      voiceDurationSeconds: voiceDurationSeconds || null,
      gradedAt: now,
      gradedByName: instructorName
    }).catch(async (err) => {
      // Si le document n'existe pas encore, on le crée
      console.warn("Doc assignments non existant, utilisation de setDoc:", err);
      await setDoc(assignmentRef, {
        id: assignmentId,
        studentId,
        courseId,
        lessonId,
        status: 'GRADED',
        grade,
        maxScore,
        passed,
        feedback,
        voiceFeedbackUrl: voiceFeedbackUrl || null,
        voiceDurationSeconds: voiceDurationSeconds || null,
        gradedAt: now,
        gradedByName: instructorName
      }, { merge: true });
    });

    // 2. Déblocage de la progression de l'étudiant dans students/{studentId}/progress
    const studentProgressRef = doc(db, 'students', studentId, 'progress', courseId);
    const progressSnap = await getDoc(studentProgressRef);

    let completedLessonIds: string[] = [];
    if (progressSnap.exists()) {
      completedLessonIds = progressSnap.data()?.completedLessonIds || [];
    }

    if (lessonId && !completedLessonIds.includes(lessonId)) {
      completedLessonIds.push(lessonId);
    }

    await setDoc(studentProgressRef, {
      studentId,
      courseId,
      completedLessonIds,
      lastUpdated: now,
      [`grades.${assignmentId}`]: {
        grade,
        maxScore,
        passed,
        gradedAt: now
      }
    }, { merge: true });

    // 3. Mise à jour du cache local réactif
    const localKey = `nana_assignment_graded_${assignmentId}`;
    localStorage.setItem(localKey, JSON.stringify({
      status: 'GRADED',
      grade,
      maxScore,
      feedback,
      voiceFeedbackUrl,
      gradedAt: now
    }));

    // Met à jour la liste des leçons débloquées de l'étudiant
    if (lessonId) {
      const studentEnrolledKey = `nana_course_enrolled_${courseId}`;
      localStorage.setItem(studentEnrolledKey, 'true');
    }

    return true;
  } catch (error) {
    console.error("Erreur validation devoir storage:", error);
    // En cas d'erreur réseau / hors-ligne, on persiste dans localStorage
    localStorage.setItem(`nana_assignment_graded_${assignmentId}`, JSON.stringify({
      status: 'GRADED',
      grade,
      maxScore,
      feedback,
      voiceFeedbackUrl,
      gradedAt: now
    }));
    return true;
  }
}

/**
 * Demande une révision à l'étudiant avec feedback explicatif
 */
export async function requestAssignmentRevision(params: RequestRevisionParams): Promise<boolean> {
  const {
    assignmentId,
    studentId,
    feedback,
    voiceFeedbackUrl,
    voiceDurationSeconds,
    instructorName = 'Ibrahim Pousbila Konkobo'
  } = params;

  const now = Date.now();

  try {
    const assignmentRef = doc(db, 'assignments', assignmentId);
    await updateDoc(assignmentRef, {
      status: 'NEEDS_REVISION',
      feedback,
      voiceFeedbackUrl: voiceFeedbackUrl || null,
      voiceDurationSeconds: voiceDurationSeconds || null,
      reviewedAt: now,
      gradedByName: instructorName
    }).catch(async () => {
      await setDoc(assignmentRef, {
        id: assignmentId,
        studentId,
        status: 'NEEDS_REVISION',
        feedback,
        voiceFeedbackUrl: voiceFeedbackUrl || null,
        voiceDurationSeconds: voiceDurationSeconds || null,
        reviewedAt: now,
        gradedByName: instructorName
      }, { merge: true });
    });

    localStorage.setItem(`nana_assignment_graded_${assignmentId}`, JSON.stringify({
      status: 'NEEDS_REVISION',
      feedback,
      voiceFeedbackUrl,
      reviewedAt: now
    }));

    return true;
  } catch (err) {
    console.error("Erreur demande révision devoir storage:", err);
    localStorage.setItem(`nana_assignment_graded_${assignmentId}`, JSON.stringify({
      status: 'NEEDS_REVISION',
      feedback,
      voiceFeedbackUrl,
      reviewedAt: now
    }));
    return true;
  }
}

/**
 * Met à jour le paramètre de masquage de branding YouTube pour un module de cours dans Firestore
 */
export async function updateModuleBranding(courseId: string, moduleId: string, hideBranding: boolean): Promise<boolean> {
  try {
    const moduleRef = doc(db, 'courses', courseId, 'modules', moduleId);
    await updateDoc(moduleRef, {
      hideBranding: hideBranding,
      updatedAt: Date.now()
    }).catch(async () => {
      await setDoc(moduleRef, {
        id: moduleId,
        courseId,
        hideBranding: hideBranding,
        updatedAt: Date.now()
      }, { merge: true });
    });

    // Sauvegarde miroir dans localStorage
    localStorage.setItem(`nana_module_branding_${courseId}_${moduleId}`, JSON.stringify({ hideBranding }));
    return true;
  } catch (err) {
    console.warn("Erreur mise à jour branding module storage, fallback local:", err);
    localStorage.setItem(`nana_module_branding_${courseId}_${moduleId}`, JSON.stringify({ hideBranding }));
    return true;
  }
}

/**
 * Met à jour le paramètre de masquage de branding YouTube pour une leçon spécifique dans Firestore
 */
export async function updateLessonBranding(courseId: string, lessonId: string, hideBranding: boolean, youtubeUrl?: string): Promise<boolean> {
  try {
    const lessonRef = doc(db, 'courses', courseId, 'lessons', lessonId);
    const payload: any = {
      hideBranding: hideBranding,
      updatedAt: Date.now()
    };
    if (youtubeUrl) {
      payload.videoUrl = youtubeUrl;
      payload.youtubeUrl = youtubeUrl;
    }

    await updateDoc(lessonRef, payload).catch(async () => {
      await setDoc(lessonRef, {
        id: lessonId,
        courseId,
        ...payload
      }, { merge: true });
    });

    localStorage.setItem(`nana_lesson_branding_${courseId}_${lessonId}`, JSON.stringify({ hideBranding, youtubeUrl }));
    return true;
  } catch (err) {
    console.warn("Erreur mise à jour branding leçon storage, fallback local:", err);
    localStorage.setItem(`nana_lesson_branding_${courseId}_${lessonId}`, JSON.stringify({ hideBranding, youtubeUrl }));
    return true;
  }
}

/**
 * Enregistre la structure réordonnée du cours (modules, leçons, nœuds) dans Firestore
 */
export async function saveCourseStructure(
  courseId: string, 
  modules: CourseModule[], 
  nodes?: any[], 
  edges?: any[]
): Promise<boolean> {
  try {
    const courseRef = doc(db, 'courses', courseId);
    const payload: any = {
      modules: modules.map((m, idx) => ({ ...m, order: idx })),
      updatedAt: Date.now()
    };
    if (nodes) payload.nodes = nodes;
    if (edges) payload.edges = edges;

    await setDoc(courseRef, payload, { merge: true });

    // Cache local miroir
    localStorage.setItem(`nana_course_structure_${courseId}`, JSON.stringify({
      modules,
      nodes,
      edges,
      updatedAt: Date.now()
    }));
    return true;
  } catch (err) {
    console.warn("Erreur sauvegarde structure cours storage, fallback local:", err);
    localStorage.setItem(`nana_course_structure_${courseId}`, JSON.stringify({
      modules,
      nodes,
      edges,
      updatedAt: Date.now()
    }));
    return true;
  }
}

/**
 * Vérifie si un module est débloqué selon les règles Drip Content et Progression Linéaire
 */
export function isModuleUnlocked(
  module: CourseModule,
  enrollmentDate: number = Date.now(),
  completedLessonIds: string[] = [],
  allModules: CourseModule[] = []
): { unlocked: boolean; reason?: string; unlockDateFormatted?: string } {
  const now = Date.now();

  // 1. Règle Drip Content (Diffusion progressive)
  if (module.dripSettings?.enabled) {
    if (module.dripSettings.type === 'DAYS_AFTER_ENROLLMENT') {
      const days = Number(module.dripSettings.unlockDays) || 0;
      const unlockTime = enrollmentDate + days * 24 * 60 * 60 * 1000;
      if (now < unlockTime) {
        const remainingDays = Math.ceil((unlockTime - now) / (24 * 60 * 60 * 1000));
        const unlockDate = new Date(unlockTime).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        return {
          unlocked: false,
          reason: `Contenu en diffusion progressive : disponible dans ${remainingDays} jour(s) (${unlockDate}).`,
          unlockDateFormatted: unlockDate
        };
      }
    } else if (module.dripSettings.type === 'CALENDAR_DATE' && module.dripSettings.unlockDate) {
      const unlockTime = new Date(module.dripSettings.unlockDate).getTime();
      if (!isNaN(unlockTime) && now < unlockTime) {
        const formatted = new Date(unlockTime).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        return {
          unlocked: false,
          reason: `Ce module sera débloqué le ${formatted} selon le calendrier officiel de formation.`,
          unlockDateFormatted: formatted
        };
      }
    }
  }

  // 2. Règle de Progression Linéaire Stricte (Module N requiert N-1 entièrement validé)
  if (module.strictLinearProgression && allModules.length > 0) {
    const currentIndex = allModules.findIndex(m => m.id === module.id);
    if (currentIndex > 0) {
      const previousModule = allModules[currentIndex - 1];
      if (previousModule && previousModule.lessons && previousModule.lessons.length > 0) {
        const allPrevLessonsCompleted = previousModule.lessons.every(l => 
          completedLessonIds.includes(l.id)
        );
        if (!allPrevLessonsCompleted) {
          return {
            unlocked: false,
            reason: `Parcours Linéaire Obligatoire : vous devez compléter toutes les leçons du module "${previousModule.title}" avant d'accéder à ce contenu.`
          };
        }
      }
    }
  }

  return { unlocked: true };
}

/**
 * Vérifie si une leçon individuelle est débloquée
 */
export function isLessonUnlocked(
  lesson: CourseLesson,
  parentModule: CourseModule,
  enrollmentDate: number = Date.now(),
  completedLessonIds: string[] = [],
  allModules: CourseModule[] = []
): { unlocked: boolean; reason?: string } {
  // Les aperçus gratuits sont toujours accessibles
  if (lesson.isFreePreview) return { unlocked: true };

  // Vérifier d'abord le module parent
  const moduleCheck = isModuleUnlocked(parentModule, enrollmentDate, completedLessonIds, allModules);
  if (!moduleCheck.unlocked) {
    return { unlocked: false, reason: moduleCheck.reason };
  }

  // Vérifier la progression linéaire interne au module si demandée
  if (parentModule.strictLinearProgression && parentModule.lessons) {
    const lessonIdx = parentModule.lessons.findIndex(l => l.id === lesson.id);
    if (lessonIdx > 0) {
      const prevLesson = parentModule.lessons[lessonIdx - 1];
      if (prevLesson && !completedLessonIds.includes(prevLesson.id)) {
        return {
          unlocked: false,
          reason: `Terminez la leçon précédente "${prevLesson.title}" pour débloquer cette session.`
        };
      }
    }
  }

  return { unlocked: true };
}

/**
 * Enregistre les paramètres globaux d'un cours (Prérequis, Code PIN, Progression)
 */
export async function saveCourseGlobalSettings(
  courseId: string, 
  settings: {
    prerequisiteCourseIds?: string[];
    isPasswordProtected?: boolean;
    accessPassword?: string;
    strictLinearProgression?: boolean;
  }
): Promise<boolean> {
  try {
    const courseRef = doc(db, 'courses', courseId);
    await setDoc(courseRef, {
      ...settings,
      updatedAt: Date.now()
    }, { merge: true });

    localStorage.setItem(`nana_course_settings_${courseId}`, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.warn("Erreur sauvegarde paramètres cours storage, fallback local:", err);
    localStorage.setItem(`nana_course_settings_${courseId}`, JSON.stringify(settings));
    return true;
  }
}

/**
 * Valide le mot de passe / code PIN d'un cours protégé
 */
export async function validateCourseAccessPassword(
  courseId: string, 
  enteredPin: string
): Promise<boolean> {
  if (!enteredPin || !enteredPin.trim()) return false;

  try {
    // Vérification cache local
    const cached = localStorage.getItem(`nana_course_settings_${courseId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (!parsed.isPasswordProtected) return true;
      if (parsed.accessPassword && parsed.accessPassword.trim() === enteredPin.trim()) {
        return true;
      }
    }

    // Vérification Firestore
    const courseRef = doc(db, 'courses', courseId);
    const snap = await getDoc(courseRef);
    if (snap.exists()) {
      const data = snap.data();
      if (!data.isPasswordProtected) return true;
      return data.accessPassword && data.accessPassword.trim() === enteredPin.trim();
    }
    return false;
  } catch (err) {
    console.warn("Erreur vérification mot de passe storage:", err);
    return true; // Évite de bloquer complètement si hors-ligne
  }
}

/**
 * Vérifie si l'étudiant a complété tous les cours prérequis
 */
export async function checkStudentPrerequisites(
  studentId: string, 
  prerequisiteCourseIds: string[]
): Promise<{ eligible: boolean; missingCourses: string[] }> {
  if (!prerequisiteCourseIds || prerequisiteCourseIds.length === 0) {
    return { eligible: true, missingCourses: [] };
  }

  const missing: string[] = [];
  for (const prereqId of prerequisiteCourseIds) {
    // Vérifie d'abord le cache local
    const localCompleted = localStorage.getItem(`nana_course_completed_${studentId}_${prereqId}`);
    if (localCompleted === 'true') continue;

    try {
      const progressRef = doc(db, 'students', studentId, 'progress', prereqId);
      const snap = await getDoc(progressRef);
      if (snap.exists() && snap.data()?.isCompleted) {
        continue;
      } else {
        missing.push(prereqId);
      }
    } catch {
      // En cas d'erreur de connexion, vérification tolérante
      continue;
    }
  }

  return {
    eligible: missing.length === 0,
    missingCourses: missing
  };
}

// ============================================================================
// GESTION DE LA BANQUE DE CONTENU (Firebase Storage & Firestore)
// ============================================================================

export interface ContentBankItem extends LessonResource {
  courseId: string;
  uploadedAt: number;
  storagePath?: string;
}

/**
 * Téléverse un fichier (PDF, ZIP, Image, Code) dans Firebase Storage pour la banque de contenu
 */
export async function uploadContentBankFile(
  courseId: string, 
  file: File
): Promise<LessonResource> {
  const resourceId = `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  
  let fileType: LessonResource['fileType'] = 'PDF';
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) fileType = 'ZIP';
  else if (['js', 'ts', 'py', 'json', 'html', 'css', 'sql'].includes(ext)) fileType = 'CODE';
  else if (['xlsx', 'xls', 'csv'].includes(ext)) fileType = 'SHEET';

  const sizeKb = Math.round(file.size / 1024);
  const sizeFormatted = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

  let downloadUrl = '';
  const storagePath = `courses/${courseId}/content_bank/${Date.now()}_${file.name}`;

  // 1. Upload prioritaire vers Supabase Storage (bucket academic_uploads)
  try {
    const supaPath = `courses/${courseId}/${Date.now()}_${file.name}`;
    const { data: supaUpload, error: supaErr } = await supabase.storage.from('academic_uploads').upload(supaPath, file);
    if (!supaErr && supaUpload?.path) {
      const { data: pubData } = supabase.storage.from('academic_uploads').getPublicUrl(supaUpload.path);
      if (pubData?.publicUrl) {
        downloadUrl = pubData.publicUrl;
      }
    }
  } catch (_e) {}

  // 2. Fallback Firebase Storage / local
  if (!downloadUrl) {
    try {
      const storageRef = ref(storage, storagePath);
      const uploadResult = await uploadBytes(storageRef, file);
      downloadUrl = await getDownloadURL(uploadResult.ref);
    } catch (err) {
      console.warn("Upload fallback local sécurisé:", err);
      downloadUrl = URL.createObjectURL(file);
    }
  }

  const resource: LessonResource = {
    id: resourceId,
    title: file.name,
    fileType: fileType,
    fileSize: sizeFormatted,
    downloadUrl: downloadUrl
  };

  // Enregistrement dans la collection Firestore de la banque de contenu
  try {
    const contentBankRef = doc(db, 'courses', courseId, 'content_bank', resourceId);
    await setDoc(contentBankRef, {
      ...resource,
      courseId,
      storagePath,
      uploadedAt: Date.now()
    });
  } catch (err) {
    console.warn("Erreur sauvegarde métadonnées storage Content Bank:", err);
  }

  // Sauvegarde dans le cache local
  const key = `nana_content_bank_${courseId}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  localStorage.setItem(key, JSON.stringify([resource, ...existing]));

  return resource;
}

/**
 * Récupère les ressources disponibles dans la banque de contenu d'un cours
 */
export async function getContentBankFiles(courseId: string): Promise<LessonResource[]> {
  const localKey = `nana_content_bank_${courseId}`;
  const localItems = JSON.parse(localStorage.getItem(localKey) || '[]');

  try {
    const bankCol = collection(db, 'courses', courseId, 'content_bank');
    const snap = await getDocs(bankCol);
    if (!snap.empty) {
      const firestoreItems: LessonResource[] = [];
      snap.forEach(docSnap => {
        const d = docSnap.data();
        firestoreItems.push({
          id: d.id || docSnap.id,
          title: d.title || 'Document',
          fileType: d.fileType || 'PDF',
          fileSize: d.fileSize || '1 MB',
          downloadUrl: d.downloadUrl || '#'
        });
      });
      // Fusionner avec le cache local pour éviter les pertes
      const combined = [...firestoreItems];
      localItems.forEach((li: LessonResource) => {
        if (!combined.some(c => c.id === li.id)) combined.push(li);
      });
      localStorage.setItem(localKey, JSON.stringify(combined));
      return combined;
    }
  } catch (err) {
    console.warn("Lecture storage content_bank impossible, utilisation cache local:", err);
  }

  // Données initiales si vide
  if (localItems.length === 0) {
    const defaultAssets: LessonResource[] = [
      {
        id: 'res-default-1',
        title: 'Architecture_POS_Transactions_Offline.pdf',
        fileType: 'PDF',
        fileSize: '4.8 MB',
        downloadUrl: 'https://example.com/spec_pos.pdf'
      },
      {
        id: 'res-default-2',
        title: 'Pack_Code_Source_Sync_IndexedDB.zip',
        fileType: 'ZIP',
        fileSize: '12.4 MB',
        downloadUrl: 'https://example.com/starter_code.zip'
      },
      {
        id: 'res-default-3',
        title: 'Schemas_Comptabilite_BCEAO_2026.xlsx',
        fileType: 'SHEET',
        fileSize: '840 KB',
        downloadUrl: 'https://example.com/schemas_bceao.xlsx'
      }
    ];
    localStorage.setItem(localKey, JSON.stringify(defaultAssets));
    return defaultAssets;
  }

  return localItems;
}

/**
 * Supprime une ressource de la banque de contenu
 */
export async function deleteContentBankFile(courseId: string, resourceId: string): Promise<boolean> {
  try {
    const contentBankRef = doc(db, 'courses', courseId, 'content_bank', resourceId);
    await deleteDoc(contentBankRef);
  } catch (err) {
    console.warn("Suppression storage content_bank non bloquante:", err);
  }

  const localKey = `nana_content_bank_${courseId}`;
  const localItems = JSON.parse(localStorage.getItem(localKey) || '[]');
  const updated = localItems.filter((i: any) => i.id !== resourceId);
  localStorage.setItem(localKey, JSON.stringify(updated));

  return true;
}
