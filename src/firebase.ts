import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  persistentSingleTabManager,
  enableIndexedDbPersistence,
  getFirestore, 
  Firestore,
  doc,
  getDocFromServer,
  setLogLevel
} from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';
import { 
  getStorage, 
  FirebaseStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { getDatabase, Database } from 'firebase/database';
import { compressImageFile } from './utils/imageCompressor';

export const RTDB_DEFAULT_URL = "https://pos-app-1759a-default-rtdb.firebaseio.com";

// Configuration Firebase avec les clés réelles du projet Nana POS Pro (pos-app-1759a)
export const firebaseConfig = {
  apiKey: "AIzaSyAds0VCLfekX8qQw-ya8ATlUbSyrG4Y6Zk",
  authDomain: "pos-app-1759a.firebaseapp.com",
  databaseURL: RTDB_DEFAULT_URL,
  projectId: "pos-app-1759a",
  storageBucket: "pos-app-1759a.firebasestorage.app",
  messagingSenderId: "60089897725",
  appId: "1:60089897725:web:0c675e63e72040dea56494",
  measurementId: "G-W8N6127LE5"
};

// Initialisation unique de l'application Firebase
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 1. Authentification Firebase & Fournisseur Google
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Configuration de la persistance locale sans blocage
if (typeof window !== 'undefined') {
  try {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.info('[FIREBASE AUTH] Persistance locale standard fallback :', err?.message || err);
    });
  } catch (e) {
    console.info('[FIREBASE AUTH] Initialisation persistance non-bloquante :', e);
  }

  // Interception globale des promesses rejetées pour auth/admin-restricted-operation
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = reason?.message || String(reason || '');
    const code = reason?.code || '';
    if (
      code === 'auth/admin-restricted-operation' ||
      code === 'auth/operation-not-allowed' ||
      msg.includes('admin-restricted-operation') ||
      msg.includes('ADMIN_ONLY_OPERATION')
    ) {
      event.preventDefault(); // Empêche l'erreur de faire crasher React ou le GlobalErrorBoundary
      try {
        sessionStorage.setItem('nana_anon_auth_disabled', 'true');
      } catch {}
      console.info('[FIREBASE AUTH] Authentification anonyme non requise / restreinte. Mode local autonome actif.');
    }
  });
}

// Fonction sécurisée pour la connexion autonome sans crash si l'opération est restreinte
let isAutonomousAttempted = false;
export async function tryAutonomousSignIn(): Promise<FirebaseUser | null> {
  if (typeof window === 'undefined') return null;
  if (auth.currentUser) return auth.currentUser;

  try {
    if (sessionStorage.getItem('nana_anon_auth_disabled') === 'true') {
      return null;
    }
  } catch {}

  if (isAutonomousAttempted) return null;
  isAutonomousAttempted = true;

  try {
    const userCred = await signInAnonymously(auth);
    return userCred.user;
  } catch (err: any) {
    const code = err?.code || '';
    const msg = err?.message || '';
    if (
      code === 'auth/admin-restricted-operation' ||
      code === 'auth/operation-not-allowed' ||
      code === 'auth/configuration-not-found' ||
      msg.includes('admin-restricted-operation') ||
      msg.includes('ADMIN_ONLY_OPERATION')
    ) {
      try {
        sessionStorage.setItem('nana_anon_auth_disabled', 'true');
      } catch {}
      console.info('[FIREBASE AUTH] Mode local / persistance autonome actif (Auth anonyme désactivée par le projet).');
    } else {
      console.info('[FIREBASE AUTH] Mode local autonome actif :', msg || err);
    }
    return null;
  }
}

// Initialisation transparente : vérification sécurisée sans répétition
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Détection & validation automatique des droits Super Admin (/admins/{uid})
      try {
        const { verifySuperAdminPrivileges } = await import('./services/superAdminService');
        await verifySuperAdminPrivileges(user);
      } catch (err) {
        console.warn('[FIREBASE AUTH] Vérification Super Admin /admins/ non-bloquante :', err);
      }
    } else {
      try {
        if (sessionStorage.getItem('nana_anon_auth_disabled') !== 'true') {
          tryAutonomousSignIn().catch(() => {});
        }
      } catch {}
    }
  });
}

