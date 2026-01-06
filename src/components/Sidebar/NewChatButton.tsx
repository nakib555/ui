
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion as motionTyped } from 'framer-motion';
import { Tooltip } from '../UI/Tooltip';
const motion = motionTyped as any;

type NewChatButtonProps = {
  isCollapsed: boolean;
  isDesktop: boolean;
  onClick: () => void;
  disabled?: boolean;
};

export const NewChatButton = ({ isCollapsed, isDesktop, onClick, disabled }: NewChatButtonProps) => {
  const shouldCollapse = isDesktop && isCollapsed;

  const button = (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`
            group relative w-full flex items-center transition-colors duration-200
            ${disabled 
                ? 'opacity-50 cursor-not-allowed bg-transparent' 
                : 'hover:bg-gray-200/50 dark:hover:bg-white/5 cursor-pointer'
            }
            rounded-lg
            text-slate-700 dark:text-slate-200
            ${shouldCollapse 
                ? 'justify-center p-2' 
                : 'px-3 py-2'
            }
        `}
        aria-label="New chat"
        aria-disabled={disabled}
    >
        <div className={`relative flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-slate-400 transition-colors ${!disabled && 'group-hover:text-slate-800 dark:group-hover:text-slate-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
        </div>
        
        <motion.span
            className="font-medium text-sm whitespace-nowrap overflow-hidden"
            initial={false}
            animate={{ 
                width: shouldCollapse ? 0 : 'auto', 
                opacity: shouldCollapse ? 0 : 1,
                marginLeft: shouldCollapse ? 0 : 12,
            }}
            transition={{ duration: 0.2 }}
            style={{ willChange: "width, margin-left, opacity" }}
        >
            New chat
        </motion.span>
    </button>
  );

  return (
    <div className="mb-2 px-2">
        {shouldCollapse && !disabled ? (
            <Tooltip content="New Chat" position="right" sideOffset={12}>
                {button}
            </Tooltip>
        ) : button}
    </div>
  );
};
