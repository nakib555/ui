
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';

type ModeToggleProps = {
  isAgentMode: boolean;
  onToggle: (isAgent: boolean) => void;
  disabled: boolean;
};

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </svg>
);

const AgentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
);

export const ModeToggle: React.FC<ModeToggleProps> = ({ isAgentMode, onToggle, disabled }) => {
  const modes = [
    { label: 'Chat', isAgent: false, icon: <ChatIcon /> },
    { label: 'Agent', isAgent: true, icon: <AgentIcon /> },
  ];

  return (
    <div
      className={`
        relative grid grid-cols-2 p-1 rounded-xl bg-transparent
        transition-opacity ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{ width: 'fit-content' }}
    >
      {modes.map((mode) => {
        const isActive = isAgentMode === mode.isAgent;
        return (
          <button
            key={mode.label}
            onClick={() => !disabled && onToggle(mode.isAgent)}
            disabled={disabled}
            type="button"
            className={`
              relative z-10 flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold transition-colors duration-200 rounded-lg select-none
              ${isActive 
                ? 'text-primary-main' 
                : 'text-content-tertiary hover:text-content-secondary'
              }
            `}
          >
            {isActive && (
              <motion.div
                layoutId="mode-pill"
                className="absolute inset-0 bg-layer-1 shadow-sm rounded-lg border border-border-subtle"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {mode.icon}
              {mode.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
