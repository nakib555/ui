/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatSession, Message, ModelResponse } from '../types';
import { fetchFromApi } from '../utils/api';

const fetchApi = async (url: string, options?: RequestInit) => {
    // Cache busting: Add timestamp to GET requests to prevent serving stale data
    // from Service Worker or Browser Cache.
    let finalUrl = url;
    if (!options || options.method === 'GET' || !options.method) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl = `${finalUrl}${separator}_t=${Date.now()}`;
    }

    const response = await fetchFromApi(finalUrl, options);
    
    // Safety check for HTML responses (fallback from static host 404s)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        throw new Error(`Endpoint ${url} returned HTML instead of JSON. Backend may be offline or unreachable.`);
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        // Pass through status for handling 404s in caller
        const enrichedError = new Error(error.message || 'API request failed');
        (enrichedError as any).status = response.status;
        
        if (response.status === 401) {
            throw new Error('API key is invalid. Please check it in Settings.');
        }
        throw enrichedError;
    }
    if (response.status === 204) return null; // No Content
    return response.json();
};

const isVersionMismatch = (error: unknown): boolean => {
    return error instanceof Error && error.message === 'Version mismatch';
};

export const useChatHistory = () => {
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Refs to hold latest state for optimistic rollbacks without triggering re-renders of callbacks
  const chatHistoryRef = useRef(chatHistory);
  const currentChatIdRef = useRef(currentChatId);
  
  // Ref for debouncing pagination saves
  const paginationSaveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
      chatHistoryRef.current = chatHistory;
  }, [chatHistory]);

  useEffect(() => {
      currentChatIdRef.current = currentChatId;
  }, [currentChatId]);

  // Load history from backend on initial mount
  useEffect(() => {
    const loadHistory = async () => {
        try {
            const history = await fetchApi('/api/history');
            setChatHistory(history || []);
            // Always start with no chat selected to ensure backend is single source of truth.
            setCurrentChatId(null);
        } catch (error) {
            if (!isVersionMismatch(error)) {
                console.error("Failed to load chat history from backend:", error);
            }
        } finally {
            setIsHistoryLoading(false);
        }
    };
    loadHistory();
  }, []);

  // Effect to load full chat session when currentChatId changes and messages are missing
  useEffect(() => {
    if (!currentChatId || isHistoryLoading) return;

    const chatIndex = chatHistory.findIndex(c => c.id === currentChatId);
    if (chatIndex === -1) return;

    const chat = chatHistory[chatIndex];
    
    // Guard: If already loading this specific chat, don't trigger again to avoid loops
    if (chat.isLoading) return;

    // Check if messages array is missing (undefined) which indicates a summary object.
    // We rely on 'undefined' vs '[]' to distinguish "not loaded" from "empty chat".
    // (chat.messages is typed as mandatory but the backend sends summary objects without it)
    const needsLoading = !chat.messages;

    if (needsLoading) {
        // Optimistic: Mark as loading immediately to prevent UI flicker or double-fetch
        setChatHistory(prev => prev.map(c => c.id === currentChatId ? { ...c, isLoading: true } : c));

        const loadFullChat = async () => {
            try {
                const fullChat: ChatSession = await fetchApi(`/api/chats/${currentChatId}`);
                
                // Update state with full chat data
                setChatHistory(prev => prev.map(c => c.id === currentChatId ? { ...fullChat, isLoading: false } : c));
            } catch (error) {
                if (!isVersionMismatch(error)) {
                    console.error(`Failed to load messages for chat ${currentChatId}:`, error);
                }
                
                // If loading fails (e.g. deleted on server), remove it from list and deselect
                if ((error as any).status === 404) {
                    setChatHistory(prev => prev.filter(c => c.id !== currentChatId));
                    if (currentChatIdRef.current === currentChatId) {
                        setCurrentChatId(null);
                    }
                } else {
                    // On other errors, just unset loading state so user can try again
                    setChatHistory(prev => prev.map(c => c.id === currentChatId ? { ...c, isLoading: false } : c));
                }
            }
        };
        loadFullChat();
    }
  }, [currentChatId, isHistoryLoading, chatHistory]);

  const startNewChat = useCallback(async (model: string, settings: any, optimisticId?: string): Promise<ChatSession | null> => {
    // 1. Prepare Data
    const newId = optimisticId || Math.random().toString(36).substring(2, 9);
    const timestamp = Date.now();
    
    const newChat: ChatSession = {
        id: newId,
        title: "New Chat",
        messages: [],
        model: model,
        isLoading: false,
        createdAt: timestamp,
        ...settings // Spread settings (temperature, etc)
    };

    // 2. Optimistic Update
    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChatId(newId);

    // 3. Network Request
    try {
        const createdChat: ChatSession = await fetchApi('/api/chats/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: newId, model, ...settings }),
        });
        
        // Confirm server state (optional, essentially redundant if optimistic worked, but good for sync)
        setChatHistory(prev => prev.map(c => c.id === newId ? { ...c, ...createdChat, messages: c.messages } : c));
        
        return createdChat;
    } catch (error) {
        if (!isVersionMismatch(error)) {
            console.error("Failed to create new chat:", error);
        }
        // Rollback on failure
        setChatHistory(prev => prev.filter(c => c.id !== newId));
        if (currentChatIdRef.current === newId) {
            setCurrentChatId(null);
        }
        return null;
    }
  }, []);

  const loadChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
  }, []);
  
  const deleteChat = useCallback(async (chatId: string) => {
    // Snapshot for rollback
    const previousHistory = chatHistoryRef.current;
    const wasCurrent = currentChatIdRef.current === chatId;

    // Optimistic Update: Remove immediately from UI
    setChatHistory(prev => prev.filter(c => c.id !== chatId));
    if (wasCurrent) {
        setCurrentChatId(null);
    }

    try {
        await fetchApi(`/api/chats/${chatId}`, { method: 'DELETE' });
    } catch (error: any) {
        if (isVersionMismatch(error)) return; 

        // If error is 404, the chat is already gone on server, so our optimistic delete is actually correct.
        if (error.status === 404) {
            console.warn(`Chat ${chatId} was already deleted on server.`);
            return;
        }

        console.error(`Failed to delete chat ${chatId}:`, error);
        // Rollback only on actual failures (500, network)
        setChatHistory(previousHistory);
        if (wasCurrent) {
            setCurrentChatId(chatId);
        }
        // Re-throw so caller (useAppLogic) can show a Toast
        throw error;
    }
  }, []);

  const clearAllChats = useCallback(async () => {
    // Snapshot for rollback
    const previousHistory = chatHistoryRef.current;
    const previousId = currentChatIdRef.current;

    // Optimistic Update
    setChatHistory([]);
    setCurrentChatId(null);

    try {
        await fetchApi('/api/history', { method: 'DELETE' });
    } catch (error) {
        if (isVersionMismatch(error)) return;

        console.error('Failed to clear all chats:', error);
        // Rollback
        setChatHistory(previousHistory);
        setCurrentChatId(previousId);
        // Re-throw so caller (useAppLogic) can show a Toast
        throw error;
    }
  }, []);

  const importChat = useCallback(async (importedChat: ChatSession) => {
    try {
        const newChat = await fetchApi('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(importedChat),
        });
        setChatHistory(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
    } catch (error) {
        if (isVersionMismatch(error)) return;
        console.error('Failed to import chat:', error);
        alert('Failed to import chat. Please check the file format.');
    }
  }, []);
  
  // Local state updates for real-time UI changes during a chat session
  const addMessagesToChat = useCallback((chatId: string, messages: Message[]) => {
    setChatHistory(prev => prev.map(s => s.id !== chatId ? s : { ...s, messages: [...(s.messages || []), ...messages] }));
  }, []);

  const addModelResponse = useCallback((chatId: string, messageId: string, newResponse: ModelResponse) => {
    setChatHistory(prev => prev.map(chat => {
      if (chat.id !== chatId) return chat;
      // Ensure messages exists
      if (!chat.messages) return chat;
      
      const messageIndex = chat.messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) return chat;
      
      const updatedMessages = [...chat.messages];
      const targetMessage = { ...updatedMessages[messageIndex] };
      targetMessage.responses = [...(targetMessage.responses || []), newResponse];
      targetMessage.activeResponseIndex = targetMessage.responses.length - 1;
      updatedMessages[messageIndex] = targetMessage;
      return { ...chat, messages: updatedMessages };
    }));
  }, []);
  
  const updateActiveResponseOnMessage = useCallback((chatId: string, messageId: string, updateFn: (response: ModelResponse) => Partial<ModelResponse>) => {
    setChatHistory(prev => prev.map(chat => {
      if (chat.id !== chatId) return chat;
      if (!chat.messages) return chat;

      const messageIndex = chat.messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1 || chat.messages[messageIndex].role !== 'model') return chat;
      
      const updatedMessages = [...chat.messages];
      const messageToUpdate = { ...updatedMessages[messageIndex] };
      if (!messageToUpdate.responses) return chat;
      
      const activeIdx = messageToUpdate.activeResponseIndex;
      if (activeIdx < 0 || activeIdx >= messageToUpdate.responses.length) return chat;
      
      const updatedResponses = [...messageToUpdate.responses];
      const currentResponse = updatedResponses[activeIdx];
      updatedResponses[activeIdx] = { ...currentResponse, ...updateFn(currentResponse) };
      messageToUpdate.responses = updatedResponses;
      updatedMessages[messageIndex] = messageToUpdate;
      return { ...chat, messages: updatedMessages };
    }));
  }, []);

  const updateChatProperty = useCallback(async (chatId: string, update: Partial<ChatSession>) => {
      // Snapshot for rollback
      const currentHistory = chatHistoryRef.current;
      const chatToUpdate = currentHistory.find(c => c.id === chatId);
      if (!chatToUpdate) return;
      const previousChat = { ...chatToUpdate };

      // Optimistic Update: Update local state immediately
      setChatHistory(prev => prev.map(s => s.id === chatId ? { ...s, ...update } : s));

      try {
          await fetchApi(`/api/chats/${chatId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(update),
          });
      } catch (error) {
          if (isVersionMismatch(error)) return;
          console.error(`Failed to update chat ${chatId}:`, error);
          // Rollback on error
          setChatHistory(prev => prev.map(s => s.id === chatId ? previousChat : s));
      }
  }, []);

  const setActiveResponseIndex = useCallback((chatId: string, messageId: string, index: number) => {
    // We need the current chat data to modify it
    const currentChat = chatHistoryRef.current.find(c => c.id === chatId);
    if (!currentChat || !currentChat.messages) return;

    const messageIndex = currentChat.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const targetMessage = currentChat.messages[messageIndex];
    if (index < 0 || index >= (targetMessage.responses?.length || 0)) return;
    if (targetMessage.activeResponseIndex === index) return; // No change

    const updatedMessages = [...currentChat.messages];
    updatedMessages[messageIndex] = { ...targetMessage, activeResponseIndex: index };

    // 1. Optimistic Update (Immediate UI change)
    setChatHistory(prev => prev.map(s => s.id === chatId ? { ...s, messages: updatedMessages } : s));

    // 2. Debounced Persistence
    // We clear any existing timeout to "reset the clock" on rapid clicks
    if (paginationSaveTimeoutRef.current) {
        clearTimeout(paginationSaveTimeoutRef.current);
    }

    // Set a new timeout to save the data after 1 second of inactivity
    paginationSaveTimeoutRef.current = window.setTimeout(async () => {
        try {
            // We persist the messages array that contains the updated index.
            // Note: In high-concurrency streaming scenarios, this might conflict, but for 
            // typical history navigation, this is the safest way to reduce server load.
            await fetchApi(`/api/chats/${chatId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: updatedMessages }),
            });
        } catch (error) {
            console.error(`Failed to save pagination state for chat ${chatId}:`, error);
        }
    }, 1000);

  }, []);

  const setChatLoadingState = useCallback((chatId: string, isLoading: boolean) => {
    setChatHistory(prev => prev.map(s => s.id === chatId ? { ...s, isLoading } : s));
  }, []);

  const completeChatLoading = useCallback((chatId: string) => {
    setChatLoadingState(chatId, false);
  }, [setChatLoadingState]);

  const updateMessage = useCallback((chatId: string, messageId: string, update: Partial<Message>) => {
    setChatHistory(prev => prev.map(chat => {
        if (chat.id !== chatId) return chat;
        if (!chat.messages) return chat;

        const messageIndex = chat.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return chat;
        
        const updatedMessages = [...chat.messages];
        updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...update };
        return { ...chat, messages: updatedMessages };
    }));
  }, []);
  
  const updateChatTitle = useCallback((chatId: string, title: string) => updateChatProperty(chatId, { title }), [updateChatProperty]);
  const updateChatModel = useCallback((chatId: string, model: string) => updateChatProperty(chatId, { model }), [updateChatProperty]);
  const updateChatSettings = useCallback((chatId: string, settings: Partial<Pick<ChatSession, 'temperature' | 'maxOutputTokens' | 'imageModel' | 'videoModel'>>) => updateChatProperty(chatId, settings), [updateChatProperty]);

  return { 
    chatHistory, currentChatId, isHistoryLoading,
    startNewChat, loadChat, deleteChat, clearAllChats, importChat,
    addMessagesToChat, addModelResponse, updateActiveResponseOnMessage, setActiveResponseIndex,
    updateMessage, setChatLoadingState, completeChatLoading,
    updateChatTitle, updateChatModel, updateChatSettings,
    updateChatProperty
  };
};