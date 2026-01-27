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

  if (isAuthenticated) {
    return null;
  }

  return (
    <AuthPageLayout
      title="PMU EMS"
      description="PAU Muslim Ummah Event Management System"
      subtitle="Sign in to your account"
    >
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80">
            <Loading />
          </div>
        )}
        <SignInForm />
      </div>
    </AuthPageLayout>
  );
}
