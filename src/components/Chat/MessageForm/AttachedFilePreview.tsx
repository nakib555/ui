
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion as motionTyped, AnimatePresence } from 'framer-motion';
import { FileIcon } from '../../UI/FileIcon';

const motion = motionTyped as any;

type AttachedFilePreviewProps = {
  file: File;
  onRemove: () => void;
  onPreview: () => void;
  progress: number; // 0-100
  error: string | null;
};

// Helper to determine visual style based on file type
const getFileVisuals = (file: File) => {
    const mime = file.type;
    const name = file.name.toLowerCase();
    // Get extension without the dot, default to ? if none
    const ext = name.split('.').pop()?.toUpperCase().substring(0, 4) || 'FILE';

    if (mime.startsWith('image/')) return { bg: 'bg-gradient-to-br from-blue-400 to-blue-600', text: 'text-white', label: 'IMG' };
    if (mime.startsWith('video/')) return { bg: 'bg-gradient-to-br from-fuchsia-500 to-purple-600', text: 'text-white', label: 'VID' };
    if (mime.startsWith('audio/')) return { bg: 'bg-gradient-to-br from-amber-400 to-orange-500', text: 'text-white', label: 'AUD' };
    if (mime === 'application/pdf') return { bg: 'bg-gradient-to-br from-red-400 to-red-600', text: 'text-white', label: 'PDF' };
    
    if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z') || name.endsWith('.tar') || name.endsWith('.gz')) {
        return { bg: 'bg-gradient-to-br from-yellow-500 to-yellow-600', text: 'text-white', label: 'ZIP' };
    }

    const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'sh', 'rb', 'swift', 'sql', 'xml', 'md', 'yml', 'yaml'];
    if (codeExtensions.some(e => name.endsWith('.' + e))) {
        return { bg: 'bg-gradient-to-br from-slate-700 to-slate-900', text: 'text-blue-200', label: ext };
    }
    
    return { bg: 'bg-gradient-to-br from-gray-400 to-gray-500', text: 'text-gray-100', label: ext };
};

export const AttachedFilePreview: React.FC<AttachedFilePreviewProps> = ({ file, onRemove, onPreview, progress, error }) => {
    const isProcessing = progress < 100 && !error;
    const hasFailed = !!error;
    const visuals = getFileVisuals(file);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        // Only generate preview URLs for images to save memory
        if (!file.type.startsWith('image/')) {
            setPreviewUrl(null);
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [file]);

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove();
    };

    const handleClick = () => {
        if (!hasFailed && !isProcessing) {
            onPreview();
        }
    };

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.8, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.15 } }}
            onClick={handleClick}
            className={`
                relative group flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center md:shadow-sm transition-all duration-200 select-none
                ${hasFailed 
                    ? 'bg-red-50 dark:bg-red-900/10 cursor-default' 
                    : isProcessing 
                        ? 'bg-transparent md:bg-white md:dark:bg-white/5 cursor-wait' 
                        : 'bg-transparent md:bg-white md:dark:bg-white/5 cursor-pointer hover:shadow-md hover:bg-slate-50 dark:hover:bg-white/10'
                }
            `}
            title={file.name}
        >
            {/* Content Area */}
            <div className="relative w-full h-full p-0 md:p-1 overflow-hidden rounded-xl">
                {previewUrl ? (
                    <div className="w-full h-full rounded-lg overflow-hidden bg-gray-100 dark:bg-black/30 relative">
                        <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 md:ring-1 md:ring-inset md:ring-black/5 md:dark:ring-white/10 rounded-lg"></div>
                    </div>
                ) : (
                    <div className={`w-full h-full rounded-lg flex flex-col items-center justify-center ${visuals.bg} md:shadow-inner`}>
                        <FileIcon filename={file.name} className={`w-6 h-6 ${visuals.text} opacity-90 drop-shadow-sm transform group-hover:scale-110 transition-transform duration-300`} />
                        <span className="text-[8px] font-bold text-white/90 mt-0.5 uppercase tracking-wide drop-shadow-sm">{visuals.label}</span>
                    </div>
                )}

                {/* Processing Spinner */}
                <AnimatePresence>
                    {isProcessing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 rounded-lg backdrop-blur-[1px] flex items-center justify-center z-10"
                        >
                            <svg className="w-6 h-6 -rotate-90 transform text-white" viewBox="0 0 36 36">
                                <path
                                    className="text-white/30"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <motion.path
                                    className="text-white drop-shadow-md"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    strokeDasharray="100, 100"
                                    initial={{ strokeDashoffset: 100 }}
                                    animate={{ strokeDashoffset: 100 - progress }}
                                />
                            </svg>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Preview Overlay (Eye Icon) */}
                {!hasFailed && !isProcessing && (
                    <div className="absolute inset-0 bg-black/20 opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10 hidden lg:flex backdrop-blur-[1px] rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white drop-shadow-md transform scale-90 group-hover:scale-100 transition-transform">
                            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                            <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}

                {/* Error Overlay */}
                {hasFailed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/60 rounded-lg z-10 backdrop-blur-[1px]">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-red-500 drop-shadow-sm">
                            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Remove Button */}
            <button
                type="button"
                onClick={handleRemove}
                aria-label={`Remove ${file.name}`}
                className="absolute -top-2 -right-2 bg-white dark:bg-[#303030] text-gray-400 hover:text-white hover:bg-red-500 dark:hover:text-white dark:hover:bg-red-500 rounded-full p-0.5 shadow-md z-20 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all transform scale-90 hover:scale-110"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
            </button>
        </motion.div>
    );
};
