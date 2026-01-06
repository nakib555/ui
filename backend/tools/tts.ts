
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from "@google/genai";
import { ToolError } from "../utils/apiError";
import { generateContentWithRetry } from "../utils/geminiUtils";

/**
 * Cleans text for Text-to-Speech by removing markdown, component tags, and excess whitespace.
 * The TTS model works best with plain, clean text.
 */
const cleanTextForTts = (text: string): string => {
    if (!text) return "";

    let cleanedText = text;

    // 1. Remove all specific UI component tags and their JSON content
    // We list them explicitly to avoid stripping unknown bracketed text that might be valid.
    const componentTags = [
        'VIDEO_COMPONENT', 'ONLINE_VIDEO_COMPONENT', 
        'IMAGE_COMPONENT', 'ONLINE_IMAGE_COMPONENT', 
        'MCQ_COMPONENT', 'MAP_COMPONENT', 
        'FILE_ATTACHMENT_COMPONENT', 'BROWSER_COMPONENT', 
        'CODE_OUTPUT_COMPONENT', 'VEO_API_KEY_SELECTION_COMPONENT',
        'LOCATION_PERMISSION_REQUEST'
    ];

    componentTags.forEach(tag => {
        const regex = new RegExp(`\\[${tag}\\][\\s\\S]*?\\[\\/${tag}\\]`, 'g');
        cleanedText = cleanedText.replace(regex, '');
    });
  
    // 2. Handle Code Blocks (```...```)
    // Instead of silence, we insert a brief pause marker or phrase so the listener knows something was skipped.
    if (cleanedText.includes('```')) {
        cleanedText = cleanedText.replace(/```[\s\S]*?```/g, ' . Code block omitted for brevity. ');
    }
  
    // 3. Remove Display Math ($$...$$) - Complex formulas are hard to parse via audio.
    cleanedText = cleanedText.replace(/\$\$[\s\S]*?\$\$/g, ' a mathematical formula ');

    // 4. Process Inline Math ($...$) - Remove delimiters, keep content (often variable names).
    cleanedText = cleanedText.replace(/\$([^$\n]+\$)/g, '$1');

    // 5. Clean Markdown Links & Images
    // Images: Keep alt text if present.
    cleanedText = cleanedText.replace(/!\[(.*?)\]\(.*?\)/g, '$1');
    // Links: Keep link text, discard URL.
    cleanedText = cleanedText.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    
    // 6. Remove Raw URLs
    // Prevents TTS from reading out "h t t p s colon slash slash..."
    cleanedText = cleanedText.replace(/(https?:\/\/[^\s]+)/g, ' link ');

    // 7. Remove HTML Tags
    cleanedText = cleanedText.replace(/<[^>]*>/g, '');
  
    // 8. Standard Markdown Symbol Removal
    cleanedText = cleanedText
      .replace(/^#{1,6}\s/gm, '') // Headers
      .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold
      .replace(/(\*|_)(.*?)\1/g, '$2') // Italic
      .replace(/~~(.*?)~~/g, '$1') // Strikethrough
      .replace(/==(.*?)==/g, '$1') // Highlight
      .replace(/`([^`]+)`/g, '$1') // Inline code
      .replace(/^>\s/gm, '') // Blockquotes
      .replace(/^-{3,}\s*$/gm, '') // Horizontal rules
      .replace(/^\s*[-*+]\s/gm, '') // List bullets
      .replace(/^\s*\d+\.\s/gm, ''); // Numbered list items
  
    // 9. Collapse multiple newlines/spaces to a single space and trim
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
    
    // Fallback if the cleaning removed everything (e.g., purely visual response)
    if (!cleanedText && text.length > 0) {
        return "I have generated the visual content you requested.";
    }
    
    return cleanedText;
};

// Known valid prebuilt voices for Gemini 2.5 TTS
const STANDARD_GEMINI_VOICES = new Set([
    'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
]);

export const executeTextToSpeech = async (ai: GoogleGenAI, text: string, voice: string, model: string): Promise<string> => {
    try {
        const cleanedText = cleanTextForTts(text);
        
        if (!cleanedText) {
            // Throwing allows the UI to show an error or disable the button.
            throw new Error("No readable text found for speech synthesis.");
        }

        // Use the model provided by the frontend request, or fallback to the standard TTS model
        // Update default model to current version
        const targetModel = model || "gemini-2.5-flash-preview-tts";

        let targetVoice = voice || 'Puck';
        let promptText = cleanedText;

        // Check if the requested voice is a valid prebuilt persona
        if (!STANDARD_GEMINI_VOICES.has(targetVoice)) {
            // If it's a custom accent/language request (e.g. "British", "Japanese")
            // we default to a high-quality base voice and instruct the model to adopt the native persona.
            console.log(`[TTS] Custom accent requested: ${targetVoice}`);
            
            // Use 'Zephyr' as a confident, professional base for custom accents.
            const baseVoice = 'Zephyr'; 
            
            // Instruct the model to adopt the native characteristics of the requested language/region
            promptText = `Speak the following text exactly as a native ${targetVoice} speaker would, with authentic intonation and accent: "${cleanedText}"`;
            
            targetVoice = baseVoice;
        }

        console.log(`[TTS] Generating speech with model: ${targetModel}, voice: ${targetVoice}`);

        // Use Modality.AUDIO enum as required by SDK
        // IMPORTANT: We use generateContentWithRetry which now uses generateContent (non-streaming)
        // This is critical for audio generation stability.
        const response = await generateContentWithRetry(ai, {
            model: targetModel,
            contents: [{ parts: [{ text: promptText }] }],
            config: {
                responseModalities: [Modality.AUDIO], 
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: targetVoice } } },
            },
        });

        let base64Audio: string | undefined;
        if (response.candidates && response.candidates.length > 0) {
            const content = response.candidates[0].content;
            if (content && content.parts) {
                for (const part of content.parts) {
                    if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('audio/') && part.inlineData.data) {
                        base64Audio = part.inlineData.data;
                        break;
                    }
                }
            }
        }
        
        if (base64Audio) {
            return base64Audio;
        } else {
            console.error("TTS Response missing audio data:", JSON.stringify(response, null, 2));
            throw new Error("No audio data returned from TTS model.");
        }
    } catch (err: any) {
        console.error("TTS tool failed:", err);
        const originalError = err instanceof Error ? err : new Error("An unknown error occurred during TTS generation.");
        
        let message = originalError.message;
        let suggestion = "Please try again later or select a different voice.";

        if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
            suggestion = "The text-to-speech quota has been exceeded. Please check your billing or wait a few minutes.";
        } else if (message.includes('400') || message.includes('INVALID_ARGUMENT')) {
            suggestion = "The text provided might be too long or contain characters not supported by the audio model.";
        } else if (message.includes('safety') || message.includes('blocked')) {
            suggestion = "The generated audio was blocked by safety settings.";
        } else if (message.includes('No readable text')) {
            suggestion = "The response contains only visual elements (images, maps) and no text to read.";
        }

        throw new ToolError('textToSpeech', 'TTS_FAILED', message, originalError, suggestion);
    }
};
