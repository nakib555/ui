
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FunctionCall } from "@google/genai";

export type ToolCallEvent = {
    id: string;
    call: FunctionCall;
    result?: string;
    startTime?: number;
    endTime?: number;
};
