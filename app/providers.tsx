"use client";

import { TamboProvider, currentTimeContextHelper, currentPageContextHelper } from "@tambo-ai/react";
import { components } from "@/components/lib/tambo";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

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
    const [accessToken, setAccessToken] = useState<string | undefined>();
    const [user, setUser] = useState<User | null>(null);
    const supabase = createClient();

    useEffect(() => {
        // Get initial session
        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setAccessToken(session?.access_token);
            setUser(session?.user ?? null);
        };
        getInitialSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event: AuthChangeEvent, session: Session | null) => {
                setAccessToken(session?.access_token);
                setUser(session?.user ?? null);
            }
        );

        return () => subscription.unsubscribe();
    }, [supabase]);

    return (
        <TamboProvider
            apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
            userToken={accessToken}
            components={components}
            contextHelpers={{
                // Prebuilt helpers
                userTime: currentTimeContextHelper,
                userPage: currentPageContextHelper,
                // Custom helpers
                workspace: workspaceContextHelper,
                availableComponents: availableComponentsHelper,
                // User context
                currentUser: () => user ? {
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.full_name || user.email?.split('@')[0],
                } : null,
            }}
        >
            {children}
        </TamboProvider>
    );
}

