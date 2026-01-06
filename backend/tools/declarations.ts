
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// This file centralizes all FunctionDeclarations for the tools.
// The backend-executed tools' implementations are in `/backend/tools/`.
// The frontend-executed tools' implementations are in `/src/tools/`.

import { FunctionDeclaration, Type } from "@google/genai";

export const calculatorDeclaration: FunctionDeclaration = {
    name: 'calculator',
    description: 'Evaluates a mathematical expression. Supports basic arithmetic operators (+, -, *, /), parentheses, and numbers. Does not support variables or advanced functions (sin, cos).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        expression: { type: Type.STRING, description: 'The mathematical expression to evaluate (e.g., "2 * (3 + 4) / 1.5"). Must only contain numbers, operators, and parentheses.' },
      },
      required: ['expression'],
    },
};

export const codeExecutorDeclaration: FunctionDeclaration = {
    name: 'executeCode',
    description: 'Executes code in a secure sandboxed environment. Supports Python, JavaScript, and other languages. For Python, it can install packages from PyPI, perform network requests, and read user-provided files.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        language: { type: Type.STRING, description: 'The programming language. Supported: "python", "javascript", "typescript", "bash", "go", "java".' },
        code: { type: Type.STRING, description: 'The complete source code to execute. Must be self-contained.' },
        packages: { type: Type.ARRAY, description: '(Python only) A list of PyPI packages to install before running the code (e.g., ["numpy", "pandas", "requests"]). Do not include standard library modules.', items: { type: Type.STRING } },
        input_filenames: { type: Type.ARRAY, description: '(Python only) A list of exact filenames (e.g. "data.csv") from the virtual filesystem that the code needs to read. These files must already exist via `writeFile` or uploads.', items: { type: Type.STRING } }
      },
      required: ['language', 'code'],
    },
};

export const duckduckgoSearchDeclaration: FunctionDeclaration = {
    name: 'duckduckgoSearch',
    description: 'Dual-function tool. 1) Search: If query is a search term, returns web results. 2) Summarize: If query is a URL, fetches and summarizes that specific page.',
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING, description: 'The search keywords (e.g. "current CEO of Google") or a specific URL (e.g. "https://example.com") to read.' } },
      required: ['query'],
    },
};

export const browserDeclaration: FunctionDeclaration = {
    name: 'browser',
    description: 'A headless web browser. Use this to read documentation, verify facts on specific pages, or inspect visual layouts of websites.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: 'The fully qualified URL to visit (must start with http:// or https://).' },
        action: { 
            type: Type.STRING, 
            description: 'Action to perform. "read": extract text content. "screenshot": take a picture of the page. "click"/"type"/"scroll": interact with dynamic elements.', 
            enum: ['read', 'screenshot', 'click', 'type', 'scroll', 'wait'] 
        },
        selector: { type: Type.STRING, description: 'CSS selector for "click" or "type" actions (e.g., "button#submit", ".search-input"). Required if action is click/type.' },
        text: { type: Type.STRING, description: 'Text to type for the "type" action.' },
        scrollDirection: { type: Type.STRING, description: 'Direction for "scroll" action.', enum: ['up', 'down', 'top', 'bottom'] }
      },
      required: ['url'],
    },
};

export const imageGeneratorDeclaration: FunctionDeclaration = {
    name: 'generateImage',
    description: 'Generates images based on a textual description using an AI model. Best for creating illustrations, diagrams, or photorealistic scenes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'A highly detailed visual description of the image. Include style, lighting, mood, and composition details.' },
        numberOfImages: { type: Type.NUMBER, description: 'Number of images (1-4). Defaults to 1. Only supported by Imagen models.'},
        aspectRatio: { type: Type.STRING, description: 'The aspect ratio. Options: "1:1" (square), "3:4" (portrait), "4:3" (landscape), "16:9" (wide), "9:16" (mobile).' },
      },
      required: ['prompt'],
    },
};

export const getCurrentLocationDeclaration: FunctionDeclaration = {
    name: 'getCurrentLocation',
    description: "Gets the user's current geographical location (latitude and longitude) from their device.",
    parameters: { type: Type.OBJECT, properties: {} },
};
  
export const requestLocationPermissionDeclaration: FunctionDeclaration = {
    name: 'requestLocationPermission',
    description: "Requests UI permission from the user to access their location. Use this if `getCurrentLocation` fails with a permission error.",
    parameters: { type: Type.OBJECT, properties: {} },
};

