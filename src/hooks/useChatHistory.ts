
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatSession, Message, ModelResponse } from '../types';
import { fetchFromApi } from '../utils/api';

const fetchApi = async (url: string, options?: RequestInit) => {
    let finalUrl = url;
    if (!options || options.method === 'GET' || !options.method) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl = `${finalUrl}${separator}_t=${Date.now()}`;
    }

    const response = await fetchFromApi(finalUrl, options);
    
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        throw new Error("Server returned HTML instead of JSON. Backend might be offline.");
    }

    if (!response.ok) {
        let errorMsg = response.statusText || 'API request failed';
        try {
            const errorBody = await response.json();
            errorMsg = errorBody.error?.message || errorBody.message || errorMsg;
        } catch (e) {}
        
        const enrichedError = new Error(errorMsg);
        (enrichedError as any).status = response.status;
        throw enrichedError;
    }
    
    if (response.status === 204) return null;
    return response.json();
};

const isVersionMismatch = (error: unknown): boolean => {
    return error instanceof Error && error.message === 'Version mismatch';
};

export const useChatHistory = () => {
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const chatHistoryRef = useRef(chatHistory);
  const currentChatIdRef = useRef(currentChatId);
  const paginationSaveTimeoutRef = useRef<number | null>(null);

  useEffect(() => { chatHistoryRef.current = chatHistory; }, [chatHistory]);
  useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);

  useEffect(() => {
    const loadHistory = async () => {
        try {
            const history = await fetchApi('/api/history');
            setChatHistory(history || []);
        } catch (error) {
            if (!isVersionMismatch(error)) {
                console.error("Failed to load chat history:", error);
            }
        } finally {
            setIsHistoryLoading(false);
        }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    if (!currentChatId || isHistoryLoading) return;

    const chat = chatHistory.find(c => c.id === currentChatId);
    if (!chat) return;
    
    // If we already have messages, we don't need to load anything.
    if (chat.messages) return;
    
    // If it's already loading (set by loadChat optimistically), we proceed to fetch.
    // If it's NOT loading yet (edge case), set it now.
    if (!chat.isLoading) {
        setChatHistory(prev => prev.map(c => c.id === currentChatId ? { ...c, isLoading: true } : c));
    }

    const loadFullChat = async () => {
        try {
            const fullChat: ChatSession = await fetchApi(`/api/chats/${currentChatId}`);
            setChatHistory(prev => prev.map(c => c.id === currentChatId ? { ...fullChat, isLoading: false } : c));
        } catch (error) {
            if (!isVersionMismatch(error)) {
                console.error(`Failed to load full chat ${currentChatId}:`, error);
            }
            if ((error as any).status === 404) {
                setChatHistory(prev => prev.filter(c => c.id !== currentChatId));
                if (currentChatIdRef.current === currentChatId) setCurrentChatId(null);
            } else {
                setChatHistory(prev => prev.map(c => c.id === currentChatId ? { ...c, isLoading: false } : c));
            }
        }
    };
    loadFullChat();
  }, [currentChatId, isHistoryLoading, chatHistory]);

  const startNewChat = useCallback(async (model: string, settings: any, optimisticId?: string): Promise<ChatSession | null> => {
    const newId = optimisticId || Math.random().toString(36).substring(2, 9);
    const newChat: ChatSession = {
        id: newId,
        title: "New Chat",
        messages: [],
        model: model,
        isLoading: false,
        createdAt: Date.now(),
        ...settings
    };

    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChatId(newId);

    try {
        const createdChat: ChatSession = await fetchApi('/api/chats/new', {
            method: 'POST',
            body: JSON.stringify({ id: newId, model, ...settings }),
        });
        return createdChat;
    } catch (error) {
        if (!isVersionMismatch(error)) console.error("Failed to persist new chat:", error);
        setChatHistory(prev => prev.filter(c => c.id !== newId));
        if (currentChatIdRef.current === newId) setCurrentChatId(null);
        return null;
    }
  }, []);

  const loadChat = useCallback((chatId: string) => { 
      setCurrentChatId(chatId); 
  }, []);
  
  const deleteChat = useCallback(async (chatId: string) => {
    const previousHistory = chatHistoryRef.current;
    const wasCurrent = currentChatIdRef.current === chatId;

    setChatHistory(prev => prev.filter(c => c.id !== chatId));
    if (wasCurrent) setCurrentChatId(null);

    try {
        await fetchApi(`/api/chats/${chatId}`, { method: 'DELETE' });
    } catch (error: any) {
        if (isVersionMismatch(error)) return; 
        if (error.status === 404) return;
        setChatHistory(previousHistory);
        if (wasCurrent) setCurrentChatId(chatId);
        throw error;
    }
  }, []);

  const clearAllChats = useCallback(async () => {
    const previousHistory = chatHistoryRef.current;
    const previousId = currentChatIdRef.current;
    setChatHistory([]);
    setCurrentChatId(null);
    try {
        await fetchApi('/api/history', { method: 'DELETE' });
    } catch (error) {
        if (isVersionMismatch(error)) return;
        setChatHistory(previousHistory);
        setCurrentChatId(previousId);
        throw error;
    }
  }, []);

  const importChat = useCallback(async (importedChat: ChatSession) => {
    try {
        const newChat = await fetchApi('/api/import', {
            method: 'POST',
            body: JSON.stringify(importedChat),
        });
        setChatHistory(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
    } catch (error) {
        if (isVersionMismatch(error)) return;
        alert('Import failed. Please check the file format.');
    }
  }, []);
  
  const addMessagesToChat = useCallback((chatId: string, messages: Message[]) => {
    setChatHistory(prev => prev.map(s => s.id !== chatId ? s : { ...s, messages: [...(s.messages || []), ...messages] }));
  }, []);

  const addModelResponse = useCallback((chatId: string, messageId: string, newResponse: ModelResponse) => {
    setChatHistory(prev => prev.map(chat => {
      if (chat.id !== chatId || !chat.messages) return chat;
      const index = chat.messages.findIndex(m => m.id === messageId);
      if (index === -1) return chat;
      const updatedMessages = [...chat.messages];
      const target = { ...updatedMessages[index] };
      target.responses = [...(target.responses || []), newResponse];
      target.activeResponseIndex = target.responses.length - 1;
      updatedMessages[index] = target;
      return { ...chat, messages: updatedMessages };
    }));
  }, []);
  
  const updateActiveResponseOnMessage = useCallback((chatId: string, messageId: string, updateFn: (response: ModelResponse) => Partial<ModelResponse>) => {
    setChatHistory(prev => prev.map(chat => {
      if (chat.id !== chatId || !chat.messages) return chat;
      const index = chat.messages.findIndex(m => m.id === messageId);
      if (index === -1 || chat.messages[index].role !== 'model') return chat;
      const updatedMessages = [...chat.messages];
      const msg = { ...updatedMessages[index] };
      if (!msg.responses) return chat;
      const activeIdx = msg.activeResponseIndex;
      const updatedResponses = [...msg.responses];
      updatedResponses[activeIdx] = { ...updatedResponses[activeIdx], ...updateFn(updatedResponses[activeIdx]) };
      msg.responses = updatedResponses;
      updatedMessages[index] = msg;
      return { ...chat, messages: updatedMessages };
    }));
  }, []);

  const updateChatProperty = useCallback(async (chatId: string, update: Partial<ChatSession>) => {
      const currentHistory = chatHistoryRef.current;
      const chatToUpdate = currentHistory.find(c => c.id === chatId);
      if (!chatToUpdate) return;
      const previousChat = { ...chatToUpdate };

      setChatHistory(prev => prev.map(s => s.id === chatId ? { ...s, ...update } : s));

      try {
          await fetchApi(`/api/chats/${chatId}`, {
              method: 'PUT',
              body: JSON.stringify(update),
          });
      } catch (error) {
          if (isVersionMismatch(error)) return;
          setChatHistory(prev => prev.map(s => s.id === chatId ? previousChat : s));
      }
  }, []);

  const setActiveResponseIndex = useCallback((chatId: string, messageId: string, index: number) => {
    const currentChat = chatHistoryRef.current.find(c => c.id === chatId);
    if (!currentChat || !currentChat.messages) return;

    const messageIndex = currentChat.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const targetMessage = currentChat.messages[messageIndex];
    if (index < 0 || index >= (targetMessage.responses?.length || 0)) return;
    if (targetMessage.activeResponseIndex === index) return;

    const updatedMessages = [...currentChat.messages];
    updatedMessages[messageIndex] = { ...targetMessage, activeResponseIndex: index };

    setChatHistory(prev => prev.map(s => s.id === chatId ? { ...s, messages: updatedMessages } : s));

    if (paginationSaveTimeoutRef.current) clearTimeout(paginationSaveTimeoutRef.current);

    paginationSaveTimeoutRef.current = window.setTimeout(async () => {
        try {
            await fetchApi(`/api/chats/${chatId}`, {
                method: 'PUT',
                body: JSON.stringify({ messages: updatedMessages }),
            });
        } catch (error) {}
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
        if (chat.id !== chatId || !chat.messages) return chat;
        const index = chat.messages.findIndex(m => m.id === messageId);
        if (index === -1) return chat;
        const updated = [...chat.messages];
        updated[index] = { ...updated[index], ...update };
        return { ...chat, messages: updated };
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
