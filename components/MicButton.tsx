import React from 'react';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

interface MicButtonProps {
  isRecording: boolean;
  onClick: () => void;
}

export const MicButton: React.FC<MicButtonProps> = ({ isRecording, onClick }) => {
  return (
    <div className="flex justify-center items-center">
      <button
        onClick={onClick}
        className={`
          w-16 h-16 rounded-full flex items-center justify-center 
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-4 focus:ring-offset-2
          active:scale-95
          ${isRecording 
            ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 animate-pulse-scale' 
            : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 shadow-md hover:shadow-lg hover:from-slate-200 hover:to-slate-300'
          }
        `}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        <MicrophoneIcon className={`w-7 h-7 transition-transform ${isRecording ? 'scale-110' : ''}`} />
      </button>
    </div>
  );
};
