/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { ChatSession } from '../../types';
import { SidebarHeader } from './SidebarHeader';
import { SearchInput } from './SearchInput';
import { NewChatButton } from './NewChatButton';
import { HistoryList } from './HistoryList';
import { SidebarFooter } from './SidebarFooter';

type SidebarContentProps = {
    isCollapsed: boolean;
    isDesktop: boolean;
    setIsOpen: (isOpen: boolean) => void;
    setIsCollapsed: (collapsed: boolean) => void;
    history: ChatSession[];
    isHistoryLoading: boolean;
    currentChatId: string | null;
    onNewChat: () => void;
    isNewChatDisabled?: boolean;
    onLoadChat: (id: string) => void;
    onDeleteChat: (id: string) => void;
    onUpdateChatTitle: (id: string, title: string) => void;
    onSettingsClick: () => void;
};

export const SidebarContent: React.FC<SidebarContentProps> = React.memo(({ 
    isCollapsed, isDesktop, setIsOpen, setIsCollapsed,
    history, isHistoryLoading, currentChatId, onNewChat, isNewChatDisabled,
    onLoadChat, onDeleteChat, onUpdateChatTitle, onSettingsClick
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

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

    return (
        <>
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
        </>
    );
});
