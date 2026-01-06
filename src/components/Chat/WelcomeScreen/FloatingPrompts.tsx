/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion as motionTyped } from 'framer-motion';
import { PromptButton, type PromptColor } from './PromptButton';
const motion = motionTyped as any;

type FloatingPromptsProps = {
  onPromptClick: (prompt: string, options?: { isThinkingModeEnabled?: boolean }) => void;
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.4,
        staggerChildren: 0.08,
      },
    },
};

const PROMPTS: { icon: string; text: string; prompt: string; color: PromptColor, agent?: boolean }[] = [
    { icon: "🧠", text: "Reasoning", prompt: "What is the capital of France?", color: "violet" },
    { icon: "🎬", text: "Video", prompt: "Generate a video of a cat playing a piano.", color: "rose", agent: true },
    { icon: "🎨", text: "Image", prompt: "Generate an image of a robot eating spaghetti.", color: "fuchsia", agent: true },
    { icon: "🗺️", text: "Map", prompt: "Show me a map of the Eiffel Tower.", color: "emerald", agent: true },
    { icon: "🤔", text: "MCQ", prompt: "Ask me a multiple choice question about physics.", color: "amber" },
    { icon: "📍", text: "Nearby", prompt: "Find coffee shops near me.", color: "blue", agent: true },
    { icon: "📊", text: "Table", prompt: "Create a markdown table comparing the features of Gemini 2.5 Pro and Gemini 2.5 Flash.", color: "indigo" },
    { icon: "📝", text: "Markdown", prompt: "Show me a comprehensive example of all the markdown formatting you support.", color: "teal" },
];

export const FloatingPrompts = ({ onPromptClick }: FloatingPromptsProps) => (
  <motion.div
    variants={containerVariants}
    initial="hidden"
    animate="visible"
    exit="hidden"
    className="flex flex-wrap justify-center gap-3 w-full max-w-4xl mx-auto"
  >
    {PROMPTS.map((p, i) => (
        <PromptButton 
            key={i} 
            icon={p.icon} 
            text={p.text} 
            color={p.color}
            onClick={() => onPromptClick(p.prompt, { isThinkingModeEnabled: !!p.agent })} 
        />
    ))}
  </motion.div>
);