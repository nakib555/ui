/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolError } from '../utils/apiError';
import { chromium, Browser, Page } from 'playwright';
import { GoogleGenAI } from "@google/genai"; // Needed for vision call

let browserInstance: Browser | null = null;
let activePages = new Map<string, Page>();

// Helper to launch browser
const getBrowser = async () => {
    if (!browserInstance) {
        try {
            console.log('[BrowserTool] Launching Chromium instance...');
            browserInstance = await chromium.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'] 
            });
            console.log('[BrowserTool] Chromium launched successfully.');
        } catch (e) {
            console.error("[BrowserTool] Failed to launch browser.", e);
            throw new Error("Browser initialization failed.");
        }
    }
    return browserInstance;
};

type BrowserUpdateCallback = (data: { 
    log?: string; 
    screenshot?: string; 
    url?: string; 
    title?: string;
    status?: 'running' | 'completed' | 'failed';
}) => void;

const getOrCreatePage = async (url: string): Promise<Page> => {
    const domain = new URL(url).hostname;
    
    if (activePages.size > 5) {
        const firstKey = activePages.keys().next().value;
        if (firstKey) {
            await activePages.get(firstKey)?.close();
            activePages.delete(firstKey);
        }
    }

    if (activePages.has(domain)) {
        return activePages.get(domain)!;
    }

    const browser = await getBrowser();
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    activePages.set(domain, page);
    return page;
};

// New: Visual Locator helper using Gemini Vision
// Note: We need the AI instance here. Since the signature of executeBrowser is fixed in the map,
// we might need to rely on a hack or update the signature in index.ts.
// For now, we'll try to find elements by text first, then fallback to vision if we can.
// But without `ai` passed in, we can't do the vision call *here*.
// Simplification: We will improve the selector logic to be robust.

export const executeBrowser = async (
    args: { 
        url: string, 
        action?: 'read' | 'screenshot' | 'click' | 'type' | 'scroll' | 'wait',
        selector?: string,
        text?: string,
        scrollDirection?: 'up' | 'down' | 'top' | 'bottom'
    }, 
    onUpdate?: BrowserUpdateCallback
): Promise<string> => {
    const { url, action = 'read', selector, text, scrollDirection } = args;
    console.log(`[BrowserTool] Execution started. URL: "${url}", Action: "${action}"`);

    if (!url) {
        throw new ToolError('browser', 'MISSING_URL', 'A URL is required.');
    }

    const emit = (data: any) => { if (onUpdate) onUpdate(data); };

    emit({ url, status: 'running', log: `Processing ${action} on ${url}...` });

    try {
        const page = await getOrCreatePage(url);
        
        if (page.url() !== url) {
            emit({ log: `Navigating to ${url}...` });
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            } catch (e: any) {
                console.warn(`[BrowserTool] Navigation warning: ${e.message}`);
            }
        }

        // --- INTERACTION LOGIC ---
        if (action === 'click') {
            if (!selector) throw new ToolError('browser', 'MISSING_SELECTOR', 'Selector required for click.');
            emit({ log: `Clicking element: ${selector}` });
            
            // Robust click: Try selector, then try text match
            try {
                await page.click(selector, { timeout: 3000 });
            } catch (e) {
                console.log(`[BrowserTool] Selector click failed, trying text match: ${selector}`);
                await page.getByText(selector).first().click({ timeout: 3000 });
            }
        } 
        else if (action === 'type') {
            if (!selector || !text) throw new ToolError('browser', 'MISSING_ARGS', 'Selector and text required.');
            emit({ log: `Typing into ${selector}...` });
            await page.fill(selector, text);
        }
        else if (action === 'scroll') {
            emit({ log: `Scrolling ${scrollDirection || 'down'}...` });
            if (scrollDirection === 'top') await page.evaluate(() => window.scrollTo(0, 0));
            else if (scrollDirection === 'bottom') await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            else await page.evaluate(() => window.scrollBy(0, 500));
        }
        else if (action === 'wait') {
            await page.waitForTimeout(2000);
        }

        const title = await page.title();
        const currentUrl = page.url();
        
        // Take Screenshot
        const buffer = await page.screenshot({ fullPage: false, type: 'jpeg', quality: 60 });
        const base64 = buffer.toString('base64');
        emit({ screenshot: `data:image/jpeg;base64,${base64}`, log: 'View captured.', title, url: currentUrl });
        
        const browserData = {
            url: currentUrl,
            title: title,
            screenshot: `data:image/jpeg;base64,${base64}`,
            logs: [`Action: ${action}`, `Target: ${selector || 'N/A'}`]
        };

        const uiComponent = `[BROWSER_COMPONENT]${JSON.stringify(browserData)}[/BROWSER_COMPONENT]`;

        if (action !== 'read') {
            emit({ status: 'completed', log: 'Interaction complete.' });
            return `${uiComponent}\n\nAction '${action}' completed.`;
        }

        // --- READ MODE ---
        emit({ log: 'Extracting content...' });
        const markdown = await page.evaluate(() => {
            const removeTags = (sel: string) => document.querySelectorAll(sel).forEach(el => el.remove());
            removeTags('script, style, noscript, iframe, svg, nav, footer, .ad, .ads');

            function htmlToMarkdown(element: Element): string {
                let text = "";
                const tagName = element.tagName.toLowerCase();
                element.childNodes.forEach(child => {
                    if (child.nodeType === 3) text += child.textContent?.trim() + " ";
                    else if (child.nodeType === 1) text += htmlToMarkdown(child as Element);
                });
                text = text.replace(/\s+/g, " ");
                if (tagName === "h1") return `\n# ${text}\n`;
                if (tagName === "h2") return `\n## ${text}\n`;
                if (tagName === "p") return `\n${text}\n`;
                if (tagName === "li") return `\n- ${text}`;
                if (tagName === "a") return `[${text}](${element.getAttribute("href")}) `;
                return text;
            }
            return htmlToMarkdown(document.body);
        });

        const cleanMarkdown = markdown.replace(/\n\s*\n/g, '\n\n').trim().substring(0, 15000);
        emit({ status: 'completed', log: `Extracted ${cleanMarkdown.length} chars.` });
        
        return `${uiComponent}\n\n### Extracted Content from ${currentUrl}\n\n${cleanMarkdown}`;

    } catch (error) {
        const err = error as Error;
        console.error(`[BrowserTool] Error: ${err.message}`);
        emit({ status: 'failed', log: `Error: ${err.message}` });
        throw new ToolError('browser', 'INTERACTION_FAILED', err.message);
    }
};