
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';

type VirtualizedCodeViewerProps = {
    content: string;
    language: string;
    theme: any; // Syntax theme object
};

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
        <span className="text-xs font-medium">Processing large file...</span>
    </div>
);

export const VirtualizedCodeViewer: React.FC<VirtualizedCodeViewerProps> = ({ content, language }) => {
    const [lines, setLines] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(true);

    useEffect(() => {
        // Reset state when content changes
        setIsProcessing(true);
        setLines([]);

        // Defer heavy processing to the next tick to allow the UI to render the loading state
        const timer = setTimeout(() => {
            // Split content into lines. 
            // Note: For extremely large strings (>100MB), even this split might block for ~100-200ms.
            // But since we are inside a setTimeout, the "Processing..." UI will be visible first.
            const splitLines = content.split('\n');
            setLines(splitLines);
            setIsProcessing(false);
        }, 50);

        return () => clearTimeout(timer);
    }, [content]);

    if (isProcessing) {
        return (
            <div className="h-full w-full bg-code-surface flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-code-surface text-code-text font-mono text-[13px]">
            <Virtuoso
                style={{ height: '100%', width: '100%' }}
                totalCount={lines.length}
                overscan={500} // Pre-render a decent chunk for smooth scrolling
                itemContent={(index) => {
                    const line = lines[index];
                    return (
                        <div className="flex leading-6 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                            {/* Line Number */}
                            <span 
                                className="w-16 flex-shrink-0 text-right pr-4 text-slate-400 dark:text-slate-600 select-none border-r border-slate-200 dark:border-white/5 mr-4 bg-slate-50/50 dark:bg-white/[0.02]"
                                style={{ fontFamily: 'inherit' }}
                            >
                                {index + 1}
                            </span>
                            
                            {/* Line Content - Plain text for max performance on massive files */}
                            {/* We avoid syntax highlighting here to keep scrolling 60fps on 1M lines */}
                            <span className="whitespace-pre break-all pr-4" style={{ fontFamily: "'Fira Code', monospace" }}>
                                {line || ' '} 
                            </span>
                        </div>
                    );
                }}
            />
        </div>
    );
};
