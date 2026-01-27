import React from 'react';
import { Commet } from 'react-loading-indicators';

const Loading = () => {
  return (
    <div className="flex items-center justify-center py-8">
      <Commet color="#4b9f4b" size="medium" />
    </div>
  );
};

export default Loading;
