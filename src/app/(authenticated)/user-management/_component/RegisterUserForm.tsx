'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Select from '@/components/form/Select';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import { User } from '@/types';

interface RegisterUserFormProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    email: string;
    password: string;
    role: User['role'];
    displayName: string;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRoleChange: (role: User['role']) => void;
  onSubmit: () => void;
  loading: boolean;
}

const roleOptions = [
  { value: 'event-organizer', label: 'Event Organizer' },
  { value: 'it', label: 'IT' },
  { value: 'finance-manager', label: 'Finance Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'registrar', label: 'Registrar' },
];

export default function RegisterUserForm({
  isOpen,
  onClose,
  formData,
  onInputChange,
  onRoleChange,
  onSubmit,
  loading,
}: RegisterUserFormProps) {
  const handleClose = () => {
    onClose();
  };

  const handleRoleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onRoleChange(e.target.value as User['role']);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="!max-w-[600px] p-6 lg:p-10">
      <div className="w-full">
        <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white/90">
          Register New User
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <InputField
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={onInputChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <InputField
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={onInputChange}
              required
              minLength={6}
              hint="Minimum 6 characters"
            />
          </div>

          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <InputField
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={onInputChange}
              placeholder="Optional"
            />
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              options={roleOptions}
              defaultValue={formData.role}
              onChange={handleRoleSelectChange}
              placeholder="Select a role"
            />
          </div>

          <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h4 className="mb-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
              📧 Email Notification
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              After registration, a password reset email will be automatically sent to the user.
              They can use this email to set their own password and log in.
            </p>
          </div>

          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white/90">
              Role Descriptions:
            </h4>
            <div className="flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300">
              <p>
                <strong>Event Organizer:</strong> Create, edit, and manage events
              </p>
              <p>
                <strong>IT:</strong> Manage people records and register users
              </p>
              <p>
                <strong>Finance Manager:</strong> Manage invoices and financial data
              </p>
              <p>
                <strong>Admin:</strong> View comprehensive reports and access all data
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto sm:min-w-[80px]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onSubmit}
              disabled={loading || !formData.email || !formData.password}
              className="w-full sm:w-auto sm:min-w-[120px]"
            >
              {loading ? 'Registering...' : 'Register User'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
