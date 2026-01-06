
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { motion as motionTyped } from 'framer-motion';
import type { Message } from '../../types';
import { ThinkingWorkflow } from '../AI/ThinkingWorkflow';
import { useViewport } from '../../hooks/useViewport';
import { ErrorDisplay } from '../UI/ErrorDisplay';
import { FormattedBlock } from '../Markdown/FormattedBlock';

const motion = motionTyped as any;

type ThinkingSidebarProps = {
    isOpen: boolean;
    onClose: () => void;
    message: Message | null;
    sendMessage: (message: string, files?: File[], options?: { isHidden?: boolean; isThinkingModeEnabled?: boolean; }) => void;
    width: number;
    setWidth: (width: number) => void;
    isResizing: boolean;
    setIsResizing: (isResizing: boolean) => void;
    onRegenerate: (messageId: string) => void;
};

// Mobile variants for bottom-up animation
const mobileVariants = {
  open: { y: 0 },
  closed: { y: '100%' },
};

export const ThinkingSidebar: React.FC<ThinkingSidebarProps> = ({ isOpen, onClose, message, sendMessage, width, setWidth, isResizing, setIsResizing, onRegenerate }) => {
    const { isDesktop } = useViewport();
    const contentRef = useRef<HTMLDivElement>(null);

    const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);

        const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
            const newWidth = window.innerWidth - mouseMoveEvent.clientX;
            setWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [setWidth, setIsResizing]);
    
    const { status, statusColor, plan, executionLog } = useMemo(() => {
        if (!message) {
            return { status: 'Idle', statusColor: 'bg-slate-400', plan: '', executionLog: [] };
        }

        const { isThinking } = message;
        const activeResponse = (message.responses && message.responses[message.activeResponseIndex]) || null;
        const error = activeResponse?.error;
        
        // Use workflow parsed by backend
        const parsedPlan = activeResponse?.workflow?.plan || '';
        const parsedLog = activeResponse?.workflow?.executionLog || [];

        if (error) {
            return { status: 'Failed', statusColor: 'bg-red-500 dark:bg-red-600', plan: parsedPlan, executionLog: parsedLog };
        }
        if (!isThinking) {
            return { status: 'Completed', statusColor: 'bg-emerald-500 dark:bg-emerald-600', plan: parsedPlan, executionLog: parsedLog };
        }
        return { status: 'In Progress', statusColor: 'bg-indigo-500 animate-pulse', plan: parsedPlan, executionLog: parsedLog };
    }, [message]);

    const isLiveGeneration = useMemo(() => executionLog.some(node => node.status === 'active'), [executionLog]);

    useEffect(() => {
        if (isLiveGeneration && contentRef.current) {
            contentRef.current.scrollTo({
                top: contentRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [executionLog, isLiveGeneration]);


    // Desktop variants for side-in animation
    const desktopVariants = {
        open: { width: width },
        closed: { width: 0 },
    };

    const variants = isDesktop ? desktopVariants : mobileVariants;
    const animateState = isOpen ? 'open' : 'closed';

    const thinkingContent = () => {
        if (!message) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-slate-400">
                            <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                            <path d="M3 12h1m8-9v1m8 8h1m-9 8v1M5.6 5.6l.7.7m12.1-.7-.7.7m0 11.4.7.7m-12.1-.7-.7.7" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No active thought process</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Select a message with reasoning to view details.</p>
                </div>
            );
        }

        const hasContent = plan || executionLog.length > 0;
        if (!hasContent) {
            const activeResponse = (message.responses && message.responses[message.activeResponseIndex]) || null;
            return (
                <div className="flex flex-col items-center justify-center h-full text-sm text-gray-500 dark:text-slate-400 p-4 text-center">
                    <p className="mb-4">This message did not involve a complex thought process.</p>
                    {activeResponse?.error && <ErrorDisplay error={activeResponse.error} />}
                </div>
           );
        }

        return (
            <div className="space-y-6 px-4 pb-12 break-words">
                {plan && (
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Strategic Plan
                            </h3>
                        </div>
                        <FormattedBlock content={plan} isStreaming={(message.isThinking ?? false) && executionLog.length === 0} />
                    </section>
                )}
                
                {executionLog.length > 0 && (
                     <section>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Execution Log
                            </h3>
                        </div>
                        <ThinkingWorkflow
                            nodes={executionLog}
                            sendMessage={sendMessage}
                            onRegenerate={onRegenerate}
                            messageId={message.id}
                        />
                    </section>
                )}
            </div>
        );
    }


    return (
        <motion.aside
            initial={false}
            animate={animateState}
            variants={variants}
            transition={{
                type: isResizing ? 'tween' : 'spring',
                duration: isResizing ? 0 : 0.5,
                stiffness: 250,
                damping: 30,
                mass: 0.8,
            }}
            className={`
                flex-shrink-0 overflow-hidden bg-white dark:bg-layer-1
                ${isDesktop 
                    ? 'relative border-l border-gray-200 dark:border-white/10' 
                    : 'fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 dark:border-white/10 rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)]' 
                }
            `}
            role="complementary"
            aria-labelledby="thinking-sidebar-title"
            style={{ 
                height: isDesktop ? '100%' : '60vh',
                userSelect: isResizing ? 'none' : 'auto',
                willChange: isResizing ? 'width' : 'width, transform'
            }}
        >
            <div 
                className="flex flex-col h-full overflow-hidden" 
                style={{ width: isDesktop ? `${width}px` : '100%' }}
            >
                {/* Drag handle for mobile */}
                {!isDesktop && (
                    <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
                        <div className="h-1.5 w-12 bg-gray-300 dark:bg-slate-700 rounded-full"></div>
                    </div>
                )}
                
                {/* Header */}
                <div className={`flex items-center justify-between px-4 pb-3 ${isDesktop ? 'pt-4' : 'pt-2'} border-b border-gray-200 dark:border-white/5 flex-shrink-0`}>
                    <div className="flex items-center gap-3">
                        <h2 id="thinking-sidebar-title" className="text-lg font-bold text-gray-800 dark:text-slate-100">Reasoning</h2>
                        {message && (
                            <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wide text-white rounded-md ${statusColor}`}>
                                {status}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        aria-label="Close thought process"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div ref={contentRef} className="flex-1 overflow-y-auto py-4 min-h-0 bg-slate-50/50 dark:bg-black/10">
                    {thinkingContent()}
                </div>
            </div>
            
            {isDesktop && isOpen && (
                <div
                    onMouseDown={startResizing}
                    className="absolute top-0 left-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-indigo-500/50 transition-colors z-10"
                    title="Resize sidebar"
                />
            )}
        </motion.aside>
    );
};
