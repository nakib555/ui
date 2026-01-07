
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
    // Destructure all necessary methods from the history hook
    const { 
        chatHistory, 
        currentChatId, 
        isHistoryLoading,
        updateChatTitle, 
        updateChatProperty,
        updateMessage,
        setChatLoadingState,
        completeChatLoading,
        updateActiveResponseOnMessage,
        addMessagesToChat,
        startNewChat: startNewChatHistory,
        loadChat: loadChatHistory,
        deleteChat: deleteChatHistory,
        clearAllChats: clearAllChatsHistory,
        importChat
    } = useChatHistory();

    const abortControllerRef = useRef<AbortController | null>(null);
    const requestIdRef = useRef<string | null>(null); 
    const testResolverRef = useRef<((value: Message | PromiseLike<Message>) => void) | null>(null);
    const hasAttemptedReconnection = useRef(false);
    
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
        
        // Send explicit cancel request using chatId as ID
        if (currentChatIdRef.current) {
            fetchFromApi('/api/handler?task=cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: currentChatIdRef.current }),
            }).catch(error => console.error('[FRONTEND] Failed to send cancel request:', error));
        }
        
        const chatId = currentChatIdRef.current;
        if (chatId) {
            const currentChat = chatHistoryRef.current.find(c => c.id === chatId);
            
            if (currentChat?.messages?.length) {
                const lastMessage = currentChat.messages[currentChat.messages.length - 1];
                
                updateActiveResponseOnMessage(chatId, lastMessage.id, () => ({
                    error: { 
                        code: 'STOPPED_BY_USER', 
                        message: 'Generation stopped by user.',
                        details: 'You interrupted the model.'
                    },
                    endTime: Date.now()
                }));
                updateMessage(chatId, lastMessage.id, { isThinking: false });
                completeChatLoading(chatId);

                // Fallback for plan approval state cancellation if we are stuck there
                if (lastMessage.executionState === 'pending_approval') {
                     const activeResponse = lastMessage.responses?.[lastMessage.activeResponseIndex];
                     const callId = activeResponse?.plan?.callId || 'plan-approval';
                     handleFrontendToolExecution(callId, 'denyExecution', false);
                }
            }
        }
    }, [handleFrontendToolExecution, updateActiveResponseOnMessage, updateMessage, completeChatLoading]);
    
    const approveExecution = useCallback((editedPlan: string) => {
        const chatId = currentChatIdRef.current;
        if (chatId) {
            const currentChat = chatHistoryRef.current.find(c => c.id === chatId);
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
            if (currentChat?.messages?.length) {
                const lastMessage = currentChat.messages[currentChat.messages.length - 1];
                const activeResponse = lastMessage.responses?.[lastMessage.activeResponseIndex];
                const callId = activeResponse?.plan?.callId || 'plan-approval';

                updateMessage(chatId, lastMessage.id, { executionState: 'denied' });
                handleFrontendToolExecution(callId, 'denyExecution', false);
            }
        }
    }, [updateMessage, handleFrontendToolExecution]);

    // --- RECONNECTION LOGIC ---
    const connectToActiveStream = useCallback(async (chatId: string, messageId: string) => {
        if (abortControllerRef.current) return; // Already connected or generating

        console.log(`[FRONTEND] Attempting to reconnect to stream for chat ${chatId}...`);
        setChatLoadingState(chatId, true);
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetchFromApi('/api/handler?task=connect', {
                method: 'POST', // Connect task is POST to send body
                headers: { 'Content-Type': 'application/json' },
                signal: abortControllerRef.current.signal,
                body: JSON.stringify({ chatId }),
                silent: true // Suppress 404 errors during reconnection checks
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn("[FRONTEND] Stream not found (404). Assuming completion.");
                    // Ensure local state is consistent
                    updateMessage(chatId, messageId, { isThinking: false });
                    completeChatLoading(chatId);
                } else {
                    throw new Error(`Reconnection failed: ${response.status}`);
                }
                return;
            }

            if (!response.body) throw new Error("No response body");

            await processBackendStream(
                response,
                {
                    onTextChunk: (delta) => {
                        updateActiveResponseOnMessage(chatId, messageId, (current) => {
                            const newText = (current.text || '') + delta;
                            const parsedWorkflow = parseAgenticWorkflow(newText, current.toolCallEvents || [], false);
                            return { text: newText, workflow: parsedWorkflow };
                        });
                    },
                    onWorkflowUpdate: () => {},
                    onToolCallStart: (toolCallEvents) => {
                        // Merge to avoid duplication on replay? Backend buffer sends everything from start?
                        // Assuming backend sends all events including past ones if we reconnect to start, 
                        // or just new ones if we use Last-Event-ID?
                        // Current backend implementation replays full buffer.
                        // We need to merge intelligently or just replace?
                        // For simplicity in this implementation, we append/merge by ID.
                        updateActiveResponseOnMessage(chatId, messageId, (r) => {
                            const existingIds = new Set(r.toolCallEvents?.map(e => e.id));
                            const newEvents = toolCallEvents.filter(e => !existingIds.has(e.id)).map(e => ({...e, startTime: e.startTime || Date.now()}));
                            const updatedEvents = [...(r.toolCallEvents || []), ...newEvents];
                            const parsedWorkflow = parseAgenticWorkflow(r.text || '', updatedEvents, false);
                            return { toolCallEvents: updatedEvents, workflow: parsedWorkflow };
                        });
                    },
                    onToolUpdate: (payload) => {
                        updateActiveResponseOnMessage(chatId, messageId, (r) => {
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
                            return { toolCallEvents: updatedEvents };
                        });
                    },
                    onToolCallEnd: (payload) => {
                        updateActiveResponseOnMessage(chatId, messageId, (r) => {
                            const updatedEvents = r.toolCallEvents?.map(tc => tc.id === payload.id ? { ...tc, result: payload.result, endTime: Date.now() } : tc);
                            const parsedWorkflow = parseAgenticWorkflow(r.text || '', updatedEvents || [], false);
                            return { toolCallEvents: updatedEvents, workflow: parsedWorkflow };
                        });
                    },
                    onPlanReady: (plan) => {
                        const payload = plan as any; 
                        updateActiveResponseOnMessage(chatId, messageId, () => ({ plan: payload }));
                        updateMessage(chatId, messageId, { executionState: 'pending_approval' });
                    },
                    onFrontendToolRequest: (callId, toolName, toolArgs) => {
                        handleFrontendToolExecution(callId, toolName, toolArgs);
                    },
                    onComplete: (payload) => {
                        updateActiveResponseOnMessage(chatId, messageId, (r) => {
                            const finalWorkflow = parseAgenticWorkflow(payload.finalText, r.toolCallEvents || [], true);
                            return { 
                                text: payload.finalText, 
                                endTime: Date.now(), 
                                groundingMetadata: payload.groundingMetadata,
                                workflow: finalWorkflow 
                            };
                        });
                        updateMessage(chatId, messageId, { isThinking: false });
                        completeChatLoading(chatId);
                    },
                    onError: (error) => {
                        updateActiveResponseOnMessage(chatId, messageId, () => ({ error: parseApiError(error), endTime: Date.now() }));
                        updateMessage(chatId, messageId, { isThinking: false });
                        completeChatLoading(chatId);
                    },
                    onCancel: () => {
                        updateMessage(chatId, messageId, { isThinking: false });
                        completeChatLoading(chatId);
                    }
                },
                abortControllerRef.current.signal
            );

        } catch (error) {
            console.error("[FRONTEND] Reconnection error:", error);
            // On hard fail, assume stopped
            updateMessage(chatId, messageId, { isThinking: false });
            completeChatLoading(chatId);
        } finally {
            abortControllerRef.current = null;
        }
    }, [updateActiveResponseOnMessage, updateMessage, completeChatLoading, setChatLoadingState, handleFrontendToolExecution]);

    // Check for potential reconnection needs on mount/chat switch
    useEffect(() => {
        // Only run once per chat load
        if (hasAttemptedReconnection.current || !currentChatId) return;
        
        const chat = chatHistoryRef.current.find(c => c.id === currentChatId);
        // If chat exists, has messages, and last message is thinking...
        if (chat && chat.messages && chat.messages.length > 0) {
            const lastMsg = chat.messages[chat.messages.length - 1];
            // ...and we are NOT currently locally loading (stream active)
            if (lastMsg.role === 'model' && lastMsg.isThinking && !abortControllerRef.current) {
                // ...and there's no error on it
                if (!lastMsg.responses?.[lastMsg.activeResponseIndex]?.error) {
                    hasAttemptedReconnection.current = true;
                    // Trigger reconnection
                    connectToActiveStream(currentChatId, lastMsg.id);
                }
            }
        }
    }, [currentChatId, connectToActiveStream]);

    // Reset attempt flag on chat change
    useEffect(() => {
        hasAttemptedReconnection.current = false;
    }, [currentChatId]);


    const startBackendChat = async (
        task: 'chat' | 'regenerate',
        chatId: string,
        messageId: string, 
        newMessage: Message | null,
        chatConfig: Pick<ChatSession, 'model' | 'temperature' | 'maxOutputTokens' | 'imageModel' | 'videoModel'>,
        runtimeSettings: { isAgentMode: boolean } & ChatSettings
    ) => {
        abortControllerRef.current = new AbortController();

        try {
            const requestPayload = {
                chatId: chatId,
                messageId: messageId,
                model: chatConfig.model,
                newMessage: newMessage,
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
            
            await processBackendStream(
                response,
                {
                    onStart: (requestId) => {
                        requestIdRef.current = requestId;
                    },
                    onTextChunk: (delta) => {
                        updateActiveResponseOnMessage(chatId, messageId, (current) => {
                            const newText = (current.text || '') + delta;
                            const parsedWorkflow = parseAgenticWorkflow(newText, current.toolCallEvents || [], false);
                            return { text: newText, workflow: parsedWorkflow };
                        });
                    },
                    onWorkflowUpdate: () => { },
                    onToolCallStart: (toolCallEvents) => {
                        const newEvents = toolCallEvents.map((toolEvent: any) => ({
                            id: toolEvent.id,
                            call: toolEvent.call,
                            startTime: Date.now()
                        }));
                        updateActiveResponseOnMessage(chatId, messageId, (r) => {
                            const updatedEvents = [...(r.toolCallEvents || []), ...newEvents];
                            const parsedWorkflow = parseAgenticWorkflow(r.text || '', updatedEvents, false);
                            return { toolCallEvents: updatedEvents, workflow: parsedWorkflow };
                        });
                    },
                    onToolUpdate: (payload) => {
                        updateActiveResponseOnMessage(chatId, messageId, (r) => {
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
                        updateActiveResponseOnMessage(chatId, messageId, (r) => {
                            const updatedEvents = r.toolCallEvents?.map(tc => tc.id === payload.id ? { ...tc, result: payload.result, endTime: Date.now() } : tc);
                            const parsedWorkflow = parseAgenticWorkflow(r.text || '', updatedEvents || [], false);
                            return { toolCallEvents: updatedEvents, workflow: parsedWorkflow };
                        });
                    },
                    onPlanReady: (plan) => {
                        const payload = plan as any; 
                        updateActiveResponseOnMessage(chatId, messageId, () => ({ plan: payload }));
                        updateMessage(chatId, messageId, { executionState: 'pending_approval' });
                    },
                    onFrontendToolRequest: (callId, toolName, toolArgs) => {
                        handleFrontendToolExecution(callId, toolName, toolArgs);
                    },
                    onComplete: (payload) => {
                        updateActiveResponseOnMessage(chatId, messageId, (r) => {
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
                        updateActiveResponseOnMessage(chatId, messageId, () => ({ error, endTime: Date.now() }));
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
                updateActiveResponseOnMessage(chatId, messageId, () => ({ error: parseApiError(error), endTime: Date.now() }));
            }
        } finally {
            if (!abortControllerRef.current?.signal.aborted) {
                updateMessage(chatId, messageId, { isThinking: false });
                completeChatLoading(chatId);
                abortControllerRef.current = null;
                requestIdRef.current = null;
                
                const finalChatState = chatHistoryRef.current.find(c => c.id === chatId);
                
                if (finalChatState && apiKey && finalChatState.messages) {
                    if (finalChatState.title === "New Chat" && finalChatState.messages.length >= 2 && !titleGenerationAttemptedRef.current.has(chatId)) {
                        titleGenerationAttemptedRef.current.add(chatId);
                        
                        generateChatTitle(finalChatState.messages)
                            .then(newTitle => {
                                const finalTitle = newTitle.length > 45 ? newTitle.substring(0, 42) + '...' : newTitle;
                                updateChatTitle(chatId, finalTitle);
                            })
                            .catch(err => console.error("Failed to generate chat title:", err));
                    }

                    const suggestions = await generateFollowUpSuggestions(finalChatState.messages);
                     if (suggestions.length > 0) {
                        updateActiveResponseOnMessage(chatId, messageId, () => ({ suggestedActions: suggestions }));
                        
                        // Force a persist of the suggestions
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

                setTimeout(() => {
                    const chatToPersist = chatHistoryRef.current.find(c => c.id === chatId);
                    if (chatToPersist && chatToPersist.messages) {
                        const cleanMessages = chatToPersist.messages.map(m => 
                            m.id === messageId ? { ...m, isThinking: false } : m
                        );
                        updateChatProperty(chatId, { messages: cleanMessages });
                    }
                }, 200);

            } else {
                updateMessage(chatId, messageId, { isThinking: false });
                completeChatLoading(chatId);
                abortControllerRef.current = null;
                requestIdRef.current = null;
            }
        }
    };
    
    const sendMessage = async (userMessage: string, files?: File[], options: { isHidden?: boolean; isThinkingModeEnabled?: boolean } = {}) => {
        if (isLoading) {
            return;
        }
        
        requestIdRef.current = null; 
    
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

            chatCreationPromise = startNewChatHistory(initialModel, settingsToUse, optimisticId);
            
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
        addMessagesToChat(activeChatId, [userMessageObj]);
    
        const modelPlaceholder: Message = { id: generateId(), role: 'model', text: '', responses: [{ text: '', toolCallEvents: [], startTime: Date.now() }], activeResponseIndex: 0, isThinking: true };
        addMessagesToChat(activeChatId, [modelPlaceholder]);
        setChatLoadingState(activeChatId, true);
    
        const chatForSettings = currentChat || { model: initialModel, ...settings };

        if (chatCreationPromise) {
            const created = await chatCreationPromise;
            if (!created) return;
        }

        await startBackendChat(
            'chat',
            activeChatId, 
            modelPlaceholder.id, 
            userMessageObj,
            chatForSettings, 
            { ...settings, isAgentMode: options.isThinkingModeEnabled ?? isAgentMode }
        );
    };

    const editMessage = useCallback(async (messageId: string, newText: string) => {
        if (isLoading) cancelGeneration();
        const chatId = currentChatIdRef.current;
        if (!chatId) return;

        const currentChat = chatHistoryRef.current.find(c => c.id === chatId);
        if (!currentChat || !currentChat.messages) return;

        const messageIndex = currentChat.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        const updatedMessages = JSON.parse(JSON.stringify(currentChat.messages)) as Message[];
        const targetMessage = updatedMessages[messageIndex];
        const futureMessages = updatedMessages.slice(messageIndex + 1);
        
        const currentVersionIndex = targetMessage.activeVersionIndex ?? 0;
        
        if (!targetMessage.versions || targetMessage.versions.length === 0) {
            targetMessage.versions = [{
                text: targetMessage.text,
                attachments: targetMessage.attachments,
                createdAt: Date.now(),
                historyPayload: futureMessages
            }];
        } else {
            targetMessage.versions[currentVersionIndex].historyPayload = futureMessages;
        }

        const newVersionIndex = targetMessage.versions.length;
        targetMessage.versions.push({
            text: newText,
            attachments: targetMessage.attachments, 
            createdAt: Date.now(),
            historyPayload: [] 
        });

        targetMessage.activeVersionIndex = newVersionIndex;
        targetMessage.text = newText;

        const truncatedList = [...updatedMessages.slice(0, messageIndex), targetMessage];

        try {
            await updateChatProperty(chatId, { messages: truncatedList });
            
            const modelPlaceholder: Message = { 
                id: generateId(), 
                role: 'model', 
                text: '', 
                responses: [{ text: '', toolCallEvents: [], startTime: Date.now() }], 
                activeResponseIndex: 0, 
                isThinking: true 
            };
            
            addMessagesToChat(chatId, [modelPlaceholder]);
            setChatLoadingState(chatId, true);

            await startBackendChat(
                'regenerate', 
                chatId,
                modelPlaceholder.id,
                null, 
                currentChat, 
                { ...settings, isAgentMode }
            );

        } catch (e) {
            console.error("Failed to edit message:", e);
            if (onShowToast) onShowToast("Failed to edit message branch", 'error');
        }
    }, [isLoading, updateChatProperty, addMessagesToChat, setChatLoadingState, startBackendChat, cancelGeneration, onShowToast, settings, isAgentMode]);

    const navigateBranch = useCallback(async (messageId: string, direction: 'next' | 'prev') => {
        if (isLoading) return;
        const chatId = currentChatIdRef.current;
        if (!chatId) return;

        const currentChat = chatHistoryRef.current.find(c => c.id === chatId);
        if (!currentChat || !currentChat.messages) return;

        const messageIndex = currentChat.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        const updatedMessages = JSON.parse(JSON.stringify(currentChat.messages)) as Message[];
        const targetMessage = updatedMessages[messageIndex];

        if (!targetMessage.versions || targetMessage.versions.length < 2) return;

        const currentIndex = targetMessage.activeVersionIndex ?? 0;
        let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= targetMessage.versions.length) newIndex = targetMessage.versions.length - 1;
        
        if (newIndex === currentIndex) return;

        const currentFuture = updatedMessages.slice(messageIndex + 1);
        targetMessage.versions[currentIndex].historyPayload = currentFuture;

        const targetVersion = targetMessage.versions[newIndex];
        const restoredFuture = targetVersion.historyPayload || [];

        targetMessage.text = targetVersion.text;
        targetMessage.attachments = targetVersion.attachments;
        targetMessage.activeVersionIndex = newIndex;

        const newMessagesList = [...updatedMessages.slice(0, messageIndex), targetMessage, ...restoredFuture];

        try {
            await updateChatProperty(chatId, { messages: newMessagesList });
        } catch (e) {
            console.error("Failed to switch branch:", e);
            if (onShowToast) onShowToast("Failed to switch branch", 'error');
        }

    }, [isLoading, updateChatProperty, onShowToast]);

    const regenerateResponse = useCallback(async (aiMessageId: string) => {
        if (isLoading) cancelGeneration();
        if (!currentChatId) return;

        requestIdRef.current = null; 

        const currentChat = chatHistoryRef.current.find(c => c.id === currentChatId); 
        if (!currentChat || !currentChat.messages) return;

        const messageIndex = currentChat.messages.findIndex(m => m.id === aiMessageId);
        if (messageIndex < 1 || currentChat.messages[messageIndex-1].role !== 'user') {
            console.error("Cannot regenerate: AI message is not preceded by a user message.");
            return;
        }
        
        const updatedMessages = JSON.parse(JSON.stringify(currentChat.messages)) as Message[];
        const targetMessage = updatedMessages[messageIndex];
        const currentResponseIndex = targetMessage.activeResponseIndex;

        const futureMessages = updatedMessages.slice(messageIndex + 1);
        if (targetMessage.responses && targetMessage.responses[currentResponseIndex]) {
            targetMessage.responses[currentResponseIndex].historyPayload = futureMessages;
        }

        const newResponse: ModelResponse = { text: '', toolCallEvents: [], startTime: Date.now() };
        if (!targetMessage.responses) targetMessage.responses = [];
        targetMessage.responses.push(newResponse);
        targetMessage.activeResponseIndex = targetMessage.responses.length - 1;
        targetMessage.isThinking = true;

        const truncatedList = [...updatedMessages.slice(0, messageIndex), targetMessage];

        await updateChatProperty(currentChatId, { messages: truncatedList });
        
        setChatLoadingState(currentChatId, true);

        await startBackendChat(
            'regenerate',
            currentChatId, 
            aiMessageId, 
            null, 
            currentChat, 
            { ...settings, isAgentMode: isAgentMode }
        );

    }, [isLoading, currentChatId, updateChatProperty, setChatLoadingState, cancelGeneration, startBackendChat, settings, isAgentMode]);

    const setResponseIndex = useCallback(async (messageId: string, index: number) => {
        if (isLoading) return; 
        const chatId = currentChatIdRef.current;
        if (!chatId) return;

        const currentChat = chatHistoryRef.current.find(c => c.id === chatId);
        if (!currentChat || !currentChat.messages) return;

        const messageIndex = currentChat.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        const targetMessage = currentChat.messages[messageIndex];

        if (!targetMessage.responses || targetMessage.responses.length < 2) return;

        const currentIndex = targetMessage.activeResponseIndex;
        if (index < 0 || index >= targetMessage.responses.length) return;
        if (index === currentIndex) return;

        const currentFuture = updatedMessages.slice(messageIndex + 1);
        targetMessage.responses[currentIndex].historyPayload = currentFuture;

        const targetResponse = targetMessage.responses[index];
        const restoredFuture = targetResponse.historyPayload || [];

        targetMessage.activeResponseIndex = index;

        const newMessagesList = [...updatedMessages.slice(0, messageIndex), targetMessage, ...restoredFuture];

        try {
            await updateChatProperty(chatId, { messages: newMessagesList });
        } catch (e) {
            console.error("Failed to switch response branch:", e);
            if (onShowToast) onShowToast("Failed to switch response branch", 'error');
        }
    }, [isLoading, updateChatProperty, onShowToast]);

    const updateChatModel = useCallback((chatId: string, model: string) => updateChatProperty(chatId, { model }), [updateChatProperty]);
    const updateChatSettings = useCallback((chatId: string, settings: Partial<Pick<ChatSession, 'temperature' | 'maxOutputTokens' | 'imageModel' | 'videoModel'>>) => updateChatProperty(chatId, settings), [updateChatProperty]);

    const sendMessageForTest = (userMessage: string, options?: { isThinkingModeEnabled?: boolean }): Promise<Message> => {
        return new Promise((resolve) => {
            testResolverRef.current = resolve;
            sendMessage(userMessage, undefined, options);
        });
    };
  
  return { 
      chatHistory, currentChatId, isHistoryLoading,
      // expose all needed methods from history hook
      updateChatTitle, updateChatProperty, loadChat: loadChatHistory, deleteChat: deleteChatHistory, clearAllChats: clearAllChatsHistory, importChat, startNewChat: startNewChatHistory,
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
      setResponseIndex,
      updateChatModel, 
      updateChatSettings
  };
};
