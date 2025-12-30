import admin from 'firebase-admin';
import { env } from './env';
import { logger } from '@/utils/logger';

let firebaseApp: admin.app.App | null = null;

const decodeServiceAccount = (): admin.ServiceAccount => {
  try {
    const b64 = env.FIREBASE_SERVICE_ACCOUNT_B64;
    const json = Buffer.from(b64, 'base64').toString('utf-8');
    return JSON.parse(json) as admin.ServiceAccount;
  } catch (error) {
    logger.error('Failed to decode Firebase service account', { error });
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_B64 environment variable');
  }
};

export const initializeFirebase = (): admin.app.App => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    const serviceAccount = decodeServiceAccount();

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });

    logger.info('Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', { error });
    throw error;
  }
};

export const getFirestore = (): admin.firestore.Firestore => {
  initializeFirebase();
  if (!firebaseApp) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first');
  }
  return admin.firestore();
};

export const getAuth = (): admin.auth.Auth => {
  initializeFirebase();
  if (!firebaseApp) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first');
  }
  return admin.auth();
};

export const getStorage = (): admin.storage.Storage => {
  initializeFirebase();
  if (!firebaseApp) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first');
  }
  return admin.storage();
};
