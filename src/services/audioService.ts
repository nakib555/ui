
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A singleton service to manage a shared AudioContext and prevent overlapping audio playback.

class AudioManager {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor() {
    // It's best practice to have a single AudioContext.
    // We do NOT force a sampleRate here. Forcing a specific rate (like 24000) 
    // causes failures on browsers/hardware that don't support it (e.g., some Bluetooth headsets, older Safari).
    // We let the browser choose the native rate (usually 44.1k or 48k) and handle resampling in decodeAudioData.
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass();
    } catch (e) {
        console.error("[AudioManager] Failed to initialize AudioContext:", e);
    }
  }

  get context(): AudioContext {
    if (!this.audioContext) {
        // Attempt re-initialization if accessed after a failure (rare but possible)
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }

  /**
   * Plays an AudioBuffer, stopping any currently playing audio first.
   * This method is async to correctly handle the AudioContext.resume() promise,
   * which is required by browsers to play audio after a user gesture.
   * @param buffer The AudioBuffer to play.
   * @param onEnd A callback to execute when playback finishes naturally.
   */
  async play(buffer: AudioBuffer, onEnd: () => void): Promise<void> {
    if (!this.audioContext) {
        console.error("[AudioManager] Cannot play: AudioContext is missing.");
        onEnd();
        return;
    }

    // Ensure the context is running (it might be suspended before the first user gesture).
    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (e) {
        console.error("[AudioManager] Failed to resume AudioContext:", e);
        // If resuming fails, we can't play. Call onEnd to reset UI.
        onEnd();
        return;
    }

    // Stop any audio that is currently playing.
    this.stop();

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    
    this.onEndCallback = onEnd;

    source.onended = () => {
      // This only runs when playback finishes on its own.
      if (this.onEndCallback) {
        this.onEndCallback();
      }
      this.currentSource = null;
      this.onEndCallback = null;
    };
    
    source.start();
    this.currentSource = source;
  }

  /**
   * Stops the currently playing audio.
   */
  stop(): void {
    if (this.currentSource) {
      try {
          // Unset the onended callback before stopping to prevent it from firing on manual stop.
          this.currentSource.onended = null;
          this.currentSource.stop();
      } catch (e) {
          // Ignore errors if source is already stopped
      }
      this.currentSource = null;
      
      // Also invoke the onEnd callback immediately to reset UI state.
      if (this.onEndCallback) {
        this.onEndCallback();
        this.onEndCallback = null;
      }
    }
  }
}

export const audioManager = new AudioManager();
