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

// Récupère les IDs des cours souscrits
export function getEnrolledCourseIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENROLLED);
    return raw ? JSON.parse(raw) : ['telecom-fintech-masterclass', 'course-pos-resilience-offline'];
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

// Enregistrement lors d'un paiement de cours
export function recordCourseEnrollment(params: {
  courseId: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  password?: string;
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
    if (params.password) student.password = params.password;
    if (params.fullName) student.fullName = params.fullName;
    student.lastLoginAt = Date.now();
  } else {
    student = {
      id: `student-${Date.now().toString(36)}`,
      fullName: params.fullName.trim() || 'Élève Académie',
      phoneNumber: params.phoneNumber.trim(),
      email: cleanEmail,
      password: params.password || '123456', // Mot de passe par défaut si non fourni
      enrolledCourseIds: [params.courseId],
      createdAt: Date.now(),
      lastLoginAt: Date.now()
    };
    students.push(student);
  }

  saveStudents(students);

  // Mettre à jour la liste des cours inscrits
  const enrolledList = getEnrolledCourseIds();
  if (!enrolledList.includes(params.courseId)) {
    enrolledList.push(params.courseId);
    try {
      localStorage.setItem(STORAGE_KEY_ENROLLED, JSON.stringify(enrolledList));
    } catch (e) {}
  }

  // Activer la session
  localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(student));
  localStorage.setItem(STORAGE_KEY_NAME, student.fullName);
  localStorage.setItem(STORAGE_KEY_PHONE, student.phoneNumber);
  if (student.email) localStorage.setItem(STORAGE_KEY_EMAIL, student.email);

  return student;
}

// Redirection fluide vers le tableau de bord étudiant
export function navigateToStudentDashboard(): void {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', '/student');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function logoutStudent(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_CURRENT);
  localStorage.removeItem(STORAGE_KEY_NAME);
  localStorage.removeItem(STORAGE_KEY_EMAIL);
  localStorage.removeItem(STORAGE_KEY_PHONE);
}
