'use client';

import { useCallback } from 'react';
import { useArtifactStore, useArtifactHydration, ARTIFACT_SCHEMAS } from '../artifacts/store';
import type { Artifact, Relationship } from '../artifacts/types';
import { resolveReference } from '../artifacts/reference-resolver';
import { detectMutation, applyMutation, validateMutation, MutationIntent } from '../artifacts/mutation-handler';
import {
    detectRelationships,
    detectTypeBasedRelationships,
    getReferencedArtifactsForContext
} from '../artifacts/relationship-detector';
import { v4 as uuidv4 } from 'uuid';

/**
 * Build RICH context string for AI prompts with full artifact state
 * This enables cross-artifact reasoning
 */
function buildArtifactContext(
    artifacts: Record<string, Artifact>,
    relationships: Relationship[],
    hasHydrated: boolean
): string {
    if (!hasHydrated) {
        return 'Artifacts are being loaded from storage...';
    }

    const artifactList = Object.values(artifacts);

    if (artifactList.length === 0) {
        return 'No artifacts exist yet in this conversation.';
    }

    const sorted = artifactList.sort((a, b) => b.createdAt - a.createdAt);

    // Build detailed context with state summaries
    const artifactDetails = sorted.map(a => {
        const title = a.title || (a.state as any).title || 'Untitled';
        const statePreview = getStatePreview(a);
        const relatedInfo = getRelationshipInfo(a.id, relationships, artifacts);

        return `## Artifact #${a.id} (${a.type})
Title: "${title}" | Version: ${a.version}
${statePreview}
${relatedInfo}`;
    }).join('\n\n');

    return `# WORKSPACE ARTIFACTS (${artifactList.length} total)
IMPORTANT: These artifacts are AUTHORITATIVE STATE. Do NOT regenerate them.
To modify an artifact, use mutations. To analyze, READ their state below.

${artifactDetails}

---
INSTRUCTIONS:
- Reference artifacts by ID: #${sorted[0]?.id || 'abc12345'}
- To modify: "remove step 2 from #${sorted[0]?.id || 'abc12345'}"
- To analyze across artifacts: READ their states above, then synthesize`;
}

/**
 * Get a preview of artifact state for AI context
 */
function getStatePreview(artifact: Artifact): string {
    const state = artifact.state;

    if (artifact.type === 'ExecutionPlan') {
        const steps = state.steps || [];
        return `Steps: ${steps.length}
${steps.slice(0, 3).map((s: any, i: number) => `  ${i + 1}. ${s.action || s.title || 'Step'}`).join('\n')}${steps.length > 3 ? `\n  ...and ${steps.length - 3} more` : ''}`;
    }

    if (artifact.type === 'SystemStatusPanel') {
        return `Status: ${state.overall_status || 'Unknown'}
Components: ${(state.components || []).length}`;
    }

    if (artifact.type === 'CommandResultPanel') {
        return `Summary: ${(state.summary || '').slice(0, 100)}${(state.summary || '').length > 100 ? '...' : ''}
Details: ${(state.details || []).length} items`;
    }

    // Generic fallback
    const keys = Object.keys(state);
    return `Fields: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? `, +${keys.length - 5} more` : ''}`;
}

/**
 * Get relationship info for an artifact
 */
