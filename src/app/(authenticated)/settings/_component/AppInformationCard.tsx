'use client';

import React from 'react';

interface AppInformationCardProps {
  userId?: string;
}

export default function AppInformationCard({ userId }: AppInformationCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">
        Application Information
      </h3>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Application Name:
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-white/90">
            PAU Muslim Ummah EMS
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">Version:</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white/90">
            1.2.0
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">User ID:</p>
          <p className="font-mono text-xs text-gray-900 dark:text-white/90">
            {userId || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}
