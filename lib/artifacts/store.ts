// Fixed Artifact Store with Schema Rehydration
// Fixes: artifacts vanish on refresh, AI gets stale context

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import type { Artifact, Mutation, Relationship } from './types';

// ============================================================================
// SCHEMA REGISTRY (CRITICAL FOR PERSISTENCE)
// ============================================================================

export const ARTIFACT_SCHEMAS: Record<string, z.ZodSchema> = {
    ExecutionPlan: z.object({
        title: z.string().default(''),
        objective: z.string().default(''),
        steps: z.array(
            z.object({
                action: z.string().default(''),
                description: z.string().default(''),
                estimated_time: z.string().default(''),
            })
        ).default([]),
    }),

    CommandResultPanel: z.object({
        title: z.string().default(''),
        summary: z.string().default(''),
        details: z.array(z.string()).default([]),
        recommendation: z.string().default(''),
    }),

    SystemStatusPanel: z.object({
        system_name: z.string().default(''),
        overall_status: z.string().default(''),
        components: z.array(
            z.object({
                name: z.string(),
                status: z.string(),
            })
        ).default([]),
        metrics: z.record(z.string(), z.string()).optional(),
    }),
};

// ============================================================================
// SERIALIZABLE ARTIFACT (NO SCHEMA OBJECT)
// ============================================================================

