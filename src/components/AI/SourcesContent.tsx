/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SourceItem } from './SourceItem';
import type { Source } from '../../types';

type SourcesContentProps = {
    sources: Source[];
};

export const SourcesContent: React.FC<SourcesContentProps> = React.memo(({ sources }) => {
    return (
        <div className="flex-1 overflow-y-auto p-2 w-full h-full">
            {sources && sources.length > 0 ? (
                <div className="space-y-1">
                    {sources.map((source, index) => <SourceItem key={source.uri + index} source={source} />)}
                </div>
            ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-slate-400 p-4 text-center">No sources were provided for this response.</div>
            )}
        </div>
    );
});
