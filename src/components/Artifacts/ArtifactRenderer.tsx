
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../hooks/useTheme';

type ArtifactRendererProps = {
    type: 'code' | 'data';
    content: string;
    language?: string;
    title?: string;
};

export const ArtifactRenderer: React.FC<ArtifactRendererProps> = ({ type, content, language = 'html', title }) => {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<'preview' | 'source'>('preview');
    const [iframeKey, setIframeKey] = useState(0);
    const [logs, setLogs] = useState<{level: string, message: string, timestamp: number}[]>([]);
    const [showConsole, setShowConsole] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Refresh iframe when content changes
    useEffect(() => {
        setIframeKey(prev => prev + 1);
        setLogs([]); // Clear logs on refresh
    }, [content]);

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

    const effectiveTheme = theme === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') 
        : theme;

    const renderPreview = () => {
        if (type === 'data') {
            try {
                // Basic CSV/JSON table renderer
                const isJson = content.trim().startsWith('{') || content.trim().startsWith('[');
                let data = isJson ? JSON.parse(content) : null;
                
                // If simple array of objects, render table
                if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
                    const headers = Object.keys(data[0]);
                    return (
                        <div className="overflow-auto max-h-[400px]">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100 dark:bg-white/5 sticky top-0">
                                    <tr>
                                        {headers.map(h => (
                                            <th key={h} className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-200">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((row, i) => (
                                        <tr key={i} className="border-t border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                                            {headers.map(h => (
                                                <td key={h} className="px-4 py-2 text-slate-600 dark:text-slate-400">{String(row[h])}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }
                return <pre className="p-4 text-xs font-mono">{JSON.stringify(data, null, 2)}</pre>;
            } catch (e) {
                return <div className="p-4 text-red-500">Failed to parse data artifact.</div>;
            }
        }

        // Code Preview (HTML/SVG/JS)
        if (language === 'html' || language === 'svg' || language === 'javascript') {
            // Strip potential markdown wrappers from content if the model output them inside the JSON payload
            const cleanContent = content.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '');

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

            let srcDoc = '';
            if (language === 'javascript') {
                srcDoc = `<html><head>${consoleScript}<style>body{font-family:sans-serif;padding:20px;}</style></head><body><script>${cleanContent}</script></body></html>`;
            } else {
                // Inject script into head for HTML
                if (cleanContent.includes('<head>')) {
                    srcDoc = cleanContent.replace('<head>', `<head>${consoleScript}`);
                } else {
                    srcDoc = `${consoleScript}${cleanContent}`;
                }
            }
            
            return (
                <div className="flex flex-col h-full min-h-[400px]">
                    <div className="flex-1 relative bg-white">
                        <iframe 
                            ref={iframeRef}
                            key={iframeKey}
                            srcDoc={srcDoc}
                            className="absolute inset-0 w-full h-full border-none bg-white"
                            sandbox="allow-scripts allow-modals allow-forms allow-popups"
                            title="Artifact"
                        />
                    </div>
                    {/* Integrated Console Terminal */}
                    <div className="flex-shrink-0 bg-[#1e1e1e] border-t border-gray-700 flex flex-col">
                        <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-black/20 text-xs font-mono text-gray-400 select-none">
                            <button 
                                onClick={() => setShowConsole(!showConsole)} 
                                className="flex items-center gap-2 hover:text-white transition-colors focus:outline-none"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 transition-transform ${showConsole ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6"></polyline></svg>
                                Console {logs.length > 0 && <span className="bg-gray-600 text-white px-1 rounded-sm text-[10px]">{logs.length}</span>}
                            </button>
                            {showConsole && <button onClick={() => setLogs([])} className="hover:text-white transition-colors">Clear</button>}
                        </div>
                        <AnimatePresence>
                            {showConsole && (
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 160 }}
                                    exit={{ height: 0 }}
                                    className="overflow-y-auto p-2 font-mono text-xs space-y-1 custom-scrollbar"
                                >
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
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            );
        }
        
        return <div className="p-4 text-slate-500">Preview not available for {language}</div>;
    };

    return (
        <div className="my-4 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d0d] shadow-lg">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {title || (type === 'code' ? 'Interactive App' : 'Data View')}
                </span>
                <div className="flex bg-gray-200 dark:bg-black/30 p-0.5 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('preview')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTab === 'preview' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        Preview
                    </button>
                    <button 
                        onClick={() => setActiveTab('source')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTab === 'source' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        Source
                    </button>
                </div>
            </div>

            <div className="relative">
                {activeTab === 'preview' ? (
                    renderPreview()
                ) : (
                    <div className="max-h-[400px] overflow-auto custom-scrollbar text-code-text">
                        <SyntaxHighlighter
                            language={language || 'text'}
                            style={effectiveTheme === 'dark' ? vscDarkPlus : oneLight}
                            customStyle={{ 
                                margin: 0, 
                                padding: '1rem', 
                                fontSize: '13px', 
                                backgroundColor: 'transparent',
                                color: 'inherit' 
                            }}
                            codeTagProps={{
                                style: { fontFamily: "inherit", color: 'inherit' }
                            }}
                            showLineNumbers
                        >
                            {content}
                        </SyntaxHighlighter>
                    </div>
                )}
            </div>
        </div>
    );
};
