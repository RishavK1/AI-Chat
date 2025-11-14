import React, { useState, useEffect } from 'react';
import type { ProviderSettings, AIProvider } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ProviderSettings;
  onSave: (settings: ProviderSettings) => void;
}

const PROVIDER_OPTIONS: { id: AIProvider; label: string; description: string; requiresKey: boolean }[] = [
  {
    id: 'default',
    label: 'QuickInterview Gemini (default)',
    description: 'Use the built-in QuickInterview AI Gemini key.',
    requiresKey: false,
  },
  {
    id: 'gemini',
    label: 'Gemini (your key)',
    description: 'Bring your own Google AI Studio key for full control.',
    requiresKey: true,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'Use GPT-4o-mini via your OpenAI API key.',
    requiresKey: true,
  },
  {
    id: 'claude',
    label: 'Anthropic Claude',
    description: 'Use Claude 3 Haiku via your Anthropic API key.',
    requiresKey: true,
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = useState<ProviderSettings>(settings);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setError(null);
    }
  }, [isOpen, settings]);

  const handleProviderChange = (provider: AIProvider) => {
    setLocalSettings((prev) => ({ ...prev, provider }));
  };

  const handleSave = () => {
    const selectedOption = PROVIDER_OPTIONS.find((opt) => opt.id === localSettings.provider);
    if (selectedOption?.requiresKey && !localSettings.apiKey) {
      setError('Please enter an API key for the selected provider.');
      return;
    }

    onSave(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">AI Provider Settings</h2>
            <p className="text-sm text-slate-500">Choose how answers are generated.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition"
          >
            <CloseIcon className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="space-y-3">
            {PROVIDER_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition ${
                  localSettings.provider === option.id
                    ? 'border-blue-500 bg-blue-50/60'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  checked={localSettings.provider === option.id}
                  onChange={() => handleProviderChange(option.id)}
                  className="mt-1 accent-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{option.label}</p>
                  <p className="text-xs text-slate-500">{option.description}</p>
                </div>
              </label>
            ))}
          </div>

          {localSettings.provider !== 'default' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">
                API Key
                <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={localSettings.apiKey || ''}
                onChange={(e) =>
                  setLocalSettings((prev) => ({ ...prev, apiKey: e.target.value.trim() }))
                }
                placeholder="Enter your API key"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400">
                Keys are stored only in your browser and never sent anywhere else.
              </p>
            </div>
          )}

          {error && <div className="text-sm text-red-500">{error}</div>}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition shadow-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

