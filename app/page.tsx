"use client";

import { useState, useEffect, useRef } from "react";
import { useTamboThread, TamboMessageProvider, useTamboCurrentMessage } from "@tambo-ai/react";
import { cn } from "@/lib/utils";
import { useArtifactSystem } from "@/lib/hooks/use-artifact-system";
import { ArtifactCanvas } from "@/components/artifacts/ArtifactRenderer";
import { components } from "@/components/lib/tambo";

// Helper to extract text content from message
function getMessageText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return part.text;
        return "";
      })
      .join("");
  }
  if (content && typeof content === "object" && "text" in content) {
    return (content as { text: string }).text;
  }
  return "";
}

// Component to render a single message's component
function MessageComponent() {
  const message = useTamboCurrentMessage();

  // The message has renderedComponent which is the actual React element
  if (message?.renderedComponent) {
    return message.renderedComponent;
  }

  return null;
}

export default function Home() {
  const [taskInput, setTaskInput] = useState("");
  const [mounted, setMounted] = useState(false);
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Tambo thread hook - provides the current thread context
  const {
    thread,
    sendThreadMessage,
    isIdle,
  } = useTamboThread();

  // Artifact system
  const artifactSystem = useArtifactSystem();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Effect to capture AI-generated components and convert to artifacts
  useEffect(() => {
    if (!thread?.messages) return;

    thread.messages.forEach((message) => {
      // Skip if already processed or not assistant message
      if (message.role !== 'assistant' || processedMessageIds.current.has(message.id)) return;

      // If AI generated a component, create an artifact
      if (message.renderedComponent) {
        // Get component name from the message
        const componentName = (message as any).componentName ||
          (message.renderedComponent?.type as any)?.name ||
          'CommandResultPanel';

        // Find the schema for this component
        const componentConfig = components.find((c) => c.name === componentName);
        if (componentConfig && componentConfig.propsSchema) {
          // Extract props from the rendered component
          const props = (message.renderedComponent as any)?.props || message.renderedComponent;

          // Create artifact
          artifactSystem.createArtifact(
            componentName,
            { ...props, messageId: message.id },
            componentConfig.propsSchema as any, // Cast to any for Zod compatibility
            props?.title || componentName
          );

          processedMessageIds.current.add(message.id);
        }
      }
    });
  }, [thread?.messages, artifactSystem]);

  const demoPrompts = [
    { label: "Analyze system health", icon: "📊" },
    { label: "Create a deployment plan", icon: "📋" },
    { label: "Review code quality", icon: "⚡" },
  ];

  const handleGenerate = async () => {
    if (!taskInput.trim()) return;

    // Check if this is a mutation request
    const analysis = artifactSystem.processMessage(taskInput);

    if (analysis.isMutation && analysis.intent && analysis.artifactId) {
      // Execute mutation locally - no AI call needed
      const result = artifactSystem.executeMutation(
        analysis.artifactId,
        analysis.intent,
        taskInput
      );

      if (result.success) {
        setTaskInput("");
        return; // Don't send to AI, we handled it
      }
    }

    // Normal AI request
    await sendThreadMessage(taskInput);
    setTaskInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const isGenerating = !isIdle;
  const messages = thread?.messages ?? [];
  const hasArtifacts = Object.keys(artifactSystem.artifacts).length > 0;
  const hasContent = messages.length > 0 || hasArtifacts;

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Grid Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className={cn(
            "absolute inset-0",
            "[background-size:40px_40px]",
            "[background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]"
          )}
        />
        {/* Radial fade for depth */}
        <div className="pointer-events-none absolute inset-0 bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

        {/* Gradient orbs for ambient glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl animate-orb-1" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-cyan-600/15 via-blue-600/10 to-transparent blur-3xl animate-orb-2" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-gradient-to-br from-fuchsia-600/10 to-transparent blur-3xl animate-pulse-glow" />
      </div>

      {/* Main Content */}
      <main
        className={`relative z-10 flex flex-col items-center min-h-screen px-6 py-12 md:py-16 transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"
          }`}
      >
        {/* Header */}
        <header className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400 mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Generative Workspace Active
            {hasArtifacts && (
              <span className="ml-2 text-indigo-400">
                • {Object.keys(artifactSystem.artifacts).length} artifact{Object.keys(artifactSystem.artifacts).length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-white via-white to-zinc-500 bg-clip-text text-transparent">
              Omni
            </span>
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              UI
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Describe what you need. Watch the workspace{" "}
            <span className="text-zinc-200">assemble itself.</span>
          </p>
        </header>

        {/* Command Input Section */}
        <div className="w-full max-w-2xl mb-6">
          {/* Main Input Container */}
          <div
            className={`relative group transition-all duration-300 ${isGenerating ? "animate-border-glow" : ""
              }`}
          >
            {/* Glow effect behind input */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500" />

            <div className="relative flex items-center gap-3 p-2 rounded-2xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xl group-hover:border-zinc-700 group-focus-within:border-indigo-500/50 transition-all duration-300">
              {/* Input icon */}
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 ml-1">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>

              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasArtifacts ? "Type a command or mutate artifacts..." : "Describe your task..."}
                disabled={isGenerating}
                className="flex-1 h-12 bg-transparent text-white text-lg placeholder-zinc-500 focus:outline-none disabled:opacity-50"
              />

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !taskInput.trim()}
                className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm hover:from-indigo-400 hover:to-purple-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25"
              >
                {isGenerating ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Assembling
                  </>
                ) : (
                  <>
                    Generate
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Demo Prompt Pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-10 md:mb-14">
          {demoPrompts.map((prompt, i) => (
            <button
              key={prompt.label}
              onClick={() => setTaskInput(prompt.label)}
              className="group flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/60 border border-zinc-800 text-sm text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-800/60 transition-all duration-300"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                {prompt.icon}
              </span>
              {prompt.label}
            </button>
          ))}
        </div>

        {/* Workspace Container */}
        <div className="w-full max-w-4xl flex-1">
          <div
            className={`relative min-h-[400px] rounded-3xl border transition-all duration-500 ${hasContent
              ? "border-indigo-500/30 bg-zinc-950/60"
              : "border-zinc-800/80 bg-zinc-950/40"
              } backdrop-blur-sm overflow-hidden`}
          >
            {/* Workspace header bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                </div>
                <span className="text-xs text-zinc-500 font-mono">
                  workspace://omni
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${hasContent ? "bg-emerald-400" : "bg-zinc-600"
                    }`}
                />
                {hasArtifacts ? `${Object.keys(artifactSystem.artifacts).length} Artifacts` : hasContent ? "Components Active" : "Ready"}
              </div>
            </div>

            {/* Workspace content area */}
            <div className="relative p-6 md:p-8 min-h-[340px]">
              {!hasContent ? (
                // Empty state
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  {/* Animated rings */}
                  <div className="relative mb-8">
                    <div className="absolute inset-0 w-24 h-24 rounded-full border border-dashed border-zinc-700/50 animate-spin-slow" />
                    <div className="absolute inset-2 w-20 h-20 rounded-full border border-zinc-800/50" />
                    <div
                      className="absolute inset-4 w-16 h-16 rounded-full border border-dashed border-zinc-700/30 animate-spin-slow"
                      style={{
                        animationDirection: "reverse",
                        animationDuration: "15s",
                      }}
                    />
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-indigo-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xl font-medium text-zinc-300 mb-2">
                    Ready to assemble
                  </h3>
                  <p className="text-sm text-zinc-500 max-w-xs">
                    Enter a task above and components will materialize here
                  </p>
                </div>
              ) : (
                // Render artifacts and messages
                <div className="space-y-6 animate-fade-in-up">
                  {/* Artifact Canvas - shows persisted artifacts */}
                  <ArtifactCanvas />

                  {/* Current message stream (for streaming responses) */}
                  {messages.filter(m => m.role === 'assistant' && !processedMessageIds.current.has(m.id)).map((message) => (
                    <div key={message.id} className="pl-0">
                      <TamboMessageProvider message={message}>
                        <MessageComponent />
                        {/* Show text content if no component */}
                        {message.content && !message.renderedComponent && (
                          <div className="text-zinc-300 text-sm whitespace-pre-wrap">
                            {getMessageText(message.content)}
                          </div>
                        )}
                      </TamboMessageProvider>
                    </div>
                  ))}

                  {isGenerating && (
                    <div className="flex items-center gap-3 text-zinc-400">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center animate-pulse">
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                      <span className="text-sm">Assembling components...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-600">
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
              Enter
            </kbd>{" "}
            to generate • Try{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
              remove item 3
            </kbd>{" "}
            to mutate
          </p>
        </div>
      </main>
    </div>
  );
}
