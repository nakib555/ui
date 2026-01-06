
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

type InlineCodeProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
};

// Parser to handle markdown-style emphasis inside inline code blocks
// Matches ***bolditalic***, **bold**, and *italic*
const parseContent = (content: string): React.ReactNode[] => {
    // Regex splits by the tokens, keeping them in the array
    const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*)/g;
    
    return content.split(regex).map((part, i) => {
        // Bold + Italic
        if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
            return <strong key={i} className="italic font-bold">{part.slice(3, -3)}</strong>;
        }
        // Bold
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        // Italic
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
            return <em key={i} className="italic">{part.slice(1, -1)}</em>;
        }
        return part;
    });
};

// This component renders the "one quote" (single backtick) inline code blocks.
// It is styled to look distinct from regular text, acting as a highlight block.
// It now supports arbitrary children and internal markdown-style formatting.
export const InlineCode: React.FC<InlineCodeProps> = ({ children, className = '', ...props }) => {
  let renderedChildren = children;

  // If children is a simple string, attempt to parse emphasis
  if (typeof children === 'string') {
      renderedChildren = parseContent(children);
  }

  // Remove potential 'node' prop if it slipped through props spreading from react-markdown
  const { node, ...safeProps } = props as any;

  return (
    <code 
      className={`
        font-mono 
        text-[0.875em] 
        px-1.5 
        py-0.5 
        rounded-md 
        mx-0.5 
        bg-code-surface
        text-code-text
        border border-border-subtle
        align-baseline
        inline 
        break-words
        ${className}
      `}
      {...safeProps}
    >
      {renderedChildren}
    </code>
  );
};
