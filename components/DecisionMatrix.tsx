"use client";

import { useState } from "react";

type Criterion = {
    id: string;
    name: string;
    weight: number;
};

type Option = {
    id: string;
    name: string;
    scores: { criterionId: string; score: number }[] | Record<string, number>;
};

export function DecisionMatrix({
    question,
    criteria,
    options,
    recommendation,
}: {
    question?: string | null;
    criteria?: Criterion[] | null;
    options?: Option[] | null;
    recommendation?: string | null;
}) {
    const [editingCell, setEditingCell] = useState<{ optionId: string; criterionId: string } | null>(null);
    const [editingWeight, setEditingWeight] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<number>(5);

    // Safe defaults
    const safeQuestion = question || "Decision Matrix";
    const safeCriteria = Array.isArray(criteria) ? criteria : [];
    const safeOptions = Array.isArray(options) ? options : [];

    // Helper to get score - works with both array and record format
    const getScore = (option: Option, criterionId: string): number => {
        if (Array.isArray(option.scores)) {
            const found = option.scores.find(s => s.criterionId === criterionId);
            return found?.score ?? 5;
        }
        return option.scores?.[criterionId] ?? 5;
    };

    // Calculate total score for an option
    const calculateTotal = (option: Option) => {
        return safeCriteria.reduce((sum, criterion) => {
            const score = getScore(option, criterion.id);
            return sum + score * (criterion.weight || 1);
        }, 0);
    };

    // Find recommended option (highest score)
    const getRecommendedId = () => {
        if (recommendation) return recommendation;
        if (safeOptions.length === 0) return null;

        let maxScore = -1;
        let maxId = safeOptions[0]?.id;

        safeOptions.forEach(opt => {
            const total = calculateTotal(opt);
            if (total > maxScore) {
                maxScore = total;
                maxId = opt.id;
            }
        });

        return maxId;
    };

    const recommendedId = getRecommendedId();

    // Get score color based on value (1-10)
    const getScoreColor = (score: number) => {
        if (score >= 8) return "text-green-400 bg-green-500/20";
        if (score >= 5) return "text-yellow-400 bg-yellow-500/20";
        return "text-red-400 bg-red-500/20";
    };

    // Get weight color
    const getWeightColor = (weight: number) => {
        if (weight >= 8) return "text-purple-400";
        if (weight >= 5) return "text-blue-400";
        return "text-gray-400";
    };

    if (safeCriteria.length === 0 && safeOptions.length === 0) {
        return (
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6">
                <h3 className="font-semibold text-lg text-white mb-2">⚖️ {safeQuestion}</h3>
                <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No criteria or options defined yet.</p>
                    <p className="text-xs mt-1">The AI is generating content...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <span className="text-purple-400 text-xl">⚖️</span>
                <h3 className="font-semibold text-lg text-white">{safeQuestion}</h3>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left py-3 px-2 text-gray-400 font-medium">Option</th>
                            {safeCriteria.map((criterion) => (
                                <th
                                    key={criterion.id}
                                    className="text-center py-3 px-2 text-gray-400 font-medium min-w-[100px]"
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <span>{criterion.name}</span>
                                        <button
                                            onClick={() => {
                                                setEditingWeight(criterion.id);
                                                setEditValue(criterion.weight);
                                            }}
                                            className={`text-xs px-2 py-0.5 rounded-full border border-white/10 
                                                hover:border-purple-500/50 transition-colors cursor-pointer
                                                ${getWeightColor(criterion.weight)}`}
                                            title="Click to edit weight"
                                        >
                                            ×{criterion.weight}
                                        </button>
                                    </div>
                                </th>
                            ))}
                            <th className="text-center py-3 px-2 text-white font-semibold bg-white/5 rounded-t-lg">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {safeOptions.map((option) => {
                            const total = calculateTotal(option);
                            const isRecommended = option.id === recommendedId;

                            return (
                                <tr
                                    key={option.id}
                                    className={`border-b border-white/5 transition-colors
                                        ${isRecommended ? 'bg-green-500/10' : 'hover:bg-white/5'}`}
                                >
                                    <td className="py-3 px-2">
                                        <div className="flex items-center gap-2">
                                            {isRecommended && (
                                                <span className="text-green-400" title="Recommended">✓</span>
                                            )}
                                            <span className={`font-medium ${isRecommended ? 'text-green-300' : 'text-white'}`}>
                                                {option.name}
                                            </span>
                                        </div>
                                    </td>
                                    {safeCriteria.map((criterion) => {
                                        const score = getScore(option, criterion.id);
                                        const isEditing = editingCell?.optionId === option.id &&
                                            editingCell?.criterionId === criterion.id;

                                        return (
                                            <td key={criterion.id} className="text-center py-3 px-2">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="10"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(parseInt(e.target.value) || 5)}
                                                        onBlur={() => setEditingCell(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                                                        className="w-12 text-center bg-purple-500/20 border border-purple-500 rounded px-1 py-0.5 text-white focus:outline-none"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setEditingCell({ optionId: option.id, criterionId: criterion.id });
                                                            setEditValue(score);
                                                        }}
                                                        className={`w-8 h-8 rounded-lg ${getScoreColor(score)} 
                                                            font-semibold hover:ring-2 hover:ring-purple-500/50 transition-all cursor-pointer`}
                                                        title="Click to edit score"
                                                    >
                                                        {score}
                                                    </button>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="text-center py-3 px-2">
                                        <span className={`font-bold text-lg ${isRecommended ? 'text-green-400' : 'text-white'}`}>
                                            {total.toFixed(0)}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-gray-500 pt-2">
                <span>Score: 1-10 (higher is better)</span>
                <span>•</span>
                <span>Weight: ×1-10 (importance multiplier)</span>
                <span>•</span>
                <span className="text-green-400">✓ Recommended</span>
            </div>

            {/* Hint */}
            <p className="text-xs text-gray-600 text-center">
                💡 Click any score or weight to edit • Total = Σ(score × weight)
            </p>
        </div>
    );
}
