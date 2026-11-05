import * as adminModule from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const admin = (adminModule as any).default || adminModule;

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

if (!admin.apps.length) {
  try {
    if (serviceAccount.private_key && serviceAccount.client_email && serviceAccount.private_key.startsWith('-----BEGIN PRIVATE KEY-----')) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as any),
        projectId: serviceAccount.project_id,
      });
    } else {
      admin.initializeApp({
        projectId: serviceAccount.project_id,
      });
    }
  } catch (error) {
    console.warn('[FIREBASE ADMIN SERVER] Initialisation minimale fallback:', error);
    try {
      admin.initializeApp({
        projectId: serviceAccount.project_id,
      });
    } catch (e) {
      // Ignorer si déjà initialisé
    }
  }
}

export const adminAuth = admin.auth();
export const adminDb = getFirestore();

export async function getUserByEmail(email: string) {
  try {
    return await adminAuth.getUserByEmail(email);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    throw error;
  }
}

export async function updateUserPassword(uid: string, newPassword: string) {
  return adminAuth.updateUser(uid, { password: newPassword });
}

export async function createUser(email: string, password: string, displayName?: string) {
  return adminAuth.createUser({
    email,
    password,
    displayName,
  });
}

export async function verifyFirebaseIdToken(token: string) {
  try {
    return await adminAuth.verifyIdToken(token);
  } catch (error) {
    return null;
  }
}
