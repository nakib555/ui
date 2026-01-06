/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { fetchFromApi } from '../../utils/api';
import { parseApiError } from '../../services/gemini/apiError';
import { toolImplementations as frontendToolImplementations } from '../../tools';

export const sendToolResponse = async (callId: string, payload: any) => {
    let attempts = 0;
    const maxAttempts = 4; // Increased attempts
    const baseDelay = 1000;

    while (attempts < maxAttempts) {
        try {
            const response = await fetchFromApi('/api/handler?task=tool_response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callId, ...payload }),
            });

            if (response.ok) return;

            // If server says 404, the session is likely gone (server restart). 
            // Retrying won't help, so we abort to prevent infinite loops.
            if (response.status === 404) {
                console.warn(`[FRONTEND] Backend session lost (404) for tool response ${callId}. Stopping retries.`);
                return;
            }
            
            throw new Error(`Backend returned status ${response.status}`);
        } catch (e) {
            const err = e as Error;
            // If global version mismatch handler triggered, stop everything
            if (err.message === 'Version mismatch') throw err;

            attempts++;
            
            if (attempts >= maxAttempts) {
                console.error(`[FRONTEND] Giving up on sending tool response for ${callId} after ${maxAttempts} attempts.`);
                // We don't throw here to avoid crashing the whole UI, just log the failure
                return;
            }
            
            // Exponential backoff with jitter: 1s, 2s, 4s... + random jitter
            const delay = baseDelay * Math.pow(2, attempts - 1) + (Math.random() * 500);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

export const executeFrontendTool = async (callId: string, toolName: string, toolArgs: any): Promise<void> => {
    try {
        let result: any;
        if (toolName === 'approveExecution') {
            result = toolArgs; // The edited plan string
        } else if (toolName === 'denyExecution') {
            result = false;
        } else {
             const toolImplementation = (frontendToolImplementations as any)[toolName];
             if (!toolImplementation) throw new Error(`Frontend tool not found: ${toolName}`);
             result = await toolImplementation(toolArgs);
        }
        
        await sendToolResponse(callId, { result });

    } catch (error) {
        if ((error as Error).message === 'Version mismatch') return;

        const parsedError = parseApiError(error);
        console.error(`[FRONTEND] Tool '${toolName}' execution failed. Sending error to backend.`, { callId, error: parsedError });
        
        await sendToolResponse(callId, { error: parsedError.message });
    }
};