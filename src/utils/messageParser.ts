
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type ParseResult = {
  thinkingText: string;
  finalAnswerText: string;
};

/**
 * Parses the raw text from a model's message into distinct "thinking" and "final answer" parts.
 * This function uses the `isThinking` and `hasError` flags to provide context and prevent UI flickering.
 * @param text The raw text content from the message.
 * @param isThinking A boolean indicating if the model is still processing.
 * @param hasError A boolean indicating if an error occurred.
 * @returns An object containing `thinkingText` and `finalAnswerText`.
 */
export const parseMessageText = (text: string, isThinking: boolean, hasError: boolean): ParseResult => {
  const finalAnswerMarker = '[STEP] Final Answer:';
  const finalAnswerIndex = text.lastIndexOf(finalAnswerMarker);

  // Rule 1: Highest priority. If the final answer marker exists, we can definitively split the text.
  // This is true whether the stream is still technically "thinking" or not.
  if (finalAnswerIndex !== -1) {
    const thinkingText = text.substring(0, finalAnswerIndex);
    let rawFinalAnswer = text.substring(finalAnswerIndex + finalAnswerMarker.length);
    
    // Strip the agent tag (e.g., ": [AGENT: Reporter]") from the beginning of the final answer.
    const agentTagRegex = /^\s*:?\s*\[AGENT:\s*[^\]]+\]\s*/;
    rawFinalAnswer = rawFinalAnswer.replace(agentTagRegex, '');

    const finalAnswerText = rawFinalAnswer.replace(/\[AUTO_CONTINUE\]/g, '').trim();
    return { thinkingText, finalAnswerText };
  }

  // Rule 2: If an error occurred mid-thought, ALL text is considered part of the failed thinking process.
  // The final answer should be empty because it was never reached.
  if (hasError) {
    return { thinkingText: text, finalAnswerText: '' };
  }
  
  // Rule 3: If there's no final answer marker, check if the model is still actively thinking.
  if (isThinking) {
    const trimmed = text.trimStart();

    // HEURISTIC: In Agent Mode, the output typically starts with a [STEP] marker.
    // If the text starts with [STEP], treat it as thinking process content.
    if (trimmed.startsWith('[STEP]')) {
        return { thinkingText: text, finalAnswerText: '' };
    }
    
    // HEURISTIC: Prevent flicker for the first few characters if they look like they might start a tag.
    // Buffer output that starts with '[' until it's long enough to disambiguate or confirms it's not a step.
    // This prevents a brief flash of the thinking box if the chat starts with a link like "[Google]".
    if (trimmed.startsWith('[') && trimmed.length < 15 && !trimmed.includes(']')) {
        // Return empty to show typing indicator, effectively buffering the stream
        return { thinkingText: '', finalAnswerText: '' };
    }

    // Otherwise, treat as direct streaming response (Chat Mode)
    return { thinkingText: '', finalAnswerText: text };
  }

  // Rule 4: At this point, thinking is complete and there is no error.
  // If the text contains any STEP markers but no Final Answer marker, it's an incomplete thought process
  // or a stuck chain. Treat the entire text as thinking to keep it in the thought bubble/log.
  if (text.includes('[STEP]')) {
      return { thinkingText: text, finalAnswerText: '' };
  }

  // Rule 5: If none of the above conditions are met (not thinking, no error, no markers),
  // then the entire response must be a direct final answer (e.g., from a simple query).
  return { thinkingText: '', finalAnswerText: text.trim() };
};