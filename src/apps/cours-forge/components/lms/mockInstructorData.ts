import { AssignmentSubmission, StudentRosterItem, InstructorKpiMetrics } from '../../../../types';

export const MOCK_INSTRUCTOR_KPIS: InstructorKpiMetrics = {
  totalActiveStudents: 842,
  averageCourseScore: 87.4,
  pendingAssignmentsCount: 3,
  gradedAssignmentsCount: 52,
  completionRatePercentage: 91.2
};

export const MOCK_STUDENT_ROSTER: StudentRosterItem[] = [
  {
    studentId: 'std-1',
    studentName: 'Ousmane Traoré',
    studentEmail: 'ousmane.traore@quincaillerie-faso.bf',
    studentAvatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    enrolledAt: Date.now() - 1000 * 60 * 60 * 24 * 8, // 8 jours
    progressPercentage: 85,
    completedLessonsCount: 6,
    totalLessonsCount: 7,
    averageQuizScore: 92,
    pendingAssignmentsCount: 1,
    status: 'ONLINE',
    lastActiveAt: Date.now() - 1000 * 60 * 5,
    certificateIssued: false,
    currentLessonTitle: '2.2 Gestion du Carnet de Dettes & Rapprochement'
  },
  {
    studentId: 'std-2',
    studentName: 'Mariam Sawadogo',
    studentEmail: 'mariam.mode@atelier-ouaga.com',
    studentAvatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    enrolledAt: Date.now() - 1000 * 60 * 60 * 24 * 20, // 20 jours
    progressPercentage: 100,
    completedLessonsCount: 7,
    totalLessonsCount: 7,
    averageQuizScore: 98,
    pendingAssignmentsCount: 0,
    status: 'ONLINE',
    lastActiveAt: Date.now() - 1000 * 60 * 12,
    certificateIssued: true,
    currentLessonTitle: 'Formation Terminée • Certificat Délivré'
  },
  {
    studentId: 'std-3',
    studentName: 'Abdoulaye Kaboré',
    studentEmail: 'a.kabore@telecom-consulting.bf',
    studentAvatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    enrolledAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    progressPercentage: 60,
    completedLessonsCount: 4,
    totalLessonsCount: 7,
    averageQuizScore: 84,
    pendingAssignmentsCount: 1,
    status: 'OFFLINE',
    lastActiveAt: Date.now() - 1000 * 60 * 60 * 3,
    certificateIssued: false,
    currentLessonTitle: '1.2 Architecture USSD et Alertes SMS'
  },
  {
    studentId: 'std-4',
    studentName: 'Fatoumata Diallo',
    studentEmail: 'fatou.boutique@abidjan-commerce.ci',
    studentAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    enrolledAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    progressPercentage: 45,
    completedLessonsCount: 3,
    totalLessonsCount: 7,
    averageQuizScore: 78,
    pendingAssignmentsCount: 1,
    status: 'IDLE',
    lastActiveAt: Date.now() - 1000 * 60 * 25,
    certificateIssued: false,
    currentLessonTitle: '3.1 Script & Stratégie Live Shopping'
  },
  {
    studentId: 'std-5',
    studentName: 'Souleymane Zongo',
    studentEmail: 's.zongo@tech-sahel.org',
    studentAvatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
    enrolledAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
    progressPercentage: 30,
    completedLessonsCount: 2,
    totalLessonsCount: 7,
    averageQuizScore: 68,
    pendingAssignmentsCount: 0,
    status: 'OFFLINE',
    lastActiveAt: Date.now() - 1000 * 60 * 60 * 28,
    certificateIssued: false,
    currentLessonTitle: 'Révision Demandée sur le Module 1'
  },
  {
    studentId: 'std-6',
    studentName: 'Aïcha Koné',
    studentEmail: 'aicha.k@bamako-digital.ml',
    studentAvatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    enrolledAt: Date.now() - 1000 * 60 * 60 * 24 * 15,
    progressPercentage: 90,
    completedLessonsCount: 6,
    totalLessonsCount: 7,
    averageQuizScore: 94,
    pendingAssignmentsCount: 0,
    status: 'ONLINE',
    lastActiveAt: Date.now() - 1000 * 60 * 2,
    certificateIssued: false,
    currentLessonTitle: 'Préparation Examen Final'
  }
];

