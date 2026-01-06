
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A simple in-memory cache for audio buffers to avoid re-fetching TTS data.
const cache = new Map<string, AudioBuffer>();

export const audioCache = {
  /**
   * Generates a unique key for the cache.
   * @param text The text content of the audio.
   * @param voice The voice used for TTS.
   * @param model The model used for TTS.
   * @returns A unique cache key string.
   */
  createKey(text: string, voice: string, model: string): string {
    return `${model}::${voice}::${text}`;
  },

  /**
   * Retrieves an AudioBuffer from the cache.
   * @param key The cache key.
   * @returns The cached AudioBuffer or undefined if not found.
   */
  get(key: string): AudioBuffer | undefined {
    return cache.get(key);
  },

  /**
   * Stores an AudioBuffer in the cache.
   * @param key The cache key.
   * @param buffer The AudioBuffer to store.
   */
  set(key: string, buffer: AudioBuffer): void {
    cache.set(key, buffer);
  },

  /**
   * Checks if an entry exists in the cache.
   * @param key The cache key.
   * @returns True if the key exists, false otherwise.
   */
  has(key: string): boolean {
    return cache.has(key);
  },
};
