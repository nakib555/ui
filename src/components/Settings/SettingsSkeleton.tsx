
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Skeleton } from '../UI/Skeleton';

export const SettingsSkeleton = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full">
      {/* Header Ghost */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-3 rounded-lg" /> 
        <Skeleton className="h-4 w-2/3 max-w-sm rounded-md opacity-60" /> 
      </div>

      {/* Setting Items Ghost */}
      <div className="space-y-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="py-6 border-b border-gray-100 dark:border-white/5 last:border-0">
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
              {/* Label & Description Column */}
              <div className="flex-1 min-w-[200px] space-y-2.5">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-3.5 w-full max-w-[280px] opacity-50 rounded-md" />
              </div>
              
              {/* Control Column (Simulating Inputs/Selects/Toggles) */}
              <div className="flex-shrink-0 w-full sm:w-auto">
                <Skeleton 
                    className={`h-10 rounded-xl ${
                        i % 2 === 0 ? 'w-full sm:w-64' : 'w-12 rounded-full'
                    }`} 
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
