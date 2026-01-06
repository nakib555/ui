
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip } from '../../UI/Tooltip';

export const TtsButton = ({
  isPlaying,
  isLoading,
  onClick,
  disabled = false,
  error = false,
  errorMessage,
}: {
  isPlaying: boolean;
  isLoading: boolean;
  onClick: () => void;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
}) => {
  const getButtonContent = () => {
    if (error) {
      return (
        <motion.svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            className="w-5 h-5 text-red-500"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
        </motion.svg>
      );
    }
    if (isLoading) {
      return (
        <svg
          className="animate-spin h-5 w-5 text-indigo-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      );
    }
    if (isPlaying) {
      // Stop/Square Icon
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-600 dark:text-indigo-400">
            <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      );
    }
    // Speaker Wave Icon
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
        <path d="M16.463 8.288a.75.75 0 0 1 1.06 0 5.25 5.25 0 0 1 0 7.424.75.75 0 0 1-1.06-1.06 3.75 3.75 0 0 0 0-5.304.75.75 0 0 1 0-1.06Z" />
      </svg>
    );
  };

  const getTitle = () => {
    if (error) return errorMessage || 'Failed to load audio. Click to retry.';
    if (isLoading) return 'Generating audio...';
    if (isPlaying) return 'Stop audio';
    if (disabled) return 'No text available to read';
    return 'Read aloud';
  };

  const button = (
    <button
      onClick={onClick}
      className={`
        group flex items-center justify-center w-8 h-8
        rounded-lg transition-all duration-200
        ${error 
            ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' 
            : isPlaying 
                ? 'bg-indigo-100 dark:bg-indigo-500/20' 
                : 'hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-slate-200 text-slate-500 dark:text-slate-400'
        }
        disabled:opacity-40 disabled:cursor-not-allowed
      `}
      disabled={disabled || isLoading}
      aria-label={getTitle()}
    >
      {getButtonContent()}
    </button>
  );

  return (
    <Tooltip content={getTitle()} position="top" delay={600}>
        {button}
    </Tooltip>
  );
};
