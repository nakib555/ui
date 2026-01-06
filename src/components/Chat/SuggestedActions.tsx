
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion as motionTyped, AnimatePresence } from 'framer-motion';

const motion = motionTyped as any;

type SuggestedActionsProps = {
  actions: string[];
  onActionClick: (action: string) => void;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export const SuggestedActions: React.FC<SuggestedActionsProps> = ({ actions, onActionClick }) => {
  if (!actions || !Array.isArray(actions) || actions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="flex flex-wrap items-center gap-2 mt-4"
      >
        {actions.map((action, index) => (
          <motion.button
            key={index}
            variants={itemVariants}
            onClick={() => onActionClick(action)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 border-0 md:border md:border-slate-200 md:dark:border-slate-700 transition-colors"
          >
            {action}
          </motion.button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};
