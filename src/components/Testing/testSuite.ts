
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Message } from '../../types';

export type TestResult = {
    description: string;
    pass: boolean;
    details: string;
};

export type TestProgress = {
    total: number;
    current: number;
    description: string;
    status: 'running' | 'pass' | 'fail';
    results: TestResult[];
};

export type TestCase = {
  description: string;
  prompt: string;
  options?: { isThinkingModeEnabled?: boolean };
  validate: (message: Message) => Promise<TestResult>;
};

const validateResponse = (message: Message): { pass: false, details: string } | { pass: true, response: NonNullable<Message['responses']>[0] } => {
    if (message.isThinking) {
        return { pass: false, details: 'Validation failed: AI is still thinking.' };
    }
    const response = message.responses?.[message.activeResponseIndex];
    if (!response) {
        return { pass: false, details: 'Validation failed: No active response found in the message.' };
    }
    if (response.error) {
        return { pass: false, details: `Validation failed: AI returned an error: ${response.error.message}` };
    }
    return { pass: true, response };
};


export const testSuite: TestCase[] = [
    {
        description: 'Basic Chat: Simple Greeting',
        prompt: 'Hello, how are you?',
        validate: async (message): Promise<TestResult> => {
            const description = 'Basic Chat: Simple Greeting';
            const result = validateResponse(message);
            if ('details' in result) {
                return { description, pass: false, details: result.details };
            }
            const pass = result.response.text.length > 5;
            return {
                description,
                pass,
                details: pass ? 'Received a valid, non-empty response.' : 'Response was empty or too short.'
            };
        }
    },
    {
        description: 'Agent Mode: Web Search',
        prompt: 'What is the tallest building in the world as of 2024?',
        options: { isThinkingModeEnabled: true },
        validate: async (message): Promise<TestResult> => {
            const description = 'Agent Mode: Web Search';
            const result = validateResponse(message);
            if ('details' in result) {
                return { description, pass: false, details: result.details };
            }

            const hasThinking = result.response.text.includes('[STEP] Think:');
            const usedSearch = result.response.toolCallEvents?.some(t => t.call.name === 'duckduckgoSearch');
            const hasAnswer = result.response.text.toLowerCase().includes('burj khalifa');

            if (hasThinking && usedSearch && hasAnswer) {
                return { description, pass: true, details: 'Agent mode activated, used search tool, and provided the correct answer.' };
            }
            return { description, pass: false, details: `Validation failed. Thinking: ${hasThinking}, Search: ${usedSearch}, Answer: ${hasAnswer}` };
        }
    },
    {
        description: 'Agent Mode: Map Display',
        prompt: 'Show me a map of Paris, France',
        options: { isThinkingModeEnabled: true },
        validate: async (message): Promise<TestResult> => {
            const description = 'Agent Mode: Map Display';
            const result = validateResponse(message);
            if ('details' in result) {
                return { description, pass: false, details: result.details };
            }

            const usedDisplayMap = result.response.toolCallEvents?.some(t => t.call.name === 'displayMap');
            const hasMapComponent = result.response.text.includes('[MAP_COMPONENT]');

            if (usedDisplayMap && hasMapComponent) {
                return { description, pass: true, details: 'Agent correctly used the displayMap tool and included the map component.' };
            }
            return { description, pass: false, details: `Validation failed. Used tool: ${usedDisplayMap}, Included component: ${hasMapComponent}` };
        }
    },
    {
        description: 'Agent Mode: Code Execution',
        prompt: 'Calculate 5 * 12 using python and tell me the result.',
        options: { isThinkingModeEnabled: true },
        validate: async (message): Promise<TestResult> => {
            const description = 'Agent Mode: Code Execution';
            const result = validateResponse(message);
            if ('details' in result) {
                return { description, pass: false, details: result.details };
            }

            const usedCodeExecutor = result.response.toolCallEvents?.some(t => t.call.name === 'executeCode');
            const hasCorrectResult = result.response.text.includes('60');

            if (usedCodeExecutor && hasCorrectResult) {
                return { description, pass: true, details: 'Agent used the code executor and provided the correct numerical result.' };
            }
            return { description, pass: false, details: `Validation failed. Used tool: ${usedCodeExecutor}, Correct result: ${hasCorrectResult}` };
        }
    },
    {
        description: 'Agent Mode: Image Generation',
        prompt: 'Generate an image of a blue car.',
        options: { isThinkingModeEnabled: true },
        validate: async (message): Promise<TestResult> => {
            const description = 'Agent Mode: Image Generation';
            const result = validateResponse(message);
            if ('details' in result) {
                return { description, pass: false, details: result.details };
            }
            
            const usedImageTool = result.response.toolCallEvents?.some(t => t.call.name === 'generateImage');
            const displayedFile = result.response.toolCallEvents?.some(t => t.call.name === 'displayFile');
            const hasImageComponent = result.response.text.includes('[IMAGE_COMPONENT]');

            if (usedImageTool && displayedFile && hasImageComponent) {
                return { description, pass: true, details: 'Agent used image generation and file display tools, and included the image component.' };
            }
            return { description, pass: false, details: `Validation failed. Generation: ${usedImageTool}, Display: ${displayedFile}, Component: ${hasImageComponent}` };
        }
    },
    {
        description: 'Agent Mode: Video Generation',
        prompt: 'Generate a short video of a sunset over the ocean.',
        options: { isThinkingModeEnabled: true },
        validate: async (message): Promise<TestResult> => {
            const description = 'Agent Mode: Video Generation';
            const result = validateResponse(message);
            if ('details' in result) return { description, pass: false, details: result.details };

            const usedVideoTool = result.response.toolCallEvents?.some(t => t.call.name === 'generateVideo');
            const displayedFile = result.response.toolCallEvents?.some(t => t.call.name === 'displayFile');
            const hasVideoComponent = result.response.text.includes('[VIDEO_COMPONENT]');

            if (usedVideoTool && displayedFile && hasVideoComponent) {
                return { description, pass: true, details: 'Agent used video generation and file display tools, and included the video component.' };
            }
            return { description, pass: false, details: `Validation failed. Generation: ${usedVideoTool}, Display: ${displayedFile}, Component: ${hasVideoComponent}` };
        }
    },
    {
        description: 'Agent Mode: File System (writeFile & listFiles)',
        prompt: 'Write the text "hello world" to a file named "test.txt" and then list the files in the output directory.',
        options: { isThinkingModeEnabled: true },
        validate: async (message): Promise<TestResult> => {
            const description = 'Agent Mode: File System (writeFile & listFiles)';
            const result = validateResponse(message);
            if ('details' in result) return { description, pass: false, details: result.details };

            const usedWriteFile = result.response.toolCallEvents?.some(t => t.call.name === 'writeFile');
            const usedListFiles = result.response.toolCallEvents?.some(t => t.call.name === 'listFiles');
            const mentionedFile = result.response.text.includes('test.txt');

            if (usedWriteFile && usedListFiles && mentionedFile) {
                return { description, pass: true, details: 'Agent correctly used writeFile and listFiles, and referenced the new file.' };
            }
            return { description, pass: false, details: `Validation failed. Write: ${usedWriteFile}, List: ${usedListFiles}, Mentioned: ${mentionedFile}` };
        }
    },
    {
        description: 'Agent Mode: Multi-tool Chaining (Search & Code)',
        prompt: 'Find the 2023 populations for London and Paris. Then, write and execute a python script to print the sum of these two populations.',
        options: { isThinkingModeEnabled: true },
        validate: async (message): Promise<TestResult> => {
            const description = 'Agent Mode: Multi-tool Chaining (Search & Code)';
            const result = validateResponse(message);
            if ('details' in result) return { description, pass: false, details: result.details };

            const usedSearch = result.response.toolCallEvents?.some(t => t.call.name === 'duckduckgoSearch');
            const usedCode = result.response.toolCallEvents?.some(t => t.call.name === 'executeCode');
            const hasFinalAnswer = result.response.text.includes('Final Answer:');
            
            if (usedSearch && usedCode && hasFinalAnswer) {
                return { description, pass: true, details: 'Agent successfully chained search and code execution tools.' };
            }
            return { description, pass: false, details: `Validation failed. Search: ${usedSearch}, Code: ${usedCode}, Final Answer: ${hasFinalAnswer}` };
        }
    },
    {
        description: 'Chat Mode: Search Grounding',
        prompt: 'Who won the most recent F1 world championship?',
        options: { isThinkingModeEnabled: false },
        validate: async (message): Promise<TestResult> => {
            const description = 'Chat Mode: Search Grounding';
            const result = validateResponse(message);
            if ('details' in result) return { description, pass: false, details: result.details };
            
            const grounding = result.response.groundingMetadata;
            const hasGrounding = grounding && grounding.groundingChunks && grounding.groundingChunks.length > 0;

            if (hasGrounding) {
                return { description, pass: true, details: 'Chat mode correctly used search grounding and provided sources.' };
            }
            return { description, pass: false, details: 'Response was missing search grounding metadata.' };
        }
    },
    {
        description: 'Component Rendering: Multiple Choice Question',
        prompt: 'Ask me a multiple choice question about the solar system.',
        validate: async (message): Promise<TestResult> => {
            const description = 'Component Rendering: Multiple Choice Question';
            const result = validateResponse(message);
            if ('details' in result) return { description, pass: false, details: result.details };

            const mcqMatch = result.response.text.match(/\[MCQ_COMPONENT\](\{.*?\})\[\/MCQ_COMPONENT\]/s);
            if (!mcqMatch || !mcqMatch[1]) {
                return { description, pass: false, details: 'MCQ component tag was not found in the response.' };
            }
            try {
                const data = JSON.parse(mcqMatch[1]);
                const pass = data.question && data.options && data.answer && data.explanation;
                return { description, pass, details: pass ? 'MCQ component was found and contains all required fields.' : 'MCQ JSON is missing required fields.' };
            } catch (e) {
                return { description, pass: false, details: 'Failed to parse JSON inside MCQ component.' };
            }
        }
    },
    {
        description: 'Markdown Rendering: MathJax Math Formulas',
        prompt: 'What is the quadratic formula?',
        validate: async (message): Promise<TestResult> => {
            const description = 'Markdown Rendering: MathJax Math Formulas';
            const result = validateResponse(message);
            if ('details' in result) return { description, pass: false, details: result.details };
            
            const hasDisplayMath = result.response.text.includes('$$');
            const hasInlineMath = result.response.text.includes('$') && !hasDisplayMath; // Simple check
            const hasFormula = result.response.text.includes('\\frac');

            if (hasDisplayMath && hasFormula) {
                return { description, pass: true, details: 'Response includes valid display-style math syntax.' };
            }
            return { description, pass: false, details: `Validation failed. Display Math: ${hasDisplayMath}, Formula Content: ${hasFormula}` };
        }
    },
    {
        description: 'Markdown Rendering: Tables',
        prompt: 'Create a markdown table with 2 columns (Name, Age) and 2 rows of data.',
        validate: async (message): Promise<TestResult> => {
            const description = 'Markdown Rendering: Tables';
            const result = validateResponse(message);
            if ('details' in result) {
                return { description, pass: false, details: result.details };
            }

            const hasTableSyntax = /\|.*\|.*\n\|---\|---\|/.test(result.response.text);
            if (hasTableSyntax) {
                return { description, pass: true, details: 'Response includes valid markdown table syntax.' };
            }
            return { description, pass: false, details: 'Response did not contain the expected markdown table syntax.' };
        }
    },
    {
        description: 'Error Handling: Invalid Tool',
        prompt: 'Use the nonExistentTool to do something.',
        options: { isThinkingModeEnabled: true },
        validate: async (message): Promise<TestResult> => {
            const description = 'Error Handling: Invalid Tool';
            // This test is expected to fail at the AI level, so we look for an error.
            if (message.isThinking) {
                return { description, pass: false, details: 'AI is still thinking, could not validate error state.' };
            }
            const response = message.responses?.[message.activeResponseIndex];
            if (response?.error && response.error.code?.includes('TOOL')) {
                return { description, pass: true, details: `AI correctly identified an error state: ${response.error.message}` };
            }
            if (response?.error) {
                 return { description, pass: false, details: `AI returned an error, but it was not a tool-related error. Code: ${response.error.code}` };
            }
            return { description, pass: false, details: 'AI did not return an error as expected for an invalid tool call.' };
        }
    }
];
