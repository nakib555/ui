
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion as motionTyped } from 'framer-motion';

const motion = motionTyped as any;

type ProactiveAssistanceProps = {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
};

export const ProactiveAssistance: React.FC<ProactiveAssistanceProps> = ({ suggestions, onSuggestionClick }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0, y: -10 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="px-2 pb-2"
    >
      <div className="bg-black/5 dark:bg-white/5 p-2 rounded-lg">
        <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-2 px-1">Proactive Assistance</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <motion.button
              key={suggestion}
              type="button"
              onClick={() => onSuggestionClick(suggestion)}
              className="px-2.5 py-1 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 rounded-full border border-gray-200/50 dark:border-white/10"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {suggestion}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
