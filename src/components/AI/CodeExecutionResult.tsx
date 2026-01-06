/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion as motionTyped, AnimatePresence } from 'framer-motion';
import { TabButton } from '../UI/TabButton';

const motion = motionTyped as any;

type CodeExecutionResultProps = {
  outputId: string;
  htmlOutput: string;
  textOutput: string;
};

export const CodeExecutionResult: React.FC<CodeExecutionResultProps> = ({ outputId, htmlOutput, textOutput }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'text'>('visual');

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d0d]">
      {/* Tab Navigation */}
      <div className="flex items-center border-b border-gray-200 dark:border-white/5 px-2 bg-gray-50/50 dark:bg-black/20">
        <TabButton label="Visual Output" isActive={activeTab === 'visual'} onClick={() => setActiveTab('visual')} />
        <TabButton label="Text Logs" isActive={activeTab === 'text'} onClick={() => setActiveTab('text')} />
      </div>

      {/* Tab Content */}
      <div className="relative">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="p-0"
          >
            {activeTab === 'visual' ? (
              <div id={outputId} className="w-full bg-white dark:bg-[#121212]">
                <iframe
                  srcDoc={htmlOutput}
                  className="w-full h-96 border-none"
                  sandbox="allow-scripts allow-forms allow-modals allow-popups"
                  title="Code Execution Visual Output"
                />
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <pre className="p-4 bg-transparent text-xs font-mono text-gray-700 dark:text-slate-300 whitespace-pre-wrap break-all">
                    <code>{textOutput || 'No text output was generated.'}</code>
                </pre>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};