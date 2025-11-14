import React, { useState } from 'react';
import type { ChatMessage } from '../types';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { CloseIcon } from './icons/CloseIcon';

interface ChatBubbleProps {
  message: ChatMessage;
  onDeleteMessage: (id: number) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onDeleteMessage }) => {
  const [copied, setCopied] = useState(false);
  
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
      <div className={`px-4 py-3 max-w-[85%] sm:max-w-md break-words ${bubbleStyles} relative group`}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
          {!isUser && !message.isFinal && (
            <span className="inline-block w-1.5 h-4 bg-slate-400 ml-1.5 align-middle animate-blink" />
          )}
        </p>
        {isUser && (
          <button
            onClick={() => onDeleteMessage(message.id)}
            className="absolute -top-1.5 -right-1.5 p-1.5 bg-red-500/90 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400 active:scale-95"
            aria-label="Delete message"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        )}
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
    </div>
  );
};