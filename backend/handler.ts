
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { GoogleGenAI } from "@google/genai";
import { promises as fs } from 'fs';
import path from 'path';
import { systemInstruction as agenticSystemInstruction } from "./prompts/system";
import { CHAT_PERSONA_AND_UI_FORMATTING as chatModeSystemInstruction } from './prompts/chatPersona';
import { parseApiError } from './utils/apiError';
import { executeTextToSpeech } from "./tools/tts";
import { executeExtractMemorySuggestions, executeConsolidateMemory } from "./tools/memory";
import { runAgenticLoop } from './services/agenticLoop/index';
import { createToolExecutor } from './tools/index';
import { toolDeclarations, codeExecutorDeclaration } from './tools/declarations'; 
import { getApiKey, getSuggestionApiKey, getProvider } from './settingsHandler';
import { generateContentWithRetry, generateContentStreamWithRetry } from './utils/geminiUtils';
import { historyControl } from './services/historyControl';
import { transformHistoryToGeminiFormat } from './utils/historyTransformer';
import { streamOpenRouter } from './utils/openRouterUtils';
import { vectorMemory } from './services/vectorMemory'; // Import Vector Memory

// Store promises for frontend tool requests that the backend is waiting on
const frontendToolRequests = new Map<string, (result: any) => void>();

// Store abort controllers for ongoing agentic loops to allow cancellation
const activeAgentLoops = new Map<string, AbortController>();

// Using 'any' for res to bypass type definition mismatches in the environment
const writeEvent = (res: any, type: string, payload: any) => {
    if (!res.writableEnded && !res.closed && !res.destroyed) {
        try {
            res.write(JSON.stringify({ type, payload }) + '\n');
        } catch (e) {
            console.error(`[HANDLER] Error writing '${type}' event to stream:`, e);
        }
    }
};

const generateId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// ... (Keep existing generateAsciiTree and generateDirectoryStructure functions) ...
async function generateAsciiTree(dirPath: string, prefix: string = ''): Promise<string> {
    let output = '';
    let entries;
    try {
        entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (e) {
        return `${prefix} [Error reading directory]\n`;
    }
    entries = entries.filter(e => !e.name.startsWith('.'));
    entries.sort((a, b) => {
        if (a.isDirectory() === b.isDirectory()) {
            return a.name.localeCompare(b.name);
        }
        return a.isDirectory() ? -1 : 1;
    });
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const isLast = i === entries.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        output += `${prefix}${connector}${entry.name}\n`;
        if (entry.isDirectory()) {
            const childPrefix = prefix + (isLast ? '    ' : '│   ');
            output += await generateAsciiTree(path.join(dirPath, entry.name), childPrefix);
        }
    }
    return output;
}

async function generateDirectoryStructure(dirPath: string): Promise<any> {
    const name = path.basename(dirPath);
    let stats;
    try { stats = await fs.stat(dirPath); } catch { return null; }
    if (stats.isDirectory()) {
        let entries;
        try { entries = await fs.readdir(dirPath, { withFileTypes: true }); } catch { return null; }
        const children = [];
        entries.sort((a, b) => {
            if (a.isDirectory() === b.isDirectory()) { return a.name.localeCompare(b.name); }
            return a.isDirectory() ? -1 : 1;
        });
        for (const entry of entries) {
            if (entry.name.startsWith('.')) continue;
            const childPath = path.join(dirPath, entry.name);
            const childNode = await generateDirectoryStructure(childPath);
            if (childNode) children.push(childNode);
        }
        return { name, type: 'directory', children };
    } else {
        return { name, type: 'file' };
    }
}

