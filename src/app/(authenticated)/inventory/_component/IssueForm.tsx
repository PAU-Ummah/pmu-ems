'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import { issueStock } from '@/services/inventoryService';
import { useAuth } from '@/context/AuthContext';
import type { InventoryItem, RecipientGroup } from '@/services/inventoryTypes';
import type { Event } from '@/services/types';

interface IssueFormProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  events: Event[];
  defaultItemId?: string;
  onCreated: () => void;
}

export default function IssueForm({
  isOpen,
  onClose,
  items,
  events,
  defaultItemId,
  onCreated,
}: IssueFormProps) {
  const { user } = useAuth();
  const [itemId, setItemId] = useState(defaultItemId ?? '');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventId, setEventId] = useState('');
  const [recipientGroup, setRecipientGroup] = useState<RecipientGroup>('everyone');
  const [headcount, setHeadcount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    const selectedEvent = events.find((e) => e.id === eventId);
    if (selectedEvent) {
      setHeadcount(String(selectedEvent.attendees.length));
    }
  }, [eventId, events]);

  const resetAndClose = () => {
    setItemId(defaultItemId ?? '');
    setQuantity('');
    setDate(new Date().toISOString().split('T')[0]);
    setEventId('');
    setRecipientGroup('everyone');
    setHeadcount('');
    setError(null);
    onClose();
  };

  const quantityNum = Number(quantity);
  const headcountNum = Number(headcount);
  const canSubmit =
    !!itemId &&
    quantity !== '' &&
    quantityNum > 0 &&
    (!eventId || !!recipientGroup);

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      await issueStock({
        itemId,
        quantity: quantityNum,
        date,
        createdBy: user.uid,
        eventId: eventId || undefined,
        recipientGroup,
        headcount: headcount !== '' ? headcountNum : undefined,
      });
      resetAndClose();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue stock.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} className="!max-w-[600px] p-0">
      <div className="w-full p-6 lg:p-10">
        <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white/90">
          Issue Stock
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="issueItem">Item</Label>
            <select
              id="issueItem"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
            >
              <option value="">Select an item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="issueEvent">Event (optional)</Label>
            <select
              id="issueEvent"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
            >
              <option value="">No linked event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} - {event.date}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="recipientGroup">Recipient Group</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="recipientGroup"
                  checked={recipientGroup === 'everyone'}
                  onChange={() => setRecipientGroup('everyone')}
                />
                Everyone
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="recipientGroup"
                  checked={recipientGroup === 'participants'}
                  onChange={() => setRecipientGroup('participants')}
                />
                Participants only
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="issueDate">Date</Label>
              <InputField
                id="issueDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="issueQuantity">Quantity</Label>
              <InputField
                id="issueQuantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="issueHeadcount">Headcount</Label>
              <InputField
                id="issueHeadcount"
                type="number"
                min={0}
                value={headcount}
                onChange={(e) => setHeadcount(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-error-500">{error}</p>}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={resetAndClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className="w-full sm:w-auto"
            >
              Issue Stock
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