// 2. Base de données Cloud Firestore avec Persistance Hors-ligne (IndexedDB multi-onglets / localCache)
// Filtrer les avertissements de routine de compétition de lease entre onglets
try {
  setLogLevel('error');
} catch {}

let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
  console.log('[FIRESTORE] Cache hors-ligne persistant (IndexedDB multi-onglets) initialisé.');
} catch (err) {
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({}),
      }),
    });
    console.log('[FIRESTORE] Cache hors-ligne persistant (IndexedDB mono-onglet) initialisé.');
  } catch (err2) {
    console.warn('[FIRESTORE] Fallback vers instance existante Firestore :', err2);
    firestoreDb = getFirestore(app);
    try {
      enableIndexedDbPersistence(firestoreDb).catch(() => {});
    } catch {
      // Ignorer si déjà actif ou non supporté
    }
  }
}
export const db: Firestore = firestoreDb;

// 3. Firebase Storage (Images produits, logos de boutique, reçus)
export const storage: FirebaseStorage = getStorage(app);

// 4. Firebase Realtime Database (Passerelle SMS MacroDroid /sms_recus)
export const rtdb: Database = getDatabase(app, RTDB_DEFAULT_URL);

// 5. Firebase Cloud Functions (Live WebRTC, paiements, etc.)
export const functions: Functions = getFunctions(app, 'europe-west1');
export const getAppFunctions = (region = 'europe-west1'): Functions => getFunctions(app, region);

/**
 * Fonction d'authentification Google avec popup sécurisée
 */
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn('[FIREBASE AUTH] Connexion Google via popup :', error?.message || error);
    throw error;
  }
}

/**
 * Connexion avec Email et Mot de passe Firebase Auth
 */
export async function loginWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

/**
 * Création de compte avec Email et Mot de passe Firebase Auth
 */
export async function registerWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  // Envoi systématique du lien de validation email
  try {
    await sendEmailVerification(cred.user);
    console.log('[FIREBASE AUTH] Email de vérification expédié à', cred.user.email);
  } catch (err) {
    console.warn('[FIREBASE AUTH] Impossible d\'envoyer le mail de vérification :', err);
  }
  return cred.user;
}

/**
 * Renvoyer l'email de confirmation Firebase Auth
 */
export async function resendVerificationEmail(): Promise<boolean> {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
    return true;
  }
  return false;
}

/**
 * Réinitialisation du mot de passe par email via Firebase Auth
 */
export async function resetPasswordEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Déconnexion Firebase Auth
 */
export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Téléversement d'image vers Firebase Storage
 * @param file Fichier image à uploader
 * @param path Chemin cible dans le bucket (ex: 'stores/logo.png', 'products/p1.jpg')
 * @returns URL de téléchargement publique sécurisée
 */
export async function uploadMediaToStorage(file: File, path: string): Promise<string> {
  try {
    let fileToUpload: File = file;

    // Règle stricte : Compression automatique Canvas si c'est une image (max 1024px, WebP/JPEG, < 200 Ko)
    if (file.type && file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageFile(file, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.78,
          maxSizeBytes: 200 * 1024,
          fileName: file.name
        });
        fileToUpload = compressed.file;
        console.log(`[STORAGE COMPRESSION] Fichier compressé de ${Math.round(file.size / 1024)} Ko à ${Math.round(compressed.sizeBytes / 1024)} Ko`);
      } catch (compErr) {
        console.warn('[STORAGE COMPRESSION] Repli sur fichier d\'origine :', compErr);
      }
    }

    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, fileToUpload);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error('[FIREBASE STORAGE] Erreur upload média :', error);
    throw error;
  }
}

/**
 * Test de connexion Firestore
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[FIRESTORE] Connexion au serveur pos-app-1759a établie avec succès');
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('[FIRESTORE] Mode hors-ligne actif (cache local)');
    } else {
      console.info('[FIRESTORE] Service Firestore prêt sur pos-app-1759a');
    }
    return false;
  }
}

export type { FirebaseUser };
export { cleanFirestoreData } from './utils/firestoreService';
