
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

type SkeletonProps = {
  className?: string;
};

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div 
      className={`
        relative overflow-hidden rounded-md 
        bg-slate-200/50 dark:bg-white/5 
        ${className}
      `} 
      aria-hidden="true"
    >
      <div 
        className="absolute inset-0 -translate-x-full animate-shimmer-wave bg-gradient-to-r from-transparent via-white/90 dark:via-indigo-400/20 to-transparent skew-x-12"
      />
    </div>
  );
};
