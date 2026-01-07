/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo } from 'react';
import type { Message, Source } from '../../types';
import { UserMessage } from './UserMessage';
import { AiMessage } from './AiMessage/index';
import type { MessageFormHandle } from './MessageForm/index';

const MessageComponentRaw: React.FC<{ 
    msg: Message;
    isLoading: boolean;
    sendMessage: (message: string, files?: File[], options?: { isHidden?: boolean; isThinkingModeEnabled?: boolean; }) => void; 
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
    userQuery?: string; // New optional prop
    onEditMessage?: (messageId: string, newText: string) => void;
    onNavigateBranch?: (messageId: string, direction: 'next' | 'prev') => void;
}> = ({ 
    msg, isLoading, sendMessage, ttsVoice, ttsModel, currentChatId, 
    onShowSources, approveExecution, denyExecution, messageFormRef,
    onRegenerate, onSetActiveResponseIndex, isAgentMode, userQuery,
    onEditMessage, onNavigateBranch
}) => {
  const messageContent = () => {
    if (msg.role === 'user') {
        return (
            <UserMessage 
                msg={msg} 
                onEdit={onEditMessage ? (newText) => onEditMessage(msg.id, newText) : undefined} 
                onBranchSwitch={onNavigateBranch ? (dir) => onNavigateBranch(msg.id, dir) : undefined}
            />
        );
    }
    
    if (msg.role === 'model') {
        return (
            <AiMessage 
                msg={msg} 
                isLoading={isLoading}
                sendMessage={sendMessage} 
                ttsVoice={ttsVoice}
                ttsModel={ttsModel} 
                currentChatId={currentChatId} 
                onShowSources={onShowSources}
                approveExecution={approveExecution}
                denyExecution={denyExecution}
                messageFormRef={messageFormRef}
                onRegenerate={onRegenerate}
                onSetActiveResponseIndex={onSetActiveResponseIndex}
                isAgentMode={isAgentMode}
                userQuery={userQuery}
            />
        );
    }
    return null;
  };

  return (
    <div id={`message-${msg.id}`} className="contain-content">
        {messageContent()}
    </div>
  );
};

export const MessageComponent = memo(MessageComponentRaw, (prevProps, nextProps) => {
    const prevMsg = prevProps.msg;
    const nextMsg = nextProps.msg;

    // Retrieve the specific response objects being displayed
    const prevActiveResponse = prevMsg.responses?.[prevMsg.activeResponseIndex];
    const nextActiveResponse = nextMsg.responses?.[nextMsg.activeResponseIndex];

    const msgChanged = 
        prevMsg.text !== nextMsg.text ||
        prevMsg.isThinking !== nextMsg.isThinking ||
        prevMsg.activeResponseIndex !== nextMsg.activeResponseIndex ||
        prevMsg.activeVersionIndex !== nextMsg.activeVersionIndex ||
        prevMsg.responses?.length !== nextMsg.responses?.length ||
        prevMsg.versions?.length !== nextMsg.versions?.length ||
        prevMsg.executionState !== nextMsg.executionState ||
        // CRITICAL FIX: Check if the content of the active response has changed (streaming text, tools, errors)
        prevActiveResponse !== nextActiveResponse;

    // Check if userQuery changed (rare, but good for correctness)
    if (prevProps.userQuery !== nextProps.userQuery) return false;

    // If the message content hasn't changed, and it's not the last message (which might be loading),
    // we generally don't need to re-render. 
    // However, we must check isLoading to handle the global loading state change.
    
    return !msgChanged && prevProps.isLoading === nextProps.isLoading && prevProps.ttsVoice === nextProps.ttsVoice && prevProps.ttsModel === nextProps.ttsModel;
});