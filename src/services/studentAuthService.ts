/**
 * Service d'Authentification & de Session Étudiant (Espace Élève / LMS)
 * Gère la connexion, l'inscription et la persistance des cours souscrits
 */

export interface StudentAccount {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  password?: string;
  enrolledCourseIds: string[];
  createdAt: number;
  lastLoginAt: number;
}

const STORAGE_KEY_STUDENTS = 'nana_students_db';
const STORAGE_KEY_CURRENT = 'nana_current_student';
const STORAGE_KEY_NAME = 'nana_student_name';
const STORAGE_KEY_EMAIL = 'nana_student_email';
const STORAGE_KEY_PHONE = 'nana_student_phone';
const STORAGE_KEY_ENROLLED = 'nana_enrolled_courses';

// Récupère la liste de tous les comptes étudiants enregistrés
export function getAllStudents(): StudentAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erreur lecture nana_students_db', e);
    return [];
  }
}

// Sauvegarde la liste des comptes étudiants
function saveStudents(list: StudentAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(list));
  } catch (e) {
    console.error('Erreur sauvegarde nana_students_db', e);
  }
}

// Récupère l'étudiant actuellement connecté
export function getCurrentStudent(): StudentAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (raw) return JSON.parse(raw);

    // Fallback si un nom est stocké
    const name = localStorage.getItem(STORAGE_KEY_NAME);
    if (name) {
      return {
        id: 'student-session',
        fullName: name,
        email: localStorage.getItem(STORAGE_KEY_EMAIL) || '',
        phoneNumber: localStorage.getItem(STORAGE_KEY_PHONE) || '',
        enrolledCourseIds: getEnrolledCourseIds(),
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      };
    }
  } catch (e) {
    console.error('Erreur lecture student session', e);
  }
  return null;
}

export const getCurrentStudentProfile = getCurrentStudent;

// Récupère les IDs des cours souscrits
export function getEnrolledCourseIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENROLLED);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Connecte un étudiant existant (par email ou numéro de téléphone)
export function loginStudent(
  identifier: string,
  password: string
): { success: boolean; student?: StudentAccount; error?: string } {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPhone = identifier.replace(/[^0-9]/g, '');

  if (!cleanId) {
    return { success: false, error: 'Veuillez saisir votre email ou numéro de téléphone.' };
  }
  if (!password) {
    return { success: false, error: 'Veuillez saisir votre mot de passe.' };
  }

  const students = getAllStudents();
  let found = students.find((s) => {
    const matchEmail = s.email && s.email.toLowerCase() === cleanId;
    const matchPhone = s.phoneNumber && (s.phoneNumber === identifier.trim() || (cleanPhone.length >= 6 && s.phoneNumber.replace(/[^0-9]/g, '').endsWith(cleanPhone)));
    return matchEmail || matchPhone;
  });

  // Si l'étudiant a été enregistré lors d'un paiement préalable
  if (!found) {
    const storedName = localStorage.getItem(STORAGE_KEY_NAME);
    const storedPhone = localStorage.getItem(STORAGE_KEY_PHONE);
    const storedEmail = localStorage.getItem(STORAGE_KEY_EMAIL);

    if (
      (storedEmail && storedEmail.toLowerCase() === cleanId) ||
      (storedPhone && cleanPhone.length >= 6 && storedPhone.replace(/[^0-9]/g, '').endsWith(cleanPhone))
    ) {
      found = {
        id: `student-${Date.now()}`,
        fullName: storedName || 'Élève Académie',
        email: storedEmail || (cleanId.includes('@') ? cleanId : ''),
        phoneNumber: storedPhone || identifier.trim(),
        password,
        enrolledCourseIds: getEnrolledCourseIds(),
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      };
      students.push(found);
      saveStudents(students);
    }
  }

  if (!found) {
    return {
      success: false,
      error: 'Aucun compte trouvé avec cet identifiant. Veuillez créer votre compte élève.'
    };
  }

  if (found.password && found.password !== password) {
    return { success: false, error: 'Mot de passe incorrect.' };
  }

  // Connexion réussie : mise à jour de la session
  found.lastLoginAt = Date.now();
  saveStudents(students);

  localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(found));
  localStorage.setItem(STORAGE_KEY_NAME, found.fullName);
  localStorage.setItem(STORAGE_KEY_EMAIL, found.email);
  localStorage.setItem(STORAGE_KEY_PHONE, found.phoneNumber);

  return { success: true, student: found };
}

