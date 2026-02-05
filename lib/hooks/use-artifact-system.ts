'use client';

import { useCallback } from 'react';
import { useArtifactStore, useArtifactHydration, ARTIFACT_SCHEMAS } from '../artifacts/store';
import type { Artifact, Relationship } from '../artifacts/types';
import { resolveReference } from '../artifacts/reference-resolver';
import { detectMutation, applyMutation, validateMutation, MutationIntent } from '../artifacts/mutation-handler';
import { v4 as uuidv4 } from 'uuid';

/**
 * Build context string for AI prompts
 */
function buildArtifactContext(artifacts: Record<string, Artifact>, hasHydrated: boolean): string {
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
}

/**
 * Detect if user message references an artifact
 */
function detectArtifactReference(
    message: string,
    artifacts: Record<string, Artifact>
): string | null {
    const patterns = [
        /\b(that|this|the)\s+(roadmap|plan|checklist|list|analysis|status|result)/i,
        /\b(it|that|this)\b/i,
        /#[a-f0-9]{8}/i,
        /artifact\s+[a-f0-9]{8}/i,
    ];

    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) {
            return resolveReference(match[0], artifacts);
        }
    }

    return null;
}

/**
 * Main hook for artifact system with hydration awareness
 */
export function useArtifactSystem() {
    const store = useArtifactStore();
    const hasHydrated = useArtifactHydration();

    // Get context string for AI prompts (hydration-aware)
    const getContextString = useCallback(() => {
        return buildArtifactContext(store.artifacts, hasHydrated);
    }, [store.artifacts, hasHydrated]);

    // Create new artifact from AI response
    const createArtifact = useCallback((
        type: string,
        state: any,
        schema: any,
        title?: string
    ): string => {
        const id = uuidv4().split('-')[0];

        // Use provided schema or look up from registry
        const resolvedSchema = schema || ARTIFACT_SCHEMAS[type];

        const artifact: Artifact = {
            id,
            type,
            state,
            schema: resolvedSchema,
            title,
            version: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        store.addArtifact(artifact);
        console.log(`✅ Created artifact: ${id} (${type})`);

        return id;
    }, [store]);

    // Process user message for mutations (hydration-aware)
    const processMessage = useCallback((message: string): {
        isMutation: boolean;
        artifactId?: string;
        intent?: MutationIntent;
    } => {
        if (!hasHydrated) {
            return { isMutation: false };
        }

        // Detect if message references an artifact
        const artifactId = detectArtifactReference(message, store.artifacts);

        if (!artifactId) {
            return { isMutation: false };
        }

        // Check if it's a mutation request
        const mutationIntent = detectMutation(message, store.artifacts);

        if (mutationIntent) {
            console.log(`🔄 Detected mutation intent:`, mutationIntent);
            return {
                isMutation: true,
                artifactId,
                intent: mutationIntent,
            };
        }

        return { isMutation: false, artifactId };
    }, [store.artifacts, hasHydrated]);

    // Execute mutation
    const executeMutation = useCallback((
        artifactId: string,
        intent: MutationIntent,
        reason?: string
    ): { success: boolean; error?: string } => {
        const artifact = store.getArtifact(artifactId);
        if (!artifact) {
            return { success: false, error: 'Artifact not found' };
        }

        // Validate
        const validation = validateMutation(artifact, intent);
        if (!validation.valid) {
            console.error('❌ Mutation validation failed:', validation.error);
            return { success: false, error: validation.error };
        }

        // Apply mutation
        const result = applyMutation(artifact, intent, 'user');

        if (!result.success) {
            return { success: false, error: result.error };
        }

        // Update store
        if (result.newState) {
            store.updateArtifact(artifactId, result.newState);
        }
        if (result.mutation) {
            store.addMutation(result.mutation);
        }

        console.log(`✅ Mutation applied on ${artifactId}`);
        return { success: true };
    }, [store]);

    // Create relationship between artifacts
    const createRelationship = useCallback((
        sourceId: string,
        targetId: string,
        type: 'references' | 'depends_on' | 'conflicts_with' | 'derived_from' | 'similar_to'
    ): string => {
        const relationship = store.addRelationship(sourceId, targetId, type);
        console.log(`🔗 Created relationship: ${sourceId} → ${targetId} (${type})`);
        return relationship.id;
    }, [store]);

    return {
        // State
        artifacts: store.artifacts,
        mutations: store.mutations,
        relationships: store.relationships,
        hasHydrated,

        // Operations
        createArtifact,
        updateArtifact: store.updateArtifact,
        deleteArtifact: store.deleteArtifact,
        getArtifact: store.getArtifact,

        // Mutations
        executeMutation,
        undoLastMutation: store.undoLastMutation,
        getMutations: store.getMutations,

        // Relationships
        createRelationship,
        getRelated: store.getRelated,

        // Context & Processing
        getContextString,
        processMessage,
        resolveReference: (ref: string) => resolveReference(ref, store.artifacts),

        // Utility
        clear: store.clear,
        getAllArtifacts: store.getAllArtifacts,
    };
}

/**
 * Context helper for Tambo AI with hydration check
 */
export function useArtifactContextHelper() {
    const { getContextString, artifacts, hasHydrated } = useArtifactSystem();

    return useCallback(() => {
        if (!hasHydrated) {
            return {
                artifacts: {
                    status: 'loading',
                    message: 'Artifacts are being loaded...',
                },
            };
        }

        const artifactList = Object.values(artifacts);

        return {
            artifacts: {
                count: artifactList.length,
                context: getContextString(),
                ids: artifactList.map(a => a.id),
                types: [...new Set(artifactList.map(a => a.type))],
                status: 'ready',
            },
        };
    }, [artifacts, getContextString, hasHydrated]);
}
