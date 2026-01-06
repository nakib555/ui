
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Source } from '../../types';
import { useViewport } from '../../hooks/useViewport';
import { SourceItem } from './SourceItem';

type SourcesSidebarProps = {
    isOpen: boolean;
    onClose: () => void;
    sources: Source[];
    width: number;
    setWidth: (width: number) => void;
    isResizing: boolean;
    setIsResizing: (isResizing: boolean) => void;
};

export const SourcesSidebar: React.FC<SourcesSidebarProps> = ({ isOpen, onClose, sources, width, setWidth, isResizing, setIsResizing }) => {
    const { isDesktop } = useViewport();

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

    const desktopVariants = { open: { width }, closed: { width: 0 } };
    const mobileVariants = { open: { y: 0 }, closed: { y: '100%' } };
    const variants = isDesktop ? desktopVariants : mobileVariants;
    const animateState = isOpen ? 'open' : 'closed';

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
                mass: 0.8
            }}
            className={`flex-shrink-0 overflow-hidden bg-white dark:bg-[#09090b] ${
                isDesktop 
                ? 'relative border-l border-gray-200 dark:border-white/10' 
                : 'fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 dark:border-white/10 rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)]'
            }`}
            role="complementary"
            aria-labelledby="sources-sidebar-title"
            style={{ 
                height: isDesktop ? '100%' : '50vh',
                userSelect: isResizing ? 'none' : 'auto',
                willChange: isResizing ? 'width' : 'width, transform'
            }}
        >
            <div className="flex flex-col h-full overflow-hidden" style={{ width: isDesktop ? `${width}px` : '100%' }}>
                {/* Drag handle for mobile */}
                {!isDesktop && (
                    <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
                        <div className="h-1.5 w-12 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
                    </div>
                )}

                <div className={`flex items-center justify-between px-4 pb-3 ${isDesktop ? 'pt-4' : 'pt-2'} border-b border-gray-200 dark:border-white/10 flex-shrink-0`}>
                    <h2 id="sources-sidebar-title" className="text-lg font-bold text-gray-800 dark:text-slate-100">Sources</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-200/50 dark:hover:bg-black/20 transition-colors" aria-label="Close sources">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {sources && sources.length > 0 ? (
                        <div className="space-y-1">
                            {sources.map((source, index) => <SourceItem key={source.uri + index} source={source} />)}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-slate-400 p-4 text-center">No sources were provided for this response.</div>
                    )}
                </div>
            </div>
            
            {isDesktop && isOpen && (
                <div onMouseDown={startResizing} className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize bg-transparent hover:bg-blue-500/30 transition-colors z-10" title="Resize sidebar" />
            )}
        </motion.aside>
    );
};
