
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bubble } from './Bubble';
import { StyledLink } from './StyledLink';
import { CodeBlock } from './CodeBlock';
import { InlineCode } from './InlineCode';
import { StyledMark } from './StyledMark';

// Custom Blockquote component that acts as a router for Callouts and Bubbles
const BlockquoteRouter = (props: any) => {
    const childrenArray = React.Children.toArray(props.children);

    const getNodeText = (node: React.ReactNode): string => {
        if (typeof node === 'string') return node;
        if (Array.isArray(node)) return node.map(getNodeText).join('');
        if (React.isValidElement(node)) {
            const props = node.props as { children?: React.ReactNode };
            if (props.children) {
                return React.Children.toArray(props.children).map(getNodeText).join('');
            }
        }
        return '';
    };

    if (childrenArray.length > 0) {
        const firstLineText = getNodeText(childrenArray[0]).trim();
        const bubbleMatch = firstLineText.match(/^\(bubble\)\s*(.*)/is);
        if (bubbleMatch) {
            const content = bubbleMatch[1];
            return React.createElement(Bubble, null, content);
        }
    }
    
    // Use the CSS class defined in markdown.part1.css
    return React.createElement('blockquote', { className: "custom-blockquote", ...props });
};

type MarkdownOptions = {
    onRunCode?: (language: string, code: string) => void;
    isRunDisabled?: boolean;
};

// Factory function to create components with context (like code running handlers)
export const getMarkdownComponents = (options: MarkdownOptions = {}) => ({
    // Clean header mapping - CSS handles the visuals
    h1: (props: any) => React.createElement('h1', props),
    h2: (props: any) => React.createElement('h2', props),
    h3: (props: any) => React.createElement('h3', props),
    h4: (props: any) => React.createElement('h4', props),
    
    p: (props: any) => React.createElement('p', props),
    
    ul: (props: any) => React.createElement('ul', props),
    ol: (props: any) => React.createElement('ol', props),
    li: (props: any) => React.createElement('li', props),
    
    blockquote: BlockquoteRouter,
    a: (props: any) => React.createElement(StyledLink, props),
    
    strong: (props: any) => React.createElement('strong', { className: "font-semibold text-slate-900 dark:text-white", ...props }),
    em: (props: any) => React.createElement('em', { className: "italic text-slate-800 dark:text-slate-200", ...props }),
    img: (props: any) => React.createElement('img', { loading: "lazy", ...props }),
    mark: (props: any) => React.createElement(StyledMark, props),

    code: ({ inline, className, children, isBlock, node, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : '';
        
        if (isBlock || match) {
            let codeContent = '';
            if (Array.isArray(children)) {
                codeContent = children.map(child => 
                  (typeof child === 'string' || typeof child === 'number') ? String(child) : ''
                ).join('');
            } else {
                codeContent = String(children ?? '');
            }
            codeContent = codeContent.replace(/\n$/, '');

            return React.createElement(CodeBlock, { 
                language: language || 'plaintext', 
                isStreaming: false, 
                onRunCode: options.onRunCode,
                isDisabled: options.isRunDisabled,
                children: codeContent
            });
        }

        return React.createElement(InlineCode, { className, ...props }, children);
    },
    
    pre: ({ children }: any) => {
        if (React.isValidElement(children)) {
             return React.createElement('div', { className: "not-prose my-6" }, 
                React.cloneElement(children as React.ReactElement<any>, { isBlock: true })
             );
        }
        return React.createElement('div', { className: "not-prose my-6" }, children);
    },

    table: (props: any) => React.createElement(
        'div',
        { className: "w-full overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 my-6" },
        React.createElement(
            'div',
            { className: "overflow-x-auto" },
            React.createElement('table', props)
        )
    ),
    thead: (props: any) => React.createElement('thead', props),
    tbody: (props: any) => React.createElement('tbody', props),
    tr: (props: any) => React.createElement('tr', props),
    th: (props: any) => React.createElement('th', props),
    td: (props: any) => React.createElement('td', props),
    
    hr: (props: any) => React.createElement('hr', { className: "my-8 border-slate-200 dark:border-white/10", ...props }),
    del: (props: any) => React.createElement('del', { className: "line-through opacity-70", ...props }),
});

export const MarkdownComponents = getMarkdownComponents();

export const WorkflowMarkdownComponents = {
    ...MarkdownComponents,
    // Overrides for compact view
    h1: (props: any) => React.createElement('h1', { className: "text-base font-bold mb-2", ...props }),
    h2: (props: any) => React.createElement('h2', { className: "text-sm font-bold my-2", ...props }),
    h3: (props: any) => React.createElement('h3', { className: "text-sm font-semibold mb-1", ...props }),
    p: (props: any) => React.createElement('p', { className: "text-sm leading-relaxed mb-2 text-current", ...props }),
    ul: (props: any) => React.createElement('ul', { className: "text-sm list-disc pl-5 mb-2 space-y-1", ...props }),
    ol: (props: any) => React.createElement('ol', { className: "text-sm list-decimal pl-5 mb-2 space-y-1", ...props }),
    blockquote: (props: any) => React.createElement('blockquote', { className: "custom-blockquote-workflow", ...props }),
};
