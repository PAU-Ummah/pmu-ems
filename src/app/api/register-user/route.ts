import { NextRequest, NextResponse } from 'next/server';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { User } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { email, password, role, displayName } = await request.json();

    // Validate required fields
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: User['role'][] = ['event-organizer', 'it', 'finance-manager', 'admin', 'registrar'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: event-organizer, it, finance-manager, admin, registrar' },
        { status: 400 }
      );
    }

    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    const userData: User = {
      id: user.uid,
      email: user.email!,
      role,
      displayName: displayName || user.email!,
    };

    await setDoc(doc(db, 'users', user.uid), userData);

    // Send password reset email to the newly registered user
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (emailError) {
      // eslint-disable-next-line no-console
      console.error('Failed to send password reset email:', emailError);
      // Don't fail the registration if email fails, but log the error
    }

    // Sign out the newly created user (they'll need to log in with their credentials)
    await auth.signOut();

    return NextResponse.json({
      success: true,
      message: 'User registered successfully. Password reset email sent.',
      userId: user.uid,
    });

  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Registration error:', error);
    
    // Handle specific Firebase errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/email-already-in-use') {
        return NextResponse.json(
          { error: 'Email is already registered' },
          { status: 409 }
        );
      }
      
      if (error.code === 'auth/weak-password') {
        return NextResponse.json(
          { error: 'Password is too weak' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
