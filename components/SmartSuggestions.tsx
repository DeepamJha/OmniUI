'use client';

import React from 'react';
import type { Artifact } from '@/lib/artifacts/types';

interface SmartSuggestionsProps {
  artifacts: Record<string, Artifact>;
  onSuggestClick: (prompt: string) => void;
  isLoading?: boolean;
}

export function SmartSuggestions({ artifacts, onSuggestClick, isLoading }: SmartSuggestionsProps) {
  const artifactArray = Object.values(artifacts);

  if (artifactArray.length === 0) {
    return (
      <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-teal-500/10 to-amber-500/10 border border-teal-500/20">
        <div className="text-sm text-zinc-300 mb-3">
          💡 <strong>Pro Tip:</strong> Try commands like:
        </div>
        <div className="space-y-2 text-sm">
          <button
            onClick={() => onSuggestClick('create a product launch timeline with phases')}
            className="block w-full text-left px-3 py-2 rounded text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            🚀 "create a product launch timeline with phases"
          </button>
          <button
            onClick={() => onSuggestClick('create a sprint board with to do, in progress, and done')}
            className="block w-full text-left px-3 py-2 rounded text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            📋 "create a sprint board with sections"
          </button>
          <button
            onClick={() => onSuggestClick('create system health dashboard')}
            className="block w-full text-left px-3 py-2 rounded text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            📊 "create system health dashboard"
          </button>
        </div>
      </div>
    );
  }

  const suggestions: Array<{ emoji: string; text: string; prompt: string }> = [];

  const hasExecutionPlan = artifactArray.some(a => a.type === 'ExecutionPlan');
  const hasKanban = artifactArray.some(a => a.type === 'KanbanBoard');
  const hasSystemStatus = artifactArray.some(a => a.type === 'SystemStatusPanel');
  const hasFlowchart = artifactArray.some(a => a.type === 'InteractiveFlowchart');

  if (hasExecutionPlan && !hasKanban) {
    suggestions.push({
      emoji: '📋',
      text: 'Create task board for this plan',
      prompt: 'create a kanban board with tasks from the execution plan',
    });
  }

  if ((hasExecutionPlan || hasKanban) && !hasSystemStatus) {
    suggestions.push({
      emoji: '📊',
      text: 'Add metrics dashboard',
      prompt: 'create a system status panel with progress metrics and KPIs',
    });
  }

  if ((hasExecutionPlan || hasKanban) && !hasFlowchart) {
    suggestions.push({
      emoji: '🔀',
      text: 'Visualize workflow',
      prompt: 'create an interactive flowchart showing the process flow',
    });
  }

  if (hasKanban && hasExecutionPlan) {
    suggestions.push({
      emoji: '🔗',
      text: 'Link tasks to timeline',
      prompt: 'create a dependency map between tasks and timeline milestones',
    });
  }

  if (artifactArray.length >= 2) {
    suggestions.push({
      emoji: '📈',
      text: 'Generate report',
      prompt: 'create a comprehensive report summarizing all artifacts',
    });
  }

  suggestions.push({
    emoji: '💾',
    text: 'Save & export workspace',
    prompt: 'export this workspace',
  });

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-teal-500/10 to-amber-500/10 border border-teal-500/20">
      <div className="text-sm text-zinc-300 mb-3 flex items-center gap-2">
        <span className="text-lg">✨</span>
        <strong>What's Next?</strong>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {suggestions.slice(0, 6).map((suggestion, i) => (
          <button
            key={i}
            onClick={() => onSuggestClick(suggestion.prompt)}
            disabled={isLoading}
            className="px-3 py-2 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 text-xs transition-all duration-200 disabled:opacity-50 flex items-center gap-2 group"
          >
            <span className="text-base">{suggestion.emoji}</span>
            <span className="group-hover:text-teal-100">{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
