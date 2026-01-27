'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import DatePicker from '@/components/form/date-picker';
import { Event } from '@/types';
import dayjs, { Dayjs } from 'dayjs';

interface EventFormProps {
  isOpen: boolean;
  onClose: () => void;
  currentEvent: Partial<Event>;
  selectedDate: Dayjs | null;
  selectedDateTime: Dayjs | null;
  onDateChange: (date: Dayjs | null) => void;
  onDateTimeChange: (dateTime: Dayjs | null) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
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
              value={currentEvent.name || ''}
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
