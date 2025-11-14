import React, { useState, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { CloseIcon } from './icons/CloseIcon';

interface ChatBubbleProps {
  message: ChatMessage;
  onGetAnswer: (question: string) => void;
  onUpdateMessage: (id: number, content: string) => void;
  onDeleteMessage: (id: number) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onGetAnswer, onUpdateMessage, onDeleteMessage }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect if device is mobile/touch device
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isTouchDevice && isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Automatically enter edit mode for the user's latest finalized question
    if (message.role === 'user' && message.isFinal && !isEditing) {
       const allMessages = document.querySelectorAll('[data-message-id]');
       const lastMessageId = allMessages.length > 0 ? allMessages[allMessages.length-1].getAttribute('data-message-id') : null;
       if (lastMessageId && parseInt(lastMessageId, 10) <= message.id) {
         setIsEditing(true);
       }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.isFinal, message.role, message.id]);

  const handleAnswerClick = () => {
    setIsEditing(false);
    onGetAnswer(editedContent);
    onUpdateMessage(message.id, editedContent);
  };
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isUser = message.role === 'user';
  
  const bubbleAlignment = isUser ? 'justify-end' : 'justify-start';
  const bubbleStyles = isUser
    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-sm shadow-sm'
    : 'bg-white text-slate-800 rounded-2xl rounded-bl-sm shadow-sm border border-slate-100';
    
  return (
    <div className={`flex ${bubbleAlignment} animate-fade-in`} data-message-id={message.id}>
      <div className={`px-4 py-3 max-w-[85%] sm:max-w-md break-words ${bubbleStyles}`}>
        {isUser && isEditing ? (
          <div className="flex flex-col gap-3">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full bg-blue-400/90 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 placeholder-blue-100 text-sm resize-none"
              rows={3}
              readOnly={isMobile}
              onFocus={(e) => {
                if (isMobile) {
                  e.currentTarget.blur();
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => onDeleteMessage(message.id)}
                className="bg-red-500/90 hover:bg-red-600 text-white p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center active:scale-95 shadow-sm"
                aria-label="Delete message and restart recording"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleAnswerClick}
                className="bg-white/95 hover:bg-white text-blue-600 font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 active:scale-95 shadow-sm text-sm"
              >
                Answer
              </button>
            </div>
          </div>
        ) : (
          <div className="relative group">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
              {!isUser && !message.isFinal && (
                <span className="inline-block w-1.5 h-4 bg-slate-400 ml-1.5 align-middle animate-blink" />
              )}
            </p>
            {!isUser && message.isFinal && (
              <button
                onClick={handleCopyToClipboard}
                className="absolute -top-1.5 -right-1.5 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 opacity-0 group-hover:opacity-100 transition-all duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-400 active:scale-95"
                aria-label="Copy to clipboard"
              >
                {copied ? <CheckIcon className="w-3.5 h-3.5 text-green-600" /> : <CopyIcon className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};