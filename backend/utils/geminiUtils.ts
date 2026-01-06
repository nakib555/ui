
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GoogleGenAI,
  GenerateContentParameters,
  GenerateImagesResponse,
  GenerateContentResponse,
} from "@google/genai";

// Define the result type for streaming, compatible with the SDK's return type.
export type GenerateContentStreamResult = AsyncIterable<GenerateContentResponse> & {
  readonly response: Promise<GenerateContentResponse>;
};

// Global throttling to smooth out bursts
let lastRequestTimestamp = 0;
// Increased interval to be safer
const MIN_REQUEST_INTERVAL = 1000; 

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enforces a minimum time interval between API calls to prevent bursts.
 */
async function throttle() {
    const now = Date.now();
    const timeSinceLast = now - lastRequestTimestamp;
    
    if (timeSinceLast < MIN_REQUEST_INTERVAL) {
        const wait = MIN_REQUEST_INTERVAL - timeSinceLast;
        lastRequestTimestamp = now + wait; // Reserve the slot
        await sleep(wait);
    } else {
        lastRequestTimestamp = now;
    }
}

/**
 * Wrapper for API calls that handles 429/503 errors with exponential backoff.
 */
async function executeOperationWithRetry<T>(
    operation: () => Promise<T>,
    retries = 3,
    baseDelay = 2000
): Promise<T> {
    await throttle();
    
    let lastError: any;
    
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            
            // Check for Rate Limit (429) or Server Overload (503)
            const isRateLimit = error.message?.includes('429') || error.status === 429 || error.message?.includes('RESOURCE_EXHAUSTED');
            const isOverloaded = error.message?.includes('503') || error.status === 503 || error.message?.includes('UNAVAILABLE');
            
            if (isRateLimit || isOverloaded) {
                // Exponential backoff: 2s, 4s, 8s
                const delay = baseDelay * Math.pow(2, i) + (Math.random() * 500);
                console.warn(`[GeminiUtils] API hit limit/overload (Attempt ${i+1}/${retries}). Retrying in ${Math.round(delay)}ms...`);
                await sleep(delay);
                continue;
            }
            
            // If it's a different error, throw immediately
            throw error;
        }
    }
    
    throw lastError;
}

export async function generateContentWithRetry(ai: GoogleGenAI, request: GenerateContentParameters): Promise<GenerateContentResponse> {
  const operation = async () => {
    // DIRECT call to generateContent (non-streaming).
    // This is required for TTS and other models that do not support streaming or where atomic response is preferred.
    return await ai.models.generateContent(request);
  };
  return await executeOperationWithRetry(operation);
}

export async function generateContentStreamWithRetry(ai: GoogleGenAI, request: GenerateContentParameters): Promise<GenerateContentStreamResult> {
  const operation = async () => {
      return (await ai.models.generateContentStream(request)) as unknown as GenerateContentStreamResult;
  };
  return await executeOperationWithRetry(operation);
}

export async function generateImagesWithRetry(ai: GoogleGenAI, request: any): Promise<GenerateImagesResponse> {
    const operation = async () => ai.models.generateImages(request);
    return await executeOperationWithRetry(operation);
}

export async function generateVideosWithRetry(ai: GoogleGenAI, request: any): Promise<any> {
    const operation = async () => ai.models.generateVideos(request);
    return await executeOperationWithRetry(operation);
}

export const getText = (response: GenerateContentResponse): string => {
  // Safe access to .text property.
  // The SDK might throw if .text is accessed on a response that doesn't contain text (e.g. usage metadata only).
  try {
    return response.text || '';
  } catch (e) {
    return '';
  }
};
