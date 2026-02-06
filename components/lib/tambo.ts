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
import { KanbanBoard, kanbanBoardSchema } from "../KanbanBoard";

/**
 * OmniUI Component Registry
 * 
 * These components turn AI responses into structured UI.
 * Each has a narrow scope - prefer plain text for casual chat.
 */
export const components: TamboComponent[] = [
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
            details: z.array(z.string().catch("")).catch([]).describe("3-5 bullet points of specific findings or results"),
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

    // KANBAN BOARD COMPONENT - for task management & workflow
    {
        name: "KanbanBoard",
        description: `
Use when the user wants to:
- Track tasks visually with drag-and-drop
- Organize work into columns (To Do, In Progress, Done, Review)
- Manage a project backlog or sprint board
- Visualize workflow states with status progression
- Assign tasks and track progress

Perfect for: Agile workflows, sprint planning, task management, project tracking, workflow automation.

Do NOT use for:
- Just listing tasks (use CommandResultPanel)
- Creating plans (use ExecutionPlan)
- Showing metrics or status (use SystemStatusPanel)

This component provides INTERACTIVE task board with:
- Drag-and-drop between columns
- Priority levels (low, medium, high, critical)
- Assignees with avatars
- Due dates and tags
- Real-time updates
- Modal dialogs for task creation/editing
`,
        component: KanbanBoard,
        propsSchema: kanbanBoardSchema,
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
