'use client';

import React, { useState, useMemo } from 'react';
import { useArtifactStore, useArtifactHydration } from '@/lib/artifacts/store';
import type { Artifact, Mutation } from '@/lib/artifacts/types';
import { EditableSelect } from '@/lib/artifacts/inline-editing';
import { ArtifactActionsPanel, generateArtifactActions } from '@/lib/artifacts/artifact-actions';

interface ArtifactCanvasProps {
    onAction?: (prompt: string) => void;
}

/**
 * Canvas with proper hydration and empty state handling
 */
export function ArtifactCanvas({ onAction }: ArtifactCanvasProps = {}) {
    const hasHydrated = useArtifactHydration();
    const artifacts = useArtifactStore((state) => state.artifacts);

    // Sort by creation time (oldest first)
    const artifactIds = useMemo(() => {
        return Object.keys(artifacts).sort((a, b) => {
            return artifacts[a].createdAt - artifacts[b].createdAt;
        });
    }, [artifacts]);

    // While hydrating, show loading
    if (!hasHydrated) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm">Loading workspace...</p>
                </div>
            </div>
        );
    }

    // After hydration, if no artifacts exist, show empty state
    if (artifactIds.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-gray-400 text-lg mb-2">No artifacts yet</p>
                    <p className="text-gray-600 text-sm">
                        Describe a task to generate workspace components
                    </p>
                </div>
            </div>
        );
    }

    // Render artifacts
    return (
        <div className="space-y-6">
            {artifactIds.map(id => (
                <ArtifactRenderer key={id} artifactId={id} onAction={onAction} />
            ))}
        </div>
    );
}

/**
 * Mutation History Dropdown Component 
 */
