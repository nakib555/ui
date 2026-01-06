
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion as motionTyped } from 'framer-motion';

const motion = motionTyped as any;

type TabButtonProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
};

export const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`relative px-3 py-2 text-sm font-semibold transition-colors focus:outline-none ${
      isActive
        ? 'text-indigo-600 dark:text-indigo-400'
        : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
    }`}
    aria-selected={isActive}
  >
    {label}
    {isActive && (
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"
        layoutId="tab-underline"
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    )}
  </button>
);
