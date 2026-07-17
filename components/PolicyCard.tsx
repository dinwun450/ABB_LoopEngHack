import type { Policy } from "@/lib/types";
import { describePolicy, changedPolicyKeys } from "@/lib/policy";

export function PolicyCard({
  startingPolicy,
  currentPolicy,
}: {
  startingPolicy: Policy | null;
  currentPolicy: Policy | null;
}) {
  const changed =
    startingPolicy && currentPolicy
      ? changedPolicyKeys(startingPolicy, currentPolicy)
      : new Set<keyof Policy>();

  const startingRows = startingPolicy ? describePolicy(startingPolicy) : null;
  const currentRows = currentPolicy ? describePolicy(currentPolicy) : null;

  return (
    <section className="rounded-sm border border-hairline bg-panel-raised">
      <header className="border-b border-hairline px-4 py-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
          Policy thresholds
        </h2>
      </header>

      {startingRows && currentRows ? (
        <div className="grid grid-cols-2 divide-x divide-hairline">
          <div>
            <div className="px-4 py-2 text-xs uppercase tracking-wide text-ink-muted">
              Starting
            </div>
            <dl className="divide-y divide-hairline">
              {startingRows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between px-4 py-2"
                >
                  <dt className="text-sm text-ink-muted">{row.label}</dt>
                  <dd className="font-mono text-sm font-tabular text-ink">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <div className="px-4 py-2 text-xs uppercase tracking-wide text-ink-muted">
              Current
            </div>
            <dl className="divide-y divide-hairline">
              {currentRows.map((row) => {
                const isChanged = changed.has(row.key);
                return (
                  <div
                    key={row.key}
                    className={`flex items-center justify-between px-4 py-2 ${
                      isChanged ? "bg-brass/10" : ""
                    }`}
                  >
                    <dt className="text-sm text-ink-muted">{row.label}</dt>
                    <dd
                      className={`flex items-center gap-1.5 font-mono text-sm font-tabular ${
                        isChanged ? "text-brass" : "text-ink"
                      }`}
                    >
                      {isChanged && <span aria-hidden>●</span>}
                      {row.value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-sm text-ink-muted">
          No policy loaded yet. Run an eval to load the starting policy.
        </div>
      )}
    </section>
  );
}
