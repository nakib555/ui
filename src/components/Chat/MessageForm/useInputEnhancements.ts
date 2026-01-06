
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// This hook manages features that enhance the user's text input,
// such as voice input, prompt enhancement.

import { useState } from 'react';
import { useVoiceInput } from '../../../hooks/useVoiceInput';
import { enhanceUserPromptStream } from '../../../services/promptImprover';

export const useInputEnhancements = (
    inputValue: string,
    setInputValue: (value: string) => void,
    hasFiles: boolean,
    onSubmit: (message: string, files?: File[], options?: { isThinkingModeEnabled?: boolean }) => void
) => {
  const [isEnhancing, setIsEnhancing] = useState(false);

  // --- Voice Input ---
  const { isRecording, startRecording, stopRecording, isSupported } = useVoiceInput({
    onTranscriptUpdate: setInputValue,
  });

  // --- Event Handlers ---
  const handleEnhancePrompt = async () => {
    const originalPrompt = inputValue;
    if (!originalPrompt.trim() || isEnhancing) return;

    setIsEnhancing(true);
    setInputValue(''); // Clear input once at the start

    let animationFrameId: number | null = null;

    try {
        const stream = enhanceUserPromptStream(originalPrompt);
        let accumulatedText = '';
        let isUpdatePending = false;

        const updateInputValue = () => {
            setInputValue(accumulatedText);
            isUpdatePending = false;
        };

        for await (const chunk of stream) {
            accumulatedText += chunk;
            if (!isUpdatePending) {
                isUpdatePending = true;
                animationFrameId = requestAnimationFrame(updateInputValue);
            }
        }

        // After the loop, ensure the final state is set and cancel any pending frame
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        setInputValue(accumulatedText); // Set final value
        
        // If the stream was empty or failed, restore the original prompt
        if (!accumulatedText.trim()) {
            setInputValue(originalPrompt);
        }

    } catch (e) {
        console.error("Error during prompt enhancement:", e);
        setInputValue(originalPrompt); // Restore on error
    } finally {
        setIsEnhancing(false);
    }
  };

  const handleMicClick = () => {
    isRecording ? stopRecording() : (setInputValue(''), startRecording());
  };

  return {
    isEnhancing,
    isRecording,
    startRecording,
    stopRecording,
    isSupported,
    handleEnhancePrompt,
    handleMicClick,
  };
};
