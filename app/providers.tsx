"use client";

import { TamboProvider, currentTimeContextHelper, currentPageContextHelper } from "@tambo-ai/react";
import { components } from "@/components/lib/tambo";

// Custom context helper for OmniUI workspace state
const workspaceContextHelper = () => {
    if (typeof window === "undefined") return null;

    return {
        app: "OmniUI",
        version: "0.1.0",
        mode: "generative-workspace",
        capabilities: [
            "task-analysis",
            "plan-generation",
            "system-monitoring",
            "status-reporting"
        ],
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
        },
    };
};

// Custom helper for available components
const availableComponentsHelper = () => ({
    components: [
        {
            name: "CommandResultPanel",
            purpose: "Show results of completed analysis, audits, or evaluations",
            useFor: ["analyze", "summarize", "audit", "review", "evaluate", "report"],
        },
        {
            name: "ExecutionPlan",
            purpose: "Show step-by-step plans or roadmaps",
            useFor: ["plan", "roadmap", "timeline", "steps", "process"],
        },
        {
            name: "SystemStatusPanel",
            purpose: "Show real-time system health and metrics",
            useFor: ["status", "health", "metrics", "uptime", "performance"],
        },
    ],
    note: "Choose the most appropriate component based on user intent. Use plain text for casual conversation.",
});

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <TamboProvider
            apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
            components={components}
            contextHelpers={{
                // Prebuilt helpers
                userTime: currentTimeContextHelper,
                userPage: currentPageContextHelper,
                // Custom helpers
                workspace: workspaceContextHelper,
                availableComponents: availableComponentsHelper,
            }}
        >
            {children}
        </TamboProvider>
    );
}
