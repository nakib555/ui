/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SETTINGS_FILE_PATH, readData, writeData } from './data-store';
import { listAvailableModels } from './services/modelService';

// In-memory cache for settings to avoid reading disk on every request
let cachedSettings: any = null;

const ensureSettingsLoaded = async () => {
    if (!cachedSettings) {
        try {
            cachedSettings = await readData(SETTINGS_FILE_PATH);
        } catch (error) {
            console.error('Failed to load settings into cache:', error);
            // Fallback or re-throw depending on severity, but here we likely want to know it failed.
            throw error;
        }
    }
    return cachedSettings;
};

export const getSettings = async (req: any, res: any) => {
    try {
        const settings = await ensureSettingsLoaded();
        res.status(200).json(settings);
    } catch (error) {
        console.error('Failed to get settings:', error);
        res.status(500).json({ error: 'Failed to retrieve settings.' });
    }
};

export const updateSettings = async (req: any, res: any) => {
    try {
        const currentSettings = await ensureSettingsLoaded();
        const updates = req.body;
        
        const newSettings = { ...currentSettings, ...updates };
        
        // Update Cache Immediately
        cachedSettings = newSettings;
        
        // Persist to Disk
        await writeData(SETTINGS_FILE_PATH, newSettings);

        // Check if critical settings changed (Provider or API Key)
        const providerChanged = updates.provider && updates.provider !== currentSettings.provider;
        const keyChanged = (newSettings.provider === 'gemini' && updates.apiKey !== currentSettings.apiKey) ||
                           (newSettings.provider === 'openrouter' && updates.openRouterApiKey !== currentSettings.openRouterApiKey);

        if (providerChanged || keyChanged) {
            try {
                // Fetch models based on the NEW provider and NEW key
                const activeKey = newSettings.provider === 'openrouter' ? newSettings.openRouterApiKey : newSettings.apiKey;
                // If switching providers, we might not have the key yet, so handle gracefully
                if (activeKey) {
                    const { chatModels, imageModels, videoModels, ttsModels } = await listAvailableModels(activeKey, true);
                    res.status(200).json({ ...newSettings, models: chatModels, imageModels, videoModels, ttsModels });
                    return;
                }
            } catch (error) {
                // If fetching models fails (invalid key), just return settings
            }
        }

        res.status(200).json(newSettings);
    } catch (error) {
        console.error('Failed to update settings:', error);
        res.status(500).json({ error: 'Failed to update settings.' });
    }
};

export const getApiKey = async (): Promise<string | undefined> => {
    try {
        const settings = await ensureSettingsLoaded();
        if (settings.provider === 'openrouter') {
            return settings.openRouterApiKey;
        }
        return settings.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    } catch (error) {
        return process.env.API_KEY || process.env.GEMINI_API_KEY;
    }
};

export const getSuggestionApiKey = async (): Promise<string | undefined> => {
    try {
        const settings = await ensureSettingsLoaded();
        return settings.suggestionApiKey || process.env.SUGGESTION_API_KEY;
    } catch (error) {
        return process.env.SUGGESTION_API_KEY;
    }
};

export const getProvider = async (): Promise<'gemini' | 'openrouter'> => {
    try {
        const settings = await ensureSettingsLoaded();
        return settings.provider || 'gemini';
    } catch (error) {
        return 'gemini';
    }
}