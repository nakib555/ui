
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence, motion as motionTyped } from 'framer-motion';
const motion = motionTyped as any;
import { WorkflowNode } from './WorkflowNode';
import { WorkflowNodeData } from '../../types';

type ThinkingWorkflowProps = {
  nodes: WorkflowNodeData[];
  sendMessage: (message: string, files?: File[], options?: { isHidden?: boolean; isThinkingModeEnabled?: boolean; }) => void;
  onRegenerate?: (messageId: string) => void;
  messageId?: string;
};

export const ThinkingWorkflow: React.FC<ThinkingWorkflowProps> = ({
  nodes,
  sendMessage,
  onRegenerate,
  messageId,
}) => {
  return (
    <div className="font-['Inter',_sans-serif] w-full">
        <div className="relative space-y-4">
            {nodes.map((node, index) => {
                const isLast = index === nodes.length - 1;
                const isFirst = index === 0;

                return (
                    <div key={node.id} className="group relative flex gap-4">
                        {/* Connector Line Logic - Only draw if not last */}
                        {!isLast && (
                            <div className="absolute top-8 left-[15px] bottom-[-24px] w-px bg-slate-200 dark:bg-white/10" />
                        )}

                        {/* Status Node/Icon */}
                        <div className="relative z-10 flex-shrink-0 mt-1">
                            <StatusIndicator status={node.status} type={node.type} />
                        </div>

                        {/* Content Column */}
                        <div className="flex-1 min-w-0">
                            <AnimatePresence mode="popLayout">
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <WorkflowNode 
                                        node={node} 
                                        sendMessage={sendMessage} 
                                        onRegenerate={onRegenerate} 
                                        messageId={messageId}
                                        isLast={isLast}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};

// --- Sub-component for the Timeline Icon ---

const StatusIndicator = ({ status, type }: { status: string; type: string }) => {
    // Plan steps get a special clipboard look
    if (type === 'plan') {
        return (
            <div className={`w-8 h-8 flex items-center justify-center rounded-lg border bg-white dark:bg-[#1e1e1e] ${status === 'done' ? 'border-indigo-200 text-indigo-600 dark:border-indigo-500/30 dark:text-indigo-400' : 'border-slate-200 text-slate-400 dark:border-white/10'}`}>
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M8 1a2 2 0 0 0-2 2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2-2Zm0 1.5a.5.5 0 0 1 .5.5v.5h-1V3a.5.5 0 0 1 .5-.5Z" /></svg>
            </div>
        );
    }

    switch (status) {
        case 'active': 
            return (
                <div className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400">
                    <span className="absolute inline-flex h-full w-full rounded-lg bg-indigo-400 opacity-20 animate-ping"></span>
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
            );
        case 'done': 
            return (
                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                </div>
            );
        case 'failed': 
            return (
                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </div>
            );
        default: 
            return (
                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-300 dark:text-slate-600">
                    <div className="w-2 h-2 rounded-full bg-current" />
                </div>
            );
    }
};
