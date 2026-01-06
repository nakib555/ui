
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion as motionTyped } from 'framer-motion';

const motion = motionTyped as any;

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, disabled }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-[#202123] ${checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-700'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      disabled={disabled}
    >
      <span className="sr-only">Use setting</span>
      <motion.span
        aria-hidden="true"
        layout
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
};
