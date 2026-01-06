
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SettingItem } from './SettingItem';
import { ThemeToggle } from '../Sidebar/ThemeToggle';
import type { Theme } from '../../hooks/useTheme';
import { SelectDropdown } from '../UI/SelectDropdown';

type GeneralSettingsProps = {
  onClearAllChats: () => void;
  onRunTests: () => void;
  onDownloadLogs: () => void;
  onShowDataStructure: () => void;
  apiKey: string;
  onSaveApiKey: (key: string, provider: 'gemini' | 'openrouter') => Promise<void>;
  suggestionApiKey?: string;
  onSaveSuggestionApiKey?: (key: string) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  serverUrl: string;
  onSaveServerUrl: (url: string) => Promise<boolean>;
};

const PROVIDER_OPTIONS = [
    { id: 'gemini', label: 'Google Gemini', desc: 'Default' },
    { id: 'openrouter', label: 'OpenRouter', desc: 'Access to Claude, GPT, etc.' }
];

const SYNTAX_OPTIONS = [
    { id: 'auto', label: 'Auto (Match Theme)', desc: 'Switches automatically' },
    { id: 'vsc-dark', label: 'VS Code', desc: 'Classic VSCode look' },
    { id: 'vs', label: 'Visual Studio', desc: 'Classic light theme' },
    { id: 'dracula', label: 'Dracula', desc: 'High contrast purple' },
    { id: 'atom-dark', label: 'Atom Dark', desc: 'Soft dark colors' },
    { id: 'synthwave', label: 'Synthwave 84', desc: 'Neon & Retro' },
    { id: 'one-light', label: 'One Light', desc: 'Clean light theme' },
    { id: 'github', label: 'GitHub Light', desc: 'Standard GitHub style' },
];

const ActionButton = ({ 
    icon, 
    title, 
    onClick, 
    danger = false 
}: { icon: React.ReactNode, title: string, onClick: () => void, danger?: boolean }) => (
    <button 
        onClick={onClick}
        className={`
            group relative flex items-center gap-3 px-5 py-3 rounded-2xl border text-sm font-semibold transition-all duration-300 outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-[#09090b]
            ${danger 
                ? 'bg-white dark:bg-white/5 border-red-200/70 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-300 dark:hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/10 focus:ring-red-500' 
                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none focus:ring-indigo-500'
            }
            active:scale-[0.98]
        `}
    >
        <span className={`transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${danger ? 'text-red-500' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`}>
            {icon}
        </span>
        <span>{title}</span>
    </button>
);

