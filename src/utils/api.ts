
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Determines the base URL for API requests based on the execution environment.
 */
export const getApiBaseUrl = (): string => {
    // 1. Manual Override from LocalStorage (Highest Priority)
    // Allows users to explicitly set a backend URL in Settings, overriding everything else.
    try {
        if (typeof window !== 'undefined') {
            const customUrl = localStorage.getItem('custom_server_url');
            if (customUrl) return customUrl.replace(/\/$/, '');
        }
    } catch (e) {}

    // 2. Build Configuration / Environment Variable (VITE_API_BASE_URL)
    // This allows deployments (like Cloudflare Pages) to define the backend URL via env vars.
    // In Vite, this is replaced at build time or available in dev mode.
    try {
        // @ts-ignore - Vite specific
        const envUrl = import.meta.env.VITE_API_BASE_URL;
        if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
            return envUrl.replace(/\/$/, '');
        }
    } catch (e) {
        // Ignore if import.meta is not available or fails
    }

    // 3. Safe environment detection
    // Some bundlers/runtimes don't support import.meta.env
    const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
    
    // 4. Development/Localhost logic
    if (typeof window !== 'undefined') {
        const { hostname, port, protocol } = window.location;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

        if (isLocal) {
            // If we are served from port 3000 (Vite) but backend is 3001
            if (port === '3000' || port === '8000' || port === '5173') {
                return `${protocol}//${hostname}:3001`;
            }
            // If served from backend port or a different local port, use relative
            return '';
        }
        
        // 5. Preview/Iframe Environments (like AI Studio)
        // If the hostname looks like a sub-domain of a known platform, 
        // we might still want to try same-origin relative paths first.
        return ''; 
    }

    return '';
};

// Global callback for version mismatch
let onVersionMismatch = () => {};
export const setOnVersionMismatch = (callback: () => void) => {
    onVersionMismatch = callback;
};

type ApiOptions = RequestInit & { silent?: boolean };

/**
 * Enhanced fetch wrapper for API calls with automatic base URL and error handling.
 */
export const fetchFromApi = async (url: string, options: ApiOptions = {}): Promise<Response> => {
    const baseUrl = getApiBaseUrl();
    const fullUrl = `${baseUrl}${url}`;
    const method = options.method || 'GET';
    const { silent, ...fetchOptions } = options;
    
    // Get version from safe source
    let appVersion = 'unknown';
    try {
        const meta = import.meta as any;
        appVersion = meta.env?.VITE_APP_VERSION || 'unknown';
    } catch (e) {}
    
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Client-Version': appVersion,
        ...fetchOptions.headers,
    };
    
    try {
        const response = await fetch(fullUrl, { ...fetchOptions, headers });
        
        // 409 Conflict is our convention for version mismatch
        if (response.status === 409) {
            console.warn(`[API Warning] ⚠️ Version mismatch detected for ${url}`);
            onVersionMismatch();
            throw new Error('Version mismatch');
        }

        if (!response.ok && !silent) {
            // Log as expanded object for better debugging in developer tools
            console.error(`[API Error] ❌ ${method} ${url} failed with status ${response.status}`);
            try {
                const errorData = await response.clone().json();
                console.dir(errorData);
            } catch (e) {
                const errorText = await response.clone().text();
                console.error('Response body:', errorText);
            }
        }
        
        return response;
    } catch (error) {
        if (!silent) {
            console.error(`[API Fatal] 💥 ${method} ${url} request failed`, error);
        }
        throw error;
    }
};
