
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { SandpackProvider, SandpackLayout, SandpackPreview, SandpackProps } from "@codesandbox/sandpack-react";

type SandpackComponentProps = {
    code: string;
    language: string;
    theme: 'dark' | 'light';
    mode?: 'inline' | 'full';
};

const SandpackComponent: React.FC<SandpackComponentProps> = ({ code, language, theme, mode = 'inline' }) => {
    // Map our language to Sandpack templates
    const getTemplate = (lang: string, codeContent: string): SandpackProps['template'] => {
        const l = lang.toLowerCase();
        if (l === 'react' || l === 'jsx' || l === 'tsx') return 'react-ts'; // Default to TS for better support
        if (l === 'vue') return 'vue';
        if (l === 'svelte') return 'svelte';
        if (l === 'angular') return 'angular';
        if (l === 'html') return 'static';
        
        // Fallback for JS/TS if it looks like React
        // Check for common React patterns: explicit import, JSX-like tags, or export default component
        if (
            l === 'js' || l === 'javascript' || l === 'ts' || l === 'typescript'
        ) {
             if (
                codeContent.includes('React') || 
                codeContent.includes('export default') ||
                /from\s+['"]react['"]/.test(codeContent) ||
                /require\(['"]react['"]\)/.test(codeContent) ||
                /return\s+<[A-Z]/.test(codeContent) // Heuristic for JSX return
             ) {
                 return 'react-ts';
             }
        }
        return 'vanilla-ts';
    };

    const template = getTemplate(language, code);

    // Custom index.html to suppress Tailwind CDN warning
    const suppressedIndexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>App</title>
    <script>
      (function() {
        const origWarn = console.warn;
        console.warn = (...args) => {
          if (args[0] && typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com')) return;
          origWarn.apply(console, args);
        };
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

    // Prepare files based on template
    const getFiles = (): SandpackProps['files'] => {
        if (template === 'react' || template === 'react-ts') {
            return {
                '/App.tsx': code,
                '/public/index.html': {
                    code: suppressedIndexHtml,
                    hidden: true
                }
            };
        }
        if (template === 'vue') {
            return {
                '/src/App.vue': code,
                '/index.html': {
                    code: suppressedIndexHtml.replace('<div id="root"></div>', '<div id="app"></div>'),
                    hidden: true
                }
            };
        }
        if (template === 'svelte') {
            return {
                '/App.svelte': code,
                '/index.html': {
                    code: suppressedIndexHtml.replace('<div id="root"></div>', '<div id="app"></div>'),
                    hidden: true
                }
            };
        }
        if (template === 'static') {
            return {
                '/index.html': code,
            };
        }
        // Vanilla
        return {
            '/index.ts': code,
        };
    };

    // Auto-detect dependencies from code imports
    const customDependencies = useMemo(() => {
        const defaultDeps: Record<string, string> = {
            "react": "^18.0.0",
            "react-dom": "^18.0.0",
            "lucide-react": "latest",
            "recharts": "latest",
            "framer-motion": "latest",
            "clsx": "latest",
            "tailwind-merge": "latest",
            "date-fns": "latest",
            "react-markdown": "latest",
            "lodash": "latest",
            "uuid": "latest",
            "canvas-confetti": "latest",
            "@radix-ui/react-slot": "latest",
            "class-variance-authority": "latest"
        };

        try {
            // Regex matches:
            // import ... from "package"
            // import "package"
            // require("package")
            const importRegex = /from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;
            
            let match;
            while ((match = importRegex.exec(code)) !== null) {
                // match[1] -> from "..."; match[2] -> import "..."; match[3] -> require("...")
                const pkgPath = match[1] || match[2] || match[3];
                
                if (!pkgPath) continue;

                // Skip relative imports (./Component) or absolute paths (/)
                if (pkgPath.startsWith('.') || pkgPath.startsWith('/')) continue;

                // Skip internal CSS/Asset imports often found in examples if they look local
                if (pkgPath.endsWith('.css') && pkgPath.startsWith('./')) continue;

                // Extract package name (handle scoped packages like @radix-ui/react-avatar)
                let pkgName = pkgPath;
                if (pkgPath.startsWith('@')) {
                    const parts = pkgPath.split('/');
                    if (parts.length >= 2) {
                        pkgName = `${parts[0]}/${parts[1]}`;
                    }
                } else {
                    pkgName = pkgPath.split('/')[0];
                }

                // Add to dependencies if not already present
                // We default to "latest" to let Sandpack resolve it
                if (!defaultDeps[pkgName]) {
                    defaultDeps[pkgName] = "latest";
                }
            }
        } catch (e) {
            console.warn("[Sandpack] Failed to auto-detect dependencies:", e);
        }

        return defaultDeps;
    }, [code]);

    return (
        <div className="w-full h-full sandpack-container">
            <SandpackProvider
                template={template}
                theme={theme === 'dark' ? 'dark' : 'light'}
                files={getFiles()}
                options={{
                    classes: {
                        "sp-wrapper": "h-full",
                        "sp-layout": "h-full",
                        "sp-stack": "h-full",
                    },
                    externalResources: ["https://cdn.tailwindcss.com"]
                }}
                customSetup={{
                    dependencies: customDependencies
                }}
            >
                <SandpackLayout>
                    <SandpackPreview 
                        style={{ height: '100%' }} 
                        showOpenInCodeSandbox={false} 
                        showRefreshButton={true}
                    />
                </SandpackLayout>
            </SandpackProvider>
            <style>{`
                .sandpack-container .sp-wrapper { height: 100%; }
                .sandpack-container .sp-layout { height: 100%; border: none; border-radius: 0; background: transparent; }
                .sandpack-container .sp-preview-iframe { height: 100%; }
                .sandpack-container .sp-preview-container { height: 100%; }
            `}</style>
        </div>
    );
};

export default SandpackComponent;
