
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMessageForm } from './useMessageForm';
import { UploadMenu } from './UploadMenu';
import { VoiceVisualizer } from '../../UI/VoiceVisualizer';
import { ModeToggle } from '../../UI/ModeToggle';
import { MessageFormHandle } from './types';
import { Message } from '../../../types';
import { TextType } from '../../UI/TextType';
import { Tooltip } from '../../UI/Tooltip';
import { FilePreviewSidebar } from './FilePreviewSidebar';
import { AttachedFilePreview } from './AttachedFilePreview';

type MessageFormProps = {
  onSubmit: (message: string, files?: File[], options?: { isHidden?: boolean; isThinkingModeEnabled?: boolean; }) => void;
  isLoading: boolean;
  isAppLoading: boolean;
  backendStatus: 'online' | 'offline' | 'checking';
  onCancel: () => void;
  isAgentMode: boolean;
  setIsAgentMode: (isAgent: boolean) => void;
  messages: Message[];
  hasApiKey: boolean;
  ttsVoice: string;
  setTtsVoice: (voice: string) => void;
  currentChatId: string | null;
  activeModel: string;
};

export const MessageForm = forwardRef<MessageFormHandle, MessageFormProps>((props, ref) => {
  const { 
    onSubmit, isLoading, isAppLoading, backendStatus, onCancel, 
    isAgentMode, setIsAgentMode, hasApiKey 
  } = props;

  const logic = useMessageForm(
    (msg, files, options) => onSubmit(msg, files, { ...options, isThinkingModeEnabled: isAgentMode }),
    isLoading,
    ref,
    props.messages,
    isAgentMode,
    hasApiKey
  );

  const isGeneratingResponse = isLoading;
  const isSendDisabled = !logic.canSubmit || isAppLoading || backendStatus === 'offline';
  const hasFiles = logic.processedFiles.length > 0;

  return (
    <div className="w-full mx-auto max-w-4xl relative">
      <VoiceVisualizer isRecording={logic.isRecording} />

      <AnimatePresence>
        {logic.isUploadMenuOpen && (
          <UploadMenu 
            menuRef={logic.uploadMenuRef}
            onFileClick={() => logic.fileInputRef.current?.click()}
            onFolderClick={() => logic.folderInputRef.current?.click()}
          />
        )}
      </AnimatePresence>

      {/* Content Preview Sidebar (Desktop) / Modal (Mobile) */}
      <FilePreviewSidebar 
        isOpen={!!logic.previewFile}
        onClose={() => logic.setPreviewFile(null)}
        file={logic.previewFile}
      />

      <input
        type="file"
        ref={logic.fileInputRef}
        onChange={logic.handleFileChange}
        className="hidden"
        multiple
      />
      <input
        type="file"
        ref={logic.folderInputRef}
        onChange={logic.handleFileChange}
        className="hidden"
        multiple
        {...({ webkitdirectory: "", directory: "" } as any)}
      />

      <div className={`
        relative bg-transparent border transition-all duration-200 rounded-2xl overflow-hidden shadow-sm flex flex-col
        ${logic.isFocused ? 'border-primary-main shadow-md ring-1 ring-primary-main/20' : 'border-border-default hover:border-border-strong'}
      `}>
        
        {/* File List Area - Moved "Input Bar Top" */}
        <AnimatePresence>
            {hasFiles && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-nowrap overflow-x-auto gap-2 px-3 pb-3 pt-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 scrollbar-hide"
                    onWheel={(e) => {
                        if (e.deltaY !== 0) {
                            e.currentTarget.scrollLeft += e.deltaY;
                        }
                    }}
                >
                    {logic.processedFiles.map(file => (
                        <AttachedFilePreview
                            key={file.id}
                            file={file.file}
                            onRemove={() => logic.handleRemoveFile(file.id)}
                            onPreview={() => logic.setPreviewFile(file)}
                            progress={file.progress}
                            error={file.error}
                        />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>

        {/* Text Input */}
        <div className="flex flex-col relative flex-1">
            {/* Animated Placeholder Overlay */}
            {!logic.inputValue && (
               <div className="absolute inset-0 px-4 py-4 pointer-events-none select-none opacity-50 z-0 overflow-hidden">
                  <TextType 
                    text={logic.placeholder} 
                    className="text-content-tertiary text-base leading-relaxed"
                    loop 
                    cursorCharacter="|"
                    typingSpeed={30}
                    deletingSpeed={15}
                    pauseDuration={4000}
                  />
               </div>
            )}
            
            <textarea
                ref={logic.inputRef}
                value={logic.inputValue}
                onChange={(e) => logic.setInputValue(e.target.value)}
                onKeyDown={logic.handleKeyDown}
                onPaste={logic.handlePaste}
                onFocus={() => logic.setIsFocused(true)}
                onBlur={() => logic.setIsFocused(false)}
                disabled={isGeneratingResponse}
                rows={1}
                className="w-full bg-transparent text-content-primary px-4 py-4 max-h-[120px] focus:outline-none resize-none overflow-y-auto leading-relaxed custom-scrollbar placeholder:text-transparent z-10"
                style={{ minHeight: '3.5rem' }}
            />
        </div>

        {/* Bottom Toolbar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-3 relative z-10 bg-transparent">
            <div className="flex items-center gap-1">
                {/* Upload Button */}
                <Tooltip content="Attach files" position="top">
                    <button
                        ref={logic.attachButtonRef}
                        onClick={() => logic.setIsUploadMenuOpen(!logic.isUploadMenuOpen)}
                        disabled={isGeneratingResponse}
                        className="relative p-2 rounded-xl text-content-secondary hover:text-content-primary hover:bg-layer-3 transition-colors disabled:opacity-50"
                        aria-label="Attach files"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                    </button>
                </Tooltip>
                
                {/* Agent Mode Toggle */}
                <Tooltip content={isAgentMode ? "Switch to Chat Mode" : "Switch to Agent Mode"} position="top">
                    <div>
                        <ModeToggle 
                            isAgentMode={isAgentMode} 
                            onToggle={setIsAgentMode} 
                            disabled={isGeneratingResponse} 
                        />
                    </div>
                </Tooltip>
            </div>

            <div className="flex items-center gap-2">
                {/* Voice Input */}
                <Tooltip content="Voice Input" position="top">
                    <button
                        onClick={logic.handleMicClick}
                        disabled={isGeneratingResponse || !logic.isSupported}
                        className={`
                            p-2 rounded-xl transition-colors disabled:opacity-50
                            ${logic.isRecording 
                                ? 'bg-red-500/10 text-red-500 animate-pulse' 
                                : 'text-content-secondary hover:text-content-primary hover:bg-layer-3'
                            }
                        `}
                        aria-label="Voice input"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="22" />
                        </svg>
                    </button>
                </Tooltip>

                {/* Prompt Enhancer */}
                <Tooltip content="Enhance Prompt" position="top">
                    <button
                        onClick={logic.handleEnhancePrompt}
                        disabled={isGeneratingResponse || !logic.inputValue.trim() || logic.isEnhancing}
                        className={`
                            p-2 rounded-xl transition-all duration-300 disabled:opacity-50
                            ${logic.isEnhancing 
                                ? 'text-primary-main bg-primary-subtle' 
                                : 'text-content-secondary hover:text-primary-main hover:bg-layer-3'
                            }
                        `}
                        aria-label="Enhance prompt"
                    >
                        {logic.isEnhancing ? (
                            <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                                <path d="M5 3v4" />
                                <path d="M9 5H3" />
                                <path d="M20 21h-4" />
                                <path d="M18 19v4" />
                            </svg>
                        )}
                    </button>
                </Tooltip>

                {/* Send/Stop Button */}
                <Tooltip content={isGeneratingResponse ? "Stop generating" : "Send message"} position="top">
                    <motion.button
                        type="button"
                        onClick={isGeneratingResponse ? onCancel : logic.handleSubmit}
                        disabled={!isGeneratingResponse && isSendDisabled}
                        aria-label={isGeneratingResponse ? "Stop generating" : "Send message"}
                        className={`
                            w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm group
                            ${isGeneratingResponse 
                                ? 'bg-layer-1 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800' 
                                : isSendDisabled 
                                    ? 'bg-layer-3 text-content-tertiary cursor-not-allowed shadow-none' 
                                    : 'bg-primary-main text-text-inverted hover:bg-primary-hover hover:scale-105 hover:shadow-md'
                            }
                        `}
                        whileTap={{ scale: 0.95 }}
                    >
                        {isGeneratingResponse ? ( 
                            <div className="relative w-6 h-6 flex items-center justify-center">
                                {/* Loading Spinner - Fades out on hover */}
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-full h-full transition-opacity duration-200 group-hover:opacity-0">
                                    <circle cx="24" cy="24" r="16" fill="none" stroke="#4f46e5" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="80 100" strokeDashoffset="0">
                                        <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="2.5s" repeatCount="indefinite" />
                                        <animate attributeName="stroke-dashoffset" values="0; -180" dur="2.5s" repeatCount="indefinite" />
                                        <animate attributeName="stroke" dur="10s" repeatCount="indefinite" values="#f87171; #fb923c; #facc15; #4ade80; #22d3ee; #3b82f6; #818cf8; #e879f9; #f472b6; #f87171" />
                                    </circle>
                                </svg>
                                {/* Stop Icon - Fades in on hover */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-500">
                                        <rect x="6" y="6" width="12" height="12" rx="2" />
                                    </svg>
                                </div>
                            </div>
                        ) : ( 
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
                                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                            </svg>
                        )}
                    </motion.button>
                </Tooltip>
            </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex justify-center items-center pt-3 pb-0">
          <motion.p 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-[11px] font-medium text-content-tertiary/70 select-none"
          >
             Agentic AI can make mistakes.
          </motion.p>
      </div>
    </div>
  );
});
