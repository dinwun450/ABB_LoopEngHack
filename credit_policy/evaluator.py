from __future__ import annotations

import math
from collections import defaultdict
from typing import Any

from credit_policy.models import Applicant, EvaluationMetrics, Policy, TestCase
from credit_policy.policy import decide


def wilson_upper_bound(successes: int, total: int, z: float = 1.96) -> float:
    if total == 0:
        return 1.0
    proportion = successes / total
    denominator = 1 + z**2 / total
    centre = proportion + z**2 / (2 * total)
    margin = z * math.sqrt(
        proportion * (1 - proportion) / total + z**2 / (4 * total**2)
    )
    return (centre + margin) / denominator


def evaluate(
    policy: Policy,
    cases: list[TestCase],
    applicants: list[Applicant],
) -> EvaluationMetrics:
    failed_cases: list[dict[str, str]] = []
    for case in cases:
        actual = decide(policy, case.applicant)
        if actual != case.expected:
            failed_cases.append(
                {
                    "case_id": case.case_id,
                    "expected": case.expected,
                    "actual": actual,
                    "rationale": case.rationale,
                }
            )

    decisions = [(applicant, decide(policy, applicant)) for applicant in applicants]
    approved = [applicant for applicant, result in decisions if result == "approve"]
    rejected = [applicant for applicant, result in decisions if result == "reject"]
    manual = [applicant for applicant, result in decisions if result == "manual_review"]
    defaults = sum(applicant.outcome == "defaulted" for applicant in approved)
    known_good = sum(applicant.outcome == "repaid" for applicant in applicants)
    false_rejects = sum(applicant.outcome == "repaid" for applicant in rejected)

    return EvaluationMetrics(
        case_pass_rate=(len(cases) - len(failed_cases)) / len(cases) if cases else 1.0,
        cases_passed=len(cases) - len(failed_cases),
        cases_total=len(cases),
        approval_rate=len(approved) / len(applicants) if applicants else 0,
        manual_review_rate=len(manual) / len(applicants) if applicants else 0,
        default_rate_among_approved=defaults / len(approved) if approved else 1.0,
        default_rate_upper_bound=wilson_upper_bound(defaults, len(approved)),
        false_reject_rate=false_rejects / known_good if known_good else 0,
        approved_count=len(approved),
        approved_defaults=defaults,
        policy_complexity=sum(len(rule.all) for rule in policy.rules),
        failed_cases=failed_cases,
        cohort_misses=_cohort_misses(rejected),
    )


def _cohort_misses(rejected: list[Applicant]) -> list[dict[str, Any]]:
    cohorts: defaultdict[str, int] = defaultdict(int)
    for applicant in rejected:
        if applicant.outcome != "repaid":
            continue
        if (
            applicant.credit_score is not None
            and 700 <= applicant.credit_score <= 720
            and applicant.employment_years >= 3
        ):
            cohorts["credit_score=700..720, employment_years>=3"] += 1
        if (
            applicant.credit_score is not None
            and applicant.credit_score >= 740
            and applicant.debt_to_income > 0.5
        ):
            cohorts["credit_score>=740, debt_to_income>0.5"] += 1
    return [
        {"cohort": cohort, "good_applicants_rejected": count}
        for cohort, count in sorted(cohorts.items())
        if count
    ]


def build_feedback(
    metrics: EvaluationMetrics,
    max_default_rate: float,
    max_manual_review_rate: float,
) -> dict[str, Any]:
    return {
        "failed_cases": metrics.failed_cases,
        "cohort_misses": metrics.cohort_misses,
        "metrics": {
            "approval_rate": metrics.approval_rate,
            "manual_review_rate": metrics.manual_review_rate,
            "default_rate_upper_bound": metrics.default_rate_upper_bound,
            "false_reject_rate": metrics.false_reject_rate,
        },
        "constraints": {
            "max_default_rate": max_default_rate,
            "max_manual_review_rate": max_manual_review_rate,
        },
        "instructions": (
            "Fix mandatory case misses first. Keep the default-rate upper confidence bound "
            "under its cap, then increase approvals and reduce unnecessary rejection."
        ),
    }


def is_feasible(
    metrics: EvaluationMetrics,
    max_default_rate: float,
    min_case_pass_rate: float,
    max_manual_review_rate: float,
) -> bool:
    return (
        metrics.case_pass_rate >= min_case_pass_rate
        and metrics.default_rate_upper_bound <= max_default_rate
        and metrics.manual_review_rate <= max_manual_review_rate
        and metrics.approved_count > 0
    )
