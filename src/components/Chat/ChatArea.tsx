/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useCallback } from 'react';
import { motion as motionTyped, AnimatePresence } from 'framer-motion';
const motion = motionTyped as any;
import { MessageList, type MessageListHandle } from './MessageList';
import { MessageForm, type MessageFormHandle } from './MessageForm/index';
import type { Message, Source } from '../../types';

type ChatAreaProps = {
  messages: Message[];
  isLoading: boolean;
  isAppLoading: boolean;
  sendMessage: (message: string, files?: File[], options?: { isHidden?: boolean; isThinkingModeEnabled?: boolean; }) => void;
  onCancel: () => void;
  ttsVoice: string;
  ttsModel: string;
  setTtsVoice: (voice: string) => void;
  currentChatId: string | null;
  activeModel: string;
  onShowSources: (sources: Source[]) => void;
  approveExecution: (editedPlan: string) => void;
  denyExecution: () => void;
  messageListRef: React.RefObject<MessageListHandle | null>;
  onRegenerate: (messageId: string) => void;
  onSetActiveResponseIndex: (messageId: string, index: number) => void;
  isAgentMode: boolean;
  setIsAgentMode: (isAgent: boolean) => void;
  backendStatus: 'online' | 'offline' | 'checking';
  backendError: string | null;
  onRetryConnection: () => void;
  hasApiKey: boolean;
  onEditMessage?: (messageId: string, newText: string) => void;
  onNavigateBranch?: (messageId: string, direction: 'next' | 'prev') => void;
  onInputFocusChange?: (focused: boolean) => void;
};

export const ChatArea = ({ 
    messages, isLoading, isAppLoading, sendMessage, onCancel, 
    ttsVoice, ttsModel, setTtsVoice, currentChatId, activeModel,
    onShowSources, approveExecution, denyExecution,
    messageListRef, onRegenerate, onSetActiveResponseIndex,
    isAgentMode, setIsAgentMode, backendStatus, backendError, onRetryConnection, hasApiKey,
    onEditMessage, onNavigateBranch, onInputFocusChange
}: ChatAreaProps) => {
  const messageFormRef = useRef<MessageFormHandle>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const dragCounter = useRef(0);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      messageFormRef.current?.attachFiles(Array.from(files));
    }
  };

  const handleSetActiveResponseIndex = useCallback((messageId: string, index: number) => {
    if (currentChatId) {
      onSetActiveResponseIndex(messageId, index);
    }
  }, [currentChatId, onSetActiveResponseIndex]);

  return (
    <div 
      className="flex-1 flex flex-col min-h-0 relative"
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-400/10 border-2 border-dashed border-indigo-500 dark:border-indigo-400 rounded-2xl z-30 flex items-center justify-center m-4 pointer-events-none"
          >
            <div className="text-center font-bold text-indigo-600 dark:text-indigo-300 bg-white/80 dark:bg-black/80 px-6 py-4 rounded-xl shadow-lg backdrop-blur-sm">
              <p className="text-lg">Drop files to attach</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <MessageList
          key={currentChatId || 'empty'}
          ref={messageListRef}
          messages={messages} 
          sendMessage={sendMessage} 
          isLoading={isLoading} 
          ttsVoice={ttsVoice} 
          ttsModel={ttsModel}
          currentChatId={currentChatId}
          onShowSources={onShowSources}
          approveExecution={approveExecution}
          denyExecution={denyExecution}
          messageFormRef={messageFormRef}
          onRegenerate={onRegenerate}
          onSetActiveResponseIndex={handleSetActiveResponseIndex}
          isAgentMode={isAgentMode}
          onEditMessage={onEditMessage}
          onNavigateBranch={onNavigateBranch}
      />

      <AnimatePresence>
        {backendStatus === 'offline' && (
          <motion.div
            className="px-4 sm:px-6 md:px-8 py-2 max-w-4xl mx-auto w-full"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="bg-red-500/10 dark:bg-red-900/20 border border-red-500/20 text-red-700 dark:text-red-300 text-sm rounded-lg p-3 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 text-red-500 dark:text-red-400">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-red-800 dark:text-red-200">Connection Error</p>
                <p>{backendError} Retrying automatically...</p>
              </div>
              <button 
                onClick={onRetryConnection}
                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-800/30 dark:hover:bg-red-800/50 text-red-800 dark:text-red-200 text-xs font-semibold rounded-md transition-colors whitespace-nowrap"
              >
                Retry Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex-shrink-0 px-4 pt-2 pb-2 sm:px-6 md:px-8 z-20 max-w-4xl mx-auto w-full">
        <div className="relative w-full">
          <MessageForm 
            ref={messageFormRef}
            onSubmit={sendMessage} 
            isLoading={isLoading} 
            isAppLoading={isAppLoading}
            backendStatus={backendStatus}
            onCancel={onCancel}
            isAgentMode={isAgentMode}
            setIsAgentMode={setIsAgentMode}
            messages={messages}
            hasApiKey={hasApiKey}
            ttsVoice={ttsVoice}
            setTtsVoice={setTtsVoice}
            currentChatId={currentChatId}
            activeModel={activeModel}
            onFocusChange={onInputFocusChange}
          />
        </div>
      </div>
    </div>
  );
};