
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ManualCodeRenderer } from '../../Markdown/ManualCodeRenderer';
import { WorkflowMarkdownComponents } from '../../Markdown/markdownComponents';

type ThinkingProcessProps = {
    thinkingText: string;
    isThinking: boolean;
};

export const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ thinkingText, isThinking }) => {
    const [isOpen, setIsOpen] = useState(false);
    // Auto-open only on initial mount if actively thinking, but respect user toggling afterwards
    const hasAutoOpened = useRef(false);

    useEffect(() => {
        if (isThinking && !hasAutoOpened.current && thinkingText.length > 0) {
            setIsOpen(true);
            hasAutoOpened.current = true;
        }
        // Auto-collapse when done thinking
        if (!isThinking && hasAutoOpened.current) {
            setIsOpen(false);
        }
    }, [isThinking, thinkingText.length]);

    if (!thinkingText) return null;

    return (
        <div className="w-full mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors select-none group"
            >
                <div className={`p-1 rounded-md bg-slate-100 dark:bg-white/5 group-hover:bg-slate-200 dark:group-hover:bg-white/10 transition-colors`}>
                    {isThinking ? (
                        <svg className="w-4 h-4 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                    )}
                </div>
                <span>{isThinking ? 'Thinking...' : 'Thought Process'}</span>
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor" 
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="pl-2 ml-3 border-l-2 border-slate-200 dark:border-white/10 mt-2 py-2">
                            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 workflow-markdown">
                                <ManualCodeRenderer 
                                    text={thinkingText} 
                                    components={WorkflowMarkdownComponents} 
                                    isStreaming={isThinking} 
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
