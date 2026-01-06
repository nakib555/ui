/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ManualCodeRenderer } from '../Markdown/ManualCodeRenderer';
import { WorkflowMarkdownComponents } from '../Markdown/markdownComponents';

export const VeoApiKeyRequest: React.FC<{
    text: string;
    onRegenerate: () => void;
}> = ({ text, onRegenerate }) => {
  const [isPending, setIsPending] = useState(false);

  const handleSelectKey = async () => {
    if (!(window as any).aistudio || typeof (window as any).aistudio.openSelectKey !== 'function') {
        alert('API Key selection feature is not available in this environment.');
        return;
    }
    
    setIsPending(true);
    
    try {
        await (window as any).aistudio.openSelectKey();
        // Per guidelines, we assume the key selection was successful.
        // A short delay helps ensure the environment is ready before retrying.
        setTimeout(() => {
            onRegenerate();
        }, 250);
    } catch (error) {
        console.error("Error opening API key selection:", error);
        alert("An error occurred while trying to open the API key selector. Please try again.");
        setIsPending(false);
    }
  };

  return (
    <div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg text-sm">
      <div className="text-indigo-200 mb-3 workflow-markdown">
        <ManualCodeRenderer text={text} components={WorkflowMarkdownComponents} isStreaming={false} />
      </div>
      <button 
          onClick={handleSelectKey} 
          disabled={isPending}
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md transition-colors text-xs disabled:opacity-70 disabled:cursor-wait"
      >
          {isPending ? 'Waiting for selection...' : 'Select API Key'}
      </button>
    </div>
  );
};