type Status = "success" | "warning" | "error";

export function CommandResultPanel({
    title,
    status,
    summary,
    items,
}: {
    title?: string | null;
    status?: string | null;
    summary?: string | null;
    items?: string[] | null;
}) {
    // Defensive: handle null/undefined props from AI
    const safeTitle = title || "AI Response";
    const safeStatus = (status === "warning" || status === "error") ? status : "success";
    const safeSummary = summary || "";
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

    const statusColor =
        safeStatus === "success"
            ? "border-green-500/30 bg-green-500/5"
            : safeStatus === "warning"
                ? "border-yellow-500/30 bg-yellow-500/5"
                : "border-red-500/30 bg-red-500/5";

    const statusIcon =
        safeStatus === "success" ? "✓" : safeStatus === "warning" ? "⚠" : "✕";

    return (
        <div
            className={`rounded-2xl border ${statusColor} p-6 space-y-4 text-sm`}
        >
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base text-white">{safeTitle}</h3>
                <span className={`text-xs uppercase tracking-wide flex items-center gap-1.5 ${safeStatus === "success" ? "text-green-400" :
                    safeStatus === "warning" ? "text-yellow-400" : "text-red-400"
                    }`}>
                    <span>{statusIcon}</span>
                    {safeStatus}
                </span>
            </div>

            {safeSummary && <p className="text-gray-400">{safeSummary}</p>}

            {safeItems.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-gray-300">
                    {safeItems.map((item, i) => (
                        <li key={i}>{item}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
