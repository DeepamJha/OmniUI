"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTamboThread, TamboMessageProvider, useTamboCurrentMessage } from "@tambo-ai/react";
import { cn } from "@/lib/utils";
import { useArtifactSystem } from "@/lib/hooks/use-artifact-system";
import { ArtifactCanvas } from "@/components/artifacts/ArtifactRenderer";
import { components } from "@/components/lib/tambo";
import { detectCrossArtifactQuery, buildCrossArtifactContext } from "@/lib/artifacts/cross-artifact-reasoning";
import { SmartSuggestions } from "@/components/SmartSuggestions";
import { ExportMenu } from "@/components/ExportMenu";
import { useConfetti } from "@/lib/hooks/use-confetti";
import { WORKSPACE_TEMPLATES } from "@/lib/artifacts/templates";
import { ARTIFACT_SCHEMAS } from "@/lib/artifacts/store";
import { exportAsJSON, exportAsMarkdown, exportAsCSV, downloadFile } from "@/lib/export";
import { z } from "zod";

function getMessageText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return part.text as string;
        return "";
      })
      .join("");
  }
  if (content && typeof content === "object" && "text" in content) {
    return (content as { text: string }).text;
  }
  return "";
}

const ARTIFACT_COMPONENT_NAMES = new Set([
  "CommandResultPanel",
  "ExecutionPlan",
  "SystemStatusPanel",
  "KanbanBoard",
  "InteractiveFlowchart",
]);

function findArtifactComponent(node: React.ReactNode): {
  node: React.ReactElement;
  name: string;
  props: any;
} | null {
  if (!node || typeof node !== "object") return null;

  const element = node as React.ReactElement;
  const componentType = element.type;
  const componentName =
    (componentType as any)?.displayName ||
    (componentType as any)?.name ||
    (typeof componentType === "string" ? componentType : null);

  if (componentName && ARTIFACT_COMPONENT_NAMES.has(componentName)) {
    return {
      node: element,
      name: componentName,
      props: element.props || {},
    };
  }

  const elementProps = element.props as { children?: React.ReactNode } | undefined;
  const children = elementProps?.children;
  if (!children) return null;

  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findArtifactComponent(child);
      if (found) return found;
    }
  } else {
    return findArtifactComponent(children);
  }

  return null;
}

function MessageComponent({
  onCaptureArtifact,
  onTextFallback,
}: {
  onCaptureArtifact?: (messageId: string, component: React.ReactNode, componentName: string, props: any) => void;
  onTextFallback?: (text: string) => void;
}) {
  const message = useTamboCurrentMessage();
  const capturedRef = useRef<Set<string>>(new Set());
  const textAccumulatorRef = useRef<{ messageId: string; text: string; timeout: NodeJS.Timeout | null }>({
    messageId: "",
    text: "",
    timeout: null,
  });

  useEffect(() => {
    if (!message?.id) return;
    if (capturedRef.current.has(message.id)) return;

    if (message.renderedComponent) {
      const artifact = findArtifactComponent(message.renderedComponent);
      if (artifact) {
        capturedRef.current.add(message.id);
        onCaptureArtifact?.(message.id, artifact.node, artifact.name, artifact.props);
        return;
      }
    }

    const textContent = getMessageText(message.content);
    if (textContent && textContent.trim().length > 0) {
      if (textAccumulatorRef.current.timeout) {
        clearTimeout(textAccumulatorRef.current.timeout);
      }

      if (textAccumulatorRef.current.messageId !== message.id) {
        textAccumulatorRef.current = { messageId: message.id, text: "", timeout: null };
      }

      if (textContent.length > textAccumulatorRef.current.text.length) {
        textAccumulatorRef.current.text = textContent;
      }

      textAccumulatorRef.current.timeout = setTimeout(() => {
        if (capturedRef.current.has(message.id)) return;
        const finalText = textAccumulatorRef.current.text;
        capturedRef.current.add(message.id);
        onTextFallback?.(finalText);
      }, 500);
    }
  }, [message?.renderedComponent, message?.content, message?.id, onCaptureArtifact, onTextFallback]);

  return null;
}

