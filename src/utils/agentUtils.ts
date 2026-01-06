/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const COLORS = [
  // A palette of Tailwind CSS classes for agent identification
  { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-500/50' },
  { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-700 dark:text-green-300', border: 'border-green-500/50' },
  { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-500/50' },
  { bg: 'bg-pink-100 dark:bg-pink-900/50', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-500/50' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/50', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-500/50' },
  { bg: 'bg-teal-100 dark:bg-teal-900/50', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-500/50' },
];

/**
 * Generates a consistent color pairing for an agent name.
 * @param agentName The name of the agent.
 * @returns An object with Tailwind CSS classes for background, text, and border.
 */
export const getAgentColor = (agentName: string) => {
  // Simple hash function to get a number from the string
  let hash = 0;
  for (let i = 0; i < agentName.length; i++) {
    hash = agentName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % COLORS.length);
  return COLORS[index];
};