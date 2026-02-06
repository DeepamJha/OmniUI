/**
 * @file nlp-mutations.ts
 * @description NLP-based mutation parser for OmniUI
 * 
 * This is the core differentiator: users can say things like:
 * - "Remove step 3"
 * - "Rename step 2 to Deploy"
 * - "Set the weight of Performance to 8"
 * 
 * These are parsed locally and applied as mutations, without regenerating via AI.
 */

import { useArtifactStore } from './store';

// Using any for artifact types to avoid conflicts with generic Artifact<T> in store
type ArtifactLike = { id: string; type: string; state: any };

// ============================================
// Mutation Types
// ============================================

export type MutationAction =
    | { type: 'DELETE_ITEM'; artifactId: string; index: number }
    | { type: 'UPDATE_TITLE'; artifactId: string; index: number; newTitle: string }
    | { type: 'UPDATE_STATUS'; artifactId: string; index: number; newStatus: string }
    | { type: 'UPDATE_SCORE'; artifactId: string; optionId: string; criterionId: string; newScore: number }
    | { type: 'UPDATE_WEIGHT'; artifactId: string; criterionId: string; newWeight: number }
    | { type: 'MARK_COMPLETE'; artifactId: string; index: number }
    | { type: 'ADD_ITEM'; artifactId: string; title: string; description?: string }
    | { type: 'MOVE_ITEM'; artifactId: string; fromIndex: number; toIndex: number };

export interface ParseResult {
    action: MutationAction | null;
    matched: boolean;
    confidence: number;
    originalText: string;
}

// ============================================
// Pattern Definitions
// ============================================

interface PatternMatcher {
    patterns: RegExp[];
    parse: (match: RegExpMatchArray, artifacts: ArtifactLike[]) => MutationAction | null;
    examples: string[];
}

// Helper to find artifact by content (step name, option name, etc.)
function findArtifactWithStep(artifacts: ArtifactLike[], stepIdentifier: string | number): { artifact: ArtifactLike; index: number } | null {
    for (const artifact of artifacts) {
        if (artifact.type === 'ExecutionPlan' && artifact.state.steps) {
            if (typeof stepIdentifier === 'number') {
                const idx = stepIdentifier - 1; // 1-indexed to 0-indexed
                if (idx >= 0 && idx < artifact.state.steps.length) {
                    return { artifact, index: idx };
                }
            } else {
                const idx = artifact.state.steps.findIndex(
                    (s: any) => s.title?.toLowerCase().includes(stepIdentifier.toLowerCase())
                );
                if (idx !== -1) return { artifact, index: idx };
            }
        }
    }
    return null;
}

function findArtifactWithItem(artifacts: ArtifactLike[], itemIdentifier: string | number): { artifact: ArtifactLike; index: number } | null {
    for (const artifact of artifacts) {
        if (artifact.type === 'CommandResultPanel' && artifact.state.items) {
            if (typeof itemIdentifier === 'number') {
                const idx = itemIdentifier - 1;
                if (idx >= 0 && idx < artifact.state.items.length) {
                    return { artifact, index: idx };
                }
            }
        }
    }
    return null;
}

function findDecisionMatrix(artifacts: ArtifactLike[]): ArtifactLike | null {
    return artifacts.find(a => a.type === 'DecisionMatrix') || null;
}

// ============================================
// Pattern Matchers
// ============================================

