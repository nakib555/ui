/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, forwardRef, useImperativeHandle, useCallback, useMemo, Suspense, useEffect } from 'react';
import type { Message, Source } from '../../types';
import { MessageComponent } from './Message';
import type { MessageFormHandle } from './MessageForm/index';
import { AnimatePresence, motion as motionTyped } from 'framer-motion';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useViewport } from '../../hooks/useViewport';
import { ChatSkeleton } from '../UI/ChatSkeleton';

const motion = motionTyped as any;

// Safe lazy loads
// We keep WelcomeScreen lazy as it's not time-critical for interaction feedback
const WelcomeScreen = React.lazy(() => import('./WelcomeScreen/index').then(m => ({ default: m.WelcomeScreen })));

export type MessageListHandle = {
  scrollToBottom: () => void;
  scrollToMessage: (messageId: string) => void;
};

type MessageListProps = {
  messages: Message[];
  sendMessage: (message: string, files?: File[], options?: { isHidden?: boolean; isThinkingModeEnabled?: boolean; }) => void;
  isLoading: boolean;
  ttsVoice: string;
  ttsModel: string;
  currentChatId: string | null;
  onShowSources: (sources: Source[]) => void;
  approveExecution: (editedPlan: string) => void;
  denyExecution: () => void;
  messageFormRef: React.RefObject<MessageFormHandle | null>;
  onRegenerate: (messageId: string) => void;
  onSetActiveResponseIndex: (messageId: string, index: number) => void;
  isAgentMode: boolean;
  onEditMessage?: (messageId: string, newText: string) => void;
  onNavigateBranch?: (messageId: string, direction: 'next' | 'prev') => void;
};

