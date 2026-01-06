
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useViewport } from '../../hooks/useViewport';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../hooks/useTheme';
import { Skeleton } from '../UI/Skeleton';
import { Tooltip } from '../UI/Tooltip';

type ArtifactSidebarProps = {
    isOpen: boolean;
    onClose: () => void;
    content: string;
    language: string;
    width: number;
    setWidth: (width: number) => void;
    isResizing: boolean;
    setIsResizing: (isResizing: boolean) => void;
};

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-green-500">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

const ExternalLinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
);

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M23 4v6h-6"></path>
        <path d="M1 20v-6h6"></path>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
);

const CodeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
);

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

// Loading Skeleton Component
const ArtifactSkeleton = () => (
    <div className="p-6 space-y-4 w-full h-full bg-white dark:bg-[#0d0d0d] overflow-hidden">
        <div className="flex items-center gap-2 mb-6">
            <Skeleton className="h-3 w-3 rounded-full bg-red-400/20" />
            <Skeleton className="h-3 w-3 rounded-full bg-yellow-400/20" />
            <Skeleton className="h-3 w-3 rounded-full bg-green-400/20" />
        </div>
        <div className="space-y-3">
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-4 w-5/6 rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
            <div className="h-4"></div>
            <Skeleton className="h-4 w-1/3 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-4/5 rounded-md" />
        </div>
        <div className="mt-8 space-y-3">
             <Skeleton className="h-32 w-full rounded-xl opacity-50" />
        </div>
    </div>
);