export default function Home() {
  const [taskInput, setTaskInput] = useState("");
  const [mounted, setMounted] = useState(false);
  const [showDemoTip, setShowDemoTip] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const taskInputRef = useRef("");
  const templateSectionRef = useRef<HTMLDivElement>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastConfettiRef = useRef<number>(0);

  const { trigger: triggerConfetti } = useConfetti();
  const messageArtifactMap = useRef<Map<string, string>>(new Map());

  const { thread, sendThreadMessage, isIdle } = useTamboThread();
  const artifactSystem = useArtifactSystem();
  const mutationsRef = useRef(artifactSystem.mutations);

  const artifactCount = useMemo(() => Object.keys(artifactSystem.artifacts).length, [artifactSystem.artifacts]);
  const hasArtifacts = artifactCount > 0;
  const messages = thread?.messages ?? [];
  const hasContent = messages.length > 0 || hasArtifacts;
  const isGenerating = !isIdle;

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const dismissed = window.localStorage.getItem("omniui_demo_tip") === "1";
      setShowDemoTip(!dismissed);
    }
  }, []);

  useEffect(() => {
    taskInputRef.current = taskInput;
  }, [taskInput]);

  useEffect(() => {
    mutationsRef.current = artifactSystem.mutations;
  }, [artifactSystem.mutations]);

  const showStatus = useCallback((message: string) => {
    setStatusMessage(message);
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage(null);
    }, 2200);
  }, []);

  const dismissDemoTip = useCallback(() => {
    setShowDemoTip(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("omniui_demo_tip", "1");
    }
  }, []);

  const triggerSoftConfetti = useCallback(() => {
    const now = Date.now();
    if (now - lastConfettiRef.current < 1200) return;
    lastConfettiRef.current = now;
    triggerConfetti();
  }, [triggerConfetti]);

  const handleCaptureArtifact = useCallback((
    messageId: string,
    _component: React.ReactNode,
    componentName: string,
    props: any
  ) => {
    if (messageArtifactMap.current.has(messageId)) {
      const existingArtifactId = messageArtifactMap.current.get(messageId)!;
      artifactSystem.updateArtifact(existingArtifactId, props);
      return;
    }

    const componentConfig = components.find((c) => c.name === componentName);
    if (componentConfig) {
      const artifactId = artifactSystem.createArtifact(
        componentName,
        props,
        (componentConfig.propsSchema as any) || {},
        props?.title || props?.systemName || componentName
      );
      messageArtifactMap.current.set(messageId, artifactId);
      triggerSoftConfetti();
    } else {
      messageArtifactMap.current.set(messageId, "skipped");
    }
  }, [artifactSystem, triggerSoftConfetti]);

  const handleTextResponse = useCallback((messageId: string, textContent: string) => {
    if (messageArtifactMap.current.has(messageId)) {
      return;
    }

    if (!textContent || textContent.trim().length === 0) return;

    const paragraphs = textContent.split(/\n\n+/).filter(p => p.trim().length > 0);
    const summaryText = textContent.slice(0, 300) + (textContent.length > 300 ? "..." : "");
    const details = paragraphs.length > 1 ? paragraphs : [];

    const artifactId = artifactSystem.createArtifact(
      "CommandResultPanel",
      {
        title: "Command Output",
        status: "success",
        summary: summaryText,
        details: details,
      },
      (components.find(c => c.name === "CommandResultPanel")?.propsSchema as any) || {},
      "Command Output"
    );

    messageArtifactMap.current.set(messageId, artifactId);
  }, [artifactSystem]);

  const demoPrompts = [
    { label: "plan a product launch", icon: "LAUNCH" },
    { label: "create a sprint board", icon: "SPRINT" },
    { label: "visualize onboarding flow", icon: "FLOW" },
  ];

  const applyTemplate = useCallback((
    templateId: string,
    options?: { silent?: boolean }
  ) => {
    const template = WORKSPACE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      showStatus("Template not found");
      return;
    }

    const hasExisting = Object.keys(artifactSystem.artifacts).length > 0;
    if (hasExisting && !options?.silent) {
      const confirmed = confirm("Replace current workspace with this template?");
      if (!confirmed) return;
    }

    if (hasExisting) {
      artifactSystem.clear();
      messageArtifactMap.current.clear();
    }

    const now = Date.now();
    template.artifacts.forEach((serialized, index) => {
      const schema = ARTIFACT_SCHEMAS[serialized.type] ?? z.any();
      artifactSystem.addArtifact({
        ...serialized,
        schema,
        createdAt: now + index,
        updatedAt: now + index,
      } as any);
    });

    if (!options?.silent) {
      triggerSoftConfetti();
      showStatus(`Loaded ${template.name}`);
      dismissDemoTip();
    }
  }, [artifactSystem, showStatus, triggerSoftConfetti, dismissDemoTip]);

  const handleQuickExport = useCallback((mode: "json" | "markdown" | "csv") => {
    if (artifactCount === 0) {
      showStatus("No artifacts to export");
      return;
    }

    const exportMap = {
      json: { ext: "json", mime: "application/json", label: "JSON", data: exportAsJSON },
      markdown: { ext: "md", mime: "text/markdown", label: "Markdown", data: exportAsMarkdown },
      csv: { ext: "csv", mime: "text/csv", label: "CSV", data: exportAsCSV },
    } as const;

    const config = exportMap[mode];
    const content = config.data(artifactSystem.artifacts);
    downloadFile(content, `workspace-${Date.now()}.${config.ext}`, config.mime);
    triggerSoftConfetti();
    showStatus(`Exported ${config.label}`);
  }, [artifactSystem.artifacts, artifactCount, showStatus, triggerSoftConfetti]);

  const handleClearAll = useCallback(() => {
    if (!hasArtifacts) return;
    const confirmed = confirm("Clear all artifacts? This cannot be undone.");
    if (!confirmed) return;
    artifactSystem.clear();
    messageArtifactMap.current.clear();
    showStatus("Workspace cleared");
  }, [artifactSystem, hasArtifacts, showStatus]);

  useEffect(() => {
    if (!artifactSystem.hasHydrated) return;
    if (artifactCount > 0) return;
    if (typeof window === "undefined") return;

    const hasAutoDemo = window.localStorage.getItem("omniui_auto_demo") === "1";
    if (hasAutoDemo) return;

    applyTemplate("saas-launch", { silent: true });
    window.localStorage.setItem("omniui_auto_demo", "1");
    showStatus("Demo workspace loaded");
  }, [artifactSystem.hasHydrated, artifactCount, applyTemplate, showStatus]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const meta = event.metaKey || event.ctrlKey;

      if (meta && key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        showStatus("Command focus");
        return;
      }

      if (meta && key === "s") {
        event.preventDefault();
        handleQuickExport("json");
        return;
      }

      if (meta && key === "e") {
        event.preventDefault();
        handleQuickExport("markdown");
        return;
      }

      if (meta && event.shiftKey && key === "l") {
        event.preventDefault();
        templateSectionRef.current?.scrollIntoView({ behavior: "smooth" });
        showStatus("Template gallery");
        return;
      }

      if (meta && key === "z") {
        event.preventDefault();
        const lastMutation = mutationsRef.current[mutationsRef.current.length - 1];
        if (lastMutation) {
          artifactSystem.undoLastMutation(lastMutation.artifactId);
          showStatus("Undid last change");
        } else {
          showStatus("Nothing to undo");
        }
        return;
      }

      if (key === "escape" && taskInputRef.current.trim().length > 0) {
        setTaskInput("");
        showStatus("Cleared command");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [artifactSystem.undoLastMutation, handleQuickExport, showStatus]);

  const handleGenerate = async () => {
    if (!taskInput.trim()) return;
    if (isIdle === false) return;

    dismissDemoTip();

    if (thread?.messages && thread.messages.length > 0) {
      const crossArtifactQuery = detectCrossArtifactQuery(
        taskInput,
        artifactSystem.artifacts
      );

      if (crossArtifactQuery) {
        const context = buildCrossArtifactContext(
          crossArtifactQuery,
          artifactSystem.artifacts
        );

        await sendThreadMessage(taskInput, {
          additionalContext: { crossArtifactContext: context },
        });

        setTaskInput("");
        return;
      }
    }

    const analysis = artifactSystem.processMessage(taskInput);

    if (analysis.isMutation && analysis.intent && analysis.artifactId) {
      const result = artifactSystem.executeMutation(
        analysis.artifactId,
        analysis.intent,
        taskInput
      );

      if (result.success) {
        await sendThreadMessage(taskInput);
        setTaskInput("");
        return;
      }
    }

    const context = artifactSystem.getContextString();

    await sendThreadMessage(taskInput, {
      additionalContext: { artifactContext: context },
    });

    setTaskInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const templates = useMemo(() => {
    const sorted = [...WORKSPACE_TEMPLATES];
    sorted.sort((a, b) => {
      if (a.id === "saas-launch") return -1;
      if (b.id === "saas-launch") return 1;
      return 0;
    });
    return sorted;
  }, []);

  return (
    <div className="relative min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)] overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 [background-image:radial-gradient(circle_at_top,rgba(14,165,165,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.16),transparent_60%)]" />
        <div className="absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(0deg,rgba(15,23,42,0.04),rgba(15,23,42,0.04)_1px,transparent_1px,transparent_32px),repeating-linear-gradient(90deg,rgba(15,23,42,0.03),rgba(15,23,42,0.03)_1px,transparent_1px,transparent_32px)]" />
        <div className="absolute -top-36 -right-24 h-[380px] w-[380px] rounded-full bg-gradient-to-br from-teal-300/35 via-teal-200/10 to-transparent blur-2xl" />
        <div className="absolute -bottom-32 -left-24 h-[460px] w-[460px] rounded-full bg-gradient-to-tr from-amber-300/35 via-orange-200/10 to-transparent blur-2xl" />
      </div>

      <main
        className={cn(
          "relative z-10 mx-auto w-full max-w-6xl px-6 py-12 md:py-16 transition-opacity duration-500",
          mounted ? "opacity-100" : "opacity-0"
        )}
      >
        <nav className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[color:var(--foreground)] text-[color:var(--background)] flex items-center justify-center font-mono text-sm">
              OU
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">OmniUI</p>
              <p className="text-xs text-zinc-500">AI workflow studio</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-zinc-600">
            <a href="#templates" className="hover:text-zinc-900 transition-colors">Templates</a>
            <a href="#how" className="hover:text-zinc-900 transition-colors">How it works</a>
            <a href="#shortcuts" className="hover:text-zinc-900 transition-colors">Shortcuts</a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => applyTemplate("saas-launch")}
              className="px-4 py-2 rounded-xl bg-[color:var(--foreground)] text-[color:var(--background)] text-sm font-semibold hover:translate-y-[-1px] transition-transform"
            >
              Run demo
            </button>
            <button
              onClick={handleClearAll}
              disabled={!hasArtifacts}
              className="px-4 py-2 rounded-xl border border-black/10 bg-white/70 text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear
            </button>
          </div>
        </nav>

        <section className="flex flex-col gap-10">
          <div className="w-full max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border border-black/10 text-xs uppercase tracking-[0.2em] text-zinc-600">
              MCP-native workflow builder
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-semibold leading-tight text-zinc-900">
                AI workflows. Built for live demos.
              </h1>
              <p className="text-lg text-zinc-600 max-w-xl">
                Describe a workflow in plain language. OmniUI assembles plans, boards, and live status panels you can edit,
                share, and export in seconds.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => applyTemplate("saas-launch")}
                className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-500 transition-colors"
              >
                Run demo scenario
              </button>
              <a
                href="#templates"
                className="px-5 py-2.5 rounded-xl border border-black/10 bg-white/70 text-sm text-zinc-700 hover:text-zinc-900 transition-colors"
              >
                Browse templates
              </a>
              <div className="text-xs text-zinc-500">
                Cmd/Ctrl + K to focus commands
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Live artifacts", value: `${artifactCount} ready` },
                { label: "Exports", value: "JSON - Markdown - CSV" },
                { label: "Context aware", value: "Cross-artifact reasoning" },
                { label: "Editable", value: "Inline updates + undo" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{stat.label}</p>
                  <p className="text-lg font-semibold text-zinc-900 mt-2">{stat.value}</p>
                </div>
              ))}
            </div>

            {showDemoTip && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">First time here?</p>
                    <p className="text-amber-800">
                      Run the demo or type a command like "create a launch roadmap".
                    </p>
                  </div>
                  <button
                    onClick={dismissDemoTip}
                    className="text-amber-700 hover:text-amber-900"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => applyTemplate("saas-launch")}
                    className="px-3 py-1.5 rounded-lg bg-amber-200 text-amber-900 text-xs font-semibold"
                  >
                    Run demo
                  </button>
                  <button
                    onClick={() => setTaskInput("create a product launch plan")}
                    className="px-3 py-1.5 rounded-lg bg-white text-amber-800 text-xs font-semibold border border-amber-200"
                  >
                    Try a command
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="w-full">
            <div className="mx-auto w-full max-w-5xl rounded-3xl border border-black/10 bg-white/80 p-4 shadow-lg">
              <div className="rounded-3xl border border-white/10 bg-[color:var(--workspace)] text-white p-5 md:p-6">
              <div className="mb-5">
                <div className="relative group transition-all duration-200">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500/25 via-amber-500/15 to-transparent rounded-2xl blur-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-center gap-3 p-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md group-hover:border-white/20 group-focus-within:border-teal-400/60 transition-all duration-200">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-amber-500/20 text-teal-200 ml-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>

                    <input
                      ref={inputRef}
                      type="text"
                      value={taskInput}
                      onChange={(e) => {
                        setTaskInput(e.target.value);
                        taskInputRef.current = e.target.value;
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={hasArtifacts ? "Type a command or mutate artifacts..." : "Type a command (e.g. create deployment plan)"}
                      disabled={isGenerating}
                      className="flex-1 h-12 bg-transparent text-white text-base placeholder-white/40 focus:outline-none disabled:opacity-50"
                    />

                    {taskInput && !isGenerating && (
                      <button
                        onClick={() => setTaskInput("")}
                        className="p-2 text-white/40 hover:text-white transition-colors"
                        title="Clear command"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}

                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !taskInput.trim()}
                      className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-gradient-to-r from-teal-500 to-amber-500 text-white font-semibold text-sm hover:from-teal-400 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {isGenerating ? "Assembling" : "Execute"}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-white/40 text-center">
                  Press Enter to execute - Use commands like "remove step 3"
                </p>
              </div>

              {!hasArtifacts && (
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  {demoPrompts.map((prompt, i) => (
                    <button
                      key={prompt.label}
                      onClick={() => setTaskInput(prompt.label)}
                      className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all duration-300"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                        {prompt.icon}
                      </span>
                      {prompt.label}
                    </button>
                  ))}
                </div>
              )}

              <div
                className={`relative min-h-[360px] rounded-3xl border transition-all duration-500 ${hasContent
                  ? "border-teal-500/30 bg-black/30"
                  : "border-white/10 bg-black/20"
                  } overflow-hidden`}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-white/20" />
                      <div className="w-3 h-3 rounded-full bg-white/20" />
                      <div className="w-3 h-3 rounded-full bg-white/20" />
                    </div>
                    <span className="text-xs text-white/40 font-mono">workspace://omni</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/50">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasContent ? "bg-emerald-400" : "bg-white/30"}`} />
                    {hasArtifacts ? `${artifactCount} Artifacts` : hasContent ? "Components Active" : "Ready"}

                    <div className="flex items-center gap-2 ml-4 pl-4 border-l border-white/10">
                      {hasArtifacts && (
                        <>
                          <ExportMenu
                            artifacts={artifactSystem.artifacts}
                            onExport={(type) => {
                              triggerSoftConfetti();
                              showStatus(type === "copy" ? "Copied JSON" : "Export complete");
                            }}
                          />

                          <button
                            onClick={handleClearAll}
                            className="px-3 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs transition-colors flex items-center gap-1"
                          >
                            Clear all
                          </button>
                        </>
                      )}

                      {!hasArtifacts && (
                        <button
                          onClick={() => applyTemplate("saas-launch")}
                          className="px-3 py-1.5 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 text-xs transition-colors flex items-center gap-1"
                        >
                          Run demo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative p-6 md:p-8 min-h-[320px]">
                  {!hasContent ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <div className="relative mb-6">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-amber-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-teal-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium text-white/80 mb-2">No artifacts yet</h3>
                      <p className="text-sm text-white/40 max-w-xs">
                        Run a command to generate your first workspace artifact
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-fade-in-up">
                      <ArtifactCanvas
                        onAction={(prompt) => setTaskInput(prompt)}
                        onReference={(id) => setTaskInput((prev) => (prev ? `${prev} #${id}` : `#${id}`))}
                      />

                      <div className="hidden">
                        {messages
                          .filter(m => m.role === "assistant" && !messageArtifactMap.current.has(m.id))
                          .map((message) => (
                            <TamboMessageProvider key={message.id} message={message}>
                              <MessageComponent
                                onCaptureArtifact={handleCaptureArtifact}
                                onTextFallback={(text) => handleTextResponse(message.id, text)}
                              />
                            </TamboMessageProvider>
                          ))}
                      </div>

                      {isGenerating && (
                        <div className="flex items-center gap-3 text-white/60">
                          <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center animate-pulse">
                            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          </div>
                          <span className="text-sm">Assembling components...</span>
                        </div>
                      )}

                      <SmartSuggestions
                        artifacts={artifactSystem.artifacts}
                        onSuggestClick={(prompt) => setTaskInput(prompt)}
                        isLoading={isGenerating}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>

        <section id="templates" ref={templateSectionRef} className="mt-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Templates</p>
              <h2 className="text-2xl font-semibold text-zinc-900">Start from a proven workflow</h2>
            </div>
            <p className="text-sm text-zinc-600 max-w-md">
              Load a complete workspace in one click. Each template is editable and exportable.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <div key={template.id} className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-lg">
                      {template.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">{template.name}</p>
                      <p className="text-xs text-zinc-500">{template.description}</p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500">{template.artifacts.length} artifacts</span>
                </div>
                <button
                  onClick={() => applyTemplate(template.id)}
                  className="mt-4 w-full px-3 py-2 rounded-xl border border-black/10 bg-white text-sm text-zinc-700 hover:text-zinc-900 hover:border-black/20 transition-colors"
                >
                  Load template
                </button>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mt-16">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Describe the workflow",
                body: "Type a command like \"create a launch plan\" or \"visualize onboarding flow\".",
              },
              {
                title: "Artifacts assemble instantly",
                body: "Plans, boards, and dashboards stream in with live props and editable state.",
              },
              {
                title: "Export or share",
                body: "Download JSON, Markdown, or CSV. Bring the workspace into docs or tooling.",
              },
            ].map((item, index) => (
              <div key={item.title} className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Step {index + 1}</p>
                <h3 className="text-lg font-semibold text-zinc-900 mt-3">{item.title}</h3>
                <p className="text-sm text-zinc-600 mt-2">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="shortcuts" className="mt-16">
          <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h3 className="text-lg font-semibold text-zinc-900">Keyboard shortcuts</h3>
              <p className="text-sm text-zinc-600">Work faster in demos and live edits.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 text-sm text-zinc-600">
              {[
                { label: "Focus command input", keys: "Cmd/Ctrl + K" },
                { label: "Export JSON", keys: "Cmd/Ctrl + S" },
                { label: "Export Markdown", keys: "Cmd/Ctrl + E" },
                { label: "Open templates", keys: "Cmd/Ctrl + Shift + L" },
                { label: "Undo last change", keys: "Cmd/Ctrl + Z" },
                { label: "Clear command line", keys: "Esc" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 border border-black/10 rounded-xl bg-white p-3">
                  <span>{item.label}</span>
                  <kbd className="px-2 py-1 rounded bg-zinc-900 text-white text-xs font-mono">{item.keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-2">
          {[
            {
              title: "Stateful by default",
              body: "Artifacts persist across conversation and can be mutated directly.",
            },
            {
              title: "Streaming + retries",
              body: "Progressive rendering keeps the demo alive even under load.",
            },
            {
              title: "MCP-native tools",
              body: "Connect databases, APIs, and custom servers with minimal glue.",
            },
            {
              title: "Presentation ready",
              body: "Launch demos with preloaded workspaces and smart suggestions.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-sm">
              <h4 className="text-lg font-semibold text-zinc-900">{item.title}</h4>
              <p className="text-sm text-zinc-600 mt-2">{item.body}</p>
            </div>
          ))}
        </section>

        <footer className="mt-16 border-t border-black/10 pt-6 text-sm text-zinc-500">
          Built for hackathon-grade demos - OmniUI keeps the workspace alive, editable, and exportable.
        </footer>
      </main>

      {statusMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-zinc-900 text-white text-sm shadow-lg">
          {statusMessage}
        </div>
      )}
    </div>
  );
}


