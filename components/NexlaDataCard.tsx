import type { NexlaDataStatus } from "@/lib/types";

export function NexlaDataCard({
  status,
}: {
  status: NexlaDataStatus | null;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-hairline bg-panel-inset px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="font-display text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Data source
        </span>
        <span className="font-mono text-sm text-ink">
          {status?.source ?? "Not connected"}
        </span>
      </div>

      {status ? (
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs font-tabular">
          <span className="text-pass">Schema: {status.schemaStatus}</span>
          <span className="text-ink-muted">
            Records processed:{" "}
            <span className="text-ink">
              {status.recordsProcessed.toLocaleString()}
            </span>
          </span>
        </div>
      ) : (
        <span className="font-mono text-xs text-ink-muted">
          Awaiting sync — run the eval loop to pull borrower profiles.
        </span>
      )}
    </section>
  );
}
