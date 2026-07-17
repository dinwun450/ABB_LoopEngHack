import type { Iteration } from "@/lib/types";

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return (match ? match[0] : text).trim();
}

export function IterationTimeline({
  iterations,
  selectedIteration,
  onSelectIteration,
}: {
  iterations: Iteration[];
  selectedIteration: number | null;
  onSelectIteration: (iteration: number) => void;
}) {
  return (
    <section className="rounded-sm border border-hairline bg-panel-raised">
      <header className="border-b border-hairline px-4 py-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
          Iteration timeline
        </h2>
      </header>

      {iterations.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-ink-muted">
          No iterations yet. Each loop pass will appear here with its policy
          changes and the agent&apos;s critique.
        </div>
      ) : (
        <ol className="divide-y divide-hairline">
          {iterations.map((it) => {
            const isSelected = selectedIteration === it.iteration;
            return (
              <li key={it.iteration}>
                <button
                  type="button"
                  onClick={() => onSelectIteration(it.iteration)}
                  className={`flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors ${
                    isSelected ? "bg-brass/10" : "hover:bg-panel-inset/60"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-sm font-semibold text-ink">
                      Iteration {it.iteration}
                    </span>
                    <span className="font-mono text-xs font-tabular text-ink-muted">
                      <span className="text-pass">
                        {(it.passRate * 100).toFixed(0)}% pass
                      </span>
                      {" · "}
                      <span className="text-fail">
                        {it.failedCases.length} failing
                      </span>
                    </span>
                  </div>

                  {it.policyChanges.length > 0 ? (
                    <ul className="space-y-0.5">
                      {it.policyChanges.map((change, idx) => (
                        <li
                          key={idx}
                          className="flex gap-2 text-xs text-ink-muted"
                        >
                          <span className="text-brass" aria-hidden>
                            →
                          </span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-ink-muted">
                      No changes applied — stopping conditions met.
                    </p>
                  )}

                  <p className="text-xs leading-relaxed text-ink">
                    {firstSentence(it.agentCritique)}
                  </p>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
