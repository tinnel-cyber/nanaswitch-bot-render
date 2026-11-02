import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Configuration Firebase Admin pour le serveur
const serviceAccount = {
  type: process.env.FIREBASE_TYPE || 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID || 'pos-app-1759a',
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

// Initialisation de Firebase Admin (si pas déjà initialisé)
if (!admin.apps.length) {
  try {
    // Tentative avec les credentials complets
    if (serviceAccount.private_key && serviceAccount.client_email) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: serviceAccount.project_id,
      });
    } else {
      // Fallback : initialisation avec project ID seulement (pour les envs avec Application Default Credentials)
      admin.initializeApp({
        projectId: serviceAccount.project_id,
      });
    }
  } catch (error) {
    console.warn('[FIREBASE ADMIN] Initialisation avec credentials limités:', error);
    // Initialisation minimale
    admin.initializeApp({
      projectId: serviceAccount.project_id,
    });
  }
}

export const adminAuth = admin.auth();
export const adminDb = getFirestore();

/**
 * Vérifie si un utilisateur existe par email
 */
export async function getUserByEmail(email: string) {
  try {
    const userRecord = await adminAuth.getUserByEmail(email);
    return userRecord;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    throw error;
  }
}

/**
 * Met à jour le mot de passe d'un utilisateur
 */
export async function updateUserPassword(uid: string, newPassword: string) {
  return adminAuth.updateUser(uid, { password: newPassword });
}

/**
 * Crée un utilisateur
 */
export async function createUser(email: string, password: string, displayName?: string) {
  return adminAuth.createUser({
    email,
    password,
    displayName,
  });
}
