from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from credit_policy.agents import PolicyAgent
from credit_policy.evaluator import build_feedback, evaluate, is_feasible
from credit_policy.models import Applicant, IterationRecord, Policy, TestCase
from credit_policy.policy import policy_hash


async def optimize(
    agent: PolicyAgent,
    cases: list[TestCase],
    applicants: list[Applicant],
    output_dir: Path,
    max_iterations: int,
    max_default_rate: float,
    min_case_pass_rate: float,
    max_manual_review_rate: float,
) -> tuple[Policy, list[IterationRecord]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    feedback: dict[str, Any] = {
        "problem": (
            "Keep the default rate among approved applicants below the cap while approving "
            "as many creditworthy applicants as possible."
        )
    }
    previous: Policy | None = None
    records: list[IterationRecord] = []
    seen: set[str] = set()

    for iteration in range(max_iterations):
        candidate = await agent.generate(iteration, feedback, previous)
        candidate_hash = policy_hash(candidate)
        if candidate_hash in seen:
            break
        seen.add(candidate_hash)

        metrics = evaluate(candidate, cases, applicants)
        feasible = is_feasible(
            metrics,
            max_default_rate,
            min_case_pass_rate,
            max_manual_review_rate,
        )
        feedback = build_feedback(metrics, max_default_rate, max_manual_review_rate)
        record = IterationRecord(
            iteration=iteration,
            policy_hash=candidate_hash,
            policy=candidate,
            metrics=metrics,
            feasible=feasible,
            feedback=feedback,
        )
        records.append(record)
        (output_dir / f"iteration-{iteration:02}.json").write_text(
            json.dumps(record.model_dump(), indent=2) + "\n"
        )
        previous = candidate

    feasible_records = [record for record in records if record.feasible]
    if not feasible_records:
        raise RuntimeError(
            "No policy met all constraints; inspect artifacts/iterations for specific failures"
        )
    best = max(
        feasible_records,
        key=lambda record: (
            record.metrics.approval_rate,
            -record.metrics.false_reject_rate,
            -record.metrics.manual_review_rate,
            -record.metrics.policy_complexity,
        ),
    )
    return best.policy, records
