
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';

// Check for SpeechRecognition API and its vendor prefixes
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const isSpeechRecognitionSupported = !!SpeechRecognition;

type UseVoiceInputProps = {
    onTranscriptUpdate: (transcript: string) => void;
};

export const useVoiceInput = ({ onTranscriptUpdate }: UseVoiceInputProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any | null>(null);
    // Use a ref to hold the callback to avoid re-running the effect with stale closures
    const onTranscriptUpdateRef = useRef(onTranscriptUpdate);
    onTranscriptUpdateRef.current = onTranscriptUpdate;

    useEffect(() => {
        if (!isSpeechRecognitionSupported) {
            console.warn("Speech Recognition API is not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Keep listening even after a pause
        recognition.interimResults = true; // Get results as they are recognized
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            // Update the input with both final and interim results for real-time feedback
            onTranscriptUpdateRef.current(finalTranscript + interimTranscript);
        };
        
        // When recognition service ends, we need to update our state
        recognition.onend = () => {
            setIsRecording(false);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);

            // Silently handle non-critical errors. The `onend` event will fire regardless,
            // which will handle turning off the recording state.
            if (event.error === 'no-speech' || event.error === 'aborted') {
                return;
            }

             // Provide user feedback for critical errors that require user action.
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                alert("Microphone access was denied. Please allow it in your browser settings to use voice input.");
            } else if (event.error === 'audio-capture') {
                alert("Could not capture audio. Please ensure your microphone is working and not being used by another application.");
            } else {
                alert(`An unexpected voice input error occurred: ${event.error}`);
            }
        };
        
        recognitionRef.current = recognition;

        // Cleanup: abort recognition when the component unmounts for immediate resource release.
        return () => {
            recognition.abort();
        };
    }, []); // Empty dependency array ensures this effect runs only once on mount

    const startRecording = useCallback(() => {
        if (!isSpeechRecognitionSupported) {
            alert("Sorry, voice input is not supported on your browser.");
            return;
        }
        if (isRecording || !recognitionRef.current) return;
        
        try {
            // Defensively abort any lingering session before starting a new one.
            // This is a robust way to prevent 'audio-capture' errors.
            recognitionRef.current.abort();

            // The start() method will handle microphone permission prompts automatically,
            // avoiding potential resource conflicts from a separate getUserMedia call.
            recognitionRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error starting speech recognition:", err);
            // The `onerror` event on the recognition instance will handle most errors,
            // but this catch is a fallback for immediate issues with `start()`.
        }
    }, [isRecording]);

    const stopRecording = useCallback(() => {
        if (!isRecording || !recognitionRef.current) return;
        
        // The `onend` event handler will set isRecording to false
        recognitionRef.current.stop();
    }, [isRecording]);

    return { isRecording, startRecording, stopRecording, isSupported: isSpeechRecognitionSupported };
};
