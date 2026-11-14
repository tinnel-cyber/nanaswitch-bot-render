import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ResumeData } from '../types';

export const DEFAULT_RESUME_DATA: ResumeData = {
  personalInfo: {
    fullName: 'Amadou Diallo',
    title: 'Responsable d\'Exploitation Commerciale & Consultant Juridique',
    email: 'amadou.diallo@email.com',
    phone: '',
    location: 'Bobo-Dioulasso, Secteur 16 • Burkina Faso',
    linkedin: 'linkedin.com/in/amadou-diallo',
    portfolio: 'diallo-consulting.pro',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
    bio: 'Professionnel rigoureux avec plus de 6 ans d\'expérience dans le management des opérations, la conduite d\'enquêtes de terrain et le conseil juridique. Reconnu pour son sens de l\'organisation et l\'optimisation de la rentabilité commerciale.',
  },
  experiences: [
    {
      id: 'exp-1',
      title: 'Chargé de Projet & Enquêteur de Terrain (Appui Local)',
      company: 'Mairie & Services Municipaux',
      location: 'Région de la Boucle du Mouhoun',
      startDate: '2022',
      endDate: 'Présent',
      isCurrent: true,
      achievements: [
        'Conduite d\'enquêtes de terrain approfondies auprès des ménages et des commerçants de la commune.',
        'Collecte et structuration de données socio-économiques via terminaux numériques pour le compte des services municipaux.',
        'Supervision d\'une équipe de 8 agents enquêteurs avec un taux de conformité de 99.4% des fiches d\'enquête.',
      ],
    },
    {
      id: 'exp-2',
      title: 'Assistant de Recensement Agricole & Topographie (Bénévole)',
      company: 'Projet National de Développement Agricole',
      location: 'Province du Passoré',
      startDate: '2019',
      endDate: '2021',
      isCurrent: false,
      achievements: [
        'Réalisation d\'enquêtes topographiques, délimitation de sols cultivables et cartographie de parcelles rurales.',
        'Appui technique à l\'identification des exploitants et enregistrement exhaustif des groupements villageois.',
        'Analyse de conformité contractuelle et médiation amiable lors des délimitations foncières.',
      ],
    },
    {
      id: 'exp-3',
      title: 'Formateur & Développeur Indépendant',
      company: 'Cabinet Solutions Numériques & Gestion',
      location: 'Ouagadougou & Bobo',
      startDate: '2017',
      endDate: '2019',
      isCurrent: false,
      achievements: [
        'Déploiement de solutions logicielles de gestion commerciale et formation pratique des équipes aux outils numériques.',
        'Paramétrage avancé et déploiement de masques de saisie sur le logiciel d\'enquête CAPI Survey Solutions.',
        'Accompagnement de plus de 45 PME et commerces dans la transition numérique et l\'automatisation de caisse.',
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'Certificat en Conseiller et Consultant Juridique International',
      school: 'Institut Supérieur de Droit International & Affaires',
      year: '2026',
      description: 'Expertise en analyse contractuelle, arbitrage commercial et conformité des données personnelles.',
    },
    {
      id: 'edu-2',
      degree: 'Licence en Droit des Affaires & Fiscalité',
      school: 'Université Publique UFR Sciences Juridiques',
      year: '2016 - 2022',
      description: 'Droit commercial OHADA, droit des contrats et gestion des contentieux économiques.',
    },
    {
      id: 'edu-3',
      degree: 'Baccalauréat Série G2 (Comptabilité & Gestion)',
      school: 'Lycée Provincial',
      year: '2015',
    },
    {
      id: 'edu-4',
      degree: 'BEPC (Brevet d\'Études du Premier Cycle)',
      school: 'Lycée Départemental',
      year: '2011',
    },
    {
      id: 'edu-5',
      degree: 'CEP (Certificat d\'Études Primaires)',
      school: 'École Primaire Publique',
      year: '2006',
    },
  ],
  skills: [
    'Gestion du temps & Planification',
    'Capacités d\'organisation & Rigueur',
    'Communication, conseil & Gestion de groupe',
    'Système CAPI (Survey Solutions & Kobo)',
    'Analyse contractuelle & Droit des Affaires',
    'Logiciels de gestion commerciale & Suite Office',
  ],
  softSkills: [
    'Formateur et pédagogue de terrain',
    'Diplomatie lors des entretiens de ménages',
    'Endurance physique & Mobilité',
    'Sens élevé de la confidentialité et du secret statistique',
  ],
  competencesDetaillees: [
    'Collecte de données : Connaissances approfondies du système CAPI (Survey Solutions).',
    'Technique : Recensement de zones cultivables, levés topographiques et cartographie de base.',
    'Juridique : Analyse contractuelle, conseil juridique international et respect absolu du secret statistique.',
    'Informatique : Logiciels de comptabilité, gestion commerciale et suite bureautique Office.',
    'Compétences générales : Formateur d\'équipes, diplomatie lors des entretiens et haute endurance physique.',
  ],
  languages: [
    { name: 'Français', level: 'Langue officielle (Courant)', percent: 95 },
    { name: 'Morée', level: 'Langue nationale (Maternelle)', percent: 90 },
    { name: 'Dioula', level: 'Langue véhiculaire (Très bon)', percent: 80 },
    { name: 'Anglais', level: 'Professionnel opérationnel', percent: 60 },
  ],
  interests: [
    'Lecture & Veille juridique',
    'Randonnée & Expéditions nature',
    'Football & Dynamique d\'équipe',
    'Conseil, famille & Entraide',
    'Connaissance approfondie de plusieurs zones du Burkina et sous-région',
  ],
  templateId: 'starter',
  accentColor: '#0e2b4b', // Bleu nuit profond identique au modèle
  updatedAt: Date.now(),
};

const RESUME_STORAGE_KEY_PREFIX = 'nana_user_resume_';

/**
 * Enregistre le CV de l'utilisateur
 */
export async function saveResumeData(userId: string, resume: ResumeData): Promise<void> {
  const updated: ResumeData = {
    ...resume,
    updatedAt: Date.now(),
  };

  // 1. Sauvegarde locale
  try {
    localStorage.setItem(`${RESUME_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(updated));
  } catch (err) {
    console.warn('Erreur sauvegarde locale CV :', err);
  }

  // 2. Sauvegarde Firestore
  try {
    const docRef = doc(db, 'merchants', userId, 'resume', 'current');
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.warn('Erreur storage saveResumeData :', err);
  }
}

/**
 * Charge le CV de l'utilisateur avec fallback sur les données d'exemple
 */
export async function loadResumeData(userId: string): Promise<ResumeData> {
  // 1. Essai cache local
  try {
    const cached = localStorage.getItem(`${RESUME_STORAGE_KEY_PREFIX}${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignorer
  }

  // 2. Essai Firestore
  try {
    const docRef = doc(db, 'merchants', userId, 'resume', 'current');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as ResumeData;
      try {
        localStorage.setItem(`${RESUME_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(data));
      } catch {
        // Ignorer
      }
      return data;
    }
  } catch (err) {
    console.warn('Erreur lecture storage CV :', err);
  }

  return { ...DEFAULT_RESUME_DATA, updatedAt: Date.now() };
}

/**
 * Appel API pour optimiser les réalisations d'expériences via Gemini AI
 */
export async function enhanceExperienceBullets(
  title: string,
  bulletText: string
): Promise<string> {
  try {
    const res = await fetch('/api/ai/resume-enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, bulletText }),
    });

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      if (data.enhancedText) {
        return data.enhancedText;
      }
    }
  } catch (err) {
    console.warn('Erreur appel /api/ai/resume-enhance :', err);
  }

  // Fallback heuristique instantané
  const lines = bulletText
    .split('\n')
    .map(l => l.replace(/^[•\-\*]\s*/, '').trim())
    .filter(Boolean);

  if (lines.length === 0) return bulletText;

  return lines
    .map(line => {
      const capped = line.charAt(0).toUpperCase() + line.slice(1);
      return `• Pilotage et réalisation avec succès : ${capped}, avec garantie de rigueur et d'efficacité opérationnelle.`;
    })
    .join('\n');
}

/**
 * Appel API pour générer un message de motivation de candidature via Gemini AI
 */
export async function generateCoverLetter(
  candidateName: string,
  title: string,
  skills: string[],
  targetCompany?: string
): Promise<string> {
  try {
    const res = await fetch('/api/ai/cover-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateName, title, skills, targetCompany }),
    });

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      if (data.letter) {
        return data.letter;
      }
    }
  } catch (err) {
    console.warn('Erreur appel /api/ai/cover-letter :', err);
  }

  const skillsStr = skills.slice(0, 5).join(', ');
  return `Madame, Monsieur,

Je me permets de vous contacter afin de vous soumettre ma candidature au poste de ${title}${targetCompany ? ` au sein de ${targetCompany}` : ''}.

Fort d'un parcours rigoureux et axé sur les résultats, je mets à votre service mes compétences en ${skillsStr || 'gestion opérationnelle, organisation et coordination'}. Mon objectif est de m'investir pleinement pour répondre à vos exigences de performance et contribuer activement au développement de vos activités.

Je reste à votre entière disposition pour tout échange ou entretien à votre convenance.

Bien cordialement,
${candidateName || 'Le Candidat'}`;
}
