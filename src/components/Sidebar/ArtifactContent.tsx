/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useReducer, useEffect, useMemo, useCallback, useState, Suspense, Component } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { Tooltip } from '../UI/Tooltip';
import { useSyntaxTheme } from '../../hooks/useSyntaxTheme';
import { motion, AnimatePresence } from 'framer-motion';
import { VirtualizedCodeViewer } from './VirtualizedCodeViewer';
import { detectIsReact, generateConsoleScript } from '../../utils/artifactUtils';

// Lazy load the shared component
const SandpackEmbed = React.lazy(() => import('../Artifacts/SandpackComponent'));

// --- Icons ---
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

// --- Reducer ---
type LogEntry = { level: string, message: string, timestamp: number };

type State = {
    activeTab: 'code' | 'preview';
    iframeKey: number;
    logs: LogEntry[];
    showConsole: boolean;
    isLoading: boolean;
};

type Action = 
    | { type: 'SET_TAB', payload: 'code' | 'preview' }
    | { type: 'REFRESH_PREVIEW' }
    | { type: 'SET_LOADING', payload: boolean }
    | { type: 'ADD_LOG', payload: LogEntry }
    | { type: 'TOGGLE_CONSOLE' }
    | { type: 'SHOW_CONSOLE_ON_ERROR' }
    | { type: 'CLEAR_LOGS' };

const initialState: State = {
    activeTab: 'code',
    iframeKey: 0,
    logs: [],
    showConsole: false,
    isLoading: true,
};

const artifactReducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'SET_TAB': 
            return { ...state, activeTab: action.payload };
        case 'REFRESH_PREVIEW':
            return { ...state, iframeKey: state.iframeKey + 1, logs: [], isLoading: true };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'ADD_LOG':
            return { ...state, logs: [...state.logs, action.payload] };
        case 'TOGGLE_CONSOLE':
            return { ...state, showConsole: !state.showConsole };
        case 'SHOW_CONSOLE_ON_ERROR':
            return { ...state, showConsole: true };
        case 'CLEAR_LOGS':
            return { ...state, logs: [] };
        default: 
            return state;
    }
};

// Threshold for switching to virtualized plain text viewer
const VIRTUALIZATION_THRESHOLD_SIZE = 20 * 1024; // 20KB (approx 500-1000 lines of dense code)

type ArtifactContentProps = {
    content: string;
    language: string;
    onClose: () => void;
};

interface ArtifactErrorBoundaryProps {
    children?: React.ReactNode;
    onFallback: () => void;
}

interface ArtifactErrorBoundaryState {
    hasError: boolean;
}

