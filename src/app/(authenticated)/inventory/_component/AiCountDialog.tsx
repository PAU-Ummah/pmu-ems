'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';

interface AiCountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (count: number) => void;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface Suggestion {
  item: string;
  count: number;
  confidence: number;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AiCountDialog({ isOpen, onClose, onAccept }: AiCountDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [editedCount, setEditedCount] = useState('');

  const reset = () => {
    setLoading(false);
    setError(null);
    setSuggestion(null);
    setEditedCount('');
  };

  const resetAndClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuggestion(null);

    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image is too large. Please use a photo under 5MB.');
      e.target.value = '';
      return;
    }

    setLoading(true);
    try {
      const imageBase64 = await fileToBase64(file);
      const response = await fetch('/api/inventory/ai-count', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageBase64, mediaType: file.type }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'AI count failed. You can still enter the count manually.');
        return;
      }

      setSuggestion(data);
      setEditedCount(String(data.count));
    } catch {
      setError('AI count failed. You can still enter the count manually.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleUseCount = () => {
    const countNum = Number(editedCount);
    if (!Number.isFinite(countNum)) return;
    onAccept(countNum);
    resetAndClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} className="!max-w-[500px] p-0">
      <div className="w-full p-6 lg:p-10">
        <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white/90">
          AI Stock Count
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="aiCountPhoto">Photo of carton</Label>
            <input
              id="aiCountPhoto"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              disabled={loading}
              className="block w-full text-sm text-gray-700 dark:text-gray-300"
            />
          </div>

          {loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing photo…</p>
          )}

          {error && <p className="text-sm text-error-500">{error}</p>}

          {suggestion && (
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Looks like: {suggestion.item} — count: {suggestion.count}
                {' '}({Math.round(suggestion.confidence * 100)}% confidence)
              </p>

              {suggestion.confidence < 0.7 && (
                <p className="text-sm text-warning-500">
                  Low confidence — please check this count carefully.
                </p>
              )}

              <div>
                <Label htmlFor="aiCountValue">Count</Label>
                <InputField
                  id="aiCountValue"
                  type="number"
                  min={0}
                  value={editedCount}
                  onChange={(e) => setEditedCount(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={resetAndClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUseCount}
              disabled={!suggestion || editedCount === ''}
              className="w-full sm:w-auto"
            >
              Use this count
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
