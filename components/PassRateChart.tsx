"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Iteration } from "@/lib/types";

const TARGET_PASS_RATE = 85;

type ChartRow = {
  iteration: number;
  passRatePct: number;
  failedCount: number;
};

function GaugeTick(props: { cx?: number; cy?: number; value?: number }) {
  const { cx, cy, value } = props;
  if (cx === undefined || cy === undefined) return null;
  const size = 7;
  return (
    <g>
      <rect
        x={cx - size / 2}
        y={cy - size / 2}
        width={size}
        height={size}
        fill="var(--panel-raised)"
        stroke="var(--brass)"
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={cy - 14}
        textAnchor="middle"
        className="font-mono font-tabular"
        fontSize={12}
        fontWeight={600}
        fill="var(--ink)"
      >
        {value?.toFixed(0)}%
      </text>
    </g>
  );
}

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
      <p className="font-mono font-tabular text-pass">
        pass {row.passRatePct.toFixed(1)}%
      </p>
      <p className="font-mono font-tabular text-fail">
        {row.failedCount} failing
      </p>
    </div>
  );
}

export function PassRateChart({ iterations }: { iterations: Iteration[] }) {
  const hasData = iterations.length > 0;
  const data: ChartRow[] = iterations.map((it) => ({
    iteration: it.iteration,
    passRatePct: it.passRate * 100,
    failedCount: it.failedCases.length,
  }));

  return (
    <section className="rounded-sm border border-hairline bg-panel-raised">
      <header className="flex items-baseline justify-between border-b border-hairline px-4 py-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
          Pass rate across iterations
        </h2>
        <span className="font-mono text-xs text-ink-muted">
          target ≥ {TARGET_PASS_RATE}%
        </span>
      </header>

      {hasData ? (
        <div className="h-80 px-2 pb-4 pt-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 24, left: 0, bottom: 0 }}
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
                yAxisId="pass"
                domain={[0, 100]}
                tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <YAxis
                yAxisId="fails"
                orientation="right"
                allowDecimals={false}
                tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine
                yAxisId="pass"
                y={TARGET_PASS_RATE}
                stroke="var(--ink-muted)"
                strokeDasharray="4 4"
                label={{
                  value: "target",
                  position: "insideTopRight",
                  fill: "var(--ink-muted)",
                  fontSize: 11,
                }}
              />
              <Bar
                yAxisId="fails"
                dataKey="failedCount"
                fill="var(--signal-fail)"
                fillOpacity={0.22}
                radius={[2, 2, 0, 0]}
                barSize={28}
              />
              <Line
                yAxisId="pass"
                type="monotone"
                dataKey="passRatePct"
                stroke="var(--brass)"
                strokeWidth={2.5}
                dot={<GaugeTick />}
                activeDot={{ r: 5, fill: "var(--brass)" }}
                isAnimationActive={true}
                animationDuration={1100}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="px-2 text-center text-xs text-ink-muted">
            Bars show failing cases per iteration (right axis)
          </p>
        </div>
      ) : (
        <div className="flex h-80 flex-col items-center justify-center gap-1 px-4 text-center">
          <p className="text-sm text-ink-muted">
            No eval run yet — click Run eval loop to see pass rate improve
            across iterations.
          </p>
        </div>
      )}
    </section>
  );
}
