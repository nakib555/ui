
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion as motionTyped } from 'framer-motion';
const motion = motionTyped as any;

export type PromptColor = 'violet' | 'rose' | 'fuchsia' | 'emerald' | 'amber' | 'blue' | 'indigo' | 'teal' | 'cyan' | 'slate';

export type PromptButtonProps = {
    icon: string;
    text: string;
    onClick: () => void;
    color?: PromptColor;
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
};

const colorStyles: Record<PromptColor, string> = {
    violet: "bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30",
    rose: "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:hover:bg-rose-900/30",
    fuchsia: "bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 dark:bg-fuchsia-900/20 dark:text-fuchsia-300 dark:hover:bg-fuchsia-900/30",
    emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30",
    amber: "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30",
    blue: "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30",
    indigo: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/30",
    teal: "bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-300 dark:hover:bg-teal-900/30",
    cyan: "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-300 dark:hover:bg-cyan-900/30",
    slate: "bg-white/60 text-slate-600 hover:bg-white/80 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
};

export const PromptButton: React.FC<PromptButtonProps> = ({ icon, text, onClick, color = 'slate' }) => {
    const colorClasses = colorStyles[color] || colorStyles.slate;

    return (
        <motion.button
            type="button"
            onClick={onClick}
            className={`
                group flex items-center justify-center gap-2 px-5 py-2 rounded-full md:shadow-sm backdrop-blur-sm transition-all duration-300
                ${colorClasses}
                hover:shadow-md hover:-translate-y-0.5
            `}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <span className="text-lg filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300">{icon}</span>
            <span className="text-sm font-semibold tracking-wide whitespace-nowrap">{text}</span>
        </motion.button>
    );
};
