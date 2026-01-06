/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

type FlowTokenProps = {
  children: string;
  tps?: number; // tokens per second
  onComplete?: () => void;
};

export const FlowToken: React.FC<FlowTokenProps> = ({
  children,
  tps = 20, // Increased default speed for smoother feel
  onComplete,
}) => {
  // Split by words and punctuation, but keep spaces attached to the preceding word
  const parts = useMemo(() => children.match(/(\S+\s*)/g) || [], [children]);

  // Calculate dynamic duration based on content length
  // Shorter content = slightly slower per token for visibility
  // Longer content = faster per token to avoid dragging
  const dynamicTps = useMemo(() => {
      if (parts.length > 50) return tps * 1.5;
      if (parts.length < 10) return tps * 0.8;
      return tps;
  }, [parts.length, tps]);

  const staggerDuration = 1 / dynamicTps;

  return (
    <motion.span 
        className="flow-token-container inline"
        initial="hidden"
        animate="visible"
        variants={{
            visible: {
                transition: {
                    staggerChildren: staggerDuration,
                }
            }
        }}
        onAnimationComplete={onComplete}
    >
      {parts.map((part, i) => (
        <motion.span
            key={i}
            variants={{
                hidden: { opacity: 0, y: 5 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } }
            }}
            className="inline-block whitespace-pre-wrap"
        >
            {part}
        </motion.span>
      ))}
    </motion.span>
  );
};