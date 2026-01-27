'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import SignInForm from '@/app/(not-authenticated)/login/_components/SignInForm';
import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import Loading from '@/components/loading/Loading';

export default function LoginPage() {
  const { user, userData, loading: isLoading } = useAuth();
  const isAuthenticated = !!user && !!userData;
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <AuthPageLayout
      title="PMU EMS"
      description="PAU Muslim Ummah Event Management System"
      subtitle="Sign in to your account"
      footer={
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Forgot your password?{' '}
          <a
            href="/reset-password"
            className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Reset it here
          </a>
        </p>
      }
    >
      <SignInForm />
    </AuthPageLayout>
  );
}
