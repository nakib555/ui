
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
      {/* 
        Animation Fix: Separating the animation (translateX) from the shape (skew)
        into parent/child divs prevents the keyframe transform from overriding the skew transform.
        will-change-transform forces GPU promotion on mobile.
      */}
      <div 
        className="absolute inset-0 -translate-x-full animate-shimmer-wave z-10"
        style={{ willChange: 'transform' }}
      >
        <div className="h-full w-full bg-gradient-to-r from-transparent via-white/60 dark:via-indigo-400/20 to-transparent skew-x-12" />
      </div>
    </div>
  );
};
