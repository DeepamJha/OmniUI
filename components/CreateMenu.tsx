"use client";

import { useState } from "react";

type ArtifactType =
    | 'ExecutionPlan'
    | 'DecisionMatrix'
    | 'SystemStatusPanel'
    | 'InteractiveFlowchart'
    | 'CommandResultPanel';

interface ArtifactOption {
    type: ArtifactType;
    icon: string;
    label: string;
    description: string;
    prompt: string;
}

const ARTIFACT_OPTIONS: ArtifactOption[] = [
    {
        type: 'ExecutionPlan',
        icon: '📋',
        label: 'Execution Plan',
        description: 'Break down a project or task into ordered steps',
        prompt: 'Create a detailed execution plan for',
    },
    {
        type: 'DecisionMatrix',
        icon: '⚖️',
        label: 'Decision Matrix',
        description: 'Compare options with weighted criteria',
        prompt: 'Help me decide between options for',
    },
    {
        type: 'SystemStatusPanel',
        icon: '📊',
        label: 'System Status',
        description: 'Show system health and performance metrics',
        prompt: 'Show the system status and metrics for',
    },
    {
        type: 'InteractiveFlowchart',
        icon: '🔀',
        label: 'Flowchart',
        description: 'Visualize processes and workflows',
        prompt: 'Create a flowchart diagram showing',
    },
    {
        type: 'CommandResultPanel',
        icon: '✅',
        label: 'Analysis Result',
        description: 'Display analysis findings and recommendations',
        prompt: 'Analyze and provide findings for',
    },
];

interface CreateMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (prompt: string) => void;
    isLoading?: boolean;
}

export function CreateMenu({ isOpen, onClose, onSubmit, isLoading }: CreateMenuProps) {
    const [selectedType, setSelectedType] = useState<ArtifactType | null>(null);
    const [customPrompt, setCustomPrompt] = useState('');

    if (!isOpen) return null;

    const handleCreate = () => {
        if (!selectedType) return;

        const option = ARTIFACT_OPTIONS.find(o => o.type === selectedType);
        const fullPrompt = customPrompt.trim()
            ? `${option?.prompt} ${customPrompt}`
            : option?.prompt || customPrompt;

        onSubmit(fullPrompt);
        setSelectedType(null);
        setCustomPrompt('');
    };

    const handleQuickCreate = (option: ArtifactOption) => {
        onSubmit(option.prompt);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl mx-4 bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Create Artifact</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Choose a type or describe what you need
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Artifact Type Grid */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {ARTIFACT_OPTIONS.map((option) => (
                            <button
                                key={option.type}
                                onClick={() => setSelectedType(
                                    selectedType === option.type ? null : option.type
                                )}
                                className={`p-4 rounded-xl border transition-all text-left group
                                    ${selectedType === option.type
                                        ? 'border-purple-500 bg-purple-500/10'
                                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                    }`}
                            >
                                <span className="text-2xl">{option.icon}</span>
                                <h3 className="font-medium text-white mt-2">{option.label}</h3>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {option.description}
                                </p>
                            </button>
                        ))}
                    </div>

                    {/* Custom Prompt Input */}
                    {selectedType && (
                        <div className="space-y-3 animate-in fade-in duration-200">
                            <label className="block text-sm font-medium text-gray-300">
                                Describe what you need (optional)
                            </label>
                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder={`e.g., "a web app deployment to AWS"`}
                                rows={2}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                                    text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500
                                    resize-none"
                            />
                            <p className="text-xs text-gray-500">
                                {ARTIFACT_OPTIONS.find(o => o.type === selectedType)?.prompt}...
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-white/10 bg-white/[0.02]">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!selectedType || isLoading}
                        className={`px-6 py-2.5 rounded-xl font-medium transition-all
                            ${selectedType
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                                : 'bg-white/10 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Generating...
                            </span>
                        ) : (
                            'Create Artifact'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
