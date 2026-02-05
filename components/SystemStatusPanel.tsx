type Metric = {
    label: string;
    value: string;
    status: string;
};

// Normalize status value to one of our known types
function normalizeStatus(status?: string | null): "healthy" | "warning" | "critical" {
    const normalized = status?.toLowerCase() ?? "";
    if (["healthy", "operational", "online", "ok", "good", "up"].includes(normalized)) {
        return "healthy";
    }
    if (["warning", "degraded", "slow", "partial"].includes(normalized)) {
        return "warning";
    }
    if (["critical", "error", "offline", "down", "failed"].includes(normalized)) {
        return "critical";
    }
    return "healthy"; // Default to healthy for unknown
}

export function SystemStatusPanel({
    systemName,
    overallStatus,
    metrics,
}: {
    systemName?: string | null;
    overallStatus?: string | null;
    metrics?: Metric[] | null;
}) {
    // Defensive: handle null/undefined props from AI
    const safeName = systemName || "System Status";
    const safeOverallStatus = overallStatus || "healthy";
    const safeMetrics = Array.isArray(metrics) ? metrics : [];

    const status = normalizeStatus(safeOverallStatus);

    const statusColors = {
        healthy: "text-green-400",
        warning: "text-yellow-400",
        critical: "text-red-400",
    };

    const statusBorder = {
        healthy: "border-green-500/20 bg-green-500/5",
        warning: "border-yellow-500/20 bg-yellow-500/5",
        critical: "border-red-500/20 bg-red-500/5",
    };

    const statusIcon = {
        healthy: "●",
        warning: "◐",
        critical: "○",
    };

    return (
        <div className={`rounded-2xl border ${statusBorder[status]} p-6 space-y-4`}>
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base text-white">{safeName}</h3>
                <span className={`text-sm flex items-center gap-2 ${statusColors[status]}`}>
                    <span>{statusIcon[status]}</span>
                    {safeOverallStatus.toUpperCase()}
                </span>
            </div>

            {safeMetrics.length === 0 ? (
                <div className="text-gray-400 text-sm italic">
                    Loading metrics...
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {safeMetrics.map((metric, i) => {
                        const metricStatus = normalizeStatus(metric?.status);
                        return (
                            <div key={i} className="space-y-1">
                                <div className="text-xs text-gray-500 uppercase tracking-wide">
                                    {metric?.label || "Metric"}
                                </div>
                                <div className={`font-mono text-lg ${statusColors[metricStatus]}`}>
                                    {metric?.value || "N/A"}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
