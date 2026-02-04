/**
 * @file tambo.ts
 * @description Central configuration file for Tambo components and tools
 *
 * This file serves as the central place to register your Tambo components and tools.
 * It exports arrays that will be used by the TamboProvider.
 *
 * Read more about Tambo at https://tambo.co/docs
 */

import { z } from "zod";
import type { TamboComponent } from "@tambo-ai/react";
import { CommandResultPanel } from "../CommandResultPanel";
import { ExecutionPlan } from "../ExecutionPlan";

/**
 * Components Array - A collection of Tambo components to register
 *
 * Components represent UI elements that can be generated or controlled by AI.
 * Register your custom components here to make them available to the AI.
 */
export const components: TamboComponent[] = [
    {
        name: "CommandResultPanel",
        description:
            "Shows the result of a completed task, analysis, or summary",
        component: CommandResultPanel,
        propsSchema: z.object({
            title: z.string().describe("Short title of what was done"),
            status: z
                .enum(["success", "warning", "error"])
                .describe("Overall outcome status"),
            summary: z
                .string()
                .describe("One paragraph explaining what happened"),
            items: z
                .array(z.string())
                .describe("Bullet points of key results or steps"),
        }),
    },
    {
        name: "ExecutionPlan",
        description:
            "Shows a step-by-step plan or roadmap to achieve a goal",
        component: ExecutionPlan,
        propsSchema: z.object({
            goal: z.string().describe("What the plan is trying to achieve"),
            steps: z.array(
                z.object({
                    title: z.string().describe("Step title"),
                    description: z.string().describe("Step details"),
                })
            ).describe("Ordered list of steps to complete"),
        }),
    },
];
