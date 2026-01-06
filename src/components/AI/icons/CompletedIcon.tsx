
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion as motionTyped } from 'framer-motion';

const motion = motionTyped as any;

export const CompletedIcon = () => (
  <motion.div
    key="complete"
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    className="text-green-500 dark:text-green-400"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  </motion.div>
);
