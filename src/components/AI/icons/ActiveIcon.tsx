
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion as motionTyped } from 'framer-motion';

const motion = motionTyped as any;

export const ActiveIcon = () => (
  <div className="relative w-5 h-5 flex items-center justify-center">
    <motion.span
      className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"
      animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
  </div>
);
