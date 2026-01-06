/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A list of general-purpose actions for proactively assisting with complex text.
export const PROACTIVE_SUGGESTIONS = [
  'Explain this',
  'Find potential issues',
  'Suggest improvements',
  'Summarize this',
];

/**
 * A heuristic function to detect if a block of text is complex (e.g., code, JSON, structured data)
 * rather than simple prose, making it a candidate for proactive assistance.
 * @param text The text to analyze.
 * @returns True if the text appears complex, false otherwise.
 */
export const isComplexText = (text: string): boolean => {
    const lines = text.split('\n');
    if (lines.length < 2) return false;

    // Heuristics to detect code-like structure
    const hasBraces = text.includes('{') || text.includes('}');
    const hasParens = text.includes('(') || text.includes(')');
    const hasSpecialChars = text.includes(';') || text.includes('=') || text.includes('=>') || text.includes('<') || text.includes('>');
    const hasIndentation = lines.some(line => line.trim().length > 0 && (line.startsWith('  ') || line.startsWith('\t')));
    const looksLikeProse = lines.every(line => /^[A-Z]/.test(line.trim()) && line.trim().endsWith('.'));

    // A block of text is likely code if it has multiple lines, some structure, and doesn't look like plain prose.
    return (hasBraces || hasParens || hasSpecialChars || hasIndentation) && !looksLikeProse;
};