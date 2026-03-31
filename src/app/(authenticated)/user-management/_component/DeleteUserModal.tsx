'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import { User } from '@/services/types';

interface DeleteUserModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isDeleting: boolean;
}

export default function DeleteUserModal({
  isOpen,
  user,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteUserModalProps) {
  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="!max-w-[480px] p-6 lg:p-10">
      <div className="w-full">
        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white/90">
          Delete user
        </h2>
        <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">
          This will permanently remove the account from Firebase Authentication and delete their
          user document in Firestore. This cannot be undone.
        </p>
        {user && (
          <p className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white/90">
            {user.email}
            {user.displayName ? (
              <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">
                {user.displayName}
              </span>
            ) : null}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
            className="w-full sm:w-auto sm:min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              void onConfirm();
            }}
            disabled={isDeleting || !user}
            className="w-full sm:w-auto sm:min-w-[120px]"
          >
            {isDeleting ? 'Deleting...' : 'Delete user'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
