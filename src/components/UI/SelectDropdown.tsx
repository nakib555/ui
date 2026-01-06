
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion as motionTyped, AnimatePresence } from 'framer-motion';

const motion = motionTyped as any;

type SelectDropdownProps = {
    label?: string;
    icon?: React.ReactNode;
    options: { id: string; label: string; desc?: string }[];
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    className?: string;
    triggerClassName?: string;
};

export const SelectDropdown: React.FC<SelectDropdownProps> = ({ 
    label, 
    icon, 
    options, 
    value, 
    onChange, 
    disabled, 
    className = '',
    triggerClassName
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selected = options.find(o => o.id === value) || options[0];
    const containerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const selectedItemRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number }>({ left: 0, width: 0, maxHeight: 300 });

    const updatePosition = useCallback(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const spaceBelow = windowHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            // Prefer showing below, but flip to top if cramped (< 220px) and there is more space above
            const showOnTop = spaceBelow < 220 && spaceAbove > spaceBelow;
            
            const padding = 8;
            const maxHeight = showOnTop 
                ? Math.min(spaceAbove - padding * 2, 300) 
                : Math.min(spaceBelow - padding * 2, 300);

            setCoords({
                left: rect.left,
                width: rect.width,
                top: showOnTop ? undefined : rect.bottom + padding,
                bottom: showOnTop ? windowHeight - rect.top + padding : undefined,
                maxHeight: Math.max(100, maxHeight)
            });
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current && !containerRef.current.contains(e.target as Node) &&
                menuRef.current && !menuRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        
        if (isOpen) {
            updatePosition();
            
            // Auto-scroll to selected item
            if (selectedItemRef.current) {
                setTimeout(() => {
                    selectedItemRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
                }, 0);
            }

            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, updatePosition]);

    const toggleOpen = () => {
        if (disabled) return;
        setIsOpen(prev => !prev);
    };

    return (
        <div className={`relative group flex flex-col gap-3 ${className}`} ref={containerRef}>
            {label && (
                <div className="flex items-center gap-2.5 px-1">
                    {icon && <span className="flex-shrink-0">{icon}</span>}
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {label}
                    </label>
                </div>
            )}
            
            <button
                type="button"
                onClick={toggleOpen}
                disabled={disabled}
                className={`
                    w-full flex items-center justify-between transition-all text-left
                    ${triggerClassName ? triggerClassName : `
                        bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3.5
                        ${isOpen ? 'ring-2 ring-indigo-500/20 border-indigo-500/50' : 'hover:border-indigo-300 dark:hover:border-indigo-500/30'}
                    `}
                    ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
                `}
            >
                <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{selected?.label}</span>
                    {selected?.desc && <span className="text-xs text-slate-500 dark:text-slate-500 font-medium truncate">{selected.desc}</span>}
                </div>
                <div className={`p-1 rounded-full bg-slate-200/50 dark:bg-white/10 transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-500 dark:text-slate-400">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>
            </button>

            {createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            ref={menuRef}
                            initial={{ opacity: 0, y: coords.bottom ? 10 : -10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: coords.bottom ? 10 : -10, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            style={{ 
                                position: 'fixed',
                                top: coords.top,
                                bottom: coords.bottom,
                                left: coords.left,
                                width: coords.width,
                                zIndex: 99999
                            }}
                            className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/5"
                        >
                            <div 
                                className="overflow-y-auto custom-scrollbar"
                                style={{ maxHeight: coords.maxHeight }}
                            >
                                {options.map((opt) => (
                                    <button
                                        type="button"
                                        key={opt.id}
                                        ref={value === opt.id ? selectedItemRef : null}
                                        onClick={() => { onChange(opt.id); setIsOpen(false); }}
                                        className={`w-full flex flex-col items-start px-4 py-3 text-left transition-colors border-b border-gray-100 dark:border-white/5 last:border-0 ${value === opt.id ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                    >
                                        <span className={`text-sm font-bold ${value === opt.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                            {opt.label}
                                        </span>
                                        {opt.desc && <span className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 font-medium">{opt.desc}</span>}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};
