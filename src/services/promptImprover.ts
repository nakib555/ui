/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseApiError } from './gemini/index';
import { fetchFromApi } from '../utils/api';

/**
 * Enhances a user's prompt by streaming a rewritten version from the backend.
 * @param userInput The original text from the user.
 * @returns An async generator that yields chunks of the enhanced prompt string.
 * @throws An error if the API call fails or the model returns an empty response.
 */
export async function* enhanceUserPromptStream(userInput: string): AsyncGenerator<string> {
  // Do not enhance very short prompts.
  if (userInput.trim().split(' ').length < 3) {
    yield userInput;
    return;
  }
  
  try {
    const response = await fetchFromApi('/api/handler?task=enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput }),
    });

    if (!response.ok || !response.body) {
        throw new Error(`Prompt enhancement failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let hasYielded = false;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        if (chunk) {
            hasYielded = true;
            yield chunk;
        }
    }
    
    if (!hasYielded) {
      throw new Error("Backend returned an empty enhancement stream.");
    }

  } catch (error) {
    const parsedError = parseApiError(error);
    console.error("Prompt enhancement stream failed:", parsedError);
    // Re-throw the error so the calling component can handle the failure state.
    throw new Error(`Prompt enhancement failed: ${parsedError.message}`);
  }
}