'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import DatePicker from '@/components/form/date-picker';
import { Event, ExternalAttendeeGroup } from '@/services/types';
import dayjs, { Dayjs } from 'dayjs';
import { Add, Delete } from '@mui/icons-material';

interface EventFormProps {
  isOpen: boolean;
  onClose: () => void;
  currentEvent: Partial<Event>;
  selectedDate: Dayjs | null;
  selectedDateTime: Dayjs | null;
  onDateChange: (date: Dayjs | null) => void;
  onDateTimeChange: (dateTime: Dayjs | null) => void;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  externalAttendeeGroups: ExternalAttendeeGroup[];
  onExternalGroupNameChange: (index: number, value: string) => void;
  onExternalGroupCountChange: (index: number, value: number) => void;
  onAddExternalGroup: () => void;
  onRemoveExternalGroup: (index: number) => void;
  onSubmit: () => void;
  isEdit: boolean;
  isEnded?: boolean;
}

export default function EventForm({
  isOpen,
  onClose,
  currentEvent,
  selectedDate,
  selectedDateTime,
  onDateChange,
  onDateTimeChange,
  onInputChange,
  externalAttendeeGroups,
  onExternalGroupNameChange,
  onExternalGroupCountChange,
  onAddExternalGroup,
  onRemoveExternalGroup,
  onSubmit,
  isEdit,
  isEnded,
}: EventFormProps) {
  const handleDateChange = (dates: Date[]) => {
    if (dates && dates.length > 0) {
      onDateChange(dayjs(dates[0]));
    } else {
      onDateChange(null);
    }
  };

  const handleDateTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value) {
      onDateTimeChange(dayjs(value));
    } else {
      onDateTimeChange(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="!max-w-[600px] p-6 lg:p-10">
      <div className="w-full">
        <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white/90">
          {isEdit ? 'Edit Event' : 'Create New Event'}
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="name">Event Name</Label>
            <InputField
              id="name"
              name="name"
              value={currentEvent.name ?? ''}
              onChange={onInputChange}
              required
            />
          </div>

          <div>
            <DatePicker
              id="event-date"
              label="Event Date"
              defaultDate={selectedDate ? selectedDate.toDate() : new Date()}
              onChange={handleDateChange}
            />
          </div>

          <div>
            <Label htmlFor="startTime">Start Date & Time</Label>
            <InputField
              id="startTime"
              name="startTime"
              type="datetime-local"
              value={
                selectedDateTime
                  ? selectedDateTime.format('YYYY-MM-DDTHH:mm')
                  : currentEvent.startTime
                    ? dayjs(currentEvent.startTime).format('YYYY-MM-DDTHH:mm')
                    : ''
              }
              onChange={handleDateTimeChange}
              disabled={isEdit && isEnded}
            />
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Label>Non-registered attendees</Label>
              <Button
                variant="outline"
                startIcon={<Add />}
                onClick={onAddExternalGroup}
                className="text-xs"
              >
                Add group
              </Button>
            </div>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Example: Faculty - 11, Visitors - 7
            </p>

            {externalAttendeeGroups.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No external groups added.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {externalAttendeeGroups.map((group, index) => (
                  <div key={`${group.name}-${index}`} className="grid grid-cols-12 gap-2">
                    <div className="col-span-7">
                      <InputField
                        name={`external-group-name-${index}`}
                        value={group.name}
                        onChange={(changeEvent) =>
                          onExternalGroupNameChange(index, changeEvent.target.value)
                        }
                        placeholder="Group name (e.g. Faculty)"
                      />
                    </div>
                    <div className="col-span-3">
                      <InputField
                        name={`external-group-count-${index}`}
                        type="number"
                        value={String(group.count)}
                        onChange={(changeEvent) =>
                          onExternalGroupCountChange(index, Number(changeEvent.target.value))
                        }
                        min={0}
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => onRemoveExternalGroup(index)}
                        aria-label="Remove group"
                        className="px-3"
                      >
                        <Delete fontSize="small" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto sm:min-w-[80px]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onSubmit}
              className="w-full sm:w-auto sm:min-w-[100px]"
            >
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
