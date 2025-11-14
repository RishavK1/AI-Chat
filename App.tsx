import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { generateAnswerWithProvider } from './services/aiProviderService';
import type { ChatMessage, ChatSession, ProviderSettings } from './types';
import { MicButton } from './components/MicButton';
import { ChatBubble } from './components/ChatBubble';
import { WelcomeMessage } from './components/WelcomeMessage';
import { ChatHistorySidebar } from './components/ChatHistorySidebar';
import { HistoryIcon } from './components/icons/HistoryIcon';
import { PlusIcon } from './components/icons/PlusIcon';
import { CloseIcon } from './components/icons/CloseIcon';
import { SettingsIcon } from './components/icons/SettingsIcon';
import { SettingsModal } from './components/SettingsModal';

const STORAGE_KEY = 'quickinterview_sessions_v1';
const PROVIDER_STORAGE_KEY = 'quickinterview_provider_settings_v1';

const createEmptySession = (): ChatSession => ({
  id:
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  title: 'New session',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [],
});

const deriveSessionTitle = (messages: ChatMessage[]): string => {
  if (!messages.length) {
    return 'New session';
  }
  const firstUser =
    messages.find((msg) => msg.role === 'user' && msg.content.trim()) || messages[0];
  const content = firstUser?.content?.trim();
  if (!content) return 'New session';
  return content.length > 80 ? `${content.slice(0, 77)}...` : content;
};

