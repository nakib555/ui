/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Converts a File object to a base64 encoded string, stripping the data URL prefix.
 * @param file The file to convert.
 * @returns A promise that resolves with the base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // result is "data:mime/type;base64,the-base64-string"
      // we need to strip the prefix
      const base64String = result.split(',')[1];
      if (base64String) {
        resolve(base64String);
      } else {
        reject(new Error("Failed to read file as base64 string."));
      }
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Converts a File object to a base64 encoded string with progress reporting.
 * @param file The file to convert.
 * @param onProgress A callback function that receives progress from 0 to 100.
 * @returns A promise that resolves with the base64 string (without the data URL prefix).
 */
export const fileToBase64WithProgress = (
  file: File,
  onProgress: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };
    
    reader.readAsDataURL(file);
    
    reader.onload = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      if (base64String) {
        onProgress(100); // Ensure it completes at 100%
        resolve(base64String);
      } else {
        reject(new Error("Failed to read file as base64 string."));
      }
    };
    
    reader.onerror = error => reject(error);
  });
};


/**
 * Converts a base64 string back into a File object.
 * @param base64 The base64 encoded string (without the data URL prefix).
 * @param filename The name of the file.
 * @param mimeType The MIME type of the file.
 * @returns A File object.
 */
export const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
};

/**
 * Converts a base64 string to a Blob object.
 * @param base64 The base64 string (without the data URL prefix).
 * @param mimeType The MIME type of the resulting blob.
 * @returns A Blob object.
 */
export const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};
