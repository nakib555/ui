/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

type BranchSwitcherProps = {
  count: number;
  activeIndex: number;
  onChange: (index: number) => void;
  className?: string;
};

export const BranchSwitcher: React.FC<BranchSwitcherProps> = ({ count, activeIndex, onChange, className = '' }) => {
  if (count <= 1) {
    return null;
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeIndex > 0) {
      onChange(activeIndex - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeIndex < count - 1) {
      onChange(activeIndex + 1);
    }
  };

  return (
    <div 
        className={`flex items-center select-none gap-1 font-mono text-xs font-medium bg-slate-100 dark:bg-white/5 rounded-md px-1 py-0.5 ${className}`}
        onClick={(e) => e.stopPropagation()}
    >
        <button
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded hover:bg-slate-200 dark:hover:bg-white/10"
            aria-label="Previous version"
            title="Previous version"
        >
            &lt;
        </button>
        
        <span className="tabular-nums tracking-wide min-w-[24px] text-center text-slate-600 dark:text-slate-300">
            {activeIndex + 1}/{count}
        </span>

        <button
            onClick={handleNext}
            disabled={activeIndex === count - 1}
            className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded hover:bg-slate-200 dark:hover:bg-white/10"
            aria-label="Next version"
            title="Next version"
        >
            &gt;
        </button>
    </div>
  );
};