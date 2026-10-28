'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import { writeOffStock } from '@/services/inventoryService';
import { useAuth } from '@/context/AuthContext';
import type { InventoryItem, WriteOffReason } from '@/services/inventoryTypes';

interface WriteOffFormProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  defaultItemId?: string;
  onCreated: () => void;
}

export default function WriteOffForm({
  isOpen,
  onClose,
  items,
  defaultItemId,
  onCreated,
}: WriteOffFormProps) {
  const { user } = useAuth();
  const [itemId, setItemId] = useState(defaultItemId ?? '');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<WriteOffReason | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetAndClose = () => {
    setItemId(defaultItemId ?? '');
    setQuantity('');
    setDate(new Date().toISOString().split('T')[0]);
    setReason('');
    setError(null);
    onClose();
  };

  const quantityNum = Number(quantity);
  const canSubmit =
    !!itemId && quantity !== '' && quantityNum > 0 && !!reason;

  const handleSubmit = async () => {
    if (!user || !canSubmit || !reason) return;

    setSubmitting(true);
    setError(null);
    try {
      await writeOffStock({
        itemId,
        quantity: quantityNum,
        date,
        createdBy: user.uid,
        reason,
      });
      resetAndClose();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to write off stock.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} className="!max-w-[600px] p-0">
      <div className="w-full p-6 lg:p-10">
        <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white/90">
          Write Off Stock
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="writeOffItem">Item</Label>
            <select
              id="writeOffItem"
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
            <Label htmlFor="writeOffReason">Reason</Label>
            <select
              id="writeOffReason"
              value={reason}
              onChange={(e) => setReason(e.target.value as WriteOffReason)}
              className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
            >
              <option value="" disabled>
                Select a reason
              </option>
              <option value="expired">Expired</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="writeOffDate">Date</Label>
              <InputField
                id="writeOffDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="writeOffQuantity">Quantity</Label>
              <InputField
                id="writeOffQuantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
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
              Write Off
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
