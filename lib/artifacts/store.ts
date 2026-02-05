// Zustand store for artifact management with persistence

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Artifact, Mutation, Relationship, SerializableArtifact, MutationResult } from './types';
import { ZodSchema } from 'zod';

// Generate short ID from UUID
function shortId(): string {
    return uuidv4().substring(0, 8);
}

interface ArtifactStore {
    // State
    artifacts: Record<string, Artifact>;
    mutations: Mutation[];
    relationships: Relationship[];

    // Actions - Artifacts
    createArtifact: <T>(type: string, state: T, schema: ZodSchema<T>, title?: string) => Artifact<T>;
    updateArtifact: <T>(id: string, updates: Partial<T>) => MutationResult;
    deleteArtifact: (id: string) => void;
    getArtifact: (id: string) => Artifact | undefined;

    // Actions - Mutations
    addMutation: (mutation: Omit<Mutation, 'id' | 'timestamp'>) => Mutation;
    getMutations: (artifactId: string) => Mutation[];
    undoLastMutation: (artifactId: string) => MutationResult;

    // Actions - Relationships
    addRelationship: (sourceId: string, targetId: string, type: Relationship['type']) => Relationship;
    getRelated: (artifactId: string) => Artifact[];

    // Context
    getContextString: () => string;
}

// Custom storage that handles serialization/deserialization
const artifactStorage = createJSONStorage<{
    artifacts: Record<string, SerializableArtifact>;
    mutations: Mutation[];
    relationships: Relationship[];
}>(() => localStorage);

export const useArtifactStore = create<ArtifactStore>()(
    persist(
        (set, get) => ({
            artifacts: {},
            mutations: [],
            relationships: [],

            createArtifact: <T>(type: string, state: T, schema: ZodSchema<T>, title?: string): Artifact<T> => {
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

                return artifact;
            },

            updateArtifact: <T>(id: string, updates: Partial<T>): MutationResult => {
                const artifact = get().artifacts[id];
                if (!artifact) {
                    return { success: false, error: `Artifact ${id} not found` };
                }

                const newState = { ...artifact.state, ...updates };

                // Validate with schema if available
                if (artifact.schema) {
                    const result = artifact.schema.safeParse(newState);
                    if (!result.success) {
                        return { success: false, error: result.error.message };
                    }
                }

                const mutation = get().addMutation({
                    artifactId: id,
                    operation: 'update_property',
                    path: Object.keys(updates),
                    value: updates,
                    previousValue: Object.keys(updates).reduce((acc, key) => {
                        acc[key] = artifact.state[key];
                        return acc;
                    }, {} as Record<string, any>),
                    source: 'user',
                });

                set((s) => ({
                    artifacts: {
                        ...s.artifacts,
                        [id]: {
                            ...artifact,
                            state: newState,
                            version: artifact.version + 1,
                            updatedAt: Date.now(),
                        },
                    },
                }));

                return { success: true, mutation, newState };
            },

            deleteArtifact: (id: string) => {
                set((s) => {
                    const { [id]: _, ...rest } = s.artifacts;
                    return { artifacts: rest };
                });
            },

            getArtifact: (id: string) => get().artifacts[id],

            addMutation: (mutation): Mutation => {
                const fullMutation: Mutation = {
                    ...mutation,
                    id: shortId(),
                    timestamp: Date.now(),
                };

                set((s) => ({
                    mutations: [...s.mutations, fullMutation],
                }));

                return fullMutation;
            },

            getMutations: (artifactId: string) => {
                return get().mutations.filter((m) => m.artifactId === artifactId);
            },

            undoLastMutation: (artifactId: string): MutationResult => {
                const mutations = get().getMutations(artifactId);
                if (mutations.length === 0) {
                    return { success: false, error: 'No mutations to undo' };
                }

                const lastMutation = mutations[mutations.length - 1];
                const artifact = get().artifacts[artifactId];

                if (!artifact) {
                    return { success: false, error: 'Artifact not found' };
                }

                // Restore previous value
                if (lastMutation.previousValue !== undefined) {
                    const newState = { ...artifact.state };
                    lastMutation.path.forEach((key) => {
                        if (lastMutation.previousValue[key] !== undefined) {
                            newState[key] = lastMutation.previousValue[key];
                        }
                    });

                    set((s) => ({
                        artifacts: {
                            ...s.artifacts,
                            [artifactId]: {
                                ...artifact,
                                state: newState,
                                version: artifact.version + 1,
                                updatedAt: Date.now(),
                            },
                        },
                        mutations: s.mutations.filter((m) => m.id !== lastMutation.id),
                    }));

                    return { success: true, newState };
                }

                return { success: false, error: 'Cannot undo this mutation' };
            },

            addRelationship: (sourceId, targetId, type) => {
                const relationship: Relationship = {
                    id: shortId(),
                    sourceId,
                    targetId,
                    type,
                    bidirectional: false,
                    createdAt: Date.now(),
                };

                set((s) => ({
                    relationships: [...s.relationships, relationship],
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

            getRelated: (artifactId: string) => {
                const artifact = get().artifacts[artifactId];
                if (!artifact) return [];

                return (artifact.relatedIds || [])
                    .map((id) => get().artifacts[id])
                    .filter(Boolean) as Artifact[];
            },

            getContextString: () => {
                const { artifacts } = get();
                const artifactList = Object.values(artifacts);

                if (artifactList.length === 0) {
                    return 'No artifacts in workspace.';
                }

                return artifactList.map((a) => {
                    return `[#${a.id}] ${a.type}: "${a.title || 'Untitled'}" (v${a.version})`;
                }).join('\n');
            },
        }),
        {
            name: 'omni-ui-artifacts',
            storage: artifactStorage,
            partialize: (state) => ({
                artifacts: Object.fromEntries(
                    Object.entries(state.artifacts).map(([id, artifact]) => [
                        id,
                        {
                            id: artifact.id,
                            type: artifact.type,
                            state: artifact.state,
                            title: artifact.title,
                            description: artifact.description,
                            tags: artifact.tags,
                            version: artifact.version,
                            createdAt: artifact.createdAt,
                            updatedAt: artifact.updatedAt,
                            parentId: artifact.parentId,
                            relatedIds: artifact.relatedIds,
                        } as SerializableArtifact,
                    ])
                ),
                mutations: state.mutations,
                relationships: state.relationships,
            }),
        }
    )
);
