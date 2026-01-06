
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Message } from '../../types';
import { fetchFromApi } from '../../utils/api';

export const generateFollowUpSuggestions = async (conversation: Message[]): Promise<string[]> => {
    if (conversation.length < 2) return [];

    try {
        const response = await fetchFromApi('/api/handler?task=suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation }),
            silent: true // Suppress errors for background tasks
        });
        
        if (!response.ok) {
            throw new Error(`Suggestion generation failed with status ${response.status}`);
        }

        const { suggestions } = await response.json();

        if (Array.isArray(suggestions) && suggestions.every(s => typeof s === 'string')) {
            return suggestions.slice(0, 3);
        }
        return [];
    } catch (error) {
        // console.error("Follow-up suggestion generation failed:", error);
        return [];
    }
};