/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

type StyledLinkProps = {
  href?: string;
  children: React.ReactNode;
};

export const StyledLink: React.FC<StyledLinkProps> = ({ href, children }) => {
  return (
    <a
      href={href}
      target="_blank" // Open in a new tab
      rel="noopener noreferrer" // Security measure
      className="text-indigo-500 dark:text-indigo-400 font-medium hover:text-indigo-600 dark:hover:text-indigo-300 underline decoration-indigo-500/40 hover:decoration-indigo-600/60 dark:decoration-indigo-400/40 dark:hover:decoration-indigo-300/60 decoration-wavy underline-offset-4 transition-colors"
      title={`Opens external link: ${href}`}
    >
      {children}
    </a>
  );
};