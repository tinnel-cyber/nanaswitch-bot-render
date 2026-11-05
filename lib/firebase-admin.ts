import * as adminModule from 'firebase-admin';

const admin = (adminModule as any).default || adminModule;

const projectId = process.env.FIREBASE_PROJECT_ID || 'pos-app-1759a';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n') : undefined;

if (!admin.apps.length) {
  try {
    if (clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      console.log('[FIREBASE_ADMIN] Initialisé avec les credentials de compte de service.');
    } else {
      admin.initializeApp({
        projectId,
      });
      console.warn('[FIREBASE_ADMIN] Initialisé en mode projet ID uniquement (sans clé privée complète).');
    }
  } catch (error) {
    console.warn('[FIREBASE_ADMIN_WARN] Erreur initialisation Firebase Admin:', error);
    try {
      if (!admin.apps.length) {
        admin.initializeApp({ projectId });
      }
    } catch {}
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore ? admin.firestore() : null;
export default admin;
