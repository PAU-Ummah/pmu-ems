'use client';

import { Modal } from '@/components/ui/modal';
import Spinner from '@/components/ui/spinner/Spinner';

interface ProcessingProgressProps {
  isOpen: boolean;
  progress: number;
}

export default function ProcessingProgress({
  isOpen,
  progress,
}: ProcessingProgressProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      showCloseButton={false}
      className="max-w-[400px]"
    >
      <div className="p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Processing Excel File
        </h2>
        <div className="space-y-4">
          <div className="relative flex items-center justify-center">
            <Spinner
              variant="determinate"
              value={progress}
              size="lg"
              color="text-[#114a03]"
            />
          </div>
          <p className="text-center text-sm text-gray-600">
            Processing records... Please wait.
          </p>
        </div>
      </div>
    </Modal>
  );
}
