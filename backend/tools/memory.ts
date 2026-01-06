/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import type { Message } from '../../src/types';
import { generateContentWithRetry } from "../utils/geminiUtils";

export const executeExtractMemorySuggestions = async (ai: GoogleGenAI, conversation: Message[]): Promise<string[]> => {
    const conversationTranscript = conversation
        .filter(msg => !msg.isHidden)
        .map(msg => {
            let text = '';
            if (msg.role === 'user') {
                // Handle versioning for user messages
                text = msg.text;
                if (msg.versions && msg.activeVersionIndex !== undefined && msg.versions[msg.activeVersionIndex]) {
                    text = msg.versions[msg.activeVersionIndex].text;
                }
            } else {
                // Handle model responses
                text = msg.responses?.[msg.activeResponseIndex]?.text || msg.text || '';
            }
            // Truncate individual messages to keep context focused
            return `${msg.role}: ${text.substring(0, 300)}`;
        })
        .join('\n');
    
    const prompt = `You are an expert at identifying key, long-term facts a user might want an AI to remember. From the following conversation, extract up to 3 specific facts, preferences, or details about the user or their goals that would be useful to remember in future conversations. Focus on personal details, work context, and explicit preferences. Output MUST be a valid JSON array of strings. For example: ["The user is a software engineer in London.", "The user prefers TypeScript for code examples."]. If no memorable facts are found, return an empty array [].\n\nCONVERSATION:\n${conversationTranscript}\n\nJSON OUTPUT:`;

    try {
        const response = await generateContentWithRetry(ai, {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' },
        });

        const text = response.text || '';
        const jsonText = text.trim() || '[]';
        const suggestions = JSON.parse(jsonText);

        if (Array.isArray(suggestions) && suggestions.every(s => typeof s === 'string')) {
            return suggestions;
        }
        return [];
    } catch (error) {
        console.error("Memory suggestion extraction failed:", error);
        return []; // Return empty on failure
    }
};

export const executeConsolidateMemory = async (ai: GoogleGenAI, currentMemory: string, suggestions: string[]): Promise<string> => {
    const prompt = `You are a memory consolidation expert. Your task is to integrate new information into an existing summary without losing important old details and without creating duplicates. Update the "Current Memory" with the "New Information to Add". The final output should be a single, concise, updated block of text.\n\nCURRENT MEMORY:\n${currentMemory || '(empty)'}\n\nNEW INFORMATION TO ADD:\n- ${suggestions.join('\n- ')}\n\nUPDATED MEMORY:`;

    try {
        const response = await generateContentWithRetry(ai, {
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return (response.text || '').trim();
    } catch (error) {
        console.error("Memory consolidation failed:", error);
        // Fallback: simple append
        return [currentMemory, ...suggestions].filter(Boolean).join('\n');
    }
};