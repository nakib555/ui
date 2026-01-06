/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolError } from '../utils/apiError';
import { fileStore } from '../services/fileStore';
import { executeWithPiston } from './piston';

export const executeCode = async (args: { language: string; code: string; packages?: string[]; input_filenames?: string[] }, chatId: string): Promise<string> => {
  const { language, code, input_filenames } = args;

  try {
    // Gather input files from virtual file system if requested
    const files: { name: string; content: string }[] = [];
    files.push({ name: 'main', content: code }); // Main code file

    if (input_filenames && Array.isArray(input_filenames)) {
        for (const filePath of input_filenames) {
            try {
                const fileBuffer = await fileStore.getFile(chatId, filePath);
                if (fileBuffer) {
                    // Piston expects text content for files. 
                    // If it's a text file, we decode it. 
                    // Binary file support in Piston is limited/complex via JSON API, so we attempt UTF-8.
                    // Ideally, we should check mime type, but for code input (csv, json, txt), utf-8 is safe.
                    files.push({
                        name: filePath.split('/').pop() || 'file',
                        content: fileBuffer.toString('utf-8')
                    });
                } else {
                    console.warn(`[executeCode] Input file not found: ${filePath}`);
                }
            } catch (e) {
                console.warn(`[executeCode] Failed to read input file ${filePath}:`, e);
            }
        }
    }

    // Execute via Piston with all gathered files
    const output = await executeWithPiston(language, files);

    // Construct the UI component data
    // We attempt to create a visual representation (HTML) even for text output
    // to allow the 'captureCodeOutputScreenshot' tool to work on the output.
    let htmlOutput = '';
    const trimmedOutput = output.trim();

    if (trimmedOutput.startsWith('<!DOCTYPE html>') || trimmedOutput.startsWith('<html') || trimmedOutput.startsWith('<svg')) {
        // It's already HTML/SVG, pass it through
        htmlOutput = output;
    } else {
        // Strip ANSI codes from HTML output to prevent garbage characters in the visual preview
        // Regex to match ANSI escape codes
        const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
        const cleanHtmlOutput = output.replace(ansiRegex, '');

        // Wrap plain text in a terminal-like view for the visual iframe
        const safeOutput = cleanHtmlOutput.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        htmlOutput = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 16px; background-color: #121212; color: #e0e0e0; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; }
                </style>
            </head>
            <body>${safeOutput || '<span style="color: #666; font-style: italic;">No output</span>'}</body>
            </html>
        `;
    }

    const outputId = `code-output-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const componentData = {
        outputId,
        htmlOutput,
        textOutput: output
    };

    return `[CODE_OUTPUT_COMPONENT]${JSON.stringify(componentData)}[/CODE_OUTPUT_COMPONENT]`;

  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    if (error instanceof ToolError) throw error; // Re-throw tool errors
    throw new ToolError('executeCode', 'EXECUTION_FAILED', originalError.message, originalError, "An error occurred while executing the code. Check the 'Details' for technical information and try correcting the code.");
  }
};