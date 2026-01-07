
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StreamCallbacks {
    onStart?: (requestId: string) => void;
    onTextChunk: (text: string) => void;
    onWorkflowUpdate: (workflow: any) => void;
    onToolCallStart: (events: any[]) => void;
    onToolUpdate: (event: any) => void;
    onToolCallEnd: (event: any) => void;
    onPlanReady: (plan: string) => void;
    onFrontendToolRequest: (callId: string, name: string, args: any) => void;
    onComplete: (data: { finalText: string, groundingMetadata: any }) => void;
    onError: (error: any) => void;
    onCancel?: () => void;
}

export const processBackendStream = async (response: Response, callbacks: StreamCallbacks, signal?: AbortSignal) => {
    if (!response.body) {
        throw new Error("Response body is missing");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Optimization: Buffered State Updates
    // A flush interval of 65ms (~15fps) is the sweet spot. 
    // It reduces React Reconciliation overhead on the frontend significantly for 
    // massive text/code blocks while still feeling "real-time" to the human eye.
    const FLUSH_INTERVAL_MS = 65; 
    const WATCHDOG_TIMEOUT_MS = 45000;

    let pendingText: string | null = null;
    let flushTimeoutId: any = null;

    const flushTextUpdates = () => {
        if (pendingText !== null) {
            callbacks.onTextChunk(pendingText);
            pendingText = null;
        }
        if (flushTimeoutId !== null) {
            clearTimeout(flushTimeoutId);
            flushTimeoutId = null;
        }
    };

    const readWithTimeout = async () => {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Stream timeout")), WATCHDOG_TIMEOUT_MS);
        });
        return Promise.race([reader.read(), timeoutPromise]);
    };

    try {
        while (true) {
            if (signal?.aborted) {
                reader.cancel();
                break;
            }

            const { done, value } = await readWithTimeout();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const event = JSON.parse(line);
                    
                    if (event.type === 'text-chunk') {
                        pendingText = (pendingText || '') + event.payload; 
                        
                        // Check for artifact tags in the pending text to trigger immediate flush
                        // This ensures the renderer sees the opening tag ASAP
                        if (pendingText && (pendingText.includes('[ARTIFACT') || pendingText.includes('[/ARTIFACT'))) {
                            flushTextUpdates();
                        } else if (flushTimeoutId === null) {
                            flushTimeoutId = setTimeout(flushTextUpdates, FLUSH_INTERVAL_MS);
                        }
                        continue;
                    }

                    flushTextUpdates();

                    switch (event.type) {
                        case 'start': callbacks.onStart?.(event.payload?.requestId); break;
                        case 'ping': break;
                        case 'tool-call-start': callbacks.onToolCallStart(event.payload); break;
                        case 'tool-update': callbacks.onToolUpdate(event.payload); break;
                        case 'tool-call-end': callbacks.onToolCallEnd(event.payload); break;
                        case 'plan-ready': callbacks.onPlanReady(event.payload); break;
                        case 'frontend-tool-request': callbacks.onFrontendToolRequest(event.payload.callId, event.payload.toolName, event.payload.toolArgs); break;
                        case 'complete': callbacks.onComplete(event.payload); break;
                        case 'error': callbacks.onError(event.payload); break;
                        case 'cancel': callbacks.onCancel?.(); break;
                    }
                } catch(e) {
                    console.error("[StreamProcessor] Parse error:", line);
                }
            }
        }
    } catch (e: any) {
        if (e.message && (e.message.includes("timeout") || e.message.includes("network"))) {
            callbacks.onError({ message: "Stream connection lost." });
        }
    } finally {
        flushTextUpdates();
        reader.releaseLock();
    }
};
