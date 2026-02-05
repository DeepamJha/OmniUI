'use client';

import React, { useState } from 'react';
import type { Artifact } from './types';

/**
 * Artifact Action Definition
 */
export interface ArtifactAction {
    id: string;
    label: string;
    description?: string;
    prompt: string;  // What to send to AI
    icon?: string;
    variant?: 'primary' | 'secondary' | 'danger';
}

/**
 * Generate contextual actions for an artifact
 * Based on artifact type and current state
 */
export function generateArtifactActions(artifact: Artifact): ArtifactAction[] {
    const actions: ArtifactAction[] = [];

    switch (artifact.type) {
        case 'ExecutionPlan':
            actions.push(
                {
                    id: 'optimize-timeline',
                    label: 'Optimize timeline',
                    description: 'Adjust for faster completion',
                    prompt: `Optimize the timeline in execution plan ${artifact.id} to reduce total duration`,
                    icon: '⚡',
                    variant: 'primary',
                },
                {
                    id: 'add-checkpoints',
                    label: 'Add checkpoints',
                    description: 'Insert validation steps',
                    prompt: `Add validation checkpoints between major steps in plan ${artifact.id}`,
                    icon: '✓',
                },
                {
                    id: 'remove-risky',
                    label: 'Remove risky steps',
                    description: 'Filter high-risk items',
                    prompt: `Identify and remove high-risk steps from plan ${artifact.id}`,
                    icon: '⚠️',
                    variant: 'danger',
                }
            );

            // Check if there are dependencies
            if ((artifact.state as any).steps?.some((s: any) => s.dependencies)) {
                actions.push({
                    id: 'visualize-dependencies',
                    label: 'Show dependencies',
                    prompt: `Create a dependency graph for execution plan ${artifact.id}`,
                    icon: '🔗',
                });
            }
            break;

        case 'SystemStatusPanel':
            actions.push(
                {
                    id: 'create-alerts',
                    label: 'Generate alerts',
                    description: 'Create monitoring rules',
                    prompt: `Based on system status ${artifact.id}, create alert rules for degraded components`,
                    icon: '🔔',
                },
                {
                    id: 'remediation-plan',
                    label: 'Fix issues',
                    description: 'Create action plan',
                    prompt: `Create a remediation plan for unhealthy components in ${artifact.id}`,
                    icon: '🔧',
                    variant: 'primary',
                }
            );

            // If any components are unhealthy
            const hasIssues = (artifact.state as any).components?.some(
                (c: any) => c.status !== 'healthy' && c.status !== 'operational'
            );

            if (hasIssues) {
                actions.push({
                    id: 'incident-report',
                    label: 'Create incident report',
                    prompt: `Create an incident report based on issues in ${artifact.id}`,
                    icon: '📋',
                    variant: 'danger',
                });
            }
            break;

        case 'CommandResultPanel':
            actions.push(
                {
                    id: 'deep-dive',
                    label: 'Analyze deeper',
                    description: 'Get more details',
                    prompt: `Provide deeper analysis of the findings in result ${artifact.id}`,
                    icon: '🔍',
                },
                {
                    id: 'create-action-items',
                    label: 'Create tasks',
                    description: 'Convert to action items',
                    prompt: `Based on analysis ${artifact.id}, create an execution plan with action items`,
                    icon: '✅',
                    variant: 'primary',
                }
            );
            break;

        case 'RiskMatrix':
            actions.push(
                {
                    id: 'mitigation-plan',
                    label: 'Create mitigations',
                    description: 'Address high risks',
                    prompt: `Create mitigation strategies for high-priority risks in ${artifact.id}`,
                    icon: '🛡️',
                    variant: 'primary',
                },
                {
                    id: 'risk-report',
                    label: 'Export report',
                    description: 'Generate summary',
                    prompt: `Create an executive summary of risks in ${artifact.id}`,
                    icon: '📊',
                }
            );
            break;
    }

    // Universal actions for all artifacts
    actions.push(
        {
            id: 'explain',
            label: 'Explain this',
            description: 'Get context',
            prompt: `Explain the purpose and key findings of ${artifact.type} ${artifact.id}`,
            icon: '💡',
        },
        {
            id: 'export',
            label: 'Export',
            description: 'Download or share',
            prompt: `Prepare ${artifact.id} for export`,
            icon: '📤',
        }
    );

    return actions;
}

/**
 * Artifact Actions Panel Component
 */
export function ArtifactActionsPanel({
    artifact,
    onActionClick,
}: {
    artifact: Artifact;
    onActionClick: (action: ArtifactAction) => void;
}) {
    const actions = generateArtifactActions(artifact);

    // Group by variant
    const primaryActions = actions.filter(a => a.variant === 'primary');
    const secondaryActions = actions.filter(a => !a.variant || a.variant === 'secondary');
    const dangerActions = actions.filter(a => a.variant === 'danger');

    return (
        <div className="border-t border-white/5 pt-4 mt-4">
            <p className="text-xs text-gray-500 mb-3">Suggested actions</p>

            <div className="space-y-2">
                {/* Primary actions */}
                {primaryActions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {primaryActions.map(action => (
                            <ActionButton
                                key={action.id}
                                action={action}
                                onClick={() => onActionClick(action)}
                                variant="primary"
                            />
                        ))}
                    </div>
                )}

                {/* Secondary actions */}
                {secondaryActions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {secondaryActions.map(action => (
                            <ActionButton
                                key={action.id}
                                action={action}
                                onClick={() => onActionClick(action)}
                            />
                        ))}
                    </div>
                )}

                {/* Danger actions */}
                {dangerActions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {dangerActions.map(action => (
                            <ActionButton
                                key={action.id}
                                action={action}
                                onClick={() => onActionClick(action)}
                                variant="danger"
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Individual action button
 */
function ActionButton({
    action,
    onClick,
    variant = 'secondary',
}: {
    action: ArtifactAction;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
}) {
    const getStyles = () => {
        switch (variant) {
            case 'primary':
                return 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-blue-500/30';
            case 'danger':
                return 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border-red-500/30';
            default:
                return 'bg-white/5 text-gray-300 hover:bg-white/10 border-white/10';
        }
    };

    return (
        <button
            onClick={onClick}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${getStyles()}`}
            title={action.description}
        >
            {action.icon && <span className="mr-1">{action.icon}</span>}
            {action.label}
        </button>
    );
}

/**
 * Inline action trigger (small icon button)
 */
export function InlineActionTrigger({
    artifact,
    onActionClick,
}: {
    artifact: Artifact;
    onActionClick: (action: ArtifactAction) => void;
}) {
    const [showMenu, setShowMenu] = useState(false);
    const actions = generateArtifactActions(artifact).slice(0, 5); // Show top 5

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Quick actions"
            >
                ⚡
            </button>

            {showMenu && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-white/10 rounded-lg shadow-xl z-20 p-2">
                        <div className="space-y-1">
                            {actions.map(action => (
                                <button
                                    key={action.id}
                                    onClick={() => {
                                        onActionClick(action);
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        {action.icon && <span>{action.icon}</span>}
                                        <span className="text-sm text-white">{action.label}</span>
                                    </div>
                                    {action.description && (
                                        <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
