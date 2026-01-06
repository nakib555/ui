
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import type { Message, ModelResponse, Source } from '../../../types';
import { useTts } from '../../../hooks/useTts';
import { parseMessageText } from '../../../utils/messageParser';

export const useAiMessageLogic = (
    msg: Message,
    ttsVoice: string,
    ttsModel: string,
    sendMessage: (message: string, files?: File[], options?: { isHidden?: boolean; isThinkingModeEnabled?: boolean; }) => void,
    isLoading: boolean
) => {
    const { isThinking, executionState } = msg;
    const [elapsed, setElapsed] = useState(0);

    const activeResponse = useMemo((): ModelResponse | null => {
        if (!msg.responses || msg.responses.length === 0) return null;
        return msg.responses[msg.activeResponseIndex] ?? null;
    }, [msg.responses, msg.activeResponseIndex]);

    // Parse the raw text to separate Thinking (CoT) from Final Answer
    const { thinkingText, finalAnswerText: rawFinalAnswerText } = useMemo(() => {
        const text = activeResponse?.text || '';
        const error = !!activeResponse?.error;
        // Use the existing utility to split the stream
        return parseMessageText(text, isThinking ?? false, error);
    }, [activeResponse?.text, activeResponse?.error, isThinking]);

    // Consolidate data from the pre-parsed workflow
    const { plan: agentPlan, executionLog, finalAnswerSegments } = useMemo(() => {
        if (activeResponse?.workflow) {
            return activeResponse.workflow;
        }
        // Fallback for very old chats or initial state
        return { plan: '', executionLog: [], finalAnswerSegments: [] };
    }, [activeResponse?.workflow]);

    // Use backend-parsed final answer for TTS
    // We prefer the parsed one from parser if available, otherwise fallback to workflow's final answer
    const textForTts = rawFinalAnswerText || (activeResponse?.workflow?.finalAnswer || '');
    const { playOrStopAudio, audioState, isPlaying, errorMessage } = useTts(textForTts, ttsVoice, ttsModel);

    // Extract sources from both tool calls and grounding metadata
    const searchSources = useMemo((): Source[] => {
        const allSources: Source[] = [];
        
        // From tool calls (Agent mode)
        if (activeResponse?.toolCallEvents && activeResponse.toolCallEvents.length > 0) {
            const searchEvents = activeResponse.toolCallEvents.filter(e => e.call.name === 'duckduckgoSearch' && e.result);

            for (const event of searchEvents) {
                const sourcesMatch = event.result!.match(/\[SOURCES_PILLS\]([\s\S]*?)\[\/SOURCES_PILLS\]/s);
                if (sourcesMatch && sourcesMatch[1]) {
                    const markdown = sourcesMatch[1].trim();
                    const regex = /-\s*\[([^\]]+)\]\(([^)]+)\)/g;
                    let match;
                    while ((match = regex.exec(markdown)) !== null) {
                        allSources.push({ title: match[1].trim(), uri: match[2].trim() });
                    }
                }
            }
        }
        
        // From groundingMetadata (Chat mode search)
        if (activeResponse?.groundingMetadata?.groundingChunks && Array.isArray(activeResponse.groundingMetadata.groundingChunks)) {
            for (const chunk of activeResponse.groundingMetadata.groundingChunks) {
                if (chunk.web?.uri) {
                    allSources.push({
                        uri: chunk.web.uri,
                        title: chunk.web.title || chunk.web.uri,
                    });
                }
            }
        }

        return Array.from(new Map(allSources.map(s => [s.uri, s])).values());
    }, [activeResponse?.toolCallEvents, activeResponse?.groundingMetadata]);

    const thinkingIsComplete = !isThinking || !!activeResponse?.error;
    
    // We now consider "having thinking process" true if we have a plan OR execution steps
    const hasWorkflow = !!agentPlan || executionLog.length > 0;
    
    // Determine if we have a pure "Thinking" text (Chain of Thought) that isn't just the plan
    const hasThinkingText = thinkingText && thinkingText.trim().length > 0;
    
    const hasFinalAnswer = rawFinalAnswerText && rawFinalAnswerText.trim() !== '';
    const duration = activeResponse?.startTime && activeResponse?.endTime ? (activeResponse.endTime - activeResponse.startTime) / 1000 : null;
    
    // Duration timer
    useEffect(() => {
        if (isThinking && activeResponse?.startTime) {
            const intervalId = setInterval(() => setElapsed((Date.now() - activeResponse.startTime!) / 1000), 100);
            return () => clearInterval(intervalId);
        }
    }, [isThinking, activeResponse?.startTime]);

    const displayDuration = thinkingIsComplete && duration !== null ? duration.toFixed(1) : elapsed.toFixed(1);

    // Streaming Logic: If we are thinking, have a final answer, and no error, we are streaming content.
    const isStreamingFinalAnswer = !!isThinking && hasFinalAnswer && !activeResponse?.error;
    
    // Waiting Logic: If we are thinking, BUT have no thinking process visible (chat mode) and no answer yet.
    // Updated to account for thinkingText availability
    const isWaitingForFinalAnswer = !!isThinking && !hasWorkflow && !hasThinkingText && !hasFinalAnswer && !activeResponse?.error && executionState !== 'pending_approval';
    
    // showApprovalUI logic
    const showApprovalUI = executionState === 'pending_approval' && !!activeResponse?.plan;

    const handleRunCode = useCallback((language: string, code: string) => {
        const userPrompt = `Please execute the following ${language} code block:\n\n\`\`\`${language}\n${code}\n\`\`\``;
        sendMessage(userPrompt, undefined, { isThinkingModeEnabled: true });
    }, [sendMessage]);

    // Fallback parsing for legacy/streaming catch-up if segments missing
    const segmentsToRender = finalAnswerSegments && finalAnswerSegments.length > 0 
        ? finalAnswerSegments 
        : [{ type: 'text', content: rawFinalAnswerText } as any];

    return {
        activeResponse, 
        thinkingText, // Now properly exposed
        finalAnswerText: rawFinalAnswerText, 
        playOrStopAudio, audioState, isPlaying, ttsError: errorMessage,
        searchSources,
        thinkingIsComplete, hasWorkflow, hasThinkingText, hasFinalAnswer, displayDuration, 
        isInitialWait: !hasWorkflow && !hasThinkingText && isWaitingForFinalAnswer,
        isStreamingFinalAnswer, isWaitingForFinalAnswer, showApprovalUI, handleRunCode,
        agentPlan, executionLog, parsedFinalAnswer: segmentsToRender
    };
};
