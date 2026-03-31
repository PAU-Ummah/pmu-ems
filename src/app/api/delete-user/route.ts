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

export async function POST(request: NextRequest) {
  try {
    const idToken = getBearerToken(request.headers.get('authorization'));
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized request.' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
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
    return NextResponse.json({ error: 'Failed to delete user.' }, { status: 500 });
  }
}
