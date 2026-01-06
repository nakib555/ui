
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion as motionTyped, AnimatePresence } from 'framer-motion';
const motion = motionTyped as any;
import { NavItem } from './NavItem';
import type { ChatSession } from '../../types';
import { SidebarHeader } from './SidebarHeader';
import { SearchInput } from './SearchInput';
import { NewChatButton } from './NewChatButton';
import { HistoryList } from './HistoryList';
import { SidebarFooter } from './SidebarFooter';

type SidebarProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    width: number;
    setWidth: (width: number) => void;
    isResizing: boolean;
    setIsResizing: (isResizing: boolean) => void;
    history: ChatSession[];
    isHistoryLoading: boolean;
    currentChatId: string | null;
    onNewChat: () => void;
    isNewChatDisabled?: boolean;
    onLoadChat: (id: string) => void;
    onDeleteChat: (id: string) => void;
    onUpdateChatTitle: (id: string, title: string) => void;
    onSettingsClick: () => void;
    isDesktop: boolean;
};

// Simplified mobile animation variants
const mobileVariants = {
    open: { x: '0%' },
    closed: { x: '-100%' },
};

export const Sidebar: React.FC<SidebarProps> = ({ 
    isOpen, setIsOpen, isCollapsed, setIsCollapsed, width, setWidth,
    isResizing, setIsResizing, history, isHistoryLoading, currentChatId, onNewChat, isNewChatDisabled, onLoadChat,
    onDeleteChat, onUpdateChatTitle, onSettingsClick,
    isDesktop
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const prevIsDesktop = useRef(isDesktop);
    const [animationDisabledForResize, setAnimationDisabledForResize] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (prevIsDesktop.current !== isDesktop) {
            setAnimationDisabledForResize(true);
            const timer = setTimeout(() => {
                setAnimationDisabledForResize(false);
            }, 50);
            prevIsDesktop.current = isDesktop;
            return () => clearTimeout(timer);
        }
    }, [isDesktop]);

    const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);

        const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
            setWidth(mouseMoveEvent.clientX);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [setWidth, setIsResizing]);

    const handleNewChat = () => {
        onNewChat();
        setSearchQuery('');
        if (!isDesktop) {
            setIsOpen(false);
        }
    };

    const handleLoadChat = (id: string) => {
        onLoadChat(id);
        if (!isDesktop) {
            setIsOpen(false);
        }
    };
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                if (isCollapsed) setIsCollapsed(false);
                if (!isOpen && !isDesktop) setIsOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 100);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCollapsed, isDesktop, isOpen, setIsCollapsed, setIsOpen]);


    return (
        <aside className={`h-full flex-shrink-0 ${isDesktop ? 'relative z-20' : 'fixed inset-0 z-40 pointer-events-none'}`}>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {!isDesktop && isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" 
                        style={{ willChange: 'opacity' }}
                    />
                )}
            </AnimatePresence>
            
            {/* Sidebar Content */}
            <motion.div
                initial={false}
                animate={isDesktop ? { width: isCollapsed ? 72 : width } : (isOpen ? 'open' : 'closed')}
                variants={isDesktop ? undefined : mobileVariants}
                transition={{
                    type: isResizing || animationDisabledForResize ? 'tween' : 'spring',
                    duration: isResizing || animationDisabledForResize ? 0 : 0.4,
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8,
                }}
                style={{
                    height: '100%',
                    position: isDesktop ? 'relative' : 'absolute',
                    width: isDesktop ? 'auto' : 300, // Fixed width on mobile for consistency
                    left: 0,
                    top: 0,
                    pointerEvents: 'auto',
                    willChange: isResizing ? 'width' : 'transform, width',
                }}
                className="bg-layer-1 border-r border-border flex flex-col transform-gpu shadow-2xl md:shadow-none overflow-hidden"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                <div 
                    className="p-3 flex flex-col h-full group"
                    style={{ userSelect: isResizing ? 'none' : 'auto' }}
                >
                    <SidebarHeader 
                        isCollapsed={isCollapsed}
                        isDesktop={isDesktop}
                        setIsOpen={setIsOpen} 
                        setIsCollapsed={setIsCollapsed}
                    />

                    <SearchInput 
                        ref={searchInputRef}
                        isCollapsed={isCollapsed}
                        isDesktop={isDesktop}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                    />

                    <NewChatButton
                        isCollapsed={isCollapsed}
                        isDesktop={isDesktop}
                        onClick={handleNewChat}
                        disabled={isNewChatDisabled}
                    />
                    
                    <motion.div 
                        className="mb-2 border-t border-border"
                        initial={false}
                        animate={{ opacity: isCollapsed ? 0 : 1, height: isCollapsed ? 0 : 'auto' }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    />

                    <HistoryList 
                        history={history}
                        isHistoryLoading={isHistoryLoading}
                        currentChatId={currentChatId}
                        searchQuery={searchQuery}
                        isCollapsed={isCollapsed}
                        isDesktop={isDesktop}
                        onLoadChat={handleLoadChat}
                        onDeleteChat={onDeleteChat}
                        onUpdateChatTitle={onUpdateChatTitle}
                    />
                    
                    <SidebarFooter 
                        isCollapsed={isCollapsed}
                        isDesktop={isDesktop}
                        onSettingsClick={onSettingsClick}
                    />
                </div>

                {/* Resize Handle */}
                {isDesktop && !isCollapsed && (
                    <div
                        className="group absolute top-0 right-0 h-full z-50 w-4 translate-x-2 cursor-col-resize flex justify-center hover:bg-transparent"
                        onMouseDown={startResizing}
                    >
                        <div className={`w-[2px] h-full transition-colors duration-200 ${isResizing ? 'bg-indigo-500' : 'bg-transparent group-hover:bg-indigo-400/50'}`}></div>
                    </div>
                )}
                
                {/* Desktop Expand Button */}
                {isDesktop && isCollapsed && (
                    <button
                        onClick={() => setIsCollapsed(false)}
                        className="absolute -right-3 top-12 w-6 h-12 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 rounded-r-lg flex items-center justify-center text-slate-400 hover:text-indigo-500 shadow-sm cursor-pointer z-50 opacity-0 group-hover:opacity-100 transition-opacity delay-300"
                        title="Expand sidebar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                )}
            </motion.div>
        </aside>
    );
};
