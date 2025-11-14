
import React from 'react';

export const LoadingBubble: React.FC = () => {
  return (
    <div className="flex justify-start">
      <div className="bg-white rounded-2xl rounded-bl-none p-4 shadow-sm w-48">
        <div className="animate-pulse flex space-x-2">
          <div className="flex-1 space-y-3 py-1">
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                    <div className="h-2 bg-gray-200 rounded col-span-2"></div>
                    <div className="h-2 bg-gray-200 rounded col-span-1"></div>
                </div>
                <div className="h-2 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
