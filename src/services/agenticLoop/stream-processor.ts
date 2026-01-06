
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

/**
 * Processes a streaming response from the backend API.
 * Uses a time-based buffer to batch rapid text chunks for UI performance.
 */
export const processBackendStream = async (response: Response, callbacks: StreamCallbacks, signal?: AbortSignal) => {
    if (!response.body) {
        throw new Error("Response body is missing");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // --- Performance Optimization: Buffered State Updates ---
    // Increased flush interval to 60ms.
    // Why? The typewriter hook runs at ~33ms (30fps).
    // Feeding it data faster than it can render just builds up a React state queue.
    // 60ms ensures we send larger chunks of text fewer times per second, 
    // freeing up the JS Event Loop for UI interactions (scrolling, clicking).
    const FLUSH_INTERVAL_MS = 60; 
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

    // Helper to read with a timeout to prevent infinite hanging
    const readWithTimeout = async () => {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Stream timeout: No data received from backend")), WATCHDOG_TIMEOUT_MS);
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
            // Keep the last line in the buffer if it's incomplete
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const event = JSON.parse(line);
                    
                    // Prioritize text chunks for the buffering optimization
                    if (event.type === 'text-chunk') {
                        // ACCUMULATE deltas instead of replacing
                        pendingText = (pendingText || '') + event.payload; 
                        
                        // Check for artifact tags in the pending text to trigger immediate flush
                        // This ensures the renderer sees the opening tag ASAP for faster feedback
                        if (pendingText && (pendingText.includes('[ARTIFACT') || pendingText.includes('[/ARTIFACT'))) {
                            flushTextUpdates();
                        } else if (flushTimeoutId === null) {
                            flushTimeoutId = setTimeout(flushTextUpdates, FLUSH_INTERVAL_MS);
                        }
                        continue;
                    }

                    // For all other events (tools, errors, complete), flush pending text IMMEDIATELY
                    // to ensure correct ordering of events (e.g. text before tool call).
                    flushTextUpdates();

                    switch (event.type) {
                        case 'start':
                            callbacks.onStart?.(event.payload?.requestId);
                            break;
                        case 'ping':
                            // Keep-alive, ignore
                            break;
                        case 'workflow-update':
                            // Deprecated from backend, but kept for compatibility if needed
                            if (callbacks.onWorkflowUpdate) callbacks.onWorkflowUpdate(event.payload);
                            break;
                        case 'tool-call-start':
                            callbacks.onToolCallStart(event.payload);
                            break;
                        case 'tool-update':
                            callbacks.onToolUpdate(event.payload);
                            break;
                        case 'tool-call-end':
                            callbacks.onToolCallEnd(event.payload);
                            break;
                        case 'plan-ready':
                            callbacks.onPlanReady(event.payload);
                            break;
                        case 'frontend-tool-request':
                            callbacks.onFrontendToolRequest(event.payload.callId, event.payload.toolName, event.payload.toolArgs);
                            break;
                        case 'complete':
                            callbacks.onComplete(event.payload);
                            break;
                        case 'error':
                            callbacks.onError(event.payload);
                            break;
                        case 'cancel':
                            callbacks.onCancel?.();
                            break;
                        default:
                            console.warn(`[StreamProcessor] Unknown event type: ${event.type}`);
                    }
                } catch(e) {
                    console.error("[StreamProcessor] Failed to parse stream event:", line, e);
                }
            }
        }
    } catch (e: any) {
        // If it's a timeout or network error, report it
        if (e.message && (e.message.includes("timeout") || e.message.includes("network"))) {
            callbacks.onError({ message: "Stream connection lost or timed out." });
        }
    } finally {
        // Cleanup any pending flush on stream end/error/close
        flushTextUpdates();
        reader.releaseLock();
    }
};