// ... (Keep existing ChatPersistenceManager class) ...
class ChatPersistenceManager {
    private chatId: string;
    private messageId: string;
    private buffer: { text: string } | null = null;
    private saveTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(chatId: string, messageId: string) {
        this.chatId = chatId;
        this.messageId = messageId;
    }
    addText(delta: string) {
        if (!this.buffer) this.buffer = { text: '' };
        this.buffer.text += delta;
        this.scheduleSave();
    }
    async update(modifier: (response: any) => void) {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        try {
            const chat = await historyControl.getChat(this.chatId);
            if (!chat) return;
            const msgIndex = chat.messages.findIndex((m: any) => m.id === this.messageId);
            if (msgIndex !== -1) {
                const message = chat.messages[msgIndex];
                // Ensure robustness for branching: access active response index
                const safeIndex = (message.activeResponseIndex !== undefined && message.responses && message.responses[message.activeResponseIndex])
                    ? message.activeResponseIndex
                    : (message.responses ? message.responses.length - 1 : 0);

                if (message.responses && message.responses[safeIndex]) {
                    const activeResponse = message.responses[safeIndex];
                    if (this.buffer) {
                        activeResponse.text = (activeResponse.text || '') + this.buffer.text;
                        this.buffer = null;
                    }
                    modifier(activeResponse);
                    await historyControl.updateChat(this.chatId, { messages: chat.messages });
                }
            }
        } catch (e) {
            console.error(`[PERSISTENCE] Failed to update chat ${this.chatId}:`, e);
        }
    }
    private scheduleSave() {
        if (this.saveTimeout) return;
        this.saveTimeout = setTimeout(() => this.flush(), 1500); 
    }
    private async flush() {
        this.saveTimeout = null;
        if (!this.buffer) return;
        const textToAppend = this.buffer.text;
        this.buffer = null; 
        try {
            const chat = await historyControl.getChat(this.chatId);
            if (!chat) return;
            const msgIndex = chat.messages.findIndex((m: any) => m.id === this.messageId);
            if (msgIndex !== -1) {
                const message = chat.messages[msgIndex];
                const safeIndex = (message.activeResponseIndex !== undefined && message.responses && message.responses[message.activeResponseIndex])
                    ? message.activeResponseIndex
                    : (message.responses ? message.responses.length - 1 : 0);

                if (message.responses && message.responses[safeIndex]) {
                    const activeResponse = message.responses[safeIndex];
                    activeResponse.text = (activeResponse.text || '') + textToAppend;
                    await historyControl.updateChat(this.chatId, { messages: chat.messages });
                }
            }
        } catch (e) { }
    }
    async complete(finalModifier?: (response: any) => void) {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        try {
            const chat = await historyControl.getChat(this.chatId);
            if (!chat) return;
            const msgIndex = chat.messages.findIndex((m: any) => m.id === this.messageId);
            if (msgIndex !== -1) {
                const message = chat.messages[msgIndex];
                const safeIndex = (message.activeResponseIndex !== undefined && message.responses && message.responses[message.activeResponseIndex])
                    ? message.activeResponseIndex
                    : (message.responses ? message.responses.length - 1 : 0);

                if (message.responses && message.responses[safeIndex]) {
                    const activeResponse = message.responses[safeIndex];
                    if (this.buffer) {
                        activeResponse.text = (activeResponse.text || '') + this.buffer.text;
                        this.buffer = null;
                    }
                    if (finalModifier) finalModifier(activeResponse);
                    message.isThinking = false;
                    await historyControl.updateChat(this.chatId, { messages: chat.messages });
                }
            }
        } catch (e) {
            console.error(`[PERSISTENCE] Failed to complete save for chat ${this.chatId}:`, e);
        }
    }
}

