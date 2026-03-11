"use client";

import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { Person } from "@/types";

interface DeletePersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person | null;
  onConfirm: (id: string) => void | Promise<void>;
  isDeleting?: boolean;
}

export default function DeletePersonModal({
  isOpen,
  onClose,
  person,
  onConfirm,
  isDeleting = false,
}: DeletePersonModalProps) {
  const displayName = person
    ? [person.firstName, person.middleName, person.surname].filter(Boolean).join(" ")
    : "";

  const handleConfirm = async () => {
    if (person?.id) {
      await onConfirm(person.id);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={!isDeleting}>
      <div className="p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Delete person
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete{" "}
          <span className="font-medium text-gray-900 dark:text-white">
            {displayName}
          </span>
          ? This action cannot be undone.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-end">
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
