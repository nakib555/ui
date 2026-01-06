
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// This hook manages all logic related to file attachments for the message form.
// It includes processing, progress tracking, removal, and draft saving/restoration.

import React, { useState, useRef, useEffect, useCallback, useImperativeHandle } from 'react';
import { fileToBase64WithProgress, base64ToFile } from '../../../utils/fileUtils';
import { type MessageFormHandle, type SavedFile, type ProcessedFile, type FileWithEditKey } from './types';

export const useFileHandling = (ref: React.ForwardedRef<MessageFormHandle>) => {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processAndSetFiles = useCallback((filesToProcess: FileWithEditKey[]) => {
    const newProcessedFiles: ProcessedFile[] = filesToProcess.map(file => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      base64Data: null,
      error: null,
    }));

    setProcessedFiles(prev => [...prev, ...newProcessedFiles]);

    newProcessedFiles.forEach(pf => {
      fileToBase64WithProgress(pf.file, (progress) => {
        setProcessedFiles(prev => prev.map(f => f.id === pf.id ? { ...f, progress } : f));
      })
      .then(base64Data => {
        setProcessedFiles(prev => prev.map(f => f.id === pf.id ? { ...f, base64Data, progress: 100 } : f));
      })
      .catch(error => {
        console.error("File processing error:", error);
        setProcessedFiles(prev => prev.map(f => f.id === pf.id ? { ...f, error: error.message || 'Failed to read file' } : f));
      });
    });
  }, []);

  useImperativeHandle(ref, () => ({
    attachFiles: (incomingFiles: File[]) => {
      if (!incomingFiles || incomingFiles.length === 0) return;
      
      const newFilesToAdd: FileWithEditKey[] = [];
      const existingEditKeys = new Set(processedFiles.map(pf => pf.file._editKey).filter(Boolean));

      for (const file of incomingFiles) {
        const editableFile = file as FileWithEditKey;
        if (editableFile._editKey) {
          if (existingEditKeys.has(editableFile._editKey)) {
            alert('This image is already attached for editing.');
            continue;
          }
        }
        newFilesToAdd.push(editableFile);
      }
      
      if (newFilesToAdd.length > 0) {
        processAndSetFiles(newFilesToAdd);
      }
    }
  }));

  // Restore file drafts from localStorage on initial load
  useEffect(() => {
    try {
        const savedFilesJSON = localStorage.getItem('messageDraft_files');
        if (savedFilesJSON) {
          const savedFiles: SavedFile[] = JSON.parse(savedFilesJSON);
          if (Array.isArray(savedFiles)) {
            const restoredFiles: ProcessedFile[] = savedFiles.map(sf => {
              const file = base64ToFile(sf.data, sf.name, sf.mimeType);
              return {
                id: `${file.name}-${file.size}-${Date.now()}`,
                file, progress: 100, base64Data: sf.data, error: null,
              };
            });
            setProcessedFiles(restoredFiles);
          }
        }
    } catch (error) {
        console.error("Failed to parse or restore saved files:", error);
        try {
            localStorage.removeItem('messageDraft_files');
        } catch (e) { /* ignore */ }
    }
  }, []);

  // Save file drafts to localStorage
  useEffect(() => {
    try {
        const filesToSave: SavedFile[] = processedFiles.filter(pf => pf.base64Data).map(pf => ({ name: pf.file.name, mimeType: pf.file.type, data: pf.base64Data! }));
        if (filesToSave.length > 0) {
            try {
                localStorage.setItem('messageDraft_files', JSON.stringify(filesToSave));
            } catch (error) {
                 if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                  // alert('Draft files are too large for localStorage and were not saved. Your text has been saved.');
                } else {
                  console.error("Error saving files for draft:", error);
                }
            }
        } else {
            localStorage.removeItem('messageDraft_files');
        }
    } catch (e) { /* ignore */ }
  }, [processedFiles]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) processAndSetFiles(Array.from(event.target.files));
    event.target.value = ''; // Reset input to allow re-selecting the same file
  };

  const handleRemoveFile = (id: string) => {
    setProcessedFiles(prev => prev.filter((pf) => pf.id !== id));
  };
  
  const getFilesToSend = (): File[] => {
    return processedFiles
      .filter(f => f.base64Data && !f.error)
      .map(f => base64ToFile(f.base64Data!, f.file.name, f.file.type));
  };
  
  const clearFiles = () => {
    setProcessedFiles([]);
  };

  return {
    processedFiles,
    fileInputRef,
    folderInputRef,
    processAndSetFiles,
    handleFileChange,
    handleRemoveFile,
    getFilesToSend,
    clearFiles,
  };
};
