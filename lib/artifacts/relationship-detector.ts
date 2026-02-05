// Relationship Detector - Auto-detect relationships between artifacts
// Detects references like "based on the plan", "depends on #abc123", etc.

import type { Artifact, Relationship, RelationType } from './types';

interface DetectedRelationship {
    sourceId: string;
    targetId: string;
    type: RelationType;
    reason: string;
}

// Patterns for detecting relationships in natural language
const RELATIONSHIP_PATTERNS: { pattern: RegExp; type: RelationType }[] = [
    // Explicit ID references
    { pattern: /#([a-z0-9]{6,10})/gi, type: 'references' },

    // Dependency language
    { pattern: /depends on|requires|needs|relies on|based on/gi, type: 'depends_on' },

    // Derivation language
    { pattern: /derived from|created from|built from|extracted from/gi, type: 'derived_from' },

    // Conflict language
    { pattern: /conflicts with|contradicts|incompatible with|overrides/gi, type: 'conflicts_with' },

    // Reference language
    { pattern: /references?|mentions?|refers to|see also|related to/gi, type: 'references' },

    // Similarity language
    { pattern: /similar to|like|same as|equivalent to/gi, type: 'similar_to' },
];

// Type-specific relationship hints
const TYPE_AFFINITIES: Record<string, { relatesTo: string[]; defaultType: RelationType }> = {
    'ExecutionPlan': {
        relatesTo: ['RiskMatrix', 'SystemStatusPanel', 'CommandResultPanel'],
        defaultType: 'references',
    },
    'RiskMatrix': {
        relatesTo: ['ExecutionPlan', 'SystemStatusPanel'],
        defaultType: 'references',
    },
    'SystemStatusPanel': {
        relatesTo: ['CommandResultPanel', 'ExecutionPlan'],
        defaultType: 'references',
    },
    'CommandResultPanel': {
        relatesTo: ['ExecutionPlan', 'SystemStatusPanel'],
        defaultType: 'derived_from',
    },
};

/**
 * Detect explicit artifact ID references in a message
 */
export function detectExplicitReferences(
    message: string,
    artifacts: Record<string, Artifact>
): string[] {
    const ids: string[] = [];
    const idPattern = /#([a-z0-9]{6,10})/gi;
    let match;

    while ((match = idPattern.exec(message)) !== null) {
        const id = match[1];
        if (artifacts[id]) {
            ids.push(id);
        }
    }

    return [...new Set(ids)];
}

/**
 * Detect artifact references by type name
 * e.g., "the deployment plan", "that status panel"
 */
export function detectTypeReferences(
    message: string,
    artifacts: Record<string, Artifact>
): string[] {
    const lowerMessage = message.toLowerCase();
    const ids: string[] = [];

    // Common type name patterns
    const typePatterns: Record<string, string[]> = {
        'ExecutionPlan': ['plan', 'deployment plan', 'execution plan', 'roadmap', 'checklist'],
        'SystemStatusPanel': ['status', 'health', 'system status', 'status panel'],
        'CommandResultPanel': ['result', 'analysis', 'output', 'command result'],
        'RiskMatrix': ['risk', 'risks', 'risk matrix', 'risk assessment'],
    };

    const articlePatterns = ['the ', 'that ', 'this ', 'my ', 'our '];

    Object.entries(artifacts).forEach(([id, artifact]) => {
        const patterns = typePatterns[artifact.type] || [];

        for (const pattern of patterns) {
            for (const article of articlePatterns) {
                if (lowerMessage.includes(article + pattern)) {
                    ids.push(id);
                    return; // Found a match for this artifact
                }
            }
            // Also check for title matches
            if (artifact.title && lowerMessage.includes(artifact.title.toLowerCase())) {
                ids.push(id);
                return;
            }
        }
    });

    return [...new Set(ids)];
}

/**
 * Infer relationship type from message context
 */
export function inferRelationshipType(message: string): RelationType {
    const lowerMessage = message.toLowerCase();

    for (const { pattern, type } of RELATIONSHIP_PATTERNS) {
        if (pattern.test(lowerMessage)) {
            return type;
        }
    }

    return 'references'; // Default
}

/**
 * Main function: Detect all relationships from a user message
 */
export function detectRelationships(
    message: string,
    sourceArtifactId: string | null,
    artifacts: Record<string, Artifact>
): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];

    // Find all referenced artifacts
    const explicitRefs = detectExplicitReferences(message, artifacts);
    const typeRefs = detectTypeReferences(message, artifacts);
    const allRefs = [...new Set([...explicitRefs, ...typeRefs])];

    if (allRefs.length === 0) return relationships;

    // Infer the relationship type
    const relType = inferRelationshipType(message);

    // If we have a source artifact, create relationships from it
    if (sourceArtifactId && artifacts[sourceArtifactId]) {
        for (const targetId of allRefs) {
            if (targetId !== sourceArtifactId) {
                relationships.push({
                    sourceId: sourceArtifactId,
                    targetId,
                    type: relType,
                    reason: `Detected from message: "${message.slice(0, 50)}..."`,
                });
            }
        }
    } else if (allRefs.length >= 2) {
        // No source artifact but multiple references - link them
        for (let i = 0; i < allRefs.length - 1; i++) {
            relationships.push({
                sourceId: allRefs[i],
                targetId: allRefs[i + 1],
                type: relType,
                reason: `Both referenced in message`,
            });
        }
    }

    return relationships;
}

/**
 * Auto-detect relationships when a new artifact is created
 * Based on its type and existing artifacts
 */
export function detectTypeBasedRelationships(
    newArtifact: Artifact,
    existingArtifacts: Record<string, Artifact>
): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];
    const affinity = TYPE_AFFINITIES[newArtifact.type];

    if (!affinity) return relationships;

    Object.entries(existingArtifacts).forEach(([id, artifact]) => {
        if (id === newArtifact.id) return;

        if (affinity.relatesTo.includes(artifact.type)) {
            // Check if relationship already exists
            relationships.push({
                sourceId: newArtifact.id,
                targetId: id,
                type: affinity.defaultType,
                reason: `Auto-detected: ${newArtifact.type} → ${artifact.type}`,
            });
        }
    });

    return relationships;
}

/**
 * Parse a message for cross-artifact reasoning context
 * Returns artifacts that should be included in AI context
 */
export function getReferencedArtifactsForContext(
    message: string,
    artifacts: Record<string, Artifact>
): Artifact[] {
    const explicitRefs = detectExplicitReferences(message, artifacts);
    const typeRefs = detectTypeReferences(message, artifacts);
    const allRefs = [...new Set([...explicitRefs, ...typeRefs])];

    return allRefs.map(id => artifacts[id]).filter(Boolean);
}
