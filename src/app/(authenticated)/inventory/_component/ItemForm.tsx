'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import { createInventoryItem } from '@/services/inventoryService';
import { useAuth } from '@/context/AuthContext';

interface ItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function ItemForm({ isOpen, onClose, onCreated }: ItemFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setName('');
    setUnitOfMeasure('');
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!name.trim() || !unitOfMeasure.trim()) {
      setError('Name and unit of measure are both required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createInventoryItem(name, unitOfMeasure, user.uid);
      handleClose();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="!max-w-[500px] p-0">
      <div className="w-full p-6 lg:p-10">
        <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white/90">
          Add Inventory Item
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="itemName">Name</Label>
            <InputField
              id="itemName"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
            <InputField
              id="unitOfMeasure"
              value={unitOfMeasure}
              onChange={(e) => setUnitOfMeasure(e.target.value)}
              placeholder="e.g. pack, piece, box"
            />
          </div>

          {error && <p className="text-sm text-error-500">{error}</p>}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting || !name.trim() || !unitOfMeasure.trim()}
              className="w-full sm:w-auto"
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
