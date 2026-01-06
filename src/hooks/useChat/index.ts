/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';
import { type Message, type ChatSession, ModelResponse, BrowserSession } from '../../types';
import { fileToBase64 } from '../../utils/fileUtils';
import { useChatHistory } from '../useChatHistory';
import { generateChatTitle, parseApiError, generateFollowUpSuggestions } from '../../services/gemini/index';
import { fetchFromApi } from '../../utils/api';
import { toolImplementations as frontendToolImplementations } from '../../tools';
import { processBackendStream } from '../../services/agenticLoop/stream-processor';
import { parseAgenticWorkflow } from '../../utils/workflowParsing';

const generateId = () => Math.random().toString(36).substring(2, 9);

type ChatSettings = { 
    systemPrompt: string; 
    aboutUser?: string;
    aboutResponse?: string;
    temperature: number; 
    maxOutputTokens: number; 
    imageModel: string;
    videoModel: string;
};

export const useChat = (
    initialModel: string, 
    settings: ChatSettings, 
    memoryContent: string, 
    isAgentMode: boolean, 
    apiKey: string,
    onShowToast?: (message: string, type: 'info' | 'success' | 'error') => void
) => {
    const chatHistoryHook = useChatHistory();
    const { chatHistory, currentChatId, updateChatTitle, updateChatProperty } = chatHistoryHook;
    const abortControllerRef = useRef<AbortController | null>(null);
    const requestIdRef = useRef<string | null>(null); // For explicit cancellation
    const testResolverRef = useRef<((value: Message | PromiseLike<Message>) => void) | null>(null);
    
    // Track title generation attempts to prevent loops
    const titleGenerationAttemptedRef = useRef<Set<string>>(new Set());


    // Refs to hold the latest state for callbacks
    const chatHistoryRef = useRef(chatHistory);
    useEffect(() => { chatHistoryRef.current = chatHistory; }, [chatHistory]);
    const currentChatIdRef = useRef(currentChatId);
    useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);

    const messages = useMemo(() => {
        return chatHistory.find(c => c.id === currentChatId)?.messages || [];
    }, [chatHistory, currentChatId]);

    const isLoading = useMemo(() => {
        if (!currentChatId) return false;
        return chatHistory.find(c => c.id === currentChatId)?.isLoading ?? false;
    }, [chatHistory, currentChatId]);

    // Effect to resolve test promise when loading completes
    useEffect(() => {
        if (!isLoading && testResolverRef.current && currentChatId) {
            const chat = chatHistory.find(c => c.id === currentChatId);
            if (chat && chat.messages && chat.messages.length > 0) {
                const lastMessage = chat.messages[chat.messages.length - 1];
                if (lastMessage.role === 'model') {
                    testResolverRef.current(lastMessage);
                    testResolverRef.current = null;
                }
            }
        }
    }, [isLoading, chatHistory, currentChatId]);

    // Helper to send tool response with robust retry logic
    const sendToolResponse = useCallback(async (callId: string, payload: any) => {
        let attempts = 0;
        const maxAttempts = 4; // Increased attempts
        const baseDelay = 1000;

        while (attempts < maxAttempts) {
            try {
                const response = await fetchFromApi('/api/handler?task=tool_response', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ callId, ...payload }),
                });

                if (response.ok) return;

                // If server says 404, the session is likely gone (server restart). 
                // Retrying won't help, so we abort to prevent infinite loops.
                if (response.status === 404) {
                    console.warn(`[FRONTEND] Backend session lost (404) for tool response ${callId}. Stopping retries.`);
                    return;
                }
                
                throw new Error(`Backend returned status ${response.status}`);
            } catch (e) {
                const err = e as Error;
                // If global version mismatch handler triggered, stop everything
                if (err.message === 'Version mismatch') throw err;

                attempts++;
                
                if (attempts >= maxAttempts) {
                    console.error(`[FRONTEND] Giving up on sending tool response for ${callId} after ${maxAttempts} attempts.`);
                    // We don't throw here to avoid crashing the whole UI, just log the failure
                    return;
                }
                
                // Exponential backoff with jitter: 1s, 2s, 4s... + random jitter
                const delay = baseDelay * Math.pow(2, attempts - 1) + (Math.random() * 500);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }, []);

    const handleFrontendToolExecution = useCallback(async (callId: string, toolName: string, toolArgs: any) => {
        try {
            let result: any;
            if (toolName === 'approveExecution') {
                result = toolArgs; // The edited plan string
            } else if (toolName === 'denyExecution') {
                result = false;
            } else {
                 const toolImplementation = (frontendToolImplementations as any)[toolName];
                 if (!toolImplementation) throw new Error(`Frontend tool not found: ${toolName}`);
                 result = await toolImplementation(toolArgs);
            }
            
            await sendToolResponse(callId, { result });

        } catch (error) {
            if ((error as Error).message === 'Version mismatch') return;

            const parsedError = parseApiError(error);
            console.error(`[FRONTEND] Tool '${toolName}' execution failed. Sending error to backend.`, { callId, error: parsedError });
            
            await sendToolResponse(callId, { error: parsedError.message });
        }
    }, [sendToolResponse]);


    const cancelGeneration = useCallback(() => {
        // Abort the frontend fetch immediately for responsiveness
        abortControllerRef.current?.abort();
        
        // Send the explicit cancel request to the backend fire-and-forget style
        if (requestIdRef.current) {
            fetchFromApi('/api/handler?task=cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: requestIdRef.current }),
            }).catch(error => console.error('[FRONTEND] Failed to send cancel request:', error));
            requestIdRef.current = null;
        }
        
        const chatId = currentChatIdRef.current;
        if (chatId) {
            const currentChat = chatHistoryRef.current.find(c => c.id === chatId);
            
            if (currentChat?.messages?.length) {
                const lastMessage = currentChat.messages[currentChat.messages.length - 1];
                
                // 1. Mark as not thinking
                // 2. Mark with specific STOPPED code so UI renders "Stopped" instead of crashing or showing generic error
                chatHistoryHook.updateActiveResponseOnMessage(chatId, lastMessage.id, () => ({
                    error: { 
                        code: 'STOPPED_BY_USER', 
                        message: 'Generation stopped by user.',
                        details: 'You interrupted the model.'
                    },
                    endTime: Date.now()
                }));
                chatHistoryHook.updateMessage(chatId, lastMessage.id, { isThinking: false });
                chatHistoryHook.completeChatLoading(chatId);

                // Fallback for plan approval state cancellation if we are stuck there
                if (lastMessage.executionState === 'pending_approval') {
                     const activeResponse = lastMessage.responses?.[lastMessage.activeResponseIndex];
                     const callId = activeResponse?.plan?.callId || 'plan-approval';
                     handleFrontendToolExecution(callId, 'denyExecution', false);
                }
            }
        }
    }, [handleFrontendToolExecution, chatHistoryHook]);
    
    const { updateMessage } = chatHistoryHook;
    
    const approveExecution = useCallback((editedPlan: string) => {
        const chatId = currentChatIdRef.current;
        if (chatId) {
            const currentChat = chatHistoryRef.current.find(c => c.id === chatId);
            // Safe access check for messages array
            if (currentChat?.messages?.length) {
                const lastMessage = currentChat.messages[currentChat.messages.length - 1];
                const activeResponse = lastMessage.responses?.[lastMessage.activeResponseIndex];
                const callId = activeResponse?.plan?.callId || 'plan-approval';

                updateMessage(chatId, lastMessage.id, { executionState: 'approved' });
                handleFrontendToolExecution(callId, 'approveExecution', editedPlan);
            }
        }
    }, [updateMessage, handleFrontendToolExecution]);
  
    const denyExecution = useCallback(() => {
        const chatId = currentChatIdRef.current;
        if (chatId) {
            const currentChat = chatHistoryRef.current.find(c => c.id === chatId);
            // Safe access check for messages array
            if (currentChat?.messages?.length) {
                const lastMessage = currentChat.messages[currentChat.messages.length - 1];
                const activeResponse = lastMessage.responses?.[lastMessage.activeResponseIndex];
                const callId = activeResponse?.plan?.callId || 'plan-approval';

                updateMessage(chatId, lastMessage.id, { executionState: 'denied' });
                handleFrontendToolExecution(callId, 'denyExecution', false);
            }
        }
    }, [updateMessage, handleFrontendToolExecution]);

    const startBackendChat = async (
        task: 'chat' | 'regenerate',
        chatId: string,
        messageId: string, // The ID of the model message to update
        newMessage: Message | null, // The new user message (null for regenerate or explicit null if user message already in history)
        chatConfig: Pick<ChatSession, 'model' | 'temperature' | 'maxOutputTokens' | 'imageModel' | 'videoModel'>,
        runtimeSettings: { isAgentMode: boolean } & ChatSettings
    ) => {
        abortControllerRef.current = new AbortController();

        try {
            const requestPayload = {
                chatId: chatId,
                messageId: messageId,
                model: chatConfig.model,
                newMessage: newMessage, // Send message object or null
                settings: {
                    isAgentMode: runtimeSettings.isAgentMode,
                    systemPrompt: runtimeSettings.systemPrompt,
                    aboutUser: runtimeSettings.aboutUser,
                    aboutResponse: runtimeSettings.aboutResponse,
                    temperature: chatConfig.temperature,
                    maxOutputTokens: chatConfig.maxOutputTokens || undefined,
                    imageModel: runtimeSettings.imageModel,
                    videoModel: runtimeSettings.videoModel,
                    memoryContent,
                }
            };

            // Log payload for debugging
            console.log('[Frontend] 📤 Outgoing Chat Request:', requestPayload);

            const response = await fetchFromApi(`/api/handler?task=${task}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortControllerRef.current.signal,
                body: JSON.stringify(requestPayload),
            });

            if (!response.ok) {
                let errorMessage = `Request failed with status ${response.status}`;
                let errorDetails: any = null;
                try {
                    const errorJson = await response.json();
                    const struct = errorJson.error || errorJson;
                    errorMessage = struct.message || errorMessage;
                    errorDetails = struct;
                } catch (e) {
                    errorMessage = await response.text() || errorMessage;
                }
                const error = new Error(errorMessage);
                if (errorDetails) {
                    (error as any).code = errorDetails.code;
                    (error as any).details = errorDetails.details;
                    (error as any).suggestion = errorDetails.suggestion;
                }
                throw error;
            }
            
            if (!response.body) throw new Error("Response body is missing");
            
            // Delegate to the stream processor service
            await processBackendStream(
                response,
                {
                    onStart: (requestId) => {
                        requestIdRef.current = requestId;
                    },
                    onTextChunk: (delta) => {
                        // Append delta to current text
                        chatHistoryHook.updateActiveResponseOnMessage(chatId, messageId, (current) => {
                            const newText = (current.text || '') + delta;
                            // Client-side workflow parsing
                            const parsedWorkflow = parseAgenticWorkflow(newText, current.toolCallEvents || [], false);
                            return { text: newText, workflow: parsedWorkflow };
                        });
                    },
                    onWorkflowUpdate: () => {
                        // Deprecated: Workflow is now computed client-side in onTextChunk/onTool*
                    },
                    onToolCallStart: (toolCallEvents) => {
                        const newEvents = toolCallEvents.map((toolEvent: any) => ({
                            id: toolEvent.id,
                            call: toolEvent.call,
                            startTime: Date.now()
                        }));
                        chatHistoryHook.updateActiveResponseOnMessage(chatId, messageId, (r) => {
                            const updatedEvents = [...(r.toolCallEvents || []), ...newEvents];
                            const parsedWorkflow = parseAgenticWorkflow(r.text || '', updatedEvents, false);
                            return { toolCallEvents: updatedEvents, workflow: parsedWorkflow };
                        });
                    },
                    onToolUpdate: (payload) => {
                        chatHistoryHook.updateActiveResponseOnMessage(chatId, messageId, (r) => {
                            const updatedEvents = r.toolCallEvents?.map(tc => {
                                if (tc.id === payload.id) {
                                    const session = (tc.browserSession || { url: payload.url || '', logs: [], status: 'running' }) as BrowserSession;
                                    if (payload.log) session.logs = [...session.logs, payload.log];
                                    if (payload.screenshot) session.screenshot = payload.screenshot;
                                    if (payload.title) session.title = payload.title;
                                    if (payload.url) session.url = payload.url;
                                    if (payload.status) session.status = payload.status;
                                    return { ...tc, browserSession: { ...session } };
                                }
                                return tc;
                            });
                            const parsedWorkflow = parseAgenticWorkflow(r.text || '', updatedEvents || [], false);
                            return { toolCallEvents: updatedEvents, workflow: parsedWorkflow };
                        });
                    },
                    onToolCallEnd: (payload) => {
                        chatHistoryHook.updateActiveResponseOnMessage(chatId, messageId, (r) => {
                            const updatedEvents = r.toolCallEvents?.map(tc => tc.id === payload.id ? { ...tc, result: payload.result, endTime: Date.now() } : tc);
                            const parsedWorkflow = parseAgenticWorkflow(r.text || '', updatedEvents || [], false);
                            return { toolCallEvents: updatedEvents, workflow: parsedWorkflow };
                        });
                    },
                    onPlanReady: (plan) => {
                        const payload = plan as any; 
                        chatHistoryHook.updateActiveResponseOnMessage(chatId, messageId, () => ({ plan: payload }));
                        chatHistoryHook.updateMessage(chatId, messageId, { executionState: 'pending_approval' });
                    },
                    onFrontendToolRequest: (callId, toolName, toolArgs) => {
                        handleFrontendToolExecution(callId, toolName, toolArgs);
                    },
                    onComplete: (payload) => {
                        chatHistoryHook.updateActiveResponseOnMessage(chatId, messageId, (r) => {
                            const finalWorkflow = parseAgenticWorkflow(payload.finalText, r.toolCallEvents || [], true);
                            return { 
                                text: payload.finalText, 
                                endTime: Date.now(), 
                                groundingMetadata: payload.groundingMetadata,
                                workflow: finalWorkflow 
                            };
                        });
                    },
                    onError: (error) => {
                        chatHistoryHook.updateActiveResponseOnMessage(chatId, messageId, () => ({ error, endTime: Date.now() }));
                    },
                    onCancel: () => {
                        if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
                            abortControllerRef.current.abort();
                        }
                    }
                },
                abortControllerRef.current.signal
            );

        } catch (error) {
            if ((error as Error).message === 'Version mismatch') {
                // Handled globally
            } else if ((error as Error).name !== 'AbortError') {
                console.error('[FRONTEND] Backend stream failed.', { error });
                chatHistoryHook.updateActiveResponseOnMessage(chatId, messageId, () => ({ error: parseApiError(error), endTime: Date.now() }));
            }
        } finally {
            if (!abortControllerRef.current?.signal.aborted) {
                chatHistoryHook.updateMessage(chatId, messageId, { isThinking: false });
                chatHistoryHook.completeChatLoading(chatId);
                abortControllerRef.current = null;
                requestIdRef.current = null;
                
                const finalChatState = chatHistoryRef.current.find(c => c.id === chatId);
                
                // --- POST-STREAMING OPERATIONS ---
                
                if (finalChatState && apiKey && finalChatState.messages) {
                    // 1. Generate Title (Only for new chats, only once, only after stream complete)
                    if (finalChatState.title === "New Chat" && finalChatState.messages.length >= 2 && !titleGenerationAttemptedRef.current.has(chatId)) {
                        titleGenerationAttemptedRef.current.add(chatId);
                        
                        generateChatTitle(finalChatState.messages)
                            .then(newTitle => {
                                const finalTitle = newTitle.length > 45 ? newTitle.substring(0, 42) + '...' : newTitle;
                                updateChatTitle(chatId, finalTitle);
                            })
                            .catch(err => console.error("Failed to generate chat title:", err));
                    }

                    // 2. Generate Suggestions
                    const suggestions = await generateFollowUpSuggestions(finalChatState.messages);
                     if (suggestions.length > 0) {
                        chatHistoryHook.updateActiveResponseOnMessage(chatId, messageId, () => ({ suggestedActions: suggestions }));
                        
                        // FIX: Explicitly persist suggestions to backend
                        const currentChatSnapshot = chatHistoryRef.current.find(c => c.id === chatId);
                        if (currentChatSnapshot && currentChatSnapshot.messages) {
                            const updatedMessages = currentChatSnapshot.messages.map(m => {
                                if (m.id === messageId) {
                                    const responses = m.responses ? [...m.responses] : [];
                                    if (responses[m.activeResponseIndex]) {
                                        responses[m.activeResponseIndex] = {
                                            ...responses[m.activeResponseIndex],
                                            suggestedActions: suggestions
                                        };
                                    }
                                    return { ...m, responses, isThinking: false };
                                }
                                return m;
                            });
                            updateChatProperty(chatId, { messages: updatedMessages });
                        }
                    }
                }

                // Force sync state (ensure isThinking is false even if suggestions didn't run)
                // We do this check to avoid double-saving if the suggestion block already saved above.
                // But updateChatProperty is cheap enough to call again for safety.
                setTimeout(() => {
                    const chatToPersist = chatHistoryRef.current.find(c => c.id === chatId);
                    if (chatToPersist && chatToPersist.messages) {
                        const cleanMessages = chatToPersist.messages.map(m => 
                            m.id === messageId ? { ...m, isThinking: false } : m
                        );
                        updateChatProperty(chatId, { messages: cleanMessages });
                    }
                }, 200); // Increased slightly to 200ms to allow suggestion fetch to potentially finish

            } else {
                // Ensure state is cleaned up even if aborted manually (though handleCancel usually handles it)
                chatHistoryHook.updateMessage(chatId, messageId, { isThinking: false });
                chatHistoryHook.completeChatLoading(chatId);
                abortControllerRef.current = null;
                requestIdRef.current = null;
            }
        }
    };
    
    const sendMessage = async (userMessage: string, files?: File[], options: { isHidden?: boolean; isThinkingModeEnabled?: boolean } = {}) => {
        console.log('[Frontend] sendMessage called:', { userMessage, options });
        if (isLoading) {
            return;
        }
        
        requestIdRef.current = null; // Reset before new message
    
        // Use Refs for latest state to avoid closure staleness issues
        const currentHistory = chatHistoryRef.current;
        const activeChatIdFromRef = currentChatIdRef.current;
        
        let activeChatId = activeChatIdFromRef;
        let currentChat = activeChatId ? currentHistory.find(c => c.id === activeChatId) : undefined;
        let chatCreationPromise: Promise<ChatSession | null> | null = null;

        if (!activeChatId || !currentChat) {
            const optimisticId = generateId(); 
            activeChatId = optimisticId;
            
            const settingsToUse = {
                temperature: settings.temperature,
                maxOutputTokens: settings.maxOutputTokens,
                imageModel: settings.imageModel,
                videoModel: settings.videoModel,
            };

            // Start creation optimistically (does NOT await network for UI update)
            chatCreationPromise = chatHistoryHook.startNewChat(initialModel, settingsToUse, optimisticId);
            
            // We manually construct the chat object for the `startBackendChat` call below
            // so we don't have to wait for state update to propagate to `currentChat` variable
            currentChat = {
                id: optimisticId,
                title: "New Chat",
                messages: [],
                model: initialModel,
                createdAt: Date.now(),
                ...settingsToUse
            } as ChatSession;
        }
    
        const attachmentsData = files?.length ? await Promise.all(files.map(async f => ({ name: f.name, mimeType: f.type, data: await fileToBase64(f) }))) : undefined;
    
        const userMessageObj: Message = { id: generateId(), role: 'user', text: userMessage, isHidden: options.isHidden, attachments: attachmentsData, activeResponseIndex: 0 };
        chatHistoryHook.addMessagesToChat(activeChatId, [userMessageObj]);
    
        const modelPlaceholder: Message = { id: generateId(), role: 'model', text: '', responses: [{ text: '', toolCallEvents: [], startTime: Date.now() }], activeResponseIndex: 0, isThinking: true };
        chatHistoryHook.addMessagesToChat(activeChatId, [modelPlaceholder]);
        chatHistoryHook.setChatLoadingState(activeChatId, true);
    
        const chatForSettings = currentChat || { model: initialModel, ...settings };

        // Ensure backend creation finishes before streaming starts
        // We wait here to prevent the handler from 404ing on the chat ID
        if (chatCreationPromise) {
            const created = await chatCreationPromise;
            if (!created) {
                // Creation failed (rollback handled in startNewChat), so we stop here
                return;
            }
        }

        // Use 'chat' task for new messages
        await startBackendChat(
            'chat',
            activeChatId, 
            modelPlaceholder.id, 
            userMessageObj,
            chatForSettings, 
            { ...settings, isAgentMode: options.isThinkingModeEnabled ?? isAgentMode }
        );
    };

    // --- Branching Logic for User Messages ---
    const editMessage = useCallback(async (messageId: string, newText: string) => {
        if (isLoading) cancelGeneration();
        const chatId = currentChatIdRef.current;
        if (!chatId) return;

        const currentChat = chatHistoryRef.current.find(c => c.id === chatId);
        if (!currentChat || !currentChat.messages) return;

        const messageIndex = currentChat.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        const originalMessage = currentChat.messages[messageIndex];
        
        // 1. Snapshot the "future" (all messages after this one) to preserve the old branch
        // Note: the original message itself is part of the old branch, but we store the *subsequent* flow in the payload.
        const futureMessages = currentChat.messages.slice(messageIndex + 1);
        
        // 2. Prepare Version Objects if they don't exist
        // Use implicit v1 if versions array is empty
        const currentVersionIndex = originalMessage.activeVersionIndex ?? 0;
        let versions = originalMessage.versions ? [...originalMessage.versions] : [];
        
        if (versions.length === 0) {
            versions.push({
                text: originalMessage.text,
                attachments: originalMessage.attachments,
                createdAt: Date.now(), // Estimate
                historyPayload: futureMessages
            });
        } else {
            // Update the current version with the current future before switching
            // This ensures if we switch back, we get the state as we left it
            versions[currentVersionIndex] = {
                ...versions[currentVersionIndex],
                historyPayload: futureMessages
            };
        }

        // 3. Create New Version
        const newVersionIndex = versions.length;
        versions.push({
            text: newText,
            // We copy attachments for now, assuming edit doesn't change attachments (simplification)
            attachments: originalMessage.attachments, 
            createdAt: Date.now(),
            historyPayload: [] // New branch has no future yet
        });

        // 4. Update the Message Object locally
        const updatedUserMessage: Message = {
            ...originalMessage,
            text: newText,
            versions: versions,
            activeVersionIndex: newVersionIndex,
        };

        // 5. Construct new message list: [..., PreviousMsgs, UpdatedUserMsg]
        // We truncate the future because we are about to generate a NEW future.
        const truncatedMessages = [...currentChat.messages.slice(0, messageIndex), updatedUserMessage];

        // 6. Sync to Backend & Update Local State
        try {
            await fetchFromApi(`/api/chats/${chatId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: truncatedMessages })
            });
            
            chatHistoryHook.updateChatProperty(chatId, { messages: truncatedMessages });
            
            // 7. Trigger AI Response generation
            // We need to add a model placeholder for the new response
            const modelPlaceholder: Message = { 
                id: generateId(), 
                role: 'model', 
                text: '', 
                responses: [{ text: '', toolCallEvents: [], startTime: Date.now() }], 
                activeResponseIndex: 0, 
                isThinking: true 
            };
            
            chatHistoryHook.addMessagesToChat(chatId, [modelPlaceholder]);
            chatHistoryHook.setChatLoadingState(chatId, true);

            // 8. Start Stream
            await startBackendChat(
                'chat',
                chatId,
                modelPlaceholder.id,
                null, // Passing null since user message is already in history (updated above)
                currentChat, 
                { ...settings, isAgentMode }
            );

        } catch (e) {
            console.error("Failed to edit message:", e);
            if (onShowToast) onShowToast("Failed to edit message branch", 'error');
        }
    }, [isLoading, chatHistoryHook, startBackendChat, cancelGeneration, onShowToast, settings, isAgentMode]);

    const navigateBranch = useCallback(async (messageId: string, direction: 'next' | 'prev') => {
        if (isLoading) return; // Prevent switching while generating
        const chatId = currentChatIdRef.current;
        if (!chatId) return;

        const currentChat = chatHistoryRef.current.find(c => c.id === chatId);
        if (!currentChat || !currentChat.messages) return;

        const messageIndex = currentChat.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        const message = currentChat.messages[messageIndex];
        if (!message.versions || message.versions.length < 2) return;

        const currentIndex = message.activeVersionIndex ?? 0;
        let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        
        // Clamp index
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= message.versions.length) newIndex = message.versions.length - 1;
        
        if (newIndex === currentIndex) return;

        // --- SWITCH LOGIC ---
        // 1. Save current future to the *current* version
        const currentFuture = currentChat.messages.slice(messageIndex + 1);
        const versions = [...message.versions];
        versions[currentIndex] = { ...versions[currentIndex], historyPayload: currentFuture };

        // 2. Restore future from the *target* version
        const targetVersion = versions[newIndex];
        const restoredFuture = targetVersion.historyPayload || [];

        // 3. Update Message
        const updatedMessage: Message = {
            ...message,
            text: targetVersion.text,
            attachments: targetVersion.attachments,
            activeVersionIndex: newIndex,
            versions: versions
        };

        // 4. Reconstruct Timeline
        const newMessages = [...currentChat.messages.slice(0, messageIndex), updatedMessage, ...restoredFuture];

        // 5. Sync & Update
        try {
            // Optimistic update
            chatHistoryHook.updateChatProperty(chatId, { messages: newMessages });

            await fetchFromApi(`/api/chats/${chatId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages })
            });
        } catch (e) {
            console.error("Failed to switch branch:", e);
            if (onShowToast) onShowToast("Failed to switch branch", 'error');
        }

    }, [isLoading, chatHistoryHook, onShowToast]);

    // --- Branching Logic for AI Responses (Regeneration & Navigation) ---

    const regenerateResponse = useCallback(async (aiMessageId: string) => {
        if (isLoading) cancelGeneration();
        if (!currentChatId) return;

        requestIdRef.current = null; // Reset before new message

        const currentChat = chatHistoryRef.current.find(c => c.id === currentChatId); // Use ref for latest state
        if (!currentChat || !currentChat.messages) return;

        const messageIndex = currentChat.messages.findIndex(m => m.id === aiMessageId);
        if (messageIndex < 1 || currentChat.messages[messageIndex-1].role !== 'user') {
            console.error("Cannot regenerate: AI message is not preceded by a user message.");
            return;
        }
        
        const originalMessage = currentChat.messages[messageIndex];
        const currentIndex = originalMessage.activeResponseIndex;

        // 1. Snapshot Future: Save what came AFTER this message into the current response's payload
        const futureMessages = currentChat.messages.slice(messageIndex + 1);
        chatHistoryHook.updateActiveResponseOnMessage(currentChatId, aiMessageId, (res) => ({ ...res, historyPayload: futureMessages }));

        // 2. Truncate Future in UI immediately (start fresh branch)
        // We must remove future messages because we are generating a new path from this point.
        const truncatedMessages = currentChat.messages.slice(0, messageIndex + 1);
        chatHistoryHook.updateChatProperty(currentChatId, { messages: truncatedMessages });

        // 3. Add new response entry
        const newResponse: ModelResponse = { text: '', toolCallEvents: [], startTime: Date.now() };
        chatHistoryHook.addModelResponse(currentChatId, aiMessageId, newResponse);
        chatHistoryHook.setChatLoadingState(currentChatId, true);
        chatHistoryHook.updateMessage(currentChatId, aiMessageId, { isThinking: true });

        // Use 'regenerate' task
        await startBackendChat(
            'regenerate',
            currentChatId, 
            aiMessageId, 
            null, // No new user message
            currentChat, 
            { ...settings, isAgentMode: isAgentMode }
        );

    }, [isLoading, currentChatId, chatHistoryHook, cancelGeneration, startBackendChat, settings, isAgentMode]);

    const setResponseIndex = useCallback(async (messageId: string, index: number) => {
        if (isLoading) return; 
        const chatId = currentChatIdRef.current;
        if (!chatId) return;

        const currentChat = chatHistoryRef.current.find(c => c.id === chatId);
        if (!currentChat || !currentChat.messages) return;

        const messageIndex = currentChat.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        const message = currentChat.messages[messageIndex];
        if (!message.responses || message.responses.length < 2) return;

        const currentIndex = message.activeResponseIndex;
        if (index < 0 || index >= message.responses.length) return;
        if (index === currentIndex) return;

        // --- RESPONSE SWITCH LOGIC ---
        // 1. Save current future to the *current* response
        const currentFuture = currentChat.messages.slice(messageIndex + 1);
        const currentResponse = message.responses[currentIndex];
        
        // Use map to create new array for immutability
        const updatedResponses = message.responses.map((resp, idx) => {
            if (idx === currentIndex) return { ...resp, historyPayload: currentFuture };
            return resp;
        });

        // 2. Restore future from the *target* response
        const targetResponse = updatedResponses[index];
        const restoredFuture = targetResponse.historyPayload || [];

        // 3. Update Message
        const updatedMessage: Message = {
            ...message,
            activeResponseIndex: index,
            responses: updatedResponses
        };

        // 4. Reconstruct Timeline
        const newMessages = [...currentChat.messages.slice(0, messageIndex), updatedMessage, ...restoredFuture];

        // 5. Sync & Update
        try {
            // Optimistic update
            chatHistoryHook.updateChatProperty(chatId, { messages: newMessages });

            await fetchFromApi(`/api/chats/${chatId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages })
            });
        } catch (e) {
            console.error("Failed to switch response branch:", e);
            if (onShowToast) onShowToast("Failed to switch response branch", 'error');
        }
    }, [isLoading, chatHistoryHook, onShowToast]);

    const sendMessageForTest = (userMessage: string, options?: { isThinkingModeEnabled?: boolean }): Promise<Message> => {
        return new Promise((resolve) => {
            testResolverRef.current = resolve;
            sendMessage(userMessage, undefined, options);
        });
    };
  
  return { 
      ...chatHistoryHook, 
      messages, 
      sendMessage, 
      isLoading, 
      cancelGeneration, 
      approveExecution, 
      denyExecution, 
      regenerateResponse, 
      sendMessageForTest, 
      editMessage, 
      navigateBranch, 
      setResponseIndex 
  };
};