const App: React.FC = () => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [providerSettings, setProviderSettings] = useState<ProviderSettings>({
    provider: 'default',
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedOnce = useRef(false);

  const persistSessionMessages = useCallback(
    (messages: ChatMessage[]) => {
      if (!activeSessionId) return;
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSessionId
            ? {
                ...session,
                messages,
                title: deriveSessionTitle(messages),
                updatedAt: Date.now(),
              }
            : session,
        ),
      );
    },
    [activeSessionId],
  );

  const updateMessages = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setChatMessages((prev) => {
        const updated = updater(prev);
        persistSessionMessages(updated);
        return updated;
      });
    },
    [persistSessionMessages],
  );

  const handleNewTranscript = useCallback(
    (transcript: string) => {
      if (transcript) {
        updateMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: 'user',
            content: transcript,
            isFinal: true,
          },
        ]);
      }
    },
    [updateMessages],
  );

  const { isRecording, transcript, startRecording, stopRecording, cancelRecording } =
    useSpeechRecognition({ onStop: handleNewTranscript });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, transcript]);

  const handleGetAnswer = async (question: string) => {
    setIsGenerating(true);
    const modelMessageId = Date.now();

    // Add an empty message shell for the streaming response
    updateMessages((prev) => [
      ...prev,
      { id: modelMessageId, role: 'model', content: '', isFinal: false },
    ]);

    try {
      const onChunk = (chunk: string) => {
        updateMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId ? { ...msg, content: msg.content + chunk } : msg,
          ),
        );
      };

      await generateAnswerWithProvider(question, onChunk, providerSettings);

    } catch (error) {
      console.error('Error generating answer:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Sorry, I couldn't generate an answer. Please try again.";
      updateMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId
            ? {
                ...msg,
                content: errorMessage,
              }
            : msg,
        ),
      );
    } finally {
      // Finalize the message state
      updateMessages((prev) =>
        prev.map((msg) => (msg.id === modelMessageId ? { ...msg, isFinal: true } : msg)),
      );
      setIsGenerating(false);
    }
  };

  const handleUpdateMessage = (id: number, newContent: string) => {
    updateMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, content: newContent } : msg)),
    );
  };

  const handleDeleteMessage = (id: number) => {
    updateMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      // If the user starts a new recording and the last message is an unanswered
      // user question, remove it to allow for a clean re-take.
      updateMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'user') {
          return prev.slice(0, -1);
        }
        return prev;
      });
      startRecording();
    }
  };

  const handleCancelListening = () => {
    cancelRecording();
  };

  const handleStartNewSession = useCallback(() => {
    const newSession = createEmptySession();
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setChatMessages([]);
    setIsSidebarOpen(false);
  }, []);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      const session = sessions.find((session) => session.id === sessionId);
      if (!session) return;
      setActiveSessionId(sessionId);
      setChatMessages(session.messages);
      setIsSidebarOpen(false);
    },
    [sessions],
  );

  const handleClearHistory = useCallback(() => {
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm('Clear all saved sessions? This cannot be undone.')
        : true;
    if (!confirmed) return;

    const newSession = createEmptySession();
    setSessions([newSession]);
    setActiveSessionId(newSession.id);
    setChatMessages([]);
    setIsSidebarOpen(false);
  }, []);

  useEffect(() => {
    if (hasLoadedOnce.current) return;
    hasLoadedOnce.current = true;

    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (stored) {
        const parsed: ChatSession[] = JSON.parse(stored);
        if (parsed.length) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          setChatMessages(parsed[0].messages);
        } else {
          const newSession = createEmptySession();
          setSessions([newSession]);
          setActiveSessionId(newSession.id);
        }
      } else {
        const newSession = createEmptySession();
        setSessions([newSession]);
        setActiveSessionId(newSession.id);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      const newSession = createEmptySession();
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    try {
      const stored =
        typeof window !== 'undefined' ? localStorage.getItem(PROVIDER_STORAGE_KEY) : null;
      if (stored) {
        setProviderSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load provider settings:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(providerSettings));
    } catch (error) {
      console.error('Failed to save provider settings:', error);
    }
  }, [providerSettings]);

  const handleSaveProviderSettings = (settings: ProviderSettings) => {
    setProviderSettings(settings);
  };
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save sessions:', error);
    }
  }, [sessions, isHydrated]);

  useEffect(() => {
    if (!activeSessionId && sessions.length) {
      setActiveSessionId(sessions[0].id);
      setChatMessages(sessions[0].messages);
    }
  }, [activeSessionId, sessions]);

  const currentSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [sessions, activeSessionId],
  );

  const isAppReady = isHydrated && Boolean(currentSession);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans">
      <ChatHistorySidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelect={handleSelectSession}
        onNewSession={handleStartNewSession}
        onClearHistory={handleClearHistory}
      />
      <div className="flex-1 flex flex-col max-h-screen">
        <header className="px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-200/50 shadow-sm sticky top-0 z-20 flex items-center justify-between gap-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition lg:hidden"
          >
            <HistoryIcon className="w-4 h-4" />
            History
          </button>
          <h1 className="text-lg font-semibold text-slate-800 text-center flex-1">
            QuickInterview AI
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <SettingsIcon className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={handleStartNewSession}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-800 transition shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              New
            </button>
          </div>
        </header>
        <main
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scroll-smooth"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {isAppReady && chatMessages.length === 0 && !isRecording && <WelcomeMessage />}
          {chatMessages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              onGetAnswer={handleGetAnswer}
              onUpdateMessage={handleUpdateMessage}
              onDeleteMessage={handleDeleteMessage}
            />
          ))}
          {isRecording && transcript && (
            <div className="flex justify-end animate-fade-in">
              <div className="bg-blue-500/10 backdrop-blur-sm text-slate-700 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%] break-words border border-blue-200/50">
                <p className="text-sm leading-relaxed">{transcript}</p>
              </div>
            </div>
          )}
          <div ref={chatEndRef} className="h-2" />
        </main>
        <footer className="px-4 py-4 bg-white/90 backdrop-blur-sm border-t border-slate-200/50 safe-area-inset-bottom sticky bottom-0 z-20">
          <div className="flex items-center justify-center gap-3">
            <MicButton isRecording={isRecording} onClick={toggleRecording} />
            {(isRecording || transcript) && (
              <button
                onClick={handleCancelListening}
                className="w-11 h-11 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition shadow-sm"
                aria-label="Cancel listening"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </footer>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={providerSettings}
          onSave={handleSaveProviderSettings}
        />
      </div>
    </div>
  );
};

export default App;