import type { Decision } from "@/lib/types";

type Status = Decision | "pending";

const STATUS_CONFIG: Record<
  Status,
  { label: string; color: string; bg: string; glyph: string }
> = {
  approve: {
    label: "Approve",
    color: "text-pass",
    bg: "bg-pass/12",
    glyph: "✓",
  },
  reject: {
    label: "Reject",
    color: "text-fail",
    bg: "bg-fail/12",
    glyph: "✕",
  },
  manual_review: {
    label: "Manual review",
    color: "text-review",
    bg: "bg-review/12",
    glyph: "–",
  },
  pending: {
    label: "Pending",
    color: "text-ink-muted",
    bg: "bg-ink-muted/10",
    glyph: "·",
  },
};

export function StatusBadge({
  status,
  compact = false,
}: {
  status: Status;
  compact?: boolean;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border border-hairline px-1.5 py-0.5 text-xs font-medium ${cfg.color} ${cfg.bg}`}
    >
      <span className="font-mono leading-none" aria-hidden>
        {cfg.glyph}
      </span>
      {!compact && <span>{cfg.label}</span>}
    </span>
  );
}

export function statusDotColor(status: Status): string {
  return STATUS_CONFIG[status].color;
}
