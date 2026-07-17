import type { Iteration } from "@/lib/types";

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "pass" | "fail" | "review" | "brass";
}) {
  const accentClass = accent
    ? {
        pass: "text-pass",
        fail: "text-fail",
        review: "text-review",
        brass: "text-brass",
      }[accent]
    : "text-ink";

  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <span
        className={`font-mono text-2xl font-semibold font-tabular ${accentClass}`}
      >
        {value}
      </span>
    </div>
  );
}

export function EvalSummary({
  iteration,
  totalCases,
}: {
  iteration: Iteration | null;
  totalCases: number | null;
}) {
  return (
    <section className="rounded-sm border border-hairline bg-panel-raised">
      <header className="flex items-baseline justify-between border-b border-hairline px-4 py-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
          Eval summary
        </h2>
        {iteration && (
          <span className="font-mono text-xs text-ink-muted">
            iteration {iteration.iteration}
          </span>
        )}
      </header>

      {iteration ? (
        <div className="grid grid-cols-2 divide-x divide-y divide-hairline sm:grid-cols-5 sm:divide-y-0">
          <Stat
            label="Cases evaluated"
            value={(totalCases ?? "—").toString()}
          />
          <Stat
            label="Pass rate"
            value={`${(iteration.passRate * 100).toFixed(1)}%`}
            accent="pass"
          />
          <Stat
            label="Approval rate"
            value={`${(iteration.approvalRate * 100).toFixed(1)}%`}
          />
          <Stat
            label="Manual review"
            value={`${(iteration.manualReviewRate * 100).toFixed(1)}%`}
            accent="review"
          />
          <Stat
            label="Default risk"
            value={`${(iteration.defaultRiskEstimate * 100).toFixed(1)}%`}
            accent={iteration.defaultRiskEstimate > 0.05 ? "fail" : "pass"}
          />
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-sm text-ink-muted">
          No eval run yet — click Run eval loop to test the starting policy
          against 40 borrower profiles.
        </div>
      )}
    </section>
  );
}
