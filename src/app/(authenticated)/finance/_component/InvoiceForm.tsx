'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import TextArea from '@/components/form/TextArea';
import { Invoice, InvoiceItem, Event } from '@/types';
import { Add, Delete } from '@mui/icons-material';

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  currentInvoice: Partial<Invoice>;
  events: Event[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTextAreaChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onAddItem: () => void;
  onUpdateItem: (itemId: string, field: keyof InvoiceItem, value: string | number) => void;
  onRemoveItem: (itemId: string) => void;
  onSubmit: () => void;
  isEdit: boolean;
}

export default function InvoiceForm({
  isOpen,
  onClose,
  currentInvoice,
  events,
  onInputChange,
  onTextAreaChange,
  onSelectChange,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onSubmit,
  isEdit,
}: InvoiceFormProps) {
  // Handle textarea changes - convert to input change format for consistency
  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onTextAreaChange) {
      onTextAreaChange(e);
    } else {
      // Fallback: create a synthetic input event
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          name: e.target.name,
          value: e.target.value,
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      onInputChange(syntheticEvent);
    }
  };
  const eventOptions = events.map((event) => ({
    value: event.id || '',
    label: `${event.name} - ${event.date}`,
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="!max-w-[900px] p-6 lg:p-10">
      <div className="w-full">
        <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white/90">
          {isEdit ? 'Edit Invoice' : 'Add New Invoice'}
        </h2>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="eventId">Event</Label>
              <select
                id="eventId"
                name="eventId"
                value={currentInvoice.eventId || ''}
                onChange={onSelectChange}
                className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              >
                <option value="">Select an event</option>
                {eventOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <InputField
                id="invoiceNumber"
                name="invoiceNumber"
                value={currentInvoice.invoiceNumber || ''}
                onChange={onInputChange}
              />
            </div>

            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <InputField
                id="vendor"
                name="vendor"
                value={currentInvoice.vendor || ''}
                onChange={onInputChange}
              />
            </div>

            <div>
              <Label htmlFor="date">Date</Label>
              <InputField
                id="date"
                name="date"
                type="date"
                value={currentInvoice.date || ''}
                onChange={onInputChange}
              />
            </div>
          </div>

          <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
              Invoice Items
            </h3>
            <Button
              variant="outline"
              startIcon={<Add />}
              onClick={onAddItem}
              className="text-xs"
            >
              Add Item
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {currentInvoice.items?.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
                  <div className="md:col-span-4">
                    <Label htmlFor={`desc-${item.id}`}>Description</Label>
                    <InputField
                      id={`desc-${item.id}`}
                      value={item.description}
                      onChange={(e) => onUpdateItem(item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor={`qty-${item.id}`}>Quantity</Label>
                    <InputField
                      id={`qty-${item.id}`}
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onUpdateItem(item.id, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor={`unit-${item.id}`}>Unit Price (₦)</Label>
                    <InputField
                      id={`unit-${item.id}`}
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => onUpdateItem(item.id, 'unitPrice', Number(e.target.value))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor={`total-${item.id}`}>Total (₦)</Label>
                    <InputField
                      id={`total-${item.id}`}
                      value={item.totalPrice.toLocaleString()}
                      disabled
                    />
                  </div>
                  <div className="flex items-end md:col-span-2 md:justify-center">
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20"
                      aria-label="Remove item"
                    >
                      <Delete fontSize="small" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(!currentInvoice.items || currentInvoice.items.length === 0) && (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No items added yet. Click "Add Item" to start.
            </p>
          )}

          <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <TextArea
              id="notes"
              name="notes"
              value={currentInvoice.notes || ''}
              onChange={handleTextAreaChange}
              rows={3}
            />
          </div>

          <div className="flex justify-end">
            <p className="text-lg font-semibold text-brand-500">
              Total: ₦{(currentInvoice.totalAmount || 0).toLocaleString()}
            </p>
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
              disabled={!currentInvoice.eventId || !currentInvoice.items?.length}
              className="w-full sm:w-auto sm:min-w-[100px]"
            >
              {isEdit ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
