
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Decodes a base64 encoded string into a Uint8Array of bytes.
 * @param base64 The base64 encoded string.
 * @returns A Uint8Array containing the decoded bytes.
 */
export function decode(base64: string): Uint8Array {
  // Remove any whitespace from base64 string before decoding
  const cleanBase64 = base64.replace(/\s/g, '');
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM audio data into an AudioBuffer for playback.
 * @param data The raw audio data as a Uint8Array.
 * @param ctx The AudioContext to use for creating the buffer.
 * @param sampleRate The sample rate of the audio.
 * @param numChannels The number of audio channels.
 * @returns A promise that resolves with the decoded AudioBuffer.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Ensure the buffer is a multiple of 2 for Int16Array (PCM 16-bit)
  let processedData = data;
  if (processedData.byteLength % 2 !== 0) {
      console.warn("[AudioUtils] PCM data length is odd. Padding with one zero byte.");
      const newData = new Uint8Array(processedData.byteLength + 1);
      newData.set(processedData);
      processedData = newData;
  }

  const dataInt16 = new Int16Array(processedData.buffer, processedData.byteOffset, processedData.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  
  // Use createBuffer (synchronous for PCM)
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert 16-bit integer (-32768 to 32767) to float (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
