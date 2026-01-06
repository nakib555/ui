/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

// SVG components for different file types (Styled for consistency)

const FileIconDefault = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
      <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
    </svg>
);

const FileIconImage = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" clipRule="evenodd" />
    </svg>
);

const FileIconCode = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 11.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
        <path d="M12 2.25a.75.75 0 0 1 .75.75v.756a49.106 49.106 0 0 1 9.152 1.006c.549.095.99.51.99 1.06l-.001 2.539a.75.75 0 0 1-1.5 0V6.066a47.623 47.623 0 0 0-17.783 0v2.294a.75.75 0 0 1-1.5 0V5.822c0-.55.441-.965.99-1.06A49.105 49.105 0 0 1 11.25 3.756V3a.75.75 0 0 1 .75-.75Z" />
    </svg>
);

const FileIconArchive = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z" />
    </svg>
);

const FileIconAudio = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
      <path d="M16.463 8.288a.75.75 0 0 1 1.06 0 5.25 5.25 0 0 1 0 7.424.75.75 0 0 1-1.06-1.06 3.75 3.75 0 0 0 0-5.304.75.75 0 0 1 0-1.06Z" />
    </svg>
);

const FileIconVideo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z" />
    </svg>
);

const FileIconPdf = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Z" clipRule="evenodd" />
      <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
    </svg>
);

const FileIconWord = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
        <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
        <path fillRule="evenodd" d="M10.125 13.5a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V14.25a.75.75 0 0 1 .75-.75Zm3.75 0a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V14.25a.75.75 0 0 1 .75-.75Zm-7.5 0a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V14.25a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);

const FileIconExcel = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
        <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
        <path d="M9 13.5h.008v.008H9V13.5Zm3 0h.008v.008H12V13.5Zm3 0h.008v.008H15V13.5Zm-6 3h.008v.008H9V16.5Zm3 0h.008v.008H12V16.5Zm3 0h.008v.008H15V16.5Z" />
    </svg>
);

const FileIconText = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M3 4.5A2.25 2.25 0 0 1 5.25 2.25H9a2.25 2.25 0 0 1 2.25 2.25v2.25h2.25a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18V4.5ZM5.25 3.75a.75.75 0 0 0-.75.75v12.75c0 .414.336.75.75.75h9.75a.75.75 0 0 0 .75-.75V7.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 1-.75-.75V3.75h-5.25Z" clipRule="evenodd" />
        <path d="M6 7.5a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 7.5ZM6 10.5a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1-.75-.75ZM6 13.5a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1-.75-.75Z" />
    </svg>
);


const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
    // Images
    png: FileIconImage, jpg: FileIconImage, jpeg: FileIconImage, gif: FileIconImage, svg: FileIconImage, bmp: FileIconImage, webp: FileIconImage, ai: FileIconImage, psd: FileIconImage,
    // Documents
    pdf: FileIconPdf, 
    doc: FileIconWord, docx: FileIconWord, 
    xls: FileIconExcel, xlsx: FileIconExcel, csv: FileIconExcel,
    ppt: FileIconDefault, pptx: FileIconDefault, // Using default for PPT currently or could duplicate Word with different color in parent
    txt: FileIconText, rtf: FileIconText, md: FileIconText,
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

    return (
        <IconComponent className={className} aria-hidden="true" />
    );
};