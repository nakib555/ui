/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Skeleton } from './Skeleton';

export const ChatSkeleton = () => {
  return (
    <div className="flex-1 flex flex-col justify-end p-4 sm:p-8 pb-4 space-y-8 overflow-hidden h-full max-w-4xl mx-auto w-full animate-in fade-in duration-500">
        {[1, 2].map((i) => (
            <React.Fragment key={i}>
                {/* User Message Ghost */}
                <div className="flex justify-end w-full">
                    <div className="flex flex-col items-end gap-2 max-w-[80%] w-full sm:w-auto">
                        <Skeleton className="h-20 w-64 max-w-full rounded-2xl rounded-tr-sm bg-layer-2/80 dark:bg-white/5" />
                    </div>
                </div>

                {/* AI Message Ghost */}
                <div className="flex flex-col gap-4 max-w-3xl w-full">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-lg bg-layer-3/80 dark:bg-white/10" />
                        <Skeleton className="h-4 w-32 rounded bg-layer-3/50 dark:bg-white/10" />
                    </div>
                    <div className="space-y-3 pl-11 w-full">
                        <Skeleton className="h-4 w-full rounded bg-layer-2/80 dark:bg-white/5" />
                        <Skeleton className="h-4 w-[92%] rounded bg-layer-2/80 dark:bg-white/5" />
                        <Skeleton className="h-4 w-[96%] rounded bg-layer-2/80 dark:bg-white/5" />
                        <div className="pt-2">
                            <Skeleton className="h-32 w-full rounded-xl bg-layer-2/60 dark:bg-white/5" />
                        </div>
                    </div>
                </div>
            </React.Fragment>
        ))}
    </div>
  );
};