
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolError } from '../types';
import { fetchFromApi } from '../utils/api';

// The FunctionDeclaration is now in `declarations.ts`.

const VEO_API_KEY_COMPONENT_TAG = '[VEO_API_KEY_SELECTION_COMPONENT]To generate videos, please select an API key. This is a necessary step for using the Veo model. [Learn more about billing.](https://ai.google.dev/gemini-api/docs/billing)[/VEO_API_KEY_SELECTION_COMPONENT]';

/**
 * This is a frontend wrapper for the video generation tool.
 * It handles the browser-specific requirement of checking for a user-selected API key
 * before dispatching the actual heavy lifting to the backend.
 */
export const executeVideoGenerator = async (args: { prompt: string; aspectRatio?: string; resolution?: string, model: string }): Promise<string> => {
  // 1. Perform client-side prerequisite check
  if ((window as any).aistudio && typeof (window as any).aistudio.hasSelectedApiKey === 'function') {
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      // If the prerequisite is not met, return a special UI component tag.
      // The agentic loop will continue, and the UI will render a prompt for the user.
      return VEO_API_KEY_COMPONENT_TAG;
    }
  }

  // 2. If prerequisite is met, call the secure backend endpoint to do the work.
  try {
    const response = await fetchFromApi('/api/handler?task=tool_exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName: 'generateVideo', toolArgs: args }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: `Backend tool execution failed with status ${response.status}` } }));
        const message = errorData.error?.message || 'Unknown backend error';
        
        // Handle the specific case where the backend reports a missing key,
        // which can happen in a race condition.
        if (message.includes('Requested entity was not found.')) {
            return VEO_API_KEY_COMPONENT_TAG;
        }

        const code = errorData.error?.code || 'BACKEND_EXECUTION_FAILED';
        const details = errorData.error?.details;
        throw new ToolError('generateVideo', code, message, new Error(details));
    }

    const { result } = await response.json();
    return result;

  } catch (error) {
    if (error instanceof ToolError) throw error;
    const originalError = error instanceof Error ? error : new Error(String(error));
    throw new ToolError('generateVideo', 'BACKEND_FETCH_FAILED', originalError.message, originalError);
  }
};