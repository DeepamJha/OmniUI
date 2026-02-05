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
            title: z.string().default("Analysis Complete").describe("Short title of what was analyzed/completed"),
            status: z
                .enum(["success", "warning", "error"])
                .default("success")
                .describe("Overall outcome - success if good, warning if concerns, error if problems"),
            summary: z
                .string()
                .default("Analysis completed successfully.")
                .describe("One paragraph explaining the key finding or outcome"),
            items: z
                .array(z.string())
                .default([])
                .describe("3-5 bullet points of specific findings or results"),
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
            goal: z.string().default("Achieve the objective").describe("What the plan achieves"),
            steps: z.array(
                z.object({
                    title: z.string().default("Step").describe("Action to take"),
                    description: z.string().default("Details").describe("How to do it"),
                })
            ).default([]).describe("3-7 ordered steps"),
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
            systemName: z.string().default("System").describe("Name of the system being checked"),
            overallStatus: z
                .string()
                .default("healthy")
                .describe("Overall system health - healthy, warning, or critical"),
            metrics: z.array(
                z.object({
                    label: z.string().default("Metric").describe("Metric name like CPU, Memory, Uptime"),
                    value: z.string().default("N/A").describe("Current value like 45%, 2.3GB, 99.9%"),
                    status: z.string().default("healthy").describe("This metric's health - healthy, warning, or critical"),
                })
            ).default([]).describe("3-6 key metrics"),
        }),
    },
];
