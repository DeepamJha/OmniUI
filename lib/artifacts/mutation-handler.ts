// Mutation handler - parses user messages and applies mutations to artifacts

import type { Artifact, MutationIntent, MutationType, MutationResult, Mutation } from './types';
import { resolveReference, hasArtifactReference } from './reference-resolver';

/**
 * Mutation patterns that users might use
 */
const MUTATION_PATTERNS: { pattern: RegExp; operation: MutationType }[] = [
    // Remove operations
    { pattern: /(?:remove|delete|drop)\s+(?:item\s+)?(\d+|the\s+\w+\s+(?:item|step|one))/i, operation: 'remove_item' },
    { pattern: /(?:remove|delete)\s+(?:the\s+)?(?:last|first)\s+(?:item|step|one)/i, operation: 'remove_item' },

    // Add operations  
    { pattern: /(?:add|append|insert)\s+['""]?(.+?)['""]?\s+(?:to|into|in)/i, operation: 'add_item' },
    { pattern: /(?:add|append)\s+(?:a\s+)?(?:new\s+)?(?:item|step)/i, operation: 'add_item' },

    // Update operations
    { pattern: /(?:update|change|set|mark)\s+(?:item\s+)?(\d+|the\s+\w+)/i, operation: 'update_item' },
    { pattern: /(?:update|change|set)\s+(?:the\s+)?(?:status|title|name)\s+to/i, operation: 'update_property' },
    { pattern: /(?:mark|set)\s+(?:as|to)\s+(?:complete|done|finished)/i, operation: 'update_item' },

    // Reorder operations
    { pattern: /(?:move|reorder|swap)\s+(?:item\s+)?(\d+)/i, operation: 'reorder_items' },
];

/**
 * Parse a message to detect mutation intent
 */
export function parseMutationIntent(
    message: string,
    artifacts: Record<string, Artifact>,
    recentArtifactIds: string[] = []
): MutationIntent | null {
    // First check if this looks like a mutation
    const isMutation = MUTATION_PATTERNS.some(({ pattern }) => pattern.test(message));
    if (!isMutation) return null;

    // Resolve which artifact is being referenced
    const artifactId = resolveReference(message, artifacts, recentArtifactIds);
    if (!artifactId) return null;

    // Determine the operation
    for (const { pattern, operation } of MUTATION_PATTERNS) {
        const match = message.match(pattern);
        if (match) {
            return {
                artifactId,
                operation,
                target: extractTarget(message, operation),
                value: extractValue(message, operation),
                originalMessage: message,
            };
        }
    }

    return null;
}

/**
 * Extract the target of the mutation (e.g., "item 3", "the last step")
 */
function extractTarget(message: string, operation: MutationType): string {
    switch (operation) {
        case 'remove_item':
        case 'update_item': {
            // Look for "item X" or ordinal references
            const itemMatch = message.match(/item\s+(\d+)/i);
            if (itemMatch) return `item ${itemMatch[1]}`;

            if (/last/i.test(message)) return 'last';
            if (/first/i.test(message)) return 'first';
            if (/second|2nd/i.test(message)) return 'second';
            if (/third|3rd/i.test(message)) return 'third';

            return 'unknown';
        }
        case 'update_property': {
            const propMatch = message.match(/(?:status|title|name)/i);
            return propMatch ? propMatch[0].toLowerCase() : 'unknown';
        }
        default:
            return 'unknown';
    }
}

/**
 * Extract the new value for the mutation
 */
