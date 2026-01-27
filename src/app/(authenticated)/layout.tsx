'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { useSidebar } from '@/context/SidebarContext';
import AppHeader from '@/layout/AppHeader';
import AppSidebar from '@/layout/AppSidebar';
import Backdrop from '@/layout/Backdrop';
import { useAuth } from '@/context/AuthContext';
import Loading from '@/components/loading/Loading';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const { user: authUser, userData, loading: isLoading } = useAuth();
  const isAuthenticated = !!authUser && !!userData;
  const [isMounted, setIsMounted] = useState(false);

  // Track mount state to prevent hydration mismatch
  // This is necessary to ensure server and client render the same initially
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isLoading || !isMounted) {
      return;
    }

    if (!isAuthenticated || !authUser || !userData) {
      router.push(
        "/login?errorTitle=Session Expired&errorMessage=You've been logged out automatically. Please re-authenticate."
      );
      return;
    }
  }, [pathname, router, authUser, userData, isAuthenticated, isLoading, isMounted]);

  // Show loading during initial mount or while loading auth state
  // This ensures server and client render the same initially
  if (!isMounted || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!isAuthenticated || !authUser) {
    return null;
  }

  const mainContentMargin = isMobileOpen
    ? 'ml-0'
    : isExpanded || isHovered
      ? 'lg:ml-[290px]'
      : 'lg:ml-[90px]';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 lg:flex">
      <AppSidebar />
      <Backdrop />
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        <AppHeader />
        <div className="mx-auto max-w-7xl p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

