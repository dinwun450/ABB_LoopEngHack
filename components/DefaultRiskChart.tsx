"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Iteration } from "@/lib/types";

const TARGET_DEFAULT_RISK = 5;

type ChartRow = { iteration: number; riskPct: number };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-sm border border-hairline bg-panel-inset px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-display font-semibold text-ink">
        Iteration {row.iteration}
      </p>
      <p className="font-mono font-tabular text-fail">
        risk {row.riskPct.toFixed(1)}%
      </p>
    </div>
  );
}

export function DefaultRiskChart({
  iterations,
}: {
  iterations: Iteration[];
}) {
  const hasData = iterations.length > 0;
  const data: ChartRow[] = iterations.map((it) => ({
    iteration: it.iteration,
    riskPct: it.defaultRiskEstimate * 100,
  }));

  return (
    <section className="rounded-sm border border-hairline bg-panel-raised">
      <header className="flex items-baseline justify-between border-b border-hairline px-4 py-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
          Default risk across iterations
        </h2>
        <span className="font-mono text-xs text-ink-muted">
          target ≤ {TARGET_DEFAULT_RISK}%
        </span>
      </header>

      {hasData ? (
        <div className="h-48 px-2 pb-4 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                stroke="var(--hairline)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="iteration"
                tickFormatter={(v) => `Iter ${v}`}
                tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                axisLine={{ stroke: "var(--hairline)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine
                y={TARGET_DEFAULT_RISK}
                stroke="var(--ink-muted)"
                strokeDasharray="4 4"
                label={{
                  value: "target",
                  position: "insideTopRight",
                  fill: "var(--ink-muted)",
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="riskPct"
                stroke="var(--signal-fail)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--signal-fail)" }}
                activeDot={{ r: 5 }}
                isAnimationActive={true}
                animationDuration={1100}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-48 flex-col items-center justify-center gap-1 px-4 text-center">
          <p className="text-sm text-ink-muted">
            No eval run yet — default risk will appear here once the loop
            runs.
          </p>
        </div>
      )}
    </section>
  );
}
