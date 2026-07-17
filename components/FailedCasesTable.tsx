import type { Iteration } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function FailedCasesTable({
  iteration,
  hasRun = false,
}: {
  iteration: Iteration | null;
  hasRun?: boolean;
}) {
  const cases = iteration?.failedCases ?? [];

  return (
    <section className="rounded-sm border border-hairline bg-panel-raised">
      <header className="flex items-baseline justify-between border-b border-hairline px-4 py-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
          Failed cases
        </h2>
        <span className="font-mono text-xs text-ink-muted">
          {iteration
            ? `iteration ${iteration.iteration} · ${cases.length} failing`
            : ""}
        </span>
      </header>

      {!hasRun ? (
        <div className="px-4 py-8 text-center text-sm text-ink-muted">
          No eval run yet — click Run eval loop to test the starting policy
          against 40 borrower profiles.
        </div>
      ) : cases.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-pass">
          All cases passing at this iteration — no failures.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-hairline bg-panel-inset text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2 font-medium">Applicant</th>
                <th className="px-4 py-2 font-medium">Segment</th>
                <th className="px-4 py-2 font-medium">Edge case</th>
                <th className="px-4 py-2 text-right font-medium">
                  Expected
                </th>
                <th className="px-4 py-2 text-right font-medium">Actual</th>
                <th className="px-4 py-2 font-medium">Violations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {cases.map((c) => (
                <tr
                  key={c.applicant.id}
                  className="hover:bg-panel-inset/60"
                >
                  <td className="px-4 py-2 font-mono font-tabular text-ink">
                    {c.applicant.id}
                  </td>
                  <td className="px-4 py-2 text-ink-muted">
                    {c.applicant.segment}
                  </td>
                  <td className="px-4 py-2 text-ink-muted">
                    {c.applicant.edgeCase}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <StatusBadge status={c.applicant.expectedDecision} compact />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <StatusBadge status={c.decision} compact />
                  </td>
                  <td className="px-4 py-2 text-ink-muted">
                    {c.violations.length > 0
                      ? c.violations.join("; ")
                      : "No threshold violated — misjudged on risk alone"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
