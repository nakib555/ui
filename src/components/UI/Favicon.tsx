/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

type FaviconProps = {
  domain: string;
  className?: string;
  style?: React.CSSProperties;
};

export const Favicon: React.FC<FaviconProps> = ({ domain, className = '', style }) => {
    const [hasError, setHasError] = useState(false);
    const src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

    if (hasError) {
        return (
            <div className={`flex items-center justify-center bg-gray-200 dark:bg-slate-700 ${className}`} style={style}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3/5 h-3/5 text-gray-500 dark:text-slate-400">
                   <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM4.33 4.33a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1-1.06 1.06L4.33 5.39a.75.75 0 0 1 0-1.06Zm10.28 10.28a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06ZM15.67 4.33a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0Zm-11.34 9.28a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0Z" />
                   <path d="M17.25 10a.75.75 0 0 1-.75.75H15a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75ZM5 10a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1 0-1.5H4.25A.75.75 0 0 1 5 10Z" />
                </svg>
            </div>
        );
    }
    
    return (
        <img
            src={src}
            alt={`Favicon for ${domain}`}
            className={className}
            style={style}
            onError={() => setHasError(true)}
        />
    );
};