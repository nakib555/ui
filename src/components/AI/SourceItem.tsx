/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Favicon } from '../UI/Favicon';
import type { Source } from '../../types';

type SourceItemProps = {
  source: Source;
};

export const SourceItem: React.FC<SourceItemProps> = ({ source }) => {
  let domain: string | null = null;
  try {
    domain = new URL(source.uri).hostname.replace('www.', '');
  } catch (error) {
    // Keep domain null if URI is invalid
  }

  return (
    <motion.a
      href={source.uri}
      target="_blank"
      rel="noopener noreferrer"
      className="source-item block p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start gap-4">
        <Favicon domain={domain || source.uri} className="w-5 h-5 rounded-sm flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate" title={source.title}>
            {source.title}
          </p>
          {domain && (
            <p className="text-xs text-gray-500 dark:text-slate-400 truncate" title={domain}>
              {domain}
            </p>
          )}
        </div>
      </div>
    </motion.a>
  );
};