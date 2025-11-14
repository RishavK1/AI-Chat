
import React from 'react';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

export const WelcomeMessage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
      <div className="max-w-md">
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Welcome to QuickInterview AI</h2>
        <p className="mb-6">
          Get instant, professional answers to any interview question.
        </p>
        <div className="flex items-center justify-center text-lg">
          <span className="mr-2">Tap the</span>
          <MicrophoneIcon className="w-6 h-6 text-gray-600" />
          <span className="ml-2">button to start.</span>
        </div>
      </div>
    </div>
  );
};
