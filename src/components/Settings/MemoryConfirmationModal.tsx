
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { AnimatePresence, motion as motionTyped } from 'framer-motion';

const motion = motionTyped as any;

type MemoryConfirmationModalProps = {
  isOpen: boolean;
  suggestions: string[];
  onConfirm: () => void;
  onCancel: () => void;
};

export const MemoryConfirmationModal: React.FC<MemoryConfirmationModalProps> = ({ isOpen, suggestions, onConfirm, onCancel }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-black/70 z-[80] flex items-start justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="memory-confirm-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white dark:bg-[#202123] rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-white/10 flex flex-col max-h-[90vh]"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4 p-4 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-indigo-600 dark:text-indigo-400">
                  <path d="M7.75 2.75a.75.75 0 0 0-1.5 0v1.258a5.523 5.523 0 0 0-1.503 1.334c-.792.792-1.247 1.87-1.247 2.985v.253a.75.75 0 0 0 1.5 0v-.253c0-.8.316-1.55.879-2.113a4.023 4.023 0 0 1 2.113-.879H7.75V2.75Z" />
                  <path d="M12.25 2.75a.75.75 0 0 1 1.5 0v1.258a5.523 5.523 0 0 1 1.503 1.334c.792.792 1.247 1.87 1.247 2.985v.253a.75.75 0 0 1-1.5 0v-.253c0-.8-.316-1.55-.879-2.113a4.023 4.023 0 0 0-2.113-.879H12.25V2.75Z" />
                  <path fillRule="evenodd" d="M17 10c0-2.036-1.289-3.796-3.085-4.482A5.526 5.526 0 0 0 10 3.5a5.526 5.526 0 0 0-3.915 1.018C4.289 6.204 3 7.964 3 10c0 2.036 1.289 3.796 3.085 4.482A5.526 5.526 0 0 0 10 16.5a5.526 5.526 0 0 0 3.915-1.018C15.711 13.796 17 12.036 17 10ZM10 5a4.026 4.026 0 0 1 2.848.742A4.49 4.49 0 0 1 15.5 10a4.49 4.49 0 0 1-2.652 4.258A4.026 4.026 0 0 1 10 15a4.026 4.026 0 0 1-2.848-.742A4.49 4.49 0 0 1 4.5 10a4.49 4.49 0 0 1 2.652-4.258A4.026 4.026 0 0 1 10 5Z" clipRule="evenodd" />
                  <path d="M7.75 12.25a.75.75 0 0 0-1.5 0v.253c0 1.114.455 2.193 1.247 2.985a5.523 5.523 0 0 0 1.503 1.334V18a.75.75 0 0 0 1.5 0v-1.178a4.023 4.023 0 0 1-2.113-.879.75.75 0 0 1-.879-2.113V12.25Z" />
                  <path d="M12.25 12.25a.75.75 0 0 1 1.5 0v.253c0 1.114-.455 2.193-1.247 2.985a5.523 5.523 0 0 1-1.503 1.334V18a.75.75 0 0 1-1.5 0v-1.178a4.023 4.023 0 0 0 2.113-.879c.563-.564.879-1.314.879-2.113V12.25Z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 id="memory-confirm-title" className="text-lg font-bold text-gray-800 dark:text-slate-100">
                  Save to Memory?
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                    I've identified some key details from our conversation. Would you like me to remember them for next time?
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto">
                <ul className="space-y-3">
                    {suggestions.map((suggestion, index) => (
                        <motion.li 
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg text-sm"
                        >
                            <span className="text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-0.5">🔹</span>
                            <span className="text-gray-700 dark:text-slate-300">{suggestion}</span>
                        </motion.li>
                    ))}
                </ul>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-white/10 flex-shrink-0">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                Don't Save
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                Save to Memory
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
