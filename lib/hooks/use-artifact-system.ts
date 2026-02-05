'use client';

import { useCallback } from 'react';
import { useArtifactStore } from '../artifacts/store';
import type { Artifact, Mutation, Relationship } from '../artifacts/types';
import { resolveReference } from '../artifacts/reference-resolver';
import { detectMutation, applyMutation, validateMutation } from '../artifacts/mutation-handler';
import { v4 as uuidv4 } from 'uuid';

/**
 * Build context string for AI prompts
 */
function buildArtifactContext(artifacts: Record<string, Artifact>): string {
    const artifactList = Object.values(artifacts);

    if (artifactList.length === 0) {
        return 'No artifacts exist yet in this conversation.';
    }

    const sorted = artifactList.sort((a, b) => b.createdAt - a.createdAt);

    return `
Current artifacts in workspace:
${sorted.map(a => {
        const title = a.title || (a.state as any).title || 'Untitled';
        const time = new Date(a.createdAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
        return `- ${a.id}: ${a.type} "${title}" (created ${time})`;
    }).join('\n')}

When referencing artifacts:
- Use exact IDs when possible (e.g., "${sorted[0]?.id || 'abc12345'}")
- For mutations, ALWAYS specify the artifact_id from the list above
- Never invent artifact IDs that don't exist
`.trim();
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
 * Main hook for artifact system
 * Provides all artifact operations and context
 */
export function useArtifactSystem() {
    const store = useArtifactStore();

    // Get context string for AI prompts
    const getContextString = useCallback(() => {
        return buildArtifactContext(store.artifacts);
    }, [store.artifacts]);

    // Create new artifact from AI response
    const createArtifact = useCallback((
        type: string,
        state: any,
        schema: any,
        title?: string
    ): string => {
        const artifact: Artifact = {
            id: uuidv4().split('-')[0], // 8-char ID
            type,
            state,
            schema,
            title,
            version: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        store.createArtifact(type, state, schema, title);
        return artifact.id;
    }, [store]);

    // Process user message for mutations
    const processMessage = useCallback((message: string): {
        isMutation: boolean;
        artifactId?: string;
        intent?: any;
    } => {
        // First, detect if message references an artifact
        const artifactId = detectArtifactReference(message, store.artifacts);

        if (!artifactId) {
            return { isMutation: false };
        }

        // Check if it's a mutation request
        const mutationIntent = detectMutation(message, store.artifacts);

        if (mutationIntent) {
            return {
                isMutation: true,
                artifactId,
                intent: mutationIntent,
            };
        }

        return { isMutation: false, artifactId };
    }, [store.artifacts]);

    // Execute mutation
    const executeMutation = useCallback((
        artifactId: string,
        intent: any,
        reason?: string
    ): { success: boolean; error?: string } => {
        const artifact = store.getArtifact(artifactId);
        if (!artifact) {
            return { success: false, error: 'Artifact not found' };
        }

        // Validate
        const validation = validateMutation(artifact, intent);
        if (!validation.valid) {
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

        return { success: true };
    }, [store]);

    // Create relationship between artifacts
    const createRelationship = useCallback((
        sourceId: string,
        targetId: string,
        type: 'references' | 'depends_on' | 'conflicts_with' | 'derived_from' | 'similar_to',
        _metadata?: Record<string, any>
    ): string => {
        const relationship = store.addRelationship(sourceId, targetId, type);
        return relationship.id;
    }, [store]);

    return {
        // State
        artifacts: store.artifacts,
        mutations: store.mutations,
        relationships: store.relationships,

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
    };
}

/**
 * Context helper for Tambo AI
 * Automatically provides artifact context to all AI requests
 */
export function useArtifactContextHelper() {
    const { getContextString, artifacts } = useArtifactSystem();

    // This should be used with Tambo's context helpers
    // Returns context object that Tambo includes in prompts
    return useCallback(() => {
        const artifactList = Object.values(artifacts);

        return {
            artifacts: {
                count: artifactList.length,
                context: getContextString(),
                ids: artifactList.map(a => a.id),
                types: [...new Set(artifactList.map(a => a.type))],
            },
        };
    }, [artifacts, getContextString]);
}
