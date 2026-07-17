# Credit Policy Agent Loop

A runnable Buildkite and LlamaIndex demonstration for this constrained optimization problem:

> Keep the default rate among approved applicants below X% while approving as many creditworthy
> applicants as possible.

LlamaIndex `FunctionAgent`s generate test cases and policy candidates. A deterministic evaluator
executes a restricted JSON rule DSL, calculates risk and approval metrics, and returns concrete
misses to the policy agent. Buildkite keeps the holdout evaluation outside the optimization loop
and requires human approval before packaging a candidate.

This project uses fully observed synthetic outcomes. It is a loop-engineering demonstration, not a
production lending model.

## Run locally

```bash
python -m pip install -e '.[dev]'
python -m credit_policy.cli validate
python -m credit_policy.cli generate-cases --offline
python -m credit_policy.cli optimize --offline
python -m credit_policy.cli evaluate-holdout
python -m credit_policy.cli package
```

Remove `--offline` and set `OPENAI_API_KEY` to use the LlamaIndex agents. `LLM_MODEL` defaults to
`gpt-4o-mini`. Without an API key, agent commands automatically use deterministic local agents so
the Buildkite demo remains repeatable.

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
