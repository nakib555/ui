
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion as motionTyped } from 'framer-motion';
import { Logo } from '../UI/Logo'; 
import { Tooltip } from '../UI/Tooltip';
const motion = motionTyped as any;

type SidebarHeaderProps = {
  isCollapsed: boolean;
  isDesktop: boolean;
  setIsOpen: (isOpen: boolean) => void;
  setIsCollapsed: (collapsed: boolean) => void;
};

export const SidebarHeader = ({ isCollapsed, isDesktop, setIsOpen, setIsCollapsed }: SidebarHeaderProps) => {
  const shouldCollapse = isDesktop && isCollapsed;
  
  return (
    <div className={`flex items-center mb-6 mt-4 flex-shrink-0 ${shouldCollapse ? 'justify-center' : 'justify-between px-4'}`}>
      <div className="flex items-center gap-3 select-none">
          <div className="flex-shrink-0">
             <Logo className="w-10 h-10" />
          </div>
          
          <motion.span 
              className="font-bold text-xl text-slate-800 dark:text-slate-100 font-['Space_Grotesk'] tracking-tight whitespace-nowrap overflow-hidden"
              initial={false}
              animate={{ width: shouldCollapse ? 0 : 'auto', opacity: shouldCollapse ? 0 : 1 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
              Agentic AI
          </motion.span>
      </div>
      
      {/* Desktop Toggle Button */}
      {isDesktop && !shouldCollapse && (
        <Tooltip content="Collapse Sidebar" position="bottom" delay={600}>
            <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-gray-200/50 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Collapse sidebar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><path d="M17 16l-4-4 4-4"></path></svg>
            </button>
        </Tooltip>
      )}

      {/* Desktop Expand Trigger (Only visible in collapsed mode header if needed, but usually header is just logo) */}
      {isDesktop && shouldCollapse && (
         <Tooltip content="Expand Sidebar" position="right">
            <button
                onClick={() => setIsCollapsed(false)}
                className="absolute top-4 left-1/2 -translate-x-1/2 mt-12 p-1.5 rounded-lg text-slate-400 hover:bg-gray-200/50 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Expand sidebar"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><path d="M13 16l4-4-4-4"></path></svg>
            </button>
        </Tooltip>
      )}
      
      {/* Mobile Close Button */}
      <button
          onClick={() => setIsOpen(false)}
          className="md:hidden p-2 -mr-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
          aria-label="Close sidebar"
      >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
};
