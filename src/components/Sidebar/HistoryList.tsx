
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion as motionTyped, AnimatePresence } from 'framer-motion';
const motion = motionTyped as any;
import type { ChatSession } from '../../types';
import { HistoryItem } from './HistoryItem';
import { Skeleton } from '../UI/Skeleton';
import { Virtuoso } from 'react-virtuoso';

type HistoryListProps = {
  history: ChatSession[];
  currentChatId: string | null;
  searchQuery: string;
  isCollapsed: boolean;
  isDesktop: boolean;
  isHistoryLoading: boolean;
  onLoadChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onUpdateChatTitle: (id: string, title: string) => void;
};

const groupChatsByMonth = (chats: ChatSession[]): { [key: string]: ChatSession[] } => {
    const groups: { [key: string]: ChatSession[] } = {};
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;

    chats.forEach(chat => {
        const chatDate = new Date(chat.createdAt);
        let groupKey: string;

        if (chat.createdAt >= todayStart) {
            groupKey = 'Today';
        } else if (chat.createdAt >= yesterdayStart) {
            groupKey = 'Yesterday';
        } else {
            groupKey = chatDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        }

        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(chat);
    });
    return groups;
};

const NoItems = ({ message, subtext }: { message: string, subtext?: string }) => (
    <div className="flex flex-col items-center justify-center text-center py-8 px-4 opacity-60">
        <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-3 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <p className="font-medium text-sm text-slate-600 dark:text-slate-300">{message}</p>
        {subtext && <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{subtext}</p>}
    </div>
);

const HistorySkeleton = () => (
    <div className="space-y-1 px-2">
        {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
    </div>
);

const ChevronIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 transition-transform">
        <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
);

// Types for the flattened virtual list
type VirtualItem = 
    | { type: 'header'; group: string; collapsed: boolean } 
    | { type: 'chat'; chat: ChatSession };

export const HistoryList = ({ history, currentChatId, searchQuery, isCollapsed, isDesktop, isHistoryLoading, onLoadChat, onDeleteChat, onUpdateChatTitle }: HistoryListProps) => {
    const shouldCollapse = isDesktop && isCollapsed;

    // Persist collapsed state of groups (Today, Yesterday, etc.)
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
        try {
            const savedState = localStorage.getItem('chatHistoryGroups');
            return savedState ? JSON.parse(savedState) : {};
        } catch (e) { return {}; }
    });

    useEffect(() => {
        try { localStorage.setItem('chatHistoryGroups', JSON.stringify(collapsedGroups)); } catch (e) {}
    }, [collapsedGroups]);

    const toggleGroup = (groupName: string) => {
        setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    // Flatten the grouped data for Virtuoso
    const virtualItems = useMemo<VirtualItem[]>(() => {
        const filteredHistory = history.filter(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        if (filteredHistory.length === 0) return [];

        const grouped = groupChatsByMonth(filteredHistory);
        // Sort groups chronologically
        const groupOrder = ['Today', 'Yesterday', ...Object.keys(grouped).filter(k => k !== 'Today' && k !== 'Yesterday').sort((a, b) => new Date(b).getTime() - new Date(a).getTime())];

        const items: VirtualItem[] = [];
        
        groupOrder.forEach(groupName => {
            const chats = grouped[groupName];
            if (!chats || chats.length === 0) return;

            const isGroupCollapsed = collapsedGroups[groupName] ?? false;
            
            // Add Header
            items.push({ type: 'header', group: groupName, collapsed: isGroupCollapsed });

            // Add Chats if visible and sidebar is not collapsed
            // Note: If sidebar is collapsed (icon mode), we hide the list entirely in this design to prevent layout breaks
            if (!isGroupCollapsed && !shouldCollapse) {
                chats.forEach(chat => items.push({ type: 'chat', chat }));
            }
        });

        return items;
    }, [history, searchQuery, collapsedGroups, shouldCollapse]);

    if (isHistoryLoading) {
        return (
            <div className="flex-1 min-h-0 text-sm p-2">
                <HistorySkeleton />
            </div>
        );
    }

    if (virtualItems.length === 0 && !shouldCollapse) {
        return (
            <div className="flex-1 min-h-0 text-sm">
                <NoItems 
                    message={searchQuery ? 'No conversations found' : 'No conversations yet'} 
                    subtext={searchQuery ? 'Try a different search term.' : 'Start a new chat to begin.'}
                />
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-0 text-sm w-full">
            <Virtuoso
                style={{ height: '100%', width: '100%' }}
                data={virtualItems}
                className="custom-scrollbar"
                // Add a little padding at the bottom of the list
                components={{ Footer: () => <div className="h-4" /> }}
                itemContent={(index, item) => {
                    if (item.type === 'header') {
                        return (
                            <div className="pt-2 pb-1 px-1 bg-layer-1 z-10">
                                <button
                                    onClick={() => !shouldCollapse && toggleGroup(item.group)}
                                    disabled={shouldCollapse}
                                    className="w-full flex items-center justify-between px-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-gray-100/60 dark:hover:bg-violet-900/30 rounded py-1.5 transition-colors disabled:cursor-default disabled:hover:bg-transparent"
                                >
                                    <motion.span
                                        className="block overflow-hidden whitespace-nowrap"
                                        initial={false}
                                        animate={{ width: shouldCollapse ? 0 : 'auto', opacity: shouldCollapse ? 0 : 1 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {item.group}
                                    </motion.span>
                                    {!shouldCollapse && (
                                        <div className={`transition-transform duration-200 ${item.collapsed ? 'rotate-0' : 'rotate-90'}`}>
                                            <ChevronIcon />
                                        </div>
                                    )}
                                </button>
                            </div>
                        );
                    }

                    return (
                        <div className="px-1 py-0.5">
                            <HistoryItem 
                                text={item.chat.title} 
                                isCollapsed={isCollapsed}
                                isDesktop={isDesktop}
                                searchQuery={searchQuery}
                                active={item.chat.id === currentChatId}
                                onClick={() => onLoadChat(item.chat.id)}
                                onDelete={() => onDeleteChat(item.chat.id)}
                                onUpdateTitle={(newTitle) => onUpdateChatTitle(item.chat.id, newTitle)}
                                isLoading={item.chat.isLoading ?? false}
                            />
                        </div>
                    );
                }}
            />
        </div>
    );
};
