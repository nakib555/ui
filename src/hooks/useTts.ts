
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { audioCache } from '../services/audioCache';
import { audioManager } from '../services/audioService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { fetchFromApi } from '../utils/api';

type AudioState = 'idle' | 'loading' | 'error' | 'playing';

export const useTts = (text: string, voice: string, model: string) => {
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const isMounted = useRef(true);
  const isPlaying = audioState === 'playing';

  useEffect(() => {
      isMounted.current = true;
      return () => { isMounted.current = false; };
  }, []);

  const playOrStopAudio = useCallback(async () => {
    if (audioState === 'playing') {
      audioManager.stop();
      if (isMounted.current) setAudioState('idle');
      return;
    }
    
    // Valid text check
    if (!text || text.trim().length === 0) {
        if (isMounted.current) {
            setAudioState('error');
            setErrorMessage("No text available to read.");
        }
        return;
    }

    if (audioState === 'loading') return;
    
    if (isMounted.current) {
        setAudioState('loading');
        setErrorMessage(undefined);
    }
    
    const textToSpeak = text;
      
    const cacheKey = audioCache.createKey(textToSpeak, voice, model);
    const cachedBuffer = audioCache.get(cacheKey);

    const doPlay = async (buffer: AudioBuffer) => {
        if (!isMounted.current) return;
        setAudioState('playing');
        await audioManager.play(buffer, () => {
            if (isMounted.current) setAudioState('idle');
        });
    };

    if (cachedBuffer) {
        await doPlay(cachedBuffer);
        return;
    }
    
    try {
        // fetchFromApi automatically handles the custom Backend Server URL logic
        const response = await fetchFromApi('/api/handler?task=tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToSpeak, voice, model }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // Extract meaningful message from structured error if possible
            const msg = errorData.error?.suggestion || errorData.error?.message || errorData.error?.details || `TTS request failed with status ${response.status}`;
            throw new Error(msg);
        }
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) throw new Error("Backend returned HTML. Please check your Server URL setting.");

        const { audio: base64Audio } = await response.json();
        
        if (base64Audio) {
            const audioBuffer = await decodeAudioData(decode(base64Audio), audioManager.context, 24000, 1);
            audioCache.set(cacheKey, audioBuffer);
            await doPlay(audioBuffer);
        } else {
            throw new Error("No audio data returned from backend.");
        }
    } catch (err: any) {
        console.error("TTS failed:", err);
        if (isMounted.current) {
            setAudioState('error');
            setErrorMessage(err.message || "Failed to generate audio");
        }
    }
  }, [text, voice, model, audioState]);

  return { playOrStopAudio, audioState, isPlaying, errorMessage };
};