// Wrapper to inject context (like previous user message)
const MessageWrapper: React.FC<{ 
    msg: Message;
    index: number;
    messages: Message[];
    props: Omit<MessageListProps, 'messages'>;
}> = ({ msg, index, messages, props }) => {
    // Determine context for AI messages (the prompt that triggered it)
    let userQuery = '';
    if (msg.role === 'model') {
        // Find the most recent user message before this one
        for (let i = index - 1; i >= 0; i--) {
            if (messages[i].role === 'user' && !messages[i].isHidden) {
                userQuery = messages[i].text;
                break;
            }
        }
    }

    return (
        <MessageComponent 
            key={msg.id} 
            msg={msg} 
            {...props}
            // Pass the custom prop to AiMessage via MessageComponent
            {...({ userQuery } as any)} 
        />
    );
};

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(({ 
    messages, sendMessage, isLoading, ttsVoice, ttsModel, currentChatId, 
    onShowSources, approveExecution, 
    denyExecution, messageFormRef, onRegenerate, onSetActiveResponseIndex,
    isAgentMode, onEditMessage, onNavigateBranch
}, ref) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const { isDesktop } = useViewport();

  // Safeguard against undefined messages prop
  const visibleMessages = useMemo(() => (messages || []).filter(msg => !msg.isHidden), [messages]);
  
  // Track previous length to detect new messages
  const prevMessagesLength = useRef(visibleMessages.length);

  // Auto-scroll on new message
  useEffect(() => {
      const currentLength = visibleMessages.length;
      const prevLength = prevMessagesLength.current;

      if (currentLength > prevLength) {
          const lastMessage = visibleMessages[currentLength - 1];
          // Scroll if it's a user message (always show what I just sent)
          // OR if we were already at the bottom (standard sticky behavior)
          const shouldScroll = lastMessage?.role === 'user' || atBottom;

          if (shouldScroll) {
              // Use setTimeout to ensure DOM has updated with the new item
              setTimeout(() => {
                  virtuosoRef.current?.scrollToIndex({ 
                      index: currentLength - 1, 
                      align: 'end',
                      behavior: 'smooth' 
                  });
              }, 50);
          }
      }
      
      prevMessagesLength.current = currentLength;
  }, [visibleMessages, atBottom]);

  // Expose scroll methods to parent via ref
  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      // Use smooth scrolling only when triggered manually
      virtuosoRef.current?.scrollToIndex({ index: visibleMessages.length - 1, behavior: 'smooth', align: 'end' });
    },
    scrollToMessage: (messageId: string) => {
        // We need to find the index of the message in the *visible* list
        const index = visibleMessages.findIndex(m => m.id === messageId);
        
        if (index !== -1 && virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({ index, behavior: 'smooth', align: 'center' });
        }
    }
  }));

  const handleScrollToBottom = useCallback(() => {
      virtuosoRef.current?.scrollToIndex({ index: visibleMessages.length - 1, behavior: 'smooth', align: 'end' });
  }, [visibleMessages.length]);

  return (
    <div className="flex-1 min-h-0 relative w-full">
      {/* 
        LOGIC FIX: Prioritize Skeleton if data is loading OR if the list is empty but still loading.
        This handles the edge case where messages=[] but isLoading=true (e.g. initial fetch of a chat).
        We check visibleMessages.length === 0 specifically to show Skeleton instead of WelcomeScreen.
      */}
      {visibleMessages.length === 0 ? (
        isLoading ? (
            // Show Skeleton immediately when loading a chat or if history is fetching
            <div className="h-full w-full bg-transparent">
                <ChatSkeleton />
            </div>
        ) : (
            // Only show Welcome Screen if NOT loading and EMPTY
            <div className="h-full overflow-y-auto custom-scrollbar">
                 <Suspense fallback={<div className="h-full flex items-center justify-center"><div className="animate-spin w-6 h-6 border-2 border-indigo-500 rounded-full border-t-transparent"></div></div>}>
                    <WelcomeScreen sendMessage={sendMessage} />
                 </Suspense>
            </div>
        )
      ) : (
        <div className="h-full" role="log" aria-live="polite">
            <Virtuoso
                ref={virtuosoRef}
                style={{ height: '100%', width: '100%' }}
                data={visibleMessages}
                // 'auto' works well, but for code blocks, slightly higher threshold avoids jitter
                followOutput={atBottom ? "auto" : false} 
                increaseViewportBy={600} // Increased significantly to preload complex code blocks
                overscan={400} 
                initialTopMostItemIndex={visibleMessages.length - 1}
                // Removed alignToBottom to fix large top gap; messages will naturally start at the top.
                atBottomStateChange={(isAtBottom) => {
                    setAtBottom(isAtBottom);
                    setShowScrollButton(!isAtBottom);
                }}
                atBottomThreshold={100} // More tolerant threshold for "stick to bottom" logic
                className="custom-scrollbar"
                itemContent={(index, msg) => (
                    <div className="px-4 sm:px-6 md:px-8 max-w-4xl mx-auto w-full py-2 sm:py-4">
                        <MessageWrapper 
                            msg={msg}
                            index={index}
                            messages={visibleMessages}
                            props={{
                                sendMessage, isLoading, ttsVoice, ttsModel, currentChatId,
                                onShowSources, approveExecution, denyExecution, messageFormRef,
                                onRegenerate, onSetActiveResponseIndex, isAgentMode, onEditMessage,
                                onNavigateBranch
                            }}
                        />
                    </div>
                )}
                components={{
                    Header: () => <div className="h-4 md:h-6" />, // Reduced padding
                    Footer: () => <div className="h-32 md:h-48" />
                }}
            />
        </div>
      )}

      <AnimatePresence>
        {showScrollButton && (
          <motion.div
             initial={{ opacity: 0, y: 10, scale: 0.9 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: 10, scale: 0.9 }}
             transition={{ type: "spring", stiffness: 400, damping: 30 }}
             className="absolute bottom-6 md:bottom-4 inset-x-0 flex justify-center pointer-events-none z-30"
          >
            <button
                onClick={handleScrollToBottom}
                className="pointer-events-auto group flex items-center gap-2 px-4 py-2.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-xl hover:shadow-2xl border border-gray-200/50 dark:border-white/10 rounded-full transition-all transform hover:-translate-y-1 active:scale-95 ring-1 ring-black/5 dark:ring-white/5"
                aria-label="Scroll to latest messages"
            >
                {!atBottom && isLoading && (
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                )}
                <span>Scroll to Bottom</span>
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});