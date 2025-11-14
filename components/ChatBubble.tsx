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
    ? 'bg-blue-500 text-white rounded-2xl rounded-br-none'
    : 'bg-white text-gray-800 rounded-2xl rounded-bl-none shadow-sm';
    
  return (
    <div className={`flex ${bubbleAlignment}`} data-message-id={message.id}>
      <div className={`p-4 max-w-md md:max-w-lg lg:max-w-2xl break-words ${bubbleStyles}`}>
        {isUser && isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full bg-blue-400 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white placeholder-blue-200"
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
                className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
                aria-label="Delete message and restart recording"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleAnswerClick}
                className="bg-white text-blue-500 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Answer
              </button>
            </div>
          </div>
        ) : (
          <div className="relative group">
            <p className="whitespace-pre-wrap">
              {message.content}
              {!isUser && !message.isFinal && (
                <span className="inline-block w-2 h-5 bg-gray-700 ml-1 animate-pulse" style={{ animation: 'blink 1s step-end infinite' }} />
              )}
            </p>
            {!isUser && message.isFinal && (
              <button
                onClick={handleCopyToClipboard}
                className="absolute -top-2 -right-2 p-1.5 bg-gray-200 rounded-full text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Copy to clipboard"
              >
                {copied ? <CheckIcon className="w-4 h-4 text-green-600" /> : <CopyIcon className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes blink {
          from, to { background-color: transparent; }
          50% { background-color: #4B5563; } /* gray-700 */
        }
      `}</style>
    </div>
  );
};