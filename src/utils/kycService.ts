import { 
  KycSubmission, 
  KycStatus, 
  KycDocumentType, 
  StoreUser,
  IdentificationChain,
  IndividualKycData,
  BusinessKycData,
  IdentificationStepStatus
} from '../types';
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { isDemoAccount, showDemoBlockedToast, DEMO_BLOCKED_MESSAGE } from './demoSecurityGuard';
import { isSuperAdminLocally } from '../services/superAdminService';

// Initial realistic demonstration KYC requests for the Super Admin
const INITIAL_DEMO_KYC: KycSubmission[] = [];

/**
 * Compresse une image vers un Data URL Base64 via Canvas
 * Réduit le poids sous 250 Ko pour éviter tout rejet réseau ou saturation Firestore
 */
export async function compressImageToBase64(file: File, maxDim = 960, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        // Fond blanc si transparence PNG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Envoie un dossier KYC pour vérification
 */
export async function submitKycRequest(data: KycSubmission): Promise<void> {
  // 1. Sauvegarde locale persistante
  try {
    localStorage.setItem(`nana_kyc_${data.storeId}`, JSON.stringify(data));
    localStorage.setItem(`nana_tenant_${data.storeId}_kyc_status`, 'pending_approval');

    const rawAll = localStorage.getItem('nana_all_kyc_requests');
    let all: KycSubmission[] = rawAll ? JSON.parse(rawAll) : [...INITIAL_DEMO_KYC];
    all = all.filter(k => k.storeId !== data.storeId);
    all.unshift(data);
    localStorage.setItem('nana_all_kyc_requests', JSON.stringify(all));

    // Mettre à jour l'utilisateur courant s'il correspond
    const savedUserRaw = localStorage.getItem('nana_store_auth_user');
    if (savedUserRaw) {
      const savedUser = JSON.parse(savedUserRaw);
      if (savedUser.storeId === data.storeId) {
        savedUser.kycStatus = 'pending_approval';
        savedUser.kycData = data;
        localStorage.setItem('nana_store_auth_user', JSON.stringify(savedUser));
      }
    }
  } catch (err) {
    console.warn('Erreur cache local KYC', err);
  }

  // 2. Notification d'événement global pour mise à jour synchrone de l'UI
  window.dispatchEvent(new CustomEvent('nana_kyc_status_changed', { 
    detail: { storeId: data.storeId, status: 'pending_approval', data } 
  }));

  // 3. Sauvegarde Firestore si en ligne
  try {
    const kycDocRef = doc(db, 'kyc_requests', data.storeId);
    await setDoc(kycDocRef, {
      ...data,
      status: 'pending_approval',
      submittedAt: new Date().toISOString()
    }, { merge: true });

    // Mettre à jour le statut du magasin
    const storeDocRef = doc(db, 'stores', data.storeId);
    await setDoc(storeDocRef, {
      kycStatus: 'pending_approval',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.info('storage KYC sync notice (fonctionne en local):', e);
  }
}

/**
 * Récupère le dossier KYC d'une boutique
 */
export async function getStoreKycRequest(storeId: string): Promise<KycSubmission | null> {
  // Exemption totale pour le Super Admin
  if (isSuperAdminLocally()) {
    return {
      id: `kyc-superadmin-${storeId}`,
      storeId,
      status: 'verified',
      documentType: 'CNIB',
      createdAt: Date.now(),
      managerFullName: 'Super Administrateur',
      whatsappPhone: ''
    } as KycSubmission;
  }

  // 1. Check local
  try {
    const local = localStorage.getItem(`nana_kyc_${storeId}`);
    if (local) return JSON.parse(local);

    const rawAll = localStorage.getItem('nana_all_kyc_requests');
    if (rawAll) {
      const all: KycSubmission[] = JSON.parse(rawAll);
      const found = all.find(k => k.storeId === storeId);
      if (found) return found;
    }
  } catch (e) {
    console.warn('Erreur lecture local KYC', e);
  }

  // 2. Fallback démo
  const demoFound = INITIAL_DEMO_KYC.find(k => k.storeId === storeId);
  if (demoFound) return demoFound;

  // 3. Check Firestore
  try {
    const snap = await getDoc(doc(db, 'kyc_requests', storeId));
    if (snap.exists()) {
      return snap.data() as KycSubmission;
    }
  } catch (e) {
    // offline
  }

  return null;
}

/**
 * Récupère toutes les demandes KYC (pour le Super Admin)
 */
export async function getAllKycRequests(): Promise<KycSubmission[]> {
  let list: KycSubmission[] = [...INITIAL_DEMO_KYC];

  try {
    const rawAll = localStorage.getItem('nana_all_kyc_requests');
    if (rawAll) {
      const localList: KycSubmission[] = JSON.parse(rawAll);
      // Merge unique
      const ids = new Set(localList.map(item => item.storeId));
      list = [...localList, ...INITIAL_DEMO_KYC.filter(d => !ids.has(d.storeId))];
    } else {
      localStorage.setItem('nana_all_kyc_requests', JSON.stringify(INITIAL_DEMO_KYC));
    }
  } catch (e) {
    console.warn('Erreur chargement local all KYC', e);
  }

  // Tenter de rafraîchir depuis Firestore
  try {
    const snap = await getDocs(collection(db, 'kyc_requests'));
    if (!snap.empty) {
      const remoteList: KycSubmission[] = [];
      snap.forEach(d => {
        remoteList.push(d.data() as KycSubmission);
      });
      if (remoteList.length > 0) {
        const ids = new Set(remoteList.map(r => r.storeId));
        list = [...remoteList, ...list.filter(l => !ids.has(l.storeId))];
        localStorage.setItem('nana_all_kyc_requests', JSON.stringify(list));
      }
    }
  } catch (e) {
    // Firestore hors ligne ou permissions
  }

  return list;
}

/**
 * Met à jour le statut KYC d'une boutique (Approbation / Rejet par le Super Admin)
 */
export async function updateKycRequestStatus(
  storeId: string, 
  status: KycStatus, 
  rejectionReason?: string,
  reviewerEmail = 'pousbila36@gmail.com'
): Promise<void> {
  const reviewedAt = new Date().toISOString();

  // 1. Mise à jour locale
  try {
    localStorage.setItem(`nana_tenant_${storeId}_kyc_status`, status);

    const localKycRaw = localStorage.getItem(`nana_kyc_${storeId}`);
    if (localKycRaw) {
      const kycData: KycSubmission = JSON.parse(localKycRaw);
      kycData.status = status;
      kycData.reviewedAt = reviewedAt;
      kycData.reviewedBy = reviewerEmail;
      if (rejectionReason) kycData.rejectionReason = rejectionReason;
      localStorage.setItem(`nana_kyc_${storeId}`, JSON.stringify(kycData));
    }

    const rawAll = localStorage.getItem('nana_all_kyc_requests');
    let all: KycSubmission[] = rawAll ? JSON.parse(rawAll) : [...INITIAL_DEMO_KYC];
    all = all.map(k => {
      if (k.storeId === storeId) {
        return {
          ...k,
          status,
          reviewedAt,
          reviewedBy: reviewerEmail,
          rejectionReason: rejectionReason || k.rejectionReason
        };
      }
      return k;
    });
    localStorage.setItem('nana_all_kyc_requests', JSON.stringify(all));

    // Mettre à jour l'utilisateur courant s'il s'agit de sa boutique
    const savedUserRaw = localStorage.getItem('nana_store_auth_user');
    if (savedUserRaw) {
      const savedUser: StoreUser = JSON.parse(savedUserRaw);
      if (savedUser.storeId === storeId) {
        savedUser.kycStatus = status;
        if (savedUser.kycData) {
          savedUser.kycData.status = status;
          savedUser.kycData.reviewedAt = reviewedAt;
          savedUser.kycData.reviewedBy = reviewerEmail;
          if (rejectionReason) savedUser.kycData.rejectionReason = rejectionReason;
        }
        localStorage.setItem('nana_store_auth_user', JSON.stringify(savedUser));
      }
    }
  } catch (err) {
    console.warn('Erreur mise à jour locale statut KYC', err);
  }

  // 2. Dispatch global event
  window.dispatchEvent(new CustomEvent('nana_kyc_status_changed', { 
    detail: { storeId, status, rejectionReason, reviewedBy: reviewerEmail } 
  }));

  // 3. Firestore
  try {
    const kycDocRef = doc(db, 'kyc_requests', storeId);
    await setDoc(kycDocRef, {
      status,
      reviewedAt,
      reviewedBy: reviewerEmail,
      rejectionReason: rejectionReason || ''
    }, { merge: true });

    const storeDocRef = doc(db, 'stores', storeId);
    await setDoc(storeDocRef, {
      kycStatus: status,
      kycRejectionReason: rejectionReason || '',
      updatedAt: reviewedAt
    }, { merge: true });
  } catch (e) {
    console.info('storage updateKyc notice:', e);
  }
}

/**
 * Chaîne d'identification séquentielle en 2 parties pour NANASORE
 * Partie 1 : Individuel (Gérant)
 * Partie 2 : Entreprise (Société)
 */
export const DEFAULT_NANASORE_CHAIN: IdentificationChain = {
  storeId: 'store-nanasore-main',
  currentStep: 2,
  activityDomain: 'Commerce Général & E-commerce',
  briefDescription: 'Boutique officielle Nanasore de vente en ligne et encaissement omnicanal.',
  activityDescription: 'Boutique officielle Nanasore de vente en ligne et encaissement omnicanal.',
  part1Individual: {
    fullName: 'Gérant Partenaire Nanasore',
    birthDate: '1990-01-01',
    nationality: 'Burkinabè',
    phone: '+226 70 00 00 00',
    email: 'contact@nanasore.com',
    activityDomain: 'Commerce Général & E-commerce',
    briefDescription: 'Boutique officielle Nanasore de vente en ligne et encaissement omnicanal.',
    idType: 'CNIB',
    idNumber: 'B12984532',
    idCardPhotoUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    selfiePhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    status: 'VALIDATED',
    submittedAt: '2024-02-10T14:30:00Z',
    validatedAt: '2024-02-10T15:00:00Z',
    validatedBy: 'Direction de la Conformité Nanasore'
  },
  part2Business: {
    companyName: 'NANASORE',
    storeName: 'NANASORE BOUTIQUE',
    legalForm: 'SARL',
    ifuNumber: '00123456B',
    rccmNumber: 'BF-OUA-01-2024-B12-0042',
    address: 'Avenue Kwamé N\'Krumah, Immeuble Nanasore',
    city: 'Ouagadougou',
    country: 'Burkina Faso',
    activityDomain: 'Commerce Général & E-commerce',
    briefDescription: 'Boutique officielle Nanasore de vente en ligne et encaissement omnicanal.',
    rccmDocPhotoUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
    ifuDocPhotoUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    status: 'VALIDATED',
    submittedAt: '2024-02-12T09:15:00Z',
    validatedAt: '2024-02-12T10:00:00Z',
    validatedBy: 'Direction de la Conformité Nanasore'
  },
  overallStatus: 'FULLY_VERIFIED',
  updatedAt: new Date().toISOString()
};

export const DEFAULT_KONKOBO_CHAIN = DEFAULT_NANASORE_CHAIN;

/**
 * Sauvegarde la chaîne d'identification (Partie 1 & Partie 2) dans localStorage et Firestore
 */
export async function saveIdentificationChain(chain: IdentificationChain): Promise<void> {
  // 1. Sauvegarde locale
  try {
    localStorage.setItem(`nana_id_chain_${chain.storeId}`, JSON.stringify(chain));
    
    // Mettre à jour le statut global du compte
    const overallKycStatus: KycStatus = 
      chain.overallStatus === 'FULLY_VERIFIED' 
        ? 'verified' 
        : chain.part1Individual.status === 'VALIDATED' 
          ? 'pending_approval' 
          : 'unverified';
    
    localStorage.setItem(`nana_tenant_${chain.storeId}_kyc_status`, overallKycStatus);
  } catch (err) {
    console.warn('Erreur cache local chaine identification', err);
  }

  // 2. Événement global pour synchronisation UI
  window.dispatchEvent(new CustomEvent('nana_id_chain_updated', {
    detail: { storeId: chain.storeId, chain }
  }));

  // 3. Firestore
  try {
    const chainDocRef = doc(db, 'identification_chains', chain.storeId);
    await setDoc(chainDocRef, {
      ...chain,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Mise à jour de la boutique correspondante
    const storeDocRef = doc(db, 'stores', chain.storeId);
    await setDoc(storeDocRef, {
      idChainStatus: chain.overallStatus,
      part1IndividualStatus: chain.part1Individual.status,
      part2BusinessStatus: chain.part2Business.status,
      kycStatus: chain.overallStatus === 'FULLY_VERIFIED' ? 'verified' : 'pending_approval',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.info('storage saveIdentificationChain notice:', e);
  }
}

/**
 * Récupère la chaîne d'identification d'une boutique
 */
export async function getIdentificationChain(storeId: string): Promise<IdentificationChain> {
  // 1. Check local storage
  try {
    const local = localStorage.getItem(`nana_id_chain_${storeId}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed?.part2Business?.companyName === 'ENTREPRISE KONKOBO POUSBILA TELECOM' || parsed?.part2Business?.companyName === 'ENTREPRISE KONKOBO POUSBILA') {
        parsed.part2Business.companyName = 'NANASORE';
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Erreur lecture local chain', e);
  }

  // 2. Check Firestore
  try {
    const snap = await getDoc(doc(db, 'identification_chains', storeId));
    if (snap.exists()) {
      const data = snap.data() as IdentificationChain;
      localStorage.setItem(`nana_id_chain_${storeId}`, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    // Offline fallback
  }

  // 3. Fallback : chaîne par défaut pré-remplie et validée pour Konkobo Telecom
  return {
    ...DEFAULT_KONKOBO_CHAIN,
    storeId
  };
}

/**
 * Soumission KYC vers /kyc_submissions pour nouveaux utilisateurs réels et entreprises
 * Bloque formellement les écritures si le rôle est 'demo'
 */
export async function submitKycSubmission(submission: KycSubmission & { userId: string }): Promise<void> {
  // 1. Vérification stricte compte démo
  const savedUserRaw = typeof window !== 'undefined' ? localStorage.getItem('nana_store_auth_user') : null;
  const currentUser: StoreUser | null = savedUserRaw ? JSON.parse(savedUserRaw) : null;
  if (isDemoAccount(currentUser) || submission.userId === 'usr-demo') {
    showDemoBlockedToast();
    throw new Error(DEMO_BLOCKED_MESSAGE);
  }

  const submissionId = submission.id || `kyc-sub-${submission.userId}-${Date.now()}`;
  const preparedData: KycSubmission = {
    ...submission,
    id: submissionId,
    status: 'pending',
    submittedAt: submission.submittedAt || new Date().toISOString()
  };

  // 2. Sauvegarde dans le cache local
  try {
    const rawSubs = localStorage.getItem('nana_kyc_submissions');
    let allSubs: KycSubmission[] = rawSubs ? JSON.parse(rawSubs) : [];
    allSubs = allSubs.filter(s => s.id !== submissionId && s.userId !== submission.userId);
    allSubs.unshift(preparedData);
    localStorage.setItem('nana_kyc_submissions', JSON.stringify(allSubs));

    // Mettre à jour l'utilisateur local si applicable
    if (currentUser && (currentUser.id === submission.userId || currentUser.uid === submission.userId)) {
      currentUser.kycStatus = 'pending';
      currentUser.kycData = preparedData;
      localStorage.setItem('nana_store_auth_user', JSON.stringify(currentUser));
    }
  } catch (err) {
    console.warn('Erreur cache local kyc_submissions', err);
  }

  // 3. Notification événementielle UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nana_kyc_submission_created', { detail: preparedData }));
  }

  // 4. Envoi vers collection Firestore sécurisée /kyc_submissions
  const subDocRef = doc(db, 'kyc_submissions', submissionId);
  await setDoc(subDocRef, preparedData, { merge: true });

  // Mise à jour de l'utilisateur dans /users/{userId} si présent
  try {
    const userDocRef = doc(db, 'users', submission.userId);
    await setDoc(userDocRef, {
      kycStatus: 'pending',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (userErr) {
    console.info('storage user kycStatus notice:', userErr);
  }
}

/**
 * Récupère les soumissions KYC en attente (/kyc_submissions où status == 'pending')
 */
export async function getPendingKycSubmissions(): Promise<KycSubmission[]> {
  let list: KycSubmission[] = [];

  // 1. Local storage fallback
  try {
    const rawSubs = localStorage.getItem('nana_kyc_submissions');
    if (rawSubs) {
      const all: KycSubmission[] = JSON.parse(rawSubs);
      list = all.filter(s => s.status === 'pending' || s.status === 'pending_approval');
    }
  } catch (e) {
    console.warn('Erreur lecture locale kyc_submissions', e);
  }

  // 2. Requête Firestore sécurisée /kyc_submissions
  try {
    const q = query(collection(db, 'kyc_submissions'), where('status', 'in', ['pending', 'pending_approval']));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const remoteList: KycSubmission[] = [];
      snap.forEach(d => {
        remoteList.push(d.data() as KycSubmission);
      });
      if (remoteList.length > 0) {
        const remoteIds = new Set(remoteList.map(r => r.id));
        list = [...remoteList, ...list.filter(l => !remoteIds.has(l.id))];
      }
    }
  } catch (e) {
    console.info('storage getPendingKycSubmissions notice (offline fallback):', e);
  }

  return list;
}

/**
 * Récupère toutes les soumissions KYC de /kyc_submissions
 */
export async function getAllKycSubmissions(): Promise<KycSubmission[]> {
  let list: KycSubmission[] = [];

  try {
    const rawSubs = localStorage.getItem('nana_kyc_submissions');
    if (rawSubs) {
      list = JSON.parse(rawSubs);
    }
  } catch (e) {
    console.warn('Erreur lecture locale all kyc_submissions', e);
  }

  try {
    const snap = await getDocs(collection(db, 'kyc_submissions'));
    if (!snap.empty) {
      const remoteList: KycSubmission[] = [];
      snap.forEach(d => {
        remoteList.push(d.data() as KycSubmission);
      });
      const remoteIds = new Set(remoteList.map(r => r.id));
      list = [...remoteList, ...list.filter(l => !remoteIds.has(l.id))];
      localStorage.setItem('nana_kyc_submissions', JSON.stringify(list));
    }
  } catch (e) {
    console.info('storage getAllKycSubmissions notice:', e);
  }

  return list;
}

/**
 * Action Firebase Super Admin : Approuver une soumission KYC
 * Met à jour /kyc_submissions/{submissionId} à 'approved'
 * Met à jour /users/{userId} à role: 'vendor' et kycStatus: 'approved'
 */
export async function approveKycSubmission(
  submissionId: string, 
  userId: string, 
  storeId?: string,
  reviewerEmail = 'pousbila36@gmail.com'
): Promise<void> {
  const reviewedAt = new Date().toISOString();

  // 1. Cache local
  try {
    const rawSubs = localStorage.getItem('nana_kyc_submissions');
    if (rawSubs) {
      const all: KycSubmission[] = JSON.parse(rawSubs);
      const updated = all.map(s => {
        if (s.id === submissionId || s.userId === userId) {
          return {
            ...s,
            status: 'approved' as KycStatus,
            reviewedAt,
            reviewedBy: reviewerEmail
          };
        }
        return s;
      });
      localStorage.setItem('nana_kyc_submissions', JSON.stringify(updated));
    }

    const savedUserRaw = localStorage.getItem('nana_store_auth_user');
    if (savedUserRaw) {
      const savedUser: StoreUser = JSON.parse(savedUserRaw);
      if (savedUser.id === userId || savedUser.uid === userId) {
        savedUser.role = 'vendor';
        savedUser.kycStatus = 'approved';
        savedUser.storeApprovalStatus = 'APPROVED';
        localStorage.setItem('nana_store_auth_user', JSON.stringify(savedUser));
      }
    }
  } catch (err) {
    console.warn('Erreur mise à jour locale approveKycSubmission', err);
  }

  // 2. Dispatch event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nana_kyc_submission_updated', {
      detail: { submissionId, userId, status: 'approved', role: 'vendor' }
    }));
  }

  // 3. Firestore : /kyc_submissions/{submissionId}
  try {
    const subDocRef = doc(db, 'kyc_submissions', submissionId);
    await setDoc(subDocRef, {
      status: 'approved',
      reviewedAt,
      reviewedBy: reviewerEmail
    }, { merge: true });
  } catch (e) {
    console.warn('storage kyc_submissions approve error:', e);
  }

  // 4. Firestore : /users/{userId} -> role: 'vendor', kycStatus: 'approved'
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      role: 'vendor',
      kycStatus: 'approved',
      storeApprovalStatus: 'APPROVED',
      updatedAt: reviewedAt
    }, { merge: true });
  } catch (e) {
    console.warn('storage user approve error:', e);
  }

  // 5. Firestore : /stores/{storeId} si présent
  if (storeId) {
    try {
      const storeDocRef = doc(db, 'stores', storeId);
      await setDoc(storeDocRef, {
        kycStatus: 'verified',
        storeApprovalStatus: 'APPROVED',
        updatedAt: reviewedAt
      }, { merge: true });
    } catch (e) {
      console.warn('storage store approve error:', e);
    }
  }
}

/**
 * Action Firebase Super Admin : Rejeter une soumission KYC
 * Met à jour /kyc_submissions/{submissionId} à 'rejected'
 * Réinitialise / nettoie les champs de documents soumis
 * Met à jour /users/{userId} à kycStatus: 'rejected'
 */
export async function rejectKycSubmission(
  submissionId: string, 
  userId: string, 
  rejectionReason = "Document non conforme ou illisible",
  storeId?: string,
  reviewerEmail = 'pousbila36@gmail.com'
): Promise<void> {
  const reviewedAt = new Date().toISOString();

  // 1. Cache local
  try {
    const rawSubs = localStorage.getItem('nana_kyc_submissions');
    if (rawSubs) {
      const all: KycSubmission[] = JSON.parse(rawSubs);
      const updated = all.map(s => {
        if (s.id === submissionId || s.userId === userId) {
          return {
            ...s,
            status: 'rejected' as KycStatus,
            rejectionReason,
            reviewedAt,
            reviewedBy: reviewerEmail,
            documentPhotoUrl: '',
            businessDocumentUrl: '',
            rccmDocPhotoUrl: '',
            ifuDocPhotoUrl: ''
          };
        }
        return s;
      });
      localStorage.setItem('nana_kyc_submissions', JSON.stringify(updated));
    }

    const savedUserRaw = localStorage.getItem('nana_store_auth_user');
    if (savedUserRaw) {
      const savedUser: StoreUser = JSON.parse(savedUserRaw);
      if (savedUser.id === userId || savedUser.uid === userId) {
        savedUser.kycStatus = 'rejected';
        if (savedUser.kycData) {
          savedUser.kycData.status = 'rejected';
          savedUser.kycData.rejectionReason = rejectionReason;
          savedUser.kycData.documentPhotoUrl = '';
        }
        localStorage.setItem('nana_store_auth_user', JSON.stringify(savedUser));
      }
    }
  } catch (err) {
    console.warn('Erreur mise à jour locale rejectKycSubmission', err);
  }

  // 2. Dispatch event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nana_kyc_submission_updated', {
      detail: { submissionId, userId, status: 'rejected', rejectionReason }
    }));
  }

  // 3. Firestore : /kyc_submissions/{submissionId} (nettoyage des pièces)
  try {
    const subDocRef = doc(db, 'kyc_submissions', submissionId);
    await setDoc(subDocRef, {
      status: 'rejected',
      rejectionReason,
      reviewedAt,
      reviewedBy: reviewerEmail,
      documentPhotoUrl: '',
      businessDocumentUrl: '',
      rccmDocPhotoUrl: '',
      ifuDocPhotoUrl: ''
    }, { merge: true });
  } catch (e) {
    console.warn('storage kyc_submissions reject error:', e);
  }

  // 4. Firestore : /users/{userId} -> kycStatus: 'rejected'
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      kycStatus: 'rejected',
      kycRejectionReason: rejectionReason,
      updatedAt: reviewedAt
    }, { merge: true });
  } catch (e) {
    console.warn('storage user reject error:', e);
  }

  // 5. Firestore : /stores/{storeId} si présent
  if (storeId) {
    try {
      const storeDocRef = doc(db, 'stores', storeId);
      await setDoc(storeDocRef, {
        kycStatus: 'rejected',
        kycRejectionReason: rejectionReason,
        updatedAt: reviewedAt
      }, { merge: true });
    } catch (e) {
      console.warn('storage store reject error:', e);
    }
  }
}

