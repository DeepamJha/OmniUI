"use client";

import React from 'react';
import type { Artifact } from '@/lib/artifacts/types';
import { useArtifactStore } from '@/lib/artifacts/store';
import { CommandResultPanel } from '@/components/CommandResultPanel';
import { ExecutionPlan } from '@/components/ExecutionPlan';
import { SystemStatusPanel } from '@/components/SystemStatusPanel';

// Map component types to actual components
const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
    CommandResultPanel,
    ExecutionPlan,
    SystemStatusPanel,
};

interface ArtifactRendererProps {
    artifact: Artifact;
    onDelete?: () => void;
}

/**
 * Renders a single artifact with its header and content
 */
export function ArtifactRenderer({ artifact, onDelete }: ArtifactRendererProps) {
    const Component = COMPONENT_MAP[artifact.type];

    if (!Component) {
        return (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm">Unknown component type: {artifact.type}</p>
            </div>
        );
    }

    return (
        <div className="group relative">
            {/* Artifact Header */}
            <div className="flex items-center justify-between mb-2 opacity-60 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-indigo-400">#{artifact.id}</span>
                    <span className="text-xs text-zinc-500">{artifact.type}</span>
                    <span className="text-xs text-zinc-600">v{artifact.version}</span>
                </div>

                <div className="flex items-center gap-2">
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                            title="Delete artifact"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            {/* Component Content */}
            <Component {...artifact.state} />
        </div>
    );
}

interface ArtifactCanvasProps {
    className?: string;
}

/**
 * Renders all artifacts in the workspace
 */
export function ArtifactCanvas({ className = '' }: ArtifactCanvasProps) {
    const { artifacts, deleteArtifact } = useArtifactStore();
    const artifactList = Object.values(artifacts).sort((a, b) => b.createdAt - a.createdAt);

    if (artifactList.length === 0) {
        return null;
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {artifactList.map((artifact) => (
                <ArtifactRenderer
                    key={artifact.id}
                    artifact={artifact}
                    onDelete={() => deleteArtifact(artifact.id)}
                />
            ))}
        </div>
    );
}
