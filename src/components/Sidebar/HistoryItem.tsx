
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion as motionTyped, AnimatePresence } from 'framer-motion';
import { Tooltip } from '../UI/Tooltip';
const motion = motionTyped as any;

const Highlight = ({ text, highlight }: { text: string, highlight: string }) => {
    if (!highlight.trim()) {
        return <span>{text}</span>;
    }
    // Escape special regex characters from the user's search query to prevent errors.
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedHighlight})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) =>
                // Check if the part is the exact match for the highlight (case-insensitive)
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <span key={i} className="bg-amber-200 dark:bg-amber-400 text-amber-900 dark:text-black rounded-sm px-0.5">{part}</span>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </span>
    );
};

type HistoryItemProps = {
    text: string;
    isCollapsed: boolean;
    isDesktop: boolean;
    searchQuery: string;
    active: boolean;
    isLoading: boolean;
    onClick: () => void;
    onDelete: () => void;
    onUpdateTitle: (newTitle: string) => void;
};

export const HistoryItem: React.FC<HistoryItemProps> = ({ text, isCollapsed, isDesktop, searchQuery, active, isLoading, onClick, onDelete, onUpdateTitle }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(text);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const shouldCollapse = isDesktop && isCollapsed;

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    // When the original text prop changes (e.g., from an auto-title generation),
    // update the local state if not currently editing.
    useEffect(() => {
        if (!isEditing) {
            setEditedTitle(text);
        }
    }, [text, isEditing]);

    const handleSave = () => {
        const newTitle = editedTitle.trim();
        if (newTitle && newTitle !== text) {
            onUpdateTitle(newTitle);
        } else {
            setEditedTitle(text); // Revert if empty or unchanged
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedTitle(text);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        setIsEditing(true);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        onDelete();
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Do not allow editing if the sidebar is collapsed, as the input field would be hidden.
        if (!shouldCollapse) {
            setIsEditing(true);
        }
    };

    return (
        <div className="relative group/item">
            <button 
                onClick={isEditing ? undefined : onClick} 
                onDoubleClick={handleDoubleClick}
                disabled={isEditing}
                className={`w-full text-sm p-2 rounded-lg text-left flex items-center gap-3 transition-colors ${active ? 'bg-indigo-100 text-indigo-800 font-semibold dark:bg-indigo-500/20 dark:text-indigo-300' : 'text-slate-600 hover:bg-gray-100/60 dark:text-slate-300 dark:hover:bg-violet-900/30 dark:hover:text-slate-100'} ${shouldCollapse ? 'justify-center' : ''} ${!shouldCollapse ? 'pr-8' : ''}`}
            >
                {isLoading && (
                    <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                         <div className="w-2.5 h-2.5 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                )}
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleSave}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 w-full bg-gray-200/50 dark:bg-black/30 focus:outline-none text-sm font-semibold ring-1 ring-indigo-500 rounded-sm px-1 -mx-1"
                    />
                ) : (
                    <motion.span 
                        className="flex-1 min-w-0 overflow-hidden"
                        initial={false}
                        animate={{ width: shouldCollapse ? 0 : 'auto', opacity: shouldCollapse ? 0 : 1, x: shouldCollapse ? -5 : 0 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    >
                         <Highlight text={text} highlight={searchQuery} />
                    </motion.span>
                )}
            </button>
            {!shouldCollapse && !isEditing && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center rounded-lg opacity-100 transition-opacity">
                    <Tooltip content="More options" position="top" delay={600}>
                        <button
                            ref={buttonRef}
                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(prev => !prev); }}
                            className={`p-1 rounded-md text-slate-400 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-100 hover:bg-slate-300/60 dark:hover:bg-slate-600/60 transition-colors ${isMenuOpen ? 'bg-slate-300/60 dark:bg-slate-600/60 text-slate-800 dark:text-slate-100' : ''}`}
                            aria-haspopup="true"
                            aria-expanded={isMenuOpen}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M8 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM8 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM8 15a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" /></svg>
                        </button>
                    </Tooltip>
                </div>
            )}
             <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-2 top-8 z-50 w-36 bg-white dark:bg-[#2D2D2D] rounded-lg shadow-xl border border-gray-200 dark:border-white/10 p-1"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                        <ul className="text-sm">
                            <li>
                                <button onClick={handleEditClick} className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M11.355 2.212a.75.75 0 0 1 1.06 0l1.373 1.373a.75.75 0 0 1 0 1.06L5.435 13H3.25A.75.75 0 0 1 2.5 12.25V10l8.293-8.293a.75.75 0 0 1 .562-.294Z" /></svg>
                                    <span>Rename</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={handleDelete} className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" /></svg>
                                    <span>Delete</span>
                                </button>
                            </li>
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