function MutationHistoryDropdown({ artifactId, currentVersion }: { artifactId: string; currentVersion: number }) {
    const [isOpen, setIsOpen] = useState(false);
    // Get all mutations once (stable reference)
    const allMutations = useArtifactStore((state) => state.mutations);
    const undoLastMutation = useArtifactStore((state) => state.undoLastMutation);
    // Filter with useMemo to avoid infinite loop
    const mutations = useMemo(() =>
        allMutations.filter(m => m.artifactId === artifactId),
        [allMutations, artifactId]
    );

    if (mutations.length === 0 && currentVersion === 1) return null;

    const handleUndo = () => {
        const success = undoLastMutation(artifactId);
        if (success) {
            console.log(`✅ Undid last mutation on ${artifactId}`);
        }
    };

    return (
        <div className="relative flex items-center gap-2">
            {/* Version Badge with Dropdown */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors text-xs"
            >
                <span className="text-purple-400">v{currentVersion}</span>
                {mutations.length > 0 && (
                    <span className="text-gray-500">({mutations.length} changes)</span>
                )}
                <svg className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Undo Button */}
            {mutations.length > 0 && (
                <button
                    onClick={handleUndo}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors text-xs text-yellow-400"
                    title="Undo last change"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Undo
                </button>
            )}

            {/* Dropdown Menu */}
            {isOpen && mutations.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-72 rounded-xl bg-zinc-900 border border-white/10 shadow-xl z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-white/5">
                        <p className="text-xs text-gray-500 font-medium">Mutation History</p>
                    </div>
                    <div className="max-h-48 overflow-auto">
                        {mutations.slice().reverse().map((mutation, i) => (
                            <MutationHistoryItem key={mutation.id} mutation={mutation} isLatest={i === 0} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Single mutation history item
 */
function MutationHistoryItem({ mutation, isLatest }: { mutation: Mutation; isLatest: boolean }) {
    const formatOperation = (op: string) => {
        const labels: Record<string, string> = {
            'add_item': '➕ Added',
            'remove_item': '➖ Removed',
            'update_item': '✏️ Updated',
            'update_property': '🔧 Changed',
            'reorder_items': '↕️ Reordered',
            'bulk_update': '📦 Bulk update',
        };
        return labels[op] || op;
    };

    return (
        <div className={`px-3 py-2 border-b border-white/5 last:border-b-0 ${isLatest ? 'bg-blue-500/5' : ''}`}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white">
                    {formatOperation(mutation.operation)}
                </span>
                <span className="text-xs text-gray-600" suppressHydrationWarning>
                    {new Date(mutation.timestamp).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                    })}
                </span>
            </div>
            {mutation.reason && (
                <p className="text-xs text-gray-500 mt-1 truncate">{mutation.reason}</p>
            )}
            <span className={`text-xs mt-1 inline-block ${mutation.source === 'user' ? 'text-green-400' : 'text-blue-400'}`}>
                {mutation.source === 'user' ? '👤 User' : '🤖 AI'}
            </span>
        </div>
    );
}

/**
 * Related Artifacts Section
 */
function RelatedArtifacts({ artifactId }: { artifactId: string }) {
    // 1️⃣ Always read raw store state first
    const allRelationships = useArtifactStore((state) => state.relationships);
    const artifacts = useArtifactStore((state) => state.artifacts);

    // 2️⃣ Always call hooks (NO early returns above this)
    const relatedArtifacts = useMemo(() => {
        const relationships = allRelationships.filter(
            (r) => r.sourceId === artifactId || r.targetId === artifactId
        );

        if (relationships.length === 0) return [];

        return relationships
            .map((r) => ({
                relationship: r,
                artifact: r.sourceId === artifactId
                    ? artifacts[r.targetId]
                    : artifacts[r.sourceId]
            }))
            .filter((item) => item.artifact);
    }, [allRelationships, artifacts, artifactId]);

    // 3️⃣ Conditional return AFTER hooks
    if (relatedArtifacts.length === 0) return null;

    const typeLabels: Record<string, string> = {
        'references': '🔗',
        'depends_on': '⬆️',
        'conflicts_with': '⚠️',
        'derived_from': '📑',
        'similar_to': '≈',
    };

    return (
        <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-gray-500 mb-2">Related Artifacts</p>
            <div className="flex flex-wrap gap-2">
                {relatedArtifacts.map(({ relationship, artifact }) => (
                    <a
                        key={relationship.id}
                        href={`#artifact-${artifact.id}`}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors text-xs"
                    >
                        <span>{typeLabels[relationship.type] || '🔗'}</span>
                        <span className="text-blue-400 font-mono">#{artifact.id}</span>
                        <span className="text-gray-500">{artifact.type}</span>
                    </a>
                ))}
            </div>
        </div>
    );
}

/**
 * Artifact Actions (suggested next steps)
 */
function ArtifactActions({ artifact, onAction }: { artifact: Artifact; onAction?: (prompt: string) => void }) {
    // Generate contextual actions based on artifact type
    const getActions = () => {
        const actions: { label: string; prompt: string; icon: string }[] = [];

        if (artifact.type === 'ExecutionPlan') {
            const steps = artifact.state?.steps || [];
            if (steps.length > 0) {
                actions.push(
                    { label: 'Add a step', prompt: `Add a new step to plan #${artifact.id}`, icon: '➕' },
                    { label: 'Optimize timeline', prompt: `Optimize the timeline for plan #${artifact.id}`, icon: '⚡' },
                );
            }
        } else if (artifact.type === 'SystemStatusPanel') {
            actions.push(
                { label: 'Diagnose issues', prompt: `Diagnose issues in system status #${artifact.id}`, icon: '🔍' },
                { label: 'Get recommendations', prompt: `Get recommendations based on status #${artifact.id}`, icon: '💡' },
            );
        } else if (artifact.type === 'CommandResultPanel') {
            actions.push(
                { label: 'Expand analysis', prompt: `Expand the analysis in #${artifact.id}`, icon: '📊' },
                { label: 'Create action plan', prompt: `Create an action plan based on #${artifact.id}`, icon: '📋' },
            );
        }

        return actions;
    };

    const actions = getActions();
    if (actions.length === 0) return null;

    return (
        <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-gray-500 mb-2">Suggested Actions</p>
            <div className="flex flex-wrap gap-2">
                {actions.map((action, i) => (
                    <button
                        key={i}
                        onClick={() => onAction?.(action.prompt)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors text-xs text-indigo-300"
                    >
                        <span>{action.icon}</span>
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Renders a single artifact with header showing ID, type, version, and mutation history
 */
export function ArtifactRenderer({ artifactId, onAction }: { artifactId: string; onAction?: (prompt: string) => void }) {
    const artifact = useArtifactStore((state) => state.artifacts[artifactId]);
    const deleteArtifact = useArtifactStore((state) => state.deleteArtifact);

    if (!artifact) {
        return (
            <div className="border border-red-500/20 rounded-lg p-4 bg-red-500/5">
                <p className="text-red-400">Artifact not found: {artifactId}</p>
            </div>
        );
    }

    // Validate state against schema if present
    if (artifact.schema) {
        const validation = artifact.schema.safeParse(artifact.state);
        if (!validation.success) {
            console.warn('Artifact validation warning:', validation.error.issues);
        }
    }

    return (
        <div id={`artifact-${artifactId}`} className="relative group">
            {/* Artifact header */}
            <div className="flex items-center justify-between mb-3 text-sm flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-blue-400 font-mono text-xs">#{artifactId}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400">{artifact.type}</span>

                    {/* Mutation History Dropdown */}
                    <MutationHistoryDropdown artifactId={artifactId} currentVersion={artifact.version} />
                </div>

                <div className="flex items-center gap-3">
                    {/* Timestamp */}
                    <span className="text-gray-600 text-xs" suppressHydrationWarning>
                        {new Date(artifact.updatedAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                        })}
                    </span>

                    {/* Delete button */}
                    <button
                        onClick={() => deleteArtifact(artifactId)}
                        className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete artifact"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Artifact content */}
            <ArtifactContent artifact={artifact} />

            {/* Related Artifacts */}
            <RelatedArtifacts artifactId={artifactId} />

            {/* Suggested Actions */}
            <ArtifactActions artifact={artifact} onAction={onAction} />
        </div>
    );
}

/**
 * Renders artifact content based on type
 */
function ArtifactContent({ artifact }: { artifact: Artifact }) {
    const { type, state, id } = artifact;

    switch (type) {
        case 'CommandResultPanel':
            return <CommandResultContent state={state} />;
        case 'ExecutionPlan':
            return <ExecutionPlanContent state={state} artifactId={id} />;
        case 'SystemStatusPanel':
            return <SystemStatusContent state={state} />;
        default:
            return <GenericContent state={state} />;
    }
}

/**
 * Command Result Panel rendering
 */
function CommandResultContent({ state }: { state: any }) {
    return (
        <div className="border border-white/5 rounded-xl p-6 bg-gradient-to-br from-white/[0.02] to-transparent backdrop-blur-sm">
            {state.title && (
                <h3 className="text-xl font-semibold text-white mb-4">{state.title}</h3>
            )}

            {state.summary && (
                <p className="text-gray-300 mb-6">{state.summary}</p>
            )}

            {state.details && state.details.length > 0 && (
                <div className="space-y-3">
                    {state.details.map((detail: any, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                            <p className="text-gray-400">{detail}</p>
                        </div>
                    ))}
                </div>
            )}

            {state.recommendation && (
                <div className="mt-6 pt-6 border-t border-white/5">
                    <p className="text-sm text-gray-500 mb-2">Recommendation</p>
                    <p className="text-white">{state.recommendation}</p>
                </div>
            )}
        </div>
    );
}

/**
 * Execution Plan rendering with INLINE EDITING support
 */
function ExecutionPlanContent({ state, artifactId, onEdit }: {
    state: any;
    artifactId?: string;
    onEdit?: (newState: any) => void;
}) {
    const [editingStep, setEditingStep] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const updateArtifact = useArtifactStore((state) => state.updateArtifact);
    const addMutation = useArtifactStore((state) => state.addMutation);

    const handleStepClick = (index: number, currentValue: string) => {
        setEditingStep(index);
        setEditValue(currentValue);
    };

    const handleStepSave = (index: number) => {
        if (!artifactId) return;

        const newSteps = [...(state.steps || [])];
        const oldValue = newSteps[index]?.action || newSteps[index]?.title;

        if (newSteps[index]) {
            newSteps[index] = {
                ...newSteps[index],
                action: editValue,
            };
        }

        const newState = { ...state, steps: newSteps };
        updateArtifact(artifactId, newState);

        // Record mutation
        addMutation({
            artifactId,
            operation: 'update_item',
            path: ['steps', index.toString()],
            value: editValue,
            previousValue: oldValue,
            source: 'user',
            reason: `Edited step ${index + 1}`,
        });

        setEditingStep(null);
        console.log(`✏️ Inline edit: step ${index + 1} updated`);
    };

    const handleDeleteStep = (index: number) => {
        if (!artifactId) return;

        const oldStep = state.steps[index];
        const newSteps = state.steps.filter((_: any, i: number) => i !== index);
        const newState = { ...state, steps: newSteps };

        updateArtifact(artifactId, newState);
        addMutation({
            artifactId,
            operation: 'remove_item',
            path: ['steps'],
            value: index,
            previousValue: oldStep,
            source: 'user',
            reason: `Removed step ${index + 1}`,
        });

        console.log(`🗑️ Inline delete: step ${index + 1} removed`);
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleStepSave(index);
        } else if (e.key === 'Escape') {
            setEditingStep(null);
        }
    };

    return (
        <div className="border border-white/5 rounded-xl p-6 bg-gradient-to-br from-white/[0.02] to-transparent backdrop-blur-sm">
            {state.title && (
                <h3 className="text-xl font-semibold text-white mb-2">{state.title}</h3>
            )}

            {state.objective && (
                <p className="text-gray-400 mb-6">{state.objective}</p>
            )}

            {state.steps && state.steps.length > 0 && (
                <div className="space-y-4">
                    {state.steps.map((step: any, i: number) => (
                        <div key={i} className="flex gap-4 group/step">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <span className="text-sm font-semibold text-blue-400">{i + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                {editingStep === i ? (
                                    <input
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={() => handleStepSave(i)}
                                        onKeyDown={(e) => handleKeyDown(e, i)}
                                        className="w-full bg-white/5 border border-blue-500/30 rounded-lg px-3 py-1.5 text-white font-medium focus:outline-none focus:border-blue-500"
                                        autoFocus
                                    />
                                ) : (
                                    <h4
                                        className={`text-white font-medium mb-1 ${artifactId ? 'cursor-pointer hover:bg-white/5 rounded px-2 py-1 -mx-2 transition-colors' : ''}`}
                                        onClick={() => artifactId && handleStepClick(i, step.action || step.title)}
                                        title={artifactId ? "Click to edit" : undefined}
                                    >
                                        {step.action || step.title}
                                    </h4>
                                )}
                                {step.description && (
                                    <p className="text-sm text-gray-500">{step.description}</p>
                                )}
                                {/* Inline Status Selector */}
                                {artifactId && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <EditableSelect
                                            artifactId={artifactId}
                                            path={['steps', String(i), 'status']}
                                            value={step.status || 'pending'}
                                            options={[
                                                { label: '⏳ Pending', value: 'pending' },
                                                { label: '🔄 In Progress', value: 'in_progress' },
                                                { label: '✅ Complete', value: 'complete' },
                                                { label: '⏸️ Blocked', value: 'blocked' },
                                            ]}
                                        />
                                        {step.estimated_time && (
                                            <span className="text-xs text-gray-600">
                                                ~{step.estimated_time}
                                            </span>
                                        )}
                                    </div>
                                )}
                                {!artifactId && step.estimated_time && (
                                    <span className="text-xs text-gray-600 mt-1 inline-block">
                                        ~{step.estimated_time}
                                    </span>
                                )}
                            </div>
                            {/* Delete button - shown on hover */}
                            {artifactId && (
                                <button
                                    onClick={() => handleDeleteStep(i)}
                                    className="opacity-0 group-hover/step:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                                    title="Remove step"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Inline edit hint */}
            {artifactId && state.steps && state.steps.length > 0 && (
                <p className="text-xs text-gray-600 mt-4 text-center">
                    💡 Click any step to edit inline • No prompting required
                </p>
            )}
        </div>
    );
}

/**
 * System Status Panel rendering
 */
function SystemStatusContent({ state }: { state: any }) {
    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'healthy':
            case 'operational':
            case 'online':
                return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'degraded':
            case 'warning':
                return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'critical':
            case 'error':
            case 'offline':
                return 'text-red-400 bg-red-500/10 border-red-500/20';
            default:
                return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <div className="border border-white/5 rounded-xl p-6 bg-gradient-to-br from-white/[0.02] to-transparent backdrop-blur-sm">
            {state.system_name && (
                <h3 className="text-xl font-semibold text-white mb-6">{state.system_name}</h3>
            )}

            {state.overall_status && (
                <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-2">Overall Status</p>
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusColor(state.overall_status)}`}>
                        <div className="w-2 h-2 rounded-full bg-current" />
                        {state.overall_status}
                    </span>
                </div>
            )}

            {state.components && state.components.length > 0 && (
                <div className="space-y-3">
                    {state.components.map((component: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                            <span className="text-white">{component.name}</span>
                            <span className={`text-sm px-2 py-1 rounded ${getStatusColor(component.status)}`}>
                                {component.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {state.metrics && (
                <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                    {Object.entries(state.metrics).map(([key, value]: [string, any]) => (
                        <div key={key}>
                            <p className="text-sm text-gray-500 mb-1">
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                            <p className="text-white font-semibold">{value}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Generic fallback for unknown artifact types
 */
function GenericContent({ state }: { state: any }) {
    return (
        <div className="border border-white/5 rounded-xl p-6 bg-gradient-to-br from-white/[0.02] to-transparent backdrop-blur-sm">
            <pre className="text-sm text-gray-400 overflow-auto max-h-96">
                {JSON.stringify(state, null, 2)}
            </pre>
        </div>
    );
}
