
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const detectIsReact = (code: string, lang: string): boolean => {
    const normalize = (s: string) => s.toLowerCase().trim();
    const l = normalize(lang);
    
    // Force React handling for JSX/TSX extensions
    if (l === 'jsx' || l === 'tsx') return true;
    
    // Force Iframe/Standard handling for standard web formats
    if (l === 'html' || l === 'css' || l === 'json' || l === 'svg' || l === 'xml') return false;
    
    const clean = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ''); // remove comments
    
    // Detection Strategy:
    // 1. Look for React Imports (Strongest signal)
    if (/import\s+.*from\s+['"]react['"]/.test(clean) || /import\s+React/.test(clean)) return true;
    
    // 2. Look for React Hook usage
    if (/\buse(State|Effect|Context|Reducer|Callback|Memo|Ref|ImperativeHandle|LayoutEffect|DebugValue)\s*\(/.test(clean)) return true;

    // 3. Look for JSX in return statements (e.g. return <div...)
    // This avoids false positives from simple "less than" comparisons or HTML strings in quotes
    if (/return\s*\(\s*<[a-zA-Z]/.test(clean) || /return\s+<[a-zA-Z]/.test(clean)) return true;
    
    // 4. Default to standard JS (Iframe) if none of the above matches
    return false;
};

export const generateConsoleScript = () => `
    <script>
        (function() {
            const originalConsole = window.console;
            
            function safeStringify(obj) {
                const seen = new WeakSet();
                return JSON.stringify(obj, (key, value) => {
                    if (typeof value === 'object' && value !== null) {
                        if (seen.has(value)) {
                            return '[Circular]';
                        }
                        seen.add(value);
                    }
                    if (typeof value === 'function') return '[Function]';
                    return value;
                }, 2);
            }

            function send(level, args) {
                try {
                    const msg = args.map(a => {
                        if (a === null) return 'null';
                        if (a === undefined) return 'undefined';
                        if (typeof a === 'object') {
                            try { return safeStringify(a); } catch(e) { return Object.prototype.toString.call(a); }
                        }
                        return String(a);
                    }).join(' ');
                    window.parent.postMessage({ type: 'ARTIFACT_LOG', level, message: msg }, '*');
                } catch(e) {
                    // console.error('Error sending log to parent:', e);
                }
            }

            window.console = {
                ...originalConsole,
                log: (...args) => { originalConsole.log(...args); send('info', args); },
                info: (...args) => { originalConsole.info(...args); send('info', args); },
                warn: (...args) => { 
                    // Suppress Tailwind CSS CDN warning
                    if (args[0] && typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com')) return;
                    originalConsole.warn(...args); 
                    send('warn', args); 
                },
                error: (...args) => { originalConsole.error(...args); send('error', args); },
                debug: (...args) => { originalConsole.debug(...args); send('info', args); },
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