function extractValue(message: string, operation: MutationType): any {
    switch (operation) {
        case 'add_item': {
            // Extract quoted content or content after "add"
            const quotedMatch = message.match(/['""](.+?)['"]/);
            if (quotedMatch) return quotedMatch[1];

            const addMatch = message.match(/add\s+(.+?)(?:\s+to|\s+into|$)/i);
            if (addMatch) return addMatch[1].trim();

            return null;
        }
        case 'update_property': {
            const toMatch = message.match(/to\s+['""]?(.+?)['""]?$/i);
            return toMatch ? toMatch[1].trim() : null;
        }
        case 'update_item': {
            if (/complete|done|finished/i.test(message)) return { completed: true };
            if (/incomplete|pending|todo/i.test(message)) return { completed: false };
            return null;
        }
        default:
            return null;
    }
}

/**
 * Apply a mutation to an artifact
 */
export function applyMutation(
    artifact: Artifact,
    intent: MutationIntent
): MutationResult {
    const { operation, target, value } = intent;

    try {
        switch (operation) {
            case 'remove_item':
                return applyRemoveItem(artifact, target);
            case 'add_item':
                return applyAddItem(artifact, value);
            case 'update_item':
                return applyUpdateItem(artifact, target, value);
            case 'update_property':
                return applyUpdateProperty(artifact, target, value);
            default:
                return { success: false, error: `Unsupported operation: ${operation}` };
        }
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

function applyRemoveItem(artifact: Artifact, target: string): MutationResult {
    const state = artifact.state;

    // Find array field in state
    const arrayField = findArrayField(state);
    if (!arrayField) {
        return { success: false, error: 'No list found in artifact' };
    }

    const array = state[arrayField] as any[];
    const index = resolveItemIndex(target, array.length);

    if (index === -1 || index >= array.length) {
        return { success: false, error: `Item ${target} not found` };
    }

    const previousValue = array[index];
    const newArray = [...array.slice(0, index), ...array.slice(index + 1)];

    return {
        success: true,
        newState: { ...state, [arrayField]: newArray },
        mutation: {
            id: '',
            artifactId: artifact.id,
            operation: 'remove_item',
            path: [arrayField, String(index)],
            previousValue,
            timestamp: Date.now(),
            source: 'user',
        },
    };
}

function applyAddItem(artifact: Artifact, value: any): MutationResult {
    const state = artifact.state;

    // Find array field in state
    const arrayField = findArrayField(state);
    if (!arrayField) {
        return { success: false, error: 'No list found in artifact' };
    }

    const array = state[arrayField] as any[];
    const newItem = typeof value === 'string' ? { title: value, description: '' } : value;

    return {
        success: true,
        newState: { ...state, [arrayField]: [...array, newItem] },
        mutation: {
            id: '',
            artifactId: artifact.id,
            operation: 'add_item',
            path: [arrayField, String(array.length)],
            value: newItem,
            timestamp: Date.now(),
            source: 'user',
        },
    };
}

function applyUpdateItem(artifact: Artifact, target: string, value: any): MutationResult {
    const state = artifact.state;

    // Find array field in state
    const arrayField = findArrayField(state);
    if (!arrayField) {
        return { success: false, error: 'No list found in artifact' };
    }

    const array = state[arrayField] as any[];
    const index = resolveItemIndex(target, array.length);

    if (index === -1 || index >= array.length) {
        return { success: false, error: `Item ${target} not found` };
    }

    const previousValue = array[index];
    const updatedItem = { ...array[index], ...value };
    const newArray = [...array.slice(0, index), updatedItem, ...array.slice(index + 1)];

    return {
        success: true,
        newState: { ...state, [arrayField]: newArray },
        mutation: {
            id: '',
            artifactId: artifact.id,
            operation: 'update_item',
            path: [arrayField, String(index)],
            value: updatedItem,
            previousValue,
            timestamp: Date.now(),
            source: 'user',
        },
    };
}

function applyUpdateProperty(artifact: Artifact, target: string, value: any): MutationResult {
    const state = artifact.state;

    if (!(target in state)) {
        return { success: false, error: `Property ${target} not found` };
    }

    const previousValue = state[target];

    return {
        success: true,
        newState: { ...state, [target]: value },
        mutation: {
            id: '',
            artifactId: artifact.id,
            operation: 'update_property',
            path: [target],
            value,
            previousValue,
            timestamp: Date.now(),
            source: 'user',
        },
    };
}

/**
 * Find the main array field in artifact state
 */
function findArrayField(state: Record<string, any>): string | null {
    // Common array field names
    const commonNames = ['items', 'steps', 'tasks', 'metrics', 'list', 'entries'];

    for (const name of commonNames) {
        if (Array.isArray(state[name])) return name;
    }

    // Fall back to first array field
    for (const [key, value] of Object.entries(state)) {
        if (Array.isArray(value)) return key;
    }

    return null;
}

/**
 * Resolve item index from target string
 */
function resolveItemIndex(target: string, arrayLength: number): number {
    // Direct number
    const numMatch = target.match(/(\d+)/);
    if (numMatch) {
        return parseInt(numMatch[1], 10) - 1; // 1-indexed to 0-indexed
    }

    // Ordinal words
    if (/first/i.test(target)) return 0;
    if (/second|2nd/i.test(target)) return 1;
    if (/third|3rd/i.test(target)) return 2;
    if (/last/i.test(target)) return arrayLength - 1;

    return -1;
}

/**
 * Check if a message looks like a mutation request
 */
export function isMutationRequest(message: string): boolean {
    return MUTATION_PATTERNS.some(({ pattern }) => pattern.test(message));
}
