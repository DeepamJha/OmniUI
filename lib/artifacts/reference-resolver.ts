// Reference resolver - converts natural language references to artifact IDs

import type { Artifact } from './types';

/**
 * Reference patterns that users might use
 */
const REFERENCE_PATTERNS = [
    // Direct ID references
    /\#([a-f0-9]{8})/i,                          // #a8f2b4c1
    /artifact\s+([a-f0-9]{8})/i,                 // artifact a8f2b4c1

    // Positional references
    /(?:the\s+)?(?:first|1st)\s+(?:one|artifact|item)/i,
    /(?:the\s+)?(?:second|2nd)\s+(?:one|artifact|item)/i,
    /(?:the\s+)?(?:third|3rd)\s+(?:one|artifact|item)/i,
    /(?:the\s+)?(?:last|latest|most recent)\s+(?:one|artifact|item)?/i,
    /(?:the\s+)?(?:previous|prior)\s+(?:one|artifact|item)?/i,

    // Type-based references  
    /(?:the|that)\s+(plan|roadmap|checklist|result|status|analysis)/i,

    // Demonstrative references
    /(?:this|that|it)\s+(?:one)?/i,
];

/**
 * Resolve a natural language reference to an artifact ID
 */
export function resolveReference(
    message: string,
    artifacts: Record<string, Artifact>,
    recentArtifactIds: string[] = []
): string | null {
    const artifactList = Object.values(artifacts);
    if (artifactList.length === 0) return null;

    // Sort by creation time (newest first for recency)
    const sortedByTime = [...artifactList].sort((a, b) => b.createdAt - a.createdAt);

    // Check for direct ID reference
    const idMatch = message.match(/\#([a-f0-9]{8})/i);
    if (idMatch) {
        const id = idMatch[1].toLowerCase();
        if (artifacts[id]) return id;
    }

    // Check for "artifact <id>" pattern
    const artifactIdMatch = message.match(/artifact\s+([a-f0-9]{8})/i);
    if (artifactIdMatch) {
        const id = artifactIdMatch[1].toLowerCase();
        if (artifacts[id]) return id;
    }

    // Check positional references
    if (/(?:first|1st)/i.test(message) && artifactList.length > 0) {
        const oldest = [...artifactList].sort((a, b) => a.createdAt - b.createdAt)[0];
        return oldest.id;
    }

    if (/(?:second|2nd)/i.test(message) && artifactList.length > 1) {
        const sorted = [...artifactList].sort((a, b) => a.createdAt - b.createdAt);
        return sorted[1].id;
    }

    if (/(?:third|3rd)/i.test(message) && artifactList.length > 2) {
        const sorted = [...artifactList].sort((a, b) => a.createdAt - b.createdAt);
        return sorted[2].id;
    }

    if (/(?:last|latest|most recent)/i.test(message)) {
        return sortedByTime[0].id;
    }

    if (/(?:previous|prior)/i.test(message) && sortedByTime.length > 1) {
        return sortedByTime[1].id;
    }

    // Check type-based references
    const typeMatch = message.match(/(?:the|that)\s+(plan|roadmap|checklist|result|status|analysis)/i);
    if (typeMatch) {
        const typeKeyword = typeMatch[1].toLowerCase();
        const typeMap: Record<string, string[]> = {
            'plan': ['ExecutionPlan'],
            'roadmap': ['ExecutionPlan'],
            'checklist': ['ExecutionPlan', 'CommandResultPanel'],
            'result': ['CommandResultPanel'],
            'status': ['SystemStatusPanel'],
            'analysis': ['CommandResultPanel'],
        };

        const matchingTypes = typeMap[typeKeyword] || [];
        const matching = sortedByTime.find((a) => matchingTypes.includes(a.type));
        if (matching) return matching.id;
    }

    // "this", "that", "it" - return most recent
    if (/\b(?:this|that|it)\b/i.test(message)) {
        // Prefer from recent artifact IDs if available
        if (recentArtifactIds.length > 0) {
            const recentId = recentArtifactIds[recentArtifactIds.length - 1];
            if (artifacts[recentId]) return recentId;
        }
        return sortedByTime[0]?.id || null;
    }

    return null;
}

/**
 * Check if a message contains a reference to an artifact
 */
export function hasArtifactReference(message: string): boolean {
    return REFERENCE_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Extract all artifact references from a message
 */
export function extractAllReferences(
    message: string,
    artifacts: Record<string, Artifact>
): string[] {
    const refs: Set<string> = new Set();

    // Find all direct ID references
    const idMatches = message.matchAll(/\#([a-f0-9]{8})/gi);
    for (const match of idMatches) {
        const id = match[1].toLowerCase();
        if (artifacts[id]) refs.add(id);
    }

    // Add resolved reference if found
    const resolved = resolveReference(message, artifacts);
    if (resolved) refs.add(resolved);

    return Array.from(refs);
}
