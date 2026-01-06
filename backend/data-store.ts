/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { promises as fs } from 'fs';
import path from 'path';
import { Buffer } from 'buffer';

export const DATA_DIR = process.env.DATA_DIR || path.join((process as any).cwd(), 'data');
export const HISTORY_PATH = path.join(DATA_DIR, 'history');
export const HISTORY_INDEX_PATH = path.join(DATA_DIR, 'history-index.json');
export const TIME_GROUPS_PATH = path.join(DATA_DIR, 'time-groups.json');
export const SETTINGS_FILE_PATH = path.join(DATA_DIR, 'settings.json');
export const MEMORY_CONTENT_PATH = path.join(DATA_DIR, 'memory.txt');
export const MEMORY_FILES_DIR = path.join(DATA_DIR, 'memory_files');

export async function readData<T>(filePath: string): Promise<T> {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
}

/**
 * Writes content to a file atomically.
 * Works with Strings (text/json) and Buffers (binary/images).
 */
export async function writeFileAtomic(filePath: string, data: string | Buffer): Promise<void> {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    const dir = path.dirname(filePath);

    try {
        // Ensure directory exists
        await fs.mkdir(dir, { recursive: true });
        
        // Write to temp file
        await fs.writeFile(tempPath, data);
        
        // Atomic rename (replace)
        await fs.rename(tempPath, filePath);
    } catch (error) {
        console.error(`[DataStore] Failed to write file atomically to ${filePath}:`, error);
        // Attempt cleanup
        try { await fs.unlink(tempPath); } catch (e) {}
        throw error;
    }
}

/**
 * Wrapper for atomic JSON writing.
 */
export async function writeData(filePath: string, data: any): Promise<void> {
    await writeFileAtomic(filePath, JSON.stringify(data, null, 2));
}

export async function initDataFile(filePath: string, defaultContent: any) {
    try {
        await fs.access(filePath);
    } catch {
        await writeData(filePath, defaultContent);
    }
}

export async function initDataStore() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(HISTORY_PATH, { recursive: true });
    await fs.mkdir(MEMORY_FILES_DIR, { recursive: true });

    await initDataFile(HISTORY_INDEX_PATH, []);
    await initDataFile(TIME_GROUPS_PATH, {});
    
    // Default settings
    const defaultSettings = {
        provider: 'gemini', // 'gemini' | 'openrouter'
        apiKey: '',
        openRouterApiKey: '',
        suggestionApiKey: '', // Secondary key for background tasks
        aboutUser: '',
        aboutResponse: '',
        temperature: 0.7,
        maxTokens: 0,
        imageModel: '', // Dynamic
        videoModel: '', // Dynamic
        isMemoryEnabled: false,
        ttsVoice: 'Kore',
        ttsModel: '', // Dynamic
        isAgentMode: false,
        activeModel: '', 
    };
    await initDataFile(SETTINGS_FILE_PATH, defaultSettings);
    
    // Initialize Core Memory File if missing
    try {
        await fs.access(MEMORY_CONTENT_PATH);
    } catch {
        await fs.writeFile(MEMORY_CONTENT_PATH, '', 'utf-8');
    }
}