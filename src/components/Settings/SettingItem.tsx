
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

type SettingItemProps = {
    label: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
    layout?: 'row' | 'col';
    wrapControls?: boolean;
    danger?: boolean;
};

export const SettingItem: React.FC<SettingItemProps> = ({ 
    label, 
    description, 
    children, 
    className = '', 
    layout = 'row',
    wrapControls = true,
    danger = false
}) => {
    return (
        <div className={`py-6 first:pt-0 last:pb-0 border-b border-gray-100 dark:border-white/5 last:border-0 ${className}`}>
            <div className={`flex ${layout === 'col' ? 'flex-col gap-4' : (wrapControls ? 'flex-wrap' : 'flex-nowrap') + ' items-center justify-between gap-x-8 gap-y-4'}`}>
                <div className="flex-1 min-w-[200px] max-w-full">
                    <label className={`text-sm font-semibold block mb-1 ${danger ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                        {label}
                    </label>
                    {description && (
                        <p className={`text-xs leading-relaxed ${danger ? 'text-red-600/70 dark:text-red-400/70' : 'text-slate-500 dark:text-slate-400'}`}>
                            {description}
                        </p>
                    )}
                </div>
                <div className={`flex-shrink-0 ${layout === 'col' ? 'w-full' : (wrapControls ? 'w-full sm:w-auto pt-1 sm:pt-0' : '')}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};
