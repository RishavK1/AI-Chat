
import React from 'react';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

interface MicButtonProps {
  isRecording: boolean;
  onClick: () => void;
}

export const MicButton: React.FC<MicButtonProps> = ({ isRecording, onClick }) => {
  const buttonClasses = isRecording
    ? 'bg-red-500 text-white shadow-inner shadow-red-700/50'
    : 'bg-gray-100 text-gray-600 shadow-md hover:bg-gray-200 active:shadow-inner';

  return (
    <div className="flex justify-center items-center">
      <button
        onClick={onClick}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-300 ${buttonClasses}`}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        <MicrophoneIcon className="w-8 h-8" />
      </button>
    </div>
  );
};