// Inscription d'un nouvel élève
export function registerStudent(data: {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  enrolledCourseId?: string;
}): { success: boolean; student?: StudentAccount; error?: string } {
  if (!data.fullName.trim()) {
    return { success: false, error: 'Veuillez renseigner vos nom et prénom.' };
  }
  if (!data.email.trim() && !data.phoneNumber.trim()) {
    return { success: false, error: 'Veuillez fournir au moins un email ou un numéro WhatsApp / Mobile Money.' };
  }
  if (!data.password || data.password.length < 4) {
    return { success: false, error: 'Le mot de passe doit comporter au moins 4 caractères.' };
  }

  const students = getAllStudents();
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanPhone = data.phoneNumber.replace(/[^0-9]/g, '');

  // Vérifier si un compte existe déjà
  const existing = students.find((s) => {
    const matchEmail = cleanEmail && s.email && s.email.toLowerCase() === cleanEmail;
    const matchPhone = cleanPhone && s.phoneNumber && cleanPhone.length >= 6 && s.phoneNumber.replace(/[^0-9]/g, '').endsWith(cleanPhone);
    return matchEmail || matchPhone;
  });

  if (existing) {
    // Mettre à jour le mot de passe et connecter
    existing.fullName = data.fullName.trim();
    existing.password = data.password;
    if (data.enrolledCourseId && !existing.enrolledCourseIds.includes(data.enrolledCourseId)) {
      existing.enrolledCourseIds.push(data.enrolledCourseId);
    }
    existing.lastLoginAt = Date.now();
    saveStudents(students);

    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(existing));
    localStorage.setItem(STORAGE_KEY_NAME, existing.fullName);
    localStorage.setItem(STORAGE_KEY_EMAIL, existing.email);
    localStorage.setItem(STORAGE_KEY_PHONE, existing.phoneNumber);

    return { success: true, student: existing };
  }

  const newStudent: StudentAccount = {
    id: `student-${Date.now().toString(36)}`,
    fullName: data.fullName.trim(),
    email: cleanEmail,
    phoneNumber: data.phoneNumber.trim(),
    password: data.password,
    enrolledCourseIds: data.enrolledCourseId ? [data.enrolledCourseId] : getEnrolledCourseIds(),
    createdAt: Date.now(),
    lastLoginAt: Date.now()
  };

  students.push(newStudent);
  saveStudents(students);

  // Mettre à jour la session
  localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(newStudent));
  localStorage.setItem(STORAGE_KEY_NAME, newStudent.fullName);
  localStorage.setItem(STORAGE_KEY_EMAIL, newStudent.email);
  localStorage.setItem(STORAGE_KEY_PHONE, newStudent.phoneNumber);

  return { success: true, student: newStudent };
}

const STORAGE_KEY_TOKEN = 'nana_student_token_v1';

export function getStudentToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(STORAGE_KEY_TOKEN) || '';
  } catch {
    return '';
  }
}

export function saveStudentSession(token: string, student: Partial<StudentAccount>, enrolledIds?: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) localStorage.setItem(STORAGE_KEY_TOKEN, token);
    if (student?.id) localStorage.setItem('nana_student_id', student.id);
    if (student?.fullName) localStorage.setItem(STORAGE_KEY_NAME, student.fullName);
    if (student?.email) localStorage.setItem(STORAGE_KEY_EMAIL, student.email);
    if (student?.phoneNumber) localStorage.setItem(STORAGE_KEY_PHONE, student.phoneNumber);
    localStorage.setItem(
      STORAGE_KEY_CURRENT,
      JSON.stringify({
        id: student.id || '',
        fullName: student.fullName || 'Étudiant',
        email: student.email || '',
        phoneNumber: student.phoneNumber || '',
        enrolledCourseIds: enrolledIds || student.enrolledCourseIds || [],
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      })
    );
    if (Array.isArray(enrolledIds)) {
      localStorage.setItem(STORAGE_KEY_ENROLLED, JSON.stringify(enrolledIds));
    }
  } catch {}
}

