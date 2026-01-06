/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion as motionTyped } from 'framer-motion';
import { ManualCodeRenderer } from '../Markdown/ManualCodeRenderer';
import { WorkflowMarkdownComponents } from '../Markdown/markdownComponents';
import { GoalAnalysisIcon, PlannerIcon, TodoListIcon, ToolsIcon } from './icons';
import { getAgentColor } from '../../utils/agentUtils';

const motion = motionTyped as any;

type ExecutionApprovalProps = {
    plan: { plan: string }; // Relaxed type to handle plan object from backend
    onApprove: (editedPlan: string) => void;
    onDeny: () => void;
};

const PlanSection: React.FC<{ icon: React.ReactNode; title: string; content: string; }> = ({ icon, title, content }) => {
    if (!content) return null;
    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">{title}</h3>
            </div>
            <div className="pl-7 text-sm text-gray-600 dark:text-slate-400 workflow-markdown">
                <ManualCodeRenderer text={content} components={WorkflowMarkdownComponents} isStreaming={false} />
            </div>
        </div>
    );
};

const EditablePlanSection: React.FC<{ title: string, value: string, onChange: (value: string) => void }> = ({ title, value, onChange }) => (
    <div>
        <div className="flex items-center gap-2 mb-2">
            <TodoListIcon />
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">{title}</label>
        </div>
        <div className="pl-7">
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full min-h-[120px] p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-y"
                aria-label={`Edit ${title}`}
            />
        </div>
    </div>
);

export const ExecutionApproval: React.FC<ExecutionApprovalProps> = ({ plan, onApprove, onDeny }) => {
    const commanderColor = getAgentColor('Commander');
    const [isEditing, setIsEditing] = useState(false);

    const rawPlanText = plan.plan || '';
    const objectiveMatch = rawPlanText.match(/## Mission Objective\s*([\s\S]*?)(?=## Required Specialists|$)/s);
    const specialistsMatch = rawPlanText.match(/## Required Specialists\s*([\s\S]*?)(?=## Step-by-Step Plan|$)/s);
    const planMatch = rawPlanText.match(/## Step-by-Step Plan\s*([\s\S]*?)$/s);
    
    const originalObjective = objectiveMatch ? objectiveMatch[1].trim() : 'Not specified.';
    const originalSpecialists = specialistsMatch ? specialistsMatch[1].trim() : 'Not specified.';
    const originalPlan = planMatch ? planMatch[1].trim() : '';

    const [editedPlan, setEditedPlan] = useState(originalPlan);

    const handleApprove = () => {
        const fullEditedPlan = `
[AGENT: Commander]
## Mission Objective
${originalObjective}

## Required Specialists
${originalSpecialists}

## Step-by-Step Plan
${editedPlan}

[USER_APPROVAL_REQUIRED]
        `.trim();
        onApprove(fullEditedPlan);
    };

    const handleReset = () => {
        setEditedPlan(originalPlan);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col gap-4 p-4 rounded-xl bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10"
        >
            <div className="flex items-center gap-3">
                <PlannerIcon />
                <h2 className="font-semibold text-gray-800 dark:text-slate-200">Execution Plan</h2>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${commanderColor.bg} ${commanderColor.text}`}>
                    Commander
                </span>
            </div>
            
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-slate-400">
                    Review the proposed plan. You can edit the steps before approving.
                </p>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="px-3 py-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 rounded-md hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30">
                        Edit Plan
                    </button>
                )}
            </div>

            <div className="space-y-4 p-4 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-white/10">
                <PlanSection icon={<GoalAnalysisIcon />} title="Mission Objective" content={originalObjective} />
                <PlanSection icon={<ToolsIcon />} title="Required Specialists" content={originalSpecialists} />

                {isEditing ? (
                    <EditablePlanSection title="Step-by-Step Plan" value={editedPlan} onChange={setEditedPlan} />
                ) : (
                    <PlanSection icon={<TodoListIcon />} title="Step-by-Step Plan" content={editedPlan} />
                )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
                {isEditing && (
                    <button onClick={handleReset} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-200/50 dark:hover:bg-black/20 rounded-lg transition-colors">
                        Reset
                    </button>
                )}
                <button
                    onClick={onDeny}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleApprove}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                >
                    Approve & Continue
                </button>
            </div>
        </motion.div>
    );
};