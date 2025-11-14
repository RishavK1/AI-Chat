import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { generateAnswerStream } from './services/geminiService';
import type { ChatMessage } from './types';
import { MicButton } from './components/MicButton';
import { ChatBubble } from './components/ChatBubble';
import { WelcomeMessage } from './components/WelcomeMessage';

const App: React.FC = () => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleNewTranscript = useCallback((transcript: string) => {
    if (transcript) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: 'user',
          content: transcript,
          isFinal: true,
        },
      ]);
    }
  }, []);

  const { isRecording, transcript, startRecording, stopRecording } =
    useSpeechRecognition({ onStop: handleNewTranscript });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, transcript]);

  const handleGetAnswer = async (question: string) => {
    setIsGenerating(true);
    const modelMessageId = Date.now();

    // Add an empty message shell for the streaming response
    setChatMessages((prev) => [
      ...prev,
      { id: modelMessageId, role: 'model', content: '', isFinal: false },
    ]);

    try {
      const onChunk = (chunk: string) => {
        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId
              ? { ...msg, content: msg.content + chunk }
              : msg
          )
        );
      };

      await generateAnswerStream(question, onChunk);

    } catch (error) {
      console.error('Error generating answer:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Sorry, I couldn't generate an answer. Please try again.";
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId
            ? {
                ...msg,
                content: errorMessage,
              }
            : msg
        )
      );
    } finally {
      // Finalize the message state
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId ? { ...msg, isFinal: true } : msg
        )
      );
      setIsGenerating(false);
      // Automatically start listening for the next question.
      startRecording();
    }
  };

  const handleUpdateMessage = (id: number, newContent: string) => {
    setChatMessages(prev => 
        prev.map(msg => msg.id === id ? {...msg, content: newContent} : msg)
    );
  };

  const handleDeleteMessage = (id: number) => {
    setChatMessages(prev => prev.filter(msg => msg.id !== id));
    // Start recording immediately after deleting
    if (!isRecording) {
      startRecording();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      // If the user starts a new recording and the last message is an unanswered
      // user question, remove it to allow for a clean re-take.
      setChatMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'user') {
          return prev.slice(0, -1);
        }
        return prev;
      });
      startRecording();
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-100 font-sans">
      <header className="p-4 text-center border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">QuickInterview AI</h1>
      </header>
      <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 && !isRecording && <WelcomeMessage />}
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
          <div className="flex justify-end">
            <div className="bg-blue-100 text-gray-800 rounded-2xl rounded-br-none p-3 max-w-sm break-words animate-pulse">
                {transcript}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>
      <footer className="p-4 bg-gray-100">
        <MicButton isRecording={isRecording} onClick={toggleRecording} />
      </footer>
    </div>
  );
};

export default App;