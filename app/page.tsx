"use client";

import { useState } from "react";
import { NexlaDataCard } from "@/components/NexlaDataCard";
import { PolicyCard } from "@/components/PolicyCard";
import { EvalSummary } from "@/components/EvalSummary";
import { PassRateChart } from "@/components/PassRateChart";
import { DefaultRiskChart } from "@/components/DefaultRiskChart";
import { IterationTimeline } from "@/components/IterationTimeline";
import { FailedCasesTable } from "@/components/FailedCasesTable";
import { FinalReport } from "@/components/FinalReport";
import rawFixture from "@/fixtures/loop-result.json";
import type { RunLoopResponse } from "@/lib/types";

const fixture = rawFixture as unknown as RunLoopResponse;

export default function Home() {
  const [result, setResult] = useState<RunLoopResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedIteration, setSelectedIteration] = useState<number | null>(
    null
  );

  const handleRunEvalLoop = () => {
    setRunning(true);
    // TODO integration: replace with `fetch("/api/run-loop", { method: "POST" })`
    window.setTimeout(() => {
      setResult(fixture);
      setSelectedIteration(fixture.iterations[0]?.iteration ?? null);
      setRunning(false);
    }, 1200);
  };

  const currentIteration =
    result?.iterations.find((it) => it.iteration === selectedIteration) ??
    null;
  const startingPolicy = result?.iterations[0]?.policy ?? null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-hairline bg-panel-inset px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-baseline justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-ink">
              UnderwriteLoop
            </h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              Agentic QA for loan approval policies.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-6">
        <NexlaDataCard status={result?.nexlaDataStatus ?? null} />

        <section className="rounded-sm border border-hairline bg-panel-raised px-4 py-4">
          <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink">
            Business goal
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            UnderwriteLoop stress-tests small-business lending policies
            against labeled borrower profiles before they reach real
            applicants. It surfaces where a policy&apos;s thresholds
            misjudge a case, explains why in plain language, and proposes a
            bounded revision — so a risk reviewer can watch a policy
            improve, case by case, instead of approving changes on faith.
          </p>
        </section>

        <PolicyCard
          startingPolicy={startingPolicy}
          currentPolicy={result?.finalPolicy ?? null}
        />

        <button
          type="button"
          onClick={handleRunEvalLoop}
          disabled={running}
          className="w-full rounded-sm bg-brass px-4 py-3 text-sm font-semibold text-panel-inset transition-colors hover:bg-brass-dim disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? "Running eval loop…" : "Run eval loop"}
        </button>

        <PassRateChart iterations={result?.iterations ?? []} />
        <DefaultRiskChart iterations={result?.iterations ?? []} />

        <EvalSummary
          iteration={currentIteration}
          totalCases={result?.nexlaDataStatus.recordsProcessed ?? null}
        />

        <IterationTimeline
          iterations={result?.iterations ?? []}
          selectedIteration={selectedIteration}
          onSelectIteration={setSelectedIteration}
        />

        <FailedCasesTable iteration={currentIteration} hasRun={!!result} />

        <FinalReport
          report={result?.finalReport ?? null}
          critique={currentIteration?.agentCritique ?? null}
          critiqueIterationLabel={
            currentIteration ? `iteration ${currentIteration.iteration}` : undefined
          }
        />
      </main>
    </div>
  );
}
