
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolError } from '../utils/apiError';

export const executeCalculator = (args: { expression: string }): string => {
  try {
    const expression = args.expression;
    if (!expression || typeof expression !== 'string') {
        throw new ToolError('calculator', 'MISSING_ARGUMENT', 'No expression provided.', undefined, 'Please provide a mathematical expression string.');
    }

    // Strict validation: Only numbers, operators, parens, dots, spaces.
    // Prevents injection of arbitrary code.
    const safeExpressionRegex = /^[0-9+\-*/().\s]+$/;
    if (!safeExpressionRegex.test(expression)) {
      throw new ToolError(
          'calculator', 
          'INVALID_CHARACTERS', 
          'Expression contains invalid characters. Only numbers (0-9), operators (+, -, *, /), parentheses (), and decimals (.) are allowed.',
          undefined,
          'Please strip any text, variables, or unsupported characters from the expression.'
      );
    }

    // Evaluate
    let result;
    try {
        result = new Function(`return ${expression}`)();
    } catch (syntaxError: any) {
        throw new ToolError(
            'calculator', 
            'MALFORMED_EXPRESSION', 
            `Syntax Error: ${syntaxError.message}`, 
            syntaxError, 
            'Check for unbalanced parentheses or consecutive operators.'
        );
    }
    
    // Check for Math errors (Infinity, NaN)
    if (typeof result !== 'number' || isNaN(result)) {
        throw new ToolError('calculator', 'CALCULATION_NAN', 'The result is Not a Number (NaN).', undefined, 'Check for invalid operations like 0/0 or sqrt of negative numbers.');
    }
    if (!isFinite(result)) {
        throw new ToolError('calculator', 'CALCULATION_INFINITY', 'The result is infinite.', undefined, 'Check for division by zero.');
    }

    return String(result);

  } catch (error) {
    if (error instanceof ToolError) throw error;
    
    const originalError = error instanceof Error ? error : new Error(String(error));
    throw new ToolError(
        'calculator', 
        'UNKNOWN_ERROR', 
        originalError.message, 
        originalError, 
        "An unexpected error occurred. Please verify the expression format."
    );
  }
};
