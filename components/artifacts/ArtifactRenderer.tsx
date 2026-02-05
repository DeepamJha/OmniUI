'use client';

import React from 'react';
import { useArtifactStore, useArtifactHydration } from '@/lib/artifacts/store';
import type { Artifact } from '@/lib/artifacts/types';

/**
 * Canvas with proper hydration and empty state handling
 */
export function ArtifactCanvas() {
    const hasHydrated = useArtifactHydration();
    const artifacts = useArtifactStore((state) => state.artifacts);

    // Sort by creation time (oldest first)
    const artifactIds = Object.keys(artifacts).sort((a, b) => {
        return artifacts[a].createdAt - artifacts[b].createdAt;
    });

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
                <ArtifactRenderer key={id} artifactId={id} />
            ))}
        </div>
    );
}

/**
 * Renders a single artifact with header showing ID and type
 */
export function ArtifactRenderer({ artifactId }: { artifactId: string }) {
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
        <div className="relative group">
            {/* Artifact header */}
            <div className="flex items-center justify-between mb-3 text-sm">
                <div className="flex items-center gap-2">
                    <span className="text-blue-400 font-mono text-xs">#{artifactId}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400">{artifact.type}</span>
                    {artifact.version > 1 && (
                        <>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-500 text-xs">v{artifact.version}</span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Timestamp */}
                    <span className="text-gray-600 text-xs">
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
        </div>
    );
}

/**
 * Renders artifact content based on type
 */
function ArtifactContent({ artifact }: { artifact: Artifact }) {
    const { type, state } = artifact;

    switch (type) {
        case 'CommandResultPanel':
            return <CommandResultContent state={state} />;
        case 'ExecutionPlan':
            return <ExecutionPlanContent state={state} />;
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
 * Execution Plan rendering
 */
function ExecutionPlanContent({ state }: { state: any }) {
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
                        <div key={i} className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <span className="text-sm font-semibold text-blue-400">{i + 1}</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-medium mb-1">{step.action || step.title}</h4>
                                {step.description && (
                                    <p className="text-sm text-gray-500">{step.description}</p>
                                )}
                                {step.estimated_time && (
                                    <span className="text-xs text-gray-600 mt-1 inline-block">
                                        ~{step.estimated_time}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
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
