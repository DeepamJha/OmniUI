// Cross-Artifact Reasoning Engine
// This is your hackathon killer feature

import { Artifact, Relationship } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Detects when user query requires reading multiple artifacts
 */
export interface CrossArtifactQuery {
    type: 'compare' | 'analyze_impact' | 'find_conflicts' | 'merge' | 'derive';
    sourceArtifactIds: string[];
    intent: string;
    expectedOutput?: string;
}

/**
 * Detects cross-artifact queries from user message
 */
export function detectCrossArtifactQuery(
    message: string,
    artifacts: Record<string, Artifact>
): CrossArtifactQuery | null {
    const normalized = message.toLowerCase();
    const artifactList = Object.values(artifacts);

    if (artifactList.length < 2) {
        return null; // Need at least 2 artifacts for cross-artifact reasoning
    }

    // Pattern 1: "Which X affect Y"
    // Example: "Which risks affect the deployment plan?"
    const affectPattern = /which\s+(\w+)\s+affect\s+(?:the\s+)?(\w+)/i;
    const affectMatch = message.match(affectPattern);
    if (affectMatch) {
        const [, sourceType, targetType] = affectMatch;

        const sourceArtifacts = artifactList.filter(a =>
            a.type.toLowerCase().includes(sourceType.toLowerCase())
        );
        const targetArtifacts = artifactList.filter(a =>
            a.type.toLowerCase().includes(targetType.toLowerCase())
        );

        if (sourceArtifacts.length > 0 && targetArtifacts.length > 0) {
            return {
                type: 'analyze_impact',
                sourceArtifactIds: [...sourceArtifacts.map(a => a.id), ...targetArtifacts.map(a => a.id)],
                intent: message,
                expectedOutput: 'ImpactAnalysis',
            };
        }
    }

    // Pattern 2: "Compare X and Y"
    // Example: "Compare this week's metrics to last week"
    const comparePattern = /compare\s+(.+?)\s+(?:to|and|with)\s+(.+)/i;
    const compareMatch = message.match(comparePattern);
    if (compareMatch) {
        // Find artifacts by reference
        const recentArtifacts = artifactList
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 2);

        if (recentArtifacts.length === 2) {
            return {
                type: 'compare',
                sourceArtifactIds: recentArtifacts.map(a => a.id),
                intent: message,
                expectedOutput: 'ComparisonResult',
            };
        }
    }

    // Pattern 3: "Conflicts between X and Y"
    const conflictPattern = /conflict|inconsisten/i;
    if (conflictPattern.test(normalized)) {
        const recentArtifacts = artifactList
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 2);

        if (recentArtifacts.length >= 2) {
            return {
                type: 'find_conflicts',
                sourceArtifactIds: recentArtifacts.map(a => a.id),
                intent: message,
                expectedOutput: 'ConflictAnalysis',
            };
        }
    }

    // Pattern 4: "Based on X, create Y"
    const derivedPattern = /based\s+on\s+(?:the\s+)?(\w+)/i;
    const derivedMatch = message.match(derivedPattern);
    if (derivedMatch) {
        const sourceType = derivedMatch[1];
        const sourceArtifacts = artifactList.filter(a =>
            a.type.toLowerCase().includes(sourceType.toLowerCase())
        );

        if (sourceArtifacts.length > 0) {
            return {
                type: 'derive',
                sourceArtifactIds: sourceArtifacts.map(a => a.id),
                intent: message,
            };
        }
    }

    // Pattern 5: "Merge X and Y"
    const mergePattern = /merge|combine/i;
    if (mergePattern.test(normalized)) {
        const recentArtifacts = artifactList
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 2);

        if (recentArtifacts.length === 2) {
            return {
                type: 'merge',
                sourceArtifactIds: recentArtifacts.map(a => a.id),
                intent: message,
            };
        }
    }

    return null;
}

/**
 * Builds enhanced context for cross-artifact queries
 * Includes full artifact state for AI to analyze
 */
export function buildCrossArtifactContext(
    query: CrossArtifactQuery,
    artifacts: Record<string, Artifact>
): string {
    const relevantArtifacts = query.sourceArtifactIds
        .map(id => artifacts[id])
        .filter(Boolean);

    if (relevantArtifacts.length === 0) {
        return 'No relevant artifacts found.';
    }

    return `
CROSS-ARTIFACT QUERY DETECTED
Query Type: ${query.type}
User Intent: "${query.intent}"

RELEVANT ARTIFACTS TO ANALYZE:
${relevantArtifacts.map((artifact, i) => `
Artifact ${i + 1}: ${artifact.id}
Type: ${artifact.type}
Title: ${artifact.title || 'Untitled'}
State:
${JSON.stringify(artifact.state, null, 2)}
`).join('\n---\n')}

INSTRUCTIONS FOR AI:
1. Read and understand ALL artifacts above
2. Analyze relationships between them
3. ${getInstructionsForQueryType(query.type)}
4. Create explicit relationships between artifacts
5. Generate new artifact with insights

CRITICAL: 
- Reference artifacts by their IDs (${query.sourceArtifactIds.join(', ')})
- Use createRelationship tool to link artifacts
- Create new artifact with type: ${query.expectedOutput || 'Analysis'}
`.trim();
}

function getInstructionsForQueryType(type: CrossArtifactQuery['type']): string {
    switch (type) {
        case 'analyze_impact':
            return 'Identify which items in source artifact affect items in target artifact';
        case 'compare':
            return 'Find similarities, differences, and trends between artifacts';
        case 'find_conflicts':
            return 'Identify contradictions, inconsistencies, or conflicts';
        case 'merge':
            return 'Combine artifacts into unified view, resolving conflicts';
        case 'derive':
            return 'Use source artifact as input to create derived artifact';
        default:
            return 'Perform requested analysis';
    }
}

/**
 * Auto-creates relationships when AI references artifacts
 */
export function autoCreateRelationships(
    newArtifactId: string,
    referencedArtifactIds: string[],
    type: 'references' | 'derived_from' | 'depends_on' = 'references'
): Relationship[] {
    return referencedArtifactIds.map(targetId => ({
        id: `rel_${uuidv4().split('-')[0]}`,
        sourceId: newArtifactId,
        targetId,
        type,
        bidirectional: false,
        createdAt: Date.now(),
    }));
}

/**
 * Analyzes artifact to find what it references
 * Looks for artifact IDs in state
 */
export function extractArtifactReferences(artifact: Artifact): string[] {
    const stateStr = JSON.stringify(artifact.state);
    const idPattern = /[a-f0-9]{8}/g;
    const matches = stateStr.match(idPattern) || [];

    // Filter out duplicates and the artifact's own ID
    return [...new Set(matches)].filter(id => id !== artifact.id);
}

/**
 * Builds relationship graph for visualization
 */
export interface ArtifactNode {
    id: string;
    type: string;
    title: string;
    x?: number;
    y?: number;
}

export interface RelationshipEdge {
    source: string;
    target: string;
    type: string;
}

export function buildRelationshipGraph(
    artifacts: Record<string, Artifact>,
    relationships: Relationship[]
): { nodes: ArtifactNode[]; edges: RelationshipEdge[] } {
    const nodes: ArtifactNode[] = Object.values(artifacts).map(a => ({
        id: a.id,
        type: a.type,
        title: a.title || (a.state as any).title || 'Untitled',
    }));

    const edges: RelationshipEdge[] = relationships.map(r => ({
        source: r.sourceId,
        target: r.targetId,
        type: r.type,
    }));

    return { nodes, edges };
}
