
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useLayoutEffect, Suspense } from 'react';
import { motion as motionTyped, PanInfo, useDragControls, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import type { Message } from '../../types';
import { useViewport } from '../../hooks/useViewport';

const motion = motionTyped as any;

// Safe lazy load
const ThinkingContent = React.lazy(() => 
    import('./ThinkingContent').then(m => ({ default: m.ThinkingContent }))
);

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

export const ThinkingSidebar: React.FC<ThinkingSidebarProps> = ({ isOpen, onClose, message, sendMessage, width, setWidth, isResizing, setIsResizing, onRegenerate }) => {
    const { isDesktop } = useViewport();
    const dragControls = useDragControls();
    
    // Mobile specific state
    const y = useMotionValue(typeof window !== 'undefined' ? window.innerHeight : 800);

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
    
    // Mobile Sheet Logic: Calculate optimal height and animate
    useLayoutEffect(() => {
        if (isDesktop) return;

        const vh = window.innerHeight;
        // Mobile layout constants
        const MAX_H = vh * 0.85; 
        const MIN_H = vh * 0.45;

        if (isOpen) {
            // Mobile: Always slide to Max height for better UX on thinking process
            const targetY = 0; 
            
            animate(y, targetY, { type: "spring", damping: 30, stiffness: 300 });
        } else {
            // Slide completely off screen
            animate(y, MAX_H, { type: "spring", damping: 30, stiffness: 300 });
        }
    }, [isOpen, isDesktop, y]);

    const onDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (isDesktop) return;

        const vh = window.innerHeight;
        const MAX_H = vh * 0.85;
        const MIN_H = vh * 0.45;
        const currentY = y.get();
        const velocityY = info.velocity.y;

        const closingThreshold = MAX_H - (MIN_H / 2); // Dragged far down

        if (velocityY > 300 || currentY > closingThreshold) {
            onClose();
        } else if (currentY < (MAX_H - MIN_H) / 2) {
            // Snap to Max
            animate(y, 0, { type: "spring", damping: 30, stiffness: 300 });
        } else {
            // Snap to Min
            animate(y, MAX_H - MIN_H, { type: "spring", damping: 30, stiffness: 300 });
        }
    };

    if (!isDesktop && !isOpen) return null;

    return (
        <>
            <AnimatePresence>
                {!isDesktop && isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
                        aria-hidden="true"
                    />
                )}
            </AnimatePresence>
            <motion.aside
                initial={false}
                animate={isDesktop ? { width: isOpen ? width : 0 } : undefined}
                style={!isDesktop ? { y, height: '85vh', maxHeight: '85vh' } : { width }}
                transition={isDesktop ? { type: isResizing ? 'tween' : 'spring', stiffness: 300, damping: 30 } : undefined}
                drag={!isDesktop ? "y" : false}
                dragListener={false} // Disable auto listener
                dragControls={dragControls}
                dragConstraints={{ top: 0, bottom: (typeof window !== 'undefined' ? window.innerHeight * 0.85 : 800) }}
                dragElastic={{ top: 0, bottom: 0.2 }}
                onDragEnd={onDragEnd}
                className={`
                    flex-shrink-0 overflow-hidden bg-white dark:bg-layer-1
                    ${isDesktop 
                        ? 'relative border-l border-gray-200 dark:border-white/10' 
                        : 'fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 dark:border-white/10 rounded-t-2xl shadow-2xl' 
                    }
                `}
                role="complementary"
                aria-labelledby="thinking-sidebar-title"
            >
                <div 
                    className="flex flex-col h-full overflow-hidden w-full relative" 
                >
                    {/* Drag handle for mobile */}
                    {!isDesktop && (
                        <div 
                            className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none w-full" 
                            onPointerDown={(e) => dragControls.start(e)}
                            aria-hidden="true"
                        >
                            <div className="h-1.5 w-12 bg-gray-300 dark:bg-slate-700 rounded-full"></div>
                        </div>
                    )}
                    
                    {/* Close Button on Desktop (Mobile uses drag/backdrop) */}
                    {isDesktop && (
                        <div className="absolute top-2 right-2 z-10">
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
                    )}

                    {/* Content */}
                    <div className="flex-1 min-h-0 w-full">
                        <Suspense fallback={
                            <div className="flex flex-col items-center justify-center h-full gap-3">
                                <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                                <span className="text-xs text-slate-500">Loading reasoning...</span>
                            </div>
                        }>
                            <ThinkingContent 
                                message={message}
                                sendMessage={sendMessage}
                                onRegenerate={onRegenerate}
                            />
                        </Suspense>
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
        </>
    );
};