export const MOCK_ASSIGNMENT_SUBMISSIONS: AssignmentSubmission[] = [
  {
    id: 'sub-1',
    assignmentId: 'assign-2-2',
    assignmentTitle: 'Cas Pratique : Simulation d\'un Arrêté de Caisse avec 3 Opérateurs',
    studentId: 'std-1',
    studentName: 'Ousmane Traoré',
    studentEmail: 'ousmane.traore@quincaillerie-faso.bf',
    studentAvatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    courseId: 'telecom-fintech-masterclass',
    courseTitle: 'Masterclass Télécom, Monétique Mobile & E-Commerce UEMOA',
    lessonId: 'les-2-2',
    lessonTitle: '2.2 Gestion du Carnet de Dettes, Acomptes et Rapprochement',
    fileName: 'Rapprochement_Journalier_Traore_Quincaillerie.xlsx',
    fileSize: 845000,
    fileType: 'EXCEL',
    fileUrl: '#',
    filePreviewContent: JSON.stringify({
      tableHeaders: ['Opérateur / Mode', 'Ventes Déclarées (FCFA)', 'Encaissements Reçus', 'Écart', 'Statut Rapprochement'],
      tableRows: [
        ['Espèces Caisse', '245 000 F', '245 000 F', '0 F', 'Conforme ✓'],
        ['Orange Money Burkina', '380 000 F', '380 000 F', '0 F', 'Validé ID Trans ✓'],
        ['Moov Money Flooz', '125 000 F', '125 000 F', '0 F', 'Validé ID Trans ✓'],
        ['Wave Burkina', '95 000 F', '95 000 F', '0 F', 'Validé QR Code ✓'],
        ['TOTAL CLÔTURE', '845 000 F', '845 000 F', '0 F', 'ÉQUILIBRÉ PARFAIT']
      ],
      studentNotes: "Tous les tickets de caisse imprimés sur rouleau 58mm correspondent aux soldes des applications marchandes. Aucun écart de centime constaté lors du comptage physique."
    }),
    submittedAt: Date.now() - 1000 * 60 * 45, // Il y a 45 min
    status: 'PENDING',
    maxScore: 20
  },
  {
    id: 'sub-2',
    assignmentId: 'assign-1-2',
    assignmentTitle: 'Schéma d\'Architecture Télécom & Passerelle USSD Sécurisée',
    studentId: 'std-3',
    studentName: 'Abdoulaye Kaboré',
    studentEmail: 'a.kabore@telecom-consulting.bf',
    studentAvatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    courseId: 'telecom-fintech-masterclass',
    courseTitle: 'Masterclass Télécom, Monétique Mobile & E-Commerce UEMOA',
    lessonId: 'les-1-2',
    lessonTitle: '1.2 Architecture USSD, Codes Directs (*144#) et Alertes SMS',
    fileName: 'Synthese_Securite_Passerelle_USSD.pdf',
    fileSize: 1250000,
    fileType: 'PDF',
    fileUrl: '#',
    filePreviewContent: JSON.stringify({
      title: "Rapport Technique : Sécurisation des Sessions USSD en Zone UEMOA",
      author: "Abdoulaye Kaboré • Ingénieur Télécom",
      summary: "1. Analyse des sessions USSD non persistantes (Time-to-Live 120s).\n2. Intégration de tokens SMS HMAC-SHA256 pour l'autorisation des paiements marchands.\n3. Cloisonnement réseau entre le terminal POS NaNa et le commutateur GSM de l'opérateur.",
      conclusion: "Architecture conforme aux normes de résilience de la BCEAO pour les paiements de proximité sans Internet."
    }),
    submittedAt: Date.now() - 1000 * 60 * 60 * 2, // Il y a 2h
    status: 'PENDING',
    maxScore: 20
  },
  {
    id: 'sub-3',
    assignmentId: 'assign-3-1',
    assignmentTitle: 'Script de Vente en Direct & Tunnel WhatsApp 1-Clic',
    studentId: 'std-4',
    studentName: 'Fatoumata Diallo',
    studentEmail: 'fatou.boutique@abidjan-commerce.ci',
    studentAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    courseId: 'telecom-fintech-masterclass',
    courseTitle: 'Masterclass Télécom, Monétique Mobile & E-Commerce UEMOA',
    lessonId: 'les-3-1',
    lessonTitle: '3.1 Script & Stratégie d\'un Live Shopping Captivant',
    fileName: 'Script_Live_Shopping_Lancement_Fashion.txt',
    fileSize: 42000,
    fileType: 'TEXT',
    fileUrl: '#',
    filePreviewContent: JSON.stringify({
      hook: "📢 Accroche des 3 premières secondes : 'Attention Ouaga et Abidjan ! Seulement 50 pièces disponibles avec 40% de réduction immédiate !'",
      body: "Présentation produit : Déballage en direct caméra arrière HD, démonstration de la matière textile, épinglage du produit à l'écran via le hub NaNa Live.",
      cta: "Appel à l'action WhatsApp : 'Cliquez sur Acheter en Direct sous la vidéo pour pré-remplir votre commande WhatsApp sans quitter le flux.'",
      urgencyTactic: "Compteur de stock décroissant en direct et cadeau offert aux 10 premiers payeurs Mobile Money."
    }),
    submittedAt: Date.now() - 1000 * 60 * 60 * 5, // Il y a 5h
    status: 'PENDING',
    maxScore: 20
  },
  {
    id: 'sub-4',
    assignmentId: 'assign-2-2',
    assignmentTitle: 'Cas Pratique : Simulation d\'un Arrêté de Caisse avec 3 Opérateurs',
    studentId: 'std-2',
    studentName: 'Mariam Sawadogo',
    studentEmail: 'mariam.mode@atelier-ouaga.com',
    studentAvatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    courseId: 'telecom-fintech-masterclass',
    courseTitle: 'Masterclass Télécom, Monétique Mobile & E-Commerce UEMOA',
    lessonId: 'les-2-2',
    lessonTitle: '2.2 Gestion du Carnet de Dettes, Acomptes et Rapprochement',
    fileName: 'Arrete_Caisse_Atelier_Mariam.xlsx',
    fileSize: 920000,
    fileType: 'EXCEL',
    fileUrl: '#',
    filePreviewContent: JSON.stringify({
      tableHeaders: ['Opérateur', 'Montant Attendu', 'Montant Encaissé', 'Écart'],
      tableRows: [
        ['Espèces', '550 000 F', '550 000 F', '0 F'],
        ['Orange Money', '920 000 F', '920 000 F', '0 F'],
        ['Wave', '430 000 F', '430 000 F', '0 F'],
        ['TOTAL', '1 900 000 F', '1 900 000 F', '0 F']
      ]
    }),
    submittedAt: Date.now() - 1000 * 60 * 60 * 24, // Il y a 1 jour
    status: 'GRADED',
    grade: 19.5,
    maxScore: 20,
    passed: true,
    feedback: "Excellente rigueur dans les formules de rapprochement et le classement des numéros de référence de transaction. Votre arrêté de caisse est exemplaire.",
    voiceFeedbackUrl: 'mock_audio_feedback_mariam.mp3',
    voiceDurationSeconds: 28,
    gradedAt: Date.now() - 1000 * 60 * 60 * 18,
    gradedByName: 'Ibrahim Pousbila Konkobo'
  },
  {
    id: 'sub-5',
    assignmentId: 'assign-1-2',
    assignmentTitle: 'Architecture USSD & Codes Directs (*144# / *555#)',
    studentId: 'std-5',
    studentName: 'Souleymane Zongo',
    studentEmail: 's.zongo@tech-sahel.org',
    studentAvatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
    courseId: 'telecom-fintech-masterclass',
    courseTitle: 'Masterclass Télécom, Monétique Mobile & E-Commerce UEMOA',
    lessonId: 'les-1-2',
    lessonTitle: '1.2 Architecture USSD, Codes Directs (*144#) et Alertes SMS',
    fileName: 'Brouillon_USSD_Zongo.docx',
    fileSize: 310000,
    fileType: 'TEXT',
    fileUrl: '#',
    filePreviewContent: JSON.stringify({
      notes: "Synthèse incomplète. Les numéros d'appels courts (*144*4*6#) ne détaillent pas le code PIN marchand ni la temporisation réseau."
    }),
    submittedAt: Date.now() - 1000 * 60 * 60 * 36,
    status: 'NEEDS_REVISION',
    grade: 8.5,
    maxScore: 20,
    passed: false,
    feedback: "Votre document omet le détail crucial du protocole d'échange de clés lors de l'authentification PIN. Merci de compléter la section 2 en vous référant au cours vidéo 1.2.",
    gradedAt: Date.now() - 1000 * 60 * 60 * 24,
    gradedByName: 'Ibrahim Pousbila Konkobo'
  }
];

export default MOCK_INSTRUCTOR_KPIS;
