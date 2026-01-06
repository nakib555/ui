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
 * @param text The raw text content from the message.
 * @param isThinking A boolean indicating if the model is still processing.
 * @param hasError A boolean indicating if an error occurred.
 * @returns An object containing `thinkingText` and `finalAnswerText`.
 */
export const parseMessageText = (text: string, isThinking: boolean, hasError: boolean): ParseResult => {
  const finalAnswerMarker = '[STEP] Final Answer:';
  const finalAnswerIndex = text.lastIndexOf(finalAnswerMarker);

  // 1. If final answer marker exists, we have a clean split
  if (finalAnswerIndex !== -1) {
    const thinkingText = text.substring(0, finalAnswerIndex);
    let rawFinalAnswer = text.substring(finalAnswerIndex + finalAnswerMarker.length);
    
    // Strip potential agent metadata from the start of the final answer
    const agentTagRegex = /^\s*:?\s*\[AGENT:\s*[^\]]+\]\s*/;
    rawFinalAnswer = rawFinalAnswer.replace(agentTagRegex, '');

    const finalAnswerText = rawFinalAnswer.replace(/\[AUTO_CONTINUE\]/g, '').trim();
    return { thinkingText, finalAnswerText };
  }

  // 2. If an error occurred, everything is considered part of the "failed thought"
  if (hasError) {
    return { thinkingText: text, finalAnswerText: '' };
  }
  
  // 3. If model is still thinking
  if (isThinking) {
    const trimmed = text.trimStart();

    // If text starts with Agentic protocol markers, it's definitely thinking
    if (trimmed.startsWith('[STEP]')) {
        return { thinkingText: text, finalAnswerText: '' };
    }
    
    // Buffer early characters that look like they might start a tag to avoid jumping
    if (trimmed.startsWith('[') && trimmed.length < 15 && !trimmed.includes(']')) {
        return { thinkingText: '', finalAnswerText: '' };
    }

    // Default for Chat Mode: show content immediately as the final answer
    return { thinkingText: '', finalAnswerText: text };
  }

  // 4. Completed but no markers: Check if it LOOKS like it was an Agent process
  if (text.includes('[STEP]')) {
      return { thinkingText: text, finalAnswerText: '' };
  }

  // 5. Fallback: Pure direct answer
  return { thinkingText: '', finalAnswerText: text.trim() };
};
