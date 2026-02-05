// Mutation detection and application - merged best of both versions

import type { Artifact, MutationType, MutationResult, Mutation } from './types';
import { resolveReference } from './reference-resolver';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mutation intent detected from natural language
 */
export interface MutationIntent {
    type: MutationType;
    artifactId: string;
    details: {
        itemIndex?: number;
        itemId?: string;
        property?: string;
        value?: any;
        condition?: (item: any) => boolean;
    };
    originalMessage: string;
}

/**
 * Mutation patterns with inline extractors
 * Easy to add new patterns - logic is right next to the regex
 */
const MUTATION_PATTERNS: Array<{
    pattern: RegExp;
    type: MutationType;
    extractor: (match: RegExpMatchArray, message: string) => Partial<MutationIntent['details']>;
}> = [
        // Remove operations
        {
            pattern: /(?:remove|delete)\s+(?:item\s+)?(\d+|the\s+(?:first|second|third|last))/i,
            type: 'remove_item',
            extractor: (match) => {
                const indexStr = match[1];
                if (indexStr.match(/\d+/)) {
                    return { itemIndex: parseInt(indexStr) - 1 }; // Convert to 0-based
                }
                const ordinalMap: Record<string, number> = {
                    'first': 0, 'second': 1, 'third': 2, 'last': -1
                };
                for (const [ordinal, index] of Object.entries(ordinalMap)) {
                    if (indexStr.includes(ordinal)) {
                        return { itemIndex: index };
                    }
                }
                return {};
            },
        },
        {
            pattern: /(?:remove|delete)\s+(?:the\s+)?(?:last|first)\s+(?:item|step|one)/i,
            type: 'remove_item',
            extractor: (_, message) => {
                if (/last/i.test(message)) return { itemIndex: -1 };
                if (/first/i.test(message)) return { itemIndex: 0 };
                return {};
            },
        },
        {
            pattern: /(?:remove|delete)\s+completed/i,
            type: 'remove_item',
            extractor: () => ({
                condition: (item: any) => item.completed === true || item.status === 'complete',
            }),
        },

        // Add operations
        {
            pattern: /(?:add|insert)\s+['"]?(.+?)['"]?\s+(?:to|into|at)/i,
            type: 'add_item',
            extractor: (match) => ({ value: match[1].trim() }),
        },
        {
            pattern: /(?:add|append)\s+(?:a\s+)?(?:new\s+)?(?:item|step)/i,
            type: 'add_item',
            extractor: () => ({ value: 'New item' }),
        },

        // Update operations
        {
            pattern: /(?:mark)\s+(?:item\s+)?(\d+)\s+(?:as\s+)?(\w+)/i,
            type: 'update_item',
            extractor: (match) => ({
                itemIndex: parseInt(match[1]) - 1,
                property: 'status',
                value: match[2],
            }),
        },
        {
            pattern: /(?:mark|set)\s+(?:as|to)\s+(?:complete|done|finished)/i,
            type: 'update_item',
            extractor: () => ({ property: 'completed', value: true }),
        },
        {
            pattern: /(?:change|update|set)\s+(.+?)\s+to\s+['"]?(.+?)['"]?$/i,
            type: 'update_property',
            extractor: (match) => ({
                property: match[1].trim().toLowerCase(),
                value: match[2].trim(),
            }),
        },

        // Reorder operations
        {
            pattern: /(?:move|reorder)\s+(?:item\s+)?(\d+)\s+(?:to|before|after)\s+(\d+)/i,
            type: 'reorder_items',
            extractor: (match) => ({
                itemIndex: parseInt(match[1]) - 1,
                value: parseInt(match[2]) - 1,
            }),
        },
    ];

/**
 * Detect mutation intent from natural language
 */
export function detectMutation(
    userMessage: string,
    artifacts: Record<string, Artifact>,
    recentArtifactIds: string[] = []
): MutationIntent | null {
    const artifactId = resolveReference(userMessage, artifacts, recentArtifactIds);
    if (!artifactId) {
        // Try with most recent artifact as fallback
        const artifactList = Object.values(artifacts);
        if (artifactList.length === 0) return null;
        const mostRecent = artifactList.sort((a, b) => b.createdAt - a.createdAt)[0];
        if (!mostRecent) return null;
    }

    const normalized = userMessage.toLowerCase();

    for (const { pattern, type, extractor } of MUTATION_PATTERNS) {
        const match = normalized.match(pattern);
        if (match) {
            const resolvedId = artifactId || Object.values(artifacts).sort((a, b) => b.createdAt - a.createdAt)[0]?.id;
            if (!resolvedId) return null;

            return {
                type,
                artifactId: resolvedId,
                details: extractor(match, userMessage),
                originalMessage: userMessage,
            };
        }
    }

    return null;
}

/**
 * Check if message looks like a mutation request
 */
export function isMutationRequest(message: string): boolean {
    return MUTATION_PATTERNS.some(({ pattern }) => pattern.test(message.toLowerCase()));
}

/**
 * Validates that a mutation is safe to apply
 */
export function validateMutation(
    artifact: Artifact,
    intent: MutationIntent
): { valid: boolean; error?: string } {
    if (!artifact) {
        return { valid: false, error: 'Artifact not found' };
    }

    const state = artifact.state;
    const arrayField = findArrayField(state);

    switch (intent.type) {
        case 'remove_item':
        case 'update_item':
            if (!arrayField || !Array.isArray(state[arrayField])) {
                return { valid: false, error: 'Artifact has no items to modify' };
            }
            if (intent.details.itemIndex !== undefined && !intent.details.condition) {
                const index = intent.details.itemIndex === -1
                    ? state[arrayField].length - 1
                    : intent.details.itemIndex;
                if (index < 0 || index >= state[arrayField].length) {
                    return { valid: false, error: `Item ${index + 1} doesn't exist (only ${state[arrayField].length} items)` };
                }
            }
            break;

        case 'add_item':
            if (!arrayField) {
                return { valid: false, error: 'Artifact has no list to add to' };
            }
            break;

        case 'update_property':
            if (intent.details.property && !(intent.details.property in state)) {
                return { valid: false, error: `Property "${intent.details.property}" not found` };
            }
            break;
    }

    return { valid: true };
}

/**
 * Apply mutation to artifact - returns new state and mutation record
 */
export function applyMutation(
    artifact: Artifact,
    intent: MutationIntent,
    source: 'user' | 'ai' = 'user'
): MutationResult {
    // Validate first
    const validation = validateMutation(artifact, intent);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    try {
        switch (intent.type) {
            case 'remove_item':
                return applyRemoveItem(artifact, intent, source);
            case 'add_item':
                return applyAddItem(artifact, intent, source);
            case 'update_item':
                return applyUpdateItem(artifact, intent, source);
            case 'update_property':
                return applyUpdateProperty(artifact, intent, source);
            case 'reorder_items':
                return applyReorderItems(artifact, intent, source);
            default:
                return { success: false, error: `Unsupported operation: ${intent.type}` };
        }
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

// ============ Separated Apply Functions ============

function applyRemoveItem(artifact: Artifact, intent: MutationIntent, source: 'user' | 'ai'): MutationResult {
    const state = artifact.state;
    const arrayField = findArrayField(state)!;
    const array = [...state[arrayField]]; // Clone array

    let previousValue: any;
    let newArray: any[];

    if (intent.details.condition) {
        // Condition-based removal (e.g., "remove completed")
        previousValue = array.filter(intent.details.condition);
        newArray = array.filter((item) => !intent.details.condition!(item));
    } else {
        const index = intent.details.itemIndex === -1
            ? array.length - 1
            : intent.details.itemIndex!;

        previousValue = array[index];
        newArray = [...array.slice(0, index), ...array.slice(index + 1)];
    }

    return {
        success: true,
        newState: { ...state, [arrayField]: newArray },
        mutation: createMutation(artifact.id, 'remove_item', [arrayField], previousValue, source, intent.originalMessage),
    };
}

function applyAddItem(artifact: Artifact, intent: MutationIntent, source: 'user' | 'ai'): MutationResult {
    const state = artifact.state;
    const arrayField = findArrayField(state)!;
    const array = state[arrayField];

    const newItem = typeof intent.details.value === 'string'
        ? { id: uuidv4().split('-')[0], title: intent.details.value, completed: false }
        : intent.details.value;

    return {
        success: true,
        newState: { ...state, [arrayField]: [...array, newItem] },
        mutation: createMutation(artifact.id, 'add_item', [arrayField, String(array.length)], newItem, source, intent.originalMessage),
    };
}

function applyUpdateItem(artifact: Artifact, intent: MutationIntent, source: 'user' | 'ai'): MutationResult {
    const state = artifact.state;
    const arrayField = findArrayField(state)!;
    const array = [...state[arrayField]];

    const index =
        intent.details.itemIndex === -1
            ? array.length - 1
            : intent.details.itemIndex!;

    const previousValue = array[index];

    let updatedItem;

    // Case 1: Explicit property update
    if (intent.details.property) {
        updatedItem = {
            ...array[index],
            [intent.details.property]: intent.details.value,
        };
    }
    // Case 2: Object merge update
    else if (
        intent.details.value &&
        typeof intent.details.value === 'object' &&
        !Array.isArray(intent.details.value)
    ) {
        updatedItem = {
            ...array[index],
            ...intent.details.value,
        };
    }
    // Case 3: Invalid update
    else {
        return {
            success: false,
            error: 'Invalid update: value must be an object when no property is specified',
        };
    }

    array[index] = updatedItem;

    return {
        success: true,
        newState: { ...state, [arrayField]: array },
        mutation: createMutation(
            artifact.id,
            'update_item',
            [arrayField, String(index)],
            previousValue,
            source,
            intent.originalMessage
        ),
    };
}

function applyUpdateProperty(artifact: Artifact, intent: MutationIntent, source: 'user' | 'ai'): MutationResult {
    const state = artifact.state;
    const property = intent.details.property!;
    const previousValue = state[property];

    return {
        success: true,
        newState: { ...state, [property]: intent.details.value },
        mutation: createMutation(artifact.id, 'update_property', [property], previousValue, source, intent.originalMessage),
    };
}

function applyReorderItems(artifact: Artifact, intent: MutationIntent, source: 'user' | 'ai'): MutationResult {
    const state = artifact.state;
    const arrayField = findArrayField(state)!;
    const array = [...state[arrayField]];

    const fromIndex = intent.details.itemIndex!;
    const toIndex = intent.details.value as number;

    const [item] = array.splice(fromIndex, 1);
    array.splice(toIndex, 0, item);

    return {
        success: true,
        newState: { ...state, [arrayField]: array },
        mutation: createMutation(artifact.id, 'reorder_items', [arrayField], { from: fromIndex, to: toIndex }, source, intent.originalMessage),
    };
}

// ============ Helpers ============

function findArrayField(state: Record<string, any>): string | null {
    const commonNames = ['items', 'steps', 'tasks', 'metrics', 'list', 'entries'];
    for (const name of commonNames) {
        if (Array.isArray(state[name])) return name;
    }
    for (const [key, value] of Object.entries(state)) {
        if (Array.isArray(value)) return key;
    }
    return null;
}

function createMutation(
    artifactId: string,
    operation: MutationType,
    path: string[],
    previousValue: any,
    source: 'user' | 'ai',
    reason?: string
): Mutation {
    return {
        id: `mut_${uuidv4().split('-')[0]}`,
        artifactId,
        operation,
        path,
        previousValue,
        timestamp: Date.now(),
        source,
        reason,
    };
}

// Legacy exports for compatibility
export { detectMutation as parseMutationIntent };