const PATTERNS: PatternMatcher[] = [
    // DELETE patterns
    {
        patterns: [
            /(?:remove|delete|drop)\s+(?:step|item)?\s*(?:#)?(\d+)/i,
            /(?:remove|delete|drop)\s+(?:the\s+)?(?:step|item)?\s*(?:called|named)?\s+"?([^"]+)"?/i,
        ],
        parse: (match, artifacts) => {
            const identifier = match[1];
            const isNumber = /^\d+$/.test(identifier);

            // Try steps first
            const stepMatch = findArtifactWithStep(
                artifacts,
                isNumber ? parseInt(identifier) : identifier
            );
            if (stepMatch) {
                return {
                    type: 'DELETE_ITEM',
                    artifactId: stepMatch.artifact.id,
                    index: stepMatch.index,
                };
            }

            // Try items
            if (isNumber) {
                const itemMatch = findArtifactWithItem(artifacts, parseInt(identifier));
                if (itemMatch) {
                    return {
                        type: 'DELETE_ITEM',
                        artifactId: itemMatch.artifact.id,
                        index: itemMatch.index,
                    };
                }
            }

            return null;
        },
        examples: ['Remove step 3', 'Delete item 2', 'Drop step "Setup"'],
    },

    // RENAME / UPDATE TITLE patterns
    {
        patterns: [
            /(?:rename|change|update)\s+(?:step|item)?\s*(?:#)?(\d+)\s+(?:to|as)\s+"?([^"]+)"?/i,
            /(?:call|name)\s+(?:step|item)?\s*(?:#)?(\d+)\s+"?([^"]+)"?/i,
        ],
        parse: (match, artifacts) => {
            const stepNum = parseInt(match[1]);
            const newTitle = match[2].trim();

            const stepMatch = findArtifactWithStep(artifacts, stepNum);
            if (stepMatch) {
                return {
                    type: 'UPDATE_TITLE',
                    artifactId: stepMatch.artifact.id,
                    index: stepMatch.index,
                    newTitle,
                };
            }
            return null;
        },
        examples: ['Rename step 2 to "Deploy"', 'Change step 1 to Setup'],
    },

    // MARK COMPLETE patterns
    {
        patterns: [
            /(?:mark|set)\s+(?:step|item)?\s*(?:#)?(\d+)\s+(?:as\s+)?(?:complete|done|finished)/i,
            /(?:complete|finish)\s+(?:step|item)?\s*(?:#)?(\d+)/i,
        ],
        parse: (match, artifacts) => {
            const stepNum = parseInt(match[1]);
            const stepMatch = findArtifactWithStep(artifacts, stepNum);
            if (stepMatch) {
                return {
                    type: 'MARK_COMPLETE',
                    artifactId: stepMatch.artifact.id,
                    index: stepMatch.index,
                };
            }
            return null;
        },
        examples: ['Mark step 1 complete', 'Complete step 3', 'Set step 2 as done'],
    },

    // UPDATE WEIGHT patterns (DecisionMatrix)
    {
        patterns: [
            /(?:set|change|update)\s+(?:the\s+)?weight\s+(?:of\s+)?([a-z\s]+)\s+to\s+(\d+)/i,
            /(?:make|set)\s+([a-z\s]+)\s+(?:weight|importance)\s+(\d+)/i,
        ],
        parse: (match, artifacts) => {
            const criterionName = match[1].trim().toLowerCase();
            const newWeight = parseInt(match[2]);

            if (newWeight < 1 || newWeight > 10) return null;

            const matrix = findDecisionMatrix(artifacts);
            if (matrix && matrix.state.criteria) {
                const criterion = matrix.state.criteria.find(
                    (c: any) => c.name?.toLowerCase().includes(criterionName)
                );
                if (criterion) {
                    return {
                        type: 'UPDATE_WEIGHT',
                        artifactId: matrix.id,
                        criterionId: criterion.id,
                        newWeight,
                    };
                }
            }
            return null;
        },
        examples: ['Set weight of Performance to 8', 'Make Price importance 10'],
    },

    // ADD ITEM patterns
    {
        patterns: [
            /(?:add|insert)\s+(?:a\s+)?(?:new\s+)?(?:step|item)\s+"?([^"]+)"?/i,
            /(?:add|insert)\s+"?([^"]+)"?\s+(?:as\s+)?(?:a\s+)?(?:new\s+)?(?:step|item)/i,
        ],
        parse: (match, artifacts) => {
            const title = match[1].trim();

            // Find first ExecutionPlan
            const plan = artifacts.find(a => a.type === 'ExecutionPlan');
            if (plan) {
                return {
                    type: 'ADD_ITEM',
                    artifactId: plan.id,
                    title,
                };
            }
            return null;
        },
        examples: ['Add a step "Deploy to production"', 'Insert new item "Review code"'],
    },

    // MOVE ITEM patterns
    {
        patterns: [
            /move\s+(?:step|item)?\s*(?:#)?(\d+)\s+(?:to|before|after)\s+(?:position\s+)?(\d+)/i,
            /(?:swap|switch)\s+(?:step|item)?\s*(?:#)?(\d+)\s+(?:and|with)\s+(?:#)?(\d+)/i,
        ],
        parse: (match, artifacts) => {
            const from = parseInt(match[1]) - 1;
            let to = parseInt(match[2]) - 1;

            // For "move X to Y", Y is the target position
            // For "swap X and Y", we just swap positions
            const isSwap = /swap|switch/i.test(match[0]);

            const plan = artifacts.find(a => a.type === 'ExecutionPlan');
            if (plan && plan.state.steps) {
                if (from >= 0 && from < plan.state.steps.length &&
                    to >= 0 && to < plan.state.steps.length) {
                    return {
                        type: 'MOVE_ITEM',
                        artifactId: plan.id,
                        fromIndex: from,
                        toIndex: to,
                    };
                }
            }
            return null;
        },
        examples: ['Move step 3 to position 1', 'Swap step 1 and 2'],
    },
];

// ============================================
// Main Parser
// ============================================

export function parseNLPMutation(text: string, artifacts: ArtifactLike[]): ParseResult {
    const trimmedText = text.trim();

    for (const matcher of PATTERNS) {
        for (const pattern of matcher.patterns) {
            const match = trimmedText.match(pattern);
            if (match) {
                const action = matcher.parse(match, artifacts);
                if (action) {
                    return {
                        action,
                        matched: true,
                        confidence: 0.9,
                        originalText: trimmedText,
                    };
                }
            }
        }
    }

    return {
        action: null,
        matched: false,
        confidence: 0,
        originalText: trimmedText,
    };
}

// ============================================
// Mutation Executor
// ============================================

export function executeMutation(
    action: MutationAction,
    getState: () => { artifacts: Record<string, ArtifactLike> },
    updateArtifact: (id: string, state: any) => void,
    addMutation: (mutation: any) => void
): boolean {
    const { artifacts } = getState();
    const artifact = artifacts[action.artifactId];
    if (!artifact) return false;

    switch (action.type) {
        case 'DELETE_ITEM': {
            if (artifact.type === 'ExecutionPlan' && artifact.state.steps) {
                const newSteps = [...artifact.state.steps];
                const deleted = newSteps.splice(action.index, 1)[0];
                updateArtifact(action.artifactId, { ...artifact.state, steps: newSteps });
                addMutation({
                    artifactId: action.artifactId,
                    operation: 'delete_item',
                    path: ['steps', action.index.toString()],
                    previousValue: deleted,
                    source: 'user',
                    reason: `Deleted step via NLP`,
                });
                return true;
            }
            if (artifact.type === 'CommandResultPanel' && artifact.state.items) {
                const newItems = [...artifact.state.items];
                const deleted = newItems.splice(action.index, 1)[0];
                updateArtifact(action.artifactId, { ...artifact.state, items: newItems });
                addMutation({
                    artifactId: action.artifactId,
                    operation: 'delete_item',
                    path: ['items', action.index.toString()],
                    previousValue: deleted,
                    source: 'user',
                    reason: `Deleted item via NLP`,
                });
                return true;
            }
            return false;
        }

        case 'UPDATE_TITLE': {
            if (artifact.type === 'ExecutionPlan' && artifact.state.steps) {
                const newSteps = [...artifact.state.steps];
                const oldTitle = newSteps[action.index]?.title;
                newSteps[action.index] = { ...newSteps[action.index], title: action.newTitle };
                updateArtifact(action.artifactId, { ...artifact.state, steps: newSteps });
                addMutation({
                    artifactId: action.artifactId,
                    operation: 'update_property',
                    path: ['steps', action.index.toString(), 'title'],
                    value: action.newTitle,
                    previousValue: oldTitle,
                    source: 'user',
                    reason: `Renamed step via NLP`,
                });
                return true;
            }
            return false;
        }

        case 'MARK_COMPLETE': {
            if (artifact.type === 'ExecutionPlan' && artifact.state.steps) {
                const newSteps = [...artifact.state.steps];
                const oldStatus = newSteps[action.index]?.status;
                newSteps[action.index] = { ...newSteps[action.index], status: 'completed' };
                updateArtifact(action.artifactId, { ...artifact.state, steps: newSteps });
                addMutation({
                    artifactId: action.artifactId,
                    operation: 'update_property',
                    path: ['steps', action.index.toString(), 'status'],
                    value: 'completed',
                    previousValue: oldStatus,
                    source: 'user',
                    reason: `Marked step complete via NLP`,
                });
                return true;
            }
            return false;
        }

        case 'UPDATE_WEIGHT': {
            if (artifact.type === 'DecisionMatrix' && artifact.state.criteria) {
                const newCriteria = artifact.state.criteria.map((c: any) =>
                    c.id === action.criterionId ? { ...c, weight: action.newWeight } : c
                );
                const oldCriterion = artifact.state.criteria.find((c: any) => c.id === action.criterionId);
                updateArtifact(action.artifactId, { ...artifact.state, criteria: newCriteria });
                addMutation({
                    artifactId: action.artifactId,
                    operation: 'update_property',
                    path: ['criteria', action.criterionId, 'weight'],
                    value: action.newWeight,
                    previousValue: oldCriterion?.weight,
                    source: 'user',
                    reason: `Updated weight via NLP`,
                });
                return true;
            }
            return false;
        }

        case 'ADD_ITEM': {
            if (artifact.type === 'ExecutionPlan') {
                const newStep = { title: action.title, description: action.description || '', status: 'pending' };
                const newSteps = [...(artifact.state.steps || []), newStep];
                updateArtifact(action.artifactId, { ...artifact.state, steps: newSteps });
                addMutation({
                    artifactId: action.artifactId,
                    operation: 'add_item',
                    path: ['steps', (newSteps.length - 1).toString()],
                    value: newStep,
                    source: 'user',
                    reason: `Added step via NLP`,
                });
                return true;
            }
            return false;
        }

        case 'MOVE_ITEM': {
            if (artifact.type === 'ExecutionPlan' && artifact.state.steps) {
                const newSteps = [...artifact.state.steps];
                const [moved] = newSteps.splice(action.fromIndex, 1);
                newSteps.splice(action.toIndex, 0, moved);
                updateArtifact(action.artifactId, { ...artifact.state, steps: newSteps });
                addMutation({
                    artifactId: action.artifactId,
                    operation: 'move_item',
                    path: ['steps'],
                    value: { from: action.fromIndex, to: action.toIndex },
                    source: 'user',
                    reason: `Moved step via NLP`,
                });
                return true;
            }
            return false;
        }

        default:
            return false;
    }
}

// ============================================
// Hook for NLP mutations
// ============================================

export function useNLPMutations() {
    const artifacts = useArtifactStore((state) => state.artifacts);
    const updateArtifact = useArtifactStore((state) => state.updateArtifact);
    const addMutation = useArtifactStore((state) => state.addMutation);

    const attemptNLPMutation = (text: string): { success: boolean; action?: MutationAction } => {
        const artifactList = Object.values(artifacts);
        const result = parseNLPMutation(text, artifactList);

        if (result.matched && result.action) {
            const success = executeMutation(
                result.action,
                () => ({ artifacts }),
                updateArtifact,
                addMutation
            );
            return { success, action: result.action };
        }

        return { success: false };
    };

    return { attemptNLPMutation };
}
