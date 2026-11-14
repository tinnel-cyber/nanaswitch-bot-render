import { supabase } from '../lib/supabase';
import { 
  AssignmentSubmission, 
  StudentRosterItem, 
  CourseModule, 
  CourseLesson, 
  LessonResource, 
  DripSettings, 
  Course,
  StudentEnrollment 
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
 * Approuve un devoir d'étudiant, enregistre la note et débloque le module suivant dans Supabase SQL
 */
export async function approveAssignmentAndUnlockNext(params: ApproveAssignmentParams): Promise<boolean> {
  const {
    assignmentId,
    studentId,
    courseId,
    lessonId,
    grade,
    maxScore = 20,
    feedback = '',
    voiceFeedbackUrl,
    voiceDurationSeconds,
    instructorName = 'Ibrahim Pousbila Konkobo'
  } = params;

  const passed = grade >= (maxScore * 0.5);
  const nowIso = new Date().toISOString();

  try {
    // 1. Mise à jour / Upsert du devoir dans Supabase SQL `assignment_submissions`
    try {
      await supabase.from('assignment_submissions').upsert({
        id: assignmentId,
        assignment_id: assignmentId,
        student_id: studentId,
        course_id: courseId || '',
        lesson_id: lessonId || '',
        status: 'GRADED',
        grade,
        max_score: maxScore,
        passed,
        feedback,
        voice_feedback_url: voiceFeedbackUrl || null,
        voice_duration_seconds: voiceDurationSeconds || null,
        graded_at: nowIso,
        graded_by_name: instructorName,
        updated_at: nowIso
      });
    } catch (dbErr) {
      console.warn('[LMS SUPABASE] Insertion assignment_submissions tolérée:', dbErr);
    }

    // 2. Déblocage et progression de l'étudiant dans Supabase `enrollments`
    if (courseId) {
      try {
        const { data: enrollData } = await supabase
          .from('enrollments')
          .select('*')
          .eq('course_id', courseId)
          .or(`user_id.eq.${studentId},user_email.eq.${studentId}`)
          .maybeSingle();

        let completedLessons: string[] = enrollData?.completed_lessons || [];
        if (lessonId && !completedLessons.includes(lessonId)) {
          completedLessons.push(lessonId);
        }

        await supabase.from('enrollments').upsert({
          id: enrollData?.id || `${courseId}_${studentId}`,
          course_id: courseId,
          user_id: studentId.includes('-') && studentId.length === 36 ? studentId : undefined,
          user_email: studentId.includes('@') ? studentId : `student_${studentId}@nanasore.internal`,
          status: 'active',
          completed_lessons: completedLessons,
          updated_at: nowIso
        });
      } catch (enrollErr) {
        console.warn('[LMS SUPABASE] Mise à jour enrollment tolérée:', enrollErr);
      }
    }

    // 3. Mise à jour du cache local réactif
    const localKey = `nana_assignment_graded_${assignmentId}`;
    localStorage.setItem(localKey, JSON.stringify({
      status: 'GRADED',
      grade,
      maxScore,
      feedback,
      voiceFeedbackUrl,
      gradedAt: Date.now()
    }));

    if (courseId && lessonId) {
      localStorage.setItem(`nana_course_enrolled_${courseId}`, 'true');
    }

    return true;
  } catch (error) {
    console.error('[LMS SUPABASE] Erreur validation devoir:', error);
    localStorage.setItem(`nana_assignment_graded_${assignmentId}`, JSON.stringify({
      status: 'GRADED',
      grade,
      maxScore,
      feedback,
      voiceFeedbackUrl,
      gradedAt: Date.now()
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

  const nowIso = new Date().toISOString();

  try {
    try {
      await supabase.from('assignment_submissions').upsert({
        id: assignmentId,
        student_id: studentId,
        status: 'NEEDS_REVISION',
        feedback,
        voice_feedback_url: voiceFeedbackUrl || null,
        voice_duration_seconds: voiceDurationSeconds || null,
        graded_by_name: instructorName,
        updated_at: nowIso
      });
    } catch (err) {
      console.warn('[LMS SUPABASE] Demande révision Supabase SQL tolérée:', err);
    }

    localStorage.setItem(`nana_assignment_graded_${assignmentId}`, JSON.stringify({
      status: 'NEEDS_REVISION',
      feedback,
      voiceFeedbackUrl,
      reviewedAt: Date.now()
    }));

    return true;
  } catch (err) {
    console.error('[LMS SUPABASE] Erreur demande révision devoir:', err);
    localStorage.setItem(`nana_assignment_graded_${assignmentId}`, JSON.stringify({
      status: 'NEEDS_REVISION',
      feedback,
      voiceFeedbackUrl,
      reviewedAt: Date.now()
    }));
    return true;
  }
}

/**
 * Met à jour le paramètre de masquage de branding YouTube pour un module de cours dans Supabase
 */
export async function updateModuleBranding(courseId: string, moduleId: string, hideBranding: boolean): Promise<boolean> {
  try {
    // 1. Sauvegarde dans les settings du cours Supabase
    const { data: courseRow } = await supabase
      .from('courses')
      .select('settings, modules')
      .eq('id', courseId)
      .maybeSingle();

    if (courseRow) {
      const currentModules = courseRow.modules || courseRow.settings?.modules || [];
      const updatedModules = currentModules.map((m: any) => 
        m.id === moduleId ? { ...m, hideBranding } : m
      );

      await supabase.from('courses').update({
        modules: updatedModules,
        settings: {
          ...(courseRow.settings || {}),
          modules: updatedModules
        },
        updated_at: new Date().toISOString()
      }).eq('id', courseId);
    }

    // Sauvegarde miroir dans localStorage
    localStorage.setItem(`nana_module_branding_${courseId}_${moduleId}`, JSON.stringify({ hideBranding }));
    return true;
  } catch (err) {
    console.warn('[LMS SUPABASE] Erreur branding module, fallback local:', err);
    localStorage.setItem(`nana_module_branding_${courseId}_${moduleId}`, JSON.stringify({ hideBranding }));
    return true;
  }
}

/**
 * Met à jour le paramètre de masquage de branding YouTube pour une leçon spécifique dans Supabase
 */
export async function updateLessonBranding(courseId: string, lessonId: string, hideBranding: boolean, youtubeUrl?: string): Promise<boolean> {
  try {
    // Mise à jour de la table lessons si présente
    try {
      const updatePayload: any = {
        updated_at: new Date().toISOString()
      };
      if (youtubeUrl) {
        updatePayload.video_url = youtubeUrl;
      }
      await supabase.from('lessons').update(updatePayload).eq('id', lessonId);
    } catch (_e) {}

    // Mise à jour dans courses.settings
    const { data: courseRow } = await supabase
      .from('courses')
      .select('settings, modules')
      .eq('id', courseId)
      .maybeSingle();

    if (courseRow) {
      const currentModules = courseRow.modules || courseRow.settings?.modules || [];
      const updatedModules = currentModules.map((m: any) => ({
        ...m,
        lessons: (m.lessons || []).map((l: any) => {
          if (l.id === lessonId) {
            return {
              ...l,
              hideBranding,
              ...(youtubeUrl ? { videoUrl: youtubeUrl, youtubeUrl } : {})
            };
          }
          return l;
        })
      }));

      await supabase.from('courses').update({
        modules: updatedModules,
        settings: {
          ...(courseRow.settings || {}),
          modules: updatedModules
        },
        updated_at: new Date().toISOString()
      }).eq('id', courseId);
    }

    localStorage.setItem(`nana_lesson_branding_${courseId}_${lessonId}`, JSON.stringify({ hideBranding, youtubeUrl }));
    return true;
  } catch (err) {
    console.warn('[LMS SUPABASE] Erreur branding leçon, fallback local:', err);
    localStorage.setItem(`nana_lesson_branding_${courseId}_${lessonId}`, JSON.stringify({ hideBranding, youtubeUrl }));
    return true;
  }
}

/**
 * Enregistre la structure réordonnée du cours (modules, leçons, nœuds) dans Supabase SQL
 */
export async function saveCourseStructure(
  courseId: string, 
  modules: CourseModule[], 
  nodes?: any[], 
  edges?: any[],
  courseMeta?: { title?: string; slug?: string; description?: string; price?: number; thumbnailUrl?: string; tenantId?: string; status?: string }
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  try {
    const payloadSettings: any = {
      modules: modules.map((m, idx) => ({ ...m, order: idx })),
      updatedAt: Date.now()
    };
    if (nodes) payloadSettings.nodes = nodes;
    if (edges) payloadSettings.edges = edges;

    // Supabase update/upsert (SSR & SPA compatible)
    try {
      const courseUpsert: any = {
        id: courseId,
        settings: payloadSettings,
        modules: payloadSettings.modules,
        nodes: payloadSettings.nodes || [],
        edges: payloadSettings.edges || [],
        status: courseMeta?.status || 'published',
        updated_at: nowIso
      };
      if (courseMeta?.title) courseUpsert.title = courseMeta.title;
      if (courseMeta?.slug) courseUpsert.slug = courseMeta.slug.toLowerCase();
      if (courseMeta?.description) courseUpsert.description = courseMeta.description;
      if (courseMeta?.price != null) courseUpsert.price = courseMeta.price;
      if (courseMeta?.thumbnailUrl) courseUpsert.thumbnail_url = courseMeta.thumbnailUrl;
      if (courseMeta?.tenantId) courseUpsert.tenant_id = courseMeta.tenantId;

      await supabase.from('courses').upsert(courseUpsert);

      // Synchronisation optionnelle des leçons individuelles dans public.lessons pour Next.js SSR
      try {
        const flatLessons: any[] = [];
        let pos = 1;
        modules.forEach(m => {
          (m.lessons || []).forEach(l => {
            flatLessons.push({
              id: l.id,
              course_id: courseId,
              title: l.title,
              video_url: l.videoUrl || l.youtubeUrl || null,
              content: l.description || l.summary || '',
              position: pos++,
              is_free_preview: Boolean(l.isFreePreview),
              ...(courseMeta?.tenantId ? { tenant_id: courseMeta.tenantId } : {})
            });
          });
        });
        if (flatLessons.length > 0) {
          await supabase.from('lessons').upsert(flatLessons);
        }
      } catch (_lessErr) {}
    } catch (sqlErr) {
      console.warn('[LMS SUPABASE] Upsert courses toléré:', sqlErr);
    }

    // Cache local miroir
    localStorage.setItem(`nana_course_structure_${courseId}`, JSON.stringify({
      modules,
      nodes,
      edges,
      updatedAt: Date.now()
    }));
    return true;
  } catch (err) {
    console.warn('[LMS SUPABASE] Erreur sauvegarde structure cours, fallback local:', err);
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
 * Charge la structure d'un cours depuis Supabase (avec fallback miroir localStorage)
 */
export async function loadCourseStructure(
  courseId: string
): Promise<{ modules?: CourseModule[]; nodes?: any[]; edges?: any[]; title?: string } | null> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (!error && data) {
      const s = data.settings || {};
      return {
        modules: data.modules || s.modules,
        nodes: data.nodes || s.nodes,
        edges: data.edges || s.edges,
        title: data.title || s.title
      };
    }
  } catch (err) {
    console.warn('[LMS SUPABASE] Erreur lecture structure cours :', err);
  }

  // Fallback cache local miroir
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`nana_course_structure_${courseId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('[LMS SUPABASE] Erreur lecture cache local cours :', e);
    }
  }

  return null;
}

/**
 * Charge l'inscription d'un étudiant pour un cours (Supabase + localStorage)
 */
export async function loadStudentEnrollment(
  courseId: string, 
  studentId: string
): Promise<StudentEnrollment | null> {
  try {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('course_id', courseId)
      .or(`user_id.eq.${studentId},user_email.eq.${studentId}`)
      .maybeSingle();

    if (!error && data) {
      return {
        courseId: data.course_id,
        studentId: data.user_id || studentId,
        enrolledAt: data.enrolled_at ? new Date(data.enrolled_at).getTime() : Date.now(),
        completedLessonIds: data.completed_lessons || [],
        progressPercentage: Number(data.progress_percent) || 0,
        isCompleted: data.status === 'completed' || Number(data.progress_percent) >= 100
      };
    }
  } catch (err) {
    console.warn('[LMS SUPABASE] Erreur lecture inscription étudiant :', err);
  }

  // Fallback cache local
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`nana_enrollment_${courseId}_${studentId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('[LMS SUPABASE] Erreur lecture cache local inscription :', e);
    }
  }

  return null;
}

/**
 * Enregistre la progression d'un étudiant (Supabase + localStorage)
 */
export async function saveStudentEnrollmentProgress(
  courseId: string, 
  studentId: string, 
  enrollment: StudentEnrollment
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  try {
    try {
      await supabase.from('enrollments').upsert({
        id: `${courseId}_${studentId}`,
        course_id: courseId,
        user_id: studentId.includes('-') && studentId.length === 36 ? studentId : undefined,
        user_email: studentId.includes('@') ? studentId : `student_${studentId}@nanasore.internal`,
        completed_lessons: enrollment.completedLessonIds || [],
        progress_percent: enrollment.progressPercentage || 0,
        status: enrollment.isCompleted ? 'completed' : 'active',
        last_accessed_at: nowIso,
        updated_at: nowIso
      });
    } catch (sqlErr) {
      console.warn('[LMS SUPABASE] Sauvegarde enrollment Supabase tolérée:', sqlErr);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(`nana_enrollment_${courseId}_${studentId}`, JSON.stringify(enrollment));
    }
    return true;
  } catch (err) {
    console.warn('[LMS SUPABASE] Erreur sauvegarde inscription, fallback local:', err);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`nana_enrollment_${courseId}_${studentId}`, JSON.stringify(enrollment));
    }
    return false;
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
 * Enregistre les paramètres globaux d'un cours (Prérequis, Code PIN, Progression) dans Supabase
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
    const { data: courseRow } = await supabase
      .from('courses')
      .select('settings')
      .eq('id', courseId)
      .maybeSingle();

    await supabase.from('courses').update({
      settings: {
        ...(courseRow?.settings || {}),
        ...settings
      },
      updated_at: new Date().toISOString()
    }).eq('id', courseId);

    localStorage.setItem(`nana_course_settings_${courseId}`, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.warn('[LMS SUPABASE] Erreur sauvegarde paramètres cours, fallback local:', err);
    localStorage.setItem(`nana_course_settings_${courseId}`, JSON.stringify(settings));
    return true;
  }
}

/**
 * Valide le mot de passe / code PIN d'un cours protégé dans Supabase
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

    // Vérification Supabase SQL
    const { data } = await supabase
      .from('courses')
      .select('settings')
      .eq('id', courseId)
      .maybeSingle();

    if (data?.settings) {
      const s = data.settings;
      if (!s.isPasswordProtected) return true;
      return s.accessPassword && s.accessPassword.trim() === enteredPin.trim();
    }
    return true;
  } catch (err) {
    console.warn('[LMS SUPABASE] Erreur vérification mot de passe:', err);
    return true;
  }
}

/**
 * Vérifie si l'étudiant a complété tous les cours prérequis via Supabase
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
    const localCompleted = localStorage.getItem(`nana_course_completed_${studentId}_${prereqId}`);
    if (localCompleted === 'true') continue;

    try {
      const { data } = await supabase
        .from('enrollments')
        .select('status, progress_percent')
        .eq('course_id', prereqId)
        .or(`user_id.eq.${studentId},user_email.eq.${studentId}`)
        .maybeSingle();

      if (data && (data.status === 'completed' || Number(data.progress_percent) >= 100)) {
        continue;
      } else {
        missing.push(prereqId);
      }
    } catch {
      continue;
    }
  }

  return {
    eligible: missing.length === 0,
    missingCourses: missing
  };
}

// ============================================================================
// GESTION DE LA BANQUE DE CONTENU (Supabase Storage & Supabase SQL)
// ============================================================================

export interface ContentBankItem extends LessonResource {
  courseId: string;
  uploadedAt: number;
  storagePath?: string;
}

/**
 * Téléverse un fichier (PDF, ZIP, Image, Code) dans Supabase Storage (bucket academic_uploads)
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
  const supaPath = `courses/${courseId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  // 1. Upload prioritaire vers Supabase Storage (bucket academic_uploads)
  try {
    const { data: supaUpload, error: supaErr } = await supabase.storage
      .from('academic_uploads')
      .upload(supaPath, file, { upsert: true });

    if (!supaErr && supaUpload?.path) {
      const { data: pubData } = supabase.storage
        .from('academic_uploads')
        .getPublicUrl(supaUpload.path);

      if (pubData?.publicUrl) {
        downloadUrl = pubData.publicUrl;
      }
    }
  } catch (upErr) {
    console.warn('[LMS SUPABASE] Erreur upload Supabase Storage, fallback URL locale:', upErr);
  }

  if (!downloadUrl) {
    downloadUrl = URL.createObjectURL(file);
  }

  const resource: LessonResource = {
    id: resourceId,
    title: file.name,
    fileType: fileType,
    fileSize: sizeFormatted,
    downloadUrl: downloadUrl
  };

  // Enregistrement dans la table Supabase `course_content_bank`
  try {
    await supabase.from('course_content_bank').upsert({
      id: resourceId,
      course_id: courseId,
      title: file.name,
      file_type: fileType,
      file_size: sizeFormatted,
      download_url: downloadUrl,
      storage_path: supaPath,
      uploaded_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[LMS SUPABASE] Erreur sauvegarde métadonnées Supabase Content Bank:', err);
  }

  // Sauvegarde dans le cache local
  const key = `nana_content_bank_${courseId}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  localStorage.setItem(key, JSON.stringify([resource, ...existing]));

  return resource;
}

/**
 * Récupère les ressources disponibles dans la banque de contenu d'un cours via Supabase SQL
 */
export async function getContentBankFiles(courseId: string): Promise<LessonResource[]> {
  const localKey = `nana_content_bank_${courseId}`;
  const localItems = JSON.parse(localStorage.getItem(localKey) || '[]');

  try {
    const { data, error } = await supabase
      .from('course_content_bank')
      .select('*')
      .eq('course_id', courseId)
      .order('uploaded_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const supaItems: LessonResource[] = data.map((d: any) => ({
        id: d.id,
        title: d.title || 'Document',
        fileType: d.file_type || 'PDF',
        fileSize: d.file_size || '1 MB',
        downloadUrl: d.download_url || '#'
      }));

      // Fusionner avec le cache local
      const combined = [...supaItems];
      localItems.forEach((li: LessonResource) => {
        if (!combined.some(c => c.id === li.id)) combined.push(li);
      });
      localStorage.setItem(localKey, JSON.stringify(combined));
      return combined;
    }
  } catch (err) {
    console.warn('[LMS SUPABASE] Lecture Supabase content_bank impossible, utilisation cache local:', err);
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
 * Supprime une ressource de la banque de contenu dans Supabase
 */
export async function deleteContentBankFile(courseId: string, resourceId: string): Promise<boolean> {
  try {
    await supabase.from('course_content_bank').delete().eq('id', resourceId);
  } catch (err) {
    console.warn('[LMS SUPABASE] Suppression Supabase content_bank non bloquante:', err);
  }

  const localKey = `nana_content_bank_${courseId}`;
  const localItems = JSON.parse(localStorage.getItem(localKey) || '[]');
  const updated = localItems.filter((i: any) => i.id !== resourceId);
  localStorage.setItem(localKey, JSON.stringify(updated));

  return true;
}