export async function registerStudentAccount(params: {
  fullName: string;
  email?: string;
  phoneNumber?: string;
  password: string;
}): Promise<{ success: boolean; student?: StudentAccount; error?: string }> {
  try {
    const res = await fetch('/api/student/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return { success: false, error: json?.error || 'Inscription impossible.' };
    }
    saveStudentSession(json.token, json.student, json.enrolledCourseIds || []);
    return { success: true, student: json.student };
  } catch {
    return { success: false, error: 'Erreur de connexion au Cloud.' };
  }
}

export async function loginStudentAccount(
  identifier: string,
  password: string
): Promise<{ success: boolean; student?: StudentAccount; error?: string }> {
  try {
    const res = await fetch('/api/student/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return { success: false, error: json?.error || 'Identifiants incorrects.' };
    }
    saveStudentSession(json.token, json.student, json.enrolledCourseIds || []);
    return { success: true, student: json.student };
  } catch {
    return { success: false, error: 'Erreur de connexion au Cloud.' };
  }
}

export interface CourseAccessVerificationResult {
  hasAccess: boolean;
  expired?: boolean;
  reason?: string;
  expiresAt?: string | null;
  pricingModel?: string;
  billingInterval?: string | null;
  canRenew?: boolean;
  completedLessons?: string[];
  progressPercentage?: number;
}

