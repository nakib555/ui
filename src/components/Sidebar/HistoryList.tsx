/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion as motionTyped, AnimatePresence } from 'framer-motion';
const motion = motionTyped as any;
import type { ChatSession } from '../../types';
import { HistoryItem } from './HistoryItem';
import { Skeleton } from '../UI/Skeleton';

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

    // The `history` prop is already sorted newest to oldest from the parent hook.
    // Iterating and pushing will maintain this order within groups.
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
    <motion.div 
        className="flex flex-col items-center justify-center text-center py-8 px-4 opacity-60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
    >
        <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-3 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <p className="font-medium text-sm text-slate-600 dark:text-slate-300">{message}</p>
        {subtext && <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{subtext}</p>}
    </motion.div>
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

export const HistoryList = ({ history, currentChatId, searchQuery, isCollapsed, isDesktop, isHistoryLoading, onLoadChat, onDeleteChat, onUpdateChatTitle }: HistoryListProps) => {
    const filteredHistory = history.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedHistory = groupChatsByMonth(filteredHistory);
    // Establish a chronological sort order for the group titles.
    const groupOrder = ['Today', 'Yesterday', ...Object.keys(groupedHistory).filter(k => k !== 'Today' && k !== 'Yesterday').sort((a, b) => new Date(b).getTime() - new Date(a).getTime())];
    
    const shouldCollapse = isDesktop && isCollapsed;

    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
        try {
            const savedState = localStorage.getItem('chatHistoryGroups');
            return savedState ? JSON.parse(savedState) : {};
        } catch (e) {
            console.warn("Failed to parse chat history groups from localStorage", e);
            return {};
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('chatHistoryGroups', JSON.stringify(collapsedGroups));
        } catch (e) { /* ignore */ }
    }, [collapsedGroups]);

    const toggleGroup = (groupName: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName],
        }));
    };

    if (isHistoryLoading) {
        return (
            <div className={`flex-1 min-h-0 text-sm ${!shouldCollapse ? 'overflow-y-auto' : ''}`}>
                <HistorySkeleton />
            </div>
        );
    }

    return (
        <div className={`flex-1 min-h-0 text-sm ${!shouldCollapse ? 'overflow-y-auto' : ''}`}>
            {Object.keys(groupedHistory).length > 0 ? (
                <div className="space-y-2">
                    {groupOrder.map(groupName => {
                        const chatsInGroup = groupedHistory[groupName];
                        if (!chatsInGroup || chatsInGroup.length === 0) return null;

                        const isGroupCollapsed = collapsedGroups[groupName] ?? false;

                        return (
                            <div key={groupName}>
                                <button
                                    onClick={() => !shouldCollapse && toggleGroup(groupName)}
                                    disabled={shouldCollapse}
                                    className="w-full flex items-center justify-between px-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 hover:bg-gray-100/60 dark:hover:bg-violet-900/30 rounded py-1 transition-colors disabled:cursor-default disabled:bg-transparent dark:disabled:bg-transparent"
                                    aria-expanded={!isGroupCollapsed}
                                    aria-controls={`group-content-${groupName}`}
                                >
                                    <motion.span
                                        className="block overflow-hidden whitespace-nowrap"
                                        initial={false}
                                        animate={{ width: shouldCollapse ? 0 : 'auto', opacity: shouldCollapse ? 0 : 1, x: shouldCollapse ? -5 : 0 }}
                                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                    >
                                        {groupName}
                                    </motion.span>
                                    <motion.div
                                        className={shouldCollapse ? 'hidden' : 'block'}
                                        animate={{ rotate: isGroupCollapsed ? 0 : 90 }}
                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                    >
                                        <ChevronIcon />
                                    </motion.div>
                                </button>
                                <AnimatePresence initial={false}>
                                    {!isGroupCollapsed && !shouldCollapse && (
                                        <motion.div
                                            id={`group-content-${groupName}`}
                                            key="content"
                                            initial="collapsed"
                                            animate="open"
                                            exit="collapsed"
                                            variants={{
                                                open: { opacity: 1, height: 'auto' },
                                                collapsed: { opacity: 0, height: 0 }
                                            }}
                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        >
                                            <div className="space-y-0.5">
                                                <AnimatePresence initial={false}>
                                                    {chatsInGroup.map((item) => (
                                                        <motion.div
                                                            key={item.id}
                                                            layout
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            <HistoryItem 
                                                                text={item.title} 
                                                                isCollapsed={isCollapsed}
                                                                isDesktop={isDesktop}
                                                                searchQuery={searchQuery}
                                                                active={item.id === currentChatId}
                                                                onClick={() => onLoadChat(item.id)}
                                                                onDelete={() => onDeleteChat(item.id)}
                                                                onUpdateTitle={(newTitle) => onUpdateChatTitle(item.id, newTitle)}
                                                                isLoading={item.isLoading ?? false}
                                                            />
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    })}
                </div>
            ) : (
                !shouldCollapse && (
                    <NoItems 
                        message={searchQuery ? 'No conversations found' : 'No conversations yet'} 
                        subtext={searchQuery ? 'Try a different search term.' : 'Start a new chat to begin.'}
                    />
                )
            )}
        </div>
    );
};