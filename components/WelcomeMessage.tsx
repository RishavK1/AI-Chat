import React from 'react';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

export const WelcomeMessage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
      <div className="max-w-sm">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
            <MicrophoneIcon className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-slate-800 mb-3">Welcome to QuickInterview AI</h2>
        <p className="text-slate-600 mb-8 text-sm leading-relaxed">
          Get instant, professional answers to engineering interview questions.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
          <span>Tap the</span>
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
            <MicrophoneIcon className="w-4 h-4 text-slate-600" />
          </div>
          <span>button below to start</span>
        </div>
      </div>
    </div>
  );
};
