
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, Suspense } from 'react';
import { AnimatePresence, motion as motionTyped, LayoutGroup } from 'framer-motion';
import type { Model } from '../../types';
import { SettingsCategoryButton } from './SettingsCategoryButton';
import type { Theme } from '../../hooks/useTheme';
import { SettingsSkeleton } from './SettingsSkeleton';

const motion = motionTyped as any;

// Lazy load the settings tabs to optimize bundle size and startup time
const GeneralSettings = React.lazy(() => import('./GeneralSettings'));
const ModelSettings = React.lazy(() => import('./ModelSettings'));
const PersonalizeSettings = React.lazy(() => import('./PersonalizeSettings'));
const SpeechMemorySettings = React.lazy(() => import('./SpeechMemorySettings'));

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  models: Model[];
  imageModels: Model[];
  videoModels: Model[];
  ttsModels: Model[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  onClearAllChats: () => void;
  onRunTests: () => void;
  onDownloadLogs: () => void;
  onShowDataStructure: () => void;
  apiKey: string;
  onSaveApiKey: (key: string, provider: 'gemini' | 'openrouter') => Promise<void>;
  suggestionApiKey: string;
  onSaveSuggestionApiKey: (key: string) => void;
  aboutUser: string;
  setAboutUser: (prompt: string) => void;
  aboutResponse: string;
  setAboutResponse: (prompt: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  maxTokens: number;
  setMaxTokens: (tokens: number) => void;
  imageModel: string;
  onImageModelChange: (modelId: string) => void;
  videoModel: string;
  onVideoModelChange: (modelId: string) => void;
  ttsModel: string;
  onTtsModelChange: (modelId: string) => void;
  defaultTemperature: number;
  defaultMaxTokens: number;
  isMemoryEnabled: boolean;
  setIsMemoryEnabled: (enabled: boolean) => void;
  onManageMemory: () => void;
  ttsVoice: string;
  setTtsVoice: (voice: string) => void;
  disabled: boolean;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  serverUrl: string;
  onSaveServerUrl: (url: string) => Promise<boolean>;
  provider: 'gemini' | 'openrouter';
  openRouterApiKey: string;
  onProviderChange: (provider: 'gemini' | 'openrouter') => void;
};

const CATEGORIES = [
  { 
    id: 'general', 
    label: 'General', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    ) 
  },
  { 
    id: 'model', 
    label: 'Model & AI', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Z" />
        <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <path d="M4.93 4.93l2.83 2.83" />
        <path d="M16.24 16.24l2.83 2.83" />
        <path d="M2 12h4" />
        <path d="M18 12h4" />
        <path d="M4.93 19.07l2.83-2.83" />
        <path d="M16.24 7.76l2.83-2.83" />
      </svg>
    ) 
  },
  { 
    id: 'personalize', 
    label: 'Personalize', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M12 11l4 4" /> 
        <path d="M16 11l-4 4" />
      </svg>
    ) 
  },
  { 
    id: 'speech', 
    label: 'Voice & Memory', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M2 10v3" />
        <path d="M6 6v11" />
        <path d="M10 3v18" />
        <path d="M14 8v7" />
        <path d="M18 5v13" />
        <path d="M22 10v4" />
      </svg>
    ) 
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = React.memo((props) => {
    const { isOpen, onClose } = props;
    const [activeCategory, setActiveCategory] = useState('general');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 sm:p-6 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, type: "spring", bounce: 0.25 }}
            className="bg-page w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-white/10"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-layer-1/80 backdrop-blur-md z-20 flex-shrink-0">
              <div>
                <h2 id="settings-title" className="text-xl font-bold text-content-primary tracking-tight">
                  Settings
                </h2>
                <p className="text-xs text-content-tertiary font-medium mt-0.5">Preferences & Configuration</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-content-tertiary hover:text-content-primary hover:bg-layer-2 transition-all duration-200"
                aria-label="Close settings"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-layer-2/50 overflow-hidden">
                {/* Navigation Sidebar */}
                <nav className="flex-shrink-0 p-2 md:p-6 md:w-72 bg-layer-1/50 z-10 border-b md:border-b-0 md:border-r border-border backdrop-blur-xl flex flex-col gap-6">
                    
                    <div className="hidden md:block px-2">
                        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Configuration</h3>
                    </div>

                    <LayoutGroup id="settings-nav">
                        {/* Use custom scrollbar class and ensure horizontal scroll on mobile */}
                        <ul className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible px-2 md:px-0 py-2 md:py-0 custom-scrollbar scroll-smooth snap-x">
                            {CATEGORIES.map(cat => (
                                <li key={cat.id} className="flex-shrink-0 snap-start">
                                    <SettingsCategoryButton
                                        icon={cat.icon}
                                        label={cat.label}
                                        isActive={activeCategory === cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                    />
                                </li>
                            ))}
                        </ul>
                    </LayoutGroup>
                </nav>

                {/* Content Area - Lazy Loaded */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-page w-full">
                    <div className="p-6 md:p-10 max-w-3xl mx-auto min-h-full">
                        <Suspense fallback={<SettingsSkeleton />}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeCategory}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="w-full"
                                >
                                    {activeCategory === 'general' && (
                                        <GeneralSettings 
                                            onClearAllChats={props.onClearAllChats} 
                                            onRunTests={props.onRunTests} 
                                            onDownloadLogs={props.onDownloadLogs} 
                                            onShowDataStructure={props.onShowDataStructure} 
                                            apiKey={props.apiKey} 
                                            onSaveApiKey={props.onSaveApiKey} 
                                            suggestionApiKey={props.suggestionApiKey}
                                            onSaveSuggestionApiKey={props.onSaveSuggestionApiKey}
                                            theme={props.theme} 
                                            setTheme={props.setTheme} 
                                            serverUrl={props.serverUrl}
                                            onSaveServerUrl={props.onSaveServerUrl}
                                            provider={props.provider}
                                            openRouterApiKey={props.openRouterApiKey}
                                            onProviderChange={props.onProviderChange}
                                        />
                                    )}
                                    {activeCategory === 'personalize' && <PersonalizeSettings {...props} />}
                                    {activeCategory === 'model' && (
                                        <ModelSettings
                                            models={props.models}
                                            imageModels={props.imageModels}
                                            videoModels={props.videoModels}
                                            ttsModels={props.ttsModels}
                                            selectedModel={props.selectedModel}
                                            onModelChange={props.onModelChange}
                                            temperature={props.temperature}
                                            setTemperature={props.setTemperature}
                                            maxTokens={props.maxTokens}
                                            setMaxTokens={props.setMaxTokens}
                                            imageModel={props.imageModel}
                                            onImageModelChange={props.onImageModelChange}
                                            videoModel={props.videoModel}
                                            onVideoModelChange={props.onVideoModelChange}
                                            ttsModel={props.ttsModel}
                                            onTtsModelChange={props.onTtsModelChange}
                                            defaultTemperature={props.defaultTemperature}
                                            defaultMaxTokens={props.defaultMaxTokens}
                                            disabled={props.disabled}
                                            provider={props.provider}
                                        />
                                    )}
                                    {activeCategory === 'speech' && (
                                        <SpeechMemorySettings 
                                            isMemoryEnabled={props.isMemoryEnabled} 
                                            setIsMemoryEnabled={props.setIsMemoryEnabled} 
                                            onManageMemory={props.onManageMemory} 
                                            disabled={props.disabled}
                                            ttsVoice={props.ttsVoice}
                                            setTtsVoice={props.setTtsVoice}
                                            ttsModels={props.ttsModels}
                                            ttsModel={props.ttsModel}
                                            onTtsModelChange={props.onTtsModelChange}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </Suspense>
                    </div>
                </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
