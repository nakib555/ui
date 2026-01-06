
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion as motionTyped, AnimatePresence } from 'framer-motion';
const motion = motionTyped as any;

type McqComponentProps = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

// Icon for correct feedback, matching the new design
const CorrectIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 text-green-400">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
);

// Icon for incorrect feedback, as seen in the new design
const IncorrectIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 text-red-400">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
    </svg>
);

export const McqComponent: React.FC<McqComponentProps> = ({ question, options, answer, explanation }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const isAnswered = selectedOption !== null;

  if (!options || !Array.isArray(options) || options.length === 0) {
      return (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-sm text-red-600 dark:text-red-400">
              Invalid MCQ data: Options are missing.
          </div>
      );
  }

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
  };
  
  const getOptionLetter = (index: number) => String.fromCharCode(65 + index);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="my-6 p-4 sm:p-6 bg-white dark:bg-[#202123] border border-gray-200 dark:border-transparent rounded-2xl text-gray-800 dark:text-slate-200 max-w-full w-full"
      role="region"
      aria-label="Multiple Choice Question"
    >
      <p className="font-semibold text-gray-900 dark:text-slate-100 mb-6 text-base leading-relaxed">{question}</p>
      <div className="flex flex-col gap-3">
        {options.map((option, index) => {
          const isSelected = selectedOption === option;
          const isCorrectAnswer = option === answer;
          
          let optionClasses = 'bg-gray-50 border border-gray-200 hover:bg-gray-100 dark:bg-[#2d2d2d] dark:border-transparent dark:hover:bg-[#3c3c3c]';
          if (isAnswered) {
             if (isSelected && isCorrectAnswer) {
                optionClasses = 'bg-transparent border border-green-500';
             } else if (isSelected && !isCorrectAnswer) {
                optionClasses = 'bg-transparent border border-red-500';
             } else if (isCorrectAnswer) {
                optionClasses = 'bg-transparent border border-green-500';
             } else {
                optionClasses = 'bg-gray-50 border border-gray-200 opacity-50 dark:bg-[#2d2d2d] dark:border-transparent dark:opacity-50';
             }
          }
          
          const showFeedback = isSelected;
          // In the case of a wrong answer, we also want to show the explanation on the correct option.
          const showCorrectAnswerFeedback = isCorrectAnswer && isAnswered && !isSelected;

          return (
            <motion.button
              key={index}
              onClick={() => handleSelect(option)}
              disabled={isAnswered}
              aria-pressed={isSelected}
              className={`text-left p-4 rounded-xl transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#202123] focus:ring-indigo-500 ${optionClasses} ${isAnswered ? 'cursor-default' : 'cursor-pointer'}`}
              layout
            >
                <div className="flex items-start gap-4">
                    <span className="font-medium text-gray-500 dark:text-slate-400 mt-0.5">{getOptionLetter(index)}.</span>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 dark:text-slate-200 break-words">{option}</p>
                        <AnimatePresence>
                            {(showFeedback || showCorrectAnswerFeedback) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex items-start gap-3">
                                        {isCorrectAnswer ? <CorrectIcon /> : <IncorrectIcon />}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold ${isCorrectAnswer ? 'text-green-400' : 'text-red-400'}`}>
                                                {isCorrectAnswer ? "Right answer" : "Not quite"}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-slate-300 mt-1.5 leading-relaxed break-words">{explanation}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};
