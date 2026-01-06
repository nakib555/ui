
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { FunctionCall } from '@google/genai';
import type { MessageError } from './error';
import type { ParsedWorkflow } from './workflow';

export type BrowserSession = {
    url: string;
    title?: string;
    screenshot?: string; // base64
    logs: string[];
    status: 'running' | 'completed' | 'failed';
};

export type ToolCallEvent = {
    id: string;
    call: FunctionCall;
    result?: string;
    startTime?: number;
    endTime?: number;
    browserSession?: BrowserSession; // Live browser state
};

export type Attachment = {
  name: string;
  mimeType: string;
  data: string; // base64 encoded string
};

export type Source = {
  uri: string;
  title: string;
};

export type ModelResponse = {
  text: string;
  toolCallEvents?: ToolCallEvent[];
  error?: MessageError;
  startTime: number;
  endTime?: number;
  suggestedActions?: string[];
  plan?: { plan: string; callId?: string }; // Updated to support callId
  groundingMetadata?: any;
  workflow?: ParsedWorkflow;
  historyPayload?: Message[]; // Snapshot of the conversation "future" relative to this response
};

export type UserMessageVersion = {
    text: string;
    attachments?: Attachment[];
    createdAt: number;
    historyPayload?: Message[]; // Snapshot of the conversation "future" relative to this version
};

export type Message = {
  id: string;
  role: 'user' | 'model';

  // --- User Message Properties ---
  text: string; // For user role, this is the primary content (or active version content).
  attachments?: Attachment[];
  
  // Branching support for User messages
  versions?: UserMessageVersion[];
  activeVersionIndex?: number;
  
  // --- Model Message Properties ---
  responses?: ModelResponse[]; // An array of all generated responses.
  activeResponseIndex: number; // The index of the currently visible response.

  // --- Common State Properties ---
  isThinking?: boolean; // True when a new response is being generated.
  isHidden?: boolean;
  isPinned?: boolean;
  executionState?: 'pending_approval' | 'approved' | 'denied';
};
