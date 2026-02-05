type Step = {
    title: string;
    description: string;
};

export function ExecutionPlan({
    goal,
    steps,
}: {
    goal?: string | null;
    steps?: Step[] | null;
}) {
    // Defensive: handle null/undefined props from AI
    const safeGoal = goal || "Execution Plan";
    const safeSteps = Array.isArray(steps) ? steps : [];

    return (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 space-y-4">
            <div className="flex items-center gap-2">
                <span className="text-blue-400">📋</span>
                <h3 className="font-semibold text-base text-white">{safeGoal}</h3>
            </div>

            {safeSteps.length === 0 ? (
                <div className="text-gray-400 text-sm italic">
                    Loading plan steps...
                </div>
            ) : (
                <ol className="space-y-3">
                    {safeSteps.map((step, i) => (
                        <li key={i} className="flex gap-3">
                            <span className="text-blue-400 font-mono text-sm mt-0.5">{i + 1}.</span>
                            <div>
                                <div className="font-medium text-white">{step?.title || "Step"}</div>
                                <div className="text-sm text-gray-400">
                                    {step?.description || "Details pending..."}
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