export const ArtifactSidebar: React.FC<ArtifactSidebarProps> = ({ 
    isOpen, onClose, content, language, width, setWidth, isResizing, setIsResizing 
}) => {
    const { isDesktop } = useViewport();
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
    const [iframeKey, setIframeKey] = useState(0);
    const [isCopied, setIsCopied] = useState(false);
    const [logs, setLogs] = useState<{level: string, message: string, timestamp: number}[]>([]);
    const [showConsole, setShowConsole] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Auto-switch to preview for visual languages
    useEffect(() => {
        if (['html', 'svg'].includes(language)) {
            setActiveTab('preview');
        } else {
            setActiveTab('code');
        }
    }, [language]);

    // Force iframe refresh and simulate loading when content changes
    useEffect(() => {
        setIframeKey(prev => prev + 1);
        setLogs([]); // Clear logs on reload
        setIsLoading(true);
        // Short artificial delay to show the ghost element (UX) and allow syntax highlighter to prep
        const timer = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(timer);
    }, [content, activeTab]);

    // Listen for console logs from the iframe
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            // Validate source to ensure we only catch logs from OUR iframe
            if (iframeRef.current && e.source !== iframeRef.current.contentWindow) {
                return;
            }
            if (e.data && e.data.type === 'ARTIFACT_LOG') {
                setLogs(prev => [...prev, { level: e.data.level, message: e.data.message, timestamp: Date.now() }]);
                if (e.data.level === 'error') setShowConsole(true);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    const startResizing = (mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);
        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = window.innerWidth - e.clientX;
            // Clamp width
            setWidth(Math.max(300, Math.min(newWidth, window.innerWidth * 0.8)));
        };
        const handleMouseUp = () => {
            setIsResizing(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleOpenNewTab = () => {
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(getPreviewContent());
            win.document.close();
        }
    };

    const isPreviewable = ['html', 'svg', 'javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx'].includes(language);

    const getPreviewContent = () => {
        // Sanitize content: remove markdown code block fences if present
        let cleanContent = content.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '');

        // Robust Console Capture Script
        const consoleScript = `
            <script>
                (function() {
                    const originalConsole = window.console;
                    function send(level, args) {
                        try {
                            const msg = args.map(a => {
                                if (typeof a === 'object') {
                                    try { return JSON.stringify(a, null, 2); } catch(e) { return '[Circular]'; }
                                }
                                return String(a);
                            }).join(' ');
                            window.parent.postMessage({ type: 'ARTIFACT_LOG', level, message: msg }, '*');
                        } catch(e) {}
                    }
                    window.console = {
                        ...originalConsole,
                        log: (...args) => { originalConsole.log(...args); send('info', args); },
                        info: (...args) => { originalConsole.info(...args); send('info', args); },
                        warn: (...args) => { originalConsole.warn(...args); send('warn', args); },
                        error: (...args) => { originalConsole.error(...args); send('error', args); },
                    };
                    window.addEventListener('error', (e) => {
                        send('error', [e.message]);
                    });
                    window.addEventListener('unhandledrejection', (e) => {
                        send('error', ['Unhandled Rejection: ' + (e.reason ? e.reason.toString() : 'Unknown')]);
                    });
                })();
            </script>
        `;

        if (language === 'html' || language === 'svg') {
            // Inject console script into HTML
            if (cleanContent.includes('<head>')) {
                return cleanContent.replace('<head>', `<head>${consoleScript}`);
            } else {
                return `${consoleScript}${cleanContent}`;
            }
        }
        
        if (['javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx'].includes(language)) {
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>body { font-family: system-ui, sans-serif; padding: 20px; color: #333; } @media (prefers-color-scheme: dark) { body { color: #eee; } }</style>
                    ${consoleScript}
                </head>
                <body>
                    <div id="root"></div>
                    <div id="output"></div>
                    <script type="module">
                        try {
                            ${cleanContent}
                        } catch (e) {
                            console.error(e);
                        }
                    </script>
                </body>
                </html>
            `;
        }
        return '';
    };

    const effectiveTheme = theme === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') 
        : theme;

    return (
        <motion.aside
            initial={false}
            animate={isOpen ? (isDesktop ? { width } : { y: 0 }) : (isDesktop ? { width: 0 } : { y: '100%' })}
            transition={{ type: isResizing ? 'tween' : 'spring', stiffness: 300, damping: 30 }}
            className={`
                flex-shrink-0 bg-gray-50 dark:bg-[#0c0c0c] overflow-hidden flex flex-col
                ${isDesktop 
                    ? 'relative border-l border-gray-200 dark:border-white/10 h-full z-30' 
                    : 'fixed inset-x-0 bottom-0 z-[60] border-t border-gray-200 dark:border-white/10 h-[85vh] rounded-t-2xl shadow-2xl'
                }
            `}
        >
            <div className="flex flex-col h-full overflow-hidden" style={{ width: isDesktop ? `${width}px` : '100%' }}>
                
                {/* Drag handle for mobile */}
                {!isDesktop && (
                    <div className="flex justify-center pt-3 pb-1 flex-shrink-0 bg-white dark:bg-[#121212]" aria-hidden="true">
                        <div className="h-1.5 w-12 bg-gray-300 dark:bg-slate-700 rounded-full"></div>
                    </div>
                )}

                {/* Header Toolbar - Responsive */}
                <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 py-3 bg-white dark:bg-[#121212] border-b border-gray-200 dark:border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar max-w-full">
                        <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-white/5 rounded-md border border-gray-200 dark:border-white/5 flex-shrink-0">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-mono">
                                {language || 'TXT'}
                            </span>
                        </div>
                        {isPreviewable && (
                            <div className="flex bg-gray-100 dark:bg-black/40 p-0.5 rounded-lg border border-gray-200 dark:border-white/5 flex-shrink-0">
                                <button 
                                    onClick={() => setActiveTab('code')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                        activeTab === 'code' 
                                        ? 'bg-white dark:bg-[#2a2a2a] text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10' 
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                                >
                                    <CodeIcon />
                                    Code
                                </button>
                                <button 
                                    onClick={() => setActiveTab('preview')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                        activeTab === 'preview' 
                                        ? 'bg-white dark:bg-[#2a2a2a] text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10' 
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                                >
                                    <EyeIcon />
                                    Preview
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-auto">
                        <Tooltip content="Copy Code" position="bottom" delay={500}>
                            <button 
                                onClick={handleCopy}
                                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                aria-label="Copy code"
                            >
                                {isCopied ? <CheckIcon /> : <CopyIcon />}
                            </button>
                        </Tooltip>
                        
                        <Tooltip content="Close Panel" position="bottom" delay={500}>
                            <button 
                                onClick={onClose} 
                                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                aria-label="Close artifact"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden relative group/content">
                    {activeTab === 'code' ? (
                        <div className="absolute inset-0 overflow-auto custom-scrollbar bg-white dark:bg-[#0d0d0d]">
                            {isLoading ? <ArtifactSkeleton /> : (
                                <SyntaxHighlighter
                                    language={language}
                                    style={effectiveTheme === 'dark' ? vscDarkPlus : oneLight}
                                    customStyle={{ 
                                        margin: 0, 
                                        padding: '1.5rem', 
                                        minHeight: '100%', 
                                        fontSize: '13px', 
                                        lineHeight: '1.5',
                                        fontFamily: "'Fira Code', monospace",
                                        backgroundColor: 'transparent'
                                    }}
                                    showLineNumbers={true}
                                    wrapLines={false} 
                                    lineNumberStyle={{ minWidth: '3em', paddingRight: '1em', opacity: 0.3 }}
                                >
                                    {content}
                                </SyntaxHighlighter>
                            )}
                        </div>
                    ) : (
                        <div className="absolute inset-0 bg-gray-100 dark:bg-[#1a1a1a] flex flex-col">
                            <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-[#202020] border-b border-gray-200 dark:border-white/5 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setShowConsole(!showConsole)}
                                        className={`p-1.5 text-xs font-mono font-medium rounded transition-colors flex items-center gap-1.5 ${showConsole ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                        title="Toggle Console"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                                        Console {logs.length > 0 && <span className="bg-gray-200 dark:bg-white/10 px-1 rounded-sm text-[10px]">{logs.length}</span>}
                                    </button>
                                    <div className="w-px h-3 bg-gray-300 dark:bg-white/10 mx-1" />
                                    <Tooltip content="Reload Preview" position="bottom">
                                        <button 
                                            onClick={() => setIframeKey(k => k + 1)} 
                                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
                                            aria-label="Reload Preview"
                                        >
                                            <RefreshIcon />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content="Open in New Tab" position="bottom">
                                        <button 
                                            onClick={handleOpenNewTab}
                                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
                                            aria-label="Open in New Tab"
                                        >
                                            <ExternalLinkIcon />
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                            <div className="flex-1 relative flex flex-col overflow-hidden">
                                {isLoading ? (
                                    <div className="absolute inset-0 bg-white dark:bg-[#121212] z-10 flex flex-col items-center justify-center space-y-3">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
                                        <span className="text-xs font-medium text-slate-500">Loading Preview...</span>
                                    </div>
                                ) : (
                                    <div className="flex-1 bg-white relative">
                                        <iframe 
                                            ref={iframeRef}
                                            key={iframeKey}
                                            srcDoc={getPreviewContent()}
                                            className="absolute inset-0 w-full h-full border-none bg-white"
                                            sandbox="allow-scripts allow-modals allow-forms allow-popups"
                                            title="Artifact Preview"
                                        />
                                    </div>
                                )}
                                
                                {/* Console Terminal Panel */}
                                <AnimatePresence>
                                    {showConsole && (
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: '35%' }}
                                            exit={{ height: 0 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                            className="bg-[#1e1e1e] border-t border-gray-700 flex flex-col"
                                        >
                                            <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-black/20 text-xs font-mono text-gray-400 select-none">
                                                <span>Terminal</span>
                                                <button onClick={() => setLogs([])} className="hover:text-white transition-colors">Clear</button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 custom-scrollbar">
                                                {logs.length === 0 && <div className="text-gray-600 italic px-1">No output.</div>}
                                                {logs.map((log, i) => (
                                                    <div key={i} className="flex gap-2 border-b border-white/5 pb-0.5 mb-0.5 last:border-0">
                                                        <span className={`flex-shrink-0 font-bold ${
                                                            log.level === 'error' ? 'text-red-400' :
                                                            log.level === 'warn' ? 'text-yellow-400' :
                                                            'text-blue-400'
                                                        }`}>
                                                            {log.level === 'info' ? '›' : log.level === 'error' ? '✖' : '⚠'}
                                                        </span>
                                                        <span className={`break-all whitespace-pre-wrap ${log.level === 'error' ? 'text-red-300' : 'text-gray-300'}`}>
                                                            {log.message}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Resize Handle (Desktop only) */}
            {isDesktop && (
                <div 
                    onMouseDown={startResizing} 
                    className={`
                        absolute top-0 left-0 w-1 h-full cursor-col-resize z-50 transition-colors
                        ${isResizing ? 'bg-indigo-500' : 'hover:bg-indigo-500/50 bg-transparent'}
                    `}
                >
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 -ml-1 w-3 h-8 bg-black/20 dark:bg-white/20 rounded-full opacity-0 hover:opacity-100 transition-opacity" />
                </div>
            )}
        </motion.aside>
    );
};
