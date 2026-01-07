/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// This is the simplified main hook for the MessageForm component.
// It composes smaller, more focused hooks for file handling and input enhancements.

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { type MessageFormHandle, type ProcessedFile } from './types';
import { useFileHandling } from './useFileHandling';
import { useInputEnhancements } from './useInputEnhancements';
import type { Message } from '../../../types';
import { usePlaceholder } from '../../../hooks/usePlaceholder';

export const useMessageForm = (
  onSubmit: (message: string, files?: File[], options?: { isThinkingModeEnabled?: boolean }) => void,
  isLoading: boolean,
  ref: React.ForwardedRef<MessageFormHandle>,
  messages: Message[],
  isAgentMode: boolean,
  hasApiKey: boolean,
  onFocusChange?: (focused: boolean) => void
) => {
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [isFocused, setIsFocusedState] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProcessedFile | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);

  const fileHandling = useFileHandling(ref);
  const enhancements = useInputEnhancements(inputValue, setInputValue, fileHandling.processedFiles.length > 0, onSubmit);
  
  const setIsFocused = (focused: boolean) => {
      setIsFocusedState(focused);
      if (onFocusChange) onFocusChange(focused);
  };

  const lastMessageText = useMemo(() => {
    const lastVisibleMessage = messages.filter(m => !m.isHidden).pop();
    if (!lastVisibleMessage) return '';
    if (lastVisibleMessage.role === 'model') {
        const activeResponse = lastVisibleMessage.responses?.[lastVisibleMessage.activeResponseIndex];
        return activeResponse?.text || '';
    }
    return lastVisibleMessage.text || '';
  }, [messages]);

  const placeholder = usePlaceholder(!inputValue.trim() && !isFocused, lastMessageText, isAgentMode, hasApiKey);

  useEffect(() => {
    // Restore text draft from local storage on initial load
    try {
        const savedText = localStorage.getItem('messageDraft_text');
        if (savedText) {
          setInputValue(savedText);
        }
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    // Save text draft to local storage
    try {
        if (inputValue.trim() || fileHandling.processedFiles.length > 0) {
          localStorage.setItem('messageDraft_text', inputValue);
        } else {
          localStorage.removeItem('messageDraft_text');
        }
    } catch (e) { /* ignore */ }
  }, [inputValue, fileHandling.processedFiles.length]);
  
  // Handle automatic resizing of the input area
  useLayoutEffect(() => {
    const element = inputRef.current;
    if (!element) return;

    const shadow = document.createElement('textarea');
    const computed = window.getComputedStyle(element);

    shadow.value = inputValue;
    shadow.style.width = computed.width;
    shadow.style.padding = computed.padding;
    shadow.style.border = computed.border;
    shadow.style.fontSize = computed.fontSize;
    shadow.style.fontFamily = computed.fontFamily;
    shadow.style.fontWeight = computed.fontWeight;
    shadow.style.lineHeight = computed.lineHeight;
    shadow.style.letterSpacing = computed.letterSpacing;
    shadow.style.boxSizing = computed.boxSizing;
    
    shadow.style.position = 'absolute';
    shadow.style.visibility = 'hidden';
    shadow.style.top = '-9999px';
    shadow.style.left = '-9999px';
    shadow.style.overflow = 'hidden';
    shadow.style.height = '0';
    shadow.style.minHeight = '0';

    document.body.appendChild(shadow);
    const scrollHeight = shadow.scrollHeight;
    document.body.removeChild(shadow);

    // Increased max height to support better multi-line editing experience
    const MAX_HEIGHT_PX = 120;
    const SINGLE_LINE_THRESHOLD = 32; 
    
    setIsExpanded(scrollHeight > SINGLE_LINE_THRESHOLD || fileHandling.processedFiles.length > 0);
    
    if (scrollHeight > MAX_HEIGHT_PX) {
        element.style.height = `${MAX_HEIGHT_PX}px`;
        element.style.overflowY = 'auto';
    } else {
        element.style.height = `${scrollHeight}px`;
        element.style.overflowY = 'hidden';
    }
  }, [inputValue, fileHandling.processedFiles.length]);

  // Handle clicks outside the upload menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isUploadMenuOpen && attachButtonRef.current && !attachButtonRef.current.contains(event.target as Node) && uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) {
        setIsUploadMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUploadMenuOpen]);

  const clearDraft = () => {
    setInputValue('');
    fileHandling.clearFiles(); 
    setPreviewFile(null);
    try {
        localStorage.removeItem('messageDraft_text');
        localStorage.removeItem('messageDraft_files');
    } catch (e) { /* ignore */ }
  };

  // Centralized Validation Logic
  const isProcessingFiles = fileHandling.processedFiles.some(f => f.progress < 100 && !f.error);
  // Ensure we check for trimmed content OR files.
  const hasContent = inputValue.trim().length > 0 || fileHandling.processedFiles.length > 0;
  
  const canSubmit = hasContent && !isLoading && !enhancements.isEnhancing && !isProcessingFiles;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (enhancements.isRecording) {
        enhancements.stopRecording();
    }
    
    if (!canSubmit) {
        return;
    }

    onSubmit(inputValue, fileHandling.getFilesToSend());
    clearDraft();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files?.length > 0) {
      e.preventDefault();
      fileHandling.processAndSetFiles(Array.from(e.clipboardData.files));
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // Only submit if valid, otherwise do nothing (prevent newline)
        if (canSubmit) {
            handleSubmit();
        }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (canSubmit) {
            handleSubmit();
        }
    }
  };

  return {
    inputValue, setInputValue,
    isExpanded, isUploadMenuOpen, setIsUploadMenuOpen,
    isFocused, setIsFocused,
    previewFile, setPreviewFile, // Exported state for sidebar
    placeholder,
    inputRef, attachButtonRef, uploadMenuRef,
    handleSubmit, handlePaste, handleKeyDown,
    canSubmit, // Export validation state
    isProcessingFiles,
    ...fileHandling,
    ...enhancements,
  };
};