export async function verifyStudentCourseAccessDetails(courseId: string): Promise<CourseAccessVerificationResult> {
  const token = getStudentToken();
  if (!token || !courseId) return { hasAccess: false, reason: 'UNAUTHENTICATED' };
  try {
    const res = await fetch(
      `/api/student/enrollments/verify?courseId=${encodeURIComponent(courseId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) return { hasAccess: false };
    const enr = json?.enrollment || {};
    return {
      hasAccess: Boolean(json?.hasAccess === true),
      expired: Boolean(json?.expired),
      reason: json?.reason,
      expiresAt: json?.expiresAt ?? enr.expiresAt ?? enr.expires_at ?? null,
      pricingModel: json?.pricingModel ?? enr.pricingModel ?? enr.pricing_model ?? 'lifetime',
      billingInterval: json?.billingInterval ?? enr.billingInterval ?? enr.billing_interval ?? null,
      canRenew: Boolean(json?.canRenew),
      completedLessons: Array.isArray(enr.completedLessons)
        ? enr.completedLessons
        : Array.isArray(enr.completed_lessons)
          ? enr.completed_lessons
          : [],
      progressPercentage: Number(enr.progressPercentage ?? enr.progress_percentage ?? 0),
    };
  } catch {
    return { hasAccess: false };
  }
}

export async function verifyStudentCourseAccess(courseId: string): Promise<boolean> {
  const details = await verifyStudentCourseAccessDetails(courseId);
  return details.hasAccess;
}

export async function saveStudentProgressCloud(
  courseId: string,
  completedLessons: string[],
  progressPercentage: number
): Promise<boolean> {
  const token = getStudentToken();
  if (!token || !courseId) return false;
  try {
    const res = await fetch('/api/student/enrollments/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ courseId, completedLessons, progressPercentage }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchStudentDashboardCloud(): Promise<{
  authenticated: boolean;
  student?: any;
  enrolledCourseIds: string[];
  enrollments: any[];
  purchases: any[];
  quizzes: any[];
  certificates: any[];
}> {
  const token = getStudentToken();
  if (!token) {
    return { authenticated: false, enrolledCourseIds: [], enrollments: [], purchases: [], quizzes: [], certificates: [] };
  }
  try {
    const res = await fetch('/api/student/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return { authenticated: false, enrolledCourseIds: [], enrollments: [], purchases: [], quizzes: [], certificates: [] };
    }
    const json = await res.json();
    return {
      authenticated: true,
      student: json.student,
      enrolledCourseIds: Array.isArray(json.enrolledCourseIds) ? json.enrolledCourseIds : [],
      enrollments: Array.isArray(json.enrollments) ? json.enrollments : [],
      purchases: Array.isArray(json.purchases) ? json.purchases : [],
      quizzes: Array.isArray(json.quizzes) ? json.quizzes : [],
      certificates: Array.isArray(json.certificates) ? json.certificates : [],
    };
  } catch {
    return { authenticated: false, enrolledCourseIds: [], enrollments: [], purchases: [], quizzes: [], certificates: [] };
  }
}

export async function saveStudentQuizCloud(payload: {
  studentId?: string;
  courseId: string;
  lessonId?: string;
  quizId?: string;
  quizTitle?: string;
  title?: string;
  evaluationType?: 'quiz' | 'voice_simulation';
  score: number;
  maxScore?: number;
  correctCount?: number;
  totalQuestions?: number;
  answers?: Record<string, any>;
  minScoreToPass?: number;
  passed?: boolean;
}): Promise<boolean> {
  const token = getStudentToken();
  try {
    const res = await fetch('/api/student/quizzes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchStudentQuizzesCloud(courseId?: string): Promise<any[]> {
  const token = getStudentToken();
  if (!token) return [];
  try {
    const qs = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
    const res = await fetch(`/api/student/quizzes${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.quizzes) ? json.quizzes : [];
  } catch {
    return [];
  }
}

export async function saveStudentCertificateCloud(payload: {
  id?: string;
  courseId: string;
  courseTitle: string;
  studentName: string;
}): Promise<boolean> {
  const token = getStudentToken();
  try {
    const res = await fetch('/api/student/certificates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Enregistrement sécurisé côté serveur lors d'un paiement ou inscription (Marketplace, Thème Digital Pro, Live Formations)
export function recordCourseEnrollment(params: {
  courseId: string;
  courseTitle?: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  password?: string;
  amount?: number;
  paymentMethod?: string;
  transactionId?: string;
  source?: 'marketplace' | 'digital_pro' | 'live_webinar' | string;
}): StudentAccount {
  const students = getAllStudents();
  const cleanPhone = params.phoneNumber.replace(/[^0-9]/g, '');
  const cleanEmail = params.email ? params.email.trim().toLowerCase() : '';

  let student = students.find((s) => {
    const matchPhone = cleanPhone.length >= 6 && s.phoneNumber.replace(/[^0-9]/g, '').endsWith(cleanPhone);
    const matchEmail = cleanEmail && s.email && s.email.toLowerCase() === cleanEmail;
    return matchPhone || matchEmail;
  });

  if (student) {
    if (!student.enrolledCourseIds.includes(params.courseId)) {
      student.enrolledCourseIds.push(params.courseId);
    }
    if (params.fullName) student.fullName = params.fullName;
    student.lastLoginAt = Date.now();
  } else {
    student = {
      id: `std_${Date.now().toString(36)}`,
      fullName: params.fullName.trim() || 'Étudiant',
      phoneNumber: params.phoneNumber.trim(),
      email: cleanEmail,
      password: '',
      enrolledCourseIds: [params.courseId],
      createdAt: Date.now(),
      lastLoginAt: Date.now()
    };
    students.push(student);
  }

  saveStudents(students);

  // Appel serveur sécurisé POST /api/student/enroll (émet un jeton HMAC signé)
  const existingToken = getStudentToken();
  fetch('/api/student/enroll', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(existingToken ? { Authorization: `Bearer ${existingToken}` } : {}),
    },
    keepalive: true,
    body: JSON.stringify({
      courseId: params.courseId,
      courseTitle: params.courseTitle || params.courseId,
      fullName: student.fullName,
      email: student.email,
      phoneNumber: student.phoneNumber,
      amount: params.amount || 0,
      paymentMethod: params.paymentMethod || 'MOBILE_MONEY',
      transactionId: params.transactionId || '',
      source: params.source || 'marketplace',
    }),
  })
    .then((r) => r.json())
    .then((json) => {
      if (json?.success && json.token && json.student) {
        saveStudentSession(json.token, json.student, student.enrolledCourseIds);
      }
    })
    .catch(() => {});

  return student;
}

export async function renewCourseSubscription(params: {
  courseId: string;
  paymentMethod?: string;
  transactionId?: string;
  amount?: number;
}): Promise<{ success: boolean; expiresAt?: string; error?: string }> {
  const token = getStudentToken();
  if (!token) return { success: false, error: 'Session étudiant requise.' };
  try {
    const res = await fetch('/api/student/enrollments/renew', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return { success: false, error: json?.error || 'Impossible de renouveler.' };
    }
    return { success: true, expiresAt: json.expiresAt };
  } catch {
    return { success: false, error: 'Erreur de connexion au Cloud.' };
  }
}

// Redirection fluide vers le tableau de bord étudiant
export function navigateToStudentDashboard(): void {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', '/student');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function logoutStudent(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_CURRENT);
  localStorage.removeItem(STORAGE_KEY_NAME);
  localStorage.removeItem(STORAGE_KEY_EMAIL);
  localStorage.removeItem(STORAGE_KEY_PHONE);
  localStorage.removeItem('nana_student_id');
  localStorage.removeItem(STORAGE_KEY_ENROLLED);
}

// ============================================================================
// TRAÇABILITÉ ?trk=TRK-XXXX & ATTRIBUTION AUTOMATIQUE DES CONVERSIONS
// ============================================================================
const STORAGE_KEY_TRK = 'nana_course_trk_v1';
const STORAGE_KEY_TRK_SENT = 'nana_course_trk_sent_v1';

export function captureTrackingCodeFromUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const trk = (params.get('trk') || '').trim().toUpperCase();
    if (trk && trk.startsWith('TRK-')) {
      sessionStorage.setItem(STORAGE_KEY_TRK, trk);
      localStorage.setItem(STORAGE_KEY_TRK, trk);
      return trk;
    }
    return sessionStorage.getItem(STORAGE_KEY_TRK) || localStorage.getItem(STORAGE_KEY_TRK) || '';
  } catch {
    return '';
  }
}

