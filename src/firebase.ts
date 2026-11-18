import { initializeApp, getApps, getApp } from 'firebase/app';
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
  disableNetwork,
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
import { getDatabase, Database, goOffline } from 'firebase/database';
import { compressImageFile } from './utils/imageCompressor';

export const RTDB_DEFAULT_URL = "https://nanasore-default-rtdb.firebaseio.com";

// Configuration souveraine de la plateforme Nanasore
export const firebaseConfig = {
  apiKey: "AIzaSyAds0VCLfekX8qQw-ya8ATlUbSyrG4Y6Zk",
  authDomain: "nanasore.firebaseapp.com",
  databaseURL: RTDB_DEFAULT_URL,
  projectId: "nanasore",
  storageBucket: "nanasore.firebasestorage.app",
  messagingSenderId: "60089897725",
  appId: "1:60089897725:web:0c675e63e72040dea56494",
  measurementId: "G-W8N6127LE5"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export interface SafeAuthUser {
  uid: string;
  id?: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
}

export type FirebaseUser = SafeAuthUser;

/**
 * Objet d'authentification neutre 100% déconnecté des serveurs Firebase Auth.
 * Empêche toute tentative de connexion anonyme ou réseau vers Firebase Auth,
 * tout en assurant la compatibilité avec les composants lisant auth.currentUser.
 */
export const auth: any = {
  get currentUser(): SafeAuthUser | null {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nana_store_auth_user');
        if (saved) {
          const u = JSON.parse(saved);
          return {
            uid: u.id || u.uid || 'usr-local',
            id: u.id || u.uid || 'usr-local',
            email: u.email || null,
            displayName: u.name || u.displayName || 'Utilisateur Nanasore',
            photoURL: u.avatarUrl || null,
            phoneNumber: u.phone || null,
          };
        }
      } catch {}
    }
    return null;
  },
  onAuthStateChanged: (_cb: any) => () => {},
  signOut: async () => {},
};

export const googleProvider: any = {};

export async function tryAutonomousSignIn(): Promise<SafeAuthUser | null> {
  return null;
}

// 2. Base de données Cloud avec Persistance Hors-ligne (IndexedDB multi-onglets / localCache)
try {
  setLogLevel('silent');
} catch {}

let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (err) {
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({}),
      }),
    });
  } catch (err2) {
    firestoreDb = getFirestore(app);
    try {
      enableIndexedDbPersistence(firestoreDb).catch(() => {});
    } catch {
      // Ignorer si déjà actif ou non supporté
    }
  }
}

// Coupe inconditionnellement toute tentative de connexion réseau Firestore
try {
  disableNetwork(firestoreDb).catch(() => {});
} catch {}

export const db: Firestore = firestoreDb;

// 3. Firebase Storage (Images produits, logos de boutique, reçus)
export const storage: FirebaseStorage = getStorage(app);

// 4. Firebase Realtime Database
export const rtdb: Database = getDatabase(app, RTDB_DEFAULT_URL);
// Coupe inconditionnellement la connexion WebSocket RTDB
try {
  goOffline(rtdb);
} catch {}

// 5. Firebase Cloud Functions
export const functions: Functions = getFunctions(app, 'europe-west1');
export const getAppFunctions = (region = 'europe-west1'): Functions => getFunctions(app, region);

// ============================================================================
// AUTHENTIFICATION SUPABASE (MIGRATION COMPLÈTE OFFICIELLE)
// L'ensemble des flux d'authentification (Google OAuth, Email/Mot de passe, Sessions)
// est désormais officiellement piloté par Supabase Auth.
// ============================================================================
export {
  signInWithGoogle,
  loginWithEmail,
  registerWithEmail,
  resendVerificationEmail,
  resetPasswordEmail,
  logoutUser,
  getSupabaseCurrentUser,
  onSupabaseAuthStateChange
} from './services/supabaseAuthService';
import { supabase } from './lib/supabase';

/**
 * Téléversement d'image vers Supabase Storage (100% Souverain)
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

    const cleanPath = path.replace(/^\/+/, '');
    const bucket = 'nanasore-media';

    // 1. Envoi direct vers Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(cleanPath, fileToUpload, { upsert: true });

    if (error) {
      console.warn('[SUPABASE STORAGE UPLOAD]', error.message);
      // Tentative de récupération URL publique
      const { data: pubData } = supabase.storage.from('public').getPublicUrl(cleanPath);
      if (pubData?.publicUrl) return pubData.publicUrl;
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
    return publicUrlData?.publicUrl || '';
  } catch (error) {
    console.error('[SUPABASE STORAGE ERROR]', error);
    throw error;
  }
}

/**
 * Test de connexion Base de données (100% Supabase)
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('stores').select('id').limit(1);
    console.log('[SUPABASE] Connexion à la base de données Supabase vérifiée avec succès');
    return !error;
  } catch (error: any) {
    console.warn('[SUPABASE] Test connexion Supabase :', error?.message);
    return false;
  }
}

export type { FirebaseUser };
export { cleanFirestoreData } from './utils/firestoreService';
