/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getApiKey } from './settingsHandler';
import { listAvailableModels } from './services/modelService';

export const getAvailableModelsHandler = async (req: any, res: any) => {
    const apiKey = await getApiKey();
    if (!apiKey) {
        // If no key is configured, return empty lists without hitting the API.
        return res.status(200).json({ models: [], imageModels: [], videoModels: [], ttsModels: [] });
    }

    try {
        const { chatModels, imageModels, videoModels, ttsModels } = await listAvailableModels(apiKey);
        
        res.status(200).json({
            models: chatModels,
            imageModels,
            videoModels,
            ttsModels,
        });

    } catch (error: any) {
        // The service layer logs the specific error.
        // We return a generic server error to the client.
        console.error("Error in getAvailableModelsHandler:", error.message);
        res.status(500).json({ 
            error: "An error occurred while fetching models.",
            models: [], 
            imageModels: [], 
            videoModels: [],
            ttsModels: []
        });
    }
};