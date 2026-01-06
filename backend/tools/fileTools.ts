/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolError } from '../utils/apiError';
import { fileStore } from '../services/fileStore';

export const executeListFiles = async (args: { path: string }, chatId: string): Promise<string> => {
    try {
        const files = await fileStore.listFiles(chatId, args.path);
        if (files.length === 0) {
            return `No files found in directory: ${args.path}`;
        }
        return `Files in ${args.path}:\n- ${files.join('\n- ')}`;
    } catch (err) {
        const originalError = err instanceof Error ? err : new Error(String(err));
        throw new ToolError('listFiles', 'LISTING_FAILED', originalError.message, originalError, "Could not list files. The specified path might be incorrect or the virtual file system is unavailable.");
    }
};

export const executeDisplayFile = async (args: { path: string }, chatId: string): Promise<string> => {
    try {
        // Verify existence locally
        const fileBuffer = await fileStore.getFile(chatId, args.path);
        if (!fileBuffer) {
            throw new Error(`File not found at path: ${args.path}`);
        }

        let mimeType = 'application/octet-stream';
        const extension = args.path.split('.').pop()?.toLowerCase() || '';
        if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(extension)) {
            mimeType = `image/${extension.replace('jpg', 'jpeg')}`;
        } else if (['mp4', 'webm', 'ogg'].includes(extension)) {
            mimeType = `video/${extension}`;
        } else if (extension === 'pdf') {
            mimeType = 'application/pdf';
        } else if (['html', 'htm'].includes(extension)) {
            mimeType = 'text/html';
        }

        const filename = args.path.split('/').pop() || 'file';
        
        // Get the correct public URL based on the chat's folder name
        const srcUrl = await fileStore.getPublicUrl(chatId, args.path);

        const fileData = { filename, srcUrl, mimeType };

        if (mimeType.startsWith('image/')) {
            return `[IMAGE_COMPONENT]${JSON.stringify({ srcUrl, caption: `Image: ${filename}`, editKey: args.path })}[/IMAGE_COMPONENT]`;
        }
        if (mimeType.startsWith('video/')) {
            return `[VIDEO_COMPONENT]${JSON.stringify({ srcUrl, prompt: `Video: ${filename}` })}[/VIDEO_COMPONENT]`;
        }
        
        return `[FILE_ATTACHMENT_COMPONENT]${JSON.stringify(fileData)}[/FILE_ATTACHMENT_COMPONENT]`;

    } catch (err) {
        const originalError = err instanceof Error ? err : new Error(String(err));
        throw new ToolError('displayFile', 'DISPLAY_FAILED', originalError.message, originalError, "The file could not be displayed. It might have been deleted or the path is incorrect. Try using `listFiles` to see available files.");
    }
};

export const executeDeleteFile = async (args: { path: string }, chatId: string): Promise<string> => {
    try {
        await fileStore.deleteFile(chatId, args.path);
        return `File deleted successfully: ${args.path}`;
    } catch (err) {
        const originalError = err instanceof Error ? err : new Error(String(err));
        throw new ToolError('deleteFile', 'DELETION_FAILED', originalError.message, originalError, "Could not delete the file. The path may be incorrect or you may not have permission.");
    }
};

export const executeWriteFile = async (args: { path: string, content: string }, chatId: string): Promise<string> => {
    const { path, content } = args;
    try {
        await fileStore.saveFile(chatId, path, content);
        return `File saved successfully: ${path}`;
    } catch (err) {
        if (err instanceof ToolError) throw err;
        const originalError = err instanceof Error ? err : new Error(String(err));
        throw new ToolError('writeFile', 'WRITE_FAILED', originalError.message, originalError, "Could not write to the file. The path may be invalid or the storage might be full.");
    }
};