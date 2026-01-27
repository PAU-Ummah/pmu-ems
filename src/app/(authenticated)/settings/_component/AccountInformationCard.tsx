'use client';

import React from 'react';
import { Person, Email } from '@mui/icons-material';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Badge from '@/components/ui/badge/Badge';

interface AccountInformationCardProps {
  email?: string;
  displayName?: string;
  role?: string;
}

export default function AccountInformationCard({
  email,
  displayName,
  role,
}: AccountInformationCardProps) {
  const getRoleColor = (role: string): 'primary' | 'success' | 'error' | 'warning' | 'info' => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'it':
        return 'info';
      case 'finance-manager':
        return 'warning';
      case 'event-organizer':
        return 'success';
      default:
        return 'primary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'it':
        return 'IT';
      case 'finance-manager':
        return 'Finance Manager';
      case 'event-organizer':
        return 'Event Organizer';
      default:
        return role;
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex items-center gap-2">
        <Person className="text-brand-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
          Account Information
        </h3>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Email className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <InputField
              id="email"
              name="email"
              value={email || ''}
              disabled
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="displayName">Display Name</Label>
          <div className="relative">
            <Person className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <InputField
              id="displayName"
              name="displayName"
              value={displayName || 'Not set'}
              disabled
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="role" className="mb-0">
            Role:
          </Label>
          {role && (
            <Badge color={getRoleColor(role)} variant="light" size="sm">
              {getRoleLabel(role)}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
