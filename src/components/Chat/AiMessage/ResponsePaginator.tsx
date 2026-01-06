
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

type ResponsePaginatorProps = {
  count: number;
  activeIndex: number;
  onChange: (index: number) => void;
};

export const ResponsePaginator: React.FC<ResponsePaginatorProps> = ({ count, activeIndex, onChange }) => {
  if (count <= 1) {
    return null; // Don't show paginator for a single response
  }

  const handlePrev = () => {
    if (activeIndex > 0) {
      onChange(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex < count - 1) {
      onChange(activeIndex + 1);
    }
  };

  return (
    <div className="flex items-center select-none gap-2 font-mono text-xs font-medium text-slate-500 dark:text-slate-400 mr-2">
        <button
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className="p-1 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous version"
            title="Previous version"
        >
            &lt;
        </button>
        
        <span className="tabular-nums tracking-wide">
            {activeIndex + 1}/{count}
        </span>

        <button
            onClick={handleNext}
            disabled={activeIndex === count - 1}
            className="p-1 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next version"
            title="Next version"
        >
            &gt;
        </button>
    </div>
  );
};
