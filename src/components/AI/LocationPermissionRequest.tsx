
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion as motionTyped } from 'framer-motion';

const motion = motionTyped as any;

const LoadingDots = () => (
    <div className="flex gap-1 items-center">
        <motion.div className="w-1.5 h-1.5 bg-slate-400 rounded-full" animate={{ y: [0, -2, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0 }} />
        <motion.div className="w-1.5 h-1.5 bg-slate-400 rounded-full" animate={{ y: [0, -2, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }} />
        <motion.div className="w-1.5 h-1.5 bg-slate-400 rounded-full" animate={{ y: [0, -2, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }} />
    </div>
);

const ResultDisplay: React.FC<{ text: string, type: 'success' | 'error' }> = ({ text, type }) => {
    const Icon = type === 'success' 
      ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 text-green-400"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" /></svg>
      : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 text-red-400"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" /></svg>;

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg text-sm text-slate-300"
        >
          {Icon}
          <p>{text}</p>
        </motion.div>
    );
}

export const LocationPermissionRequest: React.FC<{ 
    text: string;
    sendMessage: (message: string, files?: File[], options?: { isHidden?: boolean; isThinkingModeEnabled?: boolean; }) => void;
}> = ({ text, sendMessage }) => {
  const [status, setStatus] = useState<'idle' | 'pending' | 'granted' | 'denied'>('idle');

  const onPermissionResult = (resultText: string) => {
    sendMessage(resultText, undefined, { isHidden: true });
  };

  const handleAllow = () => {
    setStatus('pending');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onPermissionResult(`(User has granted location access) My location is: Latitude ${latitude.toFixed(4)}, Longitude ${longitude.toFixed(4)}.`);
        setStatus('granted');
      },
      (error) => {
        onPermissionResult("(User has denied location access again) I was unable to get the location as permission was denied again.");
        setStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleDeny = () => {
    onPermissionResult("(User has denied location access) I have denied the location permission request.");
    setStatus('denied');
  };

  if (status === 'granted') {
    return <ResultDisplay text="Permission granted. I will now continue with your request." type="success" />;
  }

  if (status === 'denied') {
    return <ResultDisplay text="Permission denied. I cannot proceed without your location." type="error" />;
  }

  if (status === 'pending') {
      return (
        <div className="flex items-center gap-2 text-sm p-3 text-slate-400">
            <span>Waiting for permission...</span>
            <LoadingDots />
        </div>
      );
  }

  return (
    <div className="p-3 bg-slate-700/50 rounded-lg text-sm">
      <p className="text-slate-200 mb-3">{text}</p>
      <div className="flex gap-2">
        <button 
            onClick={handleAllow} 
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md transition-colors text-xs"
        >
            Allow
        </button>
        <button 
            onClick={handleDeny} 
            className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-md transition-colors text-xs"
        >
            Deny
        </button>
      </div>
    </div>
  );
};
