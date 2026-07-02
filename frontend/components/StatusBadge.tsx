const STYLES: Record<string, string> = {
  pending_approval: "bg-yellow-500/15 text-yellow-400",
  awaiting_signatures: "bg-blue-500/15 text-blue-400",
  executed: "bg-green-500/15 text-green-400",
  failed: "bg-red-500/15 text-red-400",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? "bg-foreground/10 text-foreground/70";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
