/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { historyControl } from './services/historyControl';
import type { ChatSession } from '../src/types';

const generateId = () => Math.random().toString(36).substring(2, 9);

export const getHistory = async (req: any, res: any) => {
    try {
        const history = await historyControl.getHistoryList();
        res.status(200).json(history);
    } catch (error) {
        console.error('Failed to get chat history:', error);
        res.status(500).json({ error: 'Failed to retrieve chat history from the server.' });
    }
};

export const getChat = async (req: any, res: any) => {
    try {
        const chat = await historyControl.getChat(req.params.chatId);
        if (chat) {
            res.status(200).json(chat);
        } else {
            res.status(404).json({ error: 'Chat not found' });
        }
    } catch (error: any) {
        console.error(`[CRUD] Failed to get chat ${req.params.chatId}:`, error);
        res.status(500).json({ error: "Internal server error reading chat." });
    }
};

export const createNewChat = async (req: any, res: any) => {
    try {
        // Accept optional 'id' from client for optimistic updates
        const { id, model, temperature, maxOutputTokens, imageModel, videoModel } = req.body;
        const newChatId = id || generateId();
        const newChat: ChatSession = {
            id: newChatId,
            title: "New Chat",
            messages: [],
            model: model,
            isLoading: false,
            createdAt: Date.now(),
            temperature,
            maxOutputTokens,
            imageModel: imageModel,
            videoModel: videoModel,
        };
        
        await historyControl.createChat(newChat);
        res.status(201).json(newChat);
    } catch (error) {
        console.error("Failed to create chat:", error);
        res.status(500).json({ error: "Failed to create chat session." });
    }
};

export const updateChat = async (req: any, res: any) => {
    try {
        const { chatId } = req.params;
        const updates = req.body;
        
        // historyControl.updateChat handles title renaming and index updating automatically
        const updatedChat = await historyControl.updateChat(chatId, updates);
        
        if (!updatedChat) {
            // If chat doesn't exist in index (e.g. manual deletion or sync issue), attempt to recreate it.
             console.warn(`[CRUD] updateChat called for non-existent chatId "${chatId}". Creating new session.`);
             const recoveredChat: ChatSession = {
                id: chatId,
                title: updates.title || "New Chat",
                messages: updates.messages || [],
                model: updates.model || '',
                createdAt: Date.now(),
                ...updates
            };
            await historyControl.createChat(recoveredChat);
            res.status(200).json(recoveredChat);
            return;
        }

        res.status(200).json(updatedChat);
    } catch (error: any) {
        console.error(`[CRUD] Failed to update chat ${req.params.chatId}:`, error);
        res.status(500).json({ error: "Failed to update chat session.", details: error.message });
    }
};

export const deleteChat = async (req: any, res: any) => {
    try {
        await historyControl.deleteChat(req.params.chatId);
        res.status(204).send();
    } catch (error: any) {
        console.error(`[CRUD] Failed to delete chat ${req.params.chatId}:`, error);
        res.status(500).json({ error: "Failed to delete chat." });
    }
};

export const deleteAllHistory = async (req: any, res: any) => {
    try {
        await historyControl.deleteAllChats();
        res.status(204).send();
    } catch (error) {
        console.error("Failed to delete all history:", error);
        res.status(500).json({ error: "Failed to delete all data." });
    }
};

export const importChat = async (req: any, res: any) => {
    try {
        const importedChat = req.body as ChatSession;
        
        // Robust Validation
        if (!importedChat || typeof importedChat !== 'object') {
             return res.status(400).json({ error: "Invalid chat format: Root must be an object." });
        }
        if (typeof importedChat.title !== 'string') {
             return res.status(400).json({ error: "Invalid chat format: Title missing or invalid." });
        }
        if (!Array.isArray(importedChat.messages)) {
             return res.status(400).json({ error: "Invalid chat format: Messages array missing." });
        }
        
        // Deep check a few messages to ensure structure
        const isValidStructure = importedChat.messages.every((m: any) => 
            m && typeof m.id === 'string' && (m.role === 'user' || m.role === 'model')
        );
        
        if (!isValidStructure) {
             return res.status(400).json({ error: "Invalid chat format: Corrupt message structure." });
        }

        const newChat: ChatSession = {
            ...importedChat,
            id: generateId(), // Always regenerate ID to avoid collision
            createdAt: Date.now(),
            isLoading: false,
        };
        await historyControl.createChat(newChat);
        res.status(201).json(newChat);
    } catch (error) {
        console.error("Failed to import chat:", error);
        res.status(500).json({ error: "Failed to import chat." });
    }
};