
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
import { processBackendStream } from '../../services/agenticLoop/stream-processor';
import { parseAgenticWorkflow } from '../../utils/workflowParsing';
import { executeFrontendTool } from './tool-executor';

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

    const handleFrontendToolExecution = useCallback((callId: string, toolName: string, toolArgs: any) => {
        executeFrontendTool(callId, toolName, toolArgs);
    }, []);

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

        // 1. Deep clone the messages list to avoid mutation issues
        const updatedMessages = JSON.parse(JSON.stringify(currentChat.messages)) as Message[];
        const targetMessage = updatedMessages[messageIndex];

        // 2. Snapshot the "future" (all messages after this one) to preserve the old branch
        // The future belongs to the current active version BEFORE we switch
        const futureMessages = updatedMessages.slice(messageIndex + 1);
        
        const currentVersionIndex = targetMessage.activeVersionIndex ?? 0;
        
        // Initialize versions array if needed
        if (!targetMessage.versions || targetMessage.versions.length === 0) {
            targetMessage.versions = [{
                text: targetMessage.text,
                attachments: targetMessage.attachments,
                createdAt: Date.now(),
                historyPayload: futureMessages
            }];
        } else {
            // Update the current version with the current future before creating a new one
            targetMessage.versions[currentVersionIndex].historyPayload = futureMessages;
        }

        // 3. Create New Version
        const newVersionIndex = targetMessage.versions.length;
        targetMessage.versions.push({
            text: newText,
            attachments: targetMessage.attachments, // Carry over attachments
            createdAt: Date.now(),
            historyPayload: [] // New branch starts with empty future
        });

        // 4. Update Active Pointer & Text
        targetMessage.activeVersionIndex = newVersionIndex;
        targetMessage.text = newText;

        // 5. Construct new message list: [..., PreviousMsgs, UpdatedUserMsg]
        // We truncate everything after this message because we are starting a new generation
        const truncatedList = [...updatedMessages.slice(0, messageIndex), targetMessage];

        // 6. Sync to Backend & Update Local State ATOMICALLY
        try {
            // Update local and backend in one go with the fully constructed list
            await chatHistoryHook.updateChatProperty(chatId, { messages: truncatedList });
            
            // 7. Add model placeholder
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
                'regenerate', // Force regenerate to ensure context is correctly read from the updated history in DB
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
        if (isLoading) return;
        const chatId = currentChatIdRef.current;
        if (!chatId) return;

        const currentChat = chatHistoryRef.current.find(c => c.id === chatId);
        if (!currentChat || !currentChat.messages) return;

        const messageIndex = currentChat.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        // 1. Deep clone for safety
        const updatedMessages = JSON.parse(JSON.stringify(currentChat.messages)) as Message[];
        const targetMessage = updatedMessages[messageIndex];

        if (!targetMessage.versions || targetMessage.versions.length < 2) return;

        const currentIndex = targetMessage.activeVersionIndex ?? 0;
        let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= targetMessage.versions.length) newIndex = targetMessage.versions.length - 1;
        
        if (newIndex === currentIndex) return;

        // --- SWITCH LOGIC ---
        // 1. Save current future to the *current* version
        const currentFuture = updatedMessages.slice(messageIndex + 1);
        targetMessage.versions[currentIndex].historyPayload = currentFuture;

        // 2. Restore future from the *target* version
        const targetVersion = targetMessage.versions[newIndex];
        const restoredFuture = targetVersion.historyPayload || [];

        // 3. Update Message Content to match target version
        targetMessage.text = targetVersion.text;
        targetMessage.attachments = targetVersion.attachments;
        targetMessage.activeVersionIndex = newIndex;

        // 4. Reconstruct Timeline
        const newMessagesList = [...updatedMessages.slice(0, messageIndex), targetMessage, ...restoredFuture];

        // 5. Sync & Update
        try {
            await chatHistoryHook.updateChatProperty(chatId, { messages: newMessagesList });
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
        
        // 1. Deep clone messages to prevent mutation issues during async state updates
        const updatedMessages = JSON.parse(JSON.stringify(currentChat.messages)) as Message[];
        const targetMessage = updatedMessages[messageIndex];
        const currentResponseIndex = targetMessage.activeResponseIndex;

        // 2. Snapshot Future: Save what came AFTER this message into the current response's payload
        const futureMessages = updatedMessages.slice(messageIndex + 1);
        if (targetMessage.responses && targetMessage.responses[currentResponseIndex]) {
            targetMessage.responses[currentResponseIndex].historyPayload = futureMessages;
        }

        // 3. Add new response entry
        const newResponse: ModelResponse = { text: '', toolCallEvents: [], startTime: Date.now() };
        if (!targetMessage.responses) targetMessage.responses = [];
        targetMessage.responses.push(newResponse);
        targetMessage.activeResponseIndex = targetMessage.responses.length - 1;
        targetMessage.isThinking = true;

        // 4. Truncate Future in the list (start fresh branch from this AI message)
        const truncatedList = [...updatedMessages.slice(0, messageIndex), targetMessage];

        // 5. Atomic Update to Backend
        await chatHistoryHook.updateChatProperty(currentChatId, { messages: truncatedList });
        
        // 6. Set Loading State locally
        chatHistoryHook.setChatLoadingState(currentChatId, true);

        // 7. Use 'regenerate' task
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

        // 1. Deep clone
        const updatedMessages = JSON.parse(JSON.stringify(currentChat.messages)) as Message[];
        const targetMessage = updatedMessages[messageIndex];

        if (!targetMessage.responses || targetMessage.responses.length < 2) return;

        const currentIndex = targetMessage.activeResponseIndex;
        if (index < 0 || index >= targetMessage.responses.length) return;
        if (index === currentIndex) return;

        // --- RESPONSE SWITCH LOGIC ---
        // 2. Save current future to the *current* response
        const currentFuture = updatedMessages.slice(messageIndex + 1);
        targetMessage.responses[currentIndex].historyPayload = currentFuture;

        // 3. Restore future from the *target* response
        const targetResponse = targetMessage.responses[index];
        const restoredFuture = targetResponse.historyPayload || [];

        // 4. Update Active Index
        targetMessage.activeResponseIndex = index;

        // 5. Reconstruct Timeline
        const newMessagesList = [...updatedMessages.slice(0, messageIndex), targetMessage, ...restoredFuture];

        // 6. Sync & Update
        try {
            await chatHistoryHook.updateChatProperty(chatId, { messages: newMessagesList });
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
