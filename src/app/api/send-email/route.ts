import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Send password reset email using Firebase Auth
    await sendPasswordResetEmail(auth, email);

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully',
    });

  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Send email error:', error);
    
    // Handle specific Firebase errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'No user found with this email address' },
          { status: 404 }
        );
      }
      
      if (error.code === 'auth/invalid-email') {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        );
      }

      if (error.code === 'auth/too-many-requests') {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
