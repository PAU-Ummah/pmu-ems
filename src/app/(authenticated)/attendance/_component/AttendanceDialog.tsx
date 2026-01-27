'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import Alert from '@/components/ui/alert/Alert';
import { Event, Person } from '@/types';

interface AttendanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentEvent: Event | null;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  filteredPeople: Person[];
  onToggleAttendance: (personId: string) => void;
  isUpdating: boolean;
  updateError: string | null;
}

export default function AttendanceDialog({
  isOpen,
  onClose,
  currentEvent,
  searchTerm,
  onSearchChange,
  filteredPeople,
  onToggleAttendance,
  isUpdating,
  updateError,
}: AttendanceDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="!max-w-[800px] p-6 lg:p-10">
      <div className="w-full">
        <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white/90">
          Mark Attendance - {currentEvent?.name}
        </h2>

        <div className="flex flex-col gap-4">
          <Alert
            variant="info"
            title="Information"
            message="Mark attendance for people attending this event. Events are shown 1 hour before they start and remain visible until they end."
          />

          {updateError && (
            <Alert
              variant="error"
              title="Error"
              message={updateError}
            />
          )}

          {isUpdating && (
            <Alert
              variant="info"
              title="Updating"
              message="Updating attendance..."
            />
          )}

          <div>
            <Label htmlFor="search">Search by name or department</Label>
            <InputField
              id="search"
              name="search"
              value={searchTerm}
              onChange={onSearchChange}
              placeholder="Search by name or department"
            />
          </div>

          <div className="max-h-[400px] overflow-auto rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
            {filteredPeople.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPeople.map((person) => {
                  const isAttending = currentEvent?.attendees?.includes(person.id!) || false;
                  return (
                    <div
                      key={person.id}
                      className="flex items-center gap-4 p-4 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white/90 truncate">
                          {person.firstName} {person.middleName} {person.surname}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                          {person.department} - {person.class}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={isAttending}
                          onChange={() => onToggleAttendance(person.id!)}
                          disabled={isUpdating}
                          className="h-5 w-5 cursor-pointer rounded border-gray-300 text-brand-500 focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No matching people found
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto sm:min-w-[80px]"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
