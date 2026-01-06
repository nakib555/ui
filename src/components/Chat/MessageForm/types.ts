/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Define a handle type for the methods we want to expose via the ref.
export type MessageFormHandle = {
  attachFiles: (files: File[]) => void;
};

export type SavedFile = {
  name: string;
  mimeType: string;
  data: string; // base64
};

// A custom File type to make TypeScript happy with our custom property.
export interface FileWithEditKey extends File {
  _editKey?: string;
}

export type ProcessedFile = {
  id: string;
  file: FileWithEditKey;
  progress: number;
  base64Data: string | null;
  error: string | null;
};