'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '@/services/firebase';

export interface CountPhoto {
  path: string;
  url: string;
}

interface AiCountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (count: number, photo: CountPhoto) => void;
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [layers, setLayers] = useState('1');

  const reset = () => {
    setLoading(false);
    setError(null);
    setSuggestion(null);
    setEditedCount('');
    setPhotoFile(null);
    setNote('');
    setLayers('1');
  };

  const handleLayersChange = (value: string) => {
    setLayers(value);
    const layersNum = Number(value);
    if (suggestion && Number.isInteger(layersNum) && layersNum >= 1) {
      setEditedCount(String(suggestion.count * layersNum));
    }
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
    setPhotoFile(null);

    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image is too large. Please use a photo under 5MB.');
      e.target.value = '';
      return;
    }

    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setError('You are signed out. Please sign in again.');
        return;
      }
      const imageBase64 = await fileToBase64(file);
      const response = await fetch('/api/inventory/ai-count', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ imageBase64, mediaType: file.type, note }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'AI count failed. You can still enter the count manually.');
        return;
      }

      setSuggestion(data);
      setLayers('1');
      setEditedCount(String(data.count));
      setPhotoFile(file);
    } catch {
      setError('AI count failed. You can still enter the count manually.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleUseCount = async () => {
    const countNum = Number(editedCount);
    const uid = auth.currentUser?.uid;
    if (!Number.isFinite(countNum) || countNum < 0 || !photoFile || !uid) return;

    setLoading(true);
    setError(null);
    try {
      const safeName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `inventoryCountPhotos/${uid}/${Date.now()}-${safeName}`;
      const photoRef = ref(storage, path);
      await uploadBytes(photoRef, photoFile, { contentType: photoFile.type });
      const url = await getDownloadURL(photoRef);
      onAccept(countNum, { path, url });
      resetAndClose();
    } catch {
      setError('The photo could not be saved, so this count was not used. Try again, or type the count in manually.');
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} className="!max-w-[500px] p-0">
      <div className="w-full p-6 lg:p-10">
        <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white/90">
          AI Stock Count
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="aiCountNote">Note for the AI (optional)</Label>
            <InputField
              id="aiCountNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. count the biscuit packs, not the carton"
            />
          </div>

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
                Looks like: {suggestion.item} — {suggestion.count} visible
                {' '}({Math.round(suggestion.confidence * 100)}% confidence)
              </p>

              <div>
                <Label htmlFor="aiCountLayers">Layers in the box</Label>
                <InputField
                  id="aiCountLayers"
                  type="number"
                  min={1}
                  value={layers}
                  onChange={(e) => handleLayersChange(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  The AI only counts what it can see. If identical layers are hidden underneath,
                  enter how many layers the box holds and the total updates.
                </p>
              </div>

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
              disabled={loading || !suggestion || !photoFile || editedCount === ''}
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
