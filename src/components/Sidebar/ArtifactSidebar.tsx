
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useLayoutEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useDragControls, useMotionValue, animate } from 'framer-motion';
import { useViewport } from '../../hooks/useViewport';
import { ArtifactContent } from './ArtifactContent';

type ArtifactSidebarProps = {
    isOpen: boolean;
    onClose: () => void;
    content: string;
    language: string;
    width: number;
    setWidth: (width: number) => void;
    isResizing: boolean;
    setIsResizing: (isResizing: boolean) => void;
};

// No lazy loading needed for ArtifactContent as it's already code-split within itself via Sandpack lazy loading
// And ArtifactSidebar is already lazy loaded by App.

export const ArtifactSidebar: React.FC<ArtifactSidebarProps> = React.memo(({ 
    isOpen, onClose, content, language, width, setWidth, isResizing, setIsResizing 
}) => {
    const { isDesktop } = useViewport();
    const dragControls = useDragControls();
    
    // Mobile specific state
    const y = useMotionValue(typeof window !== 'undefined' ? window.innerHeight : 800);

    // Mobile Sheet Logic: Calculate optimal height and animate
    useLayoutEffect(() => {
        if (isDesktop) return;

        const vh = window.innerHeight;
        // Mobile layout constants
        const MAX_H = vh * 0.85; 
        const MIN_H = vh * 0.45;

        if (isOpen) {
            // Assume reasonable content height or just maximize for code view
            const targetHeight = MAX_H; 
            const targetY = MAX_H - targetHeight;
            
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

        const closingThreshold = MAX_H - (MIN_H / 2);

        if (velocityY > 300 || currentY > closingThreshold) {
            onClose();
        } else if (currentY < (MAX_H - MIN_H) / 2) {
            // Snap to Max (Full 85vh)
            animate(y, 0, { type: "spring", damping: 30, stiffness: 300 });
        } else {
            // Snap to Min (45vh)
            animate(y, MAX_H - MIN_H, { type: "spring", damping: 30, stiffness: 300 });
        }
    };

    const startResizingHandler = useCallback((mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);
        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = window.innerWidth - e.clientX;
            setWidth(Math.max(300, Math.min(newWidth, window.innerWidth * 0.8)));
        };
        const handleMouseUp = () => {
            setIsResizing(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [setIsResizing, setWidth]);

    // Mobile Overlay - Only show if open
    if (!isDesktop && !isOpen) return null;

    return (
        <>
            {/* Backdrop for Mobile */}
            <AnimatePresence>
                {!isDesktop && isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60]"
                    />
                )}
            </AnimatePresence>

            <motion.aside
                initial={false}
                // Desktop uses width, Mobile uses Y via MotionValue
                animate={isDesktop ? { width: isOpen ? width : 0 } : undefined} 
                style={!isDesktop ? { y, height: '85vh', maxHeight: '85vh' } : { width }}
                transition={isDesktop ? { type: isResizing ? 'tween' : 'spring', stiffness: 300, damping: 30 } : undefined}
                drag={!isDesktop ? "y" : false}
                dragListener={false} // Manual control via drag handle
                dragControls={dragControls}
                dragConstraints={{ top: 0, bottom: (typeof window !== 'undefined' ? window.innerHeight * 0.85 : 800) }}
                dragElastic={{ top: 0, bottom: 0.2 }}
                onDragEnd={onDragEnd}
                className={`
                    flex-shrink-0 bg-layer-1 border-l border-border-subtle overflow-hidden flex flex-col shadow-2xl
                    ${isDesktop 
                        ? 'relative h-full z-30' 
                        : 'fixed inset-x-0 bottom-0 z-[70] border-t rounded-t-2xl'
                    }
                `}
            >
                <div 
                    className="flex flex-col h-full overflow-hidden w-full relative"
                >
                    {/* Drag handle for mobile */}
                    {!isDesktop && (
                        <div 
                            className="flex justify-center pt-3 pb-1 flex-shrink-0 bg-layer-1 cursor-grab active:cursor-grabbing touch-none w-full" 
                            onPointerDown={(e) => dragControls.start(e)}
                            aria-hidden="true"
                        >
                            <div className="h-1.5 w-12 bg-gray-300 dark:bg-slate-700 rounded-full"></div>
                        </div>
                    )}

                    <ArtifactContent 
                        content={content}
                        language={language}
                        onClose={onClose}
                    />
                </div>

                {/* Resize Handle (Desktop only) */}
                {isDesktop && (
                    <div
                        className="group absolute top-0 left-0 h-full z-50 w-4 cursor-col-resize flex justify-start hover:bg-transparent pl-[1px]"
                        onMouseDown={startResizingHandler}
                    >
                        <div className={`w-[2px] h-full transition-colors duration-200 ${isResizing ? 'bg-indigo-500' : 'bg-transparent group-hover:bg-indigo-400/50'}`}></div>
                    </div>
                )}
            </motion.aside>
        </>
    );
});
