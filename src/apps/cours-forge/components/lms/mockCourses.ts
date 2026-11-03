import { Course, StudentEnrollment } from '../../../../types';

export const DEFAULT_MASTERCLASS_COURSE: Course = {
  id: 'telecom-fintech-masterclass',
  title: 'Masterclass Télécom, Monétique Mobile & E-Commerce UEMOA',
  tagline: 'Maîtrisez les flux Mobile Money, les passerelles USSD et la vente hybride POS & Webinaire.',
  description: `Une formation professionnelle d'élite conçue par ENTREPRISE KONKOBO POUSBILA. Apprenez à déployer et rentabiliser des systèmes de vente connectés en Afrique de l'Ouest, à intégrer les paiements Orange Money, Moov Money et Wave, et à orchestrer des sessions de Live Shopping convertissant en direct.`,
  coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  teaserVideoUrl: 'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=0&controls=1',
  price: 45000,
  currency: 'FCFA',
  level: 'TOUS_NIVEAUX',
  category: 'Télécom & Fintech',
  rating: 4.95,
  enrolledCount: 842,
  totalDurationMinutes: 180,
  certificateEnabled: true,
  instructor: {
    id: 'inst-ibrahim-konkobo',
    name: 'Ibrahim Pousbila Konkobo',
    title: 'Directeur Général & Expert en Systèmes Télécom & Monétique UEMOA',
    bio: 'Pionnier des technologies télécoms et des solutions de paiement marchand à Ouagadougou. Fondateur d\'ENTREPRISE KONKOBO POUSBILA, il accompagne plus de 800 commerçants et PME dans leur transformation digitale et l\'automatisation financière.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    credentials: [
      'Diplômé Spécialiste Télécoms, Réseaux & Systèmes Connectés',
      'Expert Monétique & Passerelles de Paiement Agréé UEMOA',
      '15+ ans de déploiement d\'infrastructures de vente au Burkina Faso'
    ],
    verifiedBadge: true
  },
  learningOutcomes: [
    'Comprendre l\'architecture des réseaux télécoms et des protocoles USSD en Afrique de l\'Ouest',
    'Intégrer et automatiser les encaissements Orange Money, Moov Money et Wave sans intermédiaire',
    'Piloter un point de vente hybride synchronisé entre smartphone Android/Infinix et caisse centrale',
    'Concevoir et animer des sessions de Live Shopping sur WhatsApp et les réseaux sociaux avec commande 1-clic',
    'Sécuriser les transactions contre les fraudes et gérer les comptes séquestres avec conformité légale',
    'Obtenir un Certificat d\'Aptitude Professionnelle Officiel téléchargeable et vérifiable en ligne'
  ],
  prerequisites: [
    'Aucun prérequis technique avancé requis',
    'Un smartphone Android ou un ordinateur avec connexion Internet standard'
  ],
  testimonials: [
    {
      id: 'test-1',
      studentName: 'Ousmane Traoré',
      studentRole: 'Gérant de Quincaillerie, Bobo-Dioulasso',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      comment: 'Cette masterclass a transformé ma boutique. Grâce aux conseils de M. Konkobo, nous encaissons désormais 80% de nos ventes en Mobile Money avec zéro écart de caisse !',
      date: 'Il y a 2 semaines'
    },
    {
      id: 'test-2',
      studentName: 'Mariam Sawadogo',
      studentRole: 'Créatrice de Mode & E-commerçante, Ouagadougou',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      comment: 'Le module sur le Live Shopping m\'a permis de réaliser 450 000 FCFA de ventes lors de mon tout premier direct ! Le certificat délivré fait grande autorité.',
      date: 'Il y a 1 mois'
    },
    {
      id: 'test-3',
      studentName: 'Abdoulaye Kaboré',
      studentRole: 'Technicien Télécom & Intégrateur Freelance',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      comment: 'Clarté absolue sur les protocoles USSD et les codes de confirmation SMS des opérateurs. Une formation indispensable pour tout professionnel de l\'UEMOA.',
      date: 'Il y a 3 semaines'
    }
  ],
  modules: [
    {
      id: 'mod-1',
      title: 'Module 1 : Réseaux Télécom & Écosystème Mobile Money en UEMOA',
      description: 'Panorama des opérateurs, fonctionnement des passerelles USSD et mécanismes de sécurité.',
      order: 1,
      lessons: [
        {
          id: 'les-1-1',
          moduleId: 'mod-1',
          title: '1.1 Cartographie des Opérateurs & Enjeux de la Monétique en Afrique de l\'Ouest',
          durationMinutes: 18,
          videoUrl: 'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=0&controls=1',
          isFreePreview: true,
          isCompleted: false,
          resources: [
            {
              id: 'res-1-1',
              title: 'Guide_Operateurs_UEMOA_BCEAO.pdf',
              fileType: 'PDF',
              fileSize: '2.4 MB',
              downloadUrl: '#'
            }
          ]
        },
        {
          id: 'les-1-2',
          moduleId: 'mod-1',
          title: '1.2 Architecture USSD, Codes Directs (*144# / *555#) et Alertes SMS',
          durationMinutes: 24,
          videoUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=0&controls=1',
          isFreePreview: false,
          isCompleted: false,
          resources: [
            {
              id: 'res-1-2',
              title: 'Matrice_Syntaxe_USSD_Afrique.pdf',
              fileType: 'PDF',
              fileSize: '1.1 MB',
              downloadUrl: '#'
            }
          ]
        },
        {
          id: 'les-1-3',
          moduleId: 'mod-1',
          title: '1.3 Quiz Validant : Principes de Sécurité & Protocoles Télécom',
          durationMinutes: 12,
          isFreePreview: false,
          isCompleted: false,
          quiz: {
            id: 'quiz-mod-1',
            title: 'Évaluation : Réseaux & Monétique Mobile',
            passingScorePercentage: 70,
            questions: [
              {
                id: 'q1',
                questionText: 'Quel est le protocole de signalisation GSM principalement utilisé par les opérateurs pour délivrer des menus interactifs sans connexion Internet ?',
                options: ['Le protocole USSD (Unstructured Supplementary Service Data)', 'Le protocole HTTP REST', 'Le protocole WebSockets', 'Le protocole Bluetooth Low Energy'],
                correctOptionIndex: 0,
                explanation: 'L\'USSD fonctionne sur le canal de signalisation GSM en temps réel sans nécessiter de données mobiles (data 3G/4G).'
              },
              {
                id: 'q2',
                questionText: 'Quelle autorité régule les plafonds de transfert et les règles d\'identification KYC pour la monnaie électronique dans la zone UEMOA ?',
                options: ['La Banque Centrale des États de l\'Afrique de l\'Ouest (BCEAO)', 'La Federal Reserve américaine', 'L\'Union Européenne', 'L\'Union Postale Universelle'],
                correctOptionIndex: 0,
                explanation: 'La BCEAO fixe les directives d\'interopérabilité et les obligations réglementaires des établissements émetteurs de monnaie électronique.'
              },
              {
                id: 'q3',
                questionText: 'En cas d\'écart de réconciliation entre le SMS de l\'opérateur et le solde du compte marchand, quelle est la bonne pratique ?',
                options: ['Vérifier l\'identifiant de transaction unique (ID Transaction) sur le portail opérateur avant validation du reçu', 'Supprimer la vente immédiatement', 'Rembourser en espèces sans justificatif', 'Ignorer l\'écart'],
                correctOptionIndex: 0,
                explanation: 'L\'identifiant de transaction unique fourni par l\'opérateur fait foi juridiquement et garantit l\'irrévocabilité du paiement.'
              }
            ]
          }
        }
      ]
    },
    {
      id: 'mod-2',
      title: 'Module 2 : Caisse Connectée Hybride POS & Rapprochement Automatisé',
      description: 'Déploiement pratique d\'un système de caisse moderne, gestion des dettes et synchronisation.',
      order: 2,
      lessons: [
        {
          id: 'les-2-1',
          moduleId: 'mod-2',
          title: '2.1 Déploiement de NaNa POS : Caisse Tactile, Scanner Code-barres & Reçus Bluetooth',
          durationMinutes: 30,
          videoUrl: 'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=0&controls=1',
          isFreePreview: true,
          isCompleted: false,
          resources: [
            {
              id: 'res-2-1',
              title: 'Mode_Emploi_Caisse_Imprimante_58mm.pdf',
              fileType: 'PDF',
              fileSize: '3.1 MB',
              downloadUrl: '#'
            }
          ]
        },
        {
          id: 'les-2-2',
          moduleId: 'mod-2',
          title: '2.2 Gestion du Carnet de Dettes, Acomptes et Rapprochement de Caisse Fin de Journée',
          durationMinutes: 25,
          videoUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=0&controls=1',
          isFreePreview: false,
          isCompleted: false,
          resources: [
            {
              id: 'res-2-2',
              title: 'Fiche_Rapprochement_Journalier.xlsx',
              fileType: 'SHEET',
              fileSize: '850 KB',
              downloadUrl: '#'
            }
          ],
          assignment: {
            id: 'assign-2-2',
            title: 'Cas Pratique : Simulation d\'un Arrêté de Caisse avec 3 Opérateurs',
            description: 'Téléchargez la fiche modèle, appliquez les formules de clôture pour une journée type (espèces + Orange Money + Wave) et soumettez votre fichier complété.',
            instructions: 'Remplissez le tableau avec les données de l\'exercice présentées dans la vidéo 2.2. Enregistrez au format PDF ou Excel puis déposez votre document dans la zone ci-dessous.',
            dueDate: 'Dans 7 jours',
            maxScore: 20,
            allowedFileTypes: ['.pdf', '.xlsx', '.xls', '.docx', '.png', '.jpg']
          }
        }
      ]
    },
    {
      id: 'mod-3',
      title: 'Module 3 : Live Shopping, Vente Vidéo & Certification Professionnelle',
      description: 'Techniques de diffusion haute fidélité, conversion de l\'audience et délivrance du certificat.',
      order: 3,
      lessons: [
        {
          id: 'les-3-1',
          moduleId: 'mod-3',
          title: '3.1 Script & Stratégie d\'un Live Shopping Captivant : De la Découverte au Panier 1-Clic',
          durationMinutes: 28,
          videoUrl: 'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=0&controls=1',
          isFreePreview: false,
          isCompleted: false,
          resources: [
            {
              id: 'res-3-1',
              title: 'Script_Live_Shopping_Haute_Conversion.pdf',
              fileType: 'PDF',
              fileSize: '1.8 MB',
              downloadUrl: '#'
            }
          ]
        },
        {
          id: 'les-3-2',
          moduleId: 'mod-3',
          title: '3.2 Examen Final Académique & Obtention du Certificat Officiel',
          durationMinutes: 20,
          isFreePreview: false,
          isCompleted: false,
          quiz: {
            id: 'quiz-final',
            title: 'Grand Examen Final de Certification UEMOA',
            passingScorePercentage: 80,
            questions: [
              {
                id: 'qf-1',
                questionText: 'Quel est l\'avantage clé de proposer un bac à sable anti-redirection (sandbox) sur les flux vidéos externes lors d\'un Live Shopping ?',
                options: [
                  'Empêcher le visiteur d\'être redirigé vers l\'application externe et le garder dans la boutique pour finaliser son achat',
                  'Augmenter la vitesse du processeur du smartphone',
                  'Désactiver la caméra de l\'animateur',
                  'Bloquer les paiements par carte bancaire'
                ],
                correctOptionIndex: 0,
                explanation: 'La directive sandbox sans allow-top-navigation conserve le prospect sur la fiche produit de la boutique.'
              },
              {
                id: 'qf-2',
                questionText: 'Pourquoi est-il primordial de dissocier l\'identification individuelle (Gérant) de l\'identification entreprise (Société) ?',
                options: [
                  'Pour répondre aux exigences réglementaires de la BCEAO et débloquer les plafonds illimités',
                  'C\'est une démarche purement décorative',
                  'Pour supprimer l\'historique des ventes',
                  'Pour refuser les clients Mobile Money'
                ],
                correctOptionIndex: 0,
                explanation: 'La distinction juridique entre personne physique et personne morale conditionne l\'octroi des agréments marchands de plein droit.'
              },
              {
                id: 'qf-3',
                questionText: 'Comment fonctionne la commande 1-clic WhatsApp intégrée sous le lecteur vidéo lors d\'un direct ?',
                options: [
                  'Elle génère un message structuré pré-rempli avec produit, prix et référence pour un traitement instantané par le vendeur',
                  'Elle envoie un mail automatique sans confirmation',
                  'Elle oblige le client à retaper toutes ses coordonnées manuellement',
                  'Elle bloque le panier d\'achat'
                ],
                correctOptionIndex: 0,
                explanation: 'Le pré-remplissage WhatsApp réduit la friction d\'achat à moins de 5 secondes pour le client mobile.'
              },
              {
                id: 'qf-4',
                questionText: 'Quel format d\'impression thermique est le plus universel et économique pour les tickets de caisse marchands en boutique ?',
                options: ['Format thermique 58mm / 80mm', 'Format affiche A1', 'Format papier millimétré', 'Format carte de visite rigide'],
                correctOptionIndex: 0,
                explanation: 'Les rouleaux thermiques 58mm et 80mm sont les standards du commerce physique pour leur robustesse et faible coût.'
              }
            ]
          }
        },
        {
          id: 'les-3-live-zoom',
          moduleId: 'mod-3',
          title: '3.3 Masterclass Directe Zoom : Stratégie & Coaching Interactif M. Konkobo',
          durationMinutes: 60,
          isFreePreview: false,
          isCompleted: false,
          liveSessionConfig: {
            provider: 'ZOOM',
            scheduledAt: new Date(Date.now() + 24 * 3600000).toISOString(),
            durationMinutes: 60,
            meetingUrl: 'https://zoom.us/j/84930219942?pwd=telecomuemoa2026',
            meetingId: '849 3021 9942',
            passcode: '202688',
            hostEmail: 'ibrahim.konkobo@telecom-pousbila.bf',
            isAutoRecordEnabled: true,
            autoMarkCompletedOnEnd: true
          }
        },
        {
          id: 'les-3-live-jitsi',
          moduleId: 'mod-3',
          title: '3.4 Atelier Pratique Jitsi Meet : Démonstration POS en Direct (Iframe Native)',
          durationMinutes: 45,
          isFreePreview: false,
          isCompleted: false,
          liveSessionConfig: {
            provider: 'JITSI',
            scheduledAt: new Date(Date.now() + 48 * 3600000).toISOString(),
            durationMinutes: 45,
            jitsiServerDomain: 'meet.jit.si',
            jitsiRoomName: 'nana-academy-pos-atelier-demo',
            meetingUrl: 'https://meet.jit.si/nana-academy-pos-atelier-demo',
            meetingId: 'nana-academy-pos-atelier-demo',
            passcode: '554433',
            isAutoRecordEnabled: false,
            autoMarkCompletedOnEnd: true
          }
        }
      ]
    }
  ]
};

export function getMockCourseById(courseId: string): Course {
  if (courseId === DEFAULT_MASTERCLASS_COURSE.id || !courseId) {
    return DEFAULT_MASTERCLASS_COURSE;
  }
  return {
    ...DEFAULT_MASTERCLASS_COURSE,
    id: courseId,
    title: `Formation Spécialisée : ${courseId.replace(/-/g, ' ').toUpperCase()}`
  };
}

export function getInitialStudentEnrollment(courseId: string, studentName: string = 'Étudiant NaNa'): StudentEnrollment {
  return {
    id: `enroll-${Date.now()}`,
    studentId: 'student-demo',
    studentName,
    studentEmail: 'etudiant@nanapos.app',
    courseId,
    enrolledAt: Date.now() - 1000 * 60 * 60 * 24 * 3, // Inscrit il y a 3 jours
    completedLessonIds: ['les-1-1'], // 1 leçon déjà validée par défaut
    quizScores: {
      'quiz-mod-1': 100
    },
    assignmentSubmissions: {},
    certificateIssued: false
  };
}

export default DEFAULT_MASTERCLASS_COURSE;
