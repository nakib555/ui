/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Content, Part } from "@google/genai";
import { Message } from '../../src/types';
import { parseMessageText } from '../../src/utils/messageParser';

// Maximum number of previous exchange turns to send to the model.
// 20 turns = ~40 messages (User + AI).
const MAX_HISTORY_TURNS = 20;

// Maximum length for OLD tool outputs.
// If a tool output is not from the very last turn, we truncate it to save tokens.
const MAX_OLD_TOOL_OUTPUT_LENGTH = 500;

export const transformHistoryToGeminiFormat = (messages: Message[]): Content[] => {
    let historyForApi: Content[] = [];
    
    const pushContent = (role: 'user' | 'model', parts: Part[]) => {
        // Merge consecutive messages from the same role to satisfy Gemini API constraints
        if (historyForApi.length > 0 && historyForApi[historyForApi.length - 1] && historyForApi[historyForApi.length - 1].role === role) {
            const lastEntry = historyForApi[historyForApi.length - 1];
            if (lastEntry.parts) {
                lastEntry.parts.push(...parts);
            }
        } else {
            historyForApi.push({ role, parts });
        }
    };

    // 1. Filter hidden messages first
    const visibleMessages = messages.filter(msg => !msg.isHidden);

    // 2. Apply Sliding Window
    // We keep the *last* N messages to fit in context.
    // However, we must ensure we don't split a tool call from its response.
    let startIndex = 0;
    if (visibleMessages.length > MAX_HISTORY_TURNS * 2) {
        startIndex = visibleMessages.length - (MAX_HISTORY_TURNS * 2);
    }
    
    // Always include the very first message if it's a user message (often contains core intent),
    // unless the conversation is huge, then reliance on Summary memory (if implemented) is better.
    // For now, we strictly slice to avoid token overload.
    const slicedMessages = visibleMessages.slice(startIndex);

    slicedMessages.forEach((msg: Message, index: number) => {
        // Is this the very last message in the list?
        const isLastMessage = index === slicedMessages.length - 1;

        if (msg.role === 'user') {
            const parts: Part[] = [];
            
            // --- Versioning Logic ---
            // Prioritize active version content if available, otherwise fallback to root props
            let textContent = msg.text;
            let attachments = msg.attachments;

            if (msg.versions && typeof msg.activeVersionIndex === 'number') {
                const activeVersion = msg.versions[msg.activeVersionIndex];
                if (activeVersion) {
                    textContent = activeVersion.text;
                    // If the version has specific attachments, use them. 
                    // Otherwise keep root attachments (legacy behavior/simplification).
                    if (activeVersion.attachments) {
                        attachments = activeVersion.attachments;
                    }
                }
            }
            // ------------------------

            if (textContent) parts.push({ text: textContent });
            
            if (attachments) {
                attachments.forEach(att => parts.push({
                    inlineData: { mimeType: att.mimeType, data: att.data }
                }));
            }
            if (parts.length > 0) {
                pushContent('user', parts);
            }
        } else if (msg.role === 'model') {
            const activeResponse = msg.responses?.[msg.activeResponseIndex];
            if (!activeResponse) return;

            // We send the FULL text (thought + answer) so the model maintains chain of thought
            const fullText = activeResponse.text; 
            const modelParts: Part[] = [];
            const functionResponseParts: Part[] = [];

            if (fullText) {
                modelParts.push({ text: fullText });
            }

            if (activeResponse.toolCallEvents) {
                activeResponse.toolCallEvents.forEach(event => {
                    if (event.result !== undefined) {
                        // TRUNCATION LOGIC:
                        // If this is NOT the last message, truncate large tool outputs.
                        // This prevents "Browser" or "ListFiles" from eating 100k tokens 10 turns later.
                        let resultText = event.result;
                        
                        if (!isLastMessage && typeof resultText === 'string' && resultText.length > MAX_OLD_TOOL_OUTPUT_LENGTH) {
                            resultText = resultText.substring(0, MAX_OLD_TOOL_OUTPUT_LENGTH) + 
                                `\n...[Output truncated to save context. Original length: ${event.result.length} chars]...`;
                        }

                        functionResponseParts.push({
                            functionResponse: {
                                name: event.call.name,
                                response: { result: resultText }
                            }
                        });
                    } else {
                        // Include the tool call in the model's turn
                        modelParts.push({ functionCall: event.call });
                    }
                });
            }

            if (modelParts.length > 0) {
                pushContent('model', modelParts);
            }
            if (functionResponseParts.length > 0) {
                pushContent('user', functionResponseParts);
            }
        }
    });
    return historyForApi;
};