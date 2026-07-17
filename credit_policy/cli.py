from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import shutil
from pathlib import Path

from credit_policy.agents import PolicyAgent, TestCaseAgent
from credit_policy.data import (
    generate_dataset,
    load_applicants,
    load_cases,
    save_applicants,
    save_cases,
)
from credit_policy.evaluator import evaluate, is_feasible
from credit_policy.models import Policy
from credit_policy.optimizer import optimize
from credit_policy.policy import policy_hash

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"


def _float_env(name: str, default: float) -> float:
    return float(os.getenv(name, str(default)))


def _int_env(name: str, default: int) -> int:
    return int(os.getenv(name, str(default)))


def validate_data() -> None:
    calibration = generate_dataset(size=4000, seed=17)
    holdout = generate_dataset(size=2500, seed=29)
    save_applicants(ARTIFACTS / "calibration.json", calibration)
    save_applicants(ARTIFACTS / "holdout.json", holdout)
    fingerprint = hashlib.sha256(
        (ARTIFACTS / "calibration.json").read_bytes()
        + (ARTIFACTS / "holdout.json").read_bytes()
    ).hexdigest()
    report = {
        "calibration_rows": len(calibration),
        "holdout_rows": len(holdout),
        "fully_observed_synthetic_outcomes": True,
        "policy_fields_exclude_protected_attributes": True,
        "dataset_fingerprint": fingerprint,
    }
    _write_json(ARTIFACTS / "data_report.json", report)


async def generate_cases(offline: bool) -> None:
    regression = load_cases(ROOT / "data" / "regression_cases.json")
    generated = await TestCaseAgent(offline=offline).generate(regression)
    case_ids = [case.case_id for case in regression + generated]
    if len(case_ids) != len(set(case_ids)):
        raise ValueError("Test-case agent produced a duplicate case_id")
    save_cases(ARTIFACTS / "cases.json", regression + generated)
    _write_json(
        ARTIFACTS / "case_generation_trace.json",
        {
            "mode": "offline" if offline or not os.getenv("OPENAI_API_KEY") else "llamaindex",
            "immutable_regression_cases": len(regression),
            "generated_cases": len(generated),
        },
    )


async def optimize_policy(offline: bool) -> None:
    cases = load_cases(ARTIFACTS / "cases.json")
    applicants = load_applicants(ARTIFACTS / "calibration.json")
    best, records = await optimize(
        agent=PolicyAgent(offline=offline),
        cases=cases,
        applicants=applicants,
        output_dir=ARTIFACTS / "iterations",
        max_iterations=_int_env("MAX_ITERATIONS", 8),
        max_default_rate=_float_env("MAX_DEFAULT_RATE", 0.04),
        min_case_pass_rate=_float_env("MIN_CASE_PASS_RATE", 0.98),
        max_manual_review_rate=_float_env("MAX_MANUAL_REVIEW_RATE", 0.20),
    )
    _write_json(ARTIFACTS / "best_policy.json", best.model_dump())
    winning = next(record for record in records if record.policy_hash == policy_hash(best))
    _write_json(
        ARTIFACTS / "optimization_summary.json",
        {
            "iterations_completed": len(records),
            "best_iteration": winning.iteration,
            "best_policy_hash": winning.policy_hash,
            "metrics": winning.metrics.model_dump(),
        },
    )
    with (ARTIFACTS / "agent_trace.jsonl").open("w") as trace:
        for record in records:
            trace.write(
                json.dumps(
                    {
                        "iteration": record.iteration,
                        "policy_hash": record.policy_hash,
                        "feasible": record.feasible,
                        "feedback": record.feedback,
                    }
                )
                + "\n"
            )


def evaluate_holdout() -> None:
    policy = Policy.model_validate_json((ARTIFACTS / "best_policy.json").read_text())
    cases = load_cases(ARTIFACTS / "cases.json")
    holdout = load_applicants(ARTIFACTS / "holdout.json")
    metrics = evaluate(policy, cases, holdout)
    feasible = is_feasible(
        metrics,
        _float_env("MAX_DEFAULT_RATE", 0.04),
        _float_env("MIN_CASE_PASS_RATE", 0.98),
        _float_env("MAX_MANUAL_REVIEW_RATE", 0.20),
    )
    _write_json(
        ARTIFACTS / "holdout_metrics.json",
        {"passed": feasible, **metrics.model_dump()},
    )
    _write_json(
        ARTIFACTS / "governance_report.json",
        {
            "protected_attributes_used_by_policy": False,
            "protected_attributes_present_in_demo_data": False,
            "fairness_measurement_status": (
                "Not measurable from this synthetic demo dataset. Production validation must "
                "evaluate legally approved protected-class data separately from policy inputs."
            ),
            "selective_labels_warning": (
                "Synthetic outcomes are fully observed. Real declined applications generally lack "
                "repayment outcomes and require reject-inference governance."
            ),
        },
    )
    (ARTIFACTS / "model_card.md").write_text(_model_card(policy, metrics.model_dump(), feasible))
    if not feasible:
        raise SystemExit("Holdout evaluation failed one or more policy constraints")


def package_policy() -> None:
    distribution = ROOT / "dist"
    distribution.mkdir(exist_ok=True)
    shutil.copy2(ARTIFACTS / "best_policy.json", distribution / "credit-policy.json")
    shutil.copy2(ARTIFACTS / "model_card.md", distribution / "model-card.md")
    policy = Policy.model_validate_json((ARTIFACTS / "best_policy.json").read_text())
    _write_json(
        distribution / "manifest.json",
        {
            "policy_hash": policy_hash(policy),
            "format": "restricted-credit-policy-dsl/v1",
            "deployment_status": "candidate-requiring-human-approval",
        },
    )


def _write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n")


def _model_card(policy: Policy, metrics: dict[str, object], feasible: bool) -> str:
    return f"""# Credit policy candidate

- Policy hash: `{policy_hash(policy)}`
- Holdout gate passed: `{str(feasible).lower()}`
- Rules: `{len(policy.rules)}`
- Default-rate upper bound: `{metrics["default_rate_upper_bound"]:.4f}`
- Approval rate: `{metrics["approval_rate"]:.4f}`
- Manual-review rate: `{metrics["manual_review_rate"]:.4f}`

This artifact is a synthetic agent-loop demonstration, not an authorization to make real lending
decisions. Production use requires independent legal, fair-lending, model-risk, adverse-action,
data-quality, and monitoring review.
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Credit-policy agent loop")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("validate")
    for name in ("generate-cases", "optimize"):
        command = subparsers.add_parser(name)
        command.add_argument("--offline", action="store_true")
    subparsers.add_parser("evaluate-holdout")
    subparsers.add_parser("package")
    args = parser.parse_args()

    if args.command == "validate":
        validate_data()
    elif args.command == "generate-cases":
        asyncio.run(generate_cases(args.offline))
    elif args.command == "optimize":
        asyncio.run(optimize_policy(args.offline))
    elif args.command == "evaluate-holdout":
        evaluate_holdout()
    elif args.command == "package":
        package_policy()


if __name__ == "__main__":
    main()
