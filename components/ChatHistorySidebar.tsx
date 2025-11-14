import React from 'react';
import type { ChatSession } from '../types';
import { HistoryIcon } from './icons/HistoryIcon';
import { PlusIcon } from './icons/PlusIcon';

interface ChatHistorySidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onClearHistory: () => void;
}

const formatDate = (timestamp: number) => {
  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(timestamp);
  } catch {
    return new Date(timestamp).toLocaleString();
  }
};

const SessionList: React.FC<{
  sessions: ChatSession[];
  activeSessionId: string;
  onSelect: (sessionId: string) => void;
  onClose?: () => void;
}> = ({ sessions, activeSessionId, onSelect, onClose }) => {
  if (!sessions.length) {
    return (
      <div className="p-4 text-sm text-slate-500">
        No sessions yet. Start a new conversation to save it here.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {sessions.map((session) => {
        const isActive = session.id === activeSessionId;
        return (
          <li key={session.id}>
            <button
              onClick={() => {
                onSelect(session.id);
                onClose?.();
              }}
              className={`w-full text-left px-4 py-3 transition ${
                isActive ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <p
                className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-800'}`}
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {session.title || 'Untitled session'}
              </p>
              <p className={`text-xs mt-1 ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                {formatDate(session.updatedAt)}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  sessions,
  activeSessionId,
  isOpen,
  onClose,
  onSelect,
  onNewSession,
  onClearHistory,
}) => {
  return (
    <>
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-slate-200 lg:bg-white">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm uppercase tracking-wide">
            <HistoryIcon className="w-5 h-5" />
            History
          </div>
          <button
            onClick={onNewSession}
            className="flex items-center gap-1 rounded-lg bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 hover:bg-slate-800 transition"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SessionList sessions={sessions} activeSessionId={activeSessionId} onSelect={onSelect} />
        </div>
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={onClearHistory}
            className="w-full rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold py-2 hover:bg-slate-50 transition"
          >
            Clear History
          </button>
        </div>
      </aside>

      <div
        className={`fixed inset-0 z-50 transition pointer-events-none lg:hidden ${
          isOpen ? 'pointer-events-auto' : ''
        }`}
        aria-hidden={!isOpen}
      >
        <div
          className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-200 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />
        <aside
          className={`absolute left-0 top-0 bottom-0 w-72 max-w-[85%] bg-white shadow-xl border-r border-slate-200 flex flex-col transform transition-transform duration-300 z-50 ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm uppercase tracking-wide">
              <HistoryIcon className="w-5 h-5" />
              History
            </div>
            <button
              onClick={onNewSession}
              className="flex items-center gap-1 rounded-lg bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 hover:bg-slate-800 transition"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <SessionList
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelect={onSelect}
              onClose={onClose}
            />
          </div>

          <div className="p-4 border-t border-slate-200">
            <button
              onClick={() => {
                onClearHistory();
                onClose();
              }}
              className="w-full rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold py-2 hover:bg-slate-50 transition"
            >
              Clear History
            </button>
          </div>
        </aside>
      </div>
    </>
  );
};

