/**
 * @file tambo.ts
 * @description Central configuration file for Tambo components and tools
 *
 * OmniUI Component Registry
 * - Components are matched semantically by Tambo
 * - Descriptions tell Tambo WHEN and WHEN NOT to use each component
 * - Plain text responses are preferred for casual conversation
 */

import { z } from "zod";
import type { TamboComponent } from "@tambo-ai/react";
import { CommandResultPanel } from "../CommandResultPanel";
import { ExecutionPlan } from "../ExecutionPlan";
import { SystemStatusPanel } from "../SystemStatusPanel";
import { InteractiveFlowchart, interactiveFlowchartSchema } from "../InteractiveFlowchart";
import { DecisionMatrix } from "../DecisionMatrix";

/**
 * OmniUI Component Registry
 * 
 * These components turn AI responses into structured UI.
 * Each has a narrow scope - prefer plain text for casual chat.
 */
export const components: TamboComponent[] = [
    // DECISION MATRIX - for comparing options with criteria
    {
        name: "DecisionMatrix",
        description: `
**USE THIS COMPONENT** when the user wants to:
- Compare multiple options with weighted criteria
- Make a decision between alternatives
- Evaluate choices with scores
- Create a comparison matrix or table
- Choose between products, tools, approaches

Trigger words: "compare", "decide", "choose", "options", "versus", "vs", "which is better", "pros and cons", "evaluate", "matrix"

This renders an INTERACTIVE comparison table with editable scores (1-10), weights, and auto-calculated totals.

ALWAYS populate criteria and options with real data. Example for "Compare React vs Vue vs Angular":
{
  "question": "Which frontend framework should you use?",
  "criteria": [
    { "id": "c1", "name": "Learning Curve", "weight": 7 },
    { "id": "c2", "name": "Performance", "weight": 8 },
    { "id": "c3", "name": "Ecosystem", "weight": 6 }
  ],
  "options": [
    { "id": "o1", "name": "React", "scores": [{ "criterionId": "c1", "score": 6 }, { "criterionId": "c2", "score": 8 }, { "criterionId": "c3", "score": 9 }] },
    { "id": "o2", "name": "Vue", "scores": [{ "criterionId": "c1", "score": 8 }, { "criterionId": "c2", "score": 8 }, { "criterionId": "c3", "score": 7 }] },
    { "id": "o3", "name": "Angular", "scores": [{ "criterionId": "c1", "score": 4 }, { "criterionId": "c2", "score": 7 }, { "criterionId": "c3", "score": 8 }] }
  ]
}
`,
        component: DecisionMatrix,
        propsSchema: z.object({
            question: z.string().catch("Decision to Make").describe("The decision question or comparison title"),
            criteria: z.array(
                z.object({
                    id: z.string().catch("c1").describe("Unique criterion ID"),
                    name: z.string().catch("Criterion").describe("Name like Price, Performance, Ease of Use"),
                    weight: z.number().min(1).max(10).catch(5).describe("Importance weight 1-10"),
                })
            ).catch([]).describe("3-6 criteria for comparison"),
            options: z.array(
                z.object({
                    id: z.string().catch("o1").describe("Unique option ID"),
                    name: z.string().catch("Option").describe("Option name like MacBook Pro, Dell XPS"),
                    scores: z.array(
                        z.object({
                            criterionId: z.string().describe("ID of the criterion this score is for"),
                            score: z.number().min(1).max(10).catch(5).describe("Score 1-10"),
                        })
                    ).catch([]).describe("Scores for each criterion"),
                })
            ).catch([]).describe("2-5 options to compare"),
            recommendation: z.string().optional().catch(undefined).describe("ID of recommended option"),
        }),
    },

    // RESULT COMPONENT - for completed analysis/tasks
    {
        name: "CommandResultPanel",
        description: `
Use ONLY after completing a concrete, multi-step action such as:
- Analysis of code, data, or systems
- Audit or review with findings
- Evaluation with conclusions
- Summary of complex information

Do NOT use for:
- Casual chat or greetings
- Simple questions or answers
- Brainstorming or open-ended discussion
- When the user just wants information, not a "result"

Prefer plain text unless the user explicitly asks for results, reports, or findings.
This represents the END STATE of completed work.
`,
        component: CommandResultPanel,
        propsSchema: z.object({
            title: z.string().catch("Analysis Complete").describe("Short title of what was analyzed/completed"),
            status: z.string().catch("success").describe("Overall outcome - success, warning, or error"),
            summary: z.string().catch("Analysis completed successfully.").describe("One paragraph explaining the key finding or outcome"),
            items: z.array(z.string().catch("")).catch([]).describe("3-5 bullet points of specific findings or results"),
        }),
    },

    // PLANNING COMPONENT - for future roadmaps
    {
        name: "ExecutionPlan",
        description: `
Use ONLY when the user explicitly asks to:
- Create a plan or roadmap
- Outline steps to achieve something
- Build a timeline or schedule
- Define a process or workflow

Do NOT use for:
- Explaining how something works (use plain text)
- Answering "how to" questions briefly (use plain text)
- General advice (use plain text)

This represents FUTURE STEPS to accomplish a goal, not current status.
Only use when the user wants an actionable, ordered plan.
`,
        component: ExecutionPlan,
        propsSchema: z.object({
            goal: z.string().catch("Achieve the objective").describe("What the plan achieves"),
            steps: z.array(
                z.object({
                    title: z.string().catch("Step").describe("Action to take"),
                    description: z.string().catch("Details").describe("How to do it"),
                })
            ).catch([]).describe("3-7 ordered steps"),
        }),
    },

    // STATUS COMPONENT - for system health/metrics
    {
        name: "SystemStatusPanel",
        description: `
Use ONLY when the user asks about:
- System health or status
- Performance metrics
- Uptime or availability
- Resource usage (CPU, memory, disk)
- Service health checks

Do NOT use for:
- General questions about systems
- How systems work (use plain text)
- Troubleshooting advice (use CommandResultPanel)

This shows real-time or current STATUS with metrics, not analysis.
`,
        component: SystemStatusPanel,
        propsSchema: z.object({
            systemName: z.string().catch("System").describe("Name of the system being checked"),
            overallStatus: z.string().catch("healthy").describe("Overall system health - healthy, warning, or critical"),
            metrics: z.array(
                z.object({
                    label: z.string().catch("Metric").describe("Metric name like CPU, Memory, Uptime"),
                    value: z.string().catch("N/A").describe("Current value like 45%, 2.3GB, 99.9%"),
                    status: z.string().catch("healthy").describe("This metric's health - healthy, warning, or critical"),
                })
            ).catch([]).describe("3-6 key metrics"),
        }),
    },

    // FLOWCHART COMPONENT - MUST be used for ANY visual diagram request
    {
        name: "InteractiveFlowchart",
        description: `
**MUST USE THIS COMPONENT** when the user mentions ANY of these keywords:
- "flowchart", "flow chart", "diagram", "visual", "visualize"
- "pipeline", "CI/CD", "workflow", "process flow"
- "decision tree", "state machine", "nodes", "connections"

Use cases (ALWAYS use InteractiveFlowchart for these):
- CI/CD pipelines and deployment flows
- Process diagrams and workflows
- Decision trees with branching logic
- State machines and transitions
- Any request to "show", "visualize", or "diagram" a process

This component renders an INTERACTIVE visual diagram with:
- Clickable nodes (start, process, decision, end types)
- Animated connection lines
- Drag-to-rearrange functionality
- Status indicators (pending, active, completed, error)

Do NOT use CommandResultPanel or ExecutionPlan for flowchart/diagram requests.
`,
        component: InteractiveFlowchart,
        propsSchema: interactiveFlowchartSchema,
    },
];

/**
 * OmniUI Tool Registry
 * 
 * Tools allow the AI to perform explicit actions beyond just rendering UI.
 */
export const tools = [
    {
        name: 'create_relationship',
        description: 'Link two artifacts together explicitly when one references, depends on, or relates to another. Use this when the user asks to link items or when you discover a dependency.',
        input_schema: {
            type: 'object',
            properties: {
                source_id: { type: 'string', description: 'Source artifact ID (e.g. "a1b2c3d4")' },
                target_id: { type: 'string', description: 'Target artifact ID (e.g. "e5f6g7h8")' },
                type: {
                    type: 'string',
                    enum: ['references', 'depends_on', 'derived_from', 'conflicts_with'],
                    description: 'Type of relationship',
                },
            },
            required: ['source_id', 'target_id', 'type'],
        },
    },
];
