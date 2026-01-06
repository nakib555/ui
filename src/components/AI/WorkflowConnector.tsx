
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion as motionTyped } from 'framer-motion';
const motion = motionTyped as any;

type WorkflowConnectorProps = {
  isActive: boolean;
};

export const WorkflowConnector = ({ isActive }: WorkflowConnectorProps) => {
  return (
    <div className="w-full h-full bg-gray-200 dark:bg-white/10 overflow-hidden relative">
        {isActive && (
          <motion.div
            className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-indigo-500 to-transparent opacity-50"
            initial={{ translateY: '-100%' }}
            animate={{ translateY: '200%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        )}
    </div>
  );
};
