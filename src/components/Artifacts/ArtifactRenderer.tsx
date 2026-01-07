/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Suspense, ErrorInfo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { useSyntaxTheme } from '../../hooks/useSyntaxTheme';
import { detectIsReact, generateConsoleScript } from '../../utils/artifactUtils';

// Lazy load the shared Sandpack component
// Ensure we handle the default export correctly
const SandpackEmbed = React.lazy(() => import('./SandpackComponent'));

interface ErrorBoundaryProps {
    children?: React.ReactNode;
    fallback: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

// --- Error Boundary for Lazy Component ---
class ArtifactPreviewErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError() { return { hasError: true }; }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ArtifactPreviewErrorBoundary caught an error:", error, errorInfo);
    }
    
    render() {
        if (this.state.hasError) return this.props.fallback;
        return this.props.children;
    }
}

type ArtifactRendererProps = {
    type: 'code' | 'data';
    content: string;
    language?: string;
    title?: string;
};

export const ArtifactRenderer: React.FC<ArtifactRendererProps> = ({ type, content, language = 'html', title }) => {
    const [activeTab, setActiveTab] = useState<'preview' | 'source'>('preview');
    const [logs, setLogs] = useState<{level: string, message: string, timestamp: number}[]>([]);
    const [showConsole, setShowConsole] = useState(false);
    const [iframeKey, setIframeKey] = useState(0); 
    const syntaxStyle = useSyntaxTheme();
    
    // Theme detection
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
        checkDark();
        const observer = new MutationObserver(checkDark);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Listen for console logs from the iframe (only for Standard Frame mode)
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data && e.data.type === 'ARTIFACT_LOG') {
                setLogs(prev => [...prev, { level: e.data.level, message: e.data.message, timestamp: Date.now() }]);
                if (e.data.level === 'error') setShowConsole(true);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    // Reset logs on content change
    useEffect(() => {
        setLogs([]);
    }, [content]);

    // Determine Renderer Strategy
    const useSandpack = useMemo(() => {
        if (type === 'data') return false;
        
        // Detect React-like patterns in content
        const isReact = detectIsReact(content, language);
        const l = (language || '').toLowerCase();
        
        // Supported frameworks by Sandpack in our implementation
        const isSupportedFramework = ['react', 'jsx', 'tsx', 'vue', 'svelte'].includes(l);

        // Logic: Use Sandpack for Frameworks. Use Standard Iframe for simple HTML/JS.
        return isReact || isSupportedFramework;
    }, [content, language, type]);


    // Auto-switch tab based on language on mount
    useEffect(() => {
        // Preview is available for standard web OR things handled by Sandpack
        const isRenderable = ['html', 'svg', 'markup', 'xml', 'css', 'javascript', 'js'].includes(language) || useSandpack;
        
        if (content.length < 50000 && isRenderable) {
            setActiveTab('preview');
        } else {
            setActiveTab('source');
        }
    }, [language, content.length, useSandpack]);

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
                                    {data.map((row: any, i: number) => (
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

        // --- Sandpack Preview (Frameworks, React, etc.) ---
        if (useSandpack) {
            return (
                <div className="h-[550px] w-full bg-white dark:bg-[#1e1e1e] border-t border-border-subtle relative">
                     <ArtifactPreviewErrorBoundary fallback={
                         <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-[#1e1e1e] text-center p-4">
                             <div className="text-red-500 mb-2">⚠ Preview Unavailable</div>
                             <p className="text-xs text-slate-500">The interactive environment could not be loaded.</p>
                         </div>
                     }>
                         <Suspense fallback={
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-[#1e1e1e]">
                                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                <span className="text-xs font-medium text-slate-500">Starting Environment...</span>
                            </div>
                         }>
                             <SandpackEmbed
                                code={content}
                                language={language}
                                theme={isDark ? "dark" : "light"}
                                mode="inline"
                             />
                        </Suspense>
                    </ArtifactPreviewErrorBoundary>
                </div>
            );
        }

        // --- Standard Frame for Pure HTML/JS/CSS ---
        if (['html', 'svg', 'javascript', 'markup', 'xml', 'css', 'js'].includes(language)) {
            const cleanContent = content.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '');
            const consoleScript = generateConsoleScript();

            let initialContent = '';
            if (language === 'javascript' || language === 'js') {
                initialContent = `<!DOCTYPE html><html><head>${consoleScript}<style>body{font-family:sans-serif;padding:20px;}</style></head><body><script>${cleanContent}</script></body></html>`;
            } else if (language === 'css') {
                 initialContent = `<!DOCTYPE html><html><head>${consoleScript}<style>${cleanContent}</style></head><body><h1>CSS Preview</h1><div class="demo">Demo Content</div></body></html>`;
            } else {
                if (cleanContent.includes('<head>')) {
                    initialContent = cleanContent.replace('<head>', `<head>${consoleScript}`);
                } else if (cleanContent.includes('<html>')) {
                     initialContent = cleanContent.replace('<html>', `<html><head>${consoleScript}</head>`);
                } else {
                    initialContent = `${consoleScript}${cleanContent}`;
                }
            }
            
            return (
                <div className="flex flex-col h-full min-h-[400px]">
                    <div className="flex-1 relative bg-white dark:bg-[#1e1e1e]">
                        <iframe
                            key={iframeKey}
                            srcDoc={initialContent}
                            className="absolute inset-0 w-full h-full border-none bg-white dark:bg-[#1e1e1e]"
                            title="Artifact Preview"
                            sandbox="allow-scripts allow-forms allow-modals allow-popups"
                            allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
                        />
                    </div>
                    {/* Integrated Console Terminal for Standard Frame */}
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
                        {showConsole && (
                            <div className="h-40 overflow-y-auto p-2 font-mono text-xs space-y-1 custom-scrollbar">
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
                        )}
                    </div>
                </div>
            );
        }
        
        return <div className="p-4 text-slate-500">Preview not available for {language}</div>;
    };

    const highlightLang = (language === 'html' || language === 'svg' || language === 'xml') ? 'markup' : (language || 'text');
    
    // Only show Preview tab if it's a simple renderable language OR Sandpack can handle it
    const showPreviewTab = ['html', 'svg', 'markup', 'xml', 'css', 'javascript', 'js'].includes(language) || useSandpack;

    return (
        <div className="my-4 rounded-xl overflow-hidden border border-border-default shadow-lg bg-code-surface transition-colors duration-300">
            <div className="flex items-center justify-between px-4 py-2 bg-layer-2/50 border-b border-border-default backdrop-blur-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-content-secondary">
                    {title || (type === 'code' ? 'Code Snippet' : 'Data View')}
                </span>
                <div className="flex bg-layer-3 p-0.5 rounded-lg">
                    {showPreviewTab && (
                        <button 
                            onClick={() => setActiveTab('preview')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTab === 'preview' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Preview
                        </button>
                    )}
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
                    <div className="max-h-[400px] overflow-auto custom-scrollbar">
                        <SyntaxHighlighter
                            language={highlightLang}
                            style={syntaxStyle}
                            customStyle={{ 
                                margin: 0, 
                                padding: '1rem', 
                                fontSize: '13px', 
                                lineHeight: '1.5',
                                background: 'transparent',
                            }}
                            codeTagProps={{
                                style: { fontFamily: "'Fira Code', monospace" }
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