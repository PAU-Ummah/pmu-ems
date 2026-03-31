import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const publicProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const explicitProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseProjectId = explicitProjectId ?? publicProjectId;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const serviceAccountProjectMatch = firebaseClientEmail?.match(
  /^[^@]+@([^.]+)\.iam\.gserviceaccount\.com$/
);
const serviceAccountProjectId = serviceAccountProjectMatch?.[1];

if (explicitProjectId && publicProjectId && explicitProjectId !== publicProjectId) {
  throw new Error(
    `Firebase project ID mismatch: FIREBASE_PROJECT_ID is "${explicitProjectId}" but NEXT_PUBLIC_FIREBASE_PROJECT_ID is "${publicProjectId}". They must be the same Firebase project, or remove FIREBASE_PROJECT_ID so the client project ID is used.`
  );
}

if (publicProjectId && serviceAccountProjectId && serviceAccountProjectId !== publicProjectId) {
  throw new Error(
    `Firebase Admin credentials are for project "${serviceAccountProjectId}" but the web app uses NEXT_PUBLIC_FIREBASE_PROJECT_ID="${publicProjectId}". Download a service account key from the same Firebase project as your app (Firebase Console → Project settings → Service accounts).`
  );
}

if (firebaseProjectId && serviceAccountProjectId && serviceAccountProjectId !== firebaseProjectId) {
  throw new Error(
    `FIREBASE_CLIENT_EMAIL belongs to project "${serviceAccountProjectId}" but FIREBASE_PROJECT_ID / NEXT_PUBLIC_FIREBASE_PROJECT_ID is "${firebaseProjectId}". Use a key from one project only.`
  );
}

if (!firebaseProjectId || !firebaseClientEmail || !firebasePrivateKey) {
  throw new Error(
    'Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID (or rely on NEXT_PUBLIC_FIREBASE_PROJECT_ID), FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
  );
}

const firebaseAdminApp =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: firebaseProjectId,
      clientEmail: firebaseClientEmail,
      privateKey: firebasePrivateKey,
    }),
  });

export const adminAuth = getAuth(firebaseAdminApp);
export const adminDb = getFirestore(firebaseAdminApp);
