// Core artifact types for OmniUI

import { z, ZodSchema } from 'zod';

/**
 * Core Artifact interface - represents any stateful UI output
 */
export interface Artifact<T = any> {
    // Identity
    id: string;                    // Short UUID (e.g., "a8f2b4c1")
    type: string;                  // Component type ("Roadmap", "Checklist", etc.)

    // State
    state: T;                      // Artifact-specific data
    schema: ZodSchema<T>;          // Validation schema

    // Metadata
    title?: string;
    description?: string;
    tags?: string[];

    // Versioning
    version: number;               // Increments on each mutation
    createdAt: number;             // Unix timestamp
    updatedAt: number;             // Unix timestamp

    // Relationships
    parentId?: string;
    relatedIds?: string[];
}

/**
 * Mutation tracking - records every change to an artifact
 */
export interface Mutation {
    id: string;
    artifactId: string;
    operation: MutationType;
    path: string[];                // JSONPath to modified property
    value?: any;
    previousValue?: any;
    timestamp: number;
    source: 'user' | 'ai';
    reason?: string;
}

export type MutationType =
    | 'add_item'
    | 'remove_item'
    | 'update_item'
    | 'update_property'
    | 'reorder_items'
    | 'bulk_update';

/**
 * Artifact relationships for cross-artifact reasoning
 */
export interface Relationship {
    id: string;
    sourceId: string;
    targetId: string;
    type: RelationType;
    bidirectional: boolean;
    metadata?: Record<string, any>;
    createdAt: number;
}

export type RelationType =
    | 'references'
    | 'depends_on'
    | 'conflicts_with'
    | 'derived_from'
    | 'similar_to';

/**
 * Conversation context - everything the AI needs to know
 */
export interface ConversationContext {
    artifacts: Record<string, Artifact>;
    mutations: Mutation[];
    relationships: Relationship[];
    threadId: string;
}

/**
 * Serializable artifact for persistence (without Zod schema)
 */
export interface SerializableArtifact<T = any> {
    id: string;
    type: string;
    state: T;
    title?: string;
    description?: string;
    tags?: string[];
    version: number;
    createdAt: number;
    updatedAt: number;
    parentId?: string;
    relatedIds?: string[];
}

/**
 * Mutation intent parsed from user message
 */
export interface MutationIntent {
    artifactId: string;
    operation: MutationType;
    target: string;           // "item 3", "the last step", "status"
    value?: any;              // new value if applicable
    originalMessage: string;
}

/**
 * Result of a mutation operation
 */
export interface MutationResult {
    success: boolean;
    mutation?: Mutation;
    error?: string;
    newState?: any;
}
