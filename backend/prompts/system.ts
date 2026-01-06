/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PREAMBLE } from './preamble';
import { AGENTIC_WORKFLOW } from './agenticWorkflow';
import { PERSONA_AND_UI_FORMATTING } from './persona';
import { TOOLS_OVERVIEW } from './tools';

// =================================================================================================
// MASTER PROMPT: CORE DIRECTIVES FOR THE AGENTIC AI
// =================================================================================================

export const systemInstruction = [
    PREAMBLE,
    AGENTIC_WORKFLOW,
    PERSONA_AND_UI_FORMATTING,
    TOOLS_OVERVIEW,
].join('\n\n');