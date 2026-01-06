
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { ToolError } from '../utils/apiError';
import { generateContentWithRetry } from '../utils/geminiUtils';

function hasProperty<K extends PropertyKey>(obj: unknown, prop: K): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && prop in obj;
}

export const executeWebSearch = async (ai: GoogleGenAI, args: { query: string }): Promise<string> => {
  if (!args.query || !args.query.trim()) {
      throw new ToolError('duckduckgoSearch', 'MISSING_QUERY', 'Search query cannot be empty.');
  }

  try {
    let prompt: string;
    let isUrl = false;
    try {
      new URL(args.query); isUrl = true;
    } catch (_) { /* not a URL */ }

    if (isUrl) {
      prompt = `You are a research assistant. Your goal is to provide a comprehensive, well-structured summary of the content found at the provided URL. Start with a high-level summary, then break down the key topics with bullet points. Conclude with the main takeaway. Do not add any conversational filler. URL: "${args.query}"`;
    } else {
      prompt = `You are a web research expert. Your task is to answer the user's query based on Google Search results. Provide a comprehensive, well-structured answer. Synthesize information from multiple sources. Use markdown for formatting. Do not include a list of sources in your response. Query: "${args.query}"`;
    }
    
    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    const summary = response.text?.trim() ?? '';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    if (!summary && groundingChunks.length === 0) {
        throw new ToolError('duckduckgoSearch', 'NO_RESULTS', 'The search returned no text summary and no grounding sources.', undefined, 'Try rephrasing your search query to be more specific or use general keywords.');
    }

    const sources: { uri: string; title: string }[] = [];
    for (const chunk of groundingChunks) {
      if (!hasProperty(chunk, 'web') || typeof chunk.web !== 'object' || chunk.web === null) continue;
      const web = chunk.web;
      if (!hasProperty(web, 'uri') || typeof web.uri !== 'string') continue;
      const uri = web.uri;
      let title = uri;
      if (hasProperty(web, 'title') && typeof web.title === 'string' && web.title.trim()) {
          title = web.title.trim();
      }
      sources.push({ uri, title });
    }

    const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());
    if (isUrl && !uniqueSources.some(s => s.uri === args.query)) {
        uniqueSources.unshift({ uri: args.query, title: args.query });
    }
    
    const sourcesMarkdown = uniqueSources.map(s => `- [${s.title}](${s.uri})`).join('\n');
    
    return `Search successful. Here is a summary of the findings:\n\n${summary}\n\n[SOURCES_PILLS]\n${sourcesMarkdown}\n[/SOURCES_PILLS]`;
  } catch (err) {
    if (err instanceof ToolError) throw err;
    const originalError = err instanceof Error ? err : new Error(String(err));
    throw new ToolError('duckduckgoSearch', 'SEARCH_FAILED', originalError.message, originalError, 'The search grounding request failed. This may be a temporary API issue.');
  }
};
