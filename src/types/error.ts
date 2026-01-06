/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MessageError = {
    code?: string;
    message: string;
    details?: string;
    suggestion?: string;
};

export class ToolError extends Error {
    public cause?: Error;
    public code: string;
    public suggestion?: string;
    
    constructor(
        public toolName: string,
        code: string,
        public originalMessage: string,
        cause?: Error,
        suggestion?: string,
    ) {
        // The message of this ToolError instance will be what's thrown.
        super(`Tool '${toolName}' failed with code ${code}. Reason: ${originalMessage}`);
        this.name = 'ToolError';
        this.code = `TOOL_${code}`;
        this.cause = cause;
        this.suggestion = suggestion;
    }
}