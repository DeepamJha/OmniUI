type Status = "success" | "warning" | "error";

export function CommandResultPanel({
    title,
    status,
    summary,
    items,
}: {
    title: string;
    status: Status;
    summary: string;
    items: string[];
}) {
    const statusColor =
        status === "success"
            ? "border-green-500/30 bg-green-500/5"
            : status === "warning"
                ? "border-yellow-500/30 bg-yellow-500/5"
                : "border-red-500/30 bg-red-500/5";

    const statusIcon =
        status === "success" ? "✓" : status === "warning" ? "⚠" : "✕";

    return (
        <div
            className={`rounded-2xl border ${statusColor} p-6 space-y-4 text-sm`}
        >
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base text-white">{title}</h3>
                <span className={`text-xs uppercase tracking-wide flex items-center gap-1.5 ${status === "success" ? "text-green-400" :
                        status === "warning" ? "text-yellow-400" : "text-red-400"
                    }`}>
                    <span>{statusIcon}</span>
                    {status}
                </span>
            </div>

            <p className="text-gray-400">{summary}</p>

            <ul className="list-disc list-inside space-y-1 text-gray-300">
                {items.map((item, i) => (
                    <li key={i}>{item}</li>
                ))}
            </ul>
        </div>
    );
}