export const displayMapDeclaration: FunctionDeclaration = {
    name: 'displayMap',
    description: 'Displays an interactive map widget centered on specific coordinates.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        latitude: { type: Type.NUMBER, description: 'The decimal latitude.' },
        longitude: { type: Type.NUMBER, description: 'The decimal longitude.' },
        zoom: { type: Type.NUMBER, description: 'Zoom level (1-18). 1=World, 10=City, 15=Street. Default 13.' },
        markerText: { type: Type.STRING, description: 'Text label for the location marker.' }
      },
      required: ['latitude', 'longitude'],
    },
};
  
export const analyzeMapVisuallyDeclaration: FunctionDeclaration = {
    name: 'analyzeMapVisually',
    description: 'Analyzes a map at specific coordinates to describe landmarks, geography, and road layout. Use this if you need to "see" the map context.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        latitude: { type: Type.NUMBER, description: 'The latitude to analyze.' },
        longitude: { type: Type.NUMBER, description: 'The longitude to analyze.' },
      },
      required: ['latitude', 'longitude'],
    },
};

export const analyzeImageVisuallyDeclaration: FunctionDeclaration = {
    name: 'analyzeImageVisually',
    description: 'Analyzes a visual image file to describe its contents. Essential for verifying generated images or analyzing uploaded files.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        filePath: { type: Type.STRING, description: 'The path of an image in the virtual filesystem (e.g. "/main/output/chart.png").' },
        imageBase64: { type: Type.STRING, description: 'Raw base64 image data (used internally for screenshot analysis).' },
      },
    },
};

export const captureCodeOutputScreenshotDeclaration: FunctionDeclaration = {
    name: 'captureCodeOutputScreenshot',
    description: 'Captures a screenshot of HTML/JS output rendered by `executeCode`. Use this to "see" plots, graphs, or interactive widgets generated by code.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        outputId: {
          type: Type.STRING,
          description: 'The unique ID returned in the `executeCode` result when it renders HTML content.',
        },
      },
      required: ['outputId'],
    },
};
  
export const videoGeneratorDeclaration: FunctionDeclaration = {
    name: 'generateVideo',
    description: 'Generates a short video clip (seconds) from a text prompt. **Warning: This process is slow (2-5 mins). Inform the user before proceeding.**',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'Detailed visual description of the scene and motion.' },
        aspectRatio: { type: Type.STRING, description: 'Aspect ratio: "16:9" (Landscape) or "9:16" (Portrait).' },
        resolution: { type: Type.STRING, description: 'Resolution: "720p" or "1080p".' }
      },
      required: ['prompt'],
    },
};

export const listFilesDeclaration: FunctionDeclaration = {
    name: 'listFiles',
    description: 'Lists all files currently stored in the virtual filesystem directory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'Directory path (usually "/main/output").' },
      },
      required: ['path'],
    },
};
  
export const displayFileDeclaration: FunctionDeclaration = {
    name: 'displayFile',
    description: 'Renders a file (image, video, PDF) in the chat UI for the user.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'The full path of the file to show (e.g. "/main/output/result.png").' },
      },
      required: ['path'],
    },
};
  
export const deleteFileDeclaration: FunctionDeclaration = {
    name: 'deleteFile',
    description: 'Permanently deletes a file from the virtual filesystem.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'The full path of the file to delete.' },
      },
      required: ['path'],
    },
};
  
export const writeFileDeclaration: FunctionDeclaration = {
    name: 'writeFile',
    description: 'Creates or overwrites a text file in the virtual filesystem.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'The full destination path (e.g. "/main/output/summary.md").' },
        content: { type: Type.STRING, description: 'The text content to write.' },
      },
      required: ['path', 'content'],
    },
};

export const toolDeclarations = [
    duckduckgoSearchDeclaration,
    browserDeclaration,
    getCurrentLocationDeclaration,
    imageGeneratorDeclaration,
    videoGeneratorDeclaration,
    codeExecutorDeclaration,
    displayMapDeclaration,
    requestLocationPermissionDeclaration,
    analyzeMapVisuallyDeclaration,
    analyzeImageVisuallyDeclaration,
    captureCodeOutputScreenshotDeclaration,
    calculatorDeclaration,
    writeFileDeclaration,
    listFilesDeclaration,
    displayFileDeclaration,
    deleteFileDeclaration,
];