// Internal type for store that doesn't include Zod schema (for serialization)
interface SerializableArtifact {
    id: string;
    type: string;
    state: any;
    schemaKey: string;
    title?: string;
    description?: string;
    tags?: string[];
    version: number;
    createdAt: number;
    updatedAt: number;
    parentId?: string;
    relatedIds?: string[];
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface ArtifactStore {
    // State
    artifacts: Record<string, Artifact>;
    mutations: Mutation[];
    relationships: Relationship[];
    hasHydrated: boolean;

    // Artifact operations
    createArtifact: <T>(type: string, state: T, schema: z.ZodSchema<T>, title?: string) => Artifact<T>;
    addArtifact: (artifact: Artifact) => void;
    updateArtifact: <T>(id: string, state: T) => void;
    deleteArtifact: (id: string) => void;
    getArtifact: (id: string) => Artifact | undefined;
    getAllArtifacts: () => Artifact[];

    // Mutation operations
    addMutation: (mutation: Omit<Mutation, 'id' | 'timestamp'> | Mutation) => void;
    getMutations: (artifactId: string) => Mutation[];
    undoLastMutation: (artifactId: string) => boolean;

    // Relationship operations
    addRelationship: (sourceId: string, targetId: string, type: Relationship['type']) => Relationship;
    getRelated: (artifactId: string) => Artifact[];

    // Utility
    clear: () => void;
    setHydrated: (value: boolean) => void;
    getContextString: () => string;
}

// Generate short ID
function shortId(): string {
    return Math.random().toString(36).substring(2, 10);
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useArtifactStore = create<ArtifactStore>()(
    persist(
        (set, get) => ({
            artifacts: {},
            mutations: [],
            relationships: [],
            hasHydrated: false,

            // Create artifact with schema
            createArtifact: <T>(type: string, state: T, schema: z.ZodSchema<T>, title?: string): Artifact<T> => {
                const id = shortId();
                const now = Date.now();

                const artifact: Artifact<T> = {
                    id,
                    type,
                    state,
                    schema,
                    title,
                    version: 1,
                    createdAt: now,
                    updatedAt: now,
                    relatedIds: [],
                };

                set((s) => ({
                    artifacts: { ...s.artifacts, [id]: artifact },
                }));

                console.log(`✅ Created artifact: ${id} (${type})`);
                return artifact;
            },

            // Add pre-built artifact
            addArtifact: (artifact) => {
                set((state) => ({
                    artifacts: { ...state.artifacts, [artifact.id]: artifact },
                }));
            },

            // Update artifact state
            updateArtifact: (id, newState) => {
                set((state) => {
                    const artifact = state.artifacts[id];
                    if (!artifact) return state;

                    return {
                        artifacts: {
                            ...state.artifacts,
                            [id]: {
                                ...artifact,
                                state: newState,
                                version: artifact.version + 1,
                                updatedAt: Date.now(),
                            },
                        },
                    };
                });
            },

            // Delete artifact
            deleteArtifact: (id) => {
                set((state) => {
                    const { [id]: removed, ...rest } = state.artifacts;
                    return {
                        artifacts: rest,
                        mutations: state.mutations.filter(m => m.artifactId !== id),
                        relationships: state.relationships.filter(
                            r => r.sourceId !== id && r.targetId !== id
                        ),
                    };
                });
            },

            getArtifact: (id) => get().artifacts[id],
            getAllArtifacts: () => Object.values(get().artifacts),

            // Add mutation
            addMutation: (mutation) => {
                const fullMutation: Mutation = {
                    id: 'id' in mutation && mutation.id ? mutation.id : shortId(),
                    artifactId: mutation.artifactId,
                    operation: mutation.operation,
                    path: mutation.path,
                    value: mutation.value,
                    previousValue: mutation.previousValue,
                    timestamp: 'timestamp' in mutation && mutation.timestamp ? mutation.timestamp : Date.now(),
                    source: mutation.source,
                    reason: mutation.reason,
                };

                set((state) => ({
                    mutations: [...state.mutations, fullMutation],
                }));
            },

            getMutations: (artifactId) => {
                return get().mutations.filter(m => m.artifactId === artifactId);
            },

            // Undo last mutation
            undoLastMutation: (artifactId) => {
                const state = get();
                const artifact = state.artifacts[artifactId];
                if (!artifact) return false;

                const artifactMutations = state.mutations.filter(m => m.artifactId === artifactId);
                if (artifactMutations.length === 0) return false;

                const lastMutation = artifactMutations[artifactMutations.length - 1];

                if (lastMutation.previousValue !== undefined) {
                    set((s) => ({
                        artifacts: {
                            ...s.artifacts,
                            [artifactId]: {
                                ...artifact,
                                state: lastMutation.previousValue,
                                version: artifact.version + 1,
                                updatedAt: Date.now(),
                            },
                        },
                        mutations: s.mutations.filter(m => m.id !== lastMutation.id),
                    }));
                    return true;
                }

                return false;
            },

            // Add relationship
            addRelationship: (sourceId, targetId, type) => {
                const relationship: Relationship = {
                    id: shortId(),
                    sourceId,
                    targetId,
                    type,
                    bidirectional: false,
                    createdAt: Date.now(),
                };

                set((state) => ({
                    relationships: [...state.relationships, relationship],
                }));

                // Update artifact relatedIds
                const sourceArtifact = get().artifacts[sourceId];
                if (sourceArtifact) {
                    set((s) => ({
                        artifacts: {
                            ...s.artifacts,
                            [sourceId]: {
                                ...sourceArtifact,
                                relatedIds: [...(sourceArtifact.relatedIds || []), targetId],
                            },
                        },
                    }));
                }

                return relationship;
            },

            getRelated: (artifactId) => {
                const state = get();
                const artifact = state.artifacts[artifactId];
                if (!artifact) return [];

                return (artifact.relatedIds || [])
                    .map((id) => state.artifacts[id])
                    .filter(Boolean) as Artifact[];
            },

            clear: () => {
                set({ artifacts: {}, mutations: [], relationships: [], hasHydrated: true });
            },

            setHydrated: (value) => {
                set({ hasHydrated: value });
            },

            getContextString: () => {
                const { artifacts, hasHydrated } = get();

                if (!hasHydrated) {
                    return 'Artifacts are being loaded from storage...';
                }

                const artifactList = Object.values(artifacts);

                if (artifactList.length === 0) {
                    return 'No artifacts exist yet in this conversation.';
                }

                const sorted = artifactList.sort((a, b) => b.createdAt - a.createdAt);

                return `Current artifacts in workspace:
${sorted.map(a => {
                    const title = a.title || (a.state as any).title || 'Untitled';
                    const time = new Date(a.createdAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                    });
                    return `- ${a.id}: ${a.type} "${title}" (v${a.version}, created ${time})`;
                }).join('\n')}

When referencing artifacts, use exact IDs (e.g., "${sorted[0]?.id || 'abc12345'}").`;
            },
        }),
        {
            name: 'omniui-artifacts',
            version: 2,

            // Serialize: remove schemas before storing
            partialize: (state) => {
                const serializableArtifacts: Record<string, SerializableArtifact> = {};

                Object.entries(state.artifacts).forEach(([id, artifact]) => {
                    serializableArtifacts[id] = {
                        id: artifact.id,
                        type: artifact.type,
                        state: artifact.state,
                        schemaKey: artifact.type,
                        title: artifact.title,
                        description: artifact.description,
                        tags: artifact.tags,
                        version: artifact.version,
                        createdAt: artifact.createdAt,
                        updatedAt: artifact.updatedAt,
                        parentId: artifact.parentId,
                        relatedIds: artifact.relatedIds,
                    };
                });

                return {
                    artifacts: serializableArtifacts,
                    mutations: state.mutations,
                    relationships: state.relationships,
                };
            },

            // Rehydrate: restore schemas from registry
            onRehydrateStorage: () => (state) => {
                if (!state) return;

                const rehydratedArtifacts: Record<string, Artifact> = {};

                Object.entries(state.artifacts).forEach(([id, serializedArtifact]: [string, any]) => {
                    const schema = ARTIFACT_SCHEMAS[serializedArtifact.schemaKey || serializedArtifact.type];

                    if (schema) {
                        rehydratedArtifacts[id] = {
                            ...serializedArtifact,
                            schema,
                        };
                    } else {
                        // Keep artifact without schema for unknown types
                        rehydratedArtifacts[id] = {
                            ...serializedArtifact,
                            schema: z.any(),
                        };
                        console.warn(`Schema not found for artifact type: ${serializedArtifact.type}`);
                    }
                });

                state.artifacts = rehydratedArtifacts;
                state.hasHydrated = true;

                console.log(`✅ Rehydrated ${Object.keys(rehydratedArtifacts).length} artifacts`);
            },
        }
    )
);

// ============================================================================
// HYDRATION HOOK
// ============================================================================

export function useArtifactHydration() {
    const hasHydrated = useArtifactStore((state) => state.hasHydrated);
    const setHydrated = useArtifactStore((state) => state.setHydrated);

    // Fallback: mark hydrated after timeout if persistence fails
    if (typeof window !== 'undefined' && !hasHydrated) {
        setTimeout(() => {
            if (!useArtifactStore.getState().hasHydrated) {
                setHydrated(true);
            }
        }, 500);
    }

    return hasHydrated;
}