// --- Error Boundary for Lazy Component ---
class ArtifactErrorBoundary extends React.Component<ArtifactErrorBoundaryProps, ArtifactErrorBoundaryState> {
    public state: ArtifactErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: any) { console.error("Artifact Preview Error:", error); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-white dark:bg-[#1e1e1e]">
                    <div className="text-red-500 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-sm font-medium">Failed to load preview environment.</p>
                    </div>
                    <button onClick={this.props.onFallback} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm transition-colors">
                        View Code Source
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export const ArtifactContent: React.FC<ArtifactContentProps> = React.memo(({ content, language, onClose }) => {
    const syntaxStyle = useSyntaxTheme();
    
    // UI State managed by Reducer
    const [state, dispatch] = useReducer(artifactReducer, initialState);
    const [isCopied, setIsCopied] = React.useState(false);
    
    // Debounce content to prevent UI blocking during streaming of large files
    const [debouncedContent, setDebouncedContent] = useState(content);

    // Theme detection
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
        checkDark();
        const observer = new MutationObserver(checkDark);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const isReact = useMemo(() => {
        if (content.length > 50000) return false; 
        return detectIsReact(content, language);
    }, [content, language]);

    // Auto-switch tab based on language detection
    useEffect(() => {
        const isRenderable = ['html', 'svg', 'markup', 'xml', 'javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx', 'css'].includes(language) || isReact;
        if (content.length < 50000 && isRenderable) {
            dispatch({ type: 'SET_TAB', payload: 'preview' });
        } else {
            dispatch({ type: 'SET_TAB', payload: 'code' });
        }
    }, [language, content.length, isReact]);

    // Initial load handler to clear the loading spinner
    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch({ type: 'SET_LOADING', payload: false });
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Update debounced content with variable delay based on size
    useEffect(() => {
        // Dynamic debounce: Larger files update less frequently to save CPU
        const length = content.length;
        let delay = 100;
        if (length > 1000000) delay = 1500; // 1MB+ -> 1.5s
        else if (length > 100000) delay = 800; // 100KB+ -> 800ms
        else if (length > 20000) delay = 300; // 20KB+ -> 300ms

        const handler = setTimeout(() => {
            setDebouncedContent(content);
        }, delay);
        return () => clearTimeout(handler);
    }, [content]);

    // Handle updates for Code Mode - ensure loading is off
    useEffect(() => {
        if (state.activeTab === 'code') {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [debouncedContent, state.activeTab]);

    // Console Log Listener
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data && e.data.type === 'ARTIFACT_LOG') {
                dispatch({ 
                    type: 'ADD_LOG', 
                    payload: { level: e.data.level, message: e.data.message, timestamp: Date.now() } 
                });
                if (e.data.level === 'error') {
                    dispatch({ type: 'SHOW_CONSOLE_ON_ERROR' });
                }
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    // Memoized Preview Generation
    const previewContent = useMemo(() => {
        if (!debouncedContent) return '';
        
        let cleanContent = debouncedContent.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '');
        const consoleScript = generateConsoleScript();
        const tailwindCdn = '<script src="https://cdn.tailwindcss.com"></script>';

        // HTML / XML / SVG
        if (['html', 'svg', 'markup', 'xml'].includes(language)) {
            // Automatically inject Tailwind for better out-of-the-box styling of LLM snippets.
            // Put consoleScript FIRST to ensure suppression logic is active before Tailwind loads.
            const stylesAndScript = `${consoleScript}${tailwindCdn}`;
            
            if (cleanContent.includes('<head>')) {
                return cleanContent.replace('<head>', `<head>${stylesAndScript}`);
            } else if (cleanContent.includes('<html>')) {
                return cleanContent.replace('<html>', `<html><head>${stylesAndScript}</head>`);
            }
            return `<!DOCTYPE html><html><head>${stylesAndScript}</head><body>${cleanContent}</body></html>`;
        }
        
        // CSS
        if (['css', 'scss', 'less'].includes(language)) {
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    ${consoleScript}
                    <style>
                        body { font-family: system-ui, sans-serif; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8f9fa; }
                        h1 { color: #333; margin-bottom: 1rem; }
                        .demo-container { padding: 2rem; border: 1px dashed #ccc; border-radius: 8px; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
                    </style>
                    <style>${cleanContent}</style>
                </head>
                <body>
                    <div class="demo-container">
                        <h1>CSS Preview</h1>
                        <p>The styles above are applied to this document.</p>
                        <button class="btn primary">Demo Button</button>
                    </div>
                </body>
                </html>
            `;
        }

        // JavaScript / TypeScript (Standard Iframe fallback if not React)
        if (['javascript', 'typescript', 'js', 'ts'].includes(language) && !isReact) {
            const safeContent = cleanContent.replace(/<\/script>/g, '<\\/script>');
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>body { font-family: system-ui, sans-serif; padding: 20px; color: #333; } @media (prefers-color-scheme: dark) { body { color: #eee; } }</style>
                    ${consoleScript}
                </head>
                <body>
                    <div id="root"></div>
                    <script type="module">
                        // Shim for non-React JS previews
                        try {
                            ${safeContent}
                        } catch (e) {
                            console.error(e);
                        }
                    </script>
                </body>
                </html>
            `;
        }
        return '';
    }, [debouncedContent, language, isReact]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }, [content]);

    const handleOpenNewTab = useCallback(() => {
        if (!isReact) {
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(previewContent);
                win.document.close();
            }
        } else {
            alert("Interactive previews are embedded and cannot be opened in a new tab yet.");
        }
    }, [previewContent, isReact]);

    const handleRefresh = useCallback(() => {
        dispatch({ type: 'REFRESH_PREVIEW' });
        setTimeout(() => dispatch({ type: 'SET_LOADING', payload: false }), 200);
    }, []);

    const isPreviewable = ['html', 'svg', 'markup', 'xml', 'javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx', 'css'].includes(language) || isReact;
    
    const displayLanguage = useMemo(() => {
        if (!language) return 'TXT';
        const raw = language.toLowerCase();
        if (isReact) return 'REACT';
        if (['html', 'css', 'json', 'xml', 'sql', 'php', 'svg'].includes(raw)) return raw.toUpperCase();
        if (raw === 'javascript') return 'JavaScript';
        if (raw === 'typescript') return 'TypeScript';
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    }, [language, isReact]);

    const syntaxHighlighterLanguage = useMemo(() => {
        if (language === 'html') return 'markup';
        return language;
    }, [language]);

    // Efficient check for large files without regex
    const useVirtualization = useMemo(() => {
        return content.length > VIRTUALIZATION_THRESHOLD_SIZE;
    }, [content.length]);

    return (
        <div className="flex flex-col h-full overflow-hidden w-full bg-layer-1">
            {/* Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 py-3 bg-layer-1 border-b border-border-subtle flex-shrink-0 w-full">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar max-w-full">
                    <div className="flex items-center gap-2 px-2 py-1 bg-layer-2 rounded-md border border-border-default flex-shrink-0">
                        <span className="text-xs font-bold text-content-secondary uppercase tracking-wider font-mono">
                            {displayLanguage}
                        </span>
                        {useVirtualization && state.activeTab === 'code' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wide">
                                VIRTUALIZED
                            </span>
                        )}
                    </div>
                    {isPreviewable && (
                        <div className="flex bg-layer-2 p-0.5 rounded-lg border border-border-default flex-shrink-0">
                            <button 
                                onClick={() => dispatch({ type: 'SET_TAB', payload: 'code' })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                    state.activeTab === 'code' 
                                    ? 'bg-white dark:bg-[#2a2a2a] text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10' 
                                    : 'text-content-secondary hover:text-content-primary'
                                }`}
                            >
                                <CodeIcon />
                                Code
                            </button>
                            <button 
                                onClick={() => dispatch({ type: 'SET_TAB', payload: 'preview' })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                    state.activeTab === 'preview' 
                                    ? 'bg-white dark:bg-[#2a2a2a] text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10' 
                                    : 'text-content-secondary hover:text-content-primary'
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
                            className="p-2 rounded-lg text-content-secondary hover:text-content-primary hover:bg-layer-2 transition-colors"
                            aria-label="Copy code"
                        >
                            {isCopied ? <CheckIcon /> : <CopyIcon />}
                        </button>
                    </Tooltip>
                    
                    <Tooltip content="Close Panel" position="bottom" delay={500}>
                        <button 
                            onClick={onClose} 
                            className="p-2 rounded-lg text-content-secondary hover:text-content-primary hover:bg-layer-2 transition-colors"
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
            <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col w-full">
                {/* CODE VIEW */}
                <div 
                    className={`flex-1 relative overflow-auto custom-scrollbar bg-code-surface ${state.activeTab === 'code' ? 'block' : 'hidden'}`}
                >
                    {useVirtualization ? (
                        <VirtualizedCodeViewer 
                            content={debouncedContent} 
                            language={language}
                            theme={syntaxStyle}
                        />
                    ) : (
                        <SyntaxHighlighter
                            language={syntaxHighlighterLanguage || 'text'}
                            style={syntaxStyle}
                            customStyle={{ 
                                margin: 0, 
                                padding: '1.5rem', 
                                minHeight: '100%', 
                                fontSize: '13px', 
                                lineHeight: '1.5',
                                fontFamily: "'Fira Code', monospace",
                                background: 'transparent',
                            }}
                            showLineNumbers={true}
                            wrapLines={false} 
                            lineNumberStyle={{ minWidth: '3em', paddingRight: '1em', opacity: 0.3 }}
                            fallbackLanguage="text"
                        >
                            {debouncedContent || ''}
                        </SyntaxHighlighter>
                    )}
                </div>

                {/* PREVIEW VIEW */}
                <div 
                    className={`flex-1 relative flex flex-col bg-layer-2 ${state.activeTab === 'preview' ? 'block' : 'hidden'}`}
                >
                    {isReact ? (
                        <div className="flex-1 w-full h-full relative bg-white dark:bg-[#1e1e1e]">
                             <ArtifactErrorBoundary onFallback={() => dispatch({ type: 'SET_TAB', payload: 'code' })}>
                                 <Suspense fallback={
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-[#1e1e1e]">
                                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                        <span className="text-xs font-medium text-slate-500">Starting Environment...</span>
                                    </div>
                                 }>
                                     <SandpackEmbed
                                        key={state.iframeKey}
                                        theme={isDark ? "dark" : "light"}
                                        code={debouncedContent}
                                        language={language}
                                        mode="full"
                                     />
                                </Suspense>
                            </ArtifactErrorBoundary>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between px-3 py-2 bg-layer-1 border-b border-border-default flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                                </div>
                                
                                <div className="flex-1 mx-4">
                                    <div className="bg-white dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded px-3 py-1 text-xs text-center text-gray-500 font-mono truncate shadow-sm">
                                        preview
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => dispatch({ type: 'TOGGLE_CONSOLE' })}
                                        className={`p-1.5 text-xs font-mono font-medium rounded transition-colors flex items-center gap-1.5 ${state.showConsole ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'text-content-secondary hover:text-content-primary hover:bg-layer-2'}`}
                                        title="Toggle Console"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                                        Console {state.logs.length > 0 && <span className="bg-layer-2 px-1 rounded-sm text-[10px]">{state.logs.length}</span>}
                                    </button>
                                    <div className="w-px h-3 bg-border-strong mx-1" />
                                    <Tooltip content="Reload Preview" position="bottom">
                                        <button 
                                            onClick={handleRefresh} 
                                            className="p-1.5 text-content-secondary hover:text-content-primary hover:bg-layer-2 rounded transition-colors"
                                            aria-label="Reload Preview"
                                        >
                                            <RefreshIcon />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content="Open in New Tab" position="bottom">
                                        <button 
                                            onClick={handleOpenNewTab}
                                            className="p-1.5 text-content-secondary hover:text-content-primary hover:bg-layer-2 rounded transition-colors"
                                            aria-label="Open in New Tab"
                                        >
                                            <ExternalLinkIcon />
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                            <div className="flex-1 relative flex flex-col overflow-hidden">
                                {state.isLoading ? (
                                    <div className="absolute inset-0 bg-white dark:bg-[#121212] z-10 flex flex-col items-center justify-center space-y-3">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
                                        <span className="text-xs font-medium text-slate-500">Loading Preview...</span>
                                    </div>
                                ) : (
                                    <div className="flex-1 bg-white dark:bg-[#1e1e1e] relative w-full h-full">
                                        <iframe
                                            key={state.iframeKey}
                                            srcDoc={previewContent}
                                            className="absolute inset-0 w-full h-full border-none bg-white dark:bg-[#1e1e1e]"
                                            title="Artifact Preview"
                                            sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                                        />
                                    </div>
                                )}
                                
                                {/* Console Terminal Panel */}
                                <AnimatePresence>
                                    {state.showConsole && (
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: '35%' }}
                                            exit={{ height: 0 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                            className="bg-[#1e1e1e] border-t border-gray-700 flex flex-col w-full"
                                        >
                                            <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-black/20 text-xs font-mono text-gray-400 select-none">
                                                <span>Terminal</span>
                                                <button onClick={() => dispatch({ type: 'CLEAR_LOGS' })} className="hover:text-white transition-colors">Clear</button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 custom-scrollbar">
                                                {state.logs.length === 0 && <div className="text-gray-600 italic px-1">No output.</div>}
                                                {state.logs.map((log, i) => (
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});