export const apiHandler = async (req: any, res: any) => {
    const task = req.query.task as string;
    const activeProvider = await getProvider();
    const mainApiKey = await getApiKey();
    const suggestionApiKey = await getSuggestionApiKey();
    const SUGGESTION_TASKS = ['title', 'suggestions', 'enhance', 'memory_suggest', 'memory_consolidate'];
    const isSuggestionTask = SUGGESTION_TASKS.includes(task);
    let activeApiKey = mainApiKey;
    if (isSuggestionTask && suggestionApiKey) {
        activeApiKey = suggestionApiKey;
    } 
    const BYPASS_TASKS = ['tool_response', 'cancel', 'debug_data_tree'];
    if (!activeApiKey && !BYPASS_TASKS.includes(task)) {
        return res.status(401).json({ error: "API key not configured on the server." });
    }
    const ai = (activeProvider === 'gemini' || isSuggestionTask) && activeApiKey 
        ? new GoogleGenAI({ apiKey: activeApiKey }) 
        : null;

    // Initialize Vector Store if AI is available
    if (ai) {
        await vectorMemory.init(ai);
    }

    try {
        switch (task) {
            case 'chat': 
            case 'regenerate': {
                const { chatId, model, settings, newMessage, messageId } = req.body;
                
                // 1. Initial Persistence & History Fetch
                let savedChat = await historyControl.getChat(chatId);
                if (!savedChat) return res.status(404).json({ error: "Chat not found" });

                let historyMessages = savedChat.messages || [];
                // Context for the AI to read (everything before the new/regenerating message)
                let historyForAI: any[] = [];

                if (task === 'chat' && newMessage) {
                    historyMessages.push(newMessage);
                    // Add User Message to Vector Memory (RAG Ingestion)
                    if (ai && newMessage.text && newMessage.text.length > 10) {
                        vectorMemory.addMemory(newMessage.text, { chatId, role: 'user' }).catch(console.error);
                    }
                    const modelPlaceholder = {
                        id: messageId,
                        role: 'model' as const,
                        text: '',
                        isThinking: true,
                        startTime: Date.now(),
                        responses: [{ text: '', toolCallEvents: [], startTime: Date.now() }],
                        activeResponseIndex: 0
                    };
                    historyMessages.push(modelPlaceholder);
                    savedChat = await historyControl.updateChat(chatId, { messages: historyMessages });
                    historyForAI = historyMessages.slice(0, -1);
                } else if (task === 'regenerate') {
                     // NEW LOGIC:
                     // The frontend handles the branching/placeholder setup via updateChat before calling this.
                     // We just need to identify the message to calculate the preceding context.
                     const targetIndex = historyMessages.findIndex((m: any) => m.id === messageId);
                     
                     if (targetIndex !== -1) {
                         // Context is everything BEFORE the target message
                         historyForAI = historyMessages.slice(0, targetIndex);
                         // We do NOT modify the history array or save here, preserving the structure set by frontend.
                     } else {
                         // Fallback: If message doesn't exist (e.g. race condition or direct API call), create it.
                         const modelPlaceholder = {
                            id: messageId,
                            role: 'model' as const,
                            text: '',
                            isThinking: true,
                            startTime: Date.now(),
                            responses: [{ text: '', toolCallEvents: [], startTime: Date.now() }],
                            activeResponseIndex: 0
                        };
                        historyMessages.push(modelPlaceholder);
                        savedChat = await historyControl.updateChat(chatId, { messages: historyMessages });
                        historyForAI = historyMessages.slice(0, -1);
                     }
                }

                if (!savedChat) throw new Error("Failed to initialize chat persistence");

                const persistence = new ChatPersistenceManager(chatId, messageId);

                // --- RAG RETRIEVAL STEP ---
                let ragContext = "";
                if (ai && newMessage && newMessage.text) {
                    try {
                        const relevantMemories = await vectorMemory.retrieveRelevant(newMessage.text);
                        if (relevantMemories.length > 0) {
                            ragContext = `\n## 🧠 RELEVANT MEMORIES (RAG)\nThe following past information may be relevant to the user's current request:\n- ${relevantMemories.join('\n- ')}\n\n`;
                            console.log(`[RAG] Retrieved ${relevantMemories.length} context chunks.`);
                        }
                    } catch (e) {
                        console.error("[RAG] Retrieval failed:", e);
                    }
                }

                // --- SYSTEM PROMPT CONSTRUCTION ---
                // We construct this logic BEFORE the provider check so OpenRouter also gets the full prompt context.
                const coreInstruction = settings.isAgentMode ? agenticSystemInstruction : chatModeSystemInstruction;
                const { systemPrompt, aboutUser, aboutResponse } = settings;
                
                // CRITICAL: Personalization Injection
                // We ensure this is prepended forcefully
                let personalizationSection = "";
                if (aboutUser && aboutUser.trim()) personalizationSection += `\n## 👤 USER PROFILE & CONTEXT\n${aboutUser.trim()}\n`;
                if (aboutResponse && aboutResponse.trim()) personalizationSection += `\n## 🎭 RESPONSE STYLE & PERSONA PREFERENCES\n${aboutResponse.trim()}\n`;
                if (systemPrompt && systemPrompt.trim()) personalizationSection += `\n## 🔧 CUSTOM USER DIRECTIVES\n${systemPrompt.trim()}\n`;

                // Inject RAG Context into System Instruction
                if (ragContext) {
                    personalizationSection += ragContext;
                }

                let finalSystemInstruction = coreInstruction;
                if (personalizationSection) {
                    finalSystemInstruction = `
# 🟢 PRIORITY 1: USER PERSONALIZATION & MEMORY
The following instructions are ABSOLUTE. They override any default persona traits defined later.

${personalizationSection}

================================================================================

# ⚙️ CORE SYSTEM DIRECTIVES (Secondary to Personalization)
${coreInstruction}
`.trim();
                }

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Transfer-Encoding', 'chunked');
                res.flushHeaders();

                const requestId = generateId();
                const abortController = new AbortController();
                activeAgentLoops.set(requestId, abortController);
                writeEvent(res, 'start', { requestId });

                const pingInterval = setInterval(() => writeEvent(res, 'ping', {}), 10000);
                
                req.on('close', () => {
                    clearInterval(pingInterval);
                });

                if (activeProvider === 'openrouter') {
                    // Flatten using the same robust transformer, mapping roles for OpenRouter
                    const flatHistory = transformHistoryToGeminiFormat(historyForAI);
                    
                    const openRouterMessages = flatHistory.map((msg: any) => ({
                        role: msg.role === 'model' ? 'assistant' : 'user',
                        // Combine parts into single text for OpenRouter
                        content: (msg.parts || []).map((p: any) => p.text || '').join('\n')
                    }));
                    
                    // Inject the fully constructed system instruction
                    openRouterMessages.unshift({ role: 'system', content: finalSystemInstruction });

                    try {
                        await streamOpenRouter(
                            activeApiKey!,
                            model,
                            openRouterMessages,
                            {
                                onTextChunk: (text) => {
                                    writeEvent(res, 'text-chunk', text);
                                    persistence.addText(text);
                                },
                                onComplete: (fullText) => {
                                    writeEvent(res, 'complete', { finalText: fullText });
                                    persistence.complete((response) => {
                                        response.endTime = Date.now();
                                    });
                                },
                                onError: (error) => {
                                    writeEvent(res, 'error', { message: error.message || 'OpenRouter Error' });
                                    persistence.complete((response) => {
                                        response.error = { message: error.message || 'OpenRouter Error' };
                                    });
                                }
                            },
                            { temperature: settings.temperature, maxTokens: settings.maxOutputTokens }
                        );
                    } catch (e: any) {
                        writeEvent(res, 'error', { message: e.message });
                        persistence.complete((response) => { response.error = { message: e.message }; });
                    } finally {
                        clearInterval(pingInterval);
                        activeAgentLoops.delete(requestId);
                        if (!res.writableEnded) res.end();
                    }
                    return;
                }

                if (!ai) throw new Error("Gemini AI not initialized.");

                let fullHistory = transformHistoryToGeminiFormat(historyForAI);
                const sessionCallIds = new Set<string>();

                const requestFrontendExecution = (callId: string, toolName: string, toolArgs: any) => {
                    return new Promise<string | { error: string }>((resolve) => {
                        if (res.writableEnded || res.closed || res.destroyed) {
                            resolve({ error: "Client disconnected." });
                            return;
                        }
                        const timeoutId = setTimeout(() => {
                            if (frontendToolRequests.has(callId)) {
                                frontendToolRequests.delete(callId);
                                resolve({ error: "Tool execution timed out." });
                            }
                        }, 60000); 
                        frontendToolRequests.set(callId, (result) => {
                            clearTimeout(timeoutId);
                            resolve(result);
                        });
                        sessionCallIds.add(callId);
                        writeEvent(res, 'frontend-tool-request', { callId, toolName, toolArgs });
                    });
                };
                
                const onToolUpdate = (callId: string, data: any) => {
                    writeEvent(res, 'tool-update', { id: callId, ...data });
                };
                
                const toolExecutor = createToolExecutor(ai, settings.imageModel, settings.videoModel, activeApiKey!, chatId, requestFrontendExecution, false, onToolUpdate);

                const finalSettings = {
                    ...settings,
                    systemInstruction: finalSystemInstruction,
                    tools: settings.isAgentMode ? [{ functionDeclarations: toolDeclarations }] : [{ googleSearch: {} }],
                };
                
                // --- DEBUG LOGGING ---
                console.log('\n\x1b[36m%s\x1b[0m', '╔═══════════════════════ FULL AI PROMPT CONTEXT ═══════════════════════╗');
                console.log('\x1b[1m%s\x1b[0m', '▶ MODEL:', model);
                console.log('\x1b[33m%s\x1b[0m', '\n▶ SYSTEM INSTRUCTION (Internal + Personalization + RAG):');
                // console.log(finalSystemInstruction);
                console.log('\x1b[33m%s\x1b[0m', '\n▶ CONVERSATION HISTORY (Gemini Format):');
                
                // Safe logger to truncate base64 data for cleaner console output
                const safeHistoryLog = fullHistory.map(h => ({
                    role: h.role,
                    parts: (h.parts || []).map(p => {
                        if (p.inlineData) return { inlineData: { mimeType: p.inlineData.mimeType, data: '[BASE64_DATA_TRUNCATED]' } };
                        return p;
                    })
                }));
                // console.log(JSON.stringify(safeHistoryLog, null, 2));
                console.log('\x1b[36m%s\x1b[0m', '╚══════════════════════════════════════════════════════════════════════╝\n');
                // --- END DEBUG LOGGING ---

                try {
                    await runAgenticLoop({
                        ai,
                        model,
                        history: fullHistory, 
                        toolExecutor,
                        callbacks: {
                            onTextChunk: (text) => {
                                writeEvent(res, 'text-chunk', text);
                                persistence.addText(text);
                            },
                            onNewToolCalls: (toolCallEvents) => {
                                writeEvent(res, 'tool-call-start', toolCallEvents);
                                persistence.update((response) => {
                                    response.toolCallEvents = [...(response.toolCallEvents || []), ...toolCallEvents];
                                });
                            },
                            onToolResult: (id, result) => {
                                writeEvent(res, 'tool-call-end', { id, result });
                                persistence.update((response) => {
                                    if (response.toolCallEvents) {
                                        const event = response.toolCallEvents.find((e: any) => e.id === id);
                                        if (event) {
                                            event.result = result;
                                            event.endTime = Date.now();
                                        }
                                    }
                                });
                            },
                            onPlanReady: (plan) => {
                                return new Promise((resolve) => {
                                    if (res.writableEnded || res.closed) {
                                        resolve(false); 
                                        return;
                                    }
                                    const callId = `plan-approval-${generateId()}`;
                                    persistence.update((response) => {
                                        response.plan = { plan, callId };
                                    });
                                    frontendToolRequests.set(callId, resolve);
                                    sessionCallIds.add(callId);
                                    writeEvent(res, 'plan-ready', { plan, callId });
                                });
                            },
                            onFrontendToolRequest: (callId, name, args) => { },
                            onComplete: (finalText, groundingMetadata) => {
                                writeEvent(res, 'complete', { finalText, groundingMetadata });
                                persistence.complete((response) => {
                                    response.endTime = Date.now();
                                    if (groundingMetadata) response.groundingMetadata = groundingMetadata;
                                });
                                // Add Final Answer to Vector Memory
                                if (finalText.length > 50) {
                                    vectorMemory.addMemory(finalText, { chatId, role: 'model' }).catch(console.error);
                                }
                            },
                            onCancel: () => {
                                writeEvent(res, 'cancel', {});
                                persistence.complete();
                            },
                            onError: (error) => {
                                writeEvent(res, 'error', error);
                                persistence.complete((response) => {
                                    response.error = error;
                                    response.endTime = Date.now();
                                });
                            },
                        },
                        settings: finalSettings,
                        signal: abortController.signal,
                        threadId: requestId,
                    });
                } catch (loopError) {
                    console.error(`[HANDLER] Loop crash:`, loopError);
                    persistence.complete((response) => { response.error = parseApiError(loopError); });
                } finally {
                    clearInterval(pingInterval);
                    activeAgentLoops.delete(requestId);
                    if (!res.writableEnded) res.end();
                }
                break;
            }
            // ... (other cases remain the same) ...
            case 'tool_response': {
                const { callId, result, error } = req.body;
                const resolver = frontendToolRequests.get(callId);
                if (resolver) {
                    resolver(error ? { error } : result);
                    frontendToolRequests.delete(callId);
                    res.status(200).send();
                } else {
                    res.status(404).json({ error: `No pending tool request found for callId: ${callId}` });
                }
                break;
            }
            case 'cancel': {
                const { requestId } = req.body;
                const controller = activeAgentLoops.get(requestId);
                if (controller) {
                    controller.abort();
                    activeAgentLoops.delete(requestId);
                    res.status(200).send({ message: 'Cancellation request received.' });
                } else {
                    res.status(404).json({ error: `No active request found for requestId: ${requestId}` });
                }
                break;
            }
            case 'title': {
                if (!ai) return res.status(200).json({ title: '' });
                const { messages } = req.body;
                const historyText = messages.slice(0, 3).map((m: any) => `${m.role}: ${m.text}`).join('\n');
                const prompt = `Generate a short concise title (max 6 words) for this conversation.\n\nCONVERSATION:\n${historyText}\n\nTITLE:`;
                try {
                    const response = await generateContentWithRetry(ai, { model: 'gemini-2.5-flash', contents: prompt });
                    res.status(200).json({ title: response.text?.trim() ?? '' });
                } catch (e) { res.status(200).json({ title: '' }); }
                break;
            }
            case 'suggestions': {
                if (!ai) return res.status(200).json({ suggestions: [] });
                const { conversation } = req.body;
                const recentHistory = conversation.slice(-5).map((m: any) => `${m.role}: ${(m.text || '').substring(0, 200)}`).join('\n');
                const prompt = `Suggest 3 short follow-up questions. Return JSON array of strings.\n\nCONVERSATION:\n${recentHistory}\n\nJSON SUGGESTIONS:`;
                try {
                    const response = await generateContentWithRetry(ai, { model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
                    let suggestions = [];
                    try { suggestions = JSON.parse(response.text || '[]'); } catch (e) {}
                    res.status(200).json({ suggestions });
                } catch (e) { res.status(200).json({ suggestions: [] }); }
                break;
            }
            case 'tts': {
                if (!ai) throw new Error("GoogleGenAI not initialized.");
                const { text, voice, model } = req.body;
                try {
                    const audio = await executeTextToSpeech(ai, text, voice, model);
                    res.status(200).json({ audio });
                } catch (e) {
                    res.status(500).json({ error: parseApiError(e) });
                }
                break;
            }
            case 'enhance': {
                if (!ai) return res.status(200).send(req.body.userInput);
                const { userInput } = req.body;
                const prompt = `Optimize this prompt for an LLM: "${userInput}". Return only the optimized prompt.`;
                res.setHeader('Content-Type', 'text/plain');
                try {
                    const stream = await generateContentStreamWithRetry(ai, { model: 'gemini-3-flash-preview', contents: prompt });
                    for await (const chunk of stream) {
                        const text = chunk.text || '';
                        if (text) res.write(text);
                    }
                } catch (e) { res.write(userInput); }
                res.end();
                break;
            }
            case 'memory_suggest': {
                if (!ai) return res.status(200).json({ suggestions: [] });
                const { conversation } = req.body;
                try {
                    const suggestions = await executeExtractMemorySuggestions(ai, conversation);
                    res.status(200).json({ suggestions });
                } catch (e) { res.status(200).json({ suggestions: [] }); }
                break;
            }
            case 'memory_consolidate': {
                if (!ai) return res.status(200).json({ memory: [req.body.currentMemory, ...req.body.suggestions].filter(Boolean).join('\n') });
                const { currentMemory, suggestions } = req.body;
                try {
                    const memory = await executeConsolidateMemory(ai, currentMemory, suggestions);
                    res.status(200).json({ memory });
                } catch (e) { res.status(200).json({ memory: [currentMemory, ...suggestions].filter(Boolean).join('\n') }); }
                break;
            }
            case 'tool_exec': {
                 if (!ai) throw new Error("GoogleGenAI not initialized.");
                const { toolName, toolArgs, chatId } = req.body;
                const toolExecutor = createToolExecutor(ai, '', '', activeApiKey!, chatId, async () => ({error: 'Frontend execution not supported'}), true);
                const result = await toolExecutor(toolName, toolArgs, 'manual-exec');
                res.status(200).json({ result });
                break;
            }
            case 'debug_data_tree': {
                const dataPath = path.join((process as any).cwd(), 'data');
                const ascii = `data/\n` + await generateAsciiTree(dataPath);
                const structure = await generateDirectoryStructure(dataPath);
                res.status(200).json({ ascii, json: structure });
                break;
            }
            default:
                res.status(404).json({ error: `Unknown task: ${task}` });
        }
    } catch (error) {
        console.error(`[HANDLER] Error processing task "${task}":`, error);
        const parsedError = parseApiError(error);
        if (!res.headersSent) {
            res.status(500).json({ error: parsedError });
        }
    }
};
