'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import { createReceipt } from '@/services/inventoryService';
import { useAuth } from '@/context/AuthContext';
import type { InventoryItem, InventorySourceType } from '@/services/inventoryTypes';

interface ReceiptFormProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  defaultItemId?: string;
  onCreated: () => void;
}

export default function ReceiptForm({
  isOpen,
  onClose,
  items,
  defaultItemId,
  onCreated,
}: ReceiptFormProps) {
  const { user } = useAuth();
  const [itemId, setItemId] = useState(defaultItemId ?? '');
  const [sourceType, setSourceType] = useState<InventorySourceType>('purchased');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantityReceived, setQuantityReceived] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetAndClose = () => {
    setItemId(defaultItemId ?? '');
    setSourceType('purchased');
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setQuantityReceived('');
    setUnitCost('');
    setExpiryDate('');
    setError(null);
    onClose();
  };

  const quantityNum = Number(quantityReceived);
  const unitCostNum = Number(unitCost);
  const canSubmit =
    !!itemId &&
    quantityReceived !== '' &&
    quantityNum > 0 &&
    unitCost !== '' &&
    unitCostNum >= 0;

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      await createReceipt({
        itemId,
        sourceType,
        receivedDate,
        quantityReceived: quantityNum,
        unitCost: unitCostNum,
        expiryDate: expiryDate || undefined,
        createdBy: user.uid,
      });
      resetAndClose();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} className="!max-w-[600px] p-0">
      <div className="w-full p-6 lg:p-10">
        <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white/90">
          Add Stock Receipt
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="receiptItem">Item</Label>
            <select
              id="receiptItem"
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
            <Label htmlFor="sourceType">Source</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="sourceType"
                  checked={sourceType === 'purchased'}
                  onChange={() => setSourceType('purchased')}
                />
                Purchased
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="sourceType"
                  checked={sourceType === 'donated'}
                  onChange={() => setSourceType('donated')}
                />
                Donated
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="receivedDate">Received Date</Label>
              <InputField
                id="receivedDate"
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="expiryDate">Expiry Date (optional)</Label>
              <InputField
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="quantityReceived">Quantity Received</Label>
              <InputField
                id="quantityReceived"
                type="number"
                min={1}
                value={quantityReceived}
                onChange={(e) => setQuantityReceived(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="unitCost">Unit Cost (₦)</Label>
              <InputField
                id="unitCost"
                type="number"
                min={0}
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                May be 0 for donated stock.
              </p>
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
              Add Receipt
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
