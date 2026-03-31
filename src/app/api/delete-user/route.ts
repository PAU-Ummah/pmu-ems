import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/services/firebaseAdmin';
import { User } from '@/services/types';

const allowedRoles: User['role'][] = ['it', 'admin'];

const getBearerToken = (authorizationHeader: string | null) => {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.substring('Bearer '.length).trim();
};

function isIdTokenAudienceMismatch(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('"aud"') || message.toLowerCase().includes('audience');
}

function isAdminCredentialDecodeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes('decoder routines') ||
    lower.includes('getting metadata from plugin') ||
    lower.includes('decoding private key')
  );
}

function credentialDecodeErrorResponse() {
  return NextResponse.json(
    {
      error:
        'Firebase Admin could not read the service account private key. Remove any space after = in .env, use \\n for PEM line breaks, or set FIREBASE_SERVICE_ACCOUNT_JSON to the full downloaded JSON (one line). Then restart the server.',
    },
    { status: 500 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const idToken = getBearerToken(request.headers.get('authorization'));
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized request.' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (verifyError: unknown) {
      if (isAdminCredentialDecodeError(verifyError)) {
        return credentialDecodeErrorResponse();
      }
      if (isIdTokenAudienceMismatch(verifyError)) {
        return NextResponse.json(
          {
            error:
              'Server Firebase project does not match the signed-in app. Use FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY from the same Firebase project as NEXT_PUBLIC_FIREBASE_PROJECT_ID (and align FIREBASE_PROJECT_ID with that project).',
          },
          { status: 500 }
        );
      }
      throw verifyError;
    }
    const requesterId = decodedToken.uid;

    const requesterDoc = await adminDb.collection('users').doc(requesterId).get();
    const requesterRole = requesterDoc.data()?.role as User['role'] | undefined;

    if (!requesterRole || !allowedRoles.includes(requesterRole)) {
      return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
    }

    if (userId === requesterId) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
    }

    try {
      await adminAuth.deleteUser(userId);
    } catch (error: unknown) {
      if (
        !(
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'auth/user-not-found'
        )
      ) {
        throw error;
      }
    }

    await adminDb.collection('users').doc(userId).delete();

    return NextResponse.json({
      success: true,
      message: 'User deleted from Auth and Firestore.',
    });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Delete user error:', error);
    if (isAdminCredentialDecodeError(error)) {
      return credentialDecodeErrorResponse();
    }
    return NextResponse.json({ error: 'Failed to delete user.' }, { status: 500 });
  }
}
