
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from "@google/genai";
import { ToolError } from "../utils/apiError";
import { fileStore } from "../services/fileStore";
import { Buffer } from 'buffer';
import { generateContentWithRetry, generateImagesWithRetry } from "../utils/geminiUtils";

export const executeImageGenerator = async (ai: GoogleGenAI, args: { prompt: string, numberOfImages?: number, model: string, aspectRatio?: string }, chatId: string): Promise<string> => {
  const defaultAspectRatio = '1:1';
  const { prompt, numberOfImages = 1, model, aspectRatio = defaultAspectRatio } = args;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new ToolError('generateImage', 'INVALID_PROMPT', 'Prompt is empty or missing.', undefined, 'Please provide a descriptive prompt for the image.');
  }

  try {
    let base64ImageBytesArray: string[] = [];

    if (model.includes('flash-image')) {
        // Nano Banana / Flash Image
        const response = await generateContentWithRetry(ai, {
            model: model,
            contents: { parts: [{ text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        
        const parts = response.candidates?.[0]?.content?.parts;
        if (!parts || parts.length === 0) {
             // Check if it was blocked
             const finishReason = response.candidates?.[0]?.finishReason;
             if (finishReason === 'SAFETY') {
                 throw new ToolError('generateImage', 'SAFETY_BLOCK', 'Image generation was blocked by safety settings.', undefined, 'The prompt may violate safety guidelines. Please modify the prompt to be more safe for work.');
             }
             throw new ToolError('generateImage', 'NO_IMAGE_RETURNED', 'The model returned a response but no image data found.');
        }

        for (const part of parts) {
            if (part.inlineData?.data) {
                base64ImageBytesArray.push(part.inlineData.data);
            }
        }
    } else { 
        // Imagen Model
        const count = Math.max(1, Math.min(4, Math.floor(numberOfImages)));
        const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
        
        const response = await generateImagesWithRetry(ai, {
            model: model,
            prompt: prompt,
            config: {
              numberOfImages: count,
              outputMimeType: 'image/png',
              aspectRatio: validAspectRatios.includes(aspectRatio) ? aspectRatio : defaultAspectRatio,
            },
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new ToolError('generateImage', 'NO_IMAGE_RETURNED', 'Image generation failed. The model did not return any images.', undefined, 'This might be due to a strict safety filter on the prompt. Try a less sensitive prompt.');
        }
        
        base64ImageBytesArray = response.generatedImages
            .map(img => img.image?.imageBytes)
            .filter((bytes): bytes is string => !!bytes);
    }

    if (base64ImageBytesArray.length === 0) {
        throw new ToolError('generateImage', 'NO_DATA_EXTRACTED', 'Failed to extract image bytes from the response.');
    }

    const savedFilePaths: string[] = [];
    for (let i = 0; i < base64ImageBytesArray.length; i++) {
        const base64 = base64ImageBytesArray[i];
        const filename = `image_${Date.now()}_${i}.png`;
        const virtualPath = `${filename}`; 
        const buffer = Buffer.from(base64, 'base64');
        await fileStore.saveFile(chatId, virtualPath, buffer);
        savedFilePaths.push(virtualPath);
    }
    
    return `Successfully generated ${savedFilePaths.length} image(s) and saved to:\n- ${savedFilePaths.join('\n- ')}\n\n(Note: The image is saved. Use 'displayFile' if you want to show it.)`;

  } catch (err) {
    if (err instanceof ToolError) throw err;
    const originalError = err instanceof Error ? err : new Error(String(err));
    const msg = originalError.message || '';

    if (msg.includes('429') || msg.includes('quota')) {
        throw new ToolError('generateImage', 'QUOTA_EXCEEDED', 'Image generation quota exceeded.', originalError, 'Please wait a minute before trying again.');
    }
    if (msg.includes('400') || msg.includes('INVALID_ARGUMENT')) {
        throw new ToolError('generateImage', 'INVALID_REQUEST', 'The request parameters were invalid.', originalError, 'Check if the aspect ratio is supported for this model.');
    }

    throw new ToolError('generateImage', 'GENERATION_FAILED', originalError.message, originalError);
  }
};
