# UnderwriteLoop

UnderwriteLoop is agentic QA for small-business loan approval policies. It does not approve or
reject real borrowers. It stress-tests candidate policies before deployment using deterministic
evaluation and advisory LlamaIndex agents.

The implementation demonstrates this constrained optimization problem:

> Keep the default rate among approved applicants below X% while approving as many creditworthy
> applicants as possible.

The TypeScript agent layer uses LlamaIndex workflows to critique deterministic failures and produce
an internal final report. If no LLM key is configured, the same contract returns templated,
repeatable explanations. Agents never score applicants or apply policy changes.

This project uses fully observed synthetic outcomes. It is a loop-engineering demonstration, not a
production lending model.

## Run locally

```bash
npm ci
npm run lint
npm test
npm run build
```

The original deterministic Python loop can also be run end to end:

```bash
python3 -m pip install -e '.[dev]'
python3 -m credit_policy.cli validate
python3 -m credit_policy.cli generate-cases --offline
python3 -m credit_policy.cli optimize --offline
python3 -m credit_policy.cli evaluate-holdout
python3 -m credit_policy.cli package
```

Set `OPENAI_API_KEY` to use the TypeScript LlamaIndex agents; `LLM_MODEL` defaults to
`gpt-4.1-mini`. The Python demo defaults to `gpt-4o-mini` when `--offline` is removed. Without an
API key, both agent implementations automatically use deterministic local fallbacks so the
Buildkite demo remains repeatable.

## Agent contract

`lib/agent.ts` exposes:

- `analyzeFailures()` — groups deterministic misses, explains patterns, and suggests no more than
  four bounded policy changes.
- `generateFinalReport()` — summarizes iteration history for an internal risk reviewer.
- `templateCritique()` — a no-API fallback used for repeatable demos and CI.

The starting small-business policy and deterministic TypeScript evaluator live in
`lib/evaluator.ts`. Suggestions are advisory. A loop engine must validate allowlisted changes,
apply its own bounds, rerun all cases, and stop at five iterations or once pass rate is at least 85%
and estimated default risk is at most 5%.

## Buildkite

`.buildkite/pipeline.yml` runs four gated stages on every change:

1. Reproducible installation with `npm ci`.
2. TypeScript linting.
3. Deterministic evaluator and fallback-agent tests, plus the Python engine tests.
4. TypeScript build validation.

No LLM credential is required in CI, and CI never calls an agent to decide whether a policy passes.

The primary controls are:

| Environment variable | Default | Meaning |
| --- | ---: | --- |
| `MAX_DEFAULT_RATE` | `0.04` | Maximum 95% Wilson upper bound for approved defaults |
| `MAX_ITERATIONS` | `8` | Hard bound on agent revisions |
| `MIN_CASE_PASS_RATE` | `0.98` | Required generated and regression case pass rate |
| `MAX_MANUAL_REVIEW_RATE` | `0.20` | Maximum share sent to manual review |

## Design

The optimization order is intentionally lexicographic:

1. Pass mandatory behavior cases.
2. Keep the upper confidence bound of default rate below the configured cap.
3. Keep manual-review volume below its cap.
4. Among feasible candidates, maximize approval rate and minimize false rejection.

The agent cannot emit arbitrary executable code. It writes ordered rules in a Pydantic-validated
DSL with an allowlist of fields and operators. Protected attributes are excluded. Each iteration,
its metrics, and the exact feedback are persisted under `artifacts/iterations/`.

The Buildkite pipeline has separate data-validation, case-generation, optimization, hidden-holdout,
human-approval, and packaging steps. The optimizer downloads only calibration data; the holdout
artifact is first consumed after candidate selection.

## Important limitations

- Generated expected outcomes supplement immutable human-authored regressions; they do not establish
  real-world creditworthiness.
- Real lending data has selective labels because rejected applicants usually have no repayment
  outcome. This synthetic demo deliberately avoids claiming to solve reject inference.
- Protected-class data is absent from policy inputs. A production process still needs separately
  governed fair-lending measurement, legal review, adverse-action support, validation, and ongoing
  drift monitoring.
- Manual review is measured and capped; it is not treated as a risk-free outcome.
