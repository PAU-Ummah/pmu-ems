import React from 'react';
import { Commet } from 'react-loading-indicators';

const Loading = () => {
  return (
    <div className="flex items-center justify-center py-8">
      <Commet color="#4b9f4b" size="medium" />
      <Commet color={["#4b9f4b", "#327fcd", "#cd32cd", "#cd8032"]} size="medium"  />
    </div>
  );
};

export default Loading;
