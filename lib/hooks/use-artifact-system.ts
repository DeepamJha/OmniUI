// Main hook for using the artifact system

import { useCallback, useMemo } from 'react';
import { ZodSchema } from 'zod';
import { useArtifactStore } from '../artifacts/store';
import { detectMutation, applyMutation, isMutationRequest, MutationIntent } from '../artifacts/mutation-handler';
import type { Artifact, MutationResult } from '../artifacts/types';

export interface UseArtifactSystemReturn {
    // State
    artifacts: Record<string, Artifact>;

    // Actions
    createArtifact: <T>(type: string, state: T, schema: ZodSchema<T>, title?: string) => Artifact<T>;
    updateArtifact: <T>(id: string, updates: Partial<T>) => MutationResult;
    deleteArtifact: (id: string) => void;
    getArtifact: (id: string) => Artifact | undefined;

    // Mutation handling
    processMessage: (message: string) => {
        isMutation: boolean;
        artifactId?: string;
        intent?: MutationIntent;
    };
    executeMutation: (artifactId: string, intent: MutationIntent, originalMessage: string) => MutationResult;
    undoLastMutation: (artifactId: string) => MutationResult;

    // Context
    getContextString: () => string;
    getMutations: (artifactId: string) => any[];
    getRelated: (artifactId: string) => Artifact[];
}

export function useArtifactSystem(): UseArtifactSystemReturn {
    const store = useArtifactStore();

    const processMessage = useCallback((message: string) => {
        // Check if this looks like a mutation
        if (!isMutationRequest(message)) {
            return { isMutation: false };
        }

        // Try to detect mutation intent
        const intent = detectMutation(message, store.artifacts);
        if (!intent) {
            return { isMutation: false };
        }

        return {
            isMutation: true,
            artifactId: intent.artifactId,
            intent,
        };
    }, [store.artifacts]);

    const executeMutation = useCallback((
        artifactId: string,
        intent: MutationIntent,
        _originalMessage: string
    ): MutationResult => {
        const artifact = store.artifacts[artifactId];
        if (!artifact) {
            return { success: false, error: `Artifact ${artifactId} not found` };
        }

        // Apply the mutation (validation is built-in)
        const result = applyMutation(artifact, intent, 'user');

        if (result.success && result.newState) {
            // Update the store
            store.updateArtifact(artifactId, result.newState);

            // Record the mutation
            if (result.mutation) {
                store.addMutation({
                    ...result.mutation,
                    artifactId,
                });
            }

            return { success: true, newState: result.newState };
        }

        return result;
    }, [store]);

    return useMemo(() => ({
        artifacts: store.artifacts,
        createArtifact: store.createArtifact,
        updateArtifact: store.updateArtifact,
        deleteArtifact: store.deleteArtifact,
        getArtifact: store.getArtifact,
        processMessage,
        executeMutation,
        undoLastMutation: store.undoLastMutation,
        getContextString: store.getContextString,
        getMutations: store.getMutations,
        getRelated: store.getRelated,
    }), [store, processMessage, executeMutation]);
}
