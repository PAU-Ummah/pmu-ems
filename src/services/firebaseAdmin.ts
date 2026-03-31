import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Env often breaks PEM parsing: leading space after `=`, wrapped quotes, or `\n` not expanded.
 * OpenSSL then throws DECODER routines::unsupported when Admin SDK requests tokens.
 */
function normalizeFirebasePrivateKey(raw: string | undefined): string | undefined {
  if (raw === undefined || raw.trim() === '') {
    return undefined;
  }
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/\\n/g, '\n').trim();
  return key;
}

const publicProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const explicitProjectId = process.env.FIREBASE_PROJECT_ID;
const serviceAccountJsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

let firebaseClientEmail: string | undefined;
let firebasePrivateKey: string | undefined;
let jsonProjectId: string | undefined;

if (serviceAccountJsonRaw) {
  let parsed: { project_id?: string; client_email?: string; private_key?: string };
  try {
    parsed = JSON.parse(serviceAccountJsonRaw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
  } catch {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON (paste the entire downloaded service account key file as one line).'
    );
  }
  jsonProjectId = parsed.project_id?.trim();
  firebaseClientEmail = parsed.client_email?.trim();
  firebasePrivateKey = normalizeFirebasePrivateKey(parsed.private_key);
} else {
  firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  firebasePrivateKey = normalizeFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
}

const firebaseProjectId = explicitProjectId ?? publicProjectId ?? jsonProjectId;

const serviceAccountProjectMatch = firebaseClientEmail?.match(
  /^[^@]+@([^.]+)\.iam\.gserviceaccount\.com$/
);
const serviceAccountProjectId = serviceAccountProjectMatch?.[1];

if (explicitProjectId && publicProjectId && explicitProjectId !== publicProjectId) {
  throw new Error(
    `Firebase project ID mismatch: FIREBASE_PROJECT_ID is "${explicitProjectId}" but NEXT_PUBLIC_FIREBASE_PROJECT_ID is "${publicProjectId}". They must be the same Firebase project, or remove FIREBASE_PROJECT_ID so the client project ID is used.`
  );
}

if (jsonProjectId && publicProjectId && jsonProjectId !== publicProjectId) {
  throw new Error(
    `FIREBASE_SERVICE_ACCOUNT_JSON project_id "${jsonProjectId}" does not match NEXT_PUBLIC_FIREBASE_PROJECT_ID "${publicProjectId}". Use the key file from the same Firebase project as your web app.`
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
    'Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON (entire key JSON), or set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY, plus FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.'
  );
}

if (
  !firebasePrivateKey.includes('BEGIN PRIVATE KEY') ||
  !firebasePrivateKey.includes('END PRIVATE KEY')
) {
  throw new Error(
    'Private key must be full PEM from the service account JSON (private_key). Use FIREBASE_SERVICE_ACCOUNT_JSON to avoid .env escaping issues, or use \\n between lines; no space after =; avoid smart quotes.'
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
