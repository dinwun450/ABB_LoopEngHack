import type { ReactNode } from "react";

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="text-brass">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function MarkdownishText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) {
          return (
            <h4
              key={i}
              className="pt-2 font-display text-sm font-semibold text-ink"
            >
              {renderInline(line.slice(4))}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3
              key={i}
              className="font-display text-base font-semibold text-ink"
            >
              {renderInline(line.slice(3))}
            </h3>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <p key={i} className="flex gap-2 pl-1 text-sm text-ink">
              <span className="text-brass" aria-hidden>
                –
              </span>
              {renderInline(line.slice(2))}
            </p>
          );
        }
        if (line.trim() === "") return null;
        return (
          <p key={i} className="text-sm leading-relaxed text-ink">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

export function FinalReport({
  report,
  critique,
  critiqueIterationLabel,
}: {
  report: string | null;
  critique?: string | null;
  critiqueIterationLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-sm border border-hairline bg-panel-raised">
        <header className="flex items-baseline justify-between border-b border-hairline px-4 py-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
            Agent critique
          </h2>
          {critiqueIterationLabel && (
            <span className="font-mono text-xs text-ink-muted">
              {critiqueIterationLabel}
            </span>
          )}
        </header>
        {critique ? (
          <div className="border-l-2 border-brass px-5 py-4">
            <p className="text-sm leading-relaxed text-ink">{critique}</p>
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">
            No critique yet — select an iteration once the eval loop has
            run.
          </div>
        )}
      </section>

      <section className="rounded-sm border border-hairline bg-panel-raised">
        <header className="border-b border-hairline px-4 py-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
            Final report
          </h2>
        </header>
        {report ? (
          <div className="px-5 py-4">
            <MarkdownishText text={report} />
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">
            No report yet — the closing summary appears here once the eval
            loop reaches a stopping condition.
          </div>
        )}
      </section>
    </div>
  );
}
