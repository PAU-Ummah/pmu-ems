import React from 'react';
import Spinner from '@/components/ui/spinner/Spinner';

const Loading = () => {
  return (
    <div className="flex items-center justify-center py-8">
      <Spinner size="md" color="text-[#00AFEF]" />
    </div>
  );
};

export default Loading;
