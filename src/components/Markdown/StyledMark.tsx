
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

// Enhanced color palette for custom markdown highlighting
// Updated to be text-only colors as requested
const colorMap: Record<string, string> = {
    // Standard Colors
    red:    "text-red-600 dark:text-red-400",
    blue:   "text-blue-600 dark:text-blue-400",
    green:  "text-green-600 dark:text-green-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    orange: "text-orange-600 dark:text-orange-400",
    purple: "text-purple-600 dark:text-purple-400",
    pink:   "text-pink-600 dark:text-pink-400",
    teal:   "text-teal-600 dark:text-teal-400",
    gray:   "text-gray-500 dark:text-gray-400",
    
    // Semantic Aliases
    error:  "text-red-600 dark:text-red-400 font-bold",
    warn:   "text-orange-600 dark:text-orange-400 font-bold",
    info:   "text-blue-600 dark:text-blue-400 font-bold",
    success:"text-green-600 dark:text-green-400 font-bold",
};

export const StyledMark: React.FC = (props: any) => {
    const children = React.Children.toArray(props.children);
    
    // Check if the first child is a string and contains a color tag like [red]
    if (children.length > 0 && typeof children[0] === 'string') {
        const firstChild = children[0] as string;
        const colorMatch = firstChild.match(/^\[([a-zA-Z]+)\]/);
        
        if (colorMatch && colorMatch[1]) {
            const colorName = colorMatch[1].toLowerCase();
            const classes = colorMap[colorName];
            
            // Remove the [color] tag from the text
            const text = firstChild.substring(colorMatch[0].length);
            
            // Update children array: replace the first tag-bearing string with the clean text
            if (text) {
                children[0] = text;
            } else {
                children.shift();
            }

            if (classes) {
                return (
                    <span className={`font-semibold ${classes}`}>
                        {children}
                    </span>
                );
            }
        }
    }

    // Default behavior for standard `==text==` without color tag
    // Returns text-only coloring (Amber/Yellow) instead of background highlight
    return (
        <span className="text-amber-600 dark:text-amber-400 font-semibold">
            {props.children}
        </span>
    );
};