export function getActiveTrackingCode(): string {
  return captureTrackingCodeFromUrl();
}

export async function trackDestinationConversion(amountFcfa: number, dedupKey?: string): Promise<boolean> {
  const trackingCode = getActiveTrackingCode();
  if (!trackingCode) return false;
  if (typeof window !== 'undefined' && dedupKey) {
    try {
      const sentKey = `${trackingCode}:${dedupKey}`;
      const raw = sessionStorage.getItem(STORAGE_KEY_TRK_SENT) || '';
      if (raw.split(',').includes(sentKey)) return true;
      sessionStorage.setItem(STORAGE_KEY_TRK_SENT, raw ? `${raw},${sentKey}` : sentKey);
    } catch {}
  }
  try {
    const res = await fetch('/api/lms/destinations/track-conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ trackingCode, amountFcfa: Math.max(0, Number(amountFcfa) || 0) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

if (typeof window !== 'undefined') {
  captureTrackingCodeFromUrl();
}

export function formatCoursePricingDisplay(course: any): {
  pricingModel: 'lifetime' | 'subscription' | 'live_event';
  billingInterval?: string;
  suffix: string;
  badge: string;
  detail: string;
} {
  const model = (
    course?.pricingModel ||
    course?.pricing_model ||
    course?.metadata?.pricing_model ||
    'lifetime'
  ) as 'lifetime' | 'subscription' | 'live_event';
  const interval = String(
    course?.billingInterval ||
    course?.billing_interval ||
    course?.metadata?.billing_interval ||
    'month'
  ).toLowerCase();
  const liveEndsAt = course?.liveEndsAt || course?.live_ends_at || course?.metadata?.live_ends_at || null;

  if (model === 'subscription') {
    const map: Record<string, { suffix: string; detail: string }> = {
      day: { suffix: '/jour', detail: 'Abonnement renouvelable par jour' },
      week: { suffix: '/semaine', detail: 'Abonnement renouvelable par semaine' },
      month: { suffix: '/mois', detail: 'Abonnement renouvelable par mois' },
      year: { suffix: '/an', detail: 'Abonnement renouvelable par an' },
    };
    const chosen = map[interval] || map.month;
    return {
      pricingModel: 'subscription',
      billingInterval: interval,
      suffix: chosen.suffix,
      badge: `🔄 Abonnement ${chosen.suffix}`,
      detail: chosen.detail,
    };
  }

  if (model === 'live_event') {
    const endLabel =
      liveEndsAt && !Number.isNaN(new Date(liveEndsAt).getTime())
        ? `Fin le ${new Date(liveEndsAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
        : 'Accès valable pendant la session Live';
    return {
      pricingModel: 'live_event',
      suffix: ' • Live',
      badge: '🔴 Cours Live Direct',
      detail: endLabel,
    };
  }

  return {
    pricingModel: 'lifetime',
    suffix: '',
    badge: '💎 Paiement unique • Accès à vie',
    detail: 'Accès illimité à vie',
  };
}
