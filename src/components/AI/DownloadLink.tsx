
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion as motionTyped } from 'framer-motion';

const motion = motionTyped as any;

type DownloadLinkProps = {
  filename: string;
  srcUrl: string;
};

export const DownloadLink: React.FC<DownloadLinkProps> = ({ filename, srcUrl }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="my-6"
    >
      <a
        href={srcUrl}
        download={filename}
        className="group inline-flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700"
        title={`Download ${filename}`}
      >
        <div className="flex-shrink-0 text-gray-500 dark:text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 transition-transform group-hover:scale-110">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
        </div>
        <div className="flex-1 min-w-0">
            <span className="block font-medium">Download File</span>
            <span className="block text-xs text-gray-500 dark:text-slate-400 truncate">{filename}</span>
        </div>
      </a>
    </motion.div>
  );
};
