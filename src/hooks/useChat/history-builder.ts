
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Part } from "@google/genai";
import { type Message } from '../../types';
import { parseMessageText } from '../../utils/messageParser';

type ApiHistory = {
    role: 'user' | 'model';
    parts: Part[];
}[];

export const buildApiHistory = (messages: Message[]): ApiHistory => {
    const historyForApi: ApiHistory = [];
    messages.forEach((msg: Message) => {
        if (msg.isHidden) return;

        if (msg.role === 'user') {
            const parts: Part[] = [];
            if (msg.text) parts.push({ text: msg.text });
            if (msg.attachments) {
                msg.attachments.forEach(att => parts.push({
                    inlineData: { mimeType: att.mimeType, data: att.data }
                }));
            }
            if (parts.length > 0) {
                historyForApi.push({ role: 'user', parts });
            }
        } else if (msg.role === 'model') {
            const activeResponse = msg.responses?.[msg.activeResponseIndex];
            if (!activeResponse) return;

            const { thinkingText, finalAnswerText } = parseMessageText(activeResponse.text, false, !!activeResponse.error);
            const fullText = activeResponse.text; // Send the full text including thinking steps
            const modelParts: Part[] = [];
            const functionResponseParts: Part[] = [];

            if (fullText) {
                modelParts.push({ text: fullText });
            }

            if (activeResponse.toolCallEvents) {
                activeResponse.toolCallEvents.forEach(event => {
                    // This logic is simplified as the backend now manages the turn-based tool calls.
                    // We only need to provide the history of what has already happened.
                    if (event.result !== undefined) {
                        functionResponseParts.push({
                            functionResponse: {
                                name: event.call.name,
                                response: { result: event.result }
                            }
                        });
                    } else {
                        // Include the tool call in the model's turn if it hasn't been responded to.
                        modelParts.push({ functionCall: event.call });
                    }
                });
            }

            if (modelParts.length > 0) {
                historyForApi.push({ role: 'model', parts: modelParts });
            }
            if (functionResponseParts.length > 0) {
                historyForApi.push({ role: 'user', parts: functionResponseParts });
            }
        }
    });
    return historyForApi;
};