const ApiKeyInput = ({ 
    value, 
    onSave, 
    placeholder, 
    description,
    isOptional = false,
    provider = 'gemini',
    onProviderChange,
    label
}: { 
    value: string, 
    onSave: (key: string, provider: 'gemini' | 'openrouter') => Promise<void> | void, 
    placeholder: string,
    description: string,
    isOptional?: boolean,
    provider: 'gemini' | 'openrouter',
    onProviderChange?: (provider: 'gemini' | 'openrouter') => void,
    label?: string
}) => {
    const [localValue, setLocalValue] = useState(value);
    const [showKey, setShowKey] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (saveStatus === 'saving') return;

        setSaveStatus('saving');
        setSaveError(null);
        
        try {
            await onSave(localValue, provider);
            if (isMounted.current) {
                setSaveStatus('saved');
                setTimeout(() => {
                    if (isMounted.current) setSaveStatus('idle');
                }, 2000);
            }
        } catch (error: any) {
            if (isMounted.current) {
                setSaveStatus('error');
                setSaveError(error.message || 'Failed to save key.');
            }
        }
    };

    const labelComponent = label ? (
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
    ) : (
        <div className="flex items-center gap-3">
            <SelectDropdown
                value={provider}
                onChange={(val) => onProviderChange?.(val as 'gemini' | 'openrouter')}
                options={PROVIDER_OPTIONS}
                disabled={!onProviderChange}
                className="w-48"
                triggerClassName="flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg hover:border-indigo-400 dark:hover:border-indigo-400 transition-colors shadow-sm"
            />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">API Key</span>
        </div>
    );

    return (
        <SettingItem 
            label={labelComponent} 
            description={description} 
            layout="col"
        >
            <form onSubmit={handleSave} className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className={`w-4 h-4 transition-colors duration-200 ${localValue ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                </div>
                <input
                    type={showKey ? "text" : "password"}
                    autoComplete="off"
                    value={localValue}
                    onChange={e => setLocalValue(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-9 pr-28 py-2.5 bg-slate-100/50 dark:bg-white/5 border border-transparent dark:border-transparent rounded-lg text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-black/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-inner"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 gap-1">
                    <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md transition-colors"
                        title={showKey ? "Hide key" : "Show key"}
                    >
                        {showKey ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                    </button>
                    <button
                        type="submit"
                        disabled={saveStatus === 'saving' || (!isOptional && !localValue)}
                        className={`
                            px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-all shadow-sm
                            ${saveStatus === 'saved' 
                                ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20' 
                                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none
                        `}
                    >
                        {saveStatus === 'saving' ? '...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
                    </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between min-h-[20px]">
                 {saveStatus === 'error' && saveError ? (
                     <p className="text-xs font-medium text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
                         {saveError}
                     </p>
                 ) : (
                     <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                        Stored securely on your device.
                     </span>
                 )}
              </div>
            </form>
        </SettingItem>
    );
};

const ServerUrlInput = ({
    value,
    onSave
}: {
    value: string,
    onSave: (url: string) => Promise<boolean>
}) => {
    const [localValue, setLocalValue] = useState(value);
    const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState<string | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const handleVerify = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        const urlToTest = localValue.trim().replace(/\/$/, '');
        
        // Allow clearing the override
        if (!urlToTest) {
            await onSave('');
            if (isMounted.current) {
                setStatus('success');
                setMessage('Reset to default');
                setTimeout(() => { 
                    if (isMounted.current) {
                        setStatus('idle'); 
                        setMessage(null); 
                    }
                }, 2000);
            }
            return;
        }

        setStatus('verifying');
        setMessage(null);

        const success = await onSave(urlToTest);
        
        if (isMounted.current) {
            if (success) {
                setStatus('success');
                setMessage('Connected successfully');
                setTimeout(() => { 
                    if (isMounted.current) {
                        setStatus('idle'); 
                        setMessage(null); 
                    }
                }, 2000);
            } else {
                setStatus('error');
                setMessage('Connection failed. Check URL.');
            }
        }
    };

    return (
        <SettingItem 
            label="Backend Server URL" 
            description="Override the default backend URL. Useful if you are self-hosting or experiencing connection issues." 
            layout="col"
        >
            <form onSubmit={handleVerify} className="space-y-4">
                <div className="flex gap-2">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className={`w-4 h-4 transition-colors ${status === 'success' ? 'text-green-500' : status === 'error' ? 'text-red-500' : 'text-slate-400'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        </div>
                        <input
                            type="text"
                            value={localValue}
                            onChange={e => setLocalValue(e.target.value)}
                            placeholder="https://your-backend-url.com"
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-100/50 dark:bg-white/5 border border-transparent dark:border-transparent rounded-lg text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-black/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-inner"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={status === 'verifying'}
                        className={`
                            px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all shadow-sm flex items-center gap-2
                            ${status === 'success' 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : status === 'error'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-slate-700 hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-200'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                    >
                        {status === 'verifying' ? (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : status === 'success' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                        ) : (
                            'Verify'
                        )}
                    </button>
                </div>
                {message && (
                    <p className={`text-xs font-medium flex items-center gap-1 animate-in fade-in slide-in-from-top-1 ${status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        {message}
                    </p>
                )}
            </form>
        </SettingItem>
    );
};

const GeneralSettings: React.FC<GeneralSettingsProps & { provider: 'gemini' | 'openrouter', openRouterApiKey: string, onProviderChange: (p: 'gemini' | 'openrouter') => void }> = ({ 
    onClearAllChats, onRunTests, onDownloadLogs, onShowDataStructure, apiKey, onSaveApiKey,
    suggestionApiKey, onSaveSuggestionApiKey,
    theme, setTheme,
    serverUrl, onSaveServerUrl,
    provider, openRouterApiKey, onProviderChange
}) => {
  const [syntaxTheme, setSyntaxTheme] = useState(() => localStorage.getItem('syntax_theme') || 'auto');

  const handleMainApiKeySave = async (key: string, savedProvider: 'gemini' | 'openrouter') => {
      const cleanKey = key.trim();
      const cleanSuggestionKey = (suggestionApiKey || '').trim();

      // Check conflict only if we are using Gemini provider for the main key
      if (savedProvider === 'gemini' && cleanKey && cleanSuggestionKey && cleanKey === cleanSuggestionKey) {
          throw new Error("Conflict: Main Key cannot be identical to Suggestion Key.");
      }
      
      // Save logic: If provider changed, update provider state too
      if (savedProvider !== provider) {
          onProviderChange(savedProvider);
      }
      await onSaveApiKey(cleanKey, savedProvider);
  };

  const handleSuggestionApiKeySave = async (key: string) => {
      const cleanKey = key.trim();
      if (onSaveSuggestionApiKey) {
          onSaveSuggestionApiKey(cleanKey);
      }
  };

  const handleSyntaxThemeChange = (newTheme: string) => {
      setSyntaxTheme(newTheme);
      localStorage.setItem('syntax_theme', newTheme);
      // Dispatch event for useSyntaxTheme hook
      window.dispatchEvent(new Event('syntax-theme-change'));
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">General Settings</h3>
      </div>

      <ApiKeyInput 
        provider={provider}
        onProviderChange={onProviderChange}
        description={provider === 'gemini' 
            ? "Required for main chat, reasoning, and tool execution." 
            : "Required for accessing OpenRouter models."
        }
        value={provider === 'gemini' ? apiKey : openRouterApiKey}
        onSave={handleMainApiKeySave}
        placeholder={provider === 'gemini' ? "Enter your Gemini API key" : "Enter your OpenRouter API key"}
      />

      {provider === 'gemini' && onSaveSuggestionApiKey && (
          <ApiKeyInput 
            provider="gemini"
            // No provider change for suggestion key
            label="AI Suggestion API Key (Optional)"
            description="Used for background tasks (titles, suggestions, memory) to save rate limits on your main key."
            value={suggestionApiKey || ''}
            onSave={(k) => handleSuggestionApiKeySave(k)}
            placeholder="Enter a secondary API key"
            isOptional
          />
      )}

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 pb-4 border-b border-gray-100 dark:border-white/5">
         <span>Need a key?</span>
         {provider === 'gemini' ? (
             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors">
                 Get Gemini Key 
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" /></svg>
             </a>
         ) : (
             <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors">
                 Get OpenRouter Key 
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" /></svg>
             </a>
         )}
      </div>

      <SettingItem label="Theme" description="Choose your preferred visual style." layout="col">
        <ThemeToggle theme={theme} setTheme={setTheme} variant="cards" />
      </SettingItem>

      <SettingItem label="Code Syntax Highlighting" description="Customize how code blocks are rendered.">
          <div className="w-full sm:w-64">
              <SelectDropdown 
                  value={syntaxTheme}
                  onChange={handleSyntaxThemeChange}
                  options={SYNTAX_OPTIONS}
                  icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>}
              />
          </div>
      </SettingItem>

      {/* Manual Server URL Override */}
      <ServerUrlInput value={serverUrl} onSave={onSaveServerUrl} />

      <div className="pt-8">
          <div className="flex items-center gap-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-400 dark:text-slate-500"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data & Debugging</h4>
          </div>
          
          <div className="flex flex-wrap gap-3">
              <ActionButton 
                  icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>}
                  title="Download Logs"
                  onClick={onDownloadLogs}
              />
              <ActionButton 
                  icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>}
                  title="View Data Tree"
                  onClick={onShowDataStructure}
              />
              <ActionButton 
                  icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>}
                  title="Clear All Chats"
                  onClick={onClearAllChats}
                  danger
              />
          </div>
      </div>
    </div>
  );
};

export default React.memo(GeneralSettings);
