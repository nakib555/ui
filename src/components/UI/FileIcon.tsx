/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

// SVG components for different file types (based on Heroicons - Solid)
const FileIconDefault = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M4 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.586a2 2 0 0 0-.586-1.414l-4.586-4.586A2 2 0 0 0 11.414 2H4Zm6 6a1 1 0 0 1-1-1V3.586L14.414 8H11a1 1 0 0 1-1-1Z" clipRule="evenodd" />
    </svg>
);

const FileIconImage = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 0v7.5a.75.75 0 0 0 .75.75h13.5a.75.75 0 0 0 .75-.75v-7.5a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.75Z" clipRule="evenodd" />
      <path d="M8.5 8.75a.75.75 0 0 0-1.5 0v.5a.75.75 0 0 0 1.5 0v-.5Z" />
      <path fillRule="evenodd" d="M11.956 8.332a.75.75 0 0 1 .632 1.258l-2.009 3.013a.75.75 0 0 1-1.161 0l-1.253-1.88a.75.75 0 1 1 1.258-.838l.673 1.01 1.51-2.265a.75.75 0 0 1 1.258-.632Z" clipRule="evenodd" />
    </svg>
);

const FileIconCode = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M6.28 5.22a.75.75 0 0 1 0 1.06L2.56 10l3.72 3.72a.75.75 0 0 1-1.06 1.06L.97 10.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Zm7.44 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
);

const FileIconArchive = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h13A1.5 1.5 0 0 1 18 3.5v2.31a1.5 1.5 0 0 1-.44 1.06L14.5 10l3.06 3.13A1.5 1.5 0 0 1 18 14.19V16.5A1.5 1.5 0 0 1 16.5 18h-13A1.5 1.5 0 0 1 2 16.5v-2.31a1.5 1.5 0 0 1 .44-1.06L5.5 10 2.44 6.87A1.5 1.5 0 0 1 2 5.81V3.5ZM9 12.5a.75.75 0 0 1 .75.75v1.518l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72V13.25a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);

const FileIconAudio = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path d="M7 4a1 1 0 0 1 2 0v1.906a2.5 2.5 0 0 1 2.375 2.45v.144a2.5 2.5 0 1 1-2.5 2.5V8.5h-1V12a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1Z" />
      <path d="M12.5 6.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </svg>
);

const FileIconVideo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path d="m11.25 8.122-2.122-1.59a.75.75 0 0 0-1.278.61v4.716a.75.75 0 0 0 1.278.61l2.122-1.59a.75.75 0 0 0 0-1.22Z" />
      <path fillRule="evenodd" d="M1.75 6.125a3.375 3.375 0 0 1 3.375-3.375h10.125a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H5.125a3.375 3.375 0 0 1-3.375-3.375V6.125Zm2.625.75c-.414 0-.75.336-.75.75v7.25c0 .414.336.75.75.75h10.125a.75.75 0 0 0 .75-.75V6.125a.75.75 0 0 0-.75-.75H4.375Z" clipRule="evenodd" />
    </svg>
);


const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
    // Images
    png: FileIconImage, jpg: FileIconImage, jpeg: FileIconImage, gif: FileIconImage, svg: FileIconImage, bmp: FileIconImage, webp: FileIconImage, ai: FileIconImage, psd: FileIconImage,
    // Documents
    pdf: FileIconDefault, doc: FileIconDefault, docx: FileIconDefault, txt: FileIconDefault, rtf: FileIconDefault, md: FileIconDefault, xls: FileIconDefault, xlsx: FileIconDefault, ppt: FileIconDefault, pptx: FileIconDefault,
    // Code
    js: FileIconCode, ts: FileIconCode, jsx: FileIconCode, tsx: FileIconCode, html: FileIconCode, css: FileIconCode, scss: FileIconCode, json: FileIconCode, py: FileIconCode, java: FileIconCode, c: FileIconCode, cpp: FileIconCode, cs: FileIconCode, go: FileIconCode, php: FileIconCode, rb: FileIconCode, swift: FileIconCode, sql: FileIconCode, yaml: FileIconCode, yml: FileIconCode, sh: FileIconCode,
    // Archives
    zip: FileIconArchive, rar: FileIconArchive, '7z': FileIconArchive, tar: FileIconArchive, gz: FileIconArchive,
    // Media
    mp3: FileIconAudio, wav: FileIconAudio, ogg: FileIconAudio,
    mp4: FileIconVideo, mov: FileIconVideo, avi: FileIconVideo, mkv: FileIconVideo,
    // Default
    default: FileIconDefault,
};

type FileIconProps = {
    filename: string;
    className?: string;
};

export const FileIcon = ({ filename, className = '' }: FileIconProps) => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const IconComponent = iconMap[extension] || iconMap.default;

    // The base component has no size, so it can be controlled by the parent's className.
    // e.g., <FileIcon className="w-6 h-6" />
    return (
        <IconComponent className={className} aria-hidden="true" />
    );
};
