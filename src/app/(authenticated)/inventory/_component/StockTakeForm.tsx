'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import { recordStockTake } from '@/services/inventoryService';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/hooks/useRole';
import AiCountDialog, { type CountPhoto } from './AiCountDialog';
import type { InventoryItem, AdjustmentReason } from '@/services/inventoryTypes';
import type { InventoryItemWithStock } from '@/hooks/useInventoryItems';

interface StockTakeFormProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  itemsWithStock: InventoryItemWithStock[];
  defaultItemId?: string;
  onCreated: () => void;
}

export default function StockTakeForm({
  isOpen,
  onClose,
  items,
  itemsWithStock,
  defaultItemId,
  onCreated,
}: StockTakeFormProps) {
  const { user } = useAuth();
  const { canAdminInventory } = useRole();
  const [photo, setPhoto] = useState<CountPhoto | null>(null);
  const [itemId, setItemId] = useState(defaultItemId ?? '');
  const [countedQty, setCountedQty] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<AdjustmentReason | ''>('');
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const systemQty = itemsWithStock.find((i) => i.item.id === itemId)?.onHand ?? 0;
  const countedQtyNum = Number(countedQty);
  const hasCount = countedQty !== '';
  const variance = hasCount ? countedQtyNum - systemQty : 0;

  const resetAndClose = () => {
    setItemId(defaultItemId ?? '');
    setCountedQty('');
    setDate(new Date().toISOString().split('T')[0]);
    setReason('');
    setPhoto(null);
    setError(null);
    onClose();
  };

  // Only admins can post the adjustment a difference creates (firestore.rules enforces this too).
  const needsAdmin = variance !== 0 && !canAdminInventory();

  const canSubmit =
    !!itemId &&
    hasCount &&
    countedQtyNum >= 0 &&
    (variance === 0 || !!reason) &&
    !needsAdmin;

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      await recordStockTake({
        itemId,
        countedQty: countedQtyNum,
        systemQtyAtCount: systemQty,
        date,
        createdBy: user.uid,
        reason: variance !== 0 ? (reason as AdjustmentReason) : undefined,
        photoPath: photo?.path,
        photoUrl: photo?.url,
      });
      resetAndClose();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record stock take.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={resetAndClose} className="!max-w-[600px] p-0">
        <div className="w-full p-6 lg:p-10">
          <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white/90">
            Stock Take
          </h2>

          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="stockTakeItem">Item</Label>
              <select
                id="stockTakeItem"
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

            {itemId && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                System quantity: {systemQty}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="stockTakeDate">Date</Label>
                <InputField
                  id="stockTakeDate"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="stockTakeCountedQty">Counted Quantity</Label>
                <div className="flex items-center gap-2">
                  <InputField
                    id="stockTakeCountedQty"
                    type="number"
                    min={0}
                    value={countedQty}
                    onChange={(e) => setCountedQty(e.target.value)}
                    required
                  />
                  <Button
                    variant="primary"
                    onClick={() => setAiDialogOpen(true)}
                    className="shrink-0 whitespace-nowrap !bg-success-700 !text-sm font-semibold !text-white hover:!bg-success-800 focus:!ring-success-600"
                  >
                    Use AI Count
                  </Button>
                </div>
              </div>
            </div>

            {itemId && hasCount && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Variance:{' '}
                {variance === 0
                  ? '0 (matches system)'
                  : variance > 0
                    ? `+${variance}`
                    : variance}
              </p>
            )}

            {itemId && hasCount && variance !== 0 && (
              <div>
                <Label htmlFor="stockTakeReason">Reason</Label>
                <select
                  id="stockTakeReason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as AdjustmentReason)}
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                >
                  <option value="" disabled>
                    Select a reason
                  </option>
                  <option value="expired">Expired</option>
                  <option value="damaged">Damaged</option>
                  <option value="lost">Lost</option>
                  <option value="miscounted">Miscounted</option>
                </select>
              </div>
            )}

            {needsAdmin && (
              <p className="text-sm text-warning-500">
                The count differs from the system quantity. Only an admin can save a stock take
                that changes the stock, so ask an admin to record this one.
              </p>
            )}

            {photo && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI count photo attached as an audit record.
              </p>
            )}

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
                Save Stock Take
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <AiCountDialog
        isOpen={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        onAccept={(count, countPhoto) => {
          setCountedQty(String(count));
          setPhoto(countPhoto);
        }}
      />
    </>
  );
}
