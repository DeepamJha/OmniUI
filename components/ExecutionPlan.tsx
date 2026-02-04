type Step = {
    title: string;
    description: string;
};

export function ExecutionPlan({
    goal,
    steps,
}: {
    goal: string;
    steps: Step[];
}) {
    return (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 space-y-4">
            <div className="flex items-center gap-2">
                <span className="text-blue-400">📋</span>
                <h3 className="font-semibold text-base text-white">{goal}</h3>
            </div>

            <ol className="space-y-3">
                {steps.map((step, i) => (
                    <li key={i} className="flex gap-3">
                        <span className="text-blue-400 font-mono text-sm mt-0.5">{i + 1}.</span>
                        <div>
                            <div className="font-medium text-white">{step.title}</div>
                            <div className="text-sm text-gray-400">
                                {step.description}
                            </div>
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    );
}
