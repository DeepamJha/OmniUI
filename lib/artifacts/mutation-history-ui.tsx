'use client';

import React, { useState, useMemo } from 'react';
import { useArtifactStore } from './store';
import type { Mutation } from './types';

/**
 * Mutation History Panel
 * Shows timeline of changes with undo/redo
 */
export function MutationHistory({ artifactId }: { artifactId: string }) {
    const artifact = useArtifactStore(state => state.artifacts[artifactId]);
    const allMutations = useArtifactStore(state => state.mutations);
    const undoLastMutation = useArtifactStore(state => state.undoLastMutation);
    const [showDetails, setShowDetails] = useState(false);

    // Memoize filtered mutations to avoid infinite loops
    const mutations = useMemo(() =>
        allMutations.filter(m => m.artifactId === artifactId),
        [allMutations, artifactId]
    );

    if (!artifact) return null;

    const canUndo = mutations.length > 0;

    return (
        <div className="border border-white/5 rounded-lg bg-white/[0.02] p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-sm font-medium text-white">History</span>
                    <span className="text-xs text-gray-500">v{artifact.version}</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        {showDetails ? 'Hide' : 'Show'} details
                    </button>

                    <button
                        onClick={() => undoLastMutation(artifactId)}
                        disabled={!canUndo}
                        className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Undo last change"
                    >
                        ⏪ Undo
                    </button>
                </div>
            </div>

            {/* Timeline */}
            {showDetails && mutations.length > 0 && (
                <div className="space-y-2 mt-4">
                    {mutations.map((mutation, index) => (
                        <MutationItem
                            key={mutation.id}
                            mutation={mutation}
                            index={index}
                            isLatest={index === mutations.length - 1}
                        />
                    ))}
                </div>
            )}

            {/* Empty state */}
            {showDetails && mutations.length === 0 && (
                <p className="text-sm text-gray-500 mt-4">No mutations yet</p>
            )}
        </div>
    );
}

/**
 * Single mutation item in timeline
 */
function MutationItem({
    mutation,
    index,
    isLatest
}: {
    mutation: Mutation;
    index: number;
    isLatest: boolean;
}) {
    const getOperationLabel = (op: string) => {
        switch (op) {
            case 'add_item': return '➕ Added item';
            case 'remove_item': return '➖ Removed item';
            case 'update_item': return '✏️ Updated item';
            case 'update_property': return '🔄 Changed property';
            case 'reorder_items': return '↕️ Reordered';
            default: return op;
        }
    };

    const getSourceIcon = (source: string) => {
        return source === 'user' ? '👤' : '🤖';
    };

    return (
        <div className={`flex gap-3 p-2 rounded ${isLatest ? 'bg-purple-500/10' : 'bg-white/[0.02]'}`}>
            {/* Timeline dot */}
            <div className="flex flex-col items-center">
                <div className={`w-2 h-2 rounded-full ${isLatest ? 'bg-purple-400' : 'bg-gray-600'}`} />
                {!isLatest && <div className="w-px h-full bg-gray-700 mt-1" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-white">
                        {getOperationLabel(mutation.operation)}
                    </span>
                    <span className="text-xs text-gray-500">
                        {getSourceIcon(mutation.source)}
                    </span>
                    {isLatest && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                            Latest
                        </span>
                    )}
                </div>

                {mutation.reason && (
                    <p className="text-xs text-gray-400 truncate">{mutation.reason}</p>
                )}

                <span className="text-xs text-gray-600">
                    {new Date(mutation.timestamp).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                    })}
                </span>
            </div>
        </div>
    );
}

/**
 * Version selector dropdown
 * Allows jumping to any version
 */
export function VersionSelector({ artifactId }: { artifactId: string }) {
    const artifact = useArtifactStore(state => state.artifacts[artifactId]);
    const [selectedVersion, setSelectedVersion] = useState(artifact?.version || 1);

    if (!artifact) return null;

    const versions = Array.from({ length: artifact.version }, (_, i) => i + 1);

    return (
        <select
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(Number(e.target.value))}
            className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white"
        >
            {versions.map(v => (
                <option key={v} value={v}>
                    v{v} {v === artifact.version && '(current)'}
                </option>
            ))}
        </select>
    );
}

/**
 * Diff view comparing two versions
 */
export function DiffView({
    artifactId,
    fromVersion,
    toVersion
}: {
    artifactId: string;
    fromVersion: number;
    toVersion: number;
}) {
    const allMutations = useArtifactStore(state => state.mutations);

    // Memoize filtered mutations
    const mutations = useMemo(() =>
        allMutations.filter(m => m.artifactId === artifactId),
        [allMutations, artifactId]
    );

    // Get mutations between versions
    const relevantMutations = mutations.slice(fromVersion - 1, toVersion);

    return (
        <div className="border border-white/5 rounded-lg bg-white/[0.02] p-4">
            <h4 className="text-sm font-medium text-white mb-3">
                Changes from v{fromVersion} to v{toVersion}
            </h4>

            <div className="space-y-2">
                {relevantMutations.map(mutation => (
                    <div key={mutation.id} className="flex items-start gap-2 text-sm">
                        <span className="text-gray-500">•</span>
                        <div className="flex-1">
                            <span className="text-white">{mutation.operation}</span>
                            {mutation.reason && (
                                <p className="text-xs text-gray-400 mt-1">{mutation.reason}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {relevantMutations.length === 0 && (
                <p className="text-sm text-gray-500">No changes</p>
            )}
        </div>
    );
}

/**
 * Compact version badge with hover tooltip
 */
export function VersionBadge({ artifactId }: { artifactId: string }) {
    const artifact = useArtifactStore(state => state.artifacts[artifactId]);
    const allMutations = useArtifactStore(state => state.mutations);
    const [showTooltip, setShowTooltip] = useState(false);

    // Memoize filtered mutations
    const mutations = useMemo(() =>
        allMutations.filter(m => m.artifactId === artifactId),
        [allMutations, artifactId]
    );

    if (!artifact || artifact.version === 1) return null;

    const lastMutation = mutations[mutations.length - 1];

    return (
        <div className="relative">
            <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
            >
                v{artifact.version}
            </button>

            {showTooltip && lastMutation && (
                <div className="absolute z-10 bottom-full left-0 mb-2 w-48 p-2 rounded-lg bg-gray-900 border border-white/10 shadow-xl">
                    <p className="text-xs text-white mb-1">Last change:</p>
                    <p className="text-xs text-gray-400">{lastMutation.operation}</p>
                    {lastMutation.reason && (
                        <p className="text-xs text-gray-500 mt-1">{lastMutation.reason}</p>
                    )}
                </div>
            )}
        </div>
    );
}
