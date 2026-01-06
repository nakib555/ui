
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { type TestResult, type TestProgress } from './testSuite';
import { downloadTestReport } from '../../utils/testUtils';

type TestRunnerProps = {
  isOpen: boolean;
  onClose: () => void;
  runTests: (onProgress: (progress: TestProgress) => void) => Promise<string>;
};

const StatusIcon: React.FC<{ status: 'running' | 'pass' | 'fail' | 'pending' }> = ({ status }) => {
    switch (status) {
        case 'running':
            return <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
        case 'pass':
            return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" /></svg>;
        case 'fail':
            return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" /></svg>;
        default:
             return <div className="w-4 h-4 flex items-center justify-center"><div className="w-2 h-2 bg-gray-400 rounded-full"></div></div>;
    }
};

export const TestRunner: React.FC<TestRunnerProps> = ({ isOpen, onClose, runTests }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [finalReport, setFinalReport] = useState<string | null>(null);

  const handleRunTests = useCallback(async () => {
    setIsRunning(true);
    setProgress(null);
    setFinalReport(null);
    const report = await runTests(setProgress);
    setFinalReport(report);
    setIsRunning(false);
  }, [runTests]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 z-[80] flex items-center justify-center p-4"
          role="dialog" aria-modal="true" aria-labelledby="test-runner-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-layer-1 rounded-2xl shadow-xl w-full max-w-2xl h-[80vh] border border-gray-200 dark:border-white/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
              <h2 id="test-runner-title" className="text-lg font-bold text-gray-800 dark:text-slate-100">Diagnostic Tests</h2>
              <button onClick={onClose} aria-label="Close test runner">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {!isRunning && !finalReport && (
                <div className="text-center">
                  <p className="text-gray-600 dark:text-slate-300 mb-6">Run a suite of end-to-end tests to validate core AI functionality. This will open new chats and may take a few minutes.</p>
                  <button onClick={handleRunTests} className="px-6 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500">Start Tests</button>
                </div>
              )}
              {(isRunning || finalReport) && (
                <div>
                  <div className="mb-4">
                    <div className="flex justify-between mb-1 text-sm font-medium text-gray-700 dark:text-slate-300">
                      <span>Overall Progress</span>
                      <span>{progress ? `${progress.current} / ${progress.total}` : '...'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress ? (progress.current / progress.total) * 100 : 0}%` }}></div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">{isRunning ? `Running: ${progress?.description}` : 'All tests complete.'}</p>
                  </div>

                  <ul className="space-y-2 mt-6">
                    {progress?.results.map(result => (
                        <li key={result.description} className="p-2 border border-gray-200 dark:border-slate-700 rounded-md flex items-start gap-3">
                            <StatusIcon status={result.pass ? 'pass' : 'fail'} />
                            <div>
                                <p className="font-semibold text-sm text-gray-800 dark:text-slate-200">{result.description}</p>
                                <p className="text-xs text-gray-600 dark:text-slate-400">{result.details}</p>
                            </div>
                        </li>
                    ))}
                    {isRunning && progress && progress.current < progress.total && (
                        <li className="p-2 border border-transparent rounded-md flex items-start gap-3 opacity-60">
                            <StatusIcon status="running" />
                             <div>
                                <p className="font-semibold text-sm text-gray-800 dark:text-slate-200">{progress.description}</p>
                                <p className="text-xs text-gray-600 dark:text-slate-400">In progress...</p>
                            </div>
                        </li>
                    )}
                  </ul>

                  {finalReport && (
                    <div className="mt-8">
                        <h3 className="font-bold text-lg mb-2">Final Report</h3>
                        <pre className="bg-gray-100 dark:bg-black/30 p-4 rounded-lg text-xs font-mono max-h-60 overflow-auto">{finalReport}</pre>
                        <button onClick={() => downloadTestReport(finalReport)} className="mt-4 px-4 py-2 font-semibold text-sm text-white bg-green-600 rounded-lg hover:bg-green-500">Download Report</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
