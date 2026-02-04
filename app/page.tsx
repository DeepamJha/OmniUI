"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [taskInput, setTaskInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const demoPrompts = [
    { label: "Revenue metrics", icon: "📊" },
    { label: "Task progress", icon: "✓" },
    { label: "System health", icon: "⚡" },
  ];

  const handleGenerate = () => {
    if (!taskInput.trim()) return;
    setIsGenerating(true);
    // Simulate generation - will be replaced with TamboProvider
    setTimeout(() => {
      setIsGenerating(false);
      setShowWorkspace(true);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

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
                placeholder="Describe your task..."
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
        <div className="w-full max-w-6xl flex-1">
          <div
            className={`relative min-h-[500px] md:min-h-[550px] rounded-3xl border transition-all duration-500 ${showWorkspace
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
                  className={`w-1.5 h-1.5 rounded-full ${showWorkspace ? "bg-emerald-400" : "bg-zinc-600"
                    }`}
                />
                {showWorkspace ? "Components Active" : "Ready"}
              </div>
            </div>

            {/* Workspace content area */}
            <div className="relative p-6 md:p-8 min-h-[440px]">
              {!showWorkspace ? (
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
                // Demo assembled components
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up">
                  {/* Metric Card 1 */}
                  <div className="group p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider">
                        Revenue
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-emerald-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                      $48.2K
                    </div>
                    <div className="text-sm text-emerald-400">
                      +12.5% from last week
                    </div>
                  </div>

                  {/* Metric Card 2 */}
                  <div
                    className="group p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5"
                    style={{ animationDelay: "100ms" }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider">
                        Tasks
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-indigo-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                      24/31
                    </div>
                    <div className="text-sm text-zinc-400">
                      77% completion rate
                    </div>
                  </div>

                  {/* Metric Card 3 */}
                  <div
                    className="group p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5"
                    style={{ animationDelay: "200ms" }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider">
                        System
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-amber-400"
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
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                      99.9%
                    </div>
                    <div className="text-sm text-zinc-400">
                      Uptime this month
                    </div>
                  </div>

                  {/* Chart placeholder */}
                  <div
                    className="md:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800"
                    style={{ animationDelay: "300ms" }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-zinc-300">
                        Performance Overview
                      </span>
                      <div className="flex gap-2 text-xs text-zinc-500">
                        <span className="px-2 py-1 rounded bg-zinc-800">7D</span>
                        <span className="px-2 py-1 rounded hover:bg-zinc-800 cursor-pointer">
                          30D
                        </span>
                        <span className="px-2 py-1 rounded hover:bg-zinc-800 cursor-pointer">
                          90D
                        </span>
                      </div>
                    </div>
                    <div className="h-32 flex items-end gap-2">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map(
                        (h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t bg-gradient-to-t from-indigo-500/40 to-indigo-500/10 hover:from-indigo-500/60 hover:to-indigo-500/20 transition-all duration-300 cursor-pointer"
                            style={{
                              height: `${h}%`,
                              animationDelay: `${i * 50}ms`,
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>

                  {/* Activity feed */}
                  <div
                    className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800"
                    style={{ animationDelay: "400ms" }}
                  >
                    <span className="text-sm font-medium text-zinc-300 block mb-4">
                      Recent Activity
                    </span>
                    <div className="space-y-3">
                      {[
                        {
                          text: "Dashboard updated",
                          time: "2m ago",
                          color: "bg-emerald-400",
                        },
                        {
                          text: "New user signup",
                          time: "5m ago",
                          color: "bg-indigo-400",
                        },
                        {
                          text: "Report generated",
                          time: "12m ago",
                          color: "bg-amber-400",
                        },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${item.color}`}
                          />
                          <span className="text-zinc-300 flex-1">
                            {item.text}
                          </span>
                          <span className="text-zinc-600 text-xs">
                            {item.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
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
            to generate
          </p>
        </div>
      </main>
    </div>
  );
}
