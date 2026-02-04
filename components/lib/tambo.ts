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
            "Shows the result of a completed task or command with a summary and key outcomes",
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
];
