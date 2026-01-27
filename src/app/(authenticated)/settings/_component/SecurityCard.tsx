'use client';

import React from 'react';
import { Security, Refresh } from '@mui/icons-material';
import Button from '@/components/ui/button/Button';

interface SecurityCardProps {
  onPasswordReset: () => void;
  loading: boolean;
}

export default function SecurityCard({
  onPasswordReset,
  loading,
}: SecurityCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex items-center gap-2">
        <Security className="text-brand-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
          Security
        </h3>
      </div>

      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Change your password or update your security settings.
      </p>

      <Button
        variant="outline"
        startIcon={<Refresh />}
        onClick={onPasswordReset}
        disabled={loading}
        className="border-[#144404] text-[#144404] hover:border-[#0d3002] hover:bg-[rgba(20,68,4,0.04)]"
      >
        {loading ? 'Sending...' : 'Request Password Reset'}
      </Button>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        A password reset link will be sent to your email address.
      </p>
    </div>
  );
}