function getRelationshipInfo(
    artifactId: string,
    relationships: Relationship[],
    artifacts: Record<string, Artifact>
): string {
    const related = relationships.filter(r => r.sourceId === artifactId || r.targetId === artifactId);
    if (related.length === 0) return '';

    const lines = related.map(r => {
        const otherId = r.sourceId === artifactId ? r.targetId : r.sourceId;
        const other = artifacts[otherId];
        return `  → ${r.type}: #${otherId} (${other?.type || 'unknown'})`;
    });

    return `Relationships:\n${lines.join('\n')}`;
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

    // Get context string for AI prompts (hydration-aware, with full state)
    const getContextString = useCallback(() => {
        return buildArtifactContext(store.artifacts, store.relationships, hasHydrated);
    }, [store.artifacts, store.relationships, hasHydrated]);

    // Get artifacts referenced in a specific message (for focused context)
    const getReferencedContext = useCallback((message: string): string => {
        const referencedArtifacts = getReferencedArtifactsForContext(message, store.artifacts);

        if (referencedArtifacts.length === 0) {
            return getContextString();
        }

        // Build focused context for just the referenced artifacts
        return `# REFERENCED ARTIFACTS
The user is asking about these specific artifacts:

${referencedArtifacts.map(a => {
            const state = JSON.stringify(a.state, null, 2);
            return `## #${a.id} (${a.type})
\`\`\`json
${state}
\`\`\``;
        }).join('\n\n')}

Analyze the above artifacts to answer the user's question.`;
    }, [store.artifacts, getContextString]);

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

        // Auto-detect relationships with existing artifacts
        const autoRelationships = detectTypeBasedRelationships(artifact, store.artifacts);
        autoRelationships.forEach(rel => {
            store.addRelationship(rel.sourceId, rel.targetId, rel.type);
            console.log(`🔗 Auto-linked: ${rel.sourceId} → ${rel.targetId} (${rel.type})`);
        });

        return id;
    }, [store]);

    // Process user message for mutations and relationships (hydration-aware)
    const processMessage = useCallback((message: string): {
        isMutation: boolean;
        artifactId?: string;
        intent?: MutationIntent;
        detectedRelationships?: { sourceId: string; targetId: string; type: string }[];
    } => {
        if (!hasHydrated) {
            return { isMutation: false };
        }

        // Detect if message references an artifact
        const artifactId = detectArtifactReference(message, store.artifacts);

        // Detect relationships mentioned in the message
        const detectedRels = detectRelationships(message, artifactId, store.artifacts);

        // Auto-create detected relationships
        detectedRels.forEach(rel => {
            // Check if relationship already exists
            const exists = store.relationships.some(
                r => r.sourceId === rel.sourceId && r.targetId === rel.targetId
            );
            if (!exists) {
                store.addRelationship(rel.sourceId, rel.targetId, rel.type);
                console.log(`🔗 Detected relationship: ${rel.sourceId} → ${rel.targetId} (${rel.type})`);
            }
        });

        if (!artifactId) {
            return { isMutation: false, detectedRelationships: detectedRels };
        }

        // Check if it's a mutation request
        const mutationIntent = detectMutation(message, store.artifacts);

        if (mutationIntent) {
            console.log(`🔄 Detected mutation intent:`, mutationIntent);
            return {
                isMutation: true,
                artifactId,
                intent: mutationIntent,
                detectedRelationships: detectedRels,
            };
        }

        return { isMutation: false, artifactId, detectedRelationships: detectedRels };
    }, [store.artifacts, store.relationships, hasHydrated, store]);

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
        addArtifact: store.addArtifact,
        updateArtifact: store.updateArtifact,
        deleteArtifact: store.deleteArtifact,
        getArtifact: store.getArtifact,

        // Mutations
        executeMutation,
        undoLastMutation: store.undoLastMutation,
        getMutations: store.getMutations,

        // Relationships
        createRelationship: store.addRelationship,
        getRelated: store.getRelated,

        // Context & Processing
        getContextString,
        getReferencedContext,
        processMessage,
        resolveReference: (ref: string) => resolveReference(ref, store.artifacts),

        // Utility
        clear: store.clear,
        getAllArtifacts: store.getAllArtifacts,
    };
}

/**
 * Context helper for Tambo AI with hydration check and rich context
 */
export function useArtifactContextHelper() {
    const { getContextString, artifacts, relationships, hasHydrated } = useArtifactSystem();

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
                relationshipCount: relationships.length,
                status: 'ready',
            },
        };
    }, [artifacts, relationships, getContextString, hasHydrated]